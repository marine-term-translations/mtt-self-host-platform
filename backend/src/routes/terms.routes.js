// Terms routes - handles term CRUD operations

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");
const {
  applyRejectionPenalty,
  applyFalseRejectionPenalty,
  applyReputationChange,
  getReputationTierInfo,
  applyApprovalReward,
  applyMergeReward,
  applyCreationReward,
} = require("../services/reputation.service");
const { harvestCollection, harvestCollectionWithProgress } = require("../services/harvest.service");
const { getUserLanguagePreferences, selectBestTranslation } = require("../utils/languagePreferences");

/**
 * @openapi
 * /api/terms:
 *   post:
 *     summary: Create a new term
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uri:
 *                 type: string
 *     responses:
 *       201:
 *         description: Term created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post("/terms", writeLimiter, (req, res) => {
  const { uri } = req.body;
  if (!uri) return res.status(400).json({ error: "Missing uri" });
  try {
    const db = getDatabase();
    const stmt = db.prepare("INSERT INTO terms (uri) VALUES (?)");
    const info = stmt.run(uri);
    res.status(201).json({ id: info.lastInsertRowid, uri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/terms:
 *   get:
 *     summary: List SKOS/RDF terms with pagination
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of terms to return (default 50, max 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of terms to skip (default 0)
 *     responses:
 *       200:
 *         description: Returns paginated terms with metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 terms:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                   description: Total number of terms
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
router.get("/terms", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    
    // Parse pagination parameters
    let limit = parseInt(req.query.limit) || 50;
    let offset = parseInt(req.query.offset) || 0;
    
    // Validate and cap limit
    if (limit < 1) limit = 50;
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;
    
    // Get total count
    const totalCount = db.prepare("SELECT COUNT(*) as count FROM terms").get().count;
    
    // Get paginated terms
    const terms = db.prepare("SELECT * FROM terms LIMIT ? OFFSET ?").all(limit, offset);
    
    // For each term, get its fields and translations
    const termDetails = terms.map((term) => {
      // Get fields for this term
      const fields = db
        .prepare("SELECT * FROM term_fields WHERE term_id = ?")
        .all(term.id);
      // For each field, get translations
      const fieldsWithTranslations = fields.map((field) => {
        const translations = db
          .prepare("SELECT * FROM translations WHERE term_field_id = ?")
          .all(field.id);
        return { ...field, translations };
      });
      
      // Identify label and reference fields
      const labelField = fieldsWithTranslations.find(f => f.field_uri === 'http://www.w3.org/2004/02/skos/core#prefLabel') 
        || fieldsWithTranslations.find(f => f.field_uri?.includes('prefLabel'));
      
      // Get reference fields: prefer field_role, fallback to field_term
      let referenceFields = fieldsWithTranslations.filter(f => f.field_uri?.includes('definition') || f.field_uri?.includes('description'));
      if (referenceFields.length === 0) {
        referenceFields = fieldsWithTranslations.filter(f => f.field_uri === 'http://www.w3.org/2004/02/skos/core#definition');
      }
      
      return { 
        ...term, 
        fields: fieldsWithTranslations,
        labelField: labelField || null,
        referenceFields: referenceFields
      };
    });
    
    res.json({
      terms: termDetails,
      total: totalCount,
      limit: limit,
      offset: offset
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/term-by-uri:
 *   get:
 *     summary: Get a single term by URI with all its fields and translations
 *     parameters:
 *       - in: query
 *         name: uri
 *         required: true
 *         schema:
 *           type: string
 *         description: The term URI (will be automatically URL-decoded)
 *     responses:
 *       200:
 *         description: Returns the term with all fields and translations
 *       400:
 *         description: Missing URI parameter
 *       404:
 *         description: Term not found
 */
router.get("/term-by-uri", apiLimiter, (req, res) => {
  const { uri } = req.query;
  
  if (!uri) {
    return res.status(400).json({ error: "Missing uri query parameter" });
  }
  
  try {
    const db = getDatabase();
    
    // Normalize URI by removing trailing slashes for comparison
    const normalizedUri = uri.replace(/\/+$/, '');
    
    // Try exact match first
    let term = db.prepare("SELECT * FROM terms WHERE uri = ?").get(uri);
    
    // If not found, try with normalized URI (without trailing slash)
    if (!term && uri !== normalizedUri) {
      term = db.prepare("SELECT * FROM terms WHERE uri = ?").get(normalizedUri);
    }
    
    // If still not found, try with trailing slash added
    if (!term && !uri.endsWith('/')) {
      term = db.prepare("SELECT * FROM terms WHERE uri = ?").get(uri + '/');
    }
    
    if (!term) {
      return res.status(404).json({ error: "Term not found" });
    }
    
    // Get fields for this term
    const fields = db
      .prepare("SELECT * FROM term_fields WHERE term_id = ?")
      .all(term.id);
    
    // Get all translations for all fields in a single query to avoid N+1 problem
    const fieldIds = fields.map(f => f.id);
    let allTranslations = [];
    
    if (fieldIds.length > 0) {
      const placeholders = fieldIds.map(() => '?').join(',');
      allTranslations = db
        .prepare(`SELECT * FROM translations WHERE term_field_id IN (${placeholders})`)
        .all(...fieldIds);
    }
    
    // Group translations by field_id
    const translationsByField = {};
    for (const trans of allTranslations) {
      if (!translationsByField[trans.term_field_id]) {
        translationsByField[trans.term_field_id] = [];
      }
      translationsByField[trans.term_field_id].push(trans);
    }
    
    // Attach translations to fields
    const fieldsWithTranslations = fields.map((field) => ({
      ...field,
      translations: translationsByField[field.id] || []
    }));
    
    // Try to get label_field_uri from source config if available
    let labelFieldUri = null;
    try {
      const dbSource = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(term.source_id);
      if (dbSource && dbSource.label_field_uri) {
        labelFieldUri = dbSource.label_field_uri;
      }
    } catch (e) {}

    // Identify label and reference fields
    let labelField = null;
    if (labelFieldUri) {
      labelField = fieldsWithTranslations.find(f => f.field_uri === labelFieldUri);
    }
    if (!labelField) {
      labelField = fieldsWithTranslations.find(f => f.field_uri === 'http://www.w3.org/2004/02/skos/core#prefLabel')
        || fieldsWithTranslations.find(f => f.field_uri?.includes('prefLabel'));
    }

    // Get reference fields: prefer field_role, fallback to field_term
    let referenceFields = fieldsWithTranslations.filter(f => f.field_uri?.includes('definition') || f.field_uri?.includes('description'));
    if (referenceFields.length === 0) {
      referenceFields = fieldsWithTranslations.filter(f => f.field_uri === 'http://www.w3.org/2004/02/skos/core#definition');
    }

    res.json({
      ...term,
      fields: fieldsWithTranslations,
      labelField: labelField ? {
        field_uri: labelField.field_uri,
      } : null,
      referenceFields: referenceFields.map(f => ({
        field_uri: f.field_uri,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/terms/{id}:
 *   get:
 *     summary: Get a single term by ID with all its fields and translations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The term ID
 *     responses:
 *       200:
 *         description: Returns the term with all fields and translations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 uri:
 *                   type: string
 *                 fields:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Term not found
 */
router.get("/terms/:id", apiLimiter, (req, res) => {
  const { id } = req.params;
  
  // Validate that id is a valid integer
  const termId = parseInt(id, 10);
  if (isNaN(termId) || termId < 1) {
    return res.status(400).json({ error: "Invalid term ID" });
  }
  
  try {
    const db = getDatabase();
    
    // Get user ID from session if authenticated
    const userId = req.session?.user?.id || req.session?.user?.user_id || null;
    const userPrefs = getUserLanguagePreferences(db, userId);
    
    // Get the term
    const term = db.prepare("SELECT * FROM terms WHERE id = ?").get(termId);
    
    if (!term) {
      return res.status(404).json({ error: "Term not found" });
    }
    
    // Get fields for this term - filter to only translatable fields
    // Use field_role to efficiently filter instead of parsing JSON arrays
    const fields = db.prepare(
      "SELECT * FROM term_fields WHERE term_id = ? AND field_role = 'translatable'"
    ).all(term.id);
    
    // Get all translations for all fields in a single query to avoid N+1 problem
    const fieldIds = fields.map(f => f.id);
    let allTranslations = [];
    
    if (fieldIds.length > 0) {
      const placeholders = fieldIds.map(() => '?').join(',');
      // Only get translations with status 'original' or 'merged' for display
      allTranslations = db
        .prepare(`SELECT * FROM translations WHERE term_field_id IN (${placeholders}) AND (status = 'original' OR status = 'merged')`)
        .all(...fieldIds);
    }
    
    // Group translations by field_id
    const translationsByField = {};
    for (const trans of allTranslations) {
      if (!translationsByField[trans.term_field_id]) {
        translationsByField[trans.term_field_id] = [];
      }
      translationsByField[trans.term_field_id].push(trans);
    }
    
    // Attach translations to fields and add bestTranslation for each field
    const fieldsWithTranslations = fields.map((field) => {
      const fieldTranslations = translationsByField[field.id] || [];
      // For original value, prefer English or undefined language
      const originalValueTranslation = selectBestTranslation(fieldTranslations, ['en', 'undefined']);
      const bestTranslation = selectBestTranslation(fieldTranslations, userPrefs.preferredLanguages);
      
      return {
        ...field,
        translations: fieldTranslations,
        originalValueTranslation: originalValueTranslation, // English or undefined for reference
        bestTranslation: bestTranslation // Add best translation based on user preferences
      };
    });
    
    // Identify label and reference fields
    const labelField = fieldsWithTranslations.find(f => f.field_uri === 'http://www.w3.org/2004/02/skos/core#prefLabel') 
      || fieldsWithTranslations.find(f => f.field_uri?.includes('prefLabel'));
    // Get reference fields: prefer field_role, fallback to field_term
    let referenceFields = fieldsWithTranslations.filter(f => f.field_uri?.includes('definition') || f.field_uri?.includes('description'));
    if (referenceFields.length === 0) {
      referenceFields = fieldsWithTranslations.filter(f => f.field_uri === 'http://www.w3.org/2004/02/skos/core#definition');
    }
    
    res.json({ 
      ...term, 
      fields: fieldsWithTranslations,
      // Simplified labelField - just field_uri
      labelField: labelField ? {
        field_uri: labelField.field_uri,
      } : null,
      // Simplified referenceFields - array of objects with just field_uri
      referenceFields: referenceFields.map(f => ({
        field_uri: f.field_uri,
      })),
      userPreferences: userPrefs // Include user preferences so frontend knows what was used
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/terms/by-ids:
 *   post:
 *     summary: Get multiple terms by their IDs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Returns an array of terms with label fields only
 */
router.post("/terms/by-ids", apiLimiter, (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid or empty ids array" });
  }
  
  // Validate all IDs are integers
  const termIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);
  
  if (termIds.length === 0) {
    return res.json([]);
  }
  
  try {
    const db = getDatabase();
    
    // Get terms by IDs
    const placeholders = termIds.map(() => '?').join(',');
    const terms = db
      .prepare(`SELECT * FROM terms WHERE id IN (${placeholders})`)
      .all(...termIds);
    
    if (terms.length === 0) {
      return res.json([]);
    }
    
    // Get label fields for these terms (using field_uri since field_role/field_term removed)
    const termIdsFound = terms.map(t => t.id);
    const labelFieldsPlaceholders = termIdsFound.map(() => '?').join(',');
    const labelFields = db
      .prepare(`
        SELECT * FROM term_fields 
        WHERE term_id IN (${labelFieldsPlaceholders}) 
        AND (field_uri LIKE '%prefLabel%' OR field_uri LIKE '%label%')
      `)
      .all(...termIdsFound);
    
    // Get translations for label fields
    const labelFieldIds = labelFields.map(f => f.id);
    let labelTranslations = [];
    
    if (labelFieldIds.length > 0) {
      const translationPlaceholders = labelFieldIds.map(() => '?').join(',');
      labelTranslations = db
        .prepare(`SELECT * FROM translations WHERE term_field_id IN (${translationPlaceholders})`)
        .all(...labelFieldIds);
    }
    
    // Build lookup maps
    const labelFieldsByTermId = {};
    for (const field of labelFields) {
      labelFieldsByTermId[field.term_id] = field;
    }
    
    const translationsByFieldId = {};
    for (const trans of labelTranslations) {
      if (!translationsByFieldId[trans.term_field_id]) {
        translationsByFieldId[trans.term_field_id] = [];
      }
      translationsByFieldId[trans.term_field_id].push(trans);
    }
    
    // Attach label fields to terms
    const termsWithLabels = terms.map(term => {
      const labelField = labelFieldsByTermId[term.id];
      return {
        ...term,
        labelField: labelField ? {
          ...labelField,
          translations: translationsByFieldId[labelField.id] || []
        } : null
      };
    });
    
    res.json(termsWithLabels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/stats:
 *   get:
 *     summary: Get translation statistics
 *     responses:
 *       200:
 *         description: Returns statistics about translations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTerms:
 *                   type: integer
 *                 totalTranslations:
 *                   type: integer
 *                 byLanguage:
 *                   type: object
 *                 byStatus:
 *                   type: object
 */
router.get("/stats", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    
    // Get total terms count
    const totalTerms = db.prepare("SELECT COUNT(*) as count FROM terms").get().count;
    
    // Get total translations count
    const totalTranslations = db.prepare("SELECT COUNT(*) as count FROM translations").get().count;
    
    // Get translation counts by language and status
    const byLanguageAndStatus = db.prepare(`
      SELECT 
        language,
        status,
        COUNT(*) as count
      FROM translations
      GROUP BY language, status
      ORDER BY language, status
    `).all();
    
    // Get translation counts by language (all statuses)
    const byLanguage = db.prepare(`
      SELECT 
        language,
        COUNT(*) as count
      FROM translations
      GROUP BY language
      ORDER BY language
    `).all();
    
    // Get translation counts by status (all languages)
    const byStatus = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM translations
      GROUP BY status
      ORDER BY status
    `).all();
    
    // Get user contribution counts
    const byUser = db.prepare(`
      SELECT 
        u.username,
        COUNT(t.id) as count
      FROM users u
      LEFT JOIN translations t ON u.id = t.created_by_id
      GROUP BY u.id, u.username
      ORDER BY count DESC
    `).all();
    
    // Format results
    const languageStats = {};
    for (const row of byLanguage) {
      languageStats[row.language] = {
        total: row.count,
        byStatus: {}
      };
    }
    
    // Add status breakdown per language
    for (const row of byLanguageAndStatus) {
      if (languageStats[row.language]) {
        languageStats[row.language].byStatus[row.status] = row.count;
      }
    }
    
    const statusStats = {};
    for (const row of byStatus) {
      statusStats[row.status] = row.count;
    }
    
    const userStats = {};
    for (const row of byUser) {
      userStats[row.username] = row.count;
    }
    
    res.json({
      totalTerms,
      totalTranslations,
      byLanguage: languageStats,
      byStatus: statusStats,
      byUser: userStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * @openapi
 * /api/user-history/{userId}:
 *   get:
 *     summary: Get a user's activity history
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (integer) or username (for backward compatibility)
 *     responses:
 *       200:
 *         description: Returns user activity history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/user-history/:userId", apiLimiter, (req, res) => {
  const { userId } = req.params;
  try {
    const db = getDatabase();
    const { resolveUsernameToId } = require("../db/database");
    
    // Resolve userId - could be integer ID or username for backward compatibility
    let resolvedUserId = parseInt(userId, 10);
    if (isNaN(resolvedUserId)) {
      // It's a username, resolve to ID
      resolvedUserId = resolveUsernameToId(userId);
      if (!resolvedUserId) {
        return res.status(404).json({ error: "User not found" });
      }
    }
    
    const history = db
      .prepare(
        "SELECT * FROM user_activity WHERE user_id = ? ORDER BY datetime(created_at) DESC"
      )
      .all(resolvedUserId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/user-reputation/{username}:
 *   post:
 *     summary: Change a user's reputation
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               delta:
 *                 type: integer
 *               reason:
 *                 type: string
 *               translation_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Returns updated reputation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post("/user-reputation/:username", writeLimiter, (req, res) => {
  const { username } = req.params;
  const { delta, reason, translation_id } = req.body;
  if (typeof delta !== "number" || !reason) {
    return res.status(400).json({ error: "Missing delta or reason" });
  }
  try {
    const result = applyReputationChange(
      username,
      delta,
      reason,
      translation_id || null
    );
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      username,
      reputation: result.newReputation,
      eventId: result.eventId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/user-reputation/{username}:
 *   get:
 *     summary: Get a user's reputation tier info
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns user reputation tier info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get("/user-reputation/:username", apiLimiter, (req, res) => {
  const { username } = req.params;
  try {
    const tierInfo = getReputationTierInfo(username);
    res.json({ username, ...tierInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/term-history/{term_id}:
 *   get:
 *     summary: Get all activity/history for a specific term
 *     parameters:
 *       - in: path
 *         name: term_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Returns term activity history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/term-history/:term_id", apiLimiter, (req, res) => {
  const { term_id } = req.params;
  try {
    const db = getDatabase();
    const history = db
      .prepare(
        "SELECT * FROM user_activity WHERE term_id = ? ORDER BY datetime(created_at) DESC"
      )
      .all(term_id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/terms/{id}:
 *   put:
 *     summary: Update a term and its translations
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
 *               uri:
 *                 type: string
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field_uri:
 *                       type: string
 *                     original_value:
 *                       type: string
 *                     translations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           language:
 *                             type: string
 *                           value:
 *                             type: string
 *                           status:
 *                             type: string
 *                           created_by:
 *                             type: string
 *               token:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Term updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 uri:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Invalid token or username
 *       500:
 *         description: Server error
 */
router.put("/terms/:id", writeLimiter, async (req, res) => {
  const { id } = req.params;
  const { uri, fields, username } = req.body;
  console.log("PUT /terms/:id called", { id, uri, fields, username });
  if (!uri || !Array.isArray(fields) || !username) {
    console.log("400: Missing uri, fields, or username", {
      uri,
      fields,
      username,
    });
    return res
      .status(400)
      .json({ error: "Missing uri, fields, or username" });
  }
  
  // Admin check removed - now using ORCID session auth
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Get the user_id from session
  const currentUserId = req.session.user.id || req.session.user.user_id;
  
  // Verify the user making the request matches the username field
  // Support both username and user_id in the username parameter for backward compatibility
  const db = getDatabase();
  const requestUser = db.prepare("SELECT id, username FROM users WHERE username = ? OR id = ?").get(username, parseInt(username) || 0);
  
  if (!requestUser || requestUser.id !== currentUserId) {
    console.log("403: User mismatch", { sessionUserId: currentUserId, requestUser });
    return res.status(403).json({ error: "User mismatch" });
  }
  
  try {
    // Fetch current term, fields, translations
    const oldTerm = db.prepare("SELECT * FROM terms WHERE id = ?").get(id);
    const oldFields = db
      .prepare("SELECT * FROM term_fields WHERE term_id = ?")
      .all(id);
    let oldTranslations = [];
    for (const field of oldFields) {
      const trans = db
        .prepare("SELECT * FROM translations WHERE term_field_id = ?")
        .all(field.id);
      oldTranslations = oldTranslations.concat(
        trans.map((t) => ({ ...t, term_field_id: field.id }))
      );
    }
    console.log("Old term, fields, translations", {
      oldTerm,
      oldFields,
      oldTranslations,
    });

    // Build a map of existing fields by field_uri for quick lookup
    const oldFieldMap = {};
    for (const f of oldFields) {
      oldFieldMap[f.field_uri] = f;
    }

    // Build a map of existing translations by field_id and language
    const oldTranslationMap = {};
    for (const t of oldTranslations) {
      const key = `${t.term_field_id}:${t.language}`;
      oldTranslationMap[key] = t;
    }

    // Track which old field IDs and translation IDs are still in use
    const usedFieldIds = new Set();
    const usedTranslationIds = new Set();

    // Process each incoming field
    const newFieldIdMap = {};
    for (const field of fields) {
      const { field_uri, original_value, translations } = field;
      console.log("Processing field", {
        field_uri,
        original_value,
        translations,
      });
      if (
        !field_uri ||
        !original_value ||
        !Array.isArray(translations)
      ) {
        console.log("Skipping field due to missing data", field);
        continue;
      }

      let fieldId;
      const existingField = oldFieldMap[field_uri];

      if (existingField) {
        // Update existing field if needed
        fieldId = existingField.id;
        usedFieldIds.add(fieldId);
        if (
          existingField.original_value !== original_value
        ) {
          db.prepare(
            "UPDATE term_fields SET original_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).run(original_value, fieldId);
          console.log("Updated term_field", { field_uri, fieldId });
        }
      } else {
        // Insert new field - determine field_role based on existing term's source configuration
        let fieldRole = null;
        const termSourceId = db.prepare("SELECT source_id FROM terms WHERE id = ?").get(id)?.source_id;
        if (termSourceId) {
          const source = db.prepare("SELECT label_field_uri, reference_field_uris, translatable_field_uris FROM sources WHERE source_id = ?").get(termSourceId);
          if (source) {
            if (source.label_field_uri === field_uri) {
              fieldRole = 'label';
            } else if (source.reference_field_uris) {
              try {
                const refUris = JSON.parse(source.reference_field_uris);
                if (Array.isArray(refUris) && refUris.includes(field_uri)) {
                  fieldRole = 'reference';
                }
              } catch (e) {}
            } else if (source.translatable_field_uris) {
              try {
                const transUris = JSON.parse(source.translatable_field_uris);
                if (Array.isArray(transUris) && transUris.includes(field_uri)) {
                  fieldRole = 'translatable';
                }
              } catch (e) {}
            }
          }
        }
        
        const fieldStmt = db.prepare(
          "INSERT INTO term_fields (term_id, field_uri, field_role, original_value) VALUES (?, ?, ?, ?)"
        );
        const fieldInfo = fieldStmt.run(
          id,
          field_uri,
          fieldRole,
          original_value
        );
        fieldId = fieldInfo.lastInsertRowid;
        console.log("Inserted term_field", { field_uri, fieldId, fieldRole });
      }
      newFieldIdMap[field_uri] = fieldId;

      // Process translations for this field
      for (const t of translations) {
        const { language, value, status, created_by } = t;
        console.log("Processing translation", {
          fieldId,
          language,
          value,
          status,
          created_by,
        });
        if (!language || !value) {
          console.log("Skipping translation due to missing data", t);
          continue;
        }

        const translationKey = `${fieldId}:${language}`;
        const existingTranslation = oldTranslationMap[translationKey];

        if (existingTranslation) {
          // Update existing translation - preserves the ID and any appeals referencing it
          usedTranslationIds.add(existingTranslation.id);
          const needsUpdate =
            existingTranslation.value !== value ||
            existingTranslation.status !== (status || "draft");

          if (needsUpdate) {
            db.prepare(
              "UPDATE translations SET value = ?, status = ?, modified_at = CURRENT_TIMESTAMP, modified_by_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            ).run(value, status || "draft", currentUserId, existingTranslation.id);
            console.log("Updated translation", {
              id: existingTranslation.id,
              fieldId,
              language,
              value,
            });
          }

          // User activity logging for existing translation
          if (existingTranslation.value !== value) {
            console.log("Logging translation_edited activity", {
              userId: currentUserId,
              field_uri,
              language,
              old_value: existingTranslation.value,
              new_value: value,
            });
            db.prepare(
              "INSERT INTO user_activity (user_id, action, term_id, term_field_id, translation_id, extra) VALUES (?, ?, ?, ?, ?, ?)"
            ).run(
              currentUserId,
              "translation_edited",
              id,
              fieldId,
              existingTranslation.id,
              JSON.stringify({
                field_uri,
                language,
                old_value: existingTranslation.value,
                new_value: value,
              })
            );
          } else if (existingTranslation.status !== (status || "draft")) {
            console.log("Logging translation_status_changed activity", {
              userId: currentUserId,
              field_uri,
              language,
              old_status: existingTranslation.status,
              new_status: status || "draft",
            });
            db.prepare(
              "INSERT INTO user_activity (user_id, action, term_id, term_field_id, translation_id, extra) VALUES (?, ?, ?, ?, ?, ?)"
            ).run(
              currentUserId,
              "translation_status_changed",
              id,
              fieldId,
              existingTranslation.id,
              JSON.stringify({
                field_uri,
                language,
                old_status: existingTranslation.status,
                new_status: status || "draft",
              })
            );

            // Apply reputation penalties based on status change
            const newStatus = status || "draft";
            const oldStatus = existingTranslation.status;

            // When status changes to 'rejected', apply rejection penalty to the translator
            if (oldStatus !== "rejected" && newStatus === "rejected") {
              // Get the user who created/modified the translation
              const translatorUserId =
                existingTranslation.modified_by_id ||
                existingTranslation.created_by_id;
              if (translatorUserId) {
                const penaltyResult = applyRejectionPenalty(
                  translatorUserId,
                  existingTranslation.id
                );
                console.log("Applied rejection penalty", {
                  translatorUserId,
                  penaltyResult,
                });
              }
            }

            // When status changes to 'approved', reward the translator
            if (oldStatus !== "approved" && newStatus === "approved") {
              const translatorUserId =
                existingTranslation.modified_by_id ||
                existingTranslation.created_by_id;
              if (translatorUserId) {
                const rewardResult = applyApprovalReward(
                  translatorUserId,
                  existingTranslation.id
                );
                console.log("Applied approval reward", {
                  translatorUserId,
                  rewardResult,
                });
              }
            }

            // When status changes to 'merged', reward the translator and check for false rejections
            if (oldStatus !== "merged" && newStatus === "merged") {
              // Reward the translator for merged translation
              const translatorUserId =
                existingTranslation.modified_by_id ||
                existingTranslation.created_by_id;
              if (translatorUserId) {
                const rewardResult = applyMergeReward(
                  translatorUserId,
                  existingTranslation.id
                );
                console.log("Applied merge reward", {
                  translatorUserId,
                  rewardResult,
                });
              }

              // Find previous rejections of translations with same value
              // that were reviewed by someone other than the current user
              const previousRejections = db
                .prepare(
                  `SELECT DISTINCT ua.user_id as reviewer_id
                   FROM user_activity ua
                   WHERE ua.translation_id = ?
                     AND ua.action = 'translation_status_changed'
                     AND ua.extra LIKE '%"new_status":"rejected"%'
                     AND ua.user_id != ?`
                )
                .all(existingTranslation.id, currentUserId);

              for (const rejection of previousRejections) {
                // The reviewer who rejected it was wrong (false rejection)
                if (rejection.reviewer_id) {
                  const falseRejectionResult = applyFalseRejectionPenalty(
                    rejection.reviewer_id,
                    existingTranslation.id
                  );
                  console.log("Applied false rejection penalty", {
                    reviewerUserId: rejection.reviewer_id,
                    falseRejectionResult,
                  });
                }
              }
            }
          }
        } else {
          // Insert new translation
          // Validate created_by for new translations only
          if (!created_by) {
            console.log("Skipping new translation due to missing created_by", t);
            continue;
          }
          
          // Resolve created_by to user_id
          const createdByUser = db.prepare("SELECT id FROM users WHERE username = ? OR id = ?").get(created_by, parseInt(created_by) || 0);
          if (!createdByUser) {
            console.error("Error: Created_by user not found", created_by);
            return res.status(400).json({ 
              error: `Invalid created_by user: ${created_by}` 
            });
          }
          const createdByUserId = createdByUser.id;
          
          const translationResult = db
            .prepare(
              "INSERT INTO translations (term_field_id, language, value, status, created_by_id) VALUES (?, ?, ?, ?, ?)"
            )
            .run(fieldId, language, value, status || "draft", createdByUserId);
          console.log("Inserted translation", {
            translationResult,
            fieldId,
            language,
            value,
          });

          // User activity logging for new translation
          console.log("Logging translation_created activity", {
            userId: createdByUserId,
            field_uri,
            language,
            value,
            status: status || "draft",
          });
          db.prepare(
            "INSERT INTO user_activity (user_id, action, term_id, term_field_id, translation_id, extra) VALUES (?, ?, ?, ?, ?, ?)"
          ).run(
            createdByUserId,
            "translation_created",
            id,
            fieldId,
            translationResult.lastInsertRowid,
            JSON.stringify({ field_uri, language, value, status: status || "draft" })
          );

          // Apply creation reward for new translations
          const creationRewardResult = applyCreationReward(
            createdByUserId,
            translationResult.lastInsertRowid
          );
          console.log("Applied creation reward", {
            createdByUserId,
            creationRewardResult,
          });
        }
      }
    }

    // Delete translations that are no longer in the incoming data
    // Note: This will cascade delete appeals for removed translations
    for (const oldT of oldTranslations) {
      if (!usedTranslationIds.has(oldT.id)) {
        console.log("Deleting unused translation", oldT.id);
        db.prepare("DELETE FROM translations WHERE id = ?").run(oldT.id);
      }
    }

    // Delete fields that are no longer in the incoming data
    for (const oldF of oldFields) {
      if (!usedFieldIds.has(oldF.id)) {
        console.log("Deleting unused term_field", oldF.id);
        db.prepare("DELETE FROM term_fields WHERE id = ?").run(oldF.id);
      }
    }
    // 4. Update term URI if changed
    if (oldTerm && oldTerm.uri !== uri) {
      console.log("Updating term URI", { old_uri: oldTerm.uri, new_uri: uri });
      db.prepare("UPDATE terms SET uri = ? WHERE id = ?").run(uri, id);
    }
    // 5. Commit and push after DB update
    console.log("Committing and pushing changes", { id, username });
    console.log("PUT /terms/:id success", { id, uri });
    res.json({ id, uri });
  } catch (err) {
    console.error("PUT /terms/:id error", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/harvest:
 *   post:
 *     summary: Harvest terms from a SKOS collection URI
 *     description: Fetches terms from a SPARQL endpoint and populates the translations database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collectionUri:
 *                 type: string
 *                 description: URI of the SKOS collection to harvest
 *                 example: 'http://vocab.nerc.ac.uk/collection/P01/current/'
 *     responses:
 *       200:
 *         description: Harvest completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 termsInserted:
 *                   type: integer
 *                 termsUpdated:
 *                   type: integer
 *                 fieldsInserted:
 *                   type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request - missing collection URI
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Harvest failed
 */
router.post("/harvest", writeLimiter, async (req, res) => {
  const { collectionUri } = req.body;
  
  if (!collectionUri) {
    return res.status(400).json({ error: "Missing collectionUri" });
  }
  
  // Require authentication for harvest operations
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    console.log(`[Harvest API] Starting harvest for: ${collectionUri}`);
    const result = await harvestCollection(collectionUri);
    
    res.json({
      success: result.success,
      termsInserted: result.termsInserted,
      termsUpdated: result.termsUpdated,
      fieldsInserted: result.fieldsInserted,
      message: `Harvest completed: ${result.termsInserted} terms inserted, ${result.termsUpdated} terms updated, ${result.fieldsInserted} fields inserted`,
    });
  } catch (err) {
    console.error(`[Harvest API] Error:`, err);
    res.status(500).json({ 
      error: "Harvest failed", 
      details: err.message 
    });
  }
});

/**
 * @openapi
 * /api/harvest/stream:
 *   post:
 *     summary: Harvest terms from a SKOS collection URI with real-time progress updates
 *     description: Fetches terms from a SPARQL endpoint and streams progress updates using Server-Sent Events (SSE)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collectionUri:
 *                 type: string
 *                 description: URI of the SKOS collection to harvest
 *                 example: 'http://vocab.nerc.ac.uk/collection/P01/current/'
 *     responses:
 *       200:
 *         description: Server-Sent Events stream with progress updates
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request - missing collection URI
 *       401:
 *         description: Not authenticated
 */
router.post("/harvest/stream", writeLimiter, async (req, res) => {
  const { collectionUri } = req.body;
  
  if (!collectionUri) {
    return res.status(400).json({ error: "Missing collectionUri" });
  }
  
  // Require authentication for harvest operations
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Disable nginx buffering for real-time streaming (not needed in all environments)
  res.setHeader('X-Accel-Buffering', 'no');
  
  // CORS headers for SSE streaming
  // SSE requires explicit CORS headers on the response, even when app-level CORS middleware
  // is configured, because the streaming response is sent progressively over time
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  /**
   * Helper function to safely send SSE messages with error handling
   */
  const sendSSE = (data) => {
    try {
      const jsonData = JSON.stringify(data);
      res.write(`data: ${jsonData}\n\n`);
      return true;
    } catch (err) {
      console.error('[Harvest Stream API] Failed to serialize SSE data:', err);
      try {
        // Send a simplified error message
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: 'Failed to serialize progress data' 
        })}\n\n`);
      } catch (e) {
        // If even the error message fails, just log it
        console.error('[Harvest Stream API] Failed to send error message:', e);
      }
      return false;
    }
  };

  // Send initial connection message
  sendSSE({ type: 'connected', message: 'Connected to harvest stream' });

  try {
    console.log(`[Harvest Stream API] Starting harvest for: ${collectionUri}`);
    
    // Execute harvest with progress callback
    const result = await harvestCollectionWithProgress(collectionUri, (progress) => {
      // Send progress update via SSE with error handling
      sendSSE(progress);
    });
    
    // Send final completion message
    sendSSE({ 
      type: 'done', 
      message: 'Harvest completed successfully',
      data: {
        success: result.success,
        termsInserted: result.termsInserted,
        termsUpdated: result.termsUpdated,
        fieldsInserted: result.fieldsInserted
      }
    });
    
    res.end();
  } catch (err) {
    console.error(`[Harvest Stream API] Error:`, err);
    
    // Send error via SSE
    sendSSE({ 
      type: 'error', 
      message: err.message || 'Unknown error occurred' 
    });
    
    res.end();
  }
});

module.exports = router;
