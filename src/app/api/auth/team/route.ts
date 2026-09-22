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

    // `teamId` is the wire name kept for older clients; the value is a
    // username — the team's own name, lowercased with spaces removed.
    const body = await request.json();
    const username = body?.username ?? body?.teamId;

    if (!username?.trim() || !body?.secret?.trim()) {
      return NextResponse.json({ error: 'Username and access passcode are required' }, { status: 400 });
    }

    const team = await serverStore.authenticateTeam(username, body.secret);

    if (!team) {
      return NextResponse.json({
        error: 'Invalid credentials. Your username is your team name as one word and your ' +
               'passcode is your team leader\'s name as one word — drop the spaces and ' +
               'punctuation from both, so "Tech Titans" led by "Deekshith. P" is ' +
               'techtitans / deekshithp. Capitals do not matter.'
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
