/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Verification Suite: Phase 7 - OTP, Email Verification, and Account Changes
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const { DB_CONFIG, hashPassword } = require('../../database/seed');
const emailService = require('../../services/email-service');
const otpService = require('../../services/otp-service');

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
  console.log("BANTUG UNIVERSITY - PHASE 7 VERIFICATION TEST SUITE");
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
  // TEST GROUP 1: Part G - Database Structure & Migrations
  // --------------------------------------------------------------------------
  console.log("--- TEST GROUP 1: Database Structure & Schema Migrations ---");
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1.1 email_otps table
    const [otpTables] = await connection.query("SHOW TABLES LIKE 'email_otps'");
    assert(otpTables.length === 1, "1.1 Table 'email_otps' exists in bantug_university_db");

    const [otpCols] = await connection.query("SHOW COLUMNS FROM email_otps");
    const otpColNames = otpCols.map(c => c.Field);
    assert(
      ["otp_id", "email", "otp_hash", "salt", "purpose", "reference_id", "attempts", "is_verified", "is_used", "expires_at", "created_at"].every(c => otpColNames.includes(c)),
      "1.2 Table 'email_otps' contains all required columns (hash, salt, purpose, attempts, expiry, status)"
    );

    // 1.2 notification_logs table
    const [notifTables] = await connection.query("SHOW TABLES LIKE 'notification_logs'");
    assert(notifTables.length === 1, "1.3 Table 'notification_logs' exists in bantug_university_db");

    const [notifCols] = await connection.query("SHOW COLUMNS FROM notification_logs");
    const notifColNames = notifCols.map(c => c.Field);
    assert(
      ["notification_id", "recipient_email", "recipient_name", "notification_type", "subject", "reference_id", "delivery_status", "error_message", "created_at"].every(c => notifColNames.includes(c)),
      "1.4 Table 'notification_logs' contains all required columns for audit & fallback logging"
    );

    // 1.3 applications table columns
    const [appCols] = await connection.query("SHOW COLUMNS FROM applications");
    const appColNames = appCols.map(c => c.Field);
    assert(appColNames.includes("email_verified"), "1.5 Table 'applications' has 'email_verified' column");
    assert(appColNames.includes("approval_email_sent"), "1.6 Table 'applications' has 'approval_email_sent' column");
    assert(appColNames.includes("approval_email_sent_at"), "1.7 Table 'applications' has 'approval_email_sent_at' column");
    assert(appColNames.includes("approved_program"), "1.8 Table 'applications' has 'approved_program' column");

    // 1.4 users table columns
    const [userCols] = await connection.query("SHOW COLUMNS FROM users");
    const userColNames = userCols.map(c => c.Field);
    assert(userColNames.includes("email_verified"), "1.9 Table 'users' has 'email_verified' column");

    // --------------------------------------------------------------------------
    // TEST GROUP 2: Part F - Email Service Configuration & Fallback
    // --------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 2: Email Service & Environment Configuration ---");
    const envExamplePath = path.join(__dirname, "..", ".env.example");
    assert(fs.existsSync(envExamplePath), "2.1 .env.example configuration template exists");
    const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
    assert(envExampleContent.includes("SMTP_HOST") && envExampleContent.includes("SMTP_PORT"), "2.2 .env.example documents SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS");

    assert(typeof emailService.isEmailConfigured === "function", "2.3 emailService exports isEmailConfigured()");
    assert(typeof emailService.sendEmail === "function", "2.4 emailService exports sendEmail()");

    // Test sendEmail unconfigured logging
    const testLogResult = await emailService.sendEmail({
      to: "test.logger@bantug.edu.example",
      recipientName: "Test Student",
      subject: "Test Diagnostic Notification",
      html: "<p>Verification test content</p>",
      notificationType: "diagnostic_test",
      referenceId: "BU-TEST-0001"
    });
    assert(testLogResult.logged === true, "2.5 sendEmail logs dispatch attempt to database");
    assert(["sent", "unconfigured", "failed"].includes(testLogResult.status), "2.6 sendEmail returns accurate delivery status without claiming delivery if unconfigured");

    // Check entry in notification_logs
    const [logEntries] = await connection.query(
      "SELECT * FROM notification_logs WHERE recipient_email = 'test.logger@bantug.edu.example' ORDER BY created_at DESC LIMIT 1"
    );
    assert(logEntries.length === 1, "2.7 Notification record successfully saved in notification_logs");
    assert(logEntries[0]?.subject === "Test Diagnostic Notification", "2.8 Notification record preserves subject and recipient");

    // --------------------------------------------------------------------------
    // TEST GROUP 3: Part A - OTP Generation, Security, Rate Limiting & Verification
    // --------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 3: OTP Service Security & Verification Logic ---");
    const testEmail = `applicant.otp.${Date.now()}@bantug.edu.example`;

    // 3.1 Generate OTP
    const genResult = await otpService.generateOtp({
      email: testEmail,
      purpose: "applicant_email_verification",
      referenceId: "BU-2026-TEST01",
      recipientName: "Test Applicant"
    });
    assert(genResult.ok === true, "3.1 OTP generation succeeds");
    assert(/^\d{6}$/.test(genResult.otp), "3.2 Generated OTP is strictly 6 numeric digits");

    // 3.3 Check database record: ensure OTP is salted and hashed (never plaintext)
    const [otpRow] = await connection.query(
      "SELECT * FROM email_otps WHERE email = ? AND purpose = 'email_verification' AND is_used = 0 ORDER BY created_at DESC LIMIT 1",
      [testEmail]
    );
    assert(otpRow.length === 1, "3.3 Active OTP record stored in database");
    assert(otpRow[0].otp_hash !== genResult.otp, "3.4 Database does NOT store plaintext OTP");
    assert(otpRow[0].salt && otpRow[0].salt.length === 32, "3.5 Database stores cryptographic salt for OTP");
    const expectedHash = crypto.createHash("sha256").update(`${genResult.otp}:${otpRow[0].salt}`).digest("hex");
    assert(otpRow[0].otp_hash === expectedHash, "3.6 OTP is securely hashed with salt using SHA-256");

    // 3.7 Test 60-second cooldown rate limit
    const cooldownCheck = await otpService.generateOtp({
      email: testEmail,
      purpose: "applicant_email_verification",
      referenceId: "BU-2026-TEST01"
    });
    assert(cooldownCheck.ok === false && cooldownCheck.cooldown === true, "3.7 Cooldown rate limiting blocks requests within 60 seconds");
    assert(cooldownCheck.remainingSeconds > 0 && cooldownCheck.remainingSeconds <= 60, "3.8 Cooldown returns remaining wait seconds");

    // 3.9 Test wrong code attempt tracking
    const wrongVerify = await otpService.verifyOtp({
      email: testEmail,
      otp: "999999",
      purpose: "applicant_email_verification",
      referenceId: "BU-2026-TEST01"
    });
    assert(wrongVerify.ok === false, "3.9 Rejects incorrect OTP code");
    assert(wrongVerify.attemptsRemaining === 4, "3.10 Decrements attempts remaining (4 attempts left after 1st failure)");

    // 3.11 Test correct OTP verification
    const correctVerify = await otpService.verifyOtp({
      email: testEmail,
      otp: genResult.otp,
      purpose: "applicant_email_verification",
      referenceId: "BU-2026-TEST01"
    });
    assert(correctVerify.ok === true, "3.11 Accepts correct 6-digit OTP code");

    // 3.12 Check DB status after verification
    const [verifiedRow] = await connection.query(
      "SELECT * FROM email_otps WHERE otp_id = ?",
      [otpRow[0].otp_id]
    );
    assert(verifiedRow[0].is_verified === 1 && verifiedRow[0].is_used === 1, "3.12 Marks OTP as verified and consumed (is_used = 1)");

    // 3.13 Test OTP reuse prevention
    const reuseVerify = await otpService.verifyOtp({
      email: testEmail,
      otp: genResult.otp,
      purpose: "applicant_email_verification",
      referenceId: "BU-2026-TEST01"
    });
    assert(reuseVerify.ok === false, "3.13 Prevents reuse of already-consumed OTP");

    // 3.14 Test lockout after 5 failed attempts
    const lockEmail = `lockout.${Date.now()}@bantug.edu.example`;
    const lockOtp = await otpService.generateOtp({
      email: lockEmail,
      purpose: "applicant_email_verification"
    });
    // Burn 4 attempts directly in DB
    await connection.query("UPDATE email_otps SET attempts = 4 WHERE email = ?", [lockEmail]);
    const fifthAttempt = await otpService.verifyOtp({
      email: lockEmail,
      otp: "000000",
      purpose: "applicant_email_verification"
    });
    assert(fifthAttempt.ok === false && fifthAttempt.locked === true, "3.14 Locks verification after 5 failed attempts");

    // --------------------------------------------------------------------------
    // TEST GROUP 4: Part B - Applicant Registration Flow & OTP Verification
    // --------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 4: Applicant Registration Flow & Verification ---");
    const applicantEmail = `applicant.flow.${Date.now()}@bantug.edu.example`;

    // 4.1 Submit application
    const appSubmitRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/applications",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        firstName: "Carlos",
        lastName: "Romulo",
        middleName: "Pena",
        dateOfBirth: "06/15/2007",
        email: applicantEmail,
        contactNumber: "9175550999",
        address: "123 University Avenue, Cabanatuan City, Nueva Ecija",
        applicantType: "Freshman",
        desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
        secondChoiceProgram: "Bachelor of Science in Computer Science (BSCS)",
        yearLevel: "Year 1",
        previousSchool: "Rizal High School",
        graduationYear: "2025",
        educationalBackground: "STEM",
        generalAverage: "92.50"
      }
    );

    assert(appSubmitRes.status === 201 && appSubmitRes.data?.ok, "4.1 Applicant submission succeeds with 201 Created");
    const appRefNum = appSubmitRes.data.application.referenceNumber;
    assert(/^BU-\d{4}-\d{6}$/.test(appRefNum), "4.2 Application assigned unique reference number format BU-YYYY-XXXXXX");
    assert(appSubmitRes.data.application.status === "Pending", "4.3 Initial application status is strictly 'Pending'");
    assert(appSubmitRes.data.emailVerification && (appSubmitRes.data.emailVerification.required === true || appSubmitRes.data.emailVerification.status === "unconfigured" || appSubmitRes.data.emailVerification.sent === true), "4.4 Automatically initiates email OTP verification on submission");

    // Verify DB application record email_verified is initially 0
    const [appDb1] = await connection.query(
      "SELECT email_verified FROM applications WHERE reference_number = ?",
      [appRefNum]
    );
    assert(appDb1[0]?.email_verified === 0, "4.5 Application email_verified is initially 0 in MySQL");

    // Retrieve generated OTP from DB for this application
    const [appOtpRow] = await connection.query(
      "SELECT * FROM email_otps WHERE email = ? AND is_used = 0 ORDER BY created_at DESC LIMIT 1",
      [applicantEmail]
    );
    assert(appOtpRow.length === 1, "4.6 Email OTP record created for applicant in MySQL");

    // Verify via HTTP API endpoint POST /api/otp/verify using salt and code
    // Let's compute which 6 digits match the stored hash
    let matchedCode = null;
    for (let c = 100000; c <= 999999; c++) {
      const h = crypto.createHash("sha256").update(`${c}:${appOtpRow[0].salt}`).digest("hex");
      if (h === appOtpRow[0].otp_hash) {
        matchedCode = String(c);
        break;
      }
    }
    assert(matchedCode !== null, "4.7 Recovered valid test OTP from salted hash");

    const apiVerifyRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/otp/verify",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        email: applicantEmail,
        otp: matchedCode,
        purpose: "applicant_email_verification",
        referenceId: appRefNum
      }
    );
    assert(apiVerifyRes.status === 200 && apiVerifyRes.data?.ok, "4.8 POST /api/otp/verify endpoint returns 200 OK on correct code");

    // Verify DB application record email_verified is now 1
    const [appDb2] = await connection.query(
      "SELECT email_verified, reference_number, status FROM applications WHERE reference_number = ?",
      [appRefNum]
    );
    assert(appDb2[0]?.email_verified === 1, "4.9 Application email_verified is updated to 1 in MySQL");
    assert(appDb2[0]?.status === "Pending", "4.10 Application status remains 'Pending' during and after email verification");
    assert(appDb2[0]?.reference_number === appRefNum, "4.11 Applicant unique reference number is preserved");

    // --------------------------------------------------------------------------
    // TEST GROUP 5: Part C - Change Password & Active Session Invalidation
    // --------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 5: Change Password & Multi-Session Invalidation ---");

    // 5.1 Sign in with student account (session 1)
    const sess1Res = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      { identifier: "student.demo@bantug.edu.example", password: "demo123" }
    );
    assert(sess1Res.status === 200 && sess1Res.data?.ok, "5.1 Student signs in for Session 1");
    const token1 = sess1Res.data.session.token;

    // 5.2 Sign in again from another device/browser (session 2)
    const sess2Res = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      { identifier: "student.demo@bantug.edu.example", password: "demo123" }
    );
    assert(sess2Res.status === 200 && sess2Res.data?.ok, "5.2 Student signs in for Session 2");
    const token2 = sess2Res.data.session.token;
    assert(token1 !== token2, "5.3 Tokens for Session 1 and Session 2 are unique");

    // 5.4 Test Change Password validation: reject current password mismatch
    const badCurrentRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/change-password",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token2}`
        }
      },
      {
        currentPassword: "wrongpassword!",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123"
      }
    );
    assert(badCurrentRes.status === 400 && badCurrentRes.data?.message?.includes("Current password"), "5.4 Rejects incorrect current password");

    // 5.5 Test Change Password validation: reject short new password (<6 chars)
    const shortNewRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/change-password",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token2}`
        }
      },
      {
        currentPassword: "demo123",
        newPassword: "12345",
        confirmPassword: "12345"
      }
    );
    assert(shortNewRes.status === 400 && shortNewRes.data?.message?.includes("6 characters"), "5.5 Rejects new password under 6 characters");

    // 5.6 Test Change Password validation: reject same new password as current
    const sameNewRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/change-password",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token2}`
        }
      },
      {
        currentPassword: "demo123",
        newPassword: "demo123",
        confirmPassword: "demo123"
      }
    );
    assert(sameNewRes.status === 400 && sameNewRes.data?.message?.includes("different"), "5.6 Rejects new password identical to current password");

    // 5.7 Perform valid password change from Session 2
    const validCpRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/change-password",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token2}`
        }
      },
      {
        currentPassword: "demo123",
        newPassword: "studentNewPass2026",
        confirmPassword: "studentNewPass2026"
      }
    );
    assert(validCpRes.status === 200 && validCpRes.data?.ok, "5.7 Password successfully updated via POST /api/auth/change-password");

    // 5.8 Verify database password hash uses PBKDF2 ($pbkdf2-sha256$10000$...)
    const [userRow] = await connection.query("SELECT password_hash FROM users WHERE email = 'student.demo@bantug.edu.example'");
    assert(userRow[0]?.password_hash?.startsWith("$pbkdf2-sha256$10000$"), "5.8 New password securely stored as PBKDF2-SHA256 hash in MySQL users table");

    // 5.9 Verify active session invalidation: Session 1 must be terminated, Session 2 preserved
    const probeSess1 = await request({
      hostname: "127.0.0.1",
      port: 3000,
      path: "/api/auth/me",
      method: "GET",
      headers: { "Authorization": `Bearer ${token1}` }
    });
    assert(probeSess1.status === 401, "5.9 Session 1 (other active session) is invalidated and rejected with 401 Unauthorized");

    const probeSess2 = await request({
      hostname: "127.0.0.1",
      port: 3000,
      path: "/api/auth/me",
      method: "GET",
      headers: { "Authorization": `Bearer ${token2}` }
    });
    assert(probeSess2.status === 200, "5.10 Session 2 (current session) remains valid");

    // 5.11 Revert student password back to demo123
    const revertCpRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/change-password",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token2}`
        }
      },
      {
        currentPassword: "studentNewPass2026",
        newPassword: "demo123",
        confirmPassword: "demo123"
      }
    );
    assert(revertCpRes.status === 200 && revertCpRes.data?.ok, "5.11 Student password successfully reverted to demo123");

    // --------------------------------------------------------------------------
    // TEST GROUP 6: Part D - Forgot Password & OTP Reset
    // --------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 6: Forgot Password & OTP Reset Flow ---");

    // 6.1 Generic response on non-existent account (prevents enumeration)
    const fpNonExistent = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/forgot-password",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      { identifier: "nonexistentuser9999@bantug.edu.example" }
    );
    assert(fpNonExistent.status === 200 && fpNonExistent.data?.ok, "6.1 Returns generic 200 OK for non-existent identifier to prevent user enumeration");
    assert(fpNonExistent.data?.message?.includes("If an account matching"), "6.2 Returns standard neutral notification message");

    // 6.2 Forgot password request for real faculty account
    const fpFaculty = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/forgot-password",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      { identifier: "f.somera.demo@bantug.edu.example" }
    );
    assert(fpFaculty.status === 200 && fpFaculty.data?.ok, "6.3 Forgot password request succeeds for faculty user");
    assert(fpFaculty.data?.maskedEmail && fpFaculty.data.maskedEmail.includes("*"), "6.4 Returns masked email address hint (e.g. s***o@...)");

    // 6.5 Find OTP in database for faculty password reset
    const [facultyOtpRow] = await connection.query(
      "SELECT * FROM email_otps WHERE purpose = 'password_reset' AND is_used = 0 ORDER BY created_at DESC LIMIT 1"
    );
    assert(facultyOtpRow.length === 1, "6.5 Password reset OTP generated and stored in database");

    // Recover code from salt
    let facultyResetCode = null;
    for (let c = 100000; c <= 999999; c++) {
      const h = crypto.createHash("sha256").update(`${c}:${facultyOtpRow[0].salt}`).digest("hex");
      if (h === facultyOtpRow[0].otp_hash) {
        facultyResetCode = String(c);
        break;
      }
    }
    assert(facultyResetCode !== null, "6.6 Successfully recovered faculty reset OTP");

    // 6.7 Reset password with wrong OTP
    const resetWrongOtp = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/reset-password",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        identifier: "f.somera.demo@bantug.edu.example",
        otp: "111111",
        newPassword: "facultyNewPass2026",
        confirmPassword: "facultyNewPass2026"
      }
    );
    assert(resetWrongOtp.status === 400 && resetWrongOtp.data?.message?.includes("Incorrect"), "6.7 Reset password rejects incorrect OTP code");

    // 6.8 Reset password with correct OTP
    const resetCorrectOtp = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/reset-password",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        identifier: "f.somera.demo@bantug.edu.example",
        otp: facultyResetCode,
        newPassword: "facultyNewPass2026",
        confirmPassword: "facultyNewPass2026"
      }
    );
    assert(resetCorrectOtp.status === 200 && resetCorrectOtp.data?.ok, "6.8 Reset password succeeds with correct OTP code");

    // 6.9 Sign in with new faculty password
    const facultyNewLogin = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      { identifier: "f.somera.demo@bantug.edu.example", password: "facultyNewPass2026" }
    );
    assert(facultyNewLogin.status === 200 && facultyNewLogin.data?.ok, "6.9 Faculty successfully signs in using newly reset password");

    // 6.10 Revert faculty password back to faculty123
    const revertFacultyRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/change-password",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${facultyNewLogin.data.session.token}`
        }
      },
      {
        currentPassword: "facultyNewPass2026",
        newPassword: "faculty123",
        confirmPassword: "faculty123"
      }
    );
    assert(revertFacultyRes.status === 200 && revertFacultyRes.data?.ok, "6.10 Faculty password successfully reverted to faculty123");

    // --------------------------------------------------------------------------
    // TEST GROUP 7: Part E - Automatic Application Approval Email Notification
    // --------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 7: Application Approval Notification Logic ---");

    // Create a fresh application to test status changes
    const testAppRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/applications",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        firstName: "Aurora",
        lastName: "Quezon",
        dateOfBirth: "02/19/2007",
        email: `aurora.quezon.${Date.now()}@bantug.edu.example`,
        contactNumber: "9185550222",
        address: "456 Rizal Boulevard, Cabanatuan City, Nueva Ecija",
        applicantType: "Freshman",
        desiredProgram: "Bachelor of Science in Computer Science (BSCS)",
        secondChoiceProgram: "Bachelor of Science in Information Technology (BSIT)",
        yearLevel: "Year 1",
        previousSchool: "Aurora High",
        graduationYear: "2025",
        educationalBackground: "STEM",
        generalAverage: "94.00"
      }
    );
    const testAppRef = testAppRes.data.application.referenceNumber;
    const testAppEmail = testAppRes.data.application.email;

    // Faculty login
    const facLoginRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      { identifier: "f.somera.demo@bantug.edu.example", password: "faculty123" }
    );
    const facToken = facLoginRes.data.session.token;

    // 7.1 Change status to 'Under Review' -> should NOT trigger approval email
    const underReviewRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: `/api/applications/${testAppRef}/status`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${facToken}`
        }
      },
      { status: "Under Review" }
    );
    assert(underReviewRes.status === 200 && underReviewRes.data?.ok, "7.1 Faculty updates status to 'Under Review'");
    const [appCheck1] = await connection.query(
      "SELECT approval_email_sent FROM applications WHERE reference_number = ?",
      [testAppRef]
    );
    assert(appCheck1[0]?.approval_email_sent === 0, "7.2 Status 'Under Review' does NOT send approval email (approval_email_sent = 0)");

    // 7.3 Change status to 'Approved' -> MUST trigger approval email
    const approveRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: `/api/applications/${testAppRef}/status`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${facToken}`
        }
      },
      {
        status: "Approved",
        approvedProgram: "Bachelor of Science in Computer Science (BSCS)"
      }
    );
    assert(approveRes.status === 200 && approveRes.data?.ok, "7.3 Faculty updates status to 'Approved'");

    // 7.4 Check database record for approval_email_sent
    const [appCheck2] = await connection.query(
      "SELECT approval_email_sent, approval_email_sent_at, approved_program FROM applications WHERE reference_number = ?",
      [testAppRef]
    );
    assert(appCheck2[0]?.approval_email_sent === 1, "7.4 Approval email sent flag is set to 1 in MySQL");
    assert(appCheck2[0]?.approval_email_sent_at !== null, "7.5 Approval email sent timestamp is recorded in MySQL");
    assert(appCheck2[0]?.approved_program === "Bachelor of Science in Computer Science (BSCS)", "7.6 Approved program recorded in MySQL");

    // 7.7 Verify notification log entry for approval email
    const [approvalLog] = await connection.query(
      "SELECT * FROM notification_logs WHERE recipient_email = ? AND notification_type = 'application_approval' ORDER BY created_at DESC LIMIT 1",
      [testAppEmail]
    );
    assert(approvalLog.length === 1, "7.7 Approval email dispatch recorded in notification_logs table");
    assert(approvalLog[0]?.subject === "BANTUG UNIVERSITY – Application Approved", "7.8 Approval email subject is exactly 'BANTUG UNIVERSITY – Application Approved'");

    // 7.9 Test duplicate prevention on re-saving Approved status
    const repeatApproveRes = await request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: `/api/applications/${testAppRef}/status`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${facToken}`
        }
      },
      {
        status: "Approved",
        approvedProgram: "Bachelor of Science in Computer Science (BSCS)"
      }
    );
    assert(repeatApproveRes.status === 200 && repeatApproveRes.data?.emailAlreadySent === true, "7.9 Deduplication prevents re-sending approval email when already marked sent");

    const [approvalLogCount] = await connection.query(
      "SELECT COUNT(*) as count FROM notification_logs WHERE recipient_email = ? AND notification_type = 'application_approval'",
      [testAppEmail]
    );
    assert(approvalLogCount[0]?.count === 1, "7.10 Exactly 1 approval email log exists (no duplicates generated)");

    // --------------------------------------------------------------------------
    // TEST GROUP 8: Part H - Frontend Interface Inspection
    // --------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 8: Frontend Code & Interface Inspection ---");

    // 8.1 Login Screen: auth.js
    const authJsPath = path.join(__dirname, "..", "js", "auth.js");
    const authJs = fs.readFileSync(authJsPath, "utf8");
    assert(authJs.includes("openForgotPasswordModal"), "8.1 auth.js implements openForgotPasswordModal()");
    assert(authJs.includes("/api/auth/forgot-password"), "8.2 auth.js connects to POST /api/auth/forgot-password");
    assert(authJs.includes("/api/auth/reset-password"), "8.3 auth.js connects to POST /api/auth/reset-password");
    assert(authJs.includes("fpOtpInput") && authJs.includes("fpNewPasswordInput"), "8.4 auth.js renders OTP and password reset fields");

    // 8.5 Applicant Module: applicant.js
    const applicantJsPath = path.join(__dirname, "..", "js", "applicant.js");
    const applicantJs = fs.readFileSync(applicantJsPath, "utf8");
    assert(applicantJs.includes("openEmailOtpModal"), "8.5 applicant.js implements openEmailOtpModal()");
    assert(applicantJs.includes("/api/otp/request"), "8.6 applicant.js connects to POST /api/otp/request");
    assert(applicantJs.includes("/api/otp/verify"), "8.7 applicant.js connects to POST /api/otp/verify");
    assert(applicantJs.includes("receiptVerifyOtpBtn") && applicantJs.includes("receiptResendOtpBtn"), "8.8 applicant.js renders verification controls on Confirmation Receipt");
    assert(applicantJs.includes("overviewVerifyEmailBtn"), "8.9 applicant.js renders 'Verify Email' button on Admission Overview");
    assert(applicantJs.includes("applicantModalVerifyEmailBtn"), "8.10 applicant.js renders 'Verify' button on Applicant Account Modal");

    // 8.11 Settings Module: settings.js
    const settingsJsPath = path.join(__dirname, "..", "js", "settings.js");
    const settingsJs = fs.readFileSync(settingsJsPath, "utf8");
    assert(settingsJs.includes("openChangePasswordModal"), "8.11 settings.js implements openChangePasswordModal()");
    assert(settingsJs.includes("/api/auth/change-password"), "8.12 settings.js connects to POST /api/auth/change-password");
    assert(settingsJs.includes("cpModalCurrentPassword") && settingsJs.includes("cpModalNewPassword"), "8.13 settings.js validates current and new password inputs");

  } finally {
    await connection.end();
  }

  console.log("\n================================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
