function buildRankChangeDigest(teamName, oldRank, newRank, eventTitle) {
  const subject = `[${eventTitle}] Team Standings Update: ${teamName}`;
  const body = `Hello! Your team "${teamName}" in the competition "${eventTitle}" has moved from rank ${oldRank} to rank ${newRank}.\n\nKeep contributing translations to reach 1st place!`;
  return { subject, body };
}

function buildEventWinnerNotice(teamName, eventTitle, titleRewardName) {
  const subject = `🎉 Congratulations! Your team won ${eventTitle}`;
  const body = `Great news! Team "${teamName}" took 1st place in "${eventTitle}". You have unlocked the profile title: "${titleRewardName}".`;
  return { subject, body };
}

module.exports = {
  buildRankChangeDigest,
  buildEventWinnerNotice
};
