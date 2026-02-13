import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type IssueLabel = 'aesthetics' | 'bug' | 'feature request';

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<IssueLabel>('bug');

  // Pre-populate name when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setName(user.name || user.username || '');
    } else {
      setName('');
    }
  }, [isAuthenticated, user]);

  const resetForm = () => {
    setDescription('');
    if (!isAuthenticated) {
      setName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct GitHub issue URL
    const owner = 'marine-term-translations';
    const repo = 'mtt-self-host-platform';
    
    // Sanitize name for URL (remove special characters that could break formatting)
    const sanitizedName = name.replace(/[[\]]/g, '');
    
    // Format issue title
    const title = `[${selectedLabel.toUpperCase()}] Issue reported by ${sanitizedName}`;
    
    // Format issue body
    const body = `**Reporter:** ${sanitizedName}

**Label:** ${selectedLabel}

**Description:**
${description}

---
*This issue was created via the Report Issue feature*`;
    
    // Encode URL parameters
    const params = new URLSearchParams({
      title,
      body,
      labels: selectedLabel
    });
    
    // Open GitHub issue page in new tab
    const githubUrl = `https://github.com/${owner}/${repo}/issues/new?${params.toString()}`;
    window.open(githubUrl, '_blank');
    
    // Close modal and reset form
    onClose();
    resetForm();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Report an Issue</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={24} className="text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Info Alert */}
            <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Please provide detailed information</p>
                <p>When reporting a bug, describe the steps to reproduce the issue and what you expected to happen. This helps us fix the problem faster.</p>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-marine-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Enter your name"
              />
            </div>

            {/* Label Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Issue Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLabel('aesthetics')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedLabel === 'aesthetics'
                      ? 'border-marine-600 bg-marine-50 dark:bg-marine-900/30 text-marine-700 dark:text-marine-300 font-semibold'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-marine-400'
                  }`}
                >
                  Aesthetics
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLabel('bug')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedLabel === 'bug'
                      ? 'border-marine-600 bg-marine-50 dark:bg-marine-900/30 text-marine-700 dark:text-marine-300 font-semibold'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-marine-400'
                  }`}
                >
                  Bug
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLabel('feature request')}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedLabel === 'feature request'
                      ? 'border-marine-600 bg-marine-50 dark:bg-marine-900/30 text-marine-700 dark:text-marine-300 font-semibold'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-marine-400'
                  }`}
                >
                  Feature Request
                </button>
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={6}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-marine-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
                placeholder="Describe the issue in detail. For bugs, include steps to reproduce..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
              >
                Submit Issue
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ReportIssueModal;
