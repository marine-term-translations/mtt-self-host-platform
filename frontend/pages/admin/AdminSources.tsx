
import React, { useState, useEffect } from 'react';
import { backendApi } from '../../services/api';
import { ArrowLeft, Loader2, Layers, Rss, Upload, Database, Calendar, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Source {
  source_id: number;
  source_path: string;
  source_type: 'LDES' | 'Static_file';
  graph_name: string | null;
  created_at: string;
  last_modified: string;
}

const AdminSources: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendApi.baseUrl}/sources`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch sources');
      }
      
      const data = await response.json();
      setSources(data.sources || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      console.error("Failed to fetch sources", error);
      toast.error(`Failed to load sources: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'LDES':
        return <Rss size={18} className="text-blue-500" />;
      case 'Static_file':
        return <Upload size={18} className="text-green-500" />;
      default:
        return <Database size={18} className="text-slate-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'LDES':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'Static_file':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
         <div className="p-3 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
            <Layers size={24} />
         </div>
         <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Data Sources</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage all data sources including LDES feeds and static files
            </p>
         </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Sources</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : total}
              </h3>
            </div>
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-lg">
              <Layers size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">LDES Feeds</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : sources.filter(s => s.source_type === 'LDES').length}
              </h3>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <Rss size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Static Files</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : sources.filter(s => s.source_type === 'Static_file').length}
              </h3>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
              <Upload size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">All Sources</h2>
        <Link 
          to="/admin/harvest" 
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Layers size={16} />
          Add New Source
        </Link>
      </div>

      {/* Sources List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-marine-500" />
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-16">
            <Layers size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No sources yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Start by adding a new data source
            </p>
            <Link 
              to="/admin/harvest" 
              className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add First Source
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Source Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Graph Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sources.map((source) => (
                  <tr key={source.source_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      #{source.source_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(source.source_type)}`}>
                        {getTypeIcon(source.source_type)}
                        {source.source_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-300">
                      <div className="flex items-center gap-2 max-w-md">
                        <span className="truncate">{source.source_path}</span>
                        {source.source_type === 'LDES' && (
                          <a 
                            href={source.source_path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {source.graph_name || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(source.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSources;
