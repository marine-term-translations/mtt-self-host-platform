const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { requireAuth, requireAdmin } = require("../middleware/admin");

// Helper to register routes both with and without /api prefix to support
// environments where reverse proxies (Nginx/Traefik) strip or pass the /api prefix.
function addRoute(method, path, ...handlers) {
  const cleanPath = path.startsWith("/") ? path : "/" + path;
  const apiPath = cleanPath.startsWith("/api") ? cleanPath : "/api" + cleanPath;
  const rawPath = cleanPath.replace(/^\/api/, "");

  router[method](rawPath, ...handlers);
  if (apiPath !== rawPath) {
    router[method](apiPath, ...handlers);
  }
}

// 1. List all events (public)
addRoute("get", "/events", eventController.listEvents);

// 2. Create a new event (admin only)
addRoute("post", "/events", requireAdmin, eventController.createEvent);

// 3. Get available vocabulary sources for event creation (MUST be before /events/:id)
addRoute("get", "/events/sources", eventController.getSources);

// 4. Get specific event details (public / authenticated)
addRoute("get", "/events/:id", eventController.getEvent);

// 5. Update event status (admin only)
addRoute("patch", "/events/:id/status", requireAdmin, eventController.updateStatus);

// 6. Create a team for an event (authenticated)
addRoute("post", "/events/:id/teams", requireAuth, eventController.createTeam);

// 7. Join an event team (authenticated)
addRoute("post", "/events/:id/join", requireAuth, eventController.joinTeam);

// 8. Generate event or team QR code (public)
addRoute("get", "/events/:id/qr", eventController.generateQR);

// 9. Delete an event (admin only)
addRoute("delete", "/events/:id", requireAdmin, eventController.deleteEvent);

// 10. Delete a team from an event (admin only)
addRoute("delete", "/events/:eventId/teams/:teamId", requireAdmin, eventController.deleteTeam);

// 11. Toggle featured homepage event (both general and per-event routes - admin only)
addRoute("patch", "/events/featured", requireAdmin, eventController.setFeatured);
addRoute("patch", "/events/:id/featured", requireAdmin, eventController.setFeatured);

// 12. Settle event rewards (determine winner & award titles - admin only)
addRoute("post", "/events/:id/settle", requireAdmin, eventController.settleEvent);

// 13. User competition titles & equipping
addRoute("get", "/users/:id/titles", eventController.getUserTitles);
addRoute("post", "/users/titles/equip", requireAuth, eventController.equipUserTitle);

module.exports = router;
