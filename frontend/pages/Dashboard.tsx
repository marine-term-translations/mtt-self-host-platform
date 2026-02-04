
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Award, TrendingUp, Clock, ChevronRight, Activity, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { backendApi } from '../services/api';
import { ApiTerm, ApiUserActivity, ApiPublicUser, ApiLanguage } from '../types';
import toast from 'react-hot-toast';
import { parse, fromNow } from '@/src/utils/datetime';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activityCount: 0,
    reputation: 0,
    rank: 0,
    needsTranslationCount: 0
  });
  const [activities, setActivities] = useState<ApiUserActivity[]>([]);
  const [termsMap, setTermsMap] = useState<Record<number, { label: string; uri: string }>>({});
  const [userLanguages, setUserLanguages] = useState<string[]>([]);
  const [selectedFlowLanguage, setSelectedFlowLanguage] = useState<string>('');
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id && !user?.user_id) return; // Check for user ID

      try {
        setLoading(true);

        // Fetch data in parallel including user preferences and languages
        const [history, users, preferences, languagesData] = await Promise.all([
          backendApi.getUserHistory(user.id || user.user_id!), // Use user ID
          backendApi.getUsers(),
          backendApi.get<{ nativeLanguage: string; translationLanguages: string[] }>('/user/preferences').catch(() => ({ nativeLanguage: '', translationLanguages: [] })),
          backendApi.get<ApiLanguage[]>('/languages').catch(() => [])
        ]);

        // Set languages from API
        setLanguages(languagesData);

        // Set user's translation languages
        const userLangs = preferences.translationLanguages || [];
        setUserLanguages(userLangs);
        if (userLangs.length > 0) {
          setSelectedFlowLanguage(userLangs[0]);
        }

        // 1. Extract unique term IDs from history and fetch only those terms
        const termIds = [...new Set(history.map(h => h.term_id).filter(id => id != null))] as number[];
        
        let termIdToInfo: Record<number, { label: string; uri: string }> = {};
        if (termIds.length > 0) {
          const terms = await backendApi.getTermsByIds(termIds);
          terms.forEach((t: ApiTerm) => {
            // Map ID to both Label and URI for activity feed lookup
            // Add safety check for fields being undefined
            if (t.fields && Array.isArray(t.fields)) {
              const labelField = t.fields.find(f => f.field_role === 'label')
                || t.fields.find(f => f.field_uri?.includes('prefLabel'));
              const prefLabel = labelField?.original_value || t.uri || 'Unknown Term';
              termIdToInfo[t.id] = { label: prefLabel, uri: t.uri };
            } else {
              termIdToInfo[t.id] = { label: t.uri || 'Unknown Term', uri: t.uri };
            }
          });
        }
        setTermsMap(termIdToInfo);

        // 2. Process User Ranking & Reputation
        const sortedUsers = users.sort((a: ApiPublicUser, b: ApiPublicUser) => b.reputation - a.reputation);
        const currentUserData = sortedUsers.find(u => u.username === user.username);
        const rank = sortedUsers.findIndex(u => u.username === user.username) + 1;

        // 3. Process History
        // Sort by created_at desc just in case API doesn't
        const sortedHistory = history.sort((a, b) => 
          parse(b.created_at).valueOf() - parse(a.created_at).valueOf()
        );

        setActivities(sortedHistory.slice(0, 5)); // Top 5 recent
        setStats({
          activityCount: history.length,
          reputation: currentUserData?.reputation || 0,
          rank: rank > 0 ? rank : users.length + 1,
          needsTranslationCount: 0 // This is now calculated server-side if needed
        });

      } catch (error) {
        console.error("Dashboard data fetch failed:", error);
        toast.error("Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.username]);

  const formatActivityAction = (action: string) => {
    switch (action) {
      case 'translation_created': return 'Created translation';
      case 'translation_edited': return 'Edited translation';
      case 'translation_approved': return 'Approved translation';
      case 'term_uri_changed': return 'Updated term URI';
      default: return action.replace('_', ' ');
    }
  };

  const getRelativeTime = (dateString: string) => {
    return fromNow(parse(dateString));
  };

  const getLanguageName = (code: string) => {
    const language = languages.find(l => l.code === code);
    if (language) {
      return language.name;
    }
    // Fallback to uppercase code if language not found in API
    return code.toUpperCase();
  };

  const parseExtra = (extra: string | null) => {
    if (!extra) return null;
    try {
      const data = JSON.parse(extra);
      // Construct a friendly string based on common extra fields
      if (data.language && data.value) {
        return `"${data.value}" (${data.language.toUpperCase()})`;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, {user?.name.split(' ')[0]}!</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Here's what's happening with your contributions.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Activity Card */}
        <Link to="/history" className="group bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center hover:shadow-md hover:border-marine-300 dark:hover:border-marine-600 transition-all cursor-pointer">
          <div className="p-3 bg-marine-100 dark:bg-marine-900 text-marine-600 dark:text-marine-400 rounded-lg mr-4 group-hover:scale-110 transition-transform">
            <Activity size={24} />
          </div>
          <div className="flex-grow">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Your Activity</p>
            <div className="flex items-baseline gap-2">
               {loading ? (
                   <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1"></div>
               ) : (
                   <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activityCount}</p>
               )}
               <span className="text-xs text-slate-400">actions</span>
            </div>
          </div>
          <ChevronRight className="text-slate-300 group-hover:text-marine-500 transition-colors" size={20} />
        </Link>
        
        {/* Reputation Card */}
        <Link to="/reputation" className="group bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center hover:shadow-md hover:border-teal-300 dark:hover:border-teal-600 transition-all cursor-pointer">
          <div className="p-3 bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400 rounded-lg mr-4 group-hover:scale-110 transition-transform">
            <Award size={24} />
          </div>
          <div className="flex-grow">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Reputation Score</p>
             {loading ? (
                 <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1"></div>
             ) : (
                 <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.reputation}</p>
             )}
          </div>
           <ChevronRight className="text-slate-300 group-hover:text-teal-500 transition-colors" size={20} />
        </Link>

        {/* Leaderboard Card */}
        <Link to="/leaderboard" className="group bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg mr-4 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <div className="flex-grow">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Global Rank</p>
             {loading ? (
                 <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1"></div>
             ) : (
                 <p className="text-2xl font-bold text-slate-900 dark:text-white">#{stats.rank}</p>
             )}
          </div>
           <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={20} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Call to Action */}
        <div className="lg:col-span-2 bg-gradient-to-r from-marine-600 to-marine-800 rounded-xl p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Ready to Contribute?</h3>
            <p className="text-marine-100 mb-6 max-w-md">
              {loading 
                ? "Analyzing terms library..." 
                : `There are approximately ${stats.needsTranslationCount} terms waiting for plain English definitions or translations in your language.`
              }
            </p>
            {userLanguages.length > 0 ? (
              <>
                <div className="mb-4">
                  <label htmlFor="flow-language" className="block text-sm font-medium text-marine-100 mb-2">
                    Select language for Flow Mode:
                  </label>
                  <select
                    id="flow-language"
                    value={selectedFlowLanguage}
                    onChange={(e) => setSelectedFlowLanguage(e.target.value)}
                    className="w-full max-w-xs px-4 py-2 rounded-lg bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-marine-300"
                  >
                    {userLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {getLanguageName(lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to={`/flow?language=${selectedFlowLanguage}`} 
                    className="inline-flex items-center px-5 py-2.5 bg-white text-marine-700 font-bold rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                  >
                    <Zap size={18} className="mr-2 fill-marine-700" /> Enter Flow Mode
                  </Link>
                  <Link to="/browse" className="inline-flex items-center px-5 py-2.5 bg-marine-700/50 text-white font-semibold rounded-lg hover:bg-marine-700 transition-colors border border-marine-500">
                    Browse All Terms
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-4 bg-marine-700/50 rounded-lg border border-marine-500">
                  <p className="text-sm text-marine-100">
                    Please set your translation languages in your{' '}
                    <Link to="/profile" className="underline font-semibold hover:text-white">
                      profile settings
                    </Link>
                    {' '}to use Flow Mode.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link to="/browse" className="inline-flex items-center px-5 py-2.5 bg-white text-marine-700 font-bold rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
                    Browse All Terms
                  </Link>
                </div>
              </>
            )}
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
             <BookOpen size={200} />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 min-h-[300px]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={18} className="text-slate-400" /> Recent Activity
          </h3>
          
          <div className="space-y-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-start pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-slate-200 dark:bg-slate-700 mr-3"></div>
                  <div className="space-y-2 w-full">
                     <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                     <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                  </div>
                </div>
              ))
            ) : activities.length > 0 ? (
              activities.map((activity) => {
                const termInfo = activity.term_id ? termsMap[activity.term_id] : null;
                const termLabel = termInfo?.label || 'Deleted Term';
                const termUri = termInfo?.uri || '';
                const details = parseExtra(activity.extra);
                
                return (
                  <div key={activity.id} className="flex items-start pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                    <div className="w-2 h-2 mt-2 rounded-full bg-marine-500 mr-3 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm text-slate-800 dark:text-slate-200">
                        <span className="capitalize font-medium">{formatActivityAction(activity.action)}</span>
                        {' '}for{' '}
                        {termUri ? (
                          <Link to={`/term/${encodeURIComponent(termUri)}`} className="font-medium text-marine-600 hover:underline">
                            "{termLabel}"
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-500">
                            "{termLabel}"
                          </span>
                        )}
                      </p>
                      {details && (
                          <p className="text-xs text-slate-500 dark:text-slate-500 italic mt-0.5">
                              {details}
                          </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{getRelativeTime(activity.created_at)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                 No recent activity found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;