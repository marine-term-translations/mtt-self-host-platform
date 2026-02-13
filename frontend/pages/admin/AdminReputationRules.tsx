import React, { useEffect, useState } from 'react';
import { ArrowLeft, Settings, Save, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { backendApi } from '../../services/api';
import toast from 'react-hot-toast';

interface ReputationRule {
  id: number;
  rule_name: string;
  rule_value: number;
  description: string;
  updated_at: string;
  updated_by_id: number | null;
}

interface PreviewUser {
  userId: number;
  username: string;
  currentReputation: number;
  projectedReputation: number;
  affectedEvents: number;
  reputationChange: number;
}

interface PreviewData {
  currentValue: number;
  newValue: number;
  delta: number;
  affectedUsers: PreviewUser[];
  totalUsersAffected?: number;
  message?: string;
}

const AdminReputationRules: React.FC = () => {
  const [rules, setRules] = useState<ReputationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedRules, setEditedRules] = useState<Record<string, number>>({});
  const [previewData, setPreviewData] = useState<Record<string, PreviewData>>({});
  const [previewingRule, setPreviewingRule] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await backendApi.getReputationRules();
      setRules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reputation rules');
      toast.error('Failed to load reputation rules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRuleChange = (ruleName: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setEditedRules(prev => ({ ...prev, [ruleName]: numValue }));
    }
  };

  const handleSaveRule = async (rule: ReputationRule) => {
    const newValue = editedRules[rule.rule_name];
    if (newValue === undefined || newValue === rule.rule_value) {
      return;
    }

    try {
      await backendApi.updateReputationRule(rule.rule_name, newValue);
      toast.success(`Updated ${rule.rule_name}`);
      
      // Update local state
      setRules(prev => prev.map(r => 
        r.rule_name === rule.rule_name ? { ...r, rule_value: newValue } : r
      ));
      
      // Clear edited state
      setEditedRules(prev => {
        const newEdited = { ...prev };
        delete newEdited[rule.rule_name];
        return newEdited;
      });
      
      // Clear preview if exists
      setPreviewData(prev => {
        const newPreview = { ...prev };
        delete newPreview[rule.rule_name];
        return newPreview;
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update rule');
    }
  };

  const handlePreviewRule = async (rule: ReputationRule) => {
    const newValue = editedRules[rule.rule_name];
    if (newValue === undefined || newValue === rule.rule_value) {
      toast.error('Please change the value first');
      return;
    }

    try {
      setPreviewingRule(rule.rule_name);
      const preview = await backendApi.previewRuleChange(rule.rule_name, newValue, 10);
      setPreviewData(prev => ({ ...prev, [rule.rule_name]: preview }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to preview rule change');
    } finally {
      setPreviewingRule(null);
    }
  };

  const getRuleDisplayName = (ruleName: string): string => {
    return ruleName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getRuleCategory = (ruleName: string): string => {
    if (ruleName.includes('TIER')) return 'Tier Thresholds';
    if (ruleName.includes('PENALTY')) return 'Penalties';
    if (ruleName.includes('LOOKBACK')) return 'System Parameters';
    return 'Rewards';
  };

  const categorizedRules = rules.reduce((acc, rule) => {
    const category = getRuleCategory(rule.rule_name);
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, ReputationRule[]>);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-marine-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/admin"
        className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to Admin Dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="text-marine-600" size={32} />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reputation Rules</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Configure reputation system parameters. Changes will affect future reputation calculations.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg mb-8">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Rule changes only affect future reputation events, not historical data</li>
              <li>Use the preview feature to see how changes would have affected existing users</li>
              <li>Tier thresholds and lookback days cannot be previewed easily</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(categorizedRules).map(([category, categoryRules]) => (
          <div key={category} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{category}</h2>
            </div>
            
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {categoryRules.map((rule) => {
                const currentValue = editedRules[rule.rule_name] ?? rule.rule_value;
                const hasChanges = editedRules[rule.rule_name] !== undefined && editedRules[rule.rule_name] !== rule.rule_value;
                const preview = previewData[rule.rule_name];

                return (
                  <div key={rule.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                          {getRuleDisplayName(rule.rule_name)}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{rule.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={currentValue}
                          onChange={(e) => handleRuleChange(rule.rule_name, e.target.value)}
                          className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center focus:ring-2 focus:ring-marine-500 focus:border-transparent"
                        />
                        
                        {hasChanges && (
                          <>
                            <button
                              onClick={() => handlePreviewRule(rule)}
                              disabled={previewingRule === rule.rule_name}
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              <Eye size={16} />
                              {previewingRule === rule.rule_name ? 'Loading...' : 'Preview'}
                            </button>
                            
                            <button
                              onClick={() => handleSaveRule(rule)}
                              className="px-4 py-2 bg-marine-600 text-white rounded-lg hover:bg-marine-700 transition-colors flex items-center gap-2"
                            >
                              <Save size={16} />
                              Save
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Preview Results */}
                    {preview && (
                      <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="text-teal-600" size={20} />
                          <h4 className="font-semibold text-slate-900 dark:text-white">Preview Results</h4>
                        </div>
                        
                        {preview.message ? (
                          <p className="text-sm text-slate-600 dark:text-slate-400">{preview.message}</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Current Value</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{preview.currentValue}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">New Value</p>
                                <p className="text-lg font-bold text-marine-600">{preview.newValue}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Users Affected</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{preview.totalUsersAffected || 0}</p>
                              </div>
                            </div>

                            {preview.affectedUsers && preview.affectedUsers.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                  Sample Impact (Top 10 Affected Users):
                                </p>
                                <div className="space-y-2">
                                  {preview.affectedUsers.map((user) => (
                                    <div
                                      key={user.userId}
                                      className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                                    >
                                      <div className="flex-1">
                                        <span className="font-medium text-slate-900 dark:text-white">{user.username}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                          ({user.affectedEvents} event{user.affectedEvents !== 1 ? 's' : ''})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                          {user.currentReputation} → {user.projectedReputation}
                                        </span>
                                        <span className={`text-sm font-semibold ${user.reputationChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {user.reputationChange >= 0 ? '+' : ''}{user.reputationChange}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReputationRules;
