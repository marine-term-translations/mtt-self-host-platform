// SPARQL routes - handles SPARQL queries to GraphDB triplestore

const express = require("express");
const router = express.Router();
const axios = require("axios");
const config = require("../config");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");

// Predefined SPARQL queries
const PREDEFINED_SPARQL_QUERIES = {
  'all_triples': {
    name: 'All Triples (Limited)',
    description: 'Retrieve all triples from the triplestore (limited to 100)',
    sparql: `
      SELECT ?subject ?predicate ?object
      WHERE {
        ?subject ?predicate ?object .
      }
      LIMIT 100
    `
  },
  'all_graphs': {
    name: 'All Named Graphs',
    description: 'List all named graphs in the triplestore',
    sparql: `
      SELECT DISTINCT ?graph
      WHERE {
        GRAPH ?graph { ?s ?p ?o }
      }
      ORDER BY ?graph
    `
  },
  'count_triples': {
    name: 'Count All Triples',
    description: 'Count total number of triples in the triplestore',
    sparql: `
      SELECT (COUNT(*) as ?count)
      WHERE {
        ?subject ?predicate ?object .
      }
    `
  },
  'count_by_graph': {
    name: 'Triples Count by Graph',
    description: 'Count triples in each named graph',
    sparql: `
      SELECT ?graph (COUNT(*) as ?count)
      WHERE {
        GRAPH ?graph { ?s ?p ?o }
      }
      GROUP BY ?graph
      ORDER BY DESC(?count)
    `
  },
  'all_subjects': {
    name: 'Unique Subjects',
    description: 'List all unique subjects (limited to 100)',
    sparql: `
      SELECT DISTINCT ?subject
      WHERE {
        ?subject ?predicate ?object .
      }
      LIMIT 100
    `
  }
};

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
 * @openapi
 * /api/sparql/predefined:
 *   get:
 *     summary: Get list of predefined SPARQL queries
 *     responses:
 *       200:
 *         description: Returns list of available predefined SPARQL queries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get("/sparql/predefined", apiLimiter, (req, res) => {
  const queries = Object.keys(PREDEFINED_SPARQL_QUERIES).map(key => ({
    id: key,
    ...PREDEFINED_SPARQL_QUERIES[key]
  }));
  
  res.json({ queries });
});

/**
 * @openapi
 * /api/sparql/execute:
 *   post:
 *     summary: Execute a predefined SPARQL query
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
 *                 description: ID of the predefined SPARQL query to execute
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
router.post("/sparql/execute", writeLimiter, async (req, res) => {
  const { queryId } = req.body;
  
  if (!queryId || !PREDEFINED_SPARQL_QUERIES[queryId]) {
    return res.status(400).json({ error: "Invalid query ID" });
  }
  
  try {
    const query = PREDEFINED_SPARQL_QUERIES[queryId];
    
    // Execute SPARQL query
    const sparqlResults = await executeSparqlQuery(query.sparql);
    const results = convertSparqlResults(sparqlResults);
    
    res.json({
      query: {
        id: queryId,
        name: query.name,
        description: query.description,
        sparql: query.sparql.trim()
      },
      results,
      rowCount: results.length
    });
  } catch (err) {
    console.error('SPARQL execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/sparql/custom:
 *   post:
 *     summary: Execute a custom SPARQL query (admin only, SELECT only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sparql
 *             properties:
 *               sparql:
 *                 type: string
 *                 description: SPARQL query to execute (SELECT only)
 *     responses:
 *       200:
 *         description: Query executed successfully
 *       400:
 *         description: Invalid query (must be SELECT)
 *       500:
 *         description: Query execution error
 */
router.post("/sparql/custom", writeLimiter, async (req, res) => {
  const { sparql } = req.body;
  
  if (!sparql) {
    return res.status(400).json({ error: "Missing SPARQL query" });
  }
  
  // Security: Only allow SELECT and DESCRIBE queries
  const trimmedSparql = sparql.trim().toUpperCase();
  if (!trimmedSparql.startsWith('SELECT') && !trimmedSparql.startsWith('DESCRIBE') && !trimmedSparql.startsWith('ASK') && !trimmedSparql.startsWith('CONSTRUCT')) {
    return res.status(400).json({ 
      error: "Only SELECT, DESCRIBE, ASK, and CONSTRUCT queries are allowed" 
    });
  }
  
  // Additional security: Prevent certain dangerous patterns
  const dangerous = ['INSERT', 'DELETE', 'DROP', 'CLEAR', 'LOAD', 'CREATE', 'COPY', 'MOVE', 'ADD'];
  for (const keyword of dangerous) {
    if (trimmedSparql.includes(keyword)) {
      return res.status(400).json({ 
        error: `Query contains forbidden keyword: ${keyword}` 
      });
    }
  }
  
  try {
    // Execute SPARQL query
    const sparqlResults = await executeSparqlQuery(sparql);
    const results = convertSparqlResults(sparqlResults);
    
    res.json({
      sparql: sparql.trim(),
      results,
      rowCount: results.length
    });
  } catch (err) {
    console.error('Custom SPARQL execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/sparql/health:
 *   get:
 *     summary: Check GraphDB connection health
 *     responses:
 *       200:
 *         description: GraphDB is accessible
 *       500:
 *         description: Cannot connect to GraphDB
 */
router.get("/sparql/health", apiLimiter, async (req, res) => {
  try {
    const graphdbUrl = config.graphdb.url;
    const repository = config.graphdb.repository;
    
    // Try a simple query
    const testQuery = 'SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o } LIMIT 1';
    await executeSparqlQuery(testQuery);
    
    res.json({
      status: 'healthy',
      graphdbUrl,
      repository,
      message: 'GraphDB is accessible'
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message,
      graphdbUrl: config.graphdb.url,
      repository: config.graphdb.repository
    });
  }
});

module.exports = router;
