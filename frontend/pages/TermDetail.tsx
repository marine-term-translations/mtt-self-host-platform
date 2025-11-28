
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ApiTerm, ApiField, ApiUserActivity } from '../types';
import { backendApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, ExternalLink, Send, Lock, Globe, Info, AlignLeft, Tag, BookOpen, 
  CheckCircle, XCircle, Clock, History, AlertCircle, PlayCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const TermDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [term, setTerm] = useState<ApiTerm | null>(null);
  const [history, setHistory] = useState<ApiUserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State: field_id -> translation value
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  
  const [selectedLang, setSelectedLang] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openHistoryFieldId, setOpenHistoryFieldId] = useState<number | null>(null);

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

      // 3. Fetch History for this term
      try {
        // Fallback: If getTermHistory fails or returns empty, we might not show history.
        // We pass the numeric ID of the found term
        const termHistory = await backendApi.getTermHistory(foundApiTerm.id);
        setHistory(termHistory);
      } catch (err) {
        console.warn("Could not fetch term history", err);
      }

      // 4. Extract Meta Info
      const prefLabelField = foundApiTerm.fields.find(f => f.field_term === 'skos:prefLabel');
      const definitionField = foundApiTerm.fields.find(f => f.field_term === 'skos:definition');
      
      setDisplayLabel(prefLabelField?.original_value || 'Unknown Term');
      setDisplayDef(definitionField?.original_value || 'No definition available.');
      
      const collectionMatch = foundApiTerm.uri.match(/\/collection\/([^/]+)\//);
      setDisplayCategory(collectionMatch ? collectionMatch[1] : 'General');

      // 5. Fetch Permissions
      if (user?.username) {
          try {
              const teams = await backendApi.getUserTeams(user.username, 'marine-org');
              const userLangs = teams.map((t: any) => t.name || t);
              setAllowedLanguages(userLangs);
              
              if (userLangs.length > 0) {
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
  }, [id, user]);

  useEffect(() => {
    if (term && selectedLang) {
      const newValues: Record<number, string> = {};
      term.fields.forEach(field => {
        const existing = field.translations?.find(t => t.language.toLowerCase() === selectedLang.toLowerCase());
        newValues[field.id] = existing ? existing.value : '';
      });
      setFormValues(newValues);
    }
  }, [term, selectedLang]);

  const handleInputChange = (fieldId: number, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Helper to build payload and submit
  const submitUpdate = async (overrideStatus?: 'draft' | 'review' | 'approved' | 'rejected' | 'merged') => {
    if (!term || !user) return;
    setIsSubmitting(true);
    
    try {
        const updatedFields = term.fields.map(field => {
            const currentLangCode = selectedLang.toLowerCase();
            const newValue = formValues[field.id];
            
            // Existing translations minus current lang
            let translationsPayload = field.translations?.map(t => ({
                language: t.language.toLowerCase(),
                value: t.value,
                status: t.status || 'draft',
                created_by: t.created_by || 'unknown'
            })).filter(t => t.language !== currentLangCode) || [];

            // Add/Update current lang translation
            if (newValue && newValue.trim() !== '') {
                // Find previous translation to check if status should persist
                const prevTrans = field.translations?.find(t => t.language.toLowerCase() === currentLangCode);
                
                // Determine new status:
                // If override provided (e.g. "approved"), use it.
                // If no override, preserve existing status OR default to 'draft' if changed?
                // Usually editing resets to draft, unless user is admin. Let's keep logic simple:
                // If explicit action (overrideStatus), use that. Else 'draft'.
                
                let newStatus: 'draft' | 'review' | 'approved' | 'rejected' | 'merged' = overrideStatus || 'draft';
                if (!overrideStatus && prevTrans && prevTrans.status === 'approved') {
                    // If editing an approved translation, downgrade to draft?
                    // For now, let's assume editing always resets to draft for safety.
                    newStatus = 'draft';
                }

                translationsPayload.push({
                    language: currentLangCode,
                    value: newValue,
                    status: newStatus,
                    created_by: prevTrans?.created_by || user.username
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

        await backendApi.updateTerm(term.id, payload);
        toast.success(overrideStatus ? `Status updated to ${overrideStatus}` : "Translations saved");
        await fetchTermData();
        
    } catch (error) {
        console.error("Update failed", error);
        toast.error("Failed to save changes.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'review' | 'approved' | 'rejected' | 'merged') => {
    await submitUpdate(newStatus);
  };

  const toggleHistory = (fieldId: number) => {
    setOpenHistoryFieldId(openHistoryFieldId === fieldId ? null : fieldId);
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

  const parseExtra = (extra: string | null) => {
      try {
          return extra ? JSON.parse(extra) : {};
      } catch { return {}; }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/browse" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Browse
      </Link>

      <div className="mb-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-marine-100 dark:bg-marine-900 text-marine-700 dark:text-marine-300 mb-3">
            {displayCategory}
        </span>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{displayLabel}</h1>
        <a href={term.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-slate-400 hover:text-marine-600 transition-colors">
            {term.uri} <ExternalLink size={12} className="ml-1" />
        </a>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Context Column */}
        <div className="lg:col-span-1">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 sticky top-24">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
               <BookOpen size={16} /> Reference Definition
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-serif text-lg">
              {displayDef}
            </p>
          </div>
        </div>

        {/* Workspace Column */}
        <div className="lg:col-span-2 space-y-6">
           {/* Top Bar */}
           <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
               <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 <Globe size={20} className="text-marine-500" /> Translation Workspace
               </h2>
               <div className="flex items-center gap-2">
                   <span className="text-sm text-slate-500">Language:</span>
                   <select 
                      value={selectedLang} 
                      onChange={(e) => setSelectedLang(e.target.value)}
                      disabled={!canTranslate}
                      className="rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm py-1.5"
                    >
                      {allowedLanguages.length === 0 ? <option>No permissions</option> : allowedLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
               </div>
           </div>

           {/* Fields Loop */}
           {translatableFields.map(field => {
              const label = getFieldLabel(field.field_term);
              const isTextArea = field.field_term.includes('definition');
              const currentTranslation = field.translations?.find(t => t.language.toLowerCase() === selectedLang.toLowerCase());
              const status = currentTranslation?.status || 'draft';
              const isMyTranslation = currentTranslation?.created_by === user?.username;
              const hasValue = formValues[field.id] && formValues[field.id].trim().length > 0;
              
              // Filter history for this field
              const fieldHistory = history.filter(h => h.term_field_id === field.id);
              const isHistoryOpen = openHistoryFieldId === field.id;

              return (
                <div key={field.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                   
                   {/* Field Header */}
                   <div className="bg-slate-50 dark:bg-slate-900/40 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          {getFieldIcon(field.field_term)}
                          <span className="font-bold text-slate-700 dark:text-slate-200">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">EN</span>
                         <span className="text-xs text-slate-400">Original</span>
                      </div>
                   </div>

                   <div className="p-6">
                      {/* Original Value */}
                      <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 italic">
                         "{field.original_value}"
                      </div>

                      {/* Input Area */}
                      <div className="mb-4">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex justify-between">
                            <span>{selectedLang} Translation</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize
                               ${status === 'approved' ? 'bg-green-100 text-green-700' : 
                                 status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                 status === 'review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}
                            `}>
                               Status: {status}
                            </span>
                         </label>
                         
                         {isTextArea ? (
                             <textarea
                               rows={4}
                               className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 sm:text-sm"
                               value={formValues[field.id] || ''}
                               onChange={(e) => handleInputChange(field.id, e.target.value)}
                               disabled={!canTranslate}
                               placeholder="Enter translation..."
                             />
                         ) : (
                             <input
                               type="text"
                               className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 sm:text-sm"
                               value={formValues[field.id] || ''}
                               onChange={(e) => handleInputChange(field.id, e.target.value)}
                               disabled={!canTranslate}
                               placeholder="Enter translation..."
                             />
                         )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                          <button 
                             onClick={() => toggleHistory(field.id)}
                             className="text-xs text-slate-500 hover:text-marine-600 flex items-center gap-1 transition-colors"
                          >
                             <History size={14} /> {isHistoryOpen ? 'Hide' : 'View'} History
                          </button>

                          <div className="flex items-center gap-2">
                              {/* Workflow: Mark for Review (For Owners) */}
                              {status === 'draft' && isMyTranslation && hasValue && (
                                  <button
                                    onClick={() => handleStatusChange('review')}
                                    disabled={isSubmitting}
                                    className="flex items-center px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded text-xs font-medium transition-colors"
                                  >
                                    <Clock size={14} className="mr-1" /> Mark for Review
                                  </button>
                              )}

                              {/* Workflow: Review Actions (For Others) */}
                              {status === 'review' && !isMyTranslation && (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange('rejected')}
                                      disabled={isSubmitting}
                                      className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium transition-colors"
                                    >
                                      <XCircle size={14} className="mr-1" /> Reject
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange('approved')}
                                      disabled={isSubmitting}
                                      className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium transition-colors"
                                    >
                                      <CheckCircle size={14} className="mr-1" /> Approve
                                    </button>
                                  </>
                              )}

                              {/* Default Save Button */}
                              <button
                                 onClick={(e) => { e.preventDefault(); submitUpdate(); }} // Default save keeps draft
                                 disabled={isSubmitting || !canTranslate}
                                 className="flex items-center px-4 py-2 bg-marine-600 text-white hover:bg-marine-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                              >
                                 <Send size={14} className="mr-2" /> Save Draft
                              </button>
                          </div>
                      </div>

                      {/* Timeline Section */}
                      {isHistoryOpen && (
                          <div className="mt-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">
                                <History size={12} /> Timeline for this field
                             </h4>
                             {fieldHistory.length === 0 ? (
                                 <p className="text-xs text-slate-400 italic">No recorded history.</p>
                             ) : (
                                 <div className="relative border-l border-slate-200 dark:border-slate-700 ml-2 space-y-4 pl-4">
                                     {fieldHistory.map(h => {
                                         const extra = parseExtra(h.extra);
                                         // Filter history to relevant language if possible, otherwise show all
                                         // The API returns all history for term, so we should visually indicate language
                                         return (
                                           <div key={h.id} className="relative">
                                              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800"></div>
                                              <div className="text-xs">
                                                  <span className="font-bold text-slate-700 dark:text-slate-300">{h.user}</span>
                                                  <span className="text-slate-500 ml-1">{h.action.replace(/_/g, ' ')}</span>
                                              </div>
                                              {extra.value && (
                                                  <div className="text-xs text-slate-600 dark:text-slate-400 italic mt-0.5 bg-white dark:bg-slate-800 inline-block px-2 py-1 rounded border border-slate-100 dark:border-slate-700">
                                                      "{extra.value}" 
                                                      {extra.language && <span className="ml-1 not-italic font-bold text-marine-500 text-[10px] uppercase">({extra.language})</span>}
                                                  </div>
                                              )}
                                              <div className="text-[10px] text-slate-400 mt-1">{new Date(h.created_at).toLocaleDateString()}</div>
                                           </div>
                                         );
                                     })}
                                 </div>
                             )}
                          </div>
                      )}
                   </div>
                </div>
              );
           })}
        </div>
      </div>
    </div>
  );
};

export default TermDetail;
