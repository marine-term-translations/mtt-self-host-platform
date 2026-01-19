// LDES feeds routes - serve LDES fragments and provide feed listing
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { apiLimiter } = require('../middleware/rateLimit');

// Base directory for LDES data (from environment or default)
const LDES_BASE_DIR = process.env.LDES_BASE_DIR || '/data/LDES';

/**
 * @swagger
 * /api/ldes:
 *   get:
 *     summary: List all available LDES feeds or retrieve a specific fragment
 *     tags: [LDES]
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Source ID (optional, if not provided lists all feeds)
 *       - in: query
 *         name: fragment
 *         schema:
 *           type: string
 *         description: Fragment filename (e.g., latest.ttl or 1768758532.ttl)
 *     responses:
 *       200:
 *         description: List of LDES feeds with metadata or a specific fragment
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
 *           text/turtle:
 *             schema:
 *               type: string
 *       404:
 *         description: Fragment not found
 */
router.get('/ldes', apiLimiter, (req, res) => {
  try {
    const { source, fragment } = req.query;

    // If source and fragment are provided, serve the file
    if (source && fragment) {
      // Security: validate source to prevent directory traversal
      if (source.includes('..') || source.includes('/') || source.includes('\\')) {
        return res.status(400).json({ error: 'Invalid source ID' });
      }
      
      // Security: validate fragment to prevent directory traversal
      if (fragment.includes('..') || fragment.includes('/') || fragment.includes('\\') || !fragment.endsWith('.ttl')) {
        return res.status(400).json({ error: 'Invalid fragment name' });
      }

      const filePath = path.join(LDES_BASE_DIR, source, fragment);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fragment not found' });
      }

      // Read and send the file with appropriate content type
      const content = fs.readFileSync(filePath, 'utf-8');
      res.set('Content-Type', 'text/turtle; charset=utf-8');
      return res.send(content);
    }

    // Otherwise, list all feeds
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
        url: `/ldes?source=${sourceId}&fragment=${filename}`
      }));

      return {
        sourceId,
        latestUrl: `/ldes?source=${sourceId}&fragment=latest.ttl`,
        fragmentCount: fragmentFiles.length,
        fragments
      };
    });

    res.json({ feeds });
  } catch (error) {
    console.error('Error handling LDES request:', error);
    res.status(500).json({ error: 'Failed to process LDES request' });
  }
});

module.exports = router;
