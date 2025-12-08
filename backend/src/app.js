// Express application setup - middleware and route mounting

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const swaggerUi = require("swagger-ui-express");
const config = require("./config");

const swaggerSpec = require("./docs/swagger");
const authRoutes = require("./routes/auth.routes");
const giteaRoutes = require("./routes/gitea.routes");
const termsRoutes = require("./routes/terms.routes");
const teamsRoutes = require("./routes/teams.routes");
const appealsRoutes = require("./routes/appeals.routes");

const app = express();

// Session middleware
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({ checkPeriod: 86400000 }), // 24h prune
    cookie: {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);

// CORS middleware
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
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
