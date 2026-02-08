// Appeals routes - handles appeal creation, retrieval, and updates

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { writeLimiter, apiLimiter } = require("../middleware/rateLimit");
const { requireAuth } = require("../middleware/admin");
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
router.post("/appeals", requireAuth, writeLimiter, (req, res) => {
  const { translation_id, resolution } = req.body;
  
  // SECURITY FIX: Removed opened_by from request body - use session instead
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
router.patch("/appeals/:id", requireAuth, writeLimiter, (req, res) => {
  const { id } = req.params;
  const { status, resolution } = req.body;
  
  // SECURITY FIX: Removed username from request, verify ownership
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
      "UPDATE appeals SET status = COALESCE(?, status), resolution = COALESCE(?, resolution), closed_at = CASE WHEN ? = 'closed' OR ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE closed_at END WHERE id = ?"
    );
    stmt.run(status, resolution, status, status, appealId);
    
    const updated = db.prepare("SELECT * FROM appeals WHERE id = ?").get(appealId);
    res.json(updated);
  } catch (err) {
    console.error("Error updating appeal:", err.message);
    res.status(500).json({ error: "Failed to update appeal" });
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
router.post("/appeals/:id/messages", requireAuth, writeLimiter, (req, res) => {
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
  
  // SECURITY FIX: Added message length validation
  const MAX_MESSAGE_LENGTH = 5000;
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ 
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` 
    });
  }
  
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  try {
    const db = getDatabase();
    
    // Get appeal with translation info for authorization
    const appeal = db.prepare(`
      SELECT a.*, a.opened_by_id, t.username as translation_author 
      FROM appeals a
      JOIN translations tr ON a.translation_id = tr.id
      LEFT JOIN users t ON tr.username = t.username
      WHERE a.id = ?
    `).get(appealId);
    
    if (!appeal) {
      return res.status(404).json({ error: "Appeal not found" });
    }
    
    // SECURITY FIX: Verify user is allowed to post 
    // (appeal owner, translation author, or admin)
    const isAdmin = req.session.user.is_admin;
    const isAppealOwner = appeal.opened_by_id === currentUserId;
    const isTranslationAuthor = appeal.translation_author === req.session.user.username;
    
    if (!isAdmin && !isAppealOwner && !isTranslationAuthor) {
      return res.status(403).json({ 
        error: "You don't have permission to post messages to this appeal" 
      });
    }
    
    // SECURITY FIX: Rate limit - max 10 messages per user per appeal per hour
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
    res.status(500).json({ error: "Failed to create message" });
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
