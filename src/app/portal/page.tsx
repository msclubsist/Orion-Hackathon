'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Upload, 
  Download, 
  Copy, 
  Check, 
  LogOut, 
  Users, 
  ArrowLeft, 
  Sparkles, 
  Calendar, 
  MapPin, 
  MessageSquare,
  Lock,
  Unlock,
  RefreshCw,
  FileCheck,
  ExternalLink,
  Send,
  KeyRound
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { PaymentReceiptModal } from '@/components/modals/PaymentReceiptModal';
import type { TeamRecord, SystemConfig } from '@/types/orion';
import { RESET_TOKEN_TTL_MINUTES } from '@/lib/passcodePolicy';
import { SUBMISSION_DRIVE_URL, EVENT_METRICS } from '@/data/orionData';
import { sound } from '@/audio/soundEffects';
import confetti from 'canvas-confetti';

export default function TeamPortalPage() {
  const teamRef = useRef<TeamRecord | null>(null);
  const refreshInFlightRef = useRef(false);
  const [teamIdInput, setTeamIdInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Only ?username= prefills. Older mail links carry ?teamId=ORION-2026-XXXX,
      // and a registration ID in the username box would just fail the login with
      // no hint why — better to leave the field empty and let the label explain.
      return params.get('username') || sessionStorage.getItem('orion_portal_team_id') || '';
    }
    return '';
  });
  const [secretInput, setSecretInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('token') || sessionStorage.getItem('orion_portal_token') || '';
    }
    return '';
  });
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Authenticated State
  const [team, setTeam] = useState<TeamRecord | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    teamRef.current = team;
  }, [team]);

  // Payment state
  const [utrInput, setUtrInput] = useState('');
  const [payerInput, setPayerInput] = useState('');
  const [payerUpiInput, setPayerUpiInput] = useState('');
  const [noteConfirmed, setNoteConfirmed] = useState(false);
  // Wall-clock for the deadline banner; 0 until mounted so SSR and first
  // client render agree, then refreshed each minute.
  const [nowMs, setNowMs] = useState(0);
  const [paymentScreenshotFile, setPaymentScreenshotFile] = useState<File | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);


  // Forgot-passcode flow — requests a one-time reset link to the registered
  // leader email. Reuses the username field above rather than asking twice.
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLoginDirect = useCallback(async (id: string, token: string) => {
    if (!id || !token) return;
    setIsLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: id.trim(), secret: token.trim() })
      });
      const data = await res.json();
      if (res.ok && data.team) {
        setTeam(data.team);
        setConfig(data.config);
        sessionStorage.setItem('orion_portal_team_id', id.trim());
        sessionStorage.setItem('orion_portal_token', token.trim());
        if (data.team.round_1_status === 'SELECTED') {
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
            sound.playSuccessCelebration();
          }, 300);
        }
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch {
      setAuthError('Connection error during login');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check URL params on initial load
  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    // First tick async so the effect itself does no synchronous setState.
    const first = setTimeout(tick, 0);
    const clock = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(clock);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qTeamId = params.get('username');
      const qToken = params.get('token');

      const savedId = sessionStorage.getItem('orion_portal_team_id');
      const savedToken = sessionStorage.getItem('orion_portal_token');

      const targetId = qTeamId || savedId;
      const targetToken = qToken || savedToken;

      if (targetId && targetToken) {
        // Remove ?teamId=&token= from the URL once consumed. Leaving them there
        // put the passcode in browser history, bookmarks, any screenshot of the
        // address bar, and the Referer of every cross-origin subresource.
        if (qTeamId || qToken) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        const timer = setTimeout(() => {
          handleLoginDirect(targetId, targetToken);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [handleLoginDirect]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    handleLoginDirect(teamIdInput, secretInput);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (!teamIdInput.trim() || !forgotEmail.trim()) return;

    setIsSendingReset(true);
    setForgotMsg(null);
    try {
      const res = await fetch('/api/auth/team/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: teamIdInput.trim(), email: forgotEmail.trim() })
      });
      const data = await res.json();

      // The route answers identically whether or not the details matched, so
      // there is deliberately nothing to branch on here. Anything smarter —
      // "no such team", a different icon on failure — would rebuild in the UI
      // the account-existence oracle the API is careful not to be.
      setForgotMsg(
        res.ok
          ? { type: 'success', text: data.message || 'If those details match, a reset link is on its way.' }
          : { type: 'error', text: data.error || 'Could not send a reset link. Try again shortly.' }
      );
    } catch {
      setForgotMsg({ type: 'error', text: 'Connection error while requesting the reset link.' });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    const currentTeam = teamRef.current;
    if (!currentTeam || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const res = await fetch(
        `/api/team/portal?teamId=${encodeURIComponent(currentTeam.registration_id)}`,
        { headers: { 'x-team-token': currentTeam.access_token } }
      );
      const data = await res.json();
      if (res.ok && data.team) {
        setTeam(data.team);
        if (data.config) setConfig(data.config);
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      refreshInFlightRef.current = false;
    }
  }, []);

  // Pending/review states need reasonably quick feedback. Stable teams use a
  // much slower fallback, and hidden tabs perform no network polling at all.
  useEffect(() => {
    if (!team) return;

    const needsFrequentRefresh =
      ['PENDING', 'RESUBMISSION_REQUIRED'].includes(team.payment_status) ||
      ['SUBMITTED', 'UNDER_REVIEW'].includes(team.round_1_status) ||
      (team.resubmission_requests || []).some(request => request.status === 'PENDING');
    const intervalMs = needsFrequentRefresh ? 30_000 : 120_000;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') handleRefresh();
    };
    const interval = setInterval(() => {
      refreshWhenVisible();
    }, intervalMs);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [team, handleRefresh]);

  const handleLogout = () => {
    sound.playClick();
    sessionStorage.removeItem('orion_portal_team_id');
    sessionStorage.removeItem('orion_portal_token');
    setTeam(null);
  };

  const handleCopy = (text: string, type: 'id' | 'pass') => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  // Payment Submit Handler
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    if (!utrInput.trim() || utrInput.trim().length < 6) {
      setPaymentMsg({ type: 'error', text: 'Please enter a valid UPI UTR reference (min 6 chars).' });
      return;
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,49}@[a-zA-Z][a-zA-Z0-9]{1,40}$/.test(payerUpiInput.trim())) {
      setPaymentMsg({ type: 'error', text: 'Payer UPI ID is COMPULSORY. Enter the UPI ID you paid from (e.g. name@okhdfcbank).' });
      return;
    }
    // A fresh screenshot every submission: the server refuses a payment record
    // without proof, and a resubmission needs proof of the corrected payment.
    if (!paymentScreenshotFile) {
      setPaymentMsg({ type: 'error', text: 'Payment screenshot proof is COMPULSORY. Please select and upload your payment receipt screenshot image.' });
      return;
    }
    if (!noteConfirmed) {
      setPaymentMsg({ type: 'error', text: `Please confirm that you mentioned your team name "${team.team_name}" in the UPI payment note before submitting.` });
      return;
    }

    sound.playClick();
    setIsSubmittingPayment(true);
    setPaymentMsg(null);

    try {
      const formData = new FormData();
      formData.append('teamId', team.registration_id);
      formData.append('accessToken', team.access_token);
      formData.append('utrNumber', utrInput.trim().toUpperCase());
      formData.append('payerName', (payerInput || team.leader_name).trim());
      formData.append('payerUpi', payerUpiInput.trim().toLowerCase());
      formData.append('teamNameInNote', 'true');
      formData.append('amount', String(config?.round1FeeInr || 100));
      formData.append('screenshot', paymentScreenshotFile);

      const res = await fetch('/api/team/payment', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payment reference');
      }

      setPaymentMsg({ type: 'success', text: 'Payment reference & screenshot proof submitted! Awaiting organizer verification.' });
      setUtrInput('');
      setPayerUpiInput('');
      setNoteConfirmed(false);
      setPaymentScreenshotFile(null);
      handleRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setPaymentMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const roundOneSubmissions = (team?.submissions || []).filter(s => s.round_number === 1);

  // The deck the jury sees: the ACCEPTED one, falling back to the newest for
  // records created before submission statuses were introduced.
  const latestSubmission =
    roundOneSubmissions.find(s => s.submission_status === 'ACCEPTED') ||
    (roundOneSubmissions.length > 0 ? roundOneSubmissions[roundOneSubmissions.length - 1] : null);

  const deadlineStr = config?.round1SubmissionDeadline || '2026-09-21T23:59:59+05:30';
  // UI courtesy only — the server independently enforces the deadline on
  // upload. Without this, late participants filled in the whole form and
  // uploaded their deck just to be refused at submit time.
  const deadlineMs = new Date(deadlineStr).getTime();
  const isPastDeadline = nowMs > 0 && Number.isFinite(deadlineMs) && nowMs > deadlineMs;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-[#00BCF2]/30 selection:text-[#BAE6FD] relative pb-20">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#0078D4]/15 via-[#00BCF2]/10 to-transparent blur-3xl opacity-70" />
      </div>

      {/* Header Bar */}
      <header className="relative z-20 border-b border-white/10 bg-[#0B1220]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/orion-logo-v1.webp" alt="ORION 1.0" width={512} height={512} sizes="32px" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(0,188,242,0.5)]" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-sm text-white group-hover:text-[#00BCF2] transition-colors">ORION 1.0</span>
                <span className="text-[9px] font-mono bg-[#00BCF2]/15 text-[#38BDF8] px-1.5 py-0.2 border border-[#00BCF2]/30">TEAM DASHBOARD</span>
              </div>
              <div className="text-[9px] font-sans text-slate-400">Microsoft Club SIST</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {team ? (
              <>
                <button
                  onClick={() => { sound.playClick(); handleRefresh(); }}
                  className="p-2 bg-[#040E24] border border-white/10 text-[#38BDF8] hover:bg-[#07193D] transition-colors text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  title="Sync Live Status"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[10px]">SYNC</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 transition-colors text-xs font-mono-hud flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>LOGOUT</span>
                </button>
              </>
            ) : (
              <Link
                href="/"
                className="px-3.5 py-1.5 border border-white/15 text-slate-300 hover:text-white font-mono-hud text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO EVENT SITE</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* LOGIN GATE (When not authenticated) */}
        {!team && (
          <div className="max-w-md mx-auto pt-12">
            <GlassCard
              glowColor="cyan"
              className="p-6 sm:p-8 border border-[#38BDF8]/40 bg-[#07193D] shadow-[0_20px_60px_rgba(2,8,24,0.9)] rounded-none text-left"
              withHudCorners={true}
            >
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-white/10">
                <div className="p-2.5 bg-[#0B2556] border border-[#38BDF8]/40 text-[#38BDF8]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono-hud text-[#38BDF8] font-bold uppercase tracking-wider">
                    AUTHENTICATED SQUAD ACCESS
                  </div>
                  <h2 className="text-xl font-display font-black text-white">
                    TEAM SIGN IN
                  </h2>
                </div>
              </div>

              {/* Both halves are things the whole squad already knows, so nobody
                  has to dig a registration ID out of one person's inbox. Several
                  squads picked the same team name — the leader's name is what
                  tells them apart, so it has to be the leader who registered. */}
              <div className="mb-5 p-3 bg-[#040E24] border border-[#38BDF8]/25 text-[#BAE6FD] text-[11px] font-mono-hud leading-relaxed">
                Sign in with your <span className="text-white font-bold">team name</span> as the
                username and your <span className="text-white font-bold">team leader&apos;s name</span> as
                the passcode. Drop the spaces and punctuation from both — &ldquo;Tech Titans&rdquo;
                led by &ldquo;Deekshith. P&rdquo; is <span className="text-[#38BDF8]">techtitans</span> /{' '}
                <span className="text-[#38BDF8]">deekshithp</span>. Capitals do not matter.
              </div>

              {authError && (
                <div className="mb-5 p-3 bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs font-mono flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono-hud text-[#BAE6FD] mb-1">
                    USERNAME (your team name, no spaces) <span className="text-[#38BDF8]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamIdInput}
                    onChange={(e) => setTeamIdInput(e.target.value)}
                    placeholder="e.g. techtitans"
                    className="w-full px-3.5 py-2.5 bg-[#040E24] border border-[rgba(212,233,255,0.15)] text-white text-xs font-mono-hud focus:border-[#38BDF8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono-hud text-[#BAE6FD] mb-1">
                    PASSCODE (your team leader&apos;s name, no spaces) <span className="text-[#38BDF8]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder="e.g. deekshithp"
                    className="w-full px-3.5 py-2.5 bg-[#040E24] border border-[rgba(212,233,255,0.15)] text-white text-xs font-mono-hud focus:border-[#38BDF8] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-glow-cyan w-full py-3 font-display font-black text-xs sm:text-sm text-[#040E24] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#38BDF8] flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xl disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>AUTHENTICATING SQUAD...</span>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 text-[#040E24]" />
                      <span>ACCESS SQUAD DOSSIER</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setShowForgot(v => !v);
                    setForgotMsg(null);
                  }}
                  className="text-[11px] font-mono-hud text-[#BAE6FD] hover:text-[#38BDF8] underline underline-offset-4 cursor-pointer"
                >
                  {showForgot ? 'BACK TO SIGN IN' : 'FORGOT PASSCODE?'}
                </button>
              </div>

              {showForgot && (
                <div className="mt-4 p-4 bg-[#040E24] border border-[#38BDF8]/25 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4 text-[#38BDF8]" />
                    <span className="text-[11px] font-mono-hud text-[#38BDF8] font-bold uppercase tracking-wider">
                      Reset your passcode
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans mb-3 leading-relaxed">
                    Fill in your username above, then the leader email you registered with.
                    We will send a one-time reset link to that address — it expires in{' '}
                    {RESET_TOKEN_TTL_MINUTES} minutes. The link only ever goes to the
                    registered address, never to whoever asks.
                  </p>

                  <form onSubmit={handleForgotSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono-hud text-[#BAE6FD] mb-1">
                        REGISTERED LEADER EMAIL <span className="text-[#38BDF8]">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="leader@email.com"
                        className="w-full px-3.5 py-2.5 bg-[#07193D] border border-[rgba(212,233,255,0.15)] text-white text-xs font-mono-hud focus:border-[#38BDF8] focus:outline-none"
                      />
                    </div>

                    {forgotMsg && (
                      <div
                        className={`p-3 border text-xs font-mono flex items-start gap-2 ${
                          forgotMsg.type === 'success'
                            ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                            : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                        }`}
                      >
                        {forgotMsg.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span>{forgotMsg.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="w-full py-2.5 font-display font-black text-xs text-[#040E24] bg-gradient-to-r from-[#BAE6FD] to-[#38BDF8] flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isSendingReset ? (
                        <span>SENDING RESET LINK...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-[#040E24]" />
                          <span>EMAIL ME A RESET LINK</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-slate-400 font-sans">
                Haven&apos;t registered your squad yet?{' '}
                <Link href="/" className="text-[#38BDF8] hover:underline font-semibold">
                  Register here
                </Link>
              </div>
            </GlassCard>
          </div>
        )}

        {/* AUTHENTICATED TEAM DASHBOARD */}
        {team && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Squad Banner Header */}
            <div className="p-6 bg-gradient-to-r from-[#07193D] via-[#0B2556] to-[#07193D] border border-[#38BDF8]/40 shadow-2xl relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono-hud bg-[#38BDF8]/20 border border-[#38BDF8] text-[#38BDF8] px-2 py-0.5 font-bold">
                      SQUAD IDENTITY
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      {team.institution}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight">
                    {team.team_name.toUpperCase()}
                  </h1>
                  <div className="text-xs text-[#BAE6FD] mt-1.5 font-sans flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">Leader: {team.leader_name}</span>
                    {team.leader_phone && (
                      <>
                        <span>•</span>
                        <span>{team.leader_phone}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="px-2.5 py-0.5 bg-[#0B2556] border border-[#38BDF8]/60 text-[#38BDF8] font-mono font-bold text-[11px] shadow-sm">
                      {team.problem_statement}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Username Pill — the sign-in identifier */}
                  <div className="p-2.5 bg-[#040E24] border border-[#38BDF8]/50 flex items-center gap-2.5">
                    <div>
                      <div className="text-[8px] font-mono-hud text-[#7DD3FC]">
                        USERNAME · ID {team.registration_id}
                      </div>
                      <div className="text-white font-mono font-bold text-sm">{team.username}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(team.username, 'id')}
                      className="p-1.5 bg-[#07193D] hover:bg-[#38BDF8]/20 text-[#38BDF8] transition-colors"
                      title="Copy username"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Passcode Pill */}
                  <div className="p-2.5 bg-[#040E24] border border-amber-400/40 flex items-center gap-2.5">
                    <div>
                      <div className="text-[8px] font-mono-hud text-amber-300">PASSCODE</div>
                      <div className="text-amber-300 font-mono font-bold text-sm">{team.access_token}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(team.access_token, 'pass')}
                      className="p-1.5 bg-[#07193D] hover:bg-amber-400/20 text-amber-300 transition-colors"
                      title="Copy Passcode"
                    >
                      {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE COMPETITION STEPPER */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Step 1: Registration */}
              <div className="p-4 bg-[#07193D]/80 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-hud text-slate-400 font-bold">PHASE 01</span>
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    VERIFIED
                  </span>
                </div>
                <div className="text-sm font-display font-bold text-white">Squad Registration</div>
                <p className="text-[11px] text-slate-400 font-sans">Enrolled with {team.members.length + 1} participants</p>
              </div>

              {/* Step 2: Payment */}
              <div className={`p-4 space-y-2 border ${
                team.payment_status === 'VERIFIED'
                  ? 'bg-[#07193D]/80 border-emerald-500/40'
                  : team.payment_status === 'PENDING'
                  ? 'bg-[#07193D]/80 border-amber-500/40'
                  : team.payment_status === 'RESUBMISSION_REQUIRED'
                  ? 'bg-[#07193D]/80 border-orange-500/50'
                  : 'bg-[#040E24]/60 border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-hud text-slate-400 font-bold">PHASE 02</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 font-bold ${
                    team.payment_status === 'VERIFIED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : team.payment_status === 'PENDING'
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                      : team.payment_status === 'RESUBMISSION_REQUIRED'
                      ? 'bg-orange-950 text-orange-300 border border-orange-500/30'
                      : 'bg-slate-900 text-slate-400 border border-white/10'
                  }`}>
                    {team.payment_status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm font-display font-bold text-white">UPI Fee Verification</div>
                <p className="text-[11px] text-slate-400 font-sans">₹100 flat team registration</p>
              </div>

              {/* Step 3: Round 1 */}
              <div className={`p-4 space-y-2 border transition-all ${
                team.round_1_status === 'SELECTED'
                  ? 'bg-gradient-to-b from-[#07193D] to-[#042F2E] border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                  : ['SUBMITTED', 'UNDER_REVIEW'].includes(team.round_1_status)
                  ? 'bg-[#07193D]/80 border-emerald-500/40'
                  : team.payment_status === 'VERIFIED'
                  ? 'bg-[#07193D]/80 border-[#38BDF8]/40'
                  : 'bg-[#040E24]/60 border-white/10 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-hud text-slate-400 font-bold">PHASE 03</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 font-bold ${
                    team.round_1_status === 'SELECTED'
                      ? 'bg-emerald-400 text-[#040E24] shadow-sm font-black tracking-wider'
                      : ['SUBMITTED', 'UNDER_REVIEW'].includes(team.round_1_status)
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : team.payment_status === 'VERIFIED'
                      ? 'bg-[#0B2556] text-[#38BDF8] border border-[#38BDF8]/40'
                      : 'bg-slate-900 text-slate-500'
                  }`}>
                    {team.round_1_status === 'SELECTED' ? '★ SHORTLISTED' : team.round_1_status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm font-display font-bold text-white">Round 1 Evaluation</div>
                <p className="text-[11px] text-slate-400 font-sans">
                  {team.round_1_status === 'SELECTED' ? 'Shortlisted for ORION Hackathon' : 'PDF / PPTX blueprint upload'}
                </p>
              </div>

              {/* Step 4: Round 2 Finale */}
              <div className={`p-4 space-y-2 border transition-all ${
                (team.round_1_status === 'SELECTED' || team.round_2_status === 'ACCESS_GRANTED')
                  ? 'bg-gradient-to-b from-[#07193D] via-[#0B2556] to-[#042422] border-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                  : 'bg-[#040E24]/60 border-white/10 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-hud text-slate-400 font-bold">PHASE 04</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 font-bold ${
                    (team.round_1_status === 'SELECTED' || team.round_2_status === 'ACCESS_GRANTED')
                      ? 'bg-gradient-to-r from-[#BAE6FD] to-[#38BDF8] text-[#040E24] font-black shadow-sm'
                      : 'bg-slate-900 text-slate-500'
                  }`}>
                    {(team.round_1_status === 'SELECTED' || team.round_2_status === 'ACCESS_GRANTED') ? 'QUALIFIED' : 'LOCKED'}
                  </span>
                </div>
                <div className="text-sm font-display font-bold text-white">24H Offline Finale</div>
                <p className="text-[11px] text-slate-400 font-sans">Top 70 Hackathon at SIST</p>
              </div>
            </div>

            {/* ROUND 2 / PHASE 3 SHORTLIST CONFIRMED BANNER */}
            {(team.round_1_status === 'SELECTED' || team.round_2_status === 'ACCESS_GRANTED') && (
              <div className="p-6 sm:p-8 bg-gradient-to-r from-[#042422]/95 via-[#07193D] to-[#042422]/95 border-2 border-emerald-400 space-y-6 shadow-[0_0_50px_rgba(52,211,153,0.35)] relative overflow-hidden animate-pulse-glow">
                {/* Background glow effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-emerald-500/30 pb-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="p-3.5 bg-emerald-500/20 border border-emerald-400 text-emerald-400 rounded-sm shadow-[0_0_20px_rgba(52,211,153,0.4)] shrink-0 mt-1">
                      <Sparkles className="w-8 h-8 text-emerald-300 animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono-hud bg-emerald-400 text-[#040E24] px-2.5 py-0.5 font-black uppercase tracking-wider">
                          OFFICIALLY SHORTLISTED
                        </span>
                        <span className="text-[11px] font-mono-hud text-emerald-300 border border-emerald-400/50 px-2 py-0.5 font-bold">
                          PHASE 03 QUALIFIED · TOP 70 SQUAD
                        </span>
                        {team.round_1_score && (
                          <span className="text-[11px] font-mono-hud text-[#38BDF8] border border-[#38BDF8]/50 px-2 py-0.5 font-bold">
                            JURY SCORE: {team.round_1_score}/50
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                        CONGRATULATIONS, {team.team_name.toUpperCase()}!
                      </h2>
                      <p className="text-sm text-slate-200 font-sans max-w-2xl leading-relaxed">
                        Led by <strong className="text-emerald-300 font-semibold">{team.leader_name}</strong>, your technical blueprint has cleared Round 1 jury screening. You are officially shortlisted for the <strong>ORION 1.0 24-Hour Offline National Hackathon</strong> at Sathyabama Institute of Science and Technology.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    <a
                      href={process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL || 'https://chat.whatsapp.com/C76LZLzWkOh3FPC99iXw8f'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-3 font-display font-black text-xs text-[#040E24] bg-gradient-to-r from-[#BAE6FD] via-[#38BDF8] to-[#34D399] flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:brightness-110 active:scale-95 transition-all"
                    >
                      <MessageSquare className="w-4 h-4 text-[#040E24]" />
                      <span>JOIN FINALIST WHATSAPP</span>
                    </a>
                  </div>
                </div>

                {/* Finalist Logistics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans relative z-10">
                  <div className="p-4 bg-[#040E24]/90 border border-emerald-500/30 space-y-1.5 backdrop-blur-sm">
                    <div className="text-[10px] font-mono-hud text-emerald-400 font-bold flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>FINALE DATES & SPRINT</span>
                    </div>
                    <div className="text-white font-bold text-sm">{EVENT_METRICS.finaleDateAnnounced ? `October 9–10, 2026${EVENT_METRICS.finaleDateTentative ? ' (Tentative)' : ''}` : EVENT_METRICS.datesTBA}</div>
                    <div className="text-slate-400 text-[11px]">24-Hour Non-stop Offline Sprint</div>
                  </div>

                  <div className="p-4 bg-[#040E24]/90 border border-emerald-500/30 space-y-1.5 backdrop-blur-sm">
                    <div className="text-[10px] font-mono-hud text-emerald-400 font-bold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>OFFLINE VENUE</span>
                    </div>
                    <div className="text-white font-bold text-sm">Sathyabama University</div>
                    <div className="text-slate-400 text-[11px]">OMR Semmancheri, Chennai</div>
                  </div>

                  <div className="p-4 bg-[#040E24]/90 border border-emerald-500/30 space-y-1.5 backdrop-blur-sm">
                    <div className="text-[10px] font-mono-hud text-emerald-400 font-bold flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>FINALIST PASS REGISTRATION</span>
                    </div>
                    <div className="text-white font-bold text-sm">₹{config?.finalistFeeInr || 250} per participant</div>
                    <div className="text-slate-400 text-[11px]">Food, High-Speed Wi-Fi & Swag kit</div>
                  </div>

                  <div className="p-4 bg-[#040E24]/90 border border-emerald-500/30 space-y-1.5 backdrop-blur-sm">
                    <div className="text-[10px] font-mono-hud text-emerald-400 font-bold flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>QUALIFIED SQUAD</span>
                    </div>
                    <div className="text-white font-bold text-sm">{team.members.length + 1} Members Cleared</div>
                    <div className="text-slate-400 text-[11px]">Track: {team.problem_statement}</div>
                  </div>
                </div>
              </div>
            )}

            {/* MAIN TWO-COLUMN WORKFLOW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* SECTION A: PAYMENT STATUS & UTR SUBMISSION */}
              <div className="p-5 sm:p-6 bg-[#07193D] border border-[#38BDF8]/40 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-white font-mono-hud text-xs font-bold">
                    <CreditCard className="w-4 h-4 text-[#38BDF8]" />
                    <span>STEP 01: PAYMENT VERIFICATION</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 font-bold ${
                    team.payment_status === 'VERIFIED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : team.payment_status === 'PENDING'
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                  }`}>
                    {team.payment_status.replace('_', ' ')}
                  </span>
                </div>

                {/* If Payment is VERIFIED */}
                {team.payment_status === 'VERIFIED' && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono-hud">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>PAYMENT RECORD VERIFIED BY SECRETARIAT</span>
                    </div>
                    <p className="text-slate-200">
                      Your squad registration fee of <strong>₹100</strong> has been reconciled. Round 1 presentation submission is unlocked below.
                    </p>
                    {team.payment?.utr_number && (
                      <div className="text-[11px] font-mono text-emerald-300 pt-0.5">
                        UTR / REF: <span className="font-bold">{team.payment.utr_number}</span>
                      </div>
                    )}

                    {/* DYNAMIC PAYMENT RECEIPT DOWNLOAD BUTTON */}
                    <div className="pt-2 border-t border-emerald-500/30">
                      <button
                        type="button"
                        onClick={() => { sound.playClick(); setIsReceiptOpen(true); }}
                        className="w-full py-2.5 bg-gradient-to-r from-[#00BCF2] via-[#38BDF8] to-[#00BCF2] hover:brightness-110 text-[#040E24] font-display font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.35)] active:scale-98 transition-all"
                      >
                        <FileText className="w-4 h-4 text-[#040E24]" />
                        <span>DOWNLOAD OFFICIAL PAYMENT RECEIPT</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* If Payment is PENDING */}
                {team.payment_status === 'PENDING' && (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/40 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-400 font-bold font-mono-hud">
                      <Clock className="w-4 h-4" />
                      <span>PAYMENT AWAITING VERIFICATION</span>
                    </div>
                    <p className="text-slate-200">
                      We have logged your UTR reference <strong>{team.payment?.utr_number || 'Under Review'}</strong>. Organizers verify transactions periodically. Once verified, Round 1 PPT submission unlocks automatically.
                    </p>
                    {team.payment?.screenshot_url && (
                      <div className="pt-1">
                        {/* Button, not <a href>: browsers block top-frame
                            navigation to data: URLs, which is how receipts are
                            stored on serverless. */}
                        <button
                          type="button"
                          onClick={async () => {
                            const url = team.payment!.screenshot_url!;
                            try {
                              if (url.startsWith('data:')) {
                                const blob = await (await fetch(url)).blob();
                                const objUrl = URL.createObjectURL(blob);
                                window.open(objUrl, '_blank', 'noopener');
                                setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
                              } else {
                                window.open(url, '_blank', 'noopener');
                              }
                            } catch { /* nothing to show */ }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#040E24] border border-[#38BDF8]/40 text-[#38BDF8] hover:bg-[#0B2556] text-xs font-mono transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>VIEW UPLOADED PAYMENT RECEIPT SCREENSHOT</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* If RESUBMISSION_REQUIRED or NOT_SUBMITTED */}
                {['NOT_SUBMITTED', 'RESUBMISSION_REQUIRED', 'REJECTED'].includes(team.payment_status) && (
                  <div className="space-y-4">
                    {team.payment?.rejection_reason && (
                      <div className="p-3.5 bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs font-mono">
                        <strong>Organizer Note: </strong>
                        <span>{team.payment.rejection_reason}</span>
                      </div>
                    )}

                    <div className="p-4 bg-[#040E24] border border-white/10 space-y-3 text-xs">
                      <div className="text-[10px] font-mono-hud text-[#7DD3FC] font-bold uppercase">
                        OFFICIAL UPI SCANNER & DETAILS (₹100 FLAT)
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-4 flex flex-col items-center justify-center p-2 bg-[#020817] border border-[#38BDF8]/40">
                          <div className="w-full max-w-[140px] aspect-square bg-white p-1.5 rounded-sm flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={config?.upiQrCodeUrl || '/orion_payment_qr.jpg'} 
                              alt="Official Orion UPI QR Code" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="text-[9px] font-mono-hud text-[#38BDF8] mt-1.5 font-bold uppercase">
                            SCAN WITH ANY UPI APP
                          </span>
                        </div>

                        <div className="sm:col-span-8 space-y-2">
                          <div className="p-2.5 bg-[#020817] border border-[#38BDF8]/40 flex items-center justify-between">
                            <div>
                              <div className="text-[9px] font-mono-hud text-slate-400">UPI ID</div>
                              <div className="text-white font-mono font-bold text-sm select-all">
                                {config?.upiId || '8870227906@upi'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Payee: {config?.upiPayeeName || 'MSNIHITHAJULIETA'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleCopy(config?.upiId || '8870227906@upi', 'id')}
                              className="px-2.5 py-1 bg-[#0B2556] text-[#38BDF8] text-[10px] font-mono border border-[#38BDF8]/40 cursor-pointer hover:bg-[#0B2556]/80 transition-colors shrink-0"
                            >
                              {copiedId ? 'COPIED' : 'COPY'}
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-300 leading-relaxed">
                            Scan the QR code above or pay via UPI ID, then enter your 12-digit transaction UTR below.
                          </div>
                          <div className="p-2.5 bg-amber-950/40 border border-amber-400/50 text-[11px] text-amber-200 leading-relaxed">
                            <strong className="font-mono-hud text-amber-300 uppercase">Important:</strong>{' '}
                            While paying, type your team name <strong className="text-white">&quot;{team.team_name}&quot;</strong> in the payment note / message field (GPay: &quot;Add a note&quot;). Payments without the team name are slower to verify.
                          </div>
                        </div>
                      </div>
                    </div>

                    {paymentMsg && (
                      <div className={`p-3 text-xs font-mono border ${
                        paymentMsg.type === 'success' 
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200' 
                          : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                      }`}>
                        {paymentMsg.text}
                      </div>
                    )}

                    <form onSubmit={handlePaymentSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono-hud text-slate-300 mb-1">
                          12-DIGIT UPI UTR / TRANSACTION ID <span className="text-[#38BDF8]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={utrInput}
                          onChange={(e) => setUtrInput(e.target.value)}
                          placeholder="e.g. 423984920194"
                          className="w-full px-3.5 py-2.5 bg-[#040E24] border border-[#38BDF8]/50 text-white text-xs font-mono focus:outline-none uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono-hud text-slate-300 mb-1">
                          PAYER NAME AS IN BANK ACCOUNT
                        </label>
                        <input
                          type="text"
                          value={payerInput}
                          onChange={(e) => setPayerInput(e.target.value)}
                          placeholder={team.leader_name}
                          className="w-full px-3.5 py-2.5 bg-[#040E24] border border-white/15 text-white text-xs font-mono focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono-hud text-slate-300 mb-1">
                          YOUR UPI ID (PAID FROM) <span className="text-[#38BDF8]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={payerUpiInput}
                          onChange={(e) => setPayerUpiInput(e.target.value)}
                          placeholder="e.g. yourname@okhdfcbank / yourname@ybl"
                          className="w-full px-3.5 py-2.5 bg-[#040E24] border border-[#38BDF8]/50 text-white text-xs font-mono focus:outline-none lowercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono-hud text-slate-300 mb-1 uppercase">
                          PAYMENT RECEIPT SCREENSHOT (COMPULSORY) <span className="text-rose-400">*</span>
                        </label>
                        <div className="p-3 bg-[#040E24] border border-dashed border-[#38BDF8]/50 hover:border-[#38BDF8] transition-colors relative text-center cursor-pointer">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setPaymentScreenshotFile(e.target.files[0]);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          {paymentScreenshotFile ? (
                            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                              <span className="truncate font-bold">✓ {paymentScreenshotFile.name} ({(paymentScreenshotFile.size / 1024).toFixed(1)} KB)</span>
                              <span className="text-[10px] text-[#38BDF8] underline ml-2 shrink-0">CHANGE FILE</span>
                            </div>
                          ) : (
                            <div className="space-y-1 text-slate-300">
                              <Upload className="w-5 h-5 text-[#38BDF8] mx-auto" />
                              <div className="text-xs font-mono">
                                {team.payment?.screenshot_url ? 'Upload new payment screenshot (PNG, JPG, WEBP, PDF)' : 'Click to select transaction screenshot image'}
                              </div>
                              <div className="text-[10px] text-rose-400 font-mono font-bold">* MANDATORY FOR ORGANIZER VERIFICATION</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <label className="flex items-start gap-2.5 p-3 bg-amber-950/30 border border-amber-400/40 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          required
                          checked={noteConfirmed}
                          onChange={(e) => setNoteConfirmed(e.target.checked)}
                          className="mt-0.5 accent-amber-400 shrink-0"
                        />
                        <span className="text-[11px] text-amber-200 leading-relaxed">
                          I confirm I mentioned my team name <strong className="text-white">&quot;{team.team_name}&quot;</strong> in the UPI payment note while paying. <span className="text-amber-300">(Mandatory)</span>
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={isSubmittingPayment}
                        className="btn-glow-cyan w-full py-2.5 font-display font-bold text-xs text-[#040E24] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#38BDF8] flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isSubmittingPayment ? 'SUBMITTING UTR...' : 'SUBMIT PAYMENT UTR'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* SECTION B: ROUND 1 PRESENTATION UPLOAD ZONE */}
              <div className="p-5 sm:p-6 bg-[#07193D] border border-[#38BDF8]/40 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-white font-mono-hud text-xs font-bold">
                    <FileText className="w-4 h-4 text-[#38BDF8]" />
                    <span>STEP 02: ROUND 1 PPT/PDF EVALUATION</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 font-bold ${
                    team.round_1_status === 'SELECTED'
                      ? 'bg-emerald-400 text-[#040E24] shadow-sm font-black'
                      : ['SUBMITTED', 'UNDER_REVIEW'].includes(team.round_1_status)
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400'
                  }`}>
                    {team.round_1_status === 'SELECTED' ? '★ SHORTLISTED' : team.round_1_status.replace('_', ' ')}
                  </span>
                </div>

                {/* Gate: If Payment Not Verified */}
                {team.payment_status !== 'VERIFIED' ? (
                  <div className="p-6 bg-[#040E24] border border-white/10 text-center space-y-3">
                    <Lock className="w-8 h-8 text-slate-500 mx-auto" />
                    <div className="text-xs font-mono-hud text-slate-300 font-bold">
                      ROUND 1 SUBMISSION LOCKED
                    </div>
                    <p className="text-xs text-slate-400 font-sans max-w-xs mx-auto">
                      Round 1 submission link will unlock automatically once your payment UTR is verified by organizers.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Phase 3 Shortlist Evaluation Clearance Banner */}
                    {team.round_1_status === 'SELECTED' && (
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/70 via-[#07193D] to-emerald-950/70 border border-emerald-400 space-y-3 shadow-[0_0_25px_rgba(52,211,153,0.2)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-300 font-mono-hud text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>PHASE 03 SCREENING: CLEARED & SHORTLISTED</span>
                          </div>
                          <span className="text-[10px] font-mono bg-emerald-400 text-[#040E24] px-2.5 py-0.5 font-black uppercase tracking-wider">
                            QUALIFIED
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          Your Round 1 blueprint has successfully cleared technical jury evaluation. Your squad is qualified and shortlisted for the 24-Hour Offline National Finale.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 font-mono text-[11px]">
                          <div className="p-2.5 bg-[#040E24] border border-emerald-500/30">
                            <div className="text-slate-400 text-[9px] font-mono-hud uppercase">Jury Score</div>
                            <div className="text-emerald-300 font-bold text-sm">{team.round_1_score || 48} / 50</div>
                          </div>
                          <div className="p-2.5 bg-[#040E24] border border-emerald-500/30">
                            <div className="text-slate-400 text-[9px] font-mono-hud uppercase">Selection Rank</div>
                            <div className="text-emerald-300 font-bold text-sm">Top 70 Qualifier</div>
                          </div>
                          <div className="p-2.5 bg-[#040E24] border border-emerald-500/30 col-span-2 sm:col-span-1">
                            <div className="text-slate-400 text-[9px] font-mono-hud uppercase">Grand Finale</div>
                            <div className="text-cyan-300 font-bold text-xs truncate">Announcing Soon</div>
                          </div>
                        </div>
                        <div className="p-2.5 bg-[#040E24]/80 border border-white/10 text-[11px] text-slate-300 font-sans leading-relaxed">
                          <strong className="text-white font-mono-hud uppercase">Offline Finale Note:</strong> Please bring your presentation deck, architecture diagrams, and working software prototype on your laptops for the offline jury assessment rounds.
                        </div>
                      </div>
                    )}
                    {/* Official Problem Statement / Track */}
                    <div className="p-4 bg-[#040E24] border border-[#38BDF8]/50 space-y-2 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#38BDF8] font-mono-hud text-xs font-bold">
                          <FileText className="w-4 h-4 text-[#38BDF8]" />
                          <span>ASSIGNED PROBLEM STATEMENT / TRACK</span>
                        </div>
                        <span className="text-[10px] font-mono bg-[#0B2556] text-[#38BDF8] px-2.5 py-0.5 border border-[#38BDF8]/40 font-bold uppercase">
                          CONFIRMED ALLOCATION
                        </span>
                      </div>
                      <div className="text-sm sm:text-base font-display font-bold text-white tracking-wide">
                        {team.problem_statement}
                      </div>
                      <p className="text-xs text-slate-400 font-sans">
                        Please ensure your Round 1 presentation and technical architecture directly address this assigned challenge.
                      </p>
                    </div>

                    {/* Official Google Drive submission folder */}
                    <div className="p-4 bg-[#040E24] border border-emerald-500/40 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-mono-hud text-xs font-bold">
                        <ExternalLink className="w-4 h-4" />
                        <span>OFFICIAL SUBMISSION LINK</span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans">
                        Submit your Round 1 presentation to the official ORION 1.0 drive folder:
                      </p>
                      <a
                        href={SUBMISSION_DRIVE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-4 break-all"
                      >
                        <span>{SUBMISSION_DRIVE_URL}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>

                    {/* Active Submission Card if file exists */}
                    {latestSubmission && (
                      <div className="p-4 bg-[#040E24] border border-emerald-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-400 font-mono-hud text-xs font-bold">
                            <FileCheck className="w-4 h-4" />
                            <span>CURRENT ACTIVE SUBMISSION (v{latestSubmission.version})</span>
                          </div>
                          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 border border-emerald-500/30 font-bold">
                            {latestSubmission.submission_status}
                          </span>
                        </div>

                        <div className="p-3 bg-[#020817] border border-white/10 space-y-2 text-xs font-mono">
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase font-mono-hud">Presentation Deck:</div>
                            <div className="text-white font-semibold truncate">
                              {latestSubmission.original_filename}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                              <span>Size: {(latestSubmission.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>Submitted: {new Date(latestSubmission.submitted_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <a
                          href={latestSubmission.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-[#0B2556] border border-[#38BDF8]/40 text-[#38BDF8] hover:bg-[#38BDF8]/20 transition-colors text-xs font-mono flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>DOWNLOAD SUBMITTED FILE</span>
                        </a>
                      </div>
                    )}

                    {/* Deadline Banner */}
                    <div className="p-3 bg-[#040E24] border border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">Submission Deadline:</span>
                      <span className={isPastDeadline ? 'text-rose-400 font-bold' : 'text-[#38BDF8] font-bold'}>
                        {new Date(deadlineStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (23:59 IST)
                      </span>
                    </div>

                    {isPastDeadline && (
                      <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono text-center">
                        Round 1 submission window is now closed.
                      </div>
                    )}

                    {/* Template Rules & Download Quick Guide */}
                    <div className="pt-3 border-t border-white/10 space-y-2 text-[11px] text-slate-400">
                      <a
                        href="/ORION_1.0_Template.pptx"
                        download="ORION_1.0_Template.pptx"
                        className="w-full py-2 px-3 bg-[#0B2556] hover:bg-[#133A80] border border-[#38BDF8]/50 text-[#38BDF8] hover:text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                      >
                        <Download className="w-4 h-4 text-[#38BDF8]" />
                        <span>DOWNLOAD OFFICIAL PPT TEMPLATE (.PPTX)</span>
                      </a>

                      <div className="space-y-1.5 pt-1">
                        <div className="font-mono-hud text-[#7DD3FC] text-[10px] font-bold">SUBMISSION PROTOCOL:</div>
                        <div>• Name file as: <code>{team.team_name.replace(/\s+/g, '')}_ORION1.0.pptx</code></div>
                        <div>• Strictly follow the official slide deck structure without altering required sections</div>
                        <div className="text-amber-300 font-semibold">• <span className="font-bold uppercase tracking-wider text-amber-400">Strict AI Policy:</span> Only up to 10% AI assistance permitted (for minor grammar/formatting only). 90%+ must be original human engineering & architecture.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* SECTION C: SQUAD ROSTER & TRACK DOSSIER */}
            <div className="p-5 sm:p-6 bg-[#07193D] border border-[#38BDF8]/40 space-y-4">
              <div className="flex items-center gap-2 text-white font-mono-hud text-xs font-bold border-b border-white/10 pb-3">
                <Users className="w-4 h-4 text-[#38BDF8]" />
                <span>OFFICIAL SQUAD ROSTER ({team.members.length + 1} MEMBERS)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Leader Card */}
                <div className="p-3.5 bg-[#040E24] border border-[#38BDF8]/50 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono-hud text-[#38BDF8] font-bold">TEAM LEADER</span>
                    <span className="text-[9px] font-mono text-emerald-400">PRIMARY</span>
                  </div>
                  <div className="text-white font-bold text-sm">{team.leader_name}</div>
                  <div className="text-slate-300 text-[11px]">{team.leader_phone}</div>
                  <div className="text-slate-400 text-[10px] truncate">{team.leader_email}</div>
                  <div className="text-slate-400 text-[10px]">{team.department} • {team.year}</div>
                </div>

                {/* Member Cards */}
                {team.members.map((m, idx) => (
                  <div key={idx} className="p-3.5 bg-[#040E24] border border-white/10 space-y-1 text-xs">
                    <div className="text-[9px] font-mono-hud text-slate-400 font-bold">
                      MEMBER 0{idx + 1}
                    </div>
                    <div className="text-white font-bold text-sm">{m.member_name}</div>
                    <div className="text-slate-300 text-[11px]">{m.member_phone}</div>
                    {m.member_email && <div className="text-slate-400 text-[10px] truncate">{m.member_email}</div>}
                    <div className="text-slate-400 text-[10px]">{m.department || 'Engineering'} • {m.year || 'Student'}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* PAYMENT RECEIPT MODAL */}
        {team && (
          <PaymentReceiptModal
            isOpen={isReceiptOpen}
            onClose={() => setIsReceiptOpen(false)}
            team={team}
          />
        )}

      </main>
    </div>
  );
}
