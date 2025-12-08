// Appeals routes - handles appeal creation, retrieval, and updates

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { gitPull, gitCommitAndPush } = require("../db/gitOps");

/**
 * @openapi
 * /api/appeals:
 *   post:
 *     summary: Create a new appeal for a translation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               translation_id:
 *                 type: integer
 *               opened_by:
 *                 type: string
 *               resolution:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appeal created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post("/appeals", (req, res) => {
  const { translation_id, opened_by, resolution } = req.body;
  if (!translation_id || !opened_by) {
    return res
      .status(400)
      .json({ error: "Missing translation_id or opened_by" });
  }
  
  // Admin check removed - now using ORCID session auth
  // Verify user is authenticated via session
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Verify the user making the request matches the opened_by field
  if (req.session.user.orcid !== opened_by && req.session.user.name !== opened_by) {
    return res.status(403).json({ error: "User mismatch" });
  }
  
  try {
    const db = getDatabase();
    const stmt = db.prepare(
      "INSERT INTO appeals (translation_id, opened_by, resolution) VALUES (?, ?, ?)"
    );
    const info = stmt.run(translation_id, opened_by, resolution || null);
    // Git commit and push removed - Gitea integration removed
    res.status(201).json({ id: info.lastInsertRowid, translation_id, opened_by, resolution });
  } catch (err) {
    console.error("Error creating appeal:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/appeals:
 *   get:
 *     summary: Get all appeals
 *     responses:
 *       200:
 *         description: Returns all appeals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/appeals", (req, res) => {
  try {
    const db = getDatabase();
    const appeals = db.prepare("SELECT * FROM appeals").all();
    res.json(appeals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/appeals/{id}:
 *   patch:
 *     summary: Update an appeal (status, resolution)
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
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appeal updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.patch("/appeals/:id", (req, res) => {
  const { id } = req.params;
  const { status, resolution, username } = req.body;
  if ((!status && !resolution) || !username) {
    return res
      .status(400)
      .json({ error: "Missing status, resolution, or username" });
  }
  
  // Admin check removed - now using ORCID session auth
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Verify the user making the request matches the username field
  if (req.session.user.orcid !== username && req.session.user.name !== username) {
    return res.status(403).json({ error: "User mismatch" });
  }
  
  try {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE appeals SET status = COALESCE(?, status), resolution = COALESCE(?, resolution), closed_at = CASE WHEN ? = 'closed' OR ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE closed_at END WHERE id = ?"
    );
    stmt.run(status, resolution, status, status, id);
    const updated = db
      .prepare("SELECT * FROM appeals WHERE id = ?")
      .get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
