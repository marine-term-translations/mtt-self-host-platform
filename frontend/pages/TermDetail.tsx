
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Term, ApiTerm } from '../types';
import { backendApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ExternalLink, Globe, Send, User, Lock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const TermDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [translationText, setTranslationText] = useState('');
  const [selectedLang, setSelectedLang] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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
          console.log("Available URIs:", apiTerms.map(t => t.uri));
          toast.error("Term not found");
          setLoading(false);
          return;
        }

        // 3. Map API data to UI model
        const prefLabelField = foundApiTerm.fields.find(f => f.field_term === 'skos:prefLabel');
        const definitionField = foundApiTerm.fields.find(f => f.field_term === 'skos:definition');
        
        const translations: Record<string, string | null> = {};
        
        // Flatten translations from all fields (mostly definition)
        foundApiTerm.fields.forEach(field => {
             if (field.translations) {
                 field.translations.forEach(t => {
                     if (t.language_code) {
                         translations[t.language_code] = t.translation_value;
                     }
                 });
             }
        });

        // Extract collection from URI (e.g. .../collection/P02/current/...)
        const collectionMatch = foundApiTerm.uri.match(/\/collection\/([^/]+)\//);
        const collectionName = collectionMatch ? collectionMatch[1] : 'General';

        const mappedTerm: Term = {
          id: foundApiTerm.uri,
          prefLabel: prefLabelField?.original_value || 'Unknown Term',
          definition: definitionField?.original_value || 'No definition available.',
          category: collectionName, 
          translations: translations,
          contributors: []
        };

        setTerm(mappedTerm);

        // 4. Fetch User Teams for Permissions
        if (user?.username) {
            try {
                // Fetch teams for the user in the organization
                const teams = await backendApi.getUserTeams(user.username, 'marine-org');
                
                // Assuming team names correspond to language codes (e.g., "NL", "FR", "ES")
                const userLangs = teams.map((t: any) => t.name || t);
                setAllowedLanguages(userLangs);
                
                if (userLangs.length > 0) {
                    setSelectedLang(userLangs[0]);
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

    if (id) {
        fetchTermData();
    }
  }, [id, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!translationText.trim()) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    setIsSubmitting(false);
    toast.success("Translation submitted for review!");
    setTranslationText("");
    
    // Optimistic Update
    if (term && selectedLang) {
        setTerm({
            ...term,
            translations: {
                ...term.translations,
                [selectedLang]: translationText
            }
        });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-8"></div>
        <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
        <div className="h-20 w-full bg-slate-200 dark:bg-slate-700 rounded mb-8"></div>
        <div className="h-64 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  if (!term) return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Term not found</h2>
        <Link to="/browse" className="text-marine-600 hover:underline mt-4 inline-block">Return to Browse</Link>
      </div>
  );

  const canTranslate = allowedLanguages.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/browse" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Browse
      </Link>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
             <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-marine-100 dark:bg-marine-900 text-marine-700 dark:text-marine-300 mb-3">
                    {term.category}
                </span>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{term.prefLabel}</h1>
             </div>
             <a href={term.id} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-marine-600 transition-colors" title="View Source URI">
                 <ExternalLink size={20} />
             </a>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Technical Definition</h3>
            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
              {term.definition}
            </p>
          </div>
        </div>

        {/* Translation Section */}
        <div className="p-8 bg-slate-50 dark:bg-slate-900/30">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Existing Translations */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <Globe size={18} className="mr-2 text-marine-500" /> Current Translations
              </h3>
              
              <div className="space-y-4">
                {Object.entries(term.translations).map(([lang, text]) => (
                  text ? (
                    <div key={lang} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-slate-400">
                            {lang}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{text}</p>
                    </div>
                  ) : null
                ))}
                
                {Object.values(term.translations).every(v => v === null) && (
                    <p className="text-slate-500 italic text-sm">No translations available yet.</p>
                )}
              </div>
            </div>

            {/* Contribute Form */}
            <div>
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <Send size={18} className="mr-2 text-marine-500" /> Contribute
              </h3>
              
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                
                {!canTranslate && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-center p-6 rounded-xl">
                        <Lock className="text-slate-400 mb-2" size={32} />
                        <h4 className="font-bold text-slate-800 dark:text-white">Restricted Access</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            You are not a member of any language translation teams. Please update your profile or contact an admin to join a team.
                        </p>
                    </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Language</label>
                  <select 
                    value={selectedLang} 
                    onChange={(e) => setSelectedLang(e.target.value)}
                    disabled={!canTranslate}
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 sm:text-sm"
                  >
                    {allowedLanguages.length === 0 ? (
                         <option>No authorized languages</option>
                    ) : (
                        allowedLanguages.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))
                    )}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Technical Translation</label>
                  <textarea
                    rows={4}
                    value={translationText}
                    onChange={(e) => setTranslationText(e.target.value)}
                    disabled={!canTranslate}
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 sm:text-sm"
                    placeholder="Enter an accurate technical translation..."
                    required
                  ></textarea>
                   <p className="mt-1 text-xs text-slate-500">Ensure strict adherence to scientific accuracy.</p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !canTranslate}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-marine-600 hover:bg-marine-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marine-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Translation'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Contributors */}
        <div className="px-8 py-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-sm text-slate-500">
           <User size={14} /> Contributors: {term.contributors.length > 0 ? term.contributors.join(', ') : 'None yet'}
        </div>
      </div>
    </div>
  );
};

export default TermDetail;
