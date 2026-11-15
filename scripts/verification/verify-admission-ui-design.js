/**
 * ============================================================================
 * BANTUG UNIVERSITY - Admission Application UI Design Verification Test
 * Verifies:
 *   1. CSS color system and high-contrast text visibility
 *   2. Input field styling (white background, dark text, subtle borders, focus)
 *   3. Header and Instructions section positioning (no negative overlap)
 *   4. Main Form Card presentation and responsive design
 *   5. End-to-end form validation and application submission functionality
 * ============================================================================
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { DB_CONFIG } = require('../../database/seed');

const BASE_URL = "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, description, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${description} -> ${details}`);
  }
}

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const postPayload = postData ? (typeof postData === "string" ? postData : JSON.stringify(postData)) : null;
    const reqHeaders = { ...(options.headers || {}) };
    if (postPayload) {
      if (!reqHeaders["Content-Type"]) reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(postPayload);
    }

    const req = http.request({
      hostname: "localhost",
      port: 3000,
      path: options.path,
      method: options.method || "GET",
      headers: reqHeaders
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on("error", reject);
    if (postPayload) {
      req.write(postPayload);
    }
    req.end();
  });
}

async function runTests() {
  console.log("============================================================================");
  console.log(" BANTUG UNIVERSITY - ADMISSION APPLICATION UI DESIGN VERIFICATION");
  console.log("============================================================================\n");

  // 1. INSPECT CSS RULES IN APPLICANT.CSS
  console.log("--- 1. CSS FILE AND COLOR SYSTEM VERIFICATION ---");
  const applicantCss = fs.readFileSync(path.join(__dirname, '../../css/pages/applicant.css'), "utf8");

  // Check Color Palette presence
  assert(applicantCss.includes("#172B55"), "Primary Navy #172B55 is defined and applied");
  assert(applicantCss.includes("#234B8C"), "Secondary Blue #234B8C is defined and applied");
  assert(applicantCss.includes("#3478D4"), "Accent Blue #3478D4 is defined and applied for focus states");
  assert(applicantCss.includes("#F5F7FB"), "Main Background #F5F7FB is defined and applied");
  assert(applicantCss.includes("#FFFFFF"), "Card Background #FFFFFF is defined and applied");
  assert(applicantCss.includes("#202B3C"), "Main Text #202B3C is defined and applied for readable dark text");
  assert(applicantCss.includes("#64748B"), "Secondary Text #64748B is defined and applied for helper text");
  assert(applicantCss.includes("#CBD5E1"), "Input Border #CBD5E1 is defined and applied");
  assert(applicantCss.includes("#DC2626"), "Error/Required color #DC2626 is defined and applied");

  // 2. CHECK INPUT FIELD STYLING RULES
  console.log("\n--- 2. INPUT FIELD DESIGN VERIFICATION ---");
  const hasInputBg = /\.public-admission-screen \.form-control[\s\S]*?background-color:\s*#FFFFFF/i.test(applicantCss);
  assert(hasInputBg, "Form control inputs have explicit white background (#FFFFFF)");

  const hasInputColor = /\.public-admission-screen \.form-control[\s\S]*?color:\s*#202B3C/i.test(applicantCss);
  assert(hasInputColor, "Form control inputs have dark readable text color (#202B3C)");

  const hasInputBorder = /\.public-admission-screen \.form-control[\s\S]*?border:\s*1px solid #CBD5E1/i.test(applicantCss);
  assert(hasInputBorder, "Form control inputs have subtle gray borders (#CBD5E1)");

  const hasInputFocus = /\.public-admission-screen \.form-control:focus[\s\S]*?border-color:\s*#3478D4/i.test(applicantCss);
  assert(hasInputFocus, "Form control focus state has clear accent blue border (#3478D4)");

  const hasPlaceholder = /\.public-admission-screen \.form-control::placeholder[\s\S]*?color:\s*#94A3B8/i.test(applicantCss);
  assert(hasPlaceholder, "Form placeholder styling has visible text color (#94A3B8)");

  const hasPrefixStyling = /\.public-admission-screen \.input-fixed-prefix[\s\S]*?background:\s*#F1F5F9/i.test(applicantCss);
  assert(hasPrefixStyling, "Philippine mobile number prefix (+63) has clean light background (#F1F5F9)");

  // 3. CHECK HEADER & INSTRUCTIONS SECTION (NO NEGATIVE OVERLAP)
  console.log("\n--- 3. HEADER & INSTRUCTIONS SECTION VERIFICATION ---");
  const hasNoNegativeMargin = !applicantCss.includes("margin: -24px auto 40px");
  assert(hasNoNegativeMargin, "Awkward negative margin overlap (-24px) has been completely removed");

  const hasIntentionalSpacing = /\.public-main-container[\s\S]*?margin:\s*32px auto 48px/i.test(applicantCss);
  assert(hasIntentionalSpacing, "Main container uses intentional vertical spacing (32px auto 48px)");

  const hasInstructionCard = /\.public-instructions-card/i.test(applicantCss);
  assert(hasInstructionCard, "Application instructions box has dedicated styling (.public-instructions-card)");

  const hasInstructionAccent = /\.public-instructions-card[\s\S]*?border-left:\s*5px solid #234B8C/i.test(applicantCss);
  assert(hasInstructionAccent, "Instructions box features clean blue accent border (border-left: 5px solid #234B8C)");

  // 4. CHECK APPLICATION FORM CARD
  console.log("\n--- 4. APPLICATION FORM CARD PRESENTATION ---");
  const hasCardBg = /\.public-form-card[\s\S]*?background:\s*#FFFFFF/i.test(applicantCss);
  assert(hasCardBg, "Application form card has white background (#FFFFFF)");

  const hasCardTitle = /\.public-card-title[\s\S]*?color:\s*#172B55/i.test(applicantCss);
  assert(hasCardTitle, "Form card title is rendered in dark navy (#172B55)");

  const hasSectionH3 = /\.public-admission-screen \.form-section-divider h3[\s\S]*?color:\s*#172B55/i.test(applicantCss);
  assert(hasSectionH3, "Section headings (h3) are rendered in dark navy (#172B55)");

  const hasLabelColor = /\.public-admission-screen \.form-label[\s\S]*?color:\s*#202B3C/i.test(applicantCss);
  assert(hasLabelColor, "Form field labels are rendered in readable dark gray (#202B3C)");

  const hasReqStar = /\.public-admission-screen \.req[\s\S]*?color:\s*#DC2626/i.test(applicantCss);
  assert(hasReqStar, "Required field asterisks (*) are rendered in bold red (#DC2626)");

  const hasHints = /\.public-admission-screen \.form-hint[\s\S]*?color:\s*#64748B/i.test(applicantCss);
  assert(hasHints, "Helper hint text is rendered in readable medium gray (#64748B)");

  // 5. RESPONSIVE DESIGN RULES
  console.log("\n--- 5. RESPONSIVE DESIGN VERIFICATION ---");
  const hasMobileBreakpoint = /@media\s*\(max-width:\s*768px\)[\s\S]*?\.form-grid[\s\S]*?grid-template-columns:\s*1fr/i.test(applicantCss);
  assert(hasMobileBreakpoint, "Mobile responsive breakpoint (<= 768px) collapses form fields into single column");

  const hasNameGridMobile = /@media\s*\(max-width:\s*768px\)[\s\S]*?\.name-grid-3[\s\S]*?grid-template-columns:\s*1fr/i.test(applicantCss);
  assert(hasNameGridMobile, "Mobile responsive breakpoint collapses 3-column name grid into single column");

  // 6. FUNCTIONALITY & LIVE APPLICATION TEST
  console.log("\n--- 6. APPLICATION FUNCTIONALITY & SUBMISSION VERIFICATION ---");

  // Verify /admission.html is served successfully
  const pageRes = await httpRequest({ path: "/admission.html" });
  assert(pageRes.statusCode === 200, "GET /admission.html returns 200 OK");
  assert(pageRes.data.includes('data-partial="pages/admission.html"'), "admission.html mounts pages/admission.html partial");

  const partialRes = await httpRequest({ path: "/pages/admission.html" });
  assert(partialRes.statusCode === 200, "GET /pages/admission.html returns 200 OK");
  assert(partialRes.data.includes("Undergraduate Online Admission Application"), "Page partial contains official university admission heading");
  assert(partialRes.data.includes("Academic Year 2026"), "Page partial contains Academic Year indicator");
  assert(partialRes.data.includes("Freshman Admission Application Form"), "Page partial contains form card title");

  // Verify Validation: Reject Invalid DOB (Future date)
  const futureDobRes = await httpRequest({
    path: "/api/applications",
    method: "POST"
  }, {
    firstName: "Test",
    lastName: "Applicant",
    email: `future.dob.${Date.now()}@example.com`,
    dateOfBirth: "12/31/2099",
    contactNumber: "+63 912 345 6789",
    address: "123 Test St",
    desiredProgram: "BS Information Technology",
    yearLevel: "Year 1"
  });
  assert(futureDobRes.statusCode === 400, "Validation rejects future Date of Birth with 400 Bad Request");

  // Verify Validation: Reject Digits in Name
  const digitNameRes = await httpRequest({
    path: "/api/applications",
    method: "POST"
  }, {
    firstName: "Test123",
    lastName: "Applicant",
    email: `digit.name.${Date.now()}@example.com`,
    dateOfBirth: "05/15/2005",
    contactNumber: "+63 912 345 6789",
    address: "123 Test St",
    desiredProgram: "BS Information Technology",
    yearLevel: "Year 1"
  });
  assert(digitNameRes.statusCode === 400, "Validation rejects numeric digits in name field with 400 Bad Request");

  // Verify Successful Submission
  const validEmail = `clarissa.ui.test.${Date.now()}@bantug-test.example`;
  const submitRes = await httpRequest({
    path: "/api/applications",
    method: "POST"
  }, {
    firstName: "Clarissa",
    lastName: "Santos",
    fullName: "Clarissa Santos",
    dateOfBirth: "05/14/2007",
    gender: "Female",
    email: validEmail,
    contactNumber: "+63 917 123 4567",
    address: "123 Mabini St, Manila",
    desiredProgram: "Bachelor of Science in Information Technology",
    secondChoiceProgram: "Bachelor of Science in Computer Science",
    yearLevel: "Year 1",
    applicantType: "Senior High School Graduate / Freshman",
    previousSchool: "Manila Science High School",
    educationalBackground: "STEM Academic Track",
    graduationYear: "2025",
    status: "Pending"
  });

  assert(submitRes.statusCode === 201 || submitRes.statusCode === 200, "Submitting valid application returns 201/200 OK");
  const appData = submitRes.json?.application || submitRes.json?.data || submitRes.json;
  const refNum = appData?.referenceNumber || appData?.reference_number;
  assert(/^BU-\d{4}-\d{5,6}$/i.test(refNum || ""), `Generated reference number matches format: ${refNum}`);

  // Check MySQL database persistence
  const db = await mysql.createConnection(DB_CONFIG);
  const [rows] = await db.execute("SELECT reference_number, status, email FROM applications WHERE reference_number = ?", [refNum]);
  assert(rows.length === 1, `Application permanently persisted in MySQL database (${rows[0]?.reference_number})`);
  assert(rows[0]?.status === "Pending", "Initial application status is confirmed 'Pending'");

  // Confirm no student account created
  const [studentRows] = await db.execute("SELECT * FROM students WHERE email = ?", [validEmail]);
  assert(studentRows.length === 0, "No student portal account was created automatically");

  await db.end();

  console.log("\n============================================================================");
  console.log(` TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log("============================================================================");

  if (failedTests > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
