# Onboarding Product Tour Implementation Plan (Multi-Page Expansion)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive multi-page onboarding product tour covering Settings (Languages & OpenRouter API key), Search/Browse, Term Details (submitting translations), and Translation Flow (rapid translation & approvals), with route-aware automatic navigation, micro-tours support, opt-out on every step, and DB persistence.

**Architecture:** A route-aware React tour engine (`<OnboardingTour />`, `OnboardingContext`) using React Router `useNavigate` to transition across pages (`/settings`, `/browse`, `/terms/:id`, `/flow`) and highlight target `data-tour` elements. Backend stores `has_seen_onboarding` in user preferences.

**Tech Stack:** React 18, React Router v6, TypeScript, Tailwind CSS, Express, SQLite (`better-sqlite3`), Node test assertions.

## Global Constraints
- Every step has a visible "Skip Tutorial" button.
- Multi-page navigation supported seamlessly during tour steps.
- Settings page includes "Help & Onboarding" with micro-tour trigger buttons.
- Database flag `has_seen_onboarding` persists completion/opt-out status.
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

  const tableInfo = db.prepare("PRAGMA table_info(user_preferences)").all();
  const hasSeenCol = tableInfo.find(c => c.name === 'has_seen_onboarding');
  assert.ok(hasSeenCol, "user_preferences table must have has_seen_onboarding column");

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
Expected: FAIL (missing `has_seen_onboarding` column).

- [ ] **Step 3: Update `dbInit.service.js` and `/api/user/preferences` in `server.js`**

Add `has_seen_onboarding` column to `user_preferences` table in `dbInit.service.js`.
Update GET/POST `/api/user/preferences` handlers in `server.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/tests/onboarding-preferences.test.js`
Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add backend/src/services/dbInit.service.js backend/src/server.js backend/tests/onboarding-preferences.test.js
git commit -m "feat(backend): add has_seen_onboarding preference column and API support"
```

---

### Task 2: Route-Aware `OnboardingContext` State Management & Micro-Tours

**Files:**
- Create: `frontend/context/OnboardingContext.tsx`
- Modify: `frontend/types.ts`
- Modify: `frontend/services/api.ts`
- Test: `frontend/tests/onboarding-context.test.js`

**Interfaces:**
- Consumes: `useNavigate()`, `user`, `backendApi.updateUserPreferences`
- Produces: `useOnboarding()` hook supporting full multi-page tour & micro-tours (`'full'`, `'settings'`, `'search'`, `'term_detail'`, `'flow'`)

- [ ] **Step 1: Write failing test for `OnboardingContext` route-awareness & multi-tour presets**

Create `frontend/tests/onboarding-context.test.js`:
```javascript
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing multi-page OnboardingContext setup...");

  const contextPath = path.join(__dirname, '../context/OnboardingContext.tsx');
  assert.ok(fs.existsSync(contextPath), "OnboardingContext.tsx file must exist");

  const content = fs.readFileSync(contextPath, 'utf8');

  assert.ok(content.includes('OnboardingStep'), "Must define OnboardingStep interface");
  assert.ok(content.includes('route?: string'), "OnboardingStep must support route navigation");
  assert.ok(content.includes('startTour'), "Must support startTour method");
  assert.ok(content.includes('settings-languages'), "Must define settings tour step");
  assert.ok(content.includes('search-input'), "Must define search tour step");
  assert.ok(content.includes('add-translation'), "Must define term detail translation tour step");
  assert.ok(content.includes('flow-actions'), "Must define translation flow tour step");

  console.log("✓ Multi-page OnboardingContext test passed!");
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
Expected: FAIL (file missing).

- [ ] **Step 3: Implement `OnboardingContext.tsx` with multi-page steps & micro-tours**

Implement step configurations for:
- Welcome modal
- Settings (Languages & API Key) -> route `/settings`
- Search & Browse -> route `/browse`
- Term Detail -> route `/terms/1` (sample or active term)
- Translation Flow -> route `/flow`
- Wrap Up -> route `/settings`

- [ ] **Step 4: Run test to verify it passes**

Run: `node frontend/tests/onboarding-context.test.js`
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add frontend/types.ts frontend/services/api.ts frontend/context/OnboardingContext.tsx frontend/tests/onboarding-context.test.js
git commit -m "feat(frontend): implement route-aware OnboardingContext with multi-page and micro-tour support"
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
- Produces: Spotlighting backdrop overlay and tooltip popovers with navigation & skip buttons.

- [ ] **Step 1: Write failing test for UI components**

Create `frontend/tests/onboarding-ui-components.test.js`:
```javascript
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing Onboarding UI components...");

  const tourPath = path.join(__dirname, '../components/onboarding/OnboardingTour.tsx');
  const backdropPath = path.join(__dirname, '../components/onboarding/TourBackdrop.tsx');
  const tooltipPath = path.join(__dirname, '../components/onboarding/TourTooltip.tsx');

  assert.ok(fs.existsSync(tourPath), "OnboardingTour.tsx must exist");
  assert.ok(fs.existsSync(backdropPath), "TourBackdrop.tsx must exist");
  assert.ok(fs.existsSync(tooltipPath), "TourTooltip.tsx must exist");

  const tooltipContent = fs.readFileSync(tooltipPath, 'utf8');

  assert.ok(tooltipContent.includes('Skip Tutorial'), "Tooltip must include 'Skip Tutorial' button");
  assert.ok(tooltipContent.includes('Step'), "Tooltip must include step counter");

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

- [ ] **Step 3: Build `TourBackdrop.tsx`, `TourTooltip.tsx`, and `OnboardingTour.tsx`**

- `TourBackdrop.tsx`: SVG mask spotlight around target rect.
- `TourTooltip.tsx`: Card positioned with arrow, step counter, Skip Tutorial, and Next/Finish.
- `OnboardingTour.tsx`: Auto-positions elements and handles route change delay cleanly.

- [ ] **Step 4: Run test to verify it passes**

Run: `node frontend/tests/onboarding-ui-components.test.js`
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add frontend/components/onboarding/ frontend/tests/onboarding-ui-components.test.js
git commit -m "feat(frontend): add OnboardingTour, TourBackdrop, and TourTooltip UI components"
```

---

### Task 4: Target `data-tour` Attributes Across Multi-Page Application

**Files:**
- Modify: `frontend/App.tsx`
- Modify: `frontend/pages/Settings.tsx`
- Modify: `frontend/pages/Browse.tsx`
- Modify: `frontend/pages/TermDetail.tsx`
- Modify: `frontend/pages/TranslationFlow.tsx`
- Test: `frontend/tests/onboarding-multi-page-targets.test.js`

**Interfaces:**
- Consumes: `<OnboardingProvider>`
- Produces: `data-tour` markers on Settings (languages, API key), Search/Browse (search input), Term Detail (translation input), and Translation Flow (action buttons).

- [ ] **Step 1: Write failing test for `data-tour` markers across pages**

Create `frontend/tests/onboarding-multi-page-targets.test.js`:
```javascript
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing data-tour attributes across all multi-page target files...");

  const settingsContent = fs.readFileSync(path.join(__dirname, '../pages/Settings.tsx'), 'utf8');
  const browseContent = fs.readFileSync(path.join(__dirname, '../pages/Browse.tsx'), 'utf8');
  const termDetailContent = fs.readFileSync(path.join(__dirname, '../pages/TermDetail.tsx'), 'utf8');
  const flowContent = fs.readFileSync(path.join(__dirname, '../pages/TranslationFlow.tsx'), 'utf8');

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node frontend/tests/onboarding-multi-page-targets.test.js`
Expected: FAIL (`data-tour` attributes missing).

- [ ] **Step 3: Add `data-tour` attributes to `Settings.tsx`, `Browse.tsx`, `TermDetail.tsx`, and `TranslationFlow.tsx`**

- `Settings.tsx`: `data-tour="settings-languages"`, `data-tour="settings-api-key"`.
- `Browse.tsx`: `data-tour="search-input"`.
- `TermDetail.tsx`: `data-tour="add-translation-btn"`.
- `TranslationFlow.tsx`: `data-tour="flow-actions"`.
- `App.tsx`: Wrap layout in `<OnboardingProvider>` and `<OnboardingTour />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node frontend/tests/onboarding-multi-page-targets.test.js`
Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add frontend/App.tsx frontend/pages/Settings.tsx frontend/pages/Browse.tsx frontend/pages/TermDetail.tsx frontend/pages/TranslationFlow.tsx frontend/tests/onboarding-multi-page-targets.test.js
git commit -m "feat(frontend): annotate multi-page target components with data-tour attributes"
```

---

### Task 5: Settings Page "Help & Onboarding" & Micro-Tours Trigger UI

**Files:**
- Modify: `frontend/pages/Settings.tsx`
- Test: `frontend/tests/onboarding-settings-microtours.test.js`

**Interfaces:**
- Consumes: `useOnboarding().startTour(...)`
- Produces: "Help & Onboarding" dashboard card with individual micro-tour buttons in `Settings.tsx`.

- [ ] **Step 1: Write failing test for Settings micro-tours UI**

Create `frontend/tests/onboarding-settings-microtours.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node frontend/tests/onboarding-settings-microtours.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement "Help & Onboarding" micro-tours section in `Settings.tsx`**

Add micro-tour trigger buttons styling with icons and descriptions in `Settings.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node frontend/tests/onboarding-settings-microtours.test.js`
Expected: PASS.

- [ ] **Step 5: Run all test suites and commit**

Run:
```bash
node backend/tests/onboarding-preferences.test.js
node frontend/tests/onboarding-context.test.js
node frontend/tests/onboarding-ui-components.test.js
node frontend/tests/onboarding-multi-page-targets.test.js
node frontend/tests/onboarding-settings-microtours.test.js
```

Commit:
```bash
git add frontend/pages/Settings.tsx frontend/tests/onboarding-settings-microtours.test.js
git commit -m "feat(frontend): add Help & Onboarding micro-tours suite to Settings page"
```
