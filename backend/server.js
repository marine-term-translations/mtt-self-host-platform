// Minimal Node.js API server

const express = require("express");
const fs = require("fs");
const path = require("path");

const cors = require("cors");
const fetch = require("node-fetch");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const app = express();

// Enable CORS for all domains
app.use(cors());
app.use(express.json());
const port = 5000;
const { execSync } = require("child_process");
const Database = require("better-sqlite3");

const GITEA_API_URL = process.env.GITEA_URL;
const axios = require("axios");

// --- Git-backed SQLite DB setup ---
const REPO_URL = `http://oauth2:${
  process.env.GITEA_TOKEN
}@${process.env.GITEA_URL.replace(/^https?:\/\//, "")}/${
  process.env.GITEA_ORG_NAME
}/${process.env.TRANSLATIONS_REPO}.git`;
const REPO_PATH = process.env.TRANSLATIONS_REPO_PATH;
const DB_PATH = process.env.SQLITE_DB_PATH;

if (!fs.existsSync(REPO_PATH)) {
  console.log("Cloning translations repo...");
  execSync(`git clone ${REPO_URL} ${REPO_PATH}`);
}
console.log("Pulling latest translations repo...");
execSync(`git -C ${REPO_PATH} pull --ff-only`);

// Initialize DB with schema if missing tables
const db = new Database(DB_PATH);
const hasTermsTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='terms'")
  .get();
if (!hasTermsTable) {
  console.log("Initializing SQLite DB with schema...");
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSQL = fs.readFileSync(schemaPath, "utf8");
  db.exec(schemaSQL);
  console.log("Schema applied to SQLite DB.");

  // After cloning/pulling the translations repo
  const workflowsDir = path.join(REPO_PATH, ".gitea", "workflows");
  const harvestYmlPath = path.join(workflowsDir, "harvest.yml");
  const harvestYmlContent = `
name: Harvest NERC

on:
  workflow_dispatch:
    inputs:
      collection-uri:
        description: 'NERC collection URI to harvest'
        required: true
        default: 'http://vocab.nerc.ac.uk/collection/P02/current/'
        type: string

jobs:
  harvest:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          token: \${{ secrets.GITEA_TOKEN }}

      - uses: marine-term-translations/setup-harvest-action@main
        with:
          collection-uri: \${{ inputs.collection-uri || 'http://vocab.nerc.ac.uk/collection/P02/current/' }}
          token: \${{ secrets.GITEA_TOKEN }}
  `;

  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }
  fs.writeFileSync(harvestYmlPath, harvestYmlContent, "utf8");
  console.log("harvest.yml workflow created in translations repo.");

  // Commit and push the initialized DB to the repo
  try {
    execSync(
      `git -C ${REPO_PATH} config user.name "${process.env.GITEA_ADMIN_USER}"`
    );
    execSync(
      `git -C ${REPO_PATH} config user.email "${process.env.GITEA_ADMIN_EMAIL}"`
    );
    execSync(`git -C ${REPO_PATH} add ${DB_PATH} ${harvestYmlPath}`);
    execSync(
      `git -C ${REPO_PATH} commit -m "chore: initialize translations database and workflow" --author="${process.env.GITEA_ADMIN_USER} <${process.env.GITEA_ADMIN_EMAIL}>"`
    );
    execSync(`git -C ${REPO_PATH} push`);
    console.log("Initial DB committed and pushed to repo.");
  } catch (err) {
    console.error("Failed to commit/push initial DB:", err.message);
  }
}
console.log("SQLite DB loaded from repo.");

try {
  execSync(`git -C ${REPO_PATH} add .`);
  execSync(
    `git -C ${REPO_PATH} commit -m "chore: update translations repo" --author="${process.env.GITEA_ADMIN_USER} <${process.env.GITEA_ADMIN_EMAIL}>"`,
    { stdio: "ignore" }
  );
  execSync(`git -C ${REPO_PATH} push`, { stdio: "ignore" });
  console.log("Changes pushed to Gitea repository.");
} catch (err) {
  console.error("Failed to push changes to Gitea repository:", err.message);
}

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

/**
 * @openapi
 * /api/login-gitea:
 *   post:
 *     summary: Login to Gitea and get an access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
app.post("/api/login-gitea", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Create an access token for the user using HTTP Basic Auth
    const response = await axios.post(
      `${GITEA_API_URL}/api/v1/users/${username}/tokens`,
      {
        name: `token-${Date.now()}`,
        scopes: ["all"],
      },
      {
        auth: {
          username: username,
          password: password,
        },
      }
    );

    res.json({
      token: response.data.sha1,
      user: {
        username: username,
        id: response.data.id,
      },
    });
  } catch (err) {
    console.error(err);
    if (err.response) {
      return res.status(err.response.status).json({
        error: err.response.data?.message || "Login failed",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/check-admin:
 *   post:
 *     summary: Check if the provided Gitea token belongs to an admin user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns admin status of the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAdmin:
 *                   type: boolean
 *                 username:
 *                   type: string
 */
app.post("/api/check-admin", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }

  try {
    // Get the authenticated user using the provided token
    const me = await axios.get(`${GITEA_API_URL}/api/v1/user`, {
      headers: { Authorization: `token ${token}` },
    });

    // Gitea returns `is_admin` field on the user object
    const { is_admin, login } = me.data;
    return res.json({ isAdmin: Boolean(is_admin), username: login });
  } catch (err) {
    console.error("check-admin error:", err.response?.data || err.message);
    if (err.response) {
      return res.status(err.response.status).json({
        error: err.response.data?.message || "Failed to check admin status",
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/register-gitea-user:
 *   post:
 *     summary: Register a user in Gitea and assign to language teams
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               lang:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: User created and assigned to teams
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.post("/api/register-gitea-user", async (req, res) => {
  const { username, name, email, lang, password } = req.body;
  const token = process.env.GITEA_ADMIN_TOKEN;
  const org = process.env.GITEA_ORG_NAME;
  if (
    !username ||
    !name ||
    !email ||
    !lang ||
    !password ||
    !Array.isArray(lang)
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Create user
    const userRes = await axios.post(
      `${GITEA_API_URL}/api/v1/admin/users`,
      {
        username,
        email,
        password,
        full_name: name,
        must_change_password: false,
        send_notify: true,
      },
      {
        headers: { Authorization: `token ${token}` },
      }
    );

    // 2. For each language, ensure team exists and add user
    const teamResults = [];
    for (const langName of lang) {
      const teamName = langName.replace(/\s+/g, "_");
      // Check if team exists
      let teamId = null;
      const teamsRes = await axios.get(
        `${GITEA_API_URL}/api/v1/orgs/${org}/teams`,
        {
          headers: { Authorization: `token ${token}` },
        }
      );
      const found = teamsRes.data.find((t) => t.name === teamName);
      if (found) {
        teamId = found.id;
      } else {
        // Create team
        const createTeamRes = await axios.post(
          `${GITEA_API_URL}/api/v1/orgs/${org}/teams`,
          {
            name: teamName,
            description: `Team for ${langName} speakers`,
            permission: "write",
            units: [
              "repo.code",
              "repo.issues",
              "repo.pulls",
              "repo.releases",
              "repo.wiki",
            ],
            can_create_org_repo: false,
          },
          {
            headers: { Authorization: `token ${token}` },
          }
        );
        teamId = createTeamRes.data.id;
      }
      // Add user to team
      await axios.put(
        `${GITEA_API_URL}/api/v1/teams/${teamId}/members/${username}`,
        {},
        {
          headers: { Authorization: `token ${token}` },
        }
      );
      teamResults.push({ lang: langName, team: teamName, teamId });
    }

    res.json({ user: userRes.data, teams: teamResults });
  } catch (err) {
    console.error(err);
    if (err.response) {
      return res.status(err.response.status).json({ error: err.response.data });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/terms:
 *   post:
 *     summary: Create a new term
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uri:
 *                 type: string
 *     responses:
 *       201:
 *         description: Term created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.post("/api/terms", (req, res) => {
  const { uri } = req.body;
  if (!uri) return res.status(400).json({ error: "Missing uri" });
  try {
    const stmt = db.prepare("INSERT INTO terms (uri) VALUES (?)");
    const info = stmt.run(uri);
    res.status(201).json({ id: info.lastInsertRowid, uri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/terms/{id}:
 *   put:
 *     summary: Update a term
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uri:
 *                 type: string
 *     responses:
 *       200:
 *         description: Term updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.put("/api/terms/:id", (req, res) => {
  const { id } = req.params;
  const { uri } = req.body;
  if (!uri) return res.status(400).json({ error: "Missing uri" });
  try {
    const stmt = db.prepare(
      "UPDATE terms SET uri = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );
    const info = stmt.run(uri, id);
    if (info.changes === 0)
      return res.status(404).json({ error: "Term not found" });
    res.json({ id, uri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/terms:
 *   get:
 *     summary: List all SKOS/RDF terms
 *     responses:
 *       200:
 *         description: Returns all terms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
app.get("/api/terms", (req, res) => {
  try {
    // Get all terms
    const terms = db.prepare("SELECT * FROM terms").all();
    // For each term, get its fields and translations
    const termDetails = terms.map((term) => {
      // Get fields for this term
      const fields = db
        .prepare("SELECT * FROM term_fields WHERE term_id = ?")
        .all(term.id);
      // For each field, get translations
      const fieldsWithTranslations = fields.map((field) => {
        const translations = db
          .prepare("SELECT * FROM translations WHERE term_field_id = ?")
          .all(field.id);
        return { ...field, translations };
      });
      return { ...term, fields: fieldsWithTranslations };
    });
    res.json(termDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
