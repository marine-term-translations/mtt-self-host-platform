// Tasks routes - handles CRUD operations for background tasks

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: List all tasks with pagination and filtering
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed, cancelled]
 *         description: Filter by task status
 *       - in: query
 *         name: task_type
 *         schema:
 *           type: string
 *           enum: [file_upload, ldes_sync, triplestore_sync, harvest, other]
 *         description: Filter by task type
 *       - in: query
 *         name: source_id
 *         schema:
 *           type: integer
 *         description: Filter by source ID
 *     responses:
 *       200:
 *         description: Returns paginated tasks
 */
router.get("/tasks", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    
    // Parse pagination parameters
    let limit = parseInt(req.query.limit) || 50;
    let offset = parseInt(req.query.offset) || 0;
    
    // Validate and cap limit
    if (limit < 1) limit = 50;
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;
    
    // Build WHERE clause based on filters
    const filters = [];
    const params = [];
    
    if (req.query.status) {
      filters.push("status = ?");
      params.push(req.query.status);
    }
    
    if (req.query.task_type) {
      filters.push("task_type = ?");
      params.push(req.query.task_type);
    }
    
    if (req.query.source_id) {
      const sourceId = parseInt(req.query.source_id);
      if (!isNaN(sourceId) && sourceId > 0) {
        filters.push("source_id = ?");
        params.push(sourceId);
      }
    }
    
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    
    // Get total count
    const totalCount = db.prepare(
      `SELECT COUNT(*) as count FROM tasks ${whereClause}`
    ).get(...params).count;
    
    // Get paginated tasks
    const tasks = db.prepare(
      `SELECT * FROM tasks ${whereClause} ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);
    
    res.json({
      tasks,
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
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The task ID
 *     responses:
 *       200:
 *         description: Returns the task
 *       404:
 *         description: Task not found
 */
router.get("/tasks/:id", apiLimiter, (req, res) => {
  const { id } = req.params;
  
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
    
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task_type
 *             properties:
 *               task_type:
 *                 type: string
 *                 enum: [file_upload, ldes_sync, triplestore_sync, harvest, other]
 *               source_id:
 *                 type: integer
 *               metadata:
 *                 type: string
 *                 description: JSON string with task-specific data
 *     responses:
 *       201:
 *         description: Task created successfully
 */
router.post("/tasks", writeLimiter, (req, res) => {
  const { task_type, source_id, metadata } = req.body;
  
  if (!task_type) {
    return res.status(400).json({ error: "Missing task_type" });
  }
  
  const validTypes = ['file_upload', 'ldes_sync', 'triplestore_sync', 'harvest', 'other'];
  if (!validTypes.includes(task_type)) {
    return res.status(400).json({ error: "Invalid task_type" });
  }
  
  try {
    const db = getDatabase();
    
    // Get username from session if available
    const created_by = req.session?.user?.username || null;
    
    const stmt = db.prepare(
      "INSERT INTO tasks (task_type, source_id, metadata, created_by) VALUES (?, ?, ?, ?)"
    );
    const info = stmt.run(task_type, source_id || null, metadata || null, created_by);
    
    const task = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(info.lastInsertRowid);
    
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task's status and details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, running, completed, failed, cancelled]
 *               error_message:
 *                 type: string
 *               metadata:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
router.put("/tasks/:id", writeLimiter, (req, res) => {
  const { id } = req.params;
  const { status, error_message, metadata } = req.body;
  
  const taskId = parseInt(id, 10);
  if (isNaN(taskId) || taskId < 1) {
    return res.status(400).json({ error: "Invalid task ID" });
  }
  
  if (status) {
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
  }
  
  try {
    const db = getDatabase();
    
    // Check if task exists
    const existing = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId);
    if (!existing) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];
    
    if (status !== undefined) {
      updates.push("status = ?");
      params.push(status);
      
      // Auto-set timestamps based on status
      if (status === 'running' && !existing.started_at) {
        updates.push("started_at = CURRENT_TIMESTAMP");
      }
      if ((status === 'completed' || status === 'failed' || status === 'cancelled') && !existing.completed_at) {
        updates.push("completed_at = CURRENT_TIMESTAMP");
      }
    }
    
    if (error_message !== undefined) {
      updates.push("error_message = ?");
      params.push(error_message);
    }
    
    if (metadata !== undefined) {
      updates.push("metadata = ?");
      params.push(metadata);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    
    params.push(taskId);
    
    db.prepare(
      `UPDATE tasks SET ${updates.join(', ')} WHERE task_id = ?`
    ).run(...params);
    
    const updated = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId);
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 */
router.delete("/tasks/:id", writeLimiter, (req, res) => {
  const { id } = req.params;
  
  const taskId = parseInt(id, 10);
  if (isNaN(taskId) || taskId < 1) {
    return res.status(400).json({ error: "Invalid task ID" });
  }
  
  try {
    const db = getDatabase();
    
    const existing = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId);
    if (!existing) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    db.prepare("DELETE FROM tasks WHERE task_id = ?").run(taskId);
    
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/tasks/stats:
 *   get:
 *     summary: Get task statistics
 *     responses:
 *       200:
 *         description: Returns task statistics grouped by status and type
 */
router.get("/tasks/stats", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    
    const byStatus = db.prepare(
      "SELECT status, COUNT(*) as count FROM tasks GROUP BY status"
    ).all();
    
    const byType = db.prepare(
      "SELECT task_type, COUNT(*) as count FROM tasks GROUP BY task_type"
    ).all();
    
    const recent = db.prepare(
      "SELECT * FROM tasks ORDER BY datetime(created_at) DESC LIMIT 10"
    ).all();
    
    res.json({
      by_status: byStatus,
      by_type: byType,
      recent_tasks: recent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
