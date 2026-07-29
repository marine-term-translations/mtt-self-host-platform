import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Check, X, Target, Calendar, TrendingUp, Globe, 
  Search, Filter, Layers, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight, 
  SlidersHorizontal, AlertCircle
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { backendApi } from '../../services/api';
import { ApiCommunityGoal, ApiCommunityGoalProgress } from '../../types';
import toast from 'react-hot-toast';

interface Language {
  code: string;
  name: string;
  native_name: string;
}

interface Source {
  source_id: number;
  source_path: string;
  graph_name: string;
  description?: string;
  created_at: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const AdminCommunityGoals: React.FC = () => {
  const location = useLocation();
  const [goals, setGoals] = useState<ApiCommunityGoal[]>([]);
  const [progress, setProgress] = useState<Record<number, ApiCommunityGoalProgress>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ApiCommunityGoal | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  // Filter & Search & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_type: 'translation_count' as 'translation_count' | 'collection',
    target_count: '',
    target_language: '',
    collection_id: '',
    is_recurring: false,
    recurrence_type: '' as 'daily' | 'weekly' | 'monthly' | '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  });

  useEffect(() => {
    fetchGoals();
    fetchLanguages();
    fetchSources();
  }, []);

  // Refetch goals when URL path or hash changes
  useEffect(() => {
    fetchGoals();
  }, [location.pathname, location.hash]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedLanguage, selectedStatus, selectedCollection, sortBy, itemsPerPage]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const goalsData = await backendApi.get<ApiCommunityGoal[]>('/admin/community-goals');
      setGoals(goalsData);

      // Fetch progress for each goal
      const progressData: Record<number, ApiCommunityGoalProgress> = {};
      await Promise.all(
        goalsData.map(async (goal) => {
          try {
            const prog = await backendApi.get<ApiCommunityGoalProgress>(`/community-goals/${goal.id}/progress`);
            progressData[goal.id] = prog;
          } catch (error) {
            console.error(`Failed to fetch progress for goal ${goal.id}:`, error);
          }
        })
      );
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
      toast.error('Failed to load community goals');
    } finally {
      setLoading(false);
    }
  };

  const fetchLanguages = async () => {
    try {
      const langs = await backendApi.get<Language[]>('/languages');
      setLanguages(langs);
    } catch (error) {
      console.error('Failed to fetch languages:', error);
      toast.error('Failed to load languages');
    }
  };

  const fetchSources = async () => {
    try {
      const response = await backendApi.get<{ sources: Source[] }>('/sources?limit=100');
      setSources(response.sources || []);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
      toast.error('Failed to load sources');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate end date is after start date
    if (formData.end_date && formData.start_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate <= startDate) {
        toast.error('End date must be after start date');
        return;
      }
    }
    
    // Validate collection goal without count requires language
    if (formData.goal_type === 'collection' && !formData.target_count && !formData.target_language) {
      toast.error('Collection goals without target count must have a target language');
      return;
    }
    
    // Validate collection goal requires collection_id
    if (formData.goal_type === 'collection' && !formData.collection_id) {
      toast.error('Collection goals require a source/collection to be selected');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        target_count: formData.target_count ? parseInt(formData.target_count) : null,
        collection_id: formData.collection_id ? parseInt(formData.collection_id) : null,
        target_language: formData.target_language || null,
        recurrence_type: formData.is_recurring ? formData.recurrence_type : null,
        end_date: formData.end_date || null,
        is_active: formData.is_active ? 1 : 0,
        is_recurring: formData.is_recurring ? 1 : 0
      };

      if (editingGoal) {
        await backendApi.put(`/admin/community-goals/${editingGoal.id}`, payload);
        toast.success('Goal updated successfully');
      } else {
        await backendApi.post('/admin/community-goals', payload);
        toast.success('Goal created successfully');
      }

      resetForm();
      fetchGoals();
    } catch (error) {
      console.error('Failed to save goal:', error);
      toast.error('Failed to save goal');
    }
  };

  const handleEdit = (goal: ApiCommunityGoal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      goal_type: goal.goal_type,
      target_count: goal.target_count?.toString() || '',
      target_language: goal.target_language || '',
      collection_id: goal.collection_id?.toString() || '',
      is_recurring: goal.is_recurring === 1,
      recurrence_type: goal.recurrence_type || '',
      start_date: goal.start_date.split('T')[0],
      end_date: goal.end_date ? goal.end_date.split('T')[0] : '',
      is_active: goal.is_active === 1
    });
    setShowForm(true);
  };

  const handleDelete = async (goalId: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    try {
      await backendApi.delete(`/admin/community-goals/${goalId}`);
      toast.success('Goal deleted successfully');
      fetchGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      goal_type: 'translation_count',
      target_count: '',
      target_language: '',
      collection_id: '',
      is_recurring: false,
      recurrence_type: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true
    });
    setEditingGoal(null);
    setShowForm(false);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedLanguage('all');
    setSelectedStatus('all');
    setSelectedCollection('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Metric Stats Calculations
  const stats = useMemo(() => {
    const total = goals.length;
    const active = goals.filter(g => g.is_active === 1).length;
    const completed = goals.filter(g => progress[g.id]?.is_complete).length;
    const collections = goals.filter(g => g.goal_type === 'collection').length;
    return { total, active, completed, collections };
  }, [goals, progress]);

  // Filtering & Sorting Logic
  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = goal.title.toLowerCase().includes(q);
        const descMatch = (goal.description || '').toLowerCase().includes(q);
        const collectionMatch = (goal.collection_path || '').toLowerCase().includes(q);
        const langMatch = (goal.target_language || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !collectionMatch && !langMatch) {
          return false;
        }
      }

      // Goal Type filter
      if (selectedType !== 'all' && goal.goal_type !== selectedType) {
        return false;
      }

      // Language filter
      if (selectedLanguage !== 'all') {
        if (selectedLanguage === 'none' && goal.target_language) return false;
        if (selectedLanguage !== 'none' && goal.target_language !== selectedLanguage) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        const isCompleted = progress[goal.id]?.is_complete;
        if (selectedStatus === 'active' && goal.is_active !== 1) return false;
        if (selectedStatus === 'inactive' && goal.is_active === 1) return false;
        if (selectedStatus === 'completed' && !isCompleted) return false;
        if (selectedStatus === 'in_progress' && (isCompleted || goal.is_active !== 1)) return false;
      }

      // Collection filter
      if (selectedCollection !== 'all') {
        if (goal.collection_id?.toString() !== selectedCollection) return false;
      }

      return true;
    });
  }, [goals, progress, searchQuery, selectedType, selectedLanguage, selectedStatus, selectedCollection]);

  // Sorted Goals
  const sortedGoals = useMemo(() => {
    return [...filteredGoals].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at || a.start_date).getTime() - new Date(b.created_at || b.start_date).getTime();
      if (sortBy === 'progress_desc') return (progress[b.id]?.progress_percentage || 0) - (progress[a.id]?.progress_percentage || 0);
      if (sortBy === 'progress_asc') return (progress[a.id]?.progress_percentage || 0) - (progress[b.id]?.progress_percentage || 0);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [filteredGoals, progress, sortBy]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(sortedGoals.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, sortedGoals.length);
  const paginatedGoals = sortedGoals.slice(startIndex, endIndex);

  const activeFiltersCount = (searchQuery ? 1 : 0) + 
    (selectedType !== 'all' ? 1 : 0) + 
    (selectedLanguage !== 'all' ? 1 : 0) + 
    (selectedStatus !== 'all' ? 1 : 0) + 
    (selectedCollection !== 'all' ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-marine-600 dark:text-marine-400" />
            Community Goals
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage community-wide translation challenges, collection coverage, and progress tracking
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="bg-marine-600 hover:bg-marine-700 dark:bg-marine-500 dark:hover:bg-marine-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? 'Close Editor' : 'New Goal'}
        </button>
      </div>

      {/* Quick Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Goals</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Goals</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completed}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collection Goals</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.collections}</p>
          </div>
        </div>
      </div>

      {/* Filter, Search & Sorting Controls Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals by title, collection, or keyword..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-marine-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="progress_desc">Highest Progress</option>
                <option value="progress_asc">Lowest Progress</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Goal Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs px-3 py-2 text-slate-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="collection">Collection</option>
              <option value="translation_count">Translation Count</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs px-3 py-2 text-slate-900 dark:text-white"
            >
              <option value="all">All Languages</option>
              <option value="none">No Specific Language</option>
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.name} ({l.code.toUpperCase()})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs px-3 py-2 text-slate-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Collection
            </label>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs px-3 py-2 text-slate-900 dark:text-white truncate"
            >
              <option value="all">All Collections</option>
              {sources.map(s => (
                <option key={s.source_id} value={s.source_id.toString()}>
                  {s.description || s.source_path}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Goal Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-marine-600 dark:text-marine-400" />
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="e.g., Translate 50 French terms this month"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="Additional details about the goal..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Goal Type *
                  </label>
                  <select
                    value={formData.goal_type}
                    onChange={(e) => setFormData({ ...formData, goal_type: e.target.value as 'translation_count' | 'collection' })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="translation_count">Translation Count</option>
                    <option value="collection">Collection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Language {formData.goal_type === 'collection' && !formData.target_count && '*'}
                  </label>
                  <select
                    value={formData.target_language}
                    onChange={(e) => setFormData({ ...formData, target_language: e.target.value })}
                    required={formData.goal_type === 'collection' && !formData.target_count}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">All Languages</option>
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Count {formData.goal_type === 'translation_count' && '*'}
                  </label>
                  <input
                    type="number"
                    value={formData.target_count}
                    onChange={(e) => setFormData({ ...formData, target_count: e.target.value })}
                    required={formData.goal_type === 'translation_count'}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="Number of translations"
                  />
                </div>

                {formData.goal_type === 'collection' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Collection / Source *
                    </label>
                    <select
                      value={formData.collection_id}
                      onChange={(e) => setFormData({ ...formData, collection_id: e.target.value })}
                      required={formData.goal_type === 'collection'}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="">Select a collection...</option>
                      {sources.map((source) => (
                        <option key={source.source_id} value={source.source_id}>
                          {source.source_path} (ID: {source.source_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                      className="w-4 h-4 text-marine-600 rounded border-slate-300 dark:border-slate-600"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Recurring Goal
                    </span>
                  </label>
                </div>

                {formData.is_recurring && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Recurrence Frequency *
                    </label>
                    <select
                      value={formData.recurrence_type}
                      onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as any })}
                      required={formData.is_recurring}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="">Select frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-marine-600 rounded border-slate-300 dark:border-slate-600"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Active Goal
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-marine-600 hover:bg-marine-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goals List Section */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          Loading community goals...
        </div>
      ) : paginatedGoals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <Target className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {activeFiltersCount > 0 ? 'No Goals Match Filter Criteria' : 'No Community Goals Found'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {activeFiltersCount > 0 
              ? 'Try resetting your active search or filters to display results.' 
              : 'Create your first goal to motivate translators and track community coverage.'}
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-marine-50 dark:bg-marine-900/30 text-marine-600 dark:text-marine-400 rounded-xl text-xs font-bold transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {paginatedGoals.map((goal) => {
              const goalProgress = progress[goal.id];
              
              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow transition-shadow space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          goal.is_active
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {goal.is_active ? 'Active' : 'Inactive'}
                        </span>

                        <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
                          {goal.goal_type === 'translation_count' ? 'Translation Count' : 'Collection'}
                        </span>

                        {goal.target_language && (
                          <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2.5 py-0.5 rounded-full uppercase">
                            {goal.target_language}
                          </span>
                        )}

                        {goal.is_recurring === 1 && (
                          <span className="text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2.5 py-0.5 rounded-full capitalize">
                            {goal.recurrence_type}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {goal.title}
                      </h3>

                      {goal.description && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                          {goal.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(goal.start_date)}</span>
                          {goal.end_date && (
                            <>
                              <span>→</span>
                              <span>{formatDate(goal.end_date)}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          <span>Created by {goal.created_by_username}</span>
                        </div>
                        {goal.collection_path && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            <Layers className="w-3 h-3" />
                            <span>{goal.collection_path}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(goal)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Summary */}
                  {goalProgress && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          Progress: {goalProgress.current_count} / {goalProgress.target_count || '∞'} translations
                        </span>
                        <span className="font-bold text-marine-600 dark:text-marine-400">
                          {goalProgress.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            goalProgress.is_complete
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              : 'bg-gradient-to-r from-marine-500 to-blue-500'
                          }`}
                          style={{ width: `${Math.min(goalProgress.progress_percentage, 100)}%` }}
                        />
                      </div>

                      {goalProgress.missing_translations && Object.keys(goalProgress.missing_translations).length > 0 && (
                        <div className="mt-3 pt-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Missing Translations:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(goalProgress.missing_translations).map(([lang, count]) => (
                              <span
                                key={lang}
                                className="text-[11px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50 px-2 py-0.5 rounded-lg"
                              >
                                {lang.toUpperCase()}: {count} remaining
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-900 dark:text-white">{sortedGoals.length === 0 ? 0 : startIndex + 1}</strong> to <strong className="text-slate-900 dark:text-white">{endIndex}</strong> of <strong className="text-slate-900 dark:text-white">{sortedGoals.length}</strong> goals
              </span>
              <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-medium text-slate-900 dark:text-white">
                Page {validCurrentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCommunityGoals;
