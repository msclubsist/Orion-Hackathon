import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables missing');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Loading source data...');
  const csvText = fs.readFileSync('team_credentials_with_id.csv', 'utf8').trim();
  const csvLines = csvText.split('\n').filter(l => l.trim().length > 0);
  const header = csvLines[0];
  const rows = csvLines.slice(1);

  const store = JSON.parse(fs.readFileSync('.data/orion_store.json', 'utf8'));
  const storeMap = new Map();
  store.teams.forEach(t => storeMap.set(t.registration_id, t));

  const sourceCount = rows.length;
  console.log(`Source rows in CSV: ${sourceCount}`);

  let successCount = 0;
  let partialCount = 0;
  let failedCount = 0;

  const unifiedTeams = [];
  const teamMemberRows = [];
  const paymentRows = [];

  for (let i = 0; i < rows.length; i++) {
    const line = rows[i];
    const parts = line.split(',');
    if (parts.length < 4) {
      console.warn(`Line ${i + 2} malformed:`, line);
      failedCount++;
      continue;
    }

    const team_id = parts[0].trim();
    const username = parts[1].trim();
    const team_leader = parts[2].trim();
    const password = parts[3].trim();

    const existing = storeMap.get(team_id);
    if (existing) {
      // Existing team in store with full data
      const mergedTeam = {
        id: existing.id,
        registration_id: team_id,
        team_name: existing.team_name,
        username: username,
        leader_name: team_leader || existing.leader_name,
        leader_phone: existing.leader_phone || null,
        leader_email: existing.leader_email || null,
        institution: existing.institution || null,
        department: existing.department || null,
        year: existing.year || null,
        problem_statement: existing.problem_statement || null,
        access_token: password || existing.access_token,
        payment_status: existing.payment_status || 'NOT_SUBMITTED',
        amount: existing.amount || 100,
        registration_status: existing.registration_status || 'REGISTERED',
        round_1_status: existing.round_1_status || 'NOT_STARTED',
        round_2_status: existing.round_2_status || 'LOCKED',
        round_1_score: existing.round_1_score || null,
        evaluation_scores: existing.evaluation_scores || null,
        admin_notes: existing.admin_notes || null,
        members: existing.members || [],
        payment: existing.payment || null,
        submissions: existing.submissions || [],
        resubmission_requests: existing.resubmission_requests || [],
        suspicion_flags: existing.suspicion_flags || [],
        audit_logs: existing.audit_logs || [],
        created_at: existing.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      unifiedTeams.push(mergedTeam);
      successCount++;

      // Collect members
      if (Array.isArray(existing.members)) {
        existing.members.forEach(m => {
          teamMemberRows.push({
            team_id: existing.id,
            member_number: m.member_number,
            member_name: m.member_name,
            team_name: existing.team_name,
            member_email: m.member_email || null,
            member_phone: m.member_phone || null,
            department: m.department || null,
            year: m.year || null
          });
        });
      }

      // Collect payment
      if (existing.payment && existing.payment.utr_number) {
        paymentRows.push({
          team_id: existing.id,
          utr_number: existing.payment.utr_number,
          payer_name: existing.payment.payer_name || existing.leader_name,
          payer_upi: existing.payment.payer_upi || null,
          amount: existing.payment.amount || 100,
          payment_status: existing.payment.payment_status || 'VERIFIED',
          screenshot_url: existing.payment.screenshot_url || null,
          notes: existing.payment.notes || null,
          submitted_at: existing.payment.submitted_at || new Date().toISOString(),
          verified_at: existing.payment.verified_at || null,
          verified_by: existing.payment.verified_by || 'Admin Secretariat'
        });
      }
    } else {
      // New team from credentials CSV
      const derivedTeamName = username
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      const newTeam = {
        registration_id: team_id,
        team_name: derivedTeamName,
        username: username,
        leader_name: team_leader,
        leader_phone: null,
        leader_email: null,
        institution: null,
        department: null,
        year: null,
        problem_statement: null,
        access_token: password,
        payment_status: 'NOT_SUBMITTED',
        amount: 100,
        registration_status: 'REGISTERED',
        round_1_status: 'NOT_STARTED',
        round_2_status: 'LOCKED',
        round_1_score: null,
        evaluation_scores: null,
        admin_notes: null,
        members: [],
        payment: null,
        submissions: [],
        resubmission_requests: [],
        suspicion_flags: [],
        audit_logs: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      unifiedTeams.push(newTeam);
      partialCount++;
    }
  }

  const processedCount = unifiedTeams.length + failedCount;
  const unaccountedCount = sourceCount - processedCount;

  console.log('\n--- EXTRACTION ACCOUNTING REPORT ---');
  console.log(`Source records:     ${sourceCount}`);
  console.log(`Processed records:  ${processedCount}`);
  console.log(`Success (full):     ${successCount}`);
  console.log(`Partial (cred):     ${partialCount}`);
  console.log(`Failed:             ${failedCount}`);
  console.log(`Unaccounted:        ${unaccountedCount}`);
  if (unaccountedCount !== 0) throw new Error('Unaccounted count must be zero!');

  // Push to Supabase public.teams in batches
  console.log('\nPushing 907 teams to Supabase public.teams...');
  const BATCH_SIZE = 100;
  for (let b = 0; b < unifiedTeams.length; b += BATCH_SIZE) {
    const chunk = unifiedTeams.slice(b, b + BATCH_SIZE).map(t => ({
      registration_id: t.registration_id,
      team_name: t.team_name,
      username: t.username,
      leader_name: t.leader_name,
      leader_phone: t.leader_phone,
      leader_email: t.leader_email,
      institution: t.institution,
      department: t.department,
      year: t.year,
      problem_statement: t.problem_statement,
      access_token: t.access_token,
      payment_status: t.payment_status,
      amount: t.amount,
      registration_status: t.registration_status,
      round_1_status: t.round_1_status,
      round_2_status: t.round_2_status,
      round_1_score: t.round_1_score,
      evaluation_scores: t.evaluation_scores,
      admin_notes: t.admin_notes
    }));

    const { data, error } = await supabase
      .from('teams')
      .upsert(chunk, { onConflict: 'registration_id' })
      .select('id, registration_id');

    if (error) {
      console.error(`Batch ${b / BATCH_SIZE + 1} error:`, error);
      throw error;
    } else {
      console.log(`Batch ${Math.floor(b / BATCH_SIZE) + 1} (${chunk.length} teams) inserted successfully.`);
      // Update team IDs
      data.forEach(d => {
        const t = unifiedTeams.find(ut => ut.registration_id === d.registration_id);
        if (t) t.id = d.id;
      });
    }
  }

  // Update .data/orion_store.json with all 907 teams
  console.log('\nUpdating .data/orion_store.json...');
  store.teams = unifiedTeams;
  fs.writeFileSync('.data/orion_store.json', JSON.stringify(store, null, 2), 'utf8');
  console.log(`Updated .data/orion_store.json with ${unifiedTeams.length} teams.`);

  // Verify in Supabase
  const { count, error: countErr } = await supabase
    .from('teams')
    .select('id', { count: 'exact', head: true });

  console.log(`\nVerification: Supabase public.teams total count: ${count}`);
}

main().catch(console.error);
