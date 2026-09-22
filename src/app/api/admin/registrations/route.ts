import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/serverStore';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import {
  buildAdminSessionCookie,
  isAdminRequest,
  isAdminSecretUsable,
  issueAdminSessionToken,
  verifyAdminPasscode
} from '@/lib/adminAuth';
import { withSignedTeamUrls } from '@/lib/storage';

import {
  sendPaymentVerifiedEmail,
  sendResubmissionRequiredEmail,
  sendRegistrationReceivedEmail,
  sendReuploadApprovedEmail,
  sendReuploadRejectedEmail,
  verifySmtp
} from '@/lib/email';
import type { MailResult } from '@/lib/email';
import { deletePrivateFile } from '@/lib/privateFiles';
import { storePaymentScreenshot } from '@/lib/paymentProof';
import { portalApiGuard } from '@/lib/features';

/**
 * Await a notification mail and say what actually happened. A fire-and-forget
 * send dies with the serverless invocation the moment the response returns, so
 * every dispatch is awaited and its real outcome shown to the console operator.
 * A mail failure never rolls back the admin action it accompanies. The result
 * is structured so the client can style the toast by outcome instead of
 * celebrating over a failure.
 */
async function describeMailOutcome(
  send: Promise<MailResult>,
  to: string
): Promise<{ sent: boolean; note: string }> {
  try {
    const res = await send;
    if (res.simulated && !res.success) return { sent: false, note: `email NOT sent — ${res.error}` };
    if (res.simulated) return { sent: false, note: 'email NOT sent — SMTP_USER / SMTP_PASS are unset on this deployment' };
    if (!res.success) return { sent: false, note: `email FAILED to send: ${res.error}` };
    return { sent: true, note: `email sent to ${to}` };
  } catch (err) {
    console.error('[Admin API] Mail dispatch threw:', err);
    return { sent: false, note: 'email FAILED to send — see server logs' };
  }
}

export async function GET(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  try {
    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`admin-get-${clientIp}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid admin security key.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;
    const round1Status = searchParams.get('round1Status') || undefined;
    const track = searchParams.get('track') || undefined;
    const onlySuspicious = searchParams.get('onlySuspicious') === 'true';

    const result = await serverStore.getAdminOverview({
      search,
      paymentStatus,
      round1Status,
      track,
      onlySuspicious
    });

    const config = await serverStore.getConfig();

    return NextResponse.json({
      success: true,
      stats: result.stats,
      // Decks live in a private bucket now; hand the console short-lived
      // signed links rather than permanent public URLs.
      teams: await withSignedTeamUrls(result.teams),
      auditLogs: result.auditLogs,
      config
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Admin fetch failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  try {
    const clientIp = getClientIp(request);

    // RECORD_PAYMENT carries a screenshot file, so the route accepts
    // multipart/form-data alongside the JSON every other action uses.
    let body: Record<string, unknown> = {};
    let screenshotFile: File | null = null;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        if (typeof value === 'string') body[key] = value;
      });
      const fileEntry = formData.get('screenshot');
      if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry) {
        screenshotFile = fileEntry as File;
      }
    } else {
      body = await request.json();
    }
    const { action, passcode, teamId, decision, score, reason, note, requestId, actor = 'Admin Secretariat' } =
      body as {
        action?: string;
        passcode?: unknown;
        teamId?: string;
        decision?: 'SELECT' | 'NOT_SELECTED' | 'UNDER_REVIEW' | 'SAVE_SCORES';
        score?: number;
        reason?: string;
        note?: string;
        requestId?: string;
        actor?: string;
      };

    // 1. Passcode Authentication Check
    if (passcode !== undefined) {
      const rate = checkRateLimit(`admin-auth-${clientIp}`, 10, 60 * 1000);
      if (!rate.allowed) {
        return NextResponse.json({ success: false, error: 'Too many login attempts. Please wait a minute.' }, { status: 429 });
      }

      if (!isAdminSecretUsable()) {
        console.error('[Admin] ADMIN_SECRET_KEY is unset or shorter than 8 characters — admin login is disabled.');
        return NextResponse.json({ success: false, error: 'Admin access is not configured on this deployment.' }, { status: 503 });
      }

      if (verifyAdminPasscode(String(passcode))) {
        // Set the session cookie here too, so this legacy login path does not
        // leave the console with nothing but the raw secret to hold onto.
        const ok = NextResponse.json({ success: true, authorized: true });
        ok.headers.append('Set-Cookie', buildAdminSessionCookie(issueAdminSessionToken()));
        return ok;
      }
      return NextResponse.json({ success: false, error: 'Incorrect Admin Passcode' }, { status: 401 });
    }

    // Ensure Admin Key is present for operational actions
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized admin operation' }, { status: 401 });
    }

    // 2. Payment Action: VERIFY, RECORD, REJECT, REQUEST_RESUBMISSION, RESEND_EMAIL
    if (action === 'VERIFY_PAYMENT' || action === 'RECORD_PAYMENT') {
      if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 });

      // RECORD_PAYMENT = the WhatsApp workflow: the organiser cross-checked the
      // proof off-platform and records the evidence (UTR / payer / UPI /
      // screenshot) while verifying, so the payment ledger holds a real row.
      let allocatedFile = '';
      const targetTeam = await serverStore.getTeam(teamId);
      if (!targetTeam) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      let details: { utrNumber?: string; payerName?: string; payerUpi?: string; screenshotUrl?: string; notes?: string } | undefined;
      if (action === 'RECORD_PAYMENT') {
        const b = body as { utrNumber?: string; payerName?: string; payerUpi?: string; notes?: string };
        let screenshotUrl: string | undefined;
        if (screenshotFile && screenshotFile.size > 0) {
          const stored = await storePaymentScreenshot(screenshotFile, teamId);
          if (stored.error) return NextResponse.json({ error: stored.error }, { status: 400 });
          screenshotUrl = stored.url;
          allocatedFile = stored.url || '';
        }
        details = {
          utrNumber: b.utrNumber?.trim() || undefined,
          payerName: b.payerName?.trim() || undefined,
          payerUpi: b.payerUpi?.trim() || undefined,
          screenshotUrl,
          notes: b.notes?.trim() || `Payment evidence recorded off-platform (WhatsApp proof) by ${actor}`
        };
      }

      const res = await serverStore.updatePaymentVerification(teamId, 'VERIFY', actor, note, details).catch(async error => {
        // A thrown ancillary operation may follow a successful payment write.
        // Do not remove evidence unless a read confirms it is unreferenced.
        if (allocatedFile) {
          const latest = await serverStore.getTeam(teamId).catch(() => null);
          if (latest && latest.payment?.screenshot_url !== allocatedFile) {
            await deletePrivateFile(allocatedFile).catch(cleanupError => console.error('[Admin] Cleanup failed', cleanupError));
          }
        }
        throw error;
      });
      if (!res.success) {
        // A partial verification can already reference the receipt; retain it then.
        const latest = await serverStore.getTeam(teamId);
        if (allocatedFile && latest && latest.payment?.screenshot_url !== allocatedFile) await deletePrivateFile(allocatedFile).catch(error => console.error('[Admin] Cleanup failed', error));
        return NextResponse.json({ error: res.error || 'Payment verification did not persist — retry.' }, { status: 500 });
      }

      let mail = { sent: false, note: 'no leader email on record, nothing sent' };
      if (res.team) {
        mail = await describeMailOutcome(sendPaymentVerifiedEmail(res.team), res.team.leader_email);
      }

      return NextResponse.json({
        success: true,
        message: `Payment ${action === 'RECORD_PAYMENT' ? 'recorded and ' : ''}verified, Round 1 unlocked — confirmation ${mail.note}`,
        mail
      });
    }

    if (action === 'RESEND_VERIFICATION_EMAIL') {
      if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
      const team = await serverStore.getTeam(teamId);
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      
      const mailRes = await sendPaymentVerifiedEmail(team);
      if (mailRes.simulated) {
        return NextResponse.json({
          error:
            'Email is not configured on this deployment (SMTP_USER / SMTP_PASS are unset), so nothing was sent. Set them and try again.'
        }, { status: 503 });
      }
      if (!mailRes.success) {
        return NextResponse.json({ error: mailRes.error || 'Failed to dispatch email' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `Verification email sent to ${team.leader_email}` });
    }

    if (action === 'REJECT_PAYMENT') {
      if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
      const res = await serverStore.updatePaymentVerification(teamId, 'REJECT', actor, reason);
      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Rejection did not persist — retry.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Payment marked as rejected' });
    }

    if (action === 'REQUEST_PAYMENT_RESUBMISSION') {
      if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
      const res = await serverStore.updatePaymentVerification(teamId, 'REQUEST_RESUBMISSION', actor, reason);
      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Resubmission request did not persist — retry.' }, { status: 500 });
      }

      let mail = { sent: false, note: 'no leader email on record, nothing sent' };
      if (res.team) {
        mail = await describeMailOutcome(
          sendResubmissionRequiredEmail(res.team, reason || 'Please resubmit your verification details / 12-digit payment reference.'),
          res.team.leader_email
        );
      }

      return NextResponse.json({ success: true, message: `Payment resubmission requested — notice ${mail.note}`, mail });
    }

    // 2a-bis. Lazy receipt fetch: the bulk roster replaces multi-MB data: URL
    // screenshots with an 'inline' marker; the console asks for the real
    // bytes here, one team at a time, when the organiser clicks INSPECT.
    if (action === 'GET_PAYMENT_SCREENSHOT') {
      if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
      const team = await serverStore.getTeam(teamId);
      if (!team?.payment?.screenshot_url) {
        return NextResponse.json({ error: 'No screenshot on record for this team.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, url: `/api/admin/payment-proof?teamId=${encodeURIComponent(team.id)}` });
    }

    // 2b. Manual registration-confirmation email (auto-dispatch on signup is off
    //     by design; organisers send this explicitly).
    if (action === 'SEND_REGISTRATION_EMAIL') {
      if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
      const team = await serverStore.getTeam(teamId);
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

      const mailRes = await sendRegistrationReceivedEmail(team);
      if (mailRes.simulated) {
        return NextResponse.json({
          error:
            'Email is not configured on this deployment (SMTP_USER / SMTP_PASS are unset), so nothing was sent. Set them and try again.'
        }, { status: 503 });
      }
      if (!mailRes.success) {
        return NextResponse.json({ error: mailRes.error || 'Failed to dispatch email' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `Registration email sent to ${team.leader_email}` });
    }

    // 2c. Round 1 Re-upload Request Review: APPROVE / REJECT
    //     Approving unlocks exactly one replacement upload for that team.
    if (action === 'APPROVE_REUPLOAD_REQUEST' || action === 'REJECT_REUPLOAD_REQUEST') {
      if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 });

      const isApprove = action === 'APPROVE_REUPLOAD_REQUEST';
      const res = await serverStore.reviewReuploadRequest(
        teamId,
        isApprove ? 'APPROVE' : 'REJECT',
        actor,
        note || reason,
        requestId
      );

      if (!res.success || !res.team) {
        return NextResponse.json({ error: res.error || 'Could not review the request' }, { status: 400 });
      }

      // Notify the team; a mail failure must not undo the decision.
      const decisionNote = res.request?.review_notes || null;
      const mail = await describeMailOutcome(
        isApprove
          ? sendReuploadApprovedEmail(res.team, decisionNote)
          : sendReuploadRejectedEmail(res.team, decisionNote),
        res.team.leader_email
      );

      return NextResponse.json({
        success: true,
        message: `${isApprove
          ? 'Re-upload approved — the team may now upload one replacement deck.'
          : 'Re-upload request declined — the existing submission stands.'} Decision ${mail.note}`,
        mail
      });
    }

    // 3. Round 1 Evaluation Action: SELECT, NOT_SELECTED, UNDER_REVIEW, SAVE_SCORES
    if (action === 'EVALUATE_ROUND_1') {
      if (!teamId || !decision) return NextResponse.json({ error: 'teamId and decision are required' }, { status: 400 });
      const evaluationScores = (body as { evaluationScores?: Parameters<typeof serverStore.evaluateRound1>[5] }).evaluationScores;
      await serverStore.evaluateRound1(teamId, decision, actor, score, note, evaluationScores);
      return NextResponse.json({ success: true, message: `Round 1 evaluation saved: ${decision}` });
    }

    // 4. Admin Note
    if (action === 'ADD_NOTE') {
      if (!teamId || note === undefined) return NextResponse.json({ error: 'teamId and note are required' }, { status: 400 });
      await serverStore.addAdminNote(teamId, note, actor);
      return NextResponse.json({ success: true, message: 'Admin note recorded' });
    }

    // 5. Permanent Delete Team Entry
    if (action === 'DELETE_TEAM') {
      if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
      const res = await serverStore.deleteTeam(teamId, actor);
      return NextResponse.json({ 
        success: true, 
        message: `Team ${res.deletedRegistrationId} permanently deleted from registry`, 
      });
    }

    // 6. Manual / Immediate Unpaid Payment Reminders Dispatch
    if (action === 'DISPATCH_PAYMENT_REMINDERS') {
      const result = await serverStore.checkAndSendUnpaidReminders();
      return NextResponse.json({
        success: true,
        message: `Scanned ${result.checked} squads: Dispatched ${result.sent} payment reminder emails (${result.notifiedTeams.join(', ') || 'no squads pending >5m'})`,
      });
    }

    // 7. Mailer Health Check — confirms SMTP credentials and TLS actually work,
    //    so a broken mailer is visible before a live dispatch fails silently.
    if (action === 'CHECK_MAILER') {
      const health = await verifySmtp();
      return NextResponse.json({
        success: health.ok,
        message: health.ok
          ? 'SMTP connection and credentials verified.'
          : health.configured
            ? `SMTP configured but the connection failed: ${health.error}`
            : 'SMTP is not configured — set SMTP_USER and SMTP_PASS.',
      }, { status: health.ok ? 200 : 503 });
    }

    return NextResponse.json({ error: 'Unknown admin action' }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Admin operation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
