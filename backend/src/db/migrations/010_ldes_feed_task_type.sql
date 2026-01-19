-- Migration 010: Add ldes_feed task type
-- Created: 2026-01-18
-- This migration adds the 'ldes_feed' task type to the tasks and task_schedulers tables

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints
-- We need to recreate the tables with the new constraint

-- First, create temporary tables with updated constraints
CREATE TABLE IF NOT EXISTS tasks_new (
    task_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type TEXT NOT NULL CHECK(task_type IN ('file_upload', 'ldes_sync', 'ldes_feed', 'triplestore_sync', 'harvest', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    source_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    metadata TEXT,
    logs TEXT,
    created_by TEXT,
    FOREIGN KEY(source_id) REFERENCES sources(source_id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users(username) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_schedulers_new (
    scheduler_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK(task_type IN ('file_upload', 'ldes_sync', 'ldes_feed', 'triplestore_sync', 'harvest', 'other')),
    schedule_config TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
    source_id INTEGER,
    last_run DATETIME,
    next_run DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY(source_id) REFERENCES sources(source_id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(username) ON DELETE SET NULL
);

-- Copy existing data
INSERT INTO tasks_new SELECT * FROM tasks;
INSERT INTO task_schedulers_new SELECT * FROM task_schedulers;

-- Drop old tables
DROP TABLE tasks;
DROP TABLE task_schedulers;

-- Rename new tables
ALTER TABLE tasks_new RENAME TO tasks;
ALTER TABLE task_schedulers_new RENAME TO task_schedulers;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_source_id ON tasks(source_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_type_status ON tasks(task_type, status);

CREATE INDEX IF NOT EXISTS idx_task_schedulers_enabled ON task_schedulers(enabled);
CREATE INDEX IF NOT EXISTS idx_task_schedulers_source_id ON task_schedulers(source_id);
CREATE INDEX IF NOT EXISTS idx_task_schedulers_next_run ON task_schedulers(next_run);
