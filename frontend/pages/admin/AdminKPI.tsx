
import React, { useState, useEffect } from 'react';
import { backendApi } from '../../services/api';
import { 
  ArrowLeft, 
  Loader2, 
  Play, 
  Download, 
  FileArchive, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Database,
  BarChart3,
  Table as TableIcon,
  Users as UsersIcon,
  Activity,
  Calculator,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface KPIQuery {
  id: string;
  name: string;
  description: string;
  type: 'sql' | 'sparql';
}

interface QueryResult {
  results: any[];
  rowCount: number;
  query?: {
    id: string;
    name: string;
    description: string;
    type: string;
  };
}

const AdminKPI: React.FC = () => {
  const [queries, setQueries] = useState<KPIQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      const response = await fetch(`${backendApi.baseUrl}/kpi/queries`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch KPI queries');
      }
      
      const data = await response.json();
      setQueries(data.queries || []);
    } catch (error: any) {
      console.error("Failed to fetch KPI queries", error);
      toast.error(`Failed to load KPI queries: ${error.message}`);
    }
  };

  const executeQuery = async () => {
    if (!selectedQuery) {
      toast.error('Please select a query');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${backendApi.baseUrl}/kpi/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ queryId: selectedQuery })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query execution failed');
      }

      const data = await response.json();
      setResults(data);
      toast.success(`Query executed successfully - ${data.rowCount} rows returned`);
    } catch (error: any) {
      console.error("Query execution failed", error);
      setError(error.message);
      toast.error(`Query failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    if (!selectedQuery) {
      toast.error('Please select a query');
      return;
    }

    try {
      const response = await fetch(`${backendApi.baseUrl}/kpi/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ queryId: selectedQuery })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${selectedQuery}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('CSV downloaded successfully');
    } catch (error: any) {
      console.error("CSV download failed", error);
      toast.error(`Download failed: ${error.message}`);
    }
  };

  const downloadKPIReport = async () => {
    setDownloadingReport(true);
    
    try {
      toast.loading('Generating KPI report...', { id: 'kpi-report' });
      
      const response = await fetch(`${backendApi.baseUrl}/kpi/download-report`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Report generation failed');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'kpi_report.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('KPI report downloaded successfully', { id: 'kpi-report' });
    } catch (error: any) {
      console.error("KPI report download failed", error);
      toast.error(`Report generation failed: ${error.message}`, { id: 'kpi-report' });
    } finally {
      setDownloadingReport(false);
    }
  };

  // --- Visual Chart Renderers ---

  // 1. Translation Status by Month
  const renderTranslationStatusChart = (data: any[]) => {
    const monthsMap: Record<string, Record<string, number>> = {};
    
    data.forEach(row => {
      const month = row.month || 'Unknown';
      const status = row.status || 'other';
      const count = Number(row.count) || 0;
      
      if (!monthsMap[month]) {
        monthsMap[month] = { approved: 0, merged: 0, review: 0, draft: 0, rejected: 0, total: 0 };
      }
      monthsMap[month][status] = (monthsMap[month][status] || 0) + count;
      monthsMap[month].total = (monthsMap[month].total || 0) + count;
    });

    const chartData = Object.keys(monthsMap).sort().map(m => ({
      month: m,
      ...monthsMap[m]
    }));

    return (
      <div className="space-y-4">
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="approved" stackId="a" fill="#10b981" name="Approved" />
              <Bar dataKey="merged" stackId="a" fill="#a855f7" name="Merged" />
              <Bar dataKey="review" stackId="a" fill="#0ea5e9" name="In Review" />
              <Bar dataKey="rejected" stackId="a" fill="#f43f5e" name="Rejected" />
              <Bar dataKey="draft" stackId="a" fill="#94a3b8" name="Draft" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // 2. User Behavior Statistics
  const renderUserBehaviorChart = (data: any[]) => {
    const monthsMap: Record<string, Record<string, number>> = {};
    
    data.forEach(row => {
      const month = row.month || 'Unknown';
      const event = row.event_type || 'other';
      const count = Number(row.count) || 0;
      
      if (!monthsMap[month]) {
        monthsMap[month] = { ban: 0, appeal: 0, report: 0 };
      }
      monthsMap[month][event] = (monthsMap[month][event] || 0) + count;
    });

    const chartData = Object.keys(monthsMap).sort().map(m => ({
      month: m,
      bans: monthsMap[m].ban || 0,
      appeals: monthsMap[m].appeal || 0,
      reports: monthsMap[m].report || 0
    }));

    return (
      <div className="space-y-4">
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="bans" fill="#ef4444" name="Bans" radius={[4, 4, 0, 0]} />
              <Bar dataKey="appeals" fill="#6366f1" name="Appeals" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reports" fill="#f59e0b" name="Reports" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // 3. Triplestore Named Graphs
  const renderNamedGraphsChart = (data: any[]) => {
    const chartData = data.slice(0, 15).map(row => {
      const graphUri = String(row.graph || 'Unknown');
      const shortName = graphUri.split(/[/#]/).filter(Boolean).pop() || graphUri;
      return {
        name: shortName,
        fullName: graphUri,
        tripleCount: Number(row.tripleCount) || 0
      };
    });

    return (
      <div className="space-y-4">
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={100} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
                formatter={(value: any) => [Number(value).toLocaleString() + ' triples', 'Count']}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Bar dataKey="tripleCount" fill="#0d9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // 4. User Translation Statistics
  const renderUserTranslationStats = (data: any[]) => {
    const firstRow = data[0] || {};
    const avg = firstRow.average_translations ?? 'N/A';
    const median = firstRow.median_translations ?? 'N/A';
    const stdDev = firstRow.standard_deviation ?? 'N/A';
    const totalUsers = firstRow.total_users ?? data.length;

    const topContributors = data
      .filter(d => (Number(d.translation_count) || 0) > 0)
      .slice(0, 15)
      .map(d => ({
        username: d.username || 'Anonymous',
        count: Number(d.translation_count) || 0,
        zScore: d.z_score
      }));

    return (
      <div className="space-y-6">
        {/* Statistical Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium mb-1">
              <Calculator size={14} />
              <span>Mean / User</span>
            </div>
            <div className="text-xl font-bold text-white">{avg}</div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium mb-1">
              <Activity size={14} />
              <span>Median</span>
            </div>
            <div className="text-xl font-bold text-white">{median}</div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium mb-1">
              <TrendingUp size={14} />
              <span>Std Deviation</span>
            </div>
            <div className="text-xl font-bold text-white">{stdDev}</div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium mb-1">
              <UsersIcon size={14} />
              <span>Total Users</span>
            </div>
            <div className="text-xl font-bold text-white">{totalUsers}</div>
          </div>
        </div>

        {/* Top Contributors Chart */}
        <div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Top 15 Translators by Volume
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topContributors} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} vertical={false} />
                <XAxis dataKey="username" stroke="#94a3b8" fontSize={10} angle={-35} textAnchor="end" interval={0} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any, name: any, item: any) => [
                    `${value} translations (z-score: ${item.payload.zScore})`,
                    'Contributions'
                  ]}
                />
                <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]}>
                  {topContributors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#38bdf8' : index < 3 ? '#818cf8' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // 5. Generic Fallback Chart for Other Queries
  const renderGenericChart = (data: any[]) => {
    if (!data || data.length === 0) return null;
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    // Find first string-like key for category and numeric keys
    const categoryKey = keys.find(k => typeof firstRow[k] === 'string') || keys[0];
    const numericKeys = keys.filter(k => k !== categoryKey && typeof firstRow[k] === 'number' || !isNaN(Number(firstRow[k])));

    if (numericKeys.length === 0) {
      return (
        <div className="text-center text-slate-400 py-12 text-sm">
          No numeric columns found to generate chart visualization. Use Table View to view results.
        </div>
      );
    }

    const chartData = data.slice(0, 20).map(row => {
      const item: any = { [categoryKey]: String(row[categoryKey]) };
      numericKeys.forEach(nk => {
        item[nk] = Number(row[nk]) || 0;
      });
      return item;
    });

    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    return (
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} vertical={false} />
            <XAxis dataKey={categoryKey} stroke="#94a3b8" fontSize={10} angle={-30} textAnchor="end" />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }} />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            {numericKeys.map((nk, idx) => (
              <Bar key={nk} dataKey={nk} fill={colors[idx % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Dispatch appropriate visualization based on query ID
  const renderVisualization = () => {
    if (!results || !results.results || results.results.length === 0) {
      return <div className="text-center text-slate-400 py-8">No results to visualize</div>;
    }

    const qId = results.query?.id || selectedQuery;

    switch (qId) {
      case 'translation_status_by_month':
        return renderTranslationStatusChart(results.results);
      case 'user_behavior_statistics':
        return renderUserBehaviorChart(results.results);
      case 'triplestore_named_graphs':
        return renderNamedGraphsChart(results.results);
      case 'user_translation_statistics':
        return renderUserTranslationStats(results.results);
      default:
        return renderGenericChart(results.results);
    }
  };

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) {
      return <div className="text-center text-slate-400 py-8">No results</div>;
    }

    const columns = Object.keys(data[0]);

    return (
      <div className="overflow-x-auto rounded-lg border border-slate-700/60">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/50">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-800/60 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-slate-300 text-xs">
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-500">NULL</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-marine-100 dark:bg-marine-900/30 text-marine-600 dark:text-marine-400 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">KPI's</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Key Performance Indicators - Visual analytics and predefined queries
            </p>
          </div>
        </div>

        {/* Download KPI Report Button */}
        <button
          onClick={downloadKPIReport}
          disabled={downloadingReport}
          className={`px-6 py-2.5 rounded-lg font-medium text-white flex items-center gap-2 transition-colors ${
            downloadingReport
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-marine-600 to-marine-700 hover:from-marine-700 hover:to-marine-800 shadow-sm'
          }`}
        >
          {downloadingReport ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileArchive size={18} />
              Download KPI Report
            </>
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Query Selection (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-fit">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Select KPI Query</h2>
          
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Available KPI Queries
          </label>
          <select
            value={selectedQuery}
            onChange={(e) => setSelectedQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none mb-4"
            disabled={loading}
          >
            <option value="">-- Select a KPI query --</option>
            {queries.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>

          {selectedQuery && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Database size={16} className={queries.find(q => q.id === selectedQuery)?.type === 'sparql' ? 'text-indigo-600' : 'text-purple-600'} />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                  {queries.find(q => q.id === selectedQuery)?.type === 'sparql' ? 'SPARQL Query' : 'SQL Query'}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {queries.find(q => q.id === selectedQuery)?.description}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={executeQuery}
              disabled={loading || !selectedQuery}
              className={`flex-1 px-6 py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors ${
                loading || !selectedQuery
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-marine-600 hover:bg-marine-700 shadow-sm'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Execute Query
                </>
              )}
            </button>

            <button
              onClick={downloadCSV}
              disabled={!selectedQuery}
              className={`px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                !selectedQuery
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600'
              }`}
            >
              <Download size={18} />
              CSV
            </button>
          </div>
        </div>

        {/* Query Results & Visualizations (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 flex flex-col min-h-[480px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp size={18} className="text-marine-500" />
              {results?.query?.name || 'Query Results'}
            </h2>

            {/* View Mode Toggle */}
            {results && (
              <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700/80">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'chart' 
                      ? 'bg-marine-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BarChart3 size={14} /> Chart View
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'table' 
                      ? 'bg-marine-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TableIcon size={14} /> Table View
                </button>
              </div>
            )}
          </div>

          <div className="flex-grow overflow-auto">
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={18} />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm text-red-300 mt-2">{error}</p>
              </div>
            )}

            {results && (
              <div className="space-y-4">
                {/* Result Status Meta */}
                <div className="bg-slate-800/50 rounded-lg px-4 py-2.5 flex items-center justify-between border border-slate-800">
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <CheckCircle size={14} />
                    <span className="font-medium">Query Executed</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Returned <strong className="text-slate-200">{results.rowCount}</strong> row{results.rowCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* View Content */}
                {viewMode === 'chart' ? (
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-800/80">
                    {renderVisualization()}
                  </div>
                ) : (
                  <div className="max-h-[460px] overflow-auto">
                    {renderTable(results.results)}
                  </div>
                )}
              </div>
            )}

            {!results && !error && !loading && (
              <div className="text-center text-slate-500 py-16">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-40" />
                <p className="text-base font-medium text-slate-400 mb-1">Select and execute a KPI query</p>
                <p className="text-xs text-slate-500">
                  Results will display with automated visual charts and statistical breakdowns.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminKPI;
