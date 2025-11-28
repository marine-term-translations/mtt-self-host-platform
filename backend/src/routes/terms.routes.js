// Terms routes - handles term CRUD operations

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");

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
 *     summary: List all SKOS/RDF terms
 *     responses:
 *       200:
 *         description: Returns all terms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/terms", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    // Get all terms
    const terms = db.prepare("SELECT * FROM terms").all();
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
    res.json(termDetails);
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
 *               related_activity_id:
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
  const { delta, reason, related_activity_id } = req.body;
  if (typeof delta !== "number" || !reason) {
    return res.status(400).json({ error: "Missing delta or reason" });
  }
  try {
    const db = getDatabase();
    // Update reputation
    db.prepare(
      "UPDATE users SET reputation = reputation + ? WHERE username = ?"
    ).run(delta, username);
    // Log event
    db.prepare(
      "INSERT INTO reputation_events (user, delta, reason, related_activity_id) VALUES (?, ?, ?, ?)"
    ).run(username, delta, reason, related_activity_id || null);
    // Return updated reputation
    const user = db
      .prepare("SELECT reputation FROM users WHERE username = ?")
      .get(username);
    res.json({ username, reputation: user ? user.reputation : null });
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
// PATCH: Ensure correct deletion and insertion order for term_fields and translations
router.put("/terms/:id", writeLimiter, async (req, res) => {
  const { id } = req.params;
  const { uri, fields, token, username } = req.body;
  console.log("PUT /terms/:id called", { id, uri, fields, token, username });
  if (!uri || !Array.isArray(fields) || !token || !username) {
    console.log("400: Missing uri, fields, token, or username", {
      uri,
      fields,
      token,
      username,
    });
    return res
      .status(400)
      .json({ error: "Missing uri, fields, token, or username" });
  }
  const { checkAdminStatus } = require("../services/gitea.service");
  const { gitPull, gitCommitAndPush } = require("../db/gitOps");
  try {
    console.log("Calling gitPull()");
    //gitPull();
    console.log("Checking admin status for token", token);
    const userInfo = await checkAdminStatus(token);
    console.log("Admin status result", userInfo);
    if (!userInfo || userInfo.username !== username) {
      console.log("403: Invalid token for username", { userInfo, username });
      return res.status(403).json({ error: "Invalid token for username" });
    }
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
    // 1. Delete translations first
    for (const field of oldFields) {
      console.log("Deleting translations for field", field.id);
      db.prepare("DELETE FROM translations WHERE term_field_id = ?").run(
        field.id
      );
    }
    // 2. Delete term_fields
    console.log("Deleting term_fields for term", id);
    db.prepare("DELETE FROM term_fields WHERE term_id = ?").run(id);
    // 3. Insert new term_fields and translations
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
      const fieldStmt = db.prepare(
        "INSERT INTO term_fields (term_id, field_uri, field_term, original_value) VALUES (?, ?, ?, ?)"
      );
      const fieldInfo = fieldStmt.run(
        id,
        field_uri,
        field_term,
        original_value
      );
      const fieldId = fieldInfo.lastInsertRowid;
      console.log("Inserted term_field", { field_uri, fieldId });
      newFieldIdMap[field_uri] = fieldId;
      for (const t of translations) {
        const { language, value, status, created_by } = t;
        console.log("Preparing to insert translation", {
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
        // User activity logging
        // Find old translation for comparison
        const oldField = oldFields.find((f) => f.field_uri === field_uri);
        const oldT = oldField
          ? oldTranslations.find(
              (ot) =>
                ot.term_field_id === oldField.id && ot.language === language
            )
          : undefined;
        if (!oldT) {
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
            null,
            JSON.stringify({ field_uri, language, value })
          );
        } else if (oldT.value !== value) {
          console.log("Logging translation_edited activity", {
            username,
            field_uri,
            language,
            old_value: oldT.value,
            new_value: value,
          });
          db.prepare(
            "INSERT INTO user_activity (user, action, term_id, term_field_id, translation_id, extra) VALUES (?, ?, ?, ?, ?, ?)"
          ).run(
            username,
            "translation_edited",
            id,
            fieldId,
            null,
            JSON.stringify({
              field_uri,
              language,
              old_value: oldT.value,
              new_value: value,
            })
          );
        } else if (oldT.status !== status) {
          console.log("Logging translation_status_changed activity", {
            username,
            field_uri,
            language,
            old_status: oldT.status,
            new_status: status,
          });
          db.prepare(
            "INSERT INTO user_activity (user, action, term_id, term_field_id, translation_id, extra) VALUES (?, ?, ?, ?, ?, ?)"
          ).run(
            username,
            "translation_status_changed",
            id,
            fieldId,
            null,
            JSON.stringify({
              field_uri,
              language,
              old_status: oldT.status,
              new_status: status,
            })
          );
        }
      }
    }
    // 4. Update term URI if changed
    if (oldTerm && oldTerm.uri !== uri) {
      console.log("Updating term URI", { old_uri: oldTerm.uri, new_uri: uri });
      db.prepare("UPDATE terms SET uri = ? WHERE id = ?").run(uri, id);
    }
    // 5. Commit and push after DB update
    console.log("Committing and pushing changes", { id, username });
    gitCommitAndPush(`Term ${id} updated by ${username}`, username);
    console.log("PUT /terms/:id success", { id, uri });
    res.json({ id, uri });
  } catch (err) {
    console.error("PUT /terms/:id error", err);
    res.status(500).json({ error: err.message });
  }
});
