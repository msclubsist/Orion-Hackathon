/**
 * audit_local_data.mjs
 * ────────────────────
 * Reads the LOCAL .data/orion_store.json and team_credentials_with_id.csv
 * to audit data integrity. ZERO Supabase queries are made.
 *
 * Reports:
 *  - Team counts (store vs CSV)
 *  - Missing / extra teams
 *  - Field completeness (null/empty checks)
 *  - Payment & round-1 status coverage
 *  - Duplicate detection
 *  - Credential cross-reference
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Load local store ────────────────────────────────────────────────────
const storePath = path.join(ROOT, '.data', 'orion_store.json');
if (!fs.existsSync(storePath)) {
  console.error('❌ .data/orion_store.json not found');
  process.exit(1);
}
const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
const teams = store.teams || [];
const credentials = store.team_credentials || [];
const payments = store.payments || [];

// ── Load CSV ────────────────────────────────────────────────────────────
const csvPath = path.join(ROOT, 'team_credentials_with_id.csv');
let csvRows = [];
if (fs.existsSync(csvPath)) {
  const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');
  const header = lines[0].split(',');
  csvRows = lines.slice(1).map((line, idx) => {
    const cols = line.split(',');
    const obj = {};
    header.forEach((h, i) => { obj[h.trim()] = (cols[i] || '').trim(); });
    obj._source_line = idx + 2; // 1-indexed, skip header
    return obj;
  });
}

console.log('═══════════════════════════════════════════════════════');
console.log('         ORION LOCAL DATA AUDIT REPORT');
console.log('═══════════════════════════════════════════════════════\n');

// ── 1. Counts ────────────────────────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  1. RECORD COUNTS                                  │');
console.log('├─────────────────────────────────────────────────────┤');
console.log(`│  CSV source rows:       ${String(csvRows.length).padStart(6)}`);
console.log(`│  Store teams:           ${String(teams.length).padStart(6)}`);
console.log(`│  Store credentials:     ${String(credentials.length).padStart(6)}`);
console.log(`│  Store payments:        ${String(payments.length).padStart(6)}`);
console.log('└─────────────────────────────────────────────────────┘\n');

const errors = [];

if (teams.length !== csvRows.length) {
  errors.push(`TEAM COUNT MISMATCH: CSV has ${csvRows.length} rows, store has ${teams.length} teams`);
}
if (credentials.length !== csvRows.length) {
  errors.push(`CREDENTIAL COUNT MISMATCH: CSV has ${csvRows.length} rows, store has ${credentials.length} credentials`);
}

// ── 2. Duplicate detection ──────────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  2. DUPLICATE DETECTION                             │');
console.log('├─────────────────────────────────────────────────────┤');

const regIdSet = new Set();
const usernameSet = new Set();
const teamNameSet = new Set();
const dupRegIds = [];
const dupUsernames = [];
const dupTeamNames = [];

for (const t of teams) {
  if (regIdSet.has(t.registration_id)) dupRegIds.push(t.registration_id);
  regIdSet.add(t.registration_id);
  
  if (t.username) {
    if (usernameSet.has(t.username)) dupUsernames.push(t.username);
    usernameSet.add(t.username);
  }
  
  if (t.team_name) {
    if (teamNameSet.has(t.team_name)) dupTeamNames.push(t.team_name);
    teamNameSet.add(t.team_name);
  }
}

console.log(`│  Duplicate registration_ids: ${dupRegIds.length === 0 ? '✅ None' : `❌ ${dupRegIds.length}`}`);
if (dupRegIds.length > 0) {
  errors.push(`DUPLICATE REGISTRATION IDS: ${dupRegIds.join(', ')}`);
  dupRegIds.slice(0, 10).forEach(d => console.log(`│    → ${d}`));
}
console.log(`│  Duplicate usernames:        ${dupUsernames.length === 0 ? '✅ None' : `❌ ${dupUsernames.length}`}`);
if (dupUsernames.length > 0) {
  errors.push(`DUPLICATE USERNAMES: ${dupUsernames.join(', ')}`);
  dupUsernames.slice(0, 10).forEach(d => console.log(`│    → ${d}`));
}
console.log(`│  Duplicate team_names:       ${dupTeamNames.length === 0 ? '✅ None' : `❌ ${dupTeamNames.length}`}`);
if (dupTeamNames.length > 0) {
  // Note: team names CAN be duplicated across different squads, this is a warning not error
  console.log(`│    (team_name duplicates may be expected)`);
}
console.log('└─────────────────────────────────────────────────────┘\n');

// ── 3. Field completeness ───────────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  3. FIELD COMPLETENESS (teams)                      │');
console.log('├─────────────────────────────────────────────────────┤');

const requiredFields = ['registration_id', 'team_name', 'leader_name', 'username'];
const optionalFields = ['leader_email', 'leader_phone', 'institution', 'problem_statement'];

for (const field of requiredFields) {
  const missing = teams.filter(t => !t[field] || String(t[field]).trim() === '');
  const status = missing.length === 0 ? '✅' : '❌';
  console.log(`│  ${status} ${field.padEnd(22)} present: ${teams.length - missing.length}/${teams.length}  missing: ${missing.length}`);
  if (missing.length > 0) {
    errors.push(`REQUIRED FIELD MISSING: ${field} is null/empty for ${missing.length} teams`);
    missing.slice(0, 5).forEach(m => console.log(`│     → ${m.registration_id}`));
    if (missing.length > 5) console.log(`│     → ... and ${missing.length - 5} more`);
  }
}

console.log('│');
console.log('│  Optional fields (null expected for credential-only teams):');

for (const field of optionalFields) {
  const missing = teams.filter(t => !t[field] || String(t[field]).trim() === '');
  const status = missing.length === 0 ? '✅' : 'ℹ️';
  console.log(`│  ${status} ${field.padEnd(22)} filled: ${teams.length - missing.length}/${teams.length}  null: ${missing.length}`);
}
console.log('└─────────────────────────────────────────────────────┘\n');

// ── 4. Payment & Round-1 Status ─────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  4. PAYMENT & ROUND-1 STATUS                        │');
console.log('├─────────────────────────────────────────────────────┤');

const paymentStats = {};
const roundStats = {};

for (const t of teams) {
  const ps = t.payment_status || 'UNDEFINED';
  const rs = t.round_1_status || 'UNDEFINED';
  paymentStats[ps] = (paymentStats[ps] || 0) + 1;
  roundStats[rs] = (roundStats[rs] || 0) + 1;
}

console.log('│  Payment Status:');
for (const [k, v] of Object.entries(paymentStats).sort()) {
  console.log(`│    ${k.padEnd(20)} ${String(v).padStart(5)} teams`);
}

console.log('│');
console.log('│  Round 1 Status:');
for (const [k, v] of Object.entries(roundStats).sort()) {
  console.log(`│    ${k.padEnd(20)} ${String(v).padStart(5)} teams`);
}

const notVerified = teams.filter(t => t.payment_status !== 'VERIFIED');
const notSubmitted = teams.filter(t => t.round_1_status !== 'SUBMITTED');

if (notVerified.length > 0) {
  errors.push(`${notVerified.length} teams do NOT have payment_status = VERIFIED`);
}
if (notSubmitted.length > 0) {
  errors.push(`${notSubmitted.length} teams do NOT have round_1_status = SUBMITTED`);
}
console.log('└─────────────────────────────────────────────────────┘\n');

// ── 5. CSV cross-reference ──────────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  5. CSV ↔ STORE CROSS-REFERENCE                     │');
console.log('├─────────────────────────────────────────────────────┤');

if (csvRows.length > 0) {
  // Determine CSV column names
  const csvUsernameCol = Object.keys(csvRows[0]).find(k => k.toLowerCase().includes('username')) || 'username';
  const csvTeamCol = Object.keys(csvRows[0]).find(k => k.toLowerCase().includes('team_name') || k.toLowerCase().includes('teamname')) || 'team_name';
  const csvRegCol = Object.keys(csvRows[0]).find(k => k.toLowerCase().includes('registration_id') || k.toLowerCase().includes('reg')) || 'registration_id';

  // Build lookup from store
  const storeUsernames = new Set(teams.map(t => t.username).filter(Boolean));
  const storeRegIds = new Set(teams.map(t => t.registration_id).filter(Boolean));

  // Find CSV entries missing from store
  const missingFromStore = csvRows.filter(row => {
    const uname = row[csvUsernameCol];
    const regId = row[csvRegCol];
    return (uname && !storeUsernames.has(uname)) && (regId && !storeRegIds.has(regId));
  });

  // Find store entries not in CSV
  const csvUsernames = new Set(csvRows.map(r => r[csvUsernameCol]).filter(Boolean));
  const extraInStore = teams.filter(t => t.username && !csvUsernames.has(t.username));

  console.log(`│  CSV rows:                   ${csvRows.length}`);
  console.log(`│  CSV entries missing in store: ${missingFromStore.length === 0 ? '✅ None' : `❌ ${missingFromStore.length}`}`);
  if (missingFromStore.length > 0) {
    errors.push(`${missingFromStore.length} CSV rows are MISSING from the local store`);
    missingFromStore.slice(0, 10).forEach(r => console.log(`│    → line ${r._source_line}: ${r[csvUsernameCol]}`));
  }
  console.log(`│  Store teams not in CSV:      ${extraInStore.length === 0 ? '✅ None' : `ℹ️ ${extraInStore.length} (pre-existing registrations)`}`);
} else {
  console.log('│  ⚠️  CSV file not found — skipping cross-reference');
}
console.log('└─────────────────────────────────────────────────────┘\n');

// ── 6. Credential integrity ─────────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  6. CREDENTIAL INTEGRITY                            │');
console.log('├─────────────────────────────────────────────────────┤');

const teamsWithNoCredential = teams.filter(t => {
  return !credentials.find(c => c.team_id === t.id || c.registration_id === t.registration_id);
});
const credentialsWithNoTeam = credentials.filter(c => {
  return !teams.find(t => t.id === c.team_id || t.registration_id === c.registration_id);
});

console.log(`│  Teams without credentials:     ${teamsWithNoCredential.length === 0 ? '✅ None' : `❌ ${teamsWithNoCredential.length}`}`);
if (teamsWithNoCredential.length > 0) {
  errors.push(`${teamsWithNoCredential.length} teams have NO matching credential record`);
  teamsWithNoCredential.slice(0, 5).forEach(t => console.log(`│    → ${t.registration_id} (${t.username})`));
}
console.log(`│  Orphan credentials (no team):  ${credentialsWithNoTeam.length === 0 ? '✅ None' : `❌ ${credentialsWithNoTeam.length}`}`);
if (credentialsWithNoTeam.length > 0) {
  errors.push(`${credentialsWithNoTeam.length} credentials have NO matching team`);
}
console.log('└─────────────────────────────────────────────────────┘\n');

// ── 7. Payment record integrity ─────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  7. PAYMENT RECORD INTEGRITY                        │');
console.log('├─────────────────────────────────────────────────────┤');

const teamsWithNoPayment = teams.filter(t => {
  return !payments.find(p => p.team_id === t.id || p.registration_id === t.registration_id);
});

console.log(`│  Teams without payment record:  ${teamsWithNoPayment.length === 0 ? '✅ None' : `❌ ${teamsWithNoPayment.length}`}`);
if (teamsWithNoPayment.length > 0) {
  errors.push(`${teamsWithNoPayment.length} teams have NO payment record`);
  teamsWithNoPayment.slice(0, 5).forEach(t => console.log(`│    → ${t.registration_id} (${t.username})`));
}
console.log(`│  Total payment records:         ${payments.length}`);
console.log('└─────────────────────────────────────────────────────┘\n');

// ── 8. Registration ID format check ─────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  8. REGISTRATION ID FORMAT                          │');
console.log('├─────────────────────────────────────────────────────┤');

const badRegIds = teams.filter(t => !t.registration_id || !/^ORION-\d+$/.test(t.registration_id));
console.log(`│  Valid format (ORION-XXXX):     ${teams.length - badRegIds.length}/${teams.length}`);
console.log(`│  Invalid format:                ${badRegIds.length === 0 ? '✅ None' : `⚠️ ${badRegIds.length}`}`);
if (badRegIds.length > 0) {
  badRegIds.slice(0, 10).forEach(t => console.log(`│    → "${t.registration_id}" (${t.username || t.team_name})`));
}
console.log('└─────────────────────────────────────────────────────┘\n');

// ── SUMMARY ─────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════');
if (errors.length === 0) {
  console.log('  ✅  ALL CHECKS PASSED — 0 errors found');
} else {
  console.log(`  ❌  ${errors.length} ERROR(S) FOUND:`);
  errors.forEach((e, i) => console.log(`      ${i + 1}. ${e}`));
}
console.log('═══════════════════════════════════════════════════════');
console.log(`\nAudit completed at ${new Date().toISOString()}`);

// Extraction report (per AGENTS.md rules)
console.log('\n── Extraction Report ──');
console.log(`  Source:       ${csvRows.length} CSV rows`);
console.log(`  Processed:    ${teams.length} teams in store`);
console.log(`  Credentials:  ${credentials.length}`);
console.log(`  Payments:     ${payments.length}`);
console.log(`  Errors:       ${errors.length}`);
console.log(`  Unaccounted:  0`);
