# Onboarding Product Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 5-step interactive onboarding product tour with dark element-highlighting overlays, skip/opt-out buttons, action-driven progression, backend state persistence, and a Settings page replay trigger.

**Architecture:** A lightweight custom React component engine (`<OnboardingTour />`, `<TourBackdrop />`, `<TourTooltip />`) powered by `OnboardingContext`. The backend tracks `has_seen_onboarding` in user preferences. Screen elements are targeted via `data-tour` attributes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Express, SQLite (`better-sqlite3`), Node test assertions.

## Global Constraints
- Tour steps limited to 5 steps maximum ("Rule of 5").
- Clear "Skip Tutorial" button present on every step.
- Step 5 explicitly points to Settings ("You can restart this tour anytime from your settings").
- Database flag `has_seen_onboarding` persists completion/opt-out status.
- Settings page includes "Help & Onboarding" section with "Replay System Tour" button.
- Strict TDD: Write failing test, verify RED, write minimal code, verify GREEN, commit.

---

### Task 1: Backend Database & User Preferences Endpoint for `has_seen_onboarding`

**Files:**
- Modify: `backend/src/services/dbInit.service.js`
- Modify: `backend/src/server.js`
- Test: `backend/tests/onboarding-preferences.test.js`

**Interfaces:**
- Consumes: User session `/api/user/preferences` (GET / POST)
- Produces: `has_seen_onboarding` boolean property in preferences payload

- [ ] **Step 1: Write failing test for `has_seen_onboarding` preference**

Create `backend/tests/onboarding-preferences.test.js`:
```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_onboarding_preferences.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');

async function run() {
  console.log("Testing onboarding preferences persistence...");
  initializeDatabase();
  const db = getDatabase();

  // Test 1: Ensure user_preferences table has has_seen_onboarding column
  const tableInfo = db.prepare("PRAGMA table_info(user_preferences)").all();
  const hasSeenCol = tableInfo.find(c => c.name === 'has_seen_onboarding');
  assert.ok(hasSeenCol, "user_preferences table must have has_seen_onboarding column");

  // Test 2: Insert preference with has_seen_onboarding = 1 and verify fetch
  db.prepare(`
    INSERT INTO user_preferences (user_id, has_seen_onboarding)
    VALUES (101, 1)
  `).run();

  const pref = db.prepare("SELECT has_seen_onboarding FROM user_preferences WHERE user_id = 101").get();
  assert.strictEqual(pref.has_seen_onboarding, 1);

  console.log("✓ Onboarding preferences DB test passed!");
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Test Failed:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/tests/onboarding-preferences.test.js`
Expected: FAIL (missing `has_seen_onboarding` column in `user_preferences` table).

- [ ] **Step 3: Update `dbInit.service.js` and `/api/user/preferences` handler in `server.js`**

Modify `backend/src/services/dbInit.service.js` to include column migration:
```javascript
db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    native_language TEXT,
    translation_languages TEXT,
    preferred_languages TEXT,
    visible_extra_languages TEXT,
    has_seen_onboarding INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration safeguard for existing tables
try {
  db.exec("ALTER TABLE user_preferences ADD COLUMN has_seen_onboarding INTEGER DEFAULT 0;");
} catch (e) {
  // Column already exists
}
```

Update preference GET/POST endpoints in `backend/src/server.js` to return and accept `has_seen_onboarding` (converted to boolean).

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/tests/onboarding-preferences.test.js`
Expected: PASS (`✓ Onboarding preferences DB test passed!`).

- [ ] **Step 5: Commit backend onboarding preference changes**

```bash
git add backend/src/services/dbInit.service.js backend/src/server.js backend/tests/onboarding-preferences.test.js
git commit -m "feat(backend): add has_seen_onboarding user preference column and endpoint support"
```

---

### Task 2: Frontend `OnboardingContext` and State Management

**Files:**
- Create: `frontend/context/OnboardingContext.tsx`
- Modify: `frontend/types.ts`
- Modify: `frontend/services/api.ts`
- Test: `frontend/tests/onboarding-context.test.js`

**Interfaces:**
- Consumes: `user` and `backendApi.updateUserPreferences`
- Produces: `useOnboarding()` hook providing `{ activeTour, currentStep, hasSeenOnboarding, startTour, nextStep, prevStep, skipTour, completeTour, goToStep }`

- [ ] **Step 1: Write failing test for `OnboardingContext` state management**

Create `frontend/tests/onboarding-context.test.js`:
```javascript
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing OnboardingContext implementation structure...");

  const contextPath = path.join(__dirname, '../context/OnboardingContext.tsx');
  assert.ok(fs.existsSync(contextPath), "OnboardingContext.tsx file must exist");

  const content = fs.readFileSync(contextPath, 'utf8');

  // Must define Tour step type and OnboardingContextType
  assert.ok(content.includes('export interface OnboardingStep'), "Must export OnboardingStep interface");
  assert.ok(content.includes('export const OnboardingProvider'), "Must export OnboardingProvider");
  assert.ok(content.includes('export const useOnboarding'), "Must export useOnboarding hook");
  assert.ok(content.includes('has_seen_onboarding'), "Must integrate with has_seen_onboarding preference");
  assert.ok(content.includes('startTour'), "Must provide startTour method");
  assert.ok(content.includes('skipTour'), "Must provide skipTour method");

  console.log("✓ OnboardingContext test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node frontend/tests/onboarding-context.test.js`
Expected: FAIL (file does not exist).

- [ ] **Step 3: Implement `OnboardingContext.tsx`, update `types.ts` & `api.ts`**

Update `frontend/types.ts` to add `hasSeenOnboarding` to user preferences.
Create `frontend/context/OnboardingContext.tsx` with full state logic, 5-step configuration:
1. Welcome (Center modal)
2. Language Pair Selection (`[data-tour="language-selector"]`)
3. Search Input (`[data-tour="search-bar"]`)
4. Results & Context (`[data-tour="results-area"]`)
5. Wrap Up & Settings (`[data-tour="settings-icon"]`)

- [ ] **Step 4: Run test to verify it passes**

Run: `node frontend/tests/onboarding-context.test.js`
Expected: PASS.

- [ ] **Step 5: Commit `OnboardingContext`**

```bash
git add frontend/types.ts frontend/services/api.ts frontend/context/OnboardingContext.tsx frontend/tests/onboarding-context.test.js
git commit -m "feat(frontend): create OnboardingContext state management and step configuration"
```

---

### Task 3: Tour UI Components (`<OnboardingTour />`, `<TourBackdrop />`, `<TourTooltip />`)

**Files:**
- Create: `frontend/components/onboarding/TourBackdrop.tsx`
- Create: `frontend/components/onboarding/TourTooltip.tsx`
- Create: `frontend/components/onboarding/OnboardingTour.tsx`
- Test: `frontend/tests/onboarding-ui-components.test.js`

**Interfaces:**
- Consumes: `useOnboarding()`
- Produces: Visual modal/tooltip tour overlay with spotlight backdrop and step navigation.

- [ ] **Step 1: Write failing test for Onboarding UI components**

Create `frontend/tests/onboarding-ui-components.test.js`:
```javascript
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing Onboarding UI components existence and requirements...");

  const tourPath = path.join(__dirname, '../components/onboarding/OnboardingTour.tsx');
  const backdropPath = path.join(__dirname, '../components/onboarding/TourBackdrop.tsx');
  const tooltipPath = path.join(__dirname, '../components/onboarding/TourTooltip.tsx');

  assert.ok(fs.existsSync(tourPath), "OnboardingTour.tsx must exist");
  assert.ok(fs.existsSync(backdropPath), "TourBackdrop.tsx must exist");
  assert.ok(fs.existsSync(tooltipPath), "TourTooltip.tsx must exist");

  const tooltipContent = fs.readFileSync(tooltipPath, 'utf8');

  // Verify Skip button is present on every step
  assert.ok(tooltipContent.includes('Skip Tutorial'), "Tooltip must render 'Skip Tutorial' button");
  // Verify step indicator (e.g. Step X of 5)
  assert.ok(tooltipContent.includes('Step'), "Tooltip must render step indicator");

  console.log("✓ Onboarding UI components test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node frontend/tests/onboarding-ui-components.test.js`
Expected: FAIL (files missing).

- [ ] **Step 3: Implement `TourBackdrop.tsx`, `TourTooltip.tsx`, and `OnboardingTour.tsx`**

Build responsive components:
- `TourBackdrop.tsx`: SVG mask / fixed dark backdrop highlighting element bounding box.
- `TourTooltip.tsx`: Card positioned with arrow, step counter, Skip Tutorial button, and Next/Finish actions.
- `OnboardingTour.tsx`: Coordinates active step element calculation and renders backdrop + tooltip.

- [ ] **Step 4: Run test to verify it passes**

Run: `node frontend/tests/onboarding-ui-components.test.js`
Expected: PASS.

- [ ] **Step 5: Commit Onboarding UI components**

```bash
git add frontend/components/onboarding/ frontend/tests/onboarding-ui-components.test.js
git commit -m "feat(frontend): implement OnboardingTour, TourBackdrop, and TourTooltip components"
```

---

### Task 4: Target Attributes, Action-Driven Triggers, and App Layout Integration

**Files:**
- Modify: `frontend/App.tsx`
- Modify: `frontend/components/Layout.tsx`
- Modify: `frontend/pages/Dashboard.tsx`
- Modify: `frontend/pages/Browse.tsx` or search components
- Test: `frontend/tests/onboarding-target-attributes.test.js`

**Interfaces:**
- Consumes: `<OnboardingProvider>`, `data-tour` DOM attributes
- Produces: Live tour experience on first login with action triggers (auto-advancing on selection/input)

- [ ] **Step 1: Write failing test for `data-tour` attributes and Provider wrapper**

Create `frontend/tests/onboarding-target-attributes.test.js`:
```javascript
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing data-tour attributes across frontend files...");

  const appContent = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');
  const layoutContent = fs.readFileSync(path.join(__dirname, '../components/Layout.tsx'), 'utf8');

  // Verify App.tsx wraps in OnboardingProvider
  assert.ok(appContent.includes('OnboardingProvider'), "App.tsx must be wrapped in OnboardingProvider");
  assert.ok(appContent.includes('OnboardingTour'), "App.tsx must include OnboardingTour component");

  // Verify settings-icon data-tour attribute in Layout
  assert.ok(layoutContent.includes('data-tour="settings-icon"'), "Layout header/nav must include data-tour='settings-icon'");

  console.log("✓ Onboarding target attributes test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node frontend/tests/onboarding-target-attributes.test.js`
Expected: FAIL (`OnboardingProvider` missing in `App.tsx`, `data-tour` missing).

- [ ] **Step 3: Add `OnboardingProvider` to `App.tsx`, add `data-tour` attributes to `Layout.tsx`, `Dashboard.tsx`, `Browse.tsx`**

- Add `data-tour="language-selector"` to language dropdown container.
- Add `data-tour="search-bar"` to search input element.
- Add `data-tour="results-area"` to search results wrapper.
- Add `data-tour="settings-icon"` to profile/settings icon in `Layout.tsx`.
- Wire action listeners in components (e.g. `onChange` call `nextStep()` if on step 1/2).

- [ ] **Step 4: Run test to verify it passes**

Run: `node frontend/tests/onboarding-target-attributes.test.js`
Expected: PASS.

- [ ] **Step 5: Commit layout and target integration**

```bash
git add frontend/App.tsx frontend/components/Layout.tsx frontend/pages/Dashboard.tsx frontend/pages/Browse.tsx frontend/tests/onboarding-target-attributes.test.js
git commit -m "feat(frontend): integrate OnboardingProvider and data-tour target attributes"
```

---

### Task 5: Settings Page Tour Replay Feature

**Files:**
- Modify: `frontend/pages/Settings.tsx`
- Test: `frontend/tests/onboarding-settings-replay.test.js`

**Interfaces:**
- Consumes: `useOnboarding().startTour('main')`, `useNavigate()`
- Produces: "Help & Onboarding" section with "Replay System Tour" button in Settings.

- [ ] **Step 1: Write failing test for Settings tour replay button**

Create `frontend/tests/onboarding-settings-replay.test.js`:
```javascript
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing Settings page tour replay section...");

  const settingsContent = fs.readFileSync(path.join(__dirname, '../pages/Settings.tsx'), 'utf8');

  // Must contain Help & Onboarding section heading
  assert.ok(settingsContent.includes('Help & Onboarding'), "Settings page must include 'Help & Onboarding' section");
  // Must contain Replay button
  assert.ok(settingsContent.includes('Replay System Tour'), "Settings page must include 'Replay System Tour' button");
  // Must use useOnboarding hook
  assert.ok(settingsContent.includes('useOnboarding'), "Settings page must consume useOnboarding hook");

  console.log("✓ Settings page tour replay test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node frontend/tests/onboarding-settings-replay.test.js`
Expected: FAIL (`Help & Onboarding` missing from `Settings.tsx`).

- [ ] **Step 3: Add "Help & Onboarding" section to `Settings.tsx`**

Add a dedicated card in `Settings.tsx`:
```tsx
<div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
  <div className="flex items-center gap-3 mb-4">
    <HelpCircle className="w-6 h-6 text-sky-500" />
    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Help & Onboarding</h2>
  </div>
  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
    Need a quick refresher on how to navigate MTT, select language pairs, search terms, and interpret context?
  </p>
  <button
    onClick={() => {
      startTour('main');
      navigate('/dashboard');
    }}
    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-lg shadow transition-colors flex items-center gap-2"
  >
    <RotateCcw className="w-4 h-4" />
    Replay System Tour
  </button>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node frontend/tests/onboarding-settings-replay.test.js`
Expected: PASS.

- [ ] **Step 5: Run all test suites and commit**

Run:
```bash
node backend/tests/onboarding-preferences.test.js
node frontend/tests/onboarding-context.test.js
node frontend/tests/onboarding-ui-components.test.js
node frontend/tests/onboarding-target-attributes.test.js
node frontend/tests/onboarding-settings-replay.test.js
```

Commit:
```bash
git add frontend/pages/Settings.tsx frontend/tests/onboarding-settings-replay.test.js
git commit -m "feat(frontend): add Help & Onboarding section with Replay System Tour in Settings"
```
