const { getDatabase } = require("../db/database");
const crypto = require("crypto");

function awardRewardToUser(userId, rewardId) {
  const db = getDatabase();
  const id = `urew_${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO user_rewards (id, user_id, reward_id, is_equipped)
    VALUES (?, ?, ?, 0)
  `).run(id, userId, rewardId);
  return id;
}

function getUserTitles(userId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT ur.id as user_reward_id, ur.is_equipped, r.*
    FROM user_rewards ur
    JOIN event_rewards r ON ur.reward_id = r.id
    WHERE ur.user_id = ? AND r.reward_type = 'TITLE'
  `).all(userId);
}

function equipUserTitle(userId, rewardId) {
  const db = getDatabase();
  // Unequip all existing titles for this user
  db.prepare(`
    UPDATE user_rewards 
    SET is_equipped = 0 
    WHERE user_id = ? AND reward_id IN (SELECT id FROM event_rewards WHERE reward_type = 'TITLE')
  `).run(userId);

  // Equip target title if provided
  if (rewardId) {
    db.prepare("UPDATE user_rewards SET is_equipped = 1 WHERE user_id = ? AND reward_id = ?").run(userId, rewardId);
  }

  return db.prepare("SELECT * FROM user_rewards WHERE user_id = ? AND reward_id = ?").get(userId, rewardId);
}

module.exports = {
  awardRewardToUser,
  getUserTitles,
  equipUserTitle
};
