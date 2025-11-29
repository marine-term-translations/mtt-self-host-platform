// Reputation service - handles reputation system functions with shield protection

const { getDatabase } = require("../db/database");

/**
 * Reputation tier thresholds and rules
 * Based on the reputation shield system:
 * - 0-99: Full cascading penalties, new users
 * - 100-499: Capped at -10, regular contributors
 * - 500-999: Capped at -5, trusted users
 * - ≥1000: Immune to rejection penalties, veterans/moderators
 */
const REPUTATION_TIERS = {
  VETERAN: 1000,
  TRUSTED: 500,
  REGULAR: 100,
  NEW_USER: 0,
};

/**
 * Base penalty for rejected translations
 */
const BASE_REJECTION_PENALTY = -5;

/**
 * Base penalty for false rejections
 */
const BASE_FALSE_REJECTION_PENALTY = -10;

/**
 * Days to look back for cascading rejection penalty
 */
const REJECTION_LOOKBACK_DAYS = 14;

/**
 * Reputation rewards for positive actions
 */
const REPUTATION_REWARDS = {
  TRANSLATION_APPROVED: 5,   // Reward when translation is approved
  TRANSLATION_MERGED: 10,    // Reward when translation is merged (final acceptance)
  TRANSLATION_CREATED: 1,    // Small reward for creating a new translation
};

/**
 * Get a user's current reputation
 * @param {string} username - The username to look up
 * @returns {number} The user's reputation (0 if not found)
 */
function getUserReputation(username) {
  const db = getDatabase();
  const user = db
    .prepare("SELECT reputation FROM users WHERE username = ?")
    .get(username);
  return user ? user.reputation : 0;
}

/**
 * Count recent rejections for a user within the lookback period
 * @param {string} username - The username to check
 * @param {number|null} excludeTranslationId - Optional translation ID to exclude from count
 * @returns {number} Count of recent rejections
 */
function countRecentRejections(username, excludeTranslationId = null) {
  const db = getDatabase();
  // Use parameterized query with string interpolation for lookback days
  // Since REJECTION_LOOKBACK_DAYS is a constant defined in this module, we use it safely
  const lookbackModifier = `-${REJECTION_LOOKBACK_DAYS} days`;
  let query = `
    SELECT COUNT(*) AS cnt
    FROM translations t
    WHERE t.status = 'rejected'
      AND (t.submitted_for_review_by = ? OR t.modified_by = ? OR t.created_by = ?)
      AND t.updated_at >= datetime('now', ?)
  `;

  const params = [username, username, username, lookbackModifier];

  if (excludeTranslationId !== null) {
    query += " AND t.id != ?";
    params.push(excludeTranslationId);
  }

  const result = db.prepare(query).get(...params);
  return result ? result.cnt : 0;
}

/**
 * Calculate the raw cascading rejection penalty based on recent rejections
 * @param {number} recentRejectionCount - Number of recent rejections
 * @returns {number} The raw penalty amount (negative number)
 */
function calculateRawRejectionPenalty(recentRejectionCount) {
  // Formula: -5 * (1 + count of recent rejections)
  return BASE_REJECTION_PENALTY * (1 + recentRejectionCount);
}

/**
 * Apply reputation shield to a penalty based on user's reputation level
 * @param {number} rawPenalty - The raw penalty amount (negative number)
 * @param {number} reputation - The user's current reputation
 * @returns {number} The shielded penalty amount (may be less severe or 0)
 */
function applyReputationShield(rawPenalty, reputation) {
  if (reputation >= REPUTATION_TIERS.VETERAN) {
    // Veterans are immune to rejection penalties
    return 0;
  } else if (reputation >= REPUTATION_TIERS.TRUSTED) {
    // Trusted users capped at -5
    return Math.max(rawPenalty, -5);
  } else if (reputation >= REPUTATION_TIERS.REGULAR) {
    // Regular contributors capped at -10
    return Math.max(rawPenalty, -10);
  } else {
    // New users receive full cascading penalty
    return rawPenalty;
  }
}

/**
 * Calculate the rejection penalty with reputation shield for a user
 * @param {string} username - The username whose translation was rejected
 * @param {number|null} excludeTranslationId - Optional translation ID to exclude from count
 * @returns {{ rawPenalty: number, shieldedPenalty: number, reputation: number, recentCount: number }}
 */
function calculateRejectionPenalty(username, excludeTranslationId = null) {
  const reputation = getUserReputation(username);
  const recentCount = countRecentRejections(username, excludeTranslationId);
  const rawPenalty = calculateRawRejectionPenalty(recentCount);
  const shieldedPenalty = applyReputationShield(rawPenalty, reputation);

  return {
    rawPenalty,
    shieldedPenalty,
    reputation,
    recentCount,
  };
}

/**
 * Calculate the false rejection penalty with reputation shield
 * @param {string} username - The username who made the false rejection
 * @returns {{ rawPenalty: number, shieldedPenalty: number, reputation: number }}
 */
function calculateFalseRejectionPenalty(username) {
  const reputation = getUserReputation(username);
  const rawPenalty = BASE_FALSE_REJECTION_PENALTY;

  let shieldedPenalty;
  if (reputation >= REPUTATION_TIERS.VETERAN) {
    // Veterans are immune to false rejection penalties
    shieldedPenalty = 0;
  } else if (reputation >= REPUTATION_TIERS.TRUSTED) {
    // Trusted users get -5 instead of -10
    shieldedPenalty = -5;
  } else {
    // Everyone else gets full penalty
    shieldedPenalty = rawPenalty;
  }

  return {
    rawPenalty,
    shieldedPenalty,
    reputation,
  };
}

/**
 * Record a reputation event in the database
 * @param {string} username - The user whose reputation changed
 * @param {number} delta - The reputation change amount
 * @param {string} reason - The reason for the change
 * @param {number|null} translationId - Optional related translation ID
 * @param {object|null} extra - Optional extra data to store as JSON
 * @returns {number} The inserted event ID
 */
function recordReputationEvent(
  username,
  delta,
  reason,
  translationId = null,
  extra = null
) {
  const db = getDatabase();

  // First record user activity
  const activityStmt = db.prepare(`
    INSERT INTO user_activity (user, action, translation_id, extra)
    VALUES (?, ?, ?, ?)
  `);
  const activityInfo = activityStmt.run(
    username,
    reason,
    translationId,
    extra ? JSON.stringify(extra) : null
  );

  // Then record reputation event
  const stmt = db.prepare(`
    INSERT INTO reputation_events (user, delta, reason, related_activity_id)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(username, delta, reason, activityInfo.lastInsertRowid);
  return info.lastInsertRowid;
}

/**
 * Apply a reputation change to a user
 * @param {string} username - The user to update
 * @param {number} delta - The reputation change amount (positive or negative)
 * @param {string} reason - The reason for the change
 * @param {number|null} translationId - Optional related translation ID
 * @param {object|null} extra - Optional extra data for the event
 * @returns {{ newReputation: number, eventId: number } | null} Result or null if user not found
 */
function applyReputationChange(
  username,
  delta,
  reason,
  translationId = null,
  extra = null
) {
  const db = getDatabase();

  // Check if user exists first
  const userExists = db
    .prepare("SELECT 1 FROM users WHERE username = ?")
    .get(username);

  if (!userExists) {
    return null;
  }

  if (delta === 0) {
    // No change needed, but still record the event if there's a reason
    const eventId = recordReputationEvent(
      username,
      delta,
      reason,
      translationId,
      extra
    );
    const reputation = getUserReputation(username);
    return { newReputation: reputation, eventId };
  }

  // Update user reputation
  db.prepare(
    "UPDATE users SET reputation = reputation + ? WHERE username = ?"
  ).run(delta, username);

  // Record the event
  const eventId = recordReputationEvent(
    username,
    delta,
    reason,
    translationId,
    extra
  );

  // Get new reputation
  const newReputation = getUserReputation(username);

  return { newReputation, eventId };
}

/**
 * Apply rejection penalty to a user (with shield protection)
 * @param {string} username - The username whose translation was rejected
 * @param {number} translationId - The rejected translation ID
 * @returns {{ applied: boolean, penalty: number, rawPenalty: number, shielded: boolean, newReputation: number | null }}
 */
function applyRejectionPenalty(username, translationId) {
  const penaltyInfo = calculateRejectionPenalty(username, translationId);
  const { rawPenalty, shieldedPenalty, reputation, recentCount } = penaltyInfo;

  // Only apply if there's actually a penalty
  if (shieldedPenalty >= 0) {
    return {
      applied: false,
      penalty: 0,
      rawPenalty,
      shielded: true,
      newReputation: reputation,
    };
  }

  const result = applyReputationChange(
    username,
    shieldedPenalty,
    "translation_rejected",
    translationId,
    {
      raw_penalty: rawPenalty,
      shielded_penalty: shieldedPenalty,
      recent_rejections: recentCount,
      reputation_at_time: reputation,
    }
  );

  // If user doesn't exist, applyReputationChange returns null
  if (!result) {
    return {
      applied: false,
      penalty: 0,
      rawPenalty,
      shielded: false,
      newReputation: null,
    };
  }

  return {
    applied: true,
    penalty: shieldedPenalty,
    rawPenalty,
    shielded: shieldedPenalty > rawPenalty,
    newReputation: result.newReputation,
  };
}

/**
 * Apply false rejection penalty to a user (with shield protection)
 * @param {string} username - The username who made the false rejection
 * @param {number} translationId - The translation ID that was falsely rejected
 * @returns {{ applied: boolean, penalty: number, rawPenalty: number, shielded: boolean, newReputation: number | null }}
 */
function applyFalseRejectionPenalty(username, translationId) {
  const penaltyInfo = calculateFalseRejectionPenalty(username);
  const { rawPenalty, shieldedPenalty, reputation } = penaltyInfo;

  // Only apply if there's actually a penalty
  if (shieldedPenalty >= 0) {
    return {
      applied: false,
      penalty: 0,
      rawPenalty,
      shielded: true,
      newReputation: reputation,
    };
  }

  const result = applyReputationChange(
    username,
    shieldedPenalty,
    "false_rejection",
    translationId,
    {
      original_penalty: rawPenalty,
      shielded_penalty: shieldedPenalty,
      reputation_at_time: reputation,
    }
  );

  // If user doesn't exist, applyReputationChange returns null
  if (!result) {
    return {
      applied: false,
      penalty: 0,
      rawPenalty,
      shielded: false,
      newReputation: null,
    };
  }

  return {
    applied: true,
    penalty: shieldedPenalty,
    rawPenalty,
    shielded: shieldedPenalty > rawPenalty,
    newReputation: result.newReputation,
  };
}

/**
 * Check if a user is immune to rejection penalties
 * @param {string} username - The username to check
 * @returns {boolean} True if user is immune
 */
function isImmuneToRejectionPenalty(username) {
  const reputation = getUserReputation(username);
  return reputation >= REPUTATION_TIERS.VETERAN;
}

/**
 * Get the reputation tier name for a user
 * @param {string} username - The username to check
 * @returns {string} The tier name (veteran, trusted, regular, or new_user)
 */
function getReputationTierName(username) {
  const reputation = getUserReputation(username);

  if (reputation >= REPUTATION_TIERS.VETERAN) {
    return "veteran";
  } else if (reputation >= REPUTATION_TIERS.TRUSTED) {
    return "trusted";
  } else if (reputation >= REPUTATION_TIERS.REGULAR) {
    return "regular";
  } else {
    return "new_user";
  }
}

/**
 * Get reputation tier info for a user
 * @param {string} username - The username to check
 * @returns {{ reputation: number, tier: string, maxPenalty: number | null, immuneToRejection: boolean }}
 */
function getReputationTierInfo(username) {
  const reputation = getUserReputation(username);
  const tier = getReputationTierName(username);

  let maxPenalty;
  let immuneToRejection;

  if (reputation >= REPUTATION_TIERS.VETERAN) {
    maxPenalty = null;
    immuneToRejection = true;
  } else if (reputation >= REPUTATION_TIERS.TRUSTED) {
    maxPenalty = -5;
    immuneToRejection = false;
  } else if (reputation >= REPUTATION_TIERS.REGULAR) {
    maxPenalty = -10;
    immuneToRejection = false;
  } else {
    maxPenalty = null; // No cap for new users
    immuneToRejection = false;
  }

  return {
    reputation,
    tier,
    maxPenalty,
    immuneToRejection,
  };
}

/**
 * Generic function to apply a reputation reward
 * @param {string} username - The user to reward
 * @param {number} reward - The reward amount
 * @param {string} reason - The reason for the reward
 * @param {number} translationId - The translation ID
 * @returns {{ applied: boolean, reward: number, newReputation: number | null }}
 */
function applyReward(username, reward, reason, translationId) {
  const result = applyReputationChange(
    username,
    reward,
    reason,
    translationId,
    { reward }
  );

  if (!result) {
    return {
      applied: false,
      reward: 0,
      newReputation: null,
    };
  }

  return {
    applied: true,
    reward,
    newReputation: result.newReputation,
  };
}

/**
 * Apply reputation reward when a translation is approved
 * @param {string} username - The translator who created the translation
 * @param {number} translationId - The translation ID
 * @returns {{ applied: boolean, reward: number, newReputation: number | null }}
 */
function applyApprovalReward(username, translationId) {
  return applyReward(
    username,
    REPUTATION_REWARDS.TRANSLATION_APPROVED,
    "translation_approved",
    translationId
  );
}

/**
 * Apply reputation reward when a translation is merged
 * @param {string} username - The translator who created the translation
 * @param {number} translationId - The translation ID
 * @returns {{ applied: boolean, reward: number, newReputation: number | null }}
 */
function applyMergeReward(username, translationId) {
  return applyReward(
    username,
    REPUTATION_REWARDS.TRANSLATION_MERGED,
    "translation_merged",
    translationId
  );
}

/**
 * Apply reputation reward when a translation is created
 * @param {string} username - The translator who created the translation
 * @param {number} translationId - The translation ID
 * @returns {{ applied: boolean, reward: number, newReputation: number | null }}
 */
function applyCreationReward(username, translationId) {
  return applyReward(
    username,
    REPUTATION_REWARDS.TRANSLATION_CREATED,
    "translation_created",
    translationId
  );
}

module.exports = {
  // Constants
  REPUTATION_TIERS,
  BASE_REJECTION_PENALTY,
  BASE_FALSE_REJECTION_PENALTY,
  REJECTION_LOOKBACK_DAYS,
  REPUTATION_REWARDS,

  // Core functions
  getUserReputation,
  countRecentRejections,
  calculateRawRejectionPenalty,
  applyReputationShield,
  calculateRejectionPenalty,
  calculateFalseRejectionPenalty,
  recordReputationEvent,
  applyReputationChange,

  // High-level penalty functions
  applyRejectionPenalty,
  applyFalseRejectionPenalty,

  // High-level reward functions
  applyApprovalReward,
  applyMergeReward,
  applyCreationReward,

  // Utility functions
  isImmuneToRejectionPenalty,
  getReputationTierName,
  getReputationTierInfo,
};
