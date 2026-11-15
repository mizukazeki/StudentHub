// Main HTTP server, API routes, session management, and static file server.
/**
 * ============================================================================
 * BANTUG UNIVERSITY – Student Portal System (Revision 7)
 * Node.js + MySQL Backend Server (server.js)
 * ============================================================================
 * - Connects to `bantug_university_db` via `mysql2/promise` connection pool.
 * - Automatically runs `database/seed.js` (safe schema migrations + 15-record
 *   preloaded seed) on startup without overwriting existing user data.
 * - Exposes REST API endpoints for:
 *     1. Public Student Application Form & Faculty Application Management:
 *        - GET    /api/applications
 *        - POST   /api/applications
 *        - PUT    /api/applications/:referenceNumber/status
 *     2. Faculty & Student Announcements:
 *        - GET    /api/announcements
 *        - POST   /api/announcements
 *        - PUT    /api/announcements/:id
 *        - DELETE /api/announcements/:id
 *     3. Unified Portal Synchronization (`/api/portal`):
 *        - GET    /api/portal?action=load
 *        - POST   /api/portal?action=save
 *        - POST   /api/portal?action=submit_application
 *        - POST   /api/portal?action=update_application_status
 *        - POST   /api/portal?action=create_announcement
 *        - POST   /api/portal?action=update_announcement
 *        - POST   /api/portal?action=delete_announcement
 *        - POST   /api/portal?action=mark_all_announcements_read
 *        - POST   /api/portal?action=reset
 *        - GET    /api/portal?action=status
 * - Serves static frontend assets at http://localhost:3000.
 * ============================================================================
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const mysql = require("mysql2/promise");
const { DB_CONFIG, hashPassword, seedDatabase } = require("./database/seed");
const emailService = require("./services/email-service");
const otpService = require("./services/otp-service");

const activeSessions = new Map();

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const VALID_YEAR_LEVELS = ["Year 1", "Year 2", "Year 3", "Year 4"];
const VALID_APPLICATION_STATUSES = ["Pending", "Under Review", "Approved", "Rejected"];
const VALID_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const OFFICIAL_BSIT22_SUBJECT_CODES = new Set([
  "T147", "T146", "T153", "T148", "T152", "T151", "T150", "T003", "T149"
]);

function normalizeRoomName(rawRoom) {
  const r = String(rawRoom || "").trim();
  if (!r || r.toLowerCase() === "not specified" || r.toLowerCase() === "tba") {
    return "Not specified";
  }
  const upper = r.toUpperCase().replace(/\s+/g, " ");
  const aliasMap = {
    "R1": "Room 1",
    "ROOM 1": "Room 1",
    "R2": "Room 2",
    "ROOM 2": "Room 2",
    "R3": "Room 3",
    "ROOM 3": "Room 3",
    "R4": "Room 4",
    "ROOM 4": "Room 4",
    "R5": "Room 5",
    "ROOM 5": "Room 5",
    "R6": "Room 6",
    "ROOM 6": "Room 6",
    "CL1": "CL 1",
    "CL 1": "CL 1",
    "CL2": "CL 2",
    "CL 2": "CL 2",
    "CL3": "CL 3",
    "CL 3": "CL 3",
    "IT LAB 1": "IT Lab 1",
    "IT LAB1": "IT Lab 1",
    "IT LAB 2": "IT Lab 2",
    "IT LAB2": "IT Lab 2",
    "GYM": "Gym",
    "OPEN GYM": "Open Gym",
    "LAVR": "Language or Audio-Visual Room (LAVR)",
    "LANGUAGE OR AUDIO-VISUAL ROOM": "Language or Audio-Visual Room (LAVR)",
    "LANGUAGE OR AUDIO-VISUAL ROOM (LAVR)": "Language or Audio-Visual Room (LAVR)"
  };
  return aliasMap[upper] || r;
}

function formatTimeRangeLabel(startTime, endTime) {
  function to12h(hhmm) {
    const parts = String(hhmm || "08:00").split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    if (isNaN(h)) return hhmm;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return { text: `${h12}:${m}`, ampm };
  }
  const s = to12h(startTime);
  const e = to12h(endTime);
  if (s.ampm === e.ampm) {
    return `${s.text}–${e.text} ${e.ampm}`;
  }
  return `${s.text} ${s.ampm}–${e.text} ${e.ampm}`;
}

const mysqlPool = mysql.createPool({
  host: DB_CONFIG.host,
  port: DB_CONFIG.port,
  user: DB_CONFIG.user,
  password: DB_CONFIG.password,
  database: DB_CONFIG.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function normalizeApplicationStatus(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed || trimmed === "Submitted") return "Pending";
  return VALID_APPLICATION_STATUSES.includes(trimmed) ? trimmed : "Pending";
}

function normalizeYearLevel(raw, fallback = "Year 1") {
  const trimmed = String(raw || "").trim();
  return VALID_YEAR_LEVELS.includes(trimmed) ? trimmed : fallback;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

function formatLocalDate(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Portal-Token, X-Portal-Role, X-Portal-User, X-Portal-Actor-Id"
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error("Request payload exceeds maximum allowed size."));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("Invalid JSON request body."));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Record an audit trail entry in MySQL `audit_logs` table (Section 9)
 */
async function recordAuditLog({
  actorId = null,
  actorName = "System",
  actorRole = "system",
  actionType = "SYSTEM_EVENT",
  targetType = "record",
  targetId = "N/A",
  details = ""
}) {
  try {
    await mysqlPool.query(
      `INSERT INTO \`audit_logs\` (
        \`actor_id\`, \`actor_name\`, \`actor_role\`, \`action_type\`,
        \`target_type\`, \`target_id\`, \`details\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        actorId ? String(actorId).slice(0, 40) : null,
        String(actorName || "System").slice(0, 120),
        String(actorRole || "system").slice(0, 30),
        String(actionType || "EVENT").slice(0, 60),
        String(targetType || "record").slice(0, 60),
        String(targetId || "N/A").slice(0, 80),
        String(details || "")
      ]
    );
  } catch (err) {
    console.warn("[audit_logs] Could not record audit log:", err.message);
  }
}

/**
 * Fetch recent audit trail entries from MySQL `audit_logs`
 */
async function fetchRecentAuditLogs(limit = 60) {
  try {
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 60));
    const [rows] = await mysqlPool.query(
      `SELECT
        log_id AS logId,
        actor_id AS actorId,
        actor_name AS actorName,
        actor_role AS actorRole,
        action_type AS actionType,
        target_type AS targetType,
        target_id AS targetId,
        details,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM \`audit_logs\`
       ORDER BY log_id DESC
       LIMIT ?`,
      [safeLimit]
    );
    return rows;
  } catch (_) {
    return [];
  }
}

/**
 * Extract and verify the caller's session token / role from HTTP headers
 */
async function resolveRequestActor(req, body = null) {
  const authHeader = String(req.headers["authorization"] || "").trim();
  const tokenFromBearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const token =
    tokenFromBearer ||
    String(req.headers["x-portal-token"] || (body && body.sessionToken) || "").trim();

  if (token) {
    if (activeSessions.has(token)) {
      const sess = activeSessions.get(token);
      if (!sess.isRevoked && new Date(sess.expiresAt) > new Date()) {
        return sess;
      }
      activeSessions.delete(token);
    }
    try {
      const [rows] = await mysqlPool.query(
        `SELECT session_token AS token, username, role, actor_id AS actorId,
                actor_name AS actorName, is_applicant_demo AS isApplicantDemoAccount,
                is_revoked AS isRevoked, expires_at AS expiresAt
         FROM \`user_sessions\`
         WHERE \`session_token\` = ? AND \`is_revoked\` = 0 AND \`expires_at\` > NOW()
         LIMIT 1`,
        [token]
      );
      if (rows && rows.length > 0) {
        const s = {
          token: rows[0].token,
          username: rows[0].username,
          role: rows[0].role,
          actorId: rows[0].actorId,
          actorName: rows[0].actorName,
          isApplicantDemoAccount: Boolean(rows[0].isApplicantDemoAccount),
          isRevoked: false,
          expiresAt: rows[0].expiresAt
        };

        if (s.role === "student") {
          try {
            const [st] = await mysqlPool.query(
              "SELECT student_number, full_name, section, year_level, course, email FROM `students` WHERE username = ? OR student_number = ? LIMIT 1",
              [s.username, s.actorId]
            );
            if (st && st[0]) {
              s.studentNumber = st[0].student_number;
              s.fullName = st[0].full_name;
              s.section = st[0].section;
              s.yearLevel = st[0].year_level;
              s.course = st[0].course;
              s.email = st[0].email;
            }
          } catch (_) {}
        } else if (s.role === "applicant") {
          try {
            const [app] = await mysqlPool.query(
              "SELECT reference_number, full_name, email, desired_program, status FROM `applications` WHERE reference_number = ? OR email = ? OR username = ? LIMIT 1",
              [s.actorId, s.username, s.username]
            );
            if (app && app[0]) {
              s.referenceNumber = app[0].reference_number;
              s.fullName = app[0].full_name;
              s.email = app[0].email;
              s.desiredProgram = app[0].desired_program;
              s.status = app[0].status;
            }
          } catch (_) {}
        }

        activeSessions.set(token, s);
        return s;
      }
    } catch (_) {}
  }

  // Phase 2 Security: If unauthenticated, do not trust client-supplied role or default to faculty
  return {
    token: null,
    role: "guest",
    username: null,
    actorId: null,
    actorName: "Guest Visitor",
    isApplicantDemoAccount: false
  };
}

/**
 * Enforce backend role-based access control on protected API endpoints
 */
async function requireBackendRole(req, res, allowedRoles, actionLabel, body = null) {
  const actor = await resolveRequestActor(req, body);
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  const hasAuthToken = Boolean(actor && actor.token && actor.role !== "guest");

  if (!hasAuthToken || !actor || !actor.role || actor.role === "guest") {
    sendJson(res, 401, {
      ok: false,
      authenticated: false,
      message: `Authentication required: Please log in to ${actionLabel}.`
    });
    return null;
  }

  if (!allowed.includes(actor.role)) {
    sendJson(res, 403, {
      ok: false,
      message: `Access Denied: Your ${(actor?.role || "unauthorized").toUpperCase()} account is not permitted to ${actionLabel}.`
    });
    return null;
  }
  return actor;
}

/**
 * Deterministically verify user password against MySQL stored hash
 * Supports PBKDF2 ($pbkdf2-sha256$), SQL seed bcrypt representation ($2b$10$),
 * and standard SHA-256 fallback.
 */
function verifyUserPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;
  const strHash = String(storedHash).trim();
  const strPlain = String(plainPassword).trim();

  // 1. PBKDF2 hash format ($pbkdf2-sha256$iterations$salt$derived)
  if (strHash.startsWith("$pbkdf2-sha256$")) {
    const parts = strHash.split("$");
    if (parts.length === 5) {
      const iterations = parseInt(parts[2], 10) || 10000;
      const salt = parts[3];
      const storedDerived = parts[4];
      const derived = crypto
        .pbkdf2Sync(strPlain, salt, iterations, 32, "sha256")
        .toString("base64");
      return (
        derived.length === storedDerived.length &&
        crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(storedDerived))
      );
    }
  }

  // 2. MySQL seed bcrypt hash representations ($2b$10$...)
  // Seed hashes corresponding to initial sample user groups:
  if (strHash === "$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y") {
    return strPlain === "demo123";
  }
  if (strHash === "$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o") {
    return strPlain === "faculty123";
  }
  if (strHash === "$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z") {
    return strPlain === "apply123";
  }

  // 3. Fallback SHA256 comparison
  const sha256 = crypto.createHash("sha256").update(strPlain).digest("hex");
  if (strHash.toLowerCase() === sha256.toLowerCase()) {
    return true;
  }

  // 4. Fallback hashPassword(plainPassword) from seed
  const fallbackHashed = hashPassword(strPlain);
  if (strHash === fallbackHashed) {
    return true;
  }

  return false;
}

/**
 * Handle User Authentication (`POST /api/auth/login`)
 * Verifies hashed password against MySQL `users` table (or authorized demo launcher),
 * issues a server-side session token in `user_sessions`, and logs `USER_LOGIN` in `audit_logs`.
 */
async function handleAuthLogin(req, res) {
  const body = await readJsonBody(req);
  const rawIdentifier = String(body.identifier || body.username || body.email || "").trim().toLowerCase();
  const rawPassword = String(body.password || "").trim();
  const requestedRole = String(body.role || "student").trim().toLowerCase();
  const isDemoLaunch = Boolean(body.isDemoLaunch);

  if (!rawIdentifier && !isDemoLaunch) {
    return sendJson(res, 400, {
      ok: false,
      fieldErrors: { identifier: "Please enter your email or account ID." },
      message: "Please enter your email or account ID."
    });
  }
  if (!rawPassword && !isDemoLaunch) {
    return sendJson(res, 400, {
      ok: false,
      fieldErrors: { password: "Please enter your password." },
      message: "Please enter your password."
    });
  }

  // Alias map for generic demo shortcuts
  const identifierAliases = {
    "student.demo@bantug.edu.example": "r.valiente",
    "r.valiente.demo@bantug.edu.example": "r.valiente",
    "racel valiente": "r.valiente",
    "valiente, racel": "r.valiente",
    "student": "r.valiente",
    "faculty.demo@bantug.edu.example": "f.somera",
    "fac-bu-2026-04": "f.somera",
    "fabian somera": "f.somera",
    "somera, fabian": "f.somera",
    "faculty": "f.somera",
    "francis van salvador": "f.salvador",
    "salvador, francis van": "f.salvador",
    "c.villanueva.demo@bantug.edu.example": "c.villanueva",
    "ceasar villanueva": "c.villanueva",
    "villanueva, ceasar": "c.villanueva",
    "app-demo-2026-01": "c.villanueva",
    "applicant": "c.villanueva"
  };

  const lookupKey = identifierAliases[rawIdentifier] || rawIdentifier || (
    requestedRole === "faculty" ? "f.somera" : requestedRole === "applicant" ? "c.villanueva" : "r.valiente"
  );

  // Query MySQL `users` table (never selecting password_hash into response)
  const [userRows] = await mysqlPool.query(
    `SELECT user_id, username, email, password_hash, role, reference_id, full_name, is_demo_account, is_active, must_change_password
     FROM \`users\`
     WHERE LOWER(username) = LOWER(?)
        OR LOWER(email) = LOWER(?)
        OR LOWER(reference_id) = LOWER(?)
        OR LOWER(full_name) = LOWER(?)
     LIMIT 1`,
    [lookupKey, lookupKey, lookupKey, rawIdentifier]
  );

  let matchedUser = userRows && userRows[0] ? userRows[0] : null;

  // Also check `faculty`, `students`, or `applications` if user typed a full name or secondary email
  if (!matchedUser) {
    const [facRows] = await mysqlPool.query(
      "SELECT username, faculty_id, full_name, email FROM `faculty` WHERE LOWER(full_name) = LOWER(?) OR LOWER(faculty_id) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1",
      [rawIdentifier, rawIdentifier, rawIdentifier]
    );
    if (facRows && facRows[0]) {
      const [u2] = await mysqlPool.query(
        "SELECT user_id, username, email, password_hash, role, reference_id, full_name, is_demo_account, is_active FROM `users` WHERE username = ? LIMIT 1",
        [facRows[0].username]
      );
      if (u2 && u2[0]) matchedUser = u2[0];
    }
  }

  if (!matchedUser) {
    const [stRows] = await mysqlPool.query(
      "SELECT username, student_number, full_name, email FROM `students` WHERE LOWER(full_name) = LOWER(?) OR LOWER(student_number) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1",
      [rawIdentifier, rawIdentifier, rawIdentifier]
    );
    if (stRows && stRows[0]) {
      const [u2] = await mysqlPool.query(
        "SELECT user_id, username, email, password_hash, role, reference_id, full_name, is_demo_account, is_active FROM `users` WHERE username = ? LIMIT 1",
        [stRows[0].username]
      );
      if (u2 && u2[0]) matchedUser = u2[0];
    }
  }

  if (!matchedUser) {
    const [appRows] = await mysqlPool.query(
      "SELECT reference_number, full_name, email FROM `applications` WHERE LOWER(reference_number) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1",
      [rawIdentifier, rawIdentifier]
    );
    if (appRows && appRows[0]) {
      const [u2] = await mysqlPool.query(
        "SELECT user_id, username, email, password_hash, role, reference_id, full_name, is_demo_account, is_active FROM `users` WHERE reference_id = ? OR LOWER(email) = LOWER(?) LIMIT 1",
        [appRows[0].reference_number, appRows[0].email]
      );
      if (u2 && u2[0]) matchedUser = u2[0];
    }
  }

  if (!matchedUser) {
    return sendJson(res, 401, {
      ok: false,
      message: "Invalid email/ID or password."
    });
  }

  if (matchedUser.is_active === 0 || matchedUser.is_active === false) {
    return sendJson(res, 403, {
      ok: false,
      message: "Your account is currently inactive. Please contact the university."
    });
  }

  if (!isDemoLaunch) {
    const isPasswordValid = verifyUserPassword(rawPassword, matchedUser.password_hash);
    if (!isPasswordValid) {
      return sendJson(res, 401, {
        ok: false,
        message: "Invalid email/ID or password."
      });
    }
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const isApplicantDemoAccount =
    matchedUser.role === "applicant"
      ? body.isApplicantDemoAccount !== undefined
        ? Boolean(body.isApplicantDemoAccount)
        : true
      : false;

  const expiresDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiresSql = expiresDate.toISOString().slice(0, 19).replace("T", " ");

  try {
    await mysqlPool.query(
      `INSERT INTO \`user_sessions\` (
        \`session_token\`, \`username\`, \`role\`, \`actor_id\`, \`actor_name\`,
        \`is_applicant_demo\`, \`is_revoked\`, \`expires_at\`
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        sessionToken,
        matchedUser.username,
        matchedUser.role,
        matchedUser.reference_id || matchedUser.username,
        matchedUser.full_name || matchedUser.username,
        isApplicantDemoAccount ? 1 : 0,
        expiresSql
      ]
    );
  } catch (_) {}

  const sessionInfo = {
    token: sessionToken,
    sessionToken,
    username: matchedUser.username,
    role: matchedUser.role,
    identifier: rawIdentifier || matchedUser.email,
    actorId: matchedUser.reference_id || matchedUser.username,
    actorName: matchedUser.full_name || matchedUser.username,
    displayName: matchedUser.full_name || matchedUser.username,
    email: matchedUser.email,
    isDemo: Boolean(matchedUser.is_demo_account),
    isApplicantDemoAccount,
    mustChangePassword: Boolean(matchedUser.must_change_password),
    isRevoked: false,
    expiresAt: expiresDate.toISOString()
  };

  // Phase 2: Attach authoritative student or applicant profile from relational tables
  if (matchedUser.role === "student") {
    try {
      const [stRows] = await mysqlPool.query(
        "SELECT student_number, full_name, course, year_level, section, email, contact_number, academic_term, address, guardian_name, guardian_contact, enrollment_status, gender, birth_date FROM `students` WHERE username = ? OR student_number = ? LIMIT 1",
        [matchedUser.username, matchedUser.reference_id]
      );
      if (stRows && stRows[0]) {
        sessionInfo.studentProfile = {
          studentNumber: stRows[0].student_number,
          fullName: stRows[0].full_name,
          course: stRows[0].course,
          yearLevel: stRows[0].year_level,
          section: stRows[0].section,
          email: stRows[0].email,
          contactNumber: stRows[0].contact_number,
          academicTerm: stRows[0].academic_term,
          address: stRows[0].address,
          guardianName: stRows[0].guardian_name,
          guardianContact: stRows[0].guardian_contact,
          enrollmentStatus: stRows[0].enrollment_status || "Active",
          accountStatus: stRows[0].enrollment_status || "Active",
          gender: stRows[0].gender || null,
          birthDate: stRows[0].birth_date ? String(stRows[0].birth_date).slice(0, 10) : null
        };
        sessionInfo.section = stRows[0].section;
        sessionInfo.yearLevel = stRows[0].year_level;
      }
    } catch (_) {}
  } else if (matchedUser.role === "faculty") {
    try {
      const [facRows] = await mysqlPool.query(
        "SELECT faculty_id, username, full_name, department, designation, email, contact_number, office_location, advisory_section, assigned_subjects, birth_date, home_address FROM `faculty` WHERE username = ? OR faculty_id = ? LIMIT 1",
        [matchedUser.username, matchedUser.reference_id]
      );
      if (facRows && facRows[0]) {
        const f = facRows[0];
        sessionInfo.facultyProfile = {
          facultyId: f.faculty_id,
          username: f.username,
          fullName: f.full_name,
          department: f.department,
          designation: f.designation || "Instructor",
          email: f.email,
          contactNumber: f.contact_number,
          officeLocation: f.office_location,
          advisorySection: f.advisory_section,
          assignedSubjects: f.assigned_subjects,
          birthDate: f.birth_date ? String(f.birth_date).slice(0, 10) : null,
          homeAddress: f.home_address,
          accountStatus: matchedUser.is_active ? "Active" : "Inactive"
        };
        sessionInfo.department = f.department;
        sessionInfo.advisorySection = f.advisory_section;
      }
    } catch (_) {}
  } else if (matchedUser.role === "applicant") {
    try {
      const [appRows] = await mysqlPool.query(
        "SELECT reference_number, full_name, email, desired_program, second_choice_program, status FROM `applications` WHERE reference_number = ? OR email = ? OR username = ? LIMIT 1",
        [matchedUser.reference_id, matchedUser.email, matchedUser.username]
      );
      if (appRows && appRows[0]) {
        sessionInfo.applicantProfile = {
          referenceNumber: appRows[0].reference_number,
          fullName: appRows[0].full_name,
          email: appRows[0].email,
          desiredProgram: appRows[0].desired_program,
          secondChoiceProgram: appRows[0].second_choice_program,
          status: appRows[0].status
        };
        sessionInfo.referenceNumber = appRows[0].reference_number;
      }
    } catch (_) {}
  }

  activeSessions.set(sessionToken, sessionInfo);

  await recordAuditLog({
    actorId: sessionInfo.actorId,
    actorName: sessionInfo.actorName,
    actorRole: sessionInfo.role,
    actionType: "USER_LOGIN",
    targetType: "session",
    targetId: sessionInfo.actorId,
    details: `${sessionInfo.actorName} (${sessionInfo.role.toUpperCase()}) signed into BANTUG UNIVERSITY Portal.`
  });

  return sendJson(res, 200, {
    ok: true,
    message: `Authenticated as ${sessionInfo.actorName} (${sessionInfo.role.toUpperCase()}).`,
    session: sessionInfo
  });
}

/**
 * Handle User Logout & Session Invalidation (`POST /api/auth/logout`)
 */
async function handleAuthLogout(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (_) {}

  const actor = await resolveRequestActor(req, body);
  const authHeader = String(req.headers["authorization"] || "").trim();
  const token =
    (authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "") ||
    String(req.headers["x-portal-token"] || body.token || actor?.token || "").trim();

  if (token) {
    activeSessions.delete(token);
    try {
      await mysqlPool.query(
        "UPDATE `user_sessions` SET `is_revoked` = 1 WHERE `session_token` = ?",
        [token]
      );
    } catch (_) {}
  }

  await recordAuditLog({
    actorId: actor?.actorId || "user",
    actorName: actor?.actorName || "Portal User",
    actorRole: actor?.role || "user",
    actionType: "USER_LOGOUT",
    targetType: "session",
    targetId: actor?.actorId || "session",
    details: `${actor?.actorName || "User"} logged out and invalidated portal session.`
  });

  return sendJson(res, 200, {
    ok: true,
    message: "Session invalidated and logged out successfully."
  });
}

/**
 * Handle Password Change (`POST /api/auth/change-password`)
 * Securely verifies current password against MySQL users table and updates to new PBKDF2 hash.
 * Never stores plain text passwords; records PASSWORD_CHANGED in audit_logs.
 */
async function handleAuthChangePassword(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (_) {
    return sendJson(res, 400, { ok: false, message: "Invalid JSON request payload." });
  }

  const actor = await resolveRequestActor(req, body);
  if (!actor || !actor.role) {
    return sendJson(res, 401, {
      ok: false,
      message: "Authentication required to change password."
    });
  }

  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!currentPassword) {
    return sendJson(res, 400, {
      ok: false,
      message: "Current password is required."
    });
  }

  if (!newPassword || newPassword.length < 6) {
    return sendJson(res, 400, {
      ok: false,
      message: "New password must be at least 6 characters long."
    });
  }

  if (newPassword !== confirmPassword) {
    return sendJson(res, 400, {
      ok: false,
      message: "New password and confirmation password do not match."
    });
  }

  if (newPassword === currentPassword) {
    return sendJson(res, 400, {
      ok: false,
      message: "New password must be different from current password."
    });
  }

  // Find user in `users` table
  let userRow = null;
  try {
    const [rows] = await mysqlPool.query(
      `SELECT user_id, username, email, password_hash, role, reference_id, full_name
       FROM \`users\`
       WHERE username = ? OR reference_id = ? OR email = ?
       LIMIT 1`,
      [actor.username || "", actor.actorId || "", actor.username || ""]
    );
    if (rows && rows.length > 0) {
      userRow = rows[0];
    }
  } catch (err) {
    return sendJson(res, 500, { ok: false, message: "Database query failed: " + err.message });
  }

  if (!userRow) {
    return sendJson(res, 404, {
      ok: false,
      message: "User account not found in database."
    });
  }

  // Verify current password
  const isCurrentValid = verifyUserPassword(currentPassword, userRow.password_hash);
  if (!isCurrentValid) {
    await recordAuditLog({
      actorId: userRow.reference_id || String(userRow.user_id),
      actorName: userRow.full_name || userRow.username,
      actorRole: userRow.role,
      actionType: "PASSWORD_CHANGE_FAILED",
      targetType: "user",
      targetId: String(userRow.user_id),
      details: `Failed password change attempt for ${userRow.username} (incorrect current password).`
    });

    return sendJson(res, 400, {
      ok: false,
      message: "Current password is incorrect."
    });
  }

  // Generate new PBKDF2 salt and hash
  const salt = crypto.randomBytes(8).toString("hex");
  const derived = crypto
    .pbkdf2Sync(String(newPassword).trim(), salt, 10000, 32, "sha256")
    .toString("base64");
  const newHash = `$pbkdf2-sha256$10000$${salt}$${derived}`;

  try {
    await mysqlPool.query(
      "UPDATE `users` SET `password_hash` = ?, `must_change_password` = 0 WHERE `user_id` = ?",
      [newHash, userRow.user_id]
    );

    // Invalidate other active sessions where practical (Part C requirement)
    const currentToken = actor.token || "";
    await mysqlPool.query(
      "UPDATE `user_sessions` SET `is_revoked` = 1 WHERE `username` = ? AND `session_token` != ?",
      [userRow.username, currentToken]
    );
    for (const [tok, sess] of activeSessions.entries()) {
      if (sess.username === userRow.username && tok !== currentToken) {
        sess.isRevoked = true;
        activeSessions.delete(tok);
      }
    }
  } catch (err) {
    return sendJson(res, 500, { ok: false, message: "Failed to update password: " + err.message });
  }

  await recordAuditLog({
    actorId: userRow.reference_id || String(userRow.user_id),
    actorName: userRow.full_name || userRow.username,
    actorRole: userRow.role,
    actionType: "PASSWORD_CHANGED",
    targetType: "user",
    targetId: String(userRow.user_id),
    details: `Password changed successfully for account ${userRow.username} (${userRow.role.toUpperCase()}). Other active sessions invalidated.`
  });

  // Attempt sending confirmation email
  await emailService.sendEmail({
    to: userRow.email,
    toName: userRow.full_name || userRow.username,
    subject: "BANTUG UNIVERSITY – Password Changed",
    text: `Dear ${userRow.full_name || userRow.username},\n\nYour BANTUG UNIVERSITY portal password was recently changed. If you did not make this change, please contact the ICT Helpdesk immediately.\n\nBest regards,\nBANTUG UNIVERSITY ICT Services`,
    type: "PASSWORD_CHANGED_NOTICE",
    referenceId: userRow.reference_id,
    mysqlPool
  });

  return sendJson(res, 200, {
    ok: true,
    message: "Password updated successfully. Other active sessions have been invalidated."
  });
}

/**
 * Handle Forgot Password Request (`POST /api/auth/forgot-password`)
 * Generates and emails a 6-digit OTP to the registered account email.
 * Never reveals account existence or sensitive details.
 */
async function handleAuthForgotPassword(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (_) {
    return sendJson(res, 400, { ok: false, message: "Invalid JSON request payload." });
  }

  const rawIdentifier = String(body.identifier || "").trim();
  if (!rawIdentifier) {
    return sendJson(res, 400, { ok: false, message: "Please enter your registered email address or account ID." });
  }

  // Look up user in `users`, `students`, `faculty`, `applications`
  let recipientEmail = null;
  let recipientName = "Portal User";
  let referenceId = null;

  try {
    const [userRows] = await mysqlPool.query(
      `SELECT user_id, username, email, full_name, reference_id FROM \`users\`
       WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) OR LOWER(reference_id) = LOWER(?)
       LIMIT 1`,
      [rawIdentifier, rawIdentifier, rawIdentifier]
    );

    if (userRows && userRows.length > 0) {
      recipientEmail = userRows[0].email;
      recipientName = userRows[0].full_name || userRows[0].username;
      referenceId = userRows[0].reference_id || userRows[0].username;
    } else {
      const [appRows] = await mysqlPool.query(
        `SELECT application_id, reference_number, full_name, email FROM \`applications\`
         WHERE LOWER(email) = LOWER(?) OR LOWER(reference_number) = LOWER(?)
         LIMIT 1`,
        [rawIdentifier, rawIdentifier]
      );
      if (appRows && appRows.length > 0) {
        recipientEmail = appRows[0].email;
        recipientName = appRows[0].full_name;
        referenceId = appRows[0].reference_number;
      }
    }
  } catch (_) {}

  // If found, generate OTP and dispatch email
  let otpResult = null;
  if (recipientEmail) {
    otpResult = await otpService.generateOtp({
      email: recipientEmail,
      purpose: "password_reset",
      referenceId,
      recipientName,
      mysqlPool,
      recordAuditLog
    });

    if (otpResult && otpResult.cooldown) {
      return sendJson(res, 429, {
        ok: false,
        cooldown: true,
        remainingSeconds: otpResult.remainingSeconds,
        message: otpResult.message
      });
    }
  }

  // Mask email for user hint (e.g. r***e@bantug.edu.example)
  function maskEmail(em) {
    if (!em || !em.includes("@")) return null;
    const [name, dom] = em.split("@");
    const masked = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${masked}@${dom}`;
  }

  return sendJson(res, 200, {
    ok: true,
    message: "If an account matching this identifier exists with a registered email address, a 6-digit verification code has been sent.",
    maskedEmail: recipientEmail ? maskEmail(recipientEmail) : null,
    cooldownSeconds: 60
  });
}

/**
 * Handle Password Reset with OTP (`POST /api/auth/reset-password`)
 * Verifies submitted OTP against MySQL email_otps and securely sets new password hash.
 */
async function handleAuthResetPassword(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (_) {
    return sendJson(res, 400, { ok: false, message: "Invalid JSON request payload." });
  }

  const rawIdentifier = String(body.identifier || "").trim();
  const rawOtp = String(body.otp || "").trim();
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!rawIdentifier) {
    return sendJson(res, 400, { ok: false, message: "Email address or account ID is required." });
  }
  if (!rawOtp || !/^\d{6}$/.test(rawOtp)) {
    return sendJson(res, 400, { ok: false, message: "Please enter the valid 6-digit verification code." });
  }
  if (!newPassword || newPassword.length < 6) {
    return sendJson(res, 400, { ok: false, message: "New password must be at least 6 characters long." });
  }
  if (newPassword !== confirmPassword) {
    return sendJson(res, 400, { ok: false, message: "New password and confirmation password do not match." });
  }

  // Look up user
  let userRow = null;
  try {
    const [rows] = await mysqlPool.query(
      `SELECT user_id, username, email, full_name, reference_id FROM \`users\`
       WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) OR LOWER(reference_id) = LOWER(?)
       LIMIT 1`,
      [rawIdentifier, rawIdentifier, rawIdentifier]
    );
    if (rows && rows.length > 0) userRow = rows[0];
  } catch (err) {
    return sendJson(res, 500, { ok: false, message: "Database query failed: " + err.message });
  }

  if (!userRow) {
    return sendJson(res, 400, { ok: false, message: "Invalid or expired verification code." });
  }

  // Verify OTP
  const verifyRes = await otpService.verifyOtp({
    email: userRow.email,
    otp: rawOtp,
    purpose: "password_reset",
    mysqlPool,
    recordAuditLog
  });

  if (!verifyRes.ok) {
    return sendJson(res, 400, { ok: false, message: verifyRes.message });
  }

  // Generate PBKDF2 hash
  const salt = crypto.randomBytes(8).toString("hex");
  const derived = crypto
    .pbkdf2Sync(String(newPassword).trim(), salt, 10000, 32, "sha256")
    .toString("base64");
  const newHash = `$pbkdf2-sha256$10000$${salt}$${derived}`;

  // Update password in users table
  try {
    await mysqlPool.query("UPDATE `users` SET `password_hash` = ? WHERE `user_id` = ?", [newHash, userRow.user_id]);
    // Revoke all existing sessions for this user
    await mysqlPool.query("UPDATE `user_sessions` SET `is_revoked` = 1 WHERE `username` = ?", [userRow.username]);
    for (const [tok, sess] of activeSessions.entries()) {
      if (sess.username === userRow.username) {
        sess.isRevoked = true;
        activeSessions.delete(tok);
      }
    }
  } catch (err) {
    return sendJson(res, 500, { ok: false, message: "Failed to update password: " + err.message });
  }

  await recordAuditLog({
    actorRole: "user",
    actorName: userRow.full_name || userRow.username,
    actorId: userRow.reference_id || String(userRow.user_id),
    actionType: "PASSWORD_RESET",
    targetType: "user",
    targetId: String(userRow.user_id),
    details: `Password reset successfully via email OTP for ${userRow.username}. Previous sessions revoked.`
  });

  // Attempt sending confirmation email
  await emailService.sendEmail({
    to: userRow.email,
    toName: userRow.full_name || userRow.username,
    subject: "BANTUG UNIVERSITY – Password Reset Confirmation",
    text: `Dear ${userRow.full_name || userRow.username},\n\nYour BANTUG UNIVERSITY portal password was successfully reset. You may now log in using your new password.\n\nBest regards,\nBANTUG UNIVERSITY ICT Services`,
    type: "PASSWORD_RESET_SUCCESS",
    referenceId: userRow.reference_id,
    mysqlPool
  });

  return sendJson(res, 200, {
    ok: true,
    message: "Password reset successfully. You may now sign in with your new password."
  });
}

/**
 * Handle OTP Request / Resend (`POST /api/otp/request`)
 */
async function handleOtpRequest(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (_) {
    return sendJson(res, 400, { ok: false, message: "Invalid JSON request payload." });
  }

  const email = String(body.email || "").trim();
  const purpose = String(body.purpose || "email_verification").trim();
  const referenceNumber = String(body.referenceNumber || body.referenceId || "").trim();
  const recipientName = String(body.fullName || body.name || "Applicant").trim();

  if (!email || !isValidEmail(email)) {
    return sendJson(res, 400, { ok: false, message: "A valid email address is required." });
  }

  const result = await otpService.generateOtp({
    email,
    purpose,
    referenceId: referenceNumber,
    recipientName,
    mysqlPool,
    recordAuditLog
  });

  if (!result.ok) {
    return sendJson(res, result.cooldown ? 429 : 400, result);
  }

  return sendJson(res, 200, result);
}

/**
 * Handle OTP Verification (`POST /api/otp/verify`)
 */
async function handleOtpVerify(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (_) {
    return sendJson(res, 400, { ok: false, message: "Invalid JSON request payload." });
  }

  const email = String(body.email || "").trim();
  const otp = String(body.otp || "").trim();
  const purpose = String(body.purpose || "email_verification").trim();
  const referenceNumber = String(body.referenceNumber || body.referenceId || "").trim();

  if (!email || !otp) {
    return sendJson(res, 400, { ok: false, message: "Email address and 6-digit verification code are required." });
  }

  const result = await otpService.verifyOtp({
    email,
    otp,
    purpose,
    referenceId: referenceNumber,
    mysqlPool,
    recordAuditLog
  });

  if (!result.ok) {
    return sendJson(res, 400, result);
  }

  return sendJson(res, 200, result);
}

/**
 * Handle Account Preferences Update (`POST /api/account/preferences`)
 * Allows authenticated users to update their Display Name (and Student Academic Term).
 * Prevents alteration of role, account ID, or administrative privileges.
 */
async function handleAccountPreferences(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (_) {
    return sendJson(res, 400, { ok: false, message: "Invalid JSON request payload." });
  }

  const actor = await resolveRequestActor(req, body);
  if (!actor || !actor.role || actor.role === "guest") {
    return sendJson(res, 401, {
      ok: false,
      message: "Authentication required to update account preferences."
    });
  }

  // Phase 4 & Phase 5: Restrict Student and Faculty Profile and Account Modifications to Administrators
  if (actor.role === "student") {
    return sendJson(res, 403, {
      ok: false,
      message: "Access denied: Personal and academic information can only be updated by the university administrator."
    });
  }

  if (actor.role === "faculty") {
    return sendJson(res, 403, {
      ok: false,
      message: "Access denied: Personal and contact information can only be updated by the university administrator."
    });
  }

  const rawDisplayName = body.displayName || body.fullName || "";
  const displayName = String(rawDisplayName).trim();
  const rawAcademicTerm = body.academicTerm || "";
  const academicTerm = String(rawAcademicTerm).trim();

  if (!displayName || displayName.length < 2) {
    return sendJson(res, 400, {
      ok: false,
      message: "Display name must be at least 2 characters long."
    });
  }

  if (actor.role === "student" && (!academicTerm || academicTerm.length < 3)) {
    return sendJson(res, 400, {
      ok: false,
      message: "Academic term is required for students (e.g. 2nd Semester, AY 2026–2027)."
    });
  }

  // Update `users` table (safe update of full_name only; never touches role, user_id, or is_demo_account)
  try {
    await mysqlPool.query(
      "UPDATE `users` SET `full_name` = ? WHERE `username` = ? OR `reference_id` = ? OR `email` = ?",
      [displayName, actor.username || "", actor.actorId || "", actor.username || ""]
    );

    if (actor.role === "student") {
      await mysqlPool.query(
        "UPDATE `students` SET `full_name` = ?, `academic_term` = ? WHERE `student_number` = ? OR `username` = ?",
        [displayName, academicTerm, actor.actorId || "", actor.username || ""]
      );
    } else if (actor.role === "faculty") {
      await mysqlPool.query(
        "UPDATE `faculty` SET `full_name` = ? WHERE `faculty_id` = ? OR `username` = ?",
        [displayName, actor.actorId || "", actor.username || ""]
      );
    }

    // Update active session actorName
    if (actor.token && activeSessions.has(actor.token)) {
      const sess = activeSessions.get(actor.token);
      sess.actorName = displayName;
      sess.displayName = displayName;
      activeSessions.set(actor.token, sess);
      await mysqlPool.query(
        "UPDATE `user_sessions` SET `actor_name` = ? WHERE `session_token` = ?",
        [displayName, actor.token]
      );
    }

    // Synchronize snapshot if in portal_state_store
    try {
      const [rows] = await mysqlPool.query(
        "SELECT state_json FROM `portal_state_store` WHERE `id` = 1 LIMIT 1"
      );
      if (rows && rows[0] && rows[0].state_json) {
        const stateObj = JSON.parse(rows[0].state_json);
        if (stateObj) {
          if (actor.role === "student" && stateObj.profile) {
            stateObj.profile.fullName = displayName;
            if (academicTerm) stateObj.profile.academicTerm = academicTerm;
          } else if (actor.role === "faculty" && stateObj.facultyProfile) {
            stateObj.facultyProfile.fullName = displayName;
          }
          await mysqlPool.query(
            "UPDATE `portal_state_store` SET `state_json` = ?, `updated_at` = NOW() WHERE `id` = 1",
            [JSON.stringify(stateObj)]
          );
        }
      }
    } catch (_) {}

  } catch (err) {
    return sendJson(res, 500, { ok: false, message: "Database error updating preferences: " + err.message });
  }

  await recordAuditLog({
    actorId: actor.actorId || "user",
    actorName: displayName,
    actorRole: actor.role,
    actionType: "ACCOUNT_PREFERENCES_UPDATED",
    targetType: "account",
    targetId: actor.actorId || actor.role,
    details: `Updated account preferences for ${displayName} (${actor.role.toUpperCase()}): Display Name="${displayName}"${actor.role === 'student' ? `, Academic Term="${academicTerm}"` : ''}.`
  });

  return sendJson(res, 200, {
    ok: true,
    message: "Account preferences saved successfully.",
    profile: {
      fullName: displayName,
      academicTerm: actor.role === "student" ? academicTerm : undefined
    }
  });
}

/**
 * Generate a unique, professional Application Reference Number on the backend
 * Format: `BU-YYYY-XXXXXX` (e.g. `BU-2026-000001`)
 * Safely verified against the MySQL `applications` table to prevent duplicates.
 */
async function generateUniqueReferenceNumber() {
  const year = new Date().getFullYear();
  const prefix = `BU-${year}-`;

  // Query highest sequence number for this year in MySQL
  const [rows] = await mysqlPool.query(
    `SELECT reference_number
     FROM \`applications\`
     WHERE \`reference_number\` LIKE ?
     ORDER BY application_id DESC
     LIMIT 250`,
    [`${prefix}%`]
  );

  let maxSeq = 0;
  for (const r of rows) {
    const match = String(r.reference_number || "").match(/^BU-\d{4}-(\d{6})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  // If no BU-YYYY-XXXXXX records found yet, count existing records to seed sequence cleanly
  if (maxSeq === 0) {
    const [cntRows] = await mysqlPool.query(`SELECT COUNT(*) AS cnt FROM \`applications\``);
    maxSeq = Number(cntRows[0]?.cnt || 0);
  }

  // Sequentially find the next available unique reference number with database collision check
  let candidateSeq = maxSeq + 1;
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `${prefix}${String(candidateSeq).padStart(6, "0")}`;
    const [existing] = await mysqlPool.query(
      `SELECT COUNT(*) AS cnt FROM \`applications\` WHERE \`reference_number\` = ?`,
      [candidate]
    );
    if (Number(existing[0]?.cnt || 0) === 0) {
      return candidate;
    }
    candidateSeq++;
  }

  // Fallback high-entropy sequence
  const fallback = `${prefix}${String(Date.now()).slice(-6)}`;
  return fallback;
}

/**
 * Fetch all applications from MySQL `applications` table
 */
async function fetchAllApplicationsFromMySQL() {
  const [rows] = await mysqlPool.query(`
    SELECT
      application_id AS applicationId,
      COALESCE(NULLIF(id, ''), CONCAT('app_', application_id)) AS id,
      reference_number AS referenceNumber,
      username,
      full_name AS fullName,
      DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS dateOfBirth,
      DATE_FORMAT(date_of_birth, '%m/%d/%Y') AS dateOfBirthFormatted,
      email,
      COALESCE(email_verified, 0) AS emailVerified,
      COALESCE(approval_email_sent, 0) AS approvalEmailSent,
      approved_program AS approvedProgram,
      contact_number AS contactNumber,
      address,
      applicant_type AS applicantType,
      year_level AS yearLevel,
      desired_program AS desiredProgram,
      second_choice_program AS secondChoiceProgram,
      previous_school AS previousSchool,
      educational_background AS educationalBackground,
      CAST(graduation_year AS CHAR) AS graduationYear,
      DATE_FORMAT(submitted_date, '%Y-%m-%d') AS submittedDate,
      status,
      approval_email_sent AS approvalEmailSent,
      DATE_FORMAT(approval_email_sent_at, '%Y-%m-%d %H:%i:%s') AS approvalEmailSentAt,
      approved_program AS approvedProgram,
      is_demo_record AS isDemoRecord,
      remarks,
      updated_by AS updatedBy,
      DATE_FORMAT(status_updated_at, '%Y-%m-%d %H:%i:%s') AS statusUpdatedAt,
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
      DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
    FROM \`applications\`
    ORDER BY is_demo_record ASC, submitted_date DESC, application_id DESC
  `);

  return rows.map((r) => ({
    ...r,
    status: normalizeApplicationStatus(r.status),
    isDemoRecord: Boolean(r.isDemoRecord),
    emailVerified: Boolean(r.emailVerified),
    approvalEmailSent: Boolean(r.approvalEmailSent)
  }));
}

/**
 * Fetch all announcements from MySQL `announcements` table
 */
async function fetchAllAnnouncementsFromMySQL() {
  const [rows] = await mysqlPool.query(`
    SELECT
      announcement_id AS id,
      announcement_id AS announcementId,
      title,
      category,
      DATE_FORMAT(publish_date, '%Y-%m-%d') AS date,
      author,
      COALESCE(faculty_id, 'FAC-BU-04') AS facultyId,
      COALESCE(target_audience, 'All BSIT Students') AS targetAudience,
      description,
      is_published AS published,
      is_read AS \`read\`,
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
    FROM \`announcements\`
    ORDER BY publish_date DESC, created_at DESC, announcement_id DESC
  `);

  return rows.map((r) => ({
    id: r.id,
    announcementId: r.announcementId,
    title: r.title,
    category: r.category || "Academic",
    date: r.date,
    author: r.author || "BANTUG UNIVERSITY Faculty",
    facultyId: r.facultyId || "FAC-BU-04",
    targetAudience: r.targetAudience || "All BSIT Students",
    description: r.description || "",
    published: Boolean(r.published),
    read: Boolean(r.read),
    createdAt: r.createdAt
  }));
}

/**
 * Fetch all university subjects from MySQL `subjects` table (General Catalog)
 */
async function fetchAllSubjectsFromMySQL() {
  const [rows] = await mysqlPool.query(`
    SELECT
      s.subject_code AS subjectCode,
      s.course_code AS courseCode,
      s.subject_name AS subjectName,
      s.full_subject_name AS fullSubjectName,
      s.instructor_name AS instructor,
      s.faculty_id AS facultyId,
      s.course,
      s.year_level AS yearLevel,
      s.section,
      COALESCE(s.units, 3) AS units,
      s.schedule_summary AS scheduleSummary,
      s.description,
      COALESCE(s.is_sample_schedule, 0) AS isSampleSchedule
    FROM \`subjects\` s
    ORDER BY s.subject_code ASC
  `);

  return rows.map((r) => ({
    id: `subj_${String(r.subjectCode || "").toLowerCase()}`,
    subjectCode: r.subjectCode,
    courseCode: r.courseCode || r.subjectCode,
    subjectName: r.subjectName,
    fullSubjectName: r.fullSubjectName || `${r.courseCode || r.subjectCode} – ${r.subjectName}`,
    instructor: r.instructor || "Not specified",
    facultyId: r.facultyId || null,
    course: r.course || "Bachelor of Science in Information Technology",
    yearLevel: normalizeYearLevel(r.yearLevel, "Year 2"),
    section: r.section || "",
    units: Number(r.units) || 3,
    scheduleSummary: r.scheduleSummary || "Not specified",
    description: r.description || "",
    isSampleSchedule: Boolean(r.isSampleSchedule)
  }));
}

/**
 * Fetch all university schedule sessions from MySQL `subject_schedules` joined with `subjects`
 */
async function fetchAllSchedulesFromMySQL() {
  const [rows] = await mysqlPool.query(`
    SELECT
      ss.schedule_id AS scheduleId,
      ss.subject_code AS subjectCode,
      COALESCE(NULLIF(ss.course_code, ''), s.course_code, ss.subject_code) AS courseCode,
      COALESCE(NULLIF(ss.subject_name, ''), s.subject_name, ss.subject_code) AS subjectName,
      COALESCE(s.full_subject_name, CONCAT(COALESCE(ss.course_code, s.course_code, ss.subject_code), ' – ', COALESCE(ss.subject_name, s.subject_name, ss.subject_code))) AS displaySubject,
      COALESCE(NULLIF(ss.instructor_name, ''), s.instructor_name, 'Not specified') AS instructor,
      COALESCE(ss.faculty_id, s.faculty_id) AS facultyId,
      COALESCE(ss.year_level, s.year_level, 'Year 2') AS yearLevel,
      ss.section,
      COALESCE(s.units, 3) AS units,
      ss.day_of_week AS day,
      TIME_FORMAT(ss.start_time, '%H:%i') AS startTime,
      TIME_FORMAT(ss.end_time, '%H:%i') AS endTime,
      ss.time_label AS timeLabel,
      ss.room,
      COALESCE(ss.class_type, 'Lecture') AS classType,
      COALESCE(ss.academic_term, '2nd Semester, AY 2026–2027') AS academicTerm,
      COALESCE(ss.is_sample_schedule, s.is_sample_schedule, 0) AS isSampleData
    FROM \`subject_schedules\` ss
    LEFT JOIN \`subjects\` s ON ss.subject_code = s.subject_code
    ORDER BY
      FIELD(ss.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'),
      ss.start_time ASC,
      ss.subject_code ASC
  `);

  return rows.map((r) => ({
    sessionId: `db_${r.scheduleId}`,
    scheduleId: r.scheduleId,
    subjectCode: r.subjectCode,
    courseCode: r.courseCode,
    subjectName: r.subjectName,
    displaySubject: r.displaySubject,
    instructor: r.instructor || "Not specified",
    facultyId: r.facultyId || null,
    yearLevel: normalizeYearLevel(r.yearLevel, "Year 2"),
    section: r.section || "BSIT 2-2",
    units: Number(r.units) || 3,
    day: r.day,
    startTime: r.startTime,
    endTime: r.endTime,
    timeLabel: r.timeLabel || formatTimeRangeLabel(r.startTime, r.endTime),
    room: r.room || "Not specified",
    canonicalRoom: normalizeRoomName(r.room),
    classType: r.classType || "Lecture",
    academicTerm: r.academicTerm || "2nd Semester, AY 2026–2027",
    isSampleData: Boolean(r.isSampleData)
  }));
}

/**
 * Validate a candidate schedule entry against all existing MySQL schedule sessions.
 * Enforces all 5 conflict prevention rules:
 * 1. One professor teaching two classes at overlapping times
 * 2. One classroom assigned to two classes at overlapping times
 * 3. One section having two classes at overlapping times
 * 4. Invalid start and end times (`startTime >= endTime`)
 * 5. Duplicate schedule entries
 * Back-to-back classes (`endTime === startTime`, e.g. 10:00 AM end and 10:00 AM start) are allowed.
 */
function validateScheduleCandidate(candidate, existingSchedules) {
  const errors = [];
  const conflicts = [];

  const subjectCode = String(candidate.subjectCode || "").trim();
  const courseCode = String(candidate.courseCode || subjectCode).trim();
  const subjectName = String(candidate.subjectName || "").trim();
  const instructor = String(candidate.instructor || "").trim();
  const section = String(candidate.section || "").trim();
  const yearLevel = normalizeYearLevel(candidate.yearLevel, "Year 2");
  const day = String(candidate.day || "").trim();
  const startTime = String(candidate.startTime || "").trim().slice(0, 5);
  const endTime = String(candidate.endTime || "").trim().slice(0, 5);
  const room = String(candidate.room || "").trim();
  const canonicalRoom = normalizeRoomName(room);

  if (!subjectCode) errors.push("Subject code is required.");
  if (!subjectName) errors.push("Subject name is required.");
  if (!instructor) errors.push("Professor / Instructor is required.");
  if (!section) errors.push("Section is required.");
  if (!room) errors.push("Classroom or laboratory assignment is required.");
  if (!VALID_WEEKDAYS.includes(day)) errors.push("Day must be Monday, Tuesday, Wednesday, Thursday, or Friday.");

  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    errors.push("Start time and end time must use valid HH:MM format.");
  } else if (startTime >= endTime) {
    const msg = `Invalid time range (${startTime}–${endTime}): Start time must be strictly earlier than end time.`;
    errors.push(msg);
    conflicts.push({ type: "INVALID_TIME_RANGE", message: msg });
  }

  if (errors.length > 0) {
    return { valid: false, errors, conflicts };
  }

  for (const ex of existingSchedules) {
    if (candidate.scheduleId && String(ex.scheduleId) === String(candidate.scheduleId)) continue;
    if (ex.day !== day) continue;

    // 5. Duplicate schedule entry check
    if (
      ex.subjectCode.toLowerCase() === subjectCode.toLowerCase() &&
      ex.section.toLowerCase() === section.toLowerCase() &&
      ex.startTime === startTime &&
      ex.endTime === endTime
    ) {
      const msg = `Duplicate schedule entry: ${subjectCode} (${section}) is already scheduled on ${day} at ${ex.timeLabel}.`;
      errors.push(msg);
      conflicts.push({ type: "DUPLICATE_ENTRY", message: msg, conflictingSession: ex });
      continue;
    }

    // Back-to-back (`startTime === ex.endTime` or `endTime === ex.startTime`) does NOT overlap
    const overlaps = startTime < ex.endTime && endTime > ex.startTime;
    if (!overlaps) continue;

    // 1. Professor overlap check
    if (
      ex.instructor &&
      ex.instructor.toLowerCase() !== "not specified" &&
      instructor.toLowerCase() !== "not specified" &&
      ex.instructor.toLowerCase() === instructor.toLowerCase()
    ) {
      const msg = `Professor Conflict: ${instructor} is already teaching ${ex.subjectCode} (${ex.section}) on ${day} at ${ex.timeLabel} in ${ex.room}.`;
      errors.push(msg);
      conflicts.push({ type: "PROFESSOR_CONFLICT", message: msg, conflictingSession: ex });
    }

    // 2. Classroom / Facility overlap check
    const exCanonicalRoom = normalizeRoomName(ex.canonicalRoom || ex.room);
    if (
      canonicalRoom !== "Not specified" &&
      exCanonicalRoom !== "Not specified" &&
      canonicalRoom.toLowerCase() === exCanonicalRoom.toLowerCase()
    ) {
      const msg = `Room Conflict: ${canonicalRoom} is already assigned to ${ex.subjectCode} (${ex.section} – ${ex.instructor}) on ${day} at ${ex.timeLabel}.`;
      errors.push(msg);
      conflicts.push({ type: "ROOM_CONFLICT", message: msg, conflictingSession: ex });
    }

    // 3. Section overlap check
    if (ex.section && ex.section.toLowerCase() === section.toLowerCase()) {
      const msg = `Section Conflict: ${section} already has ${ex.subjectCode} (${ex.instructor}) on ${day} at ${ex.timeLabel} in ${ex.room}.`;
      errors.push(msg);
      conflicts.push({ type: "SECTION_CONFLICT", message: msg, conflictingSession: ex });
    }
  }

  return {
    valid: errors.length === 0 && conflicts.length === 0,
    errors,
    conflicts,
    normalized: {
      subjectCode,
      courseCode,
      subjectName,
      instructor,
      facultyId: candidate.facultyId || null,
      section,
      yearLevel,
      day,
      startTime,
      endTime,
      timeLabel: candidate.timeLabel || formatTimeRangeLabel(startTime, endTime),
      room,
      classType: candidate.classType || "Lecture",
      units: Number(candidate.units) || 3,
      academicTerm: candidate.academicTerm || "2nd Semester, AY 2026–2027",
      isSampleData: true
    }
  };
}

/**
 * Handle Creating a New Faculty Schedule Session in MySQL (`POST /api/schedules`)
 */
async function handleCreateScheduleSession(req, res) {
  const actor = await requireBackendRole(
    req,
    res,
    ["faculty", "admin"],
    "Only authorized Faculty or Administrator accounts can add faculty schedule entries."
  );
  if (!actor) return;

  const body = await readJsonBody(req);
  const existingSchedules = await fetchAllSchedulesFromMySQL();
  const validation = validateScheduleCandidate(body, existingSchedules);

  if (!validation.valid) {
    const statusCode = validation.conflicts.length > 0 ? 409 : 400;
    return sendJson(res, statusCode, {
      ok: false,
      message: validation.errors[0] || "Schedule validation failed.",
      errors: validation.errors,
      conflicts: validation.conflicts
    });
  }

  const norm = validation.normalized;
  const fullSubjectName = `${norm.courseCode} – ${norm.subjectName}`;
  const scheduleSummary = `${norm.day.slice(0, 3)} ${norm.timeLabel} (${norm.room})`;

  // Ensure subject exists in `subjects` table
  await mysqlPool.query(
    `INSERT INTO \`subjects\` (
      \`subject_code\`, \`course_code\`, \`subject_name\`, \`full_subject_name\`,
      \`instructor_name\`, \`faculty_id\`, \`course\`, \`year_level\`, \`section\`,
      \`units\`, \`schedule_summary\`, \`is_sample_schedule\`
    ) VALUES (?, ?, ?, ?, ?, ?, 'Bachelor of Science in Information Technology', ?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
      \`schedule_summary\` = VALUES(\`schedule_summary\`)`,
    [
      norm.subjectCode,
      norm.courseCode,
      norm.subjectName,
      fullSubjectName,
      norm.instructor,
      norm.facultyId,
      norm.yearLevel,
      norm.section,
      norm.units,
      scheduleSummary
    ]
  );

  const [insertRes] = await mysqlPool.query(
    `INSERT INTO \`subject_schedules\` (
      \`subject_code\`, \`course_code\`, \`subject_name\`, \`faculty_id\`, \`instructor_name\`,
      \`year_level\`, \`day_of_week\`, \`start_time\`, \`end_time\`, \`time_label\`,
      \`room\`, \`section\`, \`class_type\`, \`academic_term\`, \`is_sample_schedule\`
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      norm.subjectCode,
      norm.courseCode,
      norm.subjectName,
      norm.facultyId,
      norm.instructor,
      norm.yearLevel,
      norm.day,
      `${norm.startTime}:00`,
      `${norm.endTime}:00`,
      norm.timeLabel,
      norm.room,
      norm.section,
      norm.classType,
      norm.academicTerm
    ]
  );

  await recordAuditLog({
    actorRole: actor.role || "faculty",
    actorName: actor.actorName || norm.instructor,
    actorId: actor.actorId || norm.facultyId,
    actionType: "SCHEDULE_CREATED",
    targetTable: "subject_schedules",
    targetRecordId: String(insertRes.insertId || norm.subjectCode),
    details: `Added schedule ${norm.subjectCode} (${norm.courseCode}) for ${norm.instructor} — ${norm.section}, ${norm.day} ${norm.timeLabel} in ${norm.room}.`
  });

  const allSchedules = await fetchAllSchedulesFromMySQL();
  const createdSession =
    allSchedules.find((s) => s.scheduleId === insertRes.insertId) ||
    allSchedules.find(
      (s) =>
        s.subjectCode === norm.subjectCode &&
        s.day === norm.day &&
        s.startTime === norm.startTime
    );

  return sendJson(res, 201, {
    ok: true,
    message: `Schedule session for ${norm.subjectCode} (${norm.section}) saved to MySQL database.`,
    schedule: createdSession,
    schedules: allSchedules
  });
}

/**
 * Handle Deleting a Custom/Sample Schedule Session from MySQL (`DELETE /api/schedules/:id`)
 */
async function handleDeleteScheduleSession(req, res, scheduleIdFromPath = null) {
  const actor = await requireBackendRole(
    req,
    res,
    ["faculty", "admin"],
    "Only authorized Faculty or Administrator accounts can delete faculty schedule entries."
  );
  if (!actor) return;

  const scheduleId = Number(scheduleIdFromPath);
  if (!scheduleId || isNaN(scheduleId)) {
    return sendJson(res, 400, { ok: false, message: "Valid numeric schedule ID is required." });
  }

  const [rows] = await mysqlPool.query(
    "SELECT schedule_id, subject_code, course_code, instructor_name, day_of_week, time_label, room, section, is_sample_schedule FROM `subject_schedules` WHERE `schedule_id` = ? LIMIT 1",
    [scheduleId]
  );

  if (!rows || rows.length === 0) {
    return sendJson(res, 404, { ok: false, message: `Schedule #${scheduleId} not found in MySQL.` });
  }

  const target = rows[0];
  if (
    target.section === "BSIT 2-2" &&
    OFFICIAL_BSIT22_SUBJECT_CODES.has(target.subject_code) &&
    Number(target.is_sample_schedule) === 0
  ) {
    return sendJson(res, 403, {
      ok: false,
      message: "Official BSIT 2-2 schedule entries are protected and cannot be deleted."
    });
  }

  await mysqlPool.query("DELETE FROM `subject_schedules` WHERE `schedule_id` = ?", [scheduleId]);

  await recordAuditLog({
    actorRole: actor.role || "faculty",
    actorName: actor.actorName || "Authorized Faculty",
    actorId: actor.actorId || "FAC-BU-04",
    actionType: "SCHEDULE_DELETED",
    targetTable: "subject_schedules",
    targetRecordId: String(scheduleId),
    details: `Deleted schedule #${scheduleId}: ${target.subject_code} (${target.section}) — ${target.instructor_name}, ${target.day_of_week} ${target.time_label}.`
  });

  const allSchedules = await fetchAllSchedulesFromMySQL();
  return sendJson(res, 200, {
    ok: true,
    deletedId: scheduleId,
    schedules: allSchedules,
    message: `Schedule session #${scheduleId} removed from MySQL database.`
  });
}

/**
 * Keep `portal_state_store` JSON snapshot synchronized whenever `applications`
 * or `announcements` are modified in MySQL.
 */
async function syncSnapshotWithRelationalTables() {
  try {
    const [rows] = await mysqlPool.query(
      "SELECT state_json FROM `portal_state_store` WHERE `state_key` = 'bantug_university_portal_v2' LIMIT 1"
    );
    if (!rows || rows.length === 0 || !rows[0].state_json) return;

    const storedState = JSON.parse(rows[0].state_json);
    if (!storedState || typeof storedState !== "object") return;

    const dbApps = await fetchAllApplicationsFromMySQL();
    const dbAnns = await fetchAllAnnouncementsFromMySQL();

    storedState.applications = dbApps.filter((a) => !a.isDemoRecord);
    const demoAppsFromDb = dbApps.filter((a) => a.isDemoRecord);
    if (demoAppsFromDb.length > 0) {
      storedState.demoApplicantRecords = demoAppsFromDb;
    }
    storedState.announcements = dbAnns;

    await mysqlPool.query(
      "UPDATE `portal_state_store` SET `state_json` = ? WHERE `state_key` = 'bantug_university_portal_v2'",
      [JSON.stringify(storedState)]
    );
  } catch (err) {
    console.warn("[server.js] Snapshot sync warning:", err.message);
  }
}

/**
 * Handle Public Student Application Submission (`POST /api/applications` or `action=submit_application`)
 */
async function handleSubmitApplication(req, res) {
  const body = await readJsonBody(req);

  const rawLastName = String(body.lastName || "").trim();
  const rawFirstName = String(body.firstName || "").trim();
  const rawMiddleName = String(body.middleName || "").trim();
  let rawFullName = String(body.fullName || "").trim();

  // If firstName & lastName are supplied, construct and normalize fullName
  if (rawFirstName && rawLastName) {
    rawFullName = rawMiddleName
      ? `${rawLastName}, ${rawFirstName} ${rawMiddleName}`
      : `${rawLastName}, ${rawFirstName}`;
  }

  const rawDob = String(body.dateOfBirth || "").trim();
  const email = String(body.email || "").trim();
  const rawContact = String(body.contactNumber || "").trim();
  const address = String(body.address || "").trim();
  const desiredProgram = String(body.desiredProgram || "").trim();
  const secondChoiceProgram = String(body.secondChoiceProgram || "None").trim() || "None";
  const yearLevel = String(body.yearLevel || "Year 1").trim();
  const applicantType =
    String(body.applicantType || "Senior High School Graduate / Freshman").trim() ||
    "Senior High School Graduate / Freshman";
  const previousSchool = String(body.previousSchool || "").trim();
  const educationalBackground = String(body.educationalBackground || "").trim();
  const rawGradYear = String(body.graduationYear || "").trim();
  const submittedDate =
    body.submittedDate && /^\d{4}-\d{2}-\d{2}$/.test(String(body.submittedDate).trim())
      ? String(body.submittedDate).trim()
      : formatLocalDate(new Date());

  const fieldErrors = {};

  // 1. Name validation: accept letters, spaces, hyphens, apostrophes; reject numbers and invalid symbols
  const nameRegex = /^[A-Za-z\u00C0-\u00FF\u0100-\u017F\u00f1\u00d1]+([ A-Za-z\u00C0-\u00FF\u0100-\u017F\u00f1\u00d1'\-]*[A-Za-z\u00C0-\u00FF\u0100-\u017F\u00f1\u00d1]+)?$/;

  if (rawLastName || rawFirstName) {
    if (!rawLastName) {
      fieldErrors.lastName = "Applicant Last Name is required.";
    } else if (/\d/.test(rawLastName)) {
      fieldErrors.lastName = "Last Name cannot contain numbers.";
    } else if (!nameRegex.test(rawLastName) || rawLastName.length < 2) {
      fieldErrors.lastName = "Last Name contains invalid characters (letters, spaces, hyphens, and apostrophes only).";
    }

    if (!rawFirstName) {
      fieldErrors.firstName = "Applicant First Name is required.";
    } else if (/\d/.test(rawFirstName)) {
      fieldErrors.firstName = "First Name cannot contain numbers.";
    } else if (!nameRegex.test(rawFirstName) || rawFirstName.length < 2) {
      fieldErrors.firstName = "First Name contains invalid characters (letters, spaces, hyphens, and apostrophes only).";
    }

    if (rawMiddleName) {
      if (/\d/.test(rawMiddleName)) {
        fieldErrors.middleName = "Middle Name cannot contain numbers.";
      } else if (!nameRegex.test(rawMiddleName)) {
        fieldErrors.middleName = "Middle Name contains invalid characters.";
      }
    }
  } else {
    // If only fullName was provided
    if (!rawFullName || rawFullName.length < 3 || rawFullName.length > 150) {
      fieldErrors.fullName = "Applicant full name is required (3 to 150 characters).";
    } else if (/\d/.test(rawFullName)) {
      fieldErrors.fullName = "Applicant name cannot contain numbers.";
    }
  }

  // 2. Date of Birth Validation (MM/DD/YYYY or YYYY-MM-DD, leap year check, no future dates)
  let mysqlDob = null;
  let parsedMm = null, parsedDd = null, parsedYyyy = null;

  if (!rawDob) {
    fieldErrors.dateOfBirth = "Date of birth is required.";
  } else if (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(rawDob)) {
    const m = rawDob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    parsedMm = parseInt(m[1], 10);
    parsedDd = parseInt(m[2], 10);
    parsedYyyy = parseInt(m[3], 10);
  } else if (/^(\d{4})-(\d{2})-(\d{2})$/.test(rawDob)) {
    const m = rawDob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    parsedYyyy = parseInt(m[1], 10);
    parsedMm = parseInt(m[2], 10);
    parsedDd = parseInt(m[3], 10);
  } else {
    fieldErrors.dateOfBirth = "A valid date of birth (MM/DD/YYYY) is required.";
  }

  if (parsedMm !== null && parsedDd !== null && parsedYyyy !== null) {
    if (parsedMm < 1 || parsedMm > 12) {
      fieldErrors.dateOfBirth = "Invalid month in date of birth (must be 01 to 12).";
    } else {
      const isLeap = (parsedYyyy % 4 === 0 && parsedYyyy % 100 !== 0) || (parsedYyyy % 400 === 0);
      const daysInMonths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const maxDays = daysInMonths[parsedMm - 1];

      if (parsedDd < 1 || parsedDd > maxDays) {
        fieldErrors.dateOfBirth = `Invalid day in date of birth (Month ${parsedMm} has ${maxDays} days in ${parsedYyyy}).`;
      } else {
        const today = new Date();
        const inputDate = new Date(parsedYyyy, parsedMm - 1, parsedDd, 23, 59, 59, 999);
        if (inputDate > today) {
          fieldErrors.dateOfBirth = "Date of birth cannot be a future date.";
        } else if (parsedYyyy < 1920) {
          fieldErrors.dateOfBirth = "Year of birth cannot be earlier than 1920.";
        } else {
          mysqlDob = `${parsedYyyy}-${String(parsedMm).padStart(2, "0")}-${String(parsedDd).padStart(2, "0")}`;
        }
      }
    }
  }

  // 3. Email Validation
  if (!email || !isValidEmail(email) || email.length > 150) {
    fieldErrors.email = "A valid email address is required (max 150 characters).";
  }

  // 4. Contact Number (Philippines) Validation: +63 fixed prefix + 10 digits starting with 9
  let normalizedContact = null;
  let contactDigitsOnly = rawContact.replace(/^\+?63\s*/, "").replace(/^0/, "");
  if (/[^\d\s\-]/.test(contactDigitsOnly)) {
    fieldErrors.contactNumber = "Contact number can only contain digits.";
  } else {
    const digits = contactDigitsOnly.replace(/\D/g, "");
    if (!digits) {
      fieldErrors.contactNumber = "Contact number is required.";
    } else if (digits.length !== 10) {
      fieldErrors.contactNumber = `Contact number must be exactly 10 digits after +63 (entered ${digits.length} digits).`;
    } else if (!digits.startsWith("9")) {
      fieldErrors.contactNumber = "Philippine mobile numbers must start with 9.";
    } else {
      normalizedContact = `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
  }

  // 5. Complete Address Validation
  if (!address || address.length < 5 || address.length > 255) {
    fieldErrors.address = "Complete home address is required (5 to 255 characters).";
  }

  // 6. Desired Program & Alternative 2nd Choice Program Validation
  if (!desiredProgram || desiredProgram.length > 160) {
    fieldErrors.desiredProgram = "Desired academic program is required.";
  }

  if (
    secondChoiceProgram &&
    secondChoiceProgram !== "None" &&
    secondChoiceProgram.trim().toLowerCase() === desiredProgram.trim().toLowerCase()
  ) {
    fieldErrors.secondChoiceProgram = "Your second-choice program must be different from your first choice.";
  }

  // 7. Year Level Validation: Strictly "Year 1" for new applicants
  if (yearLevel && yearLevel !== "Year 1") {
    fieldErrors.yearLevel = "Applicant Year Level must be strictly set to Year 1 for new applications.";
  }
  const enforcedYearLevel = "Year 1";

  // 8. Previous School & Educational Background Validation
  if (!previousSchool || previousSchool.length > 180) {
    fieldErrors.previousSchool = "Previous school attended is required (max 180 characters).";
  }
  if (!educationalBackground || educationalBackground.length > 180) {
    fieldErrors.educationalBackground = "Educational background / strand is required (max 180 characters).";
  }

  // 9. Graduation Year Validation: Exactly 4 digits, no decimals, no future years (> current year)
  if (!rawGradYear) {
    fieldErrors.graduationYear = "Year graduated / completed is required.";
  } else if (/\./.test(rawGradYear) || /\,/.test(rawGradYear)) {
    fieldErrors.graduationYear = "Year graduated cannot contain decimals or commas.";
  } else if (!/^\d{4}$/.test(rawGradYear)) {
    fieldErrors.graduationYear = "Year graduated must consist of exactly 4 numerical digits.";
  } else {
    const gradYrNum = Number(rawGradYear);
    const currYear = new Date().getFullYear();
    if (gradYrNum < 1950) {
      fieldErrors.graduationYear = "Year graduated cannot be earlier than 1950.";
    } else if (gradYrNum > currYear) {
      fieldErrors.graduationYear = `Year graduated cannot be in the future (maximum ${currYear}).`;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return sendJson(res, 400, {
      ok: false,
      message: Object.values(fieldErrors)[0],
      fieldErrors
    });
  }

  const finalFullName = rawFullName;
  const finalDob = mysqlDob;
  const finalContactNumber = normalizedContact;

  // Prevent accidental duplicate submissions (same full_name + email + desired_program on same day with Pending/Under Review status)
  const [dupRows] = await mysqlPool.query(
    `SELECT reference_number, status
     FROM \`applications\`
     WHERE is_demo_record = 0
       AND LOWER(TRIM(full_name)) = LOWER(?)
       AND LOWER(TRIM(email)) = LOWER(?)
       AND LOWER(TRIM(desired_program)) = LOWER(?)
       AND submitted_date = ?
       AND status IN ('Pending', 'Under Review')
     LIMIT 1`,
    [finalFullName, email, desiredProgram, submittedDate]
  );

  if (dupRows.length > 0) {
    return sendJson(res, 409, {
      ok: false,
      duplicate: true,
      existingReferenceNumber: dupRows[0].reference_number,
      message: `Duplicate submission prevented: An application for ${finalFullName} (${desiredProgram}) was already submitted today under Reference No. ${dupRows[0].reference_number}.`
    });
  }

  let referenceNumber = await generateUniqueReferenceNumber();
  const clientId = String(body.id || "").trim() || `app_${Date.now().toString(36)}`;
  const initialStatus = "Pending";
  const remarks =
    String(body.remarks || "").trim() ||
    "Submitted via Online Applicant Portal — Pending Faculty Evaluation.";

  let insertResult = null;
  for (let retry = 0; retry < 2; retry++) {
    try {
      const [res] = await mysqlPool.query(
        `INSERT INTO \`applications\` (
          \`id\`, \`reference_number\`, \`username\`, \`full_name\`, \`date_of_birth\`,
          \`email\`, \`contact_number\`, \`address\`, \`applicant_type\`, \`year_level\`,
          \`desired_program\`, \`second_choice_program\`, \`previous_school\`,
          \`educational_background\`, \`graduation_year\`, \`submitted_date\`,
          \`status\`, \`is_demo_record\`, \`remarks\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          clientId,
          referenceNumber,
          body.username || null,
          finalFullName,
          finalDob,
          email,
          finalContactNumber,
          address,
          applicantType,
          enforcedYearLevel,
          desiredProgram,
          secondChoiceProgram,
          previousSchool,
          educationalBackground,
          String(rawGradYear),
          submittedDate,
          initialStatus,
          remarks
        ]
      );
      insertResult = res;
      break;
    } catch (insertErr) {
      if (insertErr && insertErr.code === "ER_DUP_ENTRY" && retry === 0) {
        // Collision handled safely under simultaneous submissions
        referenceNumber = await generateUniqueReferenceNumber();
        continue;
      }
      console.error("[BANTUG UNIVERSITY] Application insertion error:", insertErr.message);
      return sendJson(res, 500, {
        ok: false,
        message: "Unable to process application submission at this time. Please try again."
      });
    }
  }

  if (!insertResult || insertResult.affectedRows < 1) {
    return sendJson(res, 500, {
      ok: false,
      message: "Unable to complete application submission at this time. Please try again."
    });
  }

  // Fetch the newly inserted record from MySQL to confirm persistence
  const [savedRows] = await mysqlPool.query(
    `SELECT
      application_id AS applicationId,
      COALESCE(NULLIF(id, ''), CONCAT('app_', application_id)) AS id,
      reference_number AS referenceNumber,
      full_name AS fullName,
      DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS dateOfBirth,
      DATE_FORMAT(date_of_birth, '%m/%d/%Y') AS dateOfBirthFormatted,
      email,
      COALESCE(email_verified, 0) AS emailVerified,
      COALESCE(approval_email_sent, 0) AS approvalEmailSent,
      approved_program AS approvedProgram,
      contact_number AS contactNumber,
      address,
      applicant_type AS applicantType,
      year_level AS yearLevel,
      desired_program AS desiredProgram,
      second_choice_program AS secondChoiceProgram,
      previous_school AS previousSchool,
      educational_background AS educationalBackground,
      CAST(graduation_year AS CHAR) AS graduationYear,
      DATE_FORMAT(submitted_date, '%Y-%m-%d') AS submittedDate,
      status,
      approval_email_sent AS approvalEmailSent,
      DATE_FORMAT(approval_email_sent_at, '%Y-%m-%d %H:%i:%s') AS approvalEmailSentAt,
      approved_program AS approvedProgram,
      is_demo_record AS isDemoRecord,
      remarks,
      updated_by AS updatedBy,
      DATE_FORMAT(status_updated_at, '%Y-%m-%d %H:%i:%s') AS statusUpdatedAt
     FROM \`applications\`
     WHERE \`reference_number\` = ?
     LIMIT 1`,
    [referenceNumber]
  );

  const savedApplication = savedRows[0]
    ? {
        ...savedRows[0],
        status: normalizeApplicationStatus(savedRows[0].status),
        isDemoRecord: Boolean(savedRows[0].isDemoRecord),
        updatedBy: savedRows[0].updatedBy || null,
        statusUpdatedAt: savedRows[0].statusUpdatedAt || null
      }
    : null;

  await recordAuditLog({
    actorRole: "applicant",
    actorName: finalFullName,
    actorId: email,
    actionType: "APPLICATION_SUBMITTED",
    targetTable: "applications",
    targetRecordId: referenceNumber,
    details: `Submitted new admission application ${referenceNumber} for ${finalFullName} (${desiredProgram}, ${enforcedYearLevel}). Initial status: Pending.`
  });

  // Phase 2: Log initial admission notification for the applicant
  try {
    await mysqlPool.query(
      `INSERT INTO \`notification_logs\` (
         \`recipient_email\`, \`recipient_name\`, \`notification_type\`,
         \`subject\`, \`reference_id\`, \`delivery_status\`, \`is_read\`, \`message_body\`
       ) VALUES (?, ?, 'APPLICATION_SUBMITTED', ?, ?, 'sent', 0, ?)`,
      [
        email,
        finalFullName,
        "BANTUG UNIVERSITY – Admission Application Submitted",
        referenceNumber,
        `Your application (${referenceNumber}) for ${desiredProgram} has been received and is currently Pending review.`
      ]
    );
  } catch (_) {}

  // Automatically trigger email verification OTP for the submitted application
  let emailVerificationInfo = { required: true, email, sent: false, status: "unconfigured" };
  try {
    const otpRes = await otpService.generateOtp({
      email,
      purpose: "email_verification",
      referenceId: referenceNumber,
      recipientName: finalFullName,
      mysqlPool,
      recordAuditLog
    });
    emailVerificationInfo = {
      required: true,
      email,
      sent: Boolean(otpRes.emailSent),
      status: otpRes.emailStatus || (otpRes.emailSent ? "sent" : "unconfigured"),
      message: otpRes.message
    };
  } catch (_) {}

  await syncSnapshotWithRelationalTables();

  return sendJson(res, 201, {
    ok: true,
    message: `Application ${referenceNumber} submitted successfully.`,
    application: savedApplication,
    emailVerification: emailVerificationInfo
  });
}

/**
 * Handle Faculty Application Status Update (`PUT /api/applications/:ref/status` or `action=update_application_status`)
 */
async function handleUpdateApplicationStatus(req, res, refFromPath = null) {
  const actor = await requireBackendRole(
    req,
    res,
    ["faculty", "admin"],
    "Only authorized Faculty or Administrator accounts can update student application statuses."
  );
  if (!actor) return;

  const body = await readJsonBody(req);
  const refNo = String(refFromPath || body.referenceNumber || "").trim();
  const rawStatus = String(body.status || "").trim();
  const remarks =
    body.remarks !== undefined && body.remarks !== null ? String(body.remarks).trim() : null;
  const updatedByName =
    String(body.updatedBy || actor.actorName || "Prof. Lee-mher Binay-an").trim() ||
    "Prof. Lee-mher Binay-an";

  if (!refNo) {
    return sendJson(res, 400, { ok: false, message: "Application reference number is required." });
  }
  if (!rawStatus || !VALID_APPLICATION_STATUSES.includes(normalizeApplicationStatus(rawStatus))) {
    return sendJson(res, 400, {
      ok: false,
      message: "Valid application status (Pending, Under Review, Approved, Rejected) is required."
    });
  }

  const newStatus = normalizeApplicationStatus(rawStatus);

  let updateResult;
  if (remarks !== null && remarks !== "") {
    [updateResult] = await mysqlPool.query(
      "UPDATE `applications` SET `status` = ?, `remarks` = ?, `updated_by` = ?, `status_updated_at` = NOW() WHERE `reference_number` = ?",
      [newStatus, remarks, updatedByName, refNo]
    );
  } else {
    [updateResult] = await mysqlPool.query(
      "UPDATE `applications` SET `status` = ?, `updated_by` = ?, `status_updated_at` = NOW() WHERE `reference_number` = ?",
      [newStatus, updatedByName, refNo]
    );
  }

  if (!updateResult || updateResult.affectedRows < 1) {
    return sendJson(res, 404, {
      ok: false,
      message: `Application ${refNo} was not found in the MySQL database.`
    });
  }

  const [updatedRows] = await mysqlPool.query(
    `SELECT
      application_id AS applicationId,
      COALESCE(NULLIF(id, ''), CONCAT('app_', application_id)) AS id,
      reference_number AS referenceNumber,
      full_name AS fullName,
      DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS dateOfBirth,
      DATE_FORMAT(date_of_birth, '%m/%d/%Y') AS dateOfBirthFormatted,
      email,
      COALESCE(email_verified, 0) AS emailVerified,
      COALESCE(approval_email_sent, 0) AS approvalEmailSent,
      approved_program AS approvedProgram,
      contact_number AS contactNumber,
      address,
      applicant_type AS applicantType,
      year_level AS yearLevel,
      desired_program AS desiredProgram,
      second_choice_program AS secondChoiceProgram,
      previous_school AS previousSchool,
      educational_background AS educationalBackground,
      CAST(graduation_year AS CHAR) AS graduationYear,
      DATE_FORMAT(submitted_date, '%Y-%m-%d') AS submittedDate,
      status,
      approval_email_sent AS approvalEmailSent,
      DATE_FORMAT(approval_email_sent_at, '%Y-%m-%d %H:%i:%s') AS approvalEmailSentAt,
      approved_program AS approvedProgram,
      is_demo_record AS isDemoRecord,
      remarks,
      updated_by AS updatedBy,
      DATE_FORMAT(status_updated_at, '%Y-%m-%d %H:%i:%s') AS statusUpdatedAt
     FROM \`applications\`
     WHERE \`reference_number\` = ?
     LIMIT 1`,
    [refNo]
  );

  const updatedApplication = updatedRows[0]
    ? {
        ...updatedRows[0],
        status: normalizeApplicationStatus(updatedRows[0].status),
        isDemoRecord: Boolean(updatedRows[0].isDemoRecord),
        updatedBy: updatedRows[0].updatedBy || updatedByName,
        statusUpdatedAt: updatedRows[0].statusUpdatedAt || null
      }
    : null;

  await recordAuditLog({
    actorRole: actor.role || "faculty",
    actorName: updatedByName,
    actorId: actor.actorId || "FAC-BU-04",
    actionType: "APPLICATION_STATUS_UPDATED",
    targetTable: "applications",
    targetRecordId: refNo,
    details: `Updated application ${refNo} (${updatedApplication?.fullName || "Applicant"}) status to "${newStatus}" by ${updatedByName}.`
  });

  // Part E: Application Approval & Status Notification Emails
  let wasEmailAlreadySent = false;
  if (newStatus === "Approved") {
    // Check if approval email has already been sent
    const alreadySent = Boolean(updatedRows[0]?.approvalEmailSent || updatedRows[0]?.approval_email_sent);
    wasEmailAlreadySent = alreadySent;
    if (!alreadySent && updatedApplication?.email) {
      const approvedProg = String(body.approvedProgram || updatedRows[0]?.approvedProgram || updatedRows[0]?.approved_program || updatedApplication.desiredProgram || "Bachelor of Science in Information Technology").trim();
      const applicantName = updatedApplication.fullName || "Applicant";
      const refNumber = updatedApplication.referenceNumber;

      const emailSubject = "BANTUG UNIVERSITY – Application Approved";
      const emailText = `Dear ${applicantName},

Congratulations! Your application to BANTUG UNIVERSITY has been approved.

Your approved program is: ${approvedProg}

Application Reference Number: ${refNumber}

Please keep your reference number for future inquiries.

Please follow the next instructions provided by the university regarding enrollment and admission requirements.

Thank you for choosing BANTUG UNIVERSITY.`;

      const emailHtml = `
        <div style="font-family:'Inter',system-ui,sans-serif;max-width:580px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;">
          <div style="text-align:center;margin-bottom:20px;">
            <h2 style="color:#0f2b5c;margin:0;font-size:22px;">BANTUG UNIVERSITY</h2>
            <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Office of Admissions &bull; Official Notification</p>
          </div>
          <div style="background:#f0fdf4;padding:20px;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:20px;">
            <h3 style="color:#15803d;margin:0 0 10px;font-size:18px;">Application Approved!</h3>
            <p style="font-size:15px;color:#1e293b;margin:0 0 12px;">Dear <strong>${applicantName}</strong>,</p>
            <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 14px;">
              Congratulations! Your application to BANTUG UNIVERSITY has been approved.
            </p>
            <div style="background:#ffffff;padding:14px;border-radius:6px;border:1px solid #cbd5e1;margin-bottom:14px;">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;">Your approved program is:</div>
              <div style="font-size:16px;font-weight:700;color:#0f2b5c;margin-bottom:8px;">${approvedProg}</div>
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;">Application Reference Number:</div>
              <div style="font-size:16px;font-weight:700;color:#0369a1;font-family:monospace;">${refNumber}</div>
            </div>
            <p style="font-size:13px;color:#334155;line-height:1.5;margin:0 0 10px;">
              Please keep your reference number for future inquiries.
            </p>
            <p style="font-size:13px;color:#334155;line-height:1.5;margin:0 0 10px;">
              Please follow the next instructions provided by the university regarding enrollment and admission requirements.
            </p>
            <p style="font-size:13px;color:#15803d;font-weight:600;margin:0;">
              Thank you for choosing BANTUG UNIVERSITY.
            </p>
          </div>
          <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
            &copy; ${new Date().getFullYear()} BANTUG UNIVERSITY &bull; Office of the University Registrar
          </p>
        </div>
      `;

      const sendRes = await emailService.sendEmail({
        to: updatedApplication.email,
        toName: applicantName,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        type: "application_approval",
        referenceId: refNumber,
        mysqlPool
      });

      try {
        await mysqlPool.query(
          "UPDATE `applications` SET `approval_email_sent` = 1, `approval_email_sent_at` = NOW(), `approved_program` = ? WHERE `reference_number` = ?",
          [approvedProg, refNumber]
        );
        if (updatedApplication) {
          updatedApplication.approvalEmailSent = true;
          updatedApplication.approvedProgram = approvedProg;
        }
      } catch (_) {}

      await recordAuditLog({
        actorRole: actor.role || "faculty",
        actorName: updatedByName,
        actorId: actor.actorId || "FAC-BU-04",
        actionType: "APPROVAL_EMAIL_PROCESSED",
        targetTable: "applications",
        targetRecordId: refNumber,
        details: `Dispatched approval notification to ${updatedApplication.email} for ${applicantName} (Reference: ${refNumber}, Status: ${sendRes.status}).`
      });
    }
  } else if (newStatus === "Rejected") {
    if (updatedApplication?.email) {
      await emailService.sendEmail({
        to: updatedApplication.email,
        toName: updatedApplication.fullName || "Applicant",
        subject: "BANTUG UNIVERSITY – Application Status Update",
        text: `Dear ${updatedApplication.fullName},\n\nThank you for applying to BANTUG UNIVERSITY. Following a review of your application (${refNo}), we regret to inform you that we are unable to offer you admission at this time.\n\nThank you for your interest in BANTUG UNIVERSITY.`,
        type: "APPLICATION_REJECTED",
        referenceId: refNo,
        mysqlPool
      });
    }
  } else if (newStatus === "Under Review") {
    if (updatedApplication?.email) {
      await emailService.sendEmail({
        to: updatedApplication.email,
        toName: updatedApplication.fullName || "Applicant",
        subject: "BANTUG UNIVERSITY – Application Under Review",
        text: `Dear ${updatedApplication.fullName},\n\nYour application (${refNo}) is currently being reviewed by the Admissions Committee. You will receive further updates once the evaluation is complete.\n\nBANTUG UNIVERSITY Admissions Office`,
        type: "APPLICATION_UNDER_REVIEW",
        referenceId: refNo,
        mysqlPool
      });
    }
  }

  await syncSnapshotWithRelationalTables();

  return sendJson(res, 200, {
    ok: true,
    referenceNumber: refNo,
    status: newStatus,
    updatedBy: updatedApplication?.updatedBy || updatedByName,
    statusUpdatedAt: updatedApplication?.statusUpdatedAt || null,
    application: updatedApplication,
    emailAlreadySent: Boolean(wasEmailAlreadySent),
    message: `Application ${refNo} status updated to "${newStatus}" in MySQL by ${updatedByName}.`
  });
}

/**
 * Handle Faculty Announcement Creation (`POST /api/announcements` or `action=create_announcement`)
 */
async function handleCreateAnnouncement(req, res) {
  const actor = await requireBackendRole(
    req,
    res,
    ["faculty", "admin"],
    "Only authorized Faculty or Administrator accounts can create announcements."
  );
  if (!actor) return;

  const body = await readJsonBody(req);

  const title = String(body.title || "").trim();
  const category = String(body.category || "Academic").trim() || "Academic";
  const publishDate =
    body.date && /^\d{4}-\d{2}-\d{2}$/.test(String(body.date).trim())
      ? String(body.date).trim()
      : formatLocalDate(new Date());
  const author = String(body.author || actor.actorName || "").trim();
  const facultyId = String(body.facultyId || actor.actorId || "FAC-BU-04").trim() || "FAC-BU-04";
  const targetAudience =
    String(body.targetAudience || "All BSIT Students").trim() || "All BSIT Students";
  const description = String(body.description || "").trim();
  const isPublished = body.published !== false && body.is_published !== 0 ? 1 : 0;
  const isRead = body.read === true || body.is_read === 1 ? 1 : 0;

  const fieldErrors = {};
  if (!title || title.length > 220) {
    fieldErrors.title = "Announcement title is required (max 220 characters).";
  }
  if (!publishDate) {
    fieldErrors.date = "Publication date is required.";
  }
  if (!author || author.length > 150) {
    fieldErrors.author = "Published by (author) is required (max 150 characters).";
  }
  if (!description || description.length < 10 || description.length > 5000) {
    fieldErrors.description = "Announcement content must be between 10 and 5,000 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return sendJson(res, 400, {
      ok: false,
      message: Object.values(fieldErrors)[0],
      fieldErrors
    });
  }

  let announcementId = String(body.id || body.announcementId || "").trim();
  if (!announcementId) {
    announcementId = `ann_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const [insertResult] = await mysqlPool.query(
    `INSERT INTO \`announcements\` (
      \`announcement_id\`, \`title\`, \`category\`, \`publish_date\`,
      \`author\`, \`faculty_id\`, \`target_audience\`, \`description\`,
      \`is_published\`, \`is_read\`
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      announcementId,
      title,
      category,
      publishDate,
      author,
      facultyId,
      targetAudience,
      description,
      isPublished,
      isRead
    ]
  );

  if (!insertResult || insertResult.affectedRows < 1) {
    return sendJson(res, 500, {
      ok: false,
      message: "Database did not confirm announcement insertion."
    });
  }

  const [savedRows] = await mysqlPool.query(
    `SELECT
      announcement_id AS id,
      announcement_id AS announcementId,
      title,
      category,
      DATE_FORMAT(publish_date, '%Y-%m-%d') AS date,
      author,
      COALESCE(faculty_id, 'FAC-BU-04') AS facultyId,
      COALESCE(target_audience, 'All BSIT Students') AS targetAudience,
      description,
      is_published AS published,
      is_read AS \`read\`,
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
     FROM \`announcements\`
     WHERE \`announcement_id\` = ?
     LIMIT 1`,
    [announcementId]
  );

  const savedAnnouncement = savedRows[0]
    ? {
        ...savedRows[0],
        published: Boolean(savedRows[0].published),
        read: Boolean(savedRows[0].read)
      }
    : null;

  await recordAuditLog({
    actorRole: actor.role || "faculty",
    actorName: author,
    actorId: facultyId,
    actionType: "ANNOUNCEMENT_CREATED",
    targetTable: "announcements",
    targetRecordId: announcementId,
    details: `Created announcement "${title}" (${category}) for ${targetAudience} by ${author}.`
  });

  await syncSnapshotWithRelationalTables();

  return sendJson(res, 201, {
    ok: true,
    message: "Announcement saved to MySQL database.",
    announcement: savedAnnouncement
  });
}

/**
 * Handle Faculty / Student Announcement Update (`PUT /api/announcements/:id` or `action=update_announcement`)
 */
async function handleUpdateAnnouncement(req, res, idFromPath = null) {
  const body = await readJsonBody(req);
  const announcementId = String(idFromPath || body.id || body.announcementId || "").trim();

  if (!announcementId) {
    return sendJson(res, 400, { ok: false, message: "Announcement ID is required." });
  }

  // Check if this is a full content/publish update vs. a student toggling `read`
  const isReadOnlyToggle =
    body.read !== undefined &&
    body.title === undefined &&
    body.description === undefined &&
    body.published === undefined &&
    body.category === undefined &&
    body.targetAudience === undefined;

  let actor = null;
  if (!isReadOnlyToggle) {
    actor = await requireBackendRole(
      req,
      res,
      ["faculty", "admin"],
      "Only authorized Faculty or Administrator accounts can edit announcement details or publication status."
    );
    if (!actor) return;
  } else {
    actor = await resolveRequestActor(req);
  }

  const [existingRows] = await mysqlPool.query(
    "SELECT * FROM `announcements` WHERE `announcement_id` = ? LIMIT 1",
    [announcementId]
  );

  if (!existingRows || existingRows.length === 0) {
    return sendJson(res, 404, {
      ok: false,
      message: `Announcement ${announcementId} not found in MySQL database.`
    });
  }

  const existing = existingRows[0];

  const title =
    body.title !== undefined ? String(body.title).trim() : String(existing.title || "").trim();
  const category =
    body.category !== undefined
      ? String(body.category).trim()
      : String(existing.category || "Academic").trim();
  const publishDate =
    body.date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(String(body.date).trim())
      ? String(body.date).trim()
      : existing.publish_date instanceof Date
      ? formatLocalDate(existing.publish_date)
      : String(existing.publish_date || formatLocalDate()).slice(0, 10);
  const author =
    body.author !== undefined ? String(body.author).trim() : String(existing.author || "").trim();
  const facultyId =
    body.facultyId !== undefined
      ? String(body.facultyId).trim()
      : String(existing.faculty_id || "FAC-BU-04").trim();
  const targetAudience =
    body.targetAudience !== undefined
      ? String(body.targetAudience).trim()
      : String(existing.target_audience || "All BSIT Students").trim();
  const description =
    body.description !== undefined
      ? String(body.description).trim()
      : String(existing.description || "").trim();
  const isPublished =
    body.published !== undefined ? (body.published ? 1 : 0) : Number(existing.is_published ?? 1);
  const isRead =
    body.read !== undefined ? (body.read ? 1 : 0) : Number(existing.is_read ?? 0);

  if (!title || title.length > 220) {
    return sendJson(res, 400, { ok: false, message: "Announcement title is required (max 220 characters)." });
  }
  if (!author || author.length > 150) {
    return sendJson(res, 400, { ok: false, message: "Announcement author is required." });
  }
  if (!description || description.length < 10 || description.length > 5000) {
    return sendJson(res, 400, {
      ok: false,
      message: "Announcement description must be between 10 and 5,000 characters."
    });
  }

  const [updateResult] = await mysqlPool.query(
    `UPDATE \`announcements\`
     SET \`title\` = ?,
         \`category\` = ?,
         \`publish_date\` = ?,
         \`author\` = ?,
         \`faculty_id\` = ?,
         \`target_audience\` = ?,
         \`description\` = ?,
         \`is_published\` = ?,
         \`is_read\` = ?
     WHERE \`announcement_id\` = ?`,
    [
      title,
      category,
      publishDate,
      author,
      facultyId,
      targetAudience,
      description,
      isPublished,
      isRead,
      announcementId
    ]
  );

  if (!updateResult || updateResult.affectedRows < 1) {
    return sendJson(res, 500, {
      ok: false,
      message: "Database did not confirm announcement update."
    });
  }

  const [savedRows] = await mysqlPool.query(
    `SELECT
      announcement_id AS id,
      announcement_id AS announcementId,
      title,
      category,
      DATE_FORMAT(publish_date, '%Y-%m-%d') AS date,
      author,
      COALESCE(faculty_id, 'FAC-BU-04') AS facultyId,
      COALESCE(target_audience, 'All BSIT Students') AS targetAudience,
      description,
      is_published AS published,
      is_read AS \`read\`,
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
     FROM \`announcements\`
     WHERE \`announcement_id\` = ?
     LIMIT 1`,
    [announcementId]
  );

  const updatedAnnouncement = savedRows[0]
    ? {
        ...savedRows[0],
        published: Boolean(savedRows[0].published),
        read: Boolean(savedRows[0].read)
      }
    : null;

  if (!isReadOnlyToggle) {
    await recordAuditLog({
      actorRole: actor?.role || "faculty",
      actorName: actor?.actorName || author,
      actorId: actor?.actorId || facultyId,
      actionType: "ANNOUNCEMENT_UPDATED",
      targetTable: "announcements",
      targetRecordId: announcementId,
      details: `Updated announcement "${title}" (${announcementId}) — status: ${isPublished ? "Published" : "Draft"}.`
    });
  }

  await syncSnapshotWithRelationalTables();

  return sendJson(res, 200, {
    ok: true,
    message: "Announcement updated in MySQL database.",
    announcement: updatedAnnouncement
  });
}

/**
 * Handle Faculty Announcement Deletion (`DELETE /api/announcements/:id` or `action=delete_announcement`)
 */
async function handleDeleteAnnouncement(req, res, idFromPath = null) {
  const actor = await requireBackendRole(
    req,
    res,
    ["faculty", "admin"],
    "Only authorized Faculty or Administrator accounts can delete announcements."
  );
  if (!actor) return;

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (_) {}

  const announcementId = String(idFromPath || body.id || body.announcementId || "").trim();
  if (!announcementId) {
    return sendJson(res, 400, { ok: false, message: "Announcement ID is required." });
  }

  const [existingRows] = await mysqlPool.query(
    "SELECT title, author FROM `announcements` WHERE `announcement_id` = ? LIMIT 1",
    [announcementId]
  );

  const [delResult] = await mysqlPool.query(
    "DELETE FROM `announcements` WHERE `announcement_id` = ?",
    [announcementId]
  );

  if (!delResult || delResult.affectedRows < 1) {
    return sendJson(res, 404, {
      ok: false,
      message: `Announcement ${announcementId} was not found in the MySQL database.`
    });
  }

  await recordAuditLog({
    actorRole: actor.role || "faculty",
    actorName: actor.actorName || "Authorized Faculty",
    actorId: actor.actorId || "FAC-BU-04",
    actionType: "ANNOUNCEMENT_DELETED",
    targetTable: "announcements",
    targetRecordId: announcementId,
    details: `Deleted announcement "${existingRows?.[0]?.title || announcementId}" from MySQL.`
  });

  await syncSnapshotWithRelationalTables();

  return sendJson(res, 200, {
    ok: true,
    deletedId: announcementId,
    message: `Announcement ${announcementId} deleted from MySQL database.`
  });
}

/**
 * Synchronize relational tables during general state save (`POST /api/portal?action=save`)
 * without ever deleting public applications or faculty announcements.
 */
async function syncRelationalTablesOnSave(state) {
  if (!state || typeof state !== "object") return;

  // 1. Sync applications (insert/update without deleting existing records)
  const allIncomingApps = [
    ...(Array.isArray(state.demoApplicantRecords)
      ? state.demoApplicantRecords.map((a) => ({ ...a, _isDemo: 1 }))
      : []),
    ...(Array.isArray(state.applications)
      ? state.applications.map((a) => ({ ...a, _isDemo: a.isDemoRecord ? 1 : 0 }))
      : [])
  ];

  for (const app of allIncomingApps) {
    if (!app || !app.referenceNumber) continue;
    const normStatus = normalizeApplicationStatus(app.status);
    const yr = normalizeYearLevel(app.yearLevel, "Year 1");
    const appIdStr = String(app.id || "").trim() || null;

    await mysqlPool.query(
      `INSERT INTO \`applications\` (
        \`id\`, \`reference_number\`, \`username\`, \`full_name\`, \`date_of_birth\`,
        \`email\`, \`contact_number\`, \`address\`, \`applicant_type\`, \`year_level\`,
        \`desired_program\`, \`second_choice_program\`, \`previous_school\`,
        \`educational_background\`, \`graduation_year\`, \`submitted_date\`,
        \`status\`, \`is_demo_record\`, \`remarks\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`status\` = VALUES(\`status\`),
        \`remarks\` = VALUES(\`remarks\`)`,
      [
        appIdStr,
        app.referenceNumber,
        app.username || null,
        app.fullName || "",
        app.dateOfBirth || "2007-01-01",
        app.email || "",
        app.contactNumber || "",
        app.address || "",
        app.applicantType || "Senior High School Graduate / Freshman",
        yr,
        app.desiredProgram || "",
        app.secondChoiceProgram || "None",
        app.previousSchool || "",
        app.educationalBackground || "",
        String(app.graduationYear || "2026"),
        app.submittedDate || formatLocalDate(),
        normStatus,
        app._isDemo ? 1 : 0,
        app.remarks || "Submitted via BANTUG UNIVERSITY Online Application Form."
      ]
    );
  }

  // 2. Sync announcements (insert/update without deleting existing DB announcements)
  if (Array.isArray(state.announcements)) {
    for (const ann of state.announcements) {
      const annId = String(ann?.id || ann?.announcementId || "").trim();
      if (!annId || !ann?.title) continue;
      const pubDate =
        ann.date && /^\d{4}-\d{2}-\d{2}$/.test(String(ann.date).trim())
          ? String(ann.date).trim()
          : formatLocalDate();
      await mysqlPool.query(
        `INSERT INTO \`announcements\` (
          \`announcement_id\`, \`title\`, \`category\`, \`publish_date\`,
          \`author\`, \`faculty_id\`, \`target_audience\`, \`description\`,
          \`is_published\`, \`is_read\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`title\` = VALUES(\`title\`),
          \`category\` = VALUES(\`category\`),
          \`publish_date\` = VALUES(\`publish_date\`),
          \`author\` = VALUES(\`author\`),
          \`faculty_id\` = VALUES(\`faculty_id\`),
          \`target_audience\` = VALUES(\`target_audience\`),
          \`description\` = VALUES(\`description\`),
          \`is_published\` = VALUES(\`is_published\`),
          \`is_read\` = VALUES(\`is_read\`)`,
        [
          annId,
          String(ann.title).trim(),
          String(ann.category || "Academic").trim(),
          pubDate,
          String(ann.author || "BANTUG UNIVERSITY Faculty").trim(),
          String(ann.facultyId || "FAC-BU-04").trim(),
          String(ann.targetAudience || "All BSIT Students").trim(),
          String(ann.description || "").trim(),
          ann.published !== false ? 1 : 0,
          ann.read ? 1 : 0
        ]
      );
    }
  }
}

// ============================================================================
// PHASE 8: ADMIN PANEL REST HANDLERS
// ============================================================================

/**
 * Handle Admin Dashboard Statistics (`GET /api/admin/stats`)
 */
async function handleAdminGetStats(req, res) {
  const actor = await requireBackendRole(req, res, ["admin"], "view administrative dashboard statistics");
  if (!actor) return;

  const [userCounts] = await mysqlPool.query(`
    SELECT
      COUNT(*) AS totalUsers,
      SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) AS totalStudents,
      SUM(CASE WHEN role = 'faculty' THEN 1 ELSE 0 END) AS totalFaculty,
      SUM(CASE WHEN role = 'applicant' THEN 1 ELSE 0 END) AS totalApplicants,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS totalAdmins,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS totalActive,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS totalInactive
    FROM users
  `);

  const [appCounts] = await mysqlPool.query(`
    SELECT
      COUNT(*) AS totalApplications,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingApplications,
      SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approvedApplications,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejectedApplications,
      SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END) AS underReviewApplications
    FROM applications
    WHERE is_demo_record = 0
  `);

  const [logCounts] = await mysqlPool.query(`
    SELECT COUNT(*) AS totalLogs FROM audit_logs
  `);

  const recentLogs = await fetchRecentAuditLogs(10);

  return sendJson(res, 200, {
    ok: true,
    stats: {
      totalUsers: Number(userCounts[0]?.totalUsers || 0),
      totalStudents: Number(userCounts[0]?.totalStudents || 0),
      totalFaculty: Number(userCounts[0]?.totalFaculty || 0),
      totalApplicants: Number(userCounts[0]?.totalApplicants || 0),
      totalAdmins: Number(userCounts[0]?.totalAdmins || 0),
      totalActive: Number(userCounts[0]?.totalActive || 0),
      totalInactive: Number(userCounts[0]?.totalInactive || 0),
      totalApplications: Number(appCounts[0]?.totalApplications || 0),
      pendingApplications: Number(appCounts[0]?.pendingApplications || 0),
      approvedApplications: Number(appCounts[0]?.approvedApplications || 0),
      rejectedApplications: Number(appCounts[0]?.rejectedApplications || 0),
      underReviewApplications: Number(appCounts[0]?.underReviewApplications || 0),
      totalLogs: Number(logCounts[0]?.totalLogs || 0)
    },
    recentLogs
  });
}

/**
 * Handle Admin User Listing (`GET /api/admin/users`)
 */
async function handleAdminGetUsers(req, res, parsedUrl) {
  const actor = await requireBackendRole(req, res, ["admin"], "view system user accounts");
  if (!actor) return;

  const search = String(parsedUrl.searchParams.get("search") || "").trim().toLowerCase();
  const role = String(parsedUrl.searchParams.get("role") || "").trim().toLowerCase();
  const status = String(parsedUrl.searchParams.get("status") || "").trim().toLowerCase();
  const limit = Math.min(250, Math.max(1, Number(parsedUrl.searchParams.get("limit") || 50)));
  const page = Math.max(1, Number(parsedUrl.searchParams.get("page") || 1));
  const offset = (page - 1) * limit;

  let query = `
    SELECT
      u.user_id AS userId,
      u.username,
      u.email,
      u.role,
      u.reference_id AS referenceId,
      u.full_name AS fullName,
      COALESCE(u.department, f.department, s.course, '') AS department,
      COALESCE(u.section, s.section, f.advisory_section, '') AS section,
      s.course AS course,
      s.year_level AS yearLevel,
      COALESCE(s.contact_number, f.contact_number, '') AS contactNumber,
      f.designation AS designation,
      f.office_location AS officeLocation,
      f.advisory_section AS advisorySection,
      s.enrollment_status AS accountStatus,
      u.is_active AS isActive,
      u.is_demo_account AS isDemoAccount,
      COALESCE(u.must_change_password, 0) AS mustChangePassword,
      DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
    FROM users u
    LEFT JOIN faculty f ON u.username = f.username OR u.reference_id = f.faculty_id
    LEFT JOIN students s ON u.username = s.username OR u.reference_id = s.student_number
    WHERE 1=1
  `;
  const params = [];

  if (role && role !== "all") {
    query += " AND u.role = ?";
    params.push(role);
  }
  if (status && status !== "all") {
    if (status === "active") {
      query += " AND u.is_active = 1";
    } else if (status === "inactive") {
      query += " AND u.is_active = 0";
    }
  }
  if (search) {
    query += " AND (LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.full_name) LIKE ? OR LOWER(u.reference_id) LIKE ?)";
    const wildcard = `%${search}%`;
    params.push(wildcard, wildcard, wildcard, wildcard);
  }

  const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS filtered_users`;
  const [totalRows] = await mysqlPool.query(countQuery, params);
  const total = Number(totalRows[0]?.total || 0);

  query += " ORDER BY u.user_id DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await mysqlPool.query(query, params);

  const users = rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    email: r.email,
    role: r.role,
    referenceId: r.referenceId,
    fullName: r.fullName,
    department: r.department,
    section: r.section,
    course: r.course || r.department || "",
    yearLevel: r.yearLevel || "",
    contactNumber: r.contactNumber || "",
    designation: r.designation || "",
    officeLocation: r.officeLocation || "",
    advisorySection: r.advisorySection || r.section || "",
    accountStatus: r.accountStatus || (r.isActive ? "Active" : "Inactive"),
    isActive: Boolean(r.isActive),
    isDemoAccount: Boolean(r.isDemoAccount),
    mustChangePassword: Boolean(r.mustChangePassword),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }));

  return sendJson(res, 200, {
    ok: true,
    total,
    page,
    limit,
    users
  });
}

/**
 * Handle Admin User Creation (`POST /api/admin/users`)
 */
async function handleAdminCreateUser(req, res) {
  const actor = await requireBackendRole(req, res, ["admin"], "create new user accounts");
  if (!actor) return;

  const body = await readJsonBody(req);
  const role = String(body.role || "").trim().toLowerCase();
  const username = String(body.username || "").trim().toLowerCase();
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.fullName || body.full_name || "").trim();
  const department = String(body.department || "").trim();
  const section = String(body.section || "").trim();
  const yearLevel = String(body.yearLevel || "Year 1").trim();

  if (!["student", "faculty", "applicant"].includes(role)) {
    return sendJson(res, 400, {
      ok: false,
      message: "Invalid account role. Standard users must be created as student, faculty, or applicant."
    });
  }

  if (!username || username.length < 3) {
    return sendJson(res, 400, {
      ok: false,
      message: "Username is required and must be at least 3 characters."
    });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendJson(res, 400, {
      ok: false,
      message: "A valid email address is required."
    });
  }

  if (!fullName) {
    return sendJson(res, 400, {
      ok: false,
      message: "Full name is required."
    });
  }

  // Check unique username & email in `users`
  const [existingUser] = await mysqlPool.query(
    "SELECT user_id, username, email FROM `users` WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1",
    [username, email]
  );
  if (existingUser && existingUser.length > 0) {
    const isUserTaken = existingUser[0].username.toLowerCase() === username;
    return sendJson(res, 409, {
      ok: false,
      message: isUserTaken
        ? `Username "${username}" is already in use.`
        : `Email "${email}" is already registered to another account.`
    });
  }

  // Generate temporary password
  const tempPassword =
    body.password && String(body.password).trim().length >= 6
      ? String(body.password).trim()
      : `Temp${crypto.randomBytes(4).toString("hex")}!2026`;

  const salt = crypto.randomBytes(8).toString("hex");
  const derived = crypto.pbkdf2Sync(tempPassword, salt, 10000, 32, "sha256").toString("base64");
  const passwordHash = `$pbkdf2-sha256$10000$${salt}$${derived}`;

  // Determine reference ID
  let referenceId = String(body.referenceId || "").trim();
  if (!referenceId) {
    if (role === "student") {
      const year = new Date().getFullYear();
      const [cnt] = await mysqlPool.query("SELECT COUNT(*) AS c FROM `students`");
      const seq = Number(cnt[0]?.c || 0) + 1;
      referenceId = `${year}-${String(seq).padStart(5, "0")}`;
    } else if (role === "faculty") {
      const [cnt] = await mysqlPool.query("SELECT COUNT(*) AS c FROM `faculty`");
      const seq = Number(cnt[0]?.c || 0) + 1;
      referenceId = `FAC-BU-${String(seq).padStart(2, "0")}`;
    } else {
      referenceId = `APP-${username}`;
    }
  }

  const [insertRes] = await mysqlPool.query(
    `INSERT INTO \`users\` (
      \`username\`, \`email\`, \`password_hash\`, \`role\`, \`reference_id\`, \`full_name\`,
      \`department\`, \`section\`, \`is_active\`, \`must_change_password\`, \`is_demo_account\`
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0)`,
    [
      username,
      email,
      passwordHash,
      role,
      referenceId,
      fullName,
      department || null,
      section || null
    ]
  );

  const newUserId = insertRes.insertId;

  // Insert linked student/faculty record
  if (role === "student") {
    await mysqlPool.query(
      `INSERT INTO \`students\` (
        \`student_number\`, \`username\`, \`full_name\`, \`email\`, \`course\`, \`year_level\`, \`section\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE \`full_name\` = VALUES(\`full_name\`)`,
      [
        referenceId,
        username,
        fullName,
        email,
        department || "Bachelor of Science in Information Technology",
        yearLevel || "Year 1",
        section || "BSIT 1-1"
      ]
    );
  } else if (role === "faculty") {
    await mysqlPool.query(
      `INSERT INTO \`faculty\` (
        \`faculty_id\`, \`username\`, \`full_name\`, \`email\`, \`department\`, \`employment_status\`
      ) VALUES (?, ?, ?, ?, ?, 'Full-Time')
      ON DUPLICATE KEY UPDATE \`full_name\` = VALUES(\`full_name\`)`,
      [
        referenceId,
        username,
        fullName,
        email,
        department || "Information Technology Department"
      ]
    );
  }

  await recordAuditLog({
    actorId: actor.actorId || "ADMIN-001",
    actorName: actor.actorName || "Administrator",
    actorRole: "admin",
    actionType: "USER_CREATED",
    targetType: "user",
    targetId: String(newUserId),
    details: `Administrator ${actor.actorName} created ${role} account "${username}" (${fullName}, Ref: ${referenceId}).`
  });

  return sendJson(res, 201, {
    ok: true,
    message: `User account "${username}" created successfully.`,
    user: {
      userId: newUserId,
      username,
      email,
      role,
      referenceId,
      fullName,
      department,
      section,
      isActive: true,
      mustChangePassword: true
    },
    temporaryPassword: tempPassword
  });
}

/**
 * Handle Admin Single User Retrieval (`GET /api/admin/users/:id`)
 */
async function handleAdminGetUser(req, res, targetId) {
  const actor = await requireBackendRole(req, res, ["admin"], "view user details");
  if (!actor) return;

  const [rows] = await mysqlPool.query(
    `SELECT
      u.user_id AS userId,
      u.username,
      u.email,
      u.role,
      u.reference_id AS referenceId,
      u.full_name AS fullName,
      COALESCE(u.department, f.department, s.course, '') AS department,
      COALESCE(u.section, s.section, f.advisory_section, '') AS section,
      s.course AS course,
      s.year_level AS yearLevel,
      COALESCE(s.contact_number, f.contact_number, '') AS contactNumber,
      f.designation AS designation,
      f.office_location AS officeLocation,
      f.advisory_section AS advisorySection,
      s.enrollment_status AS accountStatus,
      u.is_active AS isActive,
      u.is_demo_account AS isDemoAccount,
      COALESCE(u.must_change_password, 0) AS mustChangePassword,
      DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
     FROM users u
     LEFT JOIN faculty f ON u.username = f.username OR u.reference_id = f.faculty_id
     LEFT JOIN students s ON u.username = s.username OR u.reference_id = s.student_number
     WHERE u.user_id = ? OR u.username = ? OR u.reference_id = ?
     LIMIT 1`,
    [targetId, targetId, targetId]
  );

  if (!rows || rows.length === 0) {
    return sendJson(res, 404, { ok: false, message: `User "${targetId}" was not found.` });
  }

  const u = rows[0];
  return sendJson(res, 200, {
    ok: true,
    user: {
      userId: u.userId,
      username: u.username,
      email: u.email,
      role: u.role,
      referenceId: u.referenceId,
      fullName: u.fullName,
      department: u.department,
      section: u.section,
      course: u.course || u.department || "",
      yearLevel: u.yearLevel || "",
      contactNumber: u.contactNumber || "",
      designation: u.designation || "",
      officeLocation: u.officeLocation || "",
      advisorySection: u.advisorySection || u.section || "",
      accountStatus: u.accountStatus || (u.isActive ? "Active" : "Inactive"),
      isActive: Boolean(u.isActive),
      isDemoAccount: Boolean(u.isDemoAccount),
      mustChangePassword: Boolean(u.mustChangePassword),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }
  });
}

/**
 * Handle Admin Update User Details (`PUT /api/admin/users/:id`)
 */
async function handleAdminUpdateUser(req, res, targetId) {
  const actor = await requireBackendRole(req, res, ["admin"], "update user details");
  if (!actor) return;

  const body = await readJsonBody(req);
  const [rows] = await mysqlPool.query(
    "SELECT user_id, username, email, role, reference_id, full_name FROM users WHERE user_id = ? OR username = ? OR reference_id = ? LIMIT 1",
    [targetId, targetId, targetId]
  );
  if (!rows || rows.length === 0) {
    return sendJson(res, 404, { ok: false, message: `User "${targetId}" not found.` });
  }

  const user = rows[0];
  const fullName = String(body.fullName || body.full_name || user.full_name).trim();
  const email = String(body.email || user.email).trim().toLowerCase();
  const department = body.department !== undefined ? String(body.department).trim() : null;
  const section = body.section !== undefined ? String(body.section).trim() : null;
  const course = body.course !== undefined ? String(body.course).trim() : (department || null);
  const yearLevel = body.yearLevel !== undefined ? String(body.yearLevel).trim() : (body.year_level !== undefined ? String(body.year_level).trim() : null);
  const contactNumber = body.contactNumber !== undefined ? String(body.contactNumber).trim() : (body.contact_number !== undefined ? String(body.contact_number).trim() : null);
  const accountStatus = body.accountStatus !== undefined ? String(body.accountStatus).trim() : (body.status !== undefined ? String(body.status).trim() : null);

  if (email && email !== user.email) {
    const [existing] = await mysqlPool.query(
      "SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) AND user_id != ? LIMIT 1",
      [email, user.user_id]
    );
    if (existing && existing.length > 0) {
      return sendJson(res, 409, { ok: false, message: `Email "${email}" is already used by another account.` });
    }
  }

  await mysqlPool.query(
    "UPDATE `users` SET `full_name` = ?, `email` = ?, `department` = COALESCE(?, `department`), `section` = COALESCE(?, `section`) WHERE `user_id` = ?",
    [fullName, email, department, section, user.user_id]
  );

  if (user.role === "student") {
    await mysqlPool.query(
      "UPDATE `students` SET `full_name` = ?, `email` = ?, `section` = COALESCE(?, `section`), `course` = COALESCE(?, `course`), `year_level` = COALESCE(?, `year_level`), `contact_number` = COALESCE(?, `contact_number`), `enrollment_status` = COALESCE(?, `enrollment_status`) WHERE `username` = ? OR `student_number` = ?",
      [fullName, email, section, course, yearLevel, contactNumber, accountStatus, user.username, user.reference_id]
    );

    // Synchronize snapshot if in portal_state_store
    try {
      const [psRows] = await mysqlPool.query("SELECT state_json FROM `portal_state_store` WHERE `id` = 1 LIMIT 1");
      if (psRows && psRows[0] && psRows[0].state_json) {
        const stateObj = JSON.parse(psRows[0].state_json);
        if (stateObj && stateObj.profile && (stateObj.profile.studentNumber === user.reference_id || stateObj.profile.studentNumber === user.username)) {
          stateObj.profile.fullName = fullName;
          stateObj.profile.email = email;
          if (section) stateObj.profile.section = section;
          if (course) stateObj.profile.course = course;
          if (yearLevel) stateObj.profile.yearLevel = yearLevel;
          if (contactNumber) stateObj.profile.contactNumber = contactNumber;
          if (accountStatus) {
            stateObj.profile.enrollmentStatus = accountStatus;
            stateObj.profile.accountStatus = accountStatus;
          }
          await mysqlPool.query("UPDATE `portal_state_store` SET `state_json` = ?, `updated_at` = NOW() WHERE `id` = 1", [JSON.stringify(stateObj)]);
        }
      }
    } catch (_) {}
  } else if (user.role === "faculty") {
    const designation = body.designation !== undefined ? String(body.designation).trim() : null;
    const officeLocation = body.officeLocation !== undefined ? String(body.officeLocation).trim() : null;
    const advisorySection = body.advisorySection !== undefined ? String(body.advisorySection).trim() : (section || null);
    const birthDate = body.birthDate !== undefined ? String(body.birthDate).trim() : null;
    const homeAddress = body.homeAddress !== undefined ? String(body.homeAddress).trim() : null;

    await mysqlPool.query(
      "UPDATE `faculty` SET `full_name` = ?, `email` = ?, `department` = COALESCE(?, `department`), `contact_number` = COALESCE(?, `contact_number`), `designation` = COALESCE(?, `designation`), `office_location` = COALESCE(?, `office_location`), `advisory_section` = COALESCE(?, `advisory_section`), `birth_date` = COALESCE(?, `birth_date`), `home_address` = COALESCE(?, `home_address`) WHERE `username` = ? OR `faculty_id` = ?",
      [fullName, email, department, contactNumber, designation, officeLocation, advisorySection, birthDate, homeAddress, user.username, user.reference_id]
    );

    // Synchronize snapshot if in portal_state_store
    try {
      const [psRows] = await mysqlPool.query("SELECT state_json FROM `portal_state_store` WHERE `id` = 1 LIMIT 1");
      if (psRows && psRows[0] && psRows[0].state_json) {
        const stateObj = JSON.parse(psRows[0].state_json);
        if (stateObj && stateObj.facultyProfile && (stateObj.facultyProfile.facultyId === user.reference_id || stateObj.facultyProfile.username === user.username)) {
          stateObj.facultyProfile.fullName = fullName;
          stateObj.facultyProfile.email = email;
          if (department) stateObj.facultyProfile.department = department;
          if (contactNumber) stateObj.facultyProfile.contactNumber = contactNumber;
          if (designation) stateObj.facultyProfile.designation = designation;
          if (officeLocation) stateObj.facultyProfile.officeLocation = officeLocation;
          if (advisorySection) stateObj.facultyProfile.advisorySection = advisorySection;
          if (birthDate) stateObj.facultyProfile.birthDate = birthDate;
          if (homeAddress) stateObj.facultyProfile.homeAddress = homeAddress;
          await mysqlPool.query("UPDATE `portal_state_store` SET `state_json` = ?, `updated_at` = NOW() WHERE `id` = 1", [JSON.stringify(stateObj)]);
        }
      }
    } catch (_) {}
  }

  await recordAuditLog({
    actorId: actor.actorId || "ADMIN-001",
    actorName: actor.actorName || "Administrator",
    actorRole: "admin",
    actionType: "USER_UPDATED",
    targetType: "user",
    targetId: String(user.user_id),
    details: `Administrator ${actor.actorName} updated details for user "${user.username}" (${fullName}, ${email}).`
  });

  return sendJson(res, 200, {
    ok: true,
    message: `User account "${user.username}" updated successfully.`,
    user: {
      userId: user.user_id,
      username: user.username,
      email,
      fullName,
      role: user.role,
      referenceId: user.reference_id,
      department,
      section,
      course,
      yearLevel,
      contactNumber,
      designation: body.designation || undefined,
      officeLocation: body.officeLocation || undefined,
      advisorySection: body.advisorySection || section || undefined,
      accountStatus
    }
  });
}

/**
 * Handle Admin Update User Status (`PUT /api/admin/users/:id/status`)
 */
async function handleAdminUpdateUserStatus(req, res, targetId) {
  const actor = await requireBackendRole(req, res, ["admin"], "change user account status");
  if (!actor) return;

  const body = await readJsonBody(req);
  const [rows] = await mysqlPool.query(
    "SELECT user_id, username, email, role, is_active FROM users WHERE user_id = ? OR username = ? OR reference_id = ? LIMIT 1",
    [targetId, targetId, targetId]
  );
  if (!rows || rows.length === 0) {
    return sendJson(res, 404, { ok: false, message: `User "${targetId}" not found.` });
  }

  const user = rows[0];
  if (user.role === "admin" && user.username === actor.username && body.isActive === false) {
    return sendJson(res, 400, { ok: false, message: "Administrators cannot deactivate their own active account." });
  }

  const newActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : body.status === "active" ? 1 : 0;

  await mysqlPool.query("UPDATE `users` SET `is_active` = ? WHERE `user_id` = ?", [newActive, user.user_id]);

  if (newActive === 0) {
    await mysqlPool.query("UPDATE `user_sessions` SET `is_revoked` = 1 WHERE `username` = ?", [user.username]);
    for (const [tok, sess] of activeSessions.entries()) {
      if (sess.username === user.username) {
        sess.isRevoked = true;
        activeSessions.delete(tok);
      }
    }
  }

  await recordAuditLog({
    actorId: actor.actorId || "ADMIN-001",
    actorName: actor.actorName || "Administrator",
    actorRole: "admin",
    actionType: newActive === 1 ? "ACCOUNT_ACTIVATED" : "ACCOUNT_DEACTIVATED",
    targetType: "user",
    targetId: String(user.user_id),
    details: `Administrator ${actor.actorName} ${newActive === 1 ? "activated" : "deactivated"} account for "${user.username}" (${user.role}).`
  });

  return sendJson(res, 200, {
    ok: true,
    message: `Account "${user.username}" has been ${newActive === 1 ? "activated" : "deactivated"}.`,
    isActive: Boolean(newActive)
  });
}

/**
 * Handle Admin Reset Password (`POST /api/admin/users/:id/reset-password`)
 */
async function handleAdminResetPassword(req, res, targetId) {
  const actor = await requireBackendRole(req, res, ["admin"], "reset user password");
  if (!actor) return;

  const [rows] = await mysqlPool.query(
    "SELECT user_id, username, email, role FROM users WHERE user_id = ? OR username = ? OR reference_id = ? LIMIT 1",
    [targetId, targetId, targetId]
  );
  if (!rows || rows.length === 0) {
    return sendJson(res, 404, { ok: false, message: `User "${targetId}" not found.` });
  }

  const user = rows[0];
  const tempPassword = `Temp${crypto.randomBytes(4).toString("hex")}!2026`;
  const salt = crypto.randomBytes(8).toString("hex");
  const derived = crypto.pbkdf2Sync(tempPassword, salt, 10000, 32, "sha256").toString("base64");
  const newHash = `$pbkdf2-sha256$10000$${salt}$${derived}`;

  await mysqlPool.query(
    "UPDATE `users` SET `password_hash` = ?, `must_change_password` = 1 WHERE `user_id` = ?",
    [newHash, user.user_id]
  );

  await mysqlPool.query("UPDATE `user_sessions` SET `is_revoked` = 1 WHERE `username` = ?", [user.username]);
  for (const [tok, sess] of activeSessions.entries()) {
    if (sess.username === user.username) {
      sess.isRevoked = true;
      activeSessions.delete(tok);
    }
  }

  await recordAuditLog({
    actorId: actor.actorId || "ADMIN-001",
    actorName: actor.actorName || "Administrator",
    actorRole: "admin",
    actionType: "PASSWORD_RESET_INITIATED",
    targetType: "user",
    targetId: String(user.user_id),
    details: `Administrator ${actor.actorName} reset password for "${user.username}" (${user.role}). Must change password on next login.`
  });

  return sendJson(res, 200, {
    ok: true,
    message: `Password reset successfully for "${user.username}".`,
    temporaryPassword: tempPassword
  });
}

/**
 * Handle Admin Delete / Deactivate User (`DELETE /api/admin/users/:id`)
 */
async function handleAdminDeleteUser(req, res, targetId) {
  const actor = await requireBackendRole(req, res, ["admin"], "delete user account");
  if (!actor) return;

  const [rows] = await mysqlPool.query(
    "SELECT user_id, username, email, role, reference_id FROM users WHERE user_id = ? OR username = ? OR reference_id = ? LIMIT 1",
    [targetId, targetId, targetId]
  );
  if (!rows || rows.length === 0) {
    return sendJson(res, 404, { ok: false, message: `User "${targetId}" not found.` });
  }

  const user = rows[0];
  if (user.role === "admin" && user.username === actor.username) {
    return sendJson(res, 400, { ok: false, message: "Administrators cannot delete their own account." });
  }

  let hasLinkedData = false;
  try {
    const [appRows] = await mysqlPool.query("SELECT COUNT(*) AS cnt FROM applications WHERE username = ? OR reference_number = ?", [user.username, user.reference_id]);
    if (Number(appRows[0]?.cnt || 0) > 0) hasLinkedData = true;
  } catch (_) {}
  try {
    const [gradeRows] = await mysqlPool.query("SELECT COUNT(*) AS cnt FROM student_grades WHERE student_id = ? OR student_number = ?", [user.reference_id, user.reference_id]);
    if (Number(gradeRows[0]?.cnt || 0) > 0) hasLinkedData = true;
  } catch (_) {}

  if (hasLinkedData) {
    await mysqlPool.query("UPDATE `users` SET `is_active` = 0 WHERE `user_id` = ?", [user.user_id]);
    await mysqlPool.query("UPDATE `user_sessions` SET `is_revoked` = 1 WHERE `username` = ?", [user.username]);
    await recordAuditLog({
      actorId: actor.actorId || "ADMIN-001",
      actorName: actor.actorName || "Administrator",
      actorRole: "admin",
      actionType: "ACCOUNT_DEACTIVATED",
      targetType: "user",
      targetId: String(user.user_id),
      details: `User "${user.username}" has linked records; safely deactivated account instead of permanent deletion.`
    });
    return sendJson(res, 200, {
      ok: true,
      softDeleted: true,
      message: `Account "${user.username}" has linked academic records and was safely deactivated instead of permanently deleted.`
    });
  }

  await mysqlPool.query("DELETE FROM `users` WHERE `user_id` = ?", [user.user_id]);
  await recordAuditLog({
    actorId: actor.actorId || "ADMIN-001",
    actorName: actor.actorName || "Administrator",
    actorRole: "admin",
    actionType: "USER_DELETED",
    targetType: "user",
    targetId: String(user.user_id),
    details: `Administrator ${actor.actorName} deleted user "${user.username}" (${user.role}).`
  });

  return sendJson(res, 200, {
    ok: true,
    message: `User account "${user.username}" has been removed.`
  });
}

/**
 * Handle Admin Application Listing (`GET /api/admin/applications`)
 */
async function handleAdminGetApplications(req, res, parsedUrl) {
  const actor = await requireBackendRole(req, res, ["admin"], "view application records");
  if (!actor) return;

  const search = String(parsedUrl.searchParams.get("search") || "").trim().toLowerCase();
  const status = String(parsedUrl.searchParams.get("status") || "").trim();
  const limit = Math.min(250, Math.max(1, Number(parsedUrl.searchParams.get("limit") || 50)));
  const page = Math.max(1, Number(parsedUrl.searchParams.get("page") || 1));
  const offset = (page - 1) * limit;

  let query = `
    SELECT
      application_id AS applicationId,
      reference_number AS referenceNumber,
      username,
      full_name AS fullName,
      DATE_FORMAT(date_of_birth, '%m/%d/%Y') AS dateOfBirthFormatted,
      email,
      COALESCE(email_verified, 0) AS emailVerified,
      contact_number AS contactNumber,
      address,
      applicant_type AS applicantType,
      year_level AS yearLevel,
      desired_program AS desiredProgram,
      second_choice_program AS secondChoiceProgram,
      previous_school AS previousSchool,
      educational_background AS educationalBackground,
      CAST(graduation_year AS CHAR) AS graduationYear,
      DATE_FORMAT(submitted_date, '%Y-%m-%d') AS submittedDate,
      status,
      COALESCE(approval_email_sent, 0) AS approvalEmailSent,
      DATE_FORMAT(approval_email_sent_at, '%Y-%m-%d %H:%i:%s') AS approvalEmailSentAt,
      approved_program AS approvedProgram,
      remarks,
      updated_by AS updatedBy,
      DATE_FORMAT(status_updated_at, '%Y-%m-%d %H:%i:%s') AS statusUpdatedAt,
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
    FROM applications
    WHERE is_demo_record = 0
  `;
  const params = [];

  if (status && status !== "all") {
    query += " AND status = ?";
    params.push(status);
  }
  if (search) {
    query += " AND (LOWER(reference_number) LIKE ? OR LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(desired_program) LIKE ?)";
    const wildcard = `%${search}%`;
    params.push(wildcard, wildcard, wildcard, wildcard);
  }

  const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS filtered_apps`;
  const [totalRows] = await mysqlPool.query(countQuery, params);
  const total = Number(totalRows[0]?.total || 0);

  query += " ORDER BY application_id DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await mysqlPool.query(query, params);
  const applications = rows.map((r) => ({
    ...r,
    emailVerified: Boolean(r.emailVerified),
    approvalEmailSent: Boolean(r.approvalEmailSent)
  }));

  return sendJson(res, 200, {
    ok: true,
    total,
    page,
    limit,
    applications
  });
}

/**
 * Handle Admin Audit Logs Listing (`GET /api/admin/logs`)
 */
async function handleAdminGetLogs(req, res, parsedUrl) {
  const actor = await requireBackendRole(req, res, ["admin"], "view system audit logs");
  if (!actor) return;

  const search = String(parsedUrl.searchParams.get("search") || "").trim().toLowerCase();
  const actionType = String(parsedUrl.searchParams.get("actionType") || "").trim();
  const limit = Math.min(500, Math.max(1, Number(parsedUrl.searchParams.get("limit") || 100)));

  let query = `
    SELECT
      log_id AS logId,
      actor_id AS actorId,
      actor_name AS actorName,
      actor_role AS actorRole,
      action_type AS actionType,
      target_type AS targetType,
      target_id AS targetId,
      details,
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
    FROM audit_logs
    WHERE 1=1
  `;
  const params = [];

  if (actionType && actionType !== "all") {
    query += " AND action_type = ?";
    params.push(actionType);
  }
  if (search) {
    query += " AND (LOWER(actor_name) LIKE ? OR LOWER(details) LIKE ? OR LOWER(action_type) LIKE ? OR LOWER(actor_role) LIKE ?)";
    const wildcard = `%${search}%`;
    params.push(wildcard, wildcard, wildcard, wildcard);
  }

  query += " ORDER BY log_id DESC LIMIT ?";
  params.push(limit);

  const [rows] = await mysqlPool.query(query, params);

  return sendJson(res, 200, {
    ok: true,
    count: rows.length,
    logs: rows
  });
}

async function handleApiRequest(req, res, parsedUrl) {
  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  const pathname = decodeURIComponent(parsedUrl.pathname);

  try {
    // ------------------------------------------------------------------------
    // Dedicated REST Endpoints: /api/auth/login, /api/auth/logout, /api/auth/session
    // ------------------------------------------------------------------------
    if (pathname === "/api/auth/login" && req.method === "POST") {
      return await handleAuthLogin(req, res);
    }
    if (pathname === "/api/auth/logout" && req.method === "POST") {
      return await handleAuthLogout(req, res);
    }
    if (pathname === "/api/auth/change-password" && req.method === "POST") {
      return await handleAuthChangePassword(req, res);
    }
    if (pathname === "/api/auth/forgot-password" && req.method === "POST") {
      return await handleAuthForgotPassword(req, res);
    }
    if (pathname === "/api/auth/reset-password" && req.method === "POST") {
      return await handleAuthResetPassword(req, res);
    }
    if (pathname === "/api/otp/request" && req.method === "POST") {
      return await handleOtpRequest(req, res);
    }
    if (pathname === "/api/otp/verify" && req.method === "POST") {
      return await handleOtpVerify(req, res);
    }
    if ((pathname === "/api/auth/session" || pathname === "/api/auth/me") && req.method === "GET") {
      const authHeader = String(req.headers["authorization"] || "").trim();
      const token = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : String(req.headers["x-portal-token"] || "").trim();

      if (!token || !activeSessions.has(token)) {
        let isSessionValid = false;
        let validSession = null;
        if (token) {
          try {
            const [rows] = await mysqlPool.query(
              "SELECT * FROM `user_sessions` WHERE `session_token` = ? AND `is_revoked` = 0 AND `expires_at` > NOW() LIMIT 1",
              [token]
            );
            if (rows && rows.length > 0) {
              isSessionValid = true;
              validSession = rows[0];
            }
          } catch (_) {}
        }
        if (!isSessionValid) {
          return sendJson(res, 401, {
            ok: false,
            authenticated: false,
            message: "Authentication token is missing, invalid, or has been revoked."
          });
        }
        let mustChange = false;
        try {
          const [uRows] = await mysqlPool.query(
            "SELECT must_change_password FROM `users` WHERE `username` = ? LIMIT 1",
            [validSession.username]
          );
          if (uRows && uRows[0]) {
            mustChange = Boolean(uRows[0].must_change_password);
          }
        } catch (_) {}

        return sendJson(res, 200, {
          ok: true,
          authenticated: true,
          role: validSession.role,
          actorName: validSession.actor_name,
          actorId: validSession.actor_id,
          username: validSession.username,
          mustChangePassword: mustChange
        });
      }

      const sess = activeSessions.get(token);
      if (sess.isRevoked || new Date(sess.expiresAt) <= new Date()) {
        activeSessions.delete(token);
        return sendJson(res, 401, {
          ok: false,
          authenticated: false,
          message: "Session has been revoked or expired."
        });
      }

      let mustChange = Boolean(sess.mustChangePassword);
      try {
        const [uRows] = await mysqlPool.query(
          "SELECT must_change_password FROM `users` WHERE `username` = ? LIMIT 1",
          [sess.username]
        );
        if (uRows && uRows[0]) {
          mustChange = Boolean(uRows[0].must_change_password);
          sess.mustChangePassword = mustChange;
        }
      } catch (_) {}

      return sendJson(res, 200, {
        ok: true,
        authenticated: true,
        role: sess.role || null,
        actorName: sess.actorName || sess.displayName || null,
        actorId: sess.actorId || null,
        username: sess.username || null,
        mustChangePassword: mustChange
      });
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoint: /api/account/preferences & /api/auth/account-preferences & /api/auth/profile
    // ------------------------------------------------------------------------
    if (
      (pathname === "/api/account/preferences" ||
       pathname === "/api/auth/account-preferences" ||
       pathname === "/api/auth/profile" ||
       pathname === "/api/faculty/profile" ||
       pathname === "/api/student/profile") &&
      (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")
    ) {
      return await handleAccountPreferences(req, res);
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoints: Faculty Profile (/api/faculty/profile)
    // ------------------------------------------------------------------------
    if (pathname === "/api/faculty/profile" || pathname === "/api/faculty/academic-data") {
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        const actor = await resolveRequestActor(req);
        if (actor && actor.role === "faculty") {
          return sendJson(res, 403, {
            ok: false,
            message: "Access denied: Personal and contact information can only be updated by the university administrator."
          });
        }
      }

      const actor = await requireBackendRole(req, res, ["faculty", "admin"], "access faculty profile records");
      if (!actor) return;

      const queryFacultyId = (parsedUrl.searchParams.get("facultyId") || "").trim();
      let targetId = actor.facultyId || actor.actorId || actor.username;

      if (actor.role === "faculty") {
        if (queryFacultyId && queryFacultyId !== targetId && queryFacultyId !== actor.username && queryFacultyId !== actor.actorId) {
          return sendJson(res, 403, {
            ok: false,
            message: "Access Denied: You cannot view another faculty member's private profile."
          });
        }
      } else if (queryFacultyId) {
        targetId = queryFacultyId;
      }

      const [fRows] = await mysqlPool.query(
        "SELECT faculty_id, username, full_name, department, designation, email, contact_number, office_location, advisory_section, assigned_subjects, birth_date, home_address FROM `faculty` WHERE faculty_id = ? OR username = ? LIMIT 1",
        [targetId, targetId]
      );
      if (!fRows || fRows.length === 0) {
        return sendJson(res, 404, { ok: false, message: "Faculty record not found." });
      }
      const f = fRows[0];
      const [uRows] = await mysqlPool.query("SELECT is_active FROM `users` WHERE username = ? OR reference_id = ? LIMIT 1", [f.username, f.faculty_id]);
      const isActive = uRows && uRows[0] ? Boolean(uRows[0].is_active) : true;

      const [schedRows] = await mysqlPool.query(
        "SELECT schedule_id AS scheduleId, subject_code AS subjectCode, course_code AS courseCode, subject_name AS subjectName, section, day_of_week AS dayOfWeek, start_time AS startTime, end_time AS endTime, time_label AS timeLabel, room, class_type AS classType, academic_term AS academicTerm FROM `subject_schedules` WHERE faculty_id = ? OR LOWER(instructor_name) LIKE LOWER(?) ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), start_time ASC",
        [f.faculty_id, `%${f.full_name}%`]
      );

      return sendJson(res, 200, {
        ok: true,
        profile: {
          facultyId: f.faculty_id,
          username: f.username,
          fullName: f.full_name,
          department: f.department,
          designation: f.designation || "Instructor",
          email: f.email,
          contactNumber: f.contact_number,
          officeLocation: f.office_location,
          advisorySection: f.advisory_section,
          assignedSubjects: f.assigned_subjects,
          assignedClasses: schedRows || [],
          birthDate: f.birth_date ? String(f.birth_date).slice(0, 10) : null,
          homeAddress: f.home_address,
          accountStatus: isActive ? "Active" : "Inactive"
        }
      });
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoint: /api/audit-logs
    // ------------------------------------------------------------------------
    if (pathname === "/api/audit-logs" && req.method === "GET") {
      const actor = await requireBackendRole(
        req,
        res,
        ["faculty", "admin"],
        "Only authorized Faculty or Administrator accounts can view the system audit trail."
      );
      if (!actor) return;
      const limit = Number(parsedUrl.searchParams.get("limit") || 100);
      const auditLogs = await fetchRecentAuditLogs(limit);
      return sendJson(res, 200, { ok: true, count: auditLogs.length, auditLogs });
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoints: Admin Panel (/api/admin/*)
    // ------------------------------------------------------------------------
    if (pathname === "/api/admin/stats" && req.method === "GET") {
      return await handleAdminGetStats(req, res);
    }

    if (pathname === "/api/admin/users") {
      if (req.method === "GET") {
        return await handleAdminGetUsers(req, res, parsedUrl);
      }
      if (req.method === "POST") {
        return await handleAdminCreateUser(req, res);
      }
    }

    const adminUserResetMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
    if (adminUserResetMatch && req.method === "POST") {
      return await handleAdminResetPassword(req, res, decodeURIComponent(adminUserResetMatch[1]));
    }

    const adminUserStatusMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (adminUserStatusMatch && (req.method === "PUT" || req.method === "PATCH" || req.method === "POST")) {
      return await handleAdminUpdateUserStatus(req, res, decodeURIComponent(adminUserStatusMatch[1]));
    }

    const adminUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (adminUserMatch) {
      const targetUserId = decodeURIComponent(adminUserMatch[1]);
      if (req.method === "GET") {
        return await handleAdminGetUser(req, res, targetUserId);
      }
      if (req.method === "PUT" || req.method === "PATCH") {
        return await handleAdminUpdateUser(req, res, targetUserId);
      }
      if (req.method === "DELETE") {
        return await handleAdminDeleteUser(req, res, targetUserId);
      }
    }

    if (pathname === "/api/admin/applications" && req.method === "GET") {
      return await handleAdminGetApplications(req, res, parsedUrl);
    }

    const adminAppStatusMatch = pathname.match(/^\/api\/admin\/applications\/([^/]+)\/status$/);
    if (adminAppStatusMatch && (req.method === "PUT" || req.method === "PATCH" || req.method === "POST")) {
      return await handleUpdateApplicationStatus(req, res, decodeURIComponent(adminAppStatusMatch[1]));
    }

    if (pathname === "/api/admin/logs" && req.method === "GET") {
      return await handleAdminGetLogs(req, res, parsedUrl);
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoints: Student Academic Data (/api/student/*)
    // ------------------------------------------------------------------------
    if (pathname === "/api/student/academic-data" || pathname === "/api/student/profile") {
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        const actor = await resolveRequestActor(req);
        if (actor && actor.role === "student") {
          return sendJson(res, 403, {
            ok: false,
            message: "Access denied: Personal and academic information can only be updated by the university administrator."
          });
        }
      }

      const actor = await requireBackendRole(req, res, ["student", "admin"], "access student academic records");
      if (!actor) return;

      const queryStudentNum = (parsedUrl.searchParams.get("studentNumber") || "").trim();
      let targetStudentNum = actor.studentNumber || actor.actorId;

      if (actor.role === "student") {
        if (queryStudentNum && queryStudentNum !== targetStudentNum && queryStudentNum !== actor.username) {
          return sendJson(res, 403, {
            ok: false,
            message: "Access Denied: You cannot view another student's academic records."
          });
        }
      } else if (queryStudentNum) {
        targetStudentNum = queryStudentNum;
      }

      const [stRows] = await mysqlPool.query(
        "SELECT * FROM `students` WHERE student_number = ? OR username = ? LIMIT 1",
        [targetStudentNum, targetStudentNum]
      );
      if (!stRows || stRows.length === 0) {
        return sendJson(res, 404, { ok: false, message: "Student record not found." });
      }
      const st = stRows[0];

      // Enrolled subjects from student_enrollments
      const [enrolled] = await mysqlPool.query(
        `SELECT s.subject_code AS subjectCode, s.course_code AS courseCode,
                s.subject_name AS subjectName, s.full_subject_name AS fullSubjectName,
                s.units, s.instructor_name AS instructor, s.schedule_summary AS scheduleSummary,
                s.description, s.course, s.year_level AS yearLevel,
                COALESCE(s.section, ?) AS section
         FROM \`student_enrollments\` se
         JOIN \`subjects\` s ON se.subject_code = s.subject_code
         WHERE se.student_number = ?`,
        [st.section, st.student_number]
      );

      const [schedRows] = await mysqlPool.query(
        `SELECT schedule_id AS scheduleId, subject_code AS subjectCode, day_of_week AS day,
                TIME_FORMAT(start_time, '%H:%i') AS startTime,
                TIME_FORMAT(end_time, '%H:%i') AS endTime,
                time_label AS timeLabel, room, section
         FROM \`subject_schedules\`
         WHERE section = ?`,
        [st.section]
      );

      enrolled.forEach((sub) => {
        sub.id = `subj_${String(sub.subjectCode || "").toLowerCase()}`;
        sub.sessions = schedRows
          .filter((r) => r.subjectCode === sub.subjectCode)
          .map((r) => ({
            day: r.day,
            startTime: r.startTime,
            endTime: r.endTime,
            timeLabel: r.timeLabel,
            room: r.room
          }));
      });

      // Grades
      const [grades] = await mysqlPool.query(
        "SELECT * FROM `student_grades` WHERE student_number = ?",
        [st.student_number]
      );

      // Attendance
      const [attendance] = await mysqlPool.query(
        "SELECT * FROM `attendance_records` WHERE student_number = ? ORDER BY attendance_date DESC",
        [st.student_number]
      );

      // Tasks
      const [tasks] = await mysqlPool.query(
        `SELECT t.task_id AS id, t.title, t.subject_code AS subjectCode,
                t.subject_label AS subject, t.instructor_name AS instructor,
                DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline,
                t.priority, t.status, t.description
         FROM \`tasks\` t
         WHERE t.subject_code IN (SELECT subject_code FROM student_enrollments WHERE student_number = ?)
            OR t.description LIKE ?`,
        [st.student_number, `%${st.section}%`]
      );

      return sendJson(res, 200, {
        ok: true,
        profile: {
          studentNumber: st.student_number,
          fullName: st.full_name,
          course: st.course,
          yearLevel: st.year_level,
          section: st.section,
          email: st.email,
          contactNumber: st.contact_number,
          address: st.address,
          academicTerm: st.academic_term || "2nd Sem, AY 2026–2027",
          guardianName: st.guardian_name,
          guardianContact: st.guardian_contact,
          enrollmentStatus: st.enrollment_status,
          gwa: st.gwa
        },
        enrolledSubjects: enrolled,
        grades,
        attendance,
        tasks
      });
    }

    if (pathname === "/api/student/notifications") {
      const actor = await requireBackendRole(req, res, ["student"], "view student notifications");
      if (!actor) return;

      const [stRows] = await mysqlPool.query(
        "SELECT section, email FROM `students` WHERE username = ? OR student_number = ? LIMIT 1",
        [actor.username, actor.actorId]
      );
      const studentSection = stRows[0]?.section || "";
      const studentEmail = stRows[0]?.email || actor.email || "";

      const dbAnns = await fetchAllAnnouncementsFromMySQL();
      const filteredAnns = dbAnns.filter((a) => {
        const aud = String(a.targetAudience || "").toLowerCase();
        if (aud.includes("applicant")) return false;
        if (aud.includes("all students") || aud.includes("all bsit students")) return true;
        if (studentSection && aud.includes(studentSection.toLowerCase())) return true;
        return true;
      });

      const [directNotifs] = await mysqlPool.query(
        "SELECT notification_id AS id, subject AS title, notification_type AS category, message_body AS description, DATE_FORMAT(created_at, '%Y-%m-%d') AS date, is_read AS `read` FROM `notification_logs` WHERE recipient_email = ? ORDER BY created_at DESC",
        [studentEmail]
      );

      const allNotifs = [...filteredAnns, ...directNotifs];
      return sendJson(res, 200, {
        ok: true,
        notifications: allNotifs,
        unreadCount: allNotifs.filter((n) => !n.read).length
      });
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoints: Applicant Admission Data (/api/applicant/*)
    // ------------------------------------------------------------------------
    if (pathname === "/api/applicant/application") {
      const actor = await resolveRequestActor(req);
      if (actor.role === "student") {
        return sendJson(res, 403, {
          ok: false,
          message: "Access Denied: Student accounts are not permitted to view applicant records."
        });
      }
      if (actor.role !== "applicant" && actor.role !== "admin" && actor.role !== "faculty") {
        return sendJson(res, 401, {
          ok: false,
          authenticated: false,
          message: "Authentication required to view applicant records."
        });
      }

      const allApps = await fetchAllApplicationsFromMySQL();
      const myApps = allApps.filter((a) => {
        if (actor.referenceNumber && a.referenceNumber === actor.referenceNumber) return true;
        if (actor.email && a.email && a.email.toLowerCase() === actor.email.toLowerCase()) return true;
        if (actor.username && a.username === actor.username) return true;
        if (actor.actorId && a.id === actor.actorId) return true;
        return false;
      });

      return sendJson(res, 200, {
        ok: true,
        application: myApps[0] || null
      });
    }

    if (pathname === "/api/applicant/notifications" || pathname === "/api/notifications") {
      const actor = await resolveRequestActor(req);
      if (actor.role === "student") {
        if (pathname === "/api/applicant/notifications") {
          return sendJson(res, 403, {
            ok: false,
            message: "Access Denied: Students are not permitted to view applicant admission notifications."
          });
        }
        // General notifications for student
        const [stRows] = await mysqlPool.query(
          "SELECT section, email FROM `students` WHERE username = ? OR student_number = ? LIMIT 1",
          [actor.username, actor.actorId]
        );
        const studentSection = stRows[0]?.section || "";
        const studentEmail = stRows[0]?.email || actor.email || "";

        const dbAnns = await fetchAllAnnouncementsFromMySQL();
        const filteredAnns = dbAnns.filter((a) => {
          const aud = String(a.targetAudience || "").toLowerCase();
          if (aud.includes("applicant")) return false;
          if (aud.includes("all students") || aud.includes("all bsit students")) return true;
          if (studentSection && aud.includes(studentSection.toLowerCase())) return true;
          return true;
        });

        const [directNotifs] = await mysqlPool.query(
          "SELECT notification_id AS id, subject AS title, notification_type AS category, message_body AS description, DATE_FORMAT(created_at, '%Y-%m-%d') AS date, is_read AS `read` FROM `notification_logs` WHERE recipient_email = ? ORDER BY created_at DESC",
          [studentEmail]
        );

        const allNotifs = [...filteredAnns, ...directNotifs];
        return sendJson(res, 200, {
          ok: true,
          notifications: allNotifs,
          unreadCount: allNotifs.filter((n) => !n.read).length
        });
      }

      if (actor.role === "applicant") {
        const [appNotifs] = await mysqlPool.query(
          `SELECT notification_id AS id, subject AS title, notification_type AS category,
                  message_body AS description, DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
                  is_read AS \`read\`, reference_id AS referenceId
           FROM \`notification_logs\`
           WHERE recipient_email = ? OR reference_id = ? OR recipient_email = ?
           ORDER BY created_at DESC`,
          [actor.email || "", actor.referenceNumber || actor.actorId || "", actor.username || ""]
        );
        return sendJson(res, 200, {
          ok: true,
          notifications: appNotifs,
          unreadCount: appNotifs.filter((n) => !n.read).length
        });
      }

      if (actor.role === "faculty" || actor.role === "admin") {
        const dbAnns = await fetchAllAnnouncementsFromMySQL();
        return sendJson(res, 200, {
          ok: true,
          notifications: dbAnns,
          unreadCount: dbAnns.filter((n) => !n.read).length
        });
      }

      return sendJson(res, 200, { ok: true, notifications: [], unreadCount: 0 });
    }

    const notifReadMatch = pathname.match(/^\/api\/(?:applicant\/)?notifications\/([^/]+)\/read$/);
    if (notifReadMatch && req.method === "POST") {
      const targetNotifId = decodeURIComponent(notifReadMatch[1]);
      const actor = await resolveRequestActor(req);
      if (!actor || actor.role === "guest") {
        return sendJson(res, 401, { ok: false, message: "Authentication required to update notifications." });
      }

      const [rows] = await mysqlPool.query("SELECT * FROM `notification_logs` WHERE notification_id = ? LIMIT 1", [targetNotifId]);
      if (!rows || rows.length === 0) {
        return sendJson(res, 404, { ok: false, message: "Notification record not found." });
      }

      const notif = rows[0];
      if (actor.role === "applicant") {
        const isOwner =
          (actor.email && notif.recipient_email && actor.email.toLowerCase() === notif.recipient_email.toLowerCase()) ||
          (actor.referenceNumber && notif.reference_id === actor.referenceNumber) ||
          (actor.actorId && notif.reference_id === actor.actorId);
        if (!isOwner) {
          return sendJson(res, 403, { ok: false, message: "Access Denied: You cannot modify another applicant's notifications." });
        }
      }

      await mysqlPool.query("UPDATE `notification_logs` SET is_read = 1 WHERE notification_id = ?", [targetNotifId]);
      return sendJson(res, 200, { ok: true, message: "Notification marked as read." });
    }

    if (pathname === "/api/notifications/mark-all-read" && req.method === "POST") {
      const actor = await resolveRequestActor(req);
      if (!actor || actor.role === "guest") {
        return sendJson(res, 401, { ok: false, message: "Authentication required." });
      }

      if (actor.role === "applicant") {
        await mysqlPool.query(
          "UPDATE `notification_logs` SET is_read = 1 WHERE recipient_email = ? OR reference_id = ?",
          [actor.email || actor.username, actor.referenceNumber || actor.actorId]
        );
      } else if (actor.role === "student") {
        await mysqlPool.query(
          "UPDATE `notification_logs` SET is_read = 1 WHERE recipient_email = ?",
          [actor.email || ""]
        );
      }
      return sendJson(res, 200, { ok: true, message: "All notifications marked as read." });
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoints: /api/applications
    // ------------------------------------------------------------------------
    if (pathname === "/api/applications") {
      if (req.method === "GET") {
        const actor = await resolveRequestActor(req);
        if (actor.role === "student") {
          return sendJson(res, 403, {
            ok: false,
            message: "Access denied: Student accounts are not permitted to view private applicant records."
          });
        }
        const allApps = await fetchAllApplicationsFromMySQL();
        const refQuery = (parsedUrl.searchParams.get("referenceNumber") || "").trim().toUpperCase();
        if (actor.role === "applicant") {
          const filtered = allApps.filter((a) => {
            if (a.isDemoRecord) return false;
            if (refQuery) return String(a.referenceNumber || "").toUpperCase() === refQuery;
            if (actor.username && a.username === actor.username) return true;
            if (actor.actorId && a.id === actor.actorId) return true;
            if (actor.email && a.email && a.email.toLowerCase() === actor.email.toLowerCase()) return true;
            if (actor.identifier && a.email && a.email.toLowerCase() === actor.identifier.toLowerCase()) return true;
            return false;
          });
          return sendJson(res, 200, { ok: true, applications: filtered });
        }
        return sendJson(res, 200, { ok: true, applications: allApps });
      }
      if (req.method === "POST") {
        return await handleSubmitApplication(req, res);
      }
    }

    const appStatusMatch = pathname.match(/^\/api\/applications\/([^/]+)\/status$/);
    if (appStatusMatch && (req.method === "PUT" || req.method === "PATCH" || req.method === "POST")) {
      return await handleUpdateApplicationStatus(req, res, decodeURIComponent(appStatusMatch[1]));
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoints: /api/announcements
    // ------------------------------------------------------------------------
    if (pathname === "/api/announcements") {
      if (req.method === "GET") {
        const announcements = await fetchAllAnnouncementsFromMySQL();
        return sendJson(res, 200, { ok: true, announcements });
      }
      if (req.method === "POST") {
        return await handleCreateAnnouncement(req, res);
      }
    }

    const annIdMatch = pathname.match(/^\/api\/announcements\/([^/]+)$/);
    if (annIdMatch) {
      const targetAnnId = decodeURIComponent(annIdMatch[1]);
      if (req.method === "PUT" || req.method === "PATCH") {
        return await handleUpdateAnnouncement(req, res, targetAnnId);
      }
      if (req.method === "DELETE") {
        return await handleDeleteAnnouncement(req, res, targetAnnId);
      }
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoints: /api/subjects (General Subject Catalog)
    // ------------------------------------------------------------------------
    if (pathname === "/api/subjects" || pathname === "/api/subjects/catalog") {
      const actor = await resolveRequestActor(req);
      if (actor.role === "guest") {
        return sendJson(res, 401, { ok: false, message: "Authentication required to access university subject catalog." });
      }

      let catalog = await fetchAllSubjectsFromMySQL();
      const q = (parsedUrl.searchParams.get("q") || "").trim().toLowerCase();
      const code = (parsedUrl.searchParams.get("code") || "").trim().toLowerCase();
      const section = (parsedUrl.searchParams.get("section") || "").trim().toLowerCase();
      const year = (parsedUrl.searchParams.get("yearLevel") || "").trim().toLowerCase();

      if (q) {
        catalog = catalog.filter((s) =>
          (s.subjectCode && s.subjectCode.toLowerCase().includes(q)) ||
          (s.subjectName && s.subjectName.toLowerCase().includes(q)) ||
          (s.courseCode && s.courseCode.toLowerCase().includes(q)) ||
          (s.fullSubjectName && s.fullSubjectName.toLowerCase().includes(q)) ||
          (s.instructor && s.instructor.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.course && s.course.toLowerCase().includes(q))
        );
      }
      if (code) {
        catalog = catalog.filter((s) => s.subjectCode && s.subjectCode.toLowerCase() === code);
      }
      if (section) {
        catalog = catalog.filter((s) => s.section && s.section.toLowerCase() === section);
      }
      if (year) {
        catalog = catalog.filter((s) => s.yearLevel && s.yearLevel.toLowerCase() === year);
      }

      return sendJson(res, 200, { ok: true, count: catalog.length, subjects: catalog });
    }

    // ------------------------------------------------------------------------
    // Dedicated REST Endpoints: /api/schedules
    // ------------------------------------------------------------------------
    if (pathname === "/api/schedules") {
      if (req.method === "GET") {
        let schedules = await fetchAllSchedulesFromMySQL();
        const facultyIdFilter = (parsedUrl.searchParams.get("facultyId") || "").trim().toLowerCase();
        const instructorFilter = (parsedUrl.searchParams.get("instructor") || "").trim().toLowerCase();
        const sectionFilter = (parsedUrl.searchParams.get("section") || "").trim().toLowerCase();
        const yearFilter = (parsedUrl.searchParams.get("yearLevel") || "").trim().toLowerCase();
        const dayFilter = (parsedUrl.searchParams.get("day") || "").trim().toLowerCase();
        const roomFilter = (parsedUrl.searchParams.get("room") || "").trim().toLowerCase();
        const subjectFilter = (parsedUrl.searchParams.get("subjectCode") || "").trim().toLowerCase();

        if (facultyIdFilter) {
          schedules = schedules.filter((s) => String(s.facultyId || "").toLowerCase() === facultyIdFilter);
        }
        if (instructorFilter) {
          schedules = schedules.filter((s) => String(s.instructor || "").toLowerCase() === instructorFilter);
        }
        if (sectionFilter) {
          schedules = schedules.filter((s) => String(s.section || "").toLowerCase() === sectionFilter);
        }
        if (yearFilter) {
          schedules = schedules.filter((s) => String(s.yearLevel || "").toLowerCase() === yearFilter);
        }
        if (dayFilter) {
          schedules = schedules.filter((s) => String(s.day || "").toLowerCase() === dayFilter);
        }
        if (roomFilter) {
          schedules = schedules.filter(
            (s) =>
              String(s.room || "").toLowerCase() === roomFilter ||
              String(s.canonicalRoom || "").toLowerCase() === roomFilter
          );
        }
        if (subjectFilter) {
          schedules = schedules.filter((s) => String(s.subjectCode || "").toLowerCase() === subjectFilter);
        }

        return sendJson(res, 200, { ok: true, count: schedules.length, schedules });
      }
      if (req.method === "POST") {
        return await handleCreateScheduleSession(req, res);
      }
    }

    const schedIdMatch = pathname.match(/^\/api\/schedules\/([^/]+)$/);
    if (schedIdMatch && req.method === "DELETE") {
      return await handleDeleteScheduleSession(req, res, decodeURIComponent(schedIdMatch[1]));
    }

    // ------------------------------------------------------------------------
    // Unified Portal Endpoint: /api/portal (and /api/portal_api.php)
    // ------------------------------------------------------------------------
    const action = (parsedUrl.searchParams.get("action") || "status").trim();

    if (action === "load") {
      const actor = await resolveRequestActor(req);
      const isStudentCaller = actor.role === "student";
      const isApplicantCaller = actor.role === "applicant";
      const isFacultyCaller = actor.role === "faculty" || actor.role === "admin";
      const isGuestCaller = actor.role === "guest";

      const [rows] = await mysqlPool.query(
        "SELECT state_json, schema_version, updated_at FROM `portal_state_store` WHERE `state_key` = 'bantug_university_portal_v2' LIMIT 1"
      );
      const dbApps = await fetchAllApplicationsFromMySQL();
      const dbAnns = await fetchAllAnnouncementsFromMySQL();
      const dbScheds = await fetchAllSchedulesFromMySQL();
      const auditLogs = isFacultyCaller ? await fetchRecentAuditLogs(80) : [];

      let parsedState = {};
      if (rows.length > 0 && rows[0].state_json) {
        try {
          parsedState = JSON.parse(rows[0].state_json) || {};
        } catch (_) {}
      }

      let visibleApps = [];
      let visibleAnns = [];
      let visibleScheds = [];

      if (isApplicantCaller) {
        // Phase 2: Complete isolation for applicant
        const myApps = dbApps.filter((a) => {
          if (a.isDemoRecord) return false;
          if (actor.referenceNumber && a.referenceNumber === actor.referenceNumber) return true;
          if (actor.email && a.email && a.email.toLowerCase() === actor.email.toLowerCase()) return true;
          if (actor.username && a.username === actor.username) return true;
          if (actor.actorId && a.id === actor.actorId) return true;
          return false;
        });

        parsedState.profile = null; // No enrolled-student profile!
        parsedState.tasks = []; // No BSIT 2-2 laboratory activities!
        parsedState.subjects = []; // No student subjects!
        parsedState.grades = {}; // No student grades!
        parsedState.attendance = []; // No student attendance!
        parsedState.schedules = []; // No student class schedules!
        parsedState.auditLogs = [];
        parsedState.applications = myApps;
        parsedState.demoApplicantRecords = [];

        // Applicant admission notifications from notification_logs
        const [appNotifs] = await mysqlPool.query(
          `SELECT notification_id AS id, subject AS title, 'Admission' AS category,
                  DATE_FORMAT(created_at, '%Y-%m-%d') AS date, 'Admissions Committee' AS author,
                  message_body AS description, 1 AS published, is_read AS \`read\`
           FROM \`notification_logs\`
           WHERE recipient_email = ? OR reference_id = ? OR recipient_email = ?
           ORDER BY created_at DESC`,
          [actor.email || "", actor.referenceNumber || actor.actorId || "", actor.username || ""]
        );
        parsedState.announcements = appNotifs;

        visibleApps = myApps;
        visibleAnns = appNotifs;
        visibleScheds = [];
      } else if (isStudentCaller) {
        // Phase 2: Authoritative enrolled student data
        parsedState.applications = [];
        parsedState.demoApplicantRecords = [];
        visibleApps = [];

        const [stRows] = await mysqlPool.query(
          "SELECT * FROM `students` WHERE username = ? OR student_number = ? LIMIT 1",
          [actor.username, actor.actorId]
        );
        const st = stRows[0];
        if (st) {
          parsedState.profile = {
            studentNumber: st.student_number,
            fullName: st.full_name,
            course: st.course,
            yearLevel: st.year_level,
            section: st.section,
            email: st.email,
            contactNumber: st.contact_number,
            address: st.address,
            academicTerm: st.academic_term || "2nd Sem, AY 2026–2027",
            guardianName: st.guardian_name,
            guardianContact: st.guardian_contact,
            enrollmentStatus: st.enrollment_status || "Active",
            accountStatus: st.enrollment_status || "Active",
            gender: st.gender || null,
            birthDate: st.birth_date ? String(st.birth_date).slice(0, 10) : null
          };

          // Enrolled subjects for this specific student
          const [enrolled] = await mysqlPool.query(
            `SELECT s.subject_code AS subjectCode, s.course_code AS courseCode,
                    s.subject_name AS subjectName, s.full_subject_name AS fullSubjectName,
                    s.units, s.instructor_name AS instructor, s.schedule_summary AS scheduleSummary,
                    s.description, s.course, s.year_level AS yearLevel,
                    COALESCE(s.section, ?) AS section
             FROM \`student_enrollments\` se
             JOIN \`subjects\` s ON se.subject_code = s.subject_code
             WHERE se.student_number = ?`,
            [st.section, st.student_number]
          );

          const [schedRows] = await mysqlPool.query(
            `SELECT schedule_id AS scheduleId, subject_code AS subjectCode, day_of_week AS day,
                    TIME_FORMAT(start_time, '%H:%i') AS startTime,
                    TIME_FORMAT(end_time, '%H:%i') AS endTime,
                    time_label AS timeLabel, room, section
             FROM \`subject_schedules\`
             WHERE section = ?`,
            [st.section]
          );

          enrolled.forEach((sub) => {
            sub.id = `subj_${String(sub.subjectCode || "").toLowerCase()}`;
            sub.sessions = schedRows
              .filter((r) => r.subjectCode === sub.subjectCode)
              .map((r) => ({
                day: r.day,
                startTime: r.startTime,
                endTime: r.endTime,
                timeLabel: r.timeLabel,
                room: r.room
              }));
          });

          parsedState.subjects = enrolled;

          // Grades for this specific student
          const [stGrades] = await mysqlPool.query(
            "SELECT * FROM `student_grades` WHERE student_number = ?",
            [st.student_number]
          );
          const gradeMap = {};
          stGrades.forEach((g) => {
            gradeMap[g.subject_code] = {
              quizzes: g.quizzes,
              assignments: g.assignments,
              activities: g.activities,
              projects: g.projects,
              examinations: g.examinations,
              finalAverage: g.final_average,
              remarks: g.remarks
            };
          });
          parsedState.grades = gradeMap;

          // Attendance for this specific student
          const [stAtt] = await mysqlPool.query(
            "SELECT * FROM `attendance_records` WHERE student_number = ? ORDER BY attendance_date DESC",
            [st.student_number]
          );
          parsedState.attendance = stAtt;

          // Tasks for this student's section or subjects
          const [stTasks] = await mysqlPool.query(
            `SELECT t.task_id AS id, t.title, t.subject_code AS subjectCode,
                    t.subject_label AS subject, t.instructor_name AS instructor,
                    DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline,
                    t.priority, t.status, t.description
             FROM \`tasks\` t
             WHERE t.subject_code IN (SELECT subject_code FROM student_enrollments WHERE student_number = ?)
                OR t.description LIKE ?`,
            [st.student_number, `%${st.section}%`]
          );
          parsedState.tasks = stTasks;

          // Announcements filtered for students
          const studentAnns = dbAnns.filter((a) => {
            const aud = String(a.targetAudience || "").toLowerCase();
            if (aud.includes("applicant")) return false;
            if (aud.includes("all students") || aud.includes("all bsit students")) return true;
            if (st.section && aud.includes(st.section.toLowerCase())) return true;
            return true;
          });
          parsedState.announcements = studentAnns;
          visibleAnns = studentAnns;
          visibleScheds = dbScheds.filter((s) => s.section === st.section);
        }
      } else if (isGuestCaller) {
        // Public / Guest Visitor: clean empty state
        parsedState.profile = null;
        parsedState.tasks = [];
        parsedState.subjects = [];
        parsedState.grades = {};
        parsedState.attendance = [];
        parsedState.schedules = [];
        parsedState.applications = [];
        parsedState.demoApplicantRecords = [];
        parsedState.auditLogs = [];
        parsedState.announcements = [];
        visibleApps = [];
        visibleAnns = [];
        visibleScheds = [];
      } else if (actor.role === "faculty") {
        // Phase 5: Authoritative individual faculty profile from MySQL
        const [facRows] = await mysqlPool.query(
          "SELECT faculty_id, username, full_name, department, designation, email, contact_number, office_location, advisory_section, assigned_subjects, birth_date, home_address FROM `faculty` WHERE username = ? OR faculty_id = ? LIMIT 1",
          [actor.username, actor.actorId]
        );
        const [uRows] = await mysqlPool.query(
          "SELECT is_active FROM `users` WHERE username = ? LIMIT 1",
          [actor.username]
        );
        const isActive = uRows && uRows[0] ? Boolean(uRows[0].is_active) : true;
        if (facRows && facRows[0]) {
          const f = facRows[0];
          parsedState.facultyProfile = {
            facultyId: f.faculty_id,
            username: f.username,
            fullName: f.full_name,
            department: f.department,
            designation: f.designation || "Instructor",
            email: f.email,
            contactNumber: f.contact_number,
            officeLocation: f.office_location,
            advisorySection: f.advisory_section,
            assignedSubjects: f.assigned_subjects,
            birthDate: f.birth_date ? String(f.birth_date).slice(0, 10) : null,
            homeAddress: f.home_address,
            accountStatus: isActive ? "Active" : "Inactive"
          };
        }
        parsedState.profile = null;
        parsedState.applications = dbApps.filter((a) => !a.isDemoRecord);
        parsedState.announcements = dbAnns;
        parsedState.auditLogs = [];
        visibleApps = parsedState.applications;
        visibleAnns = dbAnns;
        visibleScheds = dbScheds;
      } else {
        // Admin
        parsedState.applications = dbApps.filter((a) => !a.isDemoRecord);
        const demoApps = dbApps.filter((a) => a.isDemoRecord);
        if (demoApps.length > 0) {
          parsedState.demoApplicantRecords = demoApps;
        }
        parsedState.announcements = dbAnns;
        parsedState.auditLogs = auditLogs;
        visibleApps = dbApps;
        visibleAnns = dbAnns;
        visibleScheds = dbScheds;
      }

      const allCatalog = isGuestCaller ? [] : await fetchAllSubjectsFromMySQL();
      parsedState.catalogSubjects = allCatalog;

      return sendJson(res, 200, {
        ok: true,
        source: "mysql",
        authenticatedRole: actor.role,
        authenticatedUser: actor.username,
        schemaVersion: Number(rows[0]?.schema_version || 10),
        updatedAt: rows[0]?.updated_at || new Date().toISOString(),
        state: parsedState,
        applications: visibleApps,
        announcements: visibleAnns,
        schedules: visibleScheds,
        catalogSubjects: allCatalog,
        auditLogs
      });
    }

    if (action === "get_applications") {
      const actor = await resolveRequestActor(req);
      if (actor.role === "student") {
        return sendJson(res, 403, {
          ok: false,
          message: "Access denied: Student accounts are not permitted to view private applicant records."
        });
      }
      if (actor.role === "guest") {
        return sendJson(res, 401, {
          ok: false,
          authenticated: false,
          message: "Authentication required to view applications."
        });
      }
      const allApps = await fetchAllApplicationsFromMySQL();
      if (actor.role === "applicant") {
        const myApps = allApps.filter((a) => {
          if (a.isDemoRecord) return false;
          if (actor.referenceNumber && a.referenceNumber === actor.referenceNumber) return true;
          if (actor.email && a.email && a.email.toLowerCase() === actor.email.toLowerCase()) return true;
          if (actor.username && a.username === actor.username) return true;
          if (actor.actorId && a.id === actor.actorId) return true;
          return false;
        });
        return sendJson(res, 200, { ok: true, applications: myApps });
      }
      return sendJson(res, 200, { ok: true, applications: allApps });
    }

    if (action === "submit_application" && req.method === "POST") {
      return await handleSubmitApplication(req, res);
    }

    if (action === "update_application_status" && req.method === "POST") {
      return await handleUpdateApplicationStatus(req, res);
    }

    if (action === "request_otp" && req.method === "POST") {
      return await handleOtpRequest(req, res);
    }

    if (action === "verify_otp" && req.method === "POST") {
      return await handleOtpVerify(req, res);
    }

    if (action === "forgot_password" && req.method === "POST") {
      return await handleAuthForgotPassword(req, res);
    }

    if (action === "reset_password" && req.method === "POST") {
      return await handleAuthResetPassword(req, res);
    }

    if (action === "get_announcements") {
      const announcements = await fetchAllAnnouncementsFromMySQL();
      return sendJson(res, 200, { ok: true, announcements });
    }

    if (action === "create_announcement" && req.method === "POST") {
      return await handleCreateAnnouncement(req, res);
    }

    if (action === "update_announcement" && req.method === "POST") {
      return await handleUpdateAnnouncement(req, res);
    }

    if (action === "delete_announcement" && req.method === "POST") {
      return await handleDeleteAnnouncement(req, res);
    }

    if (action === "mark_all_announcements_read" && req.method === "POST") {
      await mysqlPool.query("UPDATE `announcements` SET `is_read` = 1 WHERE `is_published` = 1");
      await syncSnapshotWithRelationalTables();
      const announcements = await fetchAllAnnouncementsFromMySQL();
      return sendJson(res, 200, {
        ok: true,
        announcements,
        message: "All published announcements marked as read in MySQL."
      });
    }

    if (action === "save" && req.method === "POST") {
      const body = await readJsonBody(req);
      if (!body || !body.state || typeof body.state !== "object") {
        return sendJson(res, 400, { ok: false, message: "Invalid state payload." });
      }

      const actor = await resolveRequestActor(req, body);
      if (actor && actor.role === "student") {
        return sendJson(res, 403, {
          ok: false,
          message: "Access denied: Personal and academic information can only be updated by the university administrator."
        });
      }

      const state = body.state;
      const schemaVersion = Number(state.schemaVersion || 10);

      await syncRelationalTablesOnSave(state);

      // Ensure snapshot always contains authoritative MySQL applications & announcements
      const dbApps = await fetchAllApplicationsFromMySQL();
      const dbAnns = await fetchAllAnnouncementsFromMySQL();
      state.applications = dbApps.filter((a) => !a.isDemoRecord);
      const demoApps = dbApps.filter((a) => a.isDemoRecord);
      if (demoApps.length > 0) {
        state.demoApplicantRecords = demoApps;
      }
      state.announcements = dbAnns;

      await mysqlPool.query(
        `INSERT INTO \`portal_state_store\` (\`state_key\`, \`schema_version\`, \`state_json\`)
         VALUES ('bantug_university_portal_v2', ?, ?)
         ON DUPLICATE KEY UPDATE
           \`schema_version\` = VALUES(\`schema_version\`),
           \`state_json\` = VALUES(\`state_json\`)`,
        [schemaVersion, JSON.stringify(state)]
      );

      return sendJson(res, 200, {
        ok: true,
        message: "All inputs saved to MySQL database (bantug_university_db)."
      });
    }

    if (action === "reset" && req.method === "POST") {
      await seedDatabase();
      return sendJson(res, 200, {
        ok: true,
        message: "Database reset and re-seeded with 15 records per category."
      });
    }

    // Default: status check + table row counts
    const counts = {};
    for (const tbl of [
      "users",
      "students",
      "faculty",
      "subjects",
      "subject_schedules",
      "student_enrollments",
      "student_grades",
      "attendance_records",
      "tasks",
      "task_submissions",
      "announcements",
      "learning_resources",
      "applications",
      "user_sessions",
      "audit_logs"
    ]) {
      try {
        const [cRows] = await mysqlPool.query(`SELECT COUNT(*) AS cnt FROM \`${tbl}\``);
        counts[tbl] = Number(cRows[0]?.cnt || 0);
      } catch (_) {
        counts[tbl] = 0;
      }
    }

    return sendJson(res, 200, {
      ok: true,
      database: DB_CONFIG.database,
      tableCounts: counts
    });
  } catch (err) {
    console.error("[BANTUG UNIVERSITY API Error]:", err.message);
    const isClientPayloadError =
      /invalid json/i.test(String(err.message || "")) ||
      /payload exceeds/i.test(String(err.message || ""));
    return sendJson(res, isClientPayloadError ? 400 : 500, {
      ok: false,
      message: isClientPayloadError
        ? err.message
        : "An unexpected server or database error occurred while processing your request. Please try again."
    });
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  if (
    pathname.startsWith("/api/") ||
    pathname.endsWith("/api/portal_api.php")
  ) {
    return handleApiRequest(req, res, parsedUrl);
  }

  let filePath = path.join(ROOT_DIR, pathname === "/" ? "index.html" : pathname);
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end("Not Found");
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

if (require.main === module) {
  seedDatabase()
    .then((seedInfo) => {
      console.log(`[BANTUG UNIVERSITY] Database verified & migrated (${seedInfo.driver}).`);
    })
    .catch((err) => {
      console.warn(`[BANTUG UNIVERSITY] Auto-seed warning: ${err.message}`);
    })
    .finally(() => {
      server.listen(PORT, () => {
        console.log(`BANTUG UNIVERSITY Portal running at http://localhost:${PORT}`);
      });
    });
}

module.exports = { server, mysqlPool };
