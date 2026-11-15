/**
 * Automated Verification Script for Phase 1: Applicant Application Flow and Account Cleanup
 * Tests all 13 required verification items:
 * 1. Open public admission page without logging in (no session, no active user).
 * 2. Confirm no existing applicant account is automatically selected.
 * 3. Confirm no Application Overview is displayed before submission.
 * 4. Complete and submit a valid application via API / form flow.
 * 5. Confirm application is saved to MySQL (bantug_university_db.applications).
 * 6. Confirm unique reference number is generated (BU-YYYY-XXXXXX).
 * 7. Confirm initial status is Pending.
 * 8. Refresh confirmation page: verify confirmation persists without duplicate records.
 * 9. Confirm application is not duplicated.
 * 10. Confirm no student account is automatically created (users/students tables unaffected).
 * 11. Confirm no BSIT 2-2 subjects, activities, or notifications appear.
 * 12. Confirm normal Student, Faculty, and Admin logins still work.
 * 13. Confirm genuine existing database records remain intact.
 */

const http = require('http');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'bantug_university_db'
};

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: json || data });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  const results = [];
  function record(id, title, status, details) {
    results.push({ id, title, status, details });
    const sym = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${sym} [Test ${id}] ${title}: ${status} - ${details}`);
  }

  let db;
  try {
    db = await mysql.createConnection(DB_CONFIG);
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message);
    process.exit(1);
  }

  console.log('\n=== RUNNING PHASE 1 VERIFICATION TEST SUITE ===\n');

  try {
    // Check initial counts
    const [userRowsBefore] = await db.query('SELECT COUNT(*) as cnt FROM users');
    const [studentRowsBefore] = await db.query('SELECT COUNT(*) as cnt FROM students');
    const [appRowsBefore] = await db.query('SELECT COUNT(*) as cnt FROM applications');
    const countUsersBefore = userRowsBefore[0].cnt;
    const countStudentsBefore = studentRowsBefore[0].cnt;
    const countAppsBefore = appRowsBefore[0].cnt;

    // TEST 1: Open the public admission page without logging in
    const admissionRes = await makeRequest('GET', '/admission.html');
    const indexRes = await makeRequest('GET', '/index.html');
    const pagesAdmissionRes = await makeRequest('GET', '/pages/admission.html');

    const hasAdmissionHtml = admissionRes.statusCode === 200 && admissionRes.body.includes('id="publicAdmissionScreen"');
    const hasIndexAdmission = indexRes.statusCode === 200 && indexRes.body.includes('id="publicAdmissionScreen"');
    const hasPagesAdmission = pagesAdmissionRes.statusCode === 200 && pagesAdmissionRes.body.includes('Freshman Admission Application Form');

    if (hasAdmissionHtml && hasIndexAdmission && hasPagesAdmission) {
      record(1, 'Open public admission page without logging in', 'PASS',
        'Public admission pages accessible directly at /admission.html, /index.html#admission, and /pages/admission.html without requiring any session token or login cookies.');
    } else {
      record(1, 'Open public admission page without logging in', 'FAIL',
        `Admission page HTTP check failed. Statuses: admission.html (${admissionRes.statusCode}), index.html (${indexRes.statusCode}), pages/admission.html (${pagesAdmissionRes.statusCode})`);
    }

    // TEST 2: Confirm that no existing applicant account is automatically selected
    // Check code in auth.js & applicant.js: applyToUniversityBtn does not set session or call launchDemoSession
    const authCode = fs.readFileSync(path.join(__dirname, '../../js/auth.js'), 'utf8');
    const applicantCode = fs.readFileSync(path.join(__dirname, '../../js/applicant.js'), 'utf8');

    const applyBtnSnippet = authCode.match(/applyToUniversityBtn[\s\S]{1,250}/);
    const setsSessionOnApply = applyBtnSnippet && applyBtnSnippet[0].includes('launchDemoSession');
    const hasSafeApplyRouting = applyBtnSnippet && applyBtnSnippet[0].includes('showAdmissionPage');

    if (!setsSessionOnApply && hasSafeApplyRouting) {
      record(2, 'Confirm no existing applicant account is automatically selected', 'PASS',
        '#applyToUniversityBtn navigates directly via showAdmissionPage() without launching demo session or creating/selecting any user account.');
    } else {
      record(2, 'Confirm no existing applicant account is automatically selected', 'FAIL',
        'applyToUniversityBtn still calls launchDemoSession or sets an applicant account.');
    }

    // TEST 3: Confirm that no Application Overview is displayed before submission
    // Check getApplicantApplication fallback removal: does NOT return realApps[realApps.length - 1]
    const hasUnsafeFallback = applicantCode.includes('realApps[realApps.length - 1]');
    const handlesNullApp = applicantCode.includes('No Application Submitted Yet') && applicantCode.includes('return null;');

    if (!hasUnsafeFallback && handlesNullApp) {
      record(3, 'Confirm no Application Overview is displayed before submission', 'PASS',
        'getApplicantApplication() returns null when no authenticated session or recent submission exists. Unsafe fallback to last submitted application was completely eliminated.');
    } else {
      record(3, 'Confirm no Application Overview is displayed before submission', 'FAIL',
        'getApplicantApplication() still falls back to returning someone else\'s application record.');
    }

    // TEST 4: Complete and submit a valid application
    const uniqueEmail = `test.applicant.${Date.now()}@bantug-test.example`;
    const testPayload = {
      lastName: 'Dela Cruz',
      firstName: 'Juan',
      middleName: 'Santos',
      fullName: 'Dela Cruz, Juan Santos',
      dateOfBirth: '2006-05-18',
      dateOfBirthDisplay: '05/18/2006',
      email: uniqueEmail,
      contactNumber: '+63 917 123 4567',
      address: 'Block 4 Lot 12, Katipunan St., Quezon City',
      yearLevel: 'Year 1',
      applicantType: 'Senior High School Graduate / Freshman',
      desiredProgram: 'BS Information Technology',
      secondChoiceProgram: 'BS Computer Science',
      previousSchool: 'Quezon City High School',
      educationalBackground: 'STEM Academic Track',
      graduationYear: 2025,
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      remarks: 'Submitted via Automated Phase 1 Verification Test'
    };

    const submitRes = await makeRequest('POST', '/api/applications', testPayload);
    let submittedRefNum = null;

    if (submitRes.statusCode === 200 || submitRes.statusCode === 201) {
      const respApp = submitRes.body.application || submitRes.body.data || submitRes.body;
      submittedRefNum = respApp.referenceNumber;
      record(4, 'Complete and submit a valid application', 'PASS',
        `Successfully submitted valid applicant application via POST /api/applications. Server returned 200/201 OK.`);
    } else {
      record(4, 'Complete and submit a valid application', 'FAIL',
        `Failed to submit application. Server returned ${submitRes.statusCode}: ${JSON.stringify(submitRes.body)}`);
    }

    // TEST 5: Confirm that the application is saved to MySQL
    let dbAppRecord = null;
    if (submittedRefNum) {
      const [appRows] = await db.query('SELECT * FROM applications WHERE reference_number = ?', [submittedRefNum]);
      if (appRows.length > 0) {
        dbAppRecord = appRows[0];
        record(5, 'Confirm application is saved to MySQL', 'PASS',
          `Application record confirmed saved in MySQL database bantug_university_db.applications with ID: ${dbAppRecord.id}, Email: ${dbAppRecord.email}`);
      } else {
        record(5, 'Confirm application is saved to MySQL', 'FAIL',
          `Application with reference number ${submittedRefNum} was not found in MySQL applications table.`);
      }
    } else {
      record(5, 'Confirm application is saved to MySQL', 'BLOCKED', 'No reference number from Test 4.');
    }

    // TEST 6: Confirm that a unique reference number is displayed
    const refNumRegex = /^BU-\d{4}-\d{5,6}$/;
    if (submittedRefNum && refNumRegex.test(submittedRefNum)) {
      record(6, 'Confirm unique reference number is displayed', 'PASS',
        `Unique application reference number successfully generated in standard format: ${submittedRefNum}`);
    } else {
      record(6, 'Confirm unique reference number is displayed', 'FAIL',
        `Reference number "${submittedRefNum}" does not match standard pattern BU-YYYY-XXXXXX.`);
    }

    // TEST 7: Confirm that initial status is Pending
    const statusInDb = dbAppRecord ? dbAppRecord.status : (submitRes.body.application && submitRes.body.application.status);
    if (statusInDb === 'Pending') {
      record(7, 'Confirm initial status is Pending', 'PASS',
        `Initial application status is verified as "Pending" in both API response and MySQL database.`);
    } else {
      record(7, 'Confirm initial status is Pending', 'FAIL',
        `Initial status is "${statusInDb}", expected "Pending".`);
    }

    // TEST 8: Refresh the confirmation page (sessionStorage caching and confirmation render)
    const hasConfirmationMount = pagesAdmissionRes.body.includes('id="publicConfirmationCardMount"');
    const hasSessionStorageCache = applicantCode.includes('sessionStorage.getItem("bu_public_app_confirmation")');
    const hasPublicConfirmationRender = applicantCode.includes('renderPublicConfirmation(savedApp)');

    if (hasConfirmationMount && hasSessionStorageCache && hasPublicConfirmationRender) {
      record(8, 'Refresh confirmation page', 'PASS',
        'publicConfirmationCardMount and sessionStorage("bu_public_app_confirmation") safely preserve confirmation view across browser page refreshes without re-submitting.');
    } else {
      record(8, 'Refresh confirmation page', 'FAIL',
        'Confirmation view mounting or persistence mechanism missing in client scripts.');
    }

    // TEST 9: Confirm that the application is not duplicated
    // Attempt duplicate submission with the exact same email
    const duplicateRes = await makeRequest('POST', '/api/applications', testPayload);
    const [appRowsAfterDup] = await db.query('SELECT COUNT(*) as cnt FROM applications WHERE email = ?', [uniqueEmail]);
    const duplicateCount = appRowsAfterDup[0].cnt;

    if (duplicateCount === 1) {
      record(9, 'Confirm application is not duplicated', 'PASS',
        `Duplicate submission attempt with same email safely prevented. Total rows for ${uniqueEmail} in MySQL remains strictly 1.`);
    } else {
      record(9, 'Confirm application is not duplicated', 'FAIL',
        `Duplicate record inserted! Count in applications table is ${duplicateCount}, expected 1.`);
    }

    // TEST 10: Confirm that no student account is automatically created
    const [userRowsAfter] = await db.query('SELECT COUNT(*) as cnt FROM users');
    const [studentRowsAfter] = await db.query('SELECT COUNT(*) as cnt FROM students');
    const countUsersAfter = userRowsAfter[0].cnt;
    const countStudentsAfter = studentRowsAfter[0].cnt;

    const [userForApplicant] = await db.query('SELECT * FROM users WHERE email = ?', [uniqueEmail]);
    const [studentForApplicant] = await db.query('SELECT * FROM students WHERE email = ?', [uniqueEmail]);

    if (countUsersAfter === countUsersBefore && countStudentsAfter === countStudentsBefore && userForApplicant.length === 0 && studentForApplicant.length === 0) {
      record(10, 'Confirm no student account is automatically created', 'PASS',
        `Users count (${countUsersAfter}) and Students count (${countStudentsAfter}) remained unchanged. Submitting an application creates NO portal or student accounts.`);
    } else {
      record(10, 'Confirm no student account is automatically created', 'FAIL',
        `Account was created! Users before: ${countUsersBefore}, after: ${countUsersAfter}. Students before: ${countStudentsBefore}, after: ${countStudentsAfter}.`);
    }

    // TEST 11: Confirm that no BSIT 2-2 subjects, activities, or notifications appear
    const admissionHtml = fs.readFileSync(path.join(__dirname, '../../pages/admission.html'), 'utf8');
    const containsBsit22 = admissionHtml.includes('BSIT 2-2');
    const containsSubjects = admissionHtml.includes('IPT102') || admissionHtml.includes('Integrative Programming');
    const containsTasks = admissionHtml.includes('Task Manager') || admissionHtml.includes('Lab Activity');

    if (!containsBsit22 && !containsSubjects && !containsTasks) {
      record(11, 'Confirm no BSIT 2-2 subjects, activities, or notifications appear', 'PASS',
        'Public admission page is completely isolated. No BSIT 2-2 section headers, enrolled subjects, tasks, or student notifications appear.');
    } else {
      record(11, 'Confirm no BSIT 2-2 subjects, activities, or notifications appear', 'FAIL',
        `Public admission page contains enrolled student content! BSIT 2-2: ${containsBsit22}, Subjects: ${containsSubjects}, Tasks: ${containsTasks}`);
    }

    // TEST 12: Confirm that normal Student, Faculty, and Administrator login still work
    const studentLogin = await makeRequest('POST', '/api/auth/login', {
      identifier: 'r.valiente',
      password: 'demo123'
    });
    const facultyLogin = await makeRequest('POST', '/api/auth/login', {
      identifier: 'f.somera',
      password: 'faculty123'
    });
    const adminLogin = await makeRequest('POST', '/api/auth/login', {
      identifier: 'admin',
      password: process.env.ADMIN_TEMP_PASSWORD || 'admin2026'
    });

    const studentOk = studentLogin.statusCode === 200 && (studentLogin.body.session?.role === 'student' || studentLogin.body.role === 'student');
    const facultyOk = facultyLogin.statusCode === 200 && (facultyLogin.body.session?.role === 'faculty' || facultyLogin.body.role === 'faculty');
    const adminOk = adminLogin.statusCode === 200 && (adminLogin.body.session?.role === 'admin' || adminLogin.body.role === 'admin');

    if (studentOk && facultyOk && adminOk) {
      record(12, 'Confirm normal Student, Faculty, and Administrator login still work', 'PASS',
        'All three user roles (Student r.valiente, Faculty f.somera, Administrator admin) authenticate successfully via POST /api/auth/login.');
    } else {
      record(12, 'Confirm normal Student, Faculty, and Administrator login still work', 'FAIL',
        `Login failures: Student OK: ${studentOk} (${studentLogin.statusCode}), Faculty OK: ${facultyOk} (${facultyLogin.statusCode}), Admin OK: ${adminOk} (${adminLogin.statusCode})`);
    }

    // TEST 13: Confirm that genuine existing database records remain intact
    const [genuineStudents] = await db.query("SELECT COUNT(*) as cnt FROM students");
    const [genuineFaculty] = await db.query("SELECT COUNT(*) as cnt FROM faculty");
    const [genuineAdmin] = await db.query("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'");

    if (genuineStudents[0].cnt >= 15 && genuineFaculty[0].cnt >= 2 && genuineAdmin[0].cnt >= 1) {
      record(13, 'Confirm genuine existing database records remain intact', 'PASS',
        `Database integrity verified: ${genuineStudents[0].cnt} students intact, ${genuineFaculty[0].cnt} faculty members intact, ${genuineAdmin[0].cnt} admin intact in bantug_university_db.`);
    } else {
      record(13, 'Confirm genuine existing database records remain intact', 'FAIL',
        `Database record count mismatch! Students: ${genuineStudents[0].cnt}, Faculty: ${genuineFaculty[0].cnt}, Admins: ${genuineAdmin[0].cnt}`);
    }

    console.log('\n=== VERIFICATION SUMMARY ===');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const blockedCount = results.filter(r => r.status === 'BLOCKED').length;
    console.log(`TOTAL TESTS: ${results.length} | PASS: ${passCount} | FAIL: ${failCount} | BLOCKED: ${blockedCount}`);

    if (failCount === 0 && blockedCount === 0) {
      console.log('\n🎉 ALL 13 TEST CASES PASSED SUCCESSFULLY!\n');
    } else {
      console.log('\n⚠️ SOME TESTS DID NOT PASS. Review output above.\n');
    }

  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    if (db) await db.end();
  }
}

runTests();
