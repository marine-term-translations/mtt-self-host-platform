// Communities routes - handles user-created and language communities

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { requireAuth, requireAdmin } = require("../middleware/admin");
const { apiLimiter } = require("../middleware/rateLimit");
const datetime = require("../utils/datetime");

/**
 * @openapi
 * /api/communities:
 *   get:
 *     summary: Get all communities
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [language, user_created, all]
 *         description: Filter by community type
 *     responses:
 *       200:
 *         description: List of communities
 */
router.get("/api/communities", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const { type } = req.query;
    const userId = req.session?.user?.id || req.session?.user?.user_id;
    
    let query = `
      SELECT 
        c.*,
        u.username as owner_username,
        l.name as language_name,
        (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) as actual_member_count,
        ${userId ? `(SELECT 1 FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ${userId}) as is_member` : '0 as is_member'}
      FROM communities c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN languages l ON c.language_code = l.code
    `;
    
    const params = [];
    const conditions = [];
    
    if (type && type !== 'all') {
      conditions.push('c.type = ?');
      params.push(type);
    }
    
    // Only show language communities that have at least one member
    conditions.push('(c.type != ? OR (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) > 0)');
    params.push('language');
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Sort: user's communities first, then language communities, then by creation date
    query += ` ORDER BY 
      ${userId ? 'is_member DESC,' : ''}
      c.type ASC,
      c.created_at DESC`;
    
    const communities = db.prepare(query).all(...params);
    
    res.json(communities);
  } catch (err) {
    console.error('[Communities] Error fetching communities:', err);
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

/**
 * @openapi
 * /api/communities/{id}:
 *   get:
 *     summary: Get community details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Community details
 */
router.get("/api/communities/:id", apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const db = getDatabase();
    
    const community = db.prepare(`
      SELECT 
        c.*,
        u.username as owner_username,
        l.name as language_name,
        l.native_name as language_native_name,
        (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) as actual_member_count
      FROM communities c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN languages l ON c.language_code = l.code
      WHERE c.id = ?
    `).get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    // Get members
    const members = db.prepare(`
      SELECT 
        cm.*,
        u.username,
        u.reputation,
        u.extra
      FROM community_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.community_id = ?
      ORDER BY 
        CASE cm.role 
          WHEN 'creator' THEN 1 
          WHEN 'moderator' THEN 2 
          ELSE 3 
        END,
        cm.joined_at DESC
    `).all(communityId);
    
    // Check if current user is a member
    let userMembership = null;
    if (req.session?.user?.id || req.session?.user?.user_id) {
      const userId = req.session.user.id || req.session.user.user_id;
      userMembership = db.prepare(
        'SELECT * FROM community_members WHERE community_id = ? AND user_id = ?'
      ).get(communityId, userId);
    }
    
    res.json({
      ...community,
      members,
      user_membership: userMembership
    });
  } catch (err) {
    console.error('[Communities] Error fetching community details:', err);
    res.status(500).json({ error: 'Failed to fetch community details' });
  }
});

/**
 * @openapi
 * /api/communities:
 *   post:
 *     summary: Create a new community (authenticated users only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               access_type:
 *                 type: string
 *                 enum: [open, invite_only]
 *     responses:
 *       201:
 *         description: Community created successfully
 */
router.post("/api/communities", requireAuth, apiLimiter, (req, res) => {
  try {
    const { name, description, access_type = 'open' } = req.body;
    
    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Community name is required' });
    }
    
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Community name must be 100 characters or less' });
    }
    
    if (!['open', 'invite_only'].includes(access_type)) {
      return res.status(400).json({ error: 'Invalid access_type. Must be open or invite_only' });
    }
    
    const db = getDatabase();
    const userId = req.session.user.id || req.session.user.user_id;
    
    // Check if community with same name already exists
    const existing = db.prepare(
      'SELECT id FROM communities WHERE LOWER(name) = LOWER(?)'
    ).get(name.trim());
    
    if (existing) {
      return res.status(409).json({ error: 'A community with this name already exists' });
    }
    
    // Create community
    const result = db.prepare(`
      INSERT INTO communities (name, description, type, access_type, owner_id)
      VALUES (?, ?, 'user_created', ?, ?)
    `).run(name.trim(), description?.trim() || null, access_type, userId);
    
    const communityId = result.lastInsertRowid;
    
    // Add creator as member with creator role
    db.prepare(`
      INSERT INTO community_members (community_id, user_id, role)
      VALUES (?, ?, 'creator')
    `).run(communityId, userId);
    
    // Update member count
    db.prepare('UPDATE communities SET member_count = 1 WHERE id = ?').run(communityId);
    
    // Log activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      userId,
      'community_created',
      JSON.stringify({ community_id: communityId, name: name.trim() })
    );
    
    res.status(201).json({
      success: true,
      message: 'Community created successfully',
      community_id: communityId
    });
  } catch (err) {
    console.error('[Communities] Error creating community:', err);
    res.status(500).json({ error: 'Failed to create community' });
  }
});

/**
 * @openapi
 * /api/communities/{id}:
 *   put:
 *     summary: Update community (owner only)
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               access_type:
 *                 type: string
 *                 enum: [open, invite_only]
 *     responses:
 *       200:
 *         description: Community updated successfully
 */
router.put("/api/communities/:id", requireAuth, apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const { name, description, access_type } = req.body;
    const userId = req.session.user.id || req.session.user.user_id;
    
    const db = getDatabase();
    
    // Check if community exists and user is the owner
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    // Language communities cannot be edited by users
    if (community.type === 'language') {
      return res.status(403).json({ error: 'Language communities cannot be modified' });
    }
    
    if (community.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the community owner can update the community' });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (name !== undefined && name.trim().length > 0) {
      if (name.trim().length > 100) {
        return res.status(400).json({ error: 'Community name must be 100 characters or less' });
      }
      
      // Check if name is already taken by another community
      const existing = db.prepare(
        'SELECT id FROM communities WHERE LOWER(name) = LOWER(?) AND id != ?'
      ).get(name.trim(), communityId);
      
      if (existing) {
        return res.status(409).json({ error: 'A community with this name already exists' });
      }
      
      updates.push('name = ?');
      params.push(name.trim());
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description?.trim() || null);
    }
    
    if (access_type !== undefined) {
      if (!['open', 'invite_only'].includes(access_type)) {
        return res.status(400).json({ error: 'Invalid access_type' });
      }
      updates.push('access_type = ?');
      params.push(access_type);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(communityId);
    
    const query = `UPDATE communities SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);
    
    // Log activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      userId,
      'community_updated',
      JSON.stringify({ community_id: communityId, updates: Object.keys(req.body) })
    );
    
    res.json({ success: true, message: 'Community updated successfully' });
  } catch (err) {
    console.error('[Communities] Error updating community:', err);
    res.status(500).json({ error: 'Failed to update community' });
  }
});

/**
 * @openapi
 * /api/communities/{id}:
 *   delete:
 *     summary: Delete community (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Community deleted successfully
 */
router.delete("/api/communities/:id", requireAuth, apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const userId = req.session.user.id || req.session.user.user_id;
    
    const db = getDatabase();
    
    // Check if community exists and user is the owner
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    // Language communities cannot be deleted
    if (community.type === 'language') {
      return res.status(403).json({ error: 'Language communities cannot be deleted' });
    }
    
    if (community.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the community owner can delete the community' });
    }
    
    // Delete community (cascade will handle members and invitations)
    db.prepare('DELETE FROM communities WHERE id = ?').run(communityId);
    
    // Log activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      userId,
      'community_deleted',
      JSON.stringify({ community_id: communityId, name: community.name })
    );
    
    res.json({ success: true, message: 'Community deleted successfully' });
  } catch (err) {
    console.error('[Communities] Error deleting community:', err);
    res.status(500).json({ error: 'Failed to delete community' });
  }
});

/**
 * @openapi
 * /api/communities/{id}/join:
 *   post:
 *     summary: Join an open community
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully joined community
 */
router.post("/api/communities/:id/join", requireAuth, apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const userId = req.session.user.id || req.session.user.user_id;
    
    const db = getDatabase();
    
    // Check if community exists
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    // Check if community is open
    if (community.access_type !== 'open') {
      return res.status(403).json({ error: 'This community is invite-only. You need an invitation to join.' });
    }
    
    // Check if already a member
    const existing = db.prepare(
      'SELECT id FROM community_members WHERE community_id = ? AND user_id = ?'
    ).get(communityId, userId);
    
    if (existing) {
      return res.status(409).json({ error: 'You are already a member of this community' });
    }
    
    // Add user as member
    db.prepare(`
      INSERT INTO community_members (community_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(communityId, userId);
    
    // Update member count
    db.prepare(`
      UPDATE communities 
      SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ?)
      WHERE id = ?
    `).run(communityId, communityId);
    
    // Log activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      userId,
      'community_joined',
      JSON.stringify({ community_id: communityId, name: community.name })
    );
    
    res.json({ success: true, message: 'Successfully joined community' });
  } catch (err) {
    console.error('[Communities] Error joining community:', err);
    res.status(500).json({ error: 'Failed to join community' });
  }
});

/**
 * @openapi
 * /api/communities/{id}/leave:
 *   delete:
 *     summary: Leave a community
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully left community
 */
router.delete("/api/communities/:id/leave", requireAuth, apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const userId = req.session.user.id || req.session.user.user_id;
    
    const db = getDatabase();
    
    // Check if community exists
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    // Check if user is a member
    const membership = db.prepare(
      'SELECT * FROM community_members WHERE community_id = ? AND user_id = ?'
    ).get(communityId, userId);
    
    if (!membership) {
      return res.status(404).json({ error: 'You are not a member of this community' });
    }
    
    // Creators cannot leave their own community
    if (membership.role === 'creator') {
      return res.status(403).json({ 
        error: 'Community creators cannot leave their community. You must delete it or transfer ownership first.' 
      });
    }
    
    // Language communities: users cannot manually leave
    if (community.type === 'language') {
      return res.status(403).json({ 
        error: 'You cannot leave language communities. Update your language preferences instead.' 
      });
    }
    
    // Remove member
    db.prepare(
      'DELETE FROM community_members WHERE community_id = ? AND user_id = ?'
    ).run(communityId, userId);
    
    // Update member count
    db.prepare(`
      UPDATE communities 
      SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ?)
      WHERE id = ?
    `).run(communityId, communityId);
    
    // Log activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      userId,
      'community_left',
      JSON.stringify({ community_id: communityId, name: community.name })
    );
    
    res.json({ success: true, message: 'Successfully left community' });
  } catch (err) {
    console.error('[Communities] Error leaving community:', err);
    res.status(500).json({ error: 'Failed to leave community' });
  }
});

/**
 * @openapi
 * /api/communities/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from community (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete("/api/communities/:id/members/:userId", requireAuth, apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.session.user.id || req.session.user.user_id;
    
    const db = getDatabase();
    
    // Check if community exists
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    // Language communities: cannot remove members manually
    if (community.type === 'language') {
      return res.status(403).json({ error: 'Cannot manually remove members from language communities' });
    }
    
    // Check if current user is the owner
    if (community.owner_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the community owner can remove members' });
    }
    
    // Cannot remove self
    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot remove yourself. Use the leave endpoint instead.' });
    }
    
    // Check if target user is a member
    const targetMembership = db.prepare(
      'SELECT * FROM community_members WHERE community_id = ? AND user_id = ?'
    ).get(communityId, targetUserId);
    
    if (!targetMembership) {
      return res.status(404).json({ error: 'User is not a member of this community' });
    }
    
    // Remove member
    db.prepare(
      'DELETE FROM community_members WHERE community_id = ? AND user_id = ?'
    ).run(communityId, targetUserId);
    
    // Update member count
    db.prepare(`
      UPDATE communities 
      SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ?)
      WHERE id = ?
    `).run(communityId, communityId);
    
    // Log activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      currentUserId,
      'community_member_removed',
      JSON.stringify({ 
        community_id: communityId, 
        removed_user_id: targetUserId,
        name: community.name 
      })
    );
    
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    console.error('[Communities] Error removing member:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
