'use client';

import React, { useState } from 'react';
import { 
  X, 
  Search, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { INITIAL_REGISTERED_TEAMS, SUBMISSION_DRIVE_URL } from '../../data/orionData';
import type { RegisteredTeam } from '../../types/orion';
import { sound } from '../../audio/soundEffects';

interface TeamStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams?: RegisteredTeam[];
}

export const TeamStatusModal: React.FC<TeamStatusModalProps> = ({ isOpen, onClose, teams = INITIAL_REGISTERED_TEAMS }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<RegisteredTeam | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  if (!isOpen) return null;

  const performLookup = async (searchStr: string) => {
    const cleanQuery = searchStr.trim();
    if (!cleanQuery) return;

    setIsSearching(true);
    setHasSearched(false);
    setLookupError(null);

    try {
      const response = await fetch(`/api/status?q=${encodeURIComponent(cleanQuery)}`);
      const json = await response.json().catch(() => null);

      if (response.ok && json) {
        // Only an authoritative found:false means "no record". Anything else
        // — a 429 from the shared campus NAT, a 500 — must NOT be reported as
        // the team not existing.
        setResult(json.found && json.data ? json.data : null);
        setHasSearched(true);
        setIsSearching(false);
        return;
      }

      setResult(null);
      setLookupError(
        response.status === 429
          ? (json?.error || 'The lookup is busy right now — wait a minute and try again.')
          : 'The status service hit a snag — please try again in a moment.'
      );
      setHasSearched(true);
      setIsSearching(false);
      return;
    } catch {
      // Network failure — fall through to the locally passed roster, if any.
    }

    const lower = cleanQuery.toLowerCase();
    const found = teams.find(
      (t) =>
        t.teamId.toLowerCase() === lower ||
        (t.username || '').toLowerCase() === lower.replace(/[^a-z0-9]/g, '') ||
        t.teamName.toLowerCase().includes(lower) ||
        t.leaderEmail.toLowerCase() === lower
    );

    setResult(found || null);
    if (!found) {
      setLookupError('Could not reach the status service — check your connection and try again.');
    }
    setHasSearched(true);
    setIsSearching(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    performLookup(query);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <GlassCard
          glowColor="cyan"
          className="p-6 sm:p-8 border border-[#38BDF8]/50 bg-[#07193D] shadow-[0_16px_50px_rgba(2,8,24,0.9)] rounded-none text-left"
          withHudCorners={true}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[rgba(212,233,255,0.12)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#0B2556] border border-[#38BDF8]/40 text-[#38BDF8] shadow-sm">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono-hud text-[#38BDF8] font-bold uppercase tracking-wider">
                  <span>LIVE SQUAD VERIFICATION</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-black text-white">
                  SQUAD STATUS LOOKUP
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playModalClose();
                onClose();
              }}
              className="p-1.5 rounded-none bg-[#040E24] border border-[rgba(212,233,255,0.12)] hover:border-[#38BDF8]/50 text-[#BAE6FD] hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. ORION-2026-0147, Leader Email, or Team Name"
                className="flex-1 px-3.5 py-2.5 rounded-none bg-[#040E24] border border-[rgba(212,233,255,0.14)] text-white text-xs font-mono-hud focus:outline-none focus:border-[#38BDF8] transition-colors"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="btn-sheen btn-glow-cyan px-5 py-2.5 rounded-none font-display font-bold text-xs tracking-wider text-[#040E24] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#38BDF8] hover:opacity-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5 text-[#040E24]" />
                <span>{isSearching ? 'LOOKING UP...' : 'QUERY'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2.5 text-[10px] font-mono-hud text-[#7DD3FC]">
              <span className="text-[#38BDF8]">LOOKUP BY:</span>
              <span className="text-slate-300">Team ID (ORION-2026-XXXX)</span>
              <span>•</span>
              <span className="text-slate-300">Leader Email</span>
              <span>•</span>
              <span className="text-slate-300">Team Name</span>
            </div>
          </form>

          {hasSearched && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              {result ? (
                <div className="p-5 rounded-none bg-[#040E24] border border-[#38BDF8]/40 space-y-4 shadow-lg relative">
                  <span className="absolute top-2 right-2 font-mono-hud text-[7px] text-emerald-400 font-bold bg-[#07193D] px-1.5 py-0.5 border border-emerald-400/40">
                    [CHECKSUM: VALID]
                  </span>

                  <div className="flex items-center justify-between pb-3 border-b border-[rgba(212,233,255,0.1)]">
                    <div>
                      <span className="text-[10px] font-mono-hud text-[#7DD3FC]">TEAM DOSSIER</span>
                      <h4 className="text-lg font-display font-black text-white">
                        {result.teamName}
                      </h4>
                    </div>
                    <span className={`text-[10px] font-mono-hud px-2.5 py-1 rounded-none font-bold ${
                      result.status.includes('Top 70')
                        ? 'bg-[#38BDF8] text-[#040E24] shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                        : 'bg-[#0B2556] text-[#BAE6FD] border border-[rgba(212,233,255,0.14)]'
                    }`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono-hud text-[#7DD3FC] block">USERNAME</span>
                      <span className="text-white font-mono-hud font-bold">{result.username || result.teamId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono-hud text-[#7DD3FC] block">SELECTED TRACK</span>
                      <span className="text-[#38BDF8] font-sans font-semibold">{result.track}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono-hud text-[#7DD3FC] block">SQUAD LEADER</span>
                      <span className="text-white font-sans">{result.leaderName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono-hud text-[#7DD3FC] block">CREW SIZE</span>
                      <span className="text-white font-mono-hud">{result.membersCount} Members</span>
                    </div>
                  </div>

                  <div className="pt-3 text-[10px] font-mono-hud text-[#7DD3FC] border-t border-[rgba(212,233,255,0.1)] flex items-center justify-between">
                    <span>INSTITUTE: {result.institution}</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      RECORD VALIDATED
                    </span>
                  </div>

                  <div className="pt-2">
                    <a
                      href={SUBMISSION_DRIVE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="btn-glow-cyan w-full py-2.5 font-display font-bold text-xs text-[#040E24] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#38BDF8] flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <span>UPLOAD PPT TO DRIVE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : lookupError ? (
                <div className="p-6 rounded-none bg-[#1B1904] border border-amber-500/40 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                  <div className="text-xs font-mono-hud text-amber-300 font-bold">
                    LOOKUP TEMPORARILY UNAVAILABLE
                  </div>
                  <p className="text-xs text-[#BAE6FD] font-sans">
                    {lookupError} Your registration is unaffected.
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-none bg-[#040E24] border border-[rgba(212,233,255,0.1)] text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                  <div className="text-xs font-mono-hud text-white font-bold">
                    NO SQUAD RECORD FOUND
                  </div>
                  <p className="text-xs text-[#BAE6FD] font-sans">
                    No matching registration dossier for &ldquo;{query}&rdquo;. Check spelling or register your squadron today.
                  </p>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
