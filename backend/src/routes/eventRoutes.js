const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

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

// 1. List all events
addRoute("get", "/events", eventController.listEvents);

// 2. Create a new event
addRoute("post", "/events", eventController.createEvent);

// 3. Get available vocabulary sources for event creation (MUST be before /events/:id)
addRoute("get", "/events/sources", eventController.getSources);

// 4. Get specific event details
addRoute("get", "/events/:id", eventController.getEvent);

// 5. Update event status
addRoute("patch", "/events/:id/status", eventController.updateStatus);

// 6. Create a team for an event
addRoute("post", "/events/:id/teams", eventController.createTeam);

// 7. Join an event team
addRoute("post", "/events/:id/join", eventController.joinTeam);

// 8. Generate event or team QR code
addRoute("get", "/events/:id/qr", eventController.generateQR);

// 9. Delete an event
addRoute("delete", "/events/:id", eventController.deleteEvent);

// 10. Delete a team from an event
addRoute("delete", "/events/:eventId/teams/:teamId", eventController.deleteTeam);
// 11. Toggle featured homepage event (both general and per-event routes)
addRoute("patch", "/events/featured", eventController.setFeatured);
addRoute("patch", "/events/:id/featured", eventController.setFeatured);

// 12. Settle event rewards (determine winner & award titles)
addRoute("post", "/events/:id/settle", eventController.settleEvent);

// 13. User competition titles & equipping
addRoute("get", "/users/:id/titles", eventController.getUserTitles);
addRoute("post", "/users/titles/equip", eventController.equipUserTitle);

module.exports = router;


