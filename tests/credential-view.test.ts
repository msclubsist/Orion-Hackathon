import { describe, expect, it } from 'vitest';
import { filterCredentials, paginateCredentials } from '../src/lib/credentialView';

const credentials = Array.from({ length: 907 }, (_, source_index) => ({
  source_index,
  team_id: `ORION-S${String(source_index + 1).padStart(4, '0')}`,
  team_leader: `Leader ${source_index + 1}`,
  username: `team${source_index + 1}`,
  password: `pass${source_index + 1}`,
}));

describe('admin credential list', () => {
  it('searches records beyond the first database and display page', () => {
    expect(filterCredentials(credentials, ' s0907 ')).toEqual([credentials[906]]);
  });

  it('makes every source row reachable through pagination', () => {
    const first = paginateCredentials(credentials, 1, 100);
    const indexes = Array.from({ length: first.pageCount }, (_, page) =>
      paginateCredentials(credentials, page + 1, 100).rows.map(row => row.source_index)
    ).flat();

    expect(first.pageCount).toBe(10);
    expect(indexes).toEqual(credentials.map(row => row.source_index));
  });

  it('clamps a stale page after filtering', () => {
    const filtered = filterCredentials(credentials, 'ORION-S0907');

    expect(paginateCredentials(filtered, 10, 100).rows).toEqual([credentials[906]]);
  });
});
