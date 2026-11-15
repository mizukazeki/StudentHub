// Maintenance utility to reset the administrator account password securely.
/**
 * BANTUG UNIVERSITY - Administrator Password Reset Utility
 * Target: System Administrator (Account ID: ADMIN-001, Username: admin)
 *
 * Security Compliance:
 * - Uses existing PBKDF2 ($pbkdf2-sha256$10000$<salt>$<derived>) hashing
 * - Enforces must_change_password = 1 flag
 * - Strictly verifies identity of ADMIN-001 before update
 * - Never prints plaintext password or hash to stdout/stderr
 * - Accepts password via ADMIN_TEMP_PASSWORD environment variable or CLI argument
 */

const crypto = require("crypto");
const mysql = require("mysql2/promise");

async function resetAdminPassword() {
  const newPassword = (process.env.ADMIN_TEMP_PASSWORD || process.argv[2] || "").trim();

  if (!newPassword) {
    console.error("[ERROR] Missing password argument. Provide via ADMIN_TEMP_PASSWORD env var or CLI argument.");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bantug_university_db"
  });

  try {
    // 1. Identify existing target administrator account
    const [rows] = await conn.query(
      `SELECT user_id, username, reference_id, role, full_name, email, is_active
       FROM \`users\`
       WHERE \`reference_id\` = 'ADMIN-001' AND \`username\` = 'admin' AND \`role\` = 'admin'`
    );

    if (!rows || rows.length !== 1) {
      console.error(`[ERROR] Target account ADMIN-001 (@admin) could not be safely identified. Found: ${rows ? rows.length : 0} matching records.`);
      process.exit(1);
    }

    const adminUser = rows[0];

    // 2. Generate secure PBKDF2 salt and hash matching server.js specification
    const salt = crypto.randomBytes(8).toString("hex");
    const derived = crypto
      .pbkdf2Sync(newPassword, salt, 10000, 32, "sha256")
      .toString("base64");
    const newHash = `$pbkdf2-sha256$10000$${salt}$${derived}`;

    // 3. Update only the targeted administrator account
    const [updateResult] = await conn.query(
      `UPDATE \`users\`
       SET \`password_hash\` = ?, \`must_change_password\` = 1
       WHERE \`user_id\` = ? AND \`reference_id\` = 'ADMIN-001' AND \`username\` = 'admin'`,
      [newHash, adminUser.user_id]
    );

    if (updateResult.affectedRows !== 1) {
      console.error("[ERROR] Failed to update administrator password record in MySQL.");
      process.exit(1);
    }

    // 4. Invalidate prior active sessions for security
    await conn.query(
      "UPDATE `user_sessions` SET `is_revoked` = 1 WHERE `username` = 'admin'"
    );

    console.log(`[PASS] Administrator password updated successfully.`);
    console.log(`[INFO] Account: ${adminUser.full_name} (${adminUser.reference_id})`);
    console.log(`[INFO] Username: @${adminUser.username}`);
    console.log(`[INFO] must_change_password: set to 1 (enforced on next login)`);
    console.log(`[INFO] Stored Hash Algorithm: PBKDF2-SHA256 (10,000 iterations, 32-byte derived key)`);
    console.log(`[INFO] Sessions: All prior active sessions revoked.`);
  } finally {
    await conn.end();
  }
}

resetAdminPassword().catch((err) => {
  console.error("[FATAL] Unexpected error during password reset execution:", err.message);
  process.exit(1);
});
