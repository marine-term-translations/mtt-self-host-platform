// Term discussions routes - handles term-level discussions (not translation-specific appeals)

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { writeLimiter, apiLimiter } = require("../middleware/rateLimit");

/**
 * @openapi
 * /api/terms/{termId}/discussions:
 *   get:
 *     summary: Get all discussions for a specific term
 *     parameters:
 *       - in: path
 *         name: termId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The term ID
 *     responses:
 *       200:
 *         description: Returns discussions for the specified term
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/terms/:termId/discussions", apiLimiter, (req, res) => {
  const { termId } = req.params;
  
  // Validate termId
  const id = parseInt(termId, 10);
  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: "Invalid term ID" });
  }
  
  try {
    const db = getDatabase();
    
    // Get discussions for this term with author information
    const discussions = db.prepare(`
      SELECT 
        td.id,
        td.term_id,
        td.title,
        td.status,
        td.created_at,
        td.updated_at,
        td.started_by_id,
        u.username as started_by,
        (SELECT COUNT(*) FROM term_discussion_messages WHERE discussion_id = td.id) as message_count
      FROM term_discussions td
      LEFT JOIN users u ON td.started_by_id = u.id
      WHERE td.term_id = ?
      ORDER BY td.updated_at DESC
    `).all(id);
    
    res.json(discussions);
  } catch (err) {
    console.error("Error fetching term discussions:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/terms/{termId}/discussions:
 *   post:
 *     summary: Create a new discussion for a term
 *     parameters:
 *       - in: path
 *         name: termId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The term ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Discussion created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post("/terms/:termId/discussions", writeLimiter, (req, res) => {
  const { termId } = req.params;
  const { title, message } = req.body;
  
  // Validate termId
  const id = parseInt(termId, 10);
  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: "Invalid term ID" });
  }
  
  // Validate inputs
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }
  
  // Verify user is authenticated via session
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  try {
    const db = getDatabase();
    
    // Verify term exists
    const term = db.prepare("SELECT id FROM terms WHERE id = ?").get(id);
    if (!term) {
      return res.status(404).json({ error: "Term not found" });
    }
    
    // Create discussion
    const discussionStmt = db.prepare(
      "INSERT INTO term_discussions (term_id, started_by_id, title) VALUES (?, ?, ?)"
    );
    const discussionInfo = discussionStmt.run(id, currentUserId, title);
    const discussionId = discussionInfo.lastInsertRowid;
    
    // Add initial message
    const messageStmt = db.prepare(
      "INSERT INTO term_discussion_messages (discussion_id, author_id, message) VALUES (?, ?, ?)"
    );
    messageStmt.run(discussionId, currentUserId, message);
    
    // Add creator as participant
    const participantStmt = db.prepare(
      "INSERT INTO term_discussion_participants (discussion_id, user_id) VALUES (?, ?)"
    );
    participantStmt.run(discussionId, currentUserId);
    
    // Get the created discussion with details
    const created = db.prepare(`
      SELECT 
        td.id,
        td.term_id,
        td.title,
        td.status,
        td.created_at,
        td.updated_at,
        td.started_by_id,
        u.username as started_by
      FROM term_discussions td
      LEFT JOIN users u ON td.started_by_id = u.id
      WHERE td.id = ?
    `).get(discussionId);
    
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating term discussion:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/discussions/{id}:
 *   patch:
 *     summary: Update a discussion (close/reopen)
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
 *                 enum: [open, closed]
 *     responses:
 *       200:
 *         description: Discussion updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.patch("/discussions/:id", writeLimiter, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Validate discussion ID
  const discussionId = parseInt(id, 10);
  if (isNaN(discussionId) || discussionId < 1) {
    return res.status(400).json({ error: "Invalid discussion ID" });
  }
  
  // Validate status
  if (!status || !['open', 'closed'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  
  // Verify user is authenticated via session
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  try {
    const db = getDatabase();
    
    // Check if discussion exists and user is the starter
    const discussion = db.prepare(
      "SELECT id, started_by_id FROM term_discussions WHERE id = ?"
    ).get(discussionId);
    
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }
    
    // Only the starter can close/reopen the discussion
    if (discussion.started_by_id !== currentUserId) {
      return res.status(403).json({ error: "Only the discussion starter can change its status" });
    }
    
    // Update discussion status
    const stmt = db.prepare(
      "UPDATE term_discussions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );
    stmt.run(status, discussionId);
    
    // Get updated discussion
    const updated = db.prepare(`
      SELECT 
        td.id,
        td.term_id,
        td.title,
        td.status,
        td.created_at,
        td.updated_at,
        td.started_by_id,
        u.username as started_by
      FROM term_discussions td
      LEFT JOIN users u ON td.started_by_id = u.id
      WHERE td.id = ?
    `).get(discussionId);
    
    res.json(updated);
  } catch (err) {
    console.error("Error updating discussion:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/discussions/{id}/messages:
 *   get:
 *     summary: Get all messages for a discussion
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The discussion ID
 *     responses:
 *       200:
 *         description: List of messages for the discussion
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/discussions/:id/messages", apiLimiter, (req, res) => {
  const { id } = req.params;
  
  // Validate discussion ID
  const discussionId = parseInt(id, 10);
  if (isNaN(discussionId) || discussionId < 1) {
    return res.status(400).json({ error: "Invalid discussion ID" });
  }
  
  try {
    const db = getDatabase();
    
    // Check if discussion exists
    const discussion = db.prepare("SELECT id FROM term_discussions WHERE id = ?").get(discussionId);
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }
    
    // Get all messages for the discussion with author information
    const messages = db.prepare(`
      SELECT 
        tdm.id,
        tdm.discussion_id,
        tdm.author_id,
        tdm.message,
        tdm.created_at,
        u.username as author
      FROM term_discussion_messages tdm
      LEFT JOIN users u ON tdm.author_id = u.id
      WHERE tdm.discussion_id = ?
      ORDER BY tdm.created_at ASC
    `).all(discussionId);
    
    res.json(messages);
  } catch (err) {
    console.error("Error fetching discussion messages:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/discussions/{id}/messages:
 *   post:
 *     summary: Add a new message to a discussion
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The discussion ID
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
 */
router.post("/discussions/:id/messages", writeLimiter, (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  
  // Validate discussion ID
  const discussionId = parseInt(id, 10);
  if (isNaN(discussionId) || discussionId < 1) {
    return res.status(400).json({ error: "Invalid discussion ID" });
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
    
    // Check if discussion exists and is open
    const discussion = db.prepare(
      "SELECT id, status FROM term_discussions WHERE id = ?"
    ).get(discussionId);
    
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }
    
    if (discussion.status === 'closed') {
      return res.status(400).json({ error: "Cannot add message to closed discussion" });
    }
    
    // Insert the message
    const stmt = db.prepare(
      "INSERT INTO term_discussion_messages (discussion_id, author_id, message) VALUES (?, ?, ?)"
    );
    const info = stmt.run(discussionId, currentUserId, message.trim());
    
    // Update discussion updated_at
    db.prepare("UPDATE term_discussions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(discussionId);
    
    // Update or insert participant
    const participantCheck = db.prepare(
      "SELECT id FROM term_discussion_participants WHERE discussion_id = ? AND user_id = ?"
    ).get(discussionId, currentUserId);
    
    if (participantCheck) {
      db.prepare(
        "UPDATE term_discussion_participants SET last_message_at = CURRENT_TIMESTAMP WHERE discussion_id = ? AND user_id = ?"
      ).run(discussionId, currentUserId);
    } else {
      db.prepare(
        "INSERT INTO term_discussion_participants (discussion_id, user_id) VALUES (?, ?)"
      ).run(discussionId, currentUserId);
    }
    
    // Get the created message with author info
    const createdMessage = db.prepare(`
      SELECT 
        tdm.id,
        tdm.discussion_id,
        tdm.author_id,
        tdm.message,
        tdm.created_at,
        u.username as author
      FROM term_discussion_messages tdm
      LEFT JOIN users u ON tdm.author_id = u.id
      WHERE tdm.id = ?
    `).get(info.lastInsertRowid);
    
    res.status(201).json(createdMessage);
  } catch (err) {
    console.error("Error creating discussion message:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
