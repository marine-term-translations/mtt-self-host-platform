// Flow service - handles Translation Flow logic and queue management

const { getDatabase } = require("../db/database");
const {
  awardPoints,
  updateStreak,
  incrementTranslationCount,
  incrementReviewCount,
  updateChallengeProgress,
} = require("./gamification.service");

/**
 * Get pending reviews for a user (reviews they need to do, not their own translations)
 * Returns translations that are in 'review' status and not created by the user
 * @param {string} userId - Username/ORCID
 * @param {string} language - Optional language filter
 * @returns {array} Array of translations needing review
 */
function getPendingReviews(userId, language = null) {
  const db = getDatabase();
  
  // Build query with optional language filter
  let query = `SELECT t.id as translation_id, t.term_field_id, t.language, t.value, t.status,
            t.created_by, t.created_at,
            tf.field_uri, tf.field_term, tf.original_value,
            term.id as term_id, term.uri as term_uri
     FROM translations t
     JOIN term_fields tf ON t.term_field_id = tf.id
     JOIN terms term ON tf.term_id = term.id
     WHERE t.status = 'review' 
       AND t.created_by != ?
       AND (t.reviewed_by IS NULL OR t.reviewed_by = '')`;
  
  const params = [userId];
  
  if (language) {
    query += ` AND t.language = ?`;
    params.push(language);
  }
  
  query += ` ORDER BY t.created_at ASC LIMIT 1`;
  
  const reviews = db.prepare(query).get(...params);
  
  if (!reviews) {
    return null;
  }
  
  // Enrich with term fields for context
  const allFields = db.prepare(
    `SELECT field_uri, field_term, original_value 
     FROM term_fields 
     WHERE term_id = ?`
  ).all(reviews.term_id);
  
  return {
    ...reviews,
    term_fields: allFields,
  };
}

/**
 * Get a random untranslated term field
 * Prioritizes terms with no translations at all
 * @param {string} userId - Username/ORCID (optional, for filtering)
 * @param {string} language - Optional language filter
 * @returns {object|null} Term field needing translation
 */
function getRandomUntranslated(userId, language = null) {
  const db = getDatabase();
  
  // Build query with optional language filter
  let query = `SELECT tf.id as term_field_id, tf.field_uri, tf.field_term, tf.original_value,
            term.id as term_id, term.uri as term_uri
     FROM term_fields tf
     JOIN terms term ON tf.term_id = term.id
     WHERE (tf.field_term LIKE '%definition%' OR tf.field_term LIKE '%prefLabel%')`;
  
  const params = [];
  
  if (language) {
    query += ` AND tf.id NOT IN (
         SELECT term_field_id FROM translations WHERE language = ?
       )`;
    params.push(language);
  } else {
    query += ` AND tf.id NOT IN (
         SELECT term_field_id FROM translations WHERE language IN ('nl', 'fr', 'de', 'es', 'it', 'pt')
       )`;
  }
  
  query += ` ORDER BY RANDOM() LIMIT 1`;
  
  const untranslated = db.prepare(query).get(...params);
  
  if (!untranslated) {
    // Try to find fields with partial translations
    let partialQuery = `SELECT tf.id as term_field_id, tf.field_uri, tf.field_term, tf.original_value,
              term.id as term_id, term.uri as term_uri,
              (SELECT COUNT(*) FROM translations WHERE term_field_id = tf.id`;
    
    if (language) {
      partialQuery += ` AND language = ?`;
    }
    
    partialQuery += `) as translation_count
       FROM term_fields tf
       JOIN terms term ON tf.term_id = term.id
       WHERE (tf.field_term LIKE '%definition%' OR tf.field_term LIKE '%prefLabel%')
         AND (SELECT COUNT(*) FROM translations WHERE term_field_id = tf.id`;
    
    const partialParams = [];
    
    if (language) {
      partialQuery += ` AND language = ?`;
      partialParams.push(language);
      partialQuery += `) < 1`;
    } else {
      partialQuery += `) < 6`;
    }
    
    partialQuery += ` ORDER BY translation_count ASC, RANDOM() LIMIT 1`;
    
    const partiallyTranslated = db.prepare(partialQuery).get(...partialParams);
    
    if (!partiallyTranslated) {
      return null;
    }
    
    // Get all fields for this term for context
    const allFields = db.prepare(
      `SELECT field_uri, field_term, original_value 
       FROM term_fields 
       WHERE term_id = ?`
    ).all(partiallyTranslated.term_id);
    
    return {
      ...partiallyTranslated,
      term_fields: allFields,
    };
  }
  
  // Get all fields for this term for context
  const allFields = db.prepare(
    `SELECT field_uri, field_term, original_value 
     FROM term_fields 
     WHERE term_id = ?`
  ).all(untranslated.term_id);
  
  return {
    ...untranslated,
    term_fields: allFields,
  };
}

/**
 * Get the next task for the user (review or translate)
 * @param {string} userId - Username/ORCID
 * @param {string} language - Optional language filter
 * @returns {object} Next task object
 */
function getNextTask(userId, language = null) {
  // Priority 1: Pending reviews
  const review = getPendingReviews(userId, language);
  if (review) {
    return {
      type: 'review',
      task: review,
    };
  }
  
  // Priority 2: Untranslated terms
  const untranslated = getRandomUntranslated(userId, language);
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
    "UPDATE translations SET status = ?, reviewed_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(newStatus, userId, translationId);
  
  // Award points based on action
  const points = action === 'approve' ? 10 : 5;
  awardPoints(userId, points, `review_${action}`);
  
  // Update streak
  const streakInfo = updateStreak(userId);
  
  // Increment review count
  incrementReviewCount(userId);
  
  // Update challenge progress
  updateChallengeProgress(userId, 'review_10', 1);
  
  // Log activity
  try {
    db.prepare(
      "INSERT INTO user_activity (user, action, translation_id, extra) VALUES (?, ?, ?, ?)"
    ).run(userId, `translation_${action}d`, translationId, JSON.stringify({ sessionId }));
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
 * Submit a new translation
 * @param {object} params - Translation parameters
 * @returns {object} Result of submission
 */
function submitTranslation(params) {
  const { userId, termFieldId, language, value, sessionId } = params;
  const db = getDatabase();
  
  // Validate language
  const validLanguages = ['nl', 'fr', 'de', 'es', 'it', 'pt'];
  if (!validLanguages.includes(language)) {
    throw new Error(`Invalid language. Must be one of: ${validLanguages.join(', ')}`);
  }
  
  // Check if translation already exists
  const existing = db.prepare(
    "SELECT id FROM translations WHERE term_field_id = ? AND language = ?"
  ).get(termFieldId, language);
  
  let translationId;
  
  if (existing) {
    // Update existing translation
    db.prepare(
      `UPDATE translations 
       SET value = ?, status = 'review', modified_by = ?, modified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(value, userId, existing.id);
    translationId = existing.id;
  } else {
    // Create new translation
    const result = db.prepare(
      `INSERT INTO translations (term_field_id, language, value, status, created_by) 
       VALUES (?, ?, ?, 'review', ?)`
    ).run(termFieldId, language, value, userId);
    translationId = result.lastInsertRowid;
  }
  
  // Award points
  const points = 20;
  awardPoints(userId, points, 'translation_created');
  
  // Update streak
  const streakInfo = updateStreak(userId);
  
  // Increment translation count
  incrementTranslationCount(userId);
  
  // Update challenge progress
  updateChallengeProgress(userId, 'translate_5', 1);
  
  // Log activity
  try {
    db.prepare(
      "INSERT INTO user_activity (user, action, translation_id, extra) VALUES (?, ?, ?, ?)"
    ).run(userId, 'translation_created', translationId, JSON.stringify({ sessionId }));
  } catch (err) {
    console.log("Could not log activity:", err.message);
  }
  
  return {
    success: true,
    translationId,
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
  submitTranslation,
  getAvailableLanguages,
};
