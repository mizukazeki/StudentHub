<?php
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System (Revision 7)
 * XAMPP MySQL / MariaDB Database Connection & Auto-Seeding (api/config.php)
 * ============================================================================
 * Default XAMPP MySQL Credentials:
 * - Host: 127.0.0.1 (localhost)
 * - Port: 3306
 * - User: root
 * - Password: "" (empty in standard XAMPP)
 * - Database: bantug_university_db
 * ============================================================================
 */

define('BU_DB_HOST', '127.0.0.1');
define('BU_DB_PORT', 3306);
define('BU_DB_USER', 'root');
define('BU_DB_PASS', '');
define('BU_DB_NAME', 'bantug_university_db');

/**
 * Connect to MySQL in XAMPP and automatically create/seed `bantug_university_db`
 * from `database/bantug_university_portal.sql` if it does not exist yet or if
 * the 15 preloaded records per category have not been seeded yet.
 *
 * Uses non-destructive `INSERT ... ON DUPLICATE KEY UPDATE` so existing
 * user-created records are never deleted.
 *
 * @return PDO|null
 */
function getBantugDatabaseConnection() {
  static $pdo = null;
  if ($pdo !== null) {
    return $pdo;
  }

  try {
    $dsnNoDb = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', BU_DB_HOST, BU_DB_PORT);
    $pdo = new PDO($dsnNoDb, BU_DB_USER, BU_DB_PASS, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Check if database and Revision 7 15-record seed exist
    $stmt = $pdo->query("SHOW DATABASES LIKE '" . BU_DB_NAME . "'");
    $dbExists = (bool) $stmt->fetchColumn();

    $needsSeed = !$dbExists;
    if ($dbExists) {
      $pdo->exec('USE `' . BU_DB_NAME . '`');
      $checkTable = $pdo->query("SHOW TABLES LIKE 'students'");
      if (!$checkTable->fetchColumn()) {
        $needsSeed = true;
      } else {
        try {
          $stuCount = (int)$pdo->query("SELECT COUNT(*) FROM `students`")->fetchColumn();
          $facCount = (int)$pdo->query("SELECT COUNT(*) FROM `faculty`")->fetchColumn();
          $appCount = (int)$pdo->query("SELECT COUNT(*) FROM `applications`")->fetchColumn();
          if ($stuCount < 15 || $facCount < 15 || $appCount < 15) {
            $needsSeed = true;
          }
        } catch (Throwable $_) {
          $needsSeed = true;
        }
      }
    }

    if ($needsSeed) {
      if ($dbExists) {
        try {
          $pdo->exec("ALTER TABLE `applications` MODIFY COLUMN `status` ENUM('Pending','Submitted','Under Review','Approved','Rejected') NOT NULL DEFAULT 'Pending'");
        } catch (Throwable $_) {}
      }
      $sqlFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'bantug_university_portal.sql';
      if (is_readable($sqlFile)) {
        $sqlContent = file_get_contents($sqlFile);
        if ($sqlContent !== false) {
          $pdo->exec($sqlContent);
        }
      }
      $pdo->exec('USE `' . BU_DB_NAME . '`');
    }

    return $pdo;
  } catch (Throwable $e) {
    return null;
  }
}
