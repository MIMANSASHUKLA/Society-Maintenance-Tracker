const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'society.db');
if (!fs.existsSync(dbPath)) {
  console.log('Database file does not exist. No data to wipe.');
  process.exit(0);
}

console.log(`Connecting to database at: ${dbPath}`);
const db = new DatabaseSync(dbPath);

try {
  // Disable foreign keys temporarily for a safe clean cascade
  db.exec('PRAGMA foreign_keys = OFF;');

  console.log('Wiping active sessions...');
  db.exec('DELETE FROM sessions;');

  console.log('Wiping complaints & history timeline logs...');
  db.exec('DELETE FROM complaint_history;');
  db.exec('DELETE FROM complaints;');

  console.log('Wiping notice boards...');
  db.exec('DELETE FROM notices;');

  console.log('Wiping maintenance collections payments...');
  db.exec('DELETE FROM payments;');

  console.log('Wiping system mail logs...');
  db.exec('DELETE FROM email_logs;');

  console.log('Wiping all user accounts...');
  db.exec('DELETE FROM users;');

  console.log('Wiping all flat units...');
  db.exec("DELETE FROM flats;");

  console.log('Resetting default settings config keys...');
  db.exec('DELETE FROM settings;');
  db.prepare("INSERT INTO settings (key, value) VALUES ('overdue_threshold_days', '3')").run();
  db.prepare("INSERT INTO settings (key, value) VALUES ('monthly_maintenance_rate', '1500')").run();

  // Re-enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('Vacuuming database to release free space and shrink the disk file...');
  db.exec('VACUUM;');

  console.log('✨ SUCCESS: Entire website database has been fully wiped to a clean, fresh state!');
  console.log('👉 You can now open the website in your browser, register a brand new Admin account from the sign-up tab, and manage the vacant flats list!');
} catch (error) {
  console.error('Error wiping database to fresh state:', error);
}
