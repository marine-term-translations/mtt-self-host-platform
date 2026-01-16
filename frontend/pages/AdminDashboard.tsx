

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Database, AlertTriangle, TrendingUp, Activity, PieChart, DownloadCloud, Layers, Search, Box } from 'lucide-react';
import { backendApi } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    userCount: 0,
    termCount: 0,
    translationCount: 0,
    openAppeals: 0,
  });
  const [statusDist, setStatusDist] = useState<Record<string, number>>({});
  const [historyGraphData, setHistoryGraphData] = useState<{date: string, count: number}[]>([]);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const [users, termsResponse, appeals] = await Promise.all([
           backendApi.getUsers(),
           backendApi.getTerms(),
           backendApi.getAppeals()
        ]);

        // 1. Counts
        const openAppeals = appeals.filter(a => a.status === 'open').length;
        
        // 2. Term Stats & Status Distribution
        let tCount = 0;
        const dist: Record<string, number> = { merged: 0, approved: 0, review: 0, draft: 0, rejected: 0 };
        const timestamps: number[] = [];

        termsResponse.terms.forEach(term => {
            term.fields.forEach(field => {
                if (field.translations) {
                    field.translations.forEach(t => {
                        tCount++;
                        const s = t.status || 'draft';
                        if (dist[s] !== undefined) dist[s]++;
                        if (t.created_at) timestamps.push(new Date(t.created_at).getTime());
                    });
                }
            });
        });

        // 3. Prepare Time Series Data (Mocking buckets based on available timestamps)
        const sortedTimestamps = timestamps.sort((a: number, b: number) => a - b);
        
        const buckets: Record<string, number> = {};
        
        // If no data, use empty
        if (sortedTimestamps.length > 0) {
             sortedTimestamps.forEach((ts: number) => {
                 const d = new Date(ts);
                 const key = `${d.getMonth()+1}/${d.getDate()}`; // Simple Day bucket
                 buckets[key] = (buckets[key] || 0) + 1;
             });
        }
        
        // Convert to array
        const graphData = Object.keys(buckets).map(date => ({ date, count: buckets[date] })).slice(-14); // Last 14 days

        setStats({
            userCount: users.length,
            termCount: termsResponse.total || termsResponse.terms.length,
            translationCount: tCount,
            openAppeals
        });
        setStatusDist(dist);
        setHistoryGraphData(graphData);

      } catch (error) {
        console.error("Admin fetch error", error);
        toast.error("Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  // --- Helpers for SVG Charts ---

  // Simple Bar Chart for Status
  const renderStatusBars = () => {
     // Fix: Cast Object.values to number[] to handle TS 'unknown' inference
     const values = Object.values(statusDist) as number[];
     const max = Math.max(...values, 1);
     const colors: Record<string, string> = {
         merged: 'bg-purple-500', approved: 'bg-green-500', review: 'bg-amber-500', draft: 'bg-slate-400', rejected: 'bg-red-500'
     };
     
     return Object.keys(statusDist).map(key => {
         const val = statusDist[key];
         const pct = (val / max) * 100;
         return (
             <div key={key} className="mb-3 last:mb-0">
                 <div className="flex justify-between text-xs mb-1">
                     <span className="capitalize text-slate-600 dark:text-slate-300 font-medium">{key}</span>
                     <span className="text-slate-500">{val}</span>
                 </div>
                 <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                     <div className={`h-2 rounded-full ${colors[key]}`} style={{ width: `${pct}%` }}></div>
                 </div>
             </div>
         );
     });
  };

  // SVG Line Chart Logic
  const renderLineChart = () => {
      if (historyGraphData.length < 2) return <div className="text-center text-slate-400 text-sm py-8">Not enough data for trend graph</div>;

      const height = 60;
      const width = 100;
      const maxVal = Math.max(...historyGraphData.map(d => d.count), 1);
      
      const points = historyGraphData.map((d, i) => {
          const x = (i / (historyGraphData.length - 1)) * width;
          const y = height - (d.count / maxVal) * height;
          return `${x},${y}`;
      }).join(' ');

      return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
              {/* Fill Gradient */}
              <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                  </linearGradient>
              </defs>
              <path d={`M0,${height} ${points} ${width},${height}`} fill="url(#chartGradient)" />
              
              {/* Line */}
              <polyline points={points} fill="none" stroke="#0ea5e9" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Dots */}
              {historyGraphData.map((d, i) => {
                  const x = (i / (historyGraphData.length - 1)) * width;
                  const y = height - (d.count / maxVal) * height;
                  return (
                      <circle key={i} cx={x} cy={y} r="1.5" className="fill-white stroke-marine-600 dark:stroke-marine-400 hover:scale-150 transition-transform" strokeWidth="0.5" />
                  );
              })}
          </svg>
      );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="p-3 bg-slate-900 text-white rounded-lg">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">System overview and management portal.</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                        {loading ? '...' : stats.userCount}
                    </h3>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                    <Users size={20} />
                </div>
            </div>
            <Link to="/admin/users" className="text-xs font-medium text-blue-600 hover:text-blue-700">Manage Users &rarr;</Link>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Translations</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                        {loading ? '...' : stats.translationCount}
                    </h3>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                    <Database size={20} />
                </div>
            </div>
             <p className="text-xs text-slate-400"> across {stats.termCount} terms</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Open Appeals</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                        {loading ? '...' : stats.openAppeals}
                    </h3>
                </div>
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                    <AlertTriangle size={20} />
                </div>
            </div>
            <Link to="/admin/moderation" className="text-xs font-medium text-amber-600 hover:text-amber-700">Review Items &rarr;</Link>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Database</p>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                        Query Tool
                    </h3>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                    <Search size={20} />
                </div>
            </div>
            <Link to="/admin/query" className="text-xs font-medium text-purple-600 hover:text-purple-700">Run Queries &rarr;</Link>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Triplestore</p>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                        SPARQL
                    </h3>
                </div>
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                    <Box size={20} />
                </div>
            </div>
            <Link to="/admin/triplestore" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Query RDF &rarr;</Link>
        </div>
      </div>

      {/* Management Panels */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <DownloadCloud size={20} className="text-indigo-600" />
                        Harvest & Import
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Import terms from SPARQL endpoints, LDES feeds, or upload static files
                    </p>
                </div>
            </div>
            <Link to="/admin/harvest" className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                Manage Imports &rarr;
            </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers size={20} className="text-teal-600" />
                        Data Sources
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        View and manage all data sources (LDES feeds, static files, SPARQL)
                    </p>
                </div>
            </div>
            <Link to="/admin/sources" className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
                View Sources &rarr;
            </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-2">
             <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity size={20} className="text-purple-600" />
                        Background Tasks
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Monitor long-running tasks and manage task schedulers for automation
                    </p>
                </div>
            </div>
            <Link to="/admin/tasks" className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                View Tasks &rarr;
            </Link>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="grid md:grid-cols-3 gap-6">
          {/* Status Distribution */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                  <PieChart size={18} className="text-marine-500"/> Status Distribution
              </h3>
              {loading ? <div className="animate-pulse h-32 bg-slate-100 rounded"></div> : renderStatusBars()}
          </div>

          {/* Timeline Graph */}
          <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp size={18} className="text-marine-500"/> Contributions Over Time
                  </h3>
                  <select className="text-xs bg-slate-100 dark:bg-slate-700 border-none rounded px-2 py-1">
                      <option>Last 14 Days</option>
                  </select>
              </div>
              
              <div className="h-48 w-full">
                  {loading ? <div className="animate-pulse h-full bg-slate-100 rounded"></div> : renderLineChart()}
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                  {historyGraphData.filter((_, i) => i % 3 === 0).map(d => (
                      <span key={d.date}>{d.date}</span>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
