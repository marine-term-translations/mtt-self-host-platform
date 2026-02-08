// Task schedulers routes - handles CRUD operations for scheduled tasks

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");
const { requireAdmin } = require("../middleware/admin");
const datetime = require("../utils/datetime");

/**
 * @openapi
 * /api/task-schedulers:
 *   get:
 *     summary: List all task schedulers with pagination
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of schedulers to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of schedulers to skip
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Filter by enabled status
 *     responses:
 *       200:
 *         description: Returns paginated schedulers
 */
router.get("/task-schedulers", requireAdmin, apiLimiter, (req, res) => {
  // SECURITY FIX: Added requireAdmin middleware
  try {
    const db = getDatabase();
    
    let limit = parseInt(req.query.limit) || 50;
    let offset = parseInt(req.query.offset) || 0;
    
    if (limit < 1) limit = 50;
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;
    
    // Build WHERE clause based on filters
    const filters = [];
    const params = [];
    
    if (req.query.enabled !== undefined) {
      const enabled = parseInt(req.query.enabled);
      if (enabled === 0 || enabled === 1) {
        filters.push("enabled = ?");
        params.push(enabled);
      }
    }
    
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    
    const totalCount = db.prepare(
      `SELECT COUNT(*) as count FROM task_schedulers ${whereClause}`
    ).get(...params).count;
    
    const schedulers = db.prepare(
      `SELECT * FROM task_schedulers ${whereClause} ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);
    
    res.json({
      schedulers,
      total: totalCount,
      limit,
      offset
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/task-schedulers/{id}:
 *   get:
 *     summary: Get a single task scheduler by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The scheduler ID
 *     responses:
 *       200:
 *         description: Returns the scheduler
 *       404:
 *         description: Scheduler not found
 */
router.get("/task-schedulers/:id", requireAdmin, apiLimiter, (req, res) => {
  // SECURITY FIX: Added requireAdmin middleware
  const { id } = req.params;
  
  const schedulerId = parseInt(id, 10);
  if (isNaN(schedulerId) || schedulerId < 1) {
    return res.status(400).json({ error: "Invalid scheduler ID" });
  }
  
  try {
    const db = getDatabase();
    const scheduler = db.prepare(
      "SELECT * FROM task_schedulers WHERE scheduler_id = ?"
    ).get(schedulerId);
    
    if (!scheduler) {
      return res.status(404).json({ error: "Scheduler not found" });
    }
    
    res.json(scheduler);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/task-schedulers:
 *   post:
 *     summary: Create a new task scheduler
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - task_type
 *               - schedule_config
 *             properties:
 *               name:
 *                 type: string
 *               task_type:
 *                 type: string
 *                 enum: [file_upload, ldes_sync, ldes_feed, triplestore_sync, harvest, other]
 *               schedule_config:
 *                 type: string
 *                 description: JSON string with cron expression or interval config
 *               enabled:
 *                 type: integer
 *                 enum: [0, 1]
 *                 default: 1
 *               source_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Scheduler created successfully
 */
router.post("/task-schedulers", requireAdmin, writeLimiter, (req, res) => {
  // SECURITY FIX: Added requireAdmin middleware
  const { name, task_type, schedule_config, enabled, source_id } = req.body;
  
  if (!name || !task_type || !schedule_config) {
    return res.status(400).json({ 
      error: "Missing required fields: name, task_type, and schedule_config are required" 
    });
  }
  
  const validTypes = ['file_upload', 'ldes_sync', 'ldes_feed', 'triplestore_sync', 'harvest', 'other'];
  if (!validTypes.includes(task_type)) {
    return res.status(400).json({ error: "Invalid task_type" });
  }
  
  // Validate schedule_config is valid JSON
  let parsedConfig;
  try {
    parsedConfig = JSON.parse(schedule_config);
  } catch (e) {
    return res.status(400).json({ error: "schedule_config must be valid JSON" });
  }
  
  try {
    const db = getDatabase();
    
    const created_by = req.session?.user?.username || null;
    const enabledValue = enabled !== undefined ? (enabled ? 1 : 0) : 1;
    
    // Calculate initial next_run time if scheduler is enabled
    let next_run = null;
    if (enabledValue === 1) {
      // Set next_run to now so it triggers immediately on first check
      next_run = datetime.format(datetime.now(), 'YYYY-MM-DD HH:mm:ss');
    }
    
    const stmt = db.prepare(
      `INSERT INTO task_schedulers (name, task_type, schedule_config, enabled, source_id, created_by, next_run) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(name, task_type, schedule_config, enabledValue, source_id || null, created_by, next_run);
    
    const scheduler = db.prepare(
      "SELECT * FROM task_schedulers WHERE scheduler_id = ?"
    ).get(info.lastInsertRowid);
    
    res.status(201).json(scheduler);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/task-schedulers/{id}:
 *   put:
 *     summary: Update a task scheduler
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The scheduler ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               task_type:
 *                 type: string
 *               schedule_config:
 *                 type: string
 *               enabled:
 *                 type: integer
 *               source_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Scheduler updated successfully
 */
router.put("/task-schedulers/:id", requireAdmin, writeLimiter, (req, res) => {
  // SECURITY FIX: Added requireAdmin middleware
  const { id } = req.params;
  const { name, task_type, schedule_config, enabled, source_id } = req.body;
  
  const schedulerId = parseInt(id, 10);
  if (isNaN(schedulerId) || schedulerId < 1) {
    return res.status(400).json({ error: "Invalid scheduler ID" });
  }
  
  try {
    const db = getDatabase();
    
    const existing = db.prepare(
      "SELECT * FROM task_schedulers WHERE scheduler_id = ?"
    ).get(schedulerId);
    
    if (!existing) {
      return res.status(404).json({ error: "Scheduler not found" });
    }
    
    // Build update query
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    
    if (task_type !== undefined) {
      const validTypes = ['file_upload', 'ldes_sync', 'ldes_feed', 'triplestore_sync', 'harvest', 'other'];
      if (!validTypes.includes(task_type)) {
        return res.status(400).json({ error: "Invalid task_type" });
      }
      updates.push("task_type = ?");
      params.push(task_type);
    }
    
    if (schedule_config !== undefined) {
      try {
        JSON.parse(schedule_config);
      } catch (e) {
        return res.status(400).json({ error: "schedule_config must be valid JSON" });
      }
      updates.push("schedule_config = ?");
      params.push(schedule_config);
    }
    
    if (enabled !== undefined) {
      const enabledValue = enabled ? 1 : 0;
      updates.push("enabled = ?");
      params.push(enabledValue);
    }
    
    if (source_id !== undefined) {
      updates.push("source_id = ?");
      params.push(source_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(schedulerId);
    
    db.prepare(
      `UPDATE task_schedulers SET ${updates.join(', ')} WHERE scheduler_id = ?`
    ).run(...params);
    
    const updated = db.prepare(
      "SELECT * FROM task_schedulers WHERE scheduler_id = ?"
    ).get(schedulerId);
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/task-schedulers/{id}:
 *   delete:
 *     summary: Delete a task scheduler
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The scheduler ID
 *     responses:
 *       200:
 *         description: Scheduler deleted successfully
 */
router.delete("/task-schedulers/:id", requireAdmin, writeLimiter, (req, res) => {
  // SECURITY FIX: Added requireAdmin middleware
  const { id } = req.params;
  
  const schedulerId = parseInt(id, 10);
  if (isNaN(schedulerId) || schedulerId < 1) {
    return res.status(400).json({ error: "Invalid scheduler ID" });
  }
  
  try {
    const db = getDatabase();
    
    const existing = db.prepare(
      "SELECT * FROM task_schedulers WHERE scheduler_id = ?"
    ).get(schedulerId);
    
    if (!existing) {
      return res.status(404).json({ error: "Scheduler not found" });
    }
    
    db.prepare("DELETE FROM task_schedulers WHERE scheduler_id = ?").run(schedulerId);
    
    res.json({ message: "Scheduler deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/task-schedulers/{id}/toggle:
 *   post:
 *     summary: Toggle a scheduler's enabled status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The scheduler ID
 *     responses:
 *       200:
 *         description: Scheduler toggled successfully
 */
router.post("/task-schedulers/:id/toggle", requireAdmin, writeLimiter, (req, res) => {
  // SECURITY FIX: Added requireAdmin middleware
  const { id } = req.params;
  
  const schedulerId = parseInt(id, 10);
  if (isNaN(schedulerId) || schedulerId < 1) {
    return res.status(400).json({ error: "Invalid scheduler ID" });
  }
  
  try {
    const db = getDatabase();
    
    const existing = db.prepare(
      "SELECT * FROM task_schedulers WHERE scheduler_id = ?"
    ).get(schedulerId);
    
    if (!existing) {
      return res.status(404).json({ error: "Scheduler not found" });
    }
    
    const newEnabled = existing.enabled === 1 ? 0 : 1;
    
    // If enabling the scheduler, set next_run to now so it triggers on next check
    if (newEnabled === 1) {
      const next_run = datetime.format(datetime.now(), 'YYYY-MM-DD HH:mm:ss');
      db.prepare(
        "UPDATE task_schedulers SET enabled = ?, next_run = ?, updated_at = CURRENT_TIMESTAMP WHERE scheduler_id = ?"
      ).run(newEnabled, next_run, schedulerId);
    } else {
      // If disabling, just update enabled flag
      db.prepare(
        "UPDATE task_schedulers SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE scheduler_id = ?"
      ).run(newEnabled, schedulerId);
    }
    
    const updated = db.prepare(
      "SELECT * FROM task_schedulers WHERE scheduler_id = ?"
    ).get(schedulerId);
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
