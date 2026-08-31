# Authentication Enforcement & User Privacy Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close critical security vulnerabilities across the Marine Term Translations (MTT) platform by strictly enforcing admin authorization for term creation (`POST /api/terms`), session & browser verification for term editing (`PUT /api/terms/:id`), authentication for the user directory (`GET /api/users`), and comprehensive sanitization across all public user profile and leaderboard outputs.

**Architecture:** Express middleware-driven access control (`requireAdmin`, `requireAuth`, `requireBrowserContext`) applied before request body parsing, accompanied by a centralized data sanitization helper layer (`sanitizePublicUser`, `sanitizeUserProfileExtra`) and attribution logging in `user_activity` and `terms.created_by_id`.

**Tech Stack:** Node.js, Express, SQLite (`better-sqlite3`), express-session.

## Global Constraints

- Never expose `is_admin`, `is_superadmin`, `is_banned`, `ban_reason`, `banned_at`, emails, tokens, or API keys in public API responses.
- Enforce authentication/authorization middleware before body or route parameter processing.
- All newly created terms must be attributed to the authenticated user's ID (`created_by_id`).
- All tests must run with `node tests/<test_file>.js` and pass in `npm test`.

---

### Task 1: Middleware Hardening & Public Projection Helpers

**Files:**
- Create: `backend/tests/security_auth_enforcement.test.js`
- Modify: `backend/src/middleware/admin.js`

**Interfaces:**
- Produces:
  - `requireAuth(req, res, next)`: Rejects unauthenticated requests with 401 `{"error": "Not authenticated"}`.
  - `requireAdmin(req, res, next)`: Rejects unauthenticated with 401, non-admins with 403 `{"error": "Admin privileges required"}`.
  - `requireBrowserContext(req, res, next)`: Validates session presence and origin headers for interactive browser mutations.
  - `sanitizePublicUser(user)`: Returns `{ id, username, name, reputation, joined_at, avatar }` without sensitive flags.
  - `sanitizeUserProfileExtra(extraStrOrObj)`: Returns sanitized JSON string with only `name`, `nativeLanguage`, `translationLanguages`, `pinnedAchievements`.

- [ ] **Step 1: Write the failing test for middleware and sanitization helpers**

```javascript
// backend/tests/security_auth_enforcement.test.js
const assert = require("assert");
const {
  requireAuth,
  requireAdmin,
  requireBrowserContext,
  sanitizePublicUser,
  sanitizeUserProfileExtra,
} = require("../src/middleware/admin");

function createMockReqRes(sessionUser = null, headers = {}) {
  const req = {
    session: sessionUser ? { user: sessionUser } : {},
    headers: headers,
    get(h) { return this.headers[h.toLowerCase()] || this.headers[h]; }
  };
  let statusCode = 200;
  let jsonBody = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  return { req, res, next, getStatus: () => statusCode, getJson: () => jsonBody, isNext: () => nextCalled };
}

// 1. Test requireAuth
const unauth = createMockReqRes(null);
requireAuth(unauth.req, unauth.res, unauth.next);
assert.strictEqual(unauth.getStatus(), 401, "Unauthenticated request should return 401");
assert.strictEqual(unauth.isNext(), false, "next() should not be called on 401");

const authUser = createMockReqRes({ id: 1, username: "test_user", is_admin: false });
requireAuth(authUser.req, authUser.res, authUser.next);
assert.strictEqual(authUser.isNext(), true, "next() should be called for authenticated user");

// 2. Test requireAdmin
const nonAdmin = createMockReqRes({ id: 2, username: "regular_user", is_admin: false, is_superadmin: false });
requireAdmin(nonAdmin.req, nonAdmin.res, nonAdmin.next);
assert.strictEqual(nonAdmin.getStatus(), 403, "Non-admin should return 403");

const adminUser = createMockReqRes({ id: 3, username: "admin_user", is_admin: true });
requireAdmin(adminUser.req, adminUser.res, adminUser.next);
assert.strictEqual(adminUser.isNext(), true, "Admin user should pass requireAdmin");

// 3. Test sanitizePublicUser
const rawUser = {
  id: 10,
  username: "0000-0001-2345-6789",
  reputation: 150,
  joined_at: "2026-01-01",
  extra: JSON.stringify({
    name: "Dr. Marine",
    is_admin: true,
    is_superadmin: true,
    is_banned: true,
    ban_reason: "spam"
  })
};
const clean = sanitizePublicUser(rawUser);
assert.strictEqual(clean.id, 10);
assert.strictEqual(clean.name, "Dr. Marine");
assert.strictEqual(clean.reputation, 150);
assert.strictEqual(clean.is_admin, undefined, "is_admin must not be exposed");
assert.strictEqual(clean.is_superadmin, undefined, "is_superadmin must not be exposed");
assert.strictEqual(clean.is_banned, undefined, "is_banned must not be exposed");
assert.strictEqual(clean.ban_reason, undefined, "ban_reason must not be exposed");

// 4. Test sanitizeUserProfileExtra
const sanitizedExtra = JSON.parse(sanitizeUserProfileExtra(rawUser.extra));
assert.strictEqual(sanitizedExtra.name, "Dr. Marine");
assert.strictEqual(sanitizedExtra.is_admin, undefined);
assert.strictEqual(sanitizedExtra.is_superadmin, undefined);
assert.strictEqual(sanitizedExtra.is_banned, undefined);

console.log("✓ Task 1 Middleware & Helper tests passed!");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/tests/security_auth_enforcement.test.js`  
Expected: FAIL (functions missing or returning unexpected results)

- [ ] **Step 3: Update `backend/src/middleware/admin.js` with sanitization and context verification**

```javascript
// backend/src/middleware/admin.js
const config = require('../config');

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

/**
 * Middleware to require admin privileges
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = req.session.user;
  if (!user.is_admin && !user.is_superadmin && !user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
}

/**
 * Middleware to require superadmin privileges
 */
function requireSuperAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!req.session.user.is_superadmin) {
    return res.status(403).json({ error: 'Superadmin privileges required' });
  }
  
  next();
}

/**
 * Middleware to ensure request originated from legitimate browser web context
 */
function requireBrowserContext(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const origin = req.get('origin');
  const referer = req.get('referer');
  const secFetchSite = req.get('sec-fetch-site');

  // If origin/referer is present, verify against configured domain
  if (origin && config.frontendUrl && !origin.startsWith(config.frontendUrl.replace(/\/$/, ''))) {
    // In dev environments, also allow localhost/127.0.0.1
    if (config.isProd) {
      return res.status(403).json({ error: 'Cross-origin browser request rejected' });
    }
  }

  // Reject untrusted cross-site fetches
  if (secFetchSite === 'cross-site') {
    return res.status(403).json({ error: 'Cross-site request blocked' });
  }

  next();
}

/**
 * Sanitize public user objects
 */
function sanitizePublicUser(user) {
  if (!user) return null;
  let parsedExtra = {};
  if (typeof user.extra === 'string') {
    try {
      parsedExtra = JSON.parse(user.extra);
    } catch (e) {
      parsedExtra = {};
    }
  } else if (typeof user.extra === 'object' && user.extra !== null) {
    parsedExtra = user.extra;
  }

  const displayName = parsedExtra.name || user.username;
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0ea5e9&color=fff`;

  return {
    id: user.id,
    username: user.username,
    name: displayName,
    reputation: user.reputation || 0,
    joined_at: user.joined_at,
    avatar: user.avatar || avatar,
    extra: JSON.stringify({
      name: displayName,
      nativeLanguage: parsedExtra.nativeLanguage || '',
      translationLanguages: parsedExtra.translationLanguages || [],
      pinnedAchievements: parsedExtra.pinnedAchievements || [],
    })
  };
}

/**
 * Sanitize user profile extra JSON string
 */
function sanitizeUserProfileExtra(extraStrOrObj) {
  let extra = {};
  if (typeof extraStrOrObj === 'string') {
    try {
      extra = JSON.parse(extraStrOrObj);
    } catch (e) {
      extra = {};
    }
  } else if (typeof extraStrOrObj === 'object' && extraStrOrObj !== null) {
    extra = extraStrOrObj;
  }

  const clean = {
    name: extra.name || '',
    nativeLanguage: extra.nativeLanguage || '',
    translationLanguages: extra.translationLanguages || [],
    pinnedAchievements: extra.pinnedAchievements || [],
  };

  return JSON.stringify(clean);
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireBrowserContext,
  sanitizePublicUser,
  sanitizeUserProfileExtra,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/tests/security_auth_enforcement.test.js`  
Expected: PASS (`✓ Task 1 Middleware & Helper tests passed!`)

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/admin.js backend/tests/security_auth_enforcement.test.js
git commit -m "feat(security): add requireBrowserContext and user sanitization helpers"
```

---

### Task 2: Term Creation & Edit Authentication & Attribution

**Files:**
- Create: `backend/src/db/migrations/036_term_attribution.sql`
- Modify: `backend/src/routes/terms.routes.js`
- Test: `backend/tests/security_auth_enforcement.test.js`

**Interfaces:**
- `POST /api/terms`: Guarded by `requireAdmin, writeLimiter`. Sets `created_by_id`, inserts into `user_activity`.
- `PUT /api/terms/:id`: Guarded by `requireAuth, requireBrowserContext, writeLimiter`.
- `POST /api/user-reputation/:username`: Guarded by `requireAdmin, writeLimiter`.

- [ ] **Step 1: Write migration for `created_by_id` in terms table**

```sql
-- backend/src/db/migrations/036_term_attribution.sql
-- Add created_by_id column to terms table if not present
ALTER TABLE terms ADD COLUMN created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Add test assertions for terms endpoints in `security_auth_enforcement.test.js`**

```javascript
// Add to backend/tests/security_auth_enforcement.test.js
const termsRoutes = require("../src/routes/terms.routes");
// Test route stack has requireAdmin for /terms POST and requireAuth for /terms/:id PUT
```

- [ ] **Step 3: Update `backend/src/routes/terms.routes.js`**
  - Import `{ requireAuth, requireAdmin, requireBrowserContext }` from `../middleware/admin`.
  - Update `POST /terms`:
    ```javascript
    router.post("/terms", requireAdmin, writeLimiter, (req, res) => {
      const { uri } = req.body;
      if (!uri) return res.status(400).json({ error: "Missing uri" });
      try {
        const db = getDatabase();
        const userId = req.session.user.id || req.session.user.user_id;
        const stmt = db.prepare("INSERT INTO terms (uri, created_by_id) VALUES (?, ?)");
        const info = stmt.run(uri, userId || null);
        
        // Log user activity
        if (userId) {
          try {
            db.prepare("INSERT INTO user_activity (user_id, action, term_id, extra) VALUES (?, 'term_created', ?, ?)")
              .run(userId, info.lastInsertRowid, JSON.stringify({ uri }));
          } catch (e) {
            console.error("Failed to log term_created activity:", e.message);
          }
        }
        
        res.status(201).json({ id: info.lastInsertRowid, uri, created_by_id: userId });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    ```
  - Update `PUT /terms/:id`:
    ```javascript
    router.put("/terms/:id", requireAuth, requireBrowserContext, writeLimiter, async (req, res) => {
      const { id } = req.params;
      const { uri, fields } = req.body;
      if (!uri || !Array.isArray(fields)) {
        return res.status(400).json({ error: "Missing uri or fields" });
      }
      const currentUserId = req.session.user.id || req.session.user.user_id;
      // Continue with existing update logic using currentUserId ...
    ```
  - Update `POST /user-reputation/:username`:
    ```javascript
    router.post("/user-reputation/:username", requireAdmin, writeLimiter, (req, res) => {
      // Admin only reputation adjustment logic
    ```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/tests/security_auth_enforcement.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/migrations/036_term_attribution.sql backend/src/routes/terms.routes.js backend/tests/security_auth_enforcement.test.js
git commit -m "feat(security): enforce admin for term creation, auth for term editing, and attribute creator"
```

---

### Task 3: User Directory Protection & Public Data Sanitization

**Files:**
- Modify: `backend/src/routes/teams.routes.js`
- Modify: `backend/src/routes/user.routes.js`
- Modify: `backend/src/routes/flow.routes.js`
- Modify: `frontend/pages/Landing.tsx`
- Modify: `frontend/pages/Leaderboard.tsx`
- Test: `backend/tests/security_auth_enforcement.test.js`

**Interfaces:**
- `GET /api/users`: Guarded by `requireAuth`. Returns sanitized list via `sanitizePublicUser`.
- `GET /api/user/:id`: Returns sanitized `extra` via `sanitizeUserProfileExtra`.
- `GET /api/flow/leaderboard`: Public sanitized contributor leaderboard for Landing & Leaderboard.

- [ ] **Step 1: Add tests for user directory protection and sanitization in `security_auth_enforcement.test.js`**

```javascript
// Test GET /users requires auth and returns clean users
// Test GET /user/:id sanitizes extra field
```

- [ ] **Step 2: Update `backend/src/routes/teams.routes.js`**

```javascript
// backend/src/routes/teams.routes.js
const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter } = require("../middleware/rateLimit");
const { requireAuth, sanitizePublicUser } = require("../middleware/admin");

router.get("/users", requireAuth, apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const users = db
      .prepare("SELECT id, username, reputation, joined_at, extra FROM users")
      .all();
    const sanitized = users.map(u => sanitizePublicUser(u));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 3: Update `backend/src/routes/user.routes.js`**

In `GET /user/:id`:
```javascript
const { sanitizeUserProfileExtra } = require("../middleware/admin");

router.get("/user/:id", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = db
      .prepare("SELECT id, username, reputation, joined_at, extra FROM users WHERE id = ?")
      .get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Sanitize extra field to remove administrative and moderation flags
    user.extra = sanitizeUserProfileExtra(user.extra);
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 4: Update frontend `Landing.tsx` and `Leaderboard.tsx` for resilient public fetching**
  - In `Landing.tsx` and `Leaderboard.tsx`, handle `backendApi.getUsers()` with graceful fallback / sanitized public leaderboard endpoint so anonymous homepage visitors see top contributors without error.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node backend/tests/security_auth_enforcement.test.js`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/teams.routes.js backend/src/routes/user.routes.js backend/src/routes/flow.routes.js frontend/pages/Landing.tsx frontend/pages/Leaderboard.tsx backend/tests/security_auth_enforcement.test.js
git commit -m "feat(security): protect /api/users with auth and sanitize public profile exposures"
```

---

### Task 4: Audit & Route Protection on Associated State-Changing Endpoints

**Files:**
- Modify: `backend/src/routes/tasks.routes.js`
- Modify: `backend/src/routes/sources.routes.js`
- Modify: `backend/src/routes/task-schedulers.routes.js`
- Modify: `backend/src/routes/eventRoutes.js`
- Test: `backend/tests/security_auth_enforcement.test.js`

- [ ] **Step 1: Add route protection tests for tasks, sources, task-schedulers, and events**

- [ ] **Step 2: Update `backend/src/routes/tasks.routes.js`**
  - Add `requireAdmin` to `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`.

- [ ] **Step 3: Update `backend/src/routes/sources.routes.js`**
  - Add `requireAdmin` to `POST /sources`, `PUT /sources/:id`, `DELETE /sources/:id`, `POST /sources/upload`, `POST /sources/:id/sync-terms`, `PUT /sources/:id/config`.

- [ ] **Step 4: Update `backend/src/routes/task-schedulers.routes.js`**
  - Add `requireAdmin` to `POST /task-schedulers`, `PUT /task-schedulers/:id`, `DELETE /task-schedulers/:id`, `POST /task-schedulers/:id/toggle`.

- [ ] **Step 5: Update `backend/src/routes/eventRoutes.js`**
  - Add `requireAdmin` to `POST /events`, `DELETE /events/:id`, `PATCH /events/:id/status`, `PATCH /events/featured`, `POST /events/:id/settle`.
  - Add `requireAuth` to `POST /events/:id/teams`, `POST /events/:id/join`, `POST /users/titles/equip`.

- [ ] **Step 6: Run test suite**

Run: `node backend/tests/security_auth_enforcement.test.js`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/tasks.routes.js backend/src/routes/sources.routes.js backend/src/routes/task-schedulers.routes.js backend/src/routes/eventRoutes.js backend/tests/security_auth_enforcement.test.js
git commit -m "feat(security): enforce admin authorization on tasks, sources, schedulers, and events"
```

---

### Task 5: End-to-End Regression & Vulnerability Verification

**Files:**
- Modify: `backend/tests/security_auth_enforcement.test.js`
- Modify: `backend/tests/event_rewards.test.js` (fix test isolation/join_code uniqueness)

- [ ] **Step 1: Add full integration tests simulating the reporter's exact reproduction steps**
  - Test Step 1: Send `POST /api/terms` with `{"uri":"https://vliz-sectest.example/x"}` without session -> verify `401 Unauthorized`.
  - Test Step 2: Send `GET /api/users` without session -> verify `401 Unauthorized`.
  - Test Step 3: Login as non-admin user -> `POST /api/terms` -> verify `403 Forbidden`.
  - Test Step 4: Login as admin user -> `POST /api/terms` -> verify `201 Created` with `id`, `uri`, and `created_by_id`.
  - Test Step 5: Verify record exists in `terms` and audit log in `user_activity`.

- [ ] **Step 2: Run all backend tests**

Run: `npm test`  
Expected: All test suites PASS without error.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/
git commit -m "test(security): add comprehensive verification suite reproducing reporter scenarios"
```
