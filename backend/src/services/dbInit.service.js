// Database initialization service - handles one-time bootstrap (harvest.yml + initial commit)

const fs = require("fs");
const path = require("path");
const config = require("../config");
const { isDatabaseInitialized, applySchema } = require("../db/database");
const gitService = require("./git.service");

/**
 * Create the harvest.yml workflow file
 * @returns {string} Path to the created file
 */
function createHarvestWorkflow() {
  const workflowsDir = path.join(
    config.translations.repoPath,
    ".gitea",
    "workflows"
  );
  const harvestYmlPath = path.join(workflowsDir, "harvest.yml");

  const harvestYmlContent = `
name: Harvest NERC

on:
  workflow_dispatch:
    inputs:
      collection-url:
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
          collection-url: \${{ inputs.collection-url || 'http://vocab.nerc.ac.uk/collection/P02/current/' }}
          token: \${{ secrets.GITEA_TOKEN }}
  `;

  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }
  fs.writeFileSync(harvestYmlPath, harvestYmlContent, "utf8");
  console.log("harvest.yml workflow created in translations repo.");

  return harvestYmlPath;
}

/**
 * Perform initial database setup and commit
 */
function initializeDatabase() {
  if (isDatabaseInitialized()) {
    console.log("SQLite DB loaded from repo.");
    return false;
  }

  console.log("Initializing SQLite DB with schema...");
  applySchema();

  // Create harvest workflow
  const harvestYmlPath = createHarvestWorkflow();

  // Commit and push the initialized DB to the repo
  try {
    gitService.configureGitUser();
    gitService.addFiles(`${config.translations.dbPath} ${harvestYmlPath}`);

    const { execSync } = require("child_process");
    execSync(
      `git -C ${config.translations.repoPath} commit -m "chore: initialize translations database and workflow" --author="${config.gitea.adminUser} <${config.gitea.adminEmail}>"`
    );
    gitService.push();
    console.log("Initial DB committed and pushed to repo.");
  } catch (err) {
    console.error("Failed to commit/push initial DB:", err.message);
  }

  return true;
}

/**
 * Run full bootstrap process
 */
function bootstrap() {
  // Sync repository first
  gitService.syncRepo();

  // Initialize database if needed
  initializeDatabase();

  // Push any pending changes
  gitService.commitAndPush("chore: update translations repo");
}

module.exports = {
  createHarvestWorkflow,
  initializeDatabase,
  bootstrap,
};
