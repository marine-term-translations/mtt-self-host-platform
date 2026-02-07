import React, { useEffect, useState } from 'react';
import { Target, Calendar, TrendingUp, Award, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { backendApi } from '../services/api';
import { ApiCommunityGoal, ApiCommunityGoalProgress } from '../types';

const CommunityGoals: React.FC = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<ApiCommunityGoal[]>([]);
  const [progress, setProgress] = useState<Record<number, ApiCommunityGoalProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const goalsData = await backendApi.get<ApiCommunityGoal[]>('/community-goals');
      
      // Filter active goals
      const activeGoals = goalsData.filter(g => g.is_active === 1);
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

  const handleGoalClick = (goal: ApiCommunityGoal) => {
    // Navigate to Translation Flow with appropriate filters
    const params = new URLSearchParams();
    
    if (goal.target_language) {
      params.append('language', goal.target_language);
    }
    
    if (goal.goal_type === 'collection' && goal.collection_id) {
      params.append('source', goal.collection_id.toString());
    }
    
    const queryString = params.toString();
    navigate(queryString ? `/flow?${queryString}` : '/flow');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-marine-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading community goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
              <Target size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Community Goals</h1>
              <p className="text-slate-600 dark:text-slate-400">Work together to achieve translation milestones</p>
            </div>
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Active Goals</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Check back later for new community challenges!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {goals.map((goal) => {
              const goalProgress = progress[goal.id];
              const isComplete = goalProgress?.is_complete;
              
              return (
                <div 
                  key={goal.id}
                  onClick={() => handleGoalClick(goal)}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all cursor-pointer hover:border-marine-300 dark:hover:border-marine-600"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                          {getGoalTypeLabel(goal.goal_type)}
                        </span>
                        {goal.target_language && (
                          <span className="text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full uppercase">
                            {goal.target_language}
                          </span>
                        )}
                        {isComplete && (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                            ✓ Complete
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-slate-600 dark:text-slate-400">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    {goal.points_reward && (
                      <div className="flex flex-col items-center gap-1 ml-4">
                        <Award className="w-6 h-6 text-yellow-500" />
                        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                          +{goal.points_reward}
                        </span>
                      </div>
                    )}
                  </div>

                  {goalProgress && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          Progress: {goalProgress.current_count} / {goalProgress.target_count || 'No limit'}
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {goalProgress.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComplete
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                              : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}
                          style={{ width: `${Math.min(goalProgress.progress_percentage, 100)}%` }}
                        />
                      </div>
                      {goalProgress.missing_translations && Object.keys(goalProgress.missing_translations).length > 0 && (
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                            Missing translations:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(goalProgress.missing_translations).map(([lang, count]) => (
                              <span
                                key={lang}
                                className="text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full font-medium"
                              >
                                {lang.toUpperCase()}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Ends {formatDate(goal.end_date || goal.start_date)}</span>
                    </div>
                    {goal.is_recurring === 1 && goal.recurrence_type && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="capitalize">{goal.recurrence_type}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityGoals;
