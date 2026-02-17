// Notification routes

const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { apiLimiter } = require("../middleware/rateLimit");

// Get unread notifications
router.get("/notifications/unread", apiLimiter, notificationController.getUnreadNotifications);

// Get all notifications
router.get("/notifications", apiLimiter, notificationController.getAllNotifications);

// Get unread count
router.get("/notifications/count", apiLimiter, notificationController.getUnreadCount);

// Mark notification as read
router.put("/notifications/:notificationId/read", apiLimiter, notificationController.markAsRead);

// Mark all notifications as read
router.put("/notifications/read-all", apiLimiter, notificationController.markAllAsRead);

module.exports = router;
