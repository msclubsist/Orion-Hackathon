import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  portalApiGuard: vi.fn(),
  isAdminRequest: vi.fn(),
  checkRateLimit: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/features', () => ({ portalApiGuard: mocks.portalApiGuard }));
vi.mock('@/lib/adminAuth', () => ({ isAdminRequest: mocks.isAdminRequest }));
vi.mock('@/lib/rateLimit', () => ({
  getClientIp: () => '127.0.0.1',
  checkRateLimit: mocks.checkRateLimit,
}));
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
  supabase: { from: mocks.from },
}));

import { GET } from '../src/app/api/admin/credentials/route';

const request = () => new Request('http://localhost/api/admin/credentials');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.portalApiGuard.mockReturnValue(null);
  mocks.isAdminRequest.mockReturnValue(true);
  mocks.checkRateLimit.mockReturnValue({ allowed: true });
  mocks.isSupabaseConfigured.mockReturnValue(true);
});

describe('admin credentials API', () => {
  it('returns no credentials without an admin session', async () => {
    mocks.isAdminRequest.mockReturnValue(false);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('stops at the portal feature guard before reading the database', async () => {
    mocks.portalApiGuard.mockReturnValue(Response.json({ error: 'Not found' }, { status: 404 }));

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('loads all 907 source records across database pages for an admin', async () => {
    const rows = Array.from({ length: 907 }, (_, source_index) => ({
      source_index,
      team_id: `ORION-S${String(source_index + 1).padStart(4, '0')}`,
      team_leader: `Leader ${source_index + 1}`,
      username: `team${source_index + 1}`,
      password: `pass${source_index + 1}`,
    }));
    const range = vi.fn((first: number, last: number) =>
      Promise.resolve({ data: rows.slice(first, last + 1), error: null })
    );
    mocks.from.mockReturnValue({ select: () => ({ order: () => ({ range }) }) });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(mocks.from).toHaveBeenCalledWith('team_credentials');
    expect(range).toHaveBeenCalledTimes(2);
    expect(body.count).toBe(907);
    expect(body.credentials).toHaveLength(907);
    expect(body.credentials[906].team_id).toBe('ORION-S0907');
  });

  it('fails closed when Supabase is unavailable', async () => {
    mocks.isSupabaseConfigured.mockReturnValue(false);

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('does not expose database error details in the response', async () => {
    mocks.from.mockReturnValue({ select: () => ({ order: () => ({ range: () =>
      Promise.resolve({ data: null, error: { message: 'secret database detail' } })
    }) }) });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secret database detail');
  });
});
