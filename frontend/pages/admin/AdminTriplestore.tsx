
import React, { useState, useEffect } from 'react';
import { backendApi } from '../../services/api';
import { ArrowLeft, Loader2, Database, Play, Code, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface PredefinedSparqlQuery {
  id: string;
  name: string;
  description: string;
  sparql: string;
}

interface SparqlQueryResult {
  results: any[];
  rowCount: number;
  query?: {
    id: string;
    name: string;
    description: string;
    sparql: string;
  };
  sparql?: string;
}

const AdminTriplestore: React.FC = () => {
  const [predefinedQueries, setPredefinedQueries] = useState<PredefinedSparqlQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<string>('');
  const [customSparql, setCustomSparql] = useState('');
  const [queryMode, setQueryMode] = useState<'predefined' | 'custom'>('predefined');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SparqlQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');

  useEffect(() => {
    fetchPredefinedQueries();
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await fetch(`${backendApi.baseUrl}/sparql/health`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        setHealthStatus('healthy');
      } else {
        setHealthStatus('unhealthy');
      }
    } catch (error) {
      setHealthStatus('unhealthy');
    }
  };

  const fetchPredefinedQueries = async () => {
    try {
      const response = await fetch(`${backendApi.baseUrl}/sparql/predefined`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch SPARQL queries');
      }
      
      const data = await response.json();
      setPredefinedQueries(data.queries || []);
    } catch (error: any) {
      console.error("Failed to fetch SPARQL queries", error);
      toast.error(`Failed to load queries: ${error.message}`);
    }
  };

  const executeQuery = async () => {
    if (queryMode === 'predefined' && !selectedQuery) {
      toast.error('Please select a query');
      return;
    }
    
    if (queryMode === 'custom' && !customSparql.trim()) {
      toast.error('Please enter a SPARQL query');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const endpoint = queryMode === 'predefined' ? '/sparql/execute' : '/sparql/custom';
      const body = queryMode === 'predefined' 
        ? { queryId: selectedQuery }
        : { sparql: customSparql };

      const response = await fetch(`${backendApi.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query execution failed');
      }

      const data = await response.json();
      setResults(data);
      toast.success(`Query executed successfully - ${data.rowCount} rows returned`);
    } catch (error: any) {
      console.error("SPARQL query execution failed", error);
      setError(error.message);
      toast.error(`Query failed: ${error.message}`);
    } finally {
      setLoading(false);
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
                  <td key={col} className="px-4 py-2 text-slate-700 dark:text-slate-300 break-all max-w-md">
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
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Triplestore Query Tool</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Execute SPARQL queries on the GraphDB triplestore
            </p>
          </div>
        </div>

        {/* Health Status */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
          <Activity size={16} className={healthStatus === 'healthy' ? 'text-green-500' : 'text-red-500'} />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            GraphDB: {healthStatus === 'healthy' ? 'Connected' : healthStatus === 'unhealthy' ? 'Disconnected' : 'Checking...'}
          </span>
        </div>
      </div>

      {/* Query Mode Tabs */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-2">
          <button
            onClick={() => setQueryMode('predefined')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              queryMode === 'predefined'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database size={18} />
            Predefined Queries
          </button>
          <button
            onClick={() => setQueryMode('custom')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              queryMode === 'custom'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code size={18} />
            Custom SPARQL
          </button>
        </nav>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Query Input */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Query Input</h2>
          
          {queryMode === 'predefined' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Query
              </label>
              <select
                value={selectedQuery}
                onChange={(e) => setSelectedQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                disabled={loading}
              >
                <option value="">-- Select a SPARQL query --</option>
                {predefinedQueries.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>

              {selectedQuery && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {predefinedQueries.find(q => q.id === selectedQuery)?.description}
                  </p>
                  <pre className="text-xs text-slate-700 dark:text-slate-300 font-mono overflow-x-auto p-2 bg-white dark:bg-slate-800 rounded whitespace-pre-wrap">
                    {predefinedQueries.find(q => q.id === selectedQuery)?.sparql}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                SPARQL Query (SELECT, DESCRIBE, ASK, CONSTRUCT)
              </label>
              <textarea
                value={customSparql}
                onChange={(e) => setCustomSparql(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                rows={12}
                placeholder={`SELECT ?s ?p ?o\nWHERE {\n  ?s ?p ?o .\n}\nLIMIT 10`}
                disabled={loading}
              />
              <p className="mt-2 text-xs text-slate-500">
                Only SELECT, DESCRIBE, ASK, and CONSTRUCT queries are allowed
              </p>
            </div>
          )}

          <button
            onClick={executeQuery}
            disabled={loading || (queryMode === 'predefined' && !selectedQuery) || (queryMode === 'custom' && !customSparql.trim())}
            className={`w-full mt-4 px-6 py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors ${
              loading || (queryMode === 'predefined' && !selectedQuery) || (queryMode === 'custom' && !customSparql.trim())
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
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
                Execute SPARQL Query
              </>
            )}
          </button>
        </div>

        {/* Query Results */}
        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Database size={18} className="text-indigo-500" />
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
                      Query: {results.query.name}
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
                <Database size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select and execute a SPARQL query to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTriplestore;
