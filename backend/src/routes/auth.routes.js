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
  const state = crypto.randomBytes(32).toString('hex');
  req.session.state = state;
  
  console.log('[ORCID Auth] Generated state:', state);
  console.log('[ORCID Auth] Session ID:', req.sessionID);
  console.log('[ORCID Auth] Session saved, state stored');

  const authUrl = `https://orcid.org/oauth/authorize?` +
    new URLSearchParams({
      client_id: config.orcid.clientId,
      response_type: 'code',
      scope: '/authenticate',
      redirect_uri: `${config.baseUrl}/api/auth/orcid/callback`,
      state,
    }).toString();

  console.log('[ORCID Auth] Redirecting to ORCID with URL:', authUrl);
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
  const { code, state: returnedState } = req.query;
  
  console.log('[ORCID Callback] Returned state from ORCID:', returnedState);
  console.log('[ORCID Callback] Expected state from session:', req.session.state);
  console.log('[ORCID Callback] Session ID:', req.sessionID);
  console.log('[ORCID Callback] Has code?', !!code);
  console.log('[ORCID Callback] Session object:', JSON.stringify(req.session, null, 2));

  if (!code || returnedState !== req.session.state) {
    console.log('[ORCID Callback] State mismatch! Failing auth.');
    console.log('[ORCID Callback] Comparison: returned="' + returnedState + '" vs stored="' + req.session.state + '"');
    return res.redirect(`${config.frontendUrl}/login?error=invalid_state`);
  }

  try {
    console.log('[ORCID Callback] State validated, exchanging code for token');
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
    console.log('[ORCID Callback] Token exchange successful, ORCID:', orcid);

    // Store user info in session
    req.session.user = { 
      orcid, 
      name, 
      access_token, 
      refresh_token, 
      expires_at: Date.now() + expires_in * 1000 
    };

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('[ORCID Callback] Session save error:', err);
        return res.redirect(`${config.frontendUrl}/login?error=session_failed`);
      }
      console.log('[ORCID Callback] Session saved, redirecting to dashboard');
      res.redirect(`${config.frontendUrl}/dashboard`);
    });
  } catch (err) {
    console.error('[ORCID Callback] OAuth error:', err.response?.data || err.message);
    if (err.response) {
      console.error('[ORCID Callback] Error status:', err.response.status);
      console.error('[ORCID Callback] Error data:', JSON.stringify(err.response.data, null, 2));
    }
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
  console.log('[Me] Checking session, Session ID:', req.sessionID);
  console.log('[Me] User in session:', !!req.session.user);
  
  if (req.session.user) {
    console.log('[Me] Returning user:', req.session.user.orcid);
    res.json(req.session.user);
  } else {
    console.log('[Me] No authenticated user found');
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
      console.error('[Logout] Session destruction error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('mtt.sid'); // Match the custom session cookie name
    console.log('[Logout] Session destroyed successfully');
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
