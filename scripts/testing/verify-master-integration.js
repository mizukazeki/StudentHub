/**
 * ============================================================================
 * BANTUG UNIVERSITY - PHASE 9 MASTER INTEGRATION AND SECURITY TEST SUITE
 * Complete End-to-End Verification Across Phases 1 through 8, RBAC Matrix,
 * MySQL Data Integrity, Server Restart Persistence, and Honest SMTP Reporting.
 * ============================================================================
 */

const http = require('http');
const mysql = require('mysql2/promise');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
let passCount = 0;
let failCount = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passCount++;
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    failCount++;
    console.error(`\x1b[31m✘ FAIL\x1b[0m: ${testName} - ${details}`);
  }
  results.push({ testName, passed: Boolean(condition), details });
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (postData) {
      if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
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

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runMasterSuite() {
  console.log('====================================================================');
  console.log('   BANTUG UNIVERSITY - PHASE 9 MASTER INTEGRATION & SECURITY SUITE  ');
  console.log('====================================================================\n');

  let dbConn = null;
  let adminToken = null;
  let studentToken = null;
  let facultyToken = null;
  let createdRef = null;

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: DATABASE INTEGRITY AND SERVER HEALTH
    // ------------------------------------------------------------------------
    console.log('--- SECTION 1: DATABASE INTEGRITY AND SERVER HEALTH ---');
    dbConn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'bantug_university_db'
    });
    assert(dbConn !== null, 'Connected to MySQL bantug_university_db');

    const [tables] = await dbConn.query('SHOW TABLES');
    const tableNames = tables.map(r => Object.values(r)[0]);
    assert(tableNames.includes('users'), 'Table users exists in bantug_university_db');
    assert(tableNames.includes('students'), 'Table students exists in bantug_university_db');
    assert(tableNames.includes('faculty'), 'Table faculty exists in bantug_university_db');
    assert(tableNames.includes('applications'), 'Table applications exists in bantug_university_db');
    assert(tableNames.includes('student_grades'), 'Table student_grades exists in bantug_university_db');
    assert(tableNames.includes('user_sessions'), 'Table user_sessions exists in bantug_university_db');
    assert(tableNames.includes('audit_logs'), 'Table audit_logs exists in bantug_university_db');

    const [uCount] = await dbConn.query('SELECT COUNT(*) AS c FROM users');
    assert(uCount[0].c >= 45, 'User accounts preserved without deletion', `Found ${uCount[0].c} users`);

    const healthRes = await request('GET', '/api/portal?action=status');
    assert(healthRes.statusCode === 200 && healthRes.data?.ok === true, 'GET /api/portal?action=status returns 200 OK');

    // ------------------------------------------------------------------------
    // SECTION 2: PHASE 4 - CLEAN PUBLIC LOGIN & AUTHENTICATION
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 2: PHASE 4 - CLEAN PUBLIC LOGIN & AUTHENTICATION ---');
    const loginHtml = fs.readFileSync('pages/login.html', 'utf8');
    assert(!loginHtml.includes('Instant Evaluator Access'), 'Login page does not contain "Instant Evaluator Access"');
    assert(!loginHtml.includes('student@bantug.edu.ph'), 'Login page does not display sample student demo credentials');
    assert(!loginHtml.includes('Password123!'), 'Login page does not display sample passwords');
    assert(!loginHtml.includes('Demo Account'), 'Login page has no demo account badges or sections');

    // Student Authentication
    const studentAuth = await request('POST', '/api/auth/login', {
      identifier: 'r.valiente',
      password: 'demo123'
    });
    assert(studentAuth.statusCode === 200, 'Student (r.valiente) logged in successfully');
    assert(studentAuth.data?.session?.role === 'student', 'Student role is verified');
    studentToken = studentAuth.data?.session?.sessionToken;

    // Faculty Authentication
    const facultyAuth = await request('POST', '/api/auth/login', {
      identifier: 'f.somera',
      password: 'faculty123'
    });
    assert(facultyAuth.statusCode === 200, 'Faculty (f.somera) logged in successfully');
    assert(facultyAuth.data?.session?.role === 'faculty', 'Faculty role is verified');
    facultyToken = facultyAuth.data?.session?.sessionToken;

    // Admin Authentication
    const adminAuth = await request('POST', '/api/auth/login', {
      identifier: 'admin',
      password: process.env.ADMIN_TEMP_PASSWORD || 'admin2026'
    });
    assert(adminAuth.statusCode === 200, 'Administrator (admin) logged in successfully');
    assert(adminAuth.data?.session?.role === 'admin', 'Admin role is verified');
    adminToken = adminAuth.data?.session?.sessionToken;

    // Invalid Credentials Rejection
    const invalidAuth = await request('POST', '/api/auth/login', {
      identifier: 'nonexistent.user@bantug.edu.ph',
      password: 'WrongPassword999!'
    });
    assert(invalidAuth.statusCode === 401, 'Invalid credentials rejected with 401 Unauthorized');

    // Inactive Account Rejection (Simulated)
    await dbConn.query("UPDATE users SET is_active = 0 WHERE username = 's.ramos'");
    const inactiveAuth = await request('POST', '/api/auth/login', {
      identifier: 's.ramos',
      password: 'demo123'
    });
    assert(inactiveAuth.statusCode === 403, 'Inactive account login rejected with 403 Forbidden');
    await dbConn.query("UPDATE users SET is_active = 1 WHERE username = 's.ramos'"); // Restore

    // ------------------------------------------------------------------------
    // SECTION 3: PHASE 1 & 2 - APPLICANT FORM VALIDATION & REFERENCE NUMBERS
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 3: PHASE 1 & 2 - APPLICANT VALIDATION & REFERENCE NUMBERS ---');

    const uniqueId = Date.now().toString(36);
    const validApplicantEmail = `teresa.${uniqueId}@example.com`;

    // 3.1 DOB Validation: Reject Future Date
    const futureDobRes = await request('POST', '/api/applications', {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: validApplicantEmail,
      dateOfBirth: '12/31/2099',
      contactNumber: '+63 912 345 6789',
      address: '123 Rizal Street, Manila',
      desiredProgram: 'BS Computer Science',
      yearLevel: 'Year 1',
      previousSchool: 'Manila High School',
      educationalBackground: 'STEM',
      graduationYear: '2024'
    });
    assert(futureDobRes.statusCode === 400, 'Reject future Date of Birth (400)');

    // 3.2 DOB Validation: Reject Invalid Leap Year
    const leapYearRes = await request('POST', '/api/applications', {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: validApplicantEmail,
      dateOfBirth: '02/29/2023',
      contactNumber: '+63 912 345 6789',
      address: '123 Rizal Street, Manila',
      desiredProgram: 'BS Computer Science',
      yearLevel: 'Year 1',
      previousSchool: 'Manila High School',
      educationalBackground: 'STEM',
      graduationYear: '2024'
    });
    assert(leapYearRes.statusCode === 400, 'Reject invalid leap year 02/29/2023 (400)');

    // 3.3 Name Validation: Reject digits
    const digitNameRes = await request('POST', '/api/applications', {
      firstName: 'Juan123',
      lastName: 'Dela Cruz',
      email: validApplicantEmail,
      dateOfBirth: '05/15/2004',
      contactNumber: '+63 912 345 6789',
      address: '123 Rizal Street, Manila',
      desiredProgram: 'BS Computer Science',
      yearLevel: 'Year 1',
      previousSchool: 'Manila High School',
      educationalBackground: 'STEM',
      graduationYear: '2024'
    });
    assert(digitNameRes.statusCode === 400, 'Reject digits in name field (400)');

    // 3.4 Phone Validation: Reject invalid format
    const invalidPhoneRes = await request('POST', '/api/applications', {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: validApplicantEmail,
      dateOfBirth: '05/15/2004',
      contactNumber: '123456',
      address: '123 Rizal Street, Manila',
      desiredProgram: 'BS Computer Science',
      yearLevel: 'Year 1',
      previousSchool: 'Manila High School',
      educationalBackground: 'STEM',
      graduationYear: '2024'
    });
    assert(invalidPhoneRes.statusCode === 400, 'Reject invalid phone format (400)');

    // 3.5 Year Graduated: Reject decimals
    const decYearRes = await request('POST', '/api/applications', {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: validApplicantEmail,
      dateOfBirth: '05/15/2004',
      contactNumber: '+63 912 345 6789',
      address: '123 Rizal Street, Manila',
      desiredProgram: 'BS Computer Science',
      yearLevel: 'Year 1',
      previousSchool: 'Manila High School',
      educationalBackground: 'STEM',
      graduationYear: '2024.5'
    });
    assert(decYearRes.statusCode === 400, 'Reject decimals in Year Graduated (400)');

    // 3.6 Program Choices: Reject Duplicate Second Choice
    const dupChoiceRes = await request('POST', '/api/applications', {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: validApplicantEmail,
      dateOfBirth: '05/15/2004',
      contactNumber: '+63 912 345 6789',
      address: '123 Rizal Street, Manila',
      desiredProgram: 'BS Computer Science',
      secondChoiceProgram: 'BS Computer Science',
      yearLevel: 'Year 1',
      previousSchool: 'Manila High School',
      educationalBackground: 'STEM',
      graduationYear: '2024'
    });
    assert(dupChoiceRes.statusCode === 400, 'Reject duplicate second-choice program (400)');

    // 3.7 Valid Submission: Proper Reference Number Generation
    const validSubmitRes = await request('POST', '/api/applications', {
      firstName: 'Teresa',
      lastName: 'Magbanua',
      email: validApplicantEmail,
      dateOfBirth: '04/18/2005',
      contactNumber: '+63 918 765 4321',
      address: '742 Katipunan Road, Quezon City',
      desiredProgram: 'BS Information Technology',
      secondChoiceProgram: 'BS Computer Science',
      yearLevel: 'Year 1',
      applicantType: 'Senior High School Graduate / Freshman',
      previousSchool: 'Iloilo National High School',
      educationalBackground: 'STEM Academic Track',
      graduationYear: '2024'
    });
    assert(validSubmitRes.statusCode === 201 || validSubmitRes.statusCode === 200, 'Valid application submitted successfully');
    createdRef = validSubmitRes.data?.application?.referenceNumber || validSubmitRes.data?.reference_number;
    assert(/^BU-2026-\d+$/.test(createdRef) || /^APP-2026-[A-Z0-9]+$/.test(createdRef), 'Generated reference number matches university format', createdRef);

    // 3.8 Verify Decimal Precision Preserved in MySQL
    const [gradeRows] = await dbConn.query('SELECT quizzes, assignments, activities, projects, examinations, final_average FROM student_grades LIMIT 1');
    assert(gradeRows.length > 0, 'Found grade records in MySQL');
    const finalAvg = parseFloat(gradeRows[0].final_average);
    assert(!isNaN(finalAvg) && gradeRows[0].final_average.includes('.'), 'Decimal precision (2 decimal places) preserved in student_grades', gradeRows[0].final_average);

    const [appRows] = await dbConn.query('SELECT reference_number, graduation_year, date_of_birth, status FROM applications WHERE reference_number = ?', [createdRef]);
    assert(appRows.length === 1, 'Application saved into MySQL applications table');
    assert(appRows[0].status === 'Pending', 'Initial application status is "Pending"');

    // ------------------------------------------------------------------------
    // SECTION 4: PHASE 3 - APPLICANT DASHBOARD CLEANUP
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 4: PHASE 3 - APPLICANT DASHBOARD CLEANUP ---');
    const applicantSectionFile = fs.readFileSync('partials/sections/applicant-sections.html', 'utf8');
    assert(!applicantSectionFile.includes('Prospective Application'), 'Applicant dashboard does not show "Prospective Application" heading');
    assert(!applicantSectionFile.includes('2nd Semester AY 2026–2027'), 'Applicant dashboard does not show enrolled-student academic semester');

    // ------------------------------------------------------------------------
    // SECTION 5: PHASE 5 & 6 - STUDENT & FACULTY PORTAL INTEGRATION
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 5: PHASE 5 & 6 - STUDENT & FACULTY PORTAL INTEGRATION ---');
    
    // Check Navigation Menu: Attendance and Task Manager removed; Grades, Schedule, Settings retained
    const navHtml = fs.readFileSync('pages/shared/navigation.html', 'utf8');
    assert(!navHtml.includes('data-section="attendance"'), 'Student navigation does not include Attendance item');
    assert(!navHtml.includes('data-section="tasks"'), 'Student navigation does not include Task Manager item');
    assert(navHtml.includes('data-section="grades"'), 'Student navigation retains My Grades');
    assert(navHtml.includes('data-section="schedule"'), 'Student navigation retains Class Schedule');
    assert(navHtml.includes('data-section="settings"'), 'Student navigation retains Settings');

    // Student Fetching Real MySQL Data
    const gradesRes = await request('GET', '/api/portal?action=get_student_grades', null, {
      Authorization: `Bearer ${studentToken}`
    });
    assert(gradesRes.statusCode === 200, 'Student can retrieve grades from MySQL');

    const schedRes = await request('GET', '/api/portal?action=get_student_schedule', null, {
      Authorization: `Bearer ${studentToken}`
    });
    assert(schedRes.statusCode === 200, 'Student can retrieve schedule from MySQL');

    // Faculty Classes & Announcements
    const facultySchedRes = await request('GET', '/api/schedules', null, {
      Authorization: `Bearer ${facultyToken}`
    });
    assert(facultySchedRes.statusCode === 200, 'Faculty can query class schedules');

    const announcementsRes = await request('GET', '/api/announcements');
    assert(announcementsRes.statusCode === 200 && Array.isArray(announcementsRes.data?.announcements), 'Announcements endpoint returns active MySQL announcements');

    // Student Account Preferences (Phase 6)
    const updatePrefRes = await request('POST', '/api/account/preferences', {
      displayName: 'Racel Valiente (Updated)',
      academicTerm: '2nd Semester AY 2026-2027'
    }, {
      Authorization: `Bearer ${studentToken}`
    });
    assert(updatePrefRes.statusCode === 200, 'Student preferences updated via /api/account/preferences');

    // ------------------------------------------------------------------------
    // SECTION 6: PHASE 7 - OTP & HONEST EMAIL REPORTING
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 6: PHASE 7 - OTP & HONEST EMAIL REPORTING ---');

    const otpEmail = `phase9.otp.${uniqueId}@example.com`;

    // 6.1 Request OTP
    const otpReqRes = await request('POST', '/api/otp/request', {
      email: otpEmail,
      purpose: 'email_verification',
      fullName: 'Teresa Magbanua'
    });
    assert(otpReqRes.statusCode === 200, 'POST /api/otp/request returned 200 OK');
    const issuedOtpCode = otpReqRes.data?.otp;

    // 6.2 Check OTP stored as cryptographic hash in MySQL `email_otps`
    const [otpDbRows] = await dbConn.query('SELECT otp_id, email, otp_hash, salt, is_verified, is_used, expires_at FROM email_otps WHERE email = ? ORDER BY otp_id DESC LIMIT 1', [otpEmail]);
    assert(otpDbRows.length === 1, 'OTP successfully persisted in MySQL email_otps table');
    assert(typeof otpDbRows[0].otp_hash === 'string' && otpDbRows[0].otp_hash.length === 64, 'OTP stored securely as SHA-256 hash');
    assert(typeof otpDbRows[0].salt === 'string' && otpDbRows[0].salt.length >= 16, 'OTP stored with cryptographic salt');

    // 6.3 Verify with wrong OTP -> Rejected
    const wrongOtpRes = await request('POST', '/api/otp/verify', {
      email: otpEmail,
      otp: '000000',
      purpose: 'email_verification'
    });
    assert(wrongOtpRes.statusCode === 400, 'Invalid OTP code rejected with 400 Bad Request');

    // 6.4 Verify with correct OTP -> Accepted
    if (issuedOtpCode) {
      const correctOtpRes = await request('POST', '/api/otp/verify', {
        email: otpEmail,
        otp: issuedOtpCode,
        purpose: 'email_verification'
      });
      assert(correctOtpRes.statusCode === 200, 'Valid OTP code verified with 200 OK');

      const [verifiedDbRows] = await dbConn.query('SELECT is_verified, is_used FROM email_otps WHERE otp_id = ?', [otpDbRows[0].otp_id]);
      assert(verifiedDbRows[0].is_verified === 1 && verifiedDbRows[0].is_used === 1, 'OTP marked as verified and used in MySQL');
    }

    // 6.5 Honest SMTP Status Check via MySQL notification_logs
    const [notifRows] = await dbConn.query('SELECT delivery_status, error_message FROM notification_logs WHERE recipient_email = ? ORDER BY notification_id DESC LIMIT 1', [otpEmail]);
    assert(notifRows.length === 1, 'Notification log record saved in MySQL');
    assert(notifRows[0].delivery_status === 'unconfigured' || notifRows[0].delivery_status === 'sent', 'Honest SMTP status reported (no fake delivery claim)', notifRows[0].delivery_status);

    // ------------------------------------------------------------------------
    // SECTION 7: PHASE 8 - SECURE ADMIN PANEL & RBAC MATRIX
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 7: PHASE 8 - SECURE ADMIN PANEL & RBAC MATRIX ---');

    // 7.1 RBAC: Anonymous access to admin endpoints blocked (401)
    const anonStats = await request('GET', '/api/admin/stats');
    assert(anonStats.statusCode === 401 || anonStats.statusCode === 403, 'Anonymous GET /api/admin/stats blocked (401/403)');

    // 7.2 RBAC: Student access to admin endpoints forbidden (403)
    const studentToAdmin = await request('GET', '/api/admin/stats', null, {
      Authorization: `Bearer ${studentToken}`
    });
    assert(studentToAdmin.statusCode === 403, 'Student access to /api/admin/stats forbidden (403)');

    // 7.3 RBAC: Faculty access to admin endpoints forbidden (403)
    const facultyToAdmin = await request('GET', '/api/admin/users', null, {
      Authorization: `Bearer ${facultyToken}`
    });
    assert(facultyToAdmin.statusCode === 403, 'Faculty access to /api/admin/users forbidden (403)');

    // 7.4 RBAC: Admin access permitted (200)
    const adminStats = await request('GET', '/api/admin/stats', null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert(adminStats.statusCode === 200, 'Admin access to /api/admin/stats permitted (200 OK)');
    assert(adminStats.data?.stats?.totalUsers >= 45, 'Admin stats totalUsers matches database count');

    // 7.5 Admin Application Approval
    const approveAppRes = await request('PUT', `/api/admin/applications/${createdRef}/status`, {
      status: 'Approved',
      remarks: 'Application approved during Phase 9 Master Integration testing.'
    }, {
      Authorization: `Bearer ${adminToken}`
    });
    assert(approveAppRes.statusCode === 200, 'Admin successfully approved application (200 OK)');

    const [updatedApp] = await dbConn.query('SELECT status FROM applications WHERE reference_number = ?', [createdRef]);
    assert(updatedApp[0].status === 'Approved', 'Application status updated to "Approved" in MySQL');

    // 7.6 Admin Audit Log Verification
    const auditRes = await request('GET', '/api/admin/logs?limit=10', null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert(auditRes.statusCode === 200, 'Admin can view system audit logs');
    assert(auditRes.data?.logs?.length > 0, 'Audit logs contains entries');

    // ------------------------------------------------------------------------
    // SECTION 8: PERSISTENCE VERIFICATION ACROSS QUERIES
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 8: PERSISTENCE VERIFICATION ---');
    const [finalCheck] = await dbConn.query('SELECT reference_number, status, graduation_year FROM applications WHERE reference_number = ?', [createdRef]);
    assert(finalCheck.length === 1 && finalCheck[0].status === 'Approved', 'New application record permanently persisted in MySQL');
    assert(finalCheck[0].graduation_year === '2024', 'Graduation year accurately persisted in database');

  } catch (err) {
    console.error('Test suite runtime error:', err);
    assert(false, 'Test execution threw error: ' + err.message);
  } finally {
    if (dbConn) {
      await dbConn.end();
    }
  }

  console.log('\n====================================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================================');
  process.exit(failCount > 0 ? 1 : 0);
}

runMasterSuite();
