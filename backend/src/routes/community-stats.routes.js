// Community stats routes - handles statistics and leaderboards for communities

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter } = require("../middleware/rateLimit");

/**
 * @openapi
 * /api/communities/{id}/stats:
 *   get:
 *     summary: Get community statistics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *         description: Time period for stats (default: month)
 *     responses:
 *       200:
 *         description: Community statistics
 */
router.get("/communities/:id/stats", apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const period = req.query.period || 'month';
    
    const db = getDatabase();
    
    // Check if community exists
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    // Calculate date cutoff based on period
    let dateCutoff = null;
    const now = new Date();
    
    if (period === 'week') {
      dateCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === 'month') {
      dateCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === 'year') {
      dateCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    // Get member IDs for community
    const memberIds = db.prepare(
      'SELECT user_id FROM community_members WHERE community_id = ?'
    ).all(communityId).map(m => m.user_id);
    
    if (memberIds.length === 0) {
      // No members, return empty stats
      return res.json({
        community_id: communityId,
        period,
        total_translations: 0,
        translations_by_status: {},
        translations_by_language: {},
        translations_over_time: [],
        top_contributors: []
      });
    }
    
    // Create placeholders for the IN clause
    const placeholders = memberIds.map(() => '?').join(',');
    
    // Get total translations by community members
    let totalTranslationsQuery = `
      SELECT COUNT(*) as count
      FROM translations t
      WHERE t.created_by_id IN (${placeholders})
    `;
    let totalTranslationsParams = [...memberIds];
    
    if (dateCutoff) {
      totalTranslationsQuery += ' AND t.created_at >= ?';
      totalTranslationsParams.push(dateCutoff);
    }
    
    const totalTranslations = db.prepare(totalTranslationsQuery).get(...totalTranslationsParams);
    
    // Get translations by status
    let translationsByStatusQuery = `
      SELECT 
        t.status,
        COUNT(*) as count
      FROM translations t
      WHERE t.created_by_id IN (${placeholders})
    `;
    let translationsByStatusParams = [...memberIds];
    
    if (dateCutoff) {
      translationsByStatusQuery += ' AND t.created_at >= ?';
      translationsByStatusParams.push(dateCutoff);
    }
    
    translationsByStatusQuery += ' GROUP BY t.status';
    
    const translationsByStatus = db.prepare(translationsByStatusQuery).all(...translationsByStatusParams);
    
    // Get translations by language (for language communities, focus on that language)
    let translationsByLanguage;
    if (community.type === 'language' && community.language_code) {
      let languageQuery = `
        SELECT 
          t.language,
          COUNT(*) as count
        FROM translations t
        WHERE t.created_by_id IN (${placeholders})
          AND t.language = ?
      `;
      let languageParams = [...memberIds, community.language_code];
      
      if (dateCutoff) {
        languageQuery += ' AND t.created_at >= ?';
        languageParams.push(dateCutoff);
      }
      
      languageQuery += ' GROUP BY t.language';
      
      translationsByLanguage = db.prepare(languageQuery).all(...languageParams);
    } else {
      let languageQuery = `
        SELECT 
          t.language,
          COUNT(*) as count
        FROM translations t
        WHERE t.created_by_id IN (${placeholders})
      `;
      let languageParams = [...memberIds];
      
      if (dateCutoff) {
        languageQuery += ' AND t.created_at >= ?';
        languageParams.push(dateCutoff);
      }
      
      languageQuery += ' GROUP BY t.language ORDER BY count DESC LIMIT 10';
      
      translationsByLanguage = db.prepare(languageQuery).all(...languageParams);
    }
    
    // Get translations over time (by day for the period)
    let overTimeQuery = `
      SELECT 
        DATE(t.created_at) as date,
        COUNT(*) as count
      FROM translations t
      WHERE t.created_by_id IN (${placeholders})
    `;
    let overTimeParams = [...memberIds];
    
    if (dateCutoff) {
      overTimeQuery += ' AND t.created_at >= ?';
      overTimeParams.push(dateCutoff);
    }
    
    overTimeQuery += ' GROUP BY DATE(t.created_at) ORDER BY date ASC';
    
    const translationsOverTime = db.prepare(overTimeQuery).all(...overTimeParams);
    
    // Get top contributors
    let contributorsQuery = `
      SELECT 
        u.id,
        u.username,
        u.reputation,
        u.extra,
        COUNT(DISTINCT t.id) as translation_count
      FROM users u
      JOIN translations t ON u.id = t.created_by_id
      WHERE u.id IN (${placeholders})
    `;
    let contributorsParams = [...memberIds];
    
    if (dateCutoff) {
      contributorsQuery += ' AND t.created_at >= ?';
      contributorsParams.push(dateCutoff);
    }
    
    contributorsQuery += ' GROUP BY u.id ORDER BY translation_count DESC LIMIT 10';
    
    const topContributors = db.prepare(contributorsQuery).all(...contributorsParams);
    
    res.json({
      community_id: communityId,
      community_name: community.name,
      period,
      total_translations: totalTranslations.count,
      translations_by_status: translationsByStatus.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {}),
      translations_by_language: translationsByLanguage.reduce((acc, item) => {
        acc[item.language] = item.count;
        return acc;
      }, {}),
      translations_over_time: translationsOverTime,
      top_contributors: topContributors.map(c => {
        let displayName = c.username;
        if (c.extra) {
          try {
            const extraData = JSON.parse(c.extra);
            if (extraData.name) {
              displayName = extraData.name;
            }
          } catch (e) {
            // ignore
          }
        }
        return {
          id: c.id,
          username: c.username,
          display_name: displayName,
          reputation: c.reputation,
          translation_count: c.translation_count
        };
      })
    });
  } catch (err) {
    console.error('[Community Stats] Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch community stats' });
  }
});

/**
 * @openapi
 * /api/communities/{id}/leaderboard:
 *   get:
 *     summary: Get community leaderboard
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [reputation, translations, reviews]
 *         description: Metric to rank by (default: reputation)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results to return (default: 50, max: 100)
 *     responses:
 *       200:
 *         description: Community leaderboard
 */
router.get("/communities/:id/leaderboard", apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const metric = req.query.metric || 'reputation';
    let limit = parseInt(req.query.limit) || 50;
    
    // Validate and cap limit
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    
    const db = getDatabase();
    
    // Check if community exists
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    let leaderboard = [];
    
    if (metric === 'reputation') {
      leaderboard = db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.reputation,
          u.extra,
          cm.role,
          cm.joined_at
        FROM community_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.community_id = ?
        ORDER BY u.reputation DESC
        LIMIT ?
      `).all(communityId, limit);
    } else if (metric === 'translations') {
      leaderboard = db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.reputation,
          u.extra,
          cm.role,
          cm.joined_at,
          COUNT(DISTINCT t.id) as translation_count
        FROM community_members cm
        JOIN users u ON cm.user_id = u.id
        LEFT JOIN translations t ON u.id = t.created_by_id AND t.status IN ('approved', 'merged')
        WHERE cm.community_id = ?
        GROUP BY u.id
        ORDER BY translation_count DESC
        LIMIT ?
      `).all(communityId, limit);
    } else if (metric === 'reviews') {
      leaderboard = db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.reputation,
          u.extra,
          cm.role,
          cm.joined_at,
          COUNT(DISTINCT t.id) as review_count
        FROM community_members cm
        JOIN users u ON cm.user_id = u.id
        LEFT JOIN translations t ON u.id = t.reviewed_by_id
        WHERE cm.community_id = ?
        GROUP BY u.id
        ORDER BY review_count DESC
        LIMIT ?
      `).all(communityId, limit);
    } else {
      return res.status(400).json({ error: 'Invalid metric. Must be reputation, translations, or reviews' });
    }
    
    // Format leaderboard with display names and ranks
    const formattedLeaderboard = leaderboard.map((entry, index) => {
      let displayName = entry.username;
      if (entry.extra) {
        try {
          const extraData = JSON.parse(entry.extra);
          if (extraData.name) {
            displayName = extraData.name;
          }
        } catch (e) {
          // ignore
        }
      }
      
      return {
        rank: index + 1,
        id: entry.id,
        username: entry.username,
        display_name: displayName,
        reputation: entry.reputation,
        role: entry.role,
        joined_at: entry.joined_at,
        translation_count: entry.translation_count || 0,
        review_count: entry.review_count || 0
      };
    });
    
    res.json({
      community_id: communityId,
      community_name: community.name,
      metric,
      leaderboard: formattedLeaderboard
    });
  } catch (err) {
    console.error('[Community Leaderboard] Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * @openapi
 * /api/communities/{id}/goals:
 *   get:
 *     summary: Get community-specific goals
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of community goals
 */
router.get("/communities/:id/goals", apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const db = getDatabase();
    
    // Check if community exists
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    // Get community-specific goals
    const goals = db.prepare(`
      SELECT 
        cg.*,
        s.source_path as collection_path
      FROM community_goals cg
      LEFT JOIN sources s ON cg.collection_id = s.source_id
      WHERE cg.community_id = ? AND cg.is_active = 1
      ORDER BY cg.created_at DESC
    `).all(communityId);
    
    res.json(goals);
  } catch (err) {
    console.error('[Community Goals] Error fetching community goals:', err);
    res.status(500).json({ error: 'Failed to fetch community goals' });
  }
});

/**
 * @openapi
 * /api/users/{id}/communities:
 *   get:
 *     summary: Get communities for a specific user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user's communities
 */
router.get("/users/:id/communities", apiLimiter, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const db = getDatabase();
    
    // Check if user exists
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's communities
    const communities = db.prepare(`
      SELECT 
        c.*,
        cm.role,
        cm.joined_at,
        l.name as language_name,
        u.username as owner_username
      FROM community_members cm
      JOIN communities c ON cm.community_id = c.id
      LEFT JOIN languages l ON c.language_code = l.code
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE cm.user_id = ?
      ORDER BY c.type ASC, cm.joined_at DESC
    `).all(userId);
    
    res.json({
      user_id: userId,
      username: user.username,
      communities
    });
  } catch (err) {
    console.error('[User Communities] Error fetching user communities:', err);
    res.status(500).json({ error: 'Failed to fetch user communities' });
  }
});

module.exports = router;
