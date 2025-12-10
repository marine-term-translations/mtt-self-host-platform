import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Home, TrendingUp } from 'lucide-react';
import FlowTermCard from '../components/FlowTermCard';
import FlowStatsPanel from '../components/FlowStatsPanel';
import {
  startFlowSession,
  getNextTask,
  submitReview,
  submitTranslation,
  getAvailableLanguages,
  endFlowSession,
  FlowTask,
  UserStats,
  DailyChallenge,
  Language,
} from '../services/flow.api';

const TranslationFlow: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedLanguage = searchParams.get('language') || undefined;

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentTask, setCurrentTask] = useState<FlowTask | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [sessionTranslations, setSessionTranslations] = useState(0);
  const [sessionReviews, setSessionReviews] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  // Initialize flow session
  useEffect(() => {
    const initFlow = async () => {
      try {
        setIsLoading(true);

        // Start session and get languages in parallel
        const [sessionData, languagesData] = await Promise.all([
          startFlowSession(selectedLanguage),
          getAvailableLanguages(),
        ]);

        setSessionId(sessionData.sessionId);
        setStats(sessionData.stats);
        setChallenges(sessionData.challenges);
        setLanguages(languagesData.languages);

        // Get first task
        const task = await getNextTask(selectedLanguage);
        setCurrentTask(task);
      } catch (error) {
        console.error('Failed to initialize flow:', error);
        toast.error('Failed to start translation flow');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      initFlow();
    }
  }, [user, selectedLanguage]);

  // Load next task
  const loadNextTask = async () => {
    try {
      const task = await getNextTask(selectedLanguage);
      setCurrentTask(task);
    } catch (error) {
      console.error('Failed to load next task:', error);
      toast.error('Failed to load next task');
    }
  };

  // Handle review submission
  const handleSubmitReview = async (action: 'approve' | 'reject') => {
    if (!currentTask?.task?.translation_id || !sessionId) return;

    try {
      setIsSubmitting(true);
      const result = await submitReview(
        currentTask.task.translation_id,
        action,
        sessionId
      );

      // Update session stats
      setSessionPoints((prev) => prev + result.points);
      setSessionReviews((prev) => prev + 1);

      // Show celebration for new streak
      if (result.streakInfo.isNewStreak && result.streakInfo.streak > 1) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      // Update stats
      if (stats) {
        setStats({
          ...stats,
          points: stats.points + result.points,
          daily_streak: result.streakInfo.streak,
          longest_streak: result.streakInfo.longestStreak,
          reviews_count: stats.reviews_count + 1,
        });
      }

      toast.success(
        action === 'approve'
          ? `Translation approved! +${result.points} points`
          : `Translation rejected. +${result.points} points`
      );

      // Load next task
      await loadNextTask();
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle translation submission
  const handleSubmitTranslation = async (language: string, value: string) => {
    if (!currentTask?.task?.term_field_id || !sessionId) return;

    try {
      setIsSubmitting(true);
      const result = await submitTranslation(
        currentTask.task.term_field_id,
        language,
        value,
        sessionId
      );

      // Update session stats
      setSessionPoints((prev) => prev + result.points);
      setSessionTranslations((prev) => prev + 1);

      // Show celebration for new streak
      if (result.streakInfo.isNewStreak && result.streakInfo.streak > 1) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      // Update stats
      if (stats) {
        setStats({
          ...stats,
          points: stats.points + result.points,
          daily_streak: result.streakInfo.streak,
          longest_streak: result.streakInfo.longestStreak,
          translations_count: stats.translations_count + 1,
        });
      }

      toast.success(`Translation submitted! +${result.points} points`);

      // Load next task
      await loadNextTask();
    } catch (error) {
      console.error('Failed to submit translation:', error);
      toast.error('Failed to submit translation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle end session
  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      await endFlowSession(sessionId);
      toast.success(`Session ended! You earned ${sessionPoints} points.`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading Translation Flow...</p>
        </div>
      </div>
    );
  }

  if (!currentTask || currentTask.type === 'none') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-12">
              <Sparkles className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                All Caught Up! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {currentTask?.message || 'No more tasks available right now. Great work!'}
              </p>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-lg mb-8">
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                  Session Summary
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {sessionPoints}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {sessionTranslations}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Translations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {sessionReviews}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Reviews</div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleEndSession}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                <Home className="w-5 h-5" />
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Celebration Effect */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🔥</div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              Translation Flow
              {selectedLanguage && (
                <span className="text-sm font-semibold px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                  {languages.find(l => l.code === selectedLanguage)?.name || selectedLanguage.toUpperCase()}
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Complete tasks to earn points and maintain your streak!
            </p>
          </div>
          <button
            onClick={handleEndSession}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            End Session
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Task Area */}
          <div className="lg:col-span-2">
            <FlowTermCard
              task={currentTask.task}
              taskType={currentTask.type as 'review' | 'translate'}
              languages={
                selectedLanguage && currentTask.type === 'translate'
                  ? languages.filter(lang => lang.code === selectedLanguage)
                  : languages
              }
              onSubmitReview={handleSubmitReview}
              onSubmitTranslation={handleSubmitTranslation}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Stats Sidebar */}
          <div className="lg:col-span-1">
            <FlowStatsPanel
              stats={stats}
              challenges={challenges}
              sessionPoints={sessionPoints}
              sessionTranslations={sessionTranslations}
              sessionReviews={sessionReviews}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationFlow;