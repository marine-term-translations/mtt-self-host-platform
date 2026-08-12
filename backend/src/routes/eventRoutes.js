const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.get("/", eventController.listEvents);
router.post("/", eventController.createEvent);
router.get("/:id", eventController.getEvent);
router.patch("/:id/status", eventController.updateStatus);
router.post("/:id/teams", eventController.createTeam);
router.post("/:id/join", eventController.joinTeam);
router.get("/:id/qr", eventController.generateQR);

module.exports = router;
