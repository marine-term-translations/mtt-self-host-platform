import React, { useEffect, useState } from 'react';
import { backendApi } from '../../services/api';
import { Search, ArrowLeft, Loader2, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { parse, format } from '@/src/utils/datetime';

interface Translation {
  id: number;
  term_field_id: number;
  language: string;
  value: string;
  status: string;
  created_at: string;
  updated_at: string;
  field_name: string;
  term_id: number;
  uri: string;
  created_by_id: number;
  modified_by_id: number;
  reviewed_by_id: number;
  created_by_username: string;
  modified_by_username: string;
  reviewed_by_username: string;
}

const AdminTranslations: React.FC = () => {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [appealingId, setAppealingId] = useState<number | null>(null);
  const [appealReason, setAppealReason] = useState('');

  const [activeTab, setActiveTab] = useState<'all' | 'consensus'>('all');
  const [pendingConsensus, setPendingConsensus] = useState<any[]>([]);
  const [loadingConsensus, setLoadingConsensus] = useState(false);

  const statuses = ['draft', 'review', 'approved', 'rejected', 'merged'];
  const languages = ['nl', 'fr', 'de', 'es', 'it', 'pt'];

  const fetchTranslations = async () => {
    setLoading(true);
    try {
      const response = await backendApi.getAdminTranslations({
        status: statusFilter || undefined,
        language: languageFilter || undefined,
        page,
        limit: 50
      });
      setTranslations(response.translations);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      toast.error("Failed to fetch translations");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingConsensus = async () => {
    setLoadingConsensus(true);
    try {
      const response = await backendApi.getPendingConsensusReviews();
      setPendingConsensus(response.pending);
    } catch (error) {
      toast.error("Failed to fetch pending reviews");
    } finally {
      setLoadingConsensus(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'consensus') {
      fetchPendingConsensus();
    } else {
      fetchTranslations();
    }
  }, [page, statusFilter, languageFilter, activeTab]);

  const handleUpdateStatus = async (translationId: number, newStatus: string) => {
    try {
      await backendApi.updateTranslationStatus(translationId, newStatus);
      toast.success("Translation status updated");
      setEditingId(null);
      if (activeTab === 'consensus') {
        fetchPendingConsensus();
      } else {
        fetchTranslations();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleUpdateLanguage = async (translationId: number, newLanguage: string) => {
    try {
      await backendApi.updateTranslationLanguage(translationId, newLanguage);
      toast.success("Translation language updated");
      setEditingId(null);
      fetchTranslations();
    } catch (error: any) {
      toast.error(error.message || "Failed to update language");
    }
  };

  const startEditing = (translation: Translation) => {
    setEditingId(translation.id);
    setEditStatus(translation.status);
    setEditLanguage(translation.language);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditStatus('');
    setEditLanguage('');
  };

  const saveChanges = async (translationId: number, originalStatus: string, originalLanguage: string) => {
    if (editStatus !== originalStatus) {
      await handleUpdateStatus(translationId, editStatus);
    }
    if (editLanguage !== originalLanguage) {
      await handleUpdateLanguage(translationId, editLanguage);
    }
    if (editStatus === originalStatus && editLanguage === originalLanguage) {
      setEditingId(null);
    }
  };

  const handleAppeal = async (translationId: number) => {
    if (!appealReason.trim()) {
      toast.error("Please provide a reason for the appeal");
      return;
    }
    try {
      await backendApi.createAppealForTranslation(translationId, appealReason);
      toast.success("Appeal created successfully");
      setAppealingId(null);
      setAppealReason('');
      fetchTranslations();
    } catch (error: any) {
      toast.error(error.message || "Failed to create appeal");
    }
  };

  const filteredTranslations = translations.filter(t => 
    t.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.uri?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-800';
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'merged': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = {
      'nl': '🇳🇱',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'es': '🇪🇸',
      'it': '🇮🇹',
      'pt': '🇵🇹'
    };
    return flags[lang] || '🌐';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Translation Management</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage translation statuses and languages.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-marine-600 text-marine-600 dark:text-marine-400 dark:border-marine-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          All Translations
        </button>
        <button
          onClick={() => setActiveTab('consensus')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'consensus'
              ? 'border-marine-600 text-marine-600 dark:text-marine-400 dark:border-marine-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Pending Consensus Reviews
          {pendingConsensus.length > 0 && (
            <span className="bg-marine-100 text-marine-800 dark:bg-marine-900/50 dark:text-marine-300 text-xs px-2 py-0.5 rounded-full">
              {pendingConsensus.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters (All Translations) */}
      {activeTab === 'all' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-slate-400" size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search translations..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
              >
                <option value="">All Statuses</option>
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={languageFilter}
                onChange={(e) => {
                  setLanguageFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
              >
                <option value="">All Languages</option>
                {languages.map(l => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Translations Table (All Translations) */}
      {activeTab === 'all' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Language</th>
                      <th className="px-6 py-4">Original (Term Field)</th>
                      <th className="px-6 py-4">Translation</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Contributors</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                    {filteredTranslations.map(translation => (
                      <tr key={translation.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 font-medium flex items-center gap-1.5 whitespace-nowrap">
                          {editingId === translation.id ? (
                            <select
                              value={editLanguage}
                              onChange={(e) => setEditLanguage(e.target.value)}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            >
                              {languages.map(l => (
                                <option key={l} value={l}>{l.toUpperCase()}</option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <span className="text-base">{getLanguageFlag(translation.language)}</span>
                              <span className="font-mono text-xs uppercase">{translation.language}</span>
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-500 font-mono mb-1 truncate max-w-[150px]">{translation.field_uri}</div>
                          <div className="text-slate-800 dark:text-slate-200 max-w-xs truncate" title={translation.original_value}>
                            {translation.original_value}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate" title={translation.value}>
                          {translation.value}
                        </td>
                        <td className="px-6 py-4">
                          {editingId === translation.id ? (
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            >
                              {statuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(translation.status)}`}>
                              {translation.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs space-y-0.5">
                          {translation.created_by && (
                            <div>Creator: <span className="font-medium text-slate-700 dark:text-slate-300">{translation.created_by}</span></div>
                          )}
                          {translation.modified_by && (
                            <div>Modifier: <span className="font-medium text-slate-700 dark:text-slate-300">{translation.modified_by}</span></div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {editingId === translation.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveChanges(translation.id, translation.status, translation.language)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-3 font-medium">
                              <button
                                onClick={() => startEditing(translation)}
                                className="text-marine-600 hover:text-marine-900 dark:text-marine-400 dark:hover:text-marine-300"
                              >
                                Edit
                              </button>
                              {translation.status === 'review' && (
                                <button
                                  onClick={() => setAppealingId(translation.id)}
                                  className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                                >
                                  Appeal
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Consensus Reviews Table */}
      {activeTab === 'consensus' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loadingConsensus ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
            </div>
          ) : pendingConsensus.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No pending consensus reviews found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Translation</th>
                    <th className="px-6 py-4">Context & Language</th>
                    <th className="px-6 py-4">Consensus Status</th>
                    <th className="px-6 py-4">Voters Breakdown</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  {pendingConsensus.map(pc => {
                    const timeText = pc.daysRemaining <= 0
                      ? 'Expired (pending run)'
                      : `${pc.daysRemaining.toFixed(1)} days remaining`;

                    return (
                      <tr key={pc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white max-w-xs truncate" title={pc.value}>
                            {pc.value}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            By: <span className="font-medium text-slate-700 dark:text-slate-300">{pc.translator_username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{getLanguageFlag(pc.language)}</span>
                            <span className="font-mono text-xs uppercase">{pc.language}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 font-mono max-w-xs truncate" title={pc.uri}>
                            Field: {pc.field_uri}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-500">Net Score:</span>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                pc.netScore > 0 
                                  ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                                  : pc.netScore < 0 
                                    ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' 
                                    : 'bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400'
                              }`}>
                                {pc.netScore > 0 ? `+${pc.netScore}` : pc.netScore}
                              </span>
                              <span className="text-xs text-slate-400">/ {pc.threshold} needed</span>
                            </div>
                            <div className="text-xs text-slate-500">
                              Active translators: <span className="font-semibold">{pc.activeTranslators}</span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <span>🕒</span>
                              <span className={pc.daysRemaining <= 0.5 ? 'text-amber-600 font-semibold' : ''}>
                                {timeText}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {pc.reviews.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No reviews yet</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {pc.reviews.map((rev: any, idx: number) => (
                                <div 
                                  key={idx} 
                                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 border ${
                                    rev.action === 'approve' 
                                      ? 'bg-green-50/50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800/40 dark:text-green-300' 
                                      : 'bg-red-50/50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800/40 dark:text-red-300'
                                  }`}
                                  title={`${rev.username} (Rep: ${rev.reputation}, Vote weight: ${rev.weight})`}
                                >
                                  <span className="font-medium truncate max-w-[80px]">{rev.username}</span>
                                  <span className="opacity-60">({rev.action === 'approve' ? '👍' : '👎'} w{rev.weight})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateStatus(pc.id, 'approved')}
                              className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                            >
                              Approve Override
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(pc.id, 'rejected')}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                            >
                              Reject Override
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Appeal Dialog */}
      {appealingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Create Appeal</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Provide a reason for appealing this translation. This will create an appeal that can be reviewed.
            </p>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
              rows={4}
              placeholder="Reason for appeal..."
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setAppealingId(null);
                  setAppealReason('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAppeal(appealingId)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Create Appeal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTranslations;
