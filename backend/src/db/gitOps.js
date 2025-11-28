const { execSync } = require("child_process");
const config = require("../config");

function gitPull() {
  const repoPath = config.translations.repoPath;
  try {
    // Check for uncommitted changes
    const status = execSync(`git -C "${repoPath}" status --porcelain`)
      .toString()
      .trim();
    if (status) {
      // Stash changes before pull (safer than reset)
      execSync(`git -C "${repoPath}" stash --include-untracked`);
      console.log("Uncommitted changes stashed before pull.");
    }
    execSync(`git -C "${repoPath}" pull --rebase`);
    if (status) {
      // Pop the stash after pull
      execSync(`git -C "${repoPath}" stash pop`);
      console.log("Stashed changes reapplied after pull.");
    }
    console.log("Repo pulled successfully.");
  } catch (err) {
    console.error("Git pull failed!", err.message);
    throw err;
  }
}

function gitCommitAndPush(changeDescription, username) {
  const repoPath = config.translations.repoPath;
  try {
    execSync(`git -C "${repoPath}" add translations.db`);
    execSync(
      `git -C "${repoPath}" commit --author="${username} <${username}@users.noreply>" -m "translate: ${changeDescription}"`
    );
    execSync(`git -C "${repoPath}" push`);
    console.log(`Pushed: ${changeDescription}`);
  } catch (err) {
    console.error("Git push failed – you may have a conflict!", err.message);
    throw err;
  }
}

module.exports = { gitPull, gitCommitAndPush };
