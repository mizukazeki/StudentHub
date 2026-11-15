// Email delivery service and SMTP notification client.
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Email & SMTP Service Integration (services/emailService.js)
 * Manages Nodemailer SMTP transport, environment parsing, delivery logging,
 * and graceful fallback when credentials are unconfigured.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const mysql = require("mysql2/promise");
const { DB_CONFIG } = require("../database/seed");

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

// Simple native .env loader
(function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, "utf8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const idx = trimmed.indexOf("=");
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch (_) {}
  }
})();

function isEmailConfigured() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return false;
  const invalidPlaceholders = [
    "your_app_password_here",
    "your_smtp_app_password_here",
    "your_password",
    "admissions@bantug.edu.example"
  ];
  if (invalidPlaceholders.includes(pass) || user === "admissions@bantug.edu.example") {
    return false;
  }
  return true;
}

/**
 * Send an email notification via Nodemailer SMTP or log as unconfigured
 */
async function sendEmail({
  to,
  toName = "Applicant",
  subject,
  text,
  html,
  type = "GENERAL_NOTIFICATION",
  referenceId = null,
  mysqlPool = null
}) {
  const recipientEmail = String(to || "").trim();
  const recipientName = String(toName || "Applicant").trim();
  const emailSubject = String(subject || "BANTUG UNIVERSITY Notification").trim();
  const pool = getPool(mysqlPool);
  let loggedToDb = false;

  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipientEmail)) {
    return {
      sent: false,
      status: "failed",
      logged: false,
      message: "Invalid recipient email address."
    };
  }

  // 1. Unconfigured SMTP Handling
  if (!isEmailConfigured()) {
    const errorMsg = "SMTP email provider is unconfigured. Set SMTP_USER and SMTP_PASS in .env to enable real email dispatch.";
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO \`notification_logs\` (
            \`recipient_email\`, \`recipient_name\`, \`notification_type\`,
            \`subject\`, \`reference_id\`, \`delivery_status\`, \`error_message\`,
            \`is_read\`, \`message_body\`
          ) VALUES (?, ?, ?, ?, ?, 'unconfigured', ?, 0, ?)`,
          [recipientEmail, recipientName, type, emailSubject, referenceId, errorMsg, text || html || ""]
        );
        loggedToDb = true;
      } catch (_) {}
    }
    return {
      sent: false,
      status: "unconfigured",
      logged: loggedToDb,
      message: errorMsg
    };
  }

  // 2. Real SMTP Dispatch via Nodemailer
  try {
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"BANTUG UNIVERSITY" <${process.env.SMTP_USER}>`,
      to: `"${recipientName}" <${recipientEmail}>`,
      subject: emailSubject,
      text,
      html
    });

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO \`notification_logs\` (
            \`recipient_email\`, \`recipient_name\`, \`notification_type\`,
            \`subject\`, \`reference_id\`, \`delivery_status\`, \`is_read\`, \`message_body\`
          ) VALUES (?, ?, ?, ?, ?, 'sent', 0, ?)`,
          [recipientEmail, recipientName, type, emailSubject, referenceId, text || html || ""]
        );
        loggedToDb = true;
      } catch (_) {}
    }

    return {
      sent: true,
      status: "sent",
      logged: loggedToDb,
      messageId: info.messageId,
      message: "Email delivered successfully."
    };
  } catch (err) {
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO \`notification_logs\` (
            \`recipient_email\`, \`recipient_name\`, \`notification_type\`,
            \`subject\`, \`reference_id\`, \`delivery_status\`, \`error_message\`,
            \`is_read\`, \`message_body\`
          ) VALUES (?, ?, ?, ?, ?, 'failed', ?, 0, ?)`,
          [recipientEmail, recipientName, type, emailSubject, referenceId, err.message, text || html || ""]
        );
        loggedToDb = true;
      } catch (_) {}
    }

    return {
      sent: false,
      status: "failed",
      logged: loggedToDb,
      error: err.message,
      message: `Failed to deliver email: ${err.message}`
    };
  }
}

module.exports = {
  isEmailConfigured,
  sendEmail
};
