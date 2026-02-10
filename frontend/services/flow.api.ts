// Flow API service - handles API calls for Translation Flow

import { backendApi } from './api';

export interface FlowTask {
  type: 'review' | 'translate' | 'none';
  task?: any;
  message?: string;
}

export interface FlowSession {
  id: number;
  user_id: string;
  started_at: string;
  ended_at?: string;
  translations_completed: number;
  reviews_completed: number;
  points_earned: number;
}

export interface UserStats {
  user_id: string;
  points: number;
  daily_streak: number;
  longest_streak: number;
  last_active_date?: string;
  translations_count: number;
  reviews_count: number;
}

export interface DailyChallenge {
  id: number;
  user_id: string;
  challenge_date: string;
  challenge_type: string;
  target_count: number;
  current_count: number;
  completed: number;
  points_reward: number;
}

export interface DailyGoal {
  id: number;
  user_id: number;
  goal_date: string;
  target_count: number;
  current_count: number;
  completed: number;
  rewarded: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StreakInfo {
  streak: number;
  longestStreak: number;
  isNewStreak: boolean;
}

export interface ReviewResult {
  success: boolean;
  action: string;
  points: number;
  streakInfo: StreakInfo;
}

export interface TranslationResult {
  success: boolean;
  translationId: number;
  points: number;
  streakInfo: StreakInfo;
}

export interface Language {
  code: string;
  name: string;
}

/**
 * Start a new translation flow session
 */
export async function startFlowSession(language?: string, source?: string): Promise<{
  success: boolean;
  sessionId: number;
  stats: UserStats;
  challenges: DailyChallenge[];
  dailyGoal: DailyGoal;
  language?: string | null;
  source?: string | null;
}> {
  return backendApi.post<{
    success: boolean;
    sessionId: number;
    stats: UserStats;
    challenges: DailyChallenge[];
    dailyGoal: DailyGoal;
    language?: string | null;
    source?: string | null;
  }>('/flow/start', { language, source });
}

/**
 * Get the next task (review or translation)
 */
export async function getNextTask(language?: string, source?: string): Promise<FlowTask> {
  const params: any = {};
  if (language) params.language = language;
  if (source) params.source = source;
  return backendApi.get<FlowTask>('/flow/next', Object.keys(params).length > 0 ? params : undefined);
}

/**
 * Submit a review (approve or reject)
 */
export async function submitReview(
  translationId: number,
  action: 'approve' | 'reject',
  sessionId?: number
): Promise<ReviewResult> {
  return backendApi.post<ReviewResult>('/flow/review', {
    translationId,
    action,
    sessionId,
  });
}

/**
 * Get user stats and challenges
 */
export async function getFlowStats(): Promise<{
  stats: UserStats;
  challenges: DailyChallenge[];
  dailyGoal: DailyGoal;
}> {
  return backendApi.get<{
    stats: UserStats;
    challenges: DailyChallenge[];
    dailyGoal: DailyGoal;
  }>('/flow/stats');
}

/**
 * Get available languages
 */
export async function getAvailableLanguages(): Promise<{ languages: Language[] }> {
  return backendApi.get<{ languages: Language[] }>('/flow/languages');
}

/**
 * End a flow session
 */
export async function endFlowSession(sessionId: number): Promise<{
  success: boolean;
  session: FlowSession;
}> {
  return backendApi.post<{
    success: boolean;
    session: FlowSession;
  }>('/flow/session/end', { sessionId });
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit: number = 10): Promise<{
  leaderboard: Array<{
    user_id: string;
    points: number;
    daily_streak: number;
    username: string;
    reputation: number;
  }>;
}> {
  return backendApi.get<{
    leaderboard: Array<{
      user_id: string;
      points: number;
      daily_streak: number;
      username: string;
      reputation: number;
    }>;
  }>('/flow/leaderboard', { limit: limit.toString() });
}
