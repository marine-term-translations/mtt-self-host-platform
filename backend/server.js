require("dotenv").config();
const GITEA_API_URL = "http://gitea:3000";
const axios = require("axios");

async function createOrganization() {
  const apiUrl = `${GITEA_API_URL}/api/v1/admin/users/admin/orgs`;
  const token = process.env.GITEA_ADMIN_TOKEN; // Ensure this is set in your .env

  const orgData = {
    username: process.env.GITEA_ORG_NAME,
    full_name: process.env.GITEA_ORG_FULL_NAME,
    description: process.env.GITEA_ORG_DESCRIPTION,
    email: process.env.GITEA_ORG_EMAIL,
    location: process.env.GITEA_ORG_LOCATION,
    repo_admin_change_team_access: true,
    visibility: process.env.GITEA_ORG_VISIBILITY,
    website: process.env.GITEA_ORG_WEBSITE,
  };

  console.log("Creating organization with the following data:");
  console.log("API URL:", apiUrl);
  console.log(
    "Authorization Token:",
    token ? token.substring(0, 6) + "..." : "undefined"
  );
  console.log("Organization Data:", orgData);

  try {
    const response = await axios.post(apiUrl, orgData, {
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
    });
    console.log("Organization created:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating organization:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else {
      console.error("Message:", error.message);
    }
    throw error;
  }
}
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
  try {
    const orgData = await createOrganization();
    res.json({ org: orgData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
