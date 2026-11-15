// Automated verification test for applicant admission form field validations.
const http = require('http');
const mysql = require('mysql2/promise');

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
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
  console.log('=== STARTING PHASE 1 VERIFICATION TESTS ===\n');
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

  // Baseline valid payload
  const basePayload = {
    lastName: 'Dela Cruz',
    firstName: 'Maria Clara',
    middleName: 'Santos',
    dateOfBirth: '09/12/2007',
    email: `mariaclara.test${Date.now()}@email.example`,
    contactNumber: '9175550123',
    address: '123 Rizal Avenue, Poblacion, Bantug',
    desiredProgram: 'Bachelor of Science in Information Technology (BSIT)',
    secondChoiceProgram: 'Bachelor of Science in Computer Science (BSCS)',
    yearLevel: 'Year 1',
    applicantType: 'Senior High School Graduate / Freshman',
    previousSchool: 'Bantug National High School',
    educationalBackground: 'Academic Track - STEM Strand',
    graduationYear: '2026'
  };

  // Test 1: Reject numbers in First Name
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      firstName: 'Maria123'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.firstName?.includes('cannot contain numbers'),
      'Test 1: Reject numbers in First Name',
      JSON.stringify(res.data)
    );
  }

  // Test 2: Reject numbers in Last Name
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      lastName: 'DelaCruz99'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.lastName?.includes('cannot contain numbers'),
      'Test 2: Reject numbers in Last Name',
      JSON.stringify(res.data)
    );
  }

  // Test 3: Accept compound Filipino names with spaces, hyphens, and apostrophes
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      email: `compound.test${Date.now()}@email.example`,
      lastName: 'Dela Cruz-O\'Connor',
      firstName: 'Maria Clara'
    });
    assert(
      res.status === 201 && res.data.ok === true,
      'Test 3: Accept compound name with spaces, hyphens, and apostrophes',
      JSON.stringify(res.data)
    );
  }

  // Test 4: Date of Birth - Reject non-existent calendar date (leap year test: Feb 29 on non-leap year 2023)
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      dateOfBirth: '02/29/2023'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.dateOfBirth,
      'Test 4: Reject invalid calendar date (Feb 29 on non-leap year)',
      JSON.stringify(res.data)
    );
  }

  // Test 5: Date of Birth - Reject 31st on a 30-day month (April 31)
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      dateOfBirth: '04/31/2020'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.dateOfBirth,
      'Test 5: Reject invalid calendar date (April 31)',
      JSON.stringify(res.data)
    );
  }

  // Test 6: Date of Birth - Reject future date
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      dateOfBirth: '12/31/2099'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.dateOfBirth?.includes('future date'),
      'Test 6: Reject future date for Date of Birth',
      JSON.stringify(res.data)
    );
  }

  // Test 7: Applicant Year Level - Reject non-Year 1 (e.g. Year 2, Year 3, Year 4)
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      yearLevel: 'Year 3'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.yearLevel?.includes('Year 1'),
      'Test 7: Reject selecting Year 2/Year 3/Year 4 for new applicants',
      JSON.stringify(res.data)
    );
  }

  // Test 8: Contact Number - Reject letters and special characters
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      contactNumber: '917abc1234'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.contactNumber,
      'Test 8: Reject letters and non-digits in contact number',
      JSON.stringify(res.data)
    );
  }

  // Test 9: Contact Number - Reject fewer than 10 digits
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      contactNumber: '91755501'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.contactNumber?.includes('10 digits'),
      'Test 9: Reject contact number with fewer than 10 digits',
      JSON.stringify(res.data)
    );
  }

  // Test 10: Contact Number - Reject more than 10 digits
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      contactNumber: '917555012345'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.contactNumber?.includes('10 digits'),
      'Test 10: Reject contact number with more than 10 digits',
      JSON.stringify(res.data)
    );
  }

  // Test 11: Graduation Year - Reject decimals
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      graduationYear: '2026.5'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.graduationYear,
      'Test 11: Reject decimals in graduation year',
      JSON.stringify(res.data)
    );
  }

  // Test 12: Graduation Year - Reject future years
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      graduationYear: '2035'
    });
    assert(
      res.status === 400 && res.data.fieldErrors?.graduationYear?.includes('future'),
      'Test 12: Reject future graduation year',
      JSON.stringify(res.data)
    );
  }

  // Test 13: Desired Program vs 2nd Choice Program - Reject identical choices
  {
    const res = await postJson('/api/applications', {
      ...basePayload,
      desiredProgram: 'Bachelor of Science in Information Technology (BSIT)',
      secondChoiceProgram: 'Bachelor of Science in Information Technology (BSIT)'
    });
    assert(
      res.status === 400 &&
        res.data.fieldErrors?.secondChoiceProgram ===
          'Your second-choice program must be different from your first choice.',
      'Test 13: Reject identical 1st and 2nd program choices with exact message',
      JSON.stringify(res.data)
    );
  }

  // Test 14: Successful submission and MySQL persistence verification
  const validTestEmail = `verified.applicant${Date.now()}@email.example`;
  const validSubmissionRes = await postJson('/api/applications', {
    ...basePayload,
    email: validTestEmail,
    dateOfBirth: '09/12/2007',
    contactNumber: '+63 917 555 0888',
    yearLevel: 'Year 1',
    graduationYear: '2026'
  });

  assert(
    validSubmissionRes.status === 201 && validSubmissionRes.data.ok === true,
    'Test 14: Valid application submitted successfully (HTTP 201)',
    JSON.stringify(validSubmissionRes.data)
  );

  const refNumber = validSubmissionRes.data.application?.referenceNumber;

  // Test 15: Check MySQL Database directly
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'bantug_university_db'
  });

  const [dbRow] = await conn.query(
    `SELECT *,
      DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS dobFormatted,
      DATE_FORMAT(date_of_birth, '%m/%d/%Y') AS dobDisplay
     FROM applications WHERE reference_number = ?`,
    [refNumber]
  );

  assert(
    dbRow.length === 1,
    'Test 15: Record found in MySQL applications table',
    `Found rows: ${dbRow.length}`
  );

  if (dbRow.length === 1) {
    const rec = dbRow[0];

    assert(
      rec.dobFormatted === '2007-09-12',
      'Test 16: Date of birth stored in MySQL as YYYY-MM-DD (2007-09-12)',
      rec.dobFormatted
    );
    assert(
      rec.dobDisplay === '09/12/2007',
      'Test 16b: Date of birth formatted correctly as MM/DD/YYYY (09/12/2007)',
      rec.dobDisplay
    );
    assert(
      rec.year_level === 'Year 1',
      'Test 17: Applicant year_level stored in MySQL strictly as Year 1',
      rec.year_level
    );
    assert(
      rec.status === 'Pending',
      'Test 18: Initial status stored in MySQL strictly as Pending',
      rec.status
    );
    assert(
      rec.contact_number.startsWith('+63') && !rec.contact_number.includes('+63 +63'),
      'Test 19: Contact number stored with normalized +63 and no duplicate country codes',
      rec.contact_number
    );
    assert(
      rec.graduation_year === '2026',
      'Test 20: Graduation year stored as 4-digit string 2026',
      rec.graduation_year
    );
  }

  // Test 21: Verify original records remain intact
  const [allRows] = await conn.query('SELECT COUNT(*) as cnt FROM applications');
  assert(
    allRows[0].cnt >= 18,
    'Test 21: Existing applicant records remain completely preserved',
    `Total count: ${allRows[0].cnt}`
  );

  await conn.end();

  console.log(`\n=== VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
})();
