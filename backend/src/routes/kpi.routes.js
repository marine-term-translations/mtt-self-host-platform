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
  'language_coverage_overview': {
    name: 'Language Translation Coverage',
    description: 'Percentage and count of translated term fields per language community',
    type: 'sql',
    query: `
      WITH total_fields AS (
        SELECT COUNT(*) as total FROM term_fields
      ),
      lang_counts AS (
        SELECT 
          l.code as language_code,
          l.name as language_name,
          COUNT(DISTINCT t.term_field_id) as translated_count,
          SUM(CASE WHEN t.status IN ('approved', 'merged') THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN t.status = 'review' THEN 1 ELSE 0 END) as review_count,
          SUM(CASE WHEN t.status = 'draft' THEN 1 ELSE 0 END) as draft_count,
          SUM(CASE WHEN t.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
        FROM languages l
        LEFT JOIN translations t ON t.language = l.code
        GROUP BY l.code, l.name
        HAVING translated_count > 0
      )
      SELECT 
        lc.language_code,
        lc.language_name,
        lc.translated_count,
        lc.approved_count,
        lc.review_count,
        lc.draft_count,
        lc.rejected_count,
        ROUND((CAST(lc.approved_count AS FLOAT) / MAX(1, tf.total)) * 100, 2) as coverage_percent,
        tf.total as total_fields
      FROM lang_counts lc
      CROSS JOIN total_fields tf
      ORDER BY lc.translated_count DESC;
    `
  },
  'review_turnaround_time': {
    name: 'Review Turnaround Time & Latency',
    description: 'Average and median days taken for translations to transition from draft to approved/merged per language',
    type: 'sql',
    query: `
      SELECT 
        language,
        COUNT(*) as sample_size,
        ROUND(AVG(julianday(updated_at) - julianday(created_at)), 2) as avg_days_to_decision,
        ROUND(MIN(julianday(updated_at) - julianday(created_at)), 2) as min_days,
        ROUND(MAX(julianday(updated_at) - julianday(created_at)), 2) as max_days
      FROM translations
      WHERE status IN ('approved', 'merged', 'rejected') 
        AND updated_at > created_at
      GROUP BY language
      ORDER BY sample_size DESC;
    `
  },
  'reputation_tier_demographics': {
    name: 'User Reputation Tier Distribution',
    description: 'Distribution of users across reputation tiers (Novice, Contributor, Expert, Master, Legend)',
    type: 'sql',
    query: `
      SELECT 
        CASE 
          WHEN reputation < 50 THEN 'Novice (<50)'
          WHEN reputation >= 50 AND reputation < 200 THEN 'Contributor (50-199)'
          WHEN reputation >= 200 AND reputation < 500 THEN 'Expert (200-499)'
          WHEN reputation >= 500 AND reputation < 1000 THEN 'Master (500-999)'
          ELSE 'Legend (1000+)'
        END as tier,
        COUNT(*) as user_count,
        ROUND(AVG(reputation), 1) as avg_reputation,
        MIN(reputation) as min_reputation,
        MAX(reputation) as max_reputation
      FROM users
      GROUP BY tier
      ORDER BY min_reputation ASC;
    `
  },
  'appeals_resolution_metrics': {
    name: 'Appeals & Moderation Dispute Resolution',
    description: 'Appeals resolution breakdown, overturn rate and resolution times',
    type: 'sql',
    query: `
      SELECT 
        status,
        COUNT(*) as total_appeals,
        ROUND(AVG(CASE WHEN closed_at IS NOT NULL AND closed_at > opened_at THEN julianday(closed_at) - julianday(opened_at) ELSE NULL END), 2) as avg_resolution_days
      FROM appeals
      GROUP BY status
      ORDER BY total_appeals DESC;
    `
  },
  'creature_achievements_distribution': {
    name: 'Marine Creature Achievements Breakdown',
    description: 'Distribution of unlocked marine creature achievement tiers across all users',
    type: 'sql',
    query: `
      SELECT 
        a.name as achievement_name,
        a.category,
        COUNT(ua.id) as unlock_count,
        COUNT(DISTINCT ua.user_id) as unique_users
      FROM user_achievements ua
      JOIN achievements a ON a.id = ua.achievement_id
      GROUP BY a.id, a.name, a.category
      ORDER BY unlock_count DESC;
    `
  },
  'daily_goals_streak_distribution': {
    name: 'Daily Goals & Contributor Streaks',
    description: 'Daily goals completed per user and completion frequency',
    type: 'sql',
    query: `
      SELECT 
        u.username,
        COUNT(*) as days_active,
        SUM(udg.completed) as days_goal_completed,
        SUM(udg.current_count) as total_actions_logged,
        ROUND(AVG(udg.current_count), 1) as avg_daily_actions
      FROM user_daily_goals udg
      JOIN users u ON u.id = udg.user_id
      GROUP BY u.id, u.username
      ORDER BY days_goal_completed DESC, total_actions_logged DESC
      LIMIT 20;
    `
  },
  'debated_terms_leaderboard': {
    name: 'Most Debated Terms & Discussions',
    description: 'Terms with the highest volume of community discussion and messages',
    type: 'sql',
    query: `
      SELECT 
        t.id as term_id,
        t.uri as term_uri,
        td.title as discussion_title,
        COUNT(m.id) as message_count,
        COUNT(DISTINCT m.author_id) as participant_count,
        td.status as discussion_status,
        td.created_at
      FROM term_discussions td
      JOIN terms t ON t.id = td.term_id
      LEFT JOIN term_discussion_messages m ON m.discussion_id = td.id
      GROUP BY td.id, t.id, t.uri, td.title, td.status, td.created_at
      ORDER BY message_count DESC, td.created_at DESC
      LIMIT 20;
    `
  },
  'vocabulary_requests_demand': {
    name: 'Vocabulary Request Demand Ranking',
    description: 'Top requested external vocabularies and source ontologies',
    type: 'sql',
    query: `
      SELECT 
        vr.id,
        vr.title,
        vr.source_uri,
        vr.status,
        u.username as requested_by,
        vr.created_at
      FROM vocabulary_requests vr
      JOIN users u ON u.id = vr.requested_by_id
      ORDER BY vr.created_at DESC
      LIMIT 25;
    `
  },
  'review_votes_consensus': {
    name: 'Translation Review Votes & Rejection Reasons',
    description: 'Breakdown of reviewer approval vs rejection votes and rejection reasons',
    type: 'sql',
    query: `
      SELECT 
        action,
        COALESCE(rejection_reason, 'None (Approved)') as reason,
        COUNT(*) as count
      FROM translation_reviews
      GROUP BY action, rejection_reason
      ORDER BY count DESC;
    `
  },
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
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
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
    // Execute all queries FIRST before creating the archive
    const db = getDatabase();
    const queryIds = Object.keys(KPI_QUERIES);
    const queryResults = [];
    
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
        queryResults.push({
          filename: `${queryId}.csv`,
          content: csv
        });
      } catch (queryError) {
        console.error(`Error executing query ${queryId}:`, queryError);
        // Add error file
        queryResults.push({
          filename: `${queryId}_ERROR.txt`,
          content: `Error: ${queryError.message}`
        });
      }
    }
    
    // Now create and send the archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Set response headers
    const filename = `kpi_report_${new Date().toISOString().split('T')[0]}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Add all files to archive
    for (const result of queryResults) {
      archive.append(result.content, { name: result.filename });
    }
    
    // Finalize archive
    await archive.finalize();
  } catch (err) {
    console.error('KPI report generation error:', err);
    // Only send JSON error if response hasn't started
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;
