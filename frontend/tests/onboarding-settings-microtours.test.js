import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing Settings Help & Onboarding micro-tours section...");

  const settingsContent = fs.readFileSync(path.join(__dirname, '../pages/Settings.tsx'), 'utf8');

  assert.ok(settingsContent.includes('Help & Onboarding'), "Settings page must include Help & Onboarding section");
  assert.ok(settingsContent.includes('data-tour="settings-help"'), "Settings must contain data-tour='settings-help'");
  assert.ok(settingsContent.includes("startTour('full')") || settingsContent.includes("startTour('main')"), "Must have full tour button");
  assert.ok(settingsContent.includes("startTour('settings')"), "Must have Settings & API key micro-tour button");
  assert.ok(settingsContent.includes("startTour('search')"), "Must have Search micro-tour button");
  assert.ok(settingsContent.includes("startTour('term_detail')"), "Must have Term Detail micro-tour button");
  assert.ok(settingsContent.includes("startTour('flow')"), "Must have Translation Flow micro-tour button");

  console.log("✓ Settings micro-tours UI test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
