// User routes - handles user profile and preferences

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const rateLimit = require("express-rate-limit");
const { apiLimiter } = require("../middleware/rateLimit");
const { encrypt, decrypt } = require("../utils/encryption");

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
 *                 preferredLanguages:
 *                   type: array
 *                   items:
 *                     type: string
 *                 visibleExtraLanguages:
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
    
    // Check if new user_preferences table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'").get();
    
    let preferences = {};
    
    if (tableExists) {
      // Try to get preferences from new table
      const userPrefs = db.prepare('SELECT preferred_languages, visible_extra_languages FROM user_preferences WHERE user_id = ?').get(userId);
      
      if (userPrefs) {
        try {
          preferences = {
            preferredLanguages: JSON.parse(userPrefs.preferred_languages),
            visibleExtraLanguages: JSON.parse(userPrefs.visible_extra_languages)
          };
        } catch (err) {
          console.error('[User Preferences] Failed to parse user preferences JSON:', err);
          preferences = {
            preferredLanguages: ['en'],
            visibleExtraLanguages: []
          };
        }
      } else {
        // Initialize with defaults
        preferences = {
          preferredLanguages: ['en'],
          visibleExtraLanguages: []
        };
      }
    }
    
    // Also get legacy preferences from extra field for backward compatibility
    const extra = user.extra ? (() => {
      try {
        return JSON.parse(user.extra);
      } catch (err) {
        console.error('[User Preferences] Failed to parse user extra JSON:', err);
        return {};
      }
    })() : {};
    preferences.nativeLanguage = extra.nativeLanguage || '';
    preferences.translationLanguages = extra.translationLanguages || [];
    
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
 *               preferredLanguages:
 *                 type: array
 *                 items:
 *                   type: string
 *               visibleExtraLanguages:
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
    const { nativeLanguage, translationLanguages, preferredLanguages, visibleExtraLanguages } = req.body;
    
    console.log('[User Preferences] Updating preferences for user ID:', userId);
    console.log('[User Preferences] New preferences:', { nativeLanguage, translationLanguages, preferredLanguages, visibleExtraLanguages });
    
    // Get current user data
    const user = db.prepare('SELECT extra FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      console.log('[User Preferences] User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Parse existing extra data
    const extra = user.extra ? (() => {
      try {
        return JSON.parse(user.extra);
      } catch (err) {
        console.error('[User Preferences] Failed to parse user extra JSON:', err);
        return {};
      }
    })() : {};
    
    // Update legacy preferences
    if (nativeLanguage !== undefined) extra.nativeLanguage = nativeLanguage;
    if (translationLanguages !== undefined) extra.translationLanguages = translationLanguages;
    
    // Save updated extra data
    db.prepare('UPDATE users SET extra = ? WHERE id = ?').run(
      JSON.stringify(extra),
      userId
    );
    
    // Check if new user_preferences table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'").get();
    
    if (tableExists && (preferredLanguages !== undefined || visibleExtraLanguages !== undefined)) {
      // Get current preferences
      const currentPrefs = db.prepare('SELECT preferred_languages, visible_extra_languages FROM user_preferences WHERE user_id = ?').get(userId);
      
      const newPreferredLanguages = preferredLanguages !== undefined 
        ? JSON.stringify(preferredLanguages) 
        : (currentPrefs ? currentPrefs.preferred_languages : '["en"]');
        
      const newVisibleExtraLanguages = visibleExtraLanguages !== undefined
        ? JSON.stringify(visibleExtraLanguages)
        : (currentPrefs ? currentPrefs.visible_extra_languages : '[]');
      
      // Insert or update preferences
      db.prepare(`
        INSERT INTO user_preferences (user_id, preferred_languages, visible_extra_languages, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          preferred_languages = excluded.preferred_languages,
          visible_extra_languages = excluded.visible_extra_languages,
          updated_at = CURRENT_TIMESTAMP
      `).run(userId, newPreferredLanguages, newVisibleExtraLanguages);
    }
    
    console.log('[User Preferences] Preferences updated successfully');
    res.json({ 
      success: true, 
      message: 'Preferences updated successfully',
      preferences: {
        nativeLanguage: extra.nativeLanguage,
        translationLanguages: extra.translationLanguages,
        preferredLanguages: preferredLanguages,
        visibleExtraLanguages: visibleExtraLanguages
      }
    });
  } catch (error) {
    console.error('[User Preferences] Error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * @openapi
 * /api/user/preferences/openrouter-key:
 *   get:
 *     summary: Check if user has configured an OpenRouter API key
 *     responses:
 *       200:
 *         description: Returns whether user has an API key configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasApiKey:
 *                   type: boolean
 *       401:
 *         description: Not authenticated
 */
router.get("/user/preferences/openrouter-key", userPreferencesLimiter, requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.session.user.id || req.session.user.user_id;
    
    // Check if user has an API key configured
    const preferences = db.prepare(`
      SELECT openrouter_api_key FROM user_preferences WHERE user_id = ?
    `).get(userId);
    
    const hasApiKey = !!(preferences && preferences.openrouter_api_key);
    
    res.json({ hasApiKey });
  } catch (error) {
    console.error('Error checking OpenRouter API key:', error);
    res.status(500).json({ error: 'Failed to check API key status' });
  }
});

/**
 * @openapi
 * /api/user/preferences/openrouter-key/value:
 *   get:
 *     summary: Get user's OpenRouter API key (decrypted)
 *     description: Returns the user's API key for use in frontend requests. Only the owner can retrieve their key.
 *     responses:
 *       200:
 *         description: Returns the decrypted API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKey:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: No API key configured
 */
router.get("/user/preferences/openrouter-key/value", userPreferencesLimiter, requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.session.user.id || req.session.user.user_id;
    
    // Get user's encrypted API key
    const preferences = db.prepare(`
      SELECT openrouter_api_key FROM user_preferences WHERE user_id = ?
    `).get(userId);
    
    if (!preferences || !preferences.openrouter_api_key) {
      return res.status(404).json({ error: 'No API key configured' });
    }
    
    // Decrypt the API key
    const apiKey = decrypt(preferences.openrouter_api_key);
    
    res.json({ apiKey });
  } catch (error) {
    console.error('Error retrieving OpenRouter API key:', error);
    res.status(500).json({ error: 'Failed to retrieve API key' });
  }
});

/**
 * @openapi
 * /api/user/preferences/openrouter-key:
 *   post:
 *     summary: Save user's OpenRouter API key
 *     description: Encrypts and stores the user's OpenRouter API key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: API key saved successfully
 *       401:
 *         description: Not authenticated
 */
router.post("/user/preferences/openrouter-key", userPreferencesLimiter, requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.session.user.id || req.session.user.user_id;
    const { apiKey } = req.body;
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid API key' });
    }
    
    // Encrypt the API key before storing
    const encryptedApiKey = encrypt(apiKey.trim());
    
    // Check if user preferences exist
    const existingPrefs = db.prepare(`
      SELECT user_id FROM user_preferences WHERE user_id = ?
    `).get(userId);
    
    if (existingPrefs) {
      // Update existing preferences
      db.prepare(`
        UPDATE user_preferences 
        SET openrouter_api_key = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(encryptedApiKey, userId);
    } else {
      // Create new preferences record
      db.prepare(`
        INSERT INTO user_preferences (user_id, openrouter_api_key, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(userId, encryptedApiKey);
    }
    
    res.json({ success: true, message: 'API key saved successfully' });
  } catch (error) {
    console.error('Error saving OpenRouter API key:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

/**
 * @openapi
 * /api/user/preferences/openrouter-key:
 *   delete:
 *     summary: Delete user's OpenRouter API key
 *     description: Removes the user's stored OpenRouter API key
 *     responses:
 *       200:
 *         description: API key deleted successfully
 *       401:
 *         description: Not authenticated
 */
router.delete("/user/preferences/openrouter-key", userPreferencesLimiter, requireAuth, (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.session.user.id || req.session.user.user_id;
    
    // Remove the API key
    db.prepare(`
      UPDATE user_preferences 
      SET openrouter_api_key = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(userId);
    
    res.json({ success: true, message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting OpenRouter API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

/**
 * Get a specific user by ID
 * Note: This route is intentionally placed after more specific routes (like /user/preferences)
 * to prevent the :id parameter from matching literal path segments.
 * 
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
