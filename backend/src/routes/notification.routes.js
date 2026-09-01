// Notification routes

const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { apiLimiter } = require("../middleware/rateLimit");
const { requireAuth } = require("../middleware/admin");

/**
 * @openapi
 * /api/notifications/unread:
 *   get:
 *     summary: Get unread notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of unread notifications
 *       401:
 *         description: Not authenticated
 */
router.get("/notifications/unread", requireAuth, apiLimiter, notificationController.getUnreadNotifications);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all notifications
 *       401:
 *         description: Not authenticated
 */
router.get("/notifications", requireAuth, apiLimiter, notificationController.getAllNotifications);

/**
 * @openapi
 * /api/notifications/count:
 *   get:
 *     summary: Get unread notification count for current user
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Count of unread notifications
 *       401:
 *         description: Not authenticated
 */
router.get("/notifications/count", requireAuth, apiLimiter, notificationController.getUnreadCount);

/**
 * @openapi
 * /api/notifications/{notificationId}:
 *   get:
 *     summary: Get notification details
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification details
 *       401:
 *         description: Not authenticated
 */
router.get("/notifications/:notificationId", requireAuth, apiLimiter, notificationController.getNotification);

/**
 * @openapi
 * /api/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Marked as read
 *       401:
 *         description: Not authenticated
 */
router.put("/notifications/:notificationId/read", requireAuth, apiLimiter, notificationController.markAsRead);

/**
 * @openapi
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read for current user
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Not authenticated
 */
router.put("/notifications/read-all", requireAuth, apiLimiter, notificationController.markAllAsRead);

module.exports = router;
