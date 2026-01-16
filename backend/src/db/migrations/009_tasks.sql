-- Migration 009: Add tasks and task_schedulers tables
-- Created: 2026-01-16
-- This migration adds support for background task tracking and scheduled task management

-- Create the tasks table to track long-running operations
CREATE TABLE IF NOT EXISTS tasks (
    task_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type TEXT NOT NULL CHECK(task_type IN ('file_upload', 'ldes_sync', 'triplestore_sync', 'harvest', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    source_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    metadata TEXT, -- JSON string for additional task-specific data
    created_by TEXT,
    FOREIGN KEY(source_id) REFERENCES sources(source_id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users(username) ON DELETE SET NULL
);

-- Create the task_schedulers table for managing recurring tasks
CREATE TABLE IF NOT EXISTS task_schedulers (
    scheduler_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK(task_type IN ('file_upload', 'ldes_sync', 'triplestore_sync', 'harvest', 'other')),
    schedule_config TEXT NOT NULL, -- JSON string with cron expression or interval config
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_source_id ON tasks(source_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_type_status ON tasks(task_type, status);

CREATE INDEX IF NOT EXISTS idx_task_schedulers_enabled ON task_schedulers(enabled);
CREATE INDEX IF NOT EXISTS idx_task_schedulers_source_id ON task_schedulers(source_id);
CREATE INDEX IF NOT EXISTS idx_task_schedulers_next_run ON task_schedulers(next_run);
