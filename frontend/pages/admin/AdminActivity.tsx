import React, { useEffect, useState } from 'react';
import { backendApi } from '../../services/api';
import { ArrowLeft, Loader2, Activity, User, FileText, Ban, CheckCircle, Target, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { parse, format } from '@/src/utils/datetime';
import { ApiAdminActivity } from '../../types';

const AdminActivity: React.FC = () => {
  const [activities, setActivities] = useState<ApiAdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchAction, setSearchAction] = useState('');
  const limit = 50;

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await backendApi.getAdminActivity({
        page,
        limit,
        action: searchAction || undefined
      });
      setActivities(data.activities);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      toast.error("Failed to fetch admin activities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchAction]);

  const getActionIcon = (action: string) => {
    if (action.includes('user_promoted') || action.includes('user_demoted')) return <User className="w-4 h-4" />;
    if (action.includes('user_banned')) return <Ban className="w-4 h-4" />;
    if (action.includes('user_unbanned')) return <CheckCircle className="w-4 h-4" />;
    if (action.includes('translation')) return <FileText className="w-4 h-4" />;
    if (action.includes('community_goal')) return <Target className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('user_promoted')) return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400';
    if (action.includes('user_demoted')) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400';
    if (action.includes('user_banned')) return 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
    if (action.includes('user_unbanned')) return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400';
    if (action.includes('translation_status')) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400';
    if (action.includes('translation_language')) return 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400';
    if (action.includes('community_goal_created')) return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400';
    if (action.includes('community_goal_updated')) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400';
    if (action.includes('community_goal_deleted')) return 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
    return 'text-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-slate-400';
  };

  const formatActionDescription = (activity: ApiAdminActivity) => {
    const { action, extra } = activity;
    
    switch (action) {
      case 'admin_user_promoted':
        return (
          <>
            Promoted user{' '}
            {extra?.target_user_id ? (
              <Link to={`/user/${extra.target_user_id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-semibold">
                {extra?.target_username || 'unknown'}
              </Link>
            ) : (
              <span className="font-semibold">{extra?.target_username || 'unknown'}</span>
            )}{' '}
            to admin
          </>
        );
      case 'admin_user_demoted':
        return (
          <>
            Demoted user{' '}
            {extra?.target_user_id ? (
              <Link to={`/user/${extra.target_user_id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-semibold">
                {extra?.target_username || 'unknown'}
              </Link>
            ) : (
              <span className="font-semibold">{extra?.target_username || 'unknown'}</span>
            )}{' '}
            from admin
          </>
        );
      case 'admin_user_banned':
        return (
          <>
            Banned user{' '}
            {extra?.target_user_id ? (
              <Link to={`/user/${extra.target_user_id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-semibold">
                {extra?.target_username || 'unknown'}
              </Link>
            ) : (
              <span className="font-semibold">{extra?.target_username || 'unknown'}</span>
            )}
            {extra?.reason ? `: ${extra.reason}` : ''}
          </>
        );
      case 'admin_user_unbanned':
        return (
          <>
            Unbanned user{' '}
            {extra?.target_user_id ? (
              <Link to={`/user/${extra.target_user_id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-semibold">
                {extra?.target_username || 'unknown'}
              </Link>
            ) : (
              <span className="font-semibold">{extra?.target_username || 'unknown'}</span>
            )}
          </>
        );
      case 'admin_translation_status_changed':
        return `Changed translation #${activity.translation_id} status from "${extra?.previous_status}" to "${extra?.new_status}"`;
      case 'admin_translation_language_changed':
        return `Changed translation #${activity.translation_id} language from "${extra?.previous_language}" to "${extra?.new_language}"`;
      case 'admin_community_goal_created':
        return `Created community goal "${extra?.title || 'Untitled'}" (${extra?.goal_type})`;
      case 'admin_community_goal_updated':
        return `Updated community goal #${extra?.goal_id}${extra?.updates ? ': ' + extra.updates.join(', ') : ''}`;
      case 'admin_community_goal_deleted':
        return `Deleted community goal "${extra?.title || 'Untitled'}"`;
      default:
        return action.replace('admin_', '').replace(/_/g, ' ');
    }
  };

  const actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'admin_user_promoted', label: 'User Promoted' },
    { value: 'admin_user_demoted', label: 'User Demoted' },
    { value: 'admin_user_banned', label: 'User Banned' },
    { value: 'admin_user_unbanned', label: 'User Unbanned' },
    { value: 'admin_translation_status_changed', label: 'Translation Status Changed' },
    { value: 'admin_translation_language_changed', label: 'Translation Language Changed' },
    { value: 'admin_community_goal_created', label: 'Community Goal Created' },
    { value: 'admin_community_goal_updated', label: 'Community Goal Updated' },
    { value: 'admin_community_goal_deleted', label: 'Community Goal Deleted' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Admin Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
          <Activity className="w-8 h-8 mr-3 text-blue-600" />
          Admin Activity Log
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Track all administrative actions performed on the platform
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Filter by Action Type
            </label>
            <select
              value={searchAction}
              onChange={(e) => {
                setSearchAction(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {actionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No admin activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${getActionColor(activity.action)}`}>
                      {getActionIcon(activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatActionDescription(activity)}
                      </p>
                      <div className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-4">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          <Link 
                            to={`/user/${activity.user_id}`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                          >
                            {activity.admin_username}
                          </Link>
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(parse(activity.created_at), 'MMM DD, YYYY HH:mm')}
                        </span>
                        {activity.translation_id && (
                          <Link 
                            to={`/admin/translations`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                          >
                            View Translation
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivity;
