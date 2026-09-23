'use client';

import { useEffect, useMemo, useState } from 'react';
import { filterCredentials, paginateCredentials, type CredentialRecord } from '@/lib/credentialView';

export function CredentialsPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revealPasswords, setRevealPasswords] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/credentials', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        if (response.status === 401) {
          onUnauthorized();
          return;
        }
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.credentials)) {
          throw new Error(result.error || 'Could not load credentials.');
        }
        if (active) setCredentials(result.credentials);
      })
      .catch(() => {
        if (active) setError('Could not load credentials. Try reopening this tab.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [onUnauthorized]);

  const filtered = useMemo(() => filterCredentials(credentials, query), [credentials, query]);
  const current = paginateCredentials(filtered, page);

  return (
    <section className="p-4 sm:p-5 bg-[#07193D] border border-white/10 space-y-4 text-xs font-mono" aria-label="Imported team credentials">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h2 className="font-mono-hud text-[#38BDF8] font-bold">IMPORTED TEAM CREDENTIALS</h2>
          <p className="text-slate-400 mt-1">{loading ? 'Loading…' : `${credentials.length} source records · ${filtered.length} shown`}</p>
        </div>
        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
          <input type="checkbox" checked={revealPasswords} onChange={event => setRevealPasswords(event.target.checked)} />
          Reveal passwords
        </label>
      </div>

      {error && <p role="alert" className="text-red-300">{error}</p>}
      {!loading && !error && (
        <>
          <input
            type="search"
            value={query}
            onChange={event => { setQuery(event.target.value); setPage(1); }}
            placeholder="Search registration ID, leader, or username"
            aria-label="Search imported credentials"
            className="w-full max-w-xl bg-[#040E24] border border-white/20 px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-[#38BDF8]"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="text-[#38BDF8] border-b border-white/10">
                <tr><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Registration ID</th><th className="py-2 pr-3">Team leader</th><th className="py-2 pr-3">Username</th><th className="py-2">Password</th></tr>
              </thead>
              <tbody>
                {current.rows.map(row => (
                  <tr key={row.source_index} className="border-b border-white/5 text-slate-200">
                    <td className="py-2 pr-3 text-slate-500">{row.source_index + 1}</td>
                    <td className="py-2 pr-3">{row.team_id ?? '—'}</td>
                    <td className="py-2 pr-3">{row.team_leader ?? '—'}</td>
                    <td className="py-2 pr-3">{row.username ?? '—'}</td>
                    <td className="py-2">{row.password === null ? '—' : revealPasswords ? row.password : '••••••••'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="py-6 text-slate-400">No matching credentials.</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-slate-400">
            <span>{filtered.length ? `${current.start + 1}–${current.start + current.rows.length} of ${filtered.length}` : '0 of 0'}</span>
            <div className="flex items-center gap-3">
              <button type="button" disabled={current.page <= 1} onClick={() => setPage(current.page - 1)} className="disabled:opacity-40 hover:text-white">Previous</button>
              <span>Page {current.page} of {current.pageCount}</span>
              <button type="button" disabled={current.page >= current.pageCount} onClick={() => setPage(current.page + 1)} className="disabled:opacity-40 hover:text-white">Next</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
