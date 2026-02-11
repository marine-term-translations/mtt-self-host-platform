import React, { useEffect, useState } from 'react';
import { Users, Globe, Lock, Plus, Loader2, Search, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { backendApi } from '../services/api';
import { ApiCommunity } from '../types';
import toast from 'react-hot-toast';

const Communities: React.FC = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<ApiCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'language' | 'user_created'>('all');

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const data = await backendApi.get<ApiCommunity[]>('/communities');
      setCommunities(data);
    } catch (error) {
      console.error('Failed to fetch communities:', error);
      toast.error('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = () => {
    navigate('/communities/create');
  };

  const handleCommunityClick = (communityId: number) => {
    navigate(`/communities/${communityId}`);
  };

  // Filter communities
  const filteredCommunities = communities.filter(community => {
    const matchesSearch = community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         community.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || community.type === filterType;
    return matchesSearch && matchesType;
  });

  // Separate language and user-created communities
  const languageCommunities = filteredCommunities.filter(c => c.type === 'language');
  const userCreatedCommunities = filteredCommunities.filter(c => c.type === 'user_created');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-marine-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading communities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
                <Users size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Communities</h1>
                <p className="text-slate-600 dark:text-slate-400">Connect with translators and track progress together</p>
              </div>
            </div>
            <button
              onClick={handleCreateCommunity}
              className="flex items-center gap-2 px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              Create Community
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'all'
                    ? 'bg-marine-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('language')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'language'
                    ? 'bg-marine-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Language
              </button>
              <button
                onClick={() => setFilterType('user_created')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'user_created'
                    ? 'bg-marine-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                User Created
              </button>
            </div>
          </div>
        </div>

        {/* Language Communities Section */}
        {(filterType === 'all' || filterType === 'language') && languageCommunities.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Language Communities</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {languageCommunities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  onClick={() => handleCommunityClick(community.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* User Created Communities Section */}
        {(filterType === 'all' || filterType === 'user_created') && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-purple-600 dark:text-purple-400" size={24} />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Communities</h2>
            </div>
            {userCreatedCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userCreatedCommunities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onClick={() => handleCommunityClick(community.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-12 text-center">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No User Communities Yet</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Be the first to create a community for translators!
                </p>
                <button
                  onClick={handleCreateCommunity}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors"
                >
                  <Plus size={20} />
                  Create Community
                </button>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {filteredCommunities.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Communities Found</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Community Card Component
interface CommunityCardProps {
  community: ApiCommunity;
  onClick: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, onClick }) => {
  const isLanguageCommunity = community.type === 'language';
  
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all cursor-pointer hover:border-marine-300 dark:hover:border-marine-600"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isLanguageCommunity ? (
              <Globe className="text-blue-600 dark:text-blue-400" size={20} />
            ) : (
              <Users className="text-purple-600 dark:text-purple-400" size={20} />
            )}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {community.name}
            </h3>
          </div>
          {community.language_native_name && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              {community.language_native_name}
            </p>
          )}
        </div>
        {community.access_type === 'invite_only' && !isLanguageCommunity && (
          <Lock className="text-amber-500" size={16} />
        )}
      </div>

      {community.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
          {community.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <UserPlus size={16} />
          <span>{community.actual_member_count || community.member_count || 0} members</span>
        </div>
        {!isLanguageCommunity && community.owner_username && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            by {community.owner_username}
          </span>
        )}
      </div>
    </div>
  );
};

export default Communities;
