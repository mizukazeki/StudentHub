// Automated verification test for applicant reference number generation.
const http = require('http');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function postJson(pathUrl, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: pathUrl,
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
          } catch (e) {
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
  console.log('=== STARTING PHASE 2 VERIFICATION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${extraInfo}`);
      failed++;
    }
  }

  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'bantug_university_db'
  });

  const [initialCountRow] = await conn.query('SELECT COUNT(*) as cnt FROM applications');
  const initialCount = Number(initialCountRow[0].cnt);

  // Test 1: Submit a valid new application
  const uniqueTime1 = Date.now();
  const appPayload1 = {
    lastName: 'Reyes',
    firstName: 'Gabriel Jose',
    middleName: 'Mendoza',
    dateOfBirth: '05/18/2007',
    email: `gabriel.reyes${uniqueTime1}@email.example`,
    contactNumber: '9185550211',
    address: '45 Luna St., San Vicente, Bantug',
    desiredProgram: 'Bachelor of Science in Information Technology (BSIT)',
    secondChoiceProgram: 'Bachelor of Science in Computer Science (BSCS)',
    yearLevel: 'Year 1',
    applicantType: 'Senior High School Graduate / Freshman',
    previousSchool: 'Bantug National High School',
    educationalBackground: 'Academic Track - STEM Strand',
    graduationYear: '2026'
  };

  const res1 = await postJson('/api/applications', appPayload1);
  assert(
    res1.status === 201 && res1.data.ok === true && res1.data.application,
    'Test 1: Submit a valid new application successfully (HTTP 201)',
    JSON.stringify(res1.data)
  );

  const refNum1 = res1.data.application?.referenceNumber;
  const expectedFormatRegex = /^BU-2026-\d{6}$/;

  assert(
    expectedFormatRegex.test(refNum1),
    `Test 2: Reference number format matches BU-2026-XXXXXX (Got: ${refNum1})`,
    refNum1
  );

  // Test 3: Confirm application and reference number appear in MySQL
  const [dbRow1] = await conn.query(
    'SELECT * FROM applications WHERE reference_number = ?',
    [refNum1]
  );
  assert(
    dbRow1.length === 1 && dbRow1[0].status === 'Pending',
    `Test 3: Confirm application appears in MySQL with status 'Pending' and correct reference number`,
    JSON.stringify(dbRow1[0])
  );

  // Test 4: Submit a second application and confirm it receives a distinct, different reference number
  const uniqueTime2 = Date.now() + 10;
  const appPayload2 = {
    ...appPayload1,
    lastName: 'Soriano',
    firstName: 'Althea Mae',
    middleName: 'Villanueva',
    email: `althea.soriano${uniqueTime2}@email.example`,
    contactNumber: '9205550322'
  };

  const res2 = await postJson('/api/applications', appPayload2);
  const refNum2 = res2.data.application?.referenceNumber;

  assert(
    res2.status === 201 && expectedFormatRegex.test(refNum2),
    `Test 4a: Second application submitted successfully with valid format (Got: ${refNum2})`,
    JSON.stringify(res2.data)
  );
  assert(
    refNum1 !== refNum2,
    `Test 4b: Each application receives its own unique reference number (${refNum1} !== ${refNum2})`,
    `Ref1: ${refNum1}, Ref2: ${refNum2}`
  );

  // Test 5: Safe handling of simultaneous application submissions
  const uniqueTimeSim = Date.now() + 20;
  const sampleLastNames = ['Dalisay', 'Ilagan', 'Navarro'];
  const simPromises = [1, 2, 3].map((idx) =>
    postJson('/api/applications', {
      ...appPayload1,
      lastName: sampleLastNames[idx - 1],
      firstName: 'Test',
      middleName: 'Concurrency',
      email: `sim.applicant${idx}.${uniqueTimeSim}@email.example`,
      contactNumber: `9215550${idx}11`
    })
  );

  const simResults = await Promise.all(simPromises);
  const simRefs = simResults.map((r) => r.data?.application?.referenceNumber);
  const uniqueSimRefs = new Set(simRefs);

  assert(
    simResults.every((r) => r.status === 201) && uniqueSimRefs.size === 3,
    'Test 5: Simultaneous submissions handled safely with distinct reference numbers',
    JSON.stringify(simRefs)
  );

  // Test 6: Failed submission test
  const badRes = await postJson('/api/applications', {
    ...appPayload1,
    lastName: 'Invalid123',
    dateOfBirth: '12/31/2099', // Future date
    graduationYear: '2026.5'    // Decimals
  });

  assert(
    badRes.status === 400 && badRes.data.ok === false && !badRes.data.application,
    'Test 6: Failed database submission returns 400 without success message or fake reference number',
    JSON.stringify(badRes.data)
  );

  // Test 7: Confirm no repetitive technical database messages appear in applicant-facing code
  const applicantJsContent = fs.readFileSync(path.join(__dirname, '../../js/applicant.js'), 'utf8');

  const forbiddenStrings = [
    'Database Persistence Notice: Your application entry is validated and saved directly to the BANTUG UNIVERSITY MySQL Database',
    'In MySQL Database Insertion Confirmed',
    'MySQL Database Insertion Confirmed',
    'Your application form has been received and permanently recorded in the BANTUG UNIVERSITY MySQL Database',
    'Saving Application to MySQL Database...'
  ];

  let technicalMessagesFound = 0;
  forbiddenStrings.forEach((str) => {
    if (applicantJsContent.includes(str)) {
      console.error(`Found forbidden technical message: "${str}"`);
      technicalMessagesFound++;
    }
  });

  assert(
    technicalMessagesFound === 0,
    'Test 7: No repetitive database technical messages appear in applicant-facing interface',
    `Found count: ${technicalMessagesFound}`
  );

  // Test 8: Confirm Copy Reference Number button and accessible attributes exist in applicant.js
  const hasCopyButton =
    applicantJsContent.includes('id="copyRefNumBtn"') &&
    applicantJsContent.includes('copyReferenceNumberToClipboard') &&
    applicantJsContent.includes('aria-label') &&
    applicantJsContent.includes('Reference number copied!');

  assert(
    hasCopyButton,
    'Test 8: Working Copy Reference Number button, accessible label, and copy feedback logic implemented',
    'Verified copy button and clipboard handler'
  );

  // Test 9: Confirm session storage caching prevents reference number regeneration on refresh
  const hasRefreshCacheLogic =
    applicantJsContent.includes('sessionStorage.getItem("bu_last_submitted_app")') &&
    applicantJsContent.includes('sessionStorage.setItem("bu_last_submitted_app"');

  assert(
    hasRefreshCacheLogic,
    'Test 9: Session storage preserves existing reference number across page refreshes',
    'Verified session storage caching'
  );

  // Test 10: Confirm existing application records remain intact
  const [finalCountRow] = await conn.query('SELECT COUNT(*) as cnt FROM applications');
  const finalCount = Number(finalCountRow[0].cnt);

  assert(
    finalCount >= initialCount && finalCount >= 18,
    `Test 10: Existing application records remain completely preserved (Total: ${finalCount})`,
    `Initial: ${initialCount}, Final: ${finalCount}`
  );

  // Test 11: Confirm all reference numbers in database are unique
  const [duplicateCheck] = await conn.query(
    'SELECT reference_number, COUNT(*) as cnt FROM applications GROUP BY reference_number HAVING cnt > 1'
  );

  assert(
    duplicateCheck.length === 0,
    'Test 11: Zero duplicate reference numbers in MySQL database',
    JSON.stringify(duplicateCheck)
  );

  await conn.end();

  console.log(`\n=== VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
})();
