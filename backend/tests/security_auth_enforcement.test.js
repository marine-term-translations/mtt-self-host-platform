const assert = require("assert");
const fs = require("fs");
const path = require("path");

const testDbPath = path.join(__dirname, "test_security_auth.db");
process.env.SQLITE_DB_PATH = testDbPath;
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireBrowserContext,
  sanitizePublicUser,
  sanitizeUserProfileExtra,
} = require("../src/middleware/admin");
const { getDatabase } = require("../src/db/database");
const { initializeDatabase } = require("../src/services/dbInit.service");

function createMockReqRes(sessionUser = null, headers = {}, body = {}, params = {}, query = {}) {
  const req = {
    session: sessionUser ? { user: sessionUser } : {},
    headers: headers,
    body: body,
    params: params,
    query: query,
    get(h) { return this.headers[h.toLowerCase()] || this.headers[h]; }
  };
  let statusCode = 200;
  let jsonBody = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  return { req, res, next, getStatus: () => statusCode, getJson: () => jsonBody, isNext: () => nextCalled };
}

async function run() {
  console.log("Running security & auth enforcement tests...");

  // 1. Test requireAuth
  const unauth = createMockReqRes(null);
  requireAuth(unauth.req, unauth.res, unauth.next);
  assert.strictEqual(unauth.getStatus(), 401, "Unauthenticated request should return 401");
  assert.strictEqual(unauth.isNext(), false, "next() should not be called on 401");

  const authUser = createMockReqRes({ id: 1, username: "test_user", is_admin: false });
  requireAuth(authUser.req, authUser.res, authUser.next);
  assert.strictEqual(authUser.isNext(), true, "next() should be called for authenticated user");

  // 2. Test requireAdmin
  const nonAdmin = createMockReqRes({ id: 2, username: "regular_user", is_admin: false, is_superadmin: false });
  requireAdmin(nonAdmin.req, nonAdmin.res, nonAdmin.next);
  assert.strictEqual(nonAdmin.getStatus(), 403, "Non-admin should return 403");

  const adminUser = createMockReqRes({ id: 3, username: "admin_user", is_admin: true });
  requireAdmin(adminUser.req, adminUser.res, adminUser.next);
  assert.strictEqual(adminUser.isNext(), true, "Admin user should pass requireAdmin");

  const superAdminUser = createMockReqRes({ id: 4, username: "super_user", is_superadmin: true });
  requireAdmin(superAdminUser.req, superAdminUser.res, superAdminUser.next);
  assert.strictEqual(superAdminUser.isNext(), true, "Superadmin user should pass requireAdmin");

  // 3. Test sanitizePublicUser
  const rawUser = {
    id: 10,
    username: "0000-0001-2345-6789",
    reputation: 150,
    joined_at: "2026-01-01",
    extra: JSON.stringify({
      name: "Dr. Marine",
      is_admin: true,
      is_superadmin: true,
      is_banned: true,
      ban_reason: "spam",
      nativeLanguage: "en",
      translationLanguages: ["en", "fr"]
    })
  };
  const clean = sanitizePublicUser(rawUser);
  assert.strictEqual(clean.id, 10);
  assert.strictEqual(clean.name, "Dr. Marine");
  assert.strictEqual(clean.reputation, 150);
  assert.strictEqual(clean.is_admin, undefined, "is_admin must not be exposed");
  assert.strictEqual(clean.is_superadmin, undefined, "is_superadmin must not be exposed");
  assert.strictEqual(clean.is_banned, undefined, "is_banned must not be exposed");
  assert.strictEqual(clean.ban_reason, undefined, "ban_reason must not be exposed");

  // 4. Test sanitizeUserProfileExtra
  const sanitizedExtra = JSON.parse(sanitizeUserProfileExtra(rawUser.extra));
  assert.strictEqual(sanitizedExtra.name, "Dr. Marine");
  assert.strictEqual(sanitizedExtra.nativeLanguage, "en");
  assert.deepStrictEqual(sanitizedExtra.translationLanguages, ["en", "fr"]);
  assert.strictEqual(sanitizedExtra.is_admin, undefined);
  assert.strictEqual(sanitizedExtra.is_superadmin, undefined);
  assert.strictEqual(sanitizedExtra.is_banned, undefined);

  // 5. Test requireBrowserContext
  const browserReq = createMockReqRes({ id: 1, username: "user" }, { "sec-fetch-site": "same-origin" });
  requireBrowserContext(browserReq.req, browserReq.res, browserReq.next);
  assert.strictEqual(browserReq.isNext(), true, "Valid browser request should pass");

  const crossSiteReq = createMockReqRes({ id: 1, username: "user" }, { "sec-fetch-site": "cross-site" });
  requireBrowserContext(crossSiteReq.req, crossSiteReq.res, crossSiteReq.next);
  assert.strictEqual(crossSiteReq.getStatus(), 403, "Cross-site request should be rejected");

  // 6. Test DB Migration & Term Attribution in Database
  initializeDatabase();
  const db = getDatabase();

  // Test inserting term with created_by_id
  db.prepare("INSERT INTO users (id, username, is_admin) VALUES (99, 'admin_test', 1)").run();
  const stmt = db.prepare("INSERT INTO terms (uri, created_by_id) VALUES (?, ?)");
  const info = stmt.run("https://example.org/test-term", 99);
  assert(info.lastInsertRowid > 0, "Term should be inserted");

  const inserted = db.prepare("SELECT * FROM terms WHERE id = ?").get(info.lastInsertRowid);
  assert.strictEqual(inserted.created_by_id, 99, "Term must be attributed to user id 99");

  // 7. Verify terms routes stack has proper middleware attached
  const termsRoutes = require("../src/routes/terms.routes");
  const postTermsLayer = termsRoutes.stack.find(s => s.route && s.route.path === "/terms" && s.route.methods.post);
  assert(postTermsLayer, "POST /terms route must exist");
  assert(postTermsLayer.route.stack.some(h => h.handle === requireAdmin), "POST /terms must have requireAdmin middleware");

  const putTermLayer = termsRoutes.stack.find(s => s.route && s.route.path === "/terms/:id" && s.route.methods.put);
  assert(putTermLayer, "PUT /terms/:id route must exist");
  assert(putTermLayer.route.stack.some(h => h.handle === requireAuth), "PUT /terms/:id must have requireAuth middleware");
  assert(putTermLayer.route.stack.some(h => h.handle === requireBrowserContext), "PUT /terms/:id must have requireBrowserContext middleware");

  const postRepLayer = termsRoutes.stack.find(s => s.route && s.route.path === "/user-reputation/:username" && s.route.methods.post);
  assert(postRepLayer, "POST /user-reputation/:username route must exist");
  assert(postRepLayer.route.stack.some(h => h.handle === requireAdmin), "POST /user-reputation/:username must have requireAdmin middleware");

  // 8. Verify teams routes (GET /users and GET /leaderboard/public)
  const teamsRoutes = require("../src/routes/teams.routes");
  const getUsersLayer = teamsRoutes.stack.find(s => s.route && s.route.path === "/users" && s.route.methods.get);
  assert(getUsersLayer, "GET /users route must exist");
  assert(getUsersLayer.route.stack.some(h => h.handle === requireAuth), "GET /users must have requireAuth middleware");

  const publicLeaderboardLayer = teamsRoutes.stack.find(s => s.route && s.route.path === "/leaderboard/public" && s.route.methods.get);
  assert(publicLeaderboardLayer, "GET /leaderboard/public route must exist");

  // 9. Verify tasks, sources, task-schedulers, and eventRoutes have proper middleware
  const tasksRoutes = require("../src/routes/tasks.routes");
  const postTasksLayer = tasksRoutes.stack.find(s => s.route && s.route.path === "/tasks" && s.route.methods.post);
  assert(postTasksLayer.route.stack.some(h => h.handle === requireAdmin), "POST /tasks must have requireAdmin");

  const sourcesRoutes = require("../src/routes/sources.routes");
  const postSourcesLayer = sourcesRoutes.stack.find(s => s.route && s.route.path === "/sources" && s.route.methods.post);
  assert(postSourcesLayer.route.stack.some(h => h.handle === requireAdmin), "POST /sources must have requireAdmin");

  const taskSchedulersRoutes = require("../src/routes/task-schedulers.routes");
  const postSchedulersLayer = taskSchedulersRoutes.stack.find(s => s.route && s.route.path === "/task-schedulers" && s.route.methods.post);
  assert(postSchedulersLayer.route.stack.some(h => h.handle === requireAdmin), "POST /task-schedulers must have requireAdmin");

  const eventRoutes = require("../src/routes/eventRoutes");
  const postEventsLayer = eventRoutes.stack.find(s => s.route && s.route.path === "/events" && s.route.methods.post);
  assert(postEventsLayer.route.stack.some(h => h.handle === requireAdmin), "POST /events must have requireAdmin");

  console.log("✓ All security auth enforcement & route protection tests passed successfully!");

  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Security test failed:", err);
  process.exit(1);
});
