// Language preference utilities
// Shared helper functions for user language preferences and translation selection

/**
 * Helper function to get user language preferences
 * @param {object} db - Database connection
 * @param {number|null} userId - User ID if authenticated, null for anonymous
 * @returns {object} Object with preferredLanguages array
 */
function getUserLanguagePreferences(db, userId) {
  if (!userId) {
    // Anonymous user - prefer English original
    return { preferredLanguages: ['en'] };
  }
  
  // Check if user_preferences table exists (cache this check in production)
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'").get();
  
  if (tableExists) {
    const userPrefs = db.prepare('SELECT preferred_languages FROM user_preferences WHERE user_id = ?').get(userId);
    if (userPrefs) {
      try {
        return { preferredLanguages: JSON.parse(userPrefs.preferred_languages) };
      } catch (err) {
        console.error('[Language Preferences] Failed to parse preferred_languages:', err);
        // Fall through to default
      }
    }
  }
  
  // Fallback to English if no preferences set
  return { preferredLanguages: ['en'] };
}

/**
 * Helper function to get user's translation languages
 * Returns languages the user can translate into
 * @param {object} db - Database connection
 * @param {number|null} userId - User ID if authenticated, null for anonymous
 * @returns {array} Array of language codes user can translate into
 */
function getUserTranslationLanguages(db, userId) {
  if (!userId) {
    // Anonymous user cannot translate
    return [];
  }
  
  // First check user extra field for legacy translationLanguages
  const user = db.prepare('SELECT extra FROM users WHERE id = ?').get(userId);
  if (user && user.extra) {
    try {
      const extra = JSON.parse(user.extra);
      if (extra.translationLanguages && Array.isArray(extra.translationLanguages)) {
        return extra.translationLanguages;
      }
    } catch (err) {
      console.error('[Language Preferences] Failed to parse user extra:', err);
    }
  }
  
  // Fallback to empty array if no translation languages configured
  return [];
}

/**
 * Helper function to select best translation based on user language preferences
 * Only considers translations with status 'original' or 'merged'
 * @param {array} translations - Array of translation objects with language, value, status
 * @param {array} preferredLanguages - Array of preferred language codes
 * @returns {object|null} Best matching translation or null
 */
function selectBestTranslation(translations, preferredLanguages) {
  if (!translations || translations.length === 0) {
    return null;
  }
  
  // Filter to only show 'original' and 'merged' status translations
  const displayableTranslations = translations.filter(t => 
    t.status === 'original' || t.status === 'merged'
  );
  
  if (displayableTranslations.length === 0) {
    return null;
  }
  
  // Define priority for displayable statuses (higher number = higher priority)
  const statusPriority = {
    'original': 100,  // Original from RDF ingestion - highest priority
    'merged': 80      // Merged translation
  };
  
  // First try to find translations in the preferred languages
  for (const lang of preferredLanguages) {
    const langTranslations = displayableTranslations.filter(t => t.language === lang);
    if (langTranslations.length > 0) {
      // Sort by status priority and return the best one (create copy to avoid mutation)
      const best = [...langTranslations].sort((a, b) => 
        (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0)
      )[0];
      return best;
    }
  }
  
  // Fallback to any 'original' translation, preferring English
  const englishOriginal = displayableTranslations.find(t => t.language === 'en' && t.status === 'original');
  if (englishOriginal) return englishOriginal;
  
  const anyOriginal = displayableTranslations.find(t => t.status === 'original');
  if (anyOriginal) return anyOriginal;
  
  // Last resort - return highest priority translation regardless of language (create copy to avoid mutation)
  const sorted = [...displayableTranslations].sort((a, b) => 
    (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0)
  );
  return sorted[0];
}

module.exports = {
  getUserLanguagePreferences,
  getUserTranslationLanguages,
  selectBestTranslation
};
