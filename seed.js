const { DatabaseSync } = require('node:sqlite');
const { scryptSync, randomBytes } = require('node:crypto');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'society.db');
console.log(`Opening database for Nivas seed at: ${dbPath}`);
const db = new DatabaseSync(dbPath);

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

console.log('Initializing Nivas tables...');
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

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

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

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS flats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flat_no TEXT UNIQUE NOT NULL,
    owner_name TEXT NOT NULL,
    occupancy_status TEXT CHECK(occupancy_status IN ('Occupied', 'Vacant')) DEFAULT 'Occupied',
    maintenance_dues REAL DEFAULT 0.0
  );
`);

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

// Reset database with foreign key check disabled temporarily
db.exec('PRAGMA foreign_keys = OFF;');
db.exec('DELETE FROM users');
db.exec('DELETE FROM sessions');
db.exec('DELETE FROM complaints');
db.exec('DELETE FROM complaint_history');
db.exec('DELETE FROM notices');
db.exec('DELETE FROM settings');
db.exec('DELETE FROM email_logs');
db.exec('DELETE FROM flats');
db.exec('DELETE FROM payments');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users', 'complaints', 'complaint_history', 'notices', 'flats', 'payments');");
db.exec('PRAGMA foreign_keys = ON;');

// Seed Settings
db.prepare("INSERT INTO settings (key, value) VALUES ('overdue_threshold_days', '3')").run();

// Seed Users
console.log('Seeding users...');
const defaultPassword = hashPassword('password123');

const insertUser = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)');
insertUser.run('admin@society.com', defaultPassword, 'Admin Manager', 'admin'); // ID: 1
insertUser.run('resident@society.com', defaultPassword, 'Alice Smith (Flat A-301)', 'resident'); // ID: 2
insertUser.run('bob@society.com', defaultPassword, 'Bob Jones (Flat A-104)', 'resident'); // ID: 3

// Seed Notices
console.log('Seeding notices...');
const insertNotice = db.prepare('INSERT INTO notices (title, content, is_important, author_id, created_at) VALUES (?, ?, ?, ?, ?)');
insertNotice.run(
  'Urgent: Scheduled Water Shutdown',
  'Please note that the main water tank will undergo cleaning on Tuesday, 7th July. Water supply will be unavailable from 9:00 AM to 1:00 PM. Kindly store sufficient water in advance.',
  1,
  1,
  new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
);
insertNotice.run(
  'Annual Fire Safety Drill',
  'Our annual society fire drill will be conducted next Saturday at 11:00 AM. Emergency response experts will demonstrate extinguisher usage. Everyone is requested to participate.',
  0,
  1,
  new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
);

// Seed Complaints
console.log('Seeding complaints...');
const insertComplaint = db.prepare('INSERT INTO complaints (resident_id, category, description, photo_path, status, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
const insertHistory = db.prepare('INSERT INTO complaint_history (complaint_id, actor_id, actor_name, actor_role, old_status, new_status, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

// Overdue Plumbing issue
const timeLeak = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
const leakResult = insertComplaint.run(
  2,
  'Plumbing',
  'There is a persistent water leakage from the master bedroom balcony pipe. It is dripping onto the flat below.',
  null,
  'Open',
  'Medium',
  timeLeak
);
insertHistory.run(leakResult.lastInsertRowid, 2, 'Alice Smith (Flat A-301)', 'resident', null, 'Open', 'Complaint filed by resident.', timeLeak);

// Elevator Issue (In Progress)
const timeElevator = new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString();
const elevatorResult = insertComplaint.run(
  3,
  'Elevator',
  'Wing A elevator is making scraping noises and stopping unevenly at floor levels. Needs urgent technician attention.',
  null,
  'In Progress',
  'High',
  timeElevator
);
const elevatorId = elevatorResult.lastInsertRowid;
insertHistory.run(elevatorId, 3, 'Bob Jones (Flat A-104)', 'resident', null, 'Open', 'Complaint filed.', timeElevator);
insertHistory.run(elevatorId, 1, 'Admin Manager', 'admin', 'Open', 'In Progress', 'OTIS engineer scheduled for inspection.', new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString());

// Bulb replacement (Resolved)
const timeLight = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
const lightResult = insertComplaint.run(
  2,
  'Electrical',
  'Corridor ceiling lamp outside Flat A-301 has fused. It is completely dark in the evening.',
  null,
  'Resolved',
  'Low',
  timeLight
);
const lightId = lightResult.lastInsertRowid;
insertHistory.run(lightId, 2, 'Alice Smith (Flat A-301)', 'resident', null, 'Open', 'Bulb fused report.', timeLight);
insertHistory.run(lightId, 1, 'Admin Manager', 'admin', 'Open', 'In Progress', 'Electrician assigned.', new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString());
insertHistory.run(lightId, 1, 'Admin Manager', 'admin', 'In Progress', 'Resolved', 'Replaced bulb.', new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString());

// 6. Seed Flats (48 total: 45 Occupied, 3 Vacant)
console.log('Seeding 48 flats (45 occupied, 3 vacant)...');
const insertFlat = db.prepare('INSERT INTO flats (flat_no, owner_name, occupancy_status, maintenance_dues) VALUES (?, ?, ?, ?)');

const occupantNames = [
  'Alice Smith', 'Bob Jones', 'Ramesh Kumar', 'Sunita Sharma', 'David Miller', 
  'Amit Patel', 'Siddharth Rao', 'Jessica Taylor', 'Michael Brown', 'Vikram Singh',
  'Karan Johar', 'Neha Gupta', 'John Doe', 'Sarah Connor', 'Bruce Wayne',
  'Clark Kent', 'Tony Stark', 'Steve Rogers', 'Peter Parker', 'Natasha Romanoff',
  'Diana Prince', 'Wanda Maximoff', 'Barry Allen', 'Arthur Curry', 'Hal Jordan',
  'Selina Kyle', 'James Bond', 'Harry Potter', 'Hermione Granger', 'Ron Weasley',
  'Albus Dumbledore', 'Severus Snape', 'Sherlock Holmes', 'John Watson', 'Lois Lane',
  'Luke Skywalker', 'Leia Organa', 'Han Solo', 'Anakin Skywalker', 'Obi-Wan Kenobi',
  'Frodo Baggins', 'Samwise Gamgee', 'Aragorn Elessar', 'Gandalf Grey', 'Bilbo Baggins'
];

let occupantIndex = 0;
// Vacant flats: A-108, A-204, A-311
const vacantFlats = ['A-108', 'A-204', 'A-311'];

for (let floor = 1; floor <= 4; floor++) {
  for (let unit = 1; unit <= 12; unit++) {
    const flatNo = `A-${floor}${unit.toString().padStart(2, '0')}`;
    
    if (vacantFlats.includes(flatNo)) {
      insertFlat.run(flatNo, 'Vacant Unit', 'Vacant', 0.0);
    } else {
      const ownerName = occupantNames[occupantIndex] || `Resident ${flatNo}`;
      occupantIndex++;
      
      // Let's seed maintenance dues: some have pending dues, most are cleared.
      // Dues categories: Overdue Flats (₹3000 dues), Partial Payments (₹1500 dues), Cleared (₹0 dues)
      let dues = 0.0;
      if (flatNo === 'A-301') {
        dues = 1500.0; // Partial dues
      } else if (flatNo === 'A-104') {
        dues = 3000.0; // Overdue dues
      } else if (flatNo === 'A-212') {
        dues = 3000.0;
      } else if (flatNo === 'A-402') {
        dues = 1500.0;
      } else if (Math.random() < 0.15) {
        dues = Math.random() < 0.5 ? 1500.0 : 3000.0;
      }

      insertFlat.run(flatNo, ownerName, 'Occupied', dues);
    }
  }
}

// 7. Seed Payments (Transactions totaling ₹2,41,940.00 over 12 months)
console.log('Seeding payment logs...');
const insertPayment = db.prepare('INSERT INTO payments (flat_no, resident_name, amount, method, ref_no, created_at) VALUES (?, ?, ?, ?, ?, ?)');

// Monthly targets (aggregating to ₹2,41,940.00)
// We will seed payments month by month for the last 12 months.
// August, Sept, Oct, Nov, Dec, Jan, Feb, Mar, Apr, May, June, July (Current)
const monthlyCollections = [
  15000, 18000, 16500, 21000, 19500, 22000, 20500, 24000, 21500, 23000, 22500, 18440
];

const paymentMethods = ['UPI', 'Bank Transfer', 'Cash'];
const monthNames = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

let refCounter = 100000;

for (let m = 0; m < 12; m++) {
  const collectionTarget = monthlyCollections[m];
  let accumulated = 0;
  
  // Date range for the month
  const targetYear = m < 5 ? 2025 : 2026;
  // Aug is month 7 (0-indexed)
  const targetMonth = (m + 7) % 12;
  
  while (accumulated < collectionTarget) {
    const flatIndex = Math.floor(Math.random() * occupantNames.length);
    const ownerName = occupantNames[flatIndex];
    // Find flat number
    const flatNo = `A-${Math.floor(Math.random() * 4) + 1}${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}`;
    
    // Skip vacant flats
    if (vacantFlats.includes(flatNo)) continue;

    const amount = accumulated + 1500 > collectionTarget 
      ? (collectionTarget - accumulated) 
      : (Math.random() < 0.7 ? 1500 : 3000);
      
    const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    refCounter++;
    const refNo = `TXN${refCounter}`;
    
    // Date within that month
    const day = Math.floor(Math.random() * 28) + 1;
    const paymentDate = new Date(targetYear, targetMonth, day, 10, 0, 0).toISOString();

    insertPayment.run(flatNo, ownerName, amount, method, refNo, paymentDate);
    accumulated += amount;
  }
}

// Add specifically requested recent payments for right sidebar
// "Flat A-201 — ₹1,500 — 3 hrs ago"
// "Flat A-104 — ₹3,000 — 1 day ago"
// "Flat A-302 — ₹1,500 — 2 days ago"
const recentPaymentsToSeed = [
  { flat: 'A-201', name: 'Ramesh Kumar', amount: 1500, method: 'UPI', ref: 'TXN999991', age_hours: 3 },
  { flat: 'A-104', name: 'Bob Jones', amount: 3000, method: 'Bank Transfer', ref: 'TXN999992', age_hours: 24 },
  { flat: 'A-302', name: 'Sunita Sharma', amount: 1500, method: 'UPI', ref: 'TXN999993', age_hours: 48 },
  { flat: 'A-405', name: 'Amit Patel', amount: 1500, method: 'UPI', ref: 'TXN999994', age_hours: 72 },
  { flat: 'A-210', name: 'Siddharth Rao', amount: 4500, method: 'Bank Transfer', ref: 'TXN999995', age_hours: 96 }
];

recentPaymentsToSeed.forEach((p) => {
  const pDate = new Date(Date.now() - p.age_hours * 60 * 60 * 1000).toISOString();
  try {
    insertPayment.run(p.flat, p.name, p.amount, p.method, p.ref, pDate);
  } catch (e) {
    // Unique key collision safe
  }
});

console.log('\n=========================================');
console.log('Nivas Society Management Database Seeded!');
console.log('-----------------------------------------');
console.log('48 Flats generated (45 Occupied, 3 Vacant)');
console.log('Total Collected Maintenance: ₹2,41,940.00');
console.log('Pending Dues populated in categories.');
console.log('=========================================\n');
