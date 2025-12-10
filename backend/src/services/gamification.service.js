// Gamification service - handles points, streaks, and challenges

const { getDatabase } = require("../db/database");

/**
 * Initialize user stats if they don't exist
 * @param {string} userId - Username/ORCID
 */
function ensureUserStats(userId) {
  const db = getDatabase();
  const existing = db.prepare("SELECT user_id FROM user_stats WHERE user_id = ?").get(userId);
  
  if (!existing) {
    db.prepare(
      "INSERT INTO user_stats (user_id, points, daily_streak, longest_streak, last_active_date) VALUES (?, 0, 0, 0, NULL)"
    ).run(userId);
  }
}

/**
 * Get user statistics
 * @param {string} userId - Username/ORCID
 * @returns {object} User stats object
 */
function getUserStats(userId) {
  const db = getDatabase();
  ensureUserStats(userId);
  return db.prepare("SELECT * FROM user_stats WHERE user_id = ?").get(userId);
}

/**
 * Award points to a user
 * @param {string} userId - Username/ORCID
 * @param {number} points - Points to award
 * @param {string} reason - Reason for points
 */
function awardPoints(userId, points, reason = "general") {
  const db = getDatabase();
  ensureUserStats(userId);
  
  db.prepare(
    "UPDATE user_stats SET points = points + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  ).run(points, userId);
  
  // Log in reputation_events if it exists
  try {
    db.prepare(
      "INSERT INTO reputation_events (user, delta, reason) VALUES (?, ?, ?)"
    ).run(userId, points, reason);
  } catch (err) {
    // Table might not exist in all deployments
    console.log("Could not log reputation event:", err.message);
  }
}

/**
 * Update user streak based on activity
 * @param {string} userId - Username/ORCID
 * @returns {object} Updated streak info
 */
function updateStreak(userId) {
  const db = getDatabase();
  ensureUserStats(userId);
  
  const stats = db.prepare("SELECT * FROM user_stats WHERE user_id = ?").get(userId);
  const today = new Date().toISOString().split('T')[0];
  const lastActive = stats.last_active_date;
  
  let newStreak = stats.daily_streak;
  let longestStreak = stats.longest_streak;
  
  if (!lastActive) {
    // First activity ever
    newStreak = 1;
  } else {
    const lastActiveDate = new Date(lastActive);
    const todayDate = new Date(today);
    const daysDiff = Math.floor((todayDate - lastActiveDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Same day, no change
      return { streak: newStreak, isNewStreak: false };
    } else if (daysDiff === 1) {
      // Consecutive day
      newStreak += 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
  }
  
  // Update longest streak if needed
  if (newStreak > longestStreak) {
    longestStreak = newStreak;
  }
  
  db.prepare(
    "UPDATE user_stats SET daily_streak = ?, longest_streak = ?, last_active_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  ).run(newStreak, longestStreak, today, userId);
  
  return {
    streak: newStreak,
    longestStreak: longestStreak,
    isNewStreak: !lastActive || (lastActive !== today)
  };
}

/**
 * Increment translation count
 * @param {string} userId - Username/ORCID
 */
function incrementTranslationCount(userId) {
  const db = getDatabase();
  ensureUserStats(userId);
  
  db.prepare(
    "UPDATE user_stats SET translations_count = translations_count + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  ).run(userId);
}

/**
 * Increment review count
 * @param {string} userId - Username/ORCID
 */
function incrementReviewCount(userId) {
  const db = getDatabase();
  ensureUserStats(userId);
  
  db.prepare(
    "UPDATE user_stats SET reviews_count = reviews_count + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  ).run(userId);
}

/**
 * Get or create daily challenges for a user
 * @param {string} userId - Username/ORCID
 * @returns {array} Array of daily challenges
 */
function getDailyChallenges(userId) {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  // Get existing challenges for today
  const existing = db.prepare(
    "SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?"
  ).all(userId, today);
  
  if (existing.length > 0) {
    return existing;
  }
  
  // Create new challenges for today
  const challenges = [
    { type: 'translate_5', target: 5, points: 50 },
    { type: 'review_10', target: 10, points: 100 },
  ];
  
  challenges.forEach(challenge => {
    db.prepare(
      "INSERT INTO daily_challenges (user_id, challenge_date, challenge_type, target_count, points_reward) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, today, challenge.type, challenge.target, challenge.points);
  });
  
  return db.prepare(
    "SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?"
  ).all(userId, today);
}

/**
 * Update challenge progress
 * @param {string} userId - Username/ORCID
 * @param {string} challengeType - Type of challenge
 * @param {number} increment - Amount to increment (default 1)
 */
function updateChallengeProgress(userId, challengeType, increment = 1) {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const challenge = db.prepare(
    "SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ? AND challenge_type = ?"
  ).get(userId, today, challengeType);
  
  if (!challenge) {
    return null;
  }
  
  const newCount = challenge.current_count + increment;
  const isCompleted = newCount >= challenge.target_count ? 1 : 0;
  
  db.prepare(
    `UPDATE daily_challenges 
     SET current_count = ?, 
         completed = ?, 
         completed_at = CASE WHEN ? = 1 AND completed = 0 THEN CURRENT_TIMESTAMP ELSE completed_at END
     WHERE id = ?`
  ).run(newCount, isCompleted, isCompleted, challenge.id);
  
  // Award points if just completed
  if (isCompleted && !challenge.completed) {
    awardPoints(userId, challenge.points_reward, `challenge_${challengeType}`);
  }
  
  return db.prepare("SELECT * FROM daily_challenges WHERE id = ?").get(challenge.id);
}

/**
 * Start a new flow session
 * @param {string} userId - Username/ORCID
 * @returns {object} Session object
 */
function startFlowSession(userId) {
  const db = getDatabase();
  
  const result = db.prepare(
    "INSERT INTO flow_sessions (user_id) VALUES (?)"
  ).run(userId);
  
  return db.prepare("SELECT * FROM flow_sessions WHERE id = ?").get(result.lastInsertRowid);
}

/**
 * Update flow session stats
 * @param {number} sessionId - Session ID
 * @param {object} updates - Updates to apply
 */
function updateFlowSession(sessionId, updates) {
  const db = getDatabase();
  
  const setClauses = [];
  const values = [];
  
  if (updates.translations_completed !== undefined) {
    setClauses.push("translations_completed = translations_completed + ?");
    values.push(updates.translations_completed);
  }
  
  if (updates.reviews_completed !== undefined) {
    setClauses.push("reviews_completed = reviews_completed + ?");
    values.push(updates.reviews_completed);
  }
  
  if (updates.points_earned !== undefined) {
    setClauses.push("points_earned = points_earned + ?");
    values.push(updates.points_earned);
  }
  
  values.push(sessionId);
  
  db.prepare(
    `UPDATE flow_sessions SET ${setClauses.join(", ")} WHERE id = ?`
  ).run(...values);
}

/**
 * End a flow session
 * @param {number} sessionId - Session ID
 * @returns {object} Final session stats
 */
function endFlowSession(sessionId) {
  const db = getDatabase();
  
  db.prepare(
    "UPDATE flow_sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(sessionId);
  
  return db.prepare("SELECT * FROM flow_sessions WHERE id = ?").get(sessionId);
}

/**
 * Get leaderboard by points
 * @param {number} limit - Number of users to return
 * @returns {array} Top users
 */
function getLeaderboard(limit = 10) {
  const db = getDatabase();
  
  return db.prepare(
    `SELECT us.user_id, us.points, us.daily_streak, u.username, u.reputation
     FROM user_stats us
     LEFT JOIN users u ON us.user_id = u.username
     ORDER BY us.points DESC
     LIMIT ?`
  ).all(limit);
}

module.exports = {
  ensureUserStats,
  getUserStats,
  awardPoints,
  updateStreak,
  incrementTranslationCount,
  incrementReviewCount,
  getDailyChallenges,
  updateChallengeProgress,
  startFlowSession,
  updateFlowSession,
  endFlowSession,
  getLeaderboard,
};
