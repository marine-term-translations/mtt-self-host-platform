import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Running LDES Feeds Homepage Link & BarChart TDD tests...");

  const landingPath = path.join(__dirname, '../pages/Landing.tsx');
  const landingContent = fs.readFileSync(landingPath, 'utf8');

  // Test 1: Landing page LDES feed box must be clickable and have pointer-events-auto/z-index link to /ldes
  assert.ok(
    landingContent.includes('to="/ldes"') && landingContent.includes('pointer-events-auto'),
    "Landing.tsx must link the LDES feed card to /ldes using `<Link to=\"/ldes\">` with pointer-events-auto so it is clickable."
  );
  assert.strictEqual(
    landingContent.includes('hidden md:grid grid-cols-2'),
    false,
    "Landing.tsx must NOT hide the LDES card on mobile layout using 'hidden md:grid'."
  );

  const ldesPath = path.join(__dirname, '../pages/LdesFeeds.tsx');
  const ldesContent = fs.readFileSync(ldesPath, 'utf8');

  // Test 2: LdesFeeds.tsx must define fragment metadata interface with memberCount and timestamp
  assert.ok(
    ldesContent.includes('memberCount') || ldesContent.includes('member_count'),
    "LdesFeeds.tsx Fragment interface must include memberCount for each LDES fragment."
  );

  // Test 3: LdesFeeds.tsx must render a Recharts BarChart for each LDES feed source with XAxis fragment numbers & YAxis member count
  assert.ok(
    ldesContent.includes('BarChart') && ldesContent.includes('XAxis') && ldesContent.includes('YAxis'),
    "LdesFeeds.tsx must render Recharts BarChart, XAxis, and YAxis for each LDES feed source."
  );

  // Test 4: All fragments must be present on the bar chart without truncation
  assert.ok(
    (ldesContent.includes('BarChart data={chartData}') || ldesContent.includes('chartData')) && !ldesContent.includes('sortedFragments.slice(0, 5)'),
    "LdesFeeds.tsx must include ALL fragments on the bar chart without slicing or truncating."
  );

  // Test 5: backend ldes.routes.js must count members in fragment TTL files
  const backendRoutePath = path.join(__dirname, '../../backend/src/routes/ldes.routes.js');
  const backendRouteContent = fs.readFileSync(backendRoutePath, 'utf8');
  assert.ok(
    backendRouteContent.includes('memberCount') || backendRouteContent.includes('member_count') || backendRouteContent.includes('tree:member'),
    "backend/src/routes/ldes.routes.js must calculate memberCount for each fragment in /api/ldes/feeds."
  );

  console.log("All LDES Feeds Homepage Link & BarChart TDD tests passed successfully!");
}

try {
  run();
} catch (err) {
  console.error("Test failure (Expected in RED phase):", err.message);
  process.exit(1);
}
