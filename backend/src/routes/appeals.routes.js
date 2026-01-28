// Appeals routes - handles appeal creation, retrieval, and updates

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { writeLimiter, apiLimiter } = require("../middleware/rateLimit");
/**
 * @openapi
 * /api/appeals:
 *   post:
 *     summary: Create a new appeal for a translation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               translation_id:
 *                 type: integer
 *               opened_by:
 *                 type: string
 *               resolution:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appeal created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post("/appeals", writeLimiter, (req, res) => {
  const { translation_id, opened_by, resolution } = req.body;
  if (!translation_id || !opened_by) {
    return res
      .status(400)
      .json({ error: "Missing translation_id or opened_by" });
  }
  
  // Admin check removed - now using ORCID session auth
  // Verify user is authenticated via session
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Get the current user's ID
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  // Resolve opened_by to user_id (supports both username and user_id)
  const db = getDatabase();
  const openedByUser = db.prepare("SELECT id FROM users WHERE username = ? OR id = ?").get(opened_by, parseInt(opened_by) || 0);
  
  if (!openedByUser || openedByUser.id !== currentUserId) {
    return res.status(403).json({ error: "User mismatch" });
  }
  
  try {
    const stmt = db.prepare(
      "INSERT INTO appeals (translation_id, opened_by_id, resolution) VALUES (?, ?, ?)"
    );
    const info = stmt.run(translation_id, currentUserId, resolution || null);
    // Git commit and push removed - Gitea integration removed
    res.status(201).json({ id: info.lastInsertRowid, translation_id, opened_by_id: currentUserId, resolution });
  } catch (err) {
    console.error("Error creating appeal:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/appeals:
 *   get:
 *     summary: Get all appeals
 *     responses:
 *       200:
 *         description: Returns all appeals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/appeals", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const appeals = db.prepare("SELECT * FROM appeals").all();
    res.json(appeals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/appeals/by-term/{termId}:
 *   get:
 *     summary: Get appeals for a specific term
 *     parameters:
 *       - in: path
 *         name: termId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The term ID
 *     responses:
 *       200:
 *         description: Returns appeals for the specified term
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/appeals/by-term/:termId", apiLimiter, (req, res) => {
  const { termId } = req.params;
  
  // Validate termId
  const id = parseInt(termId, 10);
  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: "Invalid term ID" });
  }
  
  try {
    const db = getDatabase();
    
    // Get appeals for translations belonging to this term
    // We need to join through translations -> term_fields -> terms
    const appeals = db.prepare(`
      SELECT DISTINCT a.*
      FROM appeals a
      JOIN translations t ON a.translation_id = t.id
      JOIN term_fields tf ON t.term_field_id = tf.id
      WHERE tf.term_id = ?
      ORDER BY a.opened_at DESC
    `).all(id);
    
    res.json(appeals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/appeals/{id}:
 *   patch:
 *     summary: Update an appeal (status, resolution)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appeal updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.patch("/appeals/:id", writeLimiter, (req, res) => {
  const { id } = req.params;
  const { status, resolution, username } = req.body;
  if ((!status && !resolution) || !username) {
    return res
      .status(400)
      .json({ error: "Missing status, resolution, or username" });
  }
  
  // Admin check removed - now using ORCID session auth
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Get the current user's ID
  const db = getDatabase();
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  // Resolve username to user_id
  const user = db.prepare("SELECT id FROM users WHERE username = ? OR id = ?").get(username, parseInt(username) || 0);
  
  if (!user || user.id !== currentUserId) {
    return res.status(403).json({ error: "User mismatch" });
  }
  
  try {
    const stmt = db.prepare(
      "UPDATE appeals SET status = COALESCE(?, status), resolution = COALESCE(?, resolution), closed_at = CASE WHEN ? = 'closed' OR ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE closed_at END WHERE id = ?"
    );
    stmt.run(status, resolution, status, status, id);
    const updated = db
      .prepare("SELECT * FROM appeals WHERE id = ?")
      .get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/appeals/{id}/messages:
 *   get:
 *     summary: Get all messages for an appeal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The appeal ID
 *     responses:
 *       200:
 *         description: List of messages for the appeal
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   appeal_id:
 *                     type: integer
 *                   author_id:
 *                     type: integer
 *                   author_username:
 *                     type: string
 *                   message:
 *                     type: string
 *                   created_at:
 *                     type: string
 */
router.get("/appeals/:id/messages", apiLimiter, (req, res) => {
  const { id } = req.params;
  
  // Validate appeal ID
  const appealId = parseInt(id, 10);
  if (isNaN(appealId) || appealId < 1) {
    return res.status(400).json({ error: "Invalid appeal ID" });
  }
  
  try {
    const db = getDatabase();
    
    // Check if appeal exists
    const appeal = db.prepare("SELECT id FROM appeals WHERE id = ?").get(appealId);
    if (!appeal) {
      return res.status(404).json({ error: "Appeal not found" });
    }
    
    // Get all messages for the appeal with author information
    const messages = db.prepare(`
      SELECT 
        am.id,
        am.appeal_id,
        am.author_id,
        am.message,
        am.created_at,
        u.username as author_username
      FROM appeal_messages am
      LEFT JOIN users u ON am.author_id = u.id
      WHERE am.appeal_id = ?
      ORDER BY am.created_at ASC
    `).all(appealId);
    
    res.json(messages);
  } catch (err) {
    console.error("Error fetching appeal messages:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/appeals/{id}/messages:
 *   post:
 *     summary: Add a new message to an appeal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The appeal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 appeal_id:
 *                   type: integer
 *                 author_id:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 created_at:
 *                   type: string
 */
router.post("/appeals/:id/messages", writeLimiter, (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  
  // Validate appeal ID
  const appealId = parseInt(id, 10);
  if (isNaN(appealId) || appealId < 1) {
    return res.status(400).json({ error: "Invalid appeal ID" });
  }
  
  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required" });
  }
  
  // Verify user is authenticated via session
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  try {
    const db = getDatabase();
    
    // Check if appeal exists
    const appeal = db.prepare("SELECT id, status FROM appeals WHERE id = ?").get(appealId);
    if (!appeal) {
      return res.status(404).json({ error: "Appeal not found" });
    }
    
    // Insert the message
    const stmt = db.prepare(
      "INSERT INTO appeal_messages (appeal_id, author_id, message) VALUES (?, ?, ?)"
    );
    const info = stmt.run(appealId, currentUserId, message.trim());
    
    // Get the created message with author info
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
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/appeals/messages/{id}/report:
 *   post:
 *     summary: Report an appeal message for moderation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The appeal message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Report created successfully
 */
router.post("/appeals/messages/:id/report", writeLimiter, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  // Validate message ID
  const messageId = parseInt(id, 10);
  if (isNaN(messageId) || messageId < 1) {
    return res.status(400).json({ error: "Invalid message ID" });
  }
  
  // Validate reason
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({ error: "Reason is required" });
  }
  
  // Verify user is authenticated via session
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  try {
    const db = getDatabase();
    
    // Check if message exists
    const message = db.prepare("SELECT id, appeal_id FROM appeal_messages WHERE id = ?").get(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    // Check if user already reported this message
    const existingReport = db.prepare(
      "SELECT id FROM message_reports WHERE message_id = ? AND reported_by = ?"
    ).get(messageId, currentUserId);
    
    if (existingReport) {
      return res.status(409).json({ error: "You have already reported this message" });
    }
    
    // Create the report
    const stmt = db.prepare(
      "INSERT INTO message_reports (message_id, reported_by, reason) VALUES (?, ?, ?)"
    );
    const info = stmt.run(messageId, currentUserId, reason.trim());
    
    res.status(201).json({ 
      success: true, 
      message: 'Report submitted successfully',
      reportId: info.lastInsertRowid 
    });
  } catch (err) {
    console.error("Error creating message report:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
