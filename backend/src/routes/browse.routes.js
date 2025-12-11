// Browse routes - handles search and faceted browsing with FTS5

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter } = require("../middleware/rateLimit");

/**
 * @openapi
 * /api/browse:
 *   get:
 *     summary: Search and browse terms with faceted filtering
 *     description: |
 *       Search through terms using full-text search (FTS5) and filter by facets.
 *       Returns paginated results with facet counts.
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Full-text search query (searches uri, field_term, original_value, translation values)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results to return (default 20, max 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip for pagination (default 0)
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by translation language (e.g., 'fr', 'nl', 'de')
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by translation status (e.g., 'approved', 'draft', 'review')
 *       - in: query
 *         name: field_uri
 *         schema:
 *           type: string
 *         description: Filter by field URI
 *       - in: query
 *         name: facets
 *         schema:
 *           type: string
 *         description: Comma-separated list of facets to compute (e.g., 'language,status,field_uri')
 *     responses:
 *       200:
 *         description: Search results with facets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                   description: Total number of matching results
 *                 facets:
 *                   type: object
 *                   description: Facet counts for each requested facet
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get("/browse", apiLimiter, (req, res) => {
  try {
    const db = getDatabase();
    
    // Parse parameters
    const searchQuery = req.query.query || '';
    let limit = parseInt(req.query.limit) || 20;
    let offset = parseInt(req.query.offset) || 0;
    const languageFilter = req.query.language || null;
    const statusFilter = req.query.status || null;
    const fieldUriFilter = req.query.field_uri || null;
    const requestedFacets = req.query.facets ? req.query.facets.split(',').map(f => f.trim()) : [];
    
    // Validate and cap parameters
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;
    
    // Build WHERE clauses for filters
    const whereClauses = [];
    const params = [];
    
    // If there's a search query, use FTS
    if (searchQuery) {
      // Search in both terms and translations FTS tables
      // terms_fts contains term_fields data (rowid = term_field.id)
      // translations_fts contains translation data (rowid = translation.id)
      whereClauses.push(`(
        tf.id IN (
          SELECT rowid FROM terms_fts WHERE terms_fts MATCH ?
        ) OR 
        tr.id IN (
          SELECT rowid FROM translations_fts WHERE translations_fts MATCH ?
        )
      )`);
      params.push(searchQuery, searchQuery);
    }
    
    // Apply facet filters
    if (languageFilter) {
      whereClauses.push('tr.language = ?');
      params.push(languageFilter);
    }
    
    if (statusFilter) {
      whereClauses.push('tr.status = ?');
      params.push(statusFilter);
    }
    
    if (fieldUriFilter) {
      whereClauses.push('tf.field_uri = ?');
      params.push(fieldUriFilter);
    }
    
    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Get total count of matching results
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM terms t
      LEFT JOIN term_fields tf ON t.id = tf.term_id
      LEFT JOIN translations tr ON tf.id = tr.term_field_id
      ${whereSQL}
    `;
    const totalCount = db.prepare(countQuery).get(...params).count;
    
    // Get paginated results
    // Group by term to avoid duplicates
    const resultsQuery = `
      SELECT DISTINCT t.id, t.uri
      FROM terms t
      LEFT JOIN term_fields tf ON t.id = tf.term_id
      LEFT JOIN translations tr ON tf.id = tr.term_field_id
      ${whereSQL}
      ORDER BY t.id
      LIMIT ? OFFSET ?
    `;
    const termResults = db.prepare(resultsQuery).all(...params, limit, offset);
    
    // For each term, get full details with fields and translations
    const results = termResults.map((term) => {
      // Get fields for this term
      const fields = db
        .prepare("SELECT * FROM term_fields WHERE term_id = ?")
        .all(term.id);
      
      // Get translations for all fields in one query
      const fieldIds = fields.map(f => f.id);
      let allTranslations = [];
      
      if (fieldIds.length > 0) {
        const placeholders = fieldIds.map(() => '?').join(',');
        allTranslations = db
          .prepare(`SELECT * FROM translations WHERE term_field_id IN (${placeholders})`)
          .all(...fieldIds);
      }
      
      // Group translations by field
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
      
      // Find key fields for simplified result format
      const prefLabelField = fieldsWithTranslations.find(f => f.field_term === 'skos:prefLabel');
      const definitionField = fieldsWithTranslations.find(f => f.field_term === 'skos:definition');
      
      return {
        uri: term.uri,
        field_term: prefLabelField?.field_term || null,
        original_value: prefLabelField?.original_value || definitionField?.original_value || null,
        translations: fieldsWithTranslations.flatMap(f => f.translations).map(t => ({
          language: t.language,
          value: t.value,
          status: t.status
        }))
      };
    });
    
    // Compute requested facets
    const facets = {};
    
    if (requestedFacets.includes('language')) {
      const langFacetQuery = `
        SELECT tr.language, COUNT(DISTINCT tr.id) as count
        FROM terms t
        LEFT JOIN term_fields tf ON t.id = tf.term_id
        LEFT JOIN translations tr ON tf.id = tr.term_field_id
        ${whereSQL}
        AND tr.language IS NOT NULL
        GROUP BY tr.language
        ORDER BY count DESC
      `;
      const langResults = db.prepare(langFacetQuery).all(...params);
      facets.language = {};
      langResults.forEach(row => {
        facets.language[row.language] = row.count;
      });
    }
    
    if (requestedFacets.includes('status')) {
      const statusFacetQuery = `
        SELECT tr.status, COUNT(DISTINCT tr.id) as count
        FROM terms t
        LEFT JOIN term_fields tf ON t.id = tf.term_id
        LEFT JOIN translations tr ON tf.id = tr.term_field_id
        ${whereSQL}
        AND tr.status IS NOT NULL
        GROUP BY tr.status
        ORDER BY count DESC
      `;
      const statusResults = db.prepare(statusFacetQuery).all(...params);
      facets.status = {};
      statusResults.forEach(row => {
        facets.status[row.status] = row.count;
      });
    }
    
    if (requestedFacets.includes('field_uri')) {
      const fieldUriFacetQuery = `
        SELECT tf.field_uri, COUNT(DISTINCT tf.id) as count
        FROM terms t
        LEFT JOIN term_fields tf ON t.id = tf.term_id
        LEFT JOIN translations tr ON tf.id = tr.term_field_id
        ${whereSQL}
        AND tf.field_uri IS NOT NULL
        GROUP BY tf.field_uri
        ORDER BY count DESC
        LIMIT 50
      `;
      const fieldUriResults = db.prepare(fieldUriFacetQuery).all(...params);
      facets.field_uri = {};
      fieldUriResults.forEach(row => {
        facets.field_uri[row.field_uri] = row.count;
      });
    }
    
    res.json({
      results,
      total: totalCount,
      limit,
      offset,
      facets
    });
  } catch (err) {
    console.error("[Browse API] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
