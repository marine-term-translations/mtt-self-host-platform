
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trophy, Users, Globe, BarChart3, CheckCircle, Clock, FileText, XCircle, GitMerge, Loader2, Book } from 'lucide-react';
import { Link } from 'react-router-dom';
import { backendApi } from '../services/api';
import { ApiPublicUser, ApiTerm } from '../types';
import toast from 'react-hot-toast';

const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    activeUsers: 0,
    byStatus: { approved: 0, merged: 0, review: 0, draft: 0, rejected: 0 }
  });
  const [langStats, setLangStats] = useState<any[]>([]);

  // Language Config
  const LANG_CONFIG: Record<string, { name: string, color: string, baseClass: string }> = {
    'nl': { name: "Nederlands", color: "bg-orange-500", baseClass: "orange" },
    'en': { name: "English", color: "bg-slate-500", baseClass: "slate" },
    'es': { name: "Español", color: "bg-yellow-500", baseClass: "yellow" },
    'pt': { name: "Português", color: "bg-green-600", baseClass: "green" },
    'fr': { name: "Français", color: "bg-blue-600", baseClass: "blue" },
    'de': { name: "Deutsch", color: "bg-red-500", baseClass: "red" },
    'it': { name: "Italiano", color: "bg-teal-500", baseClass: "teal" },
    'ru': { name: "Русский", color: "bg-indigo-500", baseClass: "indigo" },
    'zh': { name: "中文", color: "bg-red-700", baseClass: "red" },
    'ja': { name: "日本語", color: "bg-pink-500", baseClass: "pink" },
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [apiUsers, apiTerms] = await Promise.all([
          backendApi.getUsers(),
          backendApi.getTerms()
        ]);

        // 1. Aggregate User Contributions from Terms
        const usercontribCounts: Record<string, number> = {};
        
        // 2. Aggregate Language Stats
        const lStats: Record<string, { total: number, status: Record<string, number> }> = {};

        // 3. Aggregate Global Stats
        const gStatus = { approved: 0, merged: 0, review: 0, draft: 0, rejected: 0 };
        let gTotal = 0;

        apiTerms.forEach((term: ApiTerm) => {
          term.fields.forEach(field => {
            if (field.translations) {
              field.translations.forEach(t => {
                const lang = t.language.toLowerCase();
                const status = t.status || 'draft';
                const author = t.created_by || 'unknown';

                // User Count
                usercontribCounts[author] = (usercontribCounts[author] || 0) + 1;

                // Global Count
                gTotal++;
                if ((gStatus as any)[status] !== undefined) {
                    (gStatus as any)[status]++;
                }

                // Lang Count
                if (!lStats[lang]) {
                    lStats[lang] = { total: 0, status: { approved: 0, merged: 0, review: 0, draft: 0, rejected: 0 } };
                }
                lStats[lang].total++;
                if ((lStats[lang].status as any)[status] !== undefined) {
                    (lStats[lang].status as any)[status]++;
                }
              });
            }
          });
        });

        // Map users with real contribution counts
        const mappedUsers = apiUsers.map((u: ApiPublicUser) => {
            let displayName = u.name;
            // Prioritize name from extra if available to avoid showing ORCID
            if (u.extra) {
                try {
                    const extraData = JSON.parse(u.extra);
                    if (extraData.name) {
                        displayName = extraData.name;
                    }
                } catch (e) {
                    // ignore
                }
            }
            const nameToUse = displayName || u.username;

            return {
                ...u,
                name: nameToUse,
                contributions: usercontribCounts[u.username] || 0,
                // Fallback avatar if not provided
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse)}&background=0ea5e9&color=fff`
            };
        }).sort((a: any, b: any) => b.reputation - a.reputation);

        // Transform Lang Stats to Array
        const mappedLangStats = Object.keys(lStats).map(code => ({
            code,
            ...lStats[code],
            config: LANG_CONFIG[code] || { name: code.toUpperCase(), color: 'bg-slate-400', baseClass: 'slate' }
        })).sort((a, b) => b.total - a.total);

        setUsers(mappedUsers);
        setGlobalStats({
            total: gTotal,
            activeUsers: apiUsers.length,
            byStatus: gStatus
        });
        setLangStats(mappedLangStats);

      } catch (error) {
        console.error("Leaderboard fetch error", error);
        toast.error("Failed to load leaderboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper for segment opacity/shade based on status
  // We use inline styles for opacity to keep the base color dynamic
  const getSegmentStyle = (status: string) => {
    switch(status) {
        case 'merged': return { opacity: 1 }; // Darkest/Solid
        case 'approved': return { opacity: 0.8 };
        case 'review': return { opacity: 0.5 };
        case 'draft': return { opacity: 0.3 };
        case 'rejected': return { opacity: 0.1 }; // Faint
        default: return { opacity: 0.3 };
    }
  };

  if (loading) {
     return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
           <Loader2 size={40} className="animate-spin text-marine-500 mb-4" />
           <p>Calculating statistics...</p>
        </div>
     );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
            <Link to="/dashboard" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-marine-600 transition-colors">
                <ArrowLeft size={18} />
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="text-indigo-500" /> Community Leaderboard
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Celebrating our top contributors and team progress.</p>
            </div>
        </div>
        <Link to="/documentation" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-marine-500 hover:text-marine-600 transition-colors shadow-sm">
            <Book size={16} /> Documentation
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Top Contributors List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Trophy className="text-yellow-500 mr-2" size={20} /> Top Contributors
            </h2>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ranked by Reputation</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
            {users.map((user, index) => (
              <div key={user.username} className="p-4 flex items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-full font-bold mr-4 shrink-0
                  ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    index === 1 ? 'bg-slate-200 text-slate-700' :
                    index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-transparent text-slate-500'}
                `}>
                  {index + 1}
                </div>
                <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-600 mr-4 shrink-0" />
                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">{user.name || user.username}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                     <span>@{user.username}</span>
                     <span>•</span>
                     <span>{user.contributions} Translations</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="block font-bold text-indigo-600 dark:text-indigo-400">{user.reputation}</span>
                  <span className="text-xs text-slate-400">Reputation</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Column */}
        <div className="space-y-8">
          
          {/* Global Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col items-center text-center">
                    <Globe className="text-teal-500 mb-2" size={28} />
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{globalStats.total}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">Total Translations</div>
                    
                    {/* Status Breakdown Mini */}
                    <div className="w-full flex justify-center gap-1.5 border-t border-slate-100 dark:border-slate-700 pt-3">
                        {globalStats.byStatus.merged > 0 && (
                            <div className="text-[10px] text-purple-600 flex flex-col items-center" title="Merged">
                                <GitMerge size={12} /> <span className="font-bold">{globalStats.byStatus.merged}</span>
                            </div>
                        )}
                        {globalStats.byStatus.approved > 0 && (
                            <div className="text-[10px] text-green-600 flex flex-col items-center" title="Approved">
                                <CheckCircle size={12} /> <span className="font-bold">{globalStats.byStatus.approved}</span>
                            </div>
                        )}
                        {globalStats.byStatus.review > 0 && (
                            <div className="text-[10px] text-amber-600 flex flex-col items-center" title="Review">
                                <Clock size={12} /> <span className="font-bold">{globalStats.byStatus.review}</span>
                            </div>
                        )}
                        {globalStats.byStatus.draft > 0 && (
                            <div className="text-[10px] text-slate-500 flex flex-col items-center" title="Draft">
                                <FileText size={12} /> <span className="font-bold">{globalStats.byStatus.draft}</span>
                            </div>
                        )}
                    </div>
                </div>
             </div>
             
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                <Users className="mx-auto text-marine-500 mb-2" size={28} />
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{globalStats.activeUsers}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Registered Contributors</div>
             </div>
          </div>

          {/* Detailed Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
             <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <Globe className="text-marine-500 mr-2" size={20} /> Translations by Language Team
            </h2>
            <div className="space-y-6">
              {langStats.map((stat) => {
                const maxTotal = langStats[0].total; // Scale based on highest language
                const totalWidth = (stat.total / maxTotal) * 100;
                const statuses = ['merged', 'approved', 'review', 'draft', 'rejected'];
                
                return (
                  <div key={stat.code}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{stat.config.name}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 font-mono uppercase">{stat.code}</span>
                      </div>
                      <span className="text-slate-500 font-medium">{stat.total} terms</span>
                    </div>
                    
                    {/* Progress Bar Container - Wraps the segments */}
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                       <div className="h-full flex transition-all duration-1000 ease-out" style={{ width: `${totalWidth}%` }}>
                           {statuses.map(status => {
                               const count = stat.status[status];
                               if (!count) return null;
                               const pct = (count / stat.total) * 100;
                               return (
                                   <div 
                                      key={status}
                                      className={`${stat.config.color} hover:brightness-110 transition-all`}
                                      style={{ width: `${pct}%`, ...getSegmentStyle(status) }}
                                      title={`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`}
                                   ></div>
                               );
                           })}
                       </div>
                    </div>
                  </div>
                );
              })}

              {langStats.length === 0 && (
                  <p className="text-center text-slate-500 italic py-4">No translations found yet.</p>
              )}
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-4">
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-500 opacity-100 rounded-sm"></div> Merged</div>
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-500 opacity-80 rounded-sm"></div> Approved</div>
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-500 opacity-50 rounded-sm"></div> Review</div>
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-500 opacity-30 rounded-sm"></div> Draft</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
