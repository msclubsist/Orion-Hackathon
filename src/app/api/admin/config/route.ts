import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/serverStore';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isAdminRequest } from '@/lib/adminAuth';
import { portalApiGuard } from '@/lib/features';

export async function GET(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  try {
    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`admin-config-get-${clientIp}`, 30, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: `Too many requests. Please wait ${rate.resetInSec}s.` }, { status: 429 });
    }

    const config = await serverStore.getConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch config';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  try {
    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`admin-config-${clientIp}`, 15, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many configuration requests' }, { status: 429 });
    }

    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config, actor = 'Admin' } = body;

    if (!config) {
      return NextResponse.json({ error: 'Config payload is required' }, { status: 400 });
    }

    const updated = await serverStore.updateConfig(config, actor);
    return NextResponse.json({ success: true, config: updated });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Config update failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
