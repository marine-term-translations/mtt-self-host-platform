// Community goals routes - handles community goal management

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { requireAdmin } = require("../middleware/admin");
const { apiLimiter } = require("../middleware/rateLimit");
const datetime = require("../utils/datetime");

/**
 * @openapi
 * /api/admin/community-goals:
 *   post:
 *     summary: Create a new community goal (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               goal_type:
 *                 type: string
 *                 enum: [translation_count, collection]
 *               target_count:
 *                 type: integer
 *               target_language:
 *                 type: string
 *               collection_id:
 *                 type: integer
 *               is_recurring:
 *                 type: boolean
 *               recurrence_type:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Community goal created successfully
 */
router.post("/admin/community-goals", requireAdmin, apiLimiter, (req, res) => {
  try {
    const {
      title,
      description,
      goal_type,
      target_count,
      target_language,
      collection_id,
      is_recurring,
      recurrence_type,
      start_date,
      end_date
    } = req.body;

    // Validation
    if (!title || !goal_type || !start_date) {
      return res.status(400).json({ error: 'Missing required fields: title, goal_type, start_date' });
    }

    if (!['translation_count', 'collection'].includes(goal_type)) {
      return res.status(400).json({ error: 'Invalid goal_type. Must be translation_count or collection' });
    }

    // Allow both collection_id and target_count to be set for combined goals
    // For collection goals without target_count, require a language
    if (goal_type === 'collection') {
      if (!collection_id) {
        return res.status(400).json({ error: 'collection_id is required for collection goals' });
      }
      if (!target_count && !target_language) {
        return res.status(400).json({ error: 'target_language is required for collection goals without target_count' });
      }
    }

    if (goal_type === 'translation_count' && !target_count) {
      return res.status(400).json({ error: 'target_count is required for translation_count goals' });
    }

    if (is_recurring && !recurrence_type) {
      return res.status(400).json({ error: 'recurrence_type is required for recurring goals' });
    }

    const db = getDatabase();
    const currentUserId = req.session.user.id || req.session.user.user_id;

    const result = db.prepare(`
      INSERT INTO community_goals (
        title, description, goal_type, target_count, target_language,
        collection_id, is_recurring, recurrence_type, start_date, end_date, created_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description || null,
      goal_type,
      target_count || null,
      target_language || null,
      collection_id || null,
      is_recurring ? 1 : 0,
      recurrence_type || null,
      start_date,
      end_date || null,
      currentUserId
    );

    const goalId = result.lastInsertRowid;

    // Log admin activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      currentUserId,
      'admin_community_goal_created',
      JSON.stringify({ goal_id: goalId, title, goal_type })
    );

    res.status(201).json({
      success: true,
      message: 'Community goal created successfully',
      goalId
    });
  } catch (err) {
    console.error('[Community Goals] Error creating goal:', err);
    res.status(500).json({ error: 'Failed to create community goal' });
  }
});

/**
 * @openapi
 * /api/admin/community-goals:
 *   get:
 *     summary: Get all community goals (admin only)
 *     responses:
 *       200:
 *         description: List of all community goals
 */
router.get("/admin/community-goals", requireAdmin, apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    
    const goals = db.prepare(`
      SELECT 
        cg.*,
        u.username as created_by_username,
        s.source_path as collection_path
      FROM community_goals cg
      LEFT JOIN users u ON cg.created_by_id = u.id
      LEFT JOIN sources s ON cg.collection_id = s.source_id
      ORDER BY cg.created_at DESC
    `).all();

    res.json(goals);
  } catch (err) {
    console.error('[Community Goals] Error fetching goals:', err);
    res.status(500).json({ error: 'Failed to fetch community goals' });
  }
});

/**
 * @openapi
 * /api/admin/community-goals/{id}:
 *   put:
 *     summary: Update a community goal (admin only)
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
 *     responses:
 *       200:
 *         description: Community goal updated successfully
 */
router.put("/admin/community-goals/:id", requireAdmin, apiLimiter, (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const {
      title,
      description,
      goal_type,
      target_count,
      target_language,
      collection_id,
      is_recurring,
      recurrence_type,
      start_date,
      end_date,
      is_active
    } = req.body;

    const db = getDatabase();

    // Check if goal exists
    const existing = db.prepare('SELECT id FROM community_goals WHERE id = ?').get(goalId);
    if (!existing) {
      return res.status(404).json({ error: 'Community goal not found' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (goal_type !== undefined) {
      updates.push('goal_type = ?');
      params.push(goal_type);
    }
    if (target_count !== undefined) {
      updates.push('target_count = ?');
      params.push(target_count);
    }
    if (target_language !== undefined) {
      updates.push('target_language = ?');
      params.push(target_language);
    }
    if (collection_id !== undefined) {
      updates.push('collection_id = ?');
      params.push(collection_id);
    }
    if (is_recurring !== undefined) {
      updates.push('is_recurring = ?');
      params.push(is_recurring ? 1 : 0);
    }
    if (recurrence_type !== undefined) {
      updates.push('recurrence_type = ?');
      params.push(recurrence_type);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(goalId);

    const query = `UPDATE community_goals SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);

    // Log admin activity
    const currentUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      currentUserId,
      'admin_community_goal_updated',
      JSON.stringify({ goal_id: goalId, updates: Object.keys(req.body) })
    );

    res.json({ success: true, message: 'Community goal updated successfully' });
  } catch (err) {
    console.error('[Community Goals] Error updating goal:', err);
    res.status(500).json({ error: 'Failed to update community goal' });
  }
});

/**
 * @openapi
 * /api/admin/community-goals/{id}:
 *   delete:
 *     summary: Delete a community goal (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Community goal deleted successfully
 */
router.delete("/admin/community-goals/:id", requireAdmin, apiLimiter, (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const db = getDatabase();

    // Get goal info before deleting
    const goal = db.prepare('SELECT title FROM community_goals WHERE id = ?').get(goalId);
    
    if (!goal) {
      return res.status(404).json({ error: 'Community goal not found' });
    }
    
    const result = db.prepare('DELETE FROM community_goals WHERE id = ?').run(goalId);

    // Log admin activity
    const currentUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      currentUserId,
      'admin_community_goal_deleted',
      JSON.stringify({ goal_id: goalId, title: goal.title })
    );

    res.json({ success: true, message: 'Community goal deleted successfully' });
  } catch (err) {
    console.error('[Community Goals] Error deleting goal:', err);
    res.status(500).json({ error: 'Failed to delete community goal' });
  }
});

/**
 * @openapi
 * /api/community-goals:
 *   get:
 *     summary: Get active community goals for current user
 *     responses:
 *       200:
 *         description: List of active community goals relevant to user
 */
router.get("/community-goals", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const now = datetime.toISO(datetime.now());
    
    // Get user's translation languages if authenticated
    let userLanguages = [];
    if (req.session?.user?.id || req.session?.user?.user_id) {
      const userId = req.session.user.id || req.session.user.user_id;
      const prefs = db.prepare('SELECT preferred_languages FROM user_preferences WHERE user_id = ?').get(userId);
      if (prefs && prefs.preferred_languages) {
        try {
          const parsed = JSON.parse(prefs.preferred_languages);
          userLanguages = parsed || [];
        } catch (e) {
          console.error('Error parsing user languages:', e);
        }
      }
    }

    // Get active goals
    let goals = db.prepare(`
      SELECT 
        cg.*,
        s.source_path as collection_path
      FROM community_goals cg
      LEFT JOIN sources s ON cg.collection_id = s.source_id
      WHERE cg.is_active = 1
        AND cg.start_date <= ?
        AND (cg.end_date IS NULL OR cg.end_date >= ?)
      ORDER BY cg.created_at DESC
    `).all(now, now);

    // Filter goals by user's languages if user is authenticated
    if (userLanguages.length > 0) {
      goals = goals.filter(goal => {
        // If no target language specified, show to all users
        if (!goal.target_language) return true;
        // Otherwise, only show if user can translate to that language
        return userLanguages.includes(goal.target_language);
      });
    }

    // Get dismissed goals for current user
    let dismissedGoalIds = [];
    if (req.session?.user?.id || req.session?.user?.user_id) {
      const userId = req.session.user.id || req.session.user.user_id;
      const dismissed = db.prepare(`
        SELECT goal_id FROM community_goal_dismissals WHERE user_id = ?
      `).all(userId);
      dismissedGoalIds = dismissed.map(d => d.goal_id);
    }

    // Mark dismissed goals
    goals = goals.map(goal => ({
      ...goal,
      is_dismissed: dismissedGoalIds.includes(goal.id)
    }));

    res.json(goals);
  } catch (err) {
    console.error('[Community Goals] Error fetching user goals:', err);
    res.status(500).json({ error: 'Failed to fetch community goals' });
  }
});

/**
 * @openapi
 * /api/community-goals/{id}/progress:
 *   get:
 *     summary: Get progress for a community goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Goal progress information
 */
router.get("/community-goals/:id/progress", apiLimiter, (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const db = getDatabase();

    // Get goal details
    const goal = db.prepare('SELECT * FROM community_goals WHERE id = ?').get(goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Community goal not found' });
    }

    let currentCount = 0;
    let progress = 0;
    let missingTranslations = null;

    if (goal.goal_type === 'translation_count') {
      // Count approved translations in target language within goal period
      let query = `
        SELECT COUNT(*) as count
        FROM translations
        WHERE status = 'approved'
          AND created_at >= ?
      `;
      const params = [goal.start_date];

      if (goal.target_language) {
        query += ' AND language = ?';
        params.push(goal.target_language);
      }

      if (goal.end_date) {
        query += ' AND created_at <= ?';
        params.push(goal.end_date);
      }

      const result = db.prepare(query).get(...params);
      currentCount = result.count;
      
      if (goal.target_count > 0) {
        progress = Math.min(100, Math.round((currentCount / goal.target_count) * 100));
      }
    } else if (goal.goal_type === 'collection' && goal.collection_id) {
      // Count approved translations for terms in the collection
      let query = `
        SELECT COUNT(DISTINCT tf.id) as count
        FROM term_fields tf
        INNER JOIN terms t ON tf.term_id = t.id
        INNER JOIN translations tr ON tf.id = tr.term_field_id
        WHERE t.source_id = ?
          AND tr.status = 'approved'
          AND tr.created_at >= ?
      `;
      const params = [goal.collection_id, goal.start_date];

      if (goal.target_language) {
        query += ' AND tr.language = ?';
        params.push(goal.target_language);
      }

      if (goal.end_date) {
        query += ' AND tr.created_at <= ?';
        params.push(goal.end_date);
      }

      const result = db.prepare(query).get(...params);
      currentCount = result.count;

      // Get total term fields in collection for percentage
      if (goal.target_count) {
        progress = Math.min(100, Math.round((currentCount / goal.target_count) * 100));
      } else {
        // No target count - calculate missing translations per language
        // Get total term fields in collection
        const totalFieldsQuery = `
          SELECT COUNT(*) as total
          FROM term_fields tf
          INNER JOIN terms t ON tf.term_id = t.id
          WHERE t.source_id = ?
            AND (tf.field_roles LIKE '%"translatable"%' OR tf.field_roles LIKE '%''translatable''%')
        `;
        const totalResult = db.prepare(totalFieldsQuery).get(goal.collection_id);
        const totalFields = totalResult.total;

        if (goal.target_language) {
          // Single language - calculate missing
          const translatedQuery = `
            SELECT COUNT(DISTINCT tf.id) as count
            FROM term_fields tf
            INNER JOIN terms t ON tf.term_id = t.id
            LEFT JOIN translations tr ON tf.id = tr.term_field_id AND tr.language = ? AND tr.status = 'approved'
            WHERE t.source_id = ?
              AND (tf.field_roles LIKE '%"translatable"%' OR tf.field_roles LIKE '%''translatable''%')
              AND tr.id IS NOT NULL
          `;
          const translatedResult = db.prepare(translatedQuery).get(goal.target_language, goal.collection_id);
          const translatedCount = translatedResult.count;
          const missing = totalFields - translatedCount;
          
          missingTranslations = {
            [goal.target_language]: missing
          };
          
          if (totalFields > 0) {
            progress = Math.round((translatedCount / totalFields) * 100);
            currentCount = translatedCount;
          }
        } else {
          // No specific language - shouldn't happen due to validation, but handle it
          if (totalFields > 0) {
            progress = Math.round((currentCount / totalFields) * 100);
          }
        }
      }
    }

    res.json({
      goal_id: goalId,
      current_count: currentCount,
      target_count: goal.target_count,
      progress_percentage: progress,
      is_complete: goal.target_count ? currentCount >= goal.target_count : false,
      missing_translations: missingTranslations
    });
  } catch (err) {
    console.error('[Community Goals] Error fetching progress:', err);
    res.status(500).json({ error: 'Failed to fetch goal progress' });
  }
});

/**
 * @openapi
 * /api/community-goals/{id}/dismiss:
 *   post:
 *     summary: Dismiss a community goal widget for current user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Goal dismissed successfully
 */
router.post("/community-goals/:id/dismiss", apiLimiter, (req, res) => {
  try {
    if (!req.session?.user?.id && !req.session?.user?.user_id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const goalId = parseInt(req.params.id);
    const userId = req.session.user.id || req.session.user.user_id;
    const db = getDatabase();

    // Check if goal exists
    const goal = db.prepare('SELECT id FROM community_goals WHERE id = ?').get(goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Community goal not found' });
    }

    // Insert or ignore (in case already dismissed)
    db.prepare(`
      INSERT OR IGNORE INTO community_goal_dismissals (user_id, goal_id)
      VALUES (?, ?)
    `).run(userId, goalId);

    res.json({ success: true, message: 'Goal dismissed successfully' });
  } catch (err) {
    console.error('[Community Goals] Error dismissing goal:', err);
    res.status(500).json({ error: 'Failed to dismiss goal' });
  }
});

module.exports = router;
