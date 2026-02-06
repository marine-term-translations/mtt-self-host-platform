// Custom hook to manage OpenRouter API key
import { useState, useEffect } from 'react';
import { backendApi } from '../services/api';
import { CONFIG } from '../config';

interface UseOpenRouterApiKeyResult {
  apiKey: string | null;
  hasApiKey: boolean;
  isLoading: boolean;
  error: Error | null;
  refreshApiKey: () => Promise<void>;
}

/**
 * Custom hook to fetch and cache the user's OpenRouter API key
 * Falls back to environment key if user hasn't configured their own
 */
export function useOpenRouterApiKey(): UseOpenRouterApiKeyResult {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadApiKey = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if user has configured their own API key
      const statusResponse = await backendApi.hasOpenRouterApiKey();
      
      if (statusResponse.hasApiKey) {
        // User has their own key, fetch it
        const keyResponse = await backendApi.getOpenRouterApiKey();
        setApiKey(keyResponse.apiKey);
        setHasApiKey(true);
      } else {
        // Fall back to environment key if available
        if (CONFIG.OPENROUTER_API_KEY) {
          setApiKey(CONFIG.OPENROUTER_API_KEY);
          setHasApiKey(true);
        } else {
          setApiKey(null);
          setHasApiKey(false);
        }
      }
    } catch (err) {
      console.error('Error loading OpenRouter API key:', err);
      setError(err instanceof Error ? err : new Error('Failed to load API key'));
      
      // Fall back to environment key on error
      if (CONFIG.OPENROUTER_API_KEY) {
        setApiKey(CONFIG.OPENROUTER_API_KEY);
        setHasApiKey(true);
      } else {
        setApiKey(null);
        setHasApiKey(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApiKey();
  }, []);

  return {
    apiKey,
    hasApiKey,
    isLoading,
    error,
    refreshApiKey: loadApiKey,
  };
}
