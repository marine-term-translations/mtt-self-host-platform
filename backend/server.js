// Minimal Node.js API server

const express = require("express");
const fetch = require("node-fetch");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const app = express();
const port = 5000;

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Marine Backend API",
      version: "1.0.0",
      description: "API documentation for marine-term-translations backend",
    },
  },
  apis: ["./server.js"],
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /api/hello:
 *   get:
 *     summary: Hello world endpoint
 *     responses:
 *       200:
 *         description: Returns a hello world message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello, world" });
});

/**
 * @openapi
 * /api/setup-gitea:
 *   post:
 *     summary: Setup Gitea organization
 *     responses:
 *       200:
 *         description: Returns creation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.post("/api/setup-gitea", async (req, res) => {
  const { GITEA_ADMIN_USER, GITEA_ADMIN_PASS, GITEA_ORG_NAME } = process.env;

  const GITEA_API = "http://gitea:3000/api/v1";

  try {
    // Create organization
    const orgResp = await fetch(`${GITEA_API}/orgs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(`${GITEA_ADMIN_USER}:${GITEA_ADMIN_PASS}`).toString(
            "base64"
          ),
      },
      body: JSON.stringify({
        username: GITEA_ORG_NAME,
      }),
    });
    const orgData = await orgResp.json();

    res.json({ org: orgData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
