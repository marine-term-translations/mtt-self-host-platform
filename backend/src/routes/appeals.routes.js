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
  const { translation_id, opened_by, resolution, token } = req.body;
  if (!translation_id || !opened_by || !token) {
    return res
      .status(400)
      .json({ error: "Missing translation_id, opened_by, or token" });
  }
  const { checkAdminStatus } = require("../services/gitea.service");
  checkAdminStatus(token)
    .then((userInfo) => {
      if (!userInfo || userInfo.username !== opened_by) {
        return res.status(403).json({ error: "Invalid token for username" });
      }
      try {
        const db = getDatabase();
        const stmt = db.prepare(
          "INSERT INTO appeals (translation_id, opened_by, resolution) VALUES (?, ?, ?)"
        );
        const info = stmt.run(translation_id, opened_by, resolution || null);
        // Git commit and push after appeal creation
        try {
          gitCommitAndPush(
            `Appeal ${info.lastInsertRowid} created by ${opened_by}`,
            opened_by
          );
        } catch (gitErr) {
          console.error(
            "Git push failed after appeal creation:",
            gitErr.message
          );
        }
        res.status(201).json({
          id: info.lastInsertRowid,
          translation_id,
          opened_by,
          resolution,
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
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
  const { status, resolution, username, token } = req.body;
  if ((!status && !resolution) || !username || !token) {
    return res
      .status(400)
      .json({ error: "Missing status, resolution, username, or token" });
  }
  const { checkAdminStatus } = require("../services/gitea.service");
  checkAdminStatus(token)
    .then((userInfo) => {
      if (!userInfo || userInfo.username !== username) {
        return res.status(403).json({ error: "Invalid token for username" });
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
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

module.exports = router;
