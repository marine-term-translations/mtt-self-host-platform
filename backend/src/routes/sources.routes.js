// Sources routes - handles CRUD operations for data sources

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const yaml = require("js-yaml");
const { getDatabase } = require("../db/database");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");
const { requireAdmin } = require("../middleware/admin");
const config = require("../config");
const datetime = require("../utils/datetime");

// Configure multer for file uploads to /data volume
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // In production, this will be /data/uploads (mounted volume)
    // For development/testing, use a writable directory
    const uploadDir = process.env.NODE_ENV === 'production' ? "/data/uploads" : path.join(__dirname, "../../data/uploads");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = datetime.unix() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept RDF/Turtle/JSON-LD files
    const allowedExts = ['.ttl', '.rdf', '.xml', '.jsonld', '.json', '.nt', '.nq'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only RDF formats are allowed (.ttl, .rdf, .xml, .jsonld, .json, .nt, .nq)'));
    }
  }
});

/**
 * Upload RDF file to GraphDB triplestore
 */
async function uploadToGraphDB(filePath, graphName) {
  const graphdbUrl = config.graphdb.url;
  const repository = config.graphdb.repository;
  
  // Determine the content type based on file extension
  const ext = path.extname(filePath).toLowerCase();
  const contentTypeMap = {
    '.ttl': 'text/turtle',
    '.rdf': 'application/rdf+xml',
    '.xml': 'application/rdf+xml',
    '.jsonld': 'application/ld+json',
    '.json': 'application/ld+json',
    '.nt': 'application/n-triples',
    '.nq': 'application/n-quads'
  };
  
  const contentType = contentTypeMap[ext] || 'text/turtle';
  
  try {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Construct the endpoint URL
    // If graph_name is provided, use the /rdf-graphs/service endpoint
    // Otherwise, use the /statements endpoint for the default graph
    let endpoint;
    let params = {};
    
    if (graphName) {
      endpoint = `${graphdbUrl}/repositories/${repository}/rdf-graphs/service`;
      params = { graph: graphName };
    } else {
      endpoint = `${graphdbUrl}/repositories/${repository}/statements`;
    }
    
    // Upload the RDF data
    const response = await axios.post(endpoint, fileContent, {
      headers: {
        'Content-Type': contentType
      },
      params: params,
      timeout: 60000 // 60 second timeout for large files
    });
    
    return {
      success: true,
      statusCode: response.status,
      message: 'RDF data successfully uploaded to GraphDB'
    };
  } catch (error) {
    console.error('GraphDB upload error:', error.message);
    if (error.response) {
      throw new Error(`GraphDB error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Cannot connect to GraphDB. Make sure it is running and accessible.');
    } else {
      throw new Error(`GraphDB upload error: ${error.message}`);
    }
  }
}

/**
 * Update or create ldes-feeds.yaml configuration file
 */
function updateLdesFeedsYaml(graphName, url) {
  const ldesFeedsPath = process.env.NODE_ENV === 'production' 
    ? '/data/ldes-feeds.yaml' 
    : path.join(__dirname, '../../data/ldes-feeds.yaml');
  
  let feedsConfig = { feeds: {} };
  
  // Read existing file if it exists
  if (fs.existsSync(ldesFeedsPath)) {
    try {
      const fileContent = fs.readFileSync(ldesFeedsPath, 'utf8');
      feedsConfig = yaml.load(fileContent) || { feeds: {} };
    } catch (error) {
      console.error('Error reading ldes-feeds.yaml:', error.message);
      // Continue with empty config
    }
  }
  
  // Ensure feeds object exists
  if (!feedsConfig.feeds) {
    feedsConfig.feeds = {};
  }
  
  // Add or update the feed configuration
  feedsConfig.feeds[graphName] = {
    url: url,
    environment: {
      MATERIALIZE: "true"
    }
  };

  //graphname is urn:kgap:ldes-consumer:P02 where P02 is the last part of the url after the second to last part url/P02/latest.ttl
  // extract the feed name from the url
  // e.g. url = "http://example.com/ldes/P02/latest.ttl" -> urn:kgap:ldes-consumer:P02
  let graphNameNew = "urn:kgap:ldes-consumer:" + graphName;

  // change the entry for the source in the database to point to the new graph name
  const db = getDatabase();
  db.prepare("UPDATE sources SET graph_name = ? WHERE source_path = ?").run(graphNameNew, url);
  // Write the updated configuration
  try {
    const yamlContent = yaml.dump(feedsConfig, {
      indent: 2,
      lineWidth: -1 // Don't wrap lines
    });
    
    // Ensure directory exists
    const dir = path.dirname(ldesFeedsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(ldesFeedsPath, yamlContent, 'utf8');
    console.log(`Updated ldes-feeds.yaml with feed: ${graphName}`);
    return true;
  } catch (error) {
    console.error('Error writing ldes-feeds.yaml:', error.message);
    throw error;
  }
}

/**
 * @openapi
 * /api/sources:
 *   post:
 *     summary: Create a new data source
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - source_path
 *             properties:
 *               source_path:
 *                 type: string
 *                 description: Path or URI of the data source
 *               description:
 *                 type: string
 *                 description: Optional description of the data source
 *               source_type:
 *                 type: string
 *                 enum: [LDES, Static_file]
 *                 description: Type of the data source
 *     responses:
 *       201:
 *         description: Source created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 source_id:
 *                   type: integer
 *                 source_path:
 *                   type: string
 *                 graph_name:
 *                   type: string
 *                   description: Auto-generated graph name (urn:mtt:source:{source_id})
 *                 description:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                 last_modified:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
router.post("/sources", requireAdmin, writeLimiter, (req, res) => {
  const { source_path, source_type, description } = req.body;
  
  // SECURITY FIX: Added requireAdmin middleware and validation
  if (!source_path || typeof source_path !== 'string') {
    return res.status(400).json({ error: "Invalid source_path" });
  }
  
  // Validate source_type if provided
  const validTypes = ['LDES', 'Static_file'];
  if (source_type && !validTypes.includes(source_type)) {
    return res.status(400).json({ 
      error: `Invalid source_type. Must be one of: ${validTypes.join(', ')}` 
    });
  }
  
  try {
    const db = getDatabase();
    const stmt = db.prepare(
      "INSERT INTO sources (source_path, source_type, description) VALUES (?, ?, ?)"
    );
    const info = stmt.run(source_path, source_type || 'Static_file', description || null);
    
    // Auto-generate graph_name from source_id
    const sourceId = info.lastInsertRowid;
    const autoGraphName = `urn:mtt:source:${sourceId}`;
    
    // Update the source with the auto-generated graph_name
    db.prepare("UPDATE sources SET graph_name = ? WHERE source_id = ?").run(autoGraphName, sourceId);
    
    // Audit log
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      adminUserId,
      'source_created',
      JSON.stringify({ 
        source_id: sourceId, 
        source_path, 
        source_type: source_type || 'Static_file'
      })
    );
    
    // If this is an LDES feed, update ldes-feeds.yaml
    if (source_type === 'LDES') {
      try {
        // Use the source_id as the feed key in ldes-feeds.yaml
        const feedKey = `source_${sourceId}`;
        updateLdesFeedsYaml(feedKey, source_path);
      } catch (error) {
        console.error('Failed to update ldes-feeds.yaml:', error.message);
        // Continue - source is still created in database
      }
    }
    
    // Fetch the created source
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    res.status(201).json(source);
  } catch (err) {
    console.error('[Sources] Create error:', err);
    res.status(500).json({ error: 'Failed to create source' });
  }
});

/**
 * @openapi
 * /api/sources:
 *   get:
 *     summary: List all data sources with pagination
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of sources to return (default 50, max 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of sources to skip (default 0)
 *     responses:
 *       200:
 *         description: Returns paginated sources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
router.get("/sources", apiLimiter, (req, res) => {
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
    const totalCount = db.prepare("SELECT COUNT(*) as count FROM sources").get().count;
    
    // Get paginated sources
    const sources = db.prepare(
      "SELECT * FROM sources ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?"
    ).all(limit, offset);
    
    res.json({
      sources,
      total: totalCount,
      limit,
      offset
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/sources/{id}:
 *   get:
 *     summary: Get a single source by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The source ID
 *     responses:
 *       200:
 *         description: Returns the source
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 source_id:
 *                   type: integer
 *                 source_path:
 *                   type: string
 *                 graph_name:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                 last_modified:
 *                   type: string
 *       400:
 *         description: Invalid source ID
 *       404:
 *         description: Source not found
 */
router.get("/sources/:id", apiLimiter, (req, res) => {
  const { id } = req.params;
  
  // Validate that id is a valid integer
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
    
    res.json(source);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/sources/{id}:
 *   put:
 *     summary: Update a source
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The source ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source_path:
 *                 type: string
 *               description:
 *                 type: string
 *               source_type:
 *                 type: string
 *                 enum: [LDES, Static_file]
 *     responses:
 *       200:
 *         description: Source updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Source not found
 */
router.put("/sources/:id", requireAdmin, writeLimiter, (req, res) => {
  const { id } = req.params;
  const { source_path, source_type, description } = req.body;
  
  // SECURITY FIX: Added requireAdmin middleware
  // Validate that id is a valid integer
  const sourceId = parseInt(id, 10);
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  if (!source_path || typeof source_path !== 'string') {
    return res.status(400).json({ error: "Invalid source_path" });
  }
  
  // Validate source_type if provided
  const validTypes = ['LDES', 'Static_file'];
  if (source_type && !validTypes.includes(source_type)) {
    return res.status(400).json({ 
      error: `Invalid source_type. Must be one of: ${validTypes.join(', ')}` 
    });
  }
  
  try {
    const db = getDatabase();
    
    // Check if source exists
    const existing = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    if (!existing) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    // Update the source (graph_name is not updated as it's auto-generated)
    db.prepare(
      "UPDATE sources SET source_path = ?, source_type = ?, description = ?, last_modified = CURRENT_TIMESTAMP WHERE source_id = ?"
    ).run(source_path, source_type || existing.source_type || 'Static_file', description || null, sourceId);
    
    // Audit log
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      adminUserId,
      'source_updated',
      JSON.stringify({ 
        source_id: sourceId,
        source_path, 
        source_type: source_type || existing.source_type || 'Static_file'
      })
    );
    
    // Fetch updated source
    const updated = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    res.json(updated);
  } catch (err) {
    console.error('[Sources] Update error:', err);
    res.status(500).json({ error: 'Failed to update source' });
  }
});

/**
 * @openapi
 * /api/sources/{id}:
 *   delete:
 *     summary: Delete a source
 *     description: Deletes a source. Note that this does not cascade to terms/term_fields due to SQLite limitations. Consider setting source_id to NULL on related records first.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The source ID
 *     responses:
 *       200:
 *         description: Source deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid source ID
 *       404:
 *         description: Source not found
 */
router.delete("/sources/:id", requireAdmin, writeLimiter, async (req, res) => {
  const { id } = req.params;
  
  // SECURITY FIX: Added requireAdmin middleware
  // Validate that id is a valid integer
  const sourceId = parseInt(id, 10);
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  try {
    const db = getDatabase();
    
    // Check if source exists
    const existing = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    if (!existing) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    // Count related items before deletion
    const termCount = db.prepare("SELECT COUNT(*) as count FROM terms WHERE source_id = ?").get(sourceId).count;
    const fieldCount = db.prepare("SELECT COUNT(*) as count FROM term_fields WHERE source_id = ?").get(sourceId).count;
    
    // Delete associated terms and term_fields (CASCADE)
    // This will also cascade to translations and appeals through foreign keys
    const termIds = db.prepare("SELECT id FROM terms WHERE source_id = ?").all(sourceId).map(t => t.id);
    
    if (termIds.length > 0) {
      const placeholders = termIds.map(() => '?').join(',');
      // Delete term_fields associated with these terms
      db.prepare(`DELETE FROM term_fields WHERE term_id IN (${placeholders})`).run(...termIds);
      // Delete the terms themselves
      db.prepare(`DELETE FROM terms WHERE id IN (${placeholders})`).run(...termIds);
    }
    
    // Delete the source
    db.prepare("DELETE FROM sources WHERE source_id = ?").run(sourceId);
    
    // Audit log
    const adminUserId = req.session.user.id || req.session.user.user_id;
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      adminUserId,
      'source_deleted',
      JSON.stringify({ 
        source_id: sourceId,
        source_path: existing.source_path,
        terms_deleted: termCount,
        fields_deleted: fieldCount
      })
    );
    
    // Attempt to delete the named graph from GraphDB if graph_name is specified
    let graphdbDeleted = false;
    let graphdbError = null;
    
    if (existing.graph_name) {
      try {
        const graphdbUrl = config.graphdb.url;
        const repository = config.graphdb.repository;
        const endpoint = `${graphdbUrl}/repositories/${repository}/rdf-graphs/service`;
        
        await axios.delete(endpoint, {
          params: { graph: existing.graph_name },
          timeout: 30000 // 30 second timeout
        });
        
        graphdbDeleted = true;
      } catch (graphdbErr) {
        // Log error but don't fail the deletion
        console.error('Failed to delete graph from GraphDB:', graphdbErr.message);
        graphdbError = graphdbErr.message;
      }
    }
    
    // Delete the file if it's a static file
    let fileDeleted = false;
    if (existing.source_type === 'Static_file' && existing.source_path) {
      try {
        const filePath = existing.source_path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          fileDeleted = true;
        }
      } catch (fileErr) {
        console.error('Failed to delete file:', fileErr.message);
      }
    }
    
    res.json({ 
      message: "Source deleted successfully",
      deleted: {
        terms: termCount,
        term_fields: fieldCount,
        graphdb_graph: graphdbDeleted,
        file: fileDeleted
      },
      warnings: graphdbError ? [graphdbError] : []
    });
  } catch (err) {
    console.error('[Sources] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

/**
 * @openapi
 * /api/sources/{id}/terms:
 *   get:
 *     summary: Get all terms associated with a source
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The source ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of terms to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of terms to skip
 *     responses:
 *       200:
 *         description: Returns terms associated with the source
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
 *       400:
 *         description: Invalid source ID
 *       404:
 *         description: Source not found
 */
router.get("/sources/:id/terms", apiLimiter, (req, res) => {
  const { id } = req.params;
  
  // Validate that id is a valid integer
  const sourceId = parseInt(id, 10);
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  try {
    const db = getDatabase();
    
    // Check if source exists
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    // Parse pagination parameters
    let limit = parseInt(req.query.limit) || 50;
    let offset = parseInt(req.query.offset) || 0;
    
    // Validate and cap limit
    if (limit < 1) limit = 50;
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;
    
    // Get total count
    const totalCount = db.prepare(
      "SELECT COUNT(*) as count FROM terms WHERE source_id = ?"
    ).get(sourceId).count;
    
    // Get paginated terms
    const terms = db.prepare(
      "SELECT * FROM terms WHERE source_id = ? ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?"
    ).all(sourceId, limit, offset);
    
    res.json({
      terms,
      total: totalCount,
      limit,
      offset,
      source
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/sources/upload:
 *   post:
 *     summary: Upload a static file as a new data source
 *     description: Uploads an RDF file to the /data volume and creates a source entry
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: RDF file (.ttl, .rdf, .xml, .jsonld, .json, .nt, .nq)
 *               description:
 *                 type: string
 *                 description: Optional description of the data source
 *     responses:
 *       201:
 *         description: File uploaded and source created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 source_id:
 *                   type: integer
 *                 source_path:
 *                   type: string
 *                 graph_name:
 *                   type: string
 *                   description: Auto-generated graph name (urn:mtt:source:{source_id})
 *                 description:
 *                   type: string
 *                 source_type:
 *                   type: string
 *                 original_filename:
 *                   type: string
 *       400:
 *         description: Invalid file or missing file
 *       500:
 *         description: Server error
 */
router.post("/sources/upload", requireAdmin, writeLimiter, upload.single('file'), async (req, res) => {
  // SECURITY FIX: Added requireAdmin middleware
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { description } = req.body;
    // Use the actual file path (relative to the upload directory)
    const filePath = process.env.NODE_ENV === 'production' 
      ? `/data/uploads/${req.file.filename}`
      : req.file.path;
    
    // Create source entry in database first
    const db = getDatabase();
    const stmt = db.prepare(
      "INSERT INTO sources (source_path, source_type, description) VALUES (?, ?, ?)"
    );
    const info = stmt.run(filePath, 'Static_file', description || null);
    
    // Auto-generate graph_name from source_id
    const sourceId = info.lastInsertRowid;
    const autoGraphName = `urn:mtt:source:${sourceId}`;
    
    // Update the source with the auto-generated graph_name
    db.prepare("UPDATE sources SET graph_name = ? WHERE source_id = ?").run(autoGraphName, sourceId);
    
    // Fetch the created source
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    // Create a task for the file upload processing
    const created_by = req.session?.user?.id || req.session?.user?.user_id || null;
    const taskMetadata = JSON.stringify({
      filename: req.file.originalname,
      size: req.file.size,
      graph_name: autoGraphName
    });
    
    const taskStmt = db.prepare(
      "INSERT INTO tasks (task_type, source_id, metadata, created_by, status) VALUES (?, ?, ?, ?, ?)"
    );
    const taskInfo = taskStmt.run('file_upload', source.source_id, taskMetadata, created_by, 'pending');
    const taskId = taskInfo.lastInsertRowid;
    
    // Audit log
    db.prepare(
      'INSERT INTO user_activity (user_id, action, extra) VALUES (?, ?, ?)'
    ).run(
      created_by,
      'source_file_uploaded',
      JSON.stringify({ 
        source_id: sourceId,
        filename: req.file.originalname,
        size: req.file.size
      })
    );
    
    // Start the upload task asynchronously
    (async () => {
      try {
        // Update task to running with start time
        db.prepare(
          "UPDATE tasks SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE task_id = ?"
        ).run(taskId);
        
        // Upload file to GraphDB triplestore
        const uploadResult = await uploadToGraphDB(req.file.path, autoGraphName);
        console.log('GraphDB upload successful:', uploadResult.message);
        
        // Mark task as completed
        db.prepare(
          "UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE task_id = ?"
        ).run(taskId);
      } catch (graphdbError) {
        console.error('GraphDB upload failed:', graphdbError.message);
        
        // Mark task as failed
        db.prepare(
          "UPDATE tasks SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error_message = ? WHERE task_id = ?"
        ).run(graphdbError.message, taskId);
      }
    })();
    
    res.status(201).json({
      ...source,
      original_filename: req.file.originalname,
      task_id: taskId,
      task_status: 'running'
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
    console.error('[Sources] Upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * @openapi
 * /api/sources/{id}/tasks:
 *   get:
 *     summary: Get all tasks associated with a source
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The source ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed, cancelled]
 *         description: Filter by task status
 *     responses:
 *       200:
 *         description: Returns tasks associated with the source
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                 running_task:
 *                   type: object
 *                   description: Currently running task, if any
 *       400:
 *         description: Invalid source ID
 *       404:
 *         description: Source not found
 */
router.get("/sources/:id/tasks", apiLimiter, (req, res) => {
  const { id } = req.params;
  
  const sourceId = parseInt(id, 10);
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  try {
    const db = getDatabase();
    
    // Check if source exists
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    // Build WHERE clause based on filters
    const filters = ["source_id = ?"];
    const params = [sourceId];
    
    if (req.query.status) {
      filters.push("status = ?");
      params.push(req.query.status);
    }
    
    const whereClause = filters.join(' AND ');
    
    // Get tasks for this source
    const tasks = db.prepare(
      `SELECT * FROM tasks WHERE ${whereClause} ORDER BY datetime(created_at) DESC`
    ).all(...params);
    
    // Get currently running task if any
    const runningTask = db.prepare(
      "SELECT * FROM tasks WHERE source_id = ? AND status = 'running' ORDER BY datetime(started_at) DESC LIMIT 1"
    ).get(sourceId);
    
    res.json({
      source_id: sourceId,
      tasks,
      running_task: runningTask || null,
      total: tasks.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
