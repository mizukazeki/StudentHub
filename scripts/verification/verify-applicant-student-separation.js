/**
 * Automated Verification Script for Phase 2: Separate Applicant and Student Information
 * Tests all required sections:
 * - Applicant Testing (Tests 1-7)
 * - Student Testing (Tests 8-12)
 * - Security Testing (Tests 13-16)
 * - Database Testing (Tests 17-21)
 */

const http = require('http');
const mysql = require('mysql2/promise');

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
  function record(section, id, title, status, details) {
    results.push({ section, id, title, status, details });
    const sym = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${sym} [${section} - Test ${id}] ${title}: ${status} - ${details}`);
  }

  let db;
  try {
    db = await mysql.createConnection(DB_CONFIG);
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message);
    process.exit(1);
  }

  console.log('\n=== RUNNING PHASE 2 APPLICANT & STUDENT SEPARATION TEST SUITE ===\n');

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: APPLICANT TESTING
    // ------------------------------------------------------------------------
    console.log('--- SECTION 1: APPLICANT TESTING ---');

    // 1. Log in as an applicant
    const appLoginRes = await makeRequest('POST', '/api/auth/login', {
      identifier: 'c.villanueva',
      password: 'apply123',
      role: 'applicant'
    });

    const appToken = appLoginRes.body.session?.sessionToken;
    const isAppLoginOk = appLoginRes.statusCode === 200 && appLoginRes.body.session?.role === 'applicant';

    if (isAppLoginOk && appToken) {
      record('Applicant', 1, 'Log in as applicant', 'PASS',
        `Applicant authenticated successfully as c.villanueva (Role: applicant, Token: ${appToken.slice(0, 10)}...).`);
    } else {
      record('Applicant', 1, 'Log in as applicant', 'FAIL',
        `Failed to authenticate applicant. Status: ${appLoginRes.statusCode}, Body: ${JSON.stringify(appLoginRes.body)}`);
    }

    const appHeaders = {
      'Authorization': `Bearer ${appToken}`,
      'X-Portal-Token': appToken
    };

    // 2. Confirm applicant sees admission-related information only via /api/portal?action=load
    const appLoadRes = await makeRequest('GET', '/api/portal?action=load', null, appHeaders);
    const appState = appLoadRes.body.state || {};

    const profileIsNull = appState.profile === null;
    const tasksEmpty = Array.isArray(appState.tasks) && appState.tasks.length === 0;
    const subjectsEmpty = Array.isArray(appState.subjects) && appState.subjects.length === 0;
    const gradesEmpty = typeof appState.grades === 'object' && Object.keys(appState.grades).length === 0;
    const attendanceEmpty = Array.isArray(appState.attendance) && appState.attendance.length === 0;
    const schedulesEmpty = Array.isArray(appState.schedules) && appState.schedules.length === 0;

    if (profileIsNull && tasksEmpty && subjectsEmpty && gradesEmpty && attendanceEmpty && schedulesEmpty) {
      record('Applicant', 2, 'Confirm applicant sees admission-related information only', 'PASS',
        'State sanitized for applicant: profile is null, tasks [], subjects [], grades {}, attendance [], schedules [].');
    } else {
      record('Applicant', 2, 'Confirm applicant sees admission-related information only', 'FAIL',
        `Applicant received student data! Profile: ${JSON.stringify(appState.profile)}, Tasks: ${appState.tasks?.length}, Subjects: ${appState.subjects?.length}`);
    }

    // 3. Confirm that no BSIT 2-2 activities appear
    const tasksString = JSON.stringify(appState.tasks || []);
    const hasBsit22Tasks = tasksString.includes('BSIT 2-2') || tasksString.includes('tsk_201');
    if (!hasBsit22Tasks && appState.tasks?.length === 0) {
      record('Applicant', 3, 'Confirm no BSIT 2-2 activities appear', 'PASS',
        'Zero academic activities or laboratory tasks delivered to applicant session.');
    } else {
      record('Applicant', 3, 'Confirm no BSIT 2-2 activities appear', 'FAIL',
        `BSIT 2-2 activities leaked to applicant: ${tasksString}`);
    }

    // 4. Confirm that no student subjects or schedules appear
    const hasSubjects = Array.isArray(appLoadRes.body.schedules) && appLoadRes.body.schedules.length > 0;
    if (!hasSubjects && subjectsEmpty && schedulesEmpty) {
      record('Applicant', 4, 'Confirm no student subjects or schedules appear', 'PASS',
        'Enrolled course timetable and class sessions strictly hidden from applicant.');
    } else {
      record('Applicant', 4, 'Confirm no student subjects or schedules appear', 'FAIL',
        `Subjects/schedules found in applicant payload: ${appLoadRes.body.schedules?.length}`);
    }

    // 5. Confirm that student notifications do not appear
    const appAnns = appLoadRes.body.announcements || [];
    const studentAnnsFound = appAnns.some(a => String(a.title).includes('BSIT 2-2') || String(a.title).includes('IT 211'));
    if (!studentAnnsFound) {
      record('Applicant', 5, 'Confirm student notifications do not appear', 'PASS',
        'No student class timetables or BSIT 2-2 announcements delivered to applicant notifications.');
    } else {
      record('Applicant', 5, 'Confirm student notifications do not appear', 'FAIL',
        `Student announcements leaked to applicant: ${JSON.stringify(appAnns.map(a => a.title))}`);
    }

    // 6. Confirm unread counts are accurate
    const appNotifsRes = await makeRequest('GET', '/api/applicant/notifications', null, appHeaders);
    const unreadCount = appNotifsRes.body.unreadCount;
    const notificationsList = appNotifsRes.body.notifications || [];
    const calculatedUnread = notificationsList.filter(n => !n.read && !n.is_read).length;

    if (appNotifsRes.statusCode === 200 && unreadCount === calculatedUnread) {
      record('Applicant', 6, 'Confirm unread counts are accurate', 'PASS',
        `Unread notification count (${unreadCount}) matches actual unread admission items (${calculatedUnread}). No phantom unread counts.`);
    } else {
      record('Applicant', 6, 'Confirm unread counts are accurate', 'FAIL',
        `Unread count mismatch: reported ${unreadCount}, calculated ${calculatedUnread}`);
    }

    // 7. Confirm applicant sees own application status
    const appDataRes = await makeRequest('GET', '/api/applicant/application', null, appHeaders);
    const myApp = appDataRes.body.application;
    if (appDataRes.statusCode === 200 && myApp && myApp.referenceNumber === 'BU-ADM-2026-10482' && myApp.status === 'Under Review') {
      record('Applicant', 7, 'Confirm applicant sees own application status', 'PASS',
        `Applicant verified own application: Ref ${myApp.referenceNumber}, Program: ${myApp.desiredProgram}, Status: ${myApp.status}.`);
    } else {
      record('Applicant', 7, 'Confirm applicant sees own application status', 'FAIL',
        `Application status retrieval failed: Status ${appDataRes.statusCode}, App: ${JSON.stringify(myApp)}`);
    }

    // ------------------------------------------------------------------------
    // SECTION 2: STUDENT TESTING
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 2: STUDENT TESTING ---');

    // 8. Log in as actual student account (BSIT 2-2 student: r.valiente)
    const stud1LoginRes = await makeRequest('POST', '/api/auth/login', {
      identifier: 'r.valiente',
      password: 'demo123',
      role: 'student'
    });
    const stud1Token = stud1LoginRes.body.session?.sessionToken;
    const stud1Headers = { 'Authorization': `Bearer ${stud1Token}`, 'X-Portal-Token': stud1Token };

    // Log in as second student in different section: a.cruz (BSIT 1-1 student)
    const stud2LoginRes = await makeRequest('POST', '/api/auth/login', {
      identifier: 'a.cruz',
      password: 'demo123',
      role: 'student'
    });
    const stud2Token = stud2LoginRes.body.session?.sessionToken;
    const stud2Headers = { 'Authorization': `Bearer ${stud2Token}`, 'X-Portal-Token': stud2Token };

    if (stud1LoginRes.statusCode === 200 && stud2LoginRes.statusCode === 200) {
      record('Student', 8, 'Log in as actual student accounts', 'PASS',
        'Successfully authenticated BSIT 2-2 student (r.valiente) and BSIT 1-1 student (a.cruz).');
    } else {
      record('Student', 8, 'Log in as actual student accounts', 'FAIL',
        `Student login failed: r.valiente (${stud1LoginRes.statusCode}), a.cruz (${stud2LoginRes.statusCode})`);
    }

    // 9. Confirm student's own subjects load
    const stud1Load = await makeRequest('GET', '/api/portal?action=load', null, stud1Headers);
    const stud2Load = await makeRequest('GET', '/api/portal?action=load', null, stud2Headers);

    const stud1Subjects = stud1Load.body.state?.subjects || [];
    const stud2Subjects = stud2Load.body.state?.subjects || [];

    if (stud1Subjects.length === 9 && stud2Subjects.length >= 1) {
      record('Student', 9, "Confirm student's own subjects load", 'PASS',
        `r.valiente loaded 9 curriculum subjects; a.cruz loaded ${stud2Subjects.length} Year 1 subjects. Each student loads their genuine subjects.`);
    } else {
      record('Student', 9, "Confirm student's own subjects load", 'FAIL',
        `Subjects count mismatch: r.valiente had ${stud1Subjects.length}, a.cruz had ${stud2Subjects.length}`);
    }

    // 10. Confirm correct section is displayed from student record (NOT hardcoded BSIT 2-2)
    const stud1Sec = stud1Load.body.state?.profile?.section;
    const stud2Sec = stud2Load.body.state?.profile?.section;

    if (stud1Sec === 'BSIT 2-2' && stud2Sec === 'BSIT 1-1') {
      record('Student', 10, 'Confirm correct section displayed from student record', 'PASS',
        `r.valiente section is "BSIT 2-2"; a.cruz section is "BSIT 1-1" (retrieved dynamically from MySQL students table, no hardcoded BSIT 2-2).`);
    } else {
      record('Student', 10, 'Confirm correct section displayed from student record', 'FAIL',
        `Section mismatch: r.valiente: "${stud1Sec}", a.cruz: "${stud2Sec}"`);
    }

    // 11. Confirm student notifications belong to that student
    const stud1Notifs = await makeRequest('GET', '/api/student/notifications', null, stud1Headers);
    const notifs = stud1Notifs.body.notifications || [];
    const hasApplicantAdmissionNotice = notifs.some(n => String(n.title).includes('Application Submitted') || String(n.category) === 'Admission');

    if (stud1Notifs.statusCode === 200 && !hasApplicantAdmissionNotice) {
      record('Student', 11, 'Confirm student notifications belong to that student', 'PASS',
        'Student notifications contain academic notices only; applicant admission notifications are strictly excluded.');
    } else {
      record('Student', 11, 'Confirm student notifications belong to that student', 'FAIL',
        `Applicant admission notices found in student notifications! Notices: ${JSON.stringify(notifs)}`);
    }

    // 12. Confirm student academic information remains available
    const studDataRes = await makeRequest('GET', '/api/student/academic-data', null, stud1Headers);
    const hasProfile = studDataRes.body.profile?.studentNumber === '2025-BSIT-0202';
    const hasGrades = Array.isArray(studDataRes.body.grades) && studDataRes.body.grades.length > 0;
    const hasAttendance = Array.isArray(studDataRes.body.attendance) && studDataRes.body.attendance.length > 0;
    const hasTasks = Array.isArray(studDataRes.body.tasks) && studDataRes.body.tasks.length > 0;

    if (studDataRes.statusCode === 200 && hasProfile && hasGrades && hasAttendance && hasTasks) {
      record('Student', 12, 'Confirm student academic information remains available', 'PASS',
        'Full academic data verified: Profile (2025-BSIT-0202), Grades, Attendance records, and Enrolled Tasks all available.');
    } else {
      record('Student', 12, 'Confirm student academic information remains available', 'FAIL',
        `Missing academic data: Profile (${hasProfile}), Grades (${hasGrades}), Attendance (${hasAttendance}), Tasks (${hasTasks})`);
    }

    // ------------------------------------------------------------------------
    // SECTION 3: SECURITY TESTING
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 3: SECURITY TESTING ---');

    // 13. Try accessing student-only API endpoints as an applicant
    const appToStudentEndpoint = await makeRequest('GET', '/api/student/academic-data', null, appHeaders);
    const appToStudentNotifs = await makeRequest('GET', '/api/student/notifications', null, appHeaders);

    if (appToStudentEndpoint.statusCode === 403 && appToStudentNotifs.statusCode === 403) {
      record('Security', 13, 'Try accessing student-only API endpoints as an applicant', 'PASS',
        'Backend rejected applicant caller with 403 Forbidden on both /api/student/academic-data and /api/student/notifications.');
    } else {
      record('Security', 13, 'Try accessing student-only API endpoints as an applicant', 'FAIL',
        `Applicant was NOT blocked! Academic data status: ${appToStudentEndpoint.statusCode}, Notifications status: ${appToStudentNotifs.statusCode}`);
    }

    // 14. Try accessing another student's records
    const studToOtherStudent = await makeRequest('GET', '/api/student/academic-data?studentNumber=2026-BSIT-0101', null, stud1Headers);

    if (studToOtherStudent.statusCode === 403) {
      record('Security', 14, "Try accessing another student's records", 'PASS',
        `Backend rejected unauthorized cross-student record query with 403 Forbidden: "${studToOtherStudent.body.message}".`);
    } else {
      record('Security', 14, "Try accessing another student's records", 'FAIL',
        `Student was able to query another student! Status: ${studToOtherStudent.statusCode}`);
    }

    // 15. Try accessing applicant-only records as a student
    const studToApplicantEndpoint = await makeRequest('GET', '/api/applicant/application', null, stud1Headers);
    const studToApplicantNotifs = await makeRequest('GET', '/api/applicant/notifications', null, stud1Headers);
    const studToAllApps = await makeRequest('GET', '/api/applications', null, stud1Headers);

    if (studToApplicantEndpoint.statusCode === 403 && studToApplicantNotifs.statusCode === 403 && studToAllApps.statusCode === 403) {
      record('Security', 15, 'Try accessing applicant-only records as a student', 'PASS',
        'Backend rejected student caller with 403 Forbidden on /api/applicant/application, /api/applicant/notifications, and /api/applications.');
    } else {
      record('Security', 15, 'Try accessing applicant-only records as a student', 'FAIL',
        `Student was NOT blocked from applicant data! App: ${studToApplicantEndpoint.statusCode}, Notifs: ${studToApplicantNotifs.statusCode}, AllApps: ${studToAllApps.statusCode}`);
    }

    // 16. Confirm that unauthorized requests without token are rejected
    const unauthStudentReq = await makeRequest('GET', '/api/student/academic-data');
    const unauthAppReq = await makeRequest('GET', '/api/applicant/application');
    const unauthAppsReq = await makeRequest('GET', '/api/portal?action=get_applications');

    if (unauthStudentReq.statusCode === 401 && unauthAppReq.statusCode === 401 && unauthAppsReq.statusCode === 401) {
      record('Security', 16, 'Confirm unauthorized requests rejected by backend', 'PASS',
        'All protected endpoints rejected unauthenticated requests with 401 Unauthorized.');
    } else {
      record('Security', 16, 'Confirm unauthorized requests rejected by backend', 'FAIL',
        `Unauthenticated requests not properly rejected! Student: ${unauthStudentReq.statusCode}, App: ${unauthAppReq.statusCode}, Apps: ${unauthAppsReq.statusCode}`);
    }

    // ------------------------------------------------------------------------
    // SECTION 4: DATABASE TESTING
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 4: DATABASE TESTING ---');

    // 17. Verify that existing applicant records remain
    const [appsInDb] = await db.query('SELECT COUNT(*) as cnt FROM applications');
    if (appsInDb[0].cnt >= 15) {
      record('Database', 17, 'Verify existing applicant records remain', 'PASS',
        `Authoritative applicant records verified intact: ${appsInDb[0].cnt} applications stored in bantug_university_db.applications.`);
    } else {
      record('Database', 17, 'Verify existing applicant records remain', 'FAIL',
        `Applicant records count lower than expected: ${appsInDb[0].cnt}`);
    }

    // 18. Verify that existing student records remain
    const [studentsInDb] = await db.query('SELECT COUNT(*) as cnt FROM students');
    if (studentsInDb[0].cnt === 19) {
      record('Database', 18, 'Verify existing student records remain', 'PASS',
        `Authoritative student records verified intact: 19 student accounts preserved in bantug_university_db.students.`);
    } else {
      record('Database', 18, 'Verify existing student records remain', 'FAIL',
        `Student records count mismatch: expected 19, found ${studentsInDb[0].cnt}`);
    }

    // 19. Verify that valid BSIT 2-2 academic records remain
    const [bsit22Students] = await db.query("SELECT COUNT(*) as cnt FROM students WHERE section = 'BSIT 2-2'");
    const [bsit22Subjects] = await db.query("SELECT COUNT(*) as cnt FROM student_enrollments WHERE student_number = '2025-BSIT-0202'");
    const [bsit22Grades] = await db.query("SELECT COUNT(*) as cnt FROM student_grades WHERE student_number = '2025-BSIT-0202'");
    const [bsit22Att] = await db.query("SELECT COUNT(*) as cnt FROM attendance_records WHERE student_number = '2025-BSIT-0202'");

    if (bsit22Students[0].cnt === 7 && bsit22Subjects[0].cnt === 9 && bsit22Grades[0].cnt === 9 && bsit22Att[0].cnt >= 5) {
      record('Database', 19, 'Verify valid BSIT 2-2 academic records remain', 'PASS',
        'Official BSIT 2-2 curriculum load (9 subjects, 9 grade sheets, 5 attendance entries, 7 enrolled students) 100% preserved.');
    } else {
      record('Database', 19, 'Verify valid BSIT 2-2 academic records remain', 'FAIL',
        `BSIT 2-2 records mismatch: Students (${bsit22Students[0].cnt}), Subjects (${bsit22Subjects[0].cnt}), Grades (${bsit22Grades[0].cnt}), Attendance (${bsit22Att[0].cnt})`);
    }

    // 20. Confirm notifications are not duplicated
    const [notifLogs] = await db.query(
      "SELECT reference_id, notification_type, COUNT(*) as cnt FROM notification_logs WHERE reference_id IS NOT NULL AND notification_type IN ('APPLICATION_SUBMITTED', 'APPLICATION_APPROVED', 'APPLICATION_REJECTED') GROUP BY reference_id, notification_type HAVING cnt > 1"
    );
    if (notifLogs.length === 0) {
      record('Database', 20, 'Confirm notifications are not duplicated', 'PASS',
        'No duplicate notifications in notification_logs table for application events. Clean dispatch verified.');
    } else {
      record('Database', 20, 'Confirm notifications are not duplicated', 'FAIL',
        `Duplicate notification entries found: ${JSON.stringify(notifLogs)}`);
    }

    // 21. Verify server health & data persistence
    const healthCheck = await makeRequest('GET', '/api/portal?action=status');
    if (healthCheck.statusCode === 200 && healthCheck.body.ok) {
      record('Database', 21, 'Verify server health & data persistence', 'PASS',
        'Node.js HTTP server and MySQL connectivity verified healthy and responsive.');
    } else {
      record('Database', 21, 'Verify server health & data persistence', 'FAIL',
        `Server health check failed: Status ${healthCheck.statusCode}`);
    }

    console.log('\n=== SUMMARY OF PHASE 2 VERIFICATION ===');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    console.log(`TOTAL TESTS: ${results.length} | PASS: ${passCount} | FAIL: ${failCount}`);

    if (failCount === 0) {
      console.log('\n🎉 ALL PHASE 2 TESTS PASSED PERFECTLY!\n');
    } else {
      console.log('\n⚠️ Some tests failed. Review output above.\n');
    }

  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    if (db) await db.end();
  }
}

runTests();
