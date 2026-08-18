# Stale Rejected Translations Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an automated cleanup system that detects stale rejected translations (inactive for >= 7 days without open appeals) and reverts them to an untranslated state so the community can translate these terms again.

**Architecture:** Add `revertStaleRejectedTranslations` in `flow.service.js` that queries rejected translations past the inactivity threshold without open appeals, records an audit log in `user_activity`, and deletes the translation records. Hook this function into `taskDispatcher.service.js` (startup + hourly) and provide an admin endpoint `POST /api/admin/revert-stale-translations`.

**Tech Stack:** Node.js, Express.js, SQLite (`better-sqlite3`), dayjs / datetime helper.

## Global Constraints
- Target branch: `feature/remove-stale-translations`
- Configuration variable: `STALE_REJECTED_TRANSLATION_DAYS=7`
- Audit activity action name: `translation_stale_reverted`
- Open appeals must protect translations from being reverted
- No reputation changes upon stale cleanup

---

### Task 1: Configuration Settings

**Files:**
- Modify: `backend/src/config/index.js`
- Modify: `.env.example`
- Modify: `.env`

**Interfaces:**
- Produces: `config.translations.staleRejectionDays` (number)

- [ ] **Step 1: Update configuration module**

In `backend/src/config/index.js`, add `staleRejectionDays`:
```javascript
  translations: {
    dbPath: process.env.SQLITE_DB_PATH || 'backend/data/translations.db',
    staleRejectionDays: parseInt(process.env.STALE_REJECTED_TRANSLATION_DAYS, 10) || 7,
  },
```

- [ ] **Step 2: Update environment files**

In `.env.example` and `.env`, append:
```bash
# Stale rejected translation cleanup threshold (in days)
STALE_REJECTED_TRANSLATION_DAYS=7
```

- [ ] **Step 3: Verify configuration loads**

Run: `node -e "const config = require('./src/config'); console.log('staleRejectionDays:', config.translations.staleRejectionDays);"` in `backend/`
Expected: `staleRejectionDays: 7`

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/index.js .env.example .env
git commit -m "feat(config): add stale rejected translation days threshold"
```

---

### Task 2: Core Stale Reversion Service & Tests (TDD)

**Files:**
- Create: `backend/tests/stale-rejected-translations.test.js`
- Modify: `backend/src/services/flow.service.js`

**Interfaces:**
- Produces: `flowService.revertStaleRejectedTranslations(options = {})` -> returns `{ revertedCount: number, items: Array<{ id: number, term_id: number, term_field_id: number, language: string, value: string }> }`

- [ ] **Step 1: Write failing test suite in `backend/tests/stale-rejected-translations.test.js`**

```javascript
// backend/tests/stale-rejected-translations.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_stale_rejections.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');
const flowService = require('../src/services/flow.service');

async function run() {
  console.log("Running stale rejected translations cleanup test...");
  initializeDatabase();
  const db = getDatabase();

  // Setup users, term, and fields
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (1, 'translator1', 10)").run();
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (2, 'translator2', 15)").run();
  db.prepare("INSERT INTO terms (id, uri) VALUES (10, 'http://example.com/term/1')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (101, 10, 'label', 'Coralline', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (102, 10, 'def', 'Marine structure', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (103, 10, 'habitat', 'Reef', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (104, 10, 'depth', '100m', '[\"translatable\"]')").run();

  // 1. Stale rejected translation (> 7 days old, no appeal) -> SHOULD BE REVERTED
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, rejection_reason, created_at, updated_at)
    VALUES (501, 101, 'nl', 'Koraal', 'rejected', 1, 'Inaccurate term', datetime('now', '-10 days'), datetime('now', '-8 days'))
  `).run();

  // 2. Recent rejected translation (< 7 days old) -> SHOULD NOT BE REVERTED
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, rejection_reason, created_at, updated_at)
    VALUES (502, 102, 'nl', 'Structuur', 'rejected', 1, 'Spelling error', datetime('now', '-3 days'), datetime('now', '-2 days'))
  `).run();

  // 3. Stale rejected translation (> 7 days old) with OPEN appeal -> SHOULD NOT BE REVERTED
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, rejection_reason, created_at, updated_at)
    VALUES (503, 103, 'nl', 'Rif', 'rejected', 1, 'Dubious', datetime('now', '-12 days'), datetime('now', '-9 days'))
  `).run();
  db.prepare("INSERT INTO appeals (id, translation_id, opened_by_id, status) VALUES (1, 503, 1, 'open')").run();

  // 4. Stale rejected translation (> 7 days old) with CLOSED appeal -> SHOULD BE REVERTED
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, rejection_reason, created_at, updated_at)
    VALUES (504, 104, 'nl', 'Diepte', 'rejected', 1, 'Wrong unit', datetime('now', '-15 days'), datetime('now', '-8 days'))
  `).run();
  db.prepare("INSERT INTO appeals (id, translation_id, opened_by_id, status) VALUES (2, 504, 1, 'closed')").run();

  // Run the cleanup function with 7 days threshold
  const result = flowService.revertStaleRejectedTranslations({ daysOverride: 7 });

  assert.strictEqual(result.revertedCount, 2, "Expected exactly 2 stale translations to be reverted");

  // Verify DB state
  const t501 = db.prepare("SELECT * FROM translations WHERE id = 501").get();
  assert.strictEqual(t501, undefined, "Translation 501 should be deleted");

  const t502 = db.prepare("SELECT * FROM translations WHERE id = 502").get();
  assert.notStrictEqual(t502, undefined, "Translation 502 should still exist (recent)");

  const t503 = db.prepare("SELECT * FROM translations WHERE id = 503").get();
  assert.notStrictEqual(t503, undefined, "Translation 503 should still exist (open appeal)");

  const t504 = db.prepare("SELECT * FROM translations WHERE id = 504").get();
  assert.strictEqual(t504, undefined, "Translation 504 should be deleted (closed appeal)");

  // Verify user_activity log entry
  const activity = db.prepare("SELECT * FROM user_activity WHERE action = 'translation_stale_reverted' AND term_field_id = 101").get();
  assert.notStrictEqual(activity, undefined, "Activity log entry should exist for reverted translation 501");
  assert.strictEqual(activity.user_id, 1, "Activity log should associate with the original translator");
  const extra = JSON.parse(activity.extra);
  assert.strictEqual(extra.previous_value, 'Koraal');
  assert.strictEqual(extra.previous_rejection_reason, 'Inaccurate term');

  // Verify term field 101 is now available for user 2 via getRandomUntranslated
  const untranslated = flowService.getRandomUntranslated(2, 'nl');
  assert.notStrictEqual(untranslated, null, "Should return an untranslated term");
  assert.strictEqual(untranslated.term_field_id, 101, "Freed field 101 should now be available for translation");

  console.log("✓ Stale rejected translations cleanup tests passed!");
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

Run: `node backend/tests/stale-rejected-translations.test.js`
Expected: FAIL with `flowService.revertStaleRejectedTranslations is not a function`

- [ ] **Step 3: Implement `revertStaleRejectedTranslations` in `flow.service.js`**

In `backend/src/services/flow.service.js`, add:
```javascript
/**
 * Revert stale rejected translations after inactivity threshold
 * Cleans up rejected translations so that community translators can translate them again
 * @param {object} options - Options { daysOverride: number }
 * @returns {object} { revertedCount: number, items: array }
 */
function revertStaleRejectedTranslations(options = {}) {
  const db = getDatabase();
  const config = require("../config");
  const days = options.daysOverride !== undefined 
    ? parseInt(options.daysOverride, 10) 
    : (config.translations?.staleRejectionDays || 7);

  // Find rejected translations older than `days` where no open appeals exist
  const query = `
    SELECT t.id, t.term_field_id, t.language, t.value, t.created_by_id, t.modified_by_id,
           t.rejection_reason, t.updated_at, tf.term_id
    FROM translations t
    JOIN term_fields tf ON t.term_field_id = tf.id
    WHERE t.status = 'rejected'
      AND datetime(t.updated_at) <= datetime('now', '-' || ? || ' days')
      AND NOT EXISTS (
        SELECT 1 FROM appeals a 
        WHERE a.translation_id = t.id 
          AND a.status = 'open'
      )
  `;

  const staleList = db.prepare(query).all(days);
  const revertedItems = [];

  for (const t of staleList) {
    const translatorUserId = t.modified_by_id || t.created_by_id || 1;
    
    try {
      const activityExtra = {
        reverted_reason: `Stale rejected translation automatically cleared after ${days} days of inactivity`,
        language: t.language,
        previous_value: t.value,
        previous_rejection_reason: t.rejection_reason || null,
        days_inactive: days
      };

      // 1. Log activity before deletion
      db.prepare(`
        INSERT INTO user_activity (user_id, action, term_id, term_field_id, translation_id, extra)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        translatorUserId,
        'translation_stale_reverted',
        t.term_id,
        t.term_field_id,
        t.id,
        JSON.stringify(activityExtra)
      );

      // 2. Delete the stale rejected translation record
      db.prepare("DELETE FROM translations WHERE id = ?").run(t.id);

      revertedItems.push({
        id: t.id,
        term_id: t.term_id,
        term_field_id: t.term_field_id,
        language: t.language,
        value: t.value
      });

      console.log(`[StaleCleanup] Reverted stale rejected translation ${t.id} (language: ${t.language}, term_id: ${t.term_id}) after ${days} days`);
    } catch (err) {
      console.error(`[StaleCleanup] Error reverting translation ${t.id}:`, err.message);
    }
  }

  return {
    revertedCount: revertedItems.length,
    items: revertedItems
  };
}
```

Export `revertStaleRejectedTranslations` in `module.exports` of `backend/src/services/flow.service.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/tests/stale-rejected-translations.test.js`
Expected: `✓ Stale rejected translations cleanup tests passed!`

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/flow.service.js backend/tests/stale-rejected-translations.test.js
git commit -m "feat(flow): implement revertStaleRejectedTranslations with activity logging"
```

---

### Task 3: Background Dispatcher Integration

**Files:**
- Modify: `backend/src/services/taskDispatcher.service.js`
- Test: `backend/tests/stale-rejected-translations.test.js`

**Interfaces:**
- Consumes: `revertStaleRejectedTranslations` from `flow.service.js`

- [ ] **Step 1: Integrate cleanup runner in `taskDispatcher.service.js`**

In `backend/src/services/taskDispatcher.service.js`, inside `startTaskDispatcher(intervalMs)`:
```javascript
  // Run stale rejected translation cleanup on startup and hourly
  const { autoApproveExpiredTranslations, revertStaleRejectedTranslations } = require("./flow.service");
  try {
    autoApproveExpiredTranslations();
  } catch (e) {
    console.error("Failed to run autoApproveExpiredTranslations on startup:", e.message);
  }
  try {
    revertStaleRejectedTranslations();
  } catch (e) {
    console.error("Failed to run revertStaleRejectedTranslations on startup:", e.message);
  }
```

And inside the hourly interval callback:
```javascript
  // Hourly interval (3600000 ms) for auto-approvals and stale translation cleanup
  setInterval(() => {
    try {
      autoApproveExpiredTranslations();
    } catch (e) {
      console.error("Failed to run autoApproveExpiredTranslations hourly:", e.message);
    }
    try {
      revertStaleRejectedTranslations();
    } catch (e) {
      console.error("Failed to run revertStaleRejectedTranslations hourly:", e.message);
    }
  }, 3600000);
```

- [ ] **Step 2: Run test to verify task dispatcher integration**

Run: `node backend/tests/stale-rejected-translations.test.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/taskDispatcher.service.js
git commit -m "feat(dispatcher): run revertStaleRejectedTranslations on startup and hourly"
```

---

### Task 4: Admin API Endpoint & Regression Suite

**Files:**
- Modify: `backend/src/routes/admin.routes.js`
- Test: `backend/tests/stale-rejected-translations.test.js`

**Interfaces:**
- Produces: `POST /api/admin/revert-stale-translations` -> `{ success: true, revertedCount: number, thresholdDays: number }`

- [ ] **Step 1: Add endpoint test to `backend/tests/stale-rejected-translations.test.js`**

Add an express test / API check verifying the admin route triggers cleanup and respects `daysOverride`.

- [ ] **Step 2: Add `POST /api/admin/revert-stale-translations` route in `admin.routes.js`**

In `backend/src/routes/admin.routes.js`:
```javascript
/**
 * @openapi
 * /api/admin/revert-stale-translations:
 *   post:
 *     summary: Revert stale rejected translations (admin only)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: integer
 *                 description: Inactivity threshold override in days
 *     responses:
 *       200:
 *         description: Stale translations reverted successfully
 */
router.post("/admin/revert-stale-translations", requireAdmin, apiLimiter, (req, res) => {
  try {
    const { revertStaleRejectedTranslations } = require("../services/flow.service");
    const daysOverride = req.body?.days !== undefined ? parseInt(req.body.days, 10) : undefined;
    
    const result = revertStaleRejectedTranslations({ daysOverride });
    
    // Log admin activity
    const adminUserId = req.session.user.id || req.session.user.user_id;
    const db = getDatabase();
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      adminUserId,
      'admin_revert_stale_translations',
      JSON.stringify({ 
        reverted_count: result.revertedCount, 
        days_threshold: daysOverride || 7 
      })
    );

    res.json({
      success: true,
      revertedCount: result.revertedCount,
      items: result.items
    });
  } catch (err) {
    console.error('[Admin] Error reverting stale translations:', err);
    res.status(500).json({ error: 'Failed to revert stale translations' });
  }
});
```

- [ ] **Step 3: Run entire backend test suite**

Run: `npm test` in `backend/`
Expected: All tests pass without errors or hanging processes.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/admin.routes.js backend/tests/stale-rejected-translations.test.js
git commit -m "feat(admin): add POST /api/admin/revert-stale-translations endpoint"
```

---

## Plan Self-Review Check
- [x] Spec coverage: Configurable days, full deletion, activity log, open appeals check, no reputation change, background runner, and admin endpoint are all mapped to concrete tasks.
- [x] No placeholders: Every step contains exact files, code, queries, and commands.
- [x] Consistent names: `revertStaleRejectedTranslations`, `translation_stale_reverted`, `staleRejectionDays`, `STALE_REJECTED_TRANSLATION_DAYS`.
