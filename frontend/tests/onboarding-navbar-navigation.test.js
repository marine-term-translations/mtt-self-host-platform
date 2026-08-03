import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing onboarding tutorial navbar navigation highlights (TDD)...");

  const layoutPath = path.join(__dirname, '../components/Layout.tsx');
  const browsePath = path.join(__dirname, '../pages/Browse.tsx');
  const contextPath = path.join(__dirname, '../context/OnboardingContext.tsx');

  assert.ok(fs.existsSync(layoutPath), "Layout.tsx must exist");
  assert.ok(fs.existsSync(browsePath), "Browse.tsx must exist");
  assert.ok(fs.existsSync(contextPath), "OnboardingContext.tsx must exist");

  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  const browseContent = fs.readFileSync(browsePath, 'utf8');
  const contextContent = fs.readFileSync(contextPath, 'utf8');

  // 1. Verify data-tour attributes on navbar elements in Layout.tsx
  assert.ok(
    layoutContent.includes('data-tour="nav-browse"'),
    "Layout.tsx navbar must contain data-tour='nav-browse' for the Browse link"
  );
  assert.ok(
    layoutContent.includes('data-tour="nav-flow"'),
    "Layout.tsx navbar must contain data-tour='nav-flow' for the Flow button"
  );
  assert.ok(
    layoutContent.includes('data-tour="nav-settings"'),
    "Layout.tsx navbar must contain data-tour='nav-settings' for the Settings/profile dropdown"
  );

  // 2. Verify data-tour attribute on term card in Browse.tsx
  assert.ok(
    browseContent.includes('data-tour="term-card"'),
    "Browse.tsx must contain data-tour='term-card' for term card navigation highlight"
  );

  // 3. Verify step definitions in OnboardingContext.tsx
  assert.ok(
    contextContent.includes('nav-browse') && contextContent.includes('[data-tour="nav-browse"]'),
    "OnboardingContext.tsx must include nav-browse step targeting [data-tour=\"nav-browse\"]"
  );
  assert.ok(
    contextContent.includes('nav-term-detail') || (contextContent.includes('term-card') && contextContent.includes('[data-tour="term-card"]')),
    "OnboardingContext.tsx must include term navigation step targeting [data-tour=\"term-card\"]"
  );
  assert.ok(
    contextContent.includes('nav-flow') && contextContent.includes('[data-tour="nav-flow"]'),
    "OnboardingContext.tsx must include nav-flow step targeting [data-tour=\"nav-flow\"]"
  );
  assert.ok(
    contextContent.includes('nav-settings') && contextContent.includes('[data-tour="nav-settings"]'),
    "OnboardingContext.tsx must include nav-settings step targeting [data-tour=\"nav-settings\"]"
  );

  console.log("✓ Onboarding tutorial navbar navigation test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
