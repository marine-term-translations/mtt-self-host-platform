import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { backendApi } from '../../services/api';
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  PlayCircle,
  PauseCircle,
  FileText,
  Calendar,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  task_id: number;
  task_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  source_id: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: string | null;
  logs: string | null;
  created_by: string | null;
}

const AdminTaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendApi.baseUrl}/tasks/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task');
      }

      const data = await response.json();
      setTask(data);
    } catch (error: any) {
      console.error('Failed to fetch task', error);
      toast.error(`Failed to load task: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={24} className="text-green-500" />;
      case 'failed':
        return <XCircle size={24} className="text-red-500" />;
      case 'running':
        return <PlayCircle size={24} className="text-blue-500 animate-pulse" />;
      case 'pending':
        return <Clock size={24} className="text-yellow-500" />;
      case 'cancelled':
        return <PauseCircle size={24} className="text-slate-500" />;
      default:
        return <Clock size={24} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'running':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return '—';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Task not found</h3>
          <Link to="/admin/tasks" className="text-purple-600 hover:underline">
            Back to Tasks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin/tasks" className="inline-flex items-center text-slate-500 hover:text-purple-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Tasks
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className={`p-3 rounded-lg ${getStatusColor(task.status)}`}>
          {getStatusIcon(task.status)}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Task #{task.task_id}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {task.task_type} • {task.status}
          </p>
        </div>
      </div>

      {/* Task Details */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Database size={20} />
          Task Information
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Task ID:</span>
            <span className="ml-2 text-slate-900 dark:text-white font-mono">#{task.task_id}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Type:</span>
            <span className="ml-2 text-slate-900 dark:text-white">{task.task_type}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Status:</span>
            <span className={`ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Source:</span>
            {task.source_id ? (
              <Link to={`/admin/sources/${task.source_id}`} className="ml-2 text-blue-600 hover:underline">
                Source #{task.source_id}
              </Link>
            ) : (
              <span className="ml-2 text-slate-400">—</span>
            )}
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Created:</span>
            <span className="ml-2 text-slate-900 dark:text-white">{formatDate(task.created_at)}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Started:</span>
            <span className="ml-2 text-slate-900 dark:text-white">{formatDate(task.started_at)}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Completed:</span>
            <span className="ml-2 text-slate-900 dark:text-white">{formatDate(task.completed_at)}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Duration:</span>
            <span className="ml-2 text-slate-900 dark:text-white">{formatDuration(task.started_at, task.completed_at)}</span>
          </div>
          {task.created_by && (
            <div>
              <span className="text-slate-500 dark:text-slate-400">Created By:</span>
              <span className="ml-2 text-slate-900 dark:text-white">{task.created_by}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {task.error_message && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
            <XCircle size={20} />
            Error Message
          </h2>
          <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap font-mono bg-red-100 dark:bg-red-900/30 p-4 rounded">
            {task.error_message}
          </pre>
        </div>
      )}

      {/* Metadata */}
      {task.metadata && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText size={20} />
            Metadata
          </h2>
          <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded overflow-x-auto">
            {JSON.stringify(JSON.parse(task.metadata), null, 2)}
          </pre>
        </div>
      )}

      {/* Logs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText size={20} />
          Execution Logs
        </h2>
        {task.logs ? (
          <div className="bg-slate-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
              {task.logs}
            </pre>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {task.status === 'pending' ? (
              <p>No logs available yet. Task has not started.</p>
            ) : task.status === 'running' ? (
              <p>Task is currently running. Logs will be available when complete.</p>
            ) : (
              <p>No logs were captured for this task.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTaskDetail;
