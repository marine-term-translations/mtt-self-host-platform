/**
 * Utility functions for selecting labels in the user's preferred language
 */

export interface TranslationItem {
  language: string;
  value: string;
  status?: string;
}

export interface UserLanguagePreferences {
  nativeLanguage?: string;
  translationLanguages?: string[];
  preferredLanguages?: string[];
  visibleExtraLanguages?: string[];
}

/**
 * Build the language priority order from user preferences
 * @param preferences User's language preferences from API
 * @returns Array of language codes in priority order
 */
export function getLanguagePriority(preferences: UserLanguagePreferences | null | undefined): string[] {
  if (!preferences) {
    return ['en']; // Default to English
  }

  const priority: string[] = [];
  const seen = new Set<string>();

  // Add native language first if it exists
  if (preferences.nativeLanguage) {
    priority.push(preferences.nativeLanguage);
    seen.add(preferences.nativeLanguage);
  }

  // Add translation languages in order, avoiding duplicates
  if (preferences.translationLanguages && Array.isArray(preferences.translationLanguages)) {
    for (const lang of preferences.translationLanguages) {
      if (!seen.has(lang)) {
        priority.push(lang);
        seen.add(lang);
      }
    }
  }

  // Fallback: add common languages if not already included
  const commonLanguages = ['en', 'nl', 'fr', 'de', 'es', 'it', 'pt'];
  for (const lang of commonLanguages) {
    if (!seen.has(lang)) {
      priority.push(lang);
      seen.add(lang);
    }
  }

  return priority;
}

/**
 * Get the best available label for a term based on language priority
 * @param translations Array of translation objects with language and value
 * @param languagePriority Array of language codes in priority order
 * @param fallbackValue Fallback value if no translations found
 * @returns The best available label
 */
export function getPreferredLabel(
  translations: TranslationItem[] | undefined,
  languagePriority: string[] = ['en'],
  fallbackValue: string = 'Unknown'
): string {
  if (!translations || translations.length === 0) {
    return fallbackValue;
  }

  // Try each language in priority order
  for (const language of languagePriority) {
    const translation = translations.find(t => t.language === language && t.value);
    if (translation?.value) {
      return translation.value;
    }
  }

  // Return the first available translation, regardless of language
  const firstAvailable = translations.find(t => t.value);
  if (firstAvailable?.value) {
    return firstAvailable.value;
  }

  return fallbackValue;
}
