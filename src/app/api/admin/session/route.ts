import { NextResponse } from 'next/server';
import {
  buildAdminSessionCookie,
  buildClearedAdminSessionCookie,
  isAdminRequest,
  isAdminSecretUsable,
  issueAdminSessionToken,
  verifyAdminPasscode
} from '@/lib/adminAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { portalApiGuard } from '@/lib/features';

// Exchanges the admin passcode for an HttpOnly session cookie so the console
// never has to hold ADMIN_SECRET_KEY in browser-readable storage.

export async function POST(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  try {
    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`admin-session-${clientIp}`, 10, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    if (!isAdminSecretUsable()) {
      // Fail closed: an unset or trivially short ADMIN_SECRET_KEY must never
      // resolve to "anything matches".
      console.error('[Admin] ADMIN_SECRET_KEY is unset or shorter than 8 characters — admin login is disabled.');
      return NextResponse.json(
        { success: false, error: 'Admin access is not configured on this deployment.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const passcode = String(body?.passcode ?? '');

    if (!verifyAdminPasscode(passcode)) {
      return NextResponse.json({ success: false, error: 'Incorrect Admin Passcode' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true, authorized: true });
    res.headers.append('Set-Cookie', buildAdminSessionCookie(issueAdminSessionToken()));
    return res;
  } catch {
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}

/** Cheap probe so the console can restore a session after a page reload. */
export async function GET(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  return NextResponse.json({ success: true, authenticated: isAdminRequest(request) });
}

export async function DELETE() {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  const res = NextResponse.json({ success: true });
  res.headers.append('Set-Cookie', buildClearedAdminSessionCookie());
  return res;
}
