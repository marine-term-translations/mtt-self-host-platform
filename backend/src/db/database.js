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
  const schemaPath = path.join(__dirname, "../../schema.sql");
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

module.exports = {
  getDatabase,
  isDatabaseInitialized,
  applySchema,
  closeDatabase,
};
