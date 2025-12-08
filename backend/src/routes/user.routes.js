// User routes - handles user profile and preferences

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const rateLimit = require("express-rate-limit");

// Set up rate limiter for user preferences endpoints (max 100 per 15 minutes per IP)
const userPreferencesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
});

/**
 * Middleware to check if user is authenticated
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

/**
 * @openapi
 * /api/user/preferences:
 *   get:
 *     summary: Get user preferences
 *     responses:
 *       200:
 *         description: Returns user preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nativeLanguage:
 *                   type: string
 *                 translationLanguages:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Not authenticated
 */
router.get("/api/user/preferences", userPreferencesLimiter, requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const orcid = req.session.user.orcid;
    
    console.log('[User Preferences] Getting preferences for:', orcid);
    
    const user = db.prepare('SELECT extra FROM users WHERE username = ?').get(orcid);
    
    if (!user) {
      console.log('[User Preferences] User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const extra = user.extra ? JSON.parse(user.extra) : {};
    const preferences = {
      nativeLanguage: extra.nativeLanguage || '',
      translationLanguages: extra.translationLanguages || []
    };
    
    console.log('[User Preferences] Returning preferences:', preferences);
    res.json(preferences);
  } catch (error) {
    console.error('[User Preferences] Error:', error);
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

/**
 * @openapi
 * /api/user/preferences:
 *   post:
 *     summary: Update user preferences
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nativeLanguage:
 *                 type: string
 *               translationLanguages:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       401:
 *         description: Not authenticated
 */
router.post("/api/user/preferences", userPreferencesLimiter, requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const orcid = req.session.user.orcid;
    const { nativeLanguage, translationLanguages } = req.body;
    
    console.log('[User Preferences] Updating preferences for:', orcid);
    console.log('[User Preferences] New preferences:', { nativeLanguage, translationLanguages });
    
    // Get current user data
    const user = db.prepare('SELECT extra FROM users WHERE username = ?').get(orcid);
    
    if (!user) {
      console.log('[User Preferences] User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Parse existing extra data
    const extra = user.extra ? JSON.parse(user.extra) : {};
    
    // Update preferences
    extra.nativeLanguage = nativeLanguage || extra.nativeLanguage;
    extra.translationLanguages = translationLanguages || extra.translationLanguages || [];
    
    // Save updated extra data
    db.prepare('UPDATE users SET extra = ? WHERE username = ?').run(
      JSON.stringify(extra),
      orcid
    );
    
    console.log('[User Preferences] Preferences updated successfully');
    res.json({ 
      success: true, 
      message: 'Preferences updated successfully',
      preferences: {
        nativeLanguage: extra.nativeLanguage,
        translationLanguages: extra.translationLanguages
      }
    });
  } catch (error) {
    console.error('[User Preferences] Error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
