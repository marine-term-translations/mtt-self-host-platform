import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing multi-page OnboardingContext setup and singular /term/ navigation...");

  const contextPath = path.join(__dirname, '../context/OnboardingContext.tsx');
  assert.ok(fs.existsSync(contextPath), "OnboardingContext.tsx file must exist");

  const content = fs.readFileSync(contextPath, 'utf8');

  assert.ok(content.includes('OnboardingStep'), "Must define OnboardingStep interface");
  assert.ok(content.includes('route?: string'), "OnboardingStep must support route navigation");
  assert.ok(content.includes('startTour'), "Must support startTour method");
  assert.ok(content.includes('settings-languages'), "Must define settings-languages tour step target");
  assert.ok(content.includes('settings-api-key'), "Must define settings-api-key tour step target");
  assert.ok(content.includes('search-input'), "Must define search tour step target");
  assert.ok(content.includes('add-translation-btn'), "Must define term detail translation tour step target");
  assert.ok(content.includes('flow-actions'), "Must define translation flow tour step target");

  // Verify route /term/ (singular term, matching App.tsx route)
  assert.ok(content.includes('/term/'), "OnboardingContext must navigate to /term/:id singular route for TermDetail");

  console.log("✓ Multi-page OnboardingContext test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
