import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Database,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Save,
  RefreshCw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Source {
  source_id: number;
  source_path: string;
  graph_name: string;
  source_type: string;
  created_at: string;
  last_modified: string;
  translation_config?: TranslationConfig;
}

interface RDFType {
  type: string;
  count: number;
}

interface Predicate {
  predicate: string;
  count: number;
  sampleValue: string;
  sampleType: string;
}

interface PredicateObject {
  value: string;
  type: string;
  count: number;
}

interface PredicatePath {
  path: string;
  label: string;
  isTranslatable: boolean;
}

interface TypeConfig {
  type: string;
  paths: PredicatePath[];
}

interface TranslationConfig {
  types: TypeConfig[];
}

export default function AdminSourceDetail() {
  const { id } = useParams<{ id: string }>();
  const [source, setSource] = useState<Source | null>(null);
  const [types, setTypes] = useState<RDFType[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [predicates, setPredicates] = useState<Predicate[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<PredicatePath[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [nestedPredicates, setNestedPredicates] = useState<Map<string, Predicate[]>>(new Map());
  
  const [loading, setLoading] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingPredicates, setLoadingPredicates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSource();
  }, [id]);

  useEffect(() => {
    if (source && source.graph_name) {
      loadRDFTypes();
    }
  }, [source]);

  useEffect(() => {
    if (selectedType) {
      loadPredicates(selectedType);
    }
  }, [selectedType]);

  const loadSource = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/sources/${id}`);
      setSource(response.data);
      
      // Load existing configuration
      if (response.data.translation_config) {
        const config = typeof response.data.translation_config === 'string' 
          ? JSON.parse(response.data.translation_config)
          : response.data.translation_config;
        
        if (config.types && config.types.length > 0) {
          setSelectedType(config.types[0].type);
          setSelectedPaths(config.types[0].paths || []);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load source');
    } finally {
      setLoading(false);
    }
  };

  const loadRDFTypes = async () => {
    setLoadingTypes(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/sources/${id}/types`);
      setTypes(response.data.types);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load RDF types');
    } finally {
      setLoadingTypes(false);
    }
  };

  const loadPredicates = async (rdfType: string, parentPath: string[] = []) => {
    setLoadingPredicates(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/sources/${id}/predicates`, {
        params: { type: rdfType }
      });
      
      if (parentPath.length === 0) {
        setPredicates(response.data.predicates);
      } else {
        const key = parentPath.join('/');
        setNestedPredicates(new Map(nestedPredicates.set(key, response.data.predicates)));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load predicates');
    } finally {
      setLoadingPredicates(false);
    }
  };

  const checkPredicateObjects = async (predicate: string) => {
    if (!selectedType) return;
    
    try {
      const response = await axios.get(`${API_URL}/sources/${id}/predicate-objects`, {
        params: { type: selectedType, predicate }
      });
      
      return response.data;
    } catch (err: any) {
      console.error('Failed to check predicate objects:', err);
      return null;
    }
  };

  const handlePredicateSelect = async (predicate: Predicate) => {
    const objectInfo = await checkPredicateObjects(predicate.predicate);
    
    if (!objectInfo) return;
    
    if (objectInfo.isTranslatable) {
      // Add to selected paths
      const newPath: PredicatePath = {
        path: predicate.predicate,
        label: predicate.predicate.split('/').pop() || predicate.predicate,
        isTranslatable: true
      };
      
      if (!selectedPaths.find(p => p.path === newPath.path)) {
        setSelectedPaths([...selectedPaths, newPath]);
        setSuccess(`Added ${newPath.label} to translation paths`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } else if (objectInfo.allUris) {
      // Drill down into nested predicates
      setCurrentPath([...currentPath, predicate.predicate]);
      // TODO: Implement nested navigation
      setSuccess('Nested URI objects detected. Feature coming soon.');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleRemovePath = (path: string) => {
    setSelectedPaths(selectedPaths.filter(p => p.path !== path));
  };

  const handleSaveConfiguration = async () => {
    if (!selectedType) {
      setError('No RDF type selected');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const config: TranslationConfig = {
        types: [{
          type: selectedType,
          paths: selectedPaths
        }]
      };
      
      await axios.put(`${API_URL}/sources/${id}/config`, { config });
      setSuccess('Configuration saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncTerms = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(`${API_URL}/sources/${id}/sync-terms`);
      setSuccess(response.data.message);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to synchronize terms');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Source not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/sources"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Sources
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="w-6 h-6" />
              Source Detail
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Configure translation paths for RDF data
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSaveConfiguration}
              disabled={saving || selectedPaths.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration
            </button>
            
            <button
              onClick={handleSyncTerms}
              disabled={syncing || !source.translation_config}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Terms
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-2">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Source Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Source Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Source ID:</span>
            <span className="ml-2 text-gray-900 dark:text-white font-mono">{source.source_id}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Type:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{source.source_type}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600 dark:text-gray-400">Path:</span>
            <span className="ml-2 text-gray-900 dark:text-white font-mono break-all">{source.source_path}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600 dark:text-gray-400">Graph Name:</span>
            <span className="ml-2 text-blue-600 dark:text-blue-400 font-mono break-all">{source.graph_name || 'N/A'}</span>
          </div>
        </div>
      </div>

      {!source.graph_name ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            This source has no graph name specified. Translation configuration requires a graph name.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Left Panel: RDF Types */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              RDF Types
              {loadingTypes && <Loader2 className="inline w-4 h-4 ml-2 animate-spin" />}
            </h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {types.map((type) => (
                <button
                  key={type.type}
                  onClick={() => setSelectedType(type.type)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    selectedType === type.type
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-gray-900 dark:text-white truncate flex-1">
                      {type.type.split('/').pop() || type.type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {type.count}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {type.type}
                  </div>
                </button>
              ))}
              
              {types.length === 0 && !loadingTypes && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No RDF types found in this graph
                </p>
              )}
            </div>
          </div>

          {/* Right Panel: Predicates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Predicates
              {loadingPredicates && <Loader2 className="inline w-4 h-4 ml-2 animate-spin" />}
            </h2>
            
            {!selectedType ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                Select an RDF type to view its predicates
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {predicates.map((pred) => (
                  <button
                    key={pred.predicate}
                    onClick={() => handlePredicateSelect(pred)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-gray-900 dark:text-white truncate flex-1">
                        {pred.predicate.split('/').pop() || pred.predicate}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {pred.count}
                        </span>
                        {pred.sampleType === 'literal' && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                            Literal
                          </span>
                        )}
                        {pred.sampleType === 'uri' && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            URI
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {pred.predicate}
                    </div>
                  </button>
                ))}
                
                {predicates.length === 0 && !loadingPredicates && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No predicates found for this type
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Paths */}
      {selectedPaths.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Selected Translation Paths ({selectedPaths.length})
          </h2>
          
          <div className="space-y-2">
            {selectedPaths.map((path) => (
              <div
                key={path.path}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white">
                    {path.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {path.path}
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePath(path.path)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
