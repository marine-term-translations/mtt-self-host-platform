// Gitea routes - handles Gitea setup and user registration endpoints

const express = require("express");
const router = express.Router();
const config = require("../config");
const giteaService = require("../services/gitea.service");

/**
 * @openapi
 * /api/setup-gitea:
 *   post:
 *     summary: Setup Gitea organization
 *     responses:
 *       200:
 *         description: Returns creation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post("/setup-gitea", async (req, res) => {
  try {
    const orgData = await giteaService.createOrganization();
    res.json({ org: orgData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/register-gitea-user:
 *   post:
 *     summary: Register a user in Gitea and assign to language teams
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               lang:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: User created and assigned to teams
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post("/register-gitea-user", async (req, res) => {
  const { username, name, email, lang, password } = req.body;
  const org = config.gitea.org.name;

  if (
    !username ||
    !name ||
    !email ||
    !lang ||
    !password ||
    !Array.isArray(lang)
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Create user in Gitea
    const userRes = await giteaService.createUser({
      username,
      name,
      email,
      password,
    });

    // 2. Add user to local database
    const { getDatabase } = require("../db/database");
    const db = getDatabase();
    db.prepare(
      "INSERT OR IGNORE INTO users (username, joined_at) VALUES (?, CURRENT_TIMESTAMP)"
    ).run(username);
    // 2b. Git commit and push after user creation
    const { gitCommitAndPush } = require("../db/gitOps");
    try {
      gitCommitAndPush(`Gitea user ${username} registered`, username);
    } catch (gitErr) {
      console.error("Git push failed after user registration:", gitErr.message);
      // Optionally, you can return an error or continue
    }

    // 3. For each language, ensure team exists and add user
    const teamResults = [];
    for (const langName of lang) {
      const teamName = langName.replace(/\s+/g, "_");

      // Check if team exists
      let teamId = null;
      const teams = await giteaService.getOrgTeams(org);
      const found = teams.find((t) => t.name === teamName);

      if (found) {
        teamId = found.id;
      } else {
        // Create team
        const newTeam = await giteaService.createTeam(
          org,
          teamName,
          `Team for ${langName} speakers`
        );
        teamId = newTeam.id;
      }

      // Add user to team
      await giteaService.addUserToTeam(teamId, username);
      teamResults.push({ lang: langName, team: teamName, teamId });
    }

    res.json({ user: userRes, teams: teamResults });
  } catch (err) {
    console.error(err);
    if (err.response) {
      return res.status(err.response.status).json({ error: err.response.data });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
