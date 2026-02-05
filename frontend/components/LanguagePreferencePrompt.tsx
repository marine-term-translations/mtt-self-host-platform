import React from 'react';
import { AlertCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LanguagePreferencePromptProps {
  hasConfiguredLanguages: boolean;
  onDismiss?: () => void;
}

const LanguagePreferencePrompt: React.FC<LanguagePreferencePromptProps> = ({ 
  hasConfiguredLanguages, 
  onDismiss 
}) => {
  const [isDismissed, setIsDismissed] = React.useState(() => {
    // Check if user has dismissed this before
    return localStorage.getItem('lang-prompt-dismissed') === 'true';
  });

  if (hasConfiguredLanguages || isDismissed) {
    return null;
  }

  const handleDismissClick = () => {
    localStorage.setItem('lang-prompt-dismissed', 'true');
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500 rounded-r-lg p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
            Complete Your Profile Setup
          </h3>
          <p className="text-amber-800 dark:text-amber-200 mb-4 leading-relaxed">
            To get personalized translation recommendations and contribute effectively, 
            please configure your language preferences. This helps us show you terms that 
            match your linguistic skills.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link 
              to="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <Settings size={18} />
              Configure Languages Now
            </Link>
            <button
              onClick={handleDismissClick}
              className="px-4 py-2 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguagePreferencePrompt;
