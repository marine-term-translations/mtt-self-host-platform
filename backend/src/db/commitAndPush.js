const { execSync } = require("child_process");

function commitAndPush(changeDescription, username) {
  const repoPath = process.env.TRANSLATIONS_REPO_PATH;
  try {
    execSync(`git -C "${repoPath}" add translations.db`);
    execSync(
      `git -C "${repoPath}" commit --author="${username} <${username}@users.noreply>" -m "translate: ${changeDescription}"`
    );
    execSync(`git -C "${repoPath}" pull --rebase`); // avoid conflicts
    execSync(`git -C "${repoPath}" push`);
    console.log(`Pushed: ${changeDescription}`);
  } catch (err) {
    console.error("Git push failed – you may have a conflict!", err.message);
    throw err;
  }
}

module.exports = { commitAndPush };
