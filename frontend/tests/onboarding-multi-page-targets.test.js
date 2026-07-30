import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing data-tour attributes across all multi-page target files...");

  const appContent = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');
  const settingsContent = fs.readFileSync(path.join(__dirname, '../pages/Settings.tsx'), 'utf8');
  const browseContent = fs.readFileSync(path.join(__dirname, '../pages/Browse.tsx'), 'utf8');
  const termDetailContent = fs.readFileSync(path.join(__dirname, '../pages/TermDetail.tsx'), 'utf8');
  const flowContent = fs.readFileSync(path.join(__dirname, '../pages/TranslationFlow.tsx'), 'utf8');

  assert.ok(appContent.includes('OnboardingProvider'), "App.tsx must wrap layout in OnboardingProvider");
  assert.ok(appContent.includes('OnboardingTour'), "App.tsx must include OnboardingTour component");
  assert.ok(settingsContent.includes('data-tour="settings-languages"'), "Settings must contain data-tour='settings-languages'");
  assert.ok(settingsContent.includes('data-tour="settings-api-key"'), "Settings must contain data-tour='settings-api-key'");
  assert.ok(browseContent.includes('data-tour="search-input"'), "Browse/Search must contain data-tour='search-input'");
  assert.ok(termDetailContent.includes('data-tour="add-translation-btn"'), "TermDetail must contain data-tour='add-translation-btn'");
  assert.ok(flowContent.includes('data-tour="flow-actions"'), "TranslationFlow must contain data-tour='flow-actions'");

  console.log("✓ Multi-page target attributes test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
