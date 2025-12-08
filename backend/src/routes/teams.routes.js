// Teams routes - handles team-related endpoints

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: Returns all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/users", (req, res) => {
  try {
    const db = getDatabase();
    const users = db
      .prepare("SELECT username, reputation, joined_at, extra FROM users")
      .all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/user-teams:
 *   get:
 *     summary: Get teams for a user (DEPRECATED - Gitea removed)
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: org
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of teams the user is in
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/user-teams", async (req, res) => {
  // Team management via Gitea has been removed
  // Return empty array for backward compatibility
  res.json([]);
});

module.exports = router;
