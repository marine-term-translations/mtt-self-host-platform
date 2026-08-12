const eventService = require("../services/eventService");
const QRCode = require("qrcode");
const config = require("../config");

function getPublicFrontendUrl(req) {
  // 1. Prefer explicit config.frontendUrl if defined (e.g., https://mtt.vliz.be)
  if (config.frontendUrl) {
    return config.frontendUrl.replace(/\/$/, "");
  }

  // 2. Fall back to X-Forwarded headers from reverse proxy (Traefik / Nginx)
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const rawHost = req.headers["x-forwarded-host"] || req.get("host") || "localhost";
  const cleanHost = rawHost.split(":")[0]; // Strip internal docker backend port 5000

  return `${proto}://${cleanHost}`;
}

async function listEvents(req, res) {
  try {
    const events = eventService.getAllEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getSources(req, res) {
  try {
    const sources = eventService.getEventSources();
    res.json(sources);
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

async function createEvent(req, res) {
  try {
    const { title, description, startDate, endDate, sourceId, targetLanguage, targetCount, rewardTitle } = req.body;
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: "Title, start date, and end date are required." });
    }
    const event = eventService.createEvent({ title, description, startDate, endDate, sourceId, targetLanguage, targetCount, rewardTitle });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const event = eventService.updateEventStatus(req.params.id, status);
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
    const baseUrl = getPublicFrontendUrl(req);
    const targetUrl = `${baseUrl}/events/${req.params.id}${joinCode ? `?joinCode=${joinCode}` : ""}`;
    const qrSvg = await QRCode.toString(targetUrl, { type: "svg" });
    res.type("image/svg+xml").send(qrSvg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listEvents,
  getSources,
  getEvent,
  createEvent,
  updateStatus,
  createTeam,
  joinTeam,
  generateQR
};
