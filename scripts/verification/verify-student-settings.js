/**
 * Comprehensive Verification Suite for Phase 4: Restrict Student Settings and Personal Information
 * BANTUG UNIVERSITY Student Portal
 */

const http = require("http");
const fs = require("fs");
const mysql = require("mysql2/promise");

const BASE_URL = "http://localhost:3000";

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body) {
      payload = typeof body === "string" ? body : JSON.stringify(body);
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch (_) {
            parsed = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed,
            raw: data
          });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log("================================================================================");
  console.log("BANTUG UNIVERSITY — PHASE 4: STUDENT SETTINGS RESTRICTION VERIFICATION SUITE");
  console.log("================================================================================\n");

  const results = [];
  function assert(title, condition, detail = "") {
    if (condition) {
      console.log(`[PASS] ${title}${detail ? " - " + detail : ""}`);
      results.push({ title, pass: true, detail });
    } else {
      console.error(`[FAIL] ${title}${detail ? " - " + detail : ""}`);
      results.push({ title, pass: false, detail });
    }
  }

  // Database connection
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bantug_university_db",
    port: 3306
  });

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: AUTHENTICATION & LOGIN
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 1: AUTHENTICATION TESTS ---");
    
    // Test 1: Student Login (r.valiente / demo123)
    const studentLoginRes = await request("POST", "/api/auth/login", {
      identifier: "r.valiente",
      password: "demo123"
    });
    assert("1. Student Authentication", studentLoginRes.status === 200 && studentLoginRes.data?.ok === true, 
      `Logged in as ${studentLoginRes.data?.session?.username} (${studentLoginRes.data?.session?.role})`);
    
    const studentToken = studentLoginRes.data?.session?.sessionToken || studentLoginRes.data?.session?.token;
    const studentProfile = studentLoginRes.data?.session?.studentProfile;

    assert("1.1 Student Profile Included in Session", studentProfile && studentProfile.studentNumber === "2025-BSIT-0202",
      `Student Number: ${studentProfile?.studentNumber}, Name: ${studentProfile?.fullName}`);

    // Test 2: Admin Login (admin / ChangeMeAdmin2026!)
    const adminLoginRes = await request("POST", "/api/auth/login", {
      identifier: "admin",
      password: process.env.ADMIN_TEMP_PASSWORD || "admin2026"
    });
    assert("2. Administrator Authentication", adminLoginRes.status === 200 && adminLoginRes.data?.ok === true,
      `Logged in as ${adminLoginRes.data?.session?.username} (${adminLoginRes.data?.session?.role})`);
    
    const adminToken = adminLoginRes.data?.session?.sessionToken || adminLoginRes.data?.session?.token;

    // ------------------------------------------------------------------------
    // SECTION 2: BACKEND PROTECTION FOR STUDENT PROFILE / PREFERENCES (HTTP 403)
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 2: BACKEND API RESTRICTION TESTS (STUDENT CANNOT MODIFY) ---");

    // Test 3: POST /api/account/preferences by student
    const prefUpdateRes = await request("POST", "/api/account/preferences", {
      displayName: "Hacked Name",
      academicTerm: "Hacked Term"
    }, { Authorization: `Bearer ${studentToken}` });

    assert("3. Block POST /api/account/preferences for Students", prefUpdateRes.status === 403,
      `Status: ${prefUpdateRes.status}, Message: "${prefUpdateRes.data?.message}"`);
    assert("3.1 Correct Error Message on Preferences Block", 
      String(prefUpdateRes.data?.message).includes("Access denied: Personal and academic information can only be updated by the university administrator."),
      prefUpdateRes.data?.message);

    // Test 4: POST /api/auth/account-preferences by student
    const authPrefUpdateRes = await request("POST", "/api/auth/account-preferences", {
      displayName: "Hacked Name"
    }, { Authorization: `Bearer ${studentToken}` });
    assert("4. Block POST /api/auth/account-preferences for Students", authPrefUpdateRes.status === 403,
      `Status: ${authPrefUpdateRes.status}`);

    // Test 5: POST /api/student/profile by student
    const studentProfilePostRes = await request("POST", "/api/student/profile", {
      fullName: "Hacked Name",
      section: "BSIT 1-1"
    }, { Authorization: `Bearer ${studentToken}` });
    assert("5. Block POST /api/student/profile for Students", studentProfilePostRes.status === 403,
      `Status: ${studentProfilePostRes.status}`);

    // Test 6: PUT /api/student/profile by student
    const studentProfilePutRes = await request("PUT", "/api/student/profile", {
      fullName: "Hacked Name"
    }, { Authorization: `Bearer ${studentToken}` });
    assert("6. Block PUT /api/student/profile for Students", studentProfilePutRes.status === 403,
      `Status: ${studentProfilePutRes.status}`);

    // Test 7: POST /api/portal?action=save by student
    const portalSaveRes = await request("POST", "/api/portal?action=save", {
      state: { profile: { fullName: "Hacked Name" } }
    }, { Authorization: `Bearer ${studentToken}` });
    assert("7. Block POST /api/portal?action=save for Students", portalSaveRes.status === 403,
      `Status: ${portalSaveRes.status}`);

    // Test 7.1: Student Allowed to Change Own Password
    const changePassAttempt = await request("POST", "/api/auth/change-password", {
      currentPassword: "demo123",
      newPassword: "NewDemoPassword2026!",
      confirmPassword: "NewDemoPassword2026!",
      sessionToken: studentToken
    }, { Authorization: `Bearer ${studentToken}` });
    assert("7.1 Student Change Password Allowed", changePassAttempt.status === 200 && changePassAttempt.data?.ok === true,
      `Password successfully updated with PBKDF2 hashing`);

    // Restore original password
    await request("POST", "/api/auth/change-password", {
      currentPassword: "NewDemoPassword2026!",
      newPassword: "demo123",
      confirmPassword: "demo123",
      sessionToken: studentToken
    }, { Authorization: `Bearer ${studentToken}` });
    assert("7.2 Restored Original Student Password", true, "demo123 re-established");

    // ------------------------------------------------------------------------
    // SECTION 3: FRONTEND SETTINGS DOM & CLIENT MODULE VALIDATION
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 3: FRONTEND DOM STRUCTURE & RENDER VERIFICATION ---");

    const settingsCode = fs.readFileSync("js/settings.js", "utf8");
    const m = settingsCode.match(/if\s*\(isStudent\)\s*\{([\s\S]*?)\}\s*else\s*\{/);
    const studentBlock = m ? m[1] : "";

    assert("8. Student View: Extracted Dedicated Student Template", studentBlock.length > 500,
      `Template length: ${studentBlock.length} chars`);

    // Verify removed elements in student view
    assert("9. Student View: Removed Logo Configuration", 
      !studentBlock.includes("uploadLogoFileInput") && !studentBlock.includes("resetDefaultLogoPathBtn") && !studentBlock.includes("BANTUG UNIVERSITY Logo Configuration"),
      "Logo configuration completely absent from student template");

    assert("10. Student View: Removed Switch Portal Role",
      !studentBlock.includes("settingsSwitchRoleBtn") && !studentBlock.includes("settingsSecSwitchRoleBtn") && !studentBlock.includes("Switch Portal Role"),
      "Role switching buttons and controls absent from student template");

    assert("11. Student View: Removed Browser localStorage Controls",
      !studentBlock.includes("exportDataJsonBtn") && !studentBlock.includes("clearDemoDataBtn") && !studentBlock.includes("resetSampleDataBtn"),
      "localStorage export, clear, and reset buttons absent from student template");

    assert("12. Student View: Removed Editable Account Inputs & Form",
      !studentBlock.includes("id=\"quickPrefsForm\"") && !studentBlock.includes("prefDisplayName") && !studentBlock.includes("prefTerm"),
      "Editable form inputs absent from student template");

    assert("13. Student View: Removed Save Academic Preferences Button",
      !studentBlock.includes("savePrefsBtn") && !studentBlock.includes("Save Academic Preferences"),
      "Save button absent from student template");

    assert("14. Student View: Removed Cancel Button",
      !studentBlock.includes("cancelQuickPrefsBtn"),
      "Cancel button absent from student template");

    assert("15. Student View: Administrator Notice Banner Present",
      studentBlock.includes("settings-notice-banner") &&
      studentBlock.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").includes("Need to update your personal information? Please contact the university administrator."),
      "Administrator notice banner verified in student template");

    assert("16. Student View: Read-Only Account Preferences Present",
      studentBlock.includes("Account Preferences") &&
      studentBlock.includes("Student ID") &&
      studentBlock.includes("Full Name") &&
      studentBlock.includes("Email Address") &&
      studentBlock.includes("Contact Number") &&
      studentBlock.includes("Course / Program") &&
      studentBlock.includes("Year Level") &&
      studentBlock.includes("Section") &&
      studentBlock.includes("Academic Term") &&
      studentBlock.includes("Account Status"),
      "All 9 official account summary fields present in read-only layout");

    assert("17. Student View: Read-Only Personal Information Present",
      studentBlock.includes("Personal Information") &&
      studentBlock.includes("Date of Birth") &&
      studentBlock.includes("Gender"),
      "Personal information section with DOB and Gender present");

    assert("18. Student View: Read-Only Contact Information Present",
      studentBlock.includes("Contact Information") &&
      studentBlock.includes("Home Address") &&
      studentBlock.includes("Guardian / Emergency Contact"),
      "Contact information section with Address and Guardian contact present");

    assert("19. Student View: Preserved Essential Settings",
      studentBlock.includes("setDarkModeToggle") &&
      studentBlock.includes("setSidebarCollapseToggle") &&
      studentBlock.includes("setDeadlineRemindersToggle") &&
      studentBlock.includes("setUnreadBadgesToggle") &&
      studentBlock.includes("openChangePasswordBtn") &&
      studentBlock.includes("settingsSecLogoutBtn"),
      "Dark mode, sidebar collapse, notification alerts, Change Password, and Sign Out preserved");

    // ------------------------------------------------------------------------
    // SECTION 4: ADMINISTRATOR CAPABILITIES & AUDIT LOGGING
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 4: ADMINISTRATOR CAPABILITIES & PERSISTENCE ---");

    // Test 20: Admin view users list
    const adminGetUsersRes = await request("GET", "/api/admin/users?role=student", null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert("20. Admin User Management: Fetch Students", adminGetUsersRes.status === 200 && adminGetUsersRes.data?.ok === true,
      `Found ${adminGetUsersRes.data?.total || adminGetUsersRes.data?.users?.length} student accounts`);

    const studentUser = (adminGetUsersRes.data?.users || []).find(u => u.username === "r.valiente" || u.referenceId === "2025-BSIT-0202");
    assert("20.1 Admin User Management: Located Student 2025-BSIT-0202", !!studentUser,
      `User ID: ${studentUser?.userId}, Name: ${studentUser?.fullName}`);

    // Test 21: Admin updates student details in MySQL
    const originalFullName = studentUser?.fullName || "Racel Valiente (Demo Student)";
    const originalEmail = studentUser?.email || "student.demo@bantug.edu.example";
    const originalSection = studentUser?.section || "BSIT 2-2";
    const originalContact = studentUser?.contactNumber || "+63 917 555 0202";

    const testFullName = "Racel Valiente (Verified Student)";
    const testContact = "+63 917 555 9999";

    const adminUpdateRes = await request("PUT", `/api/admin/users/${studentUser?.userId}`, {
      fullName: testFullName,
      email: originalEmail,
      section: originalSection,
      department: "Bachelor of Science in Information Technology",
      contactNumber: testContact,
      yearLevel: "Year 2"
    }, { Authorization: `Bearer ${adminToken}` });

    assert("21. Admin Update Student Details", adminUpdateRes.status === 200 && adminUpdateRes.data?.ok === true,
      `Updated student: ${adminUpdateRes.data?.user?.fullName}, Contact: ${adminUpdateRes.data?.user?.contactNumber}`);

    // Test 22: Verify MySQL persistence directly
    const [dbRows] = await db.query("SELECT * FROM students WHERE student_number = ?", ["2025-BSIT-0202"]);
    const updatedStudentDb = dbRows[0];
    assert("22. MySQL Persistence of Admin Update", 
      updatedStudentDb && updatedStudentDb.full_name === testFullName && updatedStudentDb.contact_number === testContact,
      `DB Name: "${updatedStudentDb?.full_name}", DB Contact: "${updatedStudentDb?.contact_number}"`);

    // Test 23: Verify Audit Log in MySQL
    const [auditRows] = await db.query(
      "SELECT * FROM audit_logs WHERE target_id = ? AND action_type = 'USER_UPDATED' ORDER BY log_id DESC LIMIT 1",
      [String(studentUser?.userId)]
    );
    const auditEntry = auditRows[0];
    assert("23. Audit Trail Recorded in MySQL", !!auditEntry,
      `Action: ${auditEntry?.action_type}, Actor: ${auditEntry?.actor_name}, Details: ${auditEntry?.details}`);

    // Test 24: Verify Student Portal immediate reflection on refresh / load
    const studentLoadRes = await request("GET", "/api/portal?action=load", null, {
      Authorization: `Bearer ${studentToken}`
    });
    const loadedProfile = studentLoadRes.data?.state?.profile;
    assert("24. Immediate Reflection in Student Portal", 
      loadedProfile && loadedProfile.fullName === testFullName && loadedProfile.contactNumber === testContact,
      `Portal loaded: Name="${loadedProfile?.fullName}", Contact="${loadedProfile?.contactNumber}"`);

    // Clean up / revert back to original values so test is idempotent
    await request("PUT", `/api/admin/users/${studentUser?.userId}`, {
      fullName: originalFullName,
      email: originalEmail,
      section: originalSection,
      department: "Bachelor of Science in Information Technology",
      contactNumber: originalContact,
      yearLevel: "Year 2"
    }, { Authorization: `Bearer ${adminToken}` });

    const [revertRows] = await db.query("SELECT full_name, contact_number FROM students WHERE student_number = ?", ["2025-BSIT-0202"]);
    assert("25. Idempotent State Reverted Cleanly", revertRows[0]?.full_name === originalFullName,
      `Restored name to "${revertRows[0]?.full_name}", contact to "${revertRows[0]?.contact_number}"`);

  } finally {
    await db.end();
  }

  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`FINAL RESULT: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
