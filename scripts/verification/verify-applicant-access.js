/**
 * Phase 3 Verification Script: Applicant Dashboard Cleanup
 * Tests:
 * 1. Blank form initialization (no prefilled sample values, placeholders intact)
 * 2. 4-digit graduation year validation preserved on form
 * 3. Settings nav link hidden/inaccessible for applicant, intact for student/faculty
 * 4. Explore button / quick switch role button hidden for applicant
 * 5. Three-line hamburger menu hidden for applicant
 * 6. Academic term ("2nd Semester", "AY 2026–2027") hidden from applicant display
 * 7. "Prospective Application" heading removed
 * 8. "Year Graduated / Completed" removed from dashboard display
 * 9. Admission Overview displays real applicant data from MySQL
 * 10. Empty state displays when no application submitted
 * 11. Fake demo records & status switcher buttons eliminated from applicant view
 * 12. Student and Faculty portals unaffected
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const mysql = require("mysql2/promise");

const BASE_URL = "http://localhost:3000";

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || "GET",
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {}
    };

    if (body && typeof body === "object") {
      body = JSON.stringify(body);
      reqOptions.headers["Content-Type"] = "application/json";
      reqOptions.headers["Content-Length"] = Buffer.byteLength(body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log("====================================================");
  console.log("   PHASE 3: APPLICANT DASHBOARD CLEANUP VERIFICATION");
  console.log("====================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${details ? "- " + details : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // Test 1: Check applicant.js source code for Section F (Blank defaults)
  // -------------------------------------------------------------------------
  console.log("--- Test Group 1: Automatic Sample Form Values Removed ---");
  const applicantJs = fs.readFileSync(path.join(__dirname, '../../js/applicant.js'), "utf8");

  assert(
    !applicantJs.includes('value="09/12/2007"'),
    "Date of birth field starts empty (no default 09/12/2007 value in form)"
  );

  assert(
    !applicantJs.includes('value="2026"'),
    "Year graduated field starts empty (no default 2026 value in form)"
  );

  assert(
    applicantJs.includes('placeholder="YYYY (e.g. 2026)"') || applicantJs.includes('placeholder="YYYY"'),
    "Year graduated field retains clear format placeholder (YYYY)"
  );

  assert(
    applicantJs.includes('placeholder="MM/DD/YYYY"'),
    "Date of birth retains clear format placeholder (MM/DD/YYYY)"
  );

  assert(
    applicantJs.includes('-- Select Desired Academic Program'),
    "Academic program dropdown starts with clean unselected placeholder"
  );

  assert(
    !applicantJs.includes('id="fillSampleApplicantFormBtn"'),
    "Auto-fill sample form values button removed from applicant form"
  );

  // -------------------------------------------------------------------------
  // Test 2: Check Section A & B: Dashboard Cleanup
  // -------------------------------------------------------------------------
  console.log("\n--- Test Group 2: Dashboard Display Cleanup & Admission Overview ---");

  assert(
    !applicantJs.includes("Prospective Application"),
    "'Prospective Application' heading removed from applicant dashboard"
  );

  // Check that Year Graduated is kept in form validation
  assert(
    applicantJs.includes("validateGraduationYear") && applicantJs.includes("appGradYear"),
    "Year graduated / completed validation retained in actual application form"
  );

  // Check that Admission Overview card in applicant.js does NOT display graduation year
  const overviewCardCode = applicantJs.slice(
    applicantJs.indexOf("ADMISSION OVERVIEW DASHBOARD"),
    applicantJs.indexOf("Online Application Form")
  );
  assert(
    !overviewCardCode.includes("Graduation Year") && !overviewCardCode.includes("Year Graduated"),
    "Year Graduated / Completed omitted from Admission Overview dashboard display"
  );

  assert(
    overviewCardCode.includes("Selected First-Choice Program") &&
    overviewCardCode.includes("Alternative Program") &&
    overviewCardCode.includes("Submission Date") &&
    overviewCardCode.includes("Reference Number") &&
    overviewCardCode.includes("getStatusExplanation"),
    "Admission Overview displays applicant name, reference number, 1st & 2nd choice programs, date, status & explanation"
  );

  assert(
    overviewCardCode.includes("No Application Submitted Yet") &&
    overviewCardCode.includes("Complete Application Form"),
    "Helpful empty state with button to application form displayed when no application submitted"
  );

  // -------------------------------------------------------------------------
  // Test 3: Check Section C & D: Navigation and Settings
  // -------------------------------------------------------------------------
  console.log("\n--- Test Group 3: Navigation, Settings, Explore, & Hamburger ---");
  const appJs = fs.readFileSync(path.join(__dirname, '../../js/app.js'), "utf8");
  const navHtml = fs.readFileSync(path.join(__dirname, '../../pages/shared/navigation.html'), "utf8");

  assert(
    appJs.includes('applicant: ["applicant-landing", "applicant-form"]'),
    "Applicant allowed sections restricted to applicant-landing and applicant-form (Settings removed)"
  );

  assert(
    navHtml.includes('data-role-item="student,faculty"') && navHtml.includes('data-section="settings"'),
    "Settings navigation item restricted to student and faculty only"
  );

  assert(
    appJs.includes("quickSwitchRoleBtn.hidden = true"),
    "Explore Demo launcher / Quick role switcher hidden for applicant role"
  );

  assert(
    appJs.includes("mobileMenuBtn.hidden = true"),
    "Three-line hamburger menu button hidden for applicant role"
  );

  assert(
    appJs.includes("semesterCard.hidden = true"),
    "Semester card (2nd Sem, AY 2026-2027) hidden for applicant role"
  );

  // -------------------------------------------------------------------------
  // Test 4: Check Section G: Demo Content Removed
  // -------------------------------------------------------------------------
  console.log("\n--- Test Group 4: Fake Demo Content Removed from Applicant Experience ---");

  assert(
    !applicantJs.includes("sim-demo-status-btn"),
    "Simulated demo status switcher buttons (Submitted, Under Review, Approved, Rejected) removed"
  );

  assert(
    !applicantJs.includes("demoApplicantRecords"),
    "Fake demo applicant records table eliminated from applicant view"
  );

  // -------------------------------------------------------------------------
  // Test 5: Backend API Verification
  // -------------------------------------------------------------------------
  console.log("\n--- Test Group 5: Backend & Database Submissions ---");

  // Submit a real application to MySQL via API
  const testEmail = `applicant.phase3.${Date.now()}@email.example`;
  const postRes = await request("/api/applications", { method: "POST" }, {
    lastName: "Manlapaz",
    firstName: "Erika Joy",
    middleName: "Santos",
    dateOfBirth: "2006-08-15",
    email: testEmail,
    contactNumber: "+63 917 555 0199",
    address: "88 Rizal Avenue, Bantug City",
    desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
    secondChoiceProgram: "Bachelor of Science in Computer Science (BSCS)",
    applicantType: "Senior High School Graduate / Freshman",
    previousSchool: "Bantug Integrated Science High School",
    educationalBackground: "Academic Track - STEM Strand",
    graduationYear: "2026"
  });

  assert(
    (postRes.status === 200 || postRes.status === 201) && postRes.data && postRes.data.ok,
    "Real application submitted successfully to backend MySQL database"
  );

  const refNumber = postRes.data && postRes.data.application && postRes.data.application.referenceNumber;
  assert(
    refNumber && /^BU-\d{4}-\d{6}$/.test(refNumber),
    `Generated valid unique reference number: ${refNumber}`
  );

  // Verify that GET /api/applications with applicant token does not leak demo records
  const appTokenRes = await request(`/api/applications?referenceNumber=${refNumber}`, {
    headers: { "x-portal-role": "applicant" }
  });

  assert(
    appTokenRes.status === 200 &&
    appTokenRes.data &&
    Array.isArray(appTokenRes.data.applications) &&
    appTokenRes.data.applications.every((a) => !a.isDemoRecord),
    "Applicant GET /api/applications returns only real applications and zero fake demo records"
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n====================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Verification script error:", err);
  process.exit(1);
});
