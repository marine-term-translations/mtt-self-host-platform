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
 *                 properties:
 *                   id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   reputation:
 *                     type: integer
 *                   joined_at:
 *                     type: string
 *                   extra:
 *                     type: string
 */
router.get("/users", (req, res) => {
  try {
    const db = getDatabase();
    const users = db
      .prepare("SELECT id, username, reputation, joined_at, extra FROM users")
      .all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
