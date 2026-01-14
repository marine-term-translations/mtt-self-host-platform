
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
    console.warn('import.meta.env is not supported in this environment.');
  }
  return defaultValue;
};

function reverse(s){
    return s.split("").reverse().join("");
}


export const CONFIG = {
  API_URL: getEnv('VITE_API_URL', 'http://localhost:5000/api'),
  DOMAIN: getEnv('VITE_DOMAIN', 'localhost'),
  ROOT_URL: getEnv('VITE_ROOT_URL', 'http://localhost'),
  OPENROUTER_API_KEY: getEnv('VITE_OPENROUTER_API_KEY', ""),
};