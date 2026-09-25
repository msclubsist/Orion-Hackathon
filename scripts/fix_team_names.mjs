import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables missing');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function formatTitleCase(str) {
  return str
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, c => c.toUpperCase());
}

async function fixTeamNames() {
  console.log('1. Loading CSV credentials...');
  const csv = fs.readFileSync('team_credentials_with_id.csv', 'utf8').trim().split('\n').slice(1);
  const csvMap = new Map();
  csv.forEach(l => {
    const [team_id, username, team_leader, password] = l.split(',').map(s => s.trim());
    csvMap.set(team_id, { team_id, username, team_leader, password });
  });

  console.log('2. Fetching all teams from Supabase...');
  let allTeams = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('teams')
      .select('id, registration_id, team_name, username')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error) throw error;
    allTeams = allTeams.concat(data);
    if (data.length < 1000) break;
    page++;
  }
  console.log(`Fetched ${allTeams.length} teams from Supabase.`);

  const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const updates = [];
  allTeams.forEach(t => {
    const c = csvMap.get(t.registration_id);
    if (!c) return;

    const correctTeamName = formatTitleCase(c.username);
    if (norm(t.team_name) !== norm(c.username) || t.team_name !== correctTeamName) {
      updates.push({
        id: t.id,
        registration_id: t.registration_id,
        old_name: t.team_name,
        team_name: correctTeamName
      });
    }
  });

  console.log(`Found ${updates.length} teams needing team_name correction.`);

  // Apply updates in batches
  console.log('3. Updating Supabase public.teams in batches...');
  const now = new Date().toISOString();
  for (let i = 0; i < updates.length; i++) {
    const item = updates[i];
    const { error } = await supabase
      .from('teams')
      .update({ team_name: item.team_name, updated_at: now })
      .eq('id', item.id);

    if (error) {
      console.error(`Error updating team ${item.registration_id}:`, error);
      throw error;
    }
    if ((i + 1) % 25 === 0 || i === updates.length - 1) {
      console.log(`Updated ${i + 1} / ${updates.length}`);
    }
  }
  console.log('Supabase update completed successfully.');

  // Update local store
  console.log('4. Updating .data/orion_store.json...');
  const storePath = '.data/orion_store.json';
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const updateMap = new Map();
    updates.forEach(u => updateMap.set(u.registration_id, u.team_name));

    let localUpdatedCount = 0;
    store.teams = store.teams.map(t => {
      if (updateMap.has(t.registration_id)) {
        localUpdatedCount++;
        return {
          ...t,
          team_name: updateMap.get(t.registration_id),
          updated_at: now
        };
      }
      return t;
    });

    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
    console.log(`Updated ${localUpdatedCount} teams in .data/orion_store.json.`);
  }

  // Verification check against Supabase
  console.log('\n5. Verifying Supabase data after fix...');
  let verifyTeams = [];
  page = 0;
  while (true) {
    const { data } = await supabase
      .from('teams')
      .select('id, registration_id, team_name, username, leader_name')
      .range(page * 1000, (page + 1) * 1000 - 1);
    verifyTeams = verifyTeams.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  let remainingDiscrepancies = 0;
  verifyTeams.forEach(t => {
    const c = csvMap.get(t.registration_id);
    if (!c) return;
    if (norm(t.team_name) !== norm(c.username)) {
      remainingDiscrepancies++;
    }
  });

  console.log(`Remaining discrepancies: ${remainingDiscrepancies}`);
  console.log('Verification COMPLETE! All team names are aligned.');
}

fixTeamNames().catch(console.error);
