// Languages routes - handles ISO 639 language codes

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter } = require("../middleware/rateLimit");

/**
 * @openapi
 * /api/languages:
 *   get:
 *     summary: Get all ISO 639 language codes
 *     description: Returns a list of all ISO 639-1 two-letter language codes with their full names and native names
 *     tags:
 *       - Languages
 *     responses:
 *       200:
 *         description: List of language codes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                     example: "en"
 *                   name:
 *                     type: string
 *                     example: "English"
 *                   native_name:
 *                     type: string
 *                     example: "English"
 *       500:
 *         description: Server error
 */
router.get("/languages", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    
    // Check if languages table exists
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='languages'"
    ).get();
    
    if (!tableExists) {
      console.log('[Languages] Languages table does not exist yet');
      return res.status(503).json({ 
        error: 'Languages table not initialized',
        message: 'Please run database migrations first'
      });
    }
    
    const languages = db.prepare(
      'SELECT code, name, native_name FROM languages ORDER BY name'
    ).all();
    
    console.log(`[Languages] Returning ${languages.length} language codes`);
    
    res.json(languages);
  } catch (error) {
    console.error('[Languages] Error fetching languages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch language codes',
      message: error.message 
    });
  }
});

/**
 * @openapi
 * /api/languages/{code}:
 *   get:
 *     summary: Get a specific language by code
 *     description: Returns details for a specific ISO 639-1 language code
 *     tags:
 *       - Languages
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: ISO 639-1 two-letter language code
 *     responses:
 *       200:
 *         description: Language details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "en"
 *                 name:
 *                   type: string
 *                   example: "English"
 *                 native_name:
 *                   type: string
 *                   example: "English"
 *       404:
 *         description: Language code not found
 *       500:
 *         description: Server error
 */
router.get("/languages/:code", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const { code } = req.params;
    
    // Check if languages table exists
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='languages'"
    ).get();
    
    if (!tableExists) {
      console.log('[Languages] Languages table does not exist yet');
      return res.status(503).json({ 
        error: 'Languages table not initialized',
        message: 'Please run database migrations first'
      });
    }
    
    const language = db.prepare(
      'SELECT code, name, native_name FROM languages WHERE code = ?'
    ).get(code.toLowerCase());
    
    if (!language) {
      console.log(`[Languages] Language code '${code}' not found`);
      return res.status(404).json({ 
        error: 'Language code not found',
        code: code 
      });
    }
    
    console.log(`[Languages] Returning language details for code '${code}'`);
    
    res.json(language);
  } catch (error) {
    console.error('[Languages] Error fetching language:', error);
    res.status(500).json({ 
      error: 'Failed to fetch language code',
      message: error.message 
    });
  }
});

module.exports = router;
