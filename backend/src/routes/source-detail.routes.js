// Source detail routes - handles RDF type detection and predicate path configuration

const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getDatabase } = require("../db/database");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");
const config = require("../config");

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
    
    const predicates = response.data.results.bindings.map(binding => ({
      predicate: binding.predicate.value,
      count: parseInt(binding.count.value, 10),
      sampleValue: binding.sample.value,
      sampleType: binding.sample.type // 'uri' or 'literal'
    }));
    
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
 * Check if objects for a predicate are all URIs or literals
 */
router.get("/sources/:id/predicate-objects", apiLimiter, async (req, res) => {
  const { id } = req.params;
  const { type, predicate } = req.query;
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
    
    // SPARQL query to get sample objects and their types
    const sparqlQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?object (COUNT(*) as ?count)
      WHERE {
        GRAPH <${source.graph_name}> {
          ?subject rdf:type <${type}> .
          ?subject <${predicate}> ?object .
        }
      }
      GROUP BY ?object
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
    
    // Update the source
    db.prepare(
      "UPDATE sources SET translation_config = ?, last_modified = CURRENT_TIMESTAMP WHERE source_id = ?"
    ).run(configJson, sourceId);
    
    // Fetch updated source
    const updated = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    // Parse translation_config back to JSON for response
    if (updated.translation_config) {
      updated.translation_config = JSON.parse(updated.translation_config);
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
    
    const translationConfig = JSON.parse(source.translation_config);
    
    // Process each configured type and its predicates
    let termsCreated = 0;
    let termsUpdated = 0;
    let fieldsCreated = 0;
    
    for (const typeConfig of translationConfig.types || []) {
      const rdfType = typeConfig.type;
      const selectedPaths = typeConfig.paths || [];
      
      // Query GraphDB for all subjects of this type
      const sparqlQuery = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT DISTINCT ?subject
        WHERE {
          GRAPH <${source.graph_name}> {
            ?subject rdf:type <${rdfType}> .
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
          const fieldTerm = pathConfig.label || predicatePath;
          
          // Query for the value at this predicate path
          const valueQuery = await getValueForPath(source.graph_name, subjectUri, predicatePath);
          
          if (valueQuery && valueQuery.length > 0) {
            for (const value of valueQuery) {
              // Check if term_field exists
              const existingField = db.prepare(
                "SELECT * FROM term_fields WHERE term_id = ? AND field_uri = ? AND original_value = ?"
              ).get(term.id, predicatePath, value);
              
              if (!existingField) {
                // Create new term_field
                db.prepare(
                  "INSERT INTO term_fields (term_id, field_uri, field_term, original_value, source_id) VALUES (?, ?, ?, ?, ?)"
                ).run(term.id, predicatePath, fieldTerm, value, sourceId);
                fieldsCreated++;
              }
            }
          }
        }
      }
    }
    
    res.json({
      success: true,
      source_id: sourceId,
      termsCreated,
      termsUpdated,
      fieldsCreated,
      message: `Synchronized ${termsCreated} new terms, updated ${termsUpdated} terms, and created ${fieldsCreated} term fields`
    });
  } catch (err) {
    console.error('Error synchronizing terms:', err.message);
    if (err.response) {
      return res.status(500).json({ error: `GraphDB error: ${err.response.statusText}` });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * Helper function to get values for a predicate path
 * Supports nested paths like "ex:hasAuthor/foaf:name"
 */
async function getValueForPath(graphName, subjectUri, predicatePath) {
  const pathParts = predicatePath.split('/').map(p => p.trim());
  
  // Build SPARQL property path
  const propertyPath = pathParts.map(p => `<${p}>`).join(' / ');
  
  const sparqlQuery = `
    SELECT DISTINCT ?value
    WHERE {
      GRAPH <${graphName}> {
        <${subjectUri}> ${propertyPath} ?value .
        FILTER(isLiteral(?value))
      }
    }
    LIMIT 100
  `;
  
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
    
    return response.data.results.bindings.map(b => b.value.value);
  } catch (err) {
    console.error(`Error querying path ${predicatePath}:`, err.message);
    return [];
  }
}

module.exports = router;
