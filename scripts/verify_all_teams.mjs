import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables missing');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('1. Updating all 907 teams in Supabase to payment_status = VERIFIED and round_1_status = SUBMITTED...');
  
  const now = new Date().toISOString();
  const { data: updatedTeams, error: updateErr } = await supabase
    .from('teams')
    .update({
      payment_status: 'VERIFIED',
      round_1_status: 'SUBMITTED',
      updated_at: now
    })
    .neq('registration_id', '') // matches all teams
    .select('id, registration_id, leader_name');

  if (updateErr) {
    console.error('Error updating teams:', updateErr);
    throw updateErr;
  }
  console.log(`Successfully updated ${updatedTeams?.length} teams in Supabase public.teams.`);

  // 2. Ensure each team has a verified payment entry in public.payments
  console.log('2. Ensuring verified payment records exist for all teams...');
  const { data: existingPayments, error: payFetchErr } = await supabase
    .from('payments')
    .select('team_id');
  if (payFetchErr) throw payFetchErr;

  const existingTeamIds = new Set(existingPayments.map(p => p.team_id));
  const newPayments = [];

  for (const team of updatedTeams) {
    if (!existingTeamIds.has(team.id)) {
      newPayments.push({
        team_id: team.id,
        utr_number: `VERIFIED-${team.registration_id}`,
        payer_name: team.leader_name,
        payer_upi: null,
        amount: 100,
        payment_status: 'VERIFIED',
        screenshot_url: null,
        notes: 'Pre-verified during roster sync',
        submitted_at: now,
        verified_at: now,
        verified_by: 'Admin Secretariat'
      });
    }
  }

  console.log(`Creating ${newPayments.length} new payment records in public.payments...`);
  for (let i = 0; i < newPayments.length; i += 100) {
    const chunk = newPayments.slice(i, i + 100);
    const { error: insErr } = await supabase.from('payments').insert(chunk);
    if (insErr) console.error('Payment batch insert error:', insErr);
  }
  console.log('Payments synchronization complete.');

  // 3. Update local store (.data/orion_store.json)
  console.log('3. Updating .data/orion_store.json...');
  const storePath = '.data/orion_store.json';
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    store.teams = store.teams.map(t => {
      const payment = t.payment || {
        id: t.id,
        team_id: t.id,
        utr_number: `VERIFIED-${t.registration_id}`,
        payer_name: t.leader_name,
        payer_upi: null,
        amount: 100,
        payment_status: 'VERIFIED',
        screenshot_url: null,
        notes: 'Pre-verified during roster sync',
        submitted_at: now,
        verified_at: now,
        verified_by: 'Admin Secretariat'
      };
      return {
        ...t,
        payment_status: 'VERIFIED',
        round_1_status: 'SUBMITTED',
        payment: { ...payment, payment_status: 'VERIFIED', verified_at: now, verified_by: 'Admin Secretariat' },
        updated_at: now
      };
    });

    // Also sync payments array in store
    const storePaymentMap = new Map();
    store.payments.forEach(p => storePaymentMap.set(p.team_id, p));
    store.teams.forEach(t => {
      if (!storePaymentMap.has(t.id)) {
        store.payments.push(t.payment);
      }
    });

    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
    console.log(`Updated .data/orion_store.json (${store.teams.length} teams).`);
  }

  // 4. Verify in Supabase
  console.log('\n4. Running Verification against Supabase...');
  const { count: totalTeams } = await supabase.from('teams').select('id', { count: 'exact', head: true });
  const { count: verifiedPay } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('payment_status', 'VERIFIED');
  const { count: submittedR1 } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('round_1_status', 'SUBMITTED');
  const { count: totalPayments } = await supabase.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'VERIFIED');

  console.log(`- Total Teams:             ${totalTeams}`);
  console.log(`- Payment Verified Teams:  ${verifiedPay}`);
  console.log(`- Round 1 Submitted Teams: ${submittedR1}`);
  console.log(`- Verified Payment Rows:   ${totalPayments}`);
}

main().catch(console.error);
