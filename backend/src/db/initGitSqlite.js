const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const REPO_PATH = process.env.TRANSLATIONS_REPO_PATH;
const REPO_URL = `${process.env.GITEA_URL.replace(/\/+$/, "")}/gitea/${
  process.env.TRANSLATIONS_REPO
}.git`;
const TOKEN = process.env.GITEA_TOKEN;
const GITEA_URL = process.env.GITEA_URL;

function setupRepo() {
  if (!fs.existsSync(REPO_PATH)) {
    console.log("Cloning translations repository...");
    execSync(
      `git clone http://oauth2:${TOKEN}@${new URL(GITEA_URL).host}/gitea/${
        process.env.TRANSLATIONS_REPO
      }.git "${REPO_PATH}"`,
      { stdio: "inherit" }
    );
  }

  // Always ensure we are up to date
  console.log("Pulling latest changes...");
  execSync(`git -C "${REPO_PATH}" pull --ff-only`, { stdio: "inherit" });

  // Configure git user once
  try {
    execSync(`git -C "${REPO_PATH}" config user.name "Marine Translator Bot"`);
    execSync(`git -C "${REPO_PATH}" config user.email "bot@marine.example"`);
  } catch (e) {}

  const dbPath = path.join(REPO_PATH, "translations.db");
  if (!fs.existsSync(dbPath)) {
    console.log("No database found → creating new one");
    // Create empty DB + run schema
    const db = new Database(dbPath);
    db.exec(fs.readFileSync(path.join(__dirname, "../../schema.sql"), "utf8"));
    db.close();

    execSync(`git -C "${REPO_PATH}" add translations.db`);
    execSync(
      `git -C "${REPO_PATH}" commit -m "chore: initialize empty translations database"`
    );
    execSync(`git -C "${REPO_PATH}" push`);
  }
}

setupRepo();
