# Security Fixes Implementation Plan

**Based on:** Zero Trust Security Audit Report  
**Priority:** CRITICAL - Immediate implementation required  
**Target Completion:** 7 days

---

## Phase 1: Critical Authorization Fixes (Day 1-2)

### Fix 1.1: Protect User Reputation Endpoint

**File:** `backend/src/routes/terms.routes.js`  
**Line:** 815

**Current (VULNERABLE):**
```javascript
router.post("/user-reputation/:username", writeLimiter, (req, res) => {
  const { username } = req.params;
  const { delta, reason, translation_id } = req.body;
  // NO AUTHORIZATION CHECK
```

**Fixed:**
```javascript
const { requireAdmin } = require("../middleware/admin");

router.post("/user-reputation/:username", requireAdmin, writeLimiter, (req, res) => {
  const { username } = req.params;
  const { delta, reason, translation_id } = req.body;
  
  // Validate inputs
  if (typeof delta !== "number" || !reason || typeof reason !== "string") {
    return res.status(400).json({ error: "Invalid delta or reason" });
  }
  
  // Limit reputation changes to reasonable values
  const MAX_REPUTATION_CHANGE = 1000;
  if (Math.abs(delta) > MAX_REPUTATION_CHANGE) {
    return res.status(400).json({ 
      error: `Reputation change cannot exceed ${MAX_REPUTATION_CHANGE}` 
    });
  }
  
  try {
    const result = applyReputationChange(username, delta, reason, translation_id || null);
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Audit log
    const db = getDatabase();
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      adminUserId,
      'admin_reputation_change',
      JSON.stringify({ 
        target_username: username, 
        delta, 
        reason,
        translation_id 
      })
    );
    
    res.json({
      username,
      reputation: result.newReputation,
      eventId: result.eventId,
    });
  } catch (err) {
    console.error('[Reputation] Error:', err);
    res.status(500).json({ error: 'Failed to update reputation' });
  }
});
```

**Changes:**
- ✅ Added `requireAdmin` middleware
- ✅ Added input validation
- ✅ Added reputation change limits
- ✅ Added audit logging
- ✅ Added error handling

---

### Fix 1.2: Protect Source Management Endpoints

**File:** `backend/src/routes/sources.routes.js`  
**Lines:** 229, 441, 511, 740

**Current (VULNERABLE):**
```javascript
router.post("/sources", writeLimiter, (req, res) => {
  // NO AUTHENTICATION
  
router.put("/sources/:id", writeLimiter, (req, res) => {
  // NO AUTHENTICATION
  
router.delete("/sources/:id", writeLimiter, async (req, res) => {
  // NO AUTHENTICATION
  
router.post("/sources/upload", writeLimiter, upload.single('file'), async (req, res) => {
  // NO AUTHENTICATION
```

**Fixed:**
```javascript
const { requireAuth, requireAdmin } = require("../middleware/admin");

// Require admin for all source modifications
router.post("/sources", requireAdmin, writeLimiter, (req, res) => {
  const { source_path, source_type, description } = req.body;
  
  if (!source_path || typeof source_path !== 'string') {
    return res.status(400).json({ error: "Invalid source_path" });
  }
  
  // Validate source_type
  const validTypes = ['LDES', 'Static_file'];
  if (source_type && !validTypes.includes(source_type)) {
    return res.status(400).json({ 
      error: `Invalid source_type. Must be one of: ${validTypes.join(', ')}` 
    });
  }
  
  try {
    const db = getDatabase();
    const stmt = db.prepare(
      "INSERT INTO sources (source_path, source_type, description, created_by) VALUES (?, ?, ?, ?)"
    );
    
    const createdBy = req.session.user.id || req.session.user.user_id;
    const info = stmt.run(
      source_path, 
      source_type || 'Static_file', 
      description || null,
      createdBy
    );
    
    const sourceId = info.lastInsertRowid;
    const autoGraphName = `urn:mtt:source:${sourceId}`;
    
    db.prepare("UPDATE sources SET graph_name = ? WHERE source_id = ?")
      .run(autoGraphName, sourceId);
    
    // Audit log
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      createdBy,
      'source_created',
      JSON.stringify({ 
        source_id: sourceId, 
        source_path, 
        source_type 
      })
    );
    
    // ... rest of logic ...
    
    res.status(201).json(source);
  } catch (err) {
    console.error('[Sources] Create error:', err);
    res.status(500).json({ error: 'Failed to create source' });
  }
});

router.put("/sources/:id", requireAdmin, writeLimiter, (req, res) => {
  // Add validation and audit logging similar to above
});

router.delete("/sources/:id", requireAdmin, writeLimiter, async (req, res) => {
  // Add validation and audit logging
  // Consider soft delete instead of hard delete
});

router.post("/sources/upload", requireAdmin, writeLimiter, upload.single('file'), async (req, res) => {
  // Add file scanning, validation, and audit logging
});
```

**Changes:**
- ✅ Added `requireAdmin` middleware to all source endpoints
- ✅ Added input validation
- ✅ Store `created_by` from session (not client)
- ✅ Added audit logging
- ✅ Consider implementing soft delete

**Database Migration Required:**
```sql
-- Add created_by column to sources table
ALTER TABLE sources ADD COLUMN created_by INTEGER REFERENCES users(id);
```

---

### Fix 1.3: Protect Task Management Endpoints

**File:** `backend/src/routes/tasks.routes.js`  
**Lines:** 47, 147, 194, 222

**Fixed:**
```javascript
const { requireAuth, requireAdmin } = require("../middleware/admin");

// Tasks can be created by authenticated users, but only for their own work
router.post("/tasks", requireAuth, writeLimiter, (req, res) => {
  const { task_type, source_id, metadata } = req.body;
  
  // Validate task_type
  const validTypes = ['file_upload', 'ldes_sync', 'triplestore_sync', 'harvest', 'other'];
  if (!task_type || !validTypes.includes(task_type)) {
    return res.status(400).json({ 
      error: `Invalid task_type. Must be one of: ${validTypes.join(', ')}` 
    });
  }
  
  // created_by MUST come from session, not request
  const created_by = req.session.user.id || req.session.user.user_id;
  
  try {
    const db = getDatabase();
    
    // Verify source exists and user has access
    if (source_id) {
      const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(source_id);
      if (!source) {
        return res.status(404).json({ error: "Source not found" });
      }
      
      // Only admin or source creator can create tasks for a source
      const isAdmin = req.session.user.is_admin;
      const isCreator = source.created_by === created_by;
      
      if (!isAdmin && !isCreator) {
        return res.status(403).json({ 
          error: "You don't have permission to create tasks for this source" 
        });
      }
    }
    
    const stmt = db.prepare(
      "INSERT INTO tasks (task_type, source_id, metadata, created_by, status) VALUES (?, ?, ?, ?, ?)"
    );
    const info = stmt.run(task_type, source_id || null, metadata || null, created_by, 'pending');
    
    const task = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(info.lastInsertRowid);
    res.status(201).json(task);
  } catch (err) {
    console.error('[Tasks] Create error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Only creator or admin can update/cancel tasks
router.put("/tasks/:id", requireAuth, writeLimiter, (req, res) => {
  const { id } = req.params;
  const { status, metadata } = req.body;
  
  const taskId = parseInt(id, 10);
  if (isNaN(taskId) || taskId < 1) {
    return res.status(400).json({ error: "Invalid task ID" });
  }
  
  try {
    const db = getDatabase();
    const task = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId);
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    const currentUserId = req.session.user.id || req.session.user.user_id;
    const isAdmin = req.session.user.is_admin;
    const isCreator = task.created_by === currentUserId;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ 
        error: "You don't have permission to update this task" 
      });
    }
    
    // Validate status transitions
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    // Update task
    db.prepare(
      "UPDATE tasks SET status = COALESCE(?, status), metadata = COALESCE(?, metadata) WHERE task_id = ?"
    ).run(status, metadata, taskId);
    
    const updated = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId);
    res.json(updated);
  } catch (err) {
    console.error('[Tasks] Update error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete("/tasks/:id", requireAuth, writeLimiter, (req, res) => {
  // Similar authorization check as update
});
```

**Changes:**
- ✅ Added `requireAuth` middleware
- ✅ Removed `created_by` from request body
- ✅ Use session user ID instead
- ✅ Added ownership validation
- ✅ Admin override capability
- ✅ Input validation

---

### Fix 1.4: Protect Task Scheduler Endpoints

**File:** `backend/src/routes/task-schedulers.routes.js`

**Fixed:**
```javascript
const { requireAdmin } = require("../middleware/admin");

// All scheduler operations require admin
router.get("/task-schedulers", requireAdmin, apiLimiter, (req, res) => {
  // existing logic
});

router.get("/task-schedulers/:id", requireAdmin, apiLimiter, (req, res) => {
  // existing logic
});

router.post("/task-schedulers", requireAdmin, writeLimiter, (req, res) => {
  const { schedule, task_type, source_id, metadata, enabled } = req.body;
  
  // Validate cron expression
  if (!schedule || typeof schedule !== 'string') {
    return res.status(400).json({ error: "Invalid schedule" });
  }
  
  // Validate cron expression format (basic check)
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  
  if (!cronRegex.test(schedule)) {
    return res.status(400).json({ error: "Invalid cron expression" });
  }
  
  // Rest of logic with audit logging
  const created_by = req.session.user.id || req.session.user.user_id;
  
  // ... create scheduler ...
  
  // Audit log
  const db = getDatabase();
  db.prepare(
    'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
  ).run(
    created_by,
    'scheduler_created',
    JSON.stringify({ scheduler_id: info.lastInsertRowid, schedule, task_type })
  );
});

router.put("/task-schedulers/:id", requireAdmin, writeLimiter, (req, res) => {
  // Add validation and audit logging
});

router.delete("/task-schedulers/:id", requireAdmin, writeLimiter, (req, res) => {
  // Add validation and audit logging
});

router.post("/task-schedulers/:id/toggle", requireAdmin, writeLimiter, (req, res) => {
  // Add validation and audit logging
});
```

**Changes:**
- ✅ Added `requireAdmin` to ALL endpoints
- ✅ Added cron expression validation
- ✅ Added audit logging
- ✅ Prevent scheduler abuse

---

### Fix 1.5: Protect Appeal Creation and Updates

**File:** `backend/src/routes/appeals.routes.js`  
**Lines:** 33, 177, 331

**Fixed:**
```javascript
const { requireAuth } = require("../middleware/admin");

// Remove opened_by from request, use session instead
router.post("/appeals", requireAuth, writeLimiter, (req, res) => {
  const { translation_id, resolution } = req.body;
  
  if (!translation_id) {
    return res.status(400).json({ error: "Missing translation_id" });
  }
  
  // Get current user from session (NEVER from request body)
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  try {
    const db = getDatabase();
    
    // Verify translation exists
    const translation = db.prepare("SELECT * FROM translations WHERE id = ?").get(translation_id);
    if (!translation) {
      return res.status(404).json({ error: "Translation not found" });
    }
    
    // Check if user already has an open appeal for this translation
    const existingAppeal = db.prepare(
      "SELECT id FROM appeals WHERE translation_id = ? AND opened_by_id = ? AND status = 'open'"
    ).get(translation_id, currentUserId);
    
    if (existingAppeal) {
      return res.status(409).json({ 
        error: "You already have an open appeal for this translation" 
      });
    }
    
    const stmt = db.prepare(
      "INSERT INTO appeals (translation_id, opened_by_id, resolution) VALUES (?, ?, ?)"
    );
    const info = stmt.run(translation_id, currentUserId, resolution || null);
    
    res.status(201).json({ 
      id: info.lastInsertRowid, 
      translation_id, 
      opened_by_id: currentUserId,
      resolution 
    });
  } catch (err) {
    console.error("Error creating appeal:", err.message);
    res.status(500).json({ error: "Failed to create appeal" });
  }
});

// Remove username from request, use session and verify ownership
router.patch("/appeals/:id", requireAuth, writeLimiter, (req, res) => {
  const { id } = req.params;
  const { status, resolution } = req.body;
  
  if (!status && !resolution) {
    return res.status(400).json({ error: "Missing status or resolution" });
  }
  
  const appealId = parseInt(id, 10);
  if (isNaN(appealId) || appealId < 1) {
    return res.status(400).json({ error: "Invalid appeal ID" });
  }
  
  try {
    const db = getDatabase();
    const appeal = db.prepare("SELECT * FROM appeals WHERE id = ?").get(appealId);
    
    if (!appeal) {
      return res.status(404).json({ error: "Appeal not found" });
    }
    
    const currentUserId = req.session.user.id || req.session.user.user_id;
    const isAdmin = req.session.user.is_admin;
    const isOwner = appeal.opened_by_id === currentUserId;
    
    // Only owner or admin can update appeal
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        error: "You don't have permission to update this appeal" 
      });
    }
    
    // Validate status
    const validStatuses = ['open', 'closed', 'resolved'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const stmt = db.prepare(
      `UPDATE appeals 
       SET status = COALESCE(?, status), 
           resolution = COALESCE(?, resolution), 
           closed_at = CASE WHEN ? IN ('closed', 'resolved') THEN CURRENT_TIMESTAMP ELSE closed_at END 
       WHERE id = ?`
    );
    stmt.run(status, resolution, status, appealId);
    
    const updated = db.prepare("SELECT * FROM appeals WHERE id = ?").get(appealId);
    res.json(updated);
  } catch (err) {
    console.error("Error updating appeal:", err.message);
    res.status(500).json({ error: "Failed to update appeal" });
  }
});

// Add authorization for posting messages
router.post("/appeals/:id/messages", requireAuth, writeLimiter, (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  
  const appealId = parseInt(id, 10);
  if (isNaN(appealId) || appealId < 1) {
    return res.status(400).json({ error: "Invalid appeal ID" });
  }
  
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required" });
  }
  
  // Limit message length
  const MAX_MESSAGE_LENGTH = 5000;
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ 
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` 
    });
  }
  
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  try {
    const db = getDatabase();
    
    // Get appeal with translation info
    const appeal = db.prepare(`
      SELECT a.*, t.username as translation_author 
      FROM appeals a
      JOIN translations tr ON a.translation_id = tr.id
      LEFT JOIN users t ON tr.username = t.username
      WHERE a.id = ?
    `).get(appealId);
    
    if (!appeal) {
      return res.status(404).json({ error: "Appeal not found" });
    }
    
    // Verify user is allowed to post (appeal owner, translation author, or admin)
    const isAdmin = req.session.user.is_admin;
    const isAppealOwner = appeal.opened_by_id === currentUserId;
    const isTranslationAuthor = appeal.translation_author === req.session.user.username;
    
    if (!isAdmin && !isAppealOwner && !isTranslationAuthor) {
      return res.status(403).json({ 
        error: "You don't have permission to post messages to this appeal" 
      });
    }
    
    // Rate limit: max 10 messages per user per appeal per hour
    const recentMessages = db.prepare(`
      SELECT COUNT(*) as count 
      FROM appeal_messages 
      WHERE appeal_id = ? 
        AND author_id = ? 
        AND created_at > datetime('now', '-1 hour')
    `).get(appealId, currentUserId).count;
    
    if (recentMessages >= 10) {
      return res.status(429).json({ 
        error: "Too many messages. Please wait before posting again." 
      });
    }
    
    // Insert the message
    const stmt = db.prepare(
      "INSERT INTO appeal_messages (appeal_id, author_id, message) VALUES (?, ?, ?)"
    );
    const info = stmt.run(appealId, currentUserId, message.trim());
    
    const createdMessage = db.prepare(`
      SELECT 
        am.id,
        am.appeal_id,
        am.author_id,
        am.message,
        am.created_at,
        u.username as author_username
      FROM appeal_messages am
      LEFT JOIN users u ON am.author_id = u.id
      WHERE am.id = ?
    `).get(info.lastInsertRowid);
    
    res.status(201).json(createdMessage);
  } catch (err) {
    console.error("Error creating appeal message:", err.message);
    res.status(500).json({ error: "Failed to create message" });
  }
});
```

**Changes:**
- ✅ Removed `opened_by` and `username` from request body
- ✅ Use `req.session.user.id` directly
- ✅ Added ownership validation
- ✅ Added authorization for message posting
- ✅ Added rate limiting per user per appeal
- ✅ Added message length validation
- ✅ Prevent duplicate open appeals

---

## Phase 2: Flow and SPARQL Protection (Day 3)

### Fix 2.1: Protect Flow Endpoints

**File:** `backend/src/routes/flow.routes.js`

**Current:** Documentation claims authentication required, but no middleware enforced

**Fixed:**
```javascript
const { requireAuth } = require("../middleware/admin");

router.post("/flow/start", requireAuth, writeLimiter, flowController.startFlow);
router.get("/flow/next", requireAuth, apiLimiter, flowController.getNextTask);
router.post("/flow/review", requireAuth, writeLimiter, flowController.submitReview);
router.get("/flow/stats", requireAuth, apiLimiter, flowController.getStats);
router.get("/flow/languages", requireAuth, apiLimiter, flowController.getLanguages);
router.post("/flow/session/end", requireAuth, writeLimiter, flowController.endSession);
router.get("/flow/leaderboard", apiLimiter, flowController.getLeaderboard); // Can be public
```

**Changes:**
- ✅ Added `requireAuth` to all flow endpoints except public leaderboard
- ✅ Validate session ownership in controller methods

---

### Fix 2.2: Protect SPARQL Endpoints

**File:** `backend/src/routes/sparql.routes.js`

**Fixed:**
```javascript
const { requireAuth, requireAdmin } = require("../middleware/admin");

// Read operations require authentication
router.get("/sparql/predefined", requireAuth, apiLimiter, (req, res) => {
  // existing logic
});

router.get("/sparql/health", apiLimiter, async (req, res) => {
  // Can be public for monitoring
});

// Write operations require admin
router.post("/sparql/execute", requireAuth, writeLimiter, async (req, res) => {
  const { query } = req.body;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: "Invalid query" });
  }
  
  // Parse query to detect write operations
  const writeOperations = ['INSERT', 'DELETE', 'DROP', 'CREATE', 'CLEAR', 'LOAD', 'COPY', 'MOVE', 'ADD'];
  const queryUpper = query.toUpperCase();
  const hasWriteOp = writeOperations.some(op => queryUpper.includes(op));
  
  // Require admin for write operations
  if (hasWriteOp && !req.session.user.is_admin) {
    return res.status(403).json({ 
      error: "Admin privileges required for write operations" 
    });
  }
  
  // Limit query size
  const MAX_QUERY_LENGTH = 10000;
  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ 
      error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` 
    });
  }
  
  try {
    // Audit log for write operations
    if (hasWriteOp) {
      const db = getDatabase();
      const userId = req.session.user.id || req.session.user.user_id;
      db.prepare(
        'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
      ).run(
        userId,
        'sparql_write_query',
        JSON.stringify({ query: query.substring(0, 500) }) // Log truncated query
      );
    }
    
    // Execute query
    // ... existing logic ...
  } catch (err) {
    console.error('[SPARQL] Query error:', err);
    res.status(500).json({ error: 'Query execution failed' });
  }
});

// Custom queries should be admin-only or very restricted
router.post("/sparql/custom", requireAdmin, writeLimiter, async (req, res) => {
  // Similar validation and logging as above
});
```

**Changes:**
- ✅ Added `requireAuth` for read operations
- ✅ Added `requireAdmin` for custom queries
- ✅ Detect and restrict write operations
- ✅ Added query size limits
- ✅ Added audit logging for writes

---

## Phase 3: Additional Security Hardening (Day 4-5)

### Fix 3.1: Implement Comprehensive Audit Logging

**Create new file:** `backend/src/middleware/auditLog.js`

```javascript
const { getDatabase } = require("../db/database");

/**
 * Middleware to log all admin actions
 */
function auditLog(action) {
  return (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Wrap response to log after successful completion
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAction(req, action, data);
      }
      originalJson.call(this, data);
    };
    
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAction(req, action, data);
      }
      originalSend.call(this, data);
    };
    
    next();
  };
}

function logAction(req, action, responseData) {
  try {
    const db = getDatabase();
    const userId = req.session?.user?.id || req.session?.user?.user_id;
    const username = req.session?.user?.username;
    
    const extra = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      params: req.params,
      query: req.query,
      body: sanitizeBody(req.body),
      responseStatus: res.statusCode,
    };
    
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      userId,
      action,
      JSON.stringify(extra)
    );
  } catch (err) {
    console.error('[Audit Log] Failed to log action:', err);
    // Don't fail the request if logging fails
  }
}

function sanitizeBody(body) {
  // Remove sensitive fields from logs
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.api_key;
  delete sanitized.openrouter_key;
  return sanitized;
}

module.exports = { auditLog };
```

**Usage:**
```javascript
const { auditLog } = require("../middleware/auditLog");

router.post("/sources", requireAdmin, auditLog('source_created'), writeLimiter, (req, res) => {
  // handler
});

router.delete("/sources/:id", requireAdmin, auditLog('source_deleted'), writeLimiter, (req, res) => {
  // handler
});
```

---

### Fix 3.2: Implement Per-User Rate Limiting

**Update file:** `backend/src/middleware/rateLimit.js`

```javascript
const rateLimit = require("express-rate-limit");

// Store for user-based rate limiting
const userRateLimitStore = new Map();

/**
 * Per-user rate limiter
 */
function createUserRateLimit(options) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      const userId = req.session?.user?.id || req.session?.user?.user_id;
      return userId ? `user:${userId}` : `ip:${req.ip}`;
    },
    handler: (req, res) => {
      const userId = req.session?.user?.id;
      console.warn(`[Rate Limit] User ${userId} exceeded rate limit`);
      res.status(429).json({
        error: "Too many requests, please try again later"
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// Specific limiters
const writeLimiterPerUser = createUserRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 writes per 15 minutes per user
});

const apiLimiterPerUser = createUserRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 reads per 15 minutes per user
});

module.exports = {
  apiLimiter: apiLimiterPerUser,
  writeLimiter: writeLimiterPerUser,
  // ... other limiters
};
```

---

### Fix 3.3: Add CSRF Protection

**Update file:** `backend/src/app.js`

```javascript
const csrf = require('csurf');

// CSRF protection middleware (after session middleware)
const csrfProtection = csrf({
  cookie: false, // Use session storage
  value: (req) => {
    // Get CSRF token from header or body
    return req.headers['x-csrf-token'] || req.body._csrf;
  }
});

// Apply CSRF protection to state-changing routes
app.use((req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for auth routes (OAuth callback)
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }
  
  // Apply CSRF protection
  csrfProtection(req, res, next);
});

// Endpoint to get CSRF token
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Frontend integration:**
```javascript
// Fetch CSRF token on app load
const csrfToken = await fetch('/api/csrf-token').then(r => r.json());

// Include in all POST/PUT/DELETE requests
fetch('/api/sources', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken.csrfToken
  },
  body: JSON.stringify(data)
});
```

---

## Phase 4: Testing and Validation (Day 6-7)

### Test 4.1: Create Security Test Suite

**Create file:** `backend/src/__tests__/security.test.js`

```javascript
const request = require('supertest');
const app = require('../app');

describe('Security Tests', () => {
  describe('Authorization Tests', () => {
    it('should reject unauthenticated source creation', async () => {
      const res = await request(app)
        .post('/api/sources')
        .send({ source_path: 'test' });
      
      expect(res.status).toBe(401);
    });
    
    it('should reject non-admin reputation changes', async () => {
      // TODO: Create authenticated session without admin
      const res = await request(app)
        .post('/api/user-reputation/testuser')
        .send({ delta: 100, reason: 'test' });
      
      expect(res.status).toBe(403);
    });
    
    it('should reject task creation with client-supplied created_by', async () => {
      // TODO: Create authenticated session
      const res = await request(app)
        .post('/api/tasks')
        .send({ 
          task_type: 'harvest',
          created_by: 'different_user' // Should be ignored
        });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('Input Validation Tests', () => {
    it('should reject invalid SPARQL queries', async () => {
      // TODO: Create authenticated session
      const res = await request(app)
        .post('/api/sparql/execute')
        .send({ query: 'x'.repeat(20000) }); // Exceeds limit
      
      expect(res.status).toBe(400);
    });
    
    it('should reject invalid cron expressions', async () => {
      // TODO: Create admin session
      const res = await request(app)
        .post('/api/task-schedulers')
        .send({ 
          schedule: 'invalid',
          task_type: 'harvest'
        });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('Rate Limiting Tests', () => {
    it('should enforce per-user rate limits', async () => {
      // TODO: Create authenticated session
      // Make 101 requests rapidly
      const promises = [];
      for (let i = 0; i < 101; i++) {
        promises.push(
          request(app).post('/api/sources').send({ source_path: 'test' })
        );
      }
      
      const results = await Promise.all(promises);
      const rateLimited = results.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Implementation Checklist

### Day 1-2: Critical Fixes
- [ ] Add `requireAdmin` to reputation endpoint
- [ ] Add `requireAdmin` to all source endpoints
- [ ] Add `requireAuth` to all task endpoints
- [ ] Add `requireAdmin` to all scheduler endpoints
- [ ] Fix appeal creation (remove `opened_by` from request)
- [ ] Fix appeal updates (remove `username` from request)
- [ ] Add ownership validation to appeals
- [ ] Add database migration for `sources.created_by`

### Day 3: Flow and SPARQL
- [ ] Add `requireAuth` to all flow endpoints
- [ ] Add SPARQL query validation
- [ ] Detect and restrict SPARQL write operations
- [ ] Add audit logging for SPARQL writes

### Day 4-5: Security Hardening
- [ ] Implement audit logging middleware
- [ ] Add audit logging to all admin operations
- [ ] Implement per-user rate limiting
- [ ] Add CSRF protection
- [ ] Add input validation helpers
- [ ] Add message length limits

### Day 6-7: Testing
- [ ] Write security test suite
- [ ] Test all authorization checks
- [ ] Test input validation
- [ ] Test rate limiting
- [ ] Run penetration tests
- [ ] Document findings

### Ongoing
- [ ] Monitor audit logs
- [ ] Review security alerts
- [ ] Update dependencies
- [ ] Regular security audits

---

## Database Migrations Required

```sql
-- Migration 001: Add created_by to sources
ALTER TABLE sources ADD COLUMN created_by INTEGER REFERENCES users(id);

-- Migration 002: Add indexes for performance
CREATE INDEX idx_sources_created_by ON sources(created_by);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at);

-- Migration 003: Add appeal rate limiting
CREATE TABLE IF NOT EXISTS appeal_message_rate_limit (
  user_id INTEGER NOT NULL,
  appeal_id INTEGER NOT NULL,
  message_count INTEGER DEFAULT 0,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, appeal_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (appeal_id) REFERENCES appeals(id)
);
```

---

## Deployment Plan

1. **Backup database** before any changes
2. **Deploy to staging** environment first
3. **Run database migrations**
4. **Deploy code changes**
5. **Run security tests**
6. **Monitor logs** for errors
7. **Deploy to production** after validation
8. **Monitor for 48 hours**
9. **Document any issues**

---

## Rollback Plan

If issues occur:
1. Revert code deployment
2. Restore database backup if needed
3. Investigate issues
4. Fix and redeploy to staging
5. Retest before production

---

## Success Criteria

- [ ] All critical vulnerabilities fixed
- [ ] All security tests passing
- [ ] No unauthorized access possible
- [ ] Audit logs capturing all admin actions
- [ ] Rate limiting preventing abuse
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints
- [ ] Documentation updated
- [ ] Team trained on new security measures

---

**End of Implementation Plan**
