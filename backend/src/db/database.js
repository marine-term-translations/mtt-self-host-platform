// Database module - initializes and exports the SQLite database instance

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const config = require("../config");

let db = null;

/**
 * Get the database instance
 * @returns {Database} The SQLite database instance
 */
function getDatabase() {
  if (!db) {
    db = new Database(config.translations.dbPath);
  }
  return db;
}

/**
 * Check if the database has been initialized with schema
 * @returns {boolean} True if terms table exists
 */
function isDatabaseInitialized() {
  const database = getDatabase();
  const hasTermsTable = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='terms'"
    )
    .get();
  return Boolean(hasTermsTable);
}

/**
 * Apply schema to the database
 */
function applySchema() {
  const database = getDatabase();
  const schemaPath = path.join(__dirname, "migrations/schema.sql");
  const schemaSQL = fs.readFileSync(schemaPath, "utf8");
  database.exec(schemaSQL);
  console.log("Schema applied to SQLite DB.");
}

/**
 * Close the database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Helper: Resolve username to user_id
 * Provides backward compatibility layer for APIs that accept username
 * @param {string} username - The username to resolve
 * @returns {number|null} The user_id or null if not found
 */
function resolveUsernameToId(username) {
  const database = getDatabase();
  const user = database
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  return user ? user.id : null;
}

/**
 * Helper: Get user by ID
 * @param {number} userId - The user ID
 * @returns {object|null} The user object or null if not found
 */
function getUserById(userId) {
  const database = getDatabase();
  return database
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId);
}

/**
 * Helper: Get user by username
 * @param {string} username - The username
 * @returns {object|null} The user object or null if not found
 */
function getUserByUsername(username) {
  const database = getDatabase();
  return database
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
}

module.exports = {
  getDatabase,
  isDatabaseInitialized,
  applySchema,
  closeDatabase,
  resolveUsernameToId,
  getUserById,
  getUserByUsername,
};
