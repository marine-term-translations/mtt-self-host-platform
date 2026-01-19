
import React, { useState, useEffect, useRef } from 'react';
import { backendApi } from '../../services/api';
import { ArrowLeft, Loader2, Database, AlertCircle, CheckCircle, DownloadCloud, Terminal, Rss, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { format, now } from '@/src/utils/datetime';

interface HarvestResult {
  success: boolean;
  termsInserted: number;
  termsUpdated: number;
  fieldsInserted: number;
  message: string;
}

type HarvestTab = 'sparql' | 'ldes' | 'file';

const AdminHarvest: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HarvestTab>('sparql');
  const [collectionUri, setCollectionUri] = useState('http://vocab.nerc.ac.uk/collection/P01/current/');
  const [ldesUrl, setLdesUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [graphName, setGraphName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HarvestResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionUri) {
        toast.error("Please enter a collection URI");
        return;
    }

    setLoading(true);
    setResult(null);
    setLogs([]); // Clear previous logs
    setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] Connecting to harvest stream...`]);

    try {
      const response = await backendApi.harvestCollectionStream(collectionUri, user?.token);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || response.statusText);
      }

      if (!response.body) throw new Error("No response body received");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
                try {
                    const dataStr = line.trim().slice(6);
                    const data = JSON.parse(dataStr);
                    const timestamp = format(now(), 'HH:mm:ss');

                    switch (data.type) {
                        case 'connected':
                            setLogs(prev => [...prev, `[${timestamp}] ✓ Connected`]);
                            break;
                        case 'info':
                            setLogs(prev => [...prev, `[${timestamp}] ℹ️ ${data.message}`]);
                            break;
                        case 'progress':
                            setLogs(prev => [...prev, `[${timestamp}] ⏳ ${data.message}`]);
                            break;
                        case 'warning':
                            setLogs(prev => [...prev, `[${timestamp}] ⚠️ ${data.message}`]);
                            break;
                        case 'error':
                            setLogs(prev => [...prev, `[${timestamp}] ❌ ${data.message}`]);
                            toast.error(data.message);
                            break;
                        case 'complete':
                            setLogs(prev => [...prev, `[${timestamp}] ✓ Step complete: ${data.message}`]);
                            break;
                        case 'done':
                            setLogs(prev => [...prev, `[${timestamp}] ✅ ${data.message}`]);
                            setResult(data.data);
                            toast.success("Harvest completed successfully");
                            break;
                    }
                } catch (e) {
                    console.error('Error parsing SSE', e);
                }
            }
        }
      }
    } catch (error: any) {
      console.error("Harvest failed", error);
      const errorMsg = error.message || "Unknown error occurred";
      setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] Error: ${errorMsg}`]);
      toast.error(`Harvest failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLdesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ldesUrl) {
      toast.error("Please enter an LDES feed URL");
      return;
    }

    setLoading(true);
    setResult(null);
    setLogs([]);
    setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] Creating LDES source...`]);

    try {
      const response = await fetch(`${backendApi.baseUrl}/sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          source_path: ldesUrl,
          source_type: 'LDES',
          graph_name: graphName || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create LDES source');
      }

      const source = await response.json();
      setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] ✅ LDES source created successfully`]);
      setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] Source ID: ${source.source_id}`]);
      setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] Source path: ${source.source_path}`]);
      toast.success("LDES source created successfully");
      
      // Reset form
      setLdesUrl('');
      setGraphName('');
    } catch (error: any) {
      console.error("LDES source creation failed", error);
      const errorMsg = error.message || "Unknown error occurred";
      setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] ❌ Error: ${errorMsg}`]);
      toast.error(`Failed to create LDES source: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setLoading(true);
    setResult(null);
    setLogs([]);
    setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] Uploading file: ${selectedFile.name}...`]);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (graphName) {
        // Prepend 'urn:' to graph name if not already present
        const graphToUse = graphName.startsWith('urn:') ? graphName : `urn:${graphName}`;
        formData.append('graph_name', graphToUse);
      }

      const response = await fetch(`${backendApi.baseUrl}/sources/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const source = await response.json();
      setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] ✅ File uploaded successfully`]);
      setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] Source ID: ${source.source_id}`]);
      setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] File saved at: ${source.source_path}`]);
      
      if (source.task_id) {
        setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] 📋 Processing task #${source.task_id} started`]);
        setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] Status: ${source.task_status}`]);
        toast.success("File uploaded! Processing in background...");
      } else {
        toast.success("File uploaded and source created successfully");
      }
      
      // Reset form
      setSelectedFile(null);
      setGraphName('');
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error("File upload failed", error);
      const errorMsg = error.message || "Unknown error occurred";
      setLogs(prev => [...prev, `[${format(now(), 'HH:mm:ss')}] ❌ Error: ${errorMsg}`]);
      toast.error(`File upload failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
         <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <DownloadCloud size={24} />
         </div>
         <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Data Sources</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Import terms from SPARQL endpoints, LDES feeds, or static files.</p>
         </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('sparql')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'sparql'
                ? 'border-marine-600 text-marine-600 dark:text-marine-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database size={18} />
            SPARQL Harvest
          </button>
          <button
            onClick={() => setActiveTab('ldes')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'ldes'
                ? 'border-marine-600 text-marine-600 dark:text-marine-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Rss size={18} />
            LDES Feed
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'file'
                ? 'border-marine-600 text-marine-600 dark:text-marine-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload size={18} />
            Static File
          </button>
        </nav>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Input Form */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            {activeTab === 'sparql' && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Database size={18} className="text-marine-500" /> SPARQL Collection
                </h2>
                
                <form onSubmit={handleHarvest}>
                    <div className="mb-6">
                        <label htmlFor="uri" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            NERC Collection URI
                        </label>
                        <input 
                            id="uri"
                            type="url" 
                            value={collectionUri}
                            onChange={(e) => setCollectionUri(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
                            placeholder="http://vocab.nerc.ac.uk/collection/P01/current/"
                            required
                            disabled={loading}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            Enter the full URI of the NERC collection (e.g., P01, P02). This process may take several minutes for large collections.
                        </p>
                    </div>

                    <div className="flex items-center justify-between">
                         <div className="text-sm text-slate-500 flex items-center gap-1">
                            <AlertCircle size={14} />
                            <span>Existing terms will be updated.</span>
                         </div>
                         <button 
                            type="submit"
                            disabled={loading}
                            className={`px-6 py-2.5 rounded-lg font-medium text-white flex items-center gap-2 transition-colors ${
                                loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-marine-600 hover:bg-marine-700 shadow-sm'
                            }`}
                         >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Harvesting...
                                </>
                            ) : (
                                <>
                                    <DownloadCloud size={18} />
                                    Start Harvest
                                </>
                            )}
                         </button>
                    </div>
                </form>
              </>
            )}

            {activeTab === 'ldes' && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Rss size={18} className="text-marine-500" /> LDES Feed
                </h2>
                
                <form onSubmit={handleLdesSubmit}>
                    <div className="mb-4">
                        <label htmlFor="ldes-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            LDES Feed URL
                        </label>
                        <input 
                            id="ldes-url"
                            type="url" 
                            value={ldesUrl}
                            onChange={(e) => setLdesUrl(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
                            placeholder="https://example.org/ldes/feed"
                            required
                            disabled={loading}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            Enter the URL of the LDES (Linked Data Event Stream) feed.
                        </p>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="ldes-graph" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Graph Name (Optional)
                        </label>
                        <input 
                            id="ldes-graph"
                            type="text" 
                            value={graphName}
                            onChange={(e) => setGraphName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
                            placeholder="http://example.org/graph"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex justify-end">
                         <button 
                            type="submit"
                            disabled={loading}
                            className={`px-6 py-2.5 rounded-lg font-medium text-white flex items-center gap-2 transition-colors ${
                                loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-marine-600 hover:bg-marine-700 shadow-sm'
                            }`}
                         >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Rss size={18} />
                                    Add LDES Source
                                </>
                            )}
                         </button>
                    </div>
                </form>
              </>
            )}

            {activeTab === 'file' && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Upload size={18} className="text-marine-500" /> Static File Upload
                </h2>
                
                <form onSubmit={handleFileUpload}>
                    <div className="mb-4">
                        <label htmlFor="file-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            RDF File
                        </label>
                        <input 
                            id="file-input"
                            type="file" 
                            accept=".ttl,.rdf,.xml,.jsonld,.json,.nt,.nq"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-marine-50 file:text-marine-700 hover:file:bg-marine-100 dark:file:bg-slate-600 dark:file:text-slate-200"
                            required
                            disabled={loading}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            Supported formats: .ttl, .rdf, .xml, .jsonld, .json, .nt, .nq (max 100MB)
                        </p>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="file-graph" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Graph Name (Optional)
                        </label>
                        <input 
                            id="file-graph"
                            type="text" 
                            value={graphName}
                            onChange={(e) => setGraphName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
                            placeholder="http://example.org/graph"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex justify-end">
                         <button 
                            type="submit"
                            disabled={loading || !selectedFile}
                            className={`px-6 py-2.5 rounded-lg font-medium text-white flex items-center gap-2 transition-colors ${
                                loading || !selectedFile ? 'bg-slate-400 cursor-not-allowed' : 'bg-marine-600 hover:bg-marine-700 shadow-sm'
                            }`}
                         >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    Upload File
                                </>
                            )}
                         </button>
                    </div>
                </form>
              </>
            )}
        </div>

        {/* Console / Status Output */}
        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 flex flex-col h-full min-h-[300px]">
             <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Terminal size={18} className="text-green-500" /> Operation Status
            </h2>
            
            <div className="flex-grow font-mono text-sm space-y-2 overflow-y-auto max-h-[400px]">
                {logs.length === 0 ? (
                    <div className="text-slate-600 italic">Waiting for input...</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="text-slate-300 border-l-2 border-slate-700 pl-2 break-all">
                            {log}
                        </div>
                    ))
                )}
                <div ref={logsEndRef} />
            </div>

            {/* Results Summary Box */}
            {result && (
                <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 text-green-400 font-bold mb-3">
                        <CheckCircle size={18} /> Harvest Successful
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-slate-700/50 rounded p-2">
                            <div className="text-2xl font-bold text-white">{result.termsInserted}</div>
                            <div className="text-xs text-slate-400 uppercase">New Terms</div>
                        </div>
                        <div className="bg-slate-700/50 rounded p-2">
                            <div className="text-2xl font-bold text-white">{result.termsUpdated}</div>
                            <div className="text-xs text-slate-400 uppercase">Updated</div>
                        </div>
                        <div className="bg-slate-700/50 rounded p-2">
                            <div className="text-2xl font-bold text-white">{result.fieldsInserted}</div>
                            <div className="text-xs text-slate-400 uppercase">New Fields</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AdminHarvest;
