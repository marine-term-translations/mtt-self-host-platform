
// Helper to safely access env vars without crashing if import.meta.env is undefined
const getEnv = (key: string, defaultValue: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Fallback if import.meta is not supported
  }
  return defaultValue;
};

export const CONFIG = {
  API_URL: getEnv('VITE_API_URL', 'http://localhost:5000/api'),
  DOMAIN: getEnv('VITE_DOMAIN', 'localhost'),
  ROOT_URL: getEnv('VITE_ROOT_URL', 'http://localhost'),
  OPENROUTER_API_KEY: getEnv('OPENROUTER_API_KEY', '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'),
};
