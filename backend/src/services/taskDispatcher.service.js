// Task dispatcher service - handles scheduled task execution

const { getDatabase } = require('../db/database');
const axios = require('axios');
const config = require('../config');
const parser = require('cron-parser');

/**
 * Check for tasks that need to be dispatched based on schedulers
 * This should be called periodically (e.g., every minute)
 */
function checkAndDispatchScheduledTasks() {
  const db = getDatabase();
  
  try {
    // Get all enabled schedulers where next_run is in the past or null
    const schedulers = db.prepare(`
      SELECT * FROM task_schedulers 
      WHERE enabled = 1 
      AND (next_run IS NULL OR next_run <= datetime('now'))
      ORDER BY scheduler_id
    `).all();
    
    for (const scheduler of schedulers) {
      try {
        dispatchTaskFromScheduler(scheduler);
      } catch (err) {
        console.error(`Error dispatching task from scheduler ${scheduler.scheduler_id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error checking scheduled tasks:', err.message);
  }
}

/**
 * Dispatch a task from a scheduler
 */
function dispatchTaskFromScheduler(scheduler) {
  const db = getDatabase();
  
  try {
    // Parse schedule config
    const scheduleConfig = JSON.parse(scheduler.schedule_config);
    
    // Create a task
    const metadata = JSON.stringify({
      scheduler_id: scheduler.scheduler_id,
      scheduler_name: scheduler.name,
      schedule_config: scheduleConfig
    });
    
    // Use NULL for created_by instead of 'system' to avoid FOREIGN KEY constraint
    const taskStmt = db.prepare(
      "INSERT INTO tasks (task_type, source_id, metadata, created_by, status) VALUES (?, ?, ?, ?, ?)"
    );
    const taskInfo = taskStmt.run(
      scheduler.task_type,
      scheduler.source_id,
      metadata,
      null, // NULL instead of 'system' to avoid FOREIGN KEY constraint
      'pending'
    );
    const taskId = taskInfo.lastInsertRowid;
    
    console.log(`Dispatched task ${taskId} from scheduler ${scheduler.scheduler_id} (${scheduler.name})`);
    
    // Update scheduler's last_run
    db.prepare("UPDATE task_schedulers SET last_run = datetime('now') WHERE scheduler_id = ?")
      .run(scheduler.scheduler_id);
    
    // Calculate next_run based on schedule config
    const nextRun = calculateNextRun(scheduleConfig);
    if (nextRun) {
      db.prepare("UPDATE task_schedulers SET next_run = ? WHERE scheduler_id = ?")
        .run(nextRun, scheduler.scheduler_id);
    }
    
    // Execute the task asynchronously
    executeTask(taskId);
    
  } catch (err) {
    console.error(`Error in dispatchTaskFromScheduler for scheduler ${scheduler.scheduler_id}:`, err.message);
  }
}

/**
 * Calculate next run time based on schedule config
 * Supports cron expressions and intervals
 */
function calculateNextRun(scheduleConfig) {
  try {
    // If interval is specified (in seconds)
    if (scheduleConfig.interval) {
      const interval = parseInt(scheduleConfig.interval);
      if (!isNaN(interval) && interval > 0) {
        const now = new Date();
        now.setSeconds(now.getSeconds() + interval);
        return now.toISOString().replace('T', ' ').substring(0, 19);
      }
    }
    
    // If cron expression is specified, parse it properly
    if (scheduleConfig.cron) {
      try {
        const interval = parser.parseExpression(scheduleConfig.cron);
        const nextDate = interval.next().toDate();
        return nextDate.toISOString().replace('T', ' ').substring(0, 19);
      } catch (cronErr) {
        console.error('Error parsing cron expression:', cronErr.message);
        // Fallback to 1 hour if cron parsing fails
        const now = new Date();
        now.setHours(now.getHours() + 1);
        return now.toISOString().replace('T', ' ').substring(0, 19);
      }
    }
    
    return null;
  } catch (err) {
    console.error('Error calculating next run:', err.message);
    return null;
  }
}

/**
 * Execute a pending task
 */
async function executeTask(taskId) {
  const db = getDatabase();
  const logs = [];
  
  // Helper to add log entries
  const addLog = (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.push(logEntry);
    console.log(`Task ${taskId}: ${message}`);
  };
  
  try {
    const task = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId);
    
    if (!task) {
      console.error(`Task ${taskId} not found`);
      return;
    }
    
    if (task.status !== 'pending') {
      console.log(`Task ${taskId} is not pending (status: ${task.status}), skipping`);
      return;
    }
    
    addLog(`Starting task execution (type: ${task.task_type})`);
    
    // Update task to running
    db.prepare(
      "UPDATE tasks SET status = 'running', started_at = datetime('now') WHERE task_id = ?"
    ).run(taskId);
    
    // Execute based on task type
    switch (task.task_type) {
      case 'file_upload':
        await executeFileUploadTask(task, addLog);
        break;
      case 'triplestore_sync':
        await executeSyncTask(task, addLog);
        break;
      case 'ldes_sync':
        await executeLdesSyncTask(task, addLog);
        break;
      case 'harvest':
        await executeHarvestTask(task, addLog);
        break;
      default:
        throw new Error(`Unknown task type: ${task.task_type}`);
    }
    
    addLog('Task completed successfully');
    
    // Mark task as completed with logs
    db.prepare(
      "UPDATE tasks SET status = 'completed', completed_at = datetime('now'), logs = ? WHERE task_id = ?"
    ).run(logs.join('\n'), taskId);
    
  } catch (err) {
    addLog(`Task failed with error: ${err.message}`);
    
    db.prepare(
      "UPDATE tasks SET status = 'failed', completed_at = datetime('now'), error_message = ?, logs = ? WHERE task_id = ?"
    ).run(err.message, logs.join('\n'), taskId);
  }
}

/**
 * Execute a file upload task
 */
async function executeFileUploadTask(task, addLog) {
  addLog(`Executing file upload task for source ${task.source_id}`);
  
  // File upload tasks are handled inline in the upload endpoint
  // This is here for completeness in case we need to retry failed uploads
  addLog('File upload task completed (processed inline)');
}

/**
 * Execute a triplestore sync task
 */
async function executeSyncTask(task, addLog) {
  addLog(`Executing triplestore sync for source ${task.source_id}`);
  
  // This would be implemented similar to the sync-terms endpoint
  // For now, we'll just log it
  addLog('Triplestore sync task execution placeholder');
  addLog('In production, this would query GraphDB and sync terms to database');
}

/**
 * Execute an LDES sync task
 */
async function executeLdesSyncTask(task, addLog) {
  addLog(`Executing LDES sync for source ${task.source_id}`);
  
  // In a real implementation, you would:
  // 1. Fetch the LDES feed
  // 2. Process new items
  // 3. Update the database
  addLog('LDES sync task execution placeholder');
}

/**
 * Execute a harvest task
 */
async function executeHarvestTask(task, addLog) {
  addLog(`Executing harvest task for source ${task.source_id}`);
  
  // In a real implementation, you would:
  // 1. Connect to the harvest source
  // 2. Fetch new data
  // 3. Process and store it
  addLog('Harvest task execution placeholder');
}

/**
 * Start the task dispatcher (runs periodically)
 */
function startTaskDispatcher(intervalMs = 60000) {
  console.log(`Starting task dispatcher (interval: ${intervalMs}ms)`);
  
  // Run immediately
  checkAndDispatchScheduledTasks();
  
  // Then run periodically
  setInterval(() => {
    checkAndDispatchScheduledTasks();
  }, intervalMs);
}

/**
 * Process pending tasks in the queue
 * This can be called to process tasks that were created but not yet started
 */
function processPendingTasks() {
  const db = getDatabase();
  
  try {
    const pendingTasks = db.prepare(
      "SELECT task_id FROM tasks WHERE status = 'pending' ORDER BY created_at ASC LIMIT 10"
    ).all();
    
    for (const { task_id } of pendingTasks) {
      executeTask(task_id).catch(err => {
        console.error(`Error executing pending task ${task_id}:`, err.message);
      });
    }
  } catch (err) {
    console.error('Error processing pending tasks:', err.message);
  }
}

module.exports = {
  startTaskDispatcher,
  checkAndDispatchScheduledTasks,
  executeTask,
  processPendingTasks
};
