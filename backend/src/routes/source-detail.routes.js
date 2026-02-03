// Source detail routes - handles RDF type detection and predicate path configuration

const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getDatabase } = require("../db/database");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");
const config = require("../config");

/**
 * Utility: Escape string for safe use in SPARQL queries
 * Handles quotes, backslashes, newlines, and other special characters
 */
function escapeSparqlString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"')    // Escape double quotes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r')   // Escape carriage returns
    .replace(/\t/g, '\\t');  // Escape tabs
}

/**
 * Utility: Validate URI format
 * Returns true if the string looks like a valid URI
 */
function isValidUri(str) {
  if (typeof str !== 'string' || str.length === 0) return false;
  // Check for common URI schemes or URI patterns
  return /^(https?|urn|file|ftp):/.test(str) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(str);
}

/**
 * Utility: Validate regex pattern for SPARQL FILTER
 * Ensures the pattern won't break SPARQL syntax
 * Allows common regex metacharacters but blocks dangerous quote/newline combinations
 */
function validateRegexPattern(pattern) {
  if (typeof pattern !== 'string') return false;
  if (pattern.length > 500) return false; // Prevent extremely long patterns
  
  // Block patterns that could break out of the SPARQL string literal
  // Check for unescaped quotes by looking for quotes not preceded by backslash
  // Using a more compatible approach for older JS environments
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '"') {
      // Check if this quote is escaped (preceded by odd number of backslashes)
      let backslashCount = 0;
      for (let j = i - 1; j >= 0 && pattern[j] === '\\'; j--) {
        backslashCount++;
      }
      // If even number of backslashes (including 0), the quote is unescaped
      if (backslashCount % 2 === 0) {
        return false;
      }
    }
  }
  
  // Block newlines and carriage returns
  if (/[\n\r]/.test(pattern)) return false;
  
  return true;
}

/**
 * Get all RDF types from a source's graph
 */
router.get("/sources/:id/types", apiLimiter, async (req, res) => {
  const { id } = req.params;
  const sourceId = parseInt(id, 10);
  
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  try {
    const db = getDatabase();
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    if (!source.graph_name) {
      return res.status(400).json({ error: "Source has no graph_name specified" });
    }
    
    // SPARQL query to get all rdf:type values from the graph
    const sparqlQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT DISTINCT ?type (COUNT(?subject) as ?count)
      WHERE {
        GRAPH <${source.graph_name}> {
          ?subject rdf:type ?type .
        }
      }
      GROUP BY ?type
      ORDER BY DESC(?count)
    `;
    
    const graphdbUrl = config.graphdb.url;
    const repository = config.graphdb.repository;
    const endpoint = `${graphdbUrl}/repositories/${repository}`;
    
    const response = await axios.post(endpoint, sparqlQuery, {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 30000
    });
    
    const types = response.data.results.bindings.map(binding => ({
      type: binding.type.value,
      count: parseInt(binding.count.value, 10)
    }));
    
    res.json({ source_id: sourceId, graph_name: source.graph_name, types });
  } catch (err) {
    console.error('Error fetching RDF types:', err.message);
    if (err.response) {
      return res.status(500).json({ error: `GraphDB error: ${err.response.statusText}` });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all predicates for a specific RDF type in a source's graph
 */
router.get("/sources/:id/predicates", apiLimiter, async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;
  const sourceId = parseInt(id, 10);
  
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  if (!type) {
    return res.status(400).json({ error: "Missing 'type' query parameter" });
  }
  
  try {
    const db = getDatabase();
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    if (!source.graph_name) {
      return res.status(400).json({ error: "Source has no graph_name specified" });
    }
    
    // SPARQL query to get all predicates used by instances of this type
    const sparqlQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT DISTINCT ?predicate (COUNT(?subject) as ?count) (SAMPLE(?object) as ?sample)
      WHERE {
        GRAPH <${source.graph_name}> {
          ?subject rdf:type <${type}> .
          ?subject ?predicate ?object .
        }
      }
      GROUP BY ?predicate
      ORDER BY DESC(?count)
    `;
    
    const graphdbUrl = config.graphdb.url;
    const repository = config.graphdb.repository;
    const endpoint = `${graphdbUrl}/repositories/${repository}`;
    
    const response = await axios.post(endpoint, sparqlQuery, {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 30000
    });
    
    const predicates = [];
    
    // For each predicate, detect language tags
    for (const binding of response.data.results.bindings) {
      const predicateUri = binding.predicate.value;
      const count = parseInt(binding.count.value, 10);
      const sampleValue = binding.sample.value;
      const sampleType = binding.sample.type;
      
      let languages = [];
      
      // If sample is a literal, check for language tags
      if (sampleType === 'literal' || sampleType === 'typed-literal') {
        const langQuery = `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          SELECT DISTINCT (LANG(?object) as ?lang)
          WHERE {
            GRAPH <${source.graph_name}> {
              ?subject rdf:type <${type}> .
              ?subject <${predicateUri}> ?object .
              FILTER(isLiteral(?object) && LANG(?object) != "")
            }
          }
        `;
        
        try {
          const langResponse = await axios.post(endpoint, langQuery, {
            headers: {
              'Content-Type': 'application/sparql-query',
              'Accept': 'application/sparql-results+json'
            },
            timeout: 15000
          });
          
          languages = langResponse.data.results.bindings
            .map(b => b.lang.value)
            .filter(lang => lang); // Filter out empty strings
        } catch (err) {
          console.error(`Failed to detect languages for ${predicateUri}:`, err.message);
        }
      }
      
      predicates.push({
        predicate: predicateUri,
        count,
        sampleValue,
        sampleType,
        languages: languages.length > 0 ? languages : undefined
      });
    }
    
    res.json({ source_id: sourceId, rdf_type: type, predicates });
  } catch (err) {
    console.error('Error fetching predicates:', err.message);
    if (err.response) {
      return res.status(500).json({ error: `GraphDB error: ${err.response.statusText}` });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get unique values for a predicate (for filtering)
 * Returns unique literal values (non-URIs) up to a limit
 */
router.get("/sources/:id/filter-values", apiLimiter, async (req, res) => {
  const { id } = req.params;
  const { type, predicate, limit = 100 } = req.query;
  const sourceId = parseInt(id, 10);
  const parsedLimit = parseInt(limit, 10);
  const maxValues = !isNaN(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 100;
  
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  if (!type || !predicate) {
    return res.status(400).json({ error: "Missing 'type' or 'predicate' query parameter" });
  }
  
  try {
    const db = getDatabase();
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    if (!source.graph_name) {
      return res.status(400).json({ error: "Source has no graph_name specified" });
    }
    
    // SPARQL query to get distinct literal values for this predicate
    const sparqlQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT DISTINCT ?value (COUNT(*) as ?count)
      WHERE {
        GRAPH <${source.graph_name}> {
          ?subject rdf:type <${type}> .
          ?subject <${predicate}> ?value .
          FILTER(isLiteral(?value))
        }
      }
      GROUP BY ?value
      ORDER BY DESC(?count)
      LIMIT ${maxValues}
    `;
    
    const graphdbUrl = config.graphdb.url;
    const repository = config.graphdb.repository;
    const endpoint = `${graphdbUrl}/repositories/${repository}`;
    
    const response = await axios.post(endpoint, sparqlQuery, {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 30000
    });
    
    const values = response.data.results.bindings.map(binding => ({
      value: binding.value.value,
      count: parseInt(binding.count.value, 10)
    }));
    
    // Get total count of distinct values
    const countQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT (COUNT(DISTINCT ?value) as ?total)
      WHERE {
        GRAPH <${source.graph_name}> {
          ?subject rdf:type <${type}> .
          ?subject <${predicate}> ?value .
          FILTER(isLiteral(?value))
        }
      }
    `;
    
    const countResponse = await axios.post(endpoint, countQuery, {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 30000
    });
    
    const totalCount = countResponse.data.results.bindings.length > 0 
      ? parseInt(countResponse.data.results.bindings[0].total.value, 10)
      : values.length;
    
    res.json({
      source_id: sourceId,
      rdf_type: type,
      predicate,
      values,
      totalCount,
      hasMore: totalCount > values.length
    });
  } catch (err) {
    console.error('Error fetching filter values:', err.message);
    if (err.response) {
      return res.status(500).json({ error: `GraphDB error: ${err.response.statusText}` });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get predicates with filters applied
 * Filters parameter should be a JSON array like:
 * [{ "predicate": "uri", "type": "class", "values": ["value1", "value2"] }, { "predicate": "uri2", "type": "regex", "pattern": ".*test.*" }]
 */
router.get("/sources/:id/predicates-filtered", apiLimiter, async (req, res) => {
  const { id } = req.params;
  const { type, filters } = req.query;
  const sourceId = parseInt(id, 10);
  
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  if (!type) {
    return res.status(400).json({ error: "Missing 'type' query parameter" });
  }
  
  try {
    const db = getDatabase();
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    if (!source.graph_name) {
      return res.status(400).json({ error: "Source has no graph_name specified" });
    }
    
    // Parse filters if provided
    let filterRules = [];
    if (filters) {
      try {
        filterRules = JSON.parse(filters);
      } catch (e) {
        return res.status(400).json({ error: "Invalid filters JSON" });
      }
    }
    
    // Validate type URI
    if (!isValidUri(type)) {
      return res.status(400).json({ error: "Invalid RDF type URI" });
    }
    
    // Build filter conditions for SPARQL with proper validation and escaping
    let filterConditions = '';
    if (filterRules && filterRules.length > 0) {
      const conditions = filterRules.map((rule, index) => {
        // Validate predicate URI
        if (!isValidUri(rule.predicate)) {
          console.error(`Invalid predicate URI in filter: ${rule.predicate}`);
          return '';
        }
        
        const varName = `filter${index}`;
        if (rule.type === 'class' && rule.values && rule.values.length > 0) {
          // Class filter: match specific values with proper escaping
          const valueList = rule.values
            .map(v => `"${escapeSparqlString(v)}"`)
            .join(', ');
          return `
            ?subject <${rule.predicate}> ?${varName} .
            FILTER(?${varName} IN (${valueList}))
          `;
        } else if (rule.type === 'regex' && rule.pattern) {
          // Validate and escape regex pattern
          if (!validateRegexPattern(rule.pattern)) {
            console.error(`Invalid regex pattern in filter: ${rule.pattern}`);
            return '';
          }
          // For regex, we escape the pattern more carefully
          const escapedPattern = escapeSparqlString(rule.pattern);
          return `
            ?subject <${rule.predicate}> ?${varName} .
            FILTER(REGEX(STR(?${varName}), "${escapedPattern}", "i"))
          `;
        }
        return '';
      }).filter(c => c).join('\n');
      
      filterConditions = conditions;
    }
    
    // SPARQL query to get all predicates with filters applied
    const sparqlQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT DISTINCT ?predicate (COUNT(?subject) as ?count) (SAMPLE(?object) as ?sample)
      WHERE {
        GRAPH <${source.graph_name}> {
          ?subject rdf:type <${type}> .
          ${filterConditions}
          ?subject ?predicate ?object .
        }
      }
      GROUP BY ?predicate
      ORDER BY DESC(?count)
    `;
    
    const graphdbUrl = config.graphdb.url;
    const repository = config.graphdb.repository;
    const endpoint = `${graphdbUrl}/repositories/${repository}`;
    
    const response = await axios.post(endpoint, sparqlQuery, {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 30000
    });
    
    const predicates = [];
    
    // For each predicate, detect language tags
    for (const binding of response.data.results.bindings) {
      const predicateUri = binding.predicate.value;
      const count = parseInt(binding.count.value, 10);
      const sampleValue = binding.sample.value;
      const sampleType = binding.sample.type;
      
      let languages = [];
      
      // If sample is a literal, check for language tags
      if (sampleType === 'literal' || sampleType === 'typed-literal') {
        const langQuery = `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          SELECT DISTINCT (LANG(?object) as ?lang)
          WHERE {
            GRAPH <${source.graph_name}> {
              ?subject rdf:type <${type}> .
              ${filterConditions}
              ?subject <${predicateUri}> ?object .
              FILTER(isLiteral(?object) && LANG(?object) != "")
            }
          }
        `;
        
        try {
          const langResponse = await axios.post(endpoint, langQuery, {
            headers: {
              'Content-Type': 'application/sparql-query',
              'Accept': 'application/sparql-results+json'
            },
            timeout: 15000
          });
          
          languages = langResponse.data.results.bindings
            .map(b => b.lang.value)
            .filter(lang => lang);
        } catch (err) {
          console.error(`Failed to detect languages for ${predicateUri}:`, err.message);
        }
      }
      
      predicates.push({
        predicate: predicateUri,
        count,
        sampleValue,
        sampleType,
        languages: languages.length > 0 ? languages : undefined
      });
    }
    
    // Count distinct subjects matching the filters
    const subjectCountQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT (COUNT(DISTINCT ?subject) as ?subjectCount)
      WHERE {
        GRAPH <${source.graph_name}> {
          ?subject rdf:type <${type}> .
          ${filterConditions}
        }
      }
    `;
    
    let subjectCount = 0;
    try {
      const subjectCountResponse = await axios.post(endpoint, subjectCountQuery, {
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json'
        },
        timeout: 15000
      });
      
      const binding = subjectCountResponse.data.results.bindings[0];
      if (binding?.subjectCount?.value !== undefined) {
        const countValue = parseInt(binding.subjectCount.value, 10);
        subjectCount = isNaN(countValue) ? 0 : countValue;
      }
    } catch (err) {
      console.error('Failed to count subjects:', err.message);
    }
    
    res.json({ source_id: sourceId, rdf_type: type, predicates, filters: filterRules, subjectCount });
  } catch (err) {
    console.error('Error fetching filtered predicates:', err.message);
    if (err.response) {
      return res.status(500).json({ error: `GraphDB error: ${err.response.statusText}` });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * Check if objects for a predicate are all URIs or literals
 * Also detects and returns language tags
 */
router.get("/sources/:id/predicate-objects", apiLimiter, async (req, res) => {
  const { id } = req.params;
  const { type, predicate, languageTag } = req.query;
  const sourceId = parseInt(id, 10);
  
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  if (!type || !predicate) {
    return res.status(400).json({ error: "Missing 'type' or 'predicate' query parameter" });
  }
  
  try {
    const db = getDatabase();
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    if (!source.graph_name) {
      return res.status(400).json({ error: "Source has no graph_name specified" });
    }
    
    // SPARQL query to get sample objects and their types (including language tags)
    const sparqlQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?object ?lang (COUNT(*) as ?count)
      WHERE {
        GRAPH <${source.graph_name}> {
          ?subject rdf:type <${type}> .
          ?subject <${predicate}> ?object .
          BIND(LANG(?object) as ?lang)
        }
      }
      GROUP BY ?object ?lang
      ORDER BY DESC(?count)
      LIMIT 20
    `;
    
    const graphdbUrl = config.graphdb.url;
    const repository = config.graphdb.repository;
    const endpoint = `${graphdbUrl}/repositories/${repository}`;
    
    const response = await axios.post(endpoint, sparqlQuery, {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 30000
    });
    
    const objects = response.data.results.bindings.map(binding => ({
      value: binding.object.value,
      type: binding.object.type, // 'uri' or 'literal'
      language: binding.lang ? binding.lang.value : undefined,
      count: parseInt(binding.count.value, 10)
    }));
    
    // Determine if all objects are URIs
    const allUris = objects.length > 0 && objects.every(obj => obj.type === 'uri');
    const allLiterals = objects.length > 0 && objects.every(obj => obj.type === 'literal' || obj.type === 'typed-literal');
    
    res.json({ 
      source_id: sourceId, 
      rdf_type: type, 
      predicate,
      objects,
      allUris,
      allLiterals,
      isTranslatable: allLiterals
    });
  } catch (err) {
    console.error('Error fetching predicate objects:', err.message);
    if (err.response) {
      return res.status(500).json({ error: `GraphDB error: ${err.response.statusText}` });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * Save translation configuration for a source
 * Expected body structure:
 * {
 *   config: {
 *     types: [...],
 *     paths: [...],
 *     labelField: "uri:of:label:field",
 *     referenceFields: ["uri:of:ref:field1", "uri:of:ref:field2"],
 *     translatableFields: ["uri:of:trans:field1", ...]
 *   }
 * }
 */
router.put("/sources/:id/config", writeLimiter, (req, res) => {
  const { id } = req.params;
  const { config: translationConfig } = req.body;
  const sourceId = parseInt(id, 10);
  
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  if (!translationConfig) {
    return res.status(400).json({ error: "Missing 'config' in request body" });
  }
  
  try {
    const db = getDatabase();
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    // Validate and serialize config as JSON
    const configJson = JSON.stringify(translationConfig);
    
    // Extract field role configurations
    const labelFieldUri = translationConfig.labelField || null;
    const referenceFieldUris = JSON.stringify(translationConfig.referenceFields || []);
    const translatableFieldUris = JSON.stringify(translationConfig.translatableFields || []);
    
    // Update the source with both old and new fields
    db.prepare(
      `UPDATE sources SET 
        translation_config = ?, 
        label_field_uri = ?,
        reference_field_uris = ?,
        translatable_field_uris = ?,
        last_modified = CURRENT_TIMESTAMP 
      WHERE source_id = ?`
    ).run(configJson, labelFieldUri, referenceFieldUris, translatableFieldUris, sourceId);
    
    // Fetch updated source
    const updated = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    // Parse JSON fields back for response
    if (updated.translation_config) {
      updated.translation_config = JSON.parse(updated.translation_config);
    }
    if (updated.reference_field_uris) {
      updated.reference_field_uris = JSON.parse(updated.reference_field_uris);
    }
    if (updated.translatable_field_uris) {
      updated.translatable_field_uris = JSON.parse(updated.translatable_field_uris);
    }
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Synchronize terms based on source configuration
 */
router.post("/sources/:id/sync-terms", writeLimiter, async (req, res) => {
  const { id } = req.params;
  const sourceId = parseInt(id, 10);
  
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  try {
    const db = getDatabase();
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    if (!source.translation_config) {
      return res.status(400).json({ error: "Source has no translation configuration" });
    }
    
    if (!source.graph_name) {
      return res.status(400).json({ error: "Source has no graph_name specified" });
    }
    
    // Create a task for the synchronization
    const created_by = req.session?.user?.username || null;
    const taskMetadata = JSON.stringify({
      graph_name: source.graph_name,
      source_path: source.source_path
    });
    
    const taskStmt = db.prepare(
      "INSERT INTO tasks (task_type, source_id, metadata, created_by, status) VALUES (?, ?, ?, ?, ?)"
    );
    const taskInfo = taskStmt.run('triplestore_sync', sourceId, taskMetadata, created_by, 'pending');
    const taskId = taskInfo.lastInsertRowid;
    
    // Start the sync task asynchronously
    (async () => {
      try {
        // Update task to running with start time
        db.prepare(
          "UPDATE tasks SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE task_id = ?"
        ).run(taskId);
        
        const translationConfig = JSON.parse(source.translation_config);
        
        // Parse field role configurations
        const labelFieldUri = source.label_field_uri;
        const referenceFieldUris = source.reference_field_uris ? JSON.parse(source.reference_field_uris) : [];
        const translatableFieldUris = source.translatable_field_uris ? JSON.parse(source.translatable_field_uris) : [];
        const languageTag = translationConfig.languageTag || '@en';
        
        // Helper function to determine field roles (can have multiple roles)
        // A field can be both label AND translatable, for example
        const getFieldRoles = (fieldUri) => {
          const roles = [];
          if (fieldUri === labelFieldUri) roles.push('label');
          if (referenceFieldUris.includes(fieldUri)) roles.push('reference');
          if (translatableFieldUris.includes(fieldUri)) roles.push('translatable');
          // If no roles assigned, default to translatable
          if (roles.length === 0) roles.push('translatable');
          return roles;
        };
        
        // Process each configured type and its predicates
        let termsCreated = 0;
        let termsUpdated = 0;
        let fieldsCreated = 0;
        
        for (const typeConfig of translationConfig.types || []) {
          const rdfType = typeConfig.type;
          const selectedPaths = typeConfig.paths || [];
          const filters = typeConfig.filters || [];
          
          // Build filter conditions for SPARQL with proper validation and escaping
          let filterConditions = '';
          if (filters && filters.length > 0) {
            const conditions = filters.map((rule, index) => {
              // Validate predicate URI
              if (!isValidUri(rule.predicate)) {
                console.error(`Invalid predicate URI in filter during sync: ${rule.predicate}`);
                return '';
              }
              
              const varName = `filter${index}`;
              if (rule.type === 'class' && rule.values && rule.values.length > 0) {
                // Class filter: match specific values with proper escaping
                const valueList = rule.values
                  .map(v => `"${escapeSparqlString(v)}"`)
                  .join(', ');
                return `
                  ?subject <${rule.predicate}> ?${varName} .
                  FILTER(?${varName} IN (${valueList}))
                `;
              } else if (rule.type === 'regex' && rule.pattern) {
                // Validate and escape regex pattern
                if (!validateRegexPattern(rule.pattern)) {
                  console.error(`Invalid regex pattern in filter during sync: ${rule.pattern}`);
                  return '';
                }
                const escapedPattern = escapeSparqlString(rule.pattern);
                return `
                  ?subject <${rule.predicate}> ?${varName} .
                  FILTER(REGEX(STR(?${varName}), "${escapedPattern}", "i"))
                `;
              }
              return '';
            }).filter(c => c).join('\n');
            
            filterConditions = conditions;
          }
          
          // Query GraphDB for all subjects of this type with filters applied
          const sparqlQuery = `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            SELECT DISTINCT ?subject
            WHERE {
              GRAPH <${source.graph_name}> {
                ?subject rdf:type <${rdfType}> .
                ${filterConditions}
              }
            }
          `;
          
          const graphdbUrl = config.graphdb.url;
          const repository = config.graphdb.repository;
          const endpoint = `${graphdbUrl}/repositories/${repository}`;
          
          const response = await axios.post(endpoint, sparqlQuery, {
            headers: {
              'Content-Type': 'application/sparql-query',
              'Accept': 'application/sparql-results+json'
            },
            timeout: 30000
          });
          
          const subjects = response.data.results.bindings.map(b => b.subject.value);
          
          // For each subject, create or update term
          for (const subjectUri of subjects) {
            // Check if term exists
            let term = db.prepare("SELECT * FROM terms WHERE uri = ?").get(subjectUri);
            
            if (!term) {
              // Create new term
              const insertTerm = db.prepare(
                "INSERT INTO terms (uri, source_id) VALUES (?, ?)"
              );
              const info = insertTerm.run(subjectUri, sourceId);
              term = db.prepare("SELECT * FROM terms WHERE id = ?").get(info.lastInsertRowid);
              termsCreated++;
            } else if (term.source_id !== sourceId) {
              // Update existing term's source_id
              db.prepare("UPDATE terms SET source_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .run(sourceId, term.id);
              termsUpdated++;
            }
            
            // For each selected predicate path, create term_field
            for (const pathConfig of selectedPaths) {
              const predicatePath = pathConfig.path;
              
              // Use per-path language tag, fallback to global, then to '@en'
              const pathLanguageTag = pathConfig.languageTag || translationConfig.languageTag || '@en';
              
              // Query for the value at this predicate path
              const valueQuery = await getValueForPath(source.graph_name, subjectUri, predicatePath, pathLanguageTag);

              if (valueQuery && valueQuery.length > 0) {
                // Always use the same term_field for this (term_id, field_uri)
                let termField = db.prepare(
                  "SELECT * FROM term_fields WHERE term_id = ? AND field_uri = ?"
                ).get(term.id, predicatePath);

                if (!termField) {
                  // Use the first value as original_value for the field
                  // Determine field_roles based on source configuration (can be multiple roles)
                  const fieldRoles = getFieldRoles(predicatePath);
                  db.prepare(
                    "INSERT INTO term_fields (term_id, field_uri, field_roles, original_value, source_id) VALUES (?, ?, ?, ?, ?)"
                  ).run(term.id, predicatePath, JSON.stringify(fieldRoles), valueQuery[0].value, sourceId);
                  fieldsCreated++;
                  termField = db.prepare(
                    "SELECT * FROM term_fields WHERE term_id = ? AND field_uri = ?"
                  ).get(term.id, predicatePath);
                }

                // Insert or update translation for each value/languageTag
                for (const { value, language } of valueQuery) {
                  db.prepare(
                    "INSERT OR REPLACE INTO translations (term_field_id, language, value, status, source) VALUES (?, ?, ?, 'original', 'rdf-ingest')"
                  ).run(termField.id, language, value);
                }
              }
            }
          }
        }
        
        // Update task metadata with results
        const resultMetadata = JSON.stringify({
          graph_name: source.graph_name,
          source_path: source.source_path,
          termsCreated,
          termsUpdated,
          fieldsCreated
        });
        
        db.prepare(
          "UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, metadata = ? WHERE task_id = ?"
        ).run(resultMetadata, taskId);
        
        console.log(`Task ${taskId}: Synchronized ${termsCreated} new terms, updated ${termsUpdated} terms, created ${fieldsCreated} fields`);
      } catch (err) {
        console.error(`Task ${taskId} failed:`, err.message);
        db.prepare(
          "UPDATE tasks SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error_message = ? WHERE task_id = ?"
        ).run(err.message, taskId);
      }
    })();
    
    // Return immediately with task info
    res.json({
      success: true,
      message: 'Term synchronization task started',
      task_id: taskId,
      task_status: 'running',
      source_id: sourceId
    });
  } catch (err) {
    console.error('Error creating sync task:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Helper function to get values for a predicate path
 * Supports nested paths like "ex:hasAuthor/foaf:name"
 * Filters by language tag if provided
 */
async function getValueForPath(graphName, subjectUri, predicatePath, languageTag) {
  // Validate inputs
  if (!graphName || !subjectUri || !predicatePath) {
    console.error('Invalid parameters for getValueForPath:', { graphName, subjectUri, predicatePath });
    return [];
  }
  
  let pathParts;
  
  // Check if this is a full URI (contains ://) or starts with common URI schemes
  // If so, treat it as a single predicate, not a path to split
  if (predicatePath.includes('://') || 
      predicatePath.startsWith('http:') || 
      predicatePath.startsWith('https:') ||
      predicatePath.startsWith('urn:')) {
    // This is a full URI - don't split it
    pathParts = [predicatePath];
  } else {
    // This might be a property path like "ex:hasAuthor/foaf:name" - split on /
    pathParts = predicatePath.split('/').map(p => p.trim()).filter(p => p.length > 0);
  }
  
  if (pathParts.length === 0) {
    console.error('Empty predicate path after splitting:', predicatePath);
    return [];
  }
  
  // Build SPARQL property path - only wrap if not already wrapped
  const propertyPath = pathParts.map(p => {
    // If already wrapped in <>, use as-is
    if (p.startsWith('<') && p.endsWith('>')) {
      return p;
    }
    // Otherwise wrap it
    return `<${p}>`;
  }).join(' / ');
  
  // Query for value and language
  const sparqlQuery = `
    SELECT DISTINCT ?value (LANG(?value) as ?lang)
    WHERE {
      GRAPH <${graphName}> {
        <${subjectUri}> ${propertyPath} ?value .
        FILTER(isLiteral(?value))
      }
    }
    LIMIT 100
  `;

  console.log('SPARQL Query for getValueForPath:', sparqlQuery);
  try {
    const graphdbUrl = config.graphdb.url;
    const repository = config.graphdb.repository;
    const endpoint = `${graphdbUrl}/repositories/${repository}`;

    const response = await axios.post(endpoint, sparqlQuery, {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 15000
    });

    return response.data.results.bindings.map(b => ({
      value: b.value.value,
      language: b.lang?.value || 'undefined'
    }));
  } catch (err) {
    console.error(`Error querying path ${predicatePath}:`, err.message);
    if (err.response && err.response.data) {
      console.error('GraphDB error details:', err.response.data);
    }
    return [];
  }
}

module.exports = router;
