# Design Specification: Authentication Enforcement and User Privacy Protection

**Date**: 2026-08-31  
**Status**: Approved  
**Author**: Cedric Decruw / Pair Programming Assistant  

---

## 1. Problem Statement

A critical security vulnerability report identified inconsistent authentication enforcement and unauthorized exposure across the Marine Term Translations (MTT) API:
1. **Unauthenticated Term Creation (`POST /api/terms`)**: Anonymous clients could create persistent records in the production dataset without a session, authentication, authorization, or user attribution.
2. **Privileged User Directory Exposure (`GET /api/users` & `GET /api/user/:id`)**: The full user directory and individual profile endpoints exposed raw `extra` JSON containing sensitive privilege flags (`is_admin`, `is_superadmin`), ban details (`is_banned`, `ban_reason`), and internal metadata to unauthenticated callers.
3. **Unprotected State-Changing Routes**: Endpoints such as `POST /api/user-reputation/:username`, background task management, and source configuration lacked strict `requireAdmin` or `requireAuth` guards.

---

## 2. Goals & Success Criteria

- **Strict Access Control on Term Operations**:
  - `POST /api/terms`: Accessible exclusively by administrators and superadministrators (`requireAdmin`). Anonymous requests return `401 Unauthorized`; non-admin authenticated users return `403 Forbidden`. Requests must be attributed with `created_by_id` and logged in `user_activity`.
  - `PUT /api/terms/:id`: Accessible by authenticated users (`requireAuth`) originating from a valid browser web session.
- **User Directory & Profile Privacy**:
  - `GET /api/users`: Restricted to authenticated users (`requireAuth`) with stripped/sanitized output.
  - `GET /api/user/:id`: Public profile sanitized to whitelist only display properties (`name`, `nativeLanguage`, `translationLanguages`, `pinnedAchievements`), stripping all admin flags, ban statuses, emails, and internal keys.
  - Public Leaderboard / Landing Page: Provides dedicated sanitized public rankings without exposing internal user directory metadata or administrative flags.
  - `GET /api/admin/users`: Dedicated endpoint for administrators guarded by `requireAdmin`.
- **Pre-Validation Authentication**: Authentication and authorization middleware execute *before* request body/query parsing.
- **Comprehensive Regression Suite**: Automated test suite verifying 401/403 rejections and sanitized projections across all affected routes.

---

## 3. Architecture & Detailed Component Changes

### 3.1 Authentication & Middleware (`backend/src/middleware/admin.js`)
- Ensure standard exports for:
  - `requireAuth`: Verifies `req.session?.user` exists. Returns `401 {"error": "Not authenticated"}` immediately.
  - `requireAdmin`: Verifies `req.session?.user` and checks `req.session.user.is_admin || req.session.user.is_superadmin`. Returns `401` if unauthenticated and `403 {"error": "Admin privileges required"}` if not admin.
  - `requireBrowserContext`: Verifies request origin/referer against allowed frontend URL and checks session cookies for interactive browser mutations.
  - `sanitizePublicUser(user)`: Helper to filter out sensitive properties (`is_admin`, `is_superadmin`, `is_banned`, `ban_reason`, `banned_at`, `email`, `access_token`, `refresh_token`, etc.) from user objects.

### 3.2 Terms Routes (`backend/src/routes/terms.routes.js`)
- **`POST /terms`**:
  - Add `requireAdmin` middleware: `router.post("/terms", requireAdmin, writeLimiter, ...)`
  - Insert term with `created_by_id: req.session.user.id`.
  - Log audit trail in `user_activity` table (`action: 'term_created'`).
- **`PUT /terms/:id`**:
  - Add `requireAuth` middleware: `router.put("/terms/:id", requireAuth, writeLimiter, ...)`
  - Derive user ID from `req.session.user.id`.
  - Enforce browser session origin validation.
- **`POST /user-reputation/:username`**:
  - Add `requireAdmin` middleware: `router.post("/user-reputation/:username", requireAdmin, writeLimiter, ...)`

### 3.3 User & Teams Routes (`backend/src/routes/teams.routes.js`, `backend/src/routes/user.routes.js`)
- **`GET /users` (`teams.routes.js`)**:
  - Add `requireAuth` middleware.
  - Sanitize user list: only return `{ id, username, name, reputation, joined_at, avatar }`.
- **`GET /user/:id` (`user.routes.js`)**:
  - Sanitize `extra` field: only whitelist `name`, `nativeLanguage`, `translationLanguages`, and `pinnedAchievements`.
  - Never include `is_admin`, `is_superadmin`, `is_banned`, or `ban_reason`.
- **Public Leaderboard / Contributor Rankings (`flow.routes.js` / `terms.routes.js`)**:
  - Expose a public, sanitized top-contributors / leaderboard endpoint for public landing and leaderboard views.

### 3.4 Audit of Administration & Mutation Routes
- **`tasks.routes.js`**: Protect `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id` with `requireAdmin`.
- **`sources.routes.js`**: Protect `POST /sources`, `PUT /sources/:id`, `DELETE /sources/:id`, `POST /sources/upload`, `POST /sources/:id/sync-terms`, `PUT /sources/:id/config` with `requireAdmin`.
- **`task-schedulers.routes.js`**: Protect `POST /task-schedulers`, `PUT /task-schedulers/:id`, `DELETE /task-schedulers/:id`, `POST /task-schedulers/:id/toggle` with `requireAdmin`.
- **`eventRoutes.js`**: Protect event creation, deletion, status update, and settlement with `requireAdmin`. Protect team creation, joining, and title equipping with `requireAuth`.

---

## 4. Security & Privacy Guarantees

1. **Authentication Prior to Validation**: Malicious or unauthenticated payloads never trigger database operations or schema parsing.
2. **Least Privilege Data Exposure**: Administrative flags (`is_admin`, `is_superadmin`) and moderation flags (`is_banned`, `ban_reason`) are strictly confined to `/api/admin/users` and `/api/me`.
3. **Accountability**: All newly created terms are permanently attributed to the authenticated administrator account.

---

## 5. Verification Plan

### Automated Test Suite (`backend/tests/security_auth_enforcement.test.js`)
- Test 1: `POST /api/terms` unauthenticated -> `401 Unauthorized`.
- Test 2: `POST /api/terms` authenticated non-admin -> `403 Forbidden`.
- Test 3: `POST /api/terms` authenticated admin -> `201 Created` with `created_by_id`.
- Test 4: `PUT /api/terms/:id` unauthenticated -> `401 Unauthorized`.
- Test 5: `GET /api/users` unauthenticated -> `401 Unauthorized`.
- Test 6: `GET /api/users` authenticated -> sanitized user list with zero leaked admin flags.
- Test 7: `GET /api/user/:id` -> sanitized profile with whitelisted attributes only.
- Test 8: `POST /api/user-reputation/:username` unauthenticated -> `401 Unauthorized`; non-admin -> `403 Forbidden`.
- Test 9: Public leaderboard endpoint returns sanitized data without error.
- Full backend regression test run: `npm test` passing.
