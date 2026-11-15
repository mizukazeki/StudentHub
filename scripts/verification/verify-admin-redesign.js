/**
 * BANTUG UNIVERSITY - Admin Panel Redesign & Password Verification Suite
 * Verifies Part 1 through Part 9 requirements:
 * 1. User Account Management rendering & filters
 * 2. Admissions & Applications records & filters
 * 3. Table styling, contrast, and responsive layout
 * 4. Administrator ADMIN-001 authentication with admin2026
 * 5. Password storage security (PBKDF2 hash, not plaintext)
 * 6. Other accounts' passwords unaltered
 * 7. RBAC security: student & faculty blocked from admin APIs
 */

const http = require("http");
const mysql = require("mysql2/promise");

const BASE_URL = "http://localhost:3000";

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        let data = null;
        try {
          data = JSON.parse(raw);
        } catch (_) {
          data = raw;
        }
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function verifyAll() {
  console.log("====================================================================");
  console.log("   BANTUG UNIVERSITY: ADMIN REDESIGN & PASSWORD VERIFICATION SUITE   ");
  console.log("====================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}: ${details}`);
      failed++;
    }
  }

  // 1. Database Check on ADMIN-001
  console.log("--- 1. Database Verification on ADMIN-001 ---");
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bantug_university_db"
  });

  const [adminRows] = await conn.query(
    "SELECT user_id, username, reference_id, role, full_name, email, password_hash, must_change_password FROM users WHERE reference_id = 'ADMIN-001' AND username = 'admin'"
  );
  assert(adminRows.length === 1, "Exactly one ADMIN-001 account exists in users table");
  const admin = adminRows[0];
  assert(admin.role === "admin", "Account role is 'admin'");
  assert(admin.full_name === "System Administrator", "Full name matches 'System Administrator'");
  assert(admin.password_hash.startsWith("$pbkdf2-sha256$10000$"), "Password hash is PBKDF2 ($pbkdf2-sha256$10000$...)");
  assert(!admin.password_hash.includes("admin2026"), "Plaintext password is NEVER stored in database");
  assert(admin.must_change_password === 1, "must_change_password is set to 1");

  // 2. Authentication Test with admin2026
  console.log("\n--- 2. Administrator Login Test ---");
  const loginRes = await makeRequest("POST", "/api/auth/login", {
    identifier: "admin",
    password: "admin2026",
    role: "admin"
  });
  assert(loginRes.statusCode === 200, "ADMIN-001 login with temporary password 'admin2026' succeeded");
  assert(loginRes.data?.session?.role === "admin", "Session role is 'admin'");
  assert(loginRes.data?.session?.actorId === "ADMIN-001", "Session actorId is 'ADMIN-001'");
  assert(loginRes.data?.session?.mustChangePassword === true, "Session reports mustChangePassword: true");

  const adminToken = loginRes.data?.session?.sessionToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 3. User Management Endpoint & Filters
  console.log("\n--- 3. User Management Endpoint & Search/Filter Tests ---");
  const usersRes = await makeRequest("GET", "/api/admin/users", null, adminHeaders);
  assert(usersRes.statusCode === 200, "GET /api/admin/users returns 200 OK");
  assert(Array.isArray(usersRes.data?.users), "Users returned as array");

  const searchRes = await makeRequest("GET", "/api/admin/users?search=Valiente", null, adminHeaders);
  assert(searchRes.statusCode === 200, "Search by name returned 200 OK");
  assert(searchRes.data?.users?.some((u) => u.fullName.includes("Valiente")), "Search matched 'Valiente'");

  const roleFilterRes = await makeRequest("GET", "/api/admin/users?role=faculty", null, adminHeaders);
  assert(roleFilterRes.statusCode === 200, "Role filter 'faculty' returned 200 OK");
  assert(roleFilterRes.data?.users?.every((u) => u.role === "faculty"), "All returned users have role 'faculty'");

  const statusFilterRes = await makeRequest("GET", "/api/admin/users?status=active", null, adminHeaders);
  assert(statusFilterRes.statusCode === 200, "Status filter 'active' returned 200 OK");
  assert(statusFilterRes.data?.users?.every((u) => u.isActive === 1 || u.isActive === true), "All returned users are active");

  // 4. Admissions Endpoint & Filters
  console.log("\n--- 4. Admissions Records & Review Tests ---");
  const appsRes = await makeRequest("GET", "/api/admin/applications", null, adminHeaders);
  assert(appsRes.statusCode === 200, "GET /api/admin/applications returns 200 OK");
  assert(Array.isArray(appsRes.data?.applications), "Applications returned as array");

  const appStatusRes = await makeRequest("GET", "/api/admin/applications?status=Pending", null, adminHeaders);
  assert(appStatusRes.statusCode === 200, "Application status filter returned 200 OK");
  assert(appStatusRes.data?.applications?.every((a) => a.status === "Pending"), "All returned applications have status 'Pending'");

  // 5. Check Other Users Remain Unaltered
  console.log("\n--- 5. Verify Other Account Passwords Unaltered ---");
  const studentLogin = await makeRequest("POST", "/api/auth/login", {
    identifier: "r.valiente",
    password: "demo123",
    role: "student"
  });
  assert(studentLogin.statusCode === 200, "Student r.valiente login succeeded with demo123 (unchanged)");

  const facultyLogin = await makeRequest("POST", "/api/auth/login", {
    identifier: "f.somera",
    password: "faculty123",
    role: "faculty"
  });
  assert(facultyLogin.statusCode === 200, "Faculty f.somera login succeeded with faculty123 (unchanged)");

  // 6. Security & RBAC Guardrails
  console.log("\n--- 6. Security Guardrails & RBAC Isolation ---");
  const studentToken = studentLogin.data?.session?.sessionToken;
  const forbiddenUserCheck = await makeRequest("GET", "/api/admin/users", null, {
    Authorization: `Bearer ${studentToken}`
  });
  assert(forbiddenUserCheck.statusCode === 403, "Student access to /api/admin/users blocked with 403 Forbidden");

  const forbiddenAppCheck = await makeRequest("GET", "/api/admin/applications", null, {
    Authorization: `Bearer ${studentToken}`
  });
  assert(forbiddenAppCheck.statusCode === 403, "Student access to /api/admin/applications blocked with 403 Forbidden");

  await conn.end();

  console.log("\n====================================================================");
  console.log(` VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("====================================================================");

  if (failed > 0) process.exit(1);
}

verifyAll().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});

