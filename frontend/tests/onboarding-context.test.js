import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing OnboardingContext encoded term URI navigation and language-param flow route...");

  const contextPath = path.join(__dirname, '../context/OnboardingContext.tsx');
  assert.ok(fs.existsSync(contextPath), "OnboardingContext.tsx file must exist");

  const content = fs.readFileSync(contextPath, 'utf8');

  assert.ok(content.includes('OnboardingStep'), "Must define OnboardingStep interface");
  assert.ok(content.includes('startTour'), "Must support startTour method");

  // Verify encoded term URI route support (/term/ or encodeURIComponent)
  assert.ok(content.includes('/term/'), "Must use /term/ route for term detail step");
  assert.ok(content.includes('encodeURIComponent') || content.includes('http%3A%2F%2F'), "Must handle URI encoding for term detail navigation");

  // Verify flow route with ?language= query parameter
  assert.ok(content.includes('/flow?language=') || content.includes('language='), "Flow route must include ?language= query parameter based on user preferences");

  // Verify Step 2 urges language selection
  assert.ok(content.includes('settings-languages'), "Must define settings-languages step");

  console.log("✓ OnboardingContext encoded term & language-param flow test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
