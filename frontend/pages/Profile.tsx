import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Globe, Save, CheckCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONFIG } from '../config';

interface UserPreferences {
  nativeLanguage?: string;
  translationLanguages?: string[];
}

interface Language {
  code: string;
  name: string;
  native_name: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [nativeLanguage, setNativeLanguage] = useState<string>('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load available languages from API
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await fetch(`${CONFIG.API_URL}/languages`);
        if (response.ok) {
          const languages = await response.json();
          setAvailableLanguages(languages);
        } else {
          console.error('Failed to load languages from API');
          // Keep empty array if API fails
        }
      } catch (error) {
        console.error('Failed to load languages:', error);
        // Keep empty array if API fails
      } finally {
        setIsLoadingLanguages(false);
      }
    };

    loadLanguages();
  }, []);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch(`${CONFIG.API_URL}/user/preferences`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.nativeLanguage) {
            setNativeLanguage(data.nativeLanguage);
          }
          if (data.translationLanguages && Array.isArray(data.translationLanguages)) {
            setSelectedLanguages(data.translationLanguages);
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  const handleLanguageToggle = (langCode: string) => {
    setSelectedLanguages(prev => {
      const newSelection = prev.includes(langCode)
        ? prev.filter(l => l !== langCode)
        : [...prev, langCode];
      setHasUnsavedChanges(true);
      return newSelection;
    });
  };

  const handleNativeLanguageChange = (langCode: string) => {
    setNativeLanguage(langCode);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${CONFIG.API_URL}/user/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          nativeLanguage,
          translationLanguages: selectedLanguages
        })
      });

      if (response.ok) {
        toast.success('Preferences saved successfully!');
        setHasUnsavedChanges(false);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 mb-6">
        <div className="flex items-center gap-6">
          <img 
            src={user?.avatar} 
            alt="Profile" 
            className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-700 shadow-lg"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{user?.name}</h1>
              {user?.isAdmin && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  <Shield size={14} />
                  Admin
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-1">@{user?.username}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">ORCID iD: {user?.username}</p>
          </div>
        </div>
      </div>

      {/* Language Preferences */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-marine-100 dark:bg-marine-900/30 rounded-lg">
            <Globe className="text-marine-600 dark:text-marine-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Language Preferences</h2>
            <p className="text-slate-600 dark:text-slate-400">Set your native language and translation preferences</p>
          </div>
        </div>

        {/* Native Language Selection */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Native Language
          </label>
          <select
            value={nativeLanguage}
            onChange={(e) => handleNativeLanguageChange(e.target.value)}
            disabled={isLoadingLanguages}
            className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-marine-500 focus:border-marine-500 text-slate-900 dark:text-white disabled:opacity-50"
          >
            <option value="">
              {isLoadingLanguages ? 'Loading languages...' : 'Select your native language...'}
            </option>
            {availableLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.native_name})
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your native language helps us provide better translation suggestions.
          </p>
        </div>

        {/* Translation Languages Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            I can translate to these languages
          </label>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Select all languages you're comfortable translating marine terminology into.
          </p>
          
          {isLoadingLanguages ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading languages...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableLanguages.map(lang => (
                <label
                  key={lang.code}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedLanguages.includes(lang.code)
                      ? 'border-marine-500 bg-marine-50 dark:bg-marine-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(lang.code)}
                    onChange={() => handleLanguageToggle(lang.code)}
                    className="w-5 h-5 text-marine-600 rounded focus:ring-marine-500"
                  />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {lang.name} ({lang.native_name})
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex items-center justify-between">
          {hasUnsavedChanges && (
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              You have unsaved changes
            </p>
          )}
          <div className="ml-auto">
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                isSaving || !hasUnsavedChanges
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-marine-600 hover:bg-marine-700 text-white shadow-sm hover:shadow active:scale-95'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
