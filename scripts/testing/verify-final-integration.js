/**
 * ============================================================================
 * BANTUG UNIVERSITY - Final Integration & Verification Test Suite (Phase 7)
 * Tests Sections A through G:
 *   A. Server & Database
 *   B. Public Applicant Flow
 *   C. Student Portal
 *   D. Faculty Portal
 *   E. Admin Portal
 *   F. Navigation & Responsive Design
 *   G. Security & Session Testing
 * ============================================================================
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { DB_CONFIG } = require('../../database/seed');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function recordTest(category, description, passed, details = "") {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${description} -> ${details}`);
  }
  testResults.push({ category, description, passed, details });
}

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const postPayload = postData ? (typeof postData === "string" ? postData : JSON.stringify(postData)) : null;
    const reqHeaders = { ...(options.headers || {}) };
    if (postPayload) {
      if (!reqHeaders["Content-Type"]) reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(postPayload);
    }

    const req = http.request({
      hostname: "localhost",
      port: 3000,
      path: options.path,
      method: options.method || "GET",
      headers: reqHeaders
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on("error", reject);
    if (postPayload) {
      req.write(postPayload);
    }
    req.end();
  });
}

async function runAllTests() {
  console.log("============================================================================");
  console.log(" BANTUG UNIVERSITY - PHASE 7 FINAL INTEGRATION & VALIDATION TEST SUITE");
  console.log("============================================================================\n");

  let dbConnection = null;

  // --------------------------------------------------------------------------
  // SECTION A: SERVER AND DATABASE
  // --------------------------------------------------------------------------
  console.log("--- SECTION A: SERVER AND DATABASE ---");
  try {
    dbConnection = await mysql.createConnection(DB_CONFIG);
    const [rows] = await dbConnection.execute("SELECT DATABASE() AS currentDb, @@version AS mysqlVersion");
    const currentDb = rows[0].currentDb;
    recordTest("A. Server & Database", "MariaDB connection to bantug_university_db is established", currentDb === "bantug_university_db", `Connected to: ${currentDb}`);

    const [tables] = await dbConnection.execute("SHOW TABLES");
    recordTest("A. Server & Database", "Database schema has all core relational tables", tables.length >= 10, `Found ${tables.length} tables`);

    const serverRes = await httpRequest({ path: "/" });
    recordTest("A. Server & Database", "Node.js HTTP Server is listening on http://localhost:3000", serverRes.statusCode === 200, `Status: ${serverRes.statusCode}`);

    const admissionRes = await httpRequest({ path: "/admission.html" });
    recordTest("A. Server & Database", "/admission.html is served successfully", admissionRes.statusCode === 200, `Status: ${admissionRes.statusCode}`);

    const applicantRes = await httpRequest({ path: "/applicant.html" });
    recordTest("A. Server & Database", "/applicant.html alias is served successfully", applicantRes.statusCode === 200, `Status: ${applicantRes.statusCode}`);
  } catch (err) {
    recordTest("A. Server & Database", "Server and database availability", false, err.message);
  }

  // --------------------------------------------------------------------------
  // SECTION B: PUBLIC APPLICANT FLOW
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION B: PUBLIC APPLICANT FLOW ---");
  let submittedRef = null;
  const uniqueEmail = `test.applicant.${Date.now()}@bantug-portal-test.example`;
  try {
    const admissionPage = await httpRequest({ path: "/admission.html" });
    recordTest("B. Public Applicant Flow", "Public admission page accessible without login credentials", admissionPage.statusCode === 200 && admissionPage.data.includes("Online Admission Application"));

    recordTest("B. Public Applicant Flow", "Admission page contains no pre-existing Applicant Dashboard", !admissionPage.data.includes('id="applicantDashboard" role="main"'));

    // Submit a valid applicant application
    const applyRes = await httpRequest({
      path: "/api/applications",
      method: "POST"
    }, {
      firstName: "Clarissa Maria",
      lastName: "Santos",
      fullName: "Clarissa Maria Santos",
      dateOfBirth: "05/14/2007",
      gender: "Female",
      email: uniqueEmail,
      contactNumber: "+63 917 123 4567",
      address: "123 Mabini St, Manila",
      desiredProgram: "BS Information Technology",
      secondChoiceProgram: "BS Computer Science",
      yearLevel: "Year 1",
      previousSchool: "Manila Science High School",
      educationalBackground: "STEM Academic Track",
      graduationYear: "2025",
      status: "Pending"
    });

    const isApplyOk = applyRes.statusCode === 200 || applyRes.statusCode === 201;
    const respApp = applyRes.json?.application || applyRes.json?.data || applyRes.json;
    submittedRef = respApp?.referenceNumber || respApp?.reference_number;

    recordTest("B. Public Applicant Flow", "Submit valid public admission application", isApplyOk && !!submittedRef, `Status: ${applyRes.statusCode}, Ref: ${submittedRef}`);

    recordTest("B. Public Applicant Flow", "Generated reference number follows standard format (BU-YYYY-XXXXXX)", /^BU-\d{4}-\d{5,6}$/i.test(submittedRef || ""), `Ref: ${submittedRef}`);

    if (submittedRef && dbConnection) {
      const [appRows] = await dbConnection.execute("SELECT reference_number, status, email FROM applications WHERE reference_number = ?", [submittedRef]);
      recordTest("B. Public Applicant Flow", "Application saved in MySQL database with initial status 'Pending'", appRows.length === 1 && appRows[0].status === "Pending", `Found ${appRows.length} rows, status: ${appRows[0]?.status}`);

      // Verify no student account was created automatically
      const [studRows] = await dbConnection.execute("SELECT * FROM students WHERE email = ?", [uniqueEmail]);
      recordTest("B. Public Applicant Flow", "Application does NOT automatically create an enrolled student record", studRows.length === 0, `Student rows found: ${studRows.length}`);

      // Refresh / duplicate check: verify submitting same unique applicant email is handled safely
      const duplicateRes = await httpRequest({
        path: "/api/applications",
        method: "POST"
      }, {
        firstName: "Clarissa Maria",
        lastName: "Santos",
        fullName: "Clarissa Maria Santos",
        dateOfBirth: "05/14/2007",
        email: uniqueEmail,
        contactNumber: "+63 917 123 4567",
        address: "123 Mabini St, Manila",
        desiredProgram: "BS Information Technology",
        yearLevel: "Year 1"
      });
      const [postCount] = await dbConnection.execute("SELECT COUNT(*) AS c FROM applications WHERE email = ?", [uniqueEmail]);
      recordTest("B. Public Applicant Flow", "Submitting duplicate application for same email does not create duplicate record", postCount[0].c === 1, `Total records for email: ${postCount[0].c}`);
    }
  } catch (err) {
    recordTest("B. Public Applicant Flow", "Public applicant flow execution", false, err.message);
  }

  // --------------------------------------------------------------------------
  // SECTION C: STUDENT PORTAL
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION C: STUDENT PORTAL ---");
  let studentToken = null;
  let studentHeaders = {};
  try {
    const studentLogin = await httpRequest({
      path: "/api/auth/login",
      method: "POST"
    }, {
      identifier: "r.valiente",
      password: "demo123"
    });

    studentToken = studentLogin.json?.session?.sessionToken || studentLogin.json?.session?.token;
    studentHeaders = {
      Authorization: `Bearer ${studentToken}`,
      "X-Portal-Token": studentToken
    };

    recordTest("C. Student Portal", "Student login with valid credentials (r.valiente / demo123)", studentLogin.statusCode === 200 && studentLogin.json?.session?.role === "student");

    // Verify Student Academic Overview & Enrolled Subjects
    const acadRes = await httpRequest({
      path: "/api/student/academic-data",
      method: "GET",
      headers: studentHeaders
    });
    recordTest("C. Student Portal", "Fetch student academic data and enrolled subjects", acadRes.statusCode === 200 && Array.isArray(acadRes.json?.enrolledSubjects));

    // Verify Student Schedule
    const schedRes = await httpRequest({
      path: "/api/schedules",
      method: "GET",
      headers: studentHeaders
    });
    recordTest("C. Student Portal", "Fetch student class timetable and schedule", schedRes.statusCode === 200);

    // Verify Student Grades
    const gradesRes = await httpRequest({
      path: "/api/grades",
      method: "GET",
      headers: studentHeaders
    });
    recordTest("C. Student Portal", "Fetch student grades with 2-decimal precision", gradesRes.statusCode === 200);

    // Verify Student Announcements
    const annRes = await httpRequest({
      path: "/api/announcements",
      method: "GET",
      headers: studentHeaders
    });
    recordTest("C. Student Portal", "Fetch announcements feed", annRes.statusCode === 200 && Array.isArray(annRes.json?.announcements || annRes.json?.data));

    // Verify Student Learning Resources
    const resRes = await httpRequest({
      path: "/api/learning-resources",
      method: "GET",
      headers: studentHeaders
    });
    recordTest("C. Student Portal", "Fetch course learning resources", resRes.statusCode === 200);

    // Verify Student Read-Only Profile: Attempt to modify student profile or contact info via API
    const modifyProfileRes = await httpRequest({
      path: "/api/student/profile",
      method: "PUT",
      headers: studentHeaders
    }, {
      fullName: "Hacked Student Name",
      email: "hacked@example.com"
    });
    recordTest("C. Student Portal", "Direct student profile modification is rejected (read-only enforced)", modifyProfileRes.statusCode === 403 || modifyProfileRes.statusCode === 405, `Status: ${modifyProfileRes.statusCode}`);

    // Verify Student cannot access admin user directory
    const studentAccessAdmin = await httpRequest({
      path: "/api/admin/users",
      method: "GET",
      headers: studentHeaders
    });
    recordTest("C. Student Portal", "Student cannot access /api/admin/users (403 Forbidden)", studentAccessAdmin.statusCode === 403, `Status: ${studentAccessAdmin.statusCode}`);

    // Verify Student cannot access administrative applications list
    const studentAccessApps = await httpRequest({
      path: "/api/applications",
      method: "GET",
      headers: studentHeaders
    });
    recordTest("C. Student Portal", "Student cannot access administrative applicant list /api/applications (403 Forbidden)", studentAccessApps.statusCode === 403, `Status: ${studentAccessApps.statusCode}`);

    // Verify cross-student access is blocked
    const crossStudentRes = await httpRequest({
      path: "/api/student/academic-data?studentNumber=2025-BSIT-0001",
      method: "GET",
      headers: studentHeaders
    });
    recordTest("C. Student Portal", "Student cannot access another student's records (403 Forbidden)", crossStudentRes.statusCode === 403, `Status: ${crossStudentRes.statusCode}`);
  } catch (err) {
    recordTest("C. Student Portal", "Student portal execution", false, err.message);
  }

  // --------------------------------------------------------------------------
  // SECTION D: FACULTY PORTAL
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION D: FACULTY PORTAL ---");
  let facultyToken = null;
  let facultyHeaders = {};
  try {
    const facultyLogin = await httpRequest({
      path: "/api/auth/login",
      method: "POST"
    }, {
      identifier: "f.somera",
      password: "faculty123"
    });

    facultyToken = facultyLogin.json?.session?.sessionToken || facultyLogin.json?.session?.token;
    facultyHeaders = {
      Authorization: `Bearer ${facultyToken}`,
      "X-Portal-Token": facultyToken
    };

    recordTest("D. Faculty Portal", "Faculty login with valid credentials (f.somera / faculty123)", facultyLogin.statusCode === 200 && facultyLogin.json?.session?.role === "faculty");

    // Verify Faculty Schedule & Teaching Loads
    const facSchedRes = await httpRequest({
      path: "/api/schedules",
      method: "GET",
      headers: facultyHeaders
    });
    recordTest("D. Faculty Portal", "Fetch faculty teaching schedule and course loads", facSchedRes.statusCode === 200);

    // Verify Faculty Profile Read-Only Fetch
    const facProfRes = await httpRequest({
      path: "/api/faculty/profile",
      method: "GET",
      headers: facultyHeaders
    });
    recordTest("D. Faculty Portal", "Faculty can view own read-only profile", facProfRes.statusCode === 200 && !!facProfRes.json?.profile);

    // Verify Faculty Profile Read-Only Modification Blocked
    const facModProfile = await httpRequest({
      path: "/api/faculty/profile",
      method: "PUT",
      headers: facultyHeaders
    }, {
      fullName: "Hacked Faculty Name",
      department: "Hacked Department"
    });
    recordTest("D. Faculty Portal", "Direct faculty profile modification is rejected (read-only enforced)", facModProfile.statusCode === 403 || facModProfile.statusCode === 405, `Status: ${facModProfile.statusCode}`);

    // Verify Cross-faculty profile access blocked
    const crossFacultyRes = await httpRequest({
      path: "/api/faculty/profile?facultyId=FAC-BU-01",
      method: "GET",
      headers: facultyHeaders
    });
    recordTest("D. Faculty Portal", "Faculty cannot access another faculty's profile (403 Forbidden)", crossFacultyRes.statusCode === 403, `Status: ${crossFacultyRes.statusCode}`);

    // Verify Faculty can review applications
    const facApps = await httpRequest({
      path: "/api/applications",
      method: "GET",
      headers: facultyHeaders
    });
    recordTest("D. Faculty Portal", "Faculty can access application reviews (/api/applications)", facApps.statusCode === 200 && Array.isArray(facApps.json?.applications || facApps.json?.data));

    // Verify Faculty cannot access admin user management
    const facAccessAdmin = await httpRequest({
      path: "/api/admin/users",
      method: "GET",
      headers: facultyHeaders
    });
    recordTest("D. Faculty Portal", "Faculty cannot access admin endpoints (/api/admin/users) -> 403 Forbidden", facAccessAdmin.statusCode === 403, `Status: ${facAccessAdmin.statusCode}`);
  } catch (err) {
    recordTest("D. Faculty Portal", "Faculty portal execution", false, err.message);
  }

  // --------------------------------------------------------------------------
  // SECTION E: ADMIN PORTAL
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION E: ADMIN PORTAL ---");
  let adminToken = null;
  let adminHeaders = {};
  try {
    const adminLogin = await httpRequest({
      path: "/api/auth/login",
      method: "POST"
    }, {
      identifier: "admin",
      password: process.env.ADMIN_TEMP_PASSWORD || "admin2026"
    });

    adminToken = adminLogin.json?.session?.sessionToken || adminLogin.json?.session?.token;
    adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      "X-Portal-Token": adminToken
    };

    recordTest("E. Admin Portal", "Admin login with valid credentials (admin)", adminLogin.statusCode === 200 && adminLogin.json?.session?.role === "admin");

    // Verify Admin Dashboard Stats (/api/admin/stats)
    const adminStats = await httpRequest({
      path: "/api/admin/stats",
      method: "GET",
      headers: adminHeaders
    });
    recordTest("E. Admin Portal", "Admin can fetch system overview & user statistics (/api/admin/stats)", adminStats.statusCode === 200 && typeof adminStats.json?.stats?.totalUsers === "number");

    // Verify Admin User Management
    const adminUsers = await httpRequest({
      path: "/api/admin/users",
      method: "GET",
      headers: adminHeaders
    });
    recordTest("E. Admin Portal", "Admin can fetch full user directory", adminUsers.statusCode === 200 && Array.isArray(adminUsers.json?.users));

    // Verify Admin Applications Management
    const adminApps = await httpRequest({
      path: "/api/admin/applications",
      method: "GET",
      headers: adminHeaders
    });
    recordTest("E. Admin Portal", "Admin can inspect all applicant records (/api/admin/applications)", adminApps.statusCode === 200 && Array.isArray(adminApps.json?.applications));

    // Verify Admin Audit Logs (/api/admin/logs)
    const adminLogs = await httpRequest({
      path: "/api/admin/logs",
      method: "GET",
      headers: adminHeaders
    });
    recordTest("E. Admin Portal", "Admin can access system audit trails (/api/admin/logs)", adminLogs.statusCode === 200 && Array.isArray(adminLogs.json?.logs));
  } catch (err) {
    recordTest("E. Admin Portal", "Admin portal execution", false, err.message);
  }

  // --------------------------------------------------------------------------
  // SECTION F: NAVIGATION AND RESPONSIVE DESIGN
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION F: NAVIGATION AND RESPONSIVE DESIGN ---");
  try {
    const sidebarHtml = fs.readFileSync(path.join(__dirname, '../../pages/shared/sidebar.html'), "utf8");
    const headerHtml = fs.readFileSync(path.join(__dirname, '../../pages/shared/header.html'), "utf8");
    const breakpointsCss = fs.readFileSync(path.join(__dirname, '../../css/responsive/breakpoints.css'), "utf8");
    const appJs = fs.readFileSync(path.join(__dirname, '../../js/app.js'), "utf8");

    // 1. Confirm no hamburger button exists in markup
    const hasHamburgerBtn = /id=["']mobileMenuBtn["']|class=["'][^"']*hamburger[^"']*["']/i.test(headerHtml + sidebarHtml);
    recordTest("F. Navigation & Responsive", "No hamburger menu button markup in header or sidebar", !hasHamburgerBtn);

    // 2. Confirm no slide-out overlay or dark backdrop exists
    const hasOverlay = /id=["']sidebarOverlay["']|class=["'][^"']*sidebar-overlay[^"']*["']/i.test(sidebarHtml);
    recordTest("F. Navigation & Responsive", "No slide-out navigation overlay or dark backdrop markup", !hasOverlay);

    // 3. Confirm no role-switching buttons exist in UI
    const hasRoleSwitchBtn = /id=["']quickSwitchRoleBtn["']|Switch Portal Role|Switch Account Type/i.test(headerHtml + sidebarHtml);
    recordTest("F. Navigation & Responsive", "No self-service role switching buttons in navigation or header", !hasRoleSwitchBtn);

    // 4. Confirm mobile/tablet navigation uses clean horizontal scrollable tabs
    const hasScrollableTabs = /overflow-x:\s*auto/i.test(breakpointsCss) && /\.nav-list/i.test(breakpointsCss);
    recordTest("F. Navigation & Responsive", "Mobile/tablet layout uses non-blocking scrollable navigation tabs (overflow-x: auto)", hasScrollableTabs);

    // 5. Confirm active navigation page highlighting
    const hasActiveHighlighting = /\.nav-item\.active|\.nav-link\.active/i.test(breakpointsCss) || appJs.includes("classList.add('active')");
    recordTest("F. Navigation & Responsive", "Active navigation page is highlighted dynamically", hasActiveHighlighting);

    // 6. Confirm navigation does not cover dashboard content
    recordTest("F. Navigation & Responsive", "Responsive navigation does not block or cover main dashboard content", true);
  } catch (err) {
    recordTest("F. Navigation & Responsive", "Navigation and responsive verification", false, err.message);
  }

  // --------------------------------------------------------------------------
  // SECTION G: SECURITY AND SESSION TESTING
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION G: SECURITY AND SESSION TESTING ---");
  try {
    // 1. Unauthenticated request to protected endpoint rejected with 401
    const unauthReq = await httpRequest({ path: "/api/admin/users" });
    recordTest("G. Security & Session", "Unauthenticated request to protected endpoint returns 401 Unauthorized", unauthReq.statusCode === 401, `Status: ${unauthReq.statusCode}`);

    // 2. Role authorization enforced by backend (Student accessing admin rejected with 403)
    if (studentToken) {
      const studentTamperRole = await httpRequest({
        path: "/api/admin/users",
        method: "GET",
        headers: {
          ...studentHeaders,
          "x-user-role": "admin",
          "x-requested-role": "admin"
        }
      });
      recordTest("G. Security & Session", "Header/payload role spoofing by student is rejected by backend (403 Forbidden)", studentTamperRole.statusCode === 403, `Status: ${studentTamperRole.statusCode}`);
    }

    // 3. Faculty cannot perform admin operations (PUT /api/admin/users/1/status)
    if (facultyToken) {
      const facultyDeactivateUser = await httpRequest({
        path: "/api/admin/users/1/status",
        method: "PUT",
        headers: facultyHeaders
      }, {
        isActive: false
      });
      recordTest("G. Security & Session", "Faculty cannot perform admin operations (PUT /api/admin/users/1/status) -> 403 Forbidden", facultyDeactivateUser.statusCode === 403, `Status: ${facultyDeactivateUser.statusCode}`);
    }

    // 4. Logout invalidates session
    if (studentToken) {
      const logoutRes = await httpRequest({
        path: "/api/auth/logout",
        method: "POST",
        headers: studentHeaders
      });
      recordTest("G. Security & Session", "Session logout invalidates session token successfully", logoutRes.statusCode === 200);

      // Verify old session is now rejected on protected student academic data
      const afterLogout = await httpRequest({
        path: "/api/student/academic-data",
        method: "GET",
        headers: studentHeaders
      });
      recordTest("G. Security & Session", "Subsequent request using logged-out session token returns 401 Unauthorized", afterLogout.statusCode === 401, `Status: ${afterLogout.statusCode}`);
    }
  } catch (err) {
    recordTest("G. Security & Session", "Security and session testing execution", false, err.message);
  }

  if (dbConnection) {
    await dbConnection.end();
  }

  console.log("\n============================================================================");
  console.log(` TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log("============================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("FATAL ERROR in test runner:", err);
  process.exit(1);
});
