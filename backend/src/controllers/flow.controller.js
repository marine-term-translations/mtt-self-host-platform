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
    
    const userId = req.session.user.orcid;
    
    // Create a new session
    const session = gamificationService.startFlowSession(userId);
    
    // Get user stats and challenges
    const stats = gamificationService.getUserStats(userId);
    const challenges = gamificationService.getDailyChallenges(userId);
    
    res.json({
      success: true,
      sessionId: session.id,
      stats,
      challenges,
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
    
    const userId = req.session.user.orcid;
    const task = flowService.getNextTask(userId);
    
    res.json(task);
  } catch (error) {
    console.error("[Flow] Get next task error:", error);
    res.status(500).json({ error: error.message || "Failed to get next task" });
  }
}

/**
 * Submit a review (approve or reject)
 */
async function submitReview(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.session.user.orcid;
    const { translationId, action, sessionId } = req.body;
    
    if (!translationId || !action) {
      return res.status(400).json({ error: "Missing required fields: translationId, action" });
    }
    
    const result = flowService.submitReview({
      userId,
      translationId,
      action,
      sessionId,
    });
    
    // Update session stats if provided
    if (sessionId) {
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
 * Submit a new translation
 */
async function submitTranslation(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.session.user.orcid;
    const { termFieldId, language, value, sessionId } = req.body;
    
    if (!termFieldId || !language || !value) {
      return res.status(400).json({ 
        error: "Missing required fields: termFieldId, language, value" 
      });
    }
    
    const result = flowService.submitTranslation({
      userId,
      termFieldId,
      language,
      value,
      sessionId,
    });
    
    // Update session stats if provided
    if (sessionId) {
      gamificationService.updateFlowSession(sessionId, {
        translations_completed: 1,
        points_earned: result.points,
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error("[Flow] Submit translation error:", error);
    res.status(500).json({ error: error.message || "Failed to submit translation" });
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
    
    const userId = req.session.user.orcid;
    const stats = gamificationService.getUserStats(userId);
    const challenges = gamificationService.getDailyChallenges(userId);
    
    res.json({
      stats,
      challenges,
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

module.exports = {
  startFlow,
  getNextTask,
  submitReview,
  submitTranslation,
  getStats,
  getLanguages,
  endSession,
  getLeaderboard,
};
