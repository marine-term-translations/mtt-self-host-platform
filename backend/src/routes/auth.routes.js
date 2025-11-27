// Auth routes - handles authentication endpoints

const express = require("express");
const router = express.Router();
const giteaService = require("../services/gitea.service");
const { authLimiter } = require("../middleware/rateLimit");

/**
 * @openapi
 * /api/login-gitea:
 *   post:
 *     summary: Login to Gitea and get an access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
router.post("/login-gitea", authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    const result = await giteaService.loginUser(username, password);
    res.json(result);
  } catch (err) {
    console.error(err);
    if (err.response) {
      return res.status(err.response.status).json({
        error: err.response.data?.message || "Login failed",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/check-admin:
 *   post:
 *     summary: Check if the provided Gitea token belongs to an admin user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns admin status of the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAdmin:
 *                   type: boolean
 *                 username:
 *                   type: string
 */
router.post("/check-admin", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }

  try {
    const result = await giteaService.checkAdminStatus(token);
    return res.json(result);
  } catch (err) {
    console.error("check-admin error:", err.response?.data || err.message);
    if (err.response) {
      return res.status(err.response.status).json({
        error: err.response.data?.message || "Failed to check admin status",
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
