
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Globe, Save, Shield, Settings as SettingsIcon, Plus, X, ChevronUp, ChevronDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONFIG } from '../config';

interface UserPreferences {
  nativeLanguage?: string;
  translationLanguages?: string[];
  preferredLanguages?: string[];
}

interface Language {
  code: string;
  name: string;
  native_name: string;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [orderedLanguages, setOrderedLanguages] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
          // Build ordered languages from preferredLanguages or fallback to legacy format
          const languages: string[] = [];
          
          if (data.preferredLanguages && Array.isArray(data.preferredLanguages) && data.preferredLanguages.length > 0) {
            // Use new preferred languages format (already ordered)
            languages.push(...data.preferredLanguages);
          } else {
            // Fallback to legacy format: native language first, then translation languages
            if (data.nativeLanguage) {
              languages.push(data.nativeLanguage);
            }
            if (data.translationLanguages && Array.isArray(data.translationLanguages)) {
              // Add translation languages that aren't already in the list
              data.translationLanguages.forEach((lang: string) => {
                if (!languages.includes(lang)) {
                  languages.push(lang);
                }
              });
            }
          }
          
          setOrderedLanguages(languages);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  const handleAddLanguage = (langCode: string) => {
    if (!orderedLanguages.includes(langCode)) {
      setOrderedLanguages([...orderedLanguages, langCode]);
      setHasUnsavedChanges(true);
      setShowAddLanguageModal(false);
      setSearchQuery('');
    }
  };

  const handleRemoveLanguage = (langCode: string) => {
    setOrderedLanguages(orderedLanguages.filter(l => l !== langCode));
    setHasUnsavedChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...orderedLanguages];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setOrderedLanguages(newOrder);
      setHasUnsavedChanges(true);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < orderedLanguages.length - 1) {
      const newOrder = [...orderedLanguages];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setOrderedLanguages(newOrder);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // First language is native, rest are translation languages
      const nativeLanguage = orderedLanguages[0] || '';
      const translationLanguages = orderedLanguages.slice(1);
      
      const response = await fetch(`${CONFIG.API_URL}/user/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          nativeLanguage,
          translationLanguages,
          preferredLanguages: orderedLanguages // Send the full ordered list
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

  const getLanguageName = (code: string) => {
    const lang = availableLanguages.find(l => l.code === code);
    return lang ? `${lang.name} (${lang.native_name})` : code;
  };

  // Filter available languages for the add modal
  const filteredLanguages = availableLanguages.filter(lang => 
    !orderedLanguages.includes(lang.code) && 
    (lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     lang.native_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     lang.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Language Preferences</h2>
            <p className="text-slate-600 dark:text-slate-400">
              The first language is your native language, and the rest are your translation preferences in order
            </p>
          </div>
        </div>

        {/* Ordered Languages List */}
        <div className="mb-6">
          {isLoadingLanguages ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading languages...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {orderedLanguages.map((langCode, index) => (
                <div
                  key={langCode}
                  className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <ChevronUp size={16} className="text-slate-600 dark:text-slate-300" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === orderedLanguages.length - 1}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <ChevronDown size={16} className="text-slate-600 dark:text-slate-300" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {getLanguageName(langCode)}
                      </span>
                      {index === 0 && (
                        <span className="text-xs px-2 py-1 bg-marine-100 dark:bg-marine-900/30 text-marine-700 dark:text-marine-300 rounded-full font-semibold">
                          Native
                        </span>
                      )}
                      {index > 0 && (
                        <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-full">
                          Preference #{index}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveLanguage(langCode)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                    title="Remove language"
                  >
                    <X size={18} className="text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
                  </button>
                </div>
              ))}

              {/* Add Language Button */}
              <button
                onClick={() => setShowAddLanguageModal(true)}
                disabled={isLoadingLanguages}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-marine-500 dark:hover:border-marine-400 hover:bg-marine-50 dark:hover:bg-marine-900/10 transition-all text-slate-600 dark:text-slate-400 hover:text-marine-600 dark:hover:text-marine-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                <span className="font-medium">Add Language</span>
              </button>
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

      {/* Add Language Modal */}
      {showAddLanguageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddLanguageModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Add Language</h3>
                <button
                  onClick={() => setShowAddLanguageModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={24} className="text-slate-500" />
                </button>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search languages..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-marine-500 focus:border-marine-500 text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>
            </div>

            {/* Language List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {filteredLanguages.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    {searchQuery ? 'No languages found matching your search.' : 'All available languages have been added.'}
                  </p>
                ) : (
                  filteredLanguages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleAddLanguage(lang.code)}
                      className="w-full text-left p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-marine-500 hover:bg-marine-50 dark:hover:bg-marine-900/20 transition-all"
                    >
                      <div className="font-medium text-slate-900 dark:text-white">
                        {lang.name} ({lang.native_name})
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Code: {lang.code}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
