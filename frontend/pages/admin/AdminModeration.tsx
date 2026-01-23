import React, { useEffect, useState } from 'react';
import { backendApi } from '../../services/api';
import { ApiAppeal } from '../../types';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle, ExternalLink, MessageSquare, Flag, Ban, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { parse, format } from '@/src/utils/datetime';

interface AppealMessage {
  id: number;
  appeal_id: number;
  author_id: number;
  message: string;
  created_at: string;
  author_username: string;
  report_count: number;
  pending_reports: number;
}

interface MessageReport {
  id: number;
  appeal_message_id: number;
  reported_by_id: number;
  reason: string;
  status: string;
  reviewed_by_id: number | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reported_by_username: string;
  reviewed_by_username: string | null;
  message: string;
  message_author_id: number;
  message_author_username: string;
  appeal_id: number;
}

const AdminModeration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appeals' | 'reports'>('appeals');
  const [appeals, setAppeals] = useState<ApiAppeal[]>([]);
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<number | null>(null);
  const [appealMessages, setAppealMessages] = useState<AppealMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingReport, setReviewingReport] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [penalizingUser, setPenalizingUser] = useState<number | null>(null);
  const [penaltyAction, setPenaltyAction] = useState<'reputation_penalty' | 'ban'>('reputation_penalty');
  const [penaltyAmount, setPenaltyAmount] = useState(10);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'appeals') {
        const appealsData = await backendApi.getAppeals();
        setAppeals(appealsData.filter(a => a.status === 'open' || a.status === 'resolved'));
      } else {
        const reportsData = await backendApi.getModerationReports();
        setReports(reportsData);
      }
    } catch (error) {
      toast.error("Failed to fetch moderation data");
    } finally {
      setLoading(false);
    }
  };

  const loadAppealMessages = async (appealId: number) => {
    try {
      const messages = await backendApi.getAppealMessagesForModeration(appealId);
      setAppealMessages(messages);
      setSelectedAppeal(appealId);
    } catch (error) {
      toast.error("Failed to load appeal messages");
    }
  };

  const handleReviewReport = async (reportId: number, status: string) => {
    try {
      await backendApi.reviewReport(reportId, status, reviewNotes);
      toast.success("Report reviewed successfully");
      setReviewingReport(null);
      setReviewNotes('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to review report");
    }
  };

  const handleApplyPenalty = async (userId: number) => {
    try {
      await backendApi.applyUserPenalty(
        userId,
        penaltyAction,
        penaltyAction === 'reputation_penalty' ? penaltyAmount : undefined,
        penaltyAction === 'ban' ? banReason : undefined,
        'Moderation action'
      );
      toast.success(penaltyAction === 'ban' ? "User banned successfully" : "Penalty applied successfully");
      setPenalizingUser(null);
      setPenaltyAmount(10);
      setBanReason('');
    } catch (error: any) {
      toast.error(error.message || "Failed to apply penalty");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="text-amber-500" /> Moderation Queue
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Review appeals, reported messages, and take moderation actions.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('appeals')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'appeals'
              ? 'border-marine-600 text-marine-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <MessageSquare size={16} className="inline mr-2" />
          Appeals & Messages
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'reports'
              ? 'border-marine-600 text-marine-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Flag size={16} className="inline mr-2" />
          Reported Messages ({reports.filter(r => r.status === 'pending').length})
        </button>
      </div>

      {/* Appeals Tab */}
      {activeTab === 'appeals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appeals List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Open Appeals</h2>
            </div>
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-marine-500" size={32} />
              </div>
            ) : appeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <CheckCircle size={48} className="text-green-500 mb-4" />
                <p>No pending appeals</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                {appeals.map(appeal => (
                  <div
                    key={appeal.id}
                    onClick={() => loadAppealMessages(appeal.id)}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                      selectedAppeal === appeal.id ? 'bg-marine-50 dark:bg-marine-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        appeal.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {appeal.status}
                      </span>
                      <span className="text-slate-500 text-sm">Appeal #{appeal.id}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic truncate">
                      "{appeal.resolution}"
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      By {appeal.opened_by} • {format(parse(appeal.opened_at), 'YYYY-MM-DD')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {selectedAppeal ? `Messages for Appeal #${selectedAppeal}` : 'Select an appeal'}
              </h2>
            </div>
            {selectedAppeal ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                {appealMessages.map(msg => (
                  <div key={msg.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {msg.author_username}
                        </span>
                        {msg.pending_reports > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                            {msg.pending_reports} report(s)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(parse(msg.created_at), 'YYYY-MM-DD HH:mm')}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{msg.message}</p>
                    {msg.report_count > 0 && (
                      <p className="text-xs text-amber-600 mt-2">
                        Total reports: {msg.report_count}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <p>Select an appeal to view messages</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin text-marine-500" size={32} />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <CheckCircle size={48} className="text-green-500 mb-4" />
              <p>No reported messages</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {reports.map(report => (
                <div key={report.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        report.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        report.status === 'action_taken' ? 'bg-red-100 text-red-800' :
                        report.status === 'dismissed' ? 'bg-slate-100 text-slate-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {report.status}
                      </span>
                      <p className="text-sm text-slate-500 mt-1">
                        Report #{report.id} • Appeal #{report.appeal_id}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500">
                      {format(parse(report.created_at), 'YYYY-MM-DD HH:mm')}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded mb-3">
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                      <span className="font-semibold">{report.message_author_username}:</span> {report.message}
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">Reported by:</span> {report.reported_by_username}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">Reason:</span> {report.reason}
                    </p>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => setPenalizingUser(report.message_author_id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        <Ban size={14} className="inline mr-1" /> Take Action
                      </button>
                      <button
                        onClick={() => setReviewingReport(report.id)}
                        className="px-3 py-1 bg-marine-600 text-white rounded hover:bg-marine-700 text-sm"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => handleReviewReport(report.id, 'dismissed')}
                        className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {report.admin_notes && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">Admin notes:</span> {report.admin_notes}
                      </p>
                      {report.reviewed_by_username && (
                        <p className="text-xs text-slate-500 mt-1">
                          Reviewed by {report.reviewed_by_username}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Dialog */}
      {reviewingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Review Report</h3>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
              rows={4}
              placeholder="Admin notes (optional)..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setReviewingReport(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewReport(reviewingReport, 'reviewed')}
                className="px-4 py-2 bg-marine-600 text-white rounded-lg hover:bg-marine-700"
              >
                Mark as Reviewed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Dialog */}
      {penalizingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Apply Penalty</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Action
              </label>
              <select
                value={penaltyAction}
                onChange={(e) => setPenaltyAction(e.target.value as 'reputation_penalty' | 'ban')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="reputation_penalty">Reputation Penalty</option>
                <option value="ban">Ban User</option>
              </select>
            </div>

            {penaltyAction === 'reputation_penalty' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Penalty Amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ban Reason
                </label>
                <textarea
                  rows={3}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Reason for ban..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setPenalizingUser(null);
                  setPenaltyAmount(10);
                  setBanReason('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyPenalty(penalizingUser)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Apply Penalty
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModeration;