// User routes - handles user profile and preferences

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const rateLimit = require("express-rate-limit");
const { apiLimiter } = require("../middleware/rateLimit");

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
router.get("/user/preferences", userPreferencesLimiter, requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.session.user.id || req.session.user.user_id;
    
    console.log('[User Preferences] Getting preferences for user ID:', userId);
    
    const user = db.prepare('SELECT extra FROM users WHERE id = ?').get(userId);
    
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
router.post("/user/preferences", userPreferencesLimiter, requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.session.user.id || req.session.user.user_id;
    const { nativeLanguage, translationLanguages } = req.body;
    
    console.log('[User Preferences] Updating preferences for user ID:', userId);
    console.log('[User Preferences] New preferences:', { nativeLanguage, translationLanguages });
    
    // Get current user data
    const user = db.prepare('SELECT extra FROM users WHERE id = ?').get(userId);
    
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
    db.prepare('UPDATE users SET extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      JSON.stringify(extra),
      userId
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

/**
 * @openapi
 * /api/user/{id}:
 *   get:
 *     summary: Get a specific user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Returns user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 reputation:
 *                   type: integer
 *                 joined_at:
 *                   type: string
 *                 extra:
 *                   type: string
 *       400:
 *         description: Invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/user/:id", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = db
      .prepare("SELECT id, username, reputation, joined_at, extra FROM users WHERE id = ?")
      .get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
