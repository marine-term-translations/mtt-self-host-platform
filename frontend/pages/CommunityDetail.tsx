import React, { useEffect, useState } from 'react';
import { 
  Users, Globe, Lock, Settings, UserPlus, UserMinus, 
  Loader2, ArrowLeft, TrendingUp, Award, Calendar,
  Target, Mail, X, Edit, Save, Flag, Plus, Trash2
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { backendApi } from '../services/api';
import { ApiCommunity, ApiCommunityStats, ApiCommunityLeaderboard, ApiCommunityGoal } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CommunityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [community, setCommunity] = useState<ApiCommunity | null>(null);
  const [stats, setStats] = useState<ApiCommunityStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<ApiCommunityLeaderboard | null>(null);
  const [goals, setGoals] = useState<ApiCommunityGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'stats' | 'goals'>('overview');
  
  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAccessType, setEditAccessType] = useState<'open' | 'invite_only'>('open');
  const [saveLoading, setSaveLoading] = useState(false);

  // Goal creation states
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalTargetCount, setGoalTargetCount] = useState('');
  const [goalStartDate, setGoalStartDate] = useState('');
  const [goalEndDate, setGoalEndDate] = useState('');
  const [goalLoading, setGoalLoading] = useState(false);

  // Report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCommunityData();
    }
  }, [id]);

  useEffect(() => {
    if (showInviteModal && allUsers.length === 0) {
      fetchAllUsers();
    }
  }, [showInviteModal]);

  useEffect(() => {
    if (inviteUsername.trim()) {
      filterUsers(inviteUsername);
      setShowDropdown(true);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [inviteUsername, allUsers]);

  const fetchAllUsers = async () => {
    try {
      const users = await backendApi.get<any[]>('/users');
      setAllUsers(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const filterUsers = (searchTerm: string) => {
    if (!searchTerm.trim() || allUsers.length === 0) {
      setSearchResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allUsers
      .filter(user => {
        // Parse extra data to get display name
        let displayName = user.username;
        if (user.extra) {
          try {
            const extraData = JSON.parse(user.extra);
            if (extraData.name) {
              displayName = extraData.name;
            }
          } catch (e) {
            // ignore
          }
        }
        
        // Filter by username or display name
        return (
          user.username.toLowerCase().includes(term) ||
          displayName.toLowerCase().includes(term)
        );
      })
      .filter(user => {
        // Exclude users who are already members
        return !community?.members?.some(member => member.user_id === user.id);
      })
      .slice(0, 10); // Limit to 10 results

    setSearchResults(filtered);
  };

  const fetchCommunityData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [communityData, statsData, leaderboardData, goalsData] = await Promise.all([
        backendApi.get<ApiCommunity>(`/communities/${id}`),
        backendApi.get<ApiCommunityStats>(`/communities/${id}/stats?period=month`).catch(() => null),
        backendApi.get<ApiCommunityLeaderboard>(`/communities/${id}/leaderboard?metric=reputation&limit=10`).catch(() => null),
        backendApi.get<ApiCommunityGoal[]>(`/communities/${id}/goals`).catch(() => [])
      ]);
      
      setCommunity(communityData);
      setStats(statsData);
      setLeaderboard(leaderboardData);
      setGoals(goalsData);
      
      // Initialize edit fields
      setEditName(communityData.name);
      setEditDescription(communityData.description || '');
      setEditAccessType(communityData.access_type);
    } catch (error) {
      console.error('Failed to fetch community data:', error);
      toast.error('Failed to load community');
      navigate('/communities');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async () => {
    if (!id || !community) return;
    
    try {
      await backendApi.post(`/communities/${id}/join`, {});
      toast.success('Successfully joined community!');
      fetchCommunityData();
    } catch (error: any) {
      console.error('Failed to join community:', error);
      toast.error(error.response?.data?.error || 'Failed to join community');
    }
  };

  const handleLeaveCommunity = async () => {
    if (!id || !community) return;
    
    if (!confirm('Are you sure you want to leave this community?')) {
      return;
    }
    
    try {
      await backendApi.delete(`/communities/${id}/leave`);
      toast.success('Successfully left community');
      fetchCommunityData();
    } catch (error: any) {
      console.error('Failed to leave community:', error);
      toast.error(error.response?.data?.error || 'Failed to leave community');
    }
  };

  const handleRemoveMember = async (userId: number, username: string) => {
    if (!id || !confirm(`Remove ${username} from this community?`)) {
      return;
    }
    
    try {
      await backendApi.delete(`/communities/${id}/members/${userId}`);
      toast.success(`Removed ${username} from community`);
      fetchCommunityData();
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast.error(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleSaveCommunity = async () => {
    if (!id || !community) return;
    
    try {
      setSaveLoading(true);
      await backendApi.put(`/communities/${id}`, {
        name: editName,
        description: editDescription,
        access_type: editAccessType
      });
      toast.success('Community updated successfully!');
      setEditMode(false);
      fetchCommunityData();
    } catch (error: any) {
      console.error('Failed to update community:', error);
      toast.error(error.response?.data?.error || 'Failed to update community');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!id || !inviteUsername.trim()) return;
    
    try {
      setInviteLoading(true);
      await backendApi.post(`/communities/${id}/invite`, {
        username: inviteUsername.trim()
      });
      toast.success(`Invitation sent to ${inviteUsername}`);
      setShowInviteModal(false);
      setInviteUsername('');
      setSearchResults([]);
      setShowDropdown(false);
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSelectUser = (username: string) => {
    setInviteUsername(username);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInviteUsername('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleCreateGoal = async () => {
    if (!id || !goalTitle || !goalTargetCount || !goalStartDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setGoalLoading(true);
      await backendApi.post(`/communities/${id}/goals`, {
        title: goalTitle,
        description: goalDescription,
        goal_type: 'translation_count',
        target_count: parseInt(goalTargetCount),
        start_date: new Date(goalStartDate).toISOString(),
        end_date: goalEndDate ? new Date(goalEndDate).toISOString() : null
      });
      toast.success('Goal created successfully!');
      setShowGoalModal(false);
      setGoalTitle('');
      setGoalDescription('');
      setGoalTargetCount('');
      setGoalStartDate('');
      setGoalEndDate('');
      fetchCommunityData();
    } catch (error: any) {
      console.error('Failed to create goal:', error);
      toast.error(error.response?.data?.error || 'Failed to create goal');
    } finally {
      setGoalLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    try {
      await backendApi.delete(`/communities/${id}/goals/${goalId}`);
      toast.success('Goal deleted successfully');
      fetchCommunityData();
    } catch (error: any) {
      console.error('Failed to delete goal:', error);
      toast.error(error.response?.data?.error || 'Failed to delete goal');
    }
  };

  const handleReportCommunity = async () => {
    if (!id || !reportReason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    try {
      setReportLoading(true);
      await backendApi.post(`/communities/${id}/report`, {
        reason: reportReason,
        description: reportDescription
      });
      toast.success('Report submitted successfully');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    } catch (error: any) {
      console.error('Failed to report community:', error);
      toast.error(error.response?.data?.error || 'Failed to submit report');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading || !community) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-marine-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading community...</p>
        </div>
      </div>
    );
  }

  const isLanguageCommunity = community.type === 'language';
  const isMember = !!community.user_membership;
  const isOwner = user?.id === community.owner_id;
  const userRole = community.user_membership?.role;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          to="/communities"
          className="inline-flex items-center gap-2 text-marine-600 dark:text-marine-400 hover:underline mb-6"
        >
          <ArrowLeft size={20} />
          Back to Communities
        </Link>

        {/* Community Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4 flex-1">
              <div className={`p-4 rounded-lg ${
                isLanguageCommunity 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
              }`}>
                {isLanguageCommunity ? <Globe size={32} /> : <Users size={32} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {editMode ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-3xl font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded border-2 border-marine-500"
                      placeholder="Community name"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {community.name}
                    </h1>
                  )}
                  {community.access_type === 'invite_only' && !isLanguageCommunity && (
                    <span className="flex items-center gap-1 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full">
                      <Lock size={14} />
                      Invite Only
                    </span>
                  )}
                  {isMember && (
                    <span className="text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                      {userRole === 'creator' ? 'Creator' : userRole === 'moderator' ? 'Moderator' : 'Member'}
                    </span>
                  )}
                </div>
                
                {community.language_native_name && (
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
                    {community.language_native_name}
                  </p>
                )}
                
                {editMode ? (
                  <div className="space-y-3">
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded border-2 border-marine-500"
                      placeholder="Community description"
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Access Type
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="access_type"
                            value="open"
                            checked={editAccessType === 'open'}
                            onChange={(e) => setEditAccessType('open')}
                            className="text-marine-600"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Open</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="access_type"
                            value="invite_only"
                            checked={editAccessType === 'invite_only'}
                            onChange={(e) => setEditAccessType('invite_only')}
                            className="text-marine-600"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Invite Only</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {community.description && (
                      <p className="text-slate-600 dark:text-slate-400">
                        {community.description}
                      </p>
                    )}
                  </>
                )}
                
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <UserPlus size={16} />
                    {community.actual_member_count || community.member_count || 0} members
                  </span>
                  {!isLanguageCommunity && community.owner_username && (
                    <span>Created by {community.owner_username}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={16} />
                    {new Date(community.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isOwner && !isLanguageCommunity && (
                <>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                    >
                      <Settings size={20} />
                      Settings
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveCommunity}
                        disabled={saveLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saveLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setEditName(community.name);
                          setEditDescription(community.description || '');
                          setEditAccessType(community.access_type);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                      >
                        <X size={20} />
                        Cancel
                      </button>
                    </>
                  )}
                </>
              )}
              
              {!isMember && community.access_type === 'open' && (
                <button
                  onClick={handleJoinCommunity}
                  className="flex items-center gap-2 px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors"
                >
                  <UserPlus size={20} />
                  Join Community
                </button>
              )}
              
              {isMember && !isLanguageCommunity && userRole !== 'creator' && (
                <button
                  onClick={handleLeaveCommunity}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <UserMinus size={20} />
                  Leave
                </button>
              )}

              {!isLanguageCommunity && !isOwner && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  title="Report community"
                >
                  <Flag size={20} />
                  Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 mb-6">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {['overview', 'members', 'stats', 'goals'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-marine-600 dark:text-marine-400 border-b-2 border-marine-600 dark:border-marine-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Stats</h3>
              {stats ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Total Translations</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{stats.total_translations}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Active Members</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{community.actual_member_count || community.member_count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Top Contributors</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{stats.top_contributors.length}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-400">No stats available</p>
              )}
            </div>

            {/* Top Contributors */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="text-yellow-500" size={20} />
                Top Contributors
              </h3>
              {stats && stats.top_contributors.length > 0 ? (
                <div className="space-y-2">
                  {stats.top_contributors.slice(0, 5).map((contributor, index) => (
                    <div key={contributor.id} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-400 w-6">{index + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">{contributor.display_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{contributor.translation_count} translations</p>
                      </div>
                      <span className="text-sm text-marine-600 dark:text-marine-400">{contributor.reputation} rep</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-400">No contributors yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Members ({community.members?.length || 0})
              </h3>
              {isOwner && !isLanguageCommunity && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Mail size={16} />
                  Invite Member
                </button>
              )}
            </div>
            
            {community.members && community.members.length > 0 ? (
              <div className="space-y-3">
                {community.members.map((member) => {
                  let displayName = member.username;
                  if (member.extra) {
                    try {
                      const extraData = JSON.parse(member.extra);
                      if (extraData.name) {
                        displayName = extraData.name;
                      }
                    } catch (e) {
                      // ignore
                    }
                  }
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-marine-600 flex items-center justify-center text-white font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{displayName}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {member.reputation || 0} reputation · {member.role}
                          </p>
                        </div>
                      </div>
                      
                      {isOwner && member.role !== 'creator' && !isLanguageCommunity && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id, displayName)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-400">No members yet</p>
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Translation Activity</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.translations_by_status).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <p className="text-2xl font-bold text-marine-600 dark:text-marine-400">{count}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">{status}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Languages</h3>
              <div className="space-y-2">
                {Object.entries(stats.translations_by_language).slice(0, 10).map(([lang, count]) => (
                  <div key={lang} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-12 uppercase">{lang}</span>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-marine-600 dark:bg-marine-500 h-full rounded-full"
                        style={{ width: `${(count / stats.total_translations) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Community Goals</h3>
              {isOwner && !isLanguageCommunity && (
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors"
                >
                  <Plus size={18} />
                  Create Goal
                </button>
              )}
            </div>
            {goals.length > 0 ? (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{goal.title}</h4>
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete goal"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Target size={14} />
                      <span>{goal.target_count} translations{goal.target_language && ` in ${goal.target_language.toUpperCase()}`}</span>
                    </div>
                    {goal.start_date && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <Calendar size={14} />
                        <span>
                          {new Date(goal.start_date).toLocaleDateString()}
                          {goal.end_date && ` - ${new Date(goal.end_date).toLocaleDateString()}`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-400">
                {isOwner && !isLanguageCommunity 
                  ? 'No community goals yet. Create one to motivate your community members!' 
                  : 'No community goals yet'}
              </p>
            )}
          </div>
        )}
        
        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Invite Member</h3>
                <button
                  onClick={handleCloseInviteModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Search for a user by their name or username to invite them to this community.
              </p>
              
              <div className="space-y-4">
                <div className="relative">
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Search User
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !showDropdown && handleInviteMember()}
                    placeholder="Type name or username..."
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                    autoFocus
                    autoComplete="off"
                  />
                  
                  {/* Autocomplete Dropdown */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((user) => {
                        let displayName = user.username;
                        if (user.extra) {
                          try {
                            const extraData = JSON.parse(user.extra);
                            if (extraData.name) {
                              displayName = extraData.name;
                            }
                          } catch (e) {
                            // ignore
                          }
                        }
                        
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelectUser(user.username)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-marine-600 text-white flex items-center justify-center text-sm font-medium">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {displayName}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  @{user.username}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {user.reputation} rep
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {showDropdown && inviteUsername.trim() && searchResults.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      No users found matching "{inviteUsername}"
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseInviteModal}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteMember}
                    disabled={inviteLoading || !inviteUsername.trim()}
                    className="flex-1 px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Goal Creation Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create Goal</h3>
                <button
                  onClick={() => setShowGoalModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="e.g., Complete 100 translations"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    placeholder="Optional description of the goal"
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Target Count *
                  </label>
                  <input
                    type="number"
                    value={goalTargetCount}
                    onChange={(e) => setGoalTargetCount(e.target.value)}
                    placeholder="Number of translations"
                    min="1"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={goalStartDate}
                      onChange={(e) => setGoalStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={goalEndDate}
                      onChange={(e) => setGoalEndDate(e.target.value)}
                      min={goalStartDate}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowGoalModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGoal}
                    disabled={goalLoading || !goalTitle || !goalTargetCount || !goalStartDate}
                    className="flex-1 px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {goalLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Target size={16} />
                        Create Goal
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Report Community</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                If this community violates our guidelines, please report it with a reason.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reason *
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                  >
                    <option value="">Select a reason...</option>
                    <option value="offensive">Offensive content</option>
                    <option value="spam">Spam</option>
                    <option value="inappropriate">Inappropriate content</option>
                    <option value="harassment">Harassment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Additional Details
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Please provide more details about this report..."
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReportCommunity}
                    disabled={reportLoading || !reportReason}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {reportLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Flag size={16} />
                        Submit Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityDetail;
