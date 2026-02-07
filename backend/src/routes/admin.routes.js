// Admin routes - handles admin operations for user management

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { requireAdmin } = require("../middleware/admin");
const { apiLimiter } = require("../middleware/rateLimit");
const datetime = require("../utils/datetime");
const { applyReputationForTranslationStatusChange } = require("../services/reputation.service");

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get("/admin/users", requireAdmin, apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const users = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.reputation,
        u.joined_at,
        u.extra,
        u.is_admin,
        u.is_banned,
        u.ban_reason
      FROM users u
      ORDER BY u.id ASC
    `).all();
    
    // Parse extra field for each user
    const usersWithParsedExtra = users.map(user => ({
      ...user,
      extra: user.extra ? JSON.parse(user.extra) : {}
    }));
    
    res.json(usersWithParsedExtra);
  } catch (err) {
    console.error('[Admin Users] Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @openapi
 * /api/admin/users/:id/promote:
 *   put:
 *     summary: Promote user to admin (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User promoted successfully
 */
router.put("/admin/users/:id/promote", requireAdmin, apiLimiter, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const db = getDatabase();
    
    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const extra = user.extra ? JSON.parse(user.extra) : {};
    extra.is_admin = true;
    
    db.prepare('UPDATE users SET extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(extra), userId);
    
    // Log admin activity
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      adminUserId,
      'admin_user_promoted',
      JSON.stringify({ target_user_id: userId, target_username: user.username })
    );
    
    res.json({ success: true, message: 'User promoted to admin' });
  } catch (err) {
    console.error('[Admin Users] Error promoting user:', err);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

/**
 * @openapi
 * /api/admin/users/:id/demote:
 *   put:
 *     summary: Demote admin to regular user (admin only, cannot demote superadmin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User demoted successfully
 */
router.put("/admin/users/:id/demote", requireAdmin, apiLimiter, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const db = getDatabase();
    
    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const extra = user.extra ? JSON.parse(user.extra) : {};
    
    // Prevent demotion of superadmin
    if (extra.is_superadmin) {
      return res.status(403).json({ error: 'Cannot demote superadmin' });
    }
    
    extra.is_admin = false;
    
    db.prepare('UPDATE users SET extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(extra), userId);
    
    // Log admin activity
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      adminUserId,
      'admin_user_demoted',
      JSON.stringify({ target_user_id: userId, target_username: user.username })
    );
    
    res.json({ success: true, message: 'User demoted from admin' });
  } catch (err) {
    console.error('[Admin Users] Error demoting user:', err);
    res.status(500).json({ error: 'Failed to demote user' });
  }
});

/**
 * @openapi
 * /api/admin/users/:id/ban:
 *   put:
 *     summary: Ban a user (admin only, cannot ban superadmin)
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User banned successfully
 */
router.put("/admin/users/:id/ban", requireAdmin, apiLimiter, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { reason } = req.body;
    const db = getDatabase();
    
    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const extra = user.extra ? JSON.parse(user.extra) : {};
    
    // Prevent banning of superadmin
    if (extra.is_superadmin) {
      return res.status(403).json({ error: 'Cannot ban superadmin' });
    }
    
    // Update both the is_banned column and ban_reason column
    db.prepare('UPDATE users SET is_banned = 1, ban_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(reason || 'No reason provided', userId);
    
    // Log admin activity
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      adminUserId,
      'admin_user_banned',
      JSON.stringify({ target_user_id: userId, target_username: user.username, reason: reason || 'No reason provided' })
    );
    
    res.json({ success: true, message: 'User banned successfully' });
  } catch (err) {
    console.error('[Admin Users] Error banning user:', err);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

/**
 * @openapi
 * /api/admin/users/:id/unban:
 *   put:
 *     summary: Unban a user (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User unbanned successfully
 */
router.put("/admin/users/:id/unban", requireAdmin, apiLimiter, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const db = getDatabase();
    
    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update both the is_banned column and ban_reason column
    db.prepare('UPDATE users SET is_banned = 0, ban_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(userId);
    
    // Log admin activity
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      adminUserId,
      'admin_user_unbanned',
      JSON.stringify({ target_user_id: userId, target_username: user.username })
    );
    
    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (err) {
    console.error('[Admin Users] Error unbanning user:', err);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

/**
 * @openapi
 * /api/admin/translations:
 *   get:
 *     summary: Get all translations with filters (admin only)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of translations
 */
router.get("/admin/translations", requireAdmin, apiLimiter, (req, res) => {
  try {
    const { status, language, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    
    let query = `
      SELECT 
        t.id,
        t.term_field_id,
        t.language,
        t.value,
        t.status,
        t.created_at,
        t.updated_at,
        t.created_by_id,
        t.modified_by_id,
        t.reviewed_by_id,
        tf.field_uri as field_name,
        term.id as term_id,
        term.uri,
        created_user.username as created_by_username,
        modified_user.username as modified_by_username,
        reviewed_user.username as reviewed_by_username
      FROM translations t
      LEFT JOIN term_fields tf ON t.term_field_id = tf.id
      LEFT JOIN terms term ON tf.term_id = term.id
      LEFT JOIN users created_user ON t.created_by_id = created_user.id
      LEFT JOIN users modified_user ON t.modified_by_id = modified_user.id
      LEFT JOIN users reviewed_user ON t.reviewed_by_id = reviewed_user.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    if (language) {
      query += ' AND t.language = ?';
      params.push(language);
    }
    
    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const { total } = db.prepare(countQuery).get(...params);
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY t.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const translations = db.prepare(query).all(...params);
    
    res.json({
      translations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[Admin Translations] Error fetching translations:', err);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

/**
 * @openapi
 * /api/admin/translations/:id/status:
 *   put:
 *     summary: Update translation status (admin only)
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
 *                 enum: [draft, review, approved, rejected, merged]
 *     responses:
 *       200:
 *         description: Translation status updated
 */
router.put("/admin/translations/:id/status", requireAdmin, apiLimiter, (req, res) => {
  try {
    const translationId = parseInt(req.params.id);
    const { status } = req.body;
    const db = getDatabase();
    
    // Validate status
    const validStatuses = ['draft', 'review', 'approved', 'rejected', 'merged'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Get current translation to check previous status and created_by
    const translation = db.prepare('SELECT * FROM translations WHERE id = ?').get(translationId);
    
    if (!translation) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    const previousStatus = translation.status;
    
    // Update translation status
    const result = db.prepare(
      'UPDATE translations SET status = ?, updated_at = CURRENT_TIMESTAMP, modified_by_id = ? WHERE id = ?'
    ).run(status, req.session.user.id, translationId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    // Apply reputation points to the user who created the translation
    if (translation.created_by_id) {
      try {
        applyReputationForTranslationStatusChange(
          translation.created_by_id,
          previousStatus,
          status,
          translationId
        );
      } catch (reputationError) {
        console.error('[Admin Translations] Error applying reputation:', reputationError);
        // Don't fail the request if reputation update fails
      }
    }
    
    // Log admin activity
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, translation_id, extra) VALUES (?, ?, ?, ?)'
    ).run(
      adminUserId,
      'admin_translation_status_changed',
      translationId,
      JSON.stringify({ previous_status: previousStatus, new_status: status })
    );
    
    res.json({ success: true, message: 'Translation status updated' });
  } catch (err) {
    console.error('[Admin Translations] Error updating status:', err);
    res.status(500).json({ error: 'Failed to update translation status' });
  }
});

/**
 * @openapi
 * /api/admin/translations/:id/language:
 *   put:
 *     summary: Update translation language (admin only)
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
 *               language:
 *                 type: string
 *                 enum: [nl, fr, de, es, it, pt]
 *     responses:
 *       200:
 *         description: Translation language updated
 */
router.put("/admin/translations/:id/language", requireAdmin, apiLimiter, (req, res) => {
  try {
    const translationId = parseInt(req.params.id);
    const { language } = req.body;
    const db = getDatabase();
    
    // Validate language
    const validLanguages = ['nl', 'fr', 'de', 'es', 'it', 'pt'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ error: 'Invalid language value' });
    }
    
    // Get current translation
    const translation = db.prepare('SELECT * FROM translations WHERE id = ?').get(translationId);
    if (!translation) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    const previousLanguage = translation.language;
    
    // Check if translation with same term_field_id and new language already exists
    const existing = db.prepare(
      'SELECT id FROM translations WHERE term_field_id = ? AND language = ? AND id != ?'
    ).get(translation.term_field_id, language, translationId);
    
    if (existing) {
      return res.status(409).json({ error: 'Translation for this language already exists for this term field' });
    }
    
    // Update translation language
    const result = db.prepare(
      'UPDATE translations SET language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(language, translationId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    // Log admin activity
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, translation_id, extra) VALUES (?, ?, ?, ?)'
    ).run(
      adminUserId,
      'admin_translation_language_changed',
      translationId,
      JSON.stringify({ previous_language: previousLanguage, new_language: language })
    );
    
    res.json({ success: true, message: 'Translation language updated' });
  } catch (err) {
    console.error('[Admin Translations] Error updating language:', err);
    res.status(500).json({ error: 'Failed to update translation language' });
  }
});

/**
 * @openapi
 * /api/admin/translations/:id/appeal:
 *   post:
 *     summary: Create an appeal for a translation (admin only)
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
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appeal created successfully
 */
router.post("/admin/translations/:id/appeal", requireAdmin, apiLimiter, (req, res) => {
  try {
    const translationId = parseInt(req.params.id);
    const { reason } = req.body;
    const db = getDatabase();
    
    // Check if translation exists
    const translation = db.prepare('SELECT * FROM translations WHERE id = ?').get(translationId);
    if (!translation) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    // Check if there's already an open appeal for this translation
    const existingAppeal = db.prepare(
      'SELECT id FROM appeals WHERE translation_id = ? AND status = ?'
    ).get(translationId, 'open');
    
    if (existingAppeal) {
      return res.status(409).json({ error: 'An open appeal already exists for this translation' });
    }
    
    // Create appeal
    const currentUserId = req.session.user.id || req.session.user.user_id;
    const result = db.prepare(
      'INSERT INTO appeals (translation_id, opened_by_id, resolution, status) VALUES (?, ?, ?, ?)'
    ).run(translationId, currentUserId, reason || 'Appeal created by admin', 'open');
    
    res.status(201).json({ 
      success: true, 
      message: 'Appeal created successfully',
      appealId: result.lastInsertRowid 
    });
  } catch (err) {
    console.error('[Admin Translations] Error creating appeal:', err);
    res.status(500).json({ error: 'Failed to create appeal' });
  }
});

/**
 * @openapi
 * /api/admin/moderation/reports:
 *   get:
 *     summary: Get all message reports (admin only)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, dismissed, action_taken]
 *     responses:
 *       200:
 *         description: List of message reports
 */
router.get("/admin/moderation/reports", requireAdmin, apiLimiter, (req, res) => {
  try {
    const { status } = req.query;
    const db = getDatabase();
    
    let query = `
      SELECT 
        mr.id,
        mr.appeal_message_id,
        mr.reported_by_id,
        mr.reason,
        mr.status,
        mr.reviewed_by_id,
        mr.admin_notes,
        mr.created_at,
        mr.reviewed_at,
        reporter.username as reported_by_username,
        reviewer.username as reviewed_by_username,
        am.message,
        am.author_id as message_author_id,
        author.username as message_author_username,
        am.appeal_id
      FROM message_reports mr
      LEFT JOIN users reporter ON mr.reported_by_id = reporter.id
      LEFT JOIN users reviewer ON mr.reviewed_by_id = reviewer.id
      LEFT JOIN appeal_messages am ON mr.appeal_message_id = am.id
      LEFT JOIN users author ON am.author_id = author.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND mr.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY mr.created_at DESC';
    
    const reports = db.prepare(query).all(...params);
    
    res.json(reports);
  } catch (err) {
    console.error('[Admin Moderation] Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * @openapi
 * /api/admin/moderation/reports/{id}/review:
 *   put:
 *     summary: Review a message report (admin only)
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
 *                 enum: [reviewed, dismissed, action_taken]
 *               admin_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report reviewed successfully
 */
router.put("/admin/moderation/reports/:id/review", requireAdmin, apiLimiter, (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { status, admin_notes } = req.body;
    const db = getDatabase();
    
    // Validate status
    const validStatuses = ['reviewed', 'dismissed', 'action_taken'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const currentUserId = req.session.user.id || req.session.user.user_id;
    
    // Update report
    const result = db.prepare(
      'UPDATE message_reports SET status = ?, reviewed_by_id = ?, admin_notes = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, currentUserId, admin_notes || null, reportId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ success: true, message: 'Report reviewed successfully' });
  } catch (err) {
    console.error('[Admin Moderation] Error reviewing report:', err);
    res.status(500).json({ error: 'Failed to review report' });
  }
});

/**
 * @openapi
 * /api/admin/moderation/appeals/{id}/messages:
 *   get:
 *     summary: Get appeal messages with report info (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of appeal messages with report information
 */
router.get("/admin/moderation/appeals/:id/messages", requireAdmin, apiLimiter, (req, res) => {
  try {
    const appealId = parseInt(req.params.id);
    const db = getDatabase();
    
    // Get appeal messages with author and report info
    const messages = db.prepare(`
      SELECT 
        am.id,
        am.appeal_id,
        am.author_id,
        am.message,
        am.created_at,
        u.username as author_username,
        COUNT(mr.id) as report_count,
        SUM(CASE WHEN mr.status = 'pending' THEN 1 ELSE 0 END) as pending_reports
      FROM appeal_messages am
      LEFT JOIN users u ON am.author_id = u.id
      LEFT JOIN message_reports mr ON am.id = mr.message_id
      WHERE am.appeal_id = ?
      GROUP BY am.id
      ORDER BY am.created_at ASC
    `).all(appealId);
    
    res.json(messages);
  } catch (err) {
    console.error('[Admin Moderation] Error fetching appeal messages:', err);
    res.status(500).json({ error: 'Failed to fetch appeal messages' });
  }
});

/**
 * @openapi
 * /api/admin/moderation/users/{id}/penalty:
 *   post:
 *     summary: Apply reputation penalty or ban to a user (admin only)
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
 *               action:
 *                 type: string
 *                 enum: [reputation_penalty, ban]
 *               penalty_amount:
 *                 type: integer
 *               ban_reason:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Penalty applied successfully
 */
router.post("/admin/moderation/users/:id/penalty", requireAdmin, apiLimiter, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { action, penalty_amount, ban_reason, reason } = req.body;
    const db = getDatabase();
    
    // Validate action
    if (!['reputation_penalty', 'ban'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Check if user exists
    const user = db.prepare('SELECT id, extra FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Parse extra field
    const userExtra = user.extra ? JSON.parse(user.extra) : {};
    
    // Check if trying to penalize a superadmin
    if (userExtra.is_superadmin) {
      return res.status(403).json({ error: 'Cannot penalize superadmin' });
    }
    
    if (action === 'reputation_penalty') {
      if (!penalty_amount || penalty_amount <= 0) {
        return res.status(400).json({ error: 'Penalty amount must be positive' });
      }
      
      // Apply reputation penalty
      db.prepare('UPDATE users SET reputation = reputation - ? WHERE id = ?')
        .run(penalty_amount, userId);
      
      // Log the penalty
      db.prepare(
        'INSERT INTO reputation_events (user_id, delta, reason) VALUES (?, ?, ?)'
      ).run(userId, -penalty_amount, reason || 'Admin moderation penalty');
      
      res.json({ 
        success: true, 
        message: `Reputation penalty of ${penalty_amount} applied successfully` 
      });
      
    } else if (action === 'ban') {
      if (!ban_reason || ban_reason.trim().length === 0) {
        return res.status(400).json({ error: 'Ban reason is required' });
      }
      
      // Ban the user
      userExtra.is_banned = true;
      userExtra.ban_reason = ban_reason.trim();
      userExtra.banned_at = new Date().toISOString();
      
      db.prepare('UPDATE users SET extra = ? WHERE id = ?')
        .run(JSON.stringify(userExtra), userId);
      
      res.json({ 
        success: true, 
        message: 'User banned successfully' 
      });
    }
  } catch (err) {
    console.error('[Admin Moderation] Error applying penalty:', err);
    res.status(500).json({ error: 'Failed to apply penalty' });
  }
});

/**
 * @openapi
 * /api/admin/activity:
 *   get:
 *     summary: Get admin activity log (admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of admin activities
 */
router.get("/admin/activity", requireAdmin, apiLimiter, (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const db = getDatabase();
    
    // Build query to fetch admin activities
    let query = `
      SELECT 
        ua.id,
        ua.user_id,
        ua.action,
        ua.term_id,
        ua.term_field_id,
        ua.translation_id,
        ua.appeal_id,
        ua.appeal_message_id,
        ua.extra,
        ua.created_at,
        u.username as admin_username
      FROM user_activity ua
      LEFT JOIN users u ON ua.user_id = u.id
      WHERE ua.action LIKE 'admin_%'
    `;
    
    const params = [];
    
    // Filter by specific action if provided
    if (action) {
      query += ' AND ua.action = ?';
      params.push(action);
    }
    
    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const { total } = db.prepare(countQuery).get(...params);
    
    // Add pagination and ordering
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY ua.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const activities = db.prepare(query).all(...params);
    
    // Parse extra field for each activity
    const parsedActivities = activities.map(activity => ({
      ...activity,
      extra: activity.extra ? JSON.parse(activity.extra) : null
    }));
    
    res.json({
      activities: parsedActivities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[Admin Activity] Error fetching activity log:', err);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

module.exports = router;
