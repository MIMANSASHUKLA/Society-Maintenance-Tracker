# Nivas - Society Management Dashboard

Nivas is a premium, modern 3-column Society Management Dashboard designed to manage apartment operations. Built with a stunning dark theme (`#0A0A0F`), soft radial glows, and glassmorphism, Nivas combines maintenance ticket lifecycle tracking, community notice boards, flats inventory occupancy metrics, financial collection bar charts, and pending dues donut charts.

---

## Technical Stack & Architecture

- **Framework**: Next.js 14 (App Router, Server Actions & React Client Components)
- **Database**: SQLite powered by Node.js built-in native `node:sqlite` module (zero external SQL library requirements, zero native compiler setups)
- **Styling**: Modern Custom Vanilla CSS featuring dynamic responsive grids, interactive glassmorphic panels, status color-codes, CSS conic-gradient charts, and animations
- **Mail Transporter**: Nodemailer with a simulated DB mail-log fallback for seamless offline review
- **Authentication**: Custom SQLite-backed session system storing session keys in secure HTTP-only cookies; passwords hashed securely using Node's native `crypto.scryptSync`

---

## System Design Write-Up (Evaluation Focus)

### 1. Complaint Lifecycle and Status History Model
A complaint travels through three distinct status phases: `Open` ➔ `In Progress` ➔ `Resolved`. Once a complaint status changes to `Resolved`, it is marked closed and further state updates are locked. 
To maintain a transparent audit log, changes are recorded in the `complaint_history` table. Each entry stores:
- `complaint_id`: Foreign key linking to the parent ticket.
- `actor_id`, `actor_name`, `actor_role`: Captures who triggered the transition (Resident or Administrator).
- `old_status` & `new_status`: Logs the state transition boundaries.
- `note`: Explanatory comment or action-taken note.
- `created_at`: Precise timestamp of transition.
This model enables rebuilding the entire lifecycle timeline on the frontend, showing exactly when a ticket was created, who picked it up, and how it was resolved.

### 2. Overdue Detection and Priority Handling
Instead of static batch cron jobs, overdue detection is executed dynamically on fetch queries.
- **Configurable Limit**: Admin can update `overdue_threshold_days` via the settings API (stored in SQLite).
- **Detection Algorithm**: When loading tickets, the age of each open ticket is computed:
  $$\text{age\_days} = \lfloor \frac{\text{CurrentTime} - \text{CreatedTime}}{86400000} \rfloor$$
  If a ticket's status is not `Resolved` and $\text{age\_days} \geq \text{threshold}$, the system flags it as overdue (`is_overdue = 1`).
- **Sorting Hierarchy**: Admin dashboard queries prioritize overdue tickets by placing them at the top. The complete sorting logic is:
  $$\text{Overdue Status (Desc)} \rightarrow \text{Priority Weight (High} > \text{Medium} > \text{Low)} \rightarrow \text{Created Date (Newest First)}$$
  This guarantees critical and overdue items surface immediately.

### 3. Photo Handling Design
When filing a complaint, residents can upload a photo. The image is parsed via `request.formData()` in the API route.
- To prevent file namespace collisions, filenames are normalized and prefixed with a unique hash: `${Date.now()}-${randomSuffix}${extension}`.
- Files are saved directly to the local filesystem at `public/uploads/` using Node's `fs.promises.writeFile`.
- The relative path `/uploads/filename` is stored in the database's `photo_path` column and served as a static asset by Next.js, allowing instant, offline photo inspections.

### 4. Notification Flow & Quick Reminders
Automated notices trigger Nodemailer SMTP dispatches:
- **Complaint Updates**: When an admin updates a ticket status, the system queries the filer's email and sends a status update notice, including the admin's notes.
- **Important Announcements**: When an admin posts a notice marked "Important", the system triggers email notices to all registered residents.
- **Quick Reminders**: On the Admin dashboard, clicking on a resident's avatar in the "Send Reminder" panel immediately triggers a payment outstanding notice email to that resident.
- **Offline Simulation fallback**: To ensure the application runs smoothly without third-party email account setups, email alerts are logged to an `email_logs` table. Admins can view these sent emails in real-time in the "Automated Mail Server Logs" tab on the dashboard.

---

## Database Schema (DDL)

```sql
-- Users table (Resident or Admin)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'resident')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Active User Sessions
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Maintenance Tickets
CREATE TABLE complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_path TEXT,
  status TEXT CHECK(status IN ('Open', 'In Progress', 'Resolved')) DEFAULT 'Open',
  priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES users(id)
);

-- Timeline and State Audit Logs
CREATE TABLE complaint_history (
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

-- Notices table
CREATE TABLE notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_important INTEGER DEFAULT 0,
  author_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- App settings (overdue threshold limit)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Simulated Mail logs for verification
CREATE TABLE email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Flats (Occupancy tracking)
CREATE TABLE flats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flat_no TEXT UNIQUE NOT NULL,
  owner_name TEXT NOT NULL,
  occupancy_status TEXT CHECK(occupancy_status IN ('Occupied', 'Vacant')) DEFAULT 'Occupied',
  maintenance_dues REAL DEFAULT 0.0
);

-- Payments log
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flat_no TEXT NOT NULL,
  resident_name TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  ref_no TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Setup & Running Guide

### 1. Prerequisites
- **Node.js**: Version 22.5.0 or later (required for built-in `node:sqlite` database module).

### 2. Installation
Extract the zip file contents, navigate to the folder, and install dependencies:
```bash
npm install
```

### 3. Initialize & Seed Database
Initialize the SQLite schema and seed mock tickets, notice board announcements, flats, and historical payment logs by running the seed script:
```bash
node seed.js
```

### 4. Running the Development Server
Start the dev server locally:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Seed Accounts (Ready for Evaluation)

You can log in directly with these pre-seeded accounts:

| User Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@society.com` | `password123` | Can update status, priority, post notices, modify settings, trigger reminders, and view email logs. |
| **Resident 1** | `resident@society.com` | `password123` | Alice Smith (Flat A-301). Has filed 1 Open overdue complaint and has ₹1,500.00 dues balance. |
| **Resident 2** | `bob@society.com` | `password123` | Bob Jones (Flat A-104). Has filed 1 In-Progress complaint and has ₹3,000.00 dues balance. |

---

## Environment Variables Configuration

To run real email dispatches, copy `.env.example` to `.env` and fill in your SMTP credentials:

```env
# SMTP Mail Configurations (Optional - Fallback logs to database)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM_NAME="Society Maintenance"
SMTP_FROM_EMAIL=no-reply@society.com
```

---

## API Reference Documentation

### 1. Authentication
- `POST /api/auth/register` - Create a resident/admin user account.
- `POST /api/auth/login` - Authenticate credentials and write session cookie.
- `POST /api/auth/logout` - Clear cookie and delete DB session key.
- `GET /api/auth/me` - Fetch profile of active authenticated session (includes mapped flat dues).

### 2. Financials & Reminders
- `GET /api/dashboard-stats` - Fetch Nivas dashboard metrics (total collected, monthly chart list, pending dues category counts).
- `GET /api/payments` - Retrieve 50 recent payment transactions and top flats with dues.
- `POST /api/payments` - Admin triggers quick payment reminders email to a resident.

### 3. Complaints & Lifecycle
- `GET /api/complaints` - List complaints. Residents get their own tickets; Admins get all tickets sorted dynamically (overdue first).
- `POST /api/complaints` - Resident files a complaint (supports `multipart/form-data` file uploads).
- `GET /api/complaints/[id]` - Retrieve a single complaint with its timeline history.
- `PUT /api/complaints/[id]` - Admin updates ticket status/priority, inserts audit log, and triggers email notices.

### 4. Notices & Announcement Settings
- `GET /api/notices` - Fetch Notice Board entries (pinned/important notices at top).
- `POST /api/notices` - Admin posts announcement. Important notices trigger email alerts.
- `GET /api/settings` - Retrieve configured overdue threshold days.
- `PUT /api/settings` - Admin updates overdue threshold days.
