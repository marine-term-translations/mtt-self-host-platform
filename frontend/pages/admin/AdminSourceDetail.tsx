import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { backendApi } from '../../services/api';
import SourceConfigWizard from '../../components/SourceConfigWizard';
import {
  ArrowLeft,
  Database,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Save,
  RefreshCw,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Container,
  Play,
  FileText
} from 'lucide-react';
import { format, parse } from '@/src/utils/datetime';

const API_URL = backendApi.baseUrl;

interface DockerContainerState {
  Running: boolean;
  Paused: boolean;
  Restarting: boolean;
  OOMKilled: boolean;
  Dead: boolean;
  Pid: number;
  ExitCode: number;
  Error: string;
  StartedAt: string;
  FinishedAt: string;
}

interface ContainerStatus {
  exists: boolean;
  running: boolean;
  status: string;
  state: DockerContainerState;
  created: string;
  containerName?: string;
}

interface Source {
  source_id: number;
  source_path: string;
  graph_name: string;
  source_type: string;
  description: string | null;
  created_at: string;
  last_modified: string;
  translation_config?: TranslationConfig;
  containerStatus?: ContainerStatus | null;
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
  languages?: string[]; // Available language tags for this predicate
}

interface PredicateObject {
  value: string;
  type: string;
  count: number;
  language?: string; // Language tag if present
}

interface PredicatePath {
  path: string;
  label: string;
  isTranslatable: boolean;
  role?: 'label' | 'reference' | 'translatable'; // New field role
  languageTag?: string; // Per-path language tag
  availableLanguages?: string[]; // Available languages for this path
}

interface TypeConfig {
  type: string;
  paths: PredicatePath[];
}

interface TranslationConfig {
  types: TypeConfig[];
  labelField?: string; // New
  referenceFields?: string[]; // New
  translatableFields?: string[]; // New
  languageTag?: string; // Global fallback (deprecated, use per-path instead)
}

interface Task {
  task_id: number;
  task_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export default function AdminSourceDetail() {
  const { id } = useParams<{ id: string }>();
  const [source, setSource] = useState<Source | null>(null);
  const [types, setTypes] = useState<RDFType[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [predicates, setPredicates] = useState<Predicate[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<PredicatePath[]>([]);
  const [labelField, setLabelField] = useState<string | null>(null);
  const [referenceFields, setReferenceFields] = useState<string[]>([]);
  const [translatableFields, setTranslatableFields] = useState<string[]>([]);
  const [languageTag, setLanguageTag] = useState<string | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [nestedPredicates, setNestedPredicates] = useState<Map<string, Predicate[]>>(new Map());
  const [runningTask, setRunningTask] = useState<Task | null>(null);
  const [containerLogs, setContainerLogs] = useState<string>('');
  const [showLogs, setShowLogs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [restartingContainer, setRestartingContainer] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingPredicates, setLoadingPredicates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWizard, setShowWizard] = useState(false);

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
      
      // Load running tasks for this source
      try {
        const tasksResponse = await axios.get(`${API_URL}/sources/${id}/tasks?status=running`);
        setRunningTask(tasksResponse.data.running_task || null);
      } catch (taskErr) {
        console.error('Failed to load tasks:', taskErr);
      }
      
      // Load existing configuration
      if (response.data.translation_config) {
        const config = typeof response.data.translation_config === 'string' 
          ? JSON.parse(response.data.translation_config)
          : response.data.translation_config;
        
        if (config.types && config.types.length > 0) {
          setSelectedType(config.types[0].type);
          setSelectedPaths(config.types[0].paths || []);
        }
        
        // Load field configurations
        if (config.labelField) {
          setLabelField(config.labelField);
        }
        if (config.referenceFields) {
          setReferenceFields(config.referenceFields);
        }
        
        // Load language tag if set
        if (config.languageTag) {
          setLanguageTag(config.languageTag);
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
        params: { type: selectedType, predicate, languageTag }
      });
      
      // Extract language tags from response
      const languages = new Set<string>();
      response.data.objects.forEach((obj: PredicateObject) => {
        if (obj.language) {
          languages.add('@' + obj.language);
        }
      });
      
      if (languages.size > 0) {
        setAvailableLanguages(Array.from(languages));
      } else {
        setAvailableLanguages([]);
      }
      
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
      // Add to selected paths with language information
      const newPath: PredicatePath = {
        path: predicate.predicate,
        label: predicate.predicate.split('/').pop() || predicate.predicate,
        isTranslatable: true,
        languageTag: predicate.languages && predicate.languages.length > 0 ? predicate.languages[0] : undefined,
        availableLanguages: predicate.languages
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
    
    if (!labelField) {
      setError('Please select a label field');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // All selected paths are translatable (no "no translation" option)
      const actualTranslatableFields = selectedPaths.map(p => p.path);
      
      const config: TranslationConfig = {
        types: [{
          type: selectedType,
          paths: selectedPaths
        }],
        labelField: labelField || undefined,
        referenceFields: referenceFields.length > 0 ? referenceFields : undefined,
        translatableFields: actualTranslatableFields.length > 0 ? actualTranslatableFields : undefined
      };
      
      await axios.put(`${API_URL}/sources/${id}/config`, { config });
      setSuccess('Configuration saved successfully');
      
      // Reload source details to reflect updated configuration
      await loadSource();
      
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
      
      if (response.data.task_id) {
        setSuccess(`Synchronization task #${response.data.task_id} started. Check the Tasks page for progress.`);
        // Reload the source to show the running task
        loadSource();
      } else {
        setSuccess(response.data.message || 'Synchronization started');
      }
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start synchronization task');
    } finally {
      setSyncing(false);
    }
  };

  const handleLoadContainerLogs = async () => {
    if (!source?.containerStatus?.containerName) return;
    
    setLoadingLogs(true);
    try {
      const response = await axios.get(
        `${API_URL}/admin/docker/containers/${source.containerStatus.containerName}/logs?tail=200`,
        { withCredentials: true }
      );
      setContainerLogs(response.data.logs);
      setShowLogs(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load container logs');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRestartContainer = async () => {
    if (!source?.containerStatus?.containerName) return;
    
    setRestartingContainer(true);
    try {
      await axios.post(
        `${API_URL}/admin/docker/containers/${source.containerStatus.containerName}/restart`,
        {},
        { withCredentials: true }
      );
      setSuccess('Container restarted successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      // Reload source to get updated container status
      setTimeout(() => loadSource(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to restart container');
      setTimeout(() => setError(''), 5000);
    } finally {
      setRestartingContainer(false);
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

  const handleSetAsLabel = (path: string) => {
    setLabelField(path);
  };

  const handleToggleReference = (path: string) => {
    if (referenceFields.includes(path)) {
      setReferenceFields(referenceFields.filter(f => f !== path));
    } else {
      setReferenceFields([...referenceFields, path]);
    }
  };

  const handleLanguageChange = (pathString: string, language: string) => {
    setSelectedPaths(selectedPaths.map(p => 
      p.path === pathString ? { ...p, languageTag: language } : p
    ));
  };

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
            {source.translation_config && !showWizard && (
              <>
                <button
                  onClick={() => setShowWizard(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  Reconfigure
                </button>
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
              </>
            )}
            {showWizard && (
              <button
                onClick={() => setShowWizard(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                Cancel Reconfiguration
              </button>
            )}
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
            <span className="text-gray-600 dark:text-gray-400">Description:</span>
            <span className="ml-2 text-gray-900 dark:text-white break-all">{source.description || <span className="text-gray-400 italic">No description</span>}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600 dark:text-gray-400">Graph Name:</span>
            <span className="ml-2 text-blue-600 dark:text-blue-400 font-mono break-all">{source.graph_name || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Docker Container Status (for LDES sources) */}
      {source.source_type === 'LDES' && source.containerStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Container className="w-5 h-5" />
            LDES Consumer Container
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Container Name:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-mono">
                  {source.containerStatus.containerName || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  source.containerStatus.running 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {source.containerStatus.running ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">State:</span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {source.containerStatus.status}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLoadContainerLogs}
                disabled={loadingLogs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {loadingLogs ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                View Logs
              </button>
              <button
                onClick={handleRestartContainer}
                disabled={restartingContainer}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {restartingContainer ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Restart Container
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Container Logs: {source.containerStatus?.containerName}
              </h3>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 whitespace-pre-wrap break-words">
                {containerLogs || 'No logs available'}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowLogs(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Running Task Status */}
      {runningTask && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <PlayCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Task Running
              </h3>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p>
                  <span className="font-medium">Type:</span> {runningTask.task_type}
                </p>
                <p>
                  <span className="font-medium">Started:</span> {format(parse(runningTask.started_at || runningTask.created_at), 'YYYY-MM-DD HH:mm:ss')}
                </p>
                <Link 
                  to="/admin/tasks" 
                  className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mt-2"
                >
                  View all tasks →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {!source.graph_name ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            This source has no graph name specified. Translation configuration requires a graph name.
          </p>
        </div>
      ) : (!source.translation_config || showWizard) ? (
        /* Show wizard when no configuration exists or user requests reconfiguration */
        <SourceConfigWizard
          sourceId={source.source_id}
          graphName={source.graph_name}
          existingConfig={source.translation_config}
          onConfigSaved={() => {
            setShowWizard(false);
            loadSource();
          }}
        />
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
                        {pred.languages && pred.languages.length > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-mono">
                            {pred.languages.join(', ')}
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Selected Translation Paths ({selectedPaths.length})
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure each field: <strong>Label</strong> (term identifier) and <strong>Reference</strong> (additional info to help translators). All selected fields are translatable.
          </p>
          
          <div className="space-y-2">
            {selectedPaths.map((path) => (
              <div
                key={path.path}
                className="px-3 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-mono text-gray-900 dark:text-white">
                        {path.label}
                      </div>
                      {path.path === labelField && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded font-semibold">
                          LABEL
                        </span>
                      )}
                      {referenceFields.includes(path.path) && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-semibold">
                          REFERENCE
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-semibold">
                        TRANSLATABLE
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {path.path}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSetAsLabel(path.path)}
                      disabled={path.path === labelField}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        path.path === labelField
                          ? 'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 cursor-not-allowed'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                      }`}
                    >
                      Set as Label
                    </button>
                    <button
                      onClick={() => handleToggleReference(path.path)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        referenceFields.includes(path.path)
                          ? 'bg-blue-200 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                      }`}
                    >
                      {referenceFields.includes(path.path) ? 'Unmark Ref' : 'Mark as Ref'}
                    </button>
                    <button
                      onClick={() => handleRemovePath(path.path)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {/* Language selector if languages are available */}
                {path.availableLanguages && path.availableLanguages.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      Language:
                    </label>
                    <select
                      value={path.languageTag || path.availableLanguages[0]}
                      onChange={(e) => handleLanguageChange(path.path, e.target.value)}
                      className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white font-mono"
                    >
                      {path.availableLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (auto-detected)
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}