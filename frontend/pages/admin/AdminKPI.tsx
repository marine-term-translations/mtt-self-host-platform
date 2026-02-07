
import React, { useState, useEffect } from 'react';
import { backendApi } from '../../services/api';
import { ArrowLeft, Loader2, Play, Download, FileArchive, TrendingUp, CheckCircle, AlertCircle, Database } from 'lucide-react';
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

      // Get the filename from the Content-Disposition header
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

      // Get the filename from the Content-Disposition header
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

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) {
      return <div className="text-center text-slate-400 py-8">No results</div>;
    }

    const columns = Object.keys(data[0]);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-400">NULL</span>}
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
              Key Performance Indicators - Predefined queries for system insights
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

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Query Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
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

        {/* Query Results */}
        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-marine-500" />
            Query Results
          </h2>

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
              <div>
                <div className="bg-slate-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle size={18} />
                    <span className="font-medium">Success</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    Returned <strong>{results.rowCount}</strong> row{results.rowCount !== 1 ? 's' : ''}
                  </p>
                  {results.query && (
                    <p className="text-xs text-slate-400 mt-1">
                      Query: {results.query.name} ({results.query.type.toUpperCase()})
                    </p>
                  )}
                </div>

                <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-auto">
                  {renderTable(results.results)}
                </div>
              </div>
            )}

            {!results && !error && !loading && (
              <div className="text-center text-slate-500 py-12">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p className="mb-2">Select and execute a KPI query to see results</p>
                <p className="text-xs text-slate-600">
                  Or download the complete KPI report with all queries as a ZIP file
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
