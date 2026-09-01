// Teams routes - handles team-related endpoints and protected user directory

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter } = require("../middleware/rateLimit");
const { requireAuth, sanitizePublicUser } = require("../middleware/admin");

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get all users (Authenticated)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Returns sanitized user list (no sensitive flags)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   name:
 *                     type: string
 *                   reputation:
 *                     type: integer
 *                   joined_at:
 *                     type: string
 *                   avatar:
 *                     type: string
 *                   extra:
 *                     type: string
 *       401:
 *         description: Not authenticated
 */
router.get("/users", requireAuth, apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const users = db
      .prepare("SELECT id, username, reputation, joined_at, extra FROM users")
      .all();
    const sanitized = users.map(u => sanitizePublicUser(u));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/leaderboard/public:
 *   get:
 *     summary: Get public leaderboard / top contributors (Public)
 *     tags: [Gamification]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of top contributors to return (1-100)
 *     responses:
 *       200:
 *         description: Returns sanitized public contributor ranking
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   name:
 *                     type: string
 *                   reputation:
 *                     type: integer
 *                   joined_at:
 *                     type: string
 *                   avatar:
 *                     type: string
 *                   extra:
 *                     type: string
 */
router.get("/leaderboard/public", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const users = db
      .prepare("SELECT id, username, reputation, joined_at, extra FROM users ORDER BY reputation DESC LIMIT ?")
      .all(limit);
    const sanitized = users.map(u => sanitizePublicUser(u));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
