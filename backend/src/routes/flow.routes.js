// Flow routes - handles Translation Flow endpoints

const express = require("express");
const router = express.Router();
const flowController = require("../controllers/flow.controller");
const { apiLimiter, writeLimiter } = require("../middleware/rateLimit");

/**
 * @openapi
 * /api/flow/start:
 *   post:
 *     summary: Start a new translation flow session
 *     tags: [Flow]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessionId:
 *                   type: number
 *                 stats:
 *                   type: object
 *                 challenges:
 *                   type: array
 *       401:
 *         description: Not authenticated
 */
router.post("/flow/start", writeLimiter, flowController.startFlow);

/**
 * @openapi
 * /api/flow/next:
 *   get:
 *     summary: Get the next task (review or translation)
 *     tags: [Flow]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Next task retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [review, translate, none]
 *                 task:
 *                   type: object
 *       401:
 *         description: Not authenticated
 */
router.get("/flow/next", apiLimiter, flowController.getNextTask);

/**
 * @openapi
 * /api/flow/review:
 *   post:
 *     summary: Submit a review (approve or reject)
 *     tags: [Flow]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - translationId
 *               - action
 *             properties:
 *               translationId:
 *                 type: number
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               sessionId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Review submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 action:
 *                   type: string
 *                 points:
 *                   type: number
 *                 streakInfo:
 *                   type: object
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 */
router.post("/flow/review", writeLimiter, flowController.submitReview);

/**
 * @openapi
 * /api/flow/stats:
 *   get:
 *     summary: Get user statistics and challenges
 *     tags: [Flow]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                 challenges:
 *                   type: array
 *       401:
 *         description: Not authenticated
 */
router.get("/flow/stats", apiLimiter, flowController.getStats);

/**
 * @openapi
 * /api/flow/languages:
 *   get:
 *     summary: Get available translation languages
 *     tags: [Flow]
 *     responses:
 *       200:
 *         description: Languages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 languages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 */
router.get("/flow/languages", apiLimiter, flowController.getLanguages);

/**
 * @openapi
 * /api/flow/session/end:
 *   post:
 *     summary: End a flow session
 *     tags: [Flow]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Session ended successfully
 *       401:
 *         description: Not authenticated
 */
router.post("/flow/session/end", writeLimiter, flowController.endSession);

/**
 * @openapi
 * /api/flow/leaderboard:
 *   get:
 *     summary: Get points leaderboard
 *     tags: [Flow]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users to return
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leaderboard:
 *                   type: array
 */
router.get("/flow/leaderboard", apiLimiter, flowController.getLeaderboard);

/**
 * @openapi
 * /api/flow/translation/:translationId/history:
 *   get:
 *     summary: Get translation history
 *     tags: [Flow]
 *     parameters:
 *       - in: path
 *         name: translationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Translation ID
 *     responses:
 *       200:
 *         description: History retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 */
router.get("/flow/translation/:translationId/history", apiLimiter, flowController.getTranslationHistory);

module.exports = router;
