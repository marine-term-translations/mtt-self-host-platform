// Express application setup - middleware and route mounting

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const swaggerSpec = require("./docs/swagger");
const authRoutes = require("./routes/auth.routes");
const giteaRoutes = require("./routes/gitea.routes");
const termsRoutes = require("./routes/terms.routes");
const teamsRoutes = require("./routes/teams.routes");
const appealsRoutes = require("./routes/appeals.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount routes
app.use("/api", authRoutes);
app.use("/api", giteaRoutes);
app.use("/api", termsRoutes);
app.use("/api", teamsRoutes);
app.use("/api", appealsRoutes);

module.exports = app;
