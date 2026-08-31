// Swagger documentation setup - Exclusively exposes Non-Admin GET endpoints

const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const rawSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Marine Term Translations (MTT) API",
      version: "1.0.0",
      description: "API documentation for Marine Term Translations public & user read endpoints (GET only, non-admin).",
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "mtt.sid",
          description: "Session cookie for authenticated user sessions",
        },
      },
    },
  },
  apis: [path.join(__dirname, "../routes/*.js")],
});

// Filter paths to ONLY include GET routes that do NOT require admin privileges
const filteredPaths = {};

for (const [pathKey, pathItem] of Object.entries(rawSpec.paths || {})) {
  // Exclude all admin paths by URI
  const lowerPath = pathKey.toLowerCase();
  if (lowerPath.includes("/admin")) {
    continue;
  }

  for (const [method, operation] of Object.entries(pathItem)) {
    // 1. Strictly only allow GET operations
    if (method.toLowerCase() !== "get") {
      continue;
    }

    // 2. Filter out any operation tagged with Admin or Docker
    const tags = (operation.tags || []).map(t => t.toLowerCase());
    if (tags.includes("admin") || tags.includes("docker")) {
      continue;
    }

    // 3. Filter out any operation whose summary or description denotes Admin
    const summary = (operation.summary || "").toLowerCase();
    const description = (operation.description || "").toLowerCase();
    if (summary.includes("admin") || description.includes("admin")) {
      continue;
    }

    // 4. Filter out any operation requiring admin in responses
    const res403 = operation.responses && operation.responses["403"] && (operation.responses["403"].description || "").toLowerCase();
    if (res403 && res403.includes("admin")) {
      continue;
    }

    if (!filteredPaths[pathKey]) {
      filteredPaths[pathKey] = {};
    }
    filteredPaths[pathKey][method] = operation;
  }
}

rawSpec.paths = filteredPaths;

module.exports = rawSpec;
