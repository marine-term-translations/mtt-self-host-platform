import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Running strict EMODnet navbar & footer sticky tests (TDD)...");

  const layoutPath = path.join(__dirname, '../components/Layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');

  // Test 1: Navbar EMODnet logo must ONLY be rendered when isAuthenticated is true
  const navbarSection = layoutContent.substring(layoutContent.indexOf('<header'), layoutContent.indexOf('</header>'));
  assert.ok(
    navbarSection.includes('{isAuthenticated &&') && navbarSection.includes('emodnet-logo.png'),
    "Navbar must wrap EMODnet logo button inside `{isAuthenticated && (...)}`"
  );

  // Test 2: Footer must be sticky ONLY when user is NOT logged in (!isAuthenticated)
  const footerSection = layoutContent.substring(layoutContent.indexOf('<footer'), layoutContent.indexOf('</footer>'));
  assert.ok(
    footerSection.includes("!isAuthenticated ? 'sticky bottom-0 z-40 backdrop-blur-md shadow-lg' : 'relative z-10'"),
    "Footer className must make footer sticky when !isAuthenticated and relative when logged in"
  );

  console.log("Strict EMODnet navbar & footer sticky tests passed successfully!");
}

try {
  run();
} catch (err) {
  console.error("Test failure (Expected in RED phase):", err.message);
  process.exit(1);
}
