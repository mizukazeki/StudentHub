/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Verification Suite: Phase 6 - Account Settings and Preferences
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const mysql = require("mysql2/promise");

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on("error", reject);
    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("================================================================================");
  console.log("BANTUG UNIVERSITY - PHASE 6 VERIFICATION TEST SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? " - " + details : ""}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Codebase Inspection & Part A Student Settings Preservation
  // --------------------------------------------------------------------------
  console.log("--- TEST GROUP 1: Part A - Student Settings Preservation ---");
  const settingsJsPath = path.join(__dirname, "..", "js", "settings.js");
  assert(fs.existsSync(settingsJsPath), "1.1 settings.js exists");
  const settingsJs = fs.readFileSync(settingsJsPath, "utf8");

  // A1: Account Preferences
  assert(settingsJs.includes("Account Preferences"), "1.2 Preserves 'Account Preferences' card title");
  assert(settingsJs.includes("goFullProfileBtn") && settingsJs.includes("Full Student Profile &rarr;"), "1.3 Preserves 'Full Student Profile' link");
  assert(settingsJs.includes("Review your connected portal account details and update your display name or current academic term"), "1.4 Preserves Account Preferences description");
  assert(settingsJs.includes("Account ID"), "1.5 Preserves 'Account ID' field label");
  assert(settingsJs.includes("Email Address"), "1.6 Preserves 'Email Address' field label");
  assert(settingsJs.includes("Section / Affiliation"), "1.7 Preserves 'Section / Affiliation' field label");
  assert(settingsJs.includes("Display Name"), "1.8 Preserves 'Display Name' input label");
  assert(settingsJs.includes("Current Academic Term"), "1.9 Preserves 'Current Academic Term' input label");
  assert(settingsJs.includes("cancelQuickPrefsBtn") && settingsJs.includes("Cancel"), "1.10 Preserves 'Cancel' button in preferences");
  assert(settingsJs.includes("Save Academic Preferences"), "1.11 Preserves 'Save Academic Preferences' button");

  // A2: Security & Session Information
  assert(settingsJs.includes("Security &amp; Session Information") || settingsJs.includes("Security & Session Information"), "1.12 Preserves 'Security & Session Information' card title");
  assert(settingsJs.includes("Active Session"), "1.13 Preserves 'Active Session' status badge");
  assert(settingsJs.includes("Signed-In Role"), "1.14 Preserves 'Signed-In Role' display");
  assert(settingsJs.includes("Session Account"), "1.15 Preserves 'Session Account' display");
  assert(settingsJs.includes("settingsSecSwitchRoleBtn") && settingsJs.includes("Switch Portal Role"), "1.16 Preserves 'Switch Portal Role' button");
  assert(settingsJs.includes("settingsSecLogoutBtn") && settingsJs.includes("Sign Out Session"), "1.17 Preserves 'Sign Out Session' button");

  // A3: BANTUG UNIVERSITY Logo Configuration
  assert(settingsJs.includes("BANTUG UNIVERSITY Logo Configuration"), "1.18 Preserves 'BANTUG UNIVERSITY Logo Configuration' card title");
  assert(settingsJs.includes("Aspect Ratio Preserved"), "1.19 Preserves 'Aspect Ratio Preserved' badge");
  assert(settingsJs.includes("assets/images/bantug-university-logo.png"), "1.20 Preserves default logo image path");
  assert(settingsJs.includes("uploadLogoFileInput") && settingsJs.includes("Select Logo Image File"), "1.21 Preserves select logo image input");
  assert(settingsJs.includes("resetDefaultLogoPathBtn") && settingsJs.includes("Use Default Logo Path"), "1.22 Preserves default logo reset button");

  // A4: Browser localStorage Data Management
  assert(settingsJs.includes("Browser localStorage Data Management"), "1.23 Preserves 'Browser localStorage Data Management' card title");
  assert(settingsJs.includes("bantug_university_portal_v2"), "1.24 Preserves storage key 'bantug_university_portal_v2'");
  assert(settingsJs.includes("Demonstration Data Actions"), "1.25 Preserves 'Demonstration Data Actions' section");
  assert(settingsJs.includes("exportDataJsonBtn") && settingsJs.includes("Export JSON Backup"), "1.26 Preserves 'Export JSON Backup' button");
  assert(settingsJs.includes("clearDemoDataBtn") && settingsJs.includes("Clear Demonstration Data"), "1.27 Preserves 'Clear Demonstration Data' button");
  assert(settingsJs.includes("resetSampleDataBtn") && settingsJs.includes("Reset to Default BSIT 2-2 Data"), "1.28 Preserves 'Reset to Default BSIT 2-2 Data' button");
  assert(settingsJs.includes("never delete verified records from the MySQL database"), "1.29 Explicitly clarifies demo data actions never delete MySQL database records");

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Part B - Faculty Account Settings
  // --------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: Part B - Faculty Account Settings ---");
  assert(settingsJs.includes('activeRole === "faculty"'), "2.1 Role-aware branching handles faculty role");
  assert(settingsJs.includes("Full Faculty Profile &rarr;"), "2.2 Shows 'Full Faculty Profile' link for faculty");
  assert(settingsJs.includes("Save Faculty Preferences"), "2.3 Shows 'Save Faculty Preferences' button for faculty");
  assert(settingsJs.includes("FACULTY (Read-Only)") || settingsJs.includes("Assigned faculty role and administrative permissions cannot be altered"), "2.4 Explicitly displays read-only role indicator and prevents altering faculty permissions");
  assert(settingsJs.includes("facultyProfile") || settingsJs.includes("state.facultyProfile"), "2.5 Retrieves faculty profile information from state/session");

  // Check navigation.html allows settings for faculty
  const navHtml = fs.readFileSync(path.join(__dirname, "..", "pages", "shared", "navigation.html"), "utf8");
  assert(navHtml.includes('data-role-item="student,faculty"') && navHtml.includes('data-section="settings"'), "2.6 Settings navigation link enabled for student and faculty");

  // Check app.js ROLE_ALLOWED_SECTIONS
  const appJs = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
  assert(/faculty:\s*\[[\s\S]*?"settings"[\s\S]*?\]/.test(appJs), "2.7 Faculty ROLE_ALLOWED_SECTIONS includes 'settings'");

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Part C - Applicant Account Settings
  // --------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: Part C - Applicant Account Settings ---");
  // Ensure applicant sidebar navigation does NOT have settings
  assert(!navHtml.includes('data-role-item="applicant" role="none">\n            <button type="button" class="nav-link" data-section="settings"'), "3.1 Sidebar navigation does NOT restore full applicant settings dashboard");
  const applicantArrayMatch = appJs.match(/applicant:\s*\[([\s\S]*?)\]/);
  assert(applicantArrayMatch && !applicantArrayMatch[1].includes('"settings"'), "3.2 Applicant ROLE_ALLOWED_SECTIONS does NOT include full 'settings' dashboard");

  // Applicant Account Modal in applicant.js
  const applicantJs = fs.readFileSync(path.join(__dirname, "..", "js", "applicant.js"), "utf8");
  assert(applicantJs.includes("openApplicantAccountModal"), "3.3 openApplicantAccountModal function exists in applicant.js");
  assert(applicantJs.includes("applicantModalRefNum") && applicantJs.includes("Account ID / Reference No."), "3.4 Applicant Account modal displays Account ID / Reference Number");
  assert(applicantJs.includes("applicantModalEmail") && applicantJs.includes("Registered Email Address"), "3.5 Applicant Account modal displays Registered Email");
  assert(applicantJs.includes("applicantModalStatus") && applicantJs.includes("Application Status"), "3.6 Applicant Account modal displays Application Status");
  assert(applicantJs.includes("applicantModalChangePassBtn") && applicantJs.includes("Change Password"), "3.7 Applicant Account modal has 'Change Password' button");
  assert(applicantJs.includes("applicantModalLogoutBtn") && applicantJs.includes("Sign Out Session"), "3.8 Applicant Account modal has 'Sign Out Session' button");
  assert(applicantJs.includes("applicantAccountDetailsBtn"), "3.9 Admission Overview header includes 'Account Preferences' button");
  assert(appJs.includes("openApplicantAccountModal"), "3.10 Topbar profile pill click triggers applicant account modal for applicant role");

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Part D - Password Management Entry Point & Modal
  // --------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: Part D - Password Management Entry Point ---");
  assert(settingsJs.includes("openChangePasswordModal"), "4.1 openChangePasswordModal function exists in settings.js");
  assert(settingsJs.includes("openChangePasswordBtn") && settingsJs.includes("Change Password"), "4.2 Dedicated 'Change Password' button in Security card");
  assert(settingsJs.includes("Current Password"), "4.3 Modal contains Current Password field");
  assert(settingsJs.includes("New Password"), "4.4 Modal contains New Password field");
  assert(settingsJs.includes("Confirm New Password"), "4.5 Modal contains Confirm New Password field");
  assert(settingsJs.includes("password-toggle-btn"), "4.6 Password fields have Show/Hide visibility toggles");
  assert(settingsJs.includes("/api/auth/change-password"), "4.7 Password modal calls /api/auth/change-password endpoint");
  assert(!settingsJs.includes("otp") && !settingsJs.includes("OTP"), "4.8 Does not implement fake OTP (reserved for Phase 7)");

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Backend API Verification (Live HTTP & MySQL)
  // --------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 5: Backend API Verification (HTTP & MySQL) ---");
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "bantug_university_db"
  });

  // 5.1 Student login
  const studentLogin = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    { identifier: "student.demo@bantug.edu.example", password: "demo123" }
  );
  assert(studentLogin.status === 200 && studentLogin.data?.ok, "5.1 Student demo account logs in successfully");
  const studentToken = studentLogin.data.session.token;

  // 5.2 Faculty login
  const facultyLogin = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    { identifier: "f.somera.demo@bantug.edu.example", password: "faculty123" }
  );
  assert(facultyLogin.status === 200 && facultyLogin.data?.ok, "5.2 Faculty demo account logs in successfully");
  const facultyToken = facultyLogin.data.session.token;

  // 5.3 Applicant login
  const applicantLogin = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    { identifier: "applicant.demo@bantug.edu.example", password: "apply123" }
  );
  assert(applicantLogin.status === 200 && applicantLogin.data?.ok, "5.3 Applicant demo account logs in successfully");
  const applicantToken = applicantLogin.data.session.token;

  // 5.4 Test Account Preferences: Student Update
  const updateStudentPref = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/account/preferences",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      }
    },
    {
      displayName: "Racel Valiente",
      academicTerm: "2nd Semester, AY 2026–2027"
    }
  );
  assert(updateStudentPref.status === 200 && updateStudentPref.data?.ok, "5.4 Student preferences update succeeds");

  // Verify in MySQL
  const [studentRows] = await conn.query(
    "SELECT full_name, role FROM users WHERE username = 'r.valiente'"
  );
  assert(studentRows[0]?.full_name === "Racel Valiente" && studentRows[0]?.role === "student", "5.5 Student full_name updated in MySQL users table without altering role");

  // 5.6 Test Account Preferences: Reject missing displayName
  const badPref = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/account/preferences",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      }
    },
    { displayName: " " }
  );
  assert(badPref.status === 400, "5.6 Backend rejects empty/short display name with 400 Bad Request");

  // 5.7 Test Account Preferences: Prevent role tampering
  const tamperRolePref = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/account/preferences",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${facultyToken}`
      }
    },
    {
      displayName: "Somera, Fabian",
      role: "admin",
      permissions: ["all"]
    }
  );
  const [facultyRows] = await conn.query(
    "SELECT role, full_name FROM users WHERE username = 'f.somera'"
  );
  assert(facultyRows[0]?.role === "faculty", "5.7 Protected fields cannot be altered; faculty role remains 'faculty'");

  // 5.8 Test Change Password: Reject missing current password
  const cpNoCurrent = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      }
    },
    { currentPassword: "", newPassword: "newpassword123", confirmPassword: "newpassword123" }
  );
  assert(cpNoCurrent.status === 400 && cpNoCurrent.data?.message?.includes("Current password"), "5.8 Rejects missing current password");

  // 5.9 Test Change Password: Reject short new password (<6 chars)
  const cpShort = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      }
    },
    { currentPassword: "demo123", newPassword: "123", confirmPassword: "123" }
  );
  assert(cpShort.status === 400 && cpShort.data?.message?.includes("6 characters"), "5.9 Rejects new password under 6 characters");

  // 5.10 Test Change Password: Reject mismatch confirmation
  const cpMismatch = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      }
    },
    { currentPassword: "demo123", newPassword: "validpassword123", confirmPassword: "wrongconfirmation" }
  );
  assert(cpMismatch.status === 400 && cpMismatch.data?.message?.includes("match"), "5.10 Rejects mismatched password confirmation");

  // 5.11 Test Change Password: Reject wrong current password
  const cpWrongCurrent = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      }
    },
    { currentPassword: "incorrect_password", newPassword: "validpassword123", confirmPassword: "validpassword123" }
  );
  assert(cpWrongCurrent.status === 400 && cpWrongCurrent.data?.message?.includes("Current password is incorrect"), "5.11 Rejects incorrect current password");

  // 5.12 Test Change Password: Valid update for applicant
  const cpApplicantValid = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${applicantToken}`
      }
    },
    { currentPassword: "apply123", newPassword: "NewApplicantPass2026", confirmPassword: "NewApplicantPass2026" }
  );
  assert(cpApplicantValid.status === 200 && cpApplicantValid.data?.ok, "5.12 Valid applicant password change succeeds");

  // 5.13 Authenticate with applicant's new password
  const applicantLoginNew = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    { identifier: "applicant.demo@bantug.edu.example", password: "NewApplicantPass2026" }
  );
  assert(applicantLoginNew.status === 200 && applicantLoginNew.data?.ok, "5.13 Applicant successfully signs in using new password");

  // 5.14 Revert applicant password back to apply123
  const cpApplicantRevert = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${applicantLoginNew.data.session.token}`
      }
    },
    { currentPassword: "NewApplicantPass2026", newPassword: "apply123", confirmPassword: "apply123" }
  );
  assert(cpApplicantRevert.status === 200 && cpApplicantRevert.data?.ok, "5.14 Applicant password safely reverted to sample password");

  // 5.15 Verify audit trail entries
  const [auditRows] = await conn.query(
    "SELECT action_type, details FROM audit_logs WHERE action_type IN ('PASSWORD_CHANGED', 'PASSWORD_CHANGE_FAILED', 'ACCOUNT_PREFERENCES_UPDATED') ORDER BY log_id DESC LIMIT 10"
  );
  assert(auditRows.some((r) => r.action_type === "PASSWORD_CHANGED"), "5.15 Audit log records PASSWORD_CHANGED event");
  assert(auditRows.some((r) => r.action_type === "PASSWORD_CHANGE_FAILED"), "5.16 Audit log records PASSWORD_CHANGE_FAILED event");
  assert(auditRows.some((r) => r.action_type === "ACCOUNT_PREFERENCES_UPDATED"), "5.17 Audit log records ACCOUNT_PREFERENCES_UPDATED event");

  await conn.end();

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`PHASE 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
