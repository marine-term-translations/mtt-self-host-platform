import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing OnboardingContext Step 6 -> Step 7 auto-navigation to /settings...");

  const contextPath = path.join(__dirname, '../context/OnboardingContext.tsx');
  assert.ok(fs.existsSync(contextPath), "OnboardingContext.tsx file must exist");

  const content = fs.readFileSync(contextPath, 'utf8');

  // Verify that Step 7 has route '/settings'
  const step7Definition = content.includes("id: 'settings-help'") && content.includes("route: '/settings'");
  assert.ok(step7Definition, "Step 7 (settings-help) must have route '/settings'");

  // Extract the useEffect navigation block for currentStep.route
  const routeNavMatch = content.match(/else if \s*\(currentStep\.route && location\.pathname !== currentStep\.route([^\)]*)\)/);
  assert.ok(routeNavMatch, "Must have an else if block for currentStep.route navigation");

  const extraConditions = routeNavMatch[1];
  assert.strictEqual(
    extraConditions.includes("!location.pathname.startsWith('/flow')"),
    false,
    "Step route navigation must not block transitions when currently on /flow"
  );
  assert.strictEqual(
    extraConditions.includes("!location.pathname.startsWith('/term/')"),
    false,
    "Step route navigation must not block transitions when currently on /term/"
  );

  console.log("✓ Step 6 -> Step 7 auto-navigation test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
