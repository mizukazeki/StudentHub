/**
 * ============================================================================
 * BANTUG UNIVERSITY - Phase 8 Verification Test Suite
 * SECURE ADMIN PANEL & RBAC VERIFICATION
 * ============================================================================
 */

const http = require("http");

const BASE_URL = "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_TEMP_PASSWORD || "admin2026";

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers
    };
    if (postData) {
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch (_) {
            data = raw;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data
          });
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log("====================================================================");
  console.log("       BANTUG UNIVERSITY - PHASE 8 ADMIN PANEL VERIFICATION       ");
  console.log("====================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Unauthenticated Admin API Request Rejection (401 Unauthorized)
    // ------------------------------------------------------------------------
    console.log("--- TEST 1: Unauthenticated Access Control ---");
    const unauthStats = await makeRequest("GET", "/api/admin/stats");
    assert(
      unauthStats.statusCode === 401 || unauthStats.statusCode === 403,
      "Unauthenticated GET /api/admin/stats rejected with 401 or 403",
      `Got status ${unauthStats.statusCode}`
    );

    const unauthUsers = await makeRequest("GET", "/api/admin/users");
    assert(
      unauthUsers.statusCode === 401 || unauthUsers.statusCode === 403,
      "Unauthenticated GET /api/admin/users rejected with 401 or 403",
      `Got status ${unauthUsers.statusCode}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Student Role Calling Admin Endpoints (403 Forbidden)
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 2: Student Account Role Restriction ---");
    const studentLogin = await makeRequest("POST", "/api/auth/login", {
      identifier: "r.valiente",
      password: "demo123"
    });
    assert(studentLogin.statusCode === 200, "Student (r.valiente) logged in successfully");
    const studentToken = studentLogin.data?.session?.sessionToken;

    const studentAdminStats = await makeRequest("GET", "/api/admin/stats", null, {
      Authorization: `Bearer ${studentToken}`
    });
    assert(
      studentAdminStats.statusCode === 403,
      "Student access to /api/admin/stats blocked with 403 Forbidden",
      `Got status ${studentAdminStats.statusCode}`
    );

    const studentAdminUsers = await makeRequest("GET", "/api/admin/users", null, {
      Authorization: `Bearer ${studentToken}`
    });
    assert(
      studentAdminUsers.statusCode === 403,
      "Student access to /api/admin/users blocked with 403 Forbidden",
      `Got status ${studentAdminUsers.statusCode}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Faculty Role Calling Admin Endpoints (403 Forbidden)
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 3: Faculty Account Role Restriction ---");
    const facultyLogin = await makeRequest("POST", "/api/auth/login", {
      identifier: "f.somera",
      password: "faculty123"
    });
    assert(facultyLogin.statusCode === 200, "Faculty (f.somera) logged in successfully");
    const facultyToken = facultyLogin.data?.session?.sessionToken;

    const facultyAdminStats = await makeRequest("GET", "/api/admin/stats", null, {
      Authorization: `Bearer ${facultyToken}`
    });
    assert(
      facultyAdminStats.statusCode === 403,
      "Faculty access to /api/admin/stats blocked with 403 Forbidden",
      `Got status ${facultyAdminStats.statusCode}`
    );

    const facultyAdminUsers = await makeRequest("GET", "/api/admin/users", null, {
      Authorization: `Bearer ${facultyToken}`
    });
    assert(
      facultyAdminUsers.statusCode === 403,
      "Faculty access to /api/admin/users blocked with 403 Forbidden",
      `Got status ${facultyAdminUsers.statusCode}`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Administrator Login & First-Time Password Change Flag
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 4: Administrator Login & First-Time Flag ---");
    const adminLogin = await makeRequest("POST", "/api/auth/login", {
      identifier: "admin",
      password: ADMIN_PASSWORD
    });
    assert(adminLogin.statusCode === 200, "Administrator (admin) logged in successfully");
    assert(adminLogin.data?.session?.role === "admin", "Role is 'admin'");
    assert(
      adminLogin.data?.session?.mustChangePassword === true,
      "mustChangePassword flag is true on initial admin account"
    );
    const adminToken = adminLogin.data?.session?.sessionToken;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // ------------------------------------------------------------------------
    // TEST 5: Administrator Statistics Endpoint
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 5: GET /api/admin/stats ---");
    const adminStats = await makeRequest("GET", "/api/admin/stats", null, adminHeaders);
    assert(adminStats.statusCode === 200, "GET /api/admin/stats returned 200 OK");
    const stats = adminStats.data?.stats;
    assert(typeof stats?.totalUsers === "number", "stats.totalUsers is a number: " + stats?.totalUsers);
    assert(typeof stats?.totalStudents === "number", "stats.totalStudents is a number: " + stats?.totalStudents);
    assert(typeof stats?.totalFaculty === "number", "stats.totalFaculty is a number: " + stats?.totalFaculty);
    assert(typeof stats?.totalActive === "number", "stats.totalActive is a number: " + stats?.totalActive);
    assert(typeof stats?.totalApplications === "number", "stats.totalApplications is a number: " + stats?.totalApplications);
    assert(Array.isArray(adminStats.data?.recentLogs), "adminStats.recentLogs is an array");

    // ------------------------------------------------------------------------
    // TEST 6: Administrator User Listing & Role Filters
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 6: GET /api/admin/users ---");
    const allUsers = await makeRequest("GET", "/api/admin/users", null, adminHeaders);
    assert(allUsers.statusCode === 200, "GET /api/admin/users returned 200 OK");
    assert(Array.isArray(allUsers.data?.users), "users is an array");
    assert(allUsers.data?.users.length > 0, "Users list is not empty: " + allUsers.data?.users.length);

    // Verify NO password_hash exposed
    const hasPasswordHash = allUsers.data?.users.some((u) => u.password_hash !== undefined || u.password !== undefined);
    assert(!hasPasswordHash, "Security: Password hashes and passwords are NEVER exposed in user listings");

    const studentFilter = await makeRequest("GET", "/api/admin/users?role=student", null, adminHeaders);
    const allAreStudents = studentFilter.data?.users?.every((u) => u.role === "student");
    assert(allAreStudents, "GET /api/admin/users?role=student returns only student accounts");

    const facultyFilter = await makeRequest("GET", "/api/admin/users?role=faculty", null, adminHeaders);
    const allAreFaculty = facultyFilter.data?.users?.every((u) => u.role === "faculty");
    assert(allAreFaculty, "GET /api/admin/users?role=faculty returns only faculty accounts");

    // ------------------------------------------------------------------------
    // TEST 7: Administrator Create User
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 7: POST /api/admin/users (Create User) ---");
    // Attempt to create role 'admin'
    const tryCreateAdmin = await makeRequest(
      "POST",
      "/api/admin/users",
      {
        role: "admin",
        username: "hacker_admin",
        fullName: "Fake Admin",
        email: "fake.admin@bantug.edu.example"
      },
      adminHeaders
    );
    assert(
      tryCreateAdmin.statusCode === 400,
      "Prevent creating additional root administrator accounts via standard user creation (400)"
    );

    const testUserSeq = Date.now().toString().slice(-4);
    const testUsername = `test.student.${testUserSeq}`;
    const testEmail = `test.student.${testUserSeq}@bantug.edu.example`;

    const createStudent = await makeRequest(
      "POST",
      "/api/admin/users",
      {
        role: "student",
        username: testUsername,
        fullName: "Test Verification Student",
        email: testEmail,
        department: "Bachelor of Science in Information Technology",
        section: "BSIT 1-1"
      },
      adminHeaders
    );
    assert(createStudent.statusCode === 201, "POST /api/admin/users created student (201 Created)");
    assert(createStudent.data?.user?.username === testUsername, "Created user matches username");
    assert(typeof createStudent.data?.temporaryPassword === "string", "Temporary password generated");
    const createdUserId = createStudent.data?.user?.userId;
    const tempPassword = createStudent.data?.temporaryPassword;

    // ------------------------------------------------------------------------
    // TEST 8: GET and PUT /api/admin/users/:id
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 8: GET & PUT /api/admin/users/:id ---");
    const getUser = await makeRequest("GET", `/api/admin/users/${createdUserId}`, null, adminHeaders);
    assert(getUser.statusCode === 200, "GET /api/admin/users/:id returned 200 OK");
    assert(getUser.data?.user?.email === testEmail, "User email matches created user");

    const updateUser = await makeRequest(
      "PUT",
      `/api/admin/users/${createdUserId}`,
      {
        fullName: "Updated Test Student",
        section: "BSIT 1-2"
      },
      adminHeaders
    );
    assert(updateUser.statusCode === 200, "PUT /api/admin/users/:id updated user details (200 OK)");

    const verifyUpdate = await makeRequest("GET", `/api/admin/users/${createdUserId}`, null, adminHeaders);
    assert(verifyUpdate.data?.user?.fullName === "Updated Test Student", "Full name updated successfully in DB");

    // ------------------------------------------------------------------------
    // TEST 9: Status Toggle & Active Session Revocation
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 9: Status Toggle & Session Revocation ---");
    // Log in as new test user
    const testUserLogin = await makeRequest("POST", "/api/auth/login", {
      identifier: testUsername,
      password: tempPassword
    });
    assert(testUserLogin.statusCode === 200, "Test student logged in with temporary password");
    const testUserToken = testUserLogin.data?.session?.sessionToken;

    // Deactivate test user account
    const deactivateRes = await makeRequest(
      "PUT",
      `/api/admin/users/${createdUserId}/status`,
      { isActive: false },
      adminHeaders
    );
    assert(deactivateRes.statusCode === 200, "Admin deactivated test user account");

    // Calling session with test user's token should be rejected (revoked)
    const testUserSessionCheck = await makeRequest("GET", "/api/auth/session", null, {
      Authorization: `Bearer ${testUserToken}`
    });
    assert(
      testUserSessionCheck.statusCode === 401,
      "Active session for deactivated user was immediately revoked (401)"
    );

    // Logging in while inactive should return 403
    const loginWhileInactive = await makeRequest("POST", "/api/auth/login", {
      identifier: testUsername,
      password: tempPassword
    });
    assert(
      loginWhileInactive.statusCode === 403,
      "Login blocked for deactivated account with 403 Forbidden"
    );

    // Reactivate user
    const reactivateRes = await makeRequest(
      "PUT",
      `/api/admin/users/${createdUserId}/status`,
      { isActive: true },
      adminHeaders
    );
    assert(reactivateRes.statusCode === 200, "Admin reactivated test user account");

    // ------------------------------------------------------------------------
    // TEST 10: Reset Password Endpoint
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 10: POST /api/admin/users/:id/reset-password ---");
    const resetRes = await makeRequest(
      "POST",
      `/api/admin/users/${createdUserId}/reset-password`,
      {},
      adminHeaders
    );
    assert(resetRes.statusCode === 200, "Password reset returned 200 OK");
    assert(typeof resetRes.data?.temporaryPassword === "string", "New temporary password returned");
    const newTempPassword = resetRes.data?.temporaryPassword;

    // Log in with new temporary password
    const loginWithNewTemp = await makeRequest("POST", "/api/auth/login", {
      identifier: testUsername,
      password: newTempPassword
    });
    assert(loginWithNewTemp.statusCode === 200, "User logged in with new temporary password");
    assert(loginWithNewTemp.data?.session?.mustChangePassword === true, "mustChangePassword flag is true");

    // ------------------------------------------------------------------------
    // TEST 11: Application Review Decision & Approval Email
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 11: Application Records & Approval Email ---");
    const appsList = await makeRequest("GET", "/api/admin/applications", null, adminHeaders);
    assert(appsList.statusCode === 200, "GET /api/admin/applications returned 200 OK");
    assert(Array.isArray(appsList.data?.applications), "applications is an array");

    // Submit a fresh test application to test approval
    const submitApp = await makeRequest("POST", "/api/applications", {
      fullName: "Admission Applicant Test",
      dateOfBirth: "2006-03-15",
      email: `applicant.test.${testUserSeq}@bantug.edu.example`,
      contactNumber: "09175551234",
      address: "123 Test Street",
      applicantType: "Senior High School Graduate / Freshman",
      desiredProgram: "Bachelor of Science in Information Technology",
      secondChoiceProgram: "Bachelor of Science in Computer Science",
      previousSchool: "Bantug High",
      educationalBackground: "STEM Strand",
      graduationYear: "2026"
    });
    assert(submitApp.statusCode === 201, "Submitted test applicant application");
    const refNo = submitApp.data?.application?.referenceNumber;

    // Admin approves the application
    const approveApp = await makeRequest(
      "PUT",
      `/api/admin/applications/${refNo}/status`,
      {
        status: "Approved",
        approvedProgram: "Bachelor of Science in Information Technology",
        remarks: "Approved by Admissions Office."
      },
      adminHeaders
    );
    assert(approveApp.statusCode === 200, "Admin approved application (200 OK)");
    assert(approveApp.data?.application?.status === "Approved", "Status is 'Approved'");
    assert(approveApp.data?.application?.approvalEmailSent === true, "approvalEmailSent is true");

    // ------------------------------------------------------------------------
    // TEST 12: Audit Logs
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 12: GET /api/admin/logs ---");
    const logsRes = await makeRequest("GET", "/api/admin/logs", null, adminHeaders);
    assert(logsRes.statusCode === 200, "GET /api/admin/logs returned 200 OK");
    const logs = logsRes.data?.logs || [];
    assert(logs.length > 0, "Audit logs returned entries: " + logs.length);

    const hasUserCreated = logs.some((l) => l.actionType === "USER_CREATED");
    assert(hasUserCreated, "Audit trail recorded USER_CREATED");

    const hasStatusUpdated = logs.some((l) => l.actionType === "APPLICATION_STATUS_UPDATED");
    assert(hasStatusUpdated, "Audit trail recorded APPLICATION_STATUS_UPDATED");

    const hasAccountDeactivated = logs.some((l) => l.actionType === "ACCOUNT_DEACTIVATED");
    assert(hasAccountDeactivated, "Audit trail recorded ACCOUNT_DEACTIVATED");

    // ------------------------------------------------------------------------
    // TEST 13: Administrator Password Change & must_change_password Clearing
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 13: Mandatory Password Change Enforcement ---");
    const changeAdminPw = await makeRequest(
      "POST",
      "/api/auth/change-password",
      {
        currentPassword: ADMIN_PASSWORD,
        newPassword: "UpdatedSecureAdmin2026!",
        confirmPassword: "UpdatedSecureAdmin2026!"
      },
      adminHeaders
    );
    assert(changeAdminPw.statusCode === 200, "Administrator changed password successfully (200 OK)");

    // Verify session now shows mustChangePassword: false
    const checkAdminSession = await makeRequest("GET", "/api/auth/session", null, adminHeaders);
    assert(
      checkAdminSession.data?.mustChangePassword === false,
      "mustChangePassword is now false after password update"
    );

    // Verify admin can log in with new password
    const adminReLogin = await makeRequest("POST", "/api/auth/login", {
      identifier: "admin",
      password: "UpdatedSecureAdmin2026!"
    });
    assert(adminReLogin.statusCode === 200, "Admin logged in with new password");
    assert(adminReLogin.data?.session?.mustChangePassword === false, "mustChangePassword is false on new login");

    // Revert password back to temporary password with must_change_password = 1 for continued development
    const revertToken = adminReLogin.data?.session?.sessionToken;
    const revertPw = await makeRequest(
      "POST",
      "/api/auth/change-password",
      {
        currentPassword: "UpdatedSecureAdmin2026!",
        newPassword: ADMIN_PASSWORD,
        confirmPassword: ADMIN_PASSWORD
      },
      { Authorization: `Bearer ${revertToken}` }
    );
    assert(revertPw.statusCode === 200, "Reverted admin password to target temporary password");

    // ------------------------------------------------------------------------
    // TEST 14: Safe Delete / Deactivation of User
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 14: DELETE /api/admin/users/:id ---");
    const deleteUser = await makeRequest("DELETE", `/api/admin/users/${createdUserId}`, null, {
      Authorization: `Bearer ${revertToken}`
    });
    assert(deleteUser.statusCode === 200, "DELETE /api/admin/users/:id returned 200 OK");

    // Try deleting self as admin -> should be blocked
    const deleteSelf = await makeRequest("DELETE", "/api/admin/users/admin", null, {
      Authorization: `Bearer ${revertToken}`
    });
    assert(deleteSelf.statusCode === 400, "Admin cannot delete their own account (400)");

    // Restore initial must_change_password flag = 1 for admin
    const adminFinalLogin = await makeRequest("POST", "/api/auth/login", {
      identifier: "admin",
      password: ADMIN_PASSWORD
    });
    assert(adminFinalLogin.statusCode === 200, "Final admin login with target temporary password succeeded");

    const mysql = require("mysql2/promise");
    const cleanupConn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "bantug_university_db"
    });
    await cleanupConn.query("UPDATE users SET must_change_password = 1 WHERE username = 'admin'");
    await cleanupConn.end();
    assert(true, "Restored must_change_password = 1 for initial admin account");

  } catch (err) {
    console.error("Test execution failed with error:", err);
    failed++;
  }

  console.log("\n====================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================================");
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
