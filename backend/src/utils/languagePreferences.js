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
 * Helper function to select best translation based on user language preferences
 * @param {array} translations - Array of translation objects with language, value, status
 * @param {array} preferredLanguages - Array of preferred language codes
 * @returns {object|null} Best matching translation or null
 */
function selectBestTranslation(translations, preferredLanguages) {
  if (!translations || translations.length === 0) {
    return null;
  }
  
  // First try to find a translation in the preferred languages (prioritize 'original' status)
  for (const lang of preferredLanguages) {
    const original = translations.find(t => t.language === lang && t.status === 'original');
    if (original) return original;
    
    const translated = translations.find(t => t.language === lang && (t.status === 'translated' || t.status === 'merged'));
    if (translated) return translated;
  }
  
  // Fallback to any 'original' translation, preferring English
  const englishOriginal = translations.find(t => t.language === 'en' && t.status === 'original');
  if (englishOriginal) return englishOriginal;
  
  const anyOriginal = translations.find(t => t.status === 'original');
  if (anyOriginal) return anyOriginal;
  
  // Last resort - return first available translation
  return translations[0];
}

module.exports = {
  getUserLanguagePreferences,
  selectBestTranslation
};
