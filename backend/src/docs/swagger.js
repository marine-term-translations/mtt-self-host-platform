// Swagger documentation setup

const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Marine Backend API",
      version: "1.0.0",
      description: "API documentation for marine-term-translations backend",
    },
  },
  apis: [path.join(__dirname, "../routes/*.js")],
});

module.exports = swaggerSpec;
