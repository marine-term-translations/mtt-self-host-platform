
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ApiTerm, ApiField } from '../types';
import { backendApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ExternalLink, Send, Lock, Globe, Info, AlignLeft, Tag, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const TermDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // We use ApiTerm directly now to access specific fields
  const [term, setTerm] = useState<ApiTerm | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form State: field_id -> translation value
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  
  const [selectedLang, setSelectedLang] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived display values
  const [displayLabel, setDisplayLabel] = useState('Loading...');
  const [displayDef, setDisplayDef] = useState('Loading...');
  const [displayCategory, setDisplayCategory] = useState('General');

  const fetchTermData = async () => {
    setLoading(true);
    const decodedId = decodeURIComponent(id || '');
    console.log("Searching for term with URI:", decodedId);

    try {
      // 1. Fetch all terms from API
      const apiTerms = await backendApi.getTerms();
      
      // 2. Find matching term
      const foundApiTerm = apiTerms.find((t: ApiTerm) => t.uri === decodedId);
      
      if (!foundApiTerm) {
        console.error(`Term with URI "${decodedId}" not found in API response.`);
        toast.error("Term not found");
        setLoading(false);
        return;
      }

      setTerm(foundApiTerm);

      // 3. Extract Meta Info for Header/Context
      const prefLabelField = foundApiTerm.fields.find(f => f.field_term === 'skos:prefLabel');
      const definitionField = foundApiTerm.fields.find(f => f.field_term === 'skos:definition');
      
      setDisplayLabel(prefLabelField?.original_value || 'Unknown Term');
      setDisplayDef(definitionField?.original_value || 'No definition available.');
      
      const collectionMatch = foundApiTerm.uri.match(/\/collection\/([^/]+)\//);
      setDisplayCategory(collectionMatch ? collectionMatch[1] : 'General');

      // 4. Fetch User Teams for Permissions
      if (user?.username) {
          try {
              const teams = await backendApi.getUserTeams(user.username, 'marine-org');
              const userLangs = teams.map((t: any) => t.name || t);
              setAllowedLanguages(userLangs);
              
              if (userLangs.length > 0) {
                  // Only set default if not already set to avoid jumpiness on re-fetch
                  setSelectedLang(prev => prev || userLangs[0]);
              }
          } catch (teamError) {
              console.error("Failed to fetch user teams:", teamError);
              toast.error("Could not verify your translation permissions.");
          }
      }

    } catch (error) {
      console.error("Error fetching term details:", error);
      toast.error("Failed to load term details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
        fetchTermData();
    }
  }, [id, user, navigate]);

  // Effect: Populate form values when Language or Term changes
  useEffect(() => {
    if (term && selectedLang) {
      const newValues: Record<number, string> = {};
      
      term.fields.forEach(field => {
        // Find existing translation for this field in the selected language
        // Note: Comparing lowercase for safety as DB is strict lowercase
        const existing = field.translations?.find(t => t.language.toLowerCase() === selectedLang.toLowerCase());
        if (existing) {
          newValues[field.id] = existing.value;
        } else {
          newValues[field.id] = '';
        }
      });
      
      setFormValues(newValues);
    }
  }, [term, selectedLang]);

  const handleInputChange = (fieldId: number, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term || !user) return;
    
    setIsSubmitting(true);
    
    try {
        // Construct the full payload required by the backend.
        // We must include ALL fields and ALL translations, merging our new edits.
        
        const updatedFields = term.fields.map(field => {
            // 1. Start with existing translations
            let translationsPayload = field.translations?.map(t => ({
                language: t.language.toLowerCase(), // Ensure lowercase for DB 'nl','fr' etc
                value: t.value,
                status: t.status || 'draft',
                created_by: t.created_by || 'unknown'
            })) || [];

            // 2. Remove the translation for the CURRENT language from the list
            // (Because we are about to replace it with the form value)
            const currentLangCode = selectedLang.toLowerCase();
            translationsPayload = translationsPayload.filter(t => t.language !== currentLangCode);

            // 3. Add the new value from the form
            const newValue = formValues[field.id];
            
            // Only add if it has content. If empty, we effectively delete the translation for this language.
            if (newValue && newValue.trim() !== '') {
                translationsPayload.push({
                    language: currentLangCode,
                    value: newValue,
                    status: 'draft', // New edits generally revert to draft until reviewed
                    created_by: user.username
                });
            }

            return {
                field_uri: field.field_uri,
                field_term: field.field_term,
                original_value: field.original_value,
                translations: translationsPayload
            };
        });

        const payload = {
            uri: term.uri,
            fields: updatedFields,
            token: user.token,
            username: user.username
        };

        console.log("Submitting payload:", payload);

        await backendApi.updateTerm(term.id, payload);
        
        toast.success(`Saved translations for ${selectedLang}`);
        
        // Refresh data to reflect changes
        await fetchTermData();
        
    } catch (error) {
        console.error("Update failed", error);
        toast.error("Failed to save translations. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-8"></div>
        <div className="h-10 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
        <div className="h-20 w-full bg-slate-200 dark:bg-slate-700 rounded mb-8"></div>
      </div>
    );
  }

  if (!term) return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Term not found</h2>
        <Link to="/browse" className="text-marine-600 hover:underline mt-4 inline-block">Return to Browse</Link>
      </div>
  );

  const canTranslate = allowedLanguages.length > 0;
  
  // Filter fields we want to show for translation
  // We generally want prefLabel, altLabel, and definition
  const translatableFields = term.fields.filter(f => 
    f.original_value && 
    (f.field_term.includes('prefLabel') || f.field_term.includes('altLabel') || f.field_term.includes('definition'))
  );

  const getFieldIcon = (uri: string) => {
    if (uri.includes('prefLabel')) return <Tag size={16} className="text-blue-500" />;
    if (uri.includes('altLabel')) return <Tag size={16} className="text-amber-500" />;
    if (uri.includes('definition')) return <AlignLeft size={16} className="text-green-500" />;
    return <Globe size={16} />;
  };

  const getFieldLabel = (uri: string) => {
    if (uri.includes('prefLabel')) return 'Preferred Label';
    if (uri.includes('altLabel')) return 'Alternative Label';
    if (uri.includes('definition')) return 'Definition';
    return 'Other Field';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/browse" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Browse
      </Link>

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-marine-100 dark:bg-marine-900 text-marine-700 dark:text-marine-300 mb-3">
                  {displayCategory}
              </span>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{displayLabel}</h1>
              <a href={term.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-slate-400 hover:text-marine-600 transition-colors">
                  {term.uri} <ExternalLink size={12} className="ml-1" />
              </a>
            </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: Context / Definition (Sticky) */}
        <div className="lg:col-span-1">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 sticky top-24">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
               <BookOpen size={16} /> Reference Definition
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-serif text-lg">
              {displayDef}
            </p>
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              <p className="mb-2"><span className="font-semibold">Context:</span> Use this definition as the source of truth for your translations.</p>
              <p>Ensure that translated labels accurately reflect this concept.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Translation Workspace */}
        <div className="lg:col-span-2">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
             
             {/* Toolbar */}
             <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                   <h2 className="text-lg font-bold text-slate-900 dark:text-white">Translation Workspace</h2>
                   {!canTranslate && <Lock size={16} className="text-slate-400" />}
                </div>

                <div className="flex items-center gap-3">
                   <label className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">Target Language:</label>
                   <select 
                      value={selectedLang} 
                      onChange={(e) => setSelectedLang(e.target.value)}
                      disabled={!canTranslate}
                      className="rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 text-sm py-2"
                    >
                      {allowedLanguages.length === 0 ? (
                          <option>No permissions</option>
                      ) : (
                          allowedLanguages.map(lang => (
                              <option key={lang} value={lang}>{lang}</option>
                          ))
                      )}
                    </select>
                </div>
             </div>

             {/* Form */}
             <div className="p-6 relative">
                {!canTranslate && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-3">
                           <Lock className="text-slate-400" size={32} />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">Restricted Access</h4>
                        <p className="text-slate-600 dark:text-slate-300 mt-2 max-w-sm">
                            You must be a member of a language team to edit translations. Please contact an admin or check your profile.
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                  {translatableFields.map(field => {
                    const isTextArea = field.field_term.includes('definition');
                    const label = getFieldLabel(field.field_term);
                    
                    return (
                      <div key={field.id} className="bg-slate-50 dark:bg-slate-900/20 p-5 rounded-xl border border-slate-100 dark:border-slate-800">
                         {/* Original Field Info */}
                         <div className="flex items-center gap-2 mb-3">
                            {getFieldIcon(field.field_term)}
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
                            <span className="text-xs text-slate-400 uppercase tracking-wider ml-auto font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">EN</span>
                         </div>
                         
                         {/* Original Value Display */}
                         <div className="mb-4 text-slate-600 dark:text-slate-400 text-sm bg-white dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700/50 italic">
                            "{field.original_value}"
                         </div>

                         {/* Input Field */}
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                               {selectedLang} Translation
                            </label>
                            {isTextArea ? (
                               <textarea
                                 rows={4}
                                 className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 sm:text-sm"
                                 placeholder={`Enter ${label.toLowerCase()} translation...`}
                                 value={formValues[field.id] || ''}
                                 onChange={(e) => handleInputChange(field.id, e.target.value)}
                                 disabled={!canTranslate}
                               ></textarea>
                            ) : (
                               <input
                                 type="text"
                                 className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 sm:text-sm"
                                 placeholder={`Enter ${label.toLowerCase()} translation...`}
                                 value={formValues[field.id] || ''}
                                 onChange={(e) => handleInputChange(field.id, e.target.value)}
                                 disabled={!canTranslate}
                               />
                            )}
                         </div>
                      </div>
                    );
                  })}

                  <div className="pt-4 flex items-center justify-between">
                     <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Info size={14} />
                        Translations are auto-saved to your draft history.
                     </div>
                     <button
                        type="submit"
                        disabled={isSubmitting || !canTranslate}
                        className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-lg text-white bg-marine-600 hover:bg-marine-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marine-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                      >
                        <Send size={18} className="mr-2" />
                        {isSubmitting ? 'Submitting...' : 'Submit Translations'}
                      </button>
                  </div>
                </form>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TermDetail;
