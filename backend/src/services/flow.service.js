// Flow service - handles Translation Flow logic and queue management

const { getDatabase } = require("../db/database");
const {
  awardPoints,
  updateStreak,
  incrementTranslationCount,
  incrementReviewCount,
  updateChallengeProgress,
} = require("./gamification.service");
const {
  applyApprovalReward,
  applyRejectionPenalty,
  applyCreationReward,
} = require("./reputation.service");

/**
 * Get pending reviews for a user (reviews they need to do, not their own translations)
 * Returns translations that are in 'review' status and not created by the user
 * Only returns fields from translatable_field_uris configured in source
 * @param {number|string} userIdentifier - User ID or username
 * @param {string} language - Optional language filter
 * @returns {array} Array of translations needing review
 */
function getPendingReviews(userIdentifier, language = null) {
  const db = getDatabase();
  const { resolveUsernameToId } = require("../db/database");
  
  // Resolve user identifier to user_id
  let userId = typeof userIdentifier === 'number' ? userIdentifier : parseInt(userIdentifier, 10);
  if (isNaN(userId)) {
    userId = resolveUsernameToId(userIdentifier);
    if (!userId) {
      return null;
    }
  }
  
  // Build query with optional language filter and translatable fields filter
  let query = `SELECT t.id as translation_id, t.term_field_id, t.language, t.value, t.status,
            t.created_by_id, t.created_at,
            tf.field_uri, tf.original_value,
            term.id as term_id, term.uri as term_uri, term.source_id,
            s.translatable_field_uris
     FROM translations t
     JOIN term_fields tf ON t.term_field_id = tf.id
     JOIN terms term ON tf.term_id = term.id
     LEFT JOIN sources s ON term.source_id = s.source_id
     WHERE t.status = 'review' 
       AND t.created_by_id != ?
       AND (t.reviewed_by_id IS NULL)
       AND EXISTS (
         SELECT 1 FROM sources s2 
         WHERE s2.source_id = term.source_id 
         AND (
           s2.translatable_field_uris IS NULL 
           OR s2.translatable_field_uris = '[]'
           OR json_extract(s2.translatable_field_uris, '$') LIKE '%' || tf.field_uri || '%'
         )
       )`;
  
  const params = [userId];
  
  if (language) {
    query += ` AND t.language = ?`;
    params.push(language);
  }
  
  query += ` ORDER BY datetime(t.created_at) ASC LIMIT 1`;
  
  const reviews = db.prepare(query).get(...params);
  
  if (!reviews) {
    return null;
  }
  
  // Enrich with translatable fields for context
  const allFields = db.prepare(
    `SELECT tf.field_uri, tf.original_value 
     FROM term_fields tf
     JOIN terms term ON tf.term_id = term.id
     LEFT JOIN sources s ON term.source_id = s.source_id
     WHERE tf.term_id = ?
     AND (
       s.translatable_field_uris IS NULL 
       OR s.translatable_field_uris = '[]'
       OR json_extract(s.translatable_field_uris, '$') LIKE '%' || tf.field_uri || '%'
     )`
  ).all(reviews.term_id);
  
  return {
    ...reviews,
    term_fields: allFields,
  };
}

/**
 * Get a random untranslated term field
 * Prioritizes terms with no translations at all
 * Only returns fields from translatable_field_uris configured in source
 * @param {number|string} userIdentifier - User ID or username (optional, for filtering)
 * @param {string} language - Optional language filter
 * @returns {object|null} Term field needing translation
 */
function getRandomUntranslated(userIdentifier, language = null) {
  const db = getDatabase();
  
  // Build query with optional language filter and translatable fields filter
  let query = `SELECT tf.id as term_field_id, tf.field_uri, tf.original_value,
            term.id as term_id, term.uri as term_uri, term.source_id,
            s.translatable_field_uris
     FROM term_fields tf
     JOIN terms term ON tf.term_id = term.id
     LEFT JOIN sources s ON term.source_id = s.source_id
     WHERE 1=1`;
  
  const params = [];
  
  // Filter to only translatable fields if configured
  query += ` AND EXISTS (
       SELECT 1 FROM sources s2 
       WHERE s2.source_id = term.source_id 
       AND (
         s2.translatable_field_uris IS NULL 
         OR s2.translatable_field_uris = '[]'
         OR json_extract(s2.translatable_field_uris, '$') LIKE '%' || tf.field_uri || '%'
       )
     )`;
  
  if (language) {
    query += ` AND tf.id NOT IN (
         SELECT term_field_id FROM translations WHERE language = ? AND (status = 'original' OR status = 'merged')
       )`;
    params.push(language);
  } else {
    query += ` AND tf.id NOT IN (
         SELECT term_field_id FROM translations WHERE language IN ('nl', 'fr', 'de', 'es', 'it', 'pt') AND (status = 'original' OR status = 'merged')
       )`;
  }
  
  query += ` ORDER BY RANDOM() LIMIT 1`;
  
  const untranslated = db.prepare(query).get(...params);
  
  if (!untranslated) {
    // Try to find fields with partial translations
    let partialQuery = `SELECT tf.id as term_field_id, tf.field_uri, tf.original_value,
              term.id as term_id, term.uri as term_uri, term.source_id,
              s.translatable_field_uris,
              (SELECT COUNT(*) FROM translations WHERE term_field_id = tf.id`;
    
    if (language) {
      partialQuery += ` AND language = ? AND (status = 'original' OR status = 'merged')`;
    } else {
      partialQuery += ` AND (status = 'original' OR status = 'merged')`;
    }
    
    partialQuery += `) as translation_count
       FROM term_fields tf
       JOIN terms term ON tf.term_id = term.id
       LEFT JOIN sources s ON term.source_id = s.source_id
       WHERE EXISTS (
         SELECT 1 FROM sources s2 
         WHERE s2.source_id = term.source_id 
         AND (
           s2.translatable_field_uris IS NULL 
           OR s2.translatable_field_uris = '[]'
           OR json_extract(s2.translatable_field_uris, '$') LIKE '%' || tf.field_uri || '%'
         )
       )
         AND (SELECT COUNT(*) FROM translations WHERE term_field_id = tf.id`;
    
    const partialParams = [];
    
    if (language) {
      partialQuery += ` AND language = ? AND (status = 'original' OR status = 'merged')`;
      partialParams.push(language);
      partialQuery += `) < 1`;
    } else {
      partialQuery += ` AND (status = 'original' OR status = 'merged')`;
      partialQuery += `) < 6`;
    }
    
    partialQuery += ` ORDER BY translation_count ASC, RANDOM() LIMIT 1`;
    
    const partiallyTranslated = db.prepare(partialQuery).get(...partialParams);
    
    if (!partiallyTranslated) {
      return null;
    }
    
    // Get all translatable fields for this term for context
    const allFields = db.prepare(
      `SELECT tf.field_uri, tf.original_value 
       FROM term_fields tf
       JOIN terms term ON tf.term_id = term.id
       LEFT JOIN sources s ON term.source_id = s.source_id
       WHERE tf.term_id = ?
       AND (
         s.translatable_field_uris IS NULL 
         OR s.translatable_field_uris = '[]'
         OR json_extract(s.translatable_field_uris, '$') LIKE '%' || tf.field_uri || '%'
       )`
    ).all(partiallyTranslated.term_id);
    
    return {
      ...partiallyTranslated,
      term_fields: allFields,
    };
  }
  
  // Get all translatable fields for this term for context
  const allFields = db.prepare(
    `SELECT tf.field_uri, tf.original_value 
     FROM term_fields tf
     JOIN terms term ON tf.term_id = term.id
     LEFT JOIN sources s ON term.source_id = s.source_id
     WHERE tf.term_id = ?
     AND (
       s.translatable_field_uris IS NULL 
       OR s.translatable_field_uris = '[]'
       OR json_extract(s.translatable_field_uris, '$') LIKE '%' || tf.field_uri || '%'
     )`
  ).all(untranslated.term_id);
  
  return {
    ...untranslated,
    term_fields: allFields,
  };
}

/**
 * Get the next task for the user (review or translate)
 * @param {number|string} userIdentifier - User ID or username
 * @param {string} language - Optional language filter
 * @returns {object} Next task object
 */
function getNextTask(userIdentifier, language = null) {
  // Priority 1: Pending reviews
  const review = getPendingReviews(userIdentifier, language);
  if (review) {
    return {
      type: 'review',
      task: review,
    };
  }
  
  // Priority 2: Untranslated terms
  const untranslated = getRandomUntranslated(userIdentifier, language);
  if (untranslated) {
    return {
      type: 'translate',
      task: untranslated,
    };
  }
  
  // No tasks available
  return {
    type: 'none',
    message: 'No tasks available at the moment. Great job!',
  };
}

/**
 * Submit a review (approve or reject)
 * @param {object} params - Review parameters
 * @returns {object} Result of review
 */
function submitReview(params) {
  const { userId, translationId, action, sessionId } = params;
  const db = getDatabase();
  const { resolveUsernameToId } = require("../db/database");
  
  // Resolve userId to integer ID
  let resolvedUserId = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(resolvedUserId)) {
    resolvedUserId = resolveUsernameToId(userId);
    if (!resolvedUserId) {
      throw new Error('User not found');
    }
  }
  
  // Validate action
  if (!['approve', 'reject'].includes(action)) {
    throw new Error('Invalid action. Must be "approve" or "reject"');
  }
  
  // Get the translation
  const translation = db.prepare(
    "SELECT * FROM translations WHERE id = ?"
  ).get(translationId);
  
  if (!translation) {
    throw new Error('Translation not found');
  }
  
  if (translation.status !== 'review') {
    throw new Error('Translation is not in review status');
  }
  
  // Update translation status
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  db.prepare(
    "UPDATE translations SET status = ?, reviewed_by_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(newStatus, resolvedUserId, translationId);
  
  // Apply reputation changes based on action using existing reputation system
  if (action === 'approve') {
    // Get the translator and apply approval reward
    const translatorUserId = translation.modified_by_id || translation.created_by_id;
    if (translatorUserId) {
      applyApprovalReward(translatorUserId, translationId);
    }
  } else if (action === 'reject') {
    // Apply rejection penalty to translator
    const translatorUserId = translation.modified_by_id || translation.created_by_id;
    if (translatorUserId) {
      applyRejectionPenalty(translatorUserId, translationId);
    }
  }
  
  // Award 1 reputation point to reviewer
  const points = 1;
  awardPoints(resolvedUserId, points, `review_${action}`);
  
  // Update streak
  const streakInfo = updateStreak(resolvedUserId);
  
  // Increment review count
  incrementReviewCount(resolvedUserId);
  
  // Update challenge progress
  updateChallengeProgress(resolvedUserId, 'review_10', 1);
  
  // Log activity
  try {
    db.prepare(
      "INSERT INTO user_activity (user_id, action, translation_id, extra) VALUES (?, ?, ?, ?)"
    ).run(resolvedUserId, `translation_${action}d`, translationId, JSON.stringify({ sessionId }));
  } catch (err) {
    console.log("Could not log activity:", err.message);
  }
  
  return {
    success: true,
    action,
    points,
    streakInfo,
  };
}

/**
 * Get available languages for translation
 * @returns {array} Array of language codes
 */
function getAvailableLanguages() {
  return [
    { code: 'nl', name: 'Dutch' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
  ];
}

module.exports = {
  getPendingReviews,
  getRandomUntranslated,
  getNextTask,
  submitReview,
  getAvailableLanguages,
};
