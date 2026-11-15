// One-time password (OTP) generation, verification, and cooldown management.
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Cryptographic OTP Generation & Verification Service (services/otpService.js)
 *
 * Implements:
 * - 6-digit cryptographically secure random numeric OTPs (crypto.randomInt)
 * - 5-minute expiration & 60-second cooldown rate-limiting
 * - SHA-256 salted hash persistence in MySQL (never plaintext)
 * - Max 5 attempts per code before invalidation
 * - Invalidation of older codes upon new request
 * - Full audit trail and notification log integration
 * ============================================================================
 */

const crypto = require("crypto");
const mysql = require("mysql2/promise");
const { DB_CONFIG } = require("../database/seed");
const emailService = require("./email-service");

let defaultPool = null;
function getPool(passedPool) {
  if (passedPool) return passedPool;
  if (!defaultPool) {
    try {
      defaultPool = mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 5 });
    } catch (_) {}
  }
  return defaultPool;
}

// Internal in-memory test cache (only populated when NODE_ENV === 'test')
const testOtpCache = new Map();

/**
 * Generate and dispatch a secure, time-limited OTP
 */
async function generateOtp({
  email,
  purpose = "email_verification",
  referenceId = null,
  recipientName = "Applicant",
  mysqlPool,
  recordAuditLog = null
}) {
  const pool = getPool(mysqlPool);
  const cleanEmail = String(email || "").trim().toLowerCase();
  const validPurposes = ["email_verification", "applicant_email_verification", "password_reset"];

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    return { ok: false, message: "A valid email address is required." };
  }
  if (!validPurposes.includes(purpose)) {
    return { ok: false, message: "Invalid OTP verification purpose." };
  }

  const effectivePurpose = (purpose === "applicant_email_verification") ? "email_verification" : purpose;

  // 1. Rate-limiting Cooldown Check (60 seconds)
  const [cooldownRows] = await pool.query(
    `SELECT otp_id, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS elapsed
     FROM \`email_otps\`
     WHERE \`email\` = ? AND \`purpose\` = ? AND \`is_used\` = 0
       AND \`created_at\` > DATE_SUB(NOW(), INTERVAL 60 SECOND)
     ORDER BY \`otp_id\` DESC LIMIT 1`,
    [cleanEmail, effectivePurpose]
  );

  if (cooldownRows && cooldownRows.length > 0) {
    const elapsed = cooldownRows[0].elapsed || 0;
    const remainingSeconds = Math.max(1, 60 - elapsed);
    return {
      ok: false,
      cooldown: true,
      remainingSeconds,
      message: `Please wait ${remainingSeconds} second(s) before requesting another verification code.`
    };
  }

  // 2. Invalidate previous unconsumed OTPs for this email and purpose
  await pool.query(
    `UPDATE \`email_otps\`
     SET \`is_used\` = 1
     WHERE \`email\` = ? AND \`purpose\` = ? AND \`is_used\` = 0`,
    [cleanEmail, effectivePurpose]
  );

  // 3. Cryptographically generate 6-digit numeric OTP (100000 - 999999)
  const plainOtp = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = crypto.createHash("sha256").update(`${plainOtp}:${salt}`).digest("hex");

  // In test environment, store in test cache for automated test verification
  if (process.env.NODE_ENV === "test") {
    testOtpCache.set(`${cleanEmail}:${effectivePurpose}`, plainOtp);
  }

  // 4. Save salted hash to MySQL with 5-minute expiration
  await pool.query(
    `INSERT INTO \`email_otps\` (
      \`email\`, \`otp_hash\`, \`salt\`, \`purpose\`, \`reference_id\`,
      \`attempts\`, \`is_verified\`, \`is_used\`, \`expires_at\`
    ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
    [cleanEmail, otpHash, salt, effectivePurpose, referenceId]
  );

  // 5. Construct Email Content
  let subject = "";
  let text = "";
  let html = "";

  if (purpose === "email_verification") {
    subject = "BANTUG UNIVERSITY – Email Verification Code";
    text = `Dear ${recipientName},

Thank you for your interest in BANTUG UNIVERSITY.

Your 6-digit email verification code is: ${plainOtp}

This verification code will expire in 5 minutes. Please enter this code into the portal to verify your registered email address.

For your protection, never share this verification code with anyone.

Best regards,
Office of Admissions & Student Records
BANTUG UNIVERSITY`;

    html = `
      <div style="font-family:'Inter',system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;">
        <div style="text-align:center;margin-bottom:20px;">
          <h2 style="color:#0f2b5c;margin:0;font-size:22px;">BANTUG UNIVERSITY</h2>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Official Academic Portal System</p>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:20px;">
          <p style="font-size:15px;color:#1e293b;margin:0 0 12px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="font-size:14px;color:#334155;line-height:1.5;margin:0 0 16px;">
            Your one-time 6-digit email verification code is:
          </p>
          <div style="text-align:center;padding:16px;background:#ffffff;border:2px dashed #0284c7;border-radius:8px;margin-bottom:16px;">
            <span style="font-size:32px;letter-spacing:8px;font-weight:700;color:#0369a1;font-family:monospace;">${plainOtp}</span>
          </div>
          <p style="font-size:12px;color:#64748b;margin:0;">
            This code expires in <strong>5 minutes</strong>. If you did not request this verification, please disregard this notice.
          </p>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
          &copy; ${new Date().getFullYear()} BANTUG UNIVERSITY &bull; Office of Admissions
        </p>
      </div>
    `;
  } else {
    subject = "BANTUG UNIVERSITY – Password Reset Code";
    text = `Dear ${recipientName},

We received a request to reset your password for your BANTUG UNIVERSITY portal account.

Your 6-digit password reset code is: ${plainOtp}

This verification code will expire in 5 minutes. Enter this code on the password reset screen to set a new password.

If you did not request a password reset, please contact the ICT Helpdesk immediately.

Best regards,
ICT Services & Portal Administration
BANTUG UNIVERSITY`;

    html = `
      <div style="font-family:'Inter',system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;">
        <div style="text-align:center;margin-bottom:20px;">
          <h2 style="color:#0f2b5c;margin:0;font-size:22px;">BANTUG UNIVERSITY</h2>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Secure Account Recovery</p>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:20px;">
          <p style="font-size:15px;color:#1e293b;margin:0 0 12px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="font-size:14px;color:#334155;line-height:1.5;margin:0 0 16px;">
            We received a request to reset the password for your portal account. Your 6-digit reset code is:
          </p>
          <div style="text-align:center;padding:16px;background:#ffffff;border:2px dashed #0284c7;border-radius:8px;margin-bottom:16px;">
            <span style="font-size:32px;letter-spacing:8px;font-weight:700;color:#0369a1;font-family:monospace;">${plainOtp}</span>
          </div>
          <p style="font-size:12px;color:#64748b;margin:0;">
            This code expires in <strong>5 minutes</strong>. If you did not initiate this request, your account may be at risk.
          </p>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
          &copy; ${new Date().getFullYear()} BANTUG UNIVERSITY &bull; ICT Helpdesk
        </p>
      </div>
    `;
  }

  // 6. Attempt Email Dispatch
  const sendRes = await emailService.sendEmail({
    to: cleanEmail,
    toName: recipientName,
    subject,
    text,
    html,
    type: effectivePurpose === "email_verification" ? "EMAIL_VERIFICATION_OTP" : "PASSWORD_RESET_OTP",
    referenceId,
    mysqlPool: pool
  });

  if (recordAuditLog) {
    try {
      await recordAuditLog({
        actorRole: "system",
        actorName: "OTP System",
        actorId: cleanEmail,
        actionType: "OTP_GENERATED",
        targetType: "otp",
        targetId: cleanEmail,
        details: `Generated ${effectivePurpose} OTP for ${cleanEmail}. Email dispatch status: ${sendRes.status}.`
      });
    } catch (_) {}
  }

  return {
    ok: true,
    otp: plainOtp,
    message: sendRes.sent
      ? `Verification code successfully sent to ${cleanEmail}.`
      : sendRes.status === "unconfigured"
      ? `Verification code generated. (SMTP is unconfigured in .env: notifications logged to database).`
      : `Verification code generated, but email delivery encountered an error.`,
    emailSent: sendRes.sent,
    emailStatus: sendRes.status,
    cooldownSeconds: 60
  };
}

/**
 * Verify a submitted 6-digit OTP
 */
async function verifyOtp({
  email,
  otp,
  purpose = "email_verification",
  referenceId = null,
  mysqlPool,
  recordAuditLog = null
}) {
  const pool = getPool(mysqlPool);
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanOtp = String(otp || "").trim();
  const effectivePurpose = (purpose === "applicant_email_verification") ? "email_verification" : purpose;

  if (!cleanEmail || !cleanOtp) {
    return { ok: false, message: "Email address and 6-digit verification code are required." };
  }

  if (!/^\d{6}$/.test(cleanOtp)) {
    return { ok: false, message: "Verification code must be exactly 6 numerical digits." };
  }

  // 1. Fetch latest active OTP
  const [rows] = await pool.query(
    `SELECT \`otp_id\`, \`otp_hash\`, \`salt\`, \`attempts\`, \`expires_at\`, \`is_used\`, \`is_verified\`
     FROM \`email_otps\`
     WHERE \`email\` = ? AND \`purpose\` = ? AND \`is_used\` = 0
     ORDER BY \`otp_id\` DESC LIMIT 1`,
    [cleanEmail, effectivePurpose]
  );

  if (!rows || rows.length === 0) {
    // Check if there was an expired or used code
    const [historyRows] = await pool.query(
      `SELECT \`otp_id\`, \`is_used\`, \`expires_at\`
       FROM \`email_otps\`
       WHERE \`email\` = ? AND \`purpose\` = ?
       ORDER BY \`otp_id\` DESC LIMIT 1`,
      [cleanEmail, effectivePurpose]
    );

    if (historyRows && historyRows.length > 0) {
      if (new Date(historyRows[0].expires_at) < new Date()) {
        return { ok: false, message: "The verification code has expired. Please request a new code." };
      }
      if (historyRows[0].is_used) {
        return { ok: false, message: "This verification code has already been used. Please request a new code." };
      }
    }
    return { ok: false, message: "Invalid or nonexistent verification code. Please request a new code." };
  }

  const record = rows[0];

  // 2. Check Expiration
  if (new Date(record.expires_at) < new Date()) {
    await pool.query("UPDATE `email_otps` SET `is_used` = 1 WHERE `otp_id` = ?", [record.otp_id]);
    return { ok: false, message: "The verification code has expired. Please request a new code." };
  }

  // 3. Check Attempts (Max 5 attempts allowed)
  if (record.attempts >= 5) {
    await pool.query("UPDATE `email_otps` SET `is_used` = 1 WHERE `otp_id` = ?", [record.otp_id]);
    return {
      ok: false,
      locked: true,
      message: "Maximum verification attempts exceeded. For security reasons, this code has been invalidated. Please request a new code."
    };
  }

  // 4. Verify Hash
  const computedHash = crypto.createHash("sha256").update(`${cleanOtp}:${record.salt}`).digest("hex");
  if (computedHash !== record.otp_hash) {
    const newAttempts = record.attempts + 1;
    await pool.query("UPDATE `email_otps` SET `attempts` = ? WHERE `otp_id` = ?", [
      newAttempts,
      record.otp_id
    ]);

    if (recordAuditLog) {
      try {
        await recordAuditLog({
          actorRole: "system",
          actorName: "OTP System",
          actorId: cleanEmail,
          actionType: "OTP_VERIFICATION_FAILED",
          targetType: "otp",
          targetId: cleanEmail,
          details: `Incorrect OTP attempt (${newAttempts}/5) for ${cleanEmail} (${effectivePurpose}).`
        });
      } catch (_) {}
    }

    const attemptsRemaining = Math.max(0, 5 - newAttempts);
    if (attemptsRemaining === 0) {
      await pool.query("UPDATE `email_otps` SET `is_used` = 1 WHERE `otp_id` = ?", [record.otp_id]);
      return {
        ok: false,
        locked: true,
        message: "Maximum verification attempts exceeded. This code has been invalidated. Please request a new code."
      };
    }

    return {
      ok: false,
      message: `Incorrect verification code. Please check and try again (${attemptsRemaining} attempt(s) remaining).`,
      attemptsRemaining
    };
  }

  // 5. Successful Verification: Invalidate all OTPs for this email and purpose
  await pool.query(
    "UPDATE `email_otps` SET `is_verified` = 1, `is_used` = 1 WHERE `otp_id` = ?",
    [record.otp_id]
  );
  await pool.query(
    "UPDATE `email_otps` SET `is_used` = 1 WHERE `email` = ? AND `purpose` = ? AND `is_used` = 0",
    [cleanEmail, effectivePurpose]
  );

  // If email_verification, update applications and users
  if (effectivePurpose === "email_verification") {
    try {
      await pool.query(
        "UPDATE `applications` SET `email_verified` = 1 WHERE `email` = ? OR `reference_number` = ?",
        [cleanEmail, referenceId || cleanEmail]
      );
      await pool.query("UPDATE `users` SET `email_verified` = 1 WHERE `email` = ?", [cleanEmail]);
    } catch (_) {}

    if (recordAuditLog) {
      try {
        await recordAuditLog({
          actorRole: "applicant",
          actorName: cleanEmail,
          actorId: cleanEmail,
          actionType: "EMAIL_VERIFIED",
          targetType: "application",
          targetId: referenceId || cleanEmail,
          details: `Email address ${cleanEmail} successfully verified via OTP.`
        });
      } catch (_) {}
    }
  }

  return {
    ok: true,
    message: "Verification successful!"
  };
}

/**
 * Test helper for automated verification suites
 */
function _getLatestTestOtp(email, purpose = "email_verification") {
  return testOtpCache.get(`${String(email).toLowerCase()}:${purpose}`);
}

module.exports = {
  generateOtp,
  verifyOtp,
  _getLatestTestOtp
};
