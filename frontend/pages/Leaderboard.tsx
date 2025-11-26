import React from 'react';
import { ArrowLeft, Trophy, Users, Globe, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Leaderboard: React.FC = () => {
  // Mock Data
  const topContributors = [
    { rank: 1, name: "Maria Garcia", avatar: "https://ui-avatars.com/api/?name=Maria+Garcia&background=0ea5e9&color=fff", reputation: 2450, commits: 156 },
    { rank: 2, name: "John Smith", avatar: "https://ui-avatars.com/api/?name=John+Smith&background=14b8a6&color=fff", reputation: 1980, commits: 132 },
    { rank: 3, name: "Wei Chen", avatar: "https://ui-avatars.com/api/?name=Wei+Chen&background=8b5cf6&color=fff", reputation: 1850, commits: 110 },
    { rank: 4, name: "Sophie Martin", avatar: "https://ui-avatars.com/api/?name=Sophie+Martin&background=f59e0b&color=fff", reputation: 1620, commits: 98 },
    { rank: 5, name: "Lars Jensen", avatar: "https://ui-avatars.com/api/?name=Lars+Jensen&background=ef4444&color=fff", reputation: 1450, commits: 85 },
  ];

  const teamStats = [
    { lang: "Español", count: 850, color: "bg-yellow-500" },
    { lang: "Français", count: 720, color: "bg-blue-500" },
    { lang: "Nederlands", count: 650, color: "bg-orange-500" },
    { lang: "Deutsch", count: 580, color: "bg-red-500" },
    { lang: "Italiano", count: 420, color: "bg-green-500" },
    { lang: "日本語", count: 350, color: "bg-pink-500" },
  ];

  const maxCount = Math.max(...teamStats.map(s => s.count));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/dashboard" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <BarChart3 size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Community Leaderboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Celebrating our top contributors and team progress.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Top Contributors List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Trophy className="text-yellow-500 mr-2" size={20} /> Top Contributors
            </h2>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">All Time</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {topContributors.map((user) => (
              <div key={user.rank} className="p-4 flex items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-full font-bold mr-4
                  ${user.rank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                    user.rank === 2 ? 'bg-slate-200 text-slate-700' :
                    user.rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-transparent text-slate-500'}
                `}>
                  {user.rank}
                </div>
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-600 mr-4" />
                <div className="flex-grow">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{user.name}</h3>
                  <div className="text-xs text-slate-500">{user.commits} Commits</div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-indigo-600 dark:text-indigo-400">{user.reputation}</span>
                  <span className="text-xs text-slate-400">Reputation</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 text-center border-t border-slate-200 dark:border-slate-700">
            <button className="text-sm font-medium text-marine-600 hover:text-marine-700 hover:underline">View Full Rankings</button>
          </div>
        </div>

        {/* Team Stats Graph */}
        <div className="space-y-8">
          
          {/* Global Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                <Globe className="mx-auto text-teal-500 mb-2" size={28} />
                <div className="text-3xl font-bold text-slate-900 dark:text-white">4,285</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Translations</div>
             </div>
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                <Users className="mx-auto text-marine-500 mb-2" size={28} />
                <div className="text-3xl font-bold text-slate-900 dark:text-white">342</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Active Volunteers</div>
             </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
             <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <Globe className="text-marine-500 mr-2" size={20} /> Translations by Language Team
            </h2>
            <div className="space-y-4">
              {teamStats.map((stat) => (
                <div key={stat.lang}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{stat.lang}</span>
                    <span className="text-slate-500">{stat.count} terms</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                    <div 
                      className={`${stat.color} h-2.5 rounded-full transition-all duration-1000 ease-out`} 
                      style={{ width: `${(stat.count / maxCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Leaderboard;