/**
 * SQLite Database — SmartPrint
 * 
 * Initializes SQLite via better-sqlite3 for temporary job metadata.
 * Uses lazy initialization to avoid "database is locked" errors during
 * Next.js parallel page data collection at build time.
 * Files are stored on the filesystem — DB only stores metadata.
 */

import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import path from "path";
import fs from "fs";

// Database path — stored in project root /data directory
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "smartprint.db");

// Singleton database instance
let _db: BetterSqlite3.Database | null = null;

function getDb(): BetterSqlite3.Database {
  if (_db) return _db;

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Ensure temp storage directory exists
  const storageDir = path.join(process.cwd(), "tmp", "smartprint");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("busy_timeout = 5000");

  // Create jobs table if it doesn't exist
  _db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_token TEXT,
      created_at INTEGER NOT NULL,
      opened_at INTEGER,
      printed_at INTEGER,
      expired_at INTEGER,
      is_encrypted INTEGER DEFAULT 0,
      settings TEXT,
      file_count INTEGER DEFAULT 1,
      status TEXT DEFAULT 'waiting',
      file_names TEXT
    )
  `);

  // Migrate: add user_token if missing
  try {
    _db.exec(`ALTER TABLE jobs ADD COLUMN user_token TEXT`);
  } catch { }


  return _db;
}

// ── Type definitions ──────────────────────────────────────────────

export interface Job {
  id: string;
  user_id: string;
  user_token: string | null;
  created_at: number;
  opened_at: number | null;
  printed_at: number | null;
  expired_at: number | null;
  is_encrypted: number;
  settings: string | null;
  file_count: number;
  status: string;
  file_names: string | null;
}

export interface CreateJobParams {
  id: string;
  userId: string;
  userToken: string;
  isEncrypted: boolean;
  settings: string;
  fileCount: number;
  fileNames: string[];
}

// ── Database helper functions ─────────────────────────────────────

export function createJob(params: CreateJobParams): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO jobs (id, user_id, user_token, created_at, is_encrypted, settings, file_count, file_names, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting')
  `);
  stmt.run(
    params.id,
    params.userId,
    params.userToken,
    Date.now(),
    params.isEncrypted ? 1 : 0,
    params.settings,
    params.fileCount,
    JSON.stringify(params.fileNames)
  );
}

export function getJob(jobId: string): Job | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId) as Job | undefined;
}

export function getAllActiveJobs(): Job[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM jobs 
    WHERE status NOT IN ('expired', 'deleted') 
    ORDER BY created_at DESC
  `).all() as Job[];
}

export function markJobOpened(jobId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE jobs SET opened_at = ?, status = 'opened' WHERE id = ? AND opened_at IS NULL
  `).run(Date.now(), jobId);
}

export function markJobPrinted(jobId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE jobs SET printed_at = ?, status = 'printed' WHERE id = ?
  `).run(Date.now(), jobId);
}

export function markJobExpired(jobId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE jobs SET expired_at = ?, status = 'expired' WHERE id = ?
  `).run(Date.now(), jobId);
}

export function markJobDeleted(jobId: string): void {
  const db = getDb();
  db.prepare(`UPDATE jobs SET status = 'deleted' WHERE id = ?`).run(jobId);
}

export function updateJobStatus(jobId: string, status: string): void {
  const db = getDb();
  db.prepare(`UPDATE jobs SET status = ? WHERE id = ?`).run(status, jobId);
}

export function getExpiredJobs(): Job[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM jobs 
    WHERE opened_at IS NOT NULL 
      AND status NOT IN ('expired', 'printed', 'deleted')
      AND (? - opened_at) > 100000
  `).all(Date.now()) as Job[];
}

export function getStaleJobs(): Job[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM jobs
    WHERE status NOT IN ('expired', 'printed', 'deleted')
      AND (? - created_at) > 3600000
  `).all(Date.now()) as Job[];
}

export default getDb;
