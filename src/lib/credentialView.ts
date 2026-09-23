export type CredentialRecord = {
  source_index: number;
  team_id: string | null;
  team_leader: string | null;
  username: string | null;
  password: string | null;
};

export function filterCredentials(rows: CredentialRecord[], query: string): CredentialRecord[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(row =>
    [row.team_id, row.team_leader, row.username].some(value =>
      value?.toLowerCase().includes(needle)
    )
  );
}

export function paginateCredentials(rows: CredentialRecord[], requestedPage: number, pageSize = 100) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.trunc(requestedPage) || 1));
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page, pageCount, start };
}
