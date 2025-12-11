
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Globe, Save, Shield, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONFIG } from '../config';

interface UserPreferences {
  nativeLanguage?: string;
  translationLanguages?: string[];
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'cs', name: 'Czech (Čeština)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
  { code: 'da', name: 'Danish (Dansk)' },
  { code: 'no', name: 'Norwegian (Norsk)' },
  { code: 'fi', name: 'Finnish (Suomi)' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'ro', name: 'Romanian (Română)' },
  { code: 'bg', name: 'Bulgarian (Български)' },
  { code: 'hr', name: 'Croatian (Hrvatski)' },
  { code: 'sk', name: 'Slovak (Slovenčina)' },
  { code: 'sl', name: 'Slovenian (Slovenščina)' },
  { code: 'et', name: 'Estonian (Eesti)' },
  { code: 'lv', name: 'Latvian (Latviešu)' },
  { code: 'lt', name: 'Lithuanian (Lietuvių)' },
  { code: 'mt', name: 'Maltese (Malti)' },
  { code: 'ga', name: 'Irish (Gaeilge)' },
];

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [nativeLanguage, setNativeLanguage] = useState<string>('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
      {/* Settings Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <SettingsIcon size={32} className="text-slate-500" />
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage your account preferences and translation settings.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 mb-6">
        <div className="flex items-center gap-6">
          <img 
            src={user?.avatar} 
            alt="Profile" 
            className="w-16 h-16 rounded-full border-2 border-slate-200 dark:border-slate-700"
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span>@{user?.username}</span>
              <span>•</span>
              <span>ORCID iD: {user?.username}</span>
            </div>
          </div>
          {user?.isAdmin && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <Shield size={14} />
              Admin
            </span>
          )}
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
            className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-marine-500 focus:border-marine-500 text-slate-900 dark:text-white"
          >
            <option value="">Select your native language...</option>
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LANGUAGES.map(lang => (
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
                  {lang.name}
                </span>
              </label>
            ))}
          </div>
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

export default Settings;
