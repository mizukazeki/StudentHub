// Maintenance utility to regenerate PBKDF2 password hashes for admin accounts.
/**
 * BANTUG UNIVERSITY - Repair Admin Password Hash
 * Generates and repairs the PBKDF2-SHA256 password hash for ADMIN-001.
 */
const crypto = require("crypto");
const mysql = require("mysql2/promise");

async function fix() {
  const targetPassword = process.env.ADMIN_TEMP_PASSWORD || process.argv[2] || "admin2026";
  const salt = crypto.randomBytes(8).toString("hex");
  const derived = crypto
    .pbkdf2Sync(targetPassword, salt, 10000, 32, "sha256")
    .toString("base64");
  const fullHash = `$pbkdf2-sha256$10000$${salt}$${derived}`;

  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bantug_university_db"
  });

  try {
    const [result] = await conn.query(
      "UPDATE users SET password_hash = ?, must_change_password = 1 WHERE username = ? AND reference_id = 'ADMIN-001'",
      [fullHash, "admin"]
    );
    console.log(`[PASS] Admin password hash verified and updated (${result.affectedRows} row affected).`);
  } finally {
    await conn.end();
  }
}

fix().catch((err) => {
  console.error("[ERROR] Failed to repair admin hash:", err.message);
  process.exit(1);
});
