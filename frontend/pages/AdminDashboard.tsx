import React from 'react';
import { ShieldCheck, Users, Settings, Database, AlertTriangle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="p-3 bg-slate-900 text-white rounded-lg">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage users, configurations, and system health.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700 dark:text-slate-300">User Management</h3>
            <Users className="text-marine-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">342</p>
          <p className="text-sm text-slate-500">Registered Users</p>
          <button className="mt-4 w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">
            Manage Users
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700 dark:text-slate-300">System Status</h3>
            <Database className="text-teal-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Healthy</p>
          <p className="text-sm text-slate-500">API & Database</p>
           <button className="mt-4 w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">
            View Logs
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700 dark:text-slate-300">Flagged Content</h3>
            <AlertTriangle className="text-amber-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">5</p>
          <p className="text-sm text-slate-500">Items requiring review</p>
           <button className="mt-4 w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">
            Review Items
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 text-center">
        <Settings size={48} className="mx-auto text-yellow-600 dark:text-yellow-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Admin Tools Under Construction</h2>
        <p className="text-slate-600 dark:text-slate-400">
          This panel is currently a placeholder. Full administrative capabilities including Gitea team management and detailed moderation tools will be available in the next release.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;