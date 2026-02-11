import React, { useEffect, useState } from 'react';
import {
  Users, Trash2, Target, AlertTriangle, CheckCircle, XCircle,
  Search, Filter, Plus, Eye, Shield
} from 'lucide-react';
import { backendApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface Community {
  id: number;
  name: string;
  description: string;
  type: 'language' | 'user_created';
  access_type: 'open' | 'invite_only';
  owner_id: number | null;
  owner_username: string | null;
  language_name: string | null;
  member_count: number;
  pending_reports: number;
  active_goals: number;
  created_at: string;
}

interface CommunityReport {
  id: number;
  community_id: number;
  community_name: string;
  community_type: string;
  reported_by_id: number;
  reported_by_username: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reviewed_by_username: string | null;
  resolution_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const AdminCommunities: React.FC = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'communities' | 'reports'>('communities');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'language' | 'user_created'>('all');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewing' | 'resolved' | 'dismissed'>('pending');

  useEffect(() => {
    fetchData();
  }, [activeTab, reportFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'communities') {
        const data = await backendApi.get<Community[]>('/admin/communities');
        setCommunities(data);
      } else {
        const params = reportFilter !== 'all' ? { status: reportFilter } : {};
        const data = await backendApi.get<CommunityReport[]>('/admin/community-reports', params);
        setReports(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCommunity = async (communityId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the community "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await backendApi.delete(`/admin/communities/${communityId}`);
      toast.success('Community deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete community:', error);
      toast.error(error.response?.data?.error || 'Failed to delete community');
    }
  };

  const handleReviewReport = async (reportId: number, status: 'reviewing' | 'resolved' | 'dismissed', notes?: string) => {
    try {
      await backendApi.put(`/admin/community-reports/${reportId}/review`, {
        status,
        resolution_notes: notes
      });
      toast.success('Report reviewed successfully');
      fetchData();
    } catch (error: any) {
      console.error('Failed to review report:', error);
      toast.error(error.response?.data?.error || 'Failed to review report');
    }
  };

  const filteredCommunities = communities.filter(community => {
    const matchesSearch = community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         community.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         community.owner_username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || community.type === filterType;
    return matchesSearch && matchesType;
  });

  const getReasonBadgeColor = (reason: string) => {
    const colors: Record<string, string> = {
      offensive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      spam: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      inappropriate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      harassment: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      other: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
    };
    return colors[reason] || colors.other;
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      reviewing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      dismissed: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Community Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage communities, review reports, and create community goals
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('communities')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'communities'
                ? 'border-b-2 border-marine-600 text-marine-600 dark:text-marine-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Communities ({communities.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'reports'
                ? 'border-b-2 border-marine-600 text-marine-600 dark:text-marine-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              Reports ({reports.filter(r => r.status === 'pending').length})
            </div>
          </button>
        </div>

        {/* Communities Tab */}
        {activeTab === 'communities' && (
          <div>
            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search communities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                  >
                    <option value="all">All Types</option>
                    <option value="language">Language Communities</option>
                    <option value="user_created">User Created</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Communities List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-600 dark:text-slate-400">
                  Loading communities...
                </div>
              ) : filteredCommunities.length === 0 ? (
                <div className="p-8 text-center text-slate-600 dark:text-slate-400">
                  No communities found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Community
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Stats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredCommunities.map((community) => (
                        <tr key={community.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="px-6 py-4">
                            <Link
                              to={`/communities/${community.id}`}
                              className="font-medium text-marine-600 dark:text-marine-400 hover:underline"
                            >
                              {community.name}
                            </Link>
                            {community.description && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {community.description.substring(0, 100)}
                                {community.description.length > 100 && '...'}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              community.type === 'language'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              {community.type === 'language' ? 'Language' : 'User Created'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                            {community.owner_username || (
                              <span className="text-slate-500 dark:text-slate-400">System</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-4 text-sm">
                              <span className="text-slate-600 dark:text-slate-400">
                                {community.member_count} members
                              </span>
                              <span className="text-slate-600 dark:text-slate-400">
                                {community.active_goals} goals
                              </span>
                              {community.pending_reports > 0 && (
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                  {community.pending_reports} reports
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Link
                                to={`/communities/${community.id}`}
                                className="p-2 text-marine-600 dark:text-marine-400 hover:bg-marine-50 dark:hover:bg-marine-900/20 rounded-lg transition-colors"
                                title="View Community"
                              >
                                <Eye size={18} />
                              </Link>
                              {community.type !== 'language' && (
                                <button
                                  onClick={() => handleDeleteCommunity(community.id, community.name)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Delete Community"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            {/* Report Filter */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-6">
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-slate-400" />
                <select
                  value={reportFilter}
                  onChange={(e) => setReportFilter(e.target.value as any)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                >
                  <option value="all">All Reports</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600 dark:text-slate-400">
                  Loading reports...
                </div>
              ) : reports.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600 dark:text-slate-400">
                  No reports found
                </div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link
                            to={`/communities/${report.community_id}`}
                            className="text-lg font-semibold text-marine-600 dark:text-marine-400 hover:underline"
                          >
                            {report.community_name}
                          </Link>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getReasonBadgeColor(report.reason)}`}>
                            {report.reason}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(report.status)}`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Reported by <span className="font-medium">{report.reported_by_username}</span> on{' '}
                          {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {report.description && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">{report.description}</p>
                      </div>
                    )}

                    {report.resolution_notes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Resolution Notes:</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{report.resolution_notes}</p>
                        {report.reviewed_by_username && report.reviewed_at && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            Reviewed by {report.reviewed_by_username} on {new Date(report.reviewed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewReport(report.id, 'reviewing')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Shield size={16} />
                          Start Review
                        </button>
                        <button
                          onClick={() => {
                            const notes = prompt('Enter resolution notes:');
                            if (notes !== null) {
                              handleReviewReport(report.id, 'resolved', notes);
                            }
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Resolve
                        </button>
                        <button
                          onClick={() => {
                            const notes = prompt('Enter dismissal reason (optional):');
                            if (notes !== null) {
                              handleReviewReport(report.id, 'dismissed', notes || 'No action needed');
                            }
                          }}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <XCircle size={16} />
                          Dismiss
                        </button>
                      </div>
                    )}

                    {report.status === 'reviewing' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const notes = prompt('Enter resolution notes:');
                            if (notes !== null) {
                              handleReviewReport(report.id, 'resolved', notes);
                            }
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Resolve
                        </button>
                        <button
                          onClick={() => {
                            const notes = prompt('Enter dismissal reason (optional):');
                            if (notes !== null) {
                              handleReviewReport(report.id, 'dismissed', notes || 'No action needed');
                            }
                          }}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <XCircle size={16} />
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCommunities;
