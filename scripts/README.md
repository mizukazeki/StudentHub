# BANTUG UNIVERSITY – Development, Database & Verification Scripts

This directory contains organized command-line utilities, automated test suites, database migration/backup helpers, and system maintenance scripts for the **BANTUG UNIVERSITY Student Portal**.

---

## 1. Directory Structure

```
scripts/
├── database/                    # Database inspection, backup, and catalog utilities
│   ├── add-subject-descriptions.js   # Adds descriptive summaries to course subjects
│   ├── backup-database.js            # Exports full JSON schema & record backups
│   ├── inspect-database.js           # Queries table row counts and schema structure
│   └── verify-database-integrity.js  # Checks relational integrity and foreign keys
├── maintenance/                 # Account management, hashing, and recovery scripts
│   ├── repair-admin-password-hash.js # Recalculates PBKDF2 hash & salt for admin
│   ├── reset-admin-password.js       # Resets root admin password in emergency lockout
│   └── archive/                      # Preserved one-time code generators & migration scripts
│       └── update-applicant-css.js   # Archived CSS string generator utility
├── verification/                # Module-specific automated test suites
│   ├── verify-account-preferences.js          # Student preferences update tests
│   ├── verify-admin-panel.js                  # Comprehensive Admin Panel test suite
│   ├── verify-admission-ui-design.js          # Admission UI contrast & layout tests
│   ├── verify-applicant-access.js             # Applicant role isolation tests
│   ├── verify-applicant-form.js               # Form field validation tests
│   ├── verify-applicant-student-separation.js # Separation of applicant vs student data
│   ├── verify-application-reference.js        # Reference number generation tests
│   ├── verify-client-dom-simulation.js        # Headless DOM and partial loader simulation
│   ├── verify-faculty-portal.js               # Faculty teaching loads & reviews tests
│   ├── verify-faculty-profile.js              # Faculty read-only profile access tests
│   ├── verify-login-interface.js              # Clean public login & auth tests
│   ├── verify-navigation-rbac.js              # Responsive navigation & RBAC test suite
│   ├── verify-otp-email.js                    # Cryptographic OTP & SMTP logging suite
│   ├── verify-public-admission-flow.js        # End-to-end public admission flow tests
│   ├── verify-student-dashboard.js            # Student course cards & timetable tests
│   └── verify-student-settings.js             # Student read-only settings tests
├── testing/                     # Master integration and backend API test suites
│   ├── test-admin-users-api.js                # API tests for /api/admin/users
│   ├── test-backend-authorization.js          # RBAC API authorization guardrail tests
│   ├── test-backend-integration.js            # OTP and email service endpoint tests
│   ├── verify-final-integration.js            # Master 45-point integration test suite
│   └── verify-master-integration.js           # Multi-phase regression integration suite
└── README.md                    # Script catalog and operational documentation
```

---

## 2. Safety & Execution Classification

| Category | Script Name | Safety Level | Modifies DB? | Admin Auth Required? | Purpose |
|---|---|---|---|---|---|
| **Database** | `backup-database.js` | Safe (Read-only) | No | No | Dumps full database snapshot to `database/backups/` |
| **Database** | `inspect-database.js` | Safe (Read-only) | No | No | Queries table schema and record counts |
| **Database** | `verify-database-integrity.js` | Safe (Read-only) | No | No | Verifies relational integrity between tables |
| **Database** | `add-subject-descriptions.js` | Maintenance | Yes (Updates text) | No | Fills missing course descriptions in `subjects` table |
| **Maintenance** | `reset-admin-password.js` | Caution (Recovery) | Yes (Admin hash) | Admin credentials | Resets root `admin` account password if locked out |
| **Maintenance** | `repair-admin-password-hash.js` | Caution (Recovery) | Yes (Admin hash) | Admin credentials | Updates PBKDF2 salt and hash iteration for admin |
| **Testing** | `verify-final-integration.js` | Routine (Automated) | Yes (Test rows) | Generates test session | Master 45-point end-to-end test runner |
| **Testing** | `verify-master-integration.js` | Routine (Automated) | Yes (Test rows) | Generates test session | Master regression suite |
| **Verification**| `verify-admission-ui-design.js` | Routine (Automated) | Yes (Test row) | No | Verifies admission page contrast, inputs & flow |
| **Verification**| `verify-admin-panel.js` | Routine (Automated) | Yes (Test user) | Admin credentials | Validates all 14 admin management capabilities |
| **Verification**| `verify-otp-email.js` | Routine (Automated) | Yes (Test OTPs) | No | Tests OTP generation, hashing, rate limits |

> [!NOTE]
> All test and verification suites create transient test records tagged with unique timestamps (e.g. `test.applicant.TIMESTAMP@example.com`), ensuring production and genuine demo records are never deleted or corrupted.

---

## 3. How to Run Scripts

Ensure that the **MySQL daemon is running on port 3306** and the **application server is running on `http://localhost:3000`** before executing network or database tests.

### Routine Automated Verification & Testing
```bash
# Run Master End-to-End Final Integration Suite (45 Tests):
node scripts/testing/verify-final-integration.js
# or:
npm test

# Run Admission UI Design & Color System Verification:
node scripts/verification/verify-admission-ui-design.js

# Run OTP Generation & Email Notification Suite:
node scripts/verification/verify-otp-email.js

# Run Navigation & RBAC Security Suite:
node scripts/verification/verify-navigation-rbac.js

# Run Admin Panel Capability Suite:
node scripts/verification/verify-admin-panel.js
```

### Database Operations
```bash
# Inspect all database tables and current record counts:
node scripts/database/inspect-database.js

# Create a full JSON database snapshot backup:
node scripts/database/backup-database.js
# or:
npm run backup
```

### Emergency Maintenance & Account Recovery
```bash
# Emergency Admin Password Reset (Only execute if locked out):
node scripts/maintenance/reset-admin-password.js
```
*(Never execute maintenance scripts automatically in automated test pipelines).*

