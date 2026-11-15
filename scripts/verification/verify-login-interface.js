/**
 * ============================================================================
 * BANTUG UNIVERSITY – Student Portal System
 * PHASE 4 VERIFICATION SUITE: Login Page Cleanup & Authentication
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'bantug_university_db'
};

function postJson(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (_) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('===============================================================');
  console.log('  BANTUG UNIVERSITY - PHASE 4 LOGIN PAGE CLEANUP VERIFICATION  ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} -> ${details}`);
      failed++;
    }
  }

  // =========================================================================
  // TEST GROUP 1: HTML & CSS CLEANUP OF LOGIN PAGE (pages/login.html)
  // =========================================================================
  console.log('--- TEST GROUP 1: Clean Up of pages/login.html ---');
  const loginHtmlPath = path.join(__dirname, '..', 'pages', 'login.html');
  const loginHtml = fs.readFileSync(loginHtmlPath, 'utf8');

  // A. Demo information removal
  assert(
    !loginHtml.includes('exploreDemoPortalBtn'),
    '1.1 Instant Evaluator Access button (#exploreDemoPortalBtn) is removed from login page'
  );
  assert(
    !loginHtml.includes('demo-access-card'),
    '1.2 Demo access card (.demo-access-card) is removed from login page'
  );
  assert(
    !loginHtml.includes('login-role-tabs'),
    '1.3 Frontend role selector tabs (.login-role-tabs) are removed from login page'
  );
  assert(
    !loginHtml.includes('demo-credentials-box'),
    '1.4 Demo sample credentials box (.demo-credentials-box) is removed from login page'
  );
  assert(
    !loginHtml.includes('data-fill-role'),
    '1.5 Demo auto-fill buttons ([data-fill-role]) are removed from login page'
  );
  assert(
    !loginHtml.includes('demo123') && !loginHtml.includes('faculty123') && !loginHtml.includes('apply123'),
    '1.6 No demo passwords (demo123, faculty123, apply123) are visible in login.html'
  );

  // B. Standard login form elements
  assert(
    loginHtml.includes('Sign In to Your Account'),
    '1.7 Welcome heading "Sign In to Your Account" is present'
  );
  assert(
    loginHtml.includes('Email Address or Account ID'),
    '1.8 Unified field label "Email Address or Account ID" is present'
  );
  assert(
    loginHtml.includes('placeholder="e.g. name@bantug.edu.example or Account ID"'),
    '1.9 Unified placeholder "e.g. name@bantug.edu.example or Account ID" is present'
  );
  assert(
    loginHtml.includes('placeholder="Enter your password"'),
    '1.10 Password field placeholder "Enter your password" is present'
  );
  assert(
    loginHtml.includes('type="password"'),
    '1.11 Password input has type="password"'
  );
  assert(
    loginHtml.includes('id="togglePasswordBtn"'),
    '1.12 Password toggle button (#togglePasswordBtn) is present'
  );
  assert(
    loginHtml.includes('type="button"') && loginHtml.includes('aria-label="Show password"'),
    '1.13 Password toggle button has type="button" and accessible aria-label'
  );
  assert(
    loginHtml.includes('id="forgotPasswordBtn"'),
    '1.14 Forgot Password link (#forgotPasswordBtn) is present'
  );
  assert(
    loginHtml.includes('Sign In to BANTUG UNIVERSITY'),
    '1.15 Submit button text is "Sign In to BANTUG UNIVERSITY"'
  );
  assert(
    loginHtml.includes('applyToUniversityBtn'),
    '1.16 Prospective student admissions link (#applyToUniversityBtn) is preserved'
  );

  // =========================================================================
  // TEST GROUP 2: AUTH.JS SCRIPT VERIFICATION (js/auth.js)
  // =========================================================================
  console.log('\n--- TEST GROUP 2: Verification of js/auth.js ---');
  const authJsPath = path.join(__dirname, '..', 'js', 'auth.js');
  const authJs = fs.readFileSync(authJsPath, 'utf8');

  assert(
    !authJs.includes('openForgotPasswordModal') || !authJs.includes('Demonstration Account Credentials'),
    '2.1 openForgotPasswordModal no longer displays "Demonstration Account Credentials"'
  );
  assert(
    authJs.includes('Password Reset Assistance'),
    '2.2 openForgotPasswordModal displays professional "Password Reset Assistance"'
  );
  assert(
    authJs.includes('helpdesk@bantug.edu.example'),
    '2.3 openForgotPasswordModal provides ICT Helpdesk contact details'
  );
  assert(
    authJs.includes('Please enter your email or account ID.'),
    '2.4 auth.js client validation enforces "Please enter your email or account ID."'
  );
  assert(
    authJs.includes('Please enter your password.'),
    '2.5 auth.js client validation enforces "Please enter your password."'
  );
  assert(
    authJs.includes('togglePwBtn.addEventListener("click", (e) => {\n        e.preventDefault();') ||
    authJs.includes('togglePwBtn.addEventListener("click"') && authJs.includes('e.preventDefault()'),
    '2.6 togglePasswordBtn prevents default form submission on click'
  );

  // =========================================================================
  // TEST GROUP 3: BACKEND AUTHENTICATION (POST /api/auth/login)
  // =========================================================================
  console.log('\n--- TEST GROUP 3: Backend Authentication API ---');

  // 3.1 Empty identifier
  const emptyIdRes = await postJson('/api/auth/login', { identifier: '', password: '123' });
  assert(
    emptyIdRes.status === 400 && emptyIdRes.data?.message === 'Please enter your email or account ID.',
    '3.1 Empty identifier returns HTTP 400 with "Please enter your email or account ID."',
    JSON.stringify(emptyIdRes)
  );

  // 3.2 Empty password
  const emptyPwRes = await postJson('/api/auth/login', { identifier: 'r.valiente', password: '' });
  assert(
    emptyPwRes.status === 400 && emptyPwRes.data?.message === 'Please enter your password.',
    '3.2 Empty password returns HTTP 400 with "Please enter your password."',
    JSON.stringify(emptyPwRes)
  );

  // 3.3 Nonexistent account
  const nonExistentRes = await postJson('/api/auth/login', { identifier: 'unknown.user.999', password: 'password123' });
  assert(
    nonExistentRes.status === 401 && nonExistentRes.data?.message === 'Invalid email/ID or password.',
    '3.3 Nonexistent account returns HTTP 401 with "Invalid email/ID or password."',
    JSON.stringify(nonExistentRes)
  );

  // 3.4 Incorrect password for valid user
  const wrongPwRes = await postJson('/api/auth/login', { identifier: 'r.valiente', password: 'incorrectpassword' });
  assert(
    wrongPwRes.status === 401 && wrongPwRes.data?.message === 'Invalid email/ID or password.',
    '3.4 Incorrect password returns HTTP 401 with "Invalid email/ID or password."',
    JSON.stringify(wrongPwRes)
  );

  // 3.5 Successful Student Login (username or email or student ID)
  const studentLoginRes1 = await postJson('/api/auth/login', { identifier: 'r.valiente', password: 'demo123' });
  assert(
    studentLoginRes1.status === 200 &&
    studentLoginRes1.data?.ok === true &&
    studentLoginRes1.data?.session?.role === 'student' &&
    studentLoginRes1.data?.session?.token,
    '3.5 Successful student login via username "r.valiente" returns role="student" and sessionToken',
    JSON.stringify(studentLoginRes1)
  );

  const studentLoginRes2 = await postJson('/api/auth/login', { identifier: '2025-BSIT-0202', password: 'demo123' });
  assert(
    studentLoginRes2.status === 200 &&
    studentLoginRes2.data?.session?.role === 'student',
    '3.6 Successful student login via Student ID "2025-BSIT-0202"',
    JSON.stringify(studentLoginRes2)
  );

  // 3.7 Successful Faculty Login
  const facultyLoginRes1 = await postJson('/api/auth/login', { identifier: 'f.somera', password: 'faculty123' });
  assert(
    facultyLoginRes1.status === 200 &&
    facultyLoginRes1.data?.session?.role === 'faculty' &&
    facultyLoginRes1.data?.session?.token,
    '3.7 Successful faculty login via username "f.somera" returns role="faculty"',
    JSON.stringify(facultyLoginRes1)
  );

  const facultyLoginRes2 = await postJson('/api/auth/login', { identifier: 'FAC-BU-04', password: 'faculty123' });
  assert(
    facultyLoginRes2.status === 200 &&
    facultyLoginRes2.data?.session?.role === 'faculty',
    '3.8 Successful faculty login via Faculty ID "FAC-BU-04"',
    JSON.stringify(facultyLoginRes2)
  );

  // 3.9 Successful Applicant Login
  const applicantLoginRes = await postJson('/api/auth/login', { identifier: 'c.villanueva', password: 'apply123' });
  assert(
    applicantLoginRes.status === 200 &&
    applicantLoginRes.data?.session?.role === 'applicant' &&
    applicantLoginRes.data?.session?.token,
    '3.9 Successful applicant login returns role="applicant"',
    JSON.stringify(applicantLoginRes)
  );

  // =========================================================================
  // TEST GROUP 4: INACTIVE ACCOUNT & SECURITY VERIFICATION
  // =========================================================================
  console.log('\n--- TEST GROUP 4: Inactive Account Handling & Password Security ---');

  const db = await mysql.createConnection(DB_CONFIG);
  try {
    // 4.1 Inactive account handling: temporarily set is_active = 0
    await db.query("UPDATE `users` SET `is_active` = 0 WHERE `username` = 'c.reyes'");

    const inactiveRes = await postJson('/api/auth/login', { identifier: 'c.reyes', password: 'demo123' });
    assert(
      inactiveRes.status === 403 &&
      inactiveRes.data?.message === 'Your account is currently inactive. Please contact the university.',
      '4.1 Inactive account (is_active = 0) returns HTTP 403 with "Your account is currently inactive. Please contact the university."',
      JSON.stringify(inactiveRes)
    );

    // Reactivate account
    await db.query("UPDATE `users` SET `is_active` = 1 WHERE `username` = 'c.reyes'");
    const activeRes = await postJson('/api/auth/login', { identifier: 'c.reyes', password: 'demo123' });
    assert(
      activeRes.status === 200 && activeRes.data?.ok === true,
      '4.2 Reactivated account (is_active = 1) authenticates successfully'
    );

    // 4.3 Database password hash verification
    const [rows] = await db.query("SELECT password_hash FROM `users` WHERE `username` IN ('r.valiente', 'f.somera', 'c.villanueva')");
    let allHashed = true;
    for (const r of rows) {
      if (r.password_hash === 'demo123' || r.password_hash === 'faculty123' || r.password_hash === 'apply123') {
        allHashed = false;
      }
    }
    assert(
      allHashed && rows.length >= 3,
      '4.3 Passwords in MySQL users table are securely hashed and never stored in plain-text'
    );

    // 4.4 Session security: audit log entry recorded
    const [auditRows] = await db.query(
      "SELECT * FROM `audit_logs` WHERE `action_type` = 'USER_LOGIN' ORDER BY `log_id` DESC LIMIT 1"
    );
    assert(
      auditRows.length > 0 && auditRows[0].action_type === 'USER_LOGIN',
      '4.4 USER_LOGIN audit trail entry is successfully recorded in MySQL audit_logs'
    );

  } finally {
    await db.end();
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
})();

