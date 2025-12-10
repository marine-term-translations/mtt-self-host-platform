import React, { useState } from 'react';
import { CheckCircle, XCircle, Send, Globe } from 'lucide-react';

interface FlowTermCardProps {
  task: any;
  taskType: 'review' | 'translate';
  languages: Array<{ code: string; name: string }>;
  onSubmitReview: (action: 'approve' | 'reject') => void;
  onSubmitTranslation: (language: string, value: string) => void;
  isSubmitting: boolean;
}

const FlowTermCard: React.FC<FlowTermCardProps> = ({
  task,
  taskType,
  languages,
  onSubmitReview,
  onSubmitTranslation,
  isSubmitting,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]?.code || 'nl');
  const [translationValue, setTranslationValue] = useState('');

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

  // Extract term information from task
  const getTermField = (fieldTerm: string) => {
    if (!task.term_fields || !Array.isArray(task.term_fields)) return null;
    return task.term_fields.find((f: any) => 
      f.field_term && f.field_term.includes(fieldTerm)
    );
  };

  const prefLabel = getTermField('prefLabel')?.original_value || 'Unknown Term';
  const definition = getTermField('definition')?.original_value || 'No definition available';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-3xl mx-auto">
      {/* Task Type Badge */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          {taskType === 'review' ? (
            <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
              Review Task
            </div>
          ) : (
            <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium">
              Translation Task
            </div>
          )}
        </div>
        <Globe className="w-5 h-5 text-gray-400" />
      </div>

      {/* Term Information */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {prefLabel}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          {definition}
        </p>
      </div>

      {/* Original Text (for context) */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
          Original Field
        </div>
        <div className="text-gray-800 dark:text-white font-medium">
          {task.field_term || 'N/A'}: {task.original_value || 'N/A'}
        </div>
      </div>

      {/* Review Mode */}
      {taskType === 'review' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-xs text-blue-600 dark:text-blue-400 uppercase mb-1">
              Proposed Translation ({task.language?.toUpperCase()})
            </div>
            <div className="text-gray-800 dark:text-white font-medium text-lg">
              {task.value}
            </div>
            {task.created_by && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                By: {task.created_by}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onSubmitReview('approve')}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              Approve
            </button>
            <button
              onClick={() => onSubmitReview('reject')}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
            >
              <XCircle className="w-5 h-5" />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Translation Mode */}
      {taskType === 'translate' && (
        <form onSubmit={handleTranslationSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Translation
            </label>
            <textarea
              value={translationValue}
              onChange={(e) => setTranslationValue(e.target.value)}
              placeholder="Enter your translation..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !translationValue.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            <Send className="w-5 h-5" />
            Submit Translation
          </button>
        </form>
      )}

      {isSubmitting && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Submitting...</p>
        </div>
      )}
    </div>
  );
};

export default FlowTermCard;
