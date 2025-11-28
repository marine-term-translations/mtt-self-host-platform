// Teams routes - handles team-related endpoints

const express = require("express");
const router = express.Router();
const config = require("../config");
const giteaService = require("../services/gitea.service");
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
 *     summary: Get teams for a user in an organization
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
  const { username, org } = req.query;
  if (!username || !org) {
    return res.status(400).json({ error: "Missing username or org" });
  }

  try {
    // Get all teams in the org
    const teams = await giteaService.getOrgTeams(org);

    // Filter teams where user is a member
    const userTeams = [];
    for (const team of teams) {
      const isMember = await giteaService.isUserInTeam(team.id, username);
      if (isMember) {
        userTeams.push(team);
      }
    }

    res.json(userTeams);
  } catch (err) {
    console.error("Failed to get user teams:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
