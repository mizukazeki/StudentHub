/**
 * ============================================================================
 * BANTUG UNIVERSITY – Student Portal System
 * PHASE 5 VERIFICATION SUITE: Student and Faculty Portal Cleanup
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

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: urlPath,
        method: 'GET'
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
    req.end();
  });
}

(async () => {
  console.log('===============================================================');
  console.log('  BANTUG UNIVERSITY - PHASE 5 PORTAL CLEANUP VERIFICATION      ');
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
  // TEST GROUP 1: PART A - STUDENT PORTAL CLEANUP
  // =========================================================================
  console.log('--- TEST GROUP 1: Student Portal Navigation & Dashboard Cleanup ---');
  const navHtmlPath = path.join(__dirname, '..', 'pages', 'shared', 'navigation.html');
  const navHtml = fs.readFileSync(navHtmlPath, 'utf8');

  // A1. Removed items from student navigation
  assert(
    !navHtml.includes('data-section="attendance"'),
    '1.1 Attendance navigation item is removed from Student Portal navigation'
  );
  assert(
    !navHtml.includes('data-section="tasks"'),
    '1.2 Task Manager navigation item is removed from Student Portal navigation'
  );

  // A3. Preserved items in student navigation
  assert(navHtml.includes('data-section="dashboard"'), '1.3 Dashboard is preserved in Student navigation');
  assert(navHtml.includes('data-section="profile"'), '1.4 My Profile is preserved in Student navigation');
  assert(navHtml.includes('data-section="subjects"'), '1.5 My Subjects is preserved in Student navigation');
  assert(navHtml.includes('data-section="schedule"'), '1.6 Class Schedule is preserved in Student navigation');
  assert(navHtml.includes('data-section="grades"'), '1.7 My Grades is preserved in Student navigation');
  assert(navHtml.includes('data-section="announcements"'), '1.8 Announcements is preserved in Student navigation');
  assert(navHtml.includes('data-section="resources"'), '1.9 Learning Resources is preserved in Student navigation');
  assert(navHtml.includes('data-section="settings"'), '1.10 Settings is preserved in Student navigation');

  // A2. Removed tech and demo descriptions from dashboard & footer
  const footerHtmlPath = path.join(__dirname, '..', 'partials', 'layout', 'footer.html');
  const footerHtml = fs.readFileSync(footerHtmlPath, 'utf8');
  assert(
    !footerHtml.includes('BSIT 2-2 Academic Project') && !footerHtml.includes('BSIT 2-2 Academic Project Demonstration'),
    '1.11 "BSIT 2-2 Academic Project Demonstration" is removed from layout footer'
  );
  assert(
    !footerHtml.includes('Vanilla JS') && !footerHtml.includes('localStorage'),
    '1.12 "HTML5 • CSS3 • Vanilla JS • localStorage" is removed from layout footer'
  );

  // Dashboard interface cleanup (pages/student/dashboard.html)
  const dashHtmlPath = path.join(__dirname, '..', 'pages', 'student', 'dashboard.html');
  const dashHtml = fs.readFileSync(dashHtmlPath, 'utf8');
  assert(
    !dashHtml.includes('dashTasksPreviewContainer') && !dashHtml.includes('Upcoming Assignments &amp; Tasks'),
    '1.13 Upcoming Assignments Widget is removed from Student Dashboard'
  );
  assert(
    !dashHtml.includes('dashAttSessionsMeta') && !dashHtml.includes('dashAttPctValue'),
    '1.14 Attendance Summary Widget is removed from Student Dashboard'
  );
  assert(
    dashHtml.includes('dashScheduleHeading') && dashHtml.includes('dashScheduleList'),
    '1.15 Today\'s & Upcoming Classes Widget is preserved on Student Dashboard'
  );
  assert(
    dashHtml.includes('dashSubjectsHeading') && dashHtml.includes('dashSubjectsPreviewContainer'),
    '1.16 My Subjects Summary Widget is preserved on Student Dashboard'
  );
  assert(
    dashHtml.includes('Academic Performance') && dashHtml.includes('dashPerfScore'),
    '1.17 Academic Performance Widget is preserved on Student Dashboard'
  );
  assert(
    dashHtml.includes('Recent Announcements') && dashHtml.includes('dashAnnouncementsPreviewContainer'),
    '1.18 Recent Announcements Widget is preserved on Student Dashboard'
  );

  // =========================================================================
  // TEST GROUP 2: PART B - FACULTY PORTAL CLEANUP
  // =========================================================================
  console.log('\n--- TEST GROUP 2: Faculty Portal Navigation & Application Cleanup ---');

  // B1. Removed items from faculty navigation
  assert(
    !navHtml.includes('data-section="faculty-attendance"'),
    '2.1 Attendance Management is removed from Faculty navigation'
  );
  assert(
    !navHtml.includes('data-section="faculty-tasks"'),
    '2.2 Assignment Management is removed from Faculty navigation'
  );

  // B3. Student Applications removed from regular sidebar
  assert(
    !navHtml.includes('data-section="faculty-applications"'),
    '2.3 Student Applications is removed from regular Faculty sidebar navigation'
  );

  // Preserved items in faculty navigation
  assert(navHtml.includes('data-section="faculty-dashboard"'), '2.4 Faculty Dashboard is preserved in Faculty navigation');
  assert(navHtml.includes('data-section="faculty-profile"'), '2.5 Faculty Profile is preserved in Faculty navigation');
  assert(navHtml.includes('data-section="faculty-classes"'), '2.6 My Classes & Schedule is preserved in Faculty navigation');
  assert(navHtml.includes('data-section="faculty-grades"'), '2.7 Grade Management is preserved in Faculty navigation');
  assert(navHtml.includes('data-section="faculty-announcements"'), '2.8 Faculty Announcements is preserved in Faculty navigation');

  // B2. Clean up faculty application page text
  const facJsPath = path.join(__dirname, '..', 'js', 'faculty.js');
  const facJs = fs.readFileSync(facJsPath, 'utf8');

  assert(
    facJs.includes('<h2>Student Applications</h2>'),
    '2.9 Application management page heading is cleanly set to "Student Applications"'
  );
  assert(
    !facJs.includes('MySQL Database Records'),
    '2.10 Technical description "(MySQL Database Records)" is removed from faculty view'
  );
  assert(
    !facJs.includes('Showing 17 of 17 application records') && !facJs.includes('application records. Select a new status to update MySQL'),
    '2.11 Technical message "Showing X of X application records" and "update MySQL immediately" removed'
  );

  // B3. Verify underlying application management functionality and accessibility
  assert(
    facJs.includes('function renderApplications()'),
    '2.12 renderApplications() function remains fully implemented'
  );
  assert(
    facJs.includes('data-fac-nav="faculty-applications"'),
    '2.13 Student Applications remains accessible from Faculty Dashboard Management Tools'
  );

  // Allowed sections check
  const appJsPath = path.join(__dirname, '..', 'js', 'app.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const roleAllowedMatch = appJs.match(/ROLE_ALLOWED_SECTIONS\s*=\s*\{([\s\S]*?)\n\s*\};/);
  const roleAllowedStr = roleAllowedMatch ? roleAllowedMatch[1] : '';
  const facultyRoleMatch = roleAllowedStr.match(/faculty:\s*\[([\s\S]*?)\]/);
  const facultySections = facultyRoleMatch ? facultyRoleMatch[1] : '';

  assert(
    facultySections.includes('"faculty-applications"') &&
    !facultySections.includes('"faculty-attendance"') &&
    !facultySections.includes('"faculty-tasks"'),
    '2.14 ROLE_ALLOWED_SECTIONS retains "faculty-applications" for authorized faculty while removing attendance and tasks'
  );

  // =========================================================================
  // TEST GROUP 3: PART C - STUDENT SETTINGS PRESERVATION
  // =========================================================================
  console.log('\n--- TEST GROUP 3: Student Settings Preservation & Functionality ---');
  const settingsJsPath = path.join(__dirname, '..', 'js', 'settings.js');
  const settingsJs = fs.readFileSync(settingsJsPath, 'utf8');

  // C1. Account Preferences
  assert(settingsJs.includes('Account Preferences'), '3.1 Section heading "Account Preferences" is preserved');
  assert(settingsJs.includes('goFullProfileBtn'), '3.2 Full Student Profile link is preserved');
  assert(
    settingsJs.includes('Review your connected portal account details and update your display name or current academic term.'),
    '3.3 Exact description "Review your connected portal account details..." is preserved'
  );
  assert(settingsJs.includes('Account ID'), '3.4 Field "Account ID" is preserved');
  assert(settingsJs.includes('Email Address'), '3.5 Field "Email Address" is preserved');
  assert(settingsJs.includes('Section / Affiliation'), '3.6 Field "Section / Affiliation" is preserved');
  assert(settingsJs.includes('Display Name'), '3.7 Field "Display Name *" is preserved');
  assert(settingsJs.includes('Current Academic Term'), '3.8 Field "Current Academic Term *" is preserved');
  assert(settingsJs.includes('cancelQuickPrefsBtn'), '3.9 Cancel button is preserved');
  assert(settingsJs.includes('Save Academic Preferences'), '3.10 Save Academic Preferences button is preserved');

  // C2. Security & Session Information
  assert(
    settingsJs.includes('Security &amp; Session Information') || settingsJs.includes('Security & Session Information'),
    '3.11 Section heading "Security & Session Information" is preserved'
  );
  assert(
    settingsJs.includes('Current authentication session status and role-based access summary. Passwords are never displayed in portal settings.'),
    '3.12 Exact description "Current authentication session status..." is preserved'
  );
  assert(settingsJs.includes('Active Session'), '3.13 "Active Session" status is preserved');
  assert(settingsJs.includes('Signed-In Role'), '3.14 "Signed-In Role" is preserved');
  assert(settingsJs.includes('Session Account'), '3.15 "Session Account" is preserved');
  assert(settingsJs.includes('Switch Portal Role'), '3.16 "Switch Portal Role" is preserved');
  assert(settingsJs.includes('Sign Out Session'), '3.17 "Sign Out Session" is preserved');

  // C3. BANTUG UNIVERSITY Logo Configuration
  assert(settingsJs.includes('BANTUG UNIVERSITY Logo Configuration'), '3.18 "BANTUG UNIVERSITY Logo Configuration" is preserved');
  assert(settingsJs.includes('Aspect Ratio Preserved'), '3.19 "Aspect Ratio Preserved" badge is preserved');
  assert(settingsJs.includes('assets/images/bantug-university-logo.png'), '3.20 Default path "assets/images/bantug-university-logo.png" is preserved');
  assert(settingsJs.includes('Active Logo Source'), '3.21 "Active Logo Source" is preserved');
  assert(settingsJs.includes('Select Logo Image File'), '3.22 "Select Logo Image File" is preserved');
  assert(settingsJs.includes('Use Default Logo Path'), '3.23 "Use Default Logo Path" is preserved');

  // C4. Browser localStorage Data Management
  assert(settingsJs.includes('Browser localStorage Data Management'), '3.24 "Browser localStorage Data Management" is preserved');
  assert(settingsJs.includes('bantug_university_portal_v2'), '3.25 Storage key "bantug_university_portal_v2" is preserved');
  assert(settingsJs.includes('Export JSON Backup'), '3.26 "Export JSON Backup" button is preserved');
  assert(settingsJs.includes('Clear Demonstration Data'), '3.27 "Clear Demonstration Data" button is preserved');
  assert(settingsJs.includes('Reset to Default BSIT 2-2 Data'), '3.28 "Reset to Default BSIT 2-2 Data" button is preserved');
  assert(settingsJs.includes('Demonstration Data Actions'), '3.29 Controls clearly identified as Demonstration Data Actions');

  // =========================================================================
  // TEST GROUP 4: BACKEND & DATABASE INTEGRITY
  // =========================================================================
  console.log('\n--- TEST GROUP 4: Database & Backend Safety ---');

  // 4.1 Test authentication endpoint for Student
  const studentAuth = await postJson('/api/auth/login', { identifier: 'r.valiente', password: 'demo123' });
  assert(
    studentAuth.status === 200 && studentAuth.data?.session?.role === 'student',
    '4.1 Student authentication via backend works cleanly'
  );

  // 4.2 Test authentication endpoint for Faculty
  const facultyAuth = await postJson('/api/auth/login', { identifier: 'f.somera', password: 'faculty123' });
  assert(
    facultyAuth.status === 200 && facultyAuth.data?.session?.role === 'faculty',
    '4.2 Faculty authentication via backend works cleanly'
  );

  // 4.3 Verify application API endpoint still works
  const appsRes = await getJson('/api/applications');
  assert(
    appsRes.status === 200 && Array.isArray(appsRes.data?.applications) && appsRes.data.applications.length > 0,
    `4.3 GET /api/applications returns valid records (Total: ${appsRes.data?.applications?.length || 0})`
  );

  // 4.4 Verify MySQL database row counts
  const db = await mysql.createConnection(DB_CONFIG);
  try {
    const [userCnt] = await db.query('SELECT COUNT(*) AS cnt FROM `users`');
    const [studCnt] = await db.query('SELECT COUNT(*) AS cnt FROM `students`');
    const [facCnt] = await db.query('SELECT COUNT(*) AS cnt FROM `faculty`');
    const [subCnt] = await db.query('SELECT COUNT(*) AS cnt FROM `subjects`');
    const [appCnt] = await db.query('SELECT COUNT(*) AS cnt FROM `applications`');

    assert(Number(userCnt[0].cnt) >= 45, `4.4 Users table intact (${userCnt[0].cnt} users)`);
    assert(Number(studCnt[0].cnt) >= 15, `4.5 Students table intact (${studCnt[0].cnt} students)`);
    assert(Number(facCnt[0].cnt) >= 15, `4.6 Faculty table intact (${facCnt[0].cnt} faculty)`);
    assert(Number(subCnt[0].cnt) >= 9, `4.7 Subjects table intact (${subCnt[0].cnt} subjects)`);
    assert(Number(appCnt[0].cnt) >= 15, `4.8 Applications table intact (${appCnt[0].cnt} applications)`);
  } finally {
    await db.end();
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log(`PHASE 5 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
})();
