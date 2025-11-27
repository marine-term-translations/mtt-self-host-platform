// Terms routes - handles term CRUD operations

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");

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
router.post("/terms", (req, res) => {
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
 * /api/terms/{id}:
 *   put:
 *     summary: Update a term
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
 *     responses:
 *       200:
 *         description: Term updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.put("/terms/:id", (req, res) => {
  const { id } = req.params;
  const { uri } = req.body;
  if (!uri) return res.status(400).json({ error: "Missing uri" });
  try {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE terms SET uri = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );
    const info = stmt.run(uri, id);
    if (info.changes === 0)
      return res.status(404).json({ error: "Term not found" });
    res.json({ id, uri });
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
router.get("/terms", (req, res) => {
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
