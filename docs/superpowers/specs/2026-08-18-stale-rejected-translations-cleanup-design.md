# Stale Rejected Translations Cleanup Design Specification

**Date:** 2026-08-18  
**Status:** Approved  
**Author:** Pair Programming Session

---

## 1. Problem Statement & Motivation

Currently in Marine Term Translations (MTT), when a submitted translation is rejected during review, its status changes to `rejected` and it is retained in the database assigned to the original translator (`created_by_id`).

In the Translation Flow (`/flow`), rejected translations are surfaced exclusively to the original translator as Priority 2 "rework" tasks. However, if that user does not return to MTT within a reasonable timeframe, the term field remains locked in a stale rejected state. Consequently:
- Other translators in the community cannot translate the term in that language through the translation flow.
- High-value marine terms remain untranslated indefinitely.

This feature introduces an automated stale detection and cleanup system that reverts inactive rejected translations so the community can translate these terms again.

---

## 2. Goals & Success Criteria

1. **Automated Staleness Detection:** Periodically identify translations in `rejected` status that have had no user activity for longer than a configured threshold (default: 7 days).
2. **Clean Community Release:** Delete stale rejected translation records so that the associated term field is completely untranslated in that language and readily surfaced to all translators.
3. **Appeals Protection:** Prevent any rejected translation with an active/open appeal (`appeals.status = 'open'`) from being reverted.
4. **Audit History Tracking:** Record an entry in `user_activity` (`translation_stale_reverted`) capturing historical details (original value, previous author, rejection reason, inactivity duration) before deletion.
5. **No Reputation Regress:** Ensure no additional reputation penalties or refunds are applied upon stale cleanup (the standard rejection penalty was already assessed at rejection time).
6. **On-Demand Admin Endpoint:** Provide an administrative API route (`POST /api/admin/revert-stale-translations`) for manual execution and testing.

---

## 3. Architecture & Detailed Design

### 3.1 Configuration

Add a configurable threshold in `backend/src/config/index.js` (and `.env` / `.env.example`):

```javascript
// backend/src/config/index.js
translations: {
  // ... existing config
  staleRejectionDays: parseInt(process.env.STALE_REJECTED_TRANSLATION_DAYS, 10) || 7,
}
```

```bash
# .env & .env.example
STALE_REJECTED_TRANSLATION_DAYS=7
```

### 3.2 Detection & Reversion Logic

Implement `revertStaleRejectedTranslations(options = {})` in `backend/src/services/flow.service.js`:

#### SQL Query for Eligible Candidates:
```sql
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
```

#### Execution Steps:
1. Fetch all stale rejected candidates using the configured threshold (or `options.daysOverride`).
2. For each candidate record:
   - Begin a database transaction or atomic block.
   - Insert an audit record into `user_activity`:
     - `user_id`: `t.modified_by_id || t.created_by_id || 1` (fallback to system/user 1 if null)
     - `action`: `'translation_stale_reverted'`
     - `term_id`: `t.term_id`
     - `term_field_id`: `t.term_field_id`
     - `translation_id`: `t.id`
     - `extra`: JSON containing:
       ```json
       {
         "reverted_reason": "Stale rejected translation automatically cleared after inactivity",
         "language": "...",
         "previous_value": "...",
         "previous_rejection_reason": "...",
         "days_inactive": 7
       }
       ```
   - Delete the translation:
     ```sql
     DELETE FROM translations WHERE id = ?
     ```
   - Commit the transaction.
3. Return summary metrics: `{ revertedCount, items: [...] }`.

### 3.3 Background Task Integration

In `backend/src/services/taskDispatcher.service.js`:
- In `startTaskDispatcher()`:
  - Run `revertStaleRejectedTranslations()` on application startup.
  - Run `revertStaleRejectedTranslations()` every hour (3600000 ms) alongside `autoApproveExpiredTranslations()`.

### 3.4 Admin API Endpoint

In `backend/src/routes/admin.routes.js`:
- **Route:** `POST /api/admin/revert-stale-translations`
- **Authentication:** Admin session / ORCID session check (`req.session.user?.is_admin`).
- **Body Parameters (optional):**
  - `days`: Integer override for stale threshold (e.g., `14` or `0` for instant sweep).
- **Response:**
  ```json
  {
    "success": true,
    "revertedCount": 2,
    "thresholdDays": 7
  }
  ```

---

## 4. Flow & Task Interaction

1. **Untranslated Queue (`getRandomUntranslated`):**  
   Once the stale rejected record is deleted from `translations`, the query `SELECT ... WHERE tf.id NOT IN (SELECT term_field_id FROM translations WHERE ...)` detects that no translation exists for this language, immediately offering the term to any user requesting translation tasks.
2. **Rework Queue (`getRejectedTranslations`):**  
   Since the record is deleted, it will no longer be served as a rework task to the original user.
3. **Appeals Workflow:**  
   If a user had an appeal open (`status = 'open'`), the translation is protected and remains intact until the appeal is resolved or closed. If an appeal is subsequently rejected/closed and no rework occurs for another 7 days, it will be eligible on future sweeps.

---

## 5. Verification & Testing Plan

### 5.1 Automated Unit & Integration Tests (`backend/tests/stale-rejected-translations.test.js`)
1. **Stale Threshold Verification:** Create a rejected translation with `updated_at` set to 8 days ago and run cleanup with 7 days threshold -> verify record is deleted and activity log exists.
2. **Recent Rejection Protection:** Create a rejected translation with `updated_at` set to 2 days ago -> verify record is **not** deleted.
3. **Open Appeal Protection:** Create a rejected translation 8 days ago with an open appeal -> verify record is **not** deleted.
4. **Closed Appeal Verification:** Create a rejected translation 8 days ago with a closed appeal -> verify record **is** deleted.
5. **Community Translation Availability:** After cleanup, verify `getRandomUntranslated()` returns the freed term field to another user.
6. **Admin Endpoint Test:** Verify `POST /api/admin/revert-stale-translations` triggers cleanup and returns correct count.

---

## 6. Migration & Schema Changes

* No DDL table schema modifications are required (existing tables `translations`, `term_fields`, `user_activity`, and `appeals` support this flow natively).
* New `action` type `'translation_stale_reverted'` is recorded in `user_activity.action`.
