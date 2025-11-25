import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Award, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const mockActivity = [
    { id: 1, action: "Translated", term: "Water Turbidity", time: "2 hours ago" },
    { id: 2, action: "Reviewed", term: "Bathyal zone", time: "1 day ago" },
    { id: 3, action: "Joined", term: "Marine Term Translations", time: "3 days ago" }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, {user?.name.split(' ')[0]}!</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Here's what's happening with your contributions.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
          <div className="p-3 bg-marine-100 dark:bg-marine-900 text-marine-600 dark:text-marine-400 rounded-lg mr-4">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Translations</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">12</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
          <div className="p-3 bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400 rounded-lg mr-4">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Reputation</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">450</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg mr-4">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rank</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">#42</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Call to Action */}
        <div className="lg:col-span-2 bg-gradient-to-r from-marine-600 to-marine-800 rounded-xl p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Needs Translation</h3>
            <p className="text-marine-100 mb-6 max-w-md">There are 15 new terms in "Chemical Oceanography" waiting for plain English definitions.</p>
            <Link to="/browse" className="inline-block px-5 py-2.5 bg-white text-marine-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors">
              Start Translating
            </Link>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
             <BookOpen size={200} />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={18} className="text-slate-400" /> Recent Activity
          </h3>
          <div className="space-y-4">
            {mockActivity.map((activity) => (
              <div key={activity.id} className="flex items-start pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                <div className="w-2 h-2 mt-2 rounded-full bg-marine-500 mr-3"></div>
                <div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    {activity.action} <span className="font-medium">"{activity.term}"</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;