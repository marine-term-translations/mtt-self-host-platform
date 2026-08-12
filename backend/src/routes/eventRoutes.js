const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.get("/", eventController.listEvents);
router.get("/:id", eventController.getEvent);
router.post("/:id/teams", eventController.createTeam);
router.post("/:id/join", eventController.joinTeam);
router.get("/:id/qr", eventController.generateQR);

module.exports = router;
