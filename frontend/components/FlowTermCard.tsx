
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Send, Globe, ExternalLink, Sparkles, Loader2, Quote, MessageSquare, Target, TrendingUp, Calendar } from 'lucide-react';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';
import { ApiCommunityGoal, ApiCommunityGoalProgress } from '../types';

interface FlowTermCardProps {
  task: any;
  taskType: 'review' | 'translate';
  languages: Array<{ code: string; name: string }>;
  onSubmitReview: (action: 'approve' | 'reject') => void;
  onSubmitTranslation: (language: string, value: string) => void;
  isSubmitting: boolean;
  relevantGoal?: { goal: ApiCommunityGoal; progress: ApiCommunityGoalProgress } | null;
}

const FlowTermCard: React.FC<FlowTermCardProps> = ({
  task,
  taskType,
  languages,
  onSubmitReview,
  onSubmitTranslation,
  isSubmitting,
  relevantGoal,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]?.code || 'nl');
  const [translationValue, setTranslationValue] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Update selected language if languages prop changes (e.g. from loading state)
  useEffect(() => {
    if (languages.length > 0 && !languages.find(l => l.code === selectedLanguage)) {
        setSelectedLanguage(languages[0].code);
    }
  }, [languages, selectedLanguage]);

  if (!task) {
    return null;
  }

  const handleTranslationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (translationValue.trim()) {
      onSubmitTranslation(selectedLanguage, translationValue.trim());
      setTranslationValue('');
    }
  };

  const handleAiSuggest = async () => {
    if (!selectedLanguage) {
      toast.error("Please select a target language first");
      return;
    }

    setAiLoading(true);

    try {
      const modelsResponse = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + CONFIG.OPENROUTER_API_KEY,
          "Content-Type": "application/json"
        }
      });

      if (!modelsResponse.ok) throw new Error("Failed to fetch models");

      const modelsData = await modelsResponse.json();
      const freeModels = modelsData.data.filter((m: any) => m.id.includes(":free"));

      if (freeModels.length === 0) throw new Error("No free models available");

      const prompt = `You are a professional marine scientist and translator.
Translate the following text into ${selectedLanguage}.
Keep the translation scientific, accurate, and natural.
Do not add explanations, only provide the translation.
Original Text (${task.field_uri || 'field'}): "${task.original_value}"`;

      let suggestion: string | null = null;
      
      for (const model of freeModels) {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + CONFIG.OPENROUTER_API_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: model.id,
              messages: [{ role: "user", content: prompt }]
            })
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content?.trim();
            if (content) {
              suggestion = content.replace(/^["']|["']$/g, '');
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (suggestion) {
        setTranslationValue(suggestion);
        toast.success("AI suggestion generated!");
      } else {
        toast.error("Could not generate a suggestion");
      }

    } catch (error) {
      console.error("AI Error:", error);
      toast.error("Failed to generate AI suggestion");
    } finally {
      setAiLoading(false);
    }
  };

  // Extract term information from task using field_role with fallback
  const getTermField = (fieldRole: string, fallbackFieldTerm?: string) => {
    if (!task.term_fields || !Array.isArray(task.term_fields)) return null;
    // First try to find by field_role
    const fieldByRole = task.term_fields.find((f: any) => f.field_role === fieldRole);
    if (fieldByRole) return fieldByRole;
    // Fallback to field_term if provided
    if (fallbackFieldTerm) {
      return task.term_fields.find((f: any) => 
        f.field_term && f.field_term.includes(fallbackFieldTerm)
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'translation_count':
        return 'Translation Goal';
      case 'collection':
        return 'Collection Goal';
      default:
        return 'Goal';
    }
  };

  const labelField = getTermField('label', 'prefLabel');
  const refField = getTermField('reference', 'definition');
  
  const prefLabel = labelField?.original_value || task.term_uri || task.uri || 'Unknown Term';
  const definition = refField?.original_value || prefLabel;
  
  // Try to find URI
  const termUri = task.term_uri || task.uri || null;

  return (
    <>
      {/* Community Goal Banner */}
      {relevantGoal && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Community Goal
                </h4>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                  {getGoalTypeLabel(relevantGoal.goal.goal_type)}
                </span>
                {relevantGoal.goal.target_language && (
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded uppercase">
                    {relevantGoal.goal.target_language}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                {relevantGoal.goal.title}
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    {relevantGoal.progress.current_count} / {relevantGoal.progress.target_count || '∞'}
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {relevantGoal.progress.progress_percentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      relevantGoal.progress.is_complete
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}
                    style={{ width: `${Math.min(relevantGoal.progress.progress_percentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Until {formatDate(relevantGoal.goal.end_date || relevantGoal.goal.start_date)}</span>
                </div>
                {relevantGoal.goal.is_recurring === 1 && relevantGoal.goal.recurrence_type && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className="capitalize">{relevantGoal.goal.recurrence_type}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
               {taskType === 'review' ? 'Review Task' : 'Translation Task'}
             </span>
             {taskType === 'review' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  Verify
                </span>
             ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Contribute
                </span>
             )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {prefLabel}
            {termUri && (
                <a 
                  href={termUri} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-slate-400 hover:text-marine-600 transition-colors"
                  title="View on NERC Vocabulary Server"
                >
                  <ExternalLink size={18} />
                </a>
            )}
          </h2>
        </div>
        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
             <Globe className="w-6 h-6 text-marine-500" />
        </div>
      </div>

      <div className="p-8">
        {/* Context: Definition */}
        <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Quote size={12} /> Context (Definition)
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed italic border-l-4 border-slate-200 dark:border-slate-700 pl-4 py-1">
                {definition}
            </p>
        </div>

        {/* Source Field */}
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-md bg-marine-100 dark:bg-marine-900/30 text-marine-700 dark:text-marine-300 text-xs font-mono font-bold border border-marine-200 dark:border-marine-800">
                    {task.field_uri?.split('/').pop()?.split('#').pop() || 'Unknown Field'}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Source Text to {taskType === 'review' ? 'Verify' : 'Translate'}
                </span>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-lg text-slate-800 dark:text-white font-medium leading-relaxed shadow-inner">
                {task.original_value || 'No content'}
            </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 my-8"></div>

        {/* Action Area */}
        {taskType === 'review' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex items-start gap-4">
                     <div className="flex-grow">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                             Proposed Translation ({task.language?.toUpperCase()})
                        </label>
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-lg text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5">
                             {task.value}
                        </div>
                        {task.created_by && (
                           <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                              <span>Submitted by</span>
                              <span className="font-medium text-slate-600 dark:text-slate-300">{task.created_by}</span>
                           </div>
                        )}
                     </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button
                        onClick={() => onSubmitReview('reject')}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-slate-800 border-2 border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        <XCircle className="w-5 h-5" />
                        Reject
                    </button>
                    <button
                        onClick={() => onSubmitReview('approve')}
                        disabled={isSubmitting}
                        className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Approve Translation
                    </button>
                </div>
            </div>
        )}

        {taskType === 'translate' && (
            <form onSubmit={handleTranslationSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Language Selection - Only show if multiple languages available */}
                {languages.length > 1 && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                             Target Language
                        </label>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 focus:border-marine-500 outline-none transition-shadow"
                            disabled={isSubmitting}
                        >
                            {languages.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Your Translation {languages.length === 1 && <span className="text-slate-500 font-normal">({languages[0].name})</span>}
                        </label>
                        <button
                            type="button"
                            onClick={handleAiSuggest}
                            disabled={aiLoading || isSubmitting}
                            className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
                         >
                            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            AI Suggest
                         </button>
                    </div>
                    <div className="relative">
                        <textarea
                            value={translationValue}
                            onChange={(e) => setTranslationValue(e.target.value)}
                            placeholder={`Enter ${languages.find(l => l.code === selectedLanguage)?.name || ''} translation...`}
                            rows={4}
                            className="w-full px-5 py-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 focus:border-marine-500 outline-none resize-none shadow-sm transition-shadow text-lg"
                            disabled={isSubmitting}
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !translationValue.trim()}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-marine-600 to-marine-500 hover:from-marine-700 hover:to-marine-600 text-white rounded-xl font-bold shadow-lg shadow-marine-500/20 transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                >
                    {isSubmitting ? (
                        <>
                           <Loader2 className="w-5 h-5 animate-spin" />
                           Submitting...
                        </>
                    ) : (
                        <>
                           <Send className="w-5 h-5" />
                           Submit Translation
                        </>
                    )}
                </button>
            </form>
        )}
      </div>
    </div>
    </>
  );
};

export default FlowTermCard;
