// Automated verification test for faculty read-only profile access.
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
  console.log("       BANTUG UNIVERSITY PHASE 5 - FACULTY PROFILE & SETTINGS VERIFICATION       ");
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

  // MySQL Connection
  const dbConfig = {
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "bantug_university_db"
  };
  const pool = await mysql.createPool(dbConfig);

  try {
    // -------------------------------------------------------------------------
    // 1. Authenticate as Faculty (f.somera)
    // -------------------------------------------------------------------------
    console.log("--- 1. Faculty Authentication & Session Data ---");
    const loginRes = await request("POST", "/api/auth/login", {}, {
      identifier: "f.somera",
      password: "faculty123",
      role: "faculty"
    });

    assert("Faculty login returns 200 OK", loginRes.statusCode === 200, `Got ${loginRes.statusCode}`);
    const token = loginRes.data?.session?.token;
    assert("Faculty login returns valid session token", Boolean(token));
    const userRole = loginRes.data?.session?.role;
    assert("Faculty role is 'faculty'", userRole === "faculty", `Role: ${userRole}`);

    const facultyProfile = loginRes.data?.session?.facultyProfile;
    assert("Session includes authoritative facultyProfile", Boolean(facultyProfile), `Faculty profile: ${Boolean(facultyProfile)}`);
    assert("Faculty ID is FAC-BU-04", facultyProfile?.facultyId === "FAC-BU-04", `Faculty ID: ${facultyProfile?.facultyId}`);
    assert("Faculty Name is correct", facultyProfile?.fullName?.includes("Somera"), `Name: ${facultyProfile?.fullName}`);

    const authHeaders = {
      Authorization: `Bearer ${token}`
    };

    // -------------------------------------------------------------------------
    // 2. Read-Only Faculty Profile API (/api/faculty/profile)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Dedicated Faculty Profile Endpoint (GET /api/faculty/profile) ---");
    const profRes = await request("GET", "/api/faculty/profile", authHeaders);
    assert("GET /api/faculty/profile returns 200 OK", profRes.statusCode === 200, `Got ${profRes.statusCode}`);
    assert("Profile returns faculty ID FAC-BU-04", profRes.data?.profile?.facultyId === "FAC-BU-04");
    assert("Profile returns full name", Boolean(profRes.data?.profile?.fullName));
    assert("Profile returns email address", Boolean(profRes.data?.profile?.email));
    assert("Profile returns department", Boolean(profRes.data?.profile?.department));
    assert("Profile returns designation", profRes.data?.profile?.designation !== undefined);
    assert("Profile returns office location", profRes.data?.profile?.officeLocation !== undefined);
    assert("Profile returns birth date field", profRes.data?.profile?.birthDate !== undefined);
    assert("Profile returns home address field", profRes.data?.profile?.homeAddress !== undefined);
    assert("Profile returns assigned schedule sessions array", Array.isArray(profRes.data?.profile?.assignedClasses));

    // Cross-Faculty Access Isolation
    console.log("\n--- 3. Cross-Faculty Isolation (RBAC) ---");
    const crossRes = await request("GET", "/api/faculty/profile?facultyId=FAC-BU-01", authHeaders);
    assert("Cross-faculty profile inspection blocked with 403 Forbidden", crossRes.statusCode === 403, `Got ${crossRes.statusCode}`);

    // Direct Profile Modification Rejection
    console.log("\n--- 4. Direct Faculty Profile Edits Rejected (RBAC) ---");
    const editProfRes = await request("POST", "/api/faculty/profile", authHeaders, {
      fullName: "Hacked Faculty Name",
      department: "Compromised Dept"
    });
    assert("POST /api/faculty/profile rejected with 403 Forbidden", editProfRes.statusCode === 403, `Got ${editProfRes.statusCode}`);
    assert("POST /api/faculty/profile returns administrator notice", 
      editProfRes.data?.message?.includes("administrator"), 
      `Message: ${editProfRes.data?.message}`
    );

    const putProfRes = await request("PUT", "/api/faculty/profile", authHeaders, {
      contactNumber: "+63 999 999 9999"
    });
    assert("PUT /api/faculty/profile rejected with 403 Forbidden", putProfRes.statusCode === 403, `Got ${putProfRes.statusCode}`);

    // Direct Account Preferences Rejection
    console.log("\n--- 5. Direct Account Preferences Modification Rejected ---");
    const prefRes1 = await request("POST", "/api/account/preferences", authHeaders, {
      displayName: "Changed Name",
      contactNumber: "+63 912 345 6789"
    });
    assert("POST /api/account/preferences rejected with 403 Forbidden", prefRes1.statusCode === 403, `Got ${prefRes1.statusCode}`);
    assert("Preferences rejection message refers to university administrator", 
      prefRes1.data?.message?.includes("administrator"), 
      `Message: ${prefRes1.data?.message}`
    );

    const prefRes2 = await request("POST", "/api/auth/account-preferences", authHeaders, {
      displayName: "Changed Name"
    });
    assert("POST /api/auth/account-preferences rejected with 403 Forbidden", prefRes2.statusCode === 403, `Got ${prefRes2.statusCode}`);

    // -------------------------------------------------------------------------
    // 6. Faculty Password Change Flow
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Faculty Password Change Allowed ---");
    const changePwRes = await request("POST", "/api/auth/change-password", authHeaders, {
      currentPassword: "faculty123",
      newPassword: "facultyPassword2026!",
      confirmPassword: "facultyPassword2026!"
    });
    assert("POST /api/auth/change-password succeeds with 200 OK", changePwRes.statusCode === 200, `Got ${changePwRes.statusCode}: ${changePwRes.data?.message}`);

    // Revert password back cleanly
    const revertPwRes = await request("POST", "/api/auth/change-password", authHeaders, {
      currentPassword: "facultyPassword2026!",
      newPassword: "faculty123",
      confirmPassword: "faculty123"
    });
    assert("Password reverted cleanly to original", revertPwRes.statusCode === 200);

    // -------------------------------------------------------------------------
    // 7. Administrator Capabilities (View, Update, Audit Log)
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Administrator Management of Faculty Records ---");
    const adminLoginRes = await request("POST", "/api/auth/login", {}, {
      identifier: "admin",
      password: process.env.ADMIN_TEMP_PASSWORD || "admin2026",
      role: "admin"
    });
    assert("Admin login returns 200 OK", adminLoginRes.statusCode === 200);
    const adminToken = adminLoginRes.data?.session?.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Fetch faculty list
    const adminUsersRes = await request("GET", "/api/admin/users?role=faculty", adminHeaders);
    assert("GET /api/admin/users?role=faculty returns 200 OK", adminUsersRes.statusCode === 200);
    const facultyList = adminUsersRes.data?.users || [];
    const targetUser = facultyList.find((f) => f.username === "f.somera");
    assert("Administrator can locate f.somera in users table", Boolean(targetUser), `User: ${JSON.stringify(targetUser)}`);
    assert("Faculty record in admin view contains designation and contactNumber", 
      targetUser?.designation !== undefined && targetUser?.contactNumber !== undefined,
      `Designation: ${targetUser?.designation}, Contact: ${targetUser?.contactNumber}`
    );

    // Admin updates faculty record
    const originalDesignation = targetUser?.designation || "Assistant Professor III";
    const originalContact = targetUser?.contactNumber || "+63 917 555 0144";
    const originalOffice = targetUser?.officeLocation || "IT Department Office, Rm 302";

    const updatePayload = {
      fullName: "Fernando Somera",
      email: "f.somera.demo@bantug.edu.example",
      department: "College of Computer Studies",
      section: "BSIT 2-1",
      designation: "Associate Professor I",
      contactNumber: "+63 917 555 9999",
      officeLocation: "CS Faculty Lounge, Rm 405",
      birthDate: "1982-08-15",
      homeAddress: "88 Academic Lane, Bantug City"
    };

    const updateRes = await request("PUT", `/api/admin/users/${targetUser.userId}`, adminHeaders, updatePayload);
    assert("Admin PUT /api/admin/users/:id returns 200 OK", updateRes.statusCode === 200, `Got ${updateRes.statusCode}: ${updateRes.data?.message}`);

    // Verify MySQL persistence
    const [dbRows] = await pool.query("SELECT * FROM `faculty` WHERE `username` = 'f.somera' LIMIT 1");
    assert("MySQL faculty table updated with new designation", dbRows[0]?.designation === "Associate Professor I", `DB Designation: ${dbRows[0]?.designation}`);
    assert("MySQL faculty table updated with new contact", dbRows[0]?.contact_number === "+63 917 555 9999", `DB Contact: ${dbRows[0]?.contact_number}`);
    assert("MySQL faculty table updated with new office location", dbRows[0]?.office_location === "CS Faculty Lounge, Rm 405", `DB Office: ${dbRows[0]?.office_location}`);
    assert("MySQL faculty table updated with birth date", dbRows[0]?.birth_date === "1982-08-15", `DB Birth Date: ${dbRows[0]?.birth_date}`);
    assert("MySQL faculty table updated with home address", dbRows[0]?.home_address === "88 Academic Lane, Bantug City", `DB Address: ${dbRows[0]?.home_address}`);

    // Verify immediate reflection in faculty profile endpoint
    const updatedProfRes = await request("GET", "/api/faculty/profile", authHeaders);
    assert("Faculty profile immediately reflects updated designation", updatedProfRes.data?.profile?.designation === "Associate Professor I");
    assert("Faculty profile immediately reflects updated contact", updatedProfRes.data?.profile?.contactNumber === "+63 917 555 9999");
    assert("Faculty profile immediately reflects updated office", updatedProfRes.data?.profile?.officeLocation === "CS Faculty Lounge, Rm 405");
    assert("Faculty profile immediately reflects updated birth date", updatedProfRes.data?.profile?.birthDate === "1982-08-15");
    assert("Faculty profile immediately reflects updated home address", updatedProfRes.data?.profile?.homeAddress === "88 Academic Lane, Bantug City");

    // Verify Audit Log entry
    const [auditRows] = await pool.query(
      "SELECT * FROM `audit_logs` WHERE `action_type` = 'USER_UPDATED' AND `target_id` = ? ORDER BY `log_id` DESC LIMIT 1",
      [String(targetUser.userId)]
    );
    assert("Audit log generated for USER_UPDATED", Boolean(auditRows && auditRows.length > 0));
    assert("Audit log actor is admin", auditRows[0]?.actor_role === "admin");

    // Revert faculty record back cleanly
    const revertPayload = {
      fullName: "Fernando Somera",
      email: "f.somera.demo@bantug.edu.example",
      department: "College of Computer Studies",
      section: "BSIT 2-1",
      designation: originalDesignation,
      contactNumber: originalContact,
      officeLocation: originalOffice,
      birthDate: "1982-08-15",
      homeAddress: "88 Academic Lane, Bantug City"
    };
    await request("PUT", `/api/admin/users/${targetUser.userId}`, adminHeaders, revertPayload);
    console.log("Reverted faculty details back to original baseline.");

    // -------------------------------------------------------------------------
    // 8. Frontend Interface & Security Controls Verification
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Frontend Interface & Security Controls Verification ---");
    const facultyJsContent = fs.readFileSync(path.join(__dirname, "..", "js", "faculty.js"), "utf8");
    const settingsJsContent = fs.readFileSync(path.join(__dirname, "..", "js", "settings.js"), "utf8");

    // Faculty Profile DOM:
    assert("Faculty profile renders Administrator Notice Banner", 
      facultyJsContent.includes("Need to update your personal or contact information?") &&
      facultyJsContent.includes("Please contact the university administrator.")
    );
    assert("Faculty profile does NOT contain editable form inputs", 
      !facultyJsContent.includes('<input id="facultyEditName"') && !facultyJsContent.includes('id="saveFacultyProfileBtn"')
    );
    assert("Faculty profile contains Assigned Teaching Load view", 
      facultyJsContent.includes("Assigned Teaching Load")
    );
    assert("Faculty dashboard removed demo role switching select", 
      !facultyJsContent.includes('id="facultyPerspectiveSelect"')
    );

    // Faculty Settings DOM:
    assert("Faculty settings renders Administrator Notice Banner", 
      settingsJsContent.includes("Need to update your personal or contact information?") &&
      settingsJsContent.includes("Please contact the university administrator.")
    );
    assert("Faculty settings removed Logo Configuration", 
      !settingsJsContent.includes('uploadLogoFileInput') && !settingsJsContent.includes('resetDefaultLogoPathBtn')
    );
    assert("Faculty settings removed role switching controls", 
      !settingsJsContent.includes('settingsSwitchRoleBtn') && !settingsJsContent.includes('openRoleSwitcher')
    );
    assert("Faculty settings removed localStorage data actions (export, clear, reset)", 
      !settingsJsContent.includes('exportDataJsonBtn') && !settingsJsContent.includes('clearDemoDataBtn') && !settingsJsContent.includes('resetSampleDataBtn')
    );
    assert("Faculty settings retains Appearance Settings", 
      settingsJsContent.includes("Appearance Preferences") || settingsJsContent.includes("Appearance Settings")
    );
    assert("Faculty settings retains Notification Settings", 
      settingsJsContent.includes("Notification Preferences") || settingsJsContent.includes("Notification Settings")
    );
    assert("Faculty settings retains Account Security & Password Change", 
      settingsJsContent.includes("openChangePasswordModal") && settingsJsContent.includes("Sign Out")
    );

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
    console.error("Test execution failed with exception:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
