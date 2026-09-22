import { isAdminRequest } from '@/lib/adminAuth';
import { serverStore } from '@/lib/serverStore';
import { resolveFileUrl } from '@/lib/storage';
import { receiptContentType } from '@/lib/paymentProof';
import { portalApiGuard } from '@/lib/features';

export async function GET(request: Request) {
  const disabled = portalApiGuard();
  if (disabled) return disabled;

  if (!isAdminRequest(request)) return new Response('Unauthorized', { status: 401 });
  const team = await serverStore.getTeam(new URL(request.url).searchParams.get('teamId') || '');
  const ref = team?.payment?.screenshot_url || '';
  // Old serverless receipts were stored inline. Serve as attachments from an
  // authenticated endpoint, never navigate to participant-supplied HTML/data URLs.
  if (ref.startsWith('data:')) {
    const match = /^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/.exec(ref);
    if (!match || ref.length > 15 * 1024 * 1024) return new Response('Unsupported receipt', { status: 422 });
    const ext = ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'application/pdf': '.pdf' } as Record<string, string>)[match[1]];
    const bytes = Buffer.from(match[2], 'base64');
    if (!receiptContentType(bytes, ext)) return new Response('Invalid receipt', { status: 422 });
    return new Response(new Uint8Array(bytes), { headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="receipt${ext}"`,
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store'
    } });
  }
  const url = await resolveFileUrl(ref);
  if (!url) return new Response('Receipt unavailable', { status: 404 });
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'private, no-store' } });
}
