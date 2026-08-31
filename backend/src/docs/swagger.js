// Swagger documentation setup

const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Marine Term Translations (MTT) API",
      version: "1.0.0",
      description: "API documentation for Marine Term Translations backend service with role-based authorization.",
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

module.exports = swaggerSpec;
