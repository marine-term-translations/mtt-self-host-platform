const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.get("/api/events", eventController.listEvents);
router.post("/api/events", eventController.createEvent);
router.get("/api/events/sources", eventController.getSources);
router.get("/api/events/:id", eventController.getEvent);
router.patch("/api/events/:id/status", eventController.updateStatus);
router.post("/api/events/:id/teams", eventController.createTeam);
router.post("/api/events/:id/join", eventController.joinTeam);
router.get("/api/events/:id/qr", eventController.generateQR);

module.exports = router;
