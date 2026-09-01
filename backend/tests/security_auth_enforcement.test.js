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
    json(data) { jsonBody = data; return this; },
    send(data) { jsonBody = data; return this; }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  return { req, res, next, getStatus: () => statusCode, getJson: () => jsonBody, isNext: () => nextCalled };
}

async function run() {
  console.log("Running comprehensive security auth enforcement and data cleaning tests...");

  // ==========================================
  // SECTION 1: AUTH MIDDLEWARE TESTS
  // ==========================================
  console.log("\n[1] Testing Auth Middleware Guards...");

  // 1.1 requireAuth
  const unauth = createMockReqRes(null);
  requireAuth(unauth.req, unauth.res, unauth.next);
  assert.strictEqual(unauth.getStatus(), 401, "Unauthenticated request should return 401");
  assert.strictEqual(unauth.isNext(), false, "next() must not be called on 401");

  const authUser = createMockReqRes({ id: 1, username: "test_user", is_admin: false });
  requireAuth(authUser.req, authUser.res, authUser.next);
  assert.strictEqual(authUser.isNext(), true, "next() must be called for authenticated user");

  // 1.2 requireAdmin
  const nonAdmin = createMockReqRes({ id: 2, username: "regular_user", is_admin: false, is_superadmin: false });
  requireAdmin(nonAdmin.req, nonAdmin.res, nonAdmin.next);
  assert.strictEqual(nonAdmin.getStatus(), 403, "Non-admin should return 403 Forbidden");

  const unauthAdminReq = createMockReqRes(null);
  requireAdmin(unauthAdminReq.req, unauthAdminReq.res, unauthAdminReq.next);
  assert.strictEqual(unauthAdminReq.getStatus(), 401, "Unauthenticated admin request should return 401 Unauthorized");

  const adminUser = createMockReqRes({ id: 3, username: "admin_user", is_admin: true });
  requireAdmin(adminUser.req, adminUser.res, adminUser.next);
  assert.strictEqual(adminUser.isNext(), true, "Admin user (is_admin: true) should pass requireAdmin");

  const adminNumeric = createMockReqRes({ id: 3, username: "admin_numeric", is_admin: 1 });
  requireAdmin(adminNumeric.req, adminNumeric.res, adminNumeric.next);
  assert.strictEqual(adminNumeric.isNext(), true, "Admin user (is_admin: 1) should pass requireAdmin");

  const superAdminUser = createMockReqRes({ id: 4, username: "super_user", is_superadmin: true });
  requireAdmin(superAdminUser.req, superAdminUser.res, superAdminUser.next);
  assert.strictEqual(superAdminUser.isNext(), true, "Superadmin user should pass requireAdmin");

  // 1.3 requireSuperAdmin
  const regularAdminTryingSuper = createMockReqRes({ id: 3, username: "admin_user", is_admin: true, is_superadmin: false });
  requireSuperAdmin(regularAdminTryingSuper.req, regularAdminTryingSuper.res, regularAdminTryingSuper.next);
  assert.strictEqual(regularAdminTryingSuper.getStatus(), 403, "Regular admin should return 403 for superadmin route");

  const superAdminValid = createMockReqRes({ id: 4, username: "super_user", is_superadmin: true });
  requireSuperAdmin(superAdminValid.req, superAdminValid.res, superAdminValid.next);
  assert.strictEqual(superAdminValid.isNext(), true, "Superadmin should pass requireSuperAdmin");

  // 1.4 requireBrowserContext
  const browserSameOrigin = createMockReqRes({ id: 1, username: "user" }, { "sec-fetch-site": "same-origin" });
  requireBrowserContext(browserSameOrigin.req, browserSameOrigin.res, browserSameOrigin.next);
  assert.strictEqual(browserSameOrigin.isNext(), true, "sec-fetch-site: same-origin must pass");

  const browserFetchNone = createMockReqRes({ id: 1, username: "user" }, { "sec-fetch-site": "none" });
  requireBrowserContext(browserFetchNone.req, browserFetchNone.res, browserFetchNone.next);
  assert.strictEqual(browserFetchNone.isNext(), true, "sec-fetch-site: none must pass");

  const crossSiteReq = createMockReqRes({ id: 1, username: "user" }, { "sec-fetch-site": "cross-site" });
  requireBrowserContext(crossSiteReq.req, crossSiteReq.res, crossSiteReq.next);
  assert.strictEqual(crossSiteReq.getStatus(), 403, "Cross-site request must be rejected with 403");

  const unauthBrowserReq = createMockReqRes(null, { "sec-fetch-site": "same-origin" });
  requireBrowserContext(unauthBrowserReq.req, unauthBrowserReq.res, unauthBrowserReq.next);
  assert.strictEqual(unauthBrowserReq.getStatus(), 401, "Unauthenticated browser request must return 401");

  console.log("✓ Auth middleware guards verified successfully!");

  // ==========================================
  // SECTION 2: DATA CLEANING & SANITIZATION TESTS
  // ==========================================
  console.log("\n[2] Testing Data Cleaning & Sanitization...");

  const rawUserWithPrivileges = {
    id: 10,
    username: "0000-0001-2345-6789",
    reputation: 150,
    joined_at: "2026-01-01",
    is_admin: 1,
    is_superadmin: 1,
    is_banned: 1,
    ban_reason: "Automated spam test",
    banned_at: "2026-02-01",
    banned_by: 1,
    email: "secret_admin@vliz.be",
    openrouter_api_key: "sk-or-v1-secretkey123456",
    extra: JSON.stringify({
      name: "Dr. Marine Administrator",
      is_admin: true,
      is_superadmin: true,
      is_banned: true,
      ban_reason: "Automated spam test",
      nativeLanguage: "en",
      translationLanguages: ["en", "fr", "nl"],
      api_key: "hidden_key_999"
    })
  };

  // 2.1 sanitizePublicUser
  const cleanedUser = sanitizePublicUser(rawUserWithPrivileges);
  assert.strictEqual(cleanedUser.id, 10);
  assert.strictEqual(cleanedUser.name, "Dr. Marine Administrator");
  assert.strictEqual(cleanedUser.reputation, 150);
  assert.strictEqual(cleanedUser.joined_at, "2026-01-01");
  assert.strictEqual(cleanedUser.is_admin, undefined, "is_admin must NOT be exposed");
  assert.strictEqual(cleanedUser.is_superadmin, undefined, "is_superadmin must NOT be exposed");
  assert.strictEqual(cleanedUser.is_banned, undefined, "is_banned must NOT be exposed");
  assert.strictEqual(cleanedUser.ban_reason, undefined, "ban_reason must NOT be exposed");
  assert.strictEqual(cleanedUser.banned_at, undefined, "banned_at must NOT be exposed");
  assert.strictEqual(cleanedUser.banned_by, undefined, "banned_by must NOT be exposed");
  assert.strictEqual(cleanedUser.email, undefined, "email must NOT be exposed");
  assert.strictEqual(cleanedUser.openrouter_api_key, undefined, "API keys must NOT be exposed");

  // Verify cleaned extra inside sanitizePublicUser
  const cleanedExtraObj = JSON.parse(cleanedUser.extra);
  assert.strictEqual(cleanedExtraObj.name, "Dr. Marine Administrator");
  assert.strictEqual(cleanedExtraObj.nativeLanguage, "en");
  assert.deepStrictEqual(cleanedExtraObj.translationLanguages, ["en", "fr", "nl"]);
  assert.strictEqual(cleanedExtraObj.is_admin, undefined, "is_admin in extra must NOT be exposed");
  assert.strictEqual(cleanedExtraObj.is_superadmin, undefined, "is_superadmin in extra must NOT be exposed");
  assert.strictEqual(cleanedExtraObj.is_banned, undefined, "is_banned in extra must NOT be exposed");
  assert.strictEqual(cleanedExtraObj.ban_reason, undefined, "ban_reason in extra must NOT be exposed");
  assert.strictEqual(cleanedExtraObj.api_key, undefined, "api_key in extra must NOT be exposed");

  // 2.2 sanitizeUserProfileExtra directly
  const sanitizedExtraStr = sanitizeUserProfileExtra(rawUserWithPrivileges.extra);
  const parsedExtra = JSON.parse(sanitizedExtraStr);
  assert.strictEqual(parsedExtra.name, "Dr. Marine Administrator");
  assert.strictEqual(parsedExtra.is_admin, undefined);
  assert.strictEqual(parsedExtra.is_superadmin, undefined);
  assert.strictEqual(parsedExtra.is_banned, undefined);
  assert.strictEqual(parsedExtra.ban_reason, undefined);

  // 2.3 sanitizeUserProfileExtra with null / invalid input returns safe normalized JSON
  const emptyDefault = JSON.parse(sanitizeUserProfileExtra(null));
  assert.strictEqual(emptyDefault.name, "");
  assert.deepStrictEqual(emptyDefault.translationLanguages, []);
  assert.strictEqual(emptyDefault.is_admin, undefined);

  const malformedCleaned = JSON.parse(sanitizeUserProfileExtra("invalid json string"));
  assert.strictEqual(malformedCleaned.name, "");
  assert.deepStrictEqual(malformedCleaned.translationLanguages, []);

  console.log("✓ Data cleaning & sanitization verified successfully!");

  // ==========================================
  // SECTION 3: DB PERSISTENCE & AUDIT LOGGING
  // ==========================================
  console.log("\n[3] Testing Database Attribution & Audit Log Recording...");

  initializeDatabase();
  const db = getDatabase();

  // Create admin user and normal user
  db.prepare("INSERT INTO users (id, username, is_admin) VALUES (100, 'admin_author', 1)").run();
  db.prepare("INSERT INTO users (id, username, is_admin) VALUES (101, 'regular_user', 0)").run();

  // Insert term with created_by_id
  const termInsert = db.prepare("INSERT INTO terms (uri, created_by_id) VALUES (?, ?)").run("https://vocab.vliz.be/term/1001", 100);
  const termId = termInsert.lastInsertRowid;
  assert(termId > 0, "Term record should be created");

  const insertedTerm = db.prepare("SELECT * FROM terms WHERE id = ?").get(termId);
  assert.strictEqual(insertedTerm.created_by_id, 100, "Term created_by_id must record creator user ID");

  // Audit activity logging
  db.prepare("INSERT INTO user_activity (user_id, action, extra) VALUES (?, 'create_term', ?)").run(100, JSON.stringify({ term_id: termId, uri: insertedTerm.uri }));
  const auditRow = db.prepare("SELECT * FROM user_activity WHERE user_id = 100 AND action = 'create_term'").get();
  assert(auditRow, "Audit row in user_activity must be recorded for admin term creation");

  console.log("✓ DB persistence and audit trail verified successfully!");

  // ==========================================
  // SECTION 4: ROUTE LAYER MIDDLEWARE ATTACHMENT
  // ==========================================
  console.log("\n[4] Testing Route Middleware Bindings...");

  const termsRoutes = require("../src/routes/terms.routes");
  const postTerms = termsRoutes.stack.find(s => s.route && s.route.path === "/terms" && s.route.methods.post);
  assert(postTerms, "POST /terms route must exist");
  assert(postTerms.route.stack.some(h => h.handle === requireAdmin), "POST /terms must be guarded by requireAdmin");

  const putTerm = termsRoutes.stack.find(s => s.route && s.route.path === "/terms/:id" && s.route.methods.put);
  assert(putTerm, "PUT /terms/:id route must exist");
  assert(putTerm.route.stack.some(h => h.handle === requireAuth), "PUT /terms/:id must be guarded by requireAuth");
  assert(putTerm.route.stack.some(h => h.handle === requireBrowserContext), "PUT /terms/:id must be guarded by requireBrowserContext");

  const teamsRoutes = require("../src/routes/teams.routes");
  const getUsers = teamsRoutes.stack.find(s => s.route && s.route.path === "/users" && s.route.methods.get);
  assert(getUsers, "GET /users route must exist");
  assert(getUsers.route.stack.some(h => h.handle === requireAuth), "GET /users must be guarded by requireAuth");

  const publicLeaderboard = teamsRoutes.stack.find(s => s.route && s.route.path === "/leaderboard/public" && s.route.methods.get);
  assert(publicLeaderboard, "GET /leaderboard/public route must exist");

  const tasksRoutes = require("../src/routes/tasks.routes");
  const postTasks = tasksRoutes.stack.find(s => s.route && s.route.path === "/tasks" && s.route.methods.post);
  assert(postTasks.route.stack.some(h => h.handle === requireAdmin), "POST /tasks must be guarded by requireAdmin");

  const sourcesRoutes = require("../src/routes/sources.routes");
  const postSources = sourcesRoutes.stack.find(s => s.route && s.route.path === "/sources" && s.route.methods.post);
  assert(postSources.route.stack.some(h => h.handle === requireAdmin), "POST /sources must be guarded by requireAdmin");

  const taskSchedulersRoutes = require("../src/routes/task-schedulers.routes");
  const postSchedulers = taskSchedulersRoutes.stack.find(s => s.route && s.route.path === "/task-schedulers" && s.route.methods.post);
  assert(postSchedulers.route.stack.some(h => h.handle === requireAdmin), "POST /task-schedulers must be guarded by requireAdmin");

  const eventRoutes = require("../src/routes/eventRoutes");
  const postEvents = eventRoutes.stack.find(s => s.route && s.route.path === "/events" && s.route.methods.post);
  assert(postEvents.route.stack.some(h => h.handle === requireAdmin), "POST /events must be guarded by requireAdmin");

  // ==========================================
  // SECTION 5: END-TO-END HANDLER EXECUTION & CLEANING OUTPUT
  // ==========================================
  console.log("\n[5] Testing Route Handler Output Cleaning & Enforcement...");

  // Seed sample users with admin and moderation flags
  db.prepare(`
    INSERT OR REPLACE INTO users (id, username, is_admin, is_banned, ban_reason, reputation, extra)
    VALUES 
      (201, 'admin_super', 1, 0, NULL, 500, '{"name":"Super Admin","is_admin":true,"is_superadmin":true,"nativeLanguage":"en","translationLanguages":["en","nl"]}'),
      (202, 'banned_user', 0, 1, 'Spamming', 10, '{"name":"Banned Guy","is_banned":true,"ban_reason":"Spamming"}'),
      (203, 'contributor_user', 0, 0, NULL, 300, '{"name":"Alice Contributor","nativeLanguage":"fr","translationLanguages":["fr","en"]}')
  `).run();

  // 5.1 Test GET /users handler cleaning output
  const getUsersHandler = teamsRoutes.stack.find(s => s.route && s.route.path === "/users" && s.route.methods.get).route.stack.slice(-1)[0].handle;
  const usersReq = createMockReqRes({ id: 203, username: "contributor_user" });
  getUsersHandler(usersReq.req, usersReq.res);
  const usersList = usersReq.getJson();
  assert(Array.isArray(usersList), "GET /users must return an array of users");
  assert(usersList.length > 0, "Users list must contain users");
  for (const u of usersList) {
    assert.strictEqual(u.is_admin, undefined, `User ${u.id} leaked is_admin in GET /users`);
    assert.strictEqual(u.is_superadmin, undefined, `User ${u.id} leaked is_superadmin in GET /users`);
    assert.strictEqual(u.is_banned, undefined, `User ${u.id} leaked is_banned in GET /users`);
    assert.strictEqual(u.ban_reason, undefined, `User ${u.id} leaked ban_reason in GET /users`);
    if (u.extra) {
      const parsed = typeof u.extra === 'string' ? JSON.parse(u.extra) : u.extra;
      assert.strictEqual(parsed.is_admin, undefined, `User ${u.id} leaked is_admin in extra`);
      assert.strictEqual(parsed.is_banned, undefined, `User ${u.id} leaked is_banned in extra`);
    }
  }
  console.log("✓ GET /users handler output successfully sanitized all users");

  // 5.2 Test GET /leaderboard/public handler cleaning output
  const getLeaderboardHandler = teamsRoutes.stack.find(s => s.route && s.route.path === "/leaderboard/public" && s.route.methods.get).route.stack.slice(-1)[0].handle;
  const publicReq = createMockReqRes(null, {}, {}, {}, { limit: 10 });
  getLeaderboardHandler(publicReq.req, publicReq.res);
  const leaderboardList = publicReq.getJson();
  assert(Array.isArray(leaderboardList), "GET /leaderboard/public must return an array");
  for (const u of leaderboardList) {
    assert.strictEqual(u.is_admin, undefined, `User ${u.id} leaked is_admin in public leaderboard`);
    assert.strictEqual(u.is_superadmin, undefined, `User ${u.id} leaked is_superadmin in public leaderboard`);
    assert.strictEqual(u.is_banned, undefined, `User ${u.id} leaked is_banned in public leaderboard`);
    assert.strictEqual(u.ban_reason, undefined, `User ${u.id} leaked ban_reason in public leaderboard`);
  }
  console.log("✓ GET /leaderboard/public handler output successfully sanitized top contributors");

  // 5.3 Test GET /user/:id profile output sanitization
  const userRoutes = require("../src/routes/user.routes");
  const getUserProfileHandler = userRoutes.stack.find(s => s.route && s.route.path === "/user/:id" && s.route.methods.get).route.stack.slice(-1)[0].handle;
  const profileReq = createMockReqRes(null, {}, {}, { id: "201" });
  getUserProfileHandler(profileReq.req, profileReq.res);
  const profile = profileReq.getJson();
  assert(profile && profile.id === 201, "GET /user/:id must return user profile");
  assert.strictEqual(profile.is_admin, undefined, "GET /user/:id must not expose is_admin");
  assert.strictEqual(profile.is_superadmin, undefined, "GET /user/:id must not expose is_superadmin");
  assert.strictEqual(profile.is_banned, undefined, "GET /user/:id must not expose is_banned");
  assert.strictEqual(profile.ban_reason, undefined, "GET /user/:id must not expose ban_reason");
  if (profile.extra) {
    const extra = typeof profile.extra === 'string' ? JSON.parse(profile.extra) : profile.extra;
    assert.strictEqual(extra.is_admin, undefined, "extra must not expose is_admin");
    assert.strictEqual(extra.is_superadmin, undefined, "extra must not expose is_superadmin");
  }
  console.log("✓ GET /user/:id handler output successfully sanitized profile extra");

  // Clean up
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  console.log("\n============================================================");
  console.log("✓ ALL AUTH ENFORCEMENT & DATA CLEANING TESTS PASSED!");
  console.log("============================================================\n");
  process.exit(0);
}

run().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
