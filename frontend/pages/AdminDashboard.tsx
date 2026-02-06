
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Database, AlertTriangle, TrendingUp, Activity, PieChart, DownloadCloud, Layers, Search, Box, Languages, Target } from 'lucide-react';
import { backendApi } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface ContributionData {
  date: string;
  byStatus: Record<string, number>;
  total: number;
}

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    userCount: 0,
    termCount: 0,
    translationCount: 0,
    openAppeals: 0,
  });
  const [statusDist, setStatusDist] = useState<Record<string, number>>({});
  const [historyGraphData, setHistoryGraphData] = useState<ContributionData[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('last_14_days');

  const fetchContributionsOverTime = React.useCallback(async (timeframe: string) => {
    try {
      const data = await backendApi.get<{ timeframe: string; data: ContributionData[] }>(
        '/stats/contributions-over-time',
        { timeframe }
      );
      setHistoryGraphData(data.data);
    } catch (error) {
      console.error("Failed to fetch contributions over time", error);
      toast.error("Failed to load contribution history");
    }
  }, []);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const [users, statsData, appeals] = await Promise.all([
           backendApi.getUsers(),
           backendApi.getStats(),
           backendApi.getAppeals()
        ]);

        // 1. Counts
        const openAppeals = appeals.filter(a => a.status === 'open').length;
        
        // 2. Status Distribution from stats endpoint (already excludes 'original')
        const dist = statsData.byStatus || { merged: 0, approved: 0, review: 0, draft: 0, rejected: 0 };

        setStats({
            userCount: users.length,
            termCount: statsData.totalTerms,
            translationCount: statsData.totalTranslations,
            openAppeals
        });
        setStatusDist(dist);
        
        // 3. Fetch contributions over time
        await fetchContributionsOverTime(selectedTimeframe);

      } catch (error) {
        console.error("Admin fetch error", error);
        toast.error("Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [selectedTimeframe, fetchContributionsOverTime]);

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

  // Helper function to format date labels
  const formatDateLabel = (dateStr: string): string => {
    // Handle both date-only (YYYY-MM-DD) and datetime (YYYY-MM-DD HH:MM:SS) formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // If parsing fails, return the first part before 'T' or space
      return dateStr.split(/[T ]/)[0];
    }
    
    // Check if it includes time (hourly grouping)
    if (dateStr.includes(':')) {
      // Format as "MM-DD HH:mm"
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${month}-${day} ${hours}:${minutes}`;
    } else {
      // Format as "MM-DD" for daily grouping
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}-${day}`;
    }
  };

  // Stacked Bar Chart for Contributions Over Time
  const renderStackedBarChart = () => {
      if (historyGraphData.length === 0) {
        return <div className="text-center text-slate-400 text-sm py-8">No data available for this timeframe</div>;
      }

      // Maximum number of x-axis labels to display
      const MAX_X_AXIS_LABELS = 7;
      
      const statusOrder = ['merged', 'approved', 'review', 'draft', 'rejected'];
      const colors: Record<string, string> = {
          merged: '#a855f7',      // purple-500
          approved: '#22c55e',    // green-500
          review: '#f59e0b',      // amber-500
          draft: '#94a3b8',       // slate-400
          rejected: '#ef4444'     // red-500
      };
      
      // Find max total for scaling
      const maxTotal = Math.max(...historyGraphData.map(d => d.total), 1);
      
      // Calculate bar width based on number of data points
      const barGap = 4; // Gap between bars in pixels
      const minBarWidth = 8; // Minimum bar width
      const maxBarWidth = 60; // Maximum bar width
      const availableWidth = 100; // Percentage-based width
      const totalBars = historyGraphData.length;
      
      return (
        <div className="relative">
          <div className="flex items-end justify-between gap-1 h-48">
            {historyGraphData.map((dataPoint, idx) => {
              const barHeightPct = (dataPoint.total / maxTotal) * 100;
              
              return (
                <div key={idx} className="flex-1 flex flex-col justify-end group relative" style={{ minWidth: `${minBarWidth}px`, maxWidth: `${maxBarWidth}px` }}>
                  {/* Stacked segments */}
                  <div 
                    className="w-full rounded-t transition-all duration-300 hover:opacity-90"
                    style={{ height: `${barHeightPct}%` }}
                  >
                    {statusOrder.map(status => {
                      const count = dataPoint.byStatus[status] || 0;
                      if (count === 0) return null;
                      
                      const segmentHeightPct = (count / dataPoint.total) * 100;
                      
                      return (
                        <div
                          key={status}
                          className="w-full transition-all hover:brightness-110"
                          style={{ 
                            height: `${segmentHeightPct}%`,
                            backgroundColor: colors[status]
                          }}
                          title={`${status}: ${count}`}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap shadow-lg">
                      <div className="font-semibold mb-1">{dataPoint.date}</div>
                      <div className="font-bold text-marine-400 mb-1">Total: {dataPoint.total}</div>
                      {statusOrder.map(status => {
                        const count = dataPoint.byStatus[status] || 0;
                        if (count === 0) return null;
                        return (
                          <div key={status} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors[status] }}></div>
                            <span className="capitalize">{status}: {count}</span>
                          </div>
                        );
                      })}
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
            {historyGraphData
              .filter((_, i) => {
                // Show fewer labels for better readability based on data points
                const step = Math.ceil(historyGraphData.length / MAX_X_AXIS_LABELS);
                return i % step === 0 || i === historyGraphData.length - 1;
              })
              .map((d, idx) => (
                <span key={idx} className="truncate">{formatDateLabel(d.date)}</span>
              ))}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center mt-4 text-xs">
            {statusOrder.map(status => (
              <div key={status} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[status] }}></div>
                <span className="capitalize text-slate-600 dark:text-slate-300">{status}</span>
              </div>
            ))}
          </div>
        </div>
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
            <Link to="/admin/translations" className="text-xs font-medium text-green-600 hover:text-green-700">Manage Translations &rarr;</Link>
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

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target size={20} className="text-blue-600" />
                        Community Goals
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Create and manage community-wide translation goals and challenges
                    </p>
                </div>
            </div>
            <Link to="/admin/community-goals" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                Manage Goals &rarr;
            </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
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
                  <select 
                    className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-marine-500"
                    value={selectedTimeframe}
                    onChange={(e) => setSelectedTimeframe(e.target.value)}
                  >
                      <option value="last_hour">Last Hour</option>
                      <option value="last_week">Last Week</option>
                      <option value="last_14_days">Last 14 Days</option>
                      <option value="last_month">Last Month</option>
                      <option value="all_time">All Time</option>
                  </select>
              </div>
              
              <div className="w-full">
                  {loading ? <div className="animate-pulse h-48 bg-slate-100 rounded"></div> : renderStackedBarChart()}
              </div>
          </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
