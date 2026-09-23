import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { portalApiGuard } from '@/lib/features';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const PAGE_SIZE = 500;

export async function GET(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  const rate = checkRateLimit(`admin-credentials-${getClientIp(request)}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: NO_STORE });
  }
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: NO_STORE });
  }
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Credentials database unavailable.' }, { status: 503, headers: NO_STORE });
  }

  try {
    const credentials = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('team_credentials')
        .select('source_index,team_id,team_leader,username,password')
        .order('source_index', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error || !data) throw error || new Error('No credential data returned');
      credentials.push(...data);
      if (data.length < PAGE_SIZE) break;
    }

    return NextResponse.json(
      { success: true, count: credentials.length, credentials },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('[Admin credentials] Failed to load imported records:', error);
    return NextResponse.json({ error: 'Could not load team credentials.' }, { status: 500, headers: NO_STORE });
  }
}
