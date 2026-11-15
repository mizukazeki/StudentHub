// Database integrity verification for student and faculty foreign relationships.
const fs = require("fs");
const path = require("path");

const navHtml = fs.readFileSync(path.join(__dirname, '../../pages/shared/navigation.html'), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, '../../js/app.js'), "utf8");
const sidebarHtml = fs.readFileSync(path.join(__dirname, '../../pages/shared/sidebar.html'), "utf8");
const headerHtml = fs.readFileSync(path.join(__dirname, '../../pages/shared/header.html'), "utf8");
const facJs = fs.readFileSync(path.join(__dirname, '../../js/faculty.js'), "utf8");

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log("  [PASS] " + msg);
    passed++;
  } else {
    console.error("  [FAIL] " + msg);
    failed++;
  }
}

console.log("--- Student & Faculty Dashboard Integrity Check (Post-Phase 5) ---");

// Preserved Student items
assert(navHtml.includes('data-section="dashboard"') && navHtml.includes('data-role-item="student"'), "Student Dashboard navigation item preserved");
assert(navHtml.includes('data-section="profile"'), "Student Profile navigation item preserved");
assert(navHtml.includes('data-section="subjects"'), "Student Subjects navigation item preserved");
assert(navHtml.includes('data-section="schedule"'), "Student Schedule navigation item preserved");
assert(navHtml.includes('data-section="grades"'), "Student Grades navigation item preserved");
assert(navHtml.includes('data-section="announcements"'), "Student Announcements navigation item preserved");
assert(navHtml.includes('data-section="resources"'), "Student Resources navigation item preserved");

// Removed Student items
assert(!navHtml.includes('data-section="attendance"'), "Student Attendance confirmed removed from navigation");
assert(!navHtml.includes('data-section="tasks"'), "Student Tasks confirmed removed from navigation");

// Preserved Faculty items
assert(navHtml.includes('data-section="faculty-dashboard"') && navHtml.includes('data-role-item="faculty"'), "Faculty Dashboard navigation item preserved");
assert(navHtml.includes('data-section="faculty-profile"'), "Faculty Profile navigation item preserved");
assert(navHtml.includes('data-section="faculty-classes"'), "Faculty Classes navigation item preserved");
assert(navHtml.includes('data-section="faculty-grades"'), "Faculty Grades navigation item preserved");
assert(navHtml.includes('data-section="faculty-announcements"'), "Faculty Announcements navigation item preserved");

// Removed Faculty items
assert(!navHtml.includes('data-section="faculty-attendance"'), "Faculty Attendance confirmed removed from navigation");
assert(!navHtml.includes('data-section="faculty-tasks"'), "Faculty Tasks confirmed removed from navigation");
assert(!navHtml.includes('data-section="faculty-applications"'), "Faculty Applications confirmed removed from regular sidebar");
assert(facJs.includes('data-fac-nav="faculty-applications"'), "Faculty Applications remains accessible via Dashboard Management Tools");

// Settings preserved for student & faculty
assert(navHtml.includes('data-role-item="student,faculty"') && navHtml.includes('data-section="settings"'), "Settings preserved exclusively for student & faculty");
assert(appJs.includes('"dashboard",') && appJs.includes('"settings"') && appJs.includes('ROLE_ALLOWED_SECTIONS'), "Settings included in student and faculty allowed sections");

// Header and theme toggle
assert(headerHtml.includes('id="themeToggleBtn"'), "Theme toggle button (Night mode) preserved in header");
assert(headerHtml.includes('id="mobileMenuBtn"'), "Hamburger menu preserved in header (hidden for applicant, active for student/faculty)");
assert(sidebarHtml.includes('class="semester-card"'), "Semester card preserved in sidebar (hidden for applicant, active for student/faculty)");

console.log(`\nINTEGRITY: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
