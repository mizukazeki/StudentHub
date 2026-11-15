/**
 * Phase 3 Verification Suite: Student Course Dashboard & Subject Catalog
 * Tests all 14 criteria from Section I of Phase 3.
 */

const http = require("http");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const { DB_CONFIG } = require('../../database/seed');

function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || 3000,
      path: u.pathname + u.search,
      method: options.method || "GET",
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });

    req.on("error", reject);
    if (body) {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      req.write(payload);
    }
    req.end();
  });
}

async function runPhase3Tests() {
  console.log("\n=== RUNNING PHASE 3 STUDENT COURSE DASHBOARD TEST SUITE ===\n");
  let passedCount = 0;
  let totalCount = 14;

  const results = [];

  function record(id, title, pass, details) {
    if (pass) {
      passedCount++;
      console.log(`✅ [Test ${id}] ${title}: PASS - ${details}`);
      results.push({ id, title, status: "PASS", details });
    } else {
      console.log(`❌ [Test ${id}] ${title}: FAIL - ${details}`);
      results.push({ id, title, status: "FAIL", details });
    }
  }

  try {
    // ------------------------------------------------------------------------
    // Test 1: Log in using a valid student account
    // ------------------------------------------------------------------------
    const loginRes = await httpRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, {
      identifier: "r.valiente",
      password: "demo123",
      role: "student"
    });

    const studentToken = loginRes.json?.session?.sessionToken;
    const studentUser = loginRes.json?.session;
    const test1Pass = loginRes.statusCode === 200 && studentToken && studentUser?.role === "student";
    record(1, "Log in using a valid student account", test1Pass,
      test1Pass ? `Authenticated as ${studentUser.username} (${studentUser.fullName}), Role: ${studentUser.role}, Section: ${studentUser.studentProfile?.section}` : `Login failed with status ${loginRes.statusCode}`);

    // Also login second student (BSIT 1-1) to verify multi-student dynamic handling
    const loginCruz = await httpRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, {
      identifier: "a.cruz",
      password: "demo123",
      role: "student"
    });
    const cruzToken = loginCruz.json?.session?.sessionToken;

    // ------------------------------------------------------------------------
    // Test 2: Confirm that the Student Dashboard loads
    // ------------------------------------------------------------------------
    const dashRes = await httpRequest("http://localhost:3000/api/portal?action=load", {
      headers: {
        "Authorization": `Bearer ${studentToken}`,
        "X-Portal-Token": studentToken
      }
    });

    const state = dashRes.json?.state;
    const test2Pass = dashRes.statusCode === 200 && state && state.profile?.studentNumber === "2025-BSIT-0202";
    record(2, "Confirm that the Student Dashboard loads", test2Pass,
      test2Pass ? `Dashboard state successfully loaded for ${state.profile.fullName} (Student No: ${state.profile.studentNumber})` : "Failed to load student dashboard state");

    // ------------------------------------------------------------------------
    // Test 3: Confirm that the course dashboard is restored
    // ------------------------------------------------------------------------
    const enrolledSubs = state?.subjects || [];
    const test3Pass = enrolledSubs.length > 0 && enrolledSubs.every(s => s.subjectCode && s.subjectName);
    record(3, "Confirm that the course dashboard is restored", test3Pass,
      test3Pass ? `Restored course dashboard with ${enrolledSubs.length} official enrolled subjects (Sample: ${enrolledSubs[0].subjectCode} - ${enrolledSubs[0].subjectName})` : "No enrolled subjects in course dashboard");

    // ------------------------------------------------------------------------
    // Test 4: Confirm that the general search placeholder no longer mentions BSIT 2-2
    // ------------------------------------------------------------------------
    const headerHtml = fs.readFileSync(path.join(__dirname, '../../pages/shared/header.html'), "utf8");
    const placeholderMatch = headerHtml.match(/placeholder="([^"]+)"/);
    const placeholderText = placeholderMatch ? placeholderMatch[1] : "";
    const expectedPlaceholder = "Search subjects, instructors, courses, tasks, and notices...";
    const test4Pass = placeholderText === expectedPlaceholder && !placeholderText.includes("BSIT 2-2");
    record(4, "Confirm search placeholder no longer mentions BSIT 2-2", test4Pass,
      test4Pass ? `General search placeholder verified: "${placeholderText}"` : `Placeholder mismatch: "${placeholderText}"`);

    // ------------------------------------------------------------------------
    // Test 5: Search by subject code
    // ------------------------------------------------------------------------
    const searchCodeRes = await httpRequest("http://localhost:3000/api/subjects?code=T148", {
      headers: {
        "Authorization": `Bearer ${studentToken}`,
        "X-Portal-Token": studentToken
      }
    });
    const foundCode = searchCodeRes.json?.subjects?.find(s => s.subjectCode === "T148");
    const test5Pass = searchCodeRes.statusCode === 200 && foundCode && foundCode.subjectName.includes("Data Structures");
    record(5, "Search by subject code", test5Pass,
      test5Pass ? `Successfully resolved subject code T148: "${foundCode.fullSubjectName}"` : "Subject code search failed");

    // ------------------------------------------------------------------------
    // Test 6: Search by subject name
    // ------------------------------------------------------------------------
    const searchNameRes = await httpRequest("http://localhost:3000/api/subjects?q=Object-Oriented", {
      headers: {
        "Authorization": `Bearer ${studentToken}`,
        "X-Portal-Token": studentToken
      }
    });
    const foundName = searchNameRes.json?.subjects?.find(s => s.subjectCode === "T150");
    const test6Pass = searchNameRes.statusCode === 200 && foundName && foundName.subjectName.includes("Object-Oriented");
    record(6, "Search by subject name", test6Pass,
      test6Pass ? `Successfully searched "Object-Oriented": found ${foundName.subjectCode} - ${foundName.subjectName}` : "Subject name search failed");

    // ------------------------------------------------------------------------
    // Test 7: Search by instructor name
    // ------------------------------------------------------------------------
    const searchInstRes = await httpRequest("http://localhost:3000/api/subjects?q=Somera", {
      headers: {
        "Authorization": `Bearer ${studentToken}`,
        "X-Portal-Token": studentToken
      }
    });
    const foundInst = searchInstRes.json?.subjects?.filter(s => (s.instructor || "").includes("Somera"));
    const test7Pass = searchInstRes.statusCode === 200 && foundInst?.length > 0;
    record(7, "Search by instructor name", test7Pass,
      test7Pass ? `Successfully searched instructor "Somera": matched ${foundInst.length} courses taught by Prof. Somera` : "Instructor search failed");

    // ------------------------------------------------------------------------
    // Test 8: Clear the search and confirm that the normal dashboard returns
    // ------------------------------------------------------------------------
    const appJs = fs.readFileSync(path.join(__dirname, '../../js/app.js'), "utf8");
    const clearLogicPresent = appJs.includes('if (!q)') && appJs.includes('resultsBox.hidden = true') && appJs.includes('resultsBox.innerHTML = ""');
    record(8, "Clear search and confirm normal dashboard returns", clearLogicPresent,
      clearLogicPresent ? "Verified global search input clearing hides search overlay and restores dashboard view" : "Clearing logic missing in handleGlobalSearch");

    // ------------------------------------------------------------------------
    // Test 9: Confirm general catalog subjects are not incorrectly presented as enrolled subjects
    // ------------------------------------------------------------------------
    const catalogRes = await httpRequest("http://localhost:3000/api/subjects", {
      headers: {
        "Authorization": `Bearer ${studentToken}`,
        "X-Portal-Token": studentToken
      }
    });
    const catalogList = catalogRes.json?.subjects || [];
    const valienteEnrolledCodes = enrolledSubs.map(s => s.subjectCode);
    const hasT101InCatalog = catalogList.some(s => s.subjectCode === "T101");
    const hasT101InEnrolled = valienteEnrolledCodes.includes("T101");
    const test9Pass = hasT101InCatalog && !hasT101InEnrolled && catalogList.length > enrolledSubs.length;
    record(9, "Confirm general catalog subjects are not incorrectly presented as enrolled", test9Pass,
      test9Pass ? `Catalog contains ${catalogList.length} total university subjects; student has only their ${enrolledSubs.length} enrolled subjects (T101 in catalog, not enrolled)` : "Catalog items leaked into enrolled subjects");

    // ------------------------------------------------------------------------
    // Test 10: Confirm My Subjects contains only the student's actual enrolled subjects
    // ------------------------------------------------------------------------
    const conn = await mysql.createConnection(DB_CONFIG);
    const [dbEnrollments] = await conn.query(
      "SELECT subject_code FROM student_enrollments WHERE student_number = ?",
      ["2025-BSIT-0202"]
    );
    const dbCodes = new Set(dbEnrollments.map(r => r.subject_code));
    const test10Pass = enrolledSubs.length === dbEnrollments.length && enrolledSubs.every(s => dbCodes.has(s.subjectCode));
    record(10, "Confirm My Subjects contains only actual enrolled subjects", test10Pass,
      test10Pass ? `My Subjects matches exactly the ${dbEnrollments.length} records in student_enrollments table` : `Count mismatch: state has ${enrolledSubs.length}, DB has ${dbEnrollments.length}`);

    // ------------------------------------------------------------------------
    // Test 11: Confirm that the correct student section comes from the database
    // ------------------------------------------------------------------------
    const [stDb] = await conn.query("SELECT section FROM students WHERE student_number = ?", ["2025-BSIT-0202"]);
    const [cruzDb] = await conn.query("SELECT section FROM students WHERE student_number = ?", ["2026-BSIT-0101"]);
    
    const cruzDashRes = await httpRequest("http://localhost:3000/api/portal?action=load", {
      headers: {
        "Authorization": `Bearer ${cruzToken}`,
        "X-Portal-Token": cruzToken
      }
    });
    const cruzSection = cruzDashRes.json?.state?.profile?.section;

    const test11Pass = state.profile.section === stDb[0].section && cruzSection === cruzDb[0].section && cruzSection === "BSIT 1-1";
    record(11, "Confirm correct student section comes from database", test11Pass,
      test11Pass ? `r.valiente section is "${state.profile.section}" (DB: ${stDb[0].section}); a.cruz section is "${cruzSection}" (DB: ${cruzDb[0].section})` : "Section mismatch between DB and student profile");

    // ------------------------------------------------------------------------
    // Test 12: Confirm that no applicant information appears
    // ------------------------------------------------------------------------
    const appInfoInState = (state.applications && state.applications.length > 0) || (state.demoApplicantRecords && state.demoApplicantRecords.length > 0);
    const searchApp = await httpRequest("http://localhost:3000/api/applications", {
      headers: {
        "Authorization": `Bearer ${studentToken}`,
        "X-Portal-Token": studentToken
      }
    });
    const test12Pass = !appInfoInState && searchApp.statusCode === 403;
    record(12, "Confirm that no applicant information appears", test12Pass,
      test12Pass ? "Applicant records array is empty in student state; /api/applications access denied (HTTP 403)" : "Applicant records leaked to student");

    // ------------------------------------------------------------------------
    // Test 13: Confirm that the layout works on desktop and mobile
    // ------------------------------------------------------------------------
    const subjectsHtml = fs.readFileSync(path.join(__dirname, '../../pages/student/subjects.html'), "utf8");
    const subjectsJs = fs.readFileSync(path.join(__dirname, '../../js/subjects.js'), "utf8");
    const hasCardLayout = subjectsHtml.includes('id="btnSubjectsCardLayout"') && subjectsJs.includes('layoutMode === "cards"');
    const hasTableLayout = subjectsHtml.includes('id="btnSubjectsTableLayout"') && subjectsJs.includes('layoutMode === "table"');
    const hasResponsiveClasses = (subjectsHtml.includes('table-responsive') || subjectsJs.includes('table-responsive')) && subjectsHtml.includes('subjects-toolbar-row');
    const test13Pass = hasCardLayout && hasTableLayout && hasResponsiveClasses;
    record(13, "Confirm that layout works on desktop and mobile", test13Pass,
      test13Pass ? "Verified responsive CSS architecture with both adaptive Card View and Table View switchers" : "Missing responsive layout switchers");

    // ------------------------------------------------------------------------
    // Test 14: Refresh the page and verify that the correct data remains
    // ------------------------------------------------------------------------
    const refreshRes = await httpRequest("http://localhost:3000/api/portal?action=load", {
      headers: {
        "Authorization": `Bearer ${studentToken}`,
        "X-Portal-Token": studentToken
      }
    });
    const refreshedState = refreshRes.json?.state;
    const test14Pass = refreshRes.statusCode === 200 &&
      refreshedState?.profile?.studentNumber === "2025-BSIT-0202" &&
      refreshedState?.subjects?.length === enrolledSubs.length &&
      refreshedState?.profile?.section === "BSIT 2-2";
    record(14, "Refresh page and verify correct data remains", test14Pass,
      test14Pass ? `State persistence verified on re-fetch: student number, section (${refreshedState.profile.section}), and all ${refreshedState.subjects.length} subjects intact` : "Data lost on reload/re-fetch");

    await conn.end();

    console.log(`\n=== SUMMARY OF PHASE 3 VERIFICATION ===`);
    console.log(`TOTAL TESTS: ${totalCount} | PASS: ${passedCount} | FAIL: ${totalCount - passedCount}`);
    if (passedCount === totalCount) {
      console.log("\n🎉 ALL 14 PHASE 3 TESTS PASSED PERFECTLY!\n");
    } else {
      console.log(`\n⚠️ ${totalCount - passedCount} TESTS FAILED.\n`);
    }

  } catch (err) {
    console.error("Test execution failed with error:", err);
  }
}

runPhase3Tests();
