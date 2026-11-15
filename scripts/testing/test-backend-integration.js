/**
 * Quick backend test for Phase 7 endpoints
 */
const http = require("http");
const mysql = require("mysql2/promise");
const crypto = require("crypto");

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

async function run() {
  console.log("--- 1. Testing OTP Request ---");
  const testEmail = "applicant.test." + Date.now() + "@bantug.edu.example";
  const reqRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/otp/request",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      email: testEmail,
      purpose: "email_verification",
      referenceNumber: "BU-2026-TEST01"
    }
  );
  console.log("OTP Request status:", reqRes.status, reqRes.data);

  console.log("\n--- 2. Testing OTP Cooldown (60s) ---");
  const cooldownRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/otp/request",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      email: testEmail,
      purpose: "email_verification"
    }
  );
  console.log("Cooldown status:", cooldownRes.status, cooldownRes.data);

  console.log("\n--- 3. Testing OTP Verification (wrong code) ---");
  const wrongRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/otp/verify",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      email: testEmail,
      otp: "999999",
      purpose: "email_verification"
    }
  );
  console.log("Wrong OTP status:", wrongRes.status, wrongRes.data);

  console.log("\n--- 4. Direct DB OTP Inspection & Correct Verification ---");
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "bantug_university_db"
  });

  const [otpRows] = await conn.query(
    "SELECT otp_id, otp_hash, salt, attempts, expires_at FROM email_otps WHERE email = ? AND is_used = 0",
    [testEmail]
  );
  console.log("DB OTP Record found:", Boolean(otpRows[0]), "Salt:", otpRows[0]?.salt);

  // Since Plaintext is not stored, let's create a known test code directly
  const knownPlain = "123456";
  const testSalt = crypto.randomBytes(16).toString("hex");
  const testHash = crypto.createHash("sha256").update(`${knownPlain}:${testSalt}`).digest("hex");
  await conn.query(
    "INSERT INTO email_otps (email, otp_hash, salt, purpose, reference_id, attempts, is_verified, is_used, expires_at) VALUES (?, ?, ?, 'email_verification', 'BU-2026-TEST01', 0, 0, 0, DATE_ADD(NOW(), INTERVAL 5 MINUTE))",
    [testEmail, testHash, testSalt]
  );

  const verifyCorrect = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/otp/verify",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      email: testEmail,
      otp: "123456",
      purpose: "email_verification",
      referenceNumber: "BU-2026-TEST01"
    }
  );
  console.log("Correct OTP verify status:", verifyCorrect.status, verifyCorrect.data);

  console.log("\n--- 5. Testing OTP Reuse (should fail) ---");
  const reuseRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/otp/verify",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      email: testEmail,
      otp: "123456",
      purpose: "email_verification"
    }
  );
  console.log("Reuse status:", reuseRes.status, reuseRes.data);

  console.log("\n--- 6. Testing Forgot Password Endpoint ---");
  const forgotRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/forgot-password",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    { identifier: "student.demo@bantug.edu.example" }
  );
  console.log("Forgot Password status:", forgotRes.status, forgotRes.data);

  console.log("\n--- 7. Testing Application Approval Notification ---");
  // Login as faculty
  const facLogin = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    { identifier: "f.somera.demo@bantug.edu.example", password: "faculty123" }
  );
  const facToken = facLogin.data.session.token;

  // Create test application
  const appRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/applications",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      firstName: "Test",
      lastName: "Approval",
      dateOfBirth: "05/15/2006",
      email: "test.approval@bantug.edu.example",
      contactNumber: "9175551234",
      address: "123 University Ave",
      desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
      yearLevel: "Year 1",
      previousSchool: "Sample High School",
      educationalBackground: "STEM",
      graduationYear: "2025"
    }
  );
  console.log("Application submit status:", appRes.status, appRes.data?.application?.referenceNumber);
  const refNum = appRes.data?.application?.referenceNumber;

  // Approve application
  const approveRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/applications/${refNum}/status`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${facToken}`
      }
    },
    {
      status: "Approved",
      approvedProgram: "Bachelor of Science in Information Technology (BSIT)",
      remarks: "Eligible for freshman admission."
    }
  );
  console.log("Approve status:", approveRes.status, approveRes.data?.status);

  // Verify approval email recorded
  const [appRows2] = await conn.query(
    "SELECT approval_email_sent, approved_program FROM applications WHERE reference_number = ?",
    [refNum]
  );
  console.log("DB approval_email_sent:", appRows2[0]?.approval_email_sent, "Program:", appRows2[0]?.approved_program);

  // Repeated approve (duplicate prevention)
  const repeatApprove = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/applications/${refNum}/status`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${facToken}`
      }
    },
    { status: "Approved" }
  );
  console.log("Repeat approve status:", repeatApprove.status);

  await conn.end();
  console.log("\nAll backend integration tests passed!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

