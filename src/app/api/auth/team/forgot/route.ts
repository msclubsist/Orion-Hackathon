import { NextResponse, after } from 'next/server';
import { serverStore } from '@/lib/serverStore';
import { sendPasscodeResetEmail, SITE_URL } from '@/lib/email';
import { RESET_TOKEN_TTL_MINUTES } from '@/lib/passcodePolicy';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { portalApiGuard } from '@/lib/features';

// ==============================================================================
// POST /api/auth/team/forgot — request a passcode reset link
// ==============================================================================
//
// Takes the team's USERNAME (its name as one word) and the REGISTERED LEADER
// EMAIL, and emails a one-time reset link to that address if — and only if —
// the two belong to the same team.
//
// Three things this route deliberately does NOT do:
//
//   1. It never says whether a team exists. Usernames are just team names, so a
//      route that answered "no such team" would let anyone with the public team
//      directory enumerate the roster, and one that answered "wrong email" would
//      confirm a leader's address for phishing.
//   2. It never returns the token. The token's only job is to prove control of
//      the inbox; handing it back in the HTTP response would defeat that
//      entirely and make the email decorative.
//   3. It never logs the token, the email body, or the link.

/** Identical answer for success, unknown team, and wrong email. */
const GENERIC_RESPONSE = {
  success: true,
  message:
    'If that username and registered leader email match, a reset link is on its way. ' +
    'Check the inbox — and the spam folder — for the address you registered with.'
};

/**
 * Floor the handler's runtime so a hit and a miss are not trivially
 * distinguishable by a stopwatch. A match does a lookup, an insert and an audit
 * write; a miss returns almost immediately. Without this the response time is
 * itself the existence oracle the generic message is there to prevent.
 */
const MIN_HANDLER_MS = 400;

async function settleAfter(startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_HANDLER_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_HANDLER_MS - elapsed));
  }
}

export async function POST(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  const startedAt = Date.now();

  try {
    const clientIp = getClientIp(request);

    // Tighter than the login limiter: every allowed request here can send mail,
    // so abuse costs sender reputation as well as CPU.
    const ipRate = checkRateLimit(`team-forgot-ip-${clientIp}`, 5, 15 * 60 * 1000);
    if (!ipRate.allowed) {
      await settleAfter(startedAt);
      return NextResponse.json(
        { error: `Too many reset requests. Please wait ${ipRate.resetInSec}s before trying again.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    // `teamId` is the wire name kept for older clients; the value is a username.
    const teamId = String(body?.username ?? body?.teamId ?? '').trim();
    const email = String(body?.email ?? '').trim();

    if (!teamId || !email) {
      await settleAfter(startedAt);
      return NextResponse.json(
        { error: 'Your team username and registered leader email are both required.' },
        { status: 400 }
      );
    }

    // A second limit keyed by the team, so one target cannot be mailbombed from
    // a pool of addresses. Keyed on the lowercased identifier the caller typed —
    // it does not need to name a real team to be worth limiting.
    const teamRate = checkRateLimit(`team-forgot-id-${teamId.toLowerCase()}`, 5, 15 * 60 * 1000);
    if (!teamRate.allowed) {
      // Still the generic answer: a distinct "this team is rate limited" reply
      // would confirm the team exists and is being reset.
      await settleAfter(startedAt);
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const issued = await serverStore.createPasscodeReset(teamId, email, clientIp);

    if (issued) {
      const resetUrl = `${SITE_URL}/portal/reset?token=${encodeURIComponent(issued.rawToken)}`;

      // Not awaited in the handler: waiting on SMTP would make a successful
      // request visibly slower than a rejected one, which is the timing leak
      // the generic response exists to close. But a bare un-awaited promise
      // dies with the serverless invocation as soon as the response returns and
      // the mail never leaves — after() runs once the response is flushed and
      // keeps the function alive until the send settles.
      after(async () => {
        try {
          const res = await sendPasscodeResetEmail(issued.team, resetUrl, RESET_TOKEN_TTL_MINUTES);
          if (!res.success) {
            console.error(
              `[Reset] Could not deliver reset mail for ${issued.team.registration_id}: ${res.error}`
            );
          }
        } catch (err) {
          console.error('[Reset] Reset mail dispatch threw:', err);
        }
      });
    }

    await settleAfter(startedAt);
    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err: unknown) {
    // Log the failure, never the payload — it holds an email address and, on a
    // malformed request, potentially whatever the caller typed into the form.
    console.error('[Reset] forgot-passcode route error:', err instanceof Error ? err.message : err);
    await settleAfter(startedAt);
    // Generic on purpose: an error shape that differs from success is a weaker
    // oracle than an explicit message, but it is still an oracle.
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
