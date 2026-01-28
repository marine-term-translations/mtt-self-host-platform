// Task dispatcher service - handles scheduled task execution

const { getDatabase } = require('../db/database');
const axios = require('axios');
const config = require('../config');
const { CronExpressionParser } = require('cron-parser');
const datetime = require('../utils/datetime');

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
      AND (next_run IS NULL OR datetime(next_run) <= datetime('now'))
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
    
    // Check if there's already a running or pending task for this source
    if (scheduler.source_id) {
      const existingTask = db.prepare(`
        SELECT * FROM tasks 
        WHERE source_id = ? 
        AND task_type = ?
        AND status IN ('pending', 'running')
        LIMIT 1
      `).get(scheduler.source_id, scheduler.task_type);
      
      if (existingTask) {
        console.log(`Postponing scheduler ${scheduler.scheduler_id} (${scheduler.name}) - task ${existingTask.task_id} is already ${existingTask.status} for source ${scheduler.source_id}`);
        
        // Postpone by calculating next run and adding a small delay (1 minute)
        const nextRun = calculateNextRun(scheduleConfig);
        if (nextRun) {
          // Add 1 minute to the next run to retry after current task might be done
          const postponedRun = datetime.add(nextRun, 1, 'minute');
          
          db.prepare("UPDATE task_schedulers SET next_run = ? WHERE scheduler_id = ?")
            .run(postponedRun, scheduler.scheduler_id);
        }
        return; // Don't create a new task
      }
    }
    
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
      console.log(`Scheduler ${scheduler.scheduler_id} next run scheduled for: ${nextRun}`);
    } else {
      console.warn(`Could not calculate next run for scheduler ${scheduler.scheduler_id}`);
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
        return datetime.format(datetime.add(datetime.now(), interval, 'second'), 'YYYY-MM-DD HH:mm:ss');
      }
    }
    
    // If cron expression is specified, parse it properly
    if (scheduleConfig.cron) {
      try {
        const interval = CronExpressionParser.parse(scheduleConfig.cron);
        const nextDate = interval.next().toDate();
        return datetime.format(nextDate, 'YYYY-MM-DD HH:mm:ss');
      } catch (cronErr) {
        console.error('Error parsing cron expression:', cronErr.message);
        // Fallback to 1 hour if cron parsing fails
        return datetime.format(datetime.add(datetime.now(), 1, 'hour'), 'YYYY-MM-DD HH:mm:ss');
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
    const timestamp = datetime.toISO(datetime.now());
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
      case 'ldes_feed':
        await executeLdesFeedTask(task, addLog);
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
  
  const db = getDatabase();
  
  try {
    // Get source information
    const source = db.prepare("SELECT * FROM sources WHERE source_id = ?").get(task.source_id);
    
    if (!source) {
      throw new Error(`Source ${task.source_id} not found`);
    }
    
    if (!source.translation_config) {
      throw new Error('Source has no translation configuration');
    }
    
    if (!source.graph_name) {
      throw new Error('Source has no graph_name specified');
    }
    
    addLog(`Connected to source: ${source.graph_name}`);
    
    const translationConfig = JSON.parse(source.translation_config);
    
    // Parse field role configurations
    const labelFieldUri = source.label_field_uri;
    const referenceFieldUris = source.reference_field_uris ? JSON.parse(source.reference_field_uris) : [];
    const translatableFieldUris = source.translatable_field_uris ? JSON.parse(source.translatable_field_uris) : [];
    
    // Helper function to determine field roles (can have multiple roles)
    // A field can be both label AND translatable, for example
    const getFieldRoles = (fieldUri) => {
      const roles = [];
      if (fieldUri === labelFieldUri) roles.push('label');
      if (referenceFieldUris.includes(fieldUri)) roles.push('reference');
      if (translatableFieldUris.includes(fieldUri)) roles.push('translatable');
      // If no roles assigned, default to translatable
      if (roles.length === 0) roles.push('translatable');
      return roles;
    };
    
    // Process each configured type and its predicates
    let termsCreated = 0;
    let termsUpdated = 0;
    let fieldsCreated = 0;
    
    addLog(`Found ${translationConfig.types?.length || 0} RDF types to process`);
    
    for (const typeConfig of translationConfig.types || []) {
      const rdfType = typeConfig.type;
      const selectedPaths = typeConfig.paths || [];
      
      addLog(`Processing type: ${rdfType}`);
      
      // Query GraphDB for all subjects of this type
      const sparqlQuery = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT DISTINCT ?subject
        WHERE {
          GRAPH <${source.graph_name}> {
            ?subject rdf:type <${rdfType}> .
          }
        }
      `;
      
      const graphdbUrl = config.graphdb.url;
      const repository = config.graphdb.repository;
      const endpoint = `${graphdbUrl}/repositories/${repository}`;
      
      const response = await axios.post(endpoint, sparqlQuery, {
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json'
        },
        timeout: 30000
      });
      
      const subjects = response.data.results.bindings.map(b => b.subject.value);
      addLog(`Found ${subjects.length} subjects for type ${rdfType}`);
      
      // For each subject, create or update term
      for (const subjectUri of subjects) {
        // Check if term exists
        let term = db.prepare("SELECT * FROM terms WHERE uri = ?").get(subjectUri);
        
        if (!term) {
          // Create new term
          const insertTerm = db.prepare(
            "INSERT INTO terms (uri, source_id) VALUES (?, ?)"
          );
          const info = insertTerm.run(subjectUri, task.source_id);
          term = db.prepare("SELECT * FROM terms WHERE id = ?").get(info.lastInsertRowid);
          termsCreated++;
        } else if (term.source_id !== task.source_id) {
          // Update existing term's source_id
          db.prepare("UPDATE terms SET source_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(task.source_id, term.id);
          termsUpdated++;
        }
        
        // For each selected predicate path, create term_field and translations
        for (const pathConfig of selectedPaths) {
          const predicatePath = pathConfig.path;
          
          // Query for the values at this predicate path (with language tags)
          const valueResults = await getValueForPath(source.graph_name, subjectUri, predicatePath);
          
          if (valueResults && valueResults.length > 0) {
            // Check if migration 014 has been applied (translations table has status column)
            const tableInfo = db.prepare("PRAGMA table_info(translations)").all();
            const columns = tableInfo.map(col => col.name);
            const hasNewSchema = columns.includes('status') && columns.includes('source');
            
            // Get or create term_field using the first value
            const firstValue = valueResults[0].value;
            let termField = db.prepare(
              "SELECT * FROM term_fields WHERE term_id = ? AND field_uri = ?"
            ).get(term.id, predicatePath);
            
            if (!termField) {
              // Create new term_field with first value as original_value
              // Determine field_roles based on source configuration (can be multiple roles)
              const fieldRoles = getFieldRoles(predicatePath);
              const insertField = db.prepare(
                "INSERT INTO term_fields (term_id, field_uri, field_roles, original_value, source_id) VALUES (?, ?, ?, ?, ?)"
              );
              const fieldInfo = insertField.run(term.id, predicatePath, JSON.stringify(fieldRoles), firstValue, task.source_id);
              termField = db.prepare("SELECT * FROM term_fields WHERE id = ?").get(fieldInfo.lastInsertRowid);
              fieldsCreated++;
            }
            
            // If new schema is available, create 'original' translations for ALL language variants
            if (hasNewSchema) {
              for (const result of valueResults) {
                const { value, language } = result;
                
                // Insert original translation (OR IGNORE to avoid duplicates)
                db.prepare(
                  "INSERT OR IGNORE INTO translations (term_field_id, language, value, status, source) VALUES (?, ?, ?, 'original', 'rdf-ingest')"
                ).run(termField.id, language, value);
              }
            }
          }
        }
      }
      
      addLog(`Created ${termsCreated} new terms, updated ${termsUpdated} terms`);
    }
    
    addLog(`Sync completed: ${termsCreated} terms created, ${termsUpdated} terms updated, ${fieldsCreated} fields created`);
    
    // Update task metadata with results
    const currentMetadata = task.metadata ? JSON.parse(task.metadata) : {};
    const updatedMetadata = {
      ...currentMetadata,
      termsCreated,
      termsUpdated,
      fieldsCreated,
      completed: datetime.toISO(datetime.now())
    };
    
    db.prepare("UPDATE tasks SET metadata = ? WHERE task_id = ?")
      .run(JSON.stringify(updatedMetadata), task.task_id);
      
  } catch (error) {
    addLog(`Error during sync: ${error.message}`);
    throw error;
  }
}

/**
 * Helper function to get values for a predicate path with language tags
 * Supports nested paths like "ex:hasAuthor/foaf:name"
 * Returns array of objects with value and language information
 */
async function getValueForPath(graphName, subjectUri, predicatePath) {
  // Validate inputs
  if (!graphName || !subjectUri || !predicatePath) {
    console.error('Invalid parameters for getValueForPath:', { graphName, subjectUri, predicatePath });
    return [];
  }
  
  let pathParts;
  
  // Check if this is a full URI (contains ://) or starts with common URI schemes
  // If so, treat it as a single predicate, not a path to split
  if (predicatePath.includes('://') || 
      predicatePath.startsWith('http:') || 
      predicatePath.startsWith('https:') ||
      predicatePath.startsWith('urn:')) {
    // This is a full URI - don't split it
    pathParts = [predicatePath];
  } else {
    // This might be a property path like "ex:hasAuthor/foaf:name" - split on /
    pathParts = predicatePath.split('/').map(p => p.trim()).filter(p => p.length > 0);
  }
  
  if (pathParts.length === 0) {
    console.error('Empty predicate path after splitting:', predicatePath);
    return [];
  }
  
  // Build SPARQL property path - only wrap if not already wrapped
  const propertyPath = pathParts.map(p => {
    // If already wrapped in <>, use as-is
    if (p.startsWith('<') && p.endsWith('>')) {
      return p;
    }
    // Otherwise wrap it
    return `<${p}>`;
  }).join(' / ');

  
  // Query to get values with their language tags
  const sparqlQuery = `
    SELECT DISTINCT ?value (LANG(?value) as ?lang)
    WHERE {
      GRAPH <${graphName}> {
        <${subjectUri}> ${propertyPath} ?value .
        FILTER(isLiteral(?value))
      }
    }
    LIMIT 100
  `;

  try {
    const graphdbUrl = config.graphdb.url;
    const repository = config.graphdb.repository;
    const endpoint = `${graphdbUrl}/repositories/${repository}`;
    
    const response = await axios.post(endpoint, sparqlQuery, {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 30000
    });
    
    // Return array of {value, language} objects
    const results = response.data.results.bindings.map(b => ({
      value: b.value.value,
      language: b.lang?.value || 'undefined'  // Use 'undefined' if no language tag
    }));
    
    return results;
  } catch (error) {
    console.error('Error querying GraphDB:', error.message);
    return [];
  }
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
 * Execute an LDES feed creation task
 * Creates or updates an LDES feed for a source using py-sema
 */
async function executeLdesFeedTask(task, addLog) {
  addLog(`Executing LDES feed creation for source ${task.source_id}`);
  
  const { spawn } = require('child_process');
  const path = require('path');
  
  // Get database path from config
  const dbPath = path.resolve(config.translations.dbPath);
  const ldesScriptPath = path.join(__dirname, 'ldes.py');
  
  // Get prefix URI from task metadata or use default
  let prefixUri = 'https://mtt.vliz.be/api/ldes/data';
  if (task.metadata) {
    try {
      const metadata = JSON.parse(task.metadata);
      if (metadata.prefix_uri) {
        prefixUri = metadata.prefix_uri;
      }
    } catch (err) {
      addLog(`Warning: Could not parse task metadata: ${err.message}`);
    }
  }
  
  addLog(`Database path: ${dbPath}`);
  addLog(`LDES script: ${ldesScriptPath}`);
  addLog(`Prefix URI: ${prefixUri}`);
  
  return new Promise((resolve, reject) => {
    // Spawn Python process to execute LDES generation
    const python = spawn('python3', [
      ldesScriptPath,
      task.source_id.toString(),
      dbPath,
      prefixUri
    ]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      addLog(`[LDES] ${output.trim()}`);
    });
    
    python.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      addLog(`[LDES Error] ${output.trim()}`);
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        addLog('LDES feed creation completed successfully');
        resolve();
      } else {
        const error = new Error(`LDES generation failed with exit code ${code}`);
        if (stderr) {
          error.message += `\n${stderr}`;
        }
        reject(error);
      }
    });
    
    python.on('error', (err) => {
      addLog(`Failed to start Python process: ${err.message}`);
      reject(new Error(`Failed to execute LDES script: ${err.message}`));
    });
  });
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
      "SELECT task_id FROM tasks WHERE status = 'pending' ORDER BY datetime(created_at) ASC LIMIT 10"
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
