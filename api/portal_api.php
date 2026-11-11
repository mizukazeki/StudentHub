<?php
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System (Revision 7)
 * XAMPP REST API Endpoint (api/portal_api.php)
 *
 * Synchronizes ALL user inputs and Faculty Application Management actions
 * between the front-end portal and the MySQL database (`bantug_university_db`):
 * - `users` (45 Hashed Demo Accounts: 15 Students, 15 Faculty, 15 Applicants)
 * - `students` (15 Student Profiles across Year 1 - Year 4)
 * - `faculty` (15 Faculty Profiles & Assigned Schedules)
 * - `subjects`, `subject_schedules`, `student_enrollments`
 * - `grading_weights` & `student_grades` (Faculty Grade Management)
 * - `attendance_records` (Faculty Attendance Management)
 * - `tasks` & `task_submissions` (Faculty Assignments & Student Submissions)
 * - `announcements` (Faculty Announcements)
 * - `learning_resources` (Learning Resources)
 * - `applications` (15 Preloaded + Public Applicant Submissions & Status Updates)
 * - `portal_state_store` (Complete JSON state snapshot)
 * ============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  echo json_encode(['ok' => true]);
  exit;
}

require_once __DIR__ . '/config.php';

$pdo = getBantugDatabaseConnection();
if (!$pdo) {
  http_response_code(503);
  echo json_encode([
    'ok' => false,
    'message' => 'XAMPP MySQL connection unavailable. Make sure MySQL is started in XAMPP Control Panel.'
  ]);
  exit;
}

$action = isset($_GET['action']) ? trim($_GET['action']) : 'status';

/**
 * Normalize application status to one of: Pending, Under Review, Approved, Rejected
 */
function normalizeApplicationStatus(string $rawStatus): string {
  $trimmed = trim($rawStatus);
  if ($trimmed === 'Submitted' || $trimmed === '') {
    return 'Pending';
  }
  $valid = ['Pending', 'Under Review', 'Approved', 'Rejected'];
  return in_array($trimmed, $valid, true) ? $trimmed : 'Pending';
}

/**
 * Fetch all applications from MySQL `applications` table formatted for the frontend
 */
function fetchAllApplicationsFromMySQL(PDO $pdo): array {
  $rows = [];
  try {
    $stmt = $pdo->query("
      SELECT
        `id`,
        `reference_number` AS `referenceNumber`,
        `full_name` AS `fullName`,
        `date_of_birth` AS `dateOfBirth`,
        `email`,
        `contact_number` AS `contactNumber`,
        `address`,
        `applicant_type` AS `applicantType`,
        `year_level` AS `yearLevel`,
        `desired_program` AS `desiredProgram`,
        `second_choice_program` AS `secondChoiceProgram`,
        `previous_school` AS `previousSchool`,
        `educational_background` AS `educationalBackground`,
        `graduation_year` AS `graduationYear`,
        `submitted_date` AS `submittedDate`,
        `status`,
        `is_demo_record` AS `isDemoRecord`,
        `remarks`
      FROM `applications`
      ORDER BY `submitted_date` DESC, `id` ASC
    ");
    $rawRows = $stmt->fetchAll();
    foreach ($rawRows as $r) {
      $r['status'] = normalizeApplicationStatus((string)($r['status'] ?? 'Pending'));
      $r['isDemoRecord'] = !empty($r['isDemoRecord']);
      $rows[] = $r;
    }
  } catch (Throwable $_) {}
  return $rows;
}

/**
 * Synchronize all relational MySQL tables whenever portal state is saved.
 * Preserves preloaded 15-student, 15-faculty, and 15-applicant records.
 */
function syncRelationalTables(PDO $pdo, array $state): void {
  $validYears = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

  // 1. Sync Active Student Profile (`students`)
  if (!empty($state['profile']) && is_array($state['profile'])) {
    $p = $state['profile'];
    $yr = in_array($p['yearLevel'] ?? '', $validYears, true) ? $p['yearLevel'] : 'Year 2';
    $studentNo = !empty($p['studentNumber']) ? trim((string)$p['studentNumber']) : '2025-BSIT-0202';

    $stmt = $pdo->prepare("
      UPDATE `students`
      SET `full_name` = :full_name,
          `course` = :course,
          `year_level` = :year_level,
          `section` = :section,
          `email` = :email,
          `contact_number` = :contact_number,
          `address` = :address,
          `guardian_name` = :guardian_name,
          `guardian_contact` = :guardian_contact,
          `academic_term` = :academic_term,
          `bio` = :bio
      WHERE `student_number` = :student_number
    ");
    $stmt->execute([
      ':student_number' => $studentNo,
      ':full_name' => $p['fullName'] ?? 'Racel Valiente (Demo Student)',
      ':course' => $p['course'] ?? 'Bachelor of Science in Information Technology',
      ':year_level' => $yr,
      ':section' => $p['section'] ?? 'BSIT 2-2',
      ':email' => $p['email'] ?? 'student.demo@bantug.edu.example',
      ':contact_number' => $p['contactNumber'] ?? '',
      ':address' => $p['address'] ?? '',
      ':guardian_name' => $p['guardianName'] ?? '',
      ':guardian_contact' => $p['guardianContact'] ?? '',
      ':academic_term' => $p['academicTerm'] ?? '2nd Semester, AY 2026–2027',
      ':bio' => $p['bio'] ?? ''
    ]);
  }

  // 2. Sync Active Faculty Profile (`faculty`)
  if (!empty($state['facultyProfile']) && is_array($state['facultyProfile'])) {
    $fp = $state['facultyProfile'];
    if (!empty($fp['facultyId'])) {
      $facStmt = $pdo->prepare("
        INSERT INTO `faculty`
          (`faculty_id`, `full_name`, `department`, `designation`, `email`, `contact_number`, `office_location`, `advisory_section`)
        VALUES
          (:faculty_id, :full_name, :department, :designation, :email, :contact_number, :office_location, :advisory_section)
        ON DUPLICATE KEY UPDATE
          `full_name` = VALUES(`full_name`),
          `department` = VALUES(`department`),
          `designation` = VALUES(`designation`),
          `email` = VALUES(`email`),
          `contact_number` = VALUES(`contact_number`),
          `office_location` = VALUES(`office_location`),
          `advisory_section` = VALUES(`advisory_section`)
      ");
      $facStmt->execute([
        ':faculty_id' => $fp['facultyId'],
        ':full_name' => $fp['fullName'] ?? 'Somera, Fabian',
        ':department' => $fp['department'] ?? 'College of Information Technology & Computing',
        ':designation' => $fp['designation'] ?? 'Instructor',
        ':email' => $fp['email'] ?? 'f.somera.demo@bantug.edu.example',
        ':contact_number' => $fp['contactNumber'] ?? '',
        ':office_location' => $fp['officeLocation'] ?? 'IT Faculty Consultation Room',
        ':advisory_section' => $fp['advisorySection'] ?? 'BSIT 2-2'
      ]);
    }
  }

  // 3. Sync Grading Weights (`grading_weights`) & Student Grades (`student_grades`)
  $weights = $state['gradingWeights'] ?? [
    'quizzes' => 20,
    'assignments' => 15,
    'activities' => 15,
    'projects' => 25,
    'examinations' => 25
  ];
  $wStmt = $pdo->prepare("
    INSERT INTO `grading_weights` (`id`, `quizzes_weight`, `assignments_weight`, `activities_weight`, `projects_weight`, `examinations_weight`)
    VALUES (1, :q, :a, :act, :p, :ex)
    ON DUPLICATE KEY UPDATE
      `quizzes_weight` = VALUES(`quizzes_weight`),
      `assignments_weight` = VALUES(`assignments_weight`),
      `activities_weight` = VALUES(`activities_weight`),
      `projects_weight` = VALUES(`projects_weight`),
      `examinations_weight` = VALUES(`examinations_weight`)
  ");
  $wStmt->execute([
    ':q' => (float)($weights['quizzes'] ?? 20),
    ':a' => (float)($weights['assignments'] ?? 15),
    ':act' => (float)($weights['activities'] ?? 15),
    ':p' => (float)($weights['projects'] ?? 25),
    ':ex' => (float)($weights['examinations'] ?? 25)
  ]);

  if (!empty($state['grades']) && is_array($state['grades'])) {
    $primaryStudentNo = '2025-BSIT-0202';
    $totalW = (float)($weights['quizzes'] ?? 20)
            + (float)($weights['assignments'] ?? 15)
            + (float)($weights['activities'] ?? 15)
            + (float)($weights['projects'] ?? 25)
            + (float)($weights['examinations'] ?? 25);

    $gradeStmt = $pdo->prepare("
      INSERT INTO `student_grades`
        (`student_number`, `subject_code`, `quizzes`, `assignments`, `activities`, `projects`, `examinations`, `final_average`)
      VALUES
        (:student_number, :subject_code, :quizzes, :assignments, :activities, :projects, :examinations, :final_average)
      ON DUPLICATE KEY UPDATE
        `quizzes` = VALUES(`quizzes`),
        `assignments` = VALUES(`assignments`),
        `activities` = VALUES(`activities`),
        `projects` = VALUES(`projects`),
        `examinations` = VALUES(`examinations`),
        `final_average` = VALUES(`final_average`)
    ");

    foreach ($state['grades'] as $g) {
      if (empty($g['subjectCode'])) continue;
      $hasGrade = isset($g['quizzes']) && $g['quizzes'] !== null && $g['quizzes'] !== '';
      $avg = null;
      if ($hasGrade && $totalW > 0) {
        $sum = ((float)($g['quizzes'] ?? 0) * (float)$weights['quizzes'])
             + ((float)($g['assignments'] ?? 0) * (float)$weights['assignments'])
             + ((float)($g['activities'] ?? 0) * (float)$weights['activities'])
             + ((float)($g['projects'] ?? 0) * (float)$weights['projects'])
             + ((float)($g['examinations'] ?? 0) * (float)$weights['examinations']);
        $avg = round($sum / $totalW, 2);
      }
      try {
        $gradeStmt->execute([
          ':student_number' => $primaryStudentNo,
          ':subject_code' => $g['subjectCode'],
          ':quizzes' => $hasGrade ? (float)$g['quizzes'] : null,
          ':assignments' => $hasGrade ? (float)$g['assignments'] : null,
          ':activities' => $hasGrade ? (float)$g['activities'] : null,
          ':projects' => $hasGrade ? (float)$g['projects'] : null,
          ':examinations' => $hasGrade ? (float)$g['examinations'] : null,
          ':final_average' => $avg
        ]);
      } catch (Throwable $_) {}
    }
  }

  // Also sync facultyGrades for all 15 roster students
  if (!empty($state['facultyGrades']) && is_array($state['facultyGrades'])) {
    $primaryStudentNo = '2025-BSIT-0202';
    $rosterGradeStmt = $pdo->prepare("
      INSERT INTO `student_grades`
        (`student_number`, `subject_code`, `final_average`)
      VALUES
        (:student_number, :subject_code, :final_average)
      ON DUPLICATE KEY UPDATE
        `final_average` = VALUES(`final_average`)
    ");
    foreach ($state['facultyGrades'] as $subCode => $studentMap) {
      if (!is_array($studentMap)) continue;
      foreach ($studentMap as $stuNo => $gradeVal) {
        if ($stuNo === $primaryStudentNo) continue;
        $val = ($gradeVal !== null && $gradeVal !== '') ? (float)$gradeVal : null;
        try {
          $rosterGradeStmt->execute([
            ':student_number' => $stuNo,
            ':subject_code' => $subCode,
            ':final_average' => $val
          ]);
        } catch (Throwable $_) {}
      }
    }
  }

  // 4. Sync Attendance Records (`attendance_records`) without deleting other students' seeded records
  if (isset($state['attendance']) && is_array($state['attendance'])) {
    $attStmt = $pdo->prepare("
      INSERT INTO `attendance_records`
        (`id`, `student_number`, `subject_code`, `subject_label`, `attendance_date`, `status`, `remarks`)
      VALUES
        (:id, :student_number, :subject_code, :subject_label, :attendance_date, :status, :remarks)
      ON DUPLICATE KEY UPDATE
        `subject_code` = VALUES(`subject_code`),
        `subject_label` = VALUES(`subject_label`),
        `attendance_date` = VALUES(`attendance_date`),
        `status` = VALUES(`status`),
        `remarks` = VALUES(`remarks`)
    ");
    foreach ($state['attendance'] as $att) {
      if (empty($att['id'])) continue;
      $subCode = $att['subjectCode'] ?? 'T148';
      if (empty($att['subjectCode']) && !empty($att['subject'])) {
        $parts = explode(' - ', $att['subject']);
        $subCode = trim($parts[0]);
      }
      $status = in_array($att['status'] ?? '', ['Present', 'Late', 'Absent'], true)
        ? $att['status']
        : 'Present';
      try {
        $attStmt->execute([
          ':id' => $att['id'],
          ':student_number' => $att['studentNumber'] ?? '2025-BSIT-0202',
          ':subject_code' => $subCode,
          ':subject_label' => $att['subject'] ?? $subCode,
          ':attendance_date' => !empty($att['date']) ? $att['date'] : date('Y-m-d'),
          ':status' => $status,
          ':remarks' => $att['remarks'] ?? ''
        ]);
      } catch (Throwable $_) {}
    }
  }

  // 5. Sync Tasks & Student Task Submissions (`tasks` & `task_submissions`)
  if (isset($state['tasks']) && is_array($state['tasks'])) {
    $taskStmt = $pdo->prepare("
      INSERT INTO `tasks`
        (`id`, `title`, `subject_code`, `subject_label`, `instructor_name`, `deadline`, `priority`, `status`, `description`, `published_by`)
      VALUES
        (:id, :title, :subject_code, :subject_label, :instructor_name, :deadline, :priority, :status, :description, :published_by)
      ON DUPLICATE KEY UPDATE
        `title` = VALUES(`title`),
        `subject_code` = VALUES(`subject_code`),
        `subject_label` = VALUES(`subject_label`),
        `instructor_name` = VALUES(`instructor_name`),
        `deadline` = VALUES(`deadline`),
        `priority` = VALUES(`priority`),
        `status` = VALUES(`status`),
        `description` = VALUES(`description`),
        `published_by` = VALUES(`published_by`)
    ");
    $subStmt = $pdo->prepare("
      INSERT INTO `task_submissions`
        (`task_id`, `student_number`, `student_name`, `status`, `response_text`, `submitted_at`)
      VALUES
        (:task_id, :student_number, :student_name, :status, :response_text, :submitted_at)
      ON DUPLICATE KEY UPDATE
        `student_name` = VALUES(`student_name`),
        `status` = VALUES(`status`),
        `response_text` = VALUES(`response_text`),
        `submitted_at` = VALUES(`submitted_at`)
    ");

    foreach ($state['tasks'] as $t) {
      if (empty($t['id']) || empty($t['title'])) continue;
      $subCode = $t['subjectCode'] ?? 'T148';
      if (empty($t['subjectCode']) && !empty($t['subject'])) {
        $parts = explode(' - ', $t['subject']);
        $subCode = trim($parts[0]);
      }
      $priority = in_array($t['priority'] ?? '', ['High', 'Medium', 'Low'], true) ? $t['priority'] : 'Medium';
      $status = in_array($t['status'] ?? '', ['Pending', 'Submitted', 'Completed', 'Overdue'], true) ? $t['status'] : 'Pending';

      try {
        $taskStmt->execute([
          ':id' => $t['id'],
          ':title' => $t['title'],
          ':subject_code' => $subCode,
          ':subject_label' => $t['subject'] ?? $subCode,
          ':instructor_name' => $t['instructor'] ?? ($t['publishedBy'] ?? 'Faculty'),
          ':deadline' => !empty($t['deadline']) ? $t['deadline'] : date('Y-m-d'),
          ':priority' => $priority,
          ':status' => $status,
          ':description' => $t['description'] ?? '',
          ':published_by' => $t['publishedBy'] ?? ($t['instructor'] ?? 'Faculty')
        ]);
      } catch (Throwable $_) {}

      if (!empty($t['submissions']) && is_array($t['submissions'])) {
        foreach ($t['submissions'] as $stuNo => $subData) {
          if (!is_array($subData)) continue;
          $subStatus = ($subData['status'] ?? '') === 'Completed' ? 'Completed' : 'Submitted';
          try {
            $subStmt->execute([
              ':task_id' => $t['id'],
              ':student_number' => $subData['studentNumber'] ?? $stuNo,
              ':student_name' => $subData['studentName'] ?? 'Racel Valiente (Demo Student)',
              ':status' => $subStatus,
              ':response_text' => $subData['responseText'] ?? '',
              ':submitted_at' => !empty($subData['submittedAt']) ? $subData['submittedAt'] : date('Y-m-d')
            ]);
          } catch (Throwable $_) {}
        }
      }
    }
  }

  // 6. Sync Announcements (`announcements`)
  if (isset($state['announcements']) && is_array($state['announcements'])) {
    $annStmt = $pdo->prepare("
      INSERT INTO `announcements`
        (`id`, `title`, `category`, `publish_date`, `author`, `description`, `published`, `is_read`)
      VALUES
        (:id, :title, :category, :publish_date, :author, :description, :published, :is_read)
      ON DUPLICATE KEY UPDATE
        `title` = VALUES(`title`),
        `category` = VALUES(`category`),
        `publish_date` = VALUES(`publish_date`),
        `author` = VALUES(`author`),
        `description` = VALUES(`description`),
        `published` = VALUES(`published`),
        `is_read` = VALUES(`is_read`)
    ");
    foreach ($state['announcements'] as $a) {
      if (empty($a['id']) || empty($a['title'])) continue;
      try {
        $annStmt->execute([
          ':id' => $a['id'],
          ':title' => $a['title'],
          ':category' => $a['category'] ?? 'Academic',
          ':publish_date' => !empty($a['date']) ? $a['date'] : date('Y-m-d'),
          ':author' => $a['author'] ?? 'BANTUG UNIVERSITY Faculty',
          ':description' => $a['description'] ?? '',
          ':published' => (!isset($a['published']) || $a['published'] !== false) ? 1 : 0,
          ':is_read' => !empty($a['read']) ? 1 : 0
        ]);
      } catch (Throwable $_) {}
    }
  }

  // 7. Sync Learning Resources (`learning_resources`)
  if (isset($state['resources']) && is_array($state['resources'])) {
    $resStmt = $pdo->prepare("
      INSERT INTO `learning_resources`
        (`id`, `title`, `subject_label`, `category`, `url`, `description`)
      VALUES
        (:id, :title, :subject_label, :category, :url, :description)
      ON DUPLICATE KEY UPDATE
        `title` = VALUES(`title`),
        `subject_label` = VALUES(`subject_label`),
        `category` = VALUES(`category`),
        `url` = VALUES(`url`),
        `description` = VALUES(`description`)
    ");
    foreach ($state['resources'] as $r) {
      if (empty($r['id']) || empty($r['title'])) continue;
      try {
        $resStmt->execute([
          ':id' => $r['id'],
          ':title' => $r['title'],
          ':subject_label' => $r['subject'] ?? 'BSIT 2-2',
          ':category' => $r['category'] ?? 'Reference Links',
          ':url' => $r['url'] ?? '',
          ':description' => $r['description'] ?? ''
        ]);
      } catch (Throwable $_) {}
    }
  }

  // 8. Sync Both Demo Applicant Records (15 Preloaded) & Public Applicant Submissions (`applications`)
  $appStmt = $pdo->prepare("
    INSERT INTO `applications` (
      `id`, `reference_number`, `full_name`, `date_of_birth`, `email`, `contact_number`,
      `address`, `applicant_type`, `year_level`, `desired_program`, `second_choice_program`,
      `previous_school`, `educational_background`, `graduation_year`, `submitted_date`,
      `status`, `is_demo_record`, `remarks`
    ) VALUES (
      :id, :reference_number, :full_name, :date_of_birth, :email, :contact_number,
      :address, :applicant_type, :year_level, :desired_program, :second_choice_program,
      :previous_school, :educational_background, :graduation_year, :submitted_date,
      :status, :is_demo_record, :remarks
    )
    ON DUPLICATE KEY UPDATE
      `full_name` = VALUES(`full_name`),
      `email` = VALUES(`email`),
      `contact_number` = VALUES(`contact_number`),
      `address` = VALUES(`address`),
      `applicant_type` = VALUES(`applicant_type`),
      `year_level` = VALUES(`year_level`),
      `desired_program` = VALUES(`desired_program`),
      `second_choice_program` = VALUES(`second_choice_program`),
      `previous_school` = VALUES(`previous_school`),
      `educational_background` = VALUES(`educational_background`),
      `graduation_year` = VALUES(`graduation_year`),
      `submitted_date` = VALUES(`submitted_date`),
      `status` = VALUES(`status`),
      `remarks` = VALUES(`remarks`)
  ");

  $allIncomingApps = [];
  if (!empty($state['demoApplicantRecords']) && is_array($state['demoApplicantRecords'])) {
    foreach ($state['demoApplicantRecords'] as $dApp) {
      if (is_array($dApp)) {
        $dApp['_isDemo'] = 1;
        $allIncomingApps[] = $dApp;
      }
    }
  }
  if (!empty($state['applications']) && is_array($state['applications'])) {
    foreach ($state['applications'] as $uApp) {
      if (is_array($uApp)) {
        $uApp['_isDemo'] = !empty($uApp['isDemoRecord']) ? 1 : 0;
        $allIncomingApps[] = $uApp;
      }
    }
  }

  foreach ($allIncomingApps as $app) {
    if (empty($app['id']) || empty($app['referenceNumber'])) continue;
    $yr = in_array($app['yearLevel'] ?? '', $validYears, true) ? $app['yearLevel'] : 'Year 1';
    $normStatus = normalizeApplicationStatus((string)($app['status'] ?? 'Pending'));
    try {
      $appStmt->execute([
        ':id' => $app['id'],
        ':reference_number' => $app['referenceNumber'],
        ':full_name' => $app['fullName'] ?? '',
        ':date_of_birth' => !empty($app['dateOfBirth']) ? $app['dateOfBirth'] : '2007-01-01',
        ':email' => $app['email'] ?? '',
        ':contact_number' => $app['contactNumber'] ?? '',
        ':address' => $app['address'] ?? '',
        ':applicant_type' => $app['applicantType'] ?? 'Freshman',
        ':year_level' => $yr,
        ':desired_program' => $app['desiredProgram'] ?? '',
        ':second_choice_program' => $app['secondChoiceProgram'] ?? 'None',
        ':previous_school' => $app['previousSchool'] ?? '',
        ':educational_background' => $app['educationalBackground'] ?? '',
        ':graduation_year' => (string)($app['graduationYear'] ?? '2026'),
        ':submitted_date' => !empty($app['submittedDate']) ? $app['submittedDate'] : date('Y-m-d'),
        ':status' => $normStatus,
        ':is_demo_record' => (int)($app['_isDemo'] ?? 0),
        ':remarks' => $app['remarks'] ?? 'Submitted via BANTUG UNIVERSITY Online Application Form.'
      ]);
    } catch (Throwable $_) {}
  }
}

try {
  if ($action === 'load') {
    $stmt = $pdo->prepare("SELECT `state_json`, `schema_version`, `updated_at` FROM `portal_state_store` WHERE `state_key` = 'bantug_university_portal_v2' LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch();

    $dbApps = fetchAllApplicationsFromMySQL($pdo);

    if ($row && !empty($row['state_json'])) {
      echo json_encode([
        'ok' => true,
        'source' => 'mysql',
        'schemaVersion' => (int)$row['schema_version'],
        'updatedAt' => $row['updated_at'],
        'state' => json_decode($row['state_json'], true),
        'applications' => $dbApps
      ]);
      exit;
    }

    echo json_encode([
      'ok' => true,
      'source' => 'mysql_applications_only',
      'state' => null,
      'applications' => $dbApps
    ]);
    exit;
  }

  if ($action === 'update_application_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawBody = file_get_contents('php://input');
    $decoded = json_decode($rawBody, true);
    if (!is_array($decoded) || empty($decoded['referenceNumber']) || empty($decoded['status'])) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'message' => 'Missing referenceNumber or status.']);
      exit;
    }

    $refNo = trim((string)$decoded['referenceNumber']);
    $newStatus = normalizeApplicationStatus((string)$decoded['status']);
    $remarks = isset($decoded['remarks']) ? trim((string)$decoded['remarks']) : null;

    if ($remarks !== null && $remarks !== '') {
      $updStmt = $pdo->prepare("
        UPDATE `applications`
        SET `status` = :status, `remarks` = :remarks
        WHERE `reference_number` = :ref
      ");
      $updStmt->execute([
        ':status' => $newStatus,
        ':remarks' => $remarks,
        ':ref' => $refNo
      ]);
    } else {
      $updStmt = $pdo->prepare("
        UPDATE `applications`
        SET `status` = :status
        WHERE `reference_number` = :ref
      ");
      $updStmt->execute([
        ':status' => $newStatus,
        ':ref' => $refNo
      ]);
    }

    // Also update portal_state_store JSON if stored
    $sStmt = $pdo->prepare("SELECT `state_json` FROM `portal_state_store` WHERE `state_key` = 'bantug_university_portal_v2' LIMIT 1");
    $sStmt->execute();
    $sRow = $sStmt->fetch();
    if ($sRow && !empty($sRow['state_json'])) {
      $storedState = json_decode($sRow['state_json'], true);
      if (is_array($storedState)) {
        foreach (['demoApplicantRecords', 'applications'] as $listKey) {
          if (!empty($storedState[$listKey]) && is_array($storedState[$listKey])) {
            foreach ($storedState[$listKey] as &$item) {
              if (isset($item['referenceNumber']) && strcasecmp($item['referenceNumber'], $refNo) === 0) {
                $item['status'] = $newStatus;
                if ($remarks !== null && $remarks !== '') {
                  $item['remarks'] = $remarks;
                }
              }
            }
            unset($item);
          }
        }
        $saveStmt = $pdo->prepare("
          UPDATE `portal_state_store`
          SET `state_json` = :state_json
          WHERE `state_key` = 'bantug_university_portal_v2'
        ");
        $saveStmt->execute([
          ':state_json' => json_encode($storedState, JSON_UNESCAPED_UNICODE)
        ]);
      }
    }

    echo json_encode([
      'ok' => true,
      'referenceNumber' => $refNo,
      'status' => $newStatus,
      'message' => "Application {$refNo} status updated to {$newStatus} in MySQL."
    ]);
    exit;
  }

  if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawBody = file_get_contents('php://input');
    $decoded = json_decode($rawBody, true);
    if (!is_array($decoded) || empty($decoded['state']) || !is_array($decoded['state'])) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'message' => 'Invalid state payload.']);
      exit;
    }

    $state = $decoded['state'];
    $schemaVersion = isset($state['schemaVersion']) ? (int)$state['schemaVersion'] : 8;

    $stmt = $pdo->prepare("
      INSERT INTO `portal_state_store` (`state_key`, `schema_version`, `state_json`)
      VALUES ('bantug_university_portal_v2', :schema_version, :state_json)
      ON DUPLICATE KEY UPDATE
        `schema_version` = VALUES(`schema_version`),
        `state_json` = VALUES(`state_json`)
    ");
    $stmt->execute([
      ':schema_version' => $schemaVersion,
      ':state_json' => json_encode($state, JSON_UNESCAPED_UNICODE)
    ]);

    // Synchronize all relational SQL tables for phpMyAdmin inspection
    syncRelationalTables($pdo, $state);

    echo json_encode([
      'ok' => true,
      'message' => 'All inputs saved to XAMPP MySQL database (bantug_university_db).'
    ]);
    exit;
  }

  if ($action === 'reset' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $sqlFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'bantug_university_portal.sql';
    if (is_readable($sqlFile)) {
      $sqlContent = file_get_contents($sqlFile);
      if ($sqlContent !== false) {
        $pdo->exec($sqlContent);
      }
    }
    echo json_encode([
      'ok' => true,
      'message' => 'XAMPP MySQL database reset and re-seeded with 15 records per category.'
    ]);
    exit;
  }

  // Default: status check + table row counts
  $counts = [];
  foreach (['users', 'students', 'faculty', 'subjects', 'subject_schedules', 'student_enrollments', 'student_grades', 'attendance_records', 'tasks', 'task_submissions', 'announcements', 'learning_resources', 'applications'] as $tbl) {
    try {
      $cStmt = $pdo->query("SELECT COUNT(*) FROM `{$tbl}`");
      $counts[$tbl] = (int)$cStmt->fetchColumn();
    } catch (Throwable $_) {
      $counts[$tbl] = 0;
    }
  }

  echo json_encode([
    'ok' => true,
    'database' => BU_DB_NAME,
    'tableCounts' => $counts
  ]);
} catch (Throwable $err) {
  http_response_code(500);
  echo json_encode([
    'ok' => false,
    'message' => $err->getMessage()
  ]);
}
