import React from 'react';
import { Trophy, Flame, Target, Award, AlertTriangle } from 'lucide-react';
import { UserStats, DailyChallenge, DailyGoal } from '../services/flow.api';
import { useNavigate } from 'react-router-dom';

interface FlowStatsPanelProps {
  stats: UserStats | null;
  challenges: DailyChallenge[];
  dailyGoal: DailyGoal | null;
  sessionPoints: number;
  sessionTranslations: number;
  sessionReviews: number;
}

const FlowStatsPanel: React.FC<FlowStatsPanelProps> = ({
  stats,
  challenges,
  dailyGoal,
  sessionPoints,
  sessionTranslations,
  sessionReviews,
}) => {
  const navigate = useNavigate();

  if (!stats) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading stats...</p>
      </div>
    );
  }

  const handleDailyGoalClick = () => {
    // Direct user to the flow when they click on the daily goal
    navigate('/flow');
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'translate_5':
        return '📝';
      case 'review_10':
        return '✅';
      case 'daily_login':
        return '📅';
      case 'streak_maintain':
        return '🔥';
      default:
        return '🎯';
    }
  };

  const getChallengeTitle = (type: string) => {
    switch (type) {
      case 'translate_5':
        return 'Translate 5 Terms';
      case 'review_10':
        return 'Review 10 Translations';
      case 'daily_login':
        return 'Daily Login';
      case 'streak_maintain':
        return 'Maintain Streak';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Daily Goal - Replaces Session Stats */}
      <div 
        className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-blue-200 dark:border-blue-800"
        onClick={handleDailyGoalClick}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
          <Target className="w-5 h-5 text-blue-500" />
          Daily Goal
        </h3>
        {dailyGoal ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Complete 5 translations or reviews
              </span>
              {dailyGoal.completed === 1 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  Completed!
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="text-lg font-bold text-gray-800 dark:text-white">
                  {dailyGoal.current_count}/{dailyGoal.target_count}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    dailyGoal.completed === 1
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ 
                    width: `${Math.min((dailyGoal.current_count / dailyGoal.target_count) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Reward</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {dailyGoal.rewarded === 1 ? '✓ ' : ''}+5 Reputation
                </span>
              </div>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 text-center mt-2">
              Click to start translating or reviewing →
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading daily goal...</p>
        )}
      </div>

      {/* Overall Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
          <Award className="w-5 h-5 text-purple-500" />
          Overall Stats
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Total Points
            </span>
            <span className="text-lg font-bold text-gray-800 dark:text-white">
              {stats.points}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Current Streak
            </span>
            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {stats.daily_streak} days
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Longest Streak</span>
            <span className="text-gray-600 dark:text-gray-300">
              {stats.longest_streak} days
            </span>
          </div>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Lifetime</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-300">{stats.translations_count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Translations</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-300">{stats.reviews_count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Challenges */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
          <Target className="w-5 h-5 text-blue-500" />
          Daily Challenges
        </h3>
        <div className="space-y-3">
          {challenges.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No challenges today</p>
          ) : (
            challenges.map((challenge) => {
              const progress = Math.min(
                (challenge.current_count / challenge.target_count) * 100,
                100
              );
              const isCompleted = challenge.completed === 1;

              return (
                <div key={challenge.id} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getChallengeIcon(challenge.challenge_type)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-white">
                          {getChallengeTitle(challenge.challenge_type)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {challenge.current_count}/{challenge.target_count}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {isCompleted ? '✓ ' : ''}+{challenge.points_reward}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowStatsPanel;