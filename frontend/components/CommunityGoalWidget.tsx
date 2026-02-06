
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Target, TrendingUp, Calendar } from 'lucide-react';
import { backendApi } from '../services/api';
import { ApiCommunityGoal, ApiCommunityGoalProgress } from '../types';
import toast from 'react-hot-toast';

interface CommunityGoalWidgetProps {
  onDismiss?: () => void;
}

const CommunityGoalWidget: React.FC<CommunityGoalWidgetProps> = ({ onDismiss }) => {
  const [goals, setGoals] = useState<ApiCommunityGoal[]>([]);
  const [progress, setProgress] = useState<Record<number, ApiCommunityGoalProgress>>({});
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(() => {
    // Load minimized state from localStorage
    const saved = localStorage.getItem('communityGoalsMinimized');
    return saved === 'true';
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const goalsData = await backendApi.get<ApiCommunityGoal[]>('/community-goals');
      
      // Filter out dismissed goals
      const activeGoals = goalsData.filter(g => !g.is_dismissed);
      setGoals(activeGoals);

      // Fetch progress for each goal
      const progressData: Record<number, ApiCommunityGoalProgress> = {};
      await Promise.all(
        activeGoals.map(async (goal) => {
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
      console.error('Failed to fetch community goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem('communityGoalsMinimized', String(newState));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'translation_count':
        return 'Translation Goal';
      case 'collection':
        return 'Collection Goal';
      default:
        return 'Goal';
    }
  };

  if (loading || goals.length === 0) {
    return null;
  }

  // Minimized state - show only an icon
  if (isMinimized) {
    return (
      <button
        onClick={toggleMinimize}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-xl transition-all hover:scale-110 z-50 group"
        aria-label="Show community goals"
      >
        <Target className="w-6 h-6" />
        {goals.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {goals.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 z-50">
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          <h3 className="font-semibold">Community Goals</h3>
        </div>
        <button
          onClick={toggleMinimize}
          className="text-white hover:bg-white/20 rounded p-1 transition-colors"
          aria-label="Minimize"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {goals.map((goal) => {
          const goalProgress = progress[goal.id];
          
          return (
            <div key={goal.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                      {getGoalTypeLabel(goal.goal_type)}
                    </span>
                    {goal.target_language && (
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded uppercase">
                        {goal.target_language}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                    {goal.title}
                  </h4>
                  {goal.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {goal.description}
                    </p>
                  )}
                </div>
              </div>

              {goalProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      {goalProgress.current_count} / {goalProgress.target_count || '∞'}
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {goalProgress.progress_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goalProgress.is_complete
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500'
                      }`}
                      style={{ width: `${Math.min(goalProgress.progress_percentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Until {formatDate(goal.end_date || goal.start_date)}</span>
                </div>
                {goal.is_recurring === 1 && goal.recurrence_type && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className="capitalize">{goal.recurrence_type}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommunityGoalWidget;
