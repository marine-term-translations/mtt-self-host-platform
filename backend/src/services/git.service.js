// Git service - handles git operations (clone, pull, commit, push)

const { execSync } = require("child_process");
const fs = require("fs");
const config = require("../config");

/**
 * Clone the translations repository if it doesn't exist
 */
function cloneRepo() {
  if (!fs.existsSync(config.translations.repoPath)) {
    console.log("Cloning translations repo...");
    execSync(
      `git clone ${config.translations.repoUrl} ${config.translations.repoPath}`
    );
  }
}

/**
 * Pull latest changes from the remote repository
 */
function pullRepo() {
  console.log("Pulling latest translations repo...");
  execSync(`git -C ${config.translations.repoPath} pull --ff-only`);
}

/**
 * Configure git user for commits
 */
function configureGitUser() {
  execSync(
    `git -C ${config.translations.repoPath} config user.name "${config.gitea.adminUser}"`
  );
  execSync(
    `git -C ${config.translations.repoPath} config user.email "${config.gitea.adminEmail}"`
  );
}

/**
 * Add files to git staging
 * @param {string} files - Files to add (space-separated or '.' for all)
 */
function addFiles(files = ".") {
  execSync(`git -C ${config.translations.repoPath} add ${files}`);
}

/**
 * Commit changes with a message
 * @param {string} message - Commit message
 */
function commit(message) {
  execSync(
    `git -C ${config.translations.repoPath} commit -m "${message}" --author="${config.gitea.adminUser} <${config.gitea.adminEmail}>"`,
    { stdio: "ignore" }
  );
}

/**
 * Push changes to remote repository
 */
function push() {
  execSync(`git -C ${config.translations.repoPath} push`, { stdio: "ignore" });
}

/**
 * Sync repository (clone if needed, then pull)
 */
function syncRepo() {
  cloneRepo();
  pullRepo();
}

/**
 * Commit and push all changes
 * @param {string} message - Commit message
 */
function commitAndPush(message) {
  try {
    addFiles();
    commit(message);
    push();
    console.log("Changes pushed to Gitea repository.");
  } catch (err) {
    console.error("Failed to push changes to Gitea repository:", err.message);
  }
}

module.exports = {
  cloneRepo,
  pullRepo,
  configureGitUser,
  addFiles,
  commit,
  push,
  syncRepo,
  commitAndPush,
};
