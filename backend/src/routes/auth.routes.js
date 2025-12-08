// Auth routes - handles authentication endpoints

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const router = express.Router();
const config = require("../config");
const giteaService = require("../services/gitea.service");
const { authLimiter } = require("../middleware/rateLimit");

/**
 * @openapi
 * /api/auth/orcid:
 *   get:
 *     summary: Redirect to ORCID OAuth authorization
 *     responses:
 *       302:
 *         description: Redirects to ORCID authorization page
 */
router.get("/auth/orcid", (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.state = state;

  const authUrl = `https://orcid.org/oauth/authorize?` +
    new URLSearchParams({
      client_id: config.orcid.clientId,
      response_type: 'code',
      scope: '/authenticate',
      redirect_uri: `${config.baseUrl}/api/auth/orcid/callback`,
      state,
    });

  res.redirect(authUrl);
});

/**
 * @openapi
 * /api/auth/orcid/callback:
 *   get:
 *     summary: ORCID OAuth callback - exchanges code for token
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to frontend dashboard
 */
router.get("/auth/orcid/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || state !== req.session.state) {
    return res.redirect(`${config.frontendUrl}/login?error=invalid_state`);
  }

  try {
    const tokenResponse = await axios.post(
      'https://orcid.org/oauth/token',
      new URLSearchParams({
        client_id: config.orcid.clientId,
        client_secret: config.orcid.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${config.baseUrl}/api/auth/orcid/callback`,
      }),
      { headers: { Accept: 'application/json' } }
    );

    const { orcid, name, access_token, refresh_token, expires_in } = tokenResponse.data;

    // Store user info in session
    req.session.user = { 
      orcid, 
      name, 
      access_token, 
      refresh_token, 
      expires_at: Date.now() + expires_in * 1000 
    };

    // Redirect to frontend
    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (err) {
    console.error('ORCID OAuth error:', err.response?.data || err.message);
    res.redirect(`${config.frontendUrl}/login?error=orcid_failed`);
  }
});

/**
 * @openapi
 * /api/me:
 *   get:
 *     summary: Get current authenticated user
 *     responses:
 *       200:
 *         description: Returns current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orcid:
 *                   type: string
 *                 name:
 *                   type: string
 *       401:
 *         description: Not authenticated
 */
router.get("/me", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

/**
 * @openapi
 * /api/logout:
 *   post:
 *     summary: Logout current user
 *     responses:
 *       200:
 *         description: Successfully logged out
 */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// Legacy Gitea endpoints - kept for backward compatibility but deprecated
/**
 * @openapi
 * /api/login-gitea:
 *   post:
 *     deprecated: true
 *     summary: Login to Gitea and get an access token (DEPRECATED - Use ORCID OAuth)
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
 *     deprecated: true
 *     summary: Check if the provided Gitea token belongs to an admin user (DEPRECATED)
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
