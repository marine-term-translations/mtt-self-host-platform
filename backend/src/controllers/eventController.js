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
    const sessionUser = (req.session && req.session.user) || req.user;
    const userId = sessionUser ? (sessionUser.id || sessionUser.user_id) : null;
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
    const sessionUser = (req.session && req.session.user) || req.user;
    const userId = sessionUser ? (sessionUser.id || sessionUser.user_id) : req.body.userId;
    
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

async function deleteEvent(req, res) {
  try {
    const result = eventService.deleteEvent(req.params.id);
    if (!result.success) return res.status(404).json({ error: "Event not found" });
    res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteTeam(req, res) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const teamId = req.params.teamId;
    const result = eventService.deleteTeam(eventId, teamId);
    if (!result.success) return res.status(404).json({ error: "Team not found" });
    res.json({ success: true, message: "Team deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function setFeatured(req, res) {
  try {
    const { isFeatured } = req.body;
    const event = eventService.setFeaturedHomepageEvent(isFeatured ? req.params.id : null);
    res.json({ success: true, event });
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
  generateQR,
  deleteEvent,
  deleteTeam,
  setFeatured
};


