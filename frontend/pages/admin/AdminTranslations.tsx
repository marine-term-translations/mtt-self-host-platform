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

  useEffect(() => {
    fetchTranslations();
  }, [page, statusFilter, languageFilter]);

  const handleUpdateStatus = async (translationId: number, newStatus: string) => {
    try {
      await backendApi.updateTranslationStatus(translationId, newStatus);
      toast.success("Translation status updated");
      setEditingId(null);
      fetchTranslations();
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

      {/* Filters */}
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
                <option key={l} value={l}>{getLanguageFlag(l)} {l.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-marine-500" size={32} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Translation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Term</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Modified By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Language</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Updated</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredTranslations.map((translation) => (
                    <tr key={translation.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        #{translation.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 dark:text-white max-w-md truncate">
                          {translation.value}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {translation.field_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {translation.uri ? (
                          <Link 
                            to={`/term/${encodeURIComponent(translation.uri)}`}
                            className="text-sm text-marine-600 hover:text-marine-800 dark:text-marine-400 dark:hover:text-marine-300 underline"
                          >
                            View Term
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {translation.modified_by_username ? (
                          <Link
                            to={`/user/${translation.modified_by_id}`}
                            className="text-sm text-marine-600 hover:text-marine-800 dark:text-marine-400 dark:hover:text-marine-300 underline"
                          >
                            {translation.modified_by_username}
                          </Link>
                        ) : translation.created_by_username ? (
                          <Link
                            to={`/user/${translation.created_by_id}`}
                            className="text-sm text-marine-600 hover:text-marine-800 dark:text-marine-400 dark:hover:text-marine-300 underline"
                          >
                            {translation.created_by_username}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === translation.id ? (
                          <select
                            value={editLanguage}
                            onChange={(e) => setEditLanguage(e.target.value)}
                            className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {languages.map(l => (
                              <option key={l} value={l}>{getLanguageFlag(l)} {l.toUpperCase()}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm">
                            {getLanguageFlag(translation.language)} {translation.language.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === translation.id ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {statuses.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(translation.status)}`}>
                            {translation.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {format(parse(translation.updated_at), 'YYYY-MM-DD')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingId === translation.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveChanges(translation.id, translation.status, translation.language)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
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
