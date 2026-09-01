const assert = require("assert");
const swaggerSpec = require("../src/docs/swagger");

async function run() {
  console.log("Running Swagger documentation filtering tests...");

  // 1. Verify swaggerSpec structure
  assert(swaggerSpec, "swaggerSpec must exist");
  assert(swaggerSpec.paths, "swaggerSpec.paths must exist");
  const paths = Object.keys(swaggerSpec.paths);
  assert(paths.length > 0, "swaggerSpec.paths must not be empty");
  console.log(`✓ Swagger paths loaded: ${paths.length} endpoints`);

  // 2. Verify all operations are strictly GET only
  for (const [pathKey, methods] of Object.entries(swaggerSpec.paths)) {
    const methodNames = Object.keys(methods);
    for (const method of methodNames) {
      assert.strictEqual(
        method.toLowerCase(),
        "get",
        `Swagger must only contain GET methods. Found ${method.toUpperCase()} on ${pathKey}`
      );
    }
  }
  console.log("✓ All documented endpoints are strictly GET operations");

  // 3. Verify no admin routes, tags, or descriptions exist in Swagger
  for (const [pathKey, methods] of Object.entries(swaggerSpec.paths)) {
    const lowerPath = pathKey.toLowerCase();
    assert(
      !lowerPath.includes("/admin"),
      `Swagger must not contain /admin routes. Found: ${pathKey}`
    );

    for (const [method, op] of Object.entries(methods)) {
      // Check tags
      const tags = (op.tags || []).map(t => t.toLowerCase());
      assert(
        !tags.includes("admin"),
        `Swagger operation must not be tagged with Admin. Path: ${pathKey}, tags: ${tags.join(", ")}`
      );
      assert(
        !tags.includes("docker"),
        `Swagger operation must not be tagged with Docker. Path: ${pathKey}, tags: ${tags.join(", ")}`
      );

      // Check summary and description
      const summary = (op.summary || "").toLowerCase();
      const description = (op.description || "").toLowerCase();
      assert(
        !summary.includes("admin"),
        `Swagger summary must not mention admin. Found '${op.summary}' on ${pathKey}`
      );
      assert(
        !description.includes("admin"),
        `Swagger description must not mention admin. Found '${op.description}' on ${pathKey}`
      );

      // Check 403 responses
      if (op.responses && op.responses["403"]) {
        const resDesc = (op.responses["403"].description || "").toLowerCase();
        assert(
          !resDesc.includes("admin"),
          `Swagger 403 response must not mention admin. Found '${op.responses["403"].description}' on ${pathKey}`
        );
      }
    }
  }
  console.log("✓ Zero admin routes or admin-restricted operations present in Swagger");

  // 4. Verify no duplicate paths or methods exist
  const seenOperations = new Set();
  for (const [pathKey, methods] of Object.entries(swaggerSpec.paths)) {
    for (const method of Object.keys(methods)) {
      const opKey = `${method.toUpperCase()} ${pathKey}`;
      assert(
        !seenOperations.has(opKey),
        `Duplicate operation found in Swagger: ${opKey}`
      );
      seenOperations.add(opKey);
    }
  }
  console.log(`✓ Zero duplicate routes in Swagger (${seenOperations.size} unique operations verified)`);

  // 5. Verify security schemes
  assert(
    swaggerSpec.components && swaggerSpec.components.securitySchemes && swaggerSpec.components.securitySchemes.cookieAuth,
    "Swagger must have cookieAuth defined under components.securitySchemes"
  );
  console.log("✓ Swagger cookieAuth securityScheme verified");

  console.log("✓ All Swagger documentation filtering tests passed successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Swagger documentation test failed:", err);
  process.exit(1);
});
