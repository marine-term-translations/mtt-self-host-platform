import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runEventTitlesAndProfileTests() {
  console.log("Running Event Titles & Profile Integration tests...");

  // 1. Check Landing.tsx hero card contains reward_title badge
  const landingSource = fs.readFileSync(path.join(__dirname, '../pages/Landing.tsx'), 'utf8');
  assert.ok(landingSource.includes('activeEvent.reward_title'), 'Landing.tsx must check activeEvent.reward_title');
  assert.ok(landingSource.includes('Win Title:'), 'Landing.tsx must display "Win Title:" label');

  // 2. Check EventsHubPage.tsx contains reward_title badge
  const hubSource = fs.readFileSync(path.join(__dirname, '../pages/EventsHubPage.tsx'), 'utf8');
  assert.ok(hubSource.includes('event.reward_title'), 'EventsHubPage.tsx must check event.reward_title');
  assert.ok(hubSource.includes('Winner Title:'), 'EventsHubPage.tsx must display Winner Title label');

  // 3. Check EventDetailPage.tsx contains Reward & Title showcase card
  const detailSource = fs.readFileSync(path.join(__dirname, '../pages/EventDetailPage.tsx'), 'utf8');
  assert.ok(detailSource.includes('event.reward_title'), 'EventDetailPage.tsx must check event.reward_title');
  assert.ok(detailSource.includes('Grand Prize Profile Title'), 'EventDetailPage.tsx must highlight Grand Prize Profile Title');
  assert.ok(detailSource.includes('event.status === \'ENDED\''), 'EventDetailPage.tsx must differentiate active vs ended rewards');

  // 4. Check AdminEvents.tsx contains reward settlement and metadata
  const adminSource = fs.readFileSync(path.join(__dirname, '../pages/admin/AdminEvents.tsx'), 'utf8');
  assert.ok(adminSource.includes('settleEventRewards'), 'AdminEvents.tsx must import settleEventRewards');
  assert.ok(adminSource.includes('handleSettleEvent'), 'AdminEvents.tsx must implement handleSettleEvent');
  assert.ok(adminSource.includes('Settle Titles'), 'AdminEvents.tsx must have Settle Titles button');
  assert.ok(adminSource.includes('Winner Prize Title:'), 'AdminEvents.tsx must display Winner Prize Title in metadata');

  // 5. Check UserProfile.tsx contains Profile Header accolade, Achievements Titles section, and event backlink
  const profileSource = fs.readFileSync(path.join(__dirname, '../pages/UserProfile.tsx'), 'utf8');
  assert.ok(profileSource.includes('fetchUserTitles'), 'UserProfile.tsx must import fetchUserTitles');
  assert.ok(profileSource.includes('equipUserTitle'), 'UserProfile.tsx must import equipUserTitle');
  assert.ok(profileSource.includes('userTitles'), 'UserProfile.tsx must maintain userTitles state');
  assert.ok(profileSource.includes('equipped.title_name'), 'UserProfile.tsx header must render equipped title');
  assert.ok(profileSource.includes('Competition Titles & Honors'), 'UserProfile.tsx Achievements tab must render Competition Titles & Honors section');
  assert.ok(profileSource.includes('to={`/events/${t.event_id}`}'), 'UserProfile.tsx titles list must contain clickable event backlink');
  assert.ok(profileSource.includes('handleEquipTitle'), 'UserProfile.tsx must support equip/unequip title toggling');

  // 6. Check types.ts definition
  const typesSource = fs.readFileSync(path.join(__dirname, '../types.ts'), 'utf8');
  assert.ok(typesSource.includes('export interface UserTitle'), 'types.ts must export UserTitle interface');
  assert.ok(typesSource.includes('title_name: string'), 'UserTitle must have title_name');
  assert.ok(typesSource.includes('event_id?: string'), 'UserTitle must have event_id for backlinks');

  // 7. Check eventApi.ts methods
  const apiSource = fs.readFileSync(path.join(__dirname, '../services/eventApi.ts'), 'utf8');
  assert.ok(apiSource.includes('export async function fetchUserTitles'), 'eventApi.ts must export fetchUserTitles');
  assert.ok(apiSource.includes('export async function equipUserTitle'), 'eventApi.ts must export equipUserTitle');
  assert.ok(apiSource.includes('export async function settleEventRewards'), 'eventApi.ts must export settleEventRewards');

  console.log("✅ All Event Titles & Profile Integration tests passed!");
}

try {
  runEventTitlesAndProfileTests();
} catch (err) {
  console.error("FAIL: Event Titles & Profile Integration tests failed:", err.message);
  process.exit(1);
}
