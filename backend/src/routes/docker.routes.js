// Docker admin routes - handles Docker container operations for admin users

const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/admin");
const { apiLimiter } = require("../middleware/rateLimit");
const dockerService = require("../services/docker.service");

/**
 * @openapi
 * /api/admin/docker/containers:
 *   get:
 *     summary: List all Docker containers (admin only)
 *     tags: [Admin, Docker]
 *     responses:
 *       200:
 *         description: List of Docker containers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 containers:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: Admin privileges required
 *       500:
 *         description: Server error
 */
router.get("/admin/docker/containers", requireAdmin, apiLimiter, async (req, res) => {
  try {
    const containers = await dockerService.listContainers();
    
    // Format the response with relevant container information
    const formattedContainers = containers.map(c => ({
      id: c.Id.substring(0, 12), // Short ID
      name: c.Names[0]?.replace(/^\//, '') || 'unknown',
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: c.Created
    }));
    
    res.json({
      containers: formattedContainers,
      total: formattedContainers.length
    });
  } catch (error) {
    console.error('[Admin Docker] Error listing containers:', error);
    res.status(500).json({ 
      error: 'Failed to list Docker containers',
      message: error.message 
    });
  }
});

/**
 * @openapi
 * /api/admin/docker/containers/{name}:
 *   get:
 *     summary: Get specific Docker container details (admin only)
 *     tags: [Admin, Docker]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Container name or ID
 *     responses:
 *       200:
 *         description: Container details
 *       404:
 *         description: Container not found
 *       403:
 *         description: Admin privileges required
 *       500:
 *         description: Server error
 */
router.get("/admin/docker/containers/:name", requireAdmin, apiLimiter, async (req, res) => {
  try {
    const { name } = req.params;
    const container = await dockerService.getContainer(name);
    
    if (!container) {
      return res.status(404).json({ 
        error: 'Container not found',
        container: name 
      });
    }
    
    res.json(container);
  } catch (error) {
    console.error(`[Admin Docker] Error getting container ${req.params.name}:`, error);
    res.status(500).json({ 
      error: 'Failed to get container details',
      message: error.message 
    });
  }
});

/**
 * @openapi
 * /api/admin/docker/containers/{name}/logs:
 *   get:
 *     summary: Get Docker container logs (admin only)
 *     tags: [Admin, Docker]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Container name or ID
 *       - in: query
 *         name: tail
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of lines to retrieve from end of logs
 *       - in: query
 *         name: timestamps
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include timestamps in logs
 *     responses:
 *       200:
 *         description: Container logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: string
 *                 container:
 *                   type: string
 *       404:
 *         description: Container not found
 *       403:
 *         description: Admin privileges required
 *       500:
 *         description: Server error
 */
router.get("/admin/docker/containers/:name/logs", requireAdmin, apiLimiter, async (req, res) => {
  try {
    const { name } = req.params;
    const tail = parseInt(req.query.tail) || 100;
    const timestamps = req.query.timestamps !== 'false';
    
    const logs = await dockerService.getContainerLogs(name, { tail, timestamps });
    
    res.json({
      container: name,
      logs: logs,
      tail: tail
    });
  } catch (error) {
    console.error(`[Admin Docker] Error getting logs for container ${req.params.name}:`, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Container not found',
        container: req.params.name 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to get container logs',
      message: error.message 
    });
  }
});

/**
 * @openapi
 * /api/admin/docker/containers/{name}/restart:
 *   post:
 *     summary: Restart a Docker container (admin only)
 *     tags: [Admin, Docker]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Container name or ID
 *     responses:
 *       200:
 *         description: Container restarted successfully
 *       404:
 *         description: Container not found
 *       403:
 *         description: Admin privileges required
 *       500:
 *         description: Server error
 */
router.post("/admin/docker/containers/:name/restart", requireAdmin, apiLimiter, async (req, res) => {
  try {
    const { name } = req.params;
    const result = await dockerService.restartContainer(name);
    
    res.json(result);
  } catch (error) {
    console.error(`[Admin Docker] Error restarting container ${req.params.name}:`, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Container not found',
        container: req.params.name 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to restart container',
      message: error.message 
    });
  }
});

module.exports = router;
