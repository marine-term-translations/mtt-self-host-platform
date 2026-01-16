import React, { useState, useEffect } from 'react';
import { backendApi } from '../../services/api';
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  PlayCircle,
  PauseCircle,
  ListChecks,
  Calendar,
  Settings,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
  created_by: string | null;
}

interface TaskScheduler {
  scheduler_id: number;
  name: string;
  task_type: string;
  schedule_config: string;
  enabled: number;
  source_id: number | null;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface TaskStats {
  by_status: Array<{ status: string; count: number }>;
  by_type: Array<{ task_type: string; count: number }>;
  recent_tasks: Task[];
}

const AdminTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedulers, setSchedulers] = useState<TaskScheduler[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'schedulers'>('tasks');
  
  // Form states for new scheduler
  const [showSchedulerForm, setShowSchedulerForm] = useState(false);
  const [schedulerForm, setSchedulerForm] = useState({
    name: '',
    task_type: 'triplestore_sync',
    schedule_config: '{"cron": "0 0 * * *"}', // Daily at midnight
    enabled: true,
    source_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, schedulersRes, statsRes] = await Promise.all([
        fetch(`${backendApi.baseUrl}/tasks?limit=100`, { credentials: 'include' }),
        fetch(`${backendApi.baseUrl}/task-schedulers`, { credentials: 'include' }),
        fetch(`${backendApi.baseUrl}/tasks/stats`, { credentials: 'include' })
      ]);

      const tasksData = await tasksRes.json();
      const schedulersData = await schedulersRes.json();
      const statsData = await statsRes.json();

      setTasks(tasksData.tasks || []);
      setSchedulers(schedulersData.schedulers || []);
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to fetch tasks data', error);
      toast.error(`Failed to load tasks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} className="text-green-500" />;
      case 'failed':
        return <XCircle size={18} className="text-red-500" />;
      case 'running':
        return <PlayCircle size={18} className="text-blue-500" />;
      case 'pending':
        return <Clock size={18} className="text-yellow-500" />;
      case 'cancelled':
        return <PauseCircle size={18} className="text-slate-500" />;
      default:
        return <Clock size={18} className="text-slate-400" />;
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
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const toggleScheduler = async (schedulerId: number) => {
    try {
      const response = await fetch(`${backendApi.baseUrl}/task-schedulers/${schedulerId}/toggle`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to toggle scheduler');
      
      toast.success('Scheduler updated');
      fetchData();
    } catch (error: any) {
      toast.error(`Failed to toggle scheduler: ${error.message}`);
    }
  };

  const deleteScheduler = async (schedulerId: number) => {
    if (!confirm('Are you sure you want to delete this scheduler?')) return;

    try {
      const response = await fetch(`${backendApi.baseUrl}/task-schedulers/${schedulerId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete scheduler');
      
      toast.success('Scheduler deleted');
      fetchData();
    } catch (error: any) {
      toast.error(`Failed to delete scheduler: ${error.message}`);
    }
  };

  const createScheduler = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${backendApi.baseUrl}/task-schedulers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: schedulerForm.name,
          task_type: schedulerForm.task_type,
          schedule_config: schedulerForm.schedule_config,
          enabled: schedulerForm.enabled ? 1 : 0,
          source_id: schedulerForm.source_id ? parseInt(schedulerForm.source_id) : null
        })
      });

      if (!response.ok) throw new Error('Failed to create scheduler');
      
      toast.success('Scheduler created');
      setShowSchedulerForm(false);
      setSchedulerForm({
        name: '',
        task_type: 'triplestore_sync',
        schedule_config: '{"cron": "0 0 * * *"}',
        enabled: true,
        source_id: ''
      });
      fetchData();
    } catch (error: any) {
      toast.error(`Failed to create scheduler: ${error.message}`);
    }
  };

  const runningTasks = tasks.filter(t => t.status === 'running');
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
          <ListChecks size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tasks</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Monitor background tasks and manage task schedulers
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Running</p>
              <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {loading ? '...' : runningTasks.length}
              </h3>
            </div>
            <PlayCircle className="text-blue-500" size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending</p>
              <h3 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {loading ? '...' : pendingTasks.length}
              </h3>
            </div>
            <Clock className="text-yellow-500" size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tasks</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : tasks.length}
              </h3>
            </div>
            <ListChecks className="text-purple-500" size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Schedulers</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : schedulers.filter(s => s.enabled).length} / {schedulers.length}
              </h3>
            </div>
            <Settings className="text-slate-500" size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'bg-purple-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          Task History
        </button>
        <button
          onClick={() => setActiveTab('schedulers')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'schedulers'
              ? 'bg-purple-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          Schedulers
        </button>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-purple-500" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16">
              <ListChecks size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No tasks yet</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Tasks will appear here when background operations are performed
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Started</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {tasks.map((task) => (
                    <tr key={task.task_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                        #{task.task_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {task.task_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {task.source_id ? (
                          <Link to={`/admin/sources/${task.source_id}`} className="text-blue-600 hover:underline">
                            Source #{task.source_id}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(task.started_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {formatDuration(task.started_at, task.completed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schedulers Tab */}
      {activeTab === 'schedulers' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Task Schedulers</h2>
            <button
              onClick={() => setShowSchedulerForm(!showSchedulerForm)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              New Scheduler
            </button>
          </div>

          {showSchedulerForm && (
            <form onSubmit={createScheduler} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create New Scheduler</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={schedulerForm.name}
                    onChange={(e) => setSchedulerForm({ ...schedulerForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Task Type
                  </label>
                  <select
                    value={schedulerForm.task_type}
                    onChange={(e) => setSchedulerForm({ ...schedulerForm, task_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="triplestore_sync">Triplestore Sync</option>
                    <option value="ldes_sync">LDES Sync</option>
                    <option value="harvest">Harvest</option>
                    <option value="file_upload">File Upload</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Schedule Config (JSON)
                  </label>
                  <input
                    type="text"
                    required
                    value={schedulerForm.schedule_config}
                    onChange={(e) => setSchedulerForm({ ...schedulerForm, schedule_config: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm"
                    placeholder='{"cron": "0 0 * * *"}'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Source ID (optional)
                  </label>
                  <input
                    type="number"
                    value={schedulerForm.source_id}
                    onChange={(e) => setSchedulerForm({ ...schedulerForm, source_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create Scheduler
                </button>
                <button
                  type="button"
                  onClick={() => setShowSchedulerForm(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-purple-500" />
              </div>
            ) : schedulers.length === 0 ? (
              <div className="text-center py-16">
                <Settings size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No schedulers yet</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Create a scheduler to automate recurring tasks
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Schedule</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Last Run</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {schedulers.map((scheduler) => (
                      <tr key={scheduler.scheduler_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                          {scheduler.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {scheduler.task_type}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                          {scheduler.schedule_config}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(scheduler.last_run)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            scheduler.enabled 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {scheduler.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleScheduler(scheduler.scheduler_id)}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              title={scheduler.enabled ? 'Disable' : 'Enable'}
                            >
                              {scheduler.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                            <button
                              onClick={() => deleteScheduler(scheduler.scheduler_id)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminTasks;
