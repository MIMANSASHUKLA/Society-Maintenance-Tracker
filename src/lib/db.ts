import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Also ensure uploads folder exists inside public/uploads
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'society.db');

declare global {
  var sqliteDb: DatabaseSync | undefined;
}

export const db = globalThis.sqliteDb ?? (() => {
  const connection = new DatabaseSync(dbPath);
  connection.exec("PRAGMA journal_mode = WAL;");
  connection.exec("PRAGMA busy_timeout = 5000;");
  return connection;
})();

if (process.env.NODE_ENV !== 'production') {
  globalThis.sqliteDb = db;
}

// Function to initialize tables
export function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'resident')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Active Sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Complaints
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resident_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      photo_path TEXT,
      status TEXT CHECK(status IN ('Open', 'In Progress', 'Resolved')) DEFAULT 'Open',
      priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // History timeline
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaint_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      actor_id INTEGER NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id)
    );
  `);

  // Notices
  db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_important INTEGER DEFAULT 0,
      author_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );
  `);

  // Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Simulated Email logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Flats (Occupancy tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS flats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flat_no TEXT UNIQUE NOT NULL,
      owner_name TEXT NOT NULL,
      occupancy_status TEXT CHECK(occupancy_status IN ('Occupied', 'Vacant')) DEFAULT 'Occupied',
      maintenance_dues REAL DEFAULT 0.0
    );
  `);

  // Payments log
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flat_no TEXT NOT NULL,
      resident_name TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      ref_no TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default settings if not exists
  const checkSettings = db.prepare("SELECT COUNT(*) as count FROM settings WHERE key = 'overdue_threshold_days'");
  const result = checkSettings.get() as { count: number } | undefined;
  if (!result || result.count === 0) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('overdue_threshold_days', '3')").run();
  }
}

// Call initDb safely when module is loaded
try {
  initDb();
} catch (e) {
  console.warn("Database initialization deferred (database is busy or locked):", e);
}
