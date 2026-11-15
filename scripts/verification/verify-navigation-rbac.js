// Automated verification test for responsive navigation and RBAC enforcement.
const http = require("http");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";

function request(method, pathName, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathName, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let bodyStr = null;
    if (body) {
      bodyStr = typeof body === "string" ? body : JSON.stringify(body);
      options.headers["Content-Type"] = "application/json";
      options.headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          raw: data,
          data: json
        });
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function runTests() {
  console.log("================================================================================");
  console.log("   BANTUG UNIVERSITY PHASE 6 - CLEAN NAVIGATION & RBAC VERIFICATION SUITE       ");
  console.log("================================================================================\n");

  const results = [];
  function assert(testName, condition, detail = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      results.push({ name: testName, status: "PASS", detail });
    } else {
      console.error(`[FAIL] ${testName} - ${detail}`);
      results.push({ name: testName, status: "FAIL", detail });
    }
  }

  // Connect to MariaDB
  const pool = await mysql.createPool({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "bantug_university_db"
  });

  try {
    // -------------------------------------------------------------------------
    // 1. FILE & DOM AUDIT: HAMBURGER & ROLE SWITCHING REMOVAL
    // -------------------------------------------------------------------------
    console.log("--- 1. File & DOM Audit: Hamburger & Drawer Elimination ---");
    const headerHtml = fs.readFileSync(path.join(__dirname, "..", "pages", "shared", "header.html"), "utf8");
    const sidebarHtml = fs.readFileSync(path.join(__dirname, "..", "pages", "shared", "sidebar.html"), "utf8");
    const navHtml = fs.readFileSync(path.join(__dirname, "..", "pages", "shared", "navigation.html"), "utf8");
    const appJs = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
    const authJs = fs.readFileSync(path.join(__dirname, "..", "js", "auth.js"), "utf8");
    const responsiveCss = fs.readFileSync(path.join(__dirname, "..", "css", "responsive", "breakpoints.css"), "utf8");

    assert("header.html does not contain hamburger button (#mobileMenuBtn)", !headerHtml.includes('id="mobileMenuBtn"'));
    assert("sidebar.html does not contain overlay backdrop (#sidebarOverlay)", !sidebarHtml.includes('id="sidebarOverlay"'));
    assert("header.html does not contain role switching button (#quickSwitchRoleBtn)", !headerHtml.includes('id="quickSwitchRoleBtn"'));
    assert("header.html contains read-only role indicator badge", headerHtml.includes('class="role-indicator-badge"'));
    assert("sidebar.html logout text is clean without role switching reference", !sidebarHtml.includes("Switch Role"));

    assert("app.js has no openMobileSidebar function", !appJs.includes("function openMobileSidebar"));
    assert("app.js has no closeMobileSidebar function", !appJs.includes("function closeMobileSidebar"));
    assert("app.js has no quickSwitchRoleBtn listener", !appJs.includes('getElementById("quickSwitchRoleBtn")'));
    assert("auth.js has no openDemoRoleLauncher modal", !authJs.includes("function openDemoRoleLauncher"));

    assert("breakpoints.css removes .sidebar-overlay rules", !responsiveCss.includes(".sidebar-overlay {") && !responsiveCss.includes(".sidebar-overlay.active"));
    assert("breakpoints.css defines non-blocking horizontal navigation for <= 992px", 
      responsiveCss.includes("overflow-x: auto") && responsiveCss.includes(".sidebar-nav")
    );

    // -------------------------------------------------------------------------
    // 2. NAVIGATION DESTINATIONS PRESERVATION
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Navigation Destinations Preservation ---");
    // Student destinations
    assert("Student navigation includes Dashboard", navHtml.includes('data-section="dashboard"'));
    assert("Student navigation includes Profile", navHtml.includes('data-section="profile"'));
    assert("Student navigation includes Subjects", navHtml.includes('data-section="subjects"'));
    assert("Student navigation includes Schedule", navHtml.includes('data-section="schedule"'));
    assert("Student navigation includes Grades", navHtml.includes('data-section="grades"'));
    assert("Student navigation includes Announcements", navHtml.includes('data-section="announcements"'));
    assert("Student navigation includes Learning Resources", navHtml.includes('data-section="resources"'));
    assert("Student navigation includes Settings", navHtml.includes('data-section="settings"'));

    // Faculty destinations
    assert("Faculty navigation includes Faculty Dashboard", navHtml.includes('data-section="faculty-dashboard"'));
    assert("Faculty navigation includes Faculty Profile", navHtml.includes('data-section="faculty-profile"'));
    assert("Faculty navigation includes My Classes & Schedule", navHtml.includes('data-section="faculty-classes"'));
    assert("Faculty navigation includes Grade Management", navHtml.includes('data-section="faculty-grades"'));
    assert("Faculty navigation includes Faculty Announcements", navHtml.includes('data-section="faculty-announcements"'));

    // Admin destinations
    assert("Admin navigation includes Admin Overview", navHtml.includes('data-section="admin-dashboard"'));
    assert("Admin navigation includes User Management", navHtml.includes('data-section="admin-users"'));
    assert("Admin navigation includes Applications", navHtml.includes('data-section="admin-applications"'));
    assert("Admin navigation includes Audit Logs", navHtml.includes('data-section="admin-logs"'));
    assert("Admin navigation includes Admin Security", navHtml.includes('data-section="admin-settings"'));

    // -------------------------------------------------------------------------
    // 3. AUTHENTICATION & LOGIN PROCESS
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Authentication & Login Verification ---");
    // 1. Student Login
    const studentLogin = await request("POST", "/api/auth/login", {}, {
      identifier: "r.valiente",
      password: "demo123",
      role: "student"
    });
    assert("Student login returns 200 OK", studentLogin.statusCode === 200, `Got ${studentLogin.statusCode}`);
    const studentToken = studentLogin.data?.session?.token;
    assert("Student session token issued", Boolean(studentToken));
    assert("Student session role is 'student'", studentLogin.data?.session?.role === "student");
    const studentHeaders = { Authorization: `Bearer ${studentToken}` };

    // 2. Faculty Login
    const facultyLogin = await request("POST", "/api/auth/login", {}, {
      identifier: "f.somera",
      password: "faculty123",
      role: "faculty"
    });
    assert("Faculty login returns 200 OK", facultyLogin.statusCode === 200, `Got ${facultyLogin.statusCode}`);
    const facultyToken = facultyLogin.data?.session?.token;
    assert("Faculty session token issued", Boolean(facultyToken));
    assert("Faculty session role is 'faculty'", facultyLogin.data?.session?.role === "faculty");
    const facultyHeaders = { Authorization: `Bearer ${facultyToken}` };

    // 3. Admin Login
    const adminLogin = await request("POST", "/api/auth/login", {}, {
      identifier: "admin",
      password: process.env.ADMIN_TEMP_PASSWORD || "admin2026",
      role: "admin"
    });
    assert("Admin login returns 200 OK", adminLogin.statusCode === 200, `Got ${adminLogin.statusCode}`);
    const adminToken = adminLogin.data?.session?.token;
    assert("Admin session token issued", Boolean(adminToken));
    assert("Admin session role is 'admin'", adminLogin.data?.session?.role === "admin");
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // -------------------------------------------------------------------------
    // 4. STUDENT ACCESS BOUNDARIES & RBAC ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Student Access Boundaries & RBAC Enforcement ---");
    // Allowed
    const stAcad = await request("GET", "/api/student/academic-data", studentHeaders);
    assert("Student CAN access /api/student/academic-data (200 OK)", stAcad.statusCode === 200, `Got ${stAcad.statusCode}`);
    assert("Student academic data contains enrolled subjects", Array.isArray(stAcad.data?.enrolledSubjects));

    const stLoad = await request("GET", "/api/portal?action=load", studentHeaders);
    assert("Student CAN access /api/portal?action=load (200 OK)", stLoad.statusCode === 200);
    assert("Action load returns authenticatedRole: 'student'", stLoad.data?.authenticatedRole === "student");

    // Forbidden for student
    const stFacProf = await request("GET", "/api/faculty/profile", studentHeaders);
    assert("Student CANNOT access /api/faculty/profile (403 Forbidden)", stFacProf.statusCode === 403, `Got ${stFacProf.statusCode}`);

    const stAdminUsers = await request("GET", "/api/admin/users", studentHeaders);
    assert("Student CANNOT access /api/admin/users (403 Forbidden)", stAdminUsers.statusCode === 403, `Got ${stAdminUsers.statusCode}`);

    const stAdminLogs = await request("GET", "/api/admin/logs", studentHeaders);
    assert("Student CANNOT access /api/admin/logs (403 Forbidden)", stAdminLogs.statusCode === 403, `Got ${stAdminLogs.statusCode}`);

    const stCrossStudent = await request("GET", "/api/student/academic-data?studentNumber=2025-BSIT-0001", studentHeaders);
    assert("Student CANNOT access another student's records (403 Forbidden)", stCrossStudent.statusCode === 403, `Got ${stCrossStudent.statusCode}`);

    // -------------------------------------------------------------------------
    // 5. FACULTY ACCESS BOUNDARIES & RBAC ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Faculty Access Boundaries & RBAC Enforcement ---");
    // Allowed
    const facProf = await request("GET", "/api/faculty/profile", facultyHeaders);
    assert("Faculty CAN access /api/faculty/profile (200 OK)", facProf.statusCode === 200, `Got ${facProf.statusCode}`);
    assert("Faculty profile contains facultyId FAC-BU-04", facProf.data?.profile?.facultyId === "FAC-BU-04");

    const facLoad = await request("GET", "/api/portal?action=load", facultyHeaders);
    assert("Faculty CAN access /api/portal?action=load (200 OK)", facLoad.statusCode === 200);
    assert("Action load returns authenticatedRole: 'faculty'", facLoad.data?.authenticatedRole === "faculty");

    // Forbidden for faculty
    const facStAcad = await request("GET", "/api/student/academic-data", facultyHeaders);
    assert("Faculty CANNOT access /api/student/academic-data (403 Forbidden)", facStAcad.statusCode === 403, `Got ${facStAcad.statusCode}`);

    const facAdminUsers = await request("GET", "/api/admin/users", facultyHeaders);
    assert("Faculty CANNOT access /api/admin/users (403 Forbidden)", facAdminUsers.statusCode === 403, `Got ${facAdminUsers.statusCode}`);

    const facCrossProf = await request("GET", "/api/faculty/profile?facultyId=FAC-BU-01", facultyHeaders);
    assert("Faculty CANNOT access another faculty's profile (403 Forbidden)", facCrossProf.statusCode === 403, `Got ${facCrossProf.statusCode}`);

    // -------------------------------------------------------------------------
    // 6. ADMINISTRATOR ACCESS & MANAGEMENT CAPABILITIES
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Administrator Access Capabilities ---");
    const adminOverview = await request("GET", "/api/admin/overview", adminHeaders);
    assert("Admin CAN access /api/admin/overview (200 OK)", adminOverview.statusCode === 200);

    const adminUsers = await request("GET", "/api/admin/users", adminHeaders);
    assert("Admin CAN access /api/admin/users (200 OK)", adminUsers.statusCode === 200);

    const adminApps = await request("GET", "/api/admin/applications", adminHeaders);
    assert("Admin CAN access /api/admin/applications (200 OK)", adminApps.statusCode === 200);

    const adminLogs = await request("GET", "/api/admin/logs", adminHeaders);
    assert("Admin CAN access /api/admin/logs (200 OK)", adminLogs.statusCode === 200);

    // -------------------------------------------------------------------------
    // 7. UNAUTHORIZED ROLE FORGERY & CLIENT TAMPERING PREVENTION
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Unauthorized Role Forgery & Tampering Rejection ---");
    // Unauthenticated guest requests
    const guestAcad = await request("GET", "/api/student/academic-data", {});
    assert("Unauthenticated guest rejected from /api/student/academic-data (401)", guestAcad.statusCode === 401);

    const guestFac = await request("GET", "/api/faculty/profile", {});
    assert("Unauthenticated guest rejected from /api/faculty/profile (401)", guestFac.statusCode === 401);

    const guestAdmin = await request("GET", "/api/admin/users", {});
    assert("Unauthenticated guest rejected from /api/admin/users (401)", guestAdmin.statusCode === 401);

    // Client sends student token but forged header/body trying to claim admin role
    const forgedHeader = {
      Authorization: `Bearer ${studentToken}`,
      "X-Portal-Role": "admin"
    };
    const forgedAdminReq = await request("GET", "/api/admin/users", forgedHeader);
    assert("Forged X-Portal-Role header rejected by backend RBAC (403 Forbidden)", forgedAdminReq.statusCode === 403);

    // -------------------------------------------------------------------------
    // 8. DATABASE INTEGRITY & RECORD SAFETY
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Database Integrity & Record Safety ---");
    const [userCount] = await pool.query("SELECT COUNT(*) AS c FROM `users`");
    const [studentCount] = await pool.query("SELECT COUNT(*) AS c FROM `students`");
    const [facultyCount] = await pool.query("SELECT COUNT(*) AS c FROM `faculty`");
    const [subjectCount] = await pool.query("SELECT COUNT(*) AS c FROM `subjects`");
    const [scheduleCount] = await pool.query("SELECT COUNT(*) AS c FROM `subject_schedules`");

    assert("Users table records preserved (> 0)", userCount[0].c > 0, `Count: ${userCount[0].c}`);
    assert("Students table records preserved (> 0)", studentCount[0].c > 0, `Count: ${studentCount[0].c}`);
    assert("Faculty table records preserved (> 0)", facultyCount[0].c > 0, `Count: ${facultyCount[0].c}`);
    assert("Subjects table records preserved (> 0)", subjectCount[0].c > 0, `Count: ${subjectCount[0].c}`);
    assert("Subject schedules table records preserved (> 0)", scheduleCount[0].c > 0, `Count: ${scheduleCount[0].c}`);

    // Summary
    console.log("\n================================================================================");
    const passCount = results.filter((r) => r.status === "PASS").length;
    const failCount = results.filter((r) => r.status === "FAIL").length;
    console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
    console.log("================================================================================\n");

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution encountered unexpected error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
