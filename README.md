# BANTUG UNIVERSITY - Student, Faculty, Applicant & Admin Portal System

An enterprise-grade academic management, admissions, and administration web portal for **BANTUG UNIVERSITY**. Built with clean **HTML5, CSS3, Vanilla JavaScript**, and a high-performance **Node.js Native HTTP Backend** integrated with **MySQL / MariaDB (`bantug_university_db`)** via `mysql2/promise`.

---

## 1. Project Overview

The **BANTUG UNIVERSITY Student Portal System** is a unified multi-portal platform designed to handle the core academic and administrative workflows of the university. The system provides role-tailored interfaces and strict server-enforced authorization for:
- **Prospective Applicants**: Public admission application submission, OTP-verified email ownership, non-duplicating reference tracking, and real-time status inquiry.
- **Students**: Enrolled subjects, weekly class schedule, academic grade reports with decimal precision, attendance tracking, assignments, campus announcements, learning resources, and profile view.
- **Faculty**: Teaching load management, grade encoding, student roster inspection, campus announcements, and admission application reviews.
- **Administrators**: Centralized user account management, role assignment, account status control, session revocation, applicant admission processing, and immutable system audit logging.

---

## 2. Main Technologies

- **Frontend**: HTML5, CSS3 (Modular design system with CSS custom properties, responsive breakpoints, and horizontal scroll navigation), Vanilla JavaScript (ES6+ async/await, modular storage and navigation adapters, zero external frontend framework dependencies).
- **Backend**: Node.js Native HTTP module (`server.js`) providing high-performance REST APIs, static file delivery, session token validation, and role-based access control.
- **Database**: MySQL / MariaDB via standard XAMPP distribution on port `3306`.
- **Database Driver**: `mysql2/promise` with robust connection pooling, parameterized SQL queries, and automatic schema verification.
- **Security & Cryptography**: PBKDF2 password hashing (10,000 iterations, SHA-256 with 16-byte random salt), SHA-256 salted OTP hashing, server-authoritative session tracking in `user_sessions`, and tamper-resistant audit logging in `audit_logs`.
- **Email Service**: Nodemailer SMTP notification integration (`services/email-service.js`) with fail-safe local database logging (`notification_logs`).

---

## 3. Project Folder Structure

```
StudentHub/
├── assets/                          # Static media assets and images
│   ├── icons/                       # University icons and SVG graphics
│   └── images/                      # Official university logo and avatars
├── css/                             # Modular application stylesheets
│   ├── base/                        # CSS reset and custom property variables
│   │   ├── reset.css                # Box-sizing normalization and base resets
│   │   └── variables.css            # Color palette, spacing, and typography
│   ├── pages/                       # Portal and module page-level styling
│   │   ├── academic-modules.css     # Subjects, schedule, grades, and tasks
│   │   ├── admin.css                # Admin panel tables, metrics, and logs
│   │   └── applicant.css            # Public admission form and tracker
│   ├── responsive/                  # Media query overrides and breakpoints
│   │   └── breakpoints.css          # Responsive styling across laptop/tablet/mobile
│   ├── components.css               # Buttons, cards, modals, and badges
│   ├── layout.css                   # Grid shells, sidebar, topbar, and main wrapper
│   ├── login.css                    # Authentication screen and modal styling
│   ├── main.css                     # Primary stylesheet entry point (@import cascade)
│   └── student-*.css                # Specialized student module stylesheets
├── database/                        # Database schemas, migrations, and seeds
│   ├── backups/                     # Automated JSON backup snapshots
│   ├── bantug_university_portal.sql # Complete DDL schema and initial seed data
│   ├── seed.js                      # Automated migration runner and demo seeder
│   └── XAMPP_SETUP_GUIDE.md         # Detailed XAMPP setup walkthrough
├── js/                              # Modular client-side JavaScript
│   ├── admin.js                     # Administrator user and application controls
│   ├── announcements.js             # Announcements feed and category filters
│   ├── app.js                       # Core client router, tab bar, and UI lifecycle
│   ├── applicant.js                 # Public admission form and OTP verification
│   ├── attendance.js                # Student attendance records and metrics
│   ├── auth.js                      # Client authentication and session bootstrap
│   ├── dashboard.js                 # Student course cards and academic overview
│   ├── faculty.js                   # Faculty grading, schedules, and reviews
│   ├── grades.js                    # Student grade report and GPA calculations
│   ├── partials-loader.js           # Asynchronous HTML partial injection loader
│   ├── profile.js                   # Student profile view and personal information
│   ├── resources.js                 # Learning resources downloads and filters
│   ├── schedule.js                  # Class schedule timetable and day filters
│   ├── settings.js                  # User preferences, display name, and password update
│   ├── storage.js                   # Client storage cache and backend API client
│   ├── subjects.js                  # Enrolled subjects and course curriculum views
│   └── tasks.js                     # Student assignments and task submissions
├── pages/                           # Sub-page HTML templates
│   ├── shared/                      # Shared layout partials (header, nav, sidebar)
│   ├── student/                     # Student portal view partials
│   ├── admission.html               # Public admission form template
│   └── login.html                   # Authentication login screen template
├── partials/                        # Shared modal, footer, and section partials
│   ├── components/                  # Reusable modals and toast notifications
│   ├── layout/                      # Global footer layout
│   └── sections/                    # Portal section wrappers (admin, faculty, student)
├── services/                        # Backend utility micro-services
│   ├── email-service.js             # SMTP delivery client and fallback logger
│   └── otp-service.js               # Cryptographic OTP generator and validator
├── .env.example                     # Environment configuration template
├── admission.html                   # Public admission application entry point
├── applicant.html                   # Public applicant entry point (alias)
├── DEMO_ACCOUNTS.md                 # Pre-configured demo user credentials
├── deploy-to-xampp.bat              # Automated Windows deployment script
├── index.html                       # Main portal application entry point
├── package.json                     # Node.js project manifest and scripts
├── README.md                        # Project documentation (this file)
└── server.js                        # Native HTTP backend and REST API server
```

---

## 4. Database Setup & Configuration

- **Database Name**: `bantug_university_db`
- **Default Port**: `3306` (standard MySQL/MariaDB in XAMPP)
- **Host**: `127.0.0.1` (localhost)

### XAMPP MariaDB Setup Instructions:
1. Open the **XAMPP Control Panel**.
2. Click **Start** on the **MySQL** module (ensure port 3306 is listening).
3. If using standalone mysqld from command prompt:
   ```cmd
   C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone
   ```
4. The backend server automatically creates the database `bantug_university_db` and executes all necessary table migrations upon startup.
5. To manually import or seed the database:
   ```bash
   npm run seed
   ```

### Database Configuration:
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Default parameters in `.env`:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bantug_university_db
```
*(Leave `DB_PASSWORD` blank if running default XAMPP MySQL configuration without a root password).*

---

## 5. Installation and Startup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the Application Server
```bash
npm start
```
*(Alternatively, run `node server.js`).*

### Step 3: Access the Portal
Open your web browser and navigate to:
```
http://localhost:3000
```

---

## 6. Available User Roles & Access

| Role | Primary Entry / Interface | Description & Permissions |
|---|---|---|
| **Public Visitor** | `/admission.html` | Browse university admissions, submit freshman applications, verify email via OTP, check application reference status. No login required. |
| **Student** | `http://localhost:3000` (Login) | View enrolled subjects, weekly timetable, academic grades, attendance summary, assignments, announcements, and read-only profile. |
| **Faculty** | `http://localhost:3000` (Login) | Manage assigned classes, encode student marks, publish student notices, review applicant submissions, and view read-only profile. |
| **Administrator** | `http://localhost:3000` (Login) | Comprehensive user management (create, deactivate, reset passwords), review admission applications, view immutable system audit trails. |

### Demo Accounts for Testing:
- **Student**: `r.valiente` / `demo123`
- **Faculty**: `f.somera` / `faculty123`
- **Administrator**: `admin` / `ChangeMeAdmin2026!`
*(Refer to `DEMO_ACCOUNTS.md` for additional pre-seeded accounts).*

---

## 7. Security & Role-Based Access Control (RBAC)

The portal implements strict multi-layer security enforced by the native Node.js backend:
- **Authoritative Server Sessions**: Roles and permissions are retrieved strictly from server-side session records in `user_sessions`. Client-supplied role claims (e.g. from `localStorage` or request payloads) are completely ignored.
- **Read-Only Protected Records**: Student and faculty profile and contact information cannot be modified by students or faculty. Any unauthorized modification requests return `403 Forbidden`.
- **Administrative Guard**: All `/api/admin/*` endpoints strictly verify that `authenticatedRole === 'admin'`. Non-admin sessions are rejected with `403 Forbidden`.
- **Instant Session Revocation**: When an administrator deactivates a user account or forces a password reset, all active sessions for that user are immediately deleted from the database.
- **Brute Force Protection**: OTP codes feature 5-minute cryptographic expirations, 60-second cooldown rate limits, and lockouts after 5 consecutive failed attempts.

---

## 8. Verification & Test Execution

Run the automated integration test suite to verify all modules:
```bash
node scripts/testing/verify-final-integration.js
```

---

## 9. License
&copy; 2026 BANTUG UNIVERSITY. All rights reserved. Office of Information and Communications Technology.
