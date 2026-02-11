// Database initialization service - handles database creation on startup

const fs = require("fs");
const path = require("path");
const config = require("../config");
const { isDatabaseInitialized, applySchema, getDatabase } = require("../db/database");
const { initializeLanguageCommunities } = require("./community.service");

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
 * Apply all migrations that haven't been applied yet
 */
function applyMigrations() {
  const db = getDatabase();
  const migrationsDir = path.join(__dirname, '../db/migrations');
  
  // Create migrations_applied table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations_applied (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Get list of migration files (excluding schema.sql)
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f !== 'schema.sql')
    .sort();
  
  console.log(`[DB Init] Found ${migrationFiles.length} migration file(s)`);
  
  // Apply each migration
  migrationFiles.forEach(filename => {
    const migrationName = filename.replace('.sql', '');
    
    // Check if migration has been applied
    const applied = db.prepare(
      "SELECT migration_name FROM migrations_applied WHERE migration_name = ?"
    ).get(migrationName);
    
    if (applied) {
      console.log(`[DB Init] Migration ${filename} already applied, skipping`);
      return;
    }
    
    console.log(`[DB Init] Applying migration: ${filename}`);
    const migrationPath = path.join(migrationsDir, filename);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    try {
      db.exec(migrationSQL);
      
      // Record that this migration has been applied
      db.prepare(
        "INSERT INTO migrations_applied (migration_name) VALUES (?)"
      ).run(migrationName);
      
      console.log(`[DB Init] ✓ Migration ${filename} applied successfully`);
    } catch (err) {
      console.error(`[DB Init] ERROR applying migration ${filename}:`, err.message);
      throw err;
    }
  });
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
  } else {
    console.log('[DB Init] ✓ Database already initialized');
  }
  
  // Apply any pending migrations
  console.log('[DB Init] Checking for migrations...');
  applyMigrations();
  
  return true;
}

/**
 * Run bootstrap process on app startup
 */
function bootstrap() {
  try {
    console.log('[DB Init] Starting database initialization...');
    initializeDatabase();
    console.log('[DB Init] Database ready');
    
    // Initialize language communities
    console.log('[DB Init] Initializing language communities...');
    const result = initializeLanguageCommunities();
    if (result.success) {
      console.log(`[DB Init] ✓ Language communities initialized (${result.created} created)`);
    } else {
      console.error('[DB Init] WARNING: Failed to initialize language communities:', result.error);
    }
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
