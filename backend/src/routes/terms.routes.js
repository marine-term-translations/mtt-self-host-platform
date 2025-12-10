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
      return { ...term, fields: fieldsWithTranslations };
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
  try {
    const db = getDatabase();
    
    // Get the term
    const term = db.prepare("SELECT * FROM terms WHERE id = ?").get(id);
    
    if (!term) {
      return res.status(404).json({ error: "Term not found" });
    }
    
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
    
    res.json({ ...term, fields: fieldsWithTranslations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

/**
 * @openapi
 * /api/user-history/{username}:
 *   get:
 *     summary: Get a user's activity history
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
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
router.get("/user-history/:username", apiLimiter, (req, res) => {
  const { username } = req.params;
  try {
    const db = getDatabase();
    const history = db
      .prepare(
        "SELECT * FROM user_activity WHERE user = ? ORDER BY created_at DESC"
      )
      .all(username);
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
        "SELECT * FROM user_activity WHERE term_id = ? ORDER BY created_at DESC"
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
 *                     field_term:
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
  
  // Verify the user making the request matches the username field
  if (req.session.user.orcid !== username && req.session.user.name !== username) {
    console.log("403: User mismatch", { sessionUser: req.session.user, username });
    return res.status(403).json({ error: "User mismatch" });
  }
  
  try {
    const db = getDatabase();
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
      const { field_uri, field_term, original_value, translations } = field;
      console.log("Processing field", {
        field_uri,
        field_term,
        original_value,
        translations,
      });
      if (
        !field_uri ||
        !field_term ||
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
          existingField.field_term !== field_term ||
          existingField.original_value !== original_value
        ) {
          db.prepare(
            "UPDATE term_fields SET field_term = ?, original_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).run(field_term, original_value, fieldId);
          console.log("Updated term_field", { field_uri, fieldId });
        }
      } else {
        // Insert new field
        const fieldStmt = db.prepare(
          "INSERT INTO term_fields (term_id, field_uri, field_term, original_value) VALUES (?, ?, ?, ?)"
        );
        const fieldInfo = fieldStmt.run(
          id,
          field_uri,
          field_term,
          original_value
        );
        fieldId = fieldInfo.lastInsertRowid;
        console.log("Inserted term_field", { field_uri, fieldId });
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
        if (!language || !value || !created_by) {
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
              "UPDATE translations SET value = ?, status = ?, modified_at = CURRENT_TIMESTAMP, modified_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            ).run(value, status || "draft", username, existingTranslation.id);
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
              username,
              field_uri,
              language,
              old_value: existingTranslation.value,
              new_value: value,
            });
            db.prepare(
              "INSERT INTO user_activity (user, action, term_id, term_field_id, translation_id, extra) VALUES (?, ?, ?, ?, ?, ?)"
            ).run(
              username,
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
              username,
              field_uri,
              language,
              old_status: existingTranslation.status,
              new_status: status || "draft",
            });
            db.prepare(
              "INSERT INTO user_activity (user, action, term_id, term_field_id, translation_id, extra) VALUES (?, ?, ?, ?, ?, ?)"
            ).run(
              username,
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
              const translatorUsername =
                existingTranslation.modified_by ||
                existingTranslation.created_by;
              if (translatorUsername) {
                const penaltyResult = applyRejectionPenalty(
                  translatorUsername,
                  existingTranslation.id
                );
                console.log("Applied rejection penalty", {
                  translatorUsername,
                  penaltyResult,
                });
              }
            }

            // When status changes to 'approved', reward the translator
            if (oldStatus !== "approved" && newStatus === "approved") {
              const translatorUsername =
                existingTranslation.modified_by ||
                existingTranslation.created_by;
              if (translatorUsername) {
                const rewardResult = applyApprovalReward(
                  translatorUsername,
                  existingTranslation.id
                );
                console.log("Applied approval reward", {
                  translatorUsername,
                  rewardResult,
                });
              }
            }

            // When status changes to 'merged', reward the translator and check for false rejections
            if (oldStatus !== "merged" && newStatus === "merged") {
              // Reward the translator for merged translation
              const translatorUsername =
                existingTranslation.modified_by ||
                existingTranslation.created_by;
              if (translatorUsername) {
                const rewardResult = applyMergeReward(
                  translatorUsername,
                  existingTranslation.id
                );
                console.log("Applied merge reward", {
                  translatorUsername,
                  rewardResult,
                });
              }

              // Find previous rejections of translations with same value
              // that were reviewed by someone other than the current user
              const previousRejections = db
                .prepare(
                  `SELECT DISTINCT ua.user as reviewer
                   FROM user_activity ua
                   WHERE ua.translation_id = ?
                     AND ua.action = 'translation_status_changed'
                     AND ua.extra LIKE '%"new_status":"rejected"%'
                     AND ua.user != ?`
                )
                .all(existingTranslation.id, username);

              for (const rejection of previousRejections) {
                // The reviewer who rejected it was wrong (false rejection)
                if (rejection.reviewer) {
                  const falseRejectionResult = applyFalseRejectionPenalty(
                    rejection.reviewer,
                    existingTranslation.id
                  );
                  console.log("Applied false rejection penalty", {
                    reviewerUsername: rejection.reviewer,
                    falseRejectionResult,
                  });
                }
              }
            }
          }
        } else {
          // Insert new translation
          const translationResult = db
            .prepare(
              "INSERT INTO translations (term_field_id, language, value, status, created_by) VALUES (?, ?, ?, ?, ?)"
            )
            .run(fieldId, language, value, status || "draft", created_by);
          console.log("Inserted translation", {
            translationResult,
            fieldId,
            language,
            value,
          });

          // User activity logging for new translation
          console.log("Logging translation_created activity", {
            username,
            field_uri,
            language,
            value,
          });
          db.prepare(
            "INSERT INTO user_activity (user, action, term_id, term_field_id, translation_id, extra) VALUES (?, ?, ?, ?, ?, ?)"
          ).run(
            username,
            "translation_created",
            id,
            fieldId,
            translationResult.lastInsertRowid,
            JSON.stringify({ field_uri, language, value })
          );

          // Apply creation reward for new translations
          const creationRewardResult = applyCreationReward(
            created_by,
            translationResult.lastInsertRowid
          );
          console.log("Applied creation reward", {
            created_by,
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
