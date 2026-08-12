const eventService = require("../services/eventService");
const QRCode = require("qrcode");

async function listEvents(req, res) {
  try {
    const events = eventService.getAllEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getEvent(req, res) {
  try {
    const event = eventService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createTeam(req, res) {
  try {
    const { name, imageUrl } = req.body;
    const userId = req.user ? req.user.id : null;
    const team = eventService.createTeam(req.params.id, name, imageUrl, userId);
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function joinTeam(req, res) {
  try {
    const { joinCode, teamId } = req.body;
    const identifier = joinCode || teamId;
    const userId = req.user ? req.user.id : req.body.userId;
    if (!userId) return res.status(401).json({ error: "Authentication required to join team" });
    
    const result = eventService.joinTeam(req.params.id, identifier, userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function generateQR(req, res) {
  try {
    const { joinCode } = req.query;
    const targetUrl = `${req.protocol}://${req.get("host")}/events/${req.params.id}${joinCode ? `?joinCode=${joinCode}` : ""}`;
    const qrSvg = await QRCode.toString(targetUrl, { type: "svg" });
    res.type("image/svg+xml").send(qrSvg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listEvents,
  getEvent,
  createTeam,
  joinTeam,
  generateQR
};
