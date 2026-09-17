import fs from 'fs';
import { submissionEligibilityError } from './submissionPolicy';
import { toUsername, claimUsername } from '@/lib/teamUsername';
import path from 'path';
import crypto from 'crypto';
import { supabase, isSupabaseConfigured } from './supabase';
import type { 
  TeamRecord, 
  TeamMember, 
  PaymentRecord, 
  SubmissionRecord, 
  ResubmissionRequest,
  AuditLogRecord, 
  SuspicionFlag, 
  SystemConfig,
  PasswordResetRecord,
  EvaluationScores,
  Round1Status,
  Round2Status
} from '@/types/orion';
import { sendPaymentReminderEmail } from './email';
import { RESET_TOKEN_TTL_MINUTES, validateNewPasscode, normalisePasscode } from './passcodePolicy';

// ==============================================================================
// Fallback In-Memory / File Persistent Store (For Local Dev Offline Mode)
// ==============================================================================

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'orion_store.json');

interface StoreSchema {
  teams: TeamRecord[];
  payments: PaymentRecord[];
  submissions: SubmissionRecord[];
  resubmissionRequests: ResubmissionRequest[];
  suspicionFlags: SuspicionFlag[];
  auditLogs: AuditLogRecord[];
  passwordResets: PasswordResetRecord[];
  config: SystemConfig;
}

const DEFAULT_CONFIG: SystemConfig = {
  registrationOpen: true,
  round1SubmissionDeadline: '2026-09-21T23:59:59+05:30',
  allowRound1Resubmission: true,
  maxFileSizeMb: 10,
  upiId: '8870227906@upi',
  upiPayeeName: 'MSNIHITHAJULIETA',
  upiQrCodeUrl: '/orion_payment_qr.jpg',
  round1FeeInr: 100,
  finalistFeeInr: 250
};

/**
 * Team portal passcode.
 *
 * The previous scheme was `PASS-${Math.floor(1000 + Math.random() * 9000)}` —
 * 9,000 possible values (~13 bits) from a non-cryptographic PRNG, over
 * sequential and therefore enumerable registration IDs. That is brute-forceable
 * in hours from a single IP.
 *
 * Now 40 bits from a CSPRNG, in an alphabet with no look-alike characters
 * (no O/0, I/1) so it can still be read off a screen or dictated over a call.
 */
const PASSCODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars = 5 bits each
function generateAccessToken(): string {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += PASSCODE_ALPHABET[bytes[i] % PASSCODE_ALPHABET.length];
  }
  return `ORN-${out.slice(0, 4)}-${out.slice(4)}`;
}

/**
 * Neutralise LIKE/ILIKE wildcards in a value that is used as a match pattern.
 * Without this, an identifier of `*` matches every row.
 */
function escapeLikeValue(value: string): string {
  return value.replace(/[\\%_*]/g, (m) => `\\${m}`);
}

/** True when the identifier looks like an email rather than a registration ID. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Strip organiser-only fields before sending a team record to that team.
 *
 * `getTeam()` returns the full internal record. Handing all of it to the portal
 * leaked the organisers' private `admin_notes` about the team, the fraud
 * `suspicion_flags` raised against it (which name other teams via
 * `matched_team_id`), the jury's `evaluation_scores`, and the internal audit
 * trail — none of which the portal UI even renders.
 */
const ORGANISER_ONLY_FIELDS = [
  'admin_notes',
  'suspicion_flags',
  'evaluation_scores',
  'audit_logs'
] as const;

export function toTeamFacingRecord(team: TeamRecord): TeamRecord {
  const safe: Record<string, unknown> = { ...team };
  for (const field of ORGANISER_ONLY_FIELDS) delete safe[field];
  return safe as unknown as TeamRecord;
}

/**
 * Filter out any squad member entries that duplicate the team leader or another member.
 * In ORION, `leader_name` represents Participant 1, while `members` holds the
 * additional participants (Participants 2..N). If a member matches the leader's
 * name, phone, or email, or duplicates another member, it is stripped.
 */
function isNameEquivalent(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const cleanA = (a || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanB = (b || '').toLowerCase().replace(/[^a-z0-9]/g, '');
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
}

export function deduplicateTeamMembers(
  members: TeamMember[] | undefined | null,
  leader: { leader_name?: string; leader_phone?: string; leader_email?: string }
): TeamMember[] {
  if (!members || !members.length) return [];
  const cleanPhone = (p?: string) => (p || '').replace(/\D/g, '').slice(-10);
  const cleanEmail = (e?: string) => (e || '').trim().toLowerCase();

  const lPhone = cleanPhone(leader.leader_phone);
  const lEmail = cleanEmail(leader.leader_email);

  const seen = new Set<string>();
  const result: TeamMember[] = [];

  for (const m of members) {
    const mPhone = cleanPhone(m.member_phone);
    const mEmail = cleanEmail(m.member_email);

    // Check if matches leader
    if (isNameEquivalent(m.member_name, leader.leader_name)) continue;
    if (lPhone && mPhone && lPhone === mPhone && lPhone.length >= 10) continue;
    if (lEmail && mEmail && lEmail === mEmail) continue;

    // Check if duplicate member within squad
    if (result.some(prev => isNameEquivalent(prev.member_name, m.member_name))) continue;
    const key = `${(m.member_name || '').toLowerCase().trim()}|${mPhone || mEmail}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push(m);
  }

  // Renumber remaining members sequentially starting from 1
  return result.map((m, idx) => ({
    ...m,
    member_number: idx + 1
  }));
}

/**
 * Case-insensitive comparison in constant time, for secrets.
 * Hashing both sides first keeps the compared buffers equal-length, so no
 * length information leaks through the early return.
 */
export function safeEqualCI(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = crypto.createHash('sha256').update(a.trim().toLowerCase()).digest();
  const hb = crypto.createHash('sha256').update(b.trim().toLowerCase()).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ==============================================================================
// Passcode reset tokens
// ==============================================================================
//
// The reset token is the one credential in this system that arrives by email,
// so it is treated as strictly more dangerous than the passcode it replaces:
//
//   - 256 bits from a CSPRNG. Unlike the passcode, nobody types this by hand,
//     so there is no reason to trade entropy for readability.
//   - Stored ONLY as a SHA-256 hash. `access_token` is readable in the teams
//     table by anyone holding the service key; this table must not repeat that,
//     or a database read becomes a standing takeover of every account.
//   - Single use and short lived, enforced in the database (see
//     migrations/004_password_resets.sql).

/**
 * Hash a raw reset token for storage and lookup.
 *
 * Plain SHA-256, not bcrypt/argon2 — deliberately. A slow KDF protects secrets
 * with low entropy that an attacker can guess offline. This token is 256 random
 * bits, so there is nothing to guess; the hash exists only so the stored value
 * cannot be replayed. A fast hash also keeps the lookup a single indexed query
 * instead of a scan-and-compare over every outstanding row.
 */
function hashResetToken(raw: string): string {
  return crypto.createHash('sha256').update((raw || '').trim()).digest('hex');
}

/** base64url so the token survives a query string and an email client untouched. */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Safe helper for local disk store
function loadLocalStore(): StoreSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed: StoreSchema = JSON.parse(raw);
      parsed.config = { ...DEFAULT_CONFIG, ...(parsed.config || {}) };
      parsed.teams = parsed.teams || [];
      parsed.payments = parsed.payments || [];
      parsed.submissions = parsed.submissions || [];
      parsed.resubmissionRequests = parsed.resubmissionRequests || [];
      parsed.suspicionFlags = parsed.suspicionFlags || [];
      parsed.auditLogs = parsed.auditLogs || [];
      parsed.passwordResets = parsed.passwordResets || [];
      return parsed;
    }
  } catch (err) {
    console.warn('Could not read persistent file store, initializing defaults:', err);
  }

  const initialStore: StoreSchema = {
    teams: [],
    payments: [],
    submissions: [],
    resubmissionRequests: [],
    suspicionFlags: [],
    auditLogs: [],
    passwordResets: [],
    config: DEFAULT_CONFIG
  };

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to initialize empty store:', err);
  }

  return initialStore;
}

function saveLocalStore(store: StoreSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write persistent local store:', err);
  }
}

// ==============================================================================
// Exported Core Server Store Services (Supabase PostgreSQL Primary)
// ==============================================================================

/**
 * Fetch EVERY row of a table, paging past PostgREST's silent 1000-row cap.
 * Unpaginated selects truncate quietly at 1000 rows — at ~5 members per team
 * the admin roster started losing members 4-5 from most teams once ~200 teams
 * had registered, and registration's duplicate detection went blind.
 *
 * `order.column` alone is not enough once paging is involved. team_members is
 * ordered by member_number, but member_number is wildly non-unique — every
 * team has a row with member_number=1, another with 2, etc. — so within each
 * value there are thousands of tied rows across different teams. Postgres
 * does not promise a stable order among ties, and each page here is a
 * SEPARATE query (a fresh `.range()` call), so the tie order can shift
 * between one page's query and the next. A row can land past the end of the
 * page it "should" be on and never get picked up by the next one — in
 * practice this is exactly what made a 6-member squad's higher member
 * numbers (4, 5, 6 — the rarest, and so the most sparsely scattered ties)
 * randomly vanish from the roster and CSV exports even after the 1000-row
 * cap fix above. Always appending the primary key as a final tiebreaker
 * makes the order — and therefore the paging — deterministic.
 */
async function fetchAllRows(
  table: string,
  order?: { column: string; ascending: boolean },
  select = '*',
  eq?: { column: string; value: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!supabase) return [];
  const PAGE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase.from(table).select(select).range(offset, offset + PAGE - 1);
    if (eq) q = q.eq(eq.column, eq.value);
    if (order) q = q.order(order.column, { ascending: order.ascending });
    if (!order || order.column !== 'id') q = q.order('id', { ascending: true });
    const { data, error } = await q;
    if (error) throw new Error(`Could not load ${table}: ${error.message}`);
    all.push(...(data || []));
    if (!data || data.length < PAGE) return all;
  }
}

export const serverStore = {
  // System Configuration
  async getConfig(): Promise<SystemConfig> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'main_config')
          .single();

        if (!error && data?.value) {
          return { ...DEFAULT_CONFIG, ...(data.value as Partial<SystemConfig>) };
        }

        // Initialize if not present
        await supabase
          .from('system_config')
          .upsert({ key: 'main_config', value: DEFAULT_CONFIG });
        return DEFAULT_CONFIG;
      } catch (err) {
        console.warn('Supabase getConfig error, using local fallback:', err);
      }
    }

    const store = loadLocalStore();
    return store.config || DEFAULT_CONFIG;
  },

  async updateConfig(newConfig: Partial<SystemConfig>, actor = 'Admin'): Promise<SystemConfig> {
    const current = await this.getConfig();
    const merged = { ...current, ...newConfig };

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('system_config')
          .upsert({ 
            key: 'main_config', 
            value: merged,
            updated_at: new Date().toISOString()
          });

        await supabase.from('audit_logs').insert([{
          action: 'System Configuration Updated',
          actor,
          details: `Updated settings: ${Object.keys(newConfig).join(', ')}`,
          created_at: new Date().toISOString()
        }]);
      } catch (err) {
        console.error('Supabase updateConfig error:', err);
      }
    }

    // Keep local store in sync
    const store = loadLocalStore();
    store.config = merged;
    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      action: 'System Configuration Updated',
      actor,
      details: `Updated settings: ${Object.keys(newConfig).join(', ')}`,
      created_at: new Date().toISOString()
    });
    saveLocalStore(store);

    return merged;
  },

  // Team Registration & Duplicate Detection
  async registerTeam(payload: {
    teamName: string;
    leaderName: string;
    leaderPhone: string;
    leaderEmail: string;
    institution: string;
    department?: string;
    year?: string;
    problemStatement: string;
    members: { name: string; email?: string; phone: string; department?: string; year?: string }[];
  }): Promise<{ team: TeamRecord; suspicionFlags: SuspicionFlag[] }> {
    const now = new Date().toISOString();
    const cleanLeaderEmail = payload.leaderEmail.trim().toLowerCase();
    const cleanLeaderPhone = payload.leaderPhone.replace(/[\s\-()]/g, '');
    const cleanTeamName = payload.teamName.trim();
    const cleanInstitution = payload.institution.trim();
    const cleanProblem = payload.problemStatement.trim();
    const passcode = generateAccessToken();

    let existingTeamsForDupCheck: { id: string; registration_id: string; team_name: string; leader_email: string; leader_phone: string; members?: TeamMember[] }[] = [];

    // Check if Supabase is active
    if (isSupabaseConfigured() && supabase) {
      try {
        // Paged: unpaginated selects cap at 1000 rows, which silently blinded
        // duplicate detection (and the leader re-registration block) once the
        // roster grew past ~200 teams.
        const [allTeams, allMembers] = await Promise.all([
          fetchAllRows('teams'),
          fetchAllRows('team_members')
        ]);

        if (allTeams && allTeams.length > 0) {
          existingTeamsForDupCheck = allTeams.map(t => ({
            ...t,
            members: (allMembers || []).filter(m => m.team_id === t.id).map(m => ({
              member_number: 1,
              member_name: m.member_name,
              member_email: m.member_email || undefined,
              member_phone: m.member_phone
            }))
          }));
        }
      } catch (err) {
        console.warn('Supabase registration check error, falling back to local for dup check:', err);
      }
    }

    const localStore = loadLocalStore();
    if (existingTeamsForDupCheck.length === 0) {
      existingTeamsForDupCheck = localStore.teams;
    }

    // Determine highest existing registration number across both Supabase and local store
    let maxNum = 147;
    const combinedTeams = [...existingTeamsForDupCheck, ...(localStore.teams || [])];
    combinedTeams.forEach(t => {
      if (t.registration_id) {
        const match = t.registration_id.match(/ORION-2026-(\d+)/i) || t.registration_id.match(/ORN-R1-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    let teamNumber = String(maxNum + 1).padStart(4, '0');
    let registrationId = `ORION-2026-${teamNumber}`;

    // A leader who already owns a team is re-registering — almost always
    // because the confirmation email never arrived and they assumed failure.
    // A second registration creates a twin team that pollutes the roster,
    // the CSV export and the payment ledger, so block it outright and point
    // them back at their existing credentials. (Member-level overlaps stay
    // soft suspicion flags below — those can be legitimate mistakes worth a
    // human look rather than a hard wall.)
    const leaderOwnedTeam = existingTeamsForDupCheck.find(t =>
      t.leader_email.toLowerCase() === cleanLeaderEmail ||
      t.leader_phone.replace(/[\s\-()]/g, '') === cleanLeaderPhone
    );
    if (leaderOwnedTeam) {
      throw new Error(
        `This leader is already registered: squad "${leaderOwnedTeam.team_name}" (${leaderOwnedTeam.registration_id}). ` +
        'Do NOT register again — use the official Google Drive submission link to upload your Round 1 PPT. ' +
        'Contact the organisers through the official channels if you need help with your existing registration.'
      );
    }

    // Duplicate & Suspicion Analysis
    const suspicionFlags: SuspicionFlag[] = [];

    const duplicateLeaderEmailTeam = existingTeamsForDupCheck.find(t => 
      t.leader_email.toLowerCase() === cleanLeaderEmail ||
      (t.members && t.members.some(m => m.member_email && m.member_email.toLowerCase() === cleanLeaderEmail))
    );
    if (duplicateLeaderEmailTeam) {
      suspicionFlags.push({
        id: `flag-${Date.now()}-1`,
        team_id: '',
        flag_type: 'DUPLICATE_EMAIL',
        description: `Leader email ${cleanLeaderEmail} was also registered under squad "${duplicateLeaderEmailTeam.team_name}" (${duplicateLeaderEmailTeam.registration_id}).`,
        severity: 'MEDIUM',
        matched_value: cleanLeaderEmail,
        matched_team_id: duplicateLeaderEmailTeam.registration_id,
        created_at: now
      });
    }

    const duplicateLeaderPhoneTeam = existingTeamsForDupCheck.find(t => 
      t.leader_phone.replace(/[\s\-()]/g, '') === cleanLeaderPhone ||
      (t.members && t.members.some(m => m.member_phone.replace(/[\s\-()]/g, '') === cleanLeaderPhone))
    );
    if (duplicateLeaderPhoneTeam) {
      suspicionFlags.push({
        id: `flag-${Date.now()}-2`,
        team_id: '',
        flag_type: 'DUPLICATE_PHONE',
        description: `Leader phone ${cleanLeaderPhone} matches squad "${duplicateLeaderPhoneTeam.team_name}" (${duplicateLeaderPhoneTeam.registration_id}).`,
        severity: 'MEDIUM',
        matched_value: cleanLeaderPhone,
        matched_team_id: duplicateLeaderPhoneTeam.registration_id,
        created_at: now
      });
    }

    payload.members.forEach((m, idx) => {
      const memberPhoneClean = m.phone.replace(/[\s\-()]/g, '');
      const memberEmailClean = (m.email || '').trim().toLowerCase();

      const match = existingTeamsForDupCheck.find(t =>
        (memberEmailClean && (t.leader_email.toLowerCase() === memberEmailClean || (t.members && t.members.some(tm => tm.member_email?.toLowerCase() === memberEmailClean)))) ||
        (memberPhoneClean && (t.leader_phone.replace(/[\s\-()]/g, '') === memberPhoneClean || (t.members && t.members.some(tm => tm.member_phone.replace(/[\s\-()]/g, '') === memberPhoneClean))))
      );

      if (match) {
        suspicionFlags.push({
          id: `flag-${Date.now()}-m${idx}`,
          team_id: '',
          flag_type: 'CROSS_TEAM_PARTICIPANT',
          description: `Member ${m.name} (${m.phone}) is also recorded on squad "${match.team_name}" (${match.registration_id}).`,
          severity: 'HIGH',
          matched_value: m.name,
          matched_team_id: match.registration_id,
          created_at: now
        });
      }
    });

    let newTeamId = `team-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Provisional login handle. Supabase generates the authoritative value in a
    // trigger (it can de-duplicate against the whole table atomically); this
    // local guess only has to hold when the file store is the only store.
    let username = claimUsername(
      toUsername(cleanTeamName) || toUsername(registrationId),
      loadLocalStore().teams.map(t => t.username || toUsername(t.team_name))
    );

    const memberObjects: TeamMember[] = payload.members.map((m, idx) => ({
      member_number: idx + 1,
      member_name: m.name.trim(),
      member_email: m.email?.trim().toLowerCase() || '',
      member_phone: m.phone.replace(/[\s\-()]/g, ''),
      department: m.department?.trim() || payload.department || 'Engineering',
      year: m.year?.trim() || payload.year || 'Student'
    }));

    // Primary Write to Supabase with automatic collision resolution
    if (isSupabaseConfigured() && supabase) {
      let inserted = false;
      try {
        let attempts = 0;

        while (!inserted && attempts < 5) {
          attempts++;
          const { data: teamData, error: teamErr } = await supabase
            .from('teams')
            .insert([{
              registration_id: registrationId,
              team_name: cleanTeamName,
              leader_name: payload.leaderName.trim(),
              leader_phone: cleanLeaderPhone,
              leader_email: cleanLeaderEmail,
              institution: cleanInstitution,
              department: payload.department?.trim() || 'Engineering',
              year: payload.year?.trim() || 'Student',
              problem_statement: cleanProblem,
              access_token: passcode,
              payment_status: 'NOT_SUBMITTED',
              amount: 100,
              registration_status: 'REGISTERED',
              round_1_status: 'NOT_STARTED',
              round_2_status: 'LOCKED',
              created_at: now,
              updated_at: now
            }])
            .select('id, username')
            .single();

          if (teamErr) {
            if (teamErr.code === '23505') {
              // Collision on registration_id, increment and retry
              maxNum++;
              teamNumber = String(maxNum + 1).padStart(4, '0');
              registrationId = `ORION-2026-${teamNumber}`;
              continue;
            }
            console.error('Supabase team insertion error:', teamErr);
            break;
          } else if (teamData?.id) {
            inserted = true;
            newTeamId = teamData.id;
            // Generated by the trg_teams_username trigger (migration 015).
            username = teamData.username || username;

            const memberRows = memberObjects.map(m => ({
              team_id: newTeamId,
              member_number: m.member_number,
              member_name: m.member_name,
              member_email: m.member_email || null,
              member_phone: m.member_phone,
              department: m.department || null,
              year: m.year || null,
              created_at: now
            }));

            await supabase.from('team_members').insert(memberRows);

            if (suspicionFlags.length > 0) {
              const flagRows = suspicionFlags.map(f => ({
                team_id: newTeamId,
                flag_type: f.flag_type,
                description: f.description,
                severity: f.severity,
                matched_value: f.matched_value,
                matched_team_id: f.matched_team_id || null,
                created_at: now
              }));
              await supabase.from('suspicion_flags').insert(flagRows);
            }

            await supabase.from('audit_logs').insert([{
              team_id: newTeamId,
              team_name: cleanTeamName,
              action: 'Team Registered',
              actor: 'Public Portal',
              details: `Squad registered with ${payload.members.length + 1} members for track ${cleanProblem}. ID: ${registrationId}`,
              created_at: now
            }]);
          }
        }
      } catch (sbErr) {
        console.error('Supabase async sync error in registerTeam:', sbErr);
      }

      // Fail loudly. Previously, if every insert attempt failed, this fell
      // through and wrote the team to the local file store only — handing the
      // registrant a real-looking ID and passcode for a record that does not
      // exist in the organisers' database, is invisible in /admin, and is lost
      // when the serverless instance recycles.
      if (!inserted) {
        throw new Error(
          'Registration could not be saved. Please try again in a moment — if this keeps happening, contact the ORION secretariat.'
        );
      }
    }

    suspicionFlags.forEach(f => { f.team_id = newTeamId; });

    const newTeam: TeamRecord = {
      id: newTeamId,
      registration_id: registrationId,
      team_name: cleanTeamName,
      username,
      leader_name: payload.leaderName.trim(),
      leader_phone: cleanLeaderPhone,
      leader_email: cleanLeaderEmail,
      institution: cleanInstitution,
      department: payload.department?.trim() || 'Engineering',
      year: payload.year?.trim() || 'Student',
      problem_statement: cleanProblem,
      access_token: passcode,
      payment_status: 'NOT_SUBMITTED',
      amount: 100,
      registration_status: 'REGISTERED',
      round_1_status: 'NOT_STARTED',
      round_2_status: 'LOCKED',
      admin_notes: null,
      suspicion_flags: suspicionFlags,
      members: memberObjects,
      created_at: now,
      updated_at: now
    };

    // Save to local backup store
    const store = loadLocalStore();
    store.teams.unshift(newTeam);
    store.suspicionFlags.push(...suspicionFlags);
    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      team_id: newTeamId,
      team_name: newTeam.team_name,
      action: 'Team Registered',
      actor: 'Public Portal',
      details: `Squad registered with ${memberObjects.length + 1} members for track ${cleanProblem}. ID: ${registrationId}`,
      created_at: now
    });
    saveLocalStore(store);

    return { team: newTeam, suspicionFlags };
  },

  // Team Authentication for Portal
  //
  // The identifier (the team's username) is a lookup key only. The SECRET must
  // be the access token — the leader's email is no longer accepted in its
  // place. It used to be, which meant a semi-public address that /api/status
  // handed out for free was a valid password for every team.
  async authenticateTeam(identifier: string, secret: string): Promise<TeamRecord | null> {
    const cleanId = identifier.trim();
    const cleanSecret = secret.trim();

    if (!cleanId || !cleanSecret) return null;

    // Only the username is accepted here. Registration IDs and leader emails
    // still identify a team everywhere else in the system, but they are not
    // logins: the ID is quoted in group chats and the leader email is guessable,
    // and neither is something the whole squad reliably knows. The username is
    // the team's own name with case, spaces and punctuation normalised away, so
    // "Tech Titans" and "techtitans" reach the same account.
    const cleanUsername = toUsername(cleanId);
    if (!cleanUsername) return null;

    if (isSupabaseConfigured() && supabase) {
      try {
        // Value passed as an argument and LIKE wildcards escaped — never
        // interpolated into the filter grammar, or `*` would match every row.
        // Not limit(1): a username is NOT unique. Migration 016 loads the
        // organisers' credential sheet verbatim, and four separate squads on it
        // are called TECHTITANS. Every row on the username is fetched and the
        // passcode picks the one that owns it — (username, passcode) is the
        // login key, and that pair is what the database enforces as unique.
        let { data: teams, error } = await supabase
          .from('teams')
          .select('*')
          .ilike('username', escapeLikeValue(cleanUsername))
          .limit(25);

        // The column arrives with migration 015. If the app is deployed ahead
        // of the migration the query fails, and without this branch that means
        // no team can sign in at all — so derive the username from team_name in
        // memory instead. The roster is small enough for a full read; this path
        // disappears the moment the migration lands.
        if (error) {
          console.warn(
            `[auth] username lookup failed (${error.message}) — falling back to ` +
            'team_name matching. Apply migrations/015_team_username.sql.'
          );
          const legacy = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: true });
          if (!legacy.error && legacy.data) {
            teams = legacy.data.filter(t => toUsername(t.team_name) === cleanUsername);
            error = null;
          }
        }

        if (!error && teams && teams.length > 0) {
          const matched = teams.find(t =>
            typeof t.access_token === 'string' &&
            t.access_token.length > 0 &&
            safeEqualCI(t.access_token, cleanSecret)
          );

          if (matched) {
            return await this.getTeam(matched.id);
          }
        }
      } catch (err) {
        console.warn('Supabase authenticateTeam error, using fallback:', err);
      }
    }

    const store = loadLocalStore();

    const team = store.teams.find(t => {
      const matchId = (t.username || toUsername(t.team_name)) === cleanUsername;
      const matchSecret =
        typeof t.access_token === 'string' &&
        t.access_token.length > 0 &&
        safeEqualCI(t.access_token, cleanSecret);
      return matchId && matchSecret;
    });

    if (!team) return null;
    return await this.getTeam(team.id);
  },

  // ============================================================================
  // Self-Service Passcode Reset
  // ============================================================================

  /**
   * Issue a reset token — but only to someone who can already name the team's
   * REGISTERED LEADER EMAIL.
   *
   * A Team ID is printed on every confirmation email and quoted in group chats;
   * it identifies a team, it does not authenticate one. Requiring the leader
   * email as well means a reset needs something an attacker would have to know
   * already, and the token itself then lands in an inbox only the real leader
   * can read. Both halves are necessary: the email check stops a stranger from
   * spraying reset mail at every sequential Team ID, and the emailed token
   * stops a guessed email from being enough on its own.
   *
   * Returns null on EVERY failure — unknown team, wrong email, database
   * error — so the caller has nothing to branch on and cannot be turned into an
   * account-existence oracle. The route answers identically either way.
   */
  async createPasscodeReset(
    identifier: string,
    email: string,
    requestedIp?: string
  ): Promise<{ team: TeamRecord; rawToken: string; expiresAt: string } | null> {
    const cleanId = (identifier || '').trim();
    const cleanEmail = (email || '').trim();

    if (!cleanId || !cleanEmail || !looksLikeEmail(cleanEmail)) return null;

    // getTeam() resolves a username to the OLDEST matching row, which is the
    // wrong row for three of the four squads called TECHTITANS (see migration
    // 016 — usernames are not unique, the pair is). The email is the second
    // half of the credential either way, so when it does not match the oldest
    // row, look the team up BY the email and confirm it carries the username
    // that was typed. Without this, only the oldest squad on a shared name
    // could ever reset.
    let team = await this.getTeam(cleanId);

    if (!team || !team.leader_email || !safeEqualCI(team.leader_email, cleanEmail)) {
      const byEmail = await this.getTeam(cleanEmail);
      const typedUsername = toUsername(cleanId);
      const matchesTyped = !!byEmail && (
        byEmail.registration_id.toLowerCase() === cleanId.toLowerCase() ||
        (!!typedUsername && (byEmail.username || toUsername(byEmail.team_name)) === typedUsername)
      );
      team = matchesTyped ? byEmail : null;
    }

    if (!team) return null;

    // Constant-time and case-insensitive, matching how the address was stored.
    if (!team.leader_email || !safeEqualCI(team.leader_email, cleanEmail)) return null;

    const rawToken = generateResetToken();
    const tokenHash = hashResetToken(rawToken);
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const expiresAt = new Date(nowDate.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        // Retire any link already outstanding for this team. Without this, a
        // participant who clicks "forgot" three times leaves three live tokens,
        // and the two they abandoned stay valid in their inbox for the full TTL.
        await supabase
          .from('password_resets')
          .update({ consumed_at: now })
          .eq('team_id', team.id)
          .is('consumed_at', null);

        const { error } = await supabase.from('password_resets').insert([{
          team_id: team.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
          requested_ip: requestedIp || null,
          created_at: now
        }]);

        if (error) {
          console.error('[Reset] Failed to record reset token:', error.message);
          return null;
        }

        // Audit detail deliberately carries no token and no passcode.
        await supabase.from('audit_logs').insert([{
          team_id: team.id,
          team_name: team.team_name,
          action: 'Passcode Reset Requested',
          actor: 'Participant Portal',
          details: 'Reset link issued to the registered leader email. Expires in ' + RESET_TOKEN_TTL_MINUTES + ' minutes.',
          created_at: now
        }]);

        return { team, rawToken, expiresAt };
      } catch (err) {
        console.error('[Reset] createPasscodeReset error:', err);
        return null;
      }
    }

    // Local fallback
    const store = loadLocalStore();
    const localTeam = store.teams.find(t => t.id === team.id || t.registration_id === team.registration_id);
    if (!localTeam) return null;

    for (const r of store.passwordResets) {
      if (r.team_id === localTeam.id && !r.consumed_at) r.consumed_at = now;
    }

    store.passwordResets.push({
      id: 'reset-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex'),
      team_id: localTeam.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      consumed_at: null,
      requested_ip: requestedIp || null,
      created_at: now
    });

    store.auditLogs.push({
      id: 'log-' + Date.now() + '-reset-req',
      team_id: localTeam.id,
      team_name: localTeam.team_name,
      action: 'Passcode Reset Requested',
      actor: 'Participant Portal',
      details: 'Reset link issued to the registered leader email. Expires in ' + RESET_TOKEN_TTL_MINUTES + ' minutes.',
      created_at: now
    });

    saveLocalStore(store);
    return { team, rawToken, expiresAt };
  },

  /** Look a reset token up by hash. Shared by peek and redeem. */
  async findPasscodeReset(rawToken: string): Promise<PasswordResetRecord | null> {
    const tokenHash = hashResetToken(rawToken);
    if (!tokenHash) return null;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('password_resets')
          .select('*')
          .eq('token_hash', tokenHash)
          .maybeSingle();
        if (error) {
          console.warn('[Reset] findPasscodeReset error:', error.message);
          return null;
        }
        return (data as PasswordResetRecord) || null;
      } catch (err) {
        console.warn('[Reset] findPasscodeReset threw:', err);
        return null;
      }
    }

    const store = loadLocalStore();
    return store.passwordResets.find(r => r.token_hash === tokenHash) || null;
  },

  /**
   * Check a reset token without spending it, so the page can show "this link is
   * still good, here is the team it belongs to" before anything is typed.
   *
   * Naming the team is not a leak: the caller already holds a token that was
   * delivered to that team's own registered inbox. It is worth showing, because
   * it is what stops a leader who runs two teams resetting the wrong one.
   */
  async peekPasscodeReset(rawToken: string): Promise<{
    valid: boolean;
    reason?: 'INVALID' | 'EXPIRED' | 'USED';
    teamName?: string;
    username?: string;
    registrationId?: string;
  }> {
    const clean = (rawToken || '').trim();
    if (!clean) return { valid: false, reason: 'INVALID' };

    const record = await this.findPasscodeReset(clean);
    if (!record) return { valid: false, reason: 'INVALID' };
    if (record.consumed_at) return { valid: false, reason: 'USED' };
    if (new Date(record.expires_at).getTime() <= Date.now()) return { valid: false, reason: 'EXPIRED' };

    const team = await this.getTeam(record.team_id);
    if (!team) return { valid: false, reason: 'INVALID' };

    return {
      valid: true,
      teamName: team.team_name,
      username: team.username,
      registrationId: team.registration_id
    };
  },

  /**
   * Spend a reset token and set the new passcode.
   *
   * Order matters. The token is consumed FIRST, under a `consumed_at is null`
   * guard, and only then is the passcode written. Two requests racing the same
   * link therefore have exactly one winner — the database decides, not a
   * read-then-write in application code that both sides would pass. Doing it
   * the other way round (write the passcode, then mark consumed) would leave a
   * replayable token behind if the second step failed.
   *
   * Error strings here can be specific: the caller already holds a token, so
   * telling them it expired reveals nothing they could not learn by trying it.
   */
  async redeemPasscodeReset(
    rawToken: string,
    newPasscode: string
  ): Promise<{ success: boolean; error?: string; team?: TeamRecord }> {
    const clean = (rawToken || '').trim();
    if (!clean) return { success: false, error: 'This reset link is not valid. Request a new one.' };

    const check = validateNewPasscode(newPasscode);
    if (!check.ok) return { success: false, error: check.error };

    const passcode = normalisePasscode(newPasscode);

    const record = await this.findPasscodeReset(clean);
    if (!record) return { success: false, error: 'This reset link is not valid. Request a new one.' };
    if (record.consumed_at) {
      return { success: false, error: 'This reset link has already been used. Request a new one.' };
    }
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      return { success: false, error: 'This reset link has expired. Request a new one.' };
    }

    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        // Atomic claim. Zero rows back means someone else redeemed it first.
        const { data: claimed, error: claimErr } = await supabase
          .from('password_resets')
          .update({ consumed_at: now })
          .eq('id', record.id)
          .is('consumed_at', null)
          .select('id, team_id');

        if (claimErr) {
          console.error('[Reset] Failed to claim reset token:', claimErr.message);
          return { success: false, error: 'Could not complete the reset. Please try again.' };
        }
        if (!claimed || claimed.length === 0) {
          return { success: false, error: 'This reset link has already been used. Request a new one.' };
        }

        const { error: updErr } = await supabase
          .from('teams')
          .update({ access_token: passcode, updated_at: now })
          .eq('id', record.team_id);

        if (updErr) {
          console.error('[Reset] Failed to set new passcode:', updErr.message);
          return { success: false, error: 'Could not complete the reset. Please try again.' };
        }

        // Any other link outstanding for this team dies with the reset — someone
        // who requested one earlier must not keep a live token after the real
        // leader has taken the account back.
        await supabase
          .from('password_resets')
          .update({ consumed_at: now })
          .eq('team_id', record.team_id)
          .is('consumed_at', null);

        const team = await this.getTeam(record.team_id);

        await supabase.from('audit_logs').insert([{
          team_id: record.team_id,
          team_name: team ? team.team_name : null,
          action: 'Passcode Reset Completed',
          actor: 'Participant Portal',
          details: 'Team portal passcode changed via an emailed reset link.',
          created_at: now
        }]);

        return { success: true, team: team || undefined };
      } catch (err) {
        console.error('[Reset] redeemPasscodeReset error:', err);
        return { success: false, error: 'Could not complete the reset. Please try again.' };
      }
    }

    // Local fallback
    const store = loadLocalStore();
    const local = store.passwordResets.find(r => r.id === record.id);
    if (!local || local.consumed_at) {
      return { success: false, error: 'This reset link has already been used. Request a new one.' };
    }

    const localTeam = store.teams.find(t => t.id === local.team_id);
    if (!localTeam) return { success: false, error: 'This reset link is not valid. Request a new one.' };

    local.consumed_at = now;
    for (const r of store.passwordResets) {
      if (r.team_id === local.team_id && !r.consumed_at) r.consumed_at = now;
    }

    localTeam.access_token = passcode;
    localTeam.updated_at = now;

    store.auditLogs.push({
      id: 'log-' + Date.now() + '-reset-done',
      team_id: localTeam.id,
      team_name: localTeam.team_name,
      action: 'Passcode Reset Completed',
      actor: 'Participant Portal',
      details: 'Team portal passcode changed via an emailed reset link.',
      created_at: now
    });

    saveLocalStore(store);

    const team = await this.getTeam(localTeam.id);
    return { success: true, team: team || undefined };
  },

  // Fetch Team By ID, Registration ID, or Email
  async getTeam(identifier: string): Promise<TeamRecord | null> {
    const clean = identifier.trim();
    if (!clean) return null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

    if (isSupabaseConfigured() && supabase) {
      try {
        // Values are passed as arguments, never interpolated into the filter
        // grammar, and LIKE wildcards are escaped — otherwise `q=*` matches
        // every row and a comma injects extra filter terms.
        // Registration IDs are recognised by shape so that admin tooling, which
        // addresses teams by ID, keeps working; anything else that is not a UUID
        // or an email is treated as a username, which is what participants type.
        const looksLikeRegId = /^ORION[-\s]/i.test(clean);

        let query = supabase.from('teams').select('*');
        if (isUuid) {
          query = query.eq('id', clean);
        } else if (looksLikeEmail(clean)) {
          query = query.ilike('leader_email', escapeLikeValue(clean));
        } else if (looksLikeRegId) {
          query = query.ilike('registration_id', escapeLikeValue(clean));
        } else {
          query = query.ilike('username', escapeLikeValue(toUsername(clean)));
        }

        // limit(2), NOT maybeSingle(): maybeSingle() errors out when more than
        // one row matches, which made EVERY action on a duplicated
        // registration ID — delete, verify, resend, the team's own portal
        // login — fail with "Team not found". Oldest row wins deterministically;
        // a duplicate is loudly logged so organisers can purge it (each row is
        // individually deletable by its UUID).
        const { data: rows, error } = await query
          .order('created_at', { ascending: true })
          .limit(2);

        if (error) {
          console.warn('Supabase getTeam error:', error.message);
        }

        const team = rows?.[0] ?? null;
        if (rows && rows.length > 1) {
          console.warn(
            `[getTeam] Multiple team rows match "${clean}" — using the oldest (${team.id}). ` +
            'Purge the duplicate from the admin console and apply migration 008 so this cannot recur.'
          );
        }

        if (!error && team) {
          const [memRes, payRes, subRes, resubRes, flagRes, logRes] = await Promise.all([
            supabase.from('team_members').select('*').eq('team_id', team.id).order('member_number', { ascending: true }),
            supabase.from('payments').select('*').eq('team_id', team.id).maybeSingle(),
            supabase.from('submissions').select('*').eq('team_id', team.id).order('version', { ascending: true }),
            supabase.from('resubmission_requests').select('*').eq('team_id', team.id).order('created_at', { ascending: false }),
            supabase.from('suspicion_flags').select('*').eq('team_id', team.id),
            supabase.from('audit_logs').select('*').eq('team_id', team.id).order('created_at', { ascending: false })
          ]);

          return {
            id: team.id,
            registration_id: team.registration_id,
            team_name: team.team_name,
            username: team.username || toUsername(team.team_name),
            leader_name: team.leader_name,
            leader_phone: team.leader_phone,
            leader_email: team.leader_email,
            institution: team.institution,
            department: team.department || undefined,
            year: team.year || undefined,
            problem_statement: team.problem_statement,
            access_token: team.access_token,
            payment_status: team.payment_status,
            amount: team.amount || 100,
            registration_status: team.registration_status || 'REGISTERED',
            round_1_status: team.round_1_status || 'NOT_STARTED',
            round_2_status: team.round_2_status || 'LOCKED',
            round_1_score: team.round_1_score !== null ? Number(team.round_1_score) : null,
            evaluation_scores: team.evaluation_scores || null,
            admin_notes: team.admin_notes || null,
            members: deduplicateTeamMembers(
              (memRes.data || []).map(m => ({
                id: m.id,
                team_id: m.team_id,
                member_number: m.member_number,
                member_name: m.member_name,
                member_email: m.member_email || undefined,
                member_phone: m.member_phone,
                department: m.department || undefined,
                year: m.year || undefined
              })),
              team
            ),
            payment: payRes.data ? {
              id: payRes.data.id,
              team_id: payRes.data.team_id,
              utr_number: payRes.data.utr_number,
              payer_name: payRes.data.payer_name,
              payer_upi: payRes.data.payer_upi || null,
              amount: payRes.data.amount || 100,
              payment_status: payRes.data.payment_status,
              screenshot_url: payRes.data.screenshot_url || undefined,
              notes: payRes.data.notes || undefined,
              rejection_reason: payRes.data.rejection_reason || undefined,
              submitted_at: payRes.data.submitted_at,
              verified_at: payRes.data.verified_at || null,
              verified_by: payRes.data.verified_by || null
            } : null,
            submissions: (subRes.data || []).map(s => ({
              id: s.id,
              team_id: s.team_id,
              round_number: s.round_number as (1 | 2),
              file_url: s.file_url,
              original_filename: s.original_filename,
              file_size: Number(s.file_size),
              file_type: s.file_type,
              version: s.version,
              submission_status: s.submission_status,
              submitted_at: s.submitted_at,
              review_notes: s.review_notes || undefined,
              project_url: s.project_url || undefined,
              repo_url: s.repo_url || undefined,
              demo_url: s.demo_url || undefined
            })),
            resubmission_requests: (resubRes.data || []).map(r => ({
              id: r.id,
              team_id: r.team_id,
              round_number: r.round_number ?? 1,
              reason: r.reason,
              status: r.status,
              review_notes: r.review_notes || null,
              reviewed_by: r.reviewed_by || null,
              reviewed_at: r.reviewed_at || null,
              consumed_at: r.consumed_at || null,
              consumed_submission_id: r.consumed_submission_id || null,
              created_at: r.created_at
            })),
            suspicion_flags: (flagRes.data || []).map(f => ({
              id: f.id,
              team_id: f.team_id,
              flag_type: f.flag_type,
              description: f.description,
              severity: f.severity,
              matched_value: f.matched_value,
              matched_team_id: f.matched_team_id || undefined,
              created_at: f.created_at
            })),
            audit_logs: (logRes.data || []).map(l => ({
              id: l.id,
              team_id: l.team_id,
              team_name: l.team_name,
              action: l.action,
              actor: l.actor,
              details: l.details,
              created_at: l.created_at
            })),
            created_at: team.created_at,
            updated_at: team.updated_at
          };
        }
      } catch (err) {
        console.warn('Supabase getTeam error, falling back to local store:', err);
      }
    }

    const store = loadLocalStore();
    const cleanLower = clean.toLowerCase();
    const cleanUsername = toUsername(clean);
    const team = store.teams.find(t =>
      t.id.toLowerCase() === cleanLower ||
      t.registration_id.toLowerCase() === cleanLower ||
      t.leader_email.toLowerCase() === cleanLower ||
      (!!cleanUsername && (t.username || toUsername(t.team_name)) === cleanUsername)
    );

    if (!team) return null;

    return {
      ...team,
      members: deduplicateTeamMembers(team.members, team),
      payment: store.payments.find(p => p.team_id === team.id || p.team_id === team.registration_id) || null,
      submissions: store.submissions.filter(s => s.team_id === team.id || s.team_id === team.registration_id) || [],
      resubmission_requests: (store.resubmissionRequests || [])
        .filter(r => r.team_id === team.id || r.team_id === team.registration_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      suspicion_flags: store.suspicionFlags.filter(f => f.team_id === team.id || f.team_id === team.registration_id) || [],
      audit_logs: store.auditLogs.filter(l => l.team_id === team.id || l.team_id === team.registration_id) || []
    };
  },

  // Payment Submission with Strict Uniqueness Check
  /**
   * Record a team's UPI payment reference and screenshot.
   *
   * THE BUG THIS REPLACES, because the shape of it matters:
   *
   * The Supabase branch upserted with `onConflict:'team_id'`, but
   * payments.team_id only ever had a plain index — no unique constraint. ON
   * CONFLICT requires a unique or exclusion constraint matching its target, so
   * Postgres rejected every single one of these with 42P10. The error was
   * logged and then ignored: the code carried on to mark the team PENDING,
   * wrote an audit row saying the UTR had been submitted, and finally fell
   * through to the local-file store — which does not exist on serverless.
   *
   * The participant, who really had paid, saw "Team record not found locally."
   * The organiser saw a team sitting at PENDING with an audit trail claiming a
   * submission and no payment row to verify. Both halves of that are wrong, and
   * neither is recoverable from the UI.
   *
   * This also blocked the mandatory payment screenshot: the upsert that failed
   * is the same one carrying screenshot_url, so no proof was ever stored.
   *
   * Three things changed:
   *   1. Migration 005 adds the unique constraint the upsert always needed.
   *   2. The payment row is written FIRST. Team status and the audit entry are
   *      only touched once a payment actually exists, so a failure can no
   *      longer leave the two disagreeing.
   *   3. The Supabase branch always returns. Falling through to a local JSON
   *      file when the real database is configured is never the right answer in
   *      production — it turns a database error into a baffling one.
   */
  async submitPayment(teamId: string, payload: { utrNumber: string; payerName: string; payerUpi: string; amount?: number; screenshotUrl?: string }): Promise<{ success: boolean; error?: string; payment?: PaymentRecord; fileCommitted?: boolean }> {
    let fileCommitted = false;
    const cleanUTR = payload.utrNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanPayer = payload.payerName.trim();
    const cleanPayerUpi = (payload.payerUpi || '').trim().toLowerCase();
    const now = new Date().toISOString();

    if (!cleanUTR || cleanUTR.length < 6) {
      return { success: false, error: 'Invalid UTR / Transaction Reference ID (Minimum 6 alphanumeric characters required).' };
    }
    if (!cleanPayer) {
      return { success: false, error: 'Payer name is required.' };
    }
    if (!/^[a-z0-9][a-z0-9._-]{1,49}@[a-z][a-z0-9]{1,40}$/.test(cleanPayerUpi)) {
      return { success: false, error: 'A valid payer UPI ID is required (e.g. name@okhdfcbank — the UPI ID you paid from).' };
    }

    const team = await this.getTeam(teamId);
    if (!team) {
      return { success: false, error: 'Squad record not found.' };
    }

    // A verified team resubmitting its UTR must not silently un-verify itself:
    // the unconditional PENDING write here was reverting admin verifications
    // whenever a participant replayed the payment form afterwards.
    if (team.payment_status === 'VERIFIED') {
      return {
        success: false,
        error: 'Your payment is already verified — no resubmission is needed. Contact the organisers if you believe this is wrong.'
      };
    }

    // What a participant sees when the database write fails. They have already
    // sent real money by UPI at this point, so the wording has to make clear
    // that this step records a reference and does not move funds.
    const WRITE_FAILED =
      'We could not save your payment reference just now. Your payment itself is not affected — ' +
      'this step only records the UTR. Please try again in a moment. If it keeps failing, ' +
      'contact the organisers with your UTR and they will record it manually.';

    if (isSupabaseConfigured() && supabase) {
      try {
        // Check UTR duplicate across other teams
        const { data: existingUTR } = await supabase
          .from('payments')
          .select('id, team_id')
          .eq('utr_number', cleanUTR)
          .neq('team_id', team.id)
          .maybeSingle();

        if (existingUTR) {
          await supabase.from('suspicion_flags').insert([{
            team_id: team.id,
            flag_type: 'DUPLICATE_UTR',
            description: `Submitted UTR ${cleanUTR} is already registered by another squad.`,
            severity: 'HIGH',
            matched_value: cleanUTR,
            created_at: now
          }]);

          return {
            success: false,
            error: `Database Integrity Error: Transaction ID / UTR "${cleanUTR}" has already been submitted by another team. Please ensure you enter your squad's unique payment reference.`
          };
        }

        // The payment row first. Nothing else may be recorded until this
        // succeeds — a team marked PENDING with no payment row is worse than a
        // clean failure the participant can retry.
        const { data: payData, error: payErr } = await supabase
          .from('payments')
          .upsert({
            team_id: team.id,
            utr_number: cleanUTR,
            payer_name: cleanPayer,
            // Requires migration 007 — a missing column fails the whole upsert
            // with PGRST204, exactly like the screenshot column did.
            payer_upi: cleanPayerUpi,
            amount: payload.amount || 100,
            payment_status: 'PENDING',
            screenshot_url: payload.screenshotUrl || null,
            submitted_at: now
          }, { onConflict: 'team_id' })
          .select('*')
          .single();

        if (payErr || !payData) {
          console.error(
            `[Payment] Could not record UTR for ${team.registration_id}: ${payErr?.message || 'no row returned'}`
          );
          // A 42P10 here means migration 005 has not been applied.
          if (payErr?.code === '42P10') {
            console.error(
              '[Payment] ON CONFLICT has no matching constraint — apply ' +
              'src/db/migrations/005_payments_one_per_team.sql.'
            );
          }
          return { success: false, error: WRITE_FAILED };
        }

        fileCommitted = true;
        // Only now is it true that this team has a payment on record.
        const { error: teamErr } = await supabase
          .from('teams')
          .update({ payment_status: 'PENDING', updated_at: now })
          .eq('id', team.id);

        if (teamErr) {
          // The payment IS saved, so this is not a failure the participant
          // should retry — a retry would not fix the status either. Organisers
          // can see the payment row; log loudly and report success.
          console.error(
            `[Payment] UTR saved for ${team.registration_id} but the team status did not update: ${teamErr.message}`
          );
        }

        await supabase.from('audit_logs').insert([{
          team_id: team.id,
          team_name: team.team_name,
          action: 'Payment UTR Submitted',
          actor: 'Participant Portal',
          details: `Submitted UTR: ${cleanUTR} (₹${payload.amount || 100}) by ${cleanPayer} from ${cleanPayerUpi}${payload.screenshotUrl ? ' with screenshot proof' : ''}`,
          created_at: now
        }]);

        return {
          success: true,
          payment: {
            id: payData.id,
            team_id: payData.team_id,
            utr_number: payData.utr_number,
            payer_name: payData.payer_name,
            payer_upi: payData.payer_upi || null,
            amount: payData.amount,
            payment_status: payData.payment_status,
            screenshot_url: payData.screenshot_url,
            submitted_at: payData.submitted_at
          }
        };
      } catch (sbErr) {
        console.error('[Payment] Supabase submitPayment threw:', sbErr);
        return { success: false, error: WRITE_FAILED, fileCommitted };
      }
      // Unreachable by design: every path above returns. Falling through to the
      // local store while Supabase is configured is what produced
      // "Team record not found locally." for a genuinely registered team.
    }

    // Local store. Reached only when Supabase is not configured at all, i.e.
    // local development against the .data file.
    const store = loadLocalStore();
    // Match on the team's own registration_id, not its id. The previous
    // comparison read `t.registration_id === team.id`, which can never be true.
    const localTeam = store.teams.find(
      t => t.id === team.id || t.registration_id === team.registration_id
    );
    if (!localTeam) return { success: false, error: 'Squad record not found.' };

    const duplicateUTR = store.payments.find(p => p.utr_number.toUpperCase() === cleanUTR && p.team_id !== localTeam.id);
    if (duplicateUTR) {
      store.suspicionFlags.push({
        id: `flag-${Date.now()}-utr`,
        team_id: localTeam.id,
        flag_type: 'DUPLICATE_UTR',
        description: `Submitted UTR ${cleanUTR} is already claimed by another squad.`,
        severity: 'HIGH',
        matched_value: cleanUTR,
        created_at: now
      });
      saveLocalStore(store);
      return {
        success: false,
        error: `Database Integrity Error: Transaction ID / UTR "${cleanUTR}" has already been submitted by another team.`
      };
    }

    let payment = store.payments.find(p => p.team_id === localTeam.id);
    if (payment) {
      payment.utr_number = cleanUTR;
      payment.payer_name = cleanPayer;
      payment.payer_upi = cleanPayerUpi;
      payment.amount = payload.amount || 100;
      payment.payment_status = 'PENDING';
      if (payload.screenshotUrl) payment.screenshot_url = payload.screenshotUrl;
      payment.submitted_at = now;
    } else {
      payment = {
        id: `pay-${Date.now()}`,
        team_id: localTeam.id,
        utr_number: cleanUTR,
        payer_name: cleanPayer,
        payer_upi: cleanPayerUpi,
        amount: payload.amount || 100,
        payment_status: 'PENDING',
        screenshot_url: payload.screenshotUrl || undefined,
        submitted_at: now
      };
      store.payments.push(payment);
    }

    localTeam.payment_status = 'PENDING';
    localTeam.updated_at = now;
    saveLocalStore(store);

    return { success: true, payment };
  },

  // Admin Payment Actions: VERIFY, REJECT, REQUEST_RESUBMISSION
  async updatePaymentVerification(
    teamId: string,
    action: 'VERIFY' | 'REJECT' | 'REQUEST_RESUBMISSION',
    actor = 'Admin Secretariat',
    reason?: string,
    // Off-platform evidence recorded by the organiser (WhatsApp screenshots
    // etc.). Only the fields provided overwrite what a team submitted itself.
    details?: { utrNumber?: string; payerName?: string; payerUpi?: string; screenshotUrl?: string; notes?: string; amount?: number }
  ): Promise<{ success: boolean; error?: string; team: TeamRecord | null; payment?: PaymentRecord }> {
    const team = await this.getTeam(teamId);
    if (!team) throw new Error('Team not found');
    const now = new Date().toISOString();

    // A payment record must exist for every decided payment — verified teams
    // with no ledger row are unauditable. When the team never submitted
    // through the portal, the organiser's manual evidence (or a per-team
    // placeholder; utr_number is UNIQUE so it cannot be a shared constant)
    // becomes the row.
    const manualUtr = (details?.utrNumber || '').trim().toUpperCase() || `MANUAL-${team.registration_id}`;
    const hasAcceptedR1 = (team.submissions || []).some(
      s => s.round_number === 1 && s.submission_status === 'ACCEPTED'
    );

    let targetPaymentStatus: 'VERIFIED' | 'REJECTED' | 'RESUBMISSION_REQUIRED' = 'VERIFIED';
    let targetRound1Status = team.round_1_status;

    if (action === 'VERIFY') {
      targetPaymentStatus = 'VERIFIED';
      if (team.round_1_status === 'NOT_STARTED' || team.round_1_status === 'SUBMISSION_OPEN') {
        // A team re-verified after a mistaken reject must get its SUBMITTED
        // standing back, not a reopened submission window.
        targetRound1Status = hasAcceptedR1 ? 'SUBMITTED' : 'SUBMISSION_OPEN';
      }
    } else if (action === 'REJECT') {
      targetPaymentStatus = 'REJECTED';
      // Do not rewind a team that already has an accepted deck out of the
      // jury pipeline — the rejection is about the payment, not the work.
      if (!hasAcceptedR1) targetRound1Status = 'NOT_STARTED';
    } else if (action === 'REQUEST_RESUBMISSION') {
      targetPaymentStatus = 'RESUBMISSION_REQUIRED';
    }

    if (isSupabaseConfigured() && supabase) {
      // Every path in this branch returns — falling through to the local JSON
      // file when the real database is configured turns a database error into
      // a bogus 'Team not found' 500 for an action that may have succeeded.
      try {
        const decision = {
          payment_status: targetPaymentStatus,
          verified_at: action === 'VERIFY' ? now : null,
          verified_by: action === 'VERIFY' ? actor : null,
          rejection_reason: (action === 'REJECT' || action === 'REQUEST_RESUBMISSION') ? (reason || 'Verification rejected') : null
        };

        // Merge-don't-clobber: overwrite team-submitted evidence only with
        // fields the organiser explicitly provided.
        const provided: Record<string, unknown> = {};
        if (details?.utrNumber) provided.utr_number = manualUtr;
        if (details?.payerName) provided.payer_name = details.payerName.trim();
        if (details?.payerUpi) provided.payer_upi = details.payerUpi.trim().toLowerCase();
        if (details?.screenshotUrl) provided.screenshot_url = details.screenshotUrl;
        if (details?.notes) provided.notes = details.notes.trim();
        if (details?.amount) provided.amount = details.amount;

        const { data: existingPay, error: existErr } = await supabase
          .from('payments')
          .select('id')
          .eq('team_id', team.id)
          .maybeSingle();
        if (existErr) {
          console.error(`[Payment] Could not read payments row for ${team.registration_id}: ${existErr.message}`);
          return { success: false, error: `Could not read the payment record: ${existErr.message}`, team };
        }

        let payErr: { message: string } | null = null;
        if (existingPay) {
          ({ error: payErr } = await supabase
            .from('payments')
            .update({ ...decision, ...provided })
            .eq('team_id', team.id));
        } else {
          // No portal submission ever happened (the WhatsApp workflow) — the
          // decision creates the ledger row instead of updating zero rows
          // silently, which is what left VERIFIED teams with no payment record.
          ({ error: payErr } = await supabase
            .from('payments')
            .insert([{
              team_id: team.id,
              utr_number: manualUtr,
              payer_name: details?.payerName?.trim() || team.leader_name,
              payer_upi: details?.payerUpi?.trim().toLowerCase() || null,
              screenshot_url: details?.screenshotUrl || null,
              notes: details?.notes?.trim() || `Recorded off-platform by ${actor} (no portal submission)`,
              amount: details?.amount || 100,
              submitted_at: now,
              ...decision
            }]));
        }
        if (payErr) {
          console.error(`[Payment] payments write failed for ${team.registration_id}: ${payErr.message}`);
          return { success: false, error: `Could not record the payment decision: ${payErr.message}`, team };
        }

        // The teams row is what every participant-facing surface reads — if
        // this write does not land, the action did NOT happen, no matter what
        // the toast would like to say.
        const { data: teamRows, error: teamErr } = await supabase
          .from('teams')
          .update({
            payment_status: targetPaymentStatus,
            round_1_status: targetRound1Status,
            updated_at: now
          })
          .eq('id', team.id)
          .select('id');
        if (teamErr || !teamRows || teamRows.length === 0) {
          const msg = teamErr?.message || 'update matched no team row';
          console.error(`[Payment] teams status write failed for ${team.registration_id}: ${msg}`);
          return { success: false, error: `Payment record saved but the team status did not update: ${msg}. Retry the action.`, team };
        }

        // Only now is the audit claim true.
        await supabase.from('audit_logs').insert([{
          team_id: team.id,
          team_name: team.team_name,
          action: action === 'VERIFY' ? 'Payment Verified' : action === 'REJECT' ? 'Payment Rejected' : 'Payment Resubmission Requested',
          actor,
          details: reason || (action === 'VERIFY' ? `Payment confirmed by ${actor}${existingPay ? '' : ' (recorded off-platform)'}` : 'Status updated'),
          created_at: now
        }]);

        const updated = await this.getTeam(team.id);
        if (updated) {
          return { success: true, team: updated, payment: updated.payment || undefined };
        }
        // Writes landed but the re-read failed — report success with the
        // locally-composed state rather than a bogus failure.
        return {
          success: true,
          team: { ...team, payment_status: targetPaymentStatus, round_1_status: targetRound1Status, updated_at: now }
        };
      } catch (sbErr) {
        console.error('Supabase updatePaymentVerification error:', sbErr);
        return {
          success: false,
          error: sbErr instanceof Error ? sbErr.message : 'Database error while updating payment status',
          team
        };
      }
    }

    // Local fallback update — reached only when Supabase is not configured.
    const store = loadLocalStore();
    const localTeam = store.teams.find(t => t.id === team.id || t.registration_id === team.registration_id);
    if (!localTeam) throw new Error('Team not found');

    let payment = store.payments.find(p => p.team_id === localTeam.id);
    if (!payment) {
      payment = {
        id: `pay-${Date.now()}`,
        team_id: localTeam.id,
        utr_number: manualUtr,
        payer_name: details?.payerName?.trim() || localTeam.leader_name,
        payer_upi: details?.payerUpi?.trim().toLowerCase() || null,
        screenshot_url: details?.screenshotUrl || undefined,
        notes: details?.notes?.trim() || undefined,
        amount: details?.amount || 100,
        payment_status: targetPaymentStatus,
        submitted_at: now
      };
      store.payments.push(payment);
    } else {
      if (details?.utrNumber) payment.utr_number = manualUtr;
      if (details?.payerName) payment.payer_name = details.payerName.trim();
      if (details?.payerUpi) payment.payer_upi = details.payerUpi.trim().toLowerCase();
      if (details?.screenshotUrl) payment.screenshot_url = details.screenshotUrl;
      if (details?.notes) payment.notes = details.notes.trim();
      if (details?.amount) payment.amount = details.amount;
    }

    payment.payment_status = targetPaymentStatus;
    if (action === 'VERIFY') {
      payment.verified_at = now;
      payment.verified_by = actor;
    } else {
      payment.rejection_reason = reason;
    }

    localTeam.payment_status = targetPaymentStatus;
    localTeam.round_1_status = targetRound1Status;
    localTeam.updated_at = now;
    saveLocalStore(store);

    return { success: true, team: localTeam, payment };
  },

  // Round 1 Native Presentation Submission
  async submitRound1File(teamId: string, fileInfo: {
    originalFilename: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
    projectUrl?: string | null;
    repoUrl?: string | null;
    demoUrl?: string | null;
  }): Promise<{ success: boolean; error?: string; submission?: SubmissionRecord; fileCommitted?: boolean }> {
    let fileCommitted = false;
    const team = await this.getTeam(teamId);
    if (!team) return { success: false, error: 'Team record not found.' };

    // Gate 1 — payment. Verification is also what auto-accepts the first deck,
    // so nothing beyond this point needs organiser sign-off for an original.
    if (team.payment_status !== 'VERIFIED') {
      return { success: false, error: 'Payment must be verified by organizers before Round 1 submission.' };
    }

    const config = await this.getConfig();
    const eligibilityError = submissionEligibilityError(team, config);
    if (eligibilityError) return { success: false, error: eligibilityError };
    const deadline = new Date(config.round1SubmissionDeadline).getTime();
    if (Date.now() > deadline) {
      return { success: false, error: `Round 1 Submission Deadline has passed (${config.round1SubmissionDeadline}). Submissions are locked.` };
    }

    const existingSubmissions = (team.submissions || []).filter(s => s.round_number === 1);
    const isFirstSubmission = existingSubmissions.length === 0;

    // Gate 2 — replacing an existing deck costs one organiser-approved request.
    let approvedRequest: ResubmissionRequest | undefined;
    if (!isFirstSubmission) {
      if (!config.allowRound1Resubmission) {
        return { success: false, error: 'Organizers have closed Round 1 re-uploads entirely.' };
      }

      const openRequests = team.resubmission_requests || [];
      approvedRequest = openRequests.find(r => r.status === 'APPROVED' && r.round_number === 1);

      if (!approvedRequest) {
        const pending = openRequests.find(r => r.status === 'PENDING' && r.round_number === 1);
        return {
          success: false,
          error: pending
            ? 'Your re-upload request is still awaiting organiser review. You will be emailed as soon as it is decided.'
            : 'Your presentation is already submitted. Request organiser approval before uploading a replacement.'
        };
      }
    }

    const version = existingSubmissions.length + 1;
    const now = new Date().toISOString();
    // Only decks still in play get superseded; anything already evaluated stays put.
    const supersededIds = existingSubmissions
      .filter(s => s.submission_status === 'ACCEPTED' || s.submission_status === 'SUBMITTED')
      .map(s => s.id);

    if (isSupabaseConfigured() && supabase) {
      try {
        // Spend the approval FIRST, conditional on it still being APPROVED. This
        // is the compare-and-swap that stops two concurrent uploads from both
        // cashing in the same approval; supabase-js gives us no transaction.
        if (approvedRequest) {
          const { data: claimed, error: claimErr } = await supabase
            .from('resubmission_requests')
            .update({ status: 'USED', consumed_at: now })
            .eq('id', approvedRequest.id)
            .eq('status', 'APPROVED')
            .select('id');

          if (claimErr || !claimed || claimed.length === 0) {
            return {
              success: false,
              error: 'This re-upload approval has already been used. Request organiser approval again to replace your deck.'
            };
          }
        }

        const { data: subData, error: subErr } = await supabase
          .from('submissions')
          .insert([{
            team_id: team.id,
            round_number: 1,
            file_url: fileInfo.fileUrl,
            original_filename: fileInfo.originalFilename,
            file_size: fileInfo.fileSize,
            file_type: fileInfo.fileType,
            project_url: fileInfo.projectUrl || null,
            repo_url: fileInfo.repoUrl || null,
            demo_url: fileInfo.demoUrl || null,
            version,
            // The live deck for the jury, whether it is the original or an
            // approved replacement.
            submission_status: 'ACCEPTED',
            submitted_at: now
          }])
          .select('*')
          .single();

        if (subErr || !subData) {
          // Hand the approval back rather than burning it on a failed insert.
          if (approvedRequest) {
            await supabase
              .from('resubmission_requests')
              .update({ status: 'APPROVED', consumed_at: null })
              .eq('id', approvedRequest.id);
          }
          throw subErr || new Error('Submission insert returned no row');
        }

        fileCommitted = true;
        // The accepted deck is real from here on — these are state-sync writes
        // whose failure must be loudly visible but must not undo the upload.
        if (supersededIds.length > 0) {
          const { error: supErr } = await supabase
            .from('submissions')
            .update({ submission_status: 'SUPERSEDED' })
            .in('id', supersededIds);
          if (supErr) console.error(`[Submission] Could not mark old decks SUPERSEDED for ${team.registration_id}: ${supErr.message}`);
        }

        if (approvedRequest) {
          const { error: linkErr } = await supabase
            .from('resubmission_requests')
            .update({ consumed_submission_id: subData.id })
            .eq('id', approvedRequest.id);
          if (linkErr) console.error(`[Submission] Could not link consumed approval for ${team.registration_id}: ${linkErr.message}`);
        }

        const { data: statusRows, error: statusErr } = await supabase
          .from('teams')
          .update({ round_1_status: 'SUBMITTED', updated_at: now })
          .eq('id', team.id)
          .select('id');
        if (statusErr || !statusRows || statusRows.length === 0) {
          console.error(
            `[Submission] Deck saved for ${team.registration_id} but round_1_status did not update: ${statusErr?.message || 'no row matched'}`
          );
        }

        await supabase.from('audit_logs').insert([{
          team_id: team.id,
          team_name: team.team_name,
          action: isFirstSubmission
            ? 'Round 1 PPT Submitted & Auto-Accepted (v1)'
            : `Round 1 PPT Replaced via Approved Request (v${version})`,
          actor: 'Participant Portal',
          details: `Uploaded ${fileInfo.originalFilename} (${(fileInfo.fileSize / (1024 * 1024)).toFixed(2)} MB)${fileInfo.projectUrl ? ` • Project: ${fileInfo.projectUrl}` : ''}`,
          created_at: now
        }]);

        return {
          success: true,
          submission: {
            id: subData.id,
            team_id: subData.team_id,
            round_number: subData.round_number as (1 | 2),
            file_url: subData.file_url,
            original_filename: subData.original_filename,
            file_size: Number(subData.file_size),
            file_type: subData.file_type,
            version: subData.version,
            submission_status: subData.submission_status,
            submitted_at: subData.submitted_at,
            project_url: subData.project_url || undefined,
            repo_url: subData.repo_url || undefined,
            demo_url: subData.demo_url || undefined
          }
        };
      } catch (sbErr) {
        // Return the failure. The old fall-through wrote the submission into
        // the ephemeral local store on serverless and reported success — the
        // participant saw 'submitted' while the jury never got a record.
        console.error('Supabase submitRound1File error:', sbErr);
        return {
          success: false,
          fileCommitted,
          error: 'Could not record your submission just now — nothing was saved. Please submit again in a moment; contact the organisers if it keeps failing.'
        };
      }
    }

    // Local fallback
    const store = loadLocalStore();

    if (approvedRequest) {
      const localReq = (store.resubmissionRequests || []).find(r => r.id === approvedRequest!.id);
      if (localReq) {
        if (localReq.status !== 'APPROVED') {
          return {
            success: false,
            error: 'This re-upload approval has already been used. Request organiser approval again to replace your deck.'
          };
        }
        localReq.status = 'USED';
        localReq.consumed_at = now;
      }
    }

    const newSubmission: SubmissionRecord = {
      id: `sub-${Date.now()}-${version}`,
      team_id: team.id,
      round_number: 1,
      file_url: fileInfo.fileUrl,
      original_filename: fileInfo.originalFilename,
      file_size: fileInfo.fileSize,
      file_type: fileInfo.fileType,
      version,
      submission_status: 'ACCEPTED',
      submitted_at: now,
      project_url: fileInfo.projectUrl || undefined,
      repo_url: fileInfo.repoUrl || undefined,
      demo_url: fileInfo.demoUrl || undefined
    };

    for (const prior of store.submissions) {
      if (supersededIds.includes(prior.id)) {
        prior.submission_status = 'SUPERSEDED';
      }
    }

    if (approvedRequest) {
      const localReq = (store.resubmissionRequests || []).find(r => r.id === approvedRequest!.id);
      if (localReq) localReq.consumed_submission_id = newSubmission.id;
    }

    store.submissions.push(newSubmission);
    const localTeam = store.teams.find(t => t.id === team.id);
    if (localTeam) {
      localTeam.round_1_status = 'SUBMITTED';
      localTeam.updated_at = now;
    }

    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      team_id: team.id,
      team_name: team.team_name,
      action: isFirstSubmission
        ? 'Round 1 PPT Submitted & Auto-Accepted (v1)'
        : `Round 1 PPT Replaced via Approved Request (v${version})`,
      actor: 'Participant Portal',
      details: `Uploaded ${fileInfo.originalFilename} (${(fileInfo.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      created_at: now
    });

    saveLocalStore(store);

    return { success: true, submission: newSubmission };
  },

  // ----------------------------------------------------------------------------
  // Round 1 Re-upload Request Workflow
  //
  // A team's first deck is auto-accepted the moment payment is VERIFIED.
  // Replacing it takes a request an organiser approves, and each approval buys
  // exactly one re-upload.
  // ----------------------------------------------------------------------------

  /** Participant-side: ask organisers for permission to replace the Round 1 deck. */
  async requestRoundOneReupload(
    teamId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string; request?: ResubmissionRequest }> {
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 15) {
      return { success: false, error: 'Please describe why you need to re-upload, in at least 15 characters.' };
    }
    if (cleanReason.length > 1000) {
      return { success: false, error: 'Reason is too long (1000 character maximum).' };
    }

    const team = await this.getTeam(teamId);
    if (!team) return { success: false, error: 'Team record not found.' };

    if (team.payment_status !== 'VERIFIED') {
      return { success: false, error: 'Payment must be verified before you can request a re-upload.' };
    }

    const config = await this.getConfig();
    if (!config.allowRound1Resubmission) {
      return { success: false, error: 'Organizers have closed Round 1 re-uploads entirely.' };
    }
    if (Date.now() > new Date(config.round1SubmissionDeadline).getTime()) {
      return { success: false, error: 'The Round 1 submission window has closed. Re-uploads are no longer possible.' };
    }

    const existing = (team.submissions || []).filter(s => s.round_number === 1);
    if (existing.length === 0) {
      return { success: false, error: 'You have no submission to replace yet — upload your first presentation directly.' };
    }

    const requests = team.resubmission_requests || [];
    if (requests.some(r => r.status === 'APPROVED' && r.round_number === 1)) {
      return { success: false, error: 'You already have an approved re-upload. Upload your new presentation now.' };
    }
    if (requests.some(r => r.status === 'PENDING' && r.round_number === 1)) {
      return { success: false, error: 'You already have a re-upload request awaiting review.' };
    }

    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('resubmission_requests')
          .insert([{
            team_id: team.id,
            round_number: 1,
            reason: cleanReason,
            status: 'PENDING',
            created_at: now
          }])
          .select('*')
          .single();

        if (error) {
          // The partial unique index rejects a second open request; that is the
          // database catching a double-submit, not a server fault.
          if (error.code === '23505') {
            return { success: false, error: 'You already have a re-upload request awaiting review.' };
          }
          throw error;
        }

        await supabase.from('audit_logs').insert([{
          team_id: team.id,
          team_name: team.team_name,
          action: 'Round 1 Re-upload Requested',
          actor: 'Participant Portal',
          details: cleanReason,
          created_at: now
        }]);

        return { success: true, request: data as ResubmissionRequest };
      } catch (sbErr) {
        // Return the failure — the old fall-through pushed the request into
        // the ephemeral local store and told the participant 'submitted'
        // while nothing was persisted.
        console.error('Supabase requestRoundOneReupload error:', sbErr);
        return {
          success: false,
          error: 'Could not record your re-upload request just now. Please try again in a moment.'
        };
      }
    }

    const store = loadLocalStore();
    store.resubmissionRequests = store.resubmissionRequests || [];
    const request: ResubmissionRequest = {
      id: `resub-${Date.now()}`,
      team_id: team.id,
      round_number: 1,
      reason: cleanReason,
      status: 'PENDING',
      created_at: now
    };
    store.resubmissionRequests.push(request);
    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      team_id: team.id,
      team_name: team.team_name,
      action: 'Round 1 Re-upload Requested',
      actor: 'Participant Portal',
      details: cleanReason,
      created_at: now
    });
    saveLocalStore(store);

    return { success: true, request };
  },

  /** Organiser-side: approve or reject a pending re-upload request. */
  async reviewReuploadRequest(
    teamId: string,
    action: 'APPROVE' | 'REJECT',
    actor = 'Admin Secretariat',
    note?: string,
    requestId?: string
  ): Promise<{ success: boolean; error?: string; team?: TeamRecord; request?: ResubmissionRequest }> {
    const team = await this.getTeam(teamId);
    if (!team) return { success: false, error: 'Team record not found.' };

    const requests = team.resubmission_requests || [];
    const target = requestId
      ? requests.find(r => r.id === requestId)
      : requests.find(r => r.status === 'PENDING' && r.round_number === 1);

    if (!target) {
      return { success: false, error: 'No pending re-upload request found for this team.' };
    }
    if (target.status !== 'PENDING') {
      return { success: false, error: `This request was already ${target.status.toLowerCase()}.` };
    }

    const now = new Date().toISOString();
    const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const cleanNote = (note || '').trim() || null;

    if (isSupabaseConfigured() && supabase) {
      try {
        // Conditional on PENDING so two organisers clicking at once cannot both win.
        const { data: updated, error } = await supabase
          .from('resubmission_requests')
          .update({
            status: nextStatus,
            review_notes: cleanNote,
            reviewed_by: actor,
            reviewed_at: now
          })
          .eq('id', target.id)
          .eq('status', 'PENDING')
          .select('*');

        if (error) throw error;
        if (!updated || updated.length === 0) {
          return { success: false, error: 'This request was already reviewed by another organiser.' };
        }

        await supabase.from('audit_logs').insert([{
          team_id: team.id,
          team_name: team.team_name,
          action: action === 'APPROVE' ? 'Round 1 Re-upload Approved' : 'Round 1 Re-upload Rejected',
          actor,
          details: cleanNote || (action === 'APPROVE' ? 'One replacement upload unlocked' : 'Existing submission stands'),
          created_at: now
        }]);

        const refreshed = await this.getTeam(team.id);
        return { success: true, team: refreshed || team, request: updated[0] as ResubmissionRequest };
      } catch (sbErr) {
        console.error('Supabase reviewReuploadRequest error:', sbErr);
      }
    }

    const store = loadLocalStore();
    store.resubmissionRequests = store.resubmissionRequests || [];
    const localReq = store.resubmissionRequests.find(r => r.id === target.id);
    if (!localReq) return { success: false, error: 'Request not found.' };
    if (localReq.status !== 'PENDING') {
      return { success: false, error: 'This request was already reviewed by another organiser.' };
    }

    localReq.status = nextStatus;
    localReq.review_notes = cleanNote;
    localReq.reviewed_by = actor;
    localReq.reviewed_at = now;

    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      team_id: team.id,
      team_name: team.team_name,
      action: action === 'APPROVE' ? 'Round 1 Re-upload Approved' : 'Round 1 Re-upload Rejected',
      actor,
      details: cleanNote || (action === 'APPROVE' ? 'One replacement upload unlocked' : 'Existing submission stands'),
      created_at: now
    });
    saveLocalStore(store);

    const refreshed = await this.getTeam(team.id);
    return { success: true, team: refreshed || team, request: localReq };
  },

  // Admin Round 1 Evaluation & Round 2 Access Gate
  async evaluateRound1(
    teamId: string,
    decision: 'SELECT' | 'NOT_SELECTED' | 'UNDER_REVIEW' | 'SAVE_SCORES',
    actor = 'Admin Secretariat',
    score?: number,
    notes?: string,
    evaluationScores?: EvaluationScores
  ): Promise<{ success: boolean; team: TeamRecord }> {
    const team = await this.getTeam(teamId);
    if (!team) throw new Error('Team not found');
    const now = new Date().toISOString();

    let targetRound1Status: Round1Status = 
      decision === 'SELECT' ? 'SELECTED' : decision === 'NOT_SELECTED' ? 'NOT_SELECTED' : 'UNDER_REVIEW';
    let targetRound2Status: Round2Status = decision === 'SELECT' ? 'ACCESS_GRANTED' : 'LOCKED';

    if (decision === 'SAVE_SCORES') {
      targetRound1Status = (team.round_1_status === 'SELECTED' || team.round_1_status === 'NOT_SELECTED') 
        ? team.round_1_status 
        : 'UNDER_REVIEW';
      targetRound2Status = team.round_2_status;
    }

    const calculatedScore = evaluationScores ? evaluationScores.total : (typeof score === 'number' ? score : team.round_1_score);

    const scoresPayload = evaluationScores ? {
      ...evaluationScores,
      evaluatedAt: now,
      evaluatedBy: actor
    } : team.evaluation_scores || null;

    if (isSupabaseConfigured() && supabase) {
      // Every path in this branch returns or throws with the REAL error.
      // Falling through to the (empty, read-only on serverless) local store
      // turned database failures into silent no-ops behind a success toast,
      // or bogus 'Team not found' 500s — same shape updatePaymentVerification
      // was already cured of.
      const { data: updRows, error: updErr } = await supabase
        .from('teams')
        .update({
          round_1_status: targetRound1Status,
          round_2_status: targetRound2Status,
          round_1_score: calculatedScore !== undefined ? calculatedScore : null,
          evaluation_scores: scoresPayload,
          admin_notes: notes || team.admin_notes || null,
          updated_at: now
        })
        .eq('id', team.id)
        .select('id');
      if (updErr || !updRows || updRows.length === 0) {
        throw new Error(`Evaluation did not save: ${updErr?.message || 'update matched no team row'}`);
      }

      const breakdownStr = evaluationScores
        ? `[Scores: Innov=${evaluationScores.innovation}/10, Arch=${evaluationScores.architecture}/10, Impact=${evaluationScores.impact}/10, Exec=${evaluationScores.execution}/10, Feas=${evaluationScores.feasibility}/10 => Total=${evaluationScores.total}/50]`
        : `Score: ${calculatedScore !== undefined ? calculatedScore : 'N/A'}`;

      const { error: logErr } = await supabase.from('audit_logs').insert([{
        team_id: team.id,
        team_name: team.team_name,
        action: decision === 'SELECT' ? 'Team Selected for Round 2' : decision === 'NOT_SELECTED' ? 'Round 1 Decision: Not Selected' : decision === 'SAVE_SCORES' ? 'Rubric Evaluation Saved' : 'Round 1 Under Review',
        actor,
        details: `${breakdownStr}. ${notes || ''}`.trim(),
        created_at: now
      }]);
      if (logErr) console.error('[Evaluate] audit log insert failed:', logErr.message);

      const updated = await this.getTeam(team.id);
      // The write landed; a failed re-read must not report as failure — compose locally.
      return {
        success: true,
        team: updated ?? {
          ...team,
          round_1_status: targetRound1Status,
          round_2_status: targetRound2Status,
          round_1_score: calculatedScore !== undefined && calculatedScore !== null ? calculatedScore : team.round_1_score,
          evaluation_scores: scoresPayload || team.evaluation_scores,
          admin_notes: notes || team.admin_notes,
          updated_at: now
        }
      };
    }

    const store = loadLocalStore();
    const localTeam = store.teams.find(t => t.id === team.id || t.registration_id === team.registration_id);
    if (!localTeam) throw new Error('Team not found');

    localTeam.round_1_status = targetRound1Status;
    localTeam.round_2_status = targetRound2Status;
    if (calculatedScore !== undefined && calculatedScore !== null) localTeam.round_1_score = calculatedScore;
    if (scoresPayload) localTeam.evaluation_scores = scoresPayload;
    if (notes) localTeam.admin_notes = notes;
    localTeam.updated_at = now;

    saveLocalStore(store);
    return { success: true, team: localTeam };
  },

  // Add Admin Note
  async addAdminNote(teamId: string, note: string, actor = 'Admin'): Promise<TeamRecord> {
    const team = await this.getTeam(teamId);
    if (!team) throw new Error('Team not found');
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      // Return or throw with the real error — never fall through to the local
      // store, which on serverless is empty and reports 'Team not found'.
      const { data: updRows, error: updErr } = await supabase
        .from('teams')
        .update({ admin_notes: note.trim(), updated_at: now })
        .eq('id', team.id)
        .select('id');
      if (updErr || !updRows || updRows.length === 0) {
        throw new Error(`Note did not save: ${updErr?.message || 'update matched no team row'}`);
      }

      const { error: logErr } = await supabase.from('audit_logs').insert([{
        team_id: team.id,
        team_name: team.team_name,
        action: 'Admin Note Updated',
        actor,
        details: note.trim(),
        created_at: now
      }]);
      if (logErr) console.error('[AdminNote] audit log insert failed:', logErr.message);

      const updated = await this.getTeam(team.id);
      return updated ?? { ...team, admin_notes: note.trim(), updated_at: now };
    }

    const store = loadLocalStore();
    const localTeam = store.teams.find(t => t.id === team.id || t.registration_id === team.registration_id);
    if (!localTeam) throw new Error('Team not found');

    localTeam.admin_notes = note.trim();
    localTeam.updated_at = now;
    saveLocalStore(store);

    return localTeam;
  },

  // Get Admin Dashboard Overview and Teams
  /**
   * Lightweight counters for the public landing page.
   *
   * The homepage counter used to call getAdminOverview(), which issues seven
   * full-table SELECTs — every team, every member, every payment, every
   * submission, every suspicion flag and the audit log — then assembles the
   * complete admin dataset in memory, all to return five integers to an
   * anonymous visitor. One page load pulled the entire database, and the
   * endpoint had neither auth nor a rate limit, so the cost scaled with
   * traffic and with the size of the event.
   *
   * This reads two columns from one table. The filters below are kept
   * deliberately identical to the admin stats so the public number and the
   * organiser number can never disagree.
   */
  async getPublicCounts(): Promise<{
    totalRegistrations: number;
    paymentVerified: number;
    paymentPending: number;
    round1Submissions: number;
    round1Selected: number;
  }> {
    const ROUND1_SUBMITTED = ['SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'NOT_SELECTED'];

    const tally = (rows: { payment_status?: string | null; round_1_status?: string | null }[]) => ({
      totalRegistrations: rows.length,
      paymentVerified: rows.filter(r => r.payment_status === 'VERIFIED').length,
      paymentPending: rows.filter(r => r.payment_status === 'PENDING').length,
      round1Submissions: rows.filter(r => ROUND1_SUBMITTED.includes(r.round_1_status || '')).length,
      round1Selected: rows.filter(r => r.round_1_status === 'SELECTED').length
    });

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('payment_status, round_1_status');
        if (error) throw error;
        return tally(data || []);
      } catch (err) {
        console.error('[Counts] Supabase getPublicCounts failed:', err);
        // Fall through to the local store rather than failing the landing page.
      }
    }

    return tally(loadLocalStore().teams);
  },

  async getAdminOverview(filters?: {
    search?: string;
    paymentStatus?: string;
    round1Status?: string;
    round2Status?: string;
    track?: string;
    college?: string;
    onlySuspicious?: boolean;
  }): Promise<{
    stats: {
      totalRegistrations: number;
      paymentVerified: number;
      paymentPending: number;
      paymentRejected: number;
      paymentResubmission: number;
      round1Submissions: number;
      round1PendingReview: number;
      round1Selected: number;
      round1NotSelected: number;
      reuploadRequestsPending: number;
      totalRevenue: number;
      countByTrack: Record<string, number>;
    };
    teams: TeamRecord[];
    auditLogs: AuditLogRecord[];
  }> {
    let teams: TeamRecord[] = [];
    let auditLogs: AuditLogRecord[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        // fetchAllRows pages past the 1000-row cap; audit_logs stays capped
        // at the 50 most recent on purpose.
        //
        // Child tables degrade to [] with a LOUD log rather than killing the
        // whole roster: this live database has repeatedly been missing tables
        // and columns its migrations promise (001, 004, 005, 006, 007...),
        // and a missing resubmission_requests table must not render the
        // console as zero teams. Only the teams fetch itself stays fatal.
        const projectedFetch = async (
          table: string,
          select: string,
          order?: { column: string; ascending: boolean }
        ) => {
          try {
            return await fetchAllRows(table, order, select);
          } catch (projectionError) {
            // Some long-lived installations intentionally lag optional schema
            // migrations. Keep those deployments working while the current
            // schema benefits from narrow projections.
            console.warn(`[AdminOverview] ${table} projected select failed; retrying legacy wildcard.`, projectionError);
            return await fetchAllRows(table, order);
          }
        };

        const softFetch = async (
          table: string,
          select: string,
          order?: { column: string; ascending: boolean }
        ) => {
          try {
            return await projectedFetch(table, select, order);
          } catch (err) {
            console.error(`[AdminOverview] ${table} unavailable — roster renders without it. Apply the missing migration.`, err);
            return [];
          }
        };

        const [teamsData, memData, payData, subData, resubData, flagData, logRes] = await Promise.all([
          projectedFetch(
            'teams',
            'id, registration_id, team_name, username, leader_name, leader_phone, leader_email, institution, department, year, problem_statement, access_token, payment_status, amount, registration_status, round_1_status, round_2_status, round_1_score, evaluation_scores, admin_notes, created_at, updated_at',
            { column: 'created_at', ascending: false }
          ),
          softFetch('team_members', 'id, team_id, member_number, member_name, member_email, member_phone, department, year', { column: 'member_number', ascending: true }),
          softFetch('payments', 'id, team_id, utr_number, payer_name, payer_upi, amount, payment_status, screenshot_url, notes, rejection_reason, submitted_at, verified_at, verified_by'),
          softFetch('submissions', 'id, team_id, round_number, file_url, original_filename, file_size, file_type, version, submission_status, submitted_at, review_notes, project_url, repo_url, demo_url', { column: 'version', ascending: false }),
          softFetch('resubmission_requests', 'id, team_id, round_number, reason, status, review_notes, reviewed_by, reviewed_at, consumed_at, consumed_submission_id, created_at', { column: 'created_at', ascending: false }),
          softFetch('suspicion_flags', 'id, team_id, flag_type, description, severity, matched_value, matched_team_id, created_at', { column: 'created_at', ascending: false }),
          supabase.from('audit_logs').select('id, team_id, team_name, action, actor, details, created_at').order('created_at', { ascending: false }).limit(50)
        ]);

        if (teamsData) {
          const membersByTeam = new Map<string, TeamMember[]>();
          memData.forEach(m => {
            const list = membersByTeam.get(m.team_id) || [];
            list.push({
              id: m.id,
              team_id: m.team_id,
              member_number: m.member_number,
              member_name: m.member_name,
              member_email: m.member_email || undefined,
              member_phone: m.member_phone,
              department: m.department || undefined,
              year: m.year || undefined
            });
            membersByTeam.set(m.team_id, list);
          });

          const paymentsByTeam = new Map<string, PaymentRecord>();
          payData.forEach(p => {
            paymentsByTeam.set(p.team_id, {
              id: p.id,
              team_id: p.team_id,
              utr_number: p.utr_number,
              payer_name: p.payer_name,
              payer_upi: p.payer_upi || null,
              amount: p.amount || 100,
              payment_status: p.payment_status,
              // Receipts stored as data: URLs are multi-MB each; shipping them
              // for EVERY team blows the roster response toward Vercel's
              // ~4.5MB limit. The bulk payload carries the 'inline' marker;
              // the console fetches the real bytes per team on click.
              screenshot_url: p.screenshot_url
                ? (String(p.screenshot_url).startsWith('data:') ? 'inline' : p.screenshot_url)
                : undefined,
              notes: p.notes || undefined,
              rejection_reason: p.rejection_reason || undefined,
              submitted_at: p.submitted_at,
              verified_at: p.verified_at || null,
              verified_by: p.verified_by || null
            });
          });

          const subsByTeam = new Map<string, SubmissionRecord[]>();
          subData.forEach(s => {
            const list = subsByTeam.get(s.team_id) || [];
            list.push({
              id: s.id,
              team_id: s.team_id,
              round_number: s.round_number as (1 | 2),
              file_url: s.file_url,
              original_filename: s.original_filename,
              file_size: Number(s.file_size),
              file_type: s.file_type,
              version: s.version,
              submission_status: s.submission_status,
              submitted_at: s.submitted_at,
              review_notes: s.review_notes || undefined,
              project_url: s.project_url || undefined,
              repo_url: s.repo_url || undefined,
              demo_url: s.demo_url || undefined
            });
            subsByTeam.set(s.team_id, list);
          });

          const resubByTeam = new Map<string, ResubmissionRequest[]>();
          resubData.forEach(r => {
            const list = resubByTeam.get(r.team_id) || [];
            list.push({
              id: r.id,
              team_id: r.team_id,
              round_number: r.round_number ?? 1,
              reason: r.reason,
              status: r.status,
              review_notes: r.review_notes || null,
              reviewed_by: r.reviewed_by || null,
              reviewed_at: r.reviewed_at || null,
              consumed_at: r.consumed_at || null,
              consumed_submission_id: r.consumed_submission_id || null,
              created_at: r.created_at
            });
            resubByTeam.set(r.team_id, list);
          });

          const flagsByTeam = new Map<string, SuspicionFlag[]>();
          flagData.forEach(f => {
            const list = flagsByTeam.get(f.team_id) || [];
            list.push({
              id: f.id,
              team_id: f.team_id,
              flag_type: f.flag_type,
              description: f.description,
              severity: f.severity,
              matched_value: f.matched_value,
              matched_team_id: f.matched_team_id || undefined,
              created_at: f.created_at
            });
            flagsByTeam.set(f.team_id, list);
          });

          teams = teamsData.map(t => ({
            id: t.id,
            registration_id: t.registration_id,
            team_name: t.team_name,
            username: t.username || toUsername(t.team_name),
            leader_name: t.leader_name,
            leader_phone: t.leader_phone,
            leader_email: t.leader_email,
            institution: t.institution,
            department: t.department || undefined,
            year: t.year || undefined,
            problem_statement: t.problem_statement,
            access_token: t.access_token,
            payment_status: t.payment_status,
            payment: paymentsByTeam.get(t.id) || null,
            amount: t.amount || 100,
            registration_status: t.registration_status || 'REGISTERED',
            round_1_status: t.round_1_status || 'NOT_STARTED',
            round_2_status: t.round_2_status || 'LOCKED',
            round_1_score: t.round_1_score !== null ? Number(t.round_1_score) : null,
            evaluation_scores: t.evaluation_scores || null,
            admin_notes: t.admin_notes || null,
            members: deduplicateTeamMembers(membersByTeam.get(t.id) || [], t),
            submissions: subsByTeam.get(t.id) || [],
            resubmission_requests: resubByTeam.get(t.id) || [],
            suspicion_flags: flagsByTeam.get(t.id) || [],
            created_at: t.created_at,
            updated_at: t.updated_at
          }));

          auditLogs = (logRes.data || []).map(l => ({
            id: l.id,
            team_id: l.team_id,
            team_name: l.team_name,
            action: l.action,
            actor: l.actor,
            details: l.details,
            created_at: l.created_at
          }));
        }
      } catch (err) {
        // Surface the failure. Falling through to the (empty on serverless)
        // local store made a transient DB error look like ZERO registered
        // teams in the console — and an empty CSV export.
        console.error('Supabase getAdminOverview error:', err);
        throw err instanceof Error ? err : new Error('Could not load the admin overview');
      }
    }

    if (teams.length === 0) {
      const store = loadLocalStore();
      teams = store.teams.map(t => ({
        ...t,
        members: deduplicateTeamMembers(t.members, t),
        payment: store.payments.find(p => p.team_id === t.id || p.team_id === t.registration_id) || null,
        submissions: store.submissions.filter(s => s.team_id === t.id || s.team_id === t.registration_id) || [],
        resubmission_requests: (store.resubmissionRequests || []).filter(r => r.team_id === t.id || r.team_id === t.registration_id),
        suspicion_flags: store.suspicionFlags.filter(f => f.team_id === t.id || f.team_id === t.registration_id) || []
      }));
      auditLogs = store.auditLogs.slice(0, 50);
    }

    // Analytics Calculation
    const totalRegistrations = teams.length;
    const paymentVerified = teams.filter(t => t.payment_status === 'VERIFIED').length;
    const paymentPending = teams.filter(t => t.payment_status === 'PENDING').length;
    const paymentRejected = teams.filter(t => t.payment_status === 'REJECTED').length;
    const paymentResubmission = teams.filter(t => t.payment_status === 'RESUBMISSION_REQUIRED').length;

    const round1Submissions = teams.filter(t => ['SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'NOT_SELECTED'].includes(t.round_1_status)).length;
    const round1PendingReview = teams.filter(t => ['SUBMITTED', 'UNDER_REVIEW'].includes(t.round_1_status)).length;
    const round1Selected = teams.filter(t => t.round_1_status === 'SELECTED').length;
    const round1NotSelected = teams.filter(t => t.round_1_status === 'NOT_SELECTED').length;
    const reuploadRequestsPending = teams.filter(t =>
      (t.resubmission_requests || []).some(r => r.status === 'PENDING')
    ).length;

    const countByTrack: Record<string, number> = {
      'ORION-PS-01': 0,
      'ORION-PS-02': 0,
      'ORION-PS-03': 0,
      'ORION-PS-04': 0,
      'OTHER': 0
    };

    teams.forEach(t => {
      const ps = t.problem_statement || '';
      if (ps.includes('PS-01') || ps.includes('floatchat')) countByTrack['ORION-PS-01']++;
      else if (ps.includes('PS-02') || ps.includes('lexvault')) countByTrack['ORION-PS-02']++;
      else if (ps.includes('PS-03') || ps.includes('sylvasense')) countByTrack['ORION-PS-03']++;
      else if (ps.includes('PS-04') || ps.includes('open')) countByTrack['ORION-PS-04']++;
      else countByTrack['OTHER']++;
    });

    // Apply Filters
    let filteredTeams = [...teams];

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      filteredTeams = filteredTeams.filter(t => 
        t.registration_id.toLowerCase().includes(q) ||
        t.team_name.toLowerCase().includes(q) ||
        t.leader_name.toLowerCase().includes(q) ||
        t.leader_email.toLowerCase().includes(q) ||
        t.leader_phone.includes(q) ||
        (t.payment?.utr_number && t.payment.utr_number.toLowerCase().includes(q)) ||
        t.institution.toLowerCase().includes(q)
      );
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      filteredTeams = filteredTeams.filter(t => t.payment_status === filters.paymentStatus);
    }

    if (filters?.round1Status && filters.round1Status !== 'ALL') {
      filteredTeams = filteredTeams.filter(t => t.round_1_status === filters.round1Status);
    }

    if (filters?.track && filters.track !== 'ALL') {
      filteredTeams = filteredTeams.filter(t => t.problem_statement.includes(filters.track!));
    }

    if (filters?.onlySuspicious) {
      filteredTeams = filteredTeams.filter(t => (t.suspicion_flags?.length || 0) > 0);
    }

    return {
      stats: {
        totalRegistrations,
        paymentVerified,
        paymentPending,
        paymentRejected,
        paymentResubmission,
        round1Submissions,
        round1PendingReview,
        round1Selected,
        round1NotSelected,
        reuploadRequestsPending,
        totalRevenue: paymentVerified * 100,
        countByTrack
      },
      teams: filteredTeams,
      auditLogs
    };
  },

  // Delete Team Entry (Admin Action)
  async deleteTeam(teamId: string, actor = 'Admin Secretariat'): Promise<{ success: boolean; deletedRegistrationId: string }> {
    const team = await this.getTeam(teamId);
    if (!team) {
      throw new Error('Team not found or already deleted');
    }

    const regId = team.registration_id;
    const teamUuid = team.id;
    const teamName = team.team_name;
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        // 1. Unlink any audit logs pointing to this team to prevent FK violations
        await supabase.from('audit_logs').update({ team_id: null }).eq('team_id', teamUuid);

        // 2. Delete related child records
        await supabase.from('resubmission_requests').delete().eq('team_id', teamUuid);

        await Promise.allSettled([
          supabase.from('suspicion_flags').delete().eq('team_id', teamUuid),
          supabase.from('team_members').delete().eq('team_id', teamUuid),
          supabase.from('submissions').delete().eq('team_id', teamUuid),
          supabase.from('payments').delete().eq('team_id', teamUuid)
        ]);

        // 3. Delete main team record. .select('id') so a zero-row delete —
        //    an RLS-silenced write or an already-gone row — is visible instead
        //    of reporting success while the roster still shows the team.
        const { data: delRows, error: delErr } = await supabase
          .from('teams')
          .delete()
          .eq('id', teamUuid)
          .select('id');
        if (delErr) {
          console.error('Supabase delete team error:', delErr);
          throw new Error(delErr.message);
        }
        if (!delRows || delRows.length === 0) {
          throw new Error(
            `The database deleted zero rows for ${regId}. If this repeats, check that SUPABASE_SERVICE_ROLE_KEY is set on the deployment (the anon key cannot delete under RLS).`
          );
        }

        // 4. Insert audit log with team_id: null (no FK dependency)
        await supabase.from('audit_logs').insert([{
          team_id: null,
          team_name: teamName,
          action: 'Team Deleted',
          actor,
          details: `Squad entry for ${teamName} (${regId}) permanently removed by ${actor}.`,
          created_at: now
        }]);

        // Also clean up local store if synchronized
        const store = loadLocalStore();
        store.teams = (store.teams || []).filter(t => t.id !== teamUuid && t.registration_id !== regId);
        store.payments = (store.payments || []).filter(p => p.team_id !== teamUuid);
        store.submissions = (store.submissions || []).filter(s => s.team_id !== teamUuid);
        store.resubmissionRequests = (store.resubmissionRequests || []).filter(r => r.team_id !== teamUuid);
        store.suspicionFlags = (store.suspicionFlags || []).filter(f => f.team_id !== teamUuid);
    store.passwordResets = (store.passwordResets || []).filter(r => r.team_id !== teamUuid);
        saveLocalStore(store);

        return { success: true, deletedRegistrationId: regId };
      } catch (err) {
        console.error('Supabase deleteTeam failure:', err);
        throw err;
      }
    }

    // Local Store Fallback
    const store = loadLocalStore();
    store.teams = (store.teams || []).filter(t => t.id !== teamUuid && t.registration_id !== regId);
    store.payments = (store.payments || []).filter(p => p.team_id !== teamUuid);
    store.submissions = (store.submissions || []).filter(s => s.team_id !== teamUuid);
    store.resubmissionRequests = (store.resubmissionRequests || []).filter(r => r.team_id !== teamUuid);
    store.suspicionFlags = (store.suspicionFlags || []).filter(f => f.team_id !== teamUuid);
    store.passwordResets = (store.passwordResets || []).filter(r => r.team_id !== teamUuid);

    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      team_id: teamUuid,
      team_name: teamName,
      action: 'Team Deleted',
      actor,
      details: `Squad entry for ${teamName} (${regId}) permanently removed by ${actor}.`,
      created_at: now
    });

    saveLocalStore(store);
    return { success: true, deletedRegistrationId: regId };
  },

  // Automated 5-Minute Unpaid Squad Reminder Scanner
  /**
   * Scheduled sweep that reminds unpaid teams to pay.
   *
   * Two things this has to get right, and previously did not:
   *
   * 1. "Already reminded" is recorded as an APPEND-ONLY audit row, not by
   *    editing the team's `admin_notes`. The old approach read the notes from a
   *    snapshot taken at the top of the sweep, concatenated a marker, and wrote
   *    the whole string back through addAdminNote — which REPLACES the field.
   *    Any note an organiser wrote while the sweep was running was silently
   *    overwritten, and every run dumped the entire accumulated note into the
   *    audit log as a "note updated" entry.
   *
   * 2. A reminder only counts as sent when it was actually sent. The mailer
   *    returns success with `simulated: true` when SMTP is not configured, so
   *    marking on `success` alone meant that a deployment missing SMTP
   *    credentials would mark every unpaid team as reminded on its first cron
   *    run — permanently suppressing the real reminder once SMTP was fixed.
   *    Teams would simply never be told to pay.
   */
  async checkAndSendUnpaidReminders(): Promise<{
    checked: number;
    sent: number;
    skippedAlreadyReminded: number;
    skippedNotConfigured: number;
    notifiedTeams: string[];
  }> {
    const REMINDER_ACTION = 'Payment Reminder Sent';
    const LEGACY_MARKER = '[AUTO_PAYMENT_REMINDER_SENT]';

    const overview = await this.getAdminOverview();
    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const notifiedTeams: string[] = [];

    // One query for the whole sweep. getAdminOverview only carries the newest
    // 50 audit rows, which is nowhere near enough to answer "was this team
    // reminded" once the event has any history.
    const remindedTeamIds = new Set<string>();
    if (isSupabaseConfigured() && supabase) {
      try {
        // Paged: an unpaginated select caps at 1000 rows, and a truncated
        // reminder history means re-mailing teams that were already reminded.
        const data = await fetchAllRows('audit_logs', undefined, 'team_id', { column: 'action', value: REMINDER_ACTION });
        for (const row of data) {
          if (row.team_id) remindedTeamIds.add(row.team_id);
        }
      } catch (err) {
        // Fail SAFE: if the history cannot be read we cannot tell who has
        // already been mailed, and re-mailing everyone is worse than skipping
        // a cycle.
        console.error('[Reminders] Could not read reminder history, skipping this sweep:', err);
        return {
          checked: 0,
          sent: 0,
          skippedAlreadyReminded: 0,
          skippedNotConfigured: 0,
          notifiedTeams: []
        };
      }
    } else {
      const store = loadLocalStore();
      for (const log of store.auditLogs) {
        if (log.action === REMINDER_ACTION && log.team_id) remindedTeamIds.add(log.team_id);
      }
    }

    let skippedAlreadyReminded = 0;
    let skippedNotConfigured = 0;

    const unpaidTeams = (overview.teams || []).filter(team => {
      if (team.payment_status !== 'NOT_SUBMITTED') return false;

      const createdTime = new Date(team.created_at).getTime();
      if (!Number.isFinite(createdTime) || (now - createdTime) < FIVE_MINUTES_MS) return false;

      // The legacy marker is still honoured so teams reminded under the old
      // scheme are not mailed a second time on the first run after this change.
      const alreadyReminded =
        remindedTeamIds.has(team.id) || (team.admin_notes || '').includes(LEGACY_MARKER);

      if (alreadyReminded) {
        skippedAlreadyReminded++;
        return false;
      }
      return true;
    });

    for (const team of unpaidTeams) {
      try {
        const mailRes = await sendPaymentReminderEmail(team);

        if (mailRes.simulated) {
          // Nothing was delivered. Record nothing, so the reminder is still
          // owed once SMTP is configured.
          skippedNotConfigured++;
          continue;
        }

        if (!mailRes.success) {
          console.error(`[Reminders] Delivery failed for ${team.registration_id}: ${mailRes.error}`);
          continue;
        }

        notifiedTeams.push(team.registration_id);
        await this.recordReminderSent(team, REMINDER_ACTION);
      } catch (err) {
        console.error(`Failed to send payment reminder to ${team.registration_id}:`, err);
      }
    }

    if (skippedNotConfigured > 0) {
      console.error(
        `[Reminders] ${skippedNotConfigured} reminder(s) were NOT sent because SMTP is not configured. ` +
        'They remain owed and will be retried on the next sweep.'
      );
    }

    return {
      checked: overview.teams.length,
      sent: notifiedTeams.length,
      skippedAlreadyReminded,
      skippedNotConfigured,
      notifiedTeams
    };
  },

  /**
   * Append-only record that a reminder actually reached a team.
   *
   * Deliberately its own audit row rather than an edit to `admin_notes`: an
   * insert cannot lose a concurrent organiser edit, and it keeps automation
   * state out of a field humans write in.
   */
  async recordReminderSent(team: TeamRecord, action: string): Promise<void> {
    const now = new Date().toISOString();
    const details = 'Automated unpaid-payment reminder delivered to the registered leader email.';

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('audit_logs').insert([{
          team_id: team.id,
          team_name: team.team_name,
          action,
          actor: 'Automation System',
          details,
          created_at: now
        }]);
        return;
      } catch (err) {
        console.error('[Reminders] Could not record reminder audit row:', err);
        return;
      }
    }

    const store = loadLocalStore();
    store.auditLogs.push({
      id: 'log-' + Date.now() + '-reminder',
      team_id: team.id,
      team_name: team.team_name,
      action,
      actor: 'Automation System',
      details,
      created_at: now
    });
    saveLocalStore(store);
  }
};
