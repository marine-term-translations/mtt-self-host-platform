// LDES feeds routes - serve LDES fragments and provide feed listing
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Base directory for LDES data (from environment or default)
const LDES_BASE_DIR = process.env.LDES_BASE_DIR || '/data/LDES';

/**
 * @swagger
 * /api/ldes/feeds:
 *   get:
 *     summary: List all available LDES feeds
 *     tags: [LDES]
 *     responses:
 *       200:
 *         description: List of LDES feeds with metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 feeds:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sourceId:
 *                         type: string
 *                       latestUrl:
 *                         type: string
 *                       fragmentCount:
 *                         type: number
 *                       fragments:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             url:
 *                               type: string
 */
router.get('/api/ldes/feeds', (req, res) => {
  try {
    // Check if LDES base directory exists
    if (!fs.existsSync(LDES_BASE_DIR)) {
      return res.json({ feeds: [] });
    }

    // Read all source directories
    const sourceDirs = fs.readdirSync(LDES_BASE_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const feeds = sourceDirs.map(sourceId => {
      const sourcePath = path.join(LDES_BASE_DIR, sourceId);
      const files = fs.readdirSync(sourcePath);
      
      // Get all .ttl files except latest.ttl
      const fragmentFiles = files.filter(f => f.endsWith('.ttl') && f !== 'latest.ttl');
      
      const fragments = fragmentFiles.map(filename => ({
        name: filename,
        url: `/api/ldes/data/${sourceId}/${filename}`
      }));

      return {
        sourceId,
        latestUrl: `/api/ldes/data/${sourceId}/latest.ttl`,
        fragmentCount: fragmentFiles.length,
        fragments
      };
    });

    res.json({ feeds });
  } catch (error) {
    console.error('Error listing LDES feeds:', error);
    res.status(500).json({ error: 'Failed to list LDES feeds' });
  }
});

/**
 * @swagger
 * /api/ldes/data/{sourceId}/{filename}:
 *   get:
 *     summary: Retrieve a specific LDES fragment or latest.ttl
 *     tags: [LDES]
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Source ID
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Fragment filename (e.g., latest.ttl or 1768758532.ttl)
 *     responses:
 *       200:
 *         description: LDES fragment in Turtle format
 *         content:
 *           text/turtle:
 *             schema:
 *               type: string
 *       404:
 *         description: Fragment not found
 */
router.get('/api/ldes/data/:sourceId/:filename', (req, res) => {
  try {
    const { sourceId, filename } = req.params;
    
    // Security: validate sourceId to prevent directory traversal
    if (sourceId.includes('..') || sourceId.includes('/') || sourceId.includes('\\')) {
      return res.status(400).json({ error: 'Invalid source ID' });
    }
    
    // Security: validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || !filename.endsWith('.ttl')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(LDES_BASE_DIR, sourceId, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fragment not found' });
    }

    // Read and send the file with appropriate content type
    const content = fs.readFileSync(filePath, 'utf-8');
    res.set('Content-Type', 'text/turtle; charset=utf-8');
    res.send(content);
  } catch (error) {
    console.error('Error serving LDES fragment:', error);
    res.status(500).json({ error: 'Failed to retrieve LDES fragment' });
  }
});

module.exports = router;
