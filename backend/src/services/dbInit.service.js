// Database initialization service - handles database creation on startup

const fs = require("fs");
const path = require("path");
const config = require("../config");
const { isDatabaseInitialized, applySchema, getDatabase } = require("../db/database");

/**
 * Ensure the database directory exists
 */
function ensureDatabaseDirectory() {
  if (!config.translations.dbPath) {
    throw new Error('SQLITE_DB_PATH environment variable is not set');
  }

  const dbDir = path.dirname(config.translations.dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`[DB Init] Created database directory: ${dbDir}`);
  }
}

/**
 * Check if database file exists
 * @returns {boolean} True if database file exists
 */
function databaseFileExists() {
  return fs.existsSync(config.translations.dbPath);
}

/**
 * Initialize the database with schema if it doesn't exist or is uninitialized
 */
function initializeDatabase() {
  ensureDatabaseDirectory();

  const dbExists = databaseFileExists();
  
  if (!dbExists) {
    console.log(`[DB Init] Database file not found at ${config.translations.dbPath}`);
    console.log('[DB Init] Creating new database...');
  }

  // Get database instance (creates file if doesn't exist)
  getDatabase();

  // Check if schema has been applied
  if (!isDatabaseInitialized()) {
    console.log('[DB Init] Database schema not initialized');
    console.log('[DB Init] Applying schema from migrations/schema.sql...');
    applySchema();
    console.log('[DB Init] ✓ Database schema applied successfully');
    return true;
  } else {
    console.log('[DB Init] ✓ Database already initialized');
    return false;
  }
}

/**
 * Run bootstrap process on app startup
 */
function bootstrap() {
  try {
    console.log('[DB Init] Starting database initialization...');
    initializeDatabase();
    console.log('[DB Init] Database ready');
  } catch (err) {
    console.error('[DB Init] ERROR: Failed to initialize database:', err.message);
    console.error('[DB Init] Stack trace:', err.stack);
    throw new Error(`Database initialization failed: ${err.message}`);
  }
}

module.exports = {
  initializeDatabase,
  bootstrap,
  ensureDatabaseDirectory,
  databaseFileExists,
};
