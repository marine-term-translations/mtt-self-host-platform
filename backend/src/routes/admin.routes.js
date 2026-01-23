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
        u.created_at,
        u.updated_at
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
    
    extra.is_banned = true;
    extra.ban_reason = reason || 'No reason provided';
    extra.banned_at = datetime.toISO(datetime.now());
    
    db.prepare('UPDATE users SET extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(extra), userId);
    
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
    
    const extra = user.extra ? JSON.parse(user.extra) : {};
    extra.is_banned = false;
    extra.ban_reason = '';
    extra.banned_at = '';
    
    db.prepare('UPDATE users SET extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(extra), userId);
    
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
        tf.field_term as field_name,
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

module.exports = router;
