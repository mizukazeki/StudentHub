// Database migration runner and demo dataset seeder.
/**
 * ============================================================================
 * BANTUG UNIVERSITY – Student Portal System (Revision 7)
 * Automatic Database Seeding & Safe Schema Migration Script (database/seed.js)
 * ============================================================================
 * Automatically creates, migrates, and seeds `bantug_university_db` with:
 * - 15 Student Accounts (BSIT Year 1, Year 2, Year 3, Year 4, including BSIT 2-2)
 * - 15 Faculty Accounts (Assigned subjects & individual non-overlapping schedules)
 * - 15 Applicant Records (Pending, Under Review, Approved, Rejected)
 * - 45 Hashed User Credentials in `users` (Never stores plain-text passwords)
 * - Related subjects, schedules, enrollments, grades, attendance, tasks,
 *   announcements, and learning resources.
 *
 * Non-destructive: Uses `CREATE TABLE IF NOT EXISTS`, programmatic column checks,
 * and `INSERT INTO ... ON DUPLICATE KEY UPDATE` / `INSERT IGNORE` so running this
 * script multiple times never duplicates records or deletes user-created data.
 *
 * Usage:
 *   node database/seed.js
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawn } = require("child_process");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryAutoStartXamppMySql(mysql, config) {
  const candidates = [
    {
      bin: "C:\\xampp\\mysql\\bin\\mysqld.exe",
      ini: "C:\\xampp\\mysql\\bin\\my.ini"
    },
    {
      bin: "D:\\xampp\\mysql\\bin\\mysqld.exe",
      ini: "D:\\xampp\\mysql\\bin\\my.ini"
    }
  ];
  const found = candidates.find((c) => fs.existsSync(c.bin));
  if (!found) return false;

  try {
    const args = fs.existsSync(found.ini) ? [`--defaults-file=${found.ini}`] : [];
    const child = spawn(found.bin, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();

    for (let i = 0; i < 25; i++) {
      await sleep(400);
      try {
        const testConn = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password
        });
        await testConn.end();
        return true;
      } catch (_) {}
    }
  } catch (_) {}
  return false;
}

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bantug_university_db",
  multipleStatements: true
};

/**
 * Deterministically hash a password using PBKDF2-SHA256 / Modular Crypt Format
 * so plain-text passwords are never stored in MySQL.
 */
function hashPassword(plainPassword, accountKey) {
  const salt = crypto
    .createHash("sha256")
    .update(`bantug.univ.salt.v7.${accountKey}`)
    .digest("hex")
    .slice(0, 16);
  const derived = crypto
    .pbkdf2Sync(String(plainPassword), salt, 10000, 32, "sha256")
    .toString("base64");
  return `$pbkdf2-sha256$10000$${salt}$${derived}`;
}

/**
 * Inspect existing `applications` and `announcements` tables in MySQL and
 * safely add or migrate any missing columns without dropping existing data.
 */
async function applySafeSchemaMigrations(conn) {
  // 1. Inspect `applications` table columns if table exists
  try {
    const [appCols] = await conn.query("SHOW COLUMNS FROM `applications`");
    const colNames = new Set(appCols.map((c) => c.Field));

    if (!colNames.has("application_id") && colNames.has("id")) {
      // Older Revision 6 schema where `id` was VARCHAR(40) PK:
      // Add `application_id` or keep `id` nullable so inserts without `id` succeed
      const idCol = appCols.find((c) => c.Field === "id");
      if (idCol && idCol.Key === "PRI") {
        await conn.query("ALTER TABLE `applications` DROP PRIMARY KEY");
      }
      await conn.query("ALTER TABLE `applications` MODIFY COLUMN `id` VARCHAR(40) DEFAULT NULL");
      await conn.query(
        "ALTER TABLE `applications` ADD COLUMN `application_id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST"
      );
    } else if (!colNames.has("id")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `id` VARCHAR(40) DEFAULT NULL AFTER `application_id`");
    }

    if (!colNames.has("username")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `username` VARCHAR(60) DEFAULT NULL AFTER `reference_number`");
    }
    if (!colNames.has("is_demo_record")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `is_demo_record` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`");
    }
    if (!colNames.has("remarks")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `remarks` TEXT DEFAULT NULL");
    }
    if (!colNames.has("updated_by")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `updated_by` VARCHAR(120) DEFAULT NULL AFTER `remarks`");
    }
    if (!colNames.has("status_updated_at")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `status_updated_at` DATETIME DEFAULT NULL AFTER `updated_by`");
    }
    if (!colNames.has("created_at")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (!colNames.has("updated_at")) {
      await conn.query(
        "ALTER TABLE `applications` ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      );
    }

    // Ensure graduation_year is VARCHAR(10) and status is VARCHAR(30) DEFAULT 'Pending'
    await conn.query("ALTER TABLE `applications` MODIFY COLUMN `graduation_year` VARCHAR(10) NOT NULL DEFAULT '2026'");
    await conn.query("ALTER TABLE `applications` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'Pending'");
    await conn.query("UPDATE `applications` SET `status` = 'Pending' WHERE `status` = 'Submitted' OR `status` = ''");
    await conn.query("UPDATE `applications` SET `id` = CONCAT('app_', `application_id`) WHERE `id` IS NULL OR `id` = ''");
  } catch (_) {
    // Table does not exist yet; will be created by SQL script
  }

  // 2. Inspect `announcements` table columns if table exists
  try {
    const [annCols] = await conn.query("SHOW COLUMNS FROM `announcements`");
    const colNames = new Set(annCols.map((c) => c.Field));

    // If older Revision 6 schema used `id` instead of `announcement_id`, rename it safely
    if (!colNames.has("announcement_id") && colNames.has("id")) {
      await conn.query("ALTER TABLE `announcements` CHANGE COLUMN `id` `announcement_id` VARCHAR(40) NOT NULL");
    } else if (colNames.has("announcement_id")) {
      await conn.query("ALTER TABLE `announcements` MODIFY COLUMN `announcement_id` VARCHAR(40) NOT NULL");
    }

    // If older Revision 6 schema used `published` instead of `is_published`, rename it safely
    if (!colNames.has("is_published") && colNames.has("published")) {
      await conn.query("ALTER TABLE `announcements` CHANGE COLUMN `published` `is_published` TINYINT(1) NOT NULL DEFAULT 1");
    } else if (!colNames.has("is_published")) {
      await conn.query("ALTER TABLE `announcements` ADD COLUMN `is_published` TINYINT(1) NOT NULL DEFAULT 1");
    }

    if (!colNames.has("faculty_id")) {
      await conn.query("ALTER TABLE `announcements` ADD COLUMN `faculty_id` VARCHAR(30) DEFAULT 'FAC-BU-04' AFTER `author`");
    }
    if (!colNames.has("target_audience")) {
      await conn.query(
        "ALTER TABLE `announcements` ADD COLUMN `target_audience` VARCHAR(100) NOT NULL DEFAULT 'All BSIT Students' AFTER `faculty_id`"
      );
    }
    if (!colNames.has("is_read")) {
      await conn.query("ALTER TABLE `announcements` ADD COLUMN `is_read` TINYINT(1) NOT NULL DEFAULT 0");
    }
    if (!colNames.has("created_at")) {
      await conn.query("ALTER TABLE `announcements` ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (!colNames.has("updated_at")) {
      await conn.query(
        "ALTER TABLE `announcements` ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      );
    }
  } catch (_) {
    // Table does not exist yet; will be created by SQL script
  }

  // 3. Inspect `subjects` table columns if table exists
  try {
    const [subCols] = await conn.query("SHOW COLUMNS FROM `subjects`");
    const colNames = new Set(subCols.map((c) => c.Field));
    if (!colNames.has("is_sample_schedule")) {
      await conn.query("ALTER TABLE `subjects` ADD COLUMN `is_sample_schedule` TINYINT(1) NOT NULL DEFAULT 0");
    }
  } catch (_) {
    // Table does not exist yet; will be created by SQL script
  }

  // 4. Inspect `subject_schedules` table columns if table exists
  try {
    const [schedCols] = await conn.query("SHOW COLUMNS FROM `subject_schedules`");
    const colNames = new Set(schedCols.map((c) => c.Field));
    if (!colNames.has("course_code")) {
      await conn.query("ALTER TABLE `subject_schedules` ADD COLUMN `course_code` VARCHAR(30) DEFAULT NULL AFTER `subject_code`");
    }
    if (!colNames.has("subject_name")) {
      await conn.query("ALTER TABLE `subject_schedules` ADD COLUMN `subject_name` VARCHAR(150) DEFAULT NULL AFTER `course_code`");
    }
    if (!colNames.has("faculty_id")) {
      await conn.query("ALTER TABLE `subject_schedules` ADD COLUMN `faculty_id` VARCHAR(20) DEFAULT NULL AFTER `subject_name`");
    }
    if (!colNames.has("instructor_name")) {
      await conn.query("ALTER TABLE `subject_schedules` ADD COLUMN `instructor_name` VARCHAR(120) DEFAULT NULL AFTER `faculty_id`");
    }
    if (!colNames.has("year_level")) {
      await conn.query(
        "ALTER TABLE `subject_schedules` ADD COLUMN `year_level` ENUM('Year 1', 'Year 2', 'Year 3', 'Year 4') NOT NULL DEFAULT 'Year 2' AFTER `instructor_name`"
      );
    }
    await conn.query("ALTER TABLE `subject_schedules` MODIFY COLUMN `room` VARCHAR(60) NOT NULL DEFAULT 'Not specified'");
    if (!colNames.has("class_type")) {
      await conn.query("ALTER TABLE `subject_schedules` ADD COLUMN `class_type` VARCHAR(30) NOT NULL DEFAULT 'Lecture'");
    }
    if (!colNames.has("academic_term")) {
      await conn.query(
        "ALTER TABLE `subject_schedules` ADD COLUMN `academic_term` VARCHAR(60) NOT NULL DEFAULT '2nd Semester, AY 2026–2027'"
      );
    }
    if (!colNames.has("is_sample_schedule")) {
      await conn.query("ALTER TABLE `subject_schedules` ADD COLUMN `is_sample_schedule` TINYINT(1) NOT NULL DEFAULT 0");
    }
    // Remove legacy Revision 7 T303 Friday 09:00:00 entry if replaced by Friday 13:00:00
    await conn.query(
      "DELETE FROM `subject_schedules` WHERE `subject_code` = 'T303' AND `day_of_week` = 'Friday' AND `start_time` = '09:00:00'"
    );
  } catch (_) {
    // Table does not exist yet; will be created by SQL script
  }

  // 5. Ensure `user_sessions` and `audit_logs` tables exist
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`user_sessions\` (
        \`session_token\` VARCHAR(96) NOT NULL,
        \`username\` VARCHAR(60) NOT NULL,
        \`role\` ENUM('student', 'faculty', 'applicant', 'admin') NOT NULL DEFAULT 'student',
        \`actor_id\` VARCHAR(40) DEFAULT NULL,
        \`actor_name\` VARCHAR(120) NOT NULL,
        \`is_applicant_demo\` TINYINT(1) NOT NULL DEFAULT 0,
        \`is_revoked\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`expires_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`session_token\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`log_id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`actor_id\` VARCHAR(40) DEFAULT NULL,
        \`actor_name\` VARCHAR(120) NOT NULL,
        \`actor_role\` VARCHAR(30) NOT NULL DEFAULT 'system',
        \`action_type\` VARCHAR(60) NOT NULL,
        \`target_type\` VARCHAR(60) NOT NULL,
        \`target_id\` VARCHAR(80) NOT NULL,
        \`details\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`log_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (_) {}

  // 6. Safe inspection of applications table: ensure reference_number and UNIQUE constraint (Phase 2)
  try {
    const [appCols] = await conn.query("SHOW COLUMNS FROM `applications`");
    const colNames = new Set(appCols.map((c) => c.Field));
    if (!colNames.has("reference_number")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `reference_number` VARCHAR(30) NOT NULL AFTER `id`");
    }
    // Populate any empty or null reference numbers safely
    await conn.query(
      "UPDATE `applications` SET `reference_number` = CONCAT('BU-2026-', LPAD(application_id, 6, '0')) WHERE `reference_number` IS NULL OR TRIM(`reference_number`) = ''"
    );
    // Ensure UNIQUE index on reference_number
    const [indexes] = await conn.query("SHOW INDEX FROM `applications` WHERE Key_name = 'uk_application_ref'");
    if (indexes.length === 0) {
      await conn.query("ALTER TABLE `applications` ADD UNIQUE KEY `uk_application_ref` (`reference_number`)");
    }
  } catch (_) {}

  // 7. Safe inspection of users table: ensure is_active column exists (Phase 4)
  try {
    const [userCols] = await conn.query("SHOW COLUMNS FROM `users`");
    const colNames = new Set(userCols.map((c) => c.Field));
    if (!colNames.has("is_active")) {
      await conn.query("ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_demo_account`");
    }
  } catch (_) {}

  // 8. Safe inspection of tables & columns for Phase 7: email_otps, notification_logs, applications, users
  try {
    // Create email_otps table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`email_otps\` (
        \`otp_id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`email\` VARCHAR(120) NOT NULL,
        \`otp_hash\` VARCHAR(255) NOT NULL,
        \`salt\` VARCHAR(32) NOT NULL,
        \`purpose\` ENUM('email_verification', 'password_reset') NOT NULL,
        \`reference_id\` VARCHAR(60) DEFAULT NULL,
        \`attempts\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`is_verified\` TINYINT(1) NOT NULL DEFAULT 0,
        \`is_used\` TINYINT(1) NOT NULL DEFAULT 0,
        \`expires_at\` DATETIME NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`otp_id\`),
        KEY \`idx_email_purpose\` (\`email\`, \`purpose\`),
        KEY \`idx_expires\` (\`expires_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create notification_logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`notification_logs\` (
        \`notification_id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`recipient_email\` VARCHAR(120) NOT NULL,
        \`recipient_name\` VARCHAR(120) NOT NULL,
        \`notification_type\` VARCHAR(60) NOT NULL,
        \`subject\` VARCHAR(255) NOT NULL,
        \`reference_id\` VARCHAR(60) DEFAULT NULL,
        \`delivery_status\` ENUM('sent', 'failed', 'unconfigured') NOT NULL DEFAULT 'unconfigured',
        \`error_message\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`notification_id\`),
        KEY \`idx_recipient_type\` (\`recipient_email\`, \`notification_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Inspect applications table columns
    const [appCols] = await conn.query("SHOW COLUMNS FROM `applications`");
    const appColSet = new Set(appCols.map((c) => c.Field));
    if (!appColSet.has("email_verified")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `email_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `email`");
    }
    if (!appColSet.has("approval_email_sent")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `approval_email_sent` TINYINT(1) NOT NULL DEFAULT 0 AFTER `remarks`");
    }
    if (!appColSet.has("approval_email_sent_at")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `approval_email_sent_at` DATETIME DEFAULT NULL AFTER `approval_email_sent`");
    }
    if (!appColSet.has("approved_program")) {
      await conn.query("ALTER TABLE `applications` ADD COLUMN `approved_program` VARCHAR(150) DEFAULT NULL AFTER `desired_program`");
    }

    // Inspect users table columns
    const [userCols] = await conn.query("SHOW COLUMNS FROM `users`");
    const userColSet = new Set(userCols.map((c) => c.Field));
    if (!userColSet.has("email_verified")) {
      await conn.query("ALTER TABLE `users` ADD COLUMN `email_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `email`");
      await conn.query("UPDATE `users` SET `email_verified` = 1 WHERE `is_demo_account` = 1");
    }

    // 9. Safe inspection of tables & columns for Phase 8: Secure Admin Panel
    const roleCol = userCols.find((c) => c.Field === "role");
    if (roleCol && !roleCol.Type.includes("'admin'")) {
      await conn.query(
        "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('student', 'faculty', 'applicant', 'admin') NOT NULL DEFAULT 'student'"
      );
    }

    if (!userColSet.has("must_change_password")) {
      await conn.query(
        "ALTER TABLE `users` ADD COLUMN `must_change_password` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`"
      );
    }

    if (!userColSet.has("department")) {
      await conn.query(
        "ALTER TABLE `users` ADD COLUMN `department` VARCHAR(100) DEFAULT NULL AFTER `full_name`"
      );
    }

    if (!userColSet.has("section")) {
      await conn.query(
        "ALTER TABLE `users` ADD COLUMN `section` VARCHAR(50) DEFAULT NULL AFTER `department`"
      );
    }

    // Ensure initial administrator account exists safely without duplicates (Part B)
    const adminUser = process.env.ADMIN_INITIAL_USER || "admin";
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || "ChangeMeAdmin2026!";
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@bantug.edu.example";
    const adminName = process.env.ADMIN_INITIAL_NAME || "System Administrator";

    const [existingAdmins] = await conn.query(
      "SELECT `user_id`, `username`, `role`, `must_change_password` FROM `users` WHERE `role` = 'admin' OR `username` = ? LIMIT 1",
      [adminUser]
    );

    if (existingAdmins.length === 0) {
      const salt = crypto.randomBytes(8).toString("hex");
      const derived = crypto
        .pbkdf2Sync(String(adminPass).trim(), salt, 10000, 32, "sha256")
        .toString("base64");
      const hashedPass = `$pbkdf2-sha256$10000$${salt}$${derived}`;

      await conn.query(
        `INSERT INTO \`users\` (
          \`username\`, \`email\`, \`email_verified\`, \`password_hash\`, \`role\`,
          \`reference_id\`, \`full_name\`, \`department\`, \`is_demo_account\`,
          \`is_active\`, \`must_change_password\`
        ) VALUES (?, ?, 1, ?, 'admin', 'ADMIN-001', ?, 'IT & System Administration', 0, 1, 1)`,
        [adminUser, adminEmail, hashedPass, adminName]
      );
    }
  } catch (err) {
    console.warn("[Phase 8 Migration Notice]:", err.message);
  }
}

/**
 * Execute SQL seed and safe migrations against MySQL using `mysql2/promise`
 * (or XAMPP's MySQL CLI fallback).
 */
async function seedDatabase(existingPool = null) {
  const sqlFilePath = path.join(__dirname, "bantug_university_portal.sql");
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL seed file not found at ${sqlFilePath}`);
  }
  const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

  // 1. Use mysql2/promise
  try {
    const mysql = require("mysql2/promise");
    let connection;
    try {
      connection = await mysql.createConnection({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        multipleStatements: true
      });
    } catch (connErr) {
      if (connErr && connErr.code === "ECONNREFUSED") {
        await tryAutoStartXamppMySql(mysql, DB_CONFIG);
        connection = await mysql.createConnection({
          host: DB_CONFIG.host,
          port: DB_CONFIG.port,
          user: DB_CONFIG.user,
          password: DB_CONFIG.password,
          multipleStatements: true
        });
      } else {
        throw connErr;
      }
    }

    try {
      await connection.query(
        "CREATE DATABASE IF NOT EXISTS `bantug_university_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
      );
      await connection.query("USE `bantug_university_db`;");
      await applySafeSchemaMigrations(connection);

      // Strip MariaDB-specific `ADD COLUMN IF NOT EXISTS` lines if running on a server that already ran applySafeSchemaMigrations
      const compatibleSql = sqlContent
        .split("\n")
        .filter((line) => !line.trim().toUpperCase().startsWith("ALTER TABLE "))
        .join("\n");

      await connection.query(compatibleSql);
      await applySafeSchemaMigrations(connection);
    } finally {
      await connection.end();
    }

    return {
      ok: true,
      driver: "mysql2"
    };
  } catch (mysql2Err) {
    if (mysql2Err.code !== "MODULE_NOT_FOUND") {
      throw mysql2Err;
    }
  }

  // 2. Fallback to XAMPP mysql.exe CLI if mysql2 is not installed
  const mysqlBinCandidates = [
    "C:\\xampp\\mysql\\bin\\mysql.exe",
    "D:\\xampp\\mysql\\bin\\mysql.exe",
    "mysql"
  ];

  for (const bin of mysqlBinCandidates) {
    if (bin.includes("\\") && !fs.existsSync(bin)) continue;
    try {
      const args = [
        `-h${DB_CONFIG.host}`,
        `-P${DB_CONFIG.port}`,
        `-u${DB_CONFIG.user}`,
        "--default-character-set=utf8mb4"
      ];
      if (DB_CONFIG.password) {
        args.push(`-p${DB_CONFIG.password}`);
      }
      execFileSync(bin, args, {
        input: sqlContent,
        stdio: ["pipe", "pipe", "pipe"]
      });

      return {
        ok: true,
        driver: bin
      };
    } catch (_) {}
  }

  throw new Error(
    "Could not connect to MySQL. Ensure MySQL is running in XAMPP Control Panel (port 3306)."
  );
}

if (require.main === module) {
  seedDatabase()
    .then((res) => {
      console.log("==============================================================");
      console.log("BANTUG UNIVERSITY – Database Migration & Seed Complete!");
      console.log(`Driver            : ${res.driver}`);
      console.log(`Database          : ${DB_CONFIG.database}`);
      console.log("==============================================================");
    })
    .catch((err) => {
      console.error("[BANTUG UNIVERSITY Seed Error]:", err.message);
      process.exitCode = 1;
    });
}

module.exports = {
  DB_CONFIG,
  hashPassword,
  applySafeSchemaMigrations,
  seedDatabase
};
