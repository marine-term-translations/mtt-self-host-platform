const assert = require("assert");
const {
  requireAuth,
  requireAdmin,
  requireBrowserContext,
  sanitizePublicUser,
  sanitizeUserProfileExtra,
} = require("../src/middleware/admin");

function createMockReqRes(sessionUser = null, headers = {}) {
  const req = {
    session: sessionUser ? { user: sessionUser } : {},
    headers: headers,
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

console.log("✓ Task 1 Middleware & Helper tests passed!");
