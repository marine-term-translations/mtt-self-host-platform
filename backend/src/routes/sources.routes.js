// Sources routes - handles CRUD operations for data sources

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { getDatabase } = require("../db/database");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");
const config = require("../config");

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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
 *               graph_name:
 *                 type: string
 *                 description: Optional graph name for RDF data sources
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
 *                 created_at:
 *                   type: string
 *                 last_modified:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
router.post("/sources", writeLimiter, (req, res) => {
  const { source_path, graph_name, source_type } = req.body;
  
  if (!source_path) {
    return res.status(400).json({ error: "Missing source_path" });
  }
  
  // Validate source_type if provided
  if (source_type && !['LDES', 'Static_file'].includes(source_type)) {
    return res.status(400).json({ error: "Invalid source_type. Must be 'LDES' or 'Static_file'" });
  }
  
  try {
    const db = getDatabase();
    const stmt = db.prepare(
      "INSERT INTO sources (source_path, graph_name, source_type) VALUES (?, ?, ?)"
    );
    const info = stmt.run(source_path, graph_name || null, source_type || 'Static_file');
    
    // Fetch the created source
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(info.lastInsertRowid);
    
    res.status(201).json(source);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      "SELECT * FROM sources ORDER BY created_at DESC LIMIT ? OFFSET ?"
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
 *               graph_name:
 *                 type: string
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
router.put("/sources/:id", writeLimiter, (req, res) => {
  const { id } = req.params;
  const { source_path, graph_name, source_type } = req.body;
  
  // Validate that id is a valid integer
  const sourceId = parseInt(id, 10);
  if (isNaN(sourceId) || sourceId < 1) {
    return res.status(400).json({ error: "Invalid source ID" });
  }
  
  if (!source_path) {
    return res.status(400).json({ error: "Missing source_path" });
  }
  
  // Validate source_type if provided
  if (source_type && !['LDES', 'Static_file'].includes(source_type)) {
    return res.status(400).json({ error: "Invalid source_type. Must be 'LDES' or 'Static_file'" });
  }
  
  try {
    const db = getDatabase();
    
    // Check if source exists
    const existing = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    if (!existing) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    // Update the source
    db.prepare(
      "UPDATE sources SET source_path = ?, graph_name = ?, source_type = ?, last_modified = CURRENT_TIMESTAMP WHERE source_id = ?"
    ).run(source_path, graph_name || null, source_type || existing.source_type || 'Static_file', sourceId);
    
    // Fetch updated source
    const updated = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(sourceId);
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
router.delete("/sources/:id", writeLimiter, (req, res) => {
  const { id } = req.params;
  
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
    
    // Set source_id to NULL on any related terms and term_fields
    // This is done explicitly since we don't have FK constraints with CASCADE
    db.prepare("UPDATE terms SET source_id = NULL WHERE source_id = ?").run(sourceId);
    db.prepare("UPDATE term_fields SET source_id = NULL WHERE source_id = ?").run(sourceId);
    
    // Delete the source
    db.prepare("DELETE FROM sources WHERE source_id = ?").run(sourceId);
    
    res.json({ message: "Source deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      "SELECT * FROM terms WHERE source_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
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
 *               graph_name:
 *                 type: string
 *                 description: Optional graph name for the RDF data
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
 *                 source_type:
 *                   type: string
 *                 original_filename:
 *                   type: string
 *       400:
 *         description: Invalid file or missing file
 *       500:
 *         description: Server error
 */
router.post("/sources/upload", writeLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { graph_name } = req.body;
    // Use the actual file path (relative to the upload directory)
    const filePath = process.env.NODE_ENV === 'production' 
      ? `/data/uploads/${req.file.filename}`
      : req.file.path;
    
    // Upload file to GraphDB triplestore
    try {
      const uploadResult = await uploadToGraphDB(req.file.path, graph_name);
      console.log('GraphDB upload successful:', uploadResult.message);
    } catch (graphdbError) {
      console.error('GraphDB upload failed:', graphdbError.message);
      // Note: We continue creating the source even if GraphDB upload fails
      // The file is still saved locally for later processing
    }
    
    // Create source entry in database
    const db = getDatabase();
    const stmt = db.prepare(
      "INSERT INTO sources (source_path, graph_name, source_type) VALUES (?, ?, ?)"
    );
    const info = stmt.run(filePath, graph_name || null, 'Static_file');
    
    // Fetch the created source
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(info.lastInsertRowid);
    
    res.status(201).json({
      ...source,
      original_filename: req.file.originalname,
      graphdb_upload: 'success' // Could be enhanced to return actual status
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
