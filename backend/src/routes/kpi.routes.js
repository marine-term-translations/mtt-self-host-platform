// KPI routes - handles KPI queries combining database and triplestore queries

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db/database");
const { requireAdmin } = require("../middleware/admin");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");
const axios = require("axios");
const config = require("../config");
const archiver = require('archiver');

/**
 * Execute SPARQL query against GraphDB
 */
async function executeSparqlQuery(sparql) {
  const graphdbUrl = config.graphdb.url;
  const repository = config.graphdb.repository;
  const endpoint = `${graphdbUrl}/repositories/${repository}`;
  
  try {
    const response = await axios.post(endpoint, sparql, {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`GraphDB error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Cannot connect to GraphDB. Make sure it is running and accessible.');
    } else {
      throw new Error(`SPARQL query error: ${error.message}`);
    }
  }
}

/**
 * Convert SPARQL JSON results to a simpler table format
 */
function convertSparqlResults(sparqlJson) {
  if (!sparqlJson.results || !sparqlJson.results.bindings) {
    return [];
  }
  
  return sparqlJson.results.bindings.map(binding => {
    const row = {};
    for (const [key, value] of Object.entries(binding)) {
      row[key] = value.value;
    }
    return row;
  });
}

/**
 * Convert results to CSV format
 */
function convertToCSV(results) {
  if (!results || results.length === 0) {
    return '';
  }
  
  const columns = Object.keys(results[0]);
  const header = columns.join(',');
  const rows = results.map(row => {
    return columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      // Escape quotes and wrap in quotes if contains comma or quote
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  }).join('\n');
  
  return `${header}\n${rows}`;
}

// Predefined KPI queries
const KPI_QUERIES = {
  'triplestore_named_graphs': {
    name: 'Triplestore Named Graphs',
    description: 'All named graphs in the triplestore with their triple counts',
    type: 'sparql',
    query: `
      SELECT ?graph (COUNT(*) as ?tripleCount)
      WHERE {
        GRAPH ?graph { ?s ?p ?o }
      }
      GROUP BY ?graph
      ORDER BY DESC(?tripleCount)
    `
  },
  'translation_status_by_month': {
    name: 'Translation Status by Month',
    description: 'Overview of all translation statuses per language for each individual month',
    type: 'sql',
    query: `
      SELECT 
        strftime('%Y-%m', created_at) as month,
        language,
        status,
        COUNT(*) as count
      FROM translations
      GROUP BY strftime('%Y-%m', created_at), language, status
      ORDER BY month DESC, language, status
    `
  },
  'user_translation_statistics': {
    name: 'User Translation Statistics',
    description: 'Statistics of how many translations each user does with distribution metrics',
    type: 'sql',
    query: `
      WITH user_counts AS (
        SELECT 
          u.id,
          u.username,
          COUNT(t.id) as translation_count
        FROM users u
        LEFT JOIN translations t ON t.created_by_id = u.id
        GROUP BY u.id, u.username
      ),
      stats AS (
        SELECT 
          AVG(translation_count) as mean,
          (SELECT translation_count FROM user_counts ORDER BY translation_count LIMIT 1 OFFSET (SELECT COUNT(*) FROM user_counts) / 2) as median,
          COUNT(*) as total_users,
          SQRT(AVG((translation_count - (SELECT AVG(translation_count) FROM user_counts)) * 
                   (translation_count - (SELECT AVG(translation_count) FROM user_counts)))) as std_dev
        FROM user_counts
      )
      SELECT 
        uc.username,
        uc.translation_count,
        CASE 
          WHEN s.std_dev > 0 
          THEN ROUND((uc.translation_count - s.mean) / s.std_dev, 2)
          ELSE 0
        END as z_score,
        ROUND(s.mean, 2) as average_translations,
        s.median as median_translations,
        ROUND(s.std_dev, 2) as standard_deviation,
        s.total_users
      FROM user_counts uc
      CROSS JOIN stats s
      ORDER BY uc.translation_count DESC
    `
  },
  'user_behavior_statistics': {
    name: 'User Behavior Statistics',
    description: 'User behavior statistics - bans, appeals, and reports per month',
    type: 'sql',
    query: `
      WITH monthly_bans AS (
        SELECT 
          strftime('%Y-%m', created_at) as month,
          'ban' as event_type,
          COUNT(*) as count
        FROM user_activity
        WHERE action = 'admin_user_banned'
        GROUP BY strftime('%Y-%m', created_at)
      ),
      monthly_appeals AS (
        SELECT 
          strftime('%Y-%m', created_at) as month,
          'appeal' as event_type,
          COUNT(*) as count
        FROM appeals
        GROUP BY strftime('%Y-%m', created_at)
      ),
      monthly_reports AS (
        SELECT 
          strftime('%Y-%m', created_at) as month,
          'report' as event_type,
          COUNT(*) as count
        FROM message_reports
        GROUP BY strftime('%Y-%m', created_at)
      )
      SELECT month, event_type, count
      FROM (
        SELECT * FROM monthly_bans
        UNION ALL
        SELECT * FROM monthly_appeals
        UNION ALL
        SELECT * FROM monthly_reports
      )
      ORDER BY month DESC, event_type
    `
  }
};

/**
 * @openapi
 * /api/kpi/queries:
 *   get:
 *     summary: Get list of predefined KPI queries (admin only)
 *     responses:
 *       200:
 *         description: Returns list of available KPI queries
 */
router.get("/kpi/queries", requireAdmin, apiLimiter, (req, res) => {
  const queries = Object.keys(KPI_QUERIES).map(key => ({
    id: key,
    name: KPI_QUERIES[key].name,
    description: KPI_QUERIES[key].description,
    type: KPI_QUERIES[key].type
  }));
  
  res.json({ queries });
});

/**
 * @openapi
 * /api/kpi/execute:
 *   post:
 *     summary: Execute a predefined KPI query (admin only)
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
 *                 description: ID of the predefined KPI query to execute
 *     responses:
 *       200:
 *         description: Query executed successfully
 *       400:
 *         description: Invalid query ID
 *       500:
 *         description: Query execution error
 */
router.post("/kpi/execute", requireAdmin, writeLimiter, async (req, res) => {
  const { queryId } = req.body;
  
  if (!queryId || !KPI_QUERIES[queryId]) {
    return res.status(400).json({ error: "Invalid query ID" });
  }
  
  try {
    const kpiQuery = KPI_QUERIES[queryId];
    let results;
    
    if (kpiQuery.type === 'sql') {
      // Execute SQL query
      const db = getDatabase();
      results = db.prepare(kpiQuery.query).all();
    } else if (kpiQuery.type === 'sparql') {
      // Execute SPARQL query
      const sparqlResults = await executeSparqlQuery(kpiQuery.query);
      results = convertSparqlResults(sparqlResults);
    } else {
      return res.status(400).json({ error: "Unknown query type" });
    }
    
    res.json({
      query: {
        id: queryId,
        name: kpiQuery.name,
        description: kpiQuery.description,
        type: kpiQuery.type
      },
      results,
      rowCount: results.length
    });
  } catch (err) {
    console.error('KPI query execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/kpi/download:
 *   post:
 *     summary: Download a single KPI query result as CSV (admin only)
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
 *     responses:
 *       200:
 *         description: CSV file download
 *       400:
 *         description: Invalid query ID
 *       500:
 *         description: Query execution error
 */
router.post("/kpi/download", requireAdmin, writeLimiter, async (req, res) => {
  const { queryId } = req.body;
  
  if (!queryId || !KPI_QUERIES[queryId]) {
    return res.status(400).json({ error: "Invalid query ID" });
  }
  
  try {
    const kpiQuery = KPI_QUERIES[queryId];
    let results;
    
    if (kpiQuery.type === 'sql') {
      const db = getDatabase();
      results = db.prepare(kpiQuery.query).all();
    } else if (kpiQuery.type === 'sparql') {
      const sparqlResults = await executeSparqlQuery(kpiQuery.query);
      results = convertSparqlResults(sparqlResults);
    } else {
      return res.status(400).json({ error: "Unknown query type" });
    }
    
    const csv = convertToCSV(results);
    const filename = `${queryId}_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('KPI CSV download error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/kpi/download-report:
 *   post:
 *     summary: Download complete KPI report as ZIP with all queries (admin only)
 *     responses:
 *       200:
 *         description: ZIP file download with all KPI queries as CSV files
 *       500:
 *         description: Report generation error
 */
router.post("/kpi/download-report", requireAdmin, writeLimiter, async (req, res) => {
  try {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Set response headers
    const filename = `kpi_report_${new Date().toISOString().split('T')[0]}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Execute all queries and add to archive
    const db = getDatabase();
    const queryIds = Object.keys(KPI_QUERIES);
    
    for (const queryId of queryIds) {
      try {
        const kpiQuery = KPI_QUERIES[queryId];
        let results;
        
        if (kpiQuery.type === 'sql') {
          results = db.prepare(kpiQuery.query).all();
        } else if (kpiQuery.type === 'sparql') {
          const sparqlResults = await executeSparqlQuery(kpiQuery.query);
          results = convertSparqlResults(sparqlResults);
        }
        
        const csv = convertToCSV(results);
        const csvFilename = `${queryId}.csv`;
        
        // Add CSV to archive
        archive.append(csv, { name: csvFilename });
      } catch (queryError) {
        console.error(`Error executing query ${queryId}:`, queryError);
        // Add error file to archive
        archive.append(`Error: ${queryError.message}`, { name: `${queryId}_ERROR.txt` });
      }
    }
    
    // Finalize archive
    await archive.finalize();
  } catch (err) {
    console.error('KPI report generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
