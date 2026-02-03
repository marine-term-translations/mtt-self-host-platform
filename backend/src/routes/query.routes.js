// Query routes - handles database query execution for admin

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");

// Predefined safe queries
const PREDEFINED_QUERIES = {
  'all_sources': {
    name: 'All Sources',
    description: 'List all data sources with their types',
    sql: 'SELECT source_id, source_path, source_type, graph_name, created_at FROM sources ORDER BY datetime(created_at) DESC'
  },
  'sources_by_type': {
    name: 'Sources by Type',
    description: 'Count sources grouped by type',
    sql: 'SELECT source_type, COUNT(*) as count FROM sources GROUP BY source_type'
  },
  'recent_terms': {
    name: 'Recent Terms',
    description: 'Last 10 terms added',
    sql: 'SELECT id, uri, created_at FROM terms ORDER BY datetime(created_at) DESC LIMIT 10'
  },
  'translation_stats': {
    name: 'Translation Statistics',
    description: 'Translation count by status and language',
    sql: 'SELECT status, language, COUNT(*) as count FROM translations GROUP BY status, language ORDER BY status, language'
  },
  'user_activity': {
    name: 'User Activity Summary',
    description: 'Most active users by action count',
    sql: 'SELECT user_id, action, COUNT(*) as count FROM user_activity GROUP BY user_id, action ORDER BY count DESC LIMIT 20'
  },
  'appeals_summary': {
    name: 'Appeals Summary',
    description: 'Appeals grouped by status',
    sql: 'SELECT status, COUNT(*) as count FROM appeals GROUP BY status'
  },
  'terms_with_sources': {
    name: 'Terms with Source Info',
    description: 'Terms linked to their data sources',
    sql: `SELECT t.id, t.uri, s.source_type, s.source_path 
          FROM terms t 
          LEFT JOIN sources s ON t.source_id = s.source_id 
          ORDER BY datetime(t.created_at) DESC LIMIT 20`
  },
  'fts_search_test': {
    name: 'Full-Text Search Test',
    description: 'Search terms using FTS (example: marine)',
    sql: `SELECT tf.field_uri, tf.original_value, t.uri 
          FROM terms_fts 
          JOIN term_fields tf ON terms_fts.rowid = tf.id 
          JOIN terms t ON tf.term_id = t.id 
          WHERE terms_fts MATCH 'marine' LIMIT 10`
  },
  'database_schema': {
    name: 'Database Tables',
    description: 'List all tables in the database',
    sql: "SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name"
  },
  'table_info': {
    name: 'Table Structure',
    description: 'View structure of sources table',
    sql: "PRAGMA table_info(sources)"
  }
};

/**
 * @openapi
 * /api/query/predefined:
 *   get:
 *     summary: Get list of predefined queries
 *     responses:
 *       200:
 *         description: Returns list of available predefined queries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get("/query/predefined", apiLimiter, (req, res) => {
  const queries = Object.keys(PREDEFINED_QUERIES).map(key => ({
    id: key,
    ...PREDEFINED_QUERIES[key]
  }));
  
  res.json({ queries });
});

/**
 * @openapi
 * /api/query/execute:
 *   post:
 *     summary: Execute a predefined query
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - queryId
 *             properties:
 *               queryId:
 *                 type: string
 *                 description: ID of the predefined query to execute
 *     responses:
 *       200:
 *         description: Query executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                 rowCount:
 *                   type: integer
 *       400:
 *         description: Invalid query ID
 *       500:
 *         description: Query execution error
 */
router.post("/query/execute", writeLimiter, (req, res) => {
  const { queryId } = req.body;
  
  if (!queryId || !PREDEFINED_QUERIES[queryId]) {
    return res.status(400).json({ error: "Invalid query ID" });
  }
  
  try {
    const db = getDatabase();
    const query = PREDEFINED_QUERIES[queryId];
    
    // Execute query
    const results = db.prepare(query.sql).all();
    
    res.json({
      query: {
        id: queryId,
        name: query.name,
        description: query.description,
        sql: query.sql
      },
      results,
      rowCount: results.length
    });
  } catch (err) {
    console.error('Query execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/query/custom:
 *   post:
 *     summary: Execute a custom SQL query (admin only, read-only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sql
 *             properties:
 *               sql:
 *                 type: string
 *                 description: SQL query to execute (SELECT only)
 *     responses:
 *       200:
 *         description: Query executed successfully
 *       400:
 *         description: Invalid query (must be SELECT)
 *       500:
 *         description: Query execution error
 */
router.post("/query/custom", writeLimiter, (req, res) => {
  const { sql } = req.body;
  
  if (!sql) {
    return res.status(400).json({ error: "Missing SQL query" });
  }
  
  // Security: Only allow SELECT queries
  const trimmedSql = sql.trim().toUpperCase();
  if (!trimmedSql.startsWith('SELECT') && !trimmedSql.startsWith('PRAGMA')) {
    return res.status(400).json({ 
      error: "Only SELECT and PRAGMA queries are allowed" 
    });
  }
  
  // Additional security: Prevent certain dangerous patterns
  const dangerous = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE'];
  for (const keyword of dangerous) {
    if (trimmedSql.includes(keyword)) {
      return res.status(400).json({ 
        error: `Query contains forbidden keyword: ${keyword}` 
      });
    }
  }
  
  try {
    const db = getDatabase();
    
    // Execute query with timeout
    const results = db.prepare(sql).all();
    
    res.json({
      sql,
      results,
      rowCount: results.length
    });
  } catch (err) {
    console.error('Custom query execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
