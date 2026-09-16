import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import crypto from 'crypto';
import type { TeamRecord } from '@/types/orion';

// ==============================================================================
// Mail Core — deliverability-hardened SMTP dispatch
// ==============================================================================
//
// Inbox placement depends on a handful of things that are easy to get wrong, so
// they live here instead of being repeated in every send* function:
//
//   1. ONE pooled transporter per process. A fresh TCP + TLS + AUTH handshake
//      per message looks like a spam cannon and gets the sender throttled.
//   2. A real plain-text alternative on every message. HTML-only mail is the
//      single largest controllable spam-score penalty.
//   3. Envelope sender aligned with the authenticated SMTP account, so SPF and
//      DKIM line up under DMARC. A From: on a domain the account cannot
//      authenticate for is a near-guaranteed spam placement.
//   4. List-Unsubscribe with one-click POST, required by Google and Yahoo bulk
//      sender rules since Feb 2024.
//   5. Distinct per-message identifiers so Gmail does not thread or collapse
//      separate notices into one another.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://msclubsist.in').replace(/\/+$/, '');

const SENDER_NAME = process.env.EMAIL_FROM_NAME || 'ORION 1.0 Secretariat';

/**
 * Resolve the credential PAIR from one env-var family, never mixed. The old
 * per-field fallback (SMTP_USER||EMAIL_USER, SMTP_PASS||EMAIL_PASS) had two
 * production traps: a deployment holding both families where the operator
 * "fixed" the losing variable and the stale one kept winning the ||, and a
 * mixed pair (account A's user with account B's password) that is guaranteed
 * 535 BadCredentials even though each variable is individually correct.
 */
let loggedCredentialSource = false;
function smtpCredentials(): { user: string; pass: string } {
  const sUser = (process.env.SMTP_USER || '').trim();
  const sPass = (process.env.SMTP_PASS || '').trim();
  const eUser = (process.env.EMAIL_USER || '').trim();
  const ePass = (process.env.EMAIL_PASS || '').trim();

  const fromSmtp = Boolean(sUser || sPass);
  const user = fromSmtp ? sUser : eUser;
  const pass = fromSmtp ? sPass : ePass;

  if (!loggedCredentialSource && (user || pass)) {
    loggedCredentialSource = true;
    const family = fromSmtp ? 'SMTP_USER/SMTP_PASS' : 'EMAIL_USER/EMAIL_PASS';
    console.log(`[Mailer] Credentials resolved from ${family} (user: ${user || 'MISSING'})`);
    if (fromSmtp && (!sUser || !sPass) && (eUser || ePass)) {
      console.warn(
        '[Mailer] SMTP_* is partially set, so EMAIL_* is IGNORED. ' +
        `Missing: ${!sUser ? 'SMTP_USER' : 'SMTP_PASS'}. Complete the SMTP_* pair or remove it.`
      );
    }
  }
  return { user, pass };
}

function smtpUser(): string {
  return smtpCredentials().user;
}

/**
 * The address the receiving server can actually authenticate. Everything the
 * recipient sees derives from this so SPF/DKIM/DMARC stay aligned.
 */
function senderAddress(): string {
  const explicit = (process.env.EMAIL_FROM || '').trim();
  const authUser = smtpUser();
  if (!explicit) return authUser;

  // EMAIL_FROM may be a bare address or a `"Name" <addr>` pair.
  const match = explicit.match(/<([^>]+)>/);
  const explicitAddr = (match ? match[1] : explicit).trim();

  const explicitDomain = explicitAddr.split('@')[1]?.toLowerCase();
  const authDomain = authUser.split('@')[1]?.toLowerCase();

  // A From: domain the SMTP account cannot sign for fails DMARC alignment and
  // lands in spam. Prefer the authenticated account and say so loudly.
  if (explicitDomain && authDomain && explicitDomain !== authDomain) {
    console.warn(
      `[Mailer] EMAIL_FROM (${explicitAddr}) is on a different domain than SMTP_USER (${authUser}). ` +
      `Sending as ${authUser} to keep SPF/DKIM aligned — otherwise mail lands in spam. ` +
      `To send as ${explicitAddr}, authenticate SMTP with that domain.`
    );
    return authUser;
  }

  return explicitAddr;
}

function replyToAddress(): string {
  return (process.env.EMAIL_REPLY_TO || '').trim() || senderAddress();
}

let cachedTransporter: Transporter | null = null;
let cachedTransporterKey = '';

/** Evict the cached transporter so the next send rebuilds from current env. */
function evictTransporter(): void {
  try { cachedTransporter?.close(); } catch { /* already dead */ }
  cachedTransporter = null;
  cachedTransporterKey = '';
}

/** Singleton transporter. Rebuilt when any part of the config — password included — changes. */
function getTransporter(): Transporter | null {
  const { user, pass } = smtpCredentials();
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  // 465 is implicit TLS; 587 upgrades via STARTTLS. Accept the common truthy
  // spellings — the exact-'true' check meant SMTP_SECURE=TRUE on port 465
  // silently forced STARTTLS against an implicit-TLS listener and hung.
  const rawSecure = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure = rawSecure ? ['true', '1', 'yes'].includes(rawSecure) : port === 465;
  if (rawSecure && !['true', '1', 'yes', 'false', '0', 'no'].includes(rawSecure)) {
    console.warn(`[Mailer] SMTP_SECURE="${process.env.SMTP_SECURE}" not recognised — treating as false.`);
  }

  // Gmail only accepts 16-char app passwords over SMTP, and Google displays
  // them grouped as "abcd efgh ijkl mnop" — pasting one with the spaces intact
  // is the most common cause of "535-5.7.8 BadCredentials". Gmail passwords
  // never legitimately contain whitespace, so strip it for Gmail hosts only.
  const cleanPass = /gmail|googlemail/i.test(host) ? pass.replace(/\s+/g, '') : pass;

  // The password digest MUST be part of the key: without it, a warm process
  // that once authenticated with a bad password kept replaying it forever,
  // even after the env var was fixed.
  const passDigest = crypto.createHash('sha256').update(cleanPass).digest('hex').slice(0, 12);
  const key = `${host}:${port}:${secure}:${user}:${passDigest}`;
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }
  evictTransporter();

  // No connection pooling on serverless: pooled sockets are frozen with the
  // function and are dead on thaw, so warm invocations inherit broken
  // connections and fail with timeouts/resets even with correct credentials.
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: cleanPass },
    ...(serverless
      ? {
          pool: false as const
        }
      : {
          // Long-lived process: reuse connections — a handshake per message
          // gets the sender throttled.
          pool: true as const,
          maxConnections: 3,
          maxMessages: 50,
          // Stay well under Gmail's throughput ceiling so bulk reminder runs
          // are not deferred; deferrals damage sender reputation.
          rateDelta: 1000,
          rateLimit: 5
        }),
    // Fail fast instead of riding out nodemailer's 2-minute defaults, which
    // exceed the serverless max duration and turn a dead SMTP path into a 504.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    // Validate the server certificate. Disabling this never helps delivery and
    // silently accepts a MITM.
    requireTLS: !secure,
    tls: {
      minVersion: 'TLSv1.2',
      servername: host
    }
  });

  cachedTransporterKey = key;
  return cachedTransporter;
}

/**
 * One-shot SMTP connection + credential check, surfaced by the admin
 * CHECK_MAILER action so a misconfigured mailer is visible before a live send
 * fails silently. Evicts the cached transporter first so it verifies the
 * CURRENT env credentials, never a stale cached login.
 */
export async function verifySmtp(): Promise<{ configured: boolean; ok: boolean; error?: string }> {
  evictTransporter();
  const transporter = getTransporter();
  if (!transporter) {
    return { configured: false, ok: false, error: 'SMTP_USER / SMTP_PASS not configured' };
  }
  try {
    await transporter.verify();
    return { configured: true, ok: true };
  } catch (err: unknown) {
    evictTransporter();
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Hidden preview line shown beside the subject in Gmail and Apple Mail. Without
 * one, clients scrape the first visible text — the boilerplate club header —
 * which reads as templated bulk mail.
 */
function preheader(text: string): string {
  const spacer = '&#847;&zwnj;&nbsp;'.repeat(60);
  return (
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#07101E;opacity:0;">${escapeHtml(text)}</div>` +
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#07101E;opacity:0;">${spacer}</div>`
  );
}

/**
 * The outcome of a send attempt.
 *
 * `simulated` is the field that matters. When SMTP is not configured the
 * mailer logs the message and returns success, which is the right behaviour
 * for local development — but a caller that records durable state on the
 * strength of "the mail went out" has to be able to tell the difference.
 * Otherwise a deployment with missing SMTP credentials silently marks work as
 * done that never happened, and the evidence that it did not is a console
 * warning nobody reads.
 */
export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** True when no SMTP transport existed and the message was only logged. */
  simulated?: boolean;
}

interface DispatchOptions {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Required — HTML-only mail is scored as spam. */
  text: string;
  /** Short label used to build a stable, non-threading message reference. */
  kind: string;
  registrationId: string;
  username?: string;
}

async function dispatchMail(
  opts: DispatchOptions
): Promise<MailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    // Local development simulates sends; production must NOT — a mis-named or
    // wrongly-scoped env var would otherwise make every mail "succeed" while
    // nothing leaves.
    const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (production) {
      const error =
        'SMTP credentials unresolved — set SMTP_USER and SMTP_PASS (exact names, Production scope) in the deployment env and redeploy.';
      console.error(`[Mailer] "${opts.subject}" to ${opts.to} NOT sent: ${error}`);
      return { success: false, simulated: true, error };
    }
    console.warn(
      `[Mailer Simulator] SMTP_USER / SMTP_PASS not configured. "${opts.subject}" to ${opts.to} was not sent.`
    );
    return { success: true, simulated: true, messageId: 'simulated-local-mode' };
  }

  const from = senderAddress();
  const domain = from.split('@')[1] || 'orion.local';
  const portalLink = `${SITE_URL}/portal?username=${encodeURIComponent(opts.username || opts.registrationId)}`;

  try {
    const info = await transporter.sendMail({
      from: `"${SENDER_NAME}" <${from}>`,
      // The envelope sender drives the SPF check — keep it on the auth account.
      sender: from,
      envelope: { from, to: opts.to },
      replyTo: replyToAddress(),
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      messageId: `<${opts.kind}.${opts.registrationId}.${Date.now()}.${crypto.randomBytes(6).toString('hex')}@${domain}>`,
      headers: {
        // Google / Yahoo bulk sender requirement.
        'List-Unsubscribe': `<mailto:${from}?subject=Unsubscribe%20${encodeURIComponent(opts.registrationId)}>, <${portalLink}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        // Stops Gmail collapsing distinct notices into a single thread.
        'X-Entity-Ref-ID': `${opts.kind}-${opts.registrationId}-${Date.now()}`,
        'Auto-Submitted': 'auto-generated'
      }
    });

    console.log(`[Mailer] Sent "${opts.kind}" to ${opts.to} [${info.messageId}]`);
    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    let errorMsg = err instanceof Error ? err.message : String(err);
    const errCode = (err as { code?: string })?.code || '';
    // An auth failure poisons the cached transporter — evict it so the next
    // send authenticates fresh from the current env instead of replaying the
    // rejected credential for the life of the warm process. Connection-level
    // failures get the same treatment: the transport is cheap to rebuild.
    if (/535|EAUTH|ECONNECTION|ETIMEDOUT|ECONNRESET|EPIPE|ESOCKET/i.test(`${errCode} ${errorMsg}`)) {
      evictTransporter();
    }
    // Translate Gmail's auth rejection into the action that actually fixes it.
    if (/535[- ]5\.7\.8|BadCredentials/i.test(errorMsg)) {
      errorMsg +=
        ' → Gmail rejected the SMTP login. Set SMTP_PASS to a 16-character Google App Password ' +
        '(myaccount.google.com/apppasswords, requires 2-Step Verification), then redeploy.';
    }
    console.error(`[Mailer] Failed "${opts.kind}" to ${opts.to}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/** Returns the leader email if usable, else null (and logs why). */
function validRecipient(team: TeamRecord, kind: string): string | null {
  const email = (team.leader_email || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.warn(`[Mailer] Skipping ${kind}: team ${team.registration_id} has no valid leader email (${team.leader_email})`);
    return null;
  }
  return email;
}

/** Shared plain-text footer. */
function textFooter(): string {
  return [
    '',
    '--',
    'ORION 1.0 — 24-Hour National Hackathon',
    'Microsoft Club SIST, Sathyabama Institute of Science and Technology, Chennai',
    `Team portal: ${SITE_URL}/portal`,
    '',
    'You are receiving this because your team registered for ORION 1.0.',
    'Reply to this email if you did not register or wish to withdraw.'
  ].join('\n');
}

/**
 * Generate Cyber Futuristic HTML template for Orion 1.0 Registration & Payment Confirmation
 */
export function generatePaymentVerifiedHtml(team: TeamRecord): string {
  const whatsappUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ||
    'https://chat.whatsapp.com/C76LZLzWkOh3FPC99iXw8f';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ORION 1.0 - Payment Verified & Registration Confirmed</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, h1, h2, h3, p, a, span { font-family: 'Segoe UI', Helvetica, Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #020617;
      color: #F8FAFC;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .container-table { width: 100% !important; padding: 8px !important; }
      .content-padding { padding: 22px 16px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 28px 10px; background-color: #020617; background-image: radial-gradient(circle at 50% 0%, #071426 0%, #020617 80%); color: #F8FAFC;">

  ${preheader('Your entry fee is verified and your ORION 1.0 team portal access is ready.')}

  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: transparent;">
    <tr>
      <td align="center">
        
        <!-- Main Email Container -->
        <table role="presentation" class="container-table" width="620" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; width: 100%; background: #07101E; border: 1px solid rgba(0, 188, 242, 0.35); box-shadow: 0 0 35px rgba(0, 188, 242, 0.12);">
          
          <!-- Microsoft 4-Color Energy Accent Bar -->
          <tr>
            <td style="padding: 0;">
              <table role="presentation" width="100%" height="4" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="25%" bgcolor="#F25022" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#7FBA00" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#00A4EF" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#FFB900" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 34px 28px 24px; background: linear-gradient(180deg, #0B192C 0%, #07101E 100%); border-bottom: 1px solid rgba(0, 188, 242, 0.2); text-align: center;">
              <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td style="padding: 5px 14px; background: rgba(0, 164, 239, 0.12); border: 1px solid rgba(0, 164, 239, 0.45); font-size: 11px; font-weight: 700; color: #00A4EF; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Space Grotesk', 'Segoe UI', sans-serif;">
                    MICROSOFT CLUB SIST • STUDENT DEVELOPMENT CELL
                  </td>
                </tr>
              </table>

              <h1 style="margin: 0; font-family: 'Space Grotesk', 'Segoe UI', Arial, sans-serif; font-size: 30px; font-weight: 800; letter-spacing: 2px; color: #FFFFFF; text-transform: uppercase;">
                ORION <span style="color: #22D3EE;">1.0</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 12px; font-weight: 600; color: #94A3B8; letter-spacing: 1.8px; text-transform: uppercase;">
                24-Hour National Hackathon • Official Confirmation
              </p>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-padding" style="padding: 30px 28px 20px; color: #E2E8F0; font-size: 14.5px; line-height: 1.65;">
              
              <p style="margin: 0 0 14px; font-size: 16px; font-weight: 600; color: #FFFFFF;">
                Dear Participant,
              </p>
              
              <p style="margin: 0 0 14px; color: #94A3B8;">
                Greetings from <strong style="color: #00A4EF;">Microsoft Club SIST</strong>!
              </p>

              <p style="margin: 0 0 16px; color: #E2E8F0;">
                We are pleased to confirm that your team's registration for <strong style="color: #FFFFFF;">ORION 1.0 — 24-Hour National Hackathon</strong> has been successfully verified.
              </p>

              <p style="margin: 0 0 22px; color: #E2E8F0;">
                Your Round 1 registration fee of <strong style="color: #22D3EE;">₹100 per team</strong> has been received and verified, and your team is now officially registered for the <strong>Online Qualifier Round</strong> of ORION 1.0.
              </p>

              <!-- Team Passcode & Credentials HUD Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; background: #030712; border: 1px solid rgba(34, 211, 238, 0.45); box-shadow: inset 0 0 20px rgba(0, 188, 242, 0.08);">
                <tr>
                  <td style="padding: 10px 16px; background: rgba(0, 188, 242, 0.12); border-bottom: 1px solid rgba(0, 188, 242, 0.3);">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 11.5px; font-weight: 700; color: #22D3EE; letter-spacing: 1.5px; text-transform: uppercase;">
                          🔑 TEAM ACCESS CREDENTIALS
                        </td>
                        <td align="right" style="font-size: 11px; font-weight: 600; color: #10B981; text-transform: uppercase;">
                          ● ACTIVE / VERIFIED
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 8px; width: 42%; color: #94A3B8; font-size: 13px;">Team Name:</td>
                        <td style="padding-bottom: 8px; color: #FFFFFF; font-weight: 700; font-size: 14px;">${escapeHtml(team.team_name)}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #94A3B8; font-size: 13px;">Team Leader:</td>
                        <td style="padding-bottom: 8px; color: #F8FAFC; font-weight: 600; font-size: 13px;">${escapeHtml(team.leader_name)}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #94A3B8; font-size: 13px;">Portal Username:</td>
                        <td style="padding-bottom: 8px; font-family: 'JetBrains Mono', Consolas, monospace; color: #22D3EE; font-weight: 700; font-size: 14.5px; letter-spacing: 1px;">${escapeHtml(team.username)}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #94A3B8; font-size: 13px;">Registration ID:</td>
                        <td style="padding-bottom: 8px; font-family: 'JetBrains Mono', Consolas, monospace; color: #64748B; font-weight: 600; font-size: 13px; letter-spacing: 1px;">${escapeHtml(team.registration_id)}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #94A3B8; font-size: 13px;">Access Passcode:</td>
                        <td style="padding-bottom: 8px;">
                          <span style="font-family: 'JetBrains Mono', Consolas, monospace; background: #0F172A; border: 1px dashed #38BDF8; padding: 4px 10px; color: #F8FAFC; font-weight: 700; font-size: 13.5px; letter-spacing: 1.5px; display: inline-block;">
                            ${escapeHtml(team.access_token)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 4px; color: #94A3B8; font-size: 13px; vertical-align: top;">Problem Statement:</td>
                        <td style="padding-top: 4px; color: #E2E8F0; font-size: 13px; line-height: 1.4;">${escapeHtml(team.problem_statement || 'Assigned in Round 1')}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Registration Status HUD Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; background: #09121F; border: 1px solid rgba(255, 255, 255, 0.08);">
                <tr>
                  <td style="padding: 10px 16px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 11.5px; font-weight: 700; color: #94A3B8; letter-spacing: 1px; text-transform: uppercase;">
                    REGISTRATION STATUS
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 5px 0; color: #94A3B8; font-size: 13px; width: 42%;">Round:</td>
                        <td style="padding: 5px 0; color: #FFFFFF; font-weight: 600; font-size: 13px;">Round 1 — Online Qualifier</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #94A3B8; font-size: 13px;">Registration Fee:</td>
                        <td style="padding: 5px 0; color: #FFFFFF; font-weight: 600; font-size: 13px;">₹100 per Team</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #94A3B8; font-size: 13px;">Payment Status:</td>
                        <td style="padding: 5px 0; color: #10B981; font-weight: 700; font-size: 13px;">✓ Verified & Confirmed</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #94A3B8; font-size: 13px;">Registration Status:</td>
                        <td style="padding: 5px 0; color: #22D3EE; font-weight: 700; font-size: 13px;">Confirmed</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- WhatsApp Community Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 26px 0; background: linear-gradient(135deg, rgba(37, 211, 102, 0.09) 0%, rgba(7, 16, 30, 0.95) 100%); border: 1px solid rgba(37, 211, 102, 0.45);">
                <tr>
                  <td style="padding: 20px 18px;">
                    <h3 style="margin: 0 0 10px; font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 14.5px; font-weight: 700; color: #25D366; letter-spacing: 1px; text-transform: uppercase;">
                      💬 JOIN THE OFFICIAL WHATSAPP COMMUNITY
                    </h3>
                    <p style="margin: 0 0 10px; font-size: 13.5px; color: #E2E8F0; line-height: 1.5;">
                      All registered participants are requested to join the <strong>Official ORION 1.0 WhatsApp Community</strong> using the link below.
                    </p>
                    <p style="margin: 0 0 16px; font-size: 12.5px; color: #94A3B8; line-height: 1.5;">
                      Important announcements, Round 1 instructions, submission updates, deadlines, finalist announcements, and other essential event communications will be shared through the official community.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 4px 0 12px;">
                      <tr>
                        <td align="center" bgcolor="#25D366">
                          <a href="${whatsappUrl}" target="_blank" style="font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 13px; font-weight: 700; color: #020617 !important; text-decoration: none; padding: 12px 22px; display: inline-block; letter-spacing: 1px; text-transform: uppercase;">
                            JOIN WHATSAPP COMMUNITY →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 11px; color: #64748B; word-break: break-all;">
                      Direct Link: <a href="${whatsappUrl}" style="color: #25D366; text-decoration: underline;">${whatsappUrl}</a>
                    </p>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #CBD5E1; font-style: italic;">
                      Please join the community at the earliest and ensure that you remain updated with all official announcements.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Round 1 & Grand Finale Guidelines -->
              <h3 style="margin: 26px 0 12px; font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 14.5px; font-weight: 700; color: #FFFFFF; letter-spacing: 1.5px; text-transform: uppercase; border-left: 3px solid #00A4EF; padding-left: 10px;">
                ROUND 1 & GRAND FINALE
              </h3>

              <p style="margin: 0 0 12px; font-size: 13px; color: #94A3B8; line-height: 1.6;">
                Please ensure that all information submitted during registration is accurate and that your team follows the official instructions, submission requirements, and deadlines communicated by the organizing committee.
              </p>

              <p style="margin: 0 0 12px; font-size: 13px; color: #94A3B8; line-height: 1.6;">
                Further information regarding the Round 1 problem statements, submission procedure, evaluation guidelines, important deadlines, and subsequent announcements will be communicated through the official channels of ORION 1.0.
              </p>

              <div style="background: rgba(0, 164, 239, 0.07); border-left: 3px solid #00A4EF; padding: 12px 15px; margin: 16px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; color: #F8FAFC; line-height: 1.6;">
                  Following the evaluation of Round 1 submissions, the <strong style="color: #22D3EE;">Top 70 Teams</strong> will qualify for the <strong>24-Hour Offline Grand Finale</strong> at <span style="color: #FFFFFF;">Sathyabama Institute of Science and Technology, Chennai</span>.
                </p>
                <p style="margin: 0; font-size: 12.5px; color: #94A3B8; line-height: 1.5;">
                  Qualified teams will receive separate instructions regarding finalist confirmation, the <strong>₹250 per-head Grand Finale confirmation fee</strong>, reporting procedures, accommodation, and other Grand Finale guidelines.
                </p>
              </div>

              <p style="margin: 18px 0 16px; font-size: 13px; color: #94A3B8; line-height: 1.6;">
                We request you to regularly check your registered email address and the Official ORION 1.0 WhatsApp Community for updates.
              </p>

              <p style="margin: 0 0 16px; font-size: 13.5px; color: #E2E8F0; line-height: 1.6;">
                Thank you for registering for ORION 1.0. We look forward to witnessing your ideas, innovation, and technical creativity throughout the competition.
              </p>

              <p style="margin: 0 0 24px; font-size: 14.5px; font-weight: 700; color: #22D3EE; letter-spacing: 0.5px;">
                Your journey with ORION 1.0 officially begins here.
              </p>

              <!-- Sign-off -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 18px;">
                <tr>
                  <td style="font-size: 13px; line-height: 1.5; color: #94A3B8;">
                    Regards,<br>
                    <strong style="color: #FFFFFF; font-size: 13.5px;">Microsoft Club SIST</strong><br>
                    Student Development Cell<br>
                    Sathyabama Institute of Science and Technology<br>
                    Chennai, Tamil Nadu
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background: #030712; border-top: 1px solid rgba(0, 188, 242, 0.2); text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #64748B; letter-spacing: 0.5px;">
                This is an automated operational confirmation from the ORION 1.0 Secretariat.
              </p>
              <p style="margin: 0; font-size: 10.5px; color: #475569;">
                © 2026 ORION 1.0 • Microsoft Club SIST. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Main Email Container -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Generate Cyber Futuristic HTML template for Resubmission Required Notice
 */
export function generateResubmissionRequiredHtml(team: TeamRecord, reason: string): string {
  const whatsappUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ||
    'https://chat.whatsapp.com/C76LZLzWkOh3FPC99iXw8f';
  
  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ORION 1.0 - Action Required: Resubmission Requested</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, h1, h2, h3, p, a, span { font-family: 'Segoe UI', Helvetica, Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #020617;
      color: #F8FAFC;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .container-table { width: 100% !important; padding: 8px !important; }
      .content-padding { padding: 22px 16px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 28px 10px; background-color: #020617; background-image: radial-gradient(circle at 50% 0%, #071426 0%, #020617 80%); color: #F8FAFC;">

  ${preheader('We could not verify your payment reference. Here is what to correct.')}

  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: transparent;">
    <tr>
      <td align="center">
        
        <!-- Main Email Container -->
        <table role="presentation" class="container-table" width="620" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; width: 100%; background: #07101E; border: 1px solid rgba(245, 158, 11, 0.45); box-shadow: 0 0 35px rgba(245, 158, 11, 0.15);">
          
          <!-- Microsoft 4-Color Energy Accent Bar -->
          <tr>
            <td style="padding: 0;">
              <table role="presentation" width="100%" height="4" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="25%" bgcolor="#F25022" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#7FBA00" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#00A4EF" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#FFB900" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 34px 28px 24px; background: linear-gradient(180deg, #1C1304 0%, #07101E 100%); border-bottom: 1px solid rgba(245, 158, 11, 0.25); text-align: center;">
              <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td style="padding: 5px 14px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.5); font-size: 11px; font-weight: 700; color: #FBBF24; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Space Grotesk', 'Segoe UI', sans-serif;">
                    ⚠️ ACTION REQUIRED • ORION 1.0 SECRETARIAT
                  </td>
                </tr>
              </table>

              <h1 style="margin: 0; font-family: 'Space Grotesk', 'Segoe UI', Arial, sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #FFFFFF; text-transform: uppercase;">
                RESUBMISSION <span style="color: #FBBF24;">REQUESTED</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 12px; font-weight: 600; color: #FCD34D; letter-spacing: 1.5px; text-transform: uppercase;">
                ORION 1.0 • Squad Verification Review Notice
              </p>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-padding" style="padding: 30px 28px 20px; color: #E2E8F0; font-size: 14.5px; line-height: 1.65;">
              
              <p style="margin: 0 0 14px; font-size: 16px; font-weight: 600; color: #FFFFFF;">
                Dear ${escapeHtml(team.leader_name)},
              </p>
              
              <p style="margin: 0 0 14px; color: #94A3B8;">
                Greetings from <strong style="color: #00A4EF;">Microsoft Club SIST</strong>.
              </p>

              <p style="margin: 0 0 16px; color: #E2E8F0;">
                During the verification review for team <strong style="color: #FFFFFF;">${escapeHtml(team.team_name)}</strong> (${escapeHtml(team.registration_id)}), our organizing committee noticed that additional details or a resubmission is required.
              </p>

              <!-- Secretariate Comments Highlight Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; background: #181204; border: 1px solid rgba(245, 158, 11, 0.6); box-shadow: inset 0 0 25px rgba(245, 158, 11, 0.1);">
                <tr>
                  <td style="padding: 12px 18px; background: rgba(245, 158, 11, 0.2); border-bottom: 1px solid rgba(245, 158, 11, 0.4);">
                    <div style="font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 12px; font-weight: 700; color: #FBBF24; letter-spacing: 1.5px; text-transform: uppercase;">
                      📋 SECRETARIAT REVIEW COMMENTS / REASON
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 20px; color: #FEF3C7; font-size: 14px; line-height: 1.6; font-weight: 500;">
                    ${escapeHtml(reason)}
                  </td>
                </tr>
              </table>

              <!-- Team Passcode & Credentials HUD Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; background: #030712; border: 1px solid rgba(255, 255, 255, 0.12);">
                <tr>
                  <td style="padding: 10px 16px; background: rgba(255, 255, 255, 0.04); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <div style="font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 11.5px; font-weight: 700; color: #38BDF8; letter-spacing: 1.5px; text-transform: uppercase;">
                      🔑 YOUR SQUAD CREDENTIALS
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 8px; width: 42%; color: #94A3B8; font-size: 13px;">Team Name:</td>
                        <td style="padding-bottom: 8px; color: #FFFFFF; font-weight: 700; font-size: 14px;">${escapeHtml(team.team_name)}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #94A3B8; font-size: 13px;">Registration ID:</td>
                        <td style="padding-bottom: 8px; font-family: 'JetBrains Mono', Consolas, monospace; color: #38BDF8; font-weight: 700; font-size: 14.5px;">${escapeHtml(team.registration_id)}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #94A3B8; font-size: 13px;">Access Passcode:</td>
                        <td style="padding-bottom: 8px;">
                          <span style="font-family: 'JetBrains Mono', Consolas, monospace; background: #0F172A; border: 1px dashed #38BDF8; padding: 4px 10px; color: #F8FAFC; font-weight: 700; font-size: 13.5px; letter-spacing: 1.5px; display: inline-block;">
                            ${escapeHtml(team.access_token)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Steps -->
              <h3 style="margin: 24px 0 10px; font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 14.5px; font-weight: 700; color: #FFFFFF; letter-spacing: 1.5px; text-transform: uppercase; border-left: 3px solid #FBBF24; padding-left: 10px;">
                HOW TO RESUBMIT
              </h3>
              <ol style="margin: 0 0 20px; padding-left: 20px; color: #CBD5E1; font-size: 13.5px; line-height: 1.65;">
                <li style="margin-bottom: 8px;">Click the button below to open your <strong>Team Portal</strong>.</li>
                <li style="margin-bottom: 8px;">Log in using your <strong>Registration ID</strong> and <strong>Access Passcode</strong>.</li>
                <li style="margin-bottom: 8px;">Update the requested information (e.g. payment UTR reference, valid transaction screenshot, or re-upload your Round 1 PPT).</li>
                <li>Submit your update. Our Secretariat will re-verify your submission promptly.</li>
              </ol>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 10px 0 24px;">
                <tr>
                  <td align="center" bgcolor="#FBBF24">
                    <a href="${portalUrl}" target="_blank" style="font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 13px; font-weight: 800; color: #020617 !important; text-decoration: none; padding: 13px 26px; display: inline-block; letter-spacing: 1px; text-transform: uppercase;">
                      OPEN TEAM PORTAL & RESUBMIT →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- WhatsApp Community Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; background: linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(7, 16, 30, 0.95) 100%); border: 1px solid rgba(37, 211, 102, 0.35);">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 13px; font-weight: bold; color: #25D366; margin-bottom: 6px;">
                      💬 NEED IMMEDIATE HELP?
                    </div>
                    <p style="margin: 0 0 10px; font-size: 12.5px; color: #94A3B8; line-height: 1.5;">
                      If you have questions regarding this request, reach out directly in the Official WhatsApp Community or email <a href="mailto:msclubsist@gmail.com" style="color: #38BDF8; text-decoration: underline;">msclubsist@gmail.com</a>.
                    </p>
                    <a href="${whatsappUrl}" target="_blank" style="font-size: 12px; font-weight: bold; color: #25D366; text-decoration: underline;">
                      Open WhatsApp Community Link →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Sign-off -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 18px; margin-top: 24px;">
                <tr>
                  <td style="font-size: 13px; line-height: 1.5; color: #94A3B8;">
                    Regards,<br>
                    <strong style="color: #FFFFFF; font-size: 13.5px;">Microsoft Club SIST</strong><br>
                    Student Development Cell<br>
                    Sathyabama Institute of Science and Technology<br>
                    Chennai, Tamil Nadu
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background: #030712; border-top: 1px solid rgba(245, 158, 11, 0.2); text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #64748B; letter-spacing: 0.5px;">
                This is an automated operational notification from the ORION 1.0 Secretariat.
              </p>
              <p style="margin: 0; font-size: 10.5px; color: #475569;">
                © 2026 ORION 1.0 • Microsoft Club SIST. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Main Email Container -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Dispatch confirmation email to Team Leader
 */
export async function sendPaymentVerifiedEmail(team: TeamRecord): Promise<MailResult> {
  const to = validRecipient(team, 'payment-verified');
  if (!to) return { success: false, error: 'Invalid or missing team leader email' };

  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;
  const text = [
    `Hello ${team.leader_name},`,
    '',
    `Your ORION 1.0 registration fee has been received and verified. Team "${team.team_name}" is now confirmed for the Online Qualifier Round.`,
    '',
    'TEAM ACCESS CREDENTIALS',
    `  Team name        : ${team.team_name}`,
    `  Team leader      : ${team.leader_name}`,
    `  Portal Username  : ${team.username}`,
    `  Registration ID  : ${team.registration_id}`,
    `  Access passcode  : ${team.access_token}`,
    `  Problem statement: ${team.problem_statement || 'Assigned in Round 1'}`,
    '',
    'Keep the access passcode private — it is what unlocks your team portal.',
    '',
    'WHAT HAPPENS NEXT',
    '  1. Sign in to the team portal with your Registration ID and passcode.',
    '  2. Upload your Round 1 presentation (PDF, PPT or PPTX) before the deadline.',
    '  3. Results of the Online Qualifier are announced on the portal.',
    '',
    `Team portal: ${portalUrl}`,
    textFooter()
  ].join('\n');

  return dispatchMail({
    to,
    subject: `Payment verified — ${team.team_name} is confirmed for ORION 1.0 (${team.registration_id})`,
    html: generatePaymentVerifiedHtml(team),
    text,
    kind: 'payment-verified',
    registrationId: team.registration_id,
    username: team.username
  });
}

/**
 * Dispatch Resubmission Required email to Team Leader
 */
export async function sendResubmissionRequiredEmail(
  team: TeamRecord,
  reason: string
): Promise<MailResult> {
  const to = validRecipient(team, 'payment-resubmission');
  if (!to) return { success: false, error: 'Invalid or missing team leader email' };

  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;
  const text = [
    `Hello ${team.leader_name},`,
    '',
    `We could not verify the payment details submitted for team "${team.team_name}" (${team.registration_id}).`,
    '',
    'WHAT THE ORGANISERS NOTED',
    `  ${reason}`,
    '',
    'Please sign in to the team portal and submit your payment reference again with the corrected details.',
    '',
    `Team portal: ${portalUrl}`,
    `Registration ID: ${team.registration_id}`,
    `Access passcode: ${team.access_token}`,
    '',
    'Reply to this email if you believe the payment was already made correctly, and include the transaction screenshot.',
    textFooter()
  ].join('\n');

  return dispatchMail({
    to,
    subject: `Payment details need a correction — ${team.team_name} (${team.registration_id})`,
    html: generateResubmissionRequiredHtml(team, reason),
    text,
    kind: 'payment-resubmission',
    registrationId: team.registration_id,
    username: team.username
  });
}

/**
 * Generate Cyber Futuristic HTML template for Unpaid Registration 5-Minute Payment Reminder
 */
export function generatePaymentReminderHtml(team: TeamRecord): string {
  const whatsappUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ||
    'https://chat.whatsapp.com/C76LZLzWkOh3FPC99iXw8f';
  
  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ORION 1.0 - Complete Your Registration Payment</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, h1, h2, h3, p, a, span { font-family: 'Segoe UI', Helvetica, Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #020617;
      color: #F8FAFC;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .container-table { width: 100% !important; padding: 8px !important; }
      .content-padding { padding: 22px 16px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 28px 10px; background-color: #020617; background-image: radial-gradient(circle at 50% 0%, #071426 0%, #020617 80%); color: #F8FAFC;">

  ${preheader('Your ORION 1.0 place is not held until the Round 1 entry fee is paid.')}

  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: transparent;">
    <tr>
      <td align="center">
        
        <!-- Main Email Container -->
        <table role="presentation" class="container-table" width="620" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; width: 100%; background: #07101E; border: 1px solid rgba(56, 189, 248, 0.45); box-shadow: 0 0 35px rgba(56, 189, 248, 0.15);">
          
          <!-- Microsoft 4-Color Energy Accent Bar -->
          <tr>
            <td style="padding: 0;">
              <table role="presentation" width="100%" height="4" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="25%" bgcolor="#F25022" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#7FBA00" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#00A4EF" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#FFB900" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 34px 28px 24px; background: linear-gradient(180deg, #0B1E3B 0%, #07101E 100%); border-bottom: 1px solid rgba(56, 189, 248, 0.25); text-align: center;">
              <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td style="padding: 5px 14px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.5); font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Space Grotesk', 'Segoe UI', sans-serif;">
                    ⚡ ACTION REQUIRED • PAYMENT PENDING
                  </td>
                </tr>
              </table>

              <h1 style="margin: 0; font-family: 'Space Grotesk', 'Segoe UI', Arial, sans-serif; font-size: 27px; font-weight: 800; letter-spacing: 2px; color: #FFFFFF; text-transform: uppercase;">
                COMPLETE YOUR <span style="color: #38BDF8;">PAYMENT</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 12px; font-weight: 600; color: #94A3B8; letter-spacing: 1.5px; text-transform: uppercase;">
                ORION 1.0 • Registration Fee Verification Notice
              </p>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-padding" style="padding: 30px 28px 20px; color: #E2E8F0; font-size: 14.5px; line-height: 1.65;">
              
              <p style="margin: 0 0 14px; font-size: 16px; font-weight: 600; color: #FFFFFF;">
                Dear ${escapeHtml(team.leader_name)},
              </p>
              
              <p style="margin: 0 0 14px; color: #94A3B8;">
                Greetings from <strong style="color: #00A4EF;">Microsoft Club SIST</strong>!
              </p>

              <p style="margin: 0 0 16px; color: #E2E8F0;">
                Your team <strong style="color: #FFFFFF;">${escapeHtml(team.team_name)}</strong> was recently created on the ORION 1.0 Hackathon portal, but our automated system noticed that your Round 1 registration fee (<strong style="color: #22D3EE;">₹100 per team</strong>) and 12-digit UPI transaction reference (UTR) have not been submitted yet.
              </p>

              <!-- Team Passcode & Credentials HUD Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; background: #030712; border: 1px solid rgba(56, 189, 248, 0.45); box-shadow: inset 0 0 20px rgba(0, 188, 242, 0.08);">
                <tr>
                  <td style="padding: 10px 16px; background: rgba(0, 188, 242, 0.12); border-bottom: 1px solid rgba(0, 188, 242, 0.3);">
                    <div style="font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 11.5px; font-weight: 700; color: #38BDF8; letter-spacing: 1.5px; text-transform: uppercase;">
                      🔑 YOUR SQUAD REGISTRATION CREDENTIALS
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 8px; width: 42%; color: #94A3B8; font-size: 13px;">Team Name:</td>
                        <td style="padding-bottom: 8px; color: #FFFFFF; font-weight: 700; font-size: 14px;">${escapeHtml(team.team_name)}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #94A3B8; font-size: 13px;">Registration ID:</td>
                        <td style="padding-bottom: 8px; font-family: 'JetBrains Mono', Consolas, monospace; color: #38BDF8; font-weight: 700; font-size: 14.5px;">${escapeHtml(team.registration_id)}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #94A3B8; font-size: 13px;">Access Passcode:</td>
                        <td style="padding-bottom: 8px;">
                          <span style="font-family: 'JetBrains Mono', Consolas, monospace; background: #0F172A; border: 1px dashed #38BDF8; padding: 4px 10px; color: #F8FAFC; font-weight: 700; font-size: 13.5px; letter-spacing: 1.5px; display: inline-block;">
                            ${escapeHtml(team.access_token)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 4px; color: #94A3B8; font-size: 13px;">Problem Statement:</td>
                        <td style="padding-top: 4px; color: #E2E8F0; font-size: 13px;">${escapeHtml(team.problem_statement || 'Assigned in Round 1')}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- UPI Payment Instructions Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; background: #04132B; border: 1px solid rgba(0, 188, 242, 0.4);">
                <tr>
                  <td style="padding: 12px 18px; background: rgba(0, 188, 242, 0.15); border-bottom: 1px solid rgba(0, 188, 242, 0.3);">
                    <div style="font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 12px; font-weight: 700; color: #22D3EE; letter-spacing: 1.5px; text-transform: uppercase;">
                      💳 HOW TO COMPLETE PAYMENT (₹100)
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 18px; color: #E2E8F0; font-size: 13px; line-height: 1.6;">
                    <p style="margin: 0 0 8px;"><strong>1. UPI ID:</strong> <span style="font-family: 'JetBrains Mono', monospace; color: #38BDF8; background: #020617; padding: 2px 8px; border: 1px solid #38BDF8;">8870227906@upi</span></p>
                    <p style="margin: 0 0 8px;"><strong>2. Payee Name:</strong> MSNIHITHAJULIETA (Microsoft Club SIST)</p>
                    <p style="margin: 0 0 8px;"><strong>3. Amount:</strong> ₹100 per team (Flat for entire squad)</p>
                    <p style="margin: 0 0 0;"><strong>4. Action:</strong> Make the UPI payment and copy the <strong>12-digit UTR transaction reference number</strong>.</p>
                  </td>
                </tr>
              </table>

              <!-- Action CTA -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 24px;">
                <tr>
                  <td align="center" bgcolor="#00BCF2">
                    <a href="${portalUrl}" target="_blank" style="font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 13px; font-weight: 800; color: #020617 !important; text-decoration: none; padding: 13px 26px; display: inline-block; letter-spacing: 1px; text-transform: uppercase;">
                      OPEN PORTAL & SUBMIT 12-DIGIT UTR →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 14px; font-size: 12px; color: #94A3B8;">
                Direct Portal Link: <a href="${portalUrl}" style="color: #38BDF8; text-decoration: underline;">${portalUrl}</a>
              </p>

              <!-- WhatsApp Community Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; background: linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(7, 16, 30, 0.95) 100%); border: 1px solid rgba(37, 211, 102, 0.35);">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 13px; font-weight: bold; color: #25D366; margin-bottom: 6px;">
                      💬 JOIN THE PARTICIPANT COMMUNITY
                    </div>
                    <p style="margin: 0 0 10px; font-size: 12.5px; color: #94A3B8; line-height: 1.5;">
                      All hackathon announcements, problem statements, and qualifiers will be shared in the Official WhatsApp Community.
                    </p>
                    <a href="${whatsappUrl}" target="_blank" style="font-size: 12px; font-weight: bold; color: #25D366; text-decoration: underline;">
                      Join Official WhatsApp Community →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Sign-off -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 18px; margin-top: 24px;">
                <tr>
                  <td style="font-size: 13px; line-height: 1.5; color: #94A3B8;">
                    Regards,<br>
                    <strong style="color: #FFFFFF; font-size: 13.5px;">Microsoft Club SIST</strong><br>
                    Student Development Cell<br>
                    Sathyabama Institute of Science and Technology<br>
                    Chennai, Tamil Nadu
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background: #030712; border-top: 1px solid rgba(56, 189, 248, 0.2); text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #64748B; letter-spacing: 0.5px;">
                This is an automated operational reminder from the ORION 1.0 Secretariat.
              </p>
              <p style="margin: 0; font-size: 10.5px; color: #475569;">
                © 2026 ORION 1.0 • Microsoft Club SIST. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Main Email Container -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Dispatch 5-Minute Unpaid Reminder email to Team Leader
 */
export async function sendPaymentReminderEmail(
  team: TeamRecord
): Promise<MailResult> {
  const to = validRecipient(team, 'payment-reminder');
  if (!to) return { success: false, error: 'Invalid or missing team leader email' };

  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;
  const text = [
    `Hello ${team.leader_name},`,
    '',
    `Team "${team.team_name}" (${team.registration_id}) is registered for ORION 1.0, but we have not yet received the Round 1 entry fee of Rs.${team.amount || 100} for the squad.`,
    '',
    'Your place in the Online Qualifier is held only once the fee is paid and verified.',
    '',
    'HOW TO COMPLETE IT',
    '  1. Open the team portal using the link below.',
    '  2. Pay the entry fee using the UPI details shown there.',
    '  3. Enter the UTR / transaction reference so organisers can verify it.',
    '',
    `Team portal: ${portalUrl}`,
    `Registration ID: ${team.registration_id}`,
    `Access passcode: ${team.access_token}`,
    '',
    'If you have already paid, reply to this email with the transaction reference and we will reconcile it.',
    textFooter()
  ].join('\n');

  return dispatchMail({
    to,
    subject: `Entry fee pending for ${team.team_name} — ORION 1.0 (${team.registration_id})`,
    html: generatePaymentReminderHtml(team),
    text,
    kind: 'payment-reminder',
    registrationId: team.registration_id,
    username: team.username
  });
}

/**
 * Generate Registration Received Email Template
 */
export function generateRegistrationReceivedHtml(team: TeamRecord): string {
  const whatsappUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ||
    'https://chat.whatsapp.com/C76LZLzWkOh3FPC99iXw8f';
  
  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ORION 1.0 - Registration Received</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, h1, h2, h3, p, a, span { font-family: 'Segoe UI', Helvetica, Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #020617;
      color: #F8FAFC;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .container-table { width: 100% !important; padding: 8px !important; }
      .content-padding { padding: 22px 16px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 28px 10px; background-color: #020617; background-image: radial-gradient(circle at 50% 0%, #071426 0%, #020617 80%); color: #F8FAFC;">

  ${preheader('Your team is registered. One step left: pay the Round 1 entry fee.')}

  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: transparent;">
    <tr>
      <td align="center">
        
        <!-- Main Email Container -->
        <table role="presentation" class="container-table" width="620" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; width: 100%; background: #07101E; border: 1px solid rgba(0, 188, 242, 0.35); box-shadow: 0 0 35px rgba(0, 188, 242, 0.12);">
          
          <!-- Microsoft 4-Color Energy Accent Bar -->
          <tr>
            <td style="padding: 0;">
              <table role="presentation" width="100%" height="4" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="25%" bgcolor="#F25022" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#7FBA00" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#00A4EF" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#FFB900" style="font-size: 1px; line-height: 4px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 32px 30px 24px; background: linear-gradient(180deg, #0A192F 0%, #07101E 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              
              <!-- Brand Title -->
              <h1 style="margin: 0 0 8px; font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: 2px; color: #FFFFFF; text-transform: uppercase;">
                ORION <span style="color: #00BCF2;">1.0</span>
              </h1>
              <p style="margin: 0 0 16px; font-size: 11.5px; font-weight: 600; letter-spacing: 1.5px; color: #00BCF2; text-transform: uppercase;">
                24-Hour National Hackathon • Microsoft Club SIST
              </p>

              <!-- Status Badge -->
              <div style="display: inline-block; padding: 6px 14px; background: rgba(0, 188, 242, 0.12); border: 1px solid #00BCF2; color: #00BCF2; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                ⚡ REGISTRATION DOSSIER CREATED
              </div>
            </td>
          </tr>

          <!-- Content Section -->
          <tr>
            <td class="content-padding" style="padding: 30px 32px; background: #07101E;">
              
              <p style="margin: 0 0 16px; font-size: 14.5px; line-height: 1.6; color: #E2E8F0;">
                Greetings <strong style="color: #FFFFFF;">${escapeHtml(team.leader_name)}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; font-size: 13.5px; line-height: 1.6; color: #94A3B8;">
                Your squad <strong style="color: #38BDF8;">${escapeHtml(team.team_name)}</strong> has been successfully registered for <strong style="color: #FFFFFF;">ORION 1.0</strong>. Here are your official squad credentials and access portal details.
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; background: #0A1628; border: 1px solid rgba(0, 188, 242, 0.35);">
                <tr>
                  <td style="padding: 20px;">
                    
                    <div style="margin-bottom: 12px;">
                      <div style="font-size: 10.5px; font-weight: 700; color: #00BCF2; text-transform: uppercase; letter-spacing: 1px;">
                        Registration ID
                      </div>
                      <div style="font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px;">
                        ${escapeHtml(team.registration_id)}
                      </div>
                    </div>

                    <div style="margin-bottom: 12px;">
                      <div style="font-size: 10.5px; font-weight: 700; color: #00BCF2; text-transform: uppercase; letter-spacing: 1px;">
                        Access Token (Secret Key)
                      </div>
                      <div style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: #38BDF8; letter-spacing: 1px;">
                        ${escapeHtml(team.access_token)}
                      </div>
                    </div>

                    <div style="margin-bottom: 12px;">
                      <div style="font-size: 10.5px; font-weight: 700; color: #00BCF2; text-transform: uppercase; letter-spacing: 1px;">
                        Problem Statement Track
                      </div>
                      <div style="font-size: 13.5px; font-weight: 600; color: #F1F5F9;">
                        ${escapeHtml(team.problem_statement)}
                      </div>
                    </div>

                    <div>
                      <div style="font-size: 10.5px; font-weight: 700; color: #00BCF2; text-transform: uppercase; letter-spacing: 1px;">
                        Institution
                      </div>
                      <div style="font-size: 13px; color: #CBD5E1;">
                        ${escapeHtml(team.institution)}
                      </div>
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Payment Action if not verified -->
              ${team.payment_status !== 'VERIFIED' ? `
              <div style="margin: 20px 0; padding: 18px; background: rgba(245, 158, 11, 0.08); border-left: 3px solid #F59E0B;">
                <div style="font-size: 13px; font-weight: bold; color: #F59E0B; margin-bottom: 6px;">
                  💳 Round 1 Entry Fee: ₹100 Flat per Squad
                </div>
                <p style="margin: 0 0 10px; font-size: 12.5px; color: #CBD5E1; line-height: 1.5;">
                  Please complete the ₹100 team entry fee via UPI or submit your 12-digit transaction UTR through the Team Portal.
                </p>
                <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #FFFFFF;">
                  UPI ID: <strong style="color: #38BDF8;">8870227906@upi</strong> (MSNIHITHAJULIETA)
                </div>
              </div>
              ` : ''}

              <!-- Action CTA -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" bgcolor="#00BCF2">
                    <a href="${portalUrl}" target="_blank" style="font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 13px; font-weight: 800; color: #020617 !important; text-decoration: none; padding: 13px 26px; display: inline-block; letter-spacing: 1px; text-transform: uppercase;">
                      ACCESS TEAM PORTAL →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- WhatsApp Community Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; background: linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(7, 16, 30, 0.95) 100%); border: 1px solid rgba(37, 211, 102, 0.35);">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 13px; font-weight: bold; color: #25D366; margin-bottom: 6px;">
                      💬 JOIN THE PARTICIPANT COMMUNITY
                    </div>
                    <p style="margin: 0 0 10px; font-size: 12.5px; color: #94A3B8; line-height: 1.5;">
                      All hackathon announcements, round deadlines, and mentor updates will be shared in the Official WhatsApp Community.
                    </p>
                    <a href="${whatsappUrl}" target="_blank" style="font-size: 12px; font-weight: bold; color: #25D366; text-decoration: underline;">
                      Join Official WhatsApp Community →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Sign-off -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 18px; margin-top: 24px;">
                <tr>
                  <td style="font-size: 13px; line-height: 1.5; color: #94A3B8;">
                    Regards,<br>
                    <strong style="color: #FFFFFF; font-size: 13.5px;">Microsoft Club SIST</strong><br>
                    Student Development Cell<br>
                    Sathyabama Institute of Science and Technology<br>
                    Chennai, Tamil Nadu
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background: #030712; border-top: 1px solid rgba(0, 188, 242, 0.2); text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #64748B; letter-spacing: 0.5px;">
                This is an automated operational notification from the ORION 1.0 Secretariat.
              </p>
              <p style="margin: 0; font-size: 10.5px; color: #475569;">
                © 2026 ORION 1.0 • Microsoft Club SIST. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Main Email Container -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Dispatch Registration Received / Welcome email to Team Leader
 */
export async function sendRegistrationReceivedEmail(
  team: TeamRecord
): Promise<MailResult> {
  const to = validRecipient(team, 'registration-received');
  if (!to) return { success: false, error: 'Invalid or missing team leader email' };

  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;
  const roster = team.members
    .map((m, i) => `  ${i + 1}. ${m.member_name} (${m.member_phone})`)
    .join('\n');

  const text = [
    `Hello ${team.leader_name},`,
    '',
    `Thank you for registering team "${team.team_name}" for ORION 1.0, the 24-hour national hackathon hosted by Microsoft Club SIST at Sathyabama Institute of Science and Technology, Chennai.`,
    '',
    'YOUR TEAM RECORD',
    `  Portal Username  : ${team.username}`,
    `  Registration ID  : ${team.registration_id}`,
    `  Access passcode  : ${team.access_token}`,
    `  Team leader      : ${team.leader_name} (${team.leader_email})`,
    `  Institution      : ${team.institution}`,
    `  Problem statement: ${team.problem_statement}`,
    '',
    `SQUAD MEMBERS (${team.members.length} in addition to the leader)`,
    roster || '  (none recorded)',
    '',
    'Keep the access passcode private — it is what unlocks your team portal.',
    '',
    'NEXT STEP: PAY THE ROUND 1 ENTRY FEE',
    `Your registration is not confirmed until the Rs.${team.amount || 100} entry fee for the squad is paid and verified. Open the portal, pay via the UPI details shown there, and enter the UTR / transaction reference.`,
    '',
    `Team portal: ${portalUrl}`,
    textFooter()
  ].join('\n');

  return dispatchMail({
    to,
    subject: `Registration received — ${team.team_name} (${team.registration_id})`,
    html: generateRegistrationReceivedHtml(team),
    text,
    kind: 'registration-received',
    registrationId: team.registration_id,
    username: team.username
  });
}


// ==============================================================================
// Round 1 Re-upload Request Decision Notices
// ==============================================================================

/**
 * Compact shared shell for the short transactional notices. The registration and
 * payment templates above are full marketing-weight layouts; these are decision
 * receipts, so they stay small and fast to render.
 */
function decisionShell(opts: {
  title: string;
  preview: string;
  accent: string;
  badge: string;
  bodyRows: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:28px 10px;background-color:#020617;color:#F8FAFC;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  ${preheader(opts.preview)}

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#07101E;border:1px solid rgba(0,188,242,0.35);">

          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" height="4" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="25%" bgcolor="#F25022" style="font-size:1px;line-height:4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#7FBA00" style="font-size:1px;line-height:4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#00A4EF" style="font-size:1px;line-height:4px;">&nbsp;</td>
                  <td width="25%" bgcolor="#FFB900" style="font-size:1px;line-height:4px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 26px 18px;background:#0B192C;border-bottom:1px solid rgba(0,188,242,0.2);text-align:center;">
              <div style="font-size:11px;font-weight:700;color:#00A4EF;letter-spacing:1.5px;text-transform:uppercase;">
                MICROSOFT CLUB SIST
              </div>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;">
                ORION <span style="color:#22D3EE;">1.0</span>
              </h1>
              <div style="margin-top:10px;display:inline-block;padding:5px 14px;background:${opts.accent}1F;border:1px solid ${opts.accent};font-size:11px;font-weight:700;color:${opts.accent};letter-spacing:1.2px;text-transform:uppercase;">
                ${escapeHtml(opts.badge)}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 26px 20px;color:#E2E8F0;font-size:14.5px;line-height:1.65;">
              ${opts.bodyRows}

              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:26px auto 6px;">
                <tr>
                  <td bgcolor="${opts.accent}" style="text-align:center;">
                    <a href="${opts.ctaUrl}" target="_blank" style="font-size:13px;font-weight:800;color:#020617 !important;text-decoration:none;padding:13px 26px;display:inline-block;letter-spacing:1px;text-transform:uppercase;">
                      ${escapeHtml(opts.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:14px 0 0;font-size:11.5px;color:#64748B;text-align:center;">
                Direct link: <a href="${opts.ctaUrl}" style="color:#38BDF8;">${opts.ctaUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 26px 22px;background:#050C18;border-top:1px solid rgba(255,255,255,0.08);text-align:center;font-size:11px;color:#64748B;line-height:1.6;">
              ORION 1.0 &mdash; 24-Hour National Hackathon<br>
              Microsoft Club SIST, Sathyabama Institute of Science and Technology, Chennai<br>
              <span style="color:#475569;">You are receiving this because your team registered for ORION 1.0.</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function generateReuploadApprovedHtml(team: TeamRecord, note?: string | null): string {
  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;

  const noteBlock = note
    ? `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#030712;border-left:3px solid #10B981;">
        <tr><td style="padding:12px 16px;">
          <div style="font-size:11px;font-weight:700;color:#10B981;letter-spacing:1.2px;text-transform:uppercase;">Note from the organisers</div>
          <div style="margin-top:6px;color:#E2E8F0;font-size:13.5px;">${escapeHtml(note)}</div>
        </td></tr>
      </table>`
    : '';

  return decisionShell({
    title: 'ORION 1.0 — Re-upload Approved',
    preview: `You may now upload one replacement deck for ${team.team_name}.`,
    accent: '#10B981',
    badge: 'Re-upload Approved',
    ctaLabel: 'Upload Replacement Deck',
    ctaUrl: portalUrl,
    bodyRows: `
      <p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#FFFFFF;">Hello ${escapeHtml(team.leader_name)},</p>

      <p style="margin:0 0 14px;">
        Your request to replace the Round 1 presentation for
        <strong style="color:#FFFFFF;">${escapeHtml(team.team_name)}</strong>
        (<span style="color:#22D3EE;font-weight:700;">${escapeHtml(team.registration_id)}</span>) has been approved.
      </p>

      ${noteBlock}

      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#030712;border:1px solid rgba(16,185,129,0.4);">
        <tr><td style="padding:14px 16px;">
          <div style="font-size:11px;font-weight:700;color:#10B981;letter-spacing:1.2px;text-transform:uppercase;">This approval covers one upload</div>
          <div style="margin-top:6px;color:#CBD5E1;font-size:13.5px;line-height:1.6;">
            The next deck you upload replaces your current one and becomes the version the jury evaluates.
            Replacing it again needs a fresh request, so upload the final file.
          </div>
        </td></tr>
      </table>

      <p style="margin:0;color:#94A3B8;font-size:13px;">
        Sign in with username <strong style="color:#E2E8F0;">${escapeHtml(team.username)}</strong>
        and your team access passcode.
      </p>
    `
  });
}

export function generateReuploadRejectedHtml(team: TeamRecord, note?: string | null): string {
  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;

  const noteBlock = note
    ? `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#030712;border-left:3px solid #F59E0B;">
        <tr><td style="padding:12px 16px;">
          <div style="font-size:11px;font-weight:700;color:#F59E0B;letter-spacing:1.2px;text-transform:uppercase;">Reason given</div>
          <div style="margin-top:6px;color:#E2E8F0;font-size:13.5px;">${escapeHtml(note)}</div>
        </td></tr>
      </table>`
    : '';

  return decisionShell({
    title: 'ORION 1.0 — Re-upload Request Declined',
    preview: `Your existing deck for ${team.team_name} stands as the final submission.`,
    accent: '#F59E0B',
    badge: 'Request Declined',
    ctaLabel: 'View Team Portal',
    ctaUrl: portalUrl,
    bodyRows: `
      <p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#FFFFFF;">Hello ${escapeHtml(team.leader_name)},</p>

      <p style="margin:0 0 14px;">
        Your request to replace the Round 1 presentation for
        <strong style="color:#FFFFFF;">${escapeHtml(team.team_name)}</strong>
        (<span style="color:#22D3EE;font-weight:700;">${escapeHtml(team.registration_id)}</span>) was not approved.
      </p>

      ${noteBlock}

      <p style="margin:0 0 14px;color:#CBD5E1;">
        The presentation already on file stands as your final Round 1 submission and will be evaluated as-is.
      </p>

      <p style="margin:0;color:#94A3B8;font-size:13px;">
        If you believe this was decided in error, reply to this email with the details before the Round 1 deadline.
      </p>
    `
  });
}

export async function sendReuploadApprovedEmail(
  team: TeamRecord,
  note?: string | null
): Promise<MailResult> {
  const to = validRecipient(team, 'reupload-approved');
  if (!to) return { success: false, error: 'Invalid or missing team leader email' };

  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;
  const text = [
    `Hello ${team.leader_name},`,
    '',
    `Your request to replace the Round 1 presentation for team "${team.team_name}" (${team.registration_id}) has been approved.`,
    ...(note ? ['', 'NOTE FROM THE ORGANISERS', `  ${note}`] : []),
    '',
    'THIS APPROVAL COVERS ONE UPLOAD',
    '  The next deck you upload replaces your current one and becomes the version',
    '  the jury evaluates. Replacing it again needs a fresh request, so upload the',
    '  final file.',
    '',
    `Upload it here: ${portalUrl}`,
    `Registration ID: ${team.registration_id}`,
    `Access passcode: ${team.access_token}`,
    textFooter()
  ].join('\n');

  return dispatchMail({
    to,
    subject: `Re-upload approved — ${team.team_name} may replace its Round 1 deck (${team.registration_id})`,
    html: generateReuploadApprovedHtml(team, note),
    text,
    kind: 'reupload-approved',
    registrationId: team.registration_id,
    username: team.username
  });
}

export async function sendReuploadRejectedEmail(
  team: TeamRecord,
  note?: string | null
): Promise<MailResult> {
  const to = validRecipient(team, 'reupload-rejected');
  if (!to) return { success: false, error: 'Invalid or missing team leader email' };

  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;
  const text = [
    `Hello ${team.leader_name},`,
    '',
    `Your request to replace the Round 1 presentation for team "${team.team_name}" (${team.registration_id}) was not approved.`,
    ...(note ? ['', 'REASON GIVEN', `  ${note}`] : []),
    '',
    'The presentation already on file stands as your final Round 1 submission and',
    'will be evaluated as-is.',
    '',
    `Team portal: ${portalUrl}`,
    '',
    'If you believe this was decided in error, reply to this email with the details',
    'before the Round 1 deadline.',
    textFooter()
  ].join('\n');

  return dispatchMail({
    to,
    subject: `Re-upload request declined — ${team.team_name} (${team.registration_id})`,
    html: generateReuploadRejectedHtml(team, note),
    text,
    kind: 'reupload-rejected',
    registrationId: team.registration_id,
    username: team.username
  });
}

// ==============================================================================
// Passcode reset
// ==============================================================================
//
// Neither template below contains a passcode — not the old one, not the new
// one. Every other mail in this file prints `team.access_token` because it is
// a convenience reminder sent to a team that already has it. These two are
// different: the reset mail is the thing an attacker would be trying to
// provoke, and the confirmation is sent AFTER a change that may not have been
// authorised. Putting a working credential in either would hand it straight to
// whoever triggered the flow.

export function generatePasscodeResetHtml(team: TeamRecord, resetUrl: string, ttlMinutes: number): string {
  return decisionShell({
    title: 'ORION 1.0 — Reset Your Portal Passcode',
    preview: `Set a new portal passcode for ${team.team_name}. This link expires in ${ttlMinutes} minutes.`,
    accent: '#F59E0B',
    badge: 'Passcode Reset',
    ctaLabel: 'Set a New Passcode',
    ctaUrl: resetUrl,
    bodyRows: `
      <p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#FFFFFF;">Hello ${escapeHtml(team.leader_name)},</p>

      <p style="margin:0 0 14px;">
        Someone asked to reset the portal passcode for
        <strong style="color:#FFFFFF;">${escapeHtml(team.team_name)}</strong>
        (<span style="color:#22D3EE;font-weight:700;">${escapeHtml(team.registration_id)}</span>).
        Use the button above to choose a new one.
      </p>

      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#030712;border:1px solid rgba(245,158,11,0.4);">
        <tr><td style="padding:14px 16px;">
          <div style="font-size:11px;font-weight:700;color:#F59E0B;letter-spacing:1.2px;text-transform:uppercase;">This link expires in ${ttlMinutes} minutes</div>
          <div style="margin-top:6px;color:#CBD5E1;font-size:13.5px;line-height:1.6;">
            It also works only once. If it expires before you get to it, start again
            from the portal sign-in page and request a fresh link.
          </div>
        </td></tr>
      </table>

      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#030712;border-left:3px solid #64748B;">
        <tr><td style="padding:12px 16px;">
          <div style="font-size:11px;font-weight:700;color:#94A3B8;letter-spacing:1.2px;text-transform:uppercase;">Did not request this?</div>
          <div style="margin-top:6px;color:#CBD5E1;font-size:13.5px;line-height:1.6;">
            Ignore this email and nothing changes — your current passcode keeps working
            and the link above stops being usable on its own. Reply to this message if
            you keep receiving reset mail you did not ask for.
          </div>
        </td></tr>
      </table>

      <p style="margin:0;color:#94A3B8;font-size:13px;word-break:break-all;">
        Button not working? Paste this into your browser:<br>
        <span style="color:#BAE6FD;">${escapeHtml(resetUrl)}</span>
      </p>
    `
  });
}

export async function sendPasscodeResetEmail(
  team: TeamRecord,
  resetUrl: string,
  ttlMinutes: number
): Promise<MailResult> {
  const to = validRecipient(team, 'passcode-reset');
  if (!to) return { success: false, error: 'Invalid or missing team leader email' };

  const text = [
    `Hello ${team.leader_name},`,
    '',
    `Someone asked to reset the portal passcode for team "${team.team_name}" (${team.registration_id}).`,
    '',
    'Set a new passcode here:',
    `  ${resetUrl}`,
    '',
    `THIS LINK EXPIRES IN ${ttlMinutes} MINUTES`,
    '  It also works only once. If it expires before you get to it, request a fresh',
    '  link from the portal sign-in page.',
    '',
    'DID NOT REQUEST THIS?',
    '  Ignore this email and nothing changes — your current passcode keeps working.',
    '  Reply to this message if you keep receiving reset mail you did not ask for.',
    textFooter()
  ].join('\n');

  return dispatchMail({
    to,
    subject: `Reset your ORION 1.0 portal passcode — ${team.team_name} (${team.registration_id})`,
    html: generatePasscodeResetHtml(team, resetUrl, ttlMinutes),
    text,
    kind: 'passcode-reset',
    registrationId: team.registration_id,
    username: team.username
  });
}

export function generatePasscodeChangedHtml(team: TeamRecord): string {
  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;

  return decisionShell({
    title: 'ORION 1.0 — Portal Passcode Changed',
    preview: `The portal passcode for ${team.team_name} was just changed.`,
    accent: '#10B981',
    badge: 'Passcode Changed',
    ctaLabel: 'Sign In to the Portal',
    ctaUrl: portalUrl,
    bodyRows: `
      <p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#FFFFFF;">Hello ${escapeHtml(team.leader_name)},</p>

      <p style="margin:0 0 14px;">
        The portal passcode for
        <strong style="color:#FFFFFF;">${escapeHtml(team.team_name)}</strong>
        (<span style="color:#22D3EE;font-weight:700;">${escapeHtml(team.registration_id)}</span>)
        was just changed. Sign in with your Team ID and the passcode you chose.
      </p>

      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#030712;border:1px solid rgba(244,63,94,0.4);">
        <tr><td style="padding:14px 16px;">
          <div style="font-size:11px;font-weight:700;color:#FB7185;letter-spacing:1.2px;text-transform:uppercase;">If this was not you</div>
          <div style="margin-top:6px;color:#CBD5E1;font-size:13.5px;line-height:1.6;">
            Reply to this email straight away. Someone with access to this inbox changed
            your team's portal credentials, and the organisers need to know.
          </div>
        </td></tr>
      </table>

      <p style="margin:0;color:#94A3B8;font-size:13px;">
        For your own security this message does not contain the new passcode.
        If you have already forgotten it, request another reset from the sign-in page.
      </p>
    `
  });
}

export async function sendPasscodeChangedEmail(
  team: TeamRecord
): Promise<MailResult> {
  const to = validRecipient(team, 'passcode-changed');
  if (!to) return { success: false, error: 'Invalid or missing team leader email' };

  const portalUrl = `${SITE_URL}/portal?username=${encodeURIComponent(team.username)}`;
  const text = [
    `Hello ${team.leader_name},`,
    '',
    `The portal passcode for team "${team.team_name}" (${team.registration_id}) was just changed.`,
    'Sign in with your Team ID and the passcode you chose.',
    '',
    `Portal: ${portalUrl}`,
    '',
    'IF THIS WAS NOT YOU',
    '  Reply to this email straight away. Someone with access to this inbox changed',
    "  your team's portal credentials, and the organisers need to know.",
    '',
    'For your own security this message does not contain the new passcode. If you',
    'have already forgotten it, request another reset from the sign-in page.',
    textFooter()
  ].join('\n');

  return dispatchMail({
    to,
    subject: `Portal passcode changed — ${team.team_name} (${team.registration_id})`,
    html: generatePasscodeChangedHtml(team),
    text,
    kind: 'passcode-changed',
    registrationId: team.registration_id,
    username: team.username
  });
}
