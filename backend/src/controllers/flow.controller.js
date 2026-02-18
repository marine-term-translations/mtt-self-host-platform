// Flow controller - handles HTTP requests for Translation Flow

const flowService = require("../services/flow.service");
const gamificationService = require("../services/gamification.service");

/**
 * Start a new flow session
 */
async function startFlow(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.session.user.id || req.session.user.user_id;
    const { language, source } = req.body;
    
    // Create a new session
    const session = gamificationService.startFlowSession(userId);
    
    // Get user stats and challenges
    const stats = gamificationService.getUserStats(userId);
    const challenges = gamificationService.getDailyChallenges(userId);
    const dailyGoal = gamificationService.getDailyGoal(userId);
    
    res.json({
      success: true,
      sessionId: session.id,
      stats,
      challenges,
      dailyGoal,
      language: language || null,
      source: source || null,
    });
  } catch (error) {
    console.error("[Flow] Start flow error:", error);
    res.status(500).json({ error: error.message || "Failed to start flow session" });
  }
}

/**
 * Get next task (review or translation)
 */
async function getNextTask(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.session.user.id || req.session.user.user_id;
    const language = req.query.language || null;
    const source = req.query.source || null;
    const task = flowService.getNextTask(userId, language, source);
    
    res.json(task);
  } catch (error) {
    console.error("[Flow] Get next task error:", error);
    res.status(500).json({ error: error.message || "Failed to get next task" });
  }
}

/**
 * Submit a review (approve, reject, or discuss)
 */
async function submitReview(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.session.user.id || req.session.user.user_id;
    const { translationId, action, sessionId, rejectionReason, discussionMessage } = req.body;
    
    if (!translationId || !action) {
      return res.status(400).json({ error: "Missing required fields: translationId, action" });
    }
    
    if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({ error: "Rejection reason is required when rejecting a translation" });
    }
    
    if (action === 'discuss' && (!discussionMessage || !discussionMessage.trim())) {
      return res.status(400).json({ error: "Discussion message is required when opening a discussion" });
    }
    
    const result = flowService.submitReview({
      userId,
      translationId,
      action,
      sessionId,
      rejectionReason,
      discussionMessage,
    });
    
    // Update session stats if provided (only for approve/reject, not discuss)
    if (sessionId && action !== 'discuss') {
      gamificationService.updateFlowSession(sessionId, {
        reviews_completed: 1,
        points_earned: result.points,
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error("[Flow] Submit review error:", error);
    res.status(500).json({ error: error.message || "Failed to submit review" });
  }
}

/**
 * Get user stats
 */
async function getStats(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.session.user.id || req.session.user.user_id;
    const stats = gamificationService.getUserStats(userId);
    const challenges = gamificationService.getDailyChallenges(userId);
    const dailyGoal = gamificationService.getDailyGoal(userId);
    
    res.json({
      stats,
      challenges,
      dailyGoal,
    });
  } catch (error) {
    console.error("[Flow] Get stats error:", error);
    res.status(500).json({ error: error.message || "Failed to get stats" });
  }
}

/**
 * Get available languages
 */
async function getLanguages(req, res) {
  try {
    const languages = flowService.getAvailableLanguages();
    res.json({ languages });
  } catch (error) {
    console.error("[Flow] Get languages error:", error);
    res.status(500).json({ error: error.message || "Failed to get languages" });
  }
}

/**
 * End flow session
 */
async function endSession(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }
    
    const finalSession = gamificationService.endFlowSession(sessionId);
    
    res.json({
      success: true,
      session: finalSession,
    });
  } catch (error) {
    console.error("[Flow] End session error:", error);
    res.status(500).json({ error: error.message || "Failed to end session" });
  }
}

/**
 * Get leaderboard
 */
async function getLeaderboard(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = gamificationService.getLeaderboard(limit);
    
    res.json({ leaderboard });
  } catch (error) {
    console.error("[Flow] Get leaderboard error:", error);
    res.status(500).json({ error: error.message || "Failed to get leaderboard" });
  }
}

/**
 * Get translation history
 */
async function getTranslationHistory(req, res) {
  try {
    const translationId = parseInt(req.params.translationId);
    
    if (!translationId) {
      return res.status(400).json({ error: "Missing translationId" });
    }
    
    const history = flowService.getTranslationHistory(translationId);
    
    res.json({ history });
  } catch (error) {
    console.error("[Flow] Get translation history error:", error);
    res.status(500).json({ error: error.message || "Failed to get translation history" });
  }
}

/**
 * Get a specific translation task by ID
 */
async function getTranslationTask(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.session.user.id || req.session.user.user_id;
    const translationId = parseInt(req.params.translationId);
    
    if (!translationId) {
      return res.status(400).json({ error: "Missing translationId" });
    }
    
    const task = flowService.getTranslationTask(translationId, userId);
    
    if (!task) {
      return res.status(404).json({ error: "Translation not found" });
    }
    
    res.json(task);
  } catch (error) {
    console.error("[Flow] Get translation task error:", error);
    res.status(500).json({ error: error.message || "Failed to get translation task" });
  }
}

/**
 * Skip current task and get next one
 */
async function skipTask(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.session.user.id || req.session.user.user_id;
    const { taskType, termId, fieldUri, language } = req.body;
    
    // Log the skip action (optional - for analytics)
    flowService.logSkipAction({
      userId,
      taskType,
      termId,
      fieldUri,
      language,
    });
    
    res.json({
      success: true,
      message: "Task skipped successfully",
    });
  } catch (error) {
    console.error("[Flow] Skip task error:", error);
    res.status(500).json({ error: error.message || "Failed to skip task" });
  }
}

module.exports = {
  startFlow,
  getNextTask,
  submitReview,
  getStats,
  getLanguages,
  endSession,
  getLeaderboard,
  getTranslationHistory,
  getTranslationTask,
  skipTask
};
