import { NextResponse } from 'next/server';
import { serverStore, toTeamFacingRecord } from '@/lib/serverStore';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { portalApiGuard } from '@/lib/features';

export async function POST(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  try {
    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`team-auth-${clientIp}`, 15, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ 
        error: `Too many login attempts. Please wait ${rate.resetInSec}s before retrying.` 
      }, { status: 429 });
    }

    const body = await request.json();
    const username = body?.username ?? body?.teamId;

    if (!username?.trim() || !body?.secret?.trim()) {
      return NextResponse.json({ error: 'Username and access passcode are required' }, { status: 400 });
    }

    const team = await serverStore.authenticateTeam(username, body.secret);

    if (!team) {
      return NextResponse.json({
        error: 'Invalid credentials. Your username is your Team Name and your passcode is the unique code provided in the official Excel allocation sheet.'
      }, { status: 401 });
    }

    const config = await serverStore.getConfig();

    return NextResponse.json({
      success: true,
      team: toTeamFacingRecord(team),
      config
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
