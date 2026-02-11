// Community invitations routes

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { requireAuth } = require("../middleware/admin");
const { apiLimiter } = require("../middleware/rateLimit");

/**
 * @openapi
 * /api/communities/{id}/invite:
 *   post:
 *     summary: Invite a user to a community (owner only)
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
 *               user_id:
 *                 type: integer
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 */
router.post("/api/communities/:id/invite", requireAuth, apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const { user_id, username } = req.body;
    const currentUserId = req.session.user.id || req.session.user.user_id;
    
    if (!user_id && !username) {
      return res.status(400).json({ error: 'Either user_id or username must be provided' });
    }
    
    const db = getDatabase();
    
    // Check if community exists
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    // Check if current user is the owner
    if (community.owner_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the community owner can invite members' });
    }
    
    // Get target user
    let targetUser;
    if (user_id) {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    } else {
      targetUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const targetUserId = targetUser.id;
    
    // Check if user is already a member
    const existingMember = db.prepare(
      'SELECT id FROM community_members WHERE community_id = ? AND user_id = ?'
    ).get(communityId, targetUserId);
    
    if (existingMember) {
      return res.status(409).json({ error: 'User is already a member of this community' });
    }
    
    // Check if there's already a pending invitation
    const existingInvitation = db.prepare(
      'SELECT id FROM community_invitations WHERE community_id = ? AND user_id = ? AND status = ?'
    ).get(communityId, targetUserId, 'pending');
    
    if (existingInvitation) {
      return res.status(409).json({ error: 'An invitation has already been sent to this user' });
    }
    
    // Create invitation
    db.prepare(`
      INSERT INTO community_invitations (community_id, user_id, invited_by_id, status)
      VALUES (?, ?, ?, 'pending')
    `).run(communityId, targetUserId, currentUserId);
    
    // Log activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      currentUserId,
      'community_invitation_sent',
      JSON.stringify({ 
        community_id: communityId,
        invited_user_id: targetUserId,
        invited_username: targetUser.username
      })
    );
    
    res.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      invited_user: {
        id: targetUser.id,
        username: targetUser.username
      }
    });
  } catch (err) {
    console.error('[Community Invitations] Error sending invitation:', err);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

/**
 * @openapi
 * /api/invitations:
 *   get:
 *     summary: Get current user's pending invitations
 *     responses:
 *       200:
 *         description: List of pending invitations
 */
router.get("/api/invitations", requireAuth, apiLimiter, (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user.user_id;
    const db = getDatabase();
    
    const invitations = db.prepare(`
      SELECT 
        ci.*,
        c.name as community_name,
        c.description as community_description,
        c.access_type as community_access_type,
        c.member_count as community_member_count,
        u.username as invited_by_username
      FROM community_invitations ci
      JOIN communities c ON ci.community_id = c.id
      JOIN users u ON ci.invited_by_id = u.id
      WHERE ci.user_id = ? AND ci.status = 'pending'
      ORDER BY ci.created_at DESC
    `).all(userId);
    
    res.json(invitations);
  } catch (err) {
    console.error('[Community Invitations] Error fetching invitations:', err);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

/**
 * @openapi
 * /api/invitations/{id}/accept:
 *   post:
 *     summary: Accept a community invitation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 */
router.post("/api/invitations/:id/accept", requireAuth, apiLimiter, (req, res) => {
  try {
    const invitationId = parseInt(req.params.id);
    const userId = req.session.user.id || req.session.user.user_id;
    
    const db = getDatabase();
    
    // Get invitation
    const invitation = db.prepare(`
      SELECT ci.*, c.name as community_name
      FROM community_invitations ci
      JOIN communities c ON ci.community_id = c.id
      WHERE ci.id = ? AND ci.user_id = ? AND ci.status = 'pending'
    `).get(invitationId, userId);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }
    
    // Check if user is already a member (shouldn't happen, but just in case)
    const existingMember = db.prepare(
      'SELECT id FROM community_members WHERE community_id = ? AND user_id = ?'
    ).get(invitation.community_id, userId);
    
    if (existingMember) {
      // Update invitation status
      db.prepare(`
        UPDATE community_invitations 
        SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(invitationId);
      
      return res.status(409).json({ error: 'You are already a member of this community' });
    }
    
    // Add user as member
    db.prepare(`
      INSERT INTO community_members (community_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(invitation.community_id, userId);
    
    // Update invitation status
    db.prepare(`
      UPDATE community_invitations 
      SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(invitationId);
    
    // Update member count
    db.prepare(`
      UPDATE communities 
      SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = ?)
      WHERE id = ?
    `).run(invitation.community_id, invitation.community_id);
    
    // Log activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      userId,
      'community_invitation_accepted',
      JSON.stringify({ 
        community_id: invitation.community_id,
        invitation_id: invitationId,
        community_name: invitation.community_name
      })
    );
    
    res.json({ 
      success: true, 
      message: 'Invitation accepted successfully',
      community_id: invitation.community_id
    });
  } catch (err) {
    console.error('[Community Invitations] Error accepting invitation:', err);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

/**
 * @openapi
 * /api/invitations/{id}/decline:
 *   post:
 *     summary: Decline a community invitation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Invitation declined successfully
 */
router.post("/api/invitations/:id/decline", requireAuth, apiLimiter, (req, res) => {
  try {
    const invitationId = parseInt(req.params.id);
    const userId = req.session.user.id || req.session.user.user_id;
    
    const db = getDatabase();
    
    // Get invitation
    const invitation = db.prepare(`
      SELECT ci.*, c.name as community_name
      FROM community_invitations ci
      JOIN communities c ON ci.community_id = c.id
      WHERE ci.id = ? AND ci.user_id = ? AND ci.status = 'pending'
    `).get(invitationId, userId);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }
    
    // Update invitation status
    db.prepare(`
      UPDATE community_invitations 
      SET status = 'declined', responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(invitationId);
    
    // Log activity
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      userId,
      'community_invitation_declined',
      JSON.stringify({ 
        community_id: invitation.community_id,
        invitation_id: invitationId,
        community_name: invitation.community_name
      })
    );
    
    res.json({ success: true, message: 'Invitation declined successfully' });
  } catch (err) {
    console.error('[Community Invitations] Error declining invitation:', err);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
});

/**
 * @openapi
 * /api/communities/{id}/invitations:
 *   get:
 *     summary: Get all invitations for a community (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of community invitations
 */
router.get("/api/communities/:id/invitations", requireAuth, apiLimiter, (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const userId = req.session.user.id || req.session.user.user_id;
    
    const db = getDatabase();
    
    // Check if community exists and user is owner
    const community = db.prepare('SELECT * FROM communities WHERE id = ?').get(communityId);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    if (community.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the community owner can view invitations' });
    }
    
    // Get invitations
    const invitations = db.prepare(`
      SELECT 
        ci.*,
        u.username as user_username,
        inviter.username as invited_by_username
      FROM community_invitations ci
      JOIN users u ON ci.user_id = u.id
      JOIN users inviter ON ci.invited_by_id = inviter.id
      WHERE ci.community_id = ?
      ORDER BY ci.created_at DESC
    `).all(communityId);
    
    res.json(invitations);
  } catch (err) {
    console.error('[Community Invitations] Error fetching community invitations:', err);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

module.exports = router;
