import { NextResponse } from 'next/server';
import { serverStore, safeEqualCI, toTeamFacingRecord } from '@/lib/serverStore';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { withSignedSubmissionUrls } from '@/lib/storage';
import { registrationApiGuard } from '@/lib/features';

export async function GET(request: Request) {
  const disabled = registrationApiGuard();
  if (disabled) return disabled;

  try {
    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`team-portal-${clientIp}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = (searchParams.get('teamId') || '').trim();
    const token = (request.headers.get('x-team-token') || searchParams.get('token') || '').trim();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID parameter is required' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: 'Authentication required. Missing team access token.' }, { status: 401 });
    }

    const team = await serverStore.getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team dossier not found' }, { status: 404 });
    }

    // Passcode only. The leader's email used to be accepted as the token,
    // which turned a semi-public address into a full portal credential.
    if (!team.access_token || !safeEqualCI(team.access_token, token)) {
      return NextResponse.json({ error: 'Unauthorized access. Invalid team security credentials.' }, { status: 401 });
    }

    const config = await serverStore.getConfig();

    const teamFacing = toTeamFacingRecord(team);
    // The bucket is private: mint a signed link for this authenticated read
    // instead of storing a permanent public URL.
    teamFacing.submissions = await withSignedSubmissionUrls(teamFacing.submissions || []);

    return NextResponse.json({
      success: true,
      team: teamFacing,
      config
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load team data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
