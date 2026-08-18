export function getPreferredNonEnglishLanguage(user: any, fallbackLang?: string): string {
  if (!user) {
    if (fallbackLang && fallbackLang !== 'all' && fallbackLang.toLowerCase() !== 'en') {
      return fallbackLang;
    }
    return 'nl';
  }

  const prefs = user?.languagePreferences;
  const candidateList = [
    prefs?.nativeLanguage,
    ...(prefs?.translationLanguages || []),
    ...(user?.preferredLanguages || []),
    user?.nativeLanguage,
    user?.preferred_language,
    fallbackLang
  ];

  const found = candidateList.find(
    (lang): lang is string => typeof lang === 'string' && lang.trim().length > 0 && lang.toLowerCase() !== 'en' && lang.toLowerCase() !== 'all'
  );

  return found || 'nl';
}
