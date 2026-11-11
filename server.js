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
        activeSessions.set(token, s);
        return s;
      }
    } catch (_) {}
  }

  const headerRole = String(req.headers["x-portal-role"] || "").trim().toLowerCase();
  const headerUser = String(req.headers["x-portal-user"] || (body && body.updatedBy) || "").trim();
  const headerActorId = String(req.headers["x-portal-actor-id"] || "").trim();

  if (["student", "faculty", "applicant", "admin"].includes(headerRole)) {
    return {
      token: null,
      role: headerRole,
      actorId: headerActorId || null,
      actorName: headerUser || headerRole.toUpperCase(),
      isApplicantDemoAccount: false
    };
  }

  // Default for direct backend scripts when no student/applicant role header is present
  return {
    token: null,
    role: "faculty",
    actorId: headerActorId || "FAC-BU-04",
    actorName: headerUser || "Authorized Faculty",
    isApplicantDemoAccount: false
  };
}

/**
 * Enforce backend role-based access control on protected API endpoints
 */
async function requireBackendRole(req, res, allowedRoles, actionLabel, body = null) {
  const actor = await resolveRequestActor(req, body);
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!actor || !allowed.includes(actor.role)) {
    sendJson(res, 403, {
      ok: false,
      message: `Access Denied: Your ${(actor?.role || "unauthorized").toUpperCase()} account is not permitted to ${actionLabel}.`
    });
    return null;
  }
  return actor;
}

/**
 * Handle User Authentication (`POST /api/auth/login`)
 * Verifies hashed password against MySQL `users` table (or authorized demo launcher),
 * issues a server-side session token in `user_sessions`, and logs `USER_LOGIN` in `audit_logs`.
 */
async function handleAuthLogin(req, res) {
  const body = await readJsonBody(req);
  const rawIdentifier = String(body.identifier || "").trim().toLowerCase();
  const rawPassword = String(body.password || "").trim();
  const requestedRole = String(body.role || "student").trim().toLowerCase();
  const isDemoLaunch = Boolean(body.isDemoLaunch);

  if (!rawIdentifier && !isDemoLaunch) {
    return sendJson(res, 400, {
      ok: false,
      fieldErrors: { identifier: "Please enter your email, username, or ID." },
      message: "Email, username, or ID is required."
    });
  }
  if (!rawPassword && !isDemoLaunch) {
    return sendJson(res, 400, {
      ok: false,
      fieldErrors: { password: "Please enter your password." },
      message: "Password is required."
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
    `SELECT user_id, username, email, password_hash, role, reference_id, display_name, is_demo_account
     FROM \`users\`
     WHERE LOWER(username) = LOWER(?)
        OR LOWER(email) = LOWER(?)
        OR LOWER(reference_id) = LOWER(?)
        OR LOWER(display_name) = LOWER(?)
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
      const [u2] = await mysqlPool.query("SELECT * FROM `users` WHERE username = ? LIMIT 1", [facRows[0].username]);
      matchedUser = (u2 && u2[0]) || {
        username: facRows[0].username,
        email: facRows[0].email,
        password_hash: hashPassword("faculty123"),
        role: "faculty",
        reference_id: facRows[0].faculty_id,
        display_name: facRows[0].full_name,
        is_demo_account: 1
      };
    }
  }

  if (!matchedUser) {
    return sendJson(res, 401, {
      ok: false,
      message: "Invalid credentials. Please check your username/ID and password."
    });
  }

  if (!isDemoLaunch) {
    const incomingHash = hashPassword(rawPassword);
    const storedHash = String(matchedUser.password_hash || "");
    const hashMatches =
      incomingHash.length === storedHash.length &&
      crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(storedHash));

    if (!hashMatches) {
      return sendJson(res, 401, {
        ok: false,
        message: "Invalid credentials. Please check your username/ID and password."
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
        matchedUser.display_name || matchedUser.username,
        isApplicantDemoAccount ? 1 : 0,
        expiresSql
      ]
    );
  } catch (_) {}

  const sessionInfo = {
    token: sessionToken,
    username: matchedUser.username,
    role: matchedUser.role,
    identifier: rawIdentifier || matchedUser.email,
    actorId: matchedUser.reference_id || matchedUser.username,
    actorName: matchedUser.display_name || matchedUser.username,
    email: matchedUser.email,
    isDemo: Boolean(matchedUser.is_demo_account),
    isApplicantDemoAccount,
    isRevoked: false,
    expiresAt: expiresDate.toISOString()
  };

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
 * Generate a unique Application Reference Number (`BU-ADM-YYYY-XXXXX`)
 * verified against the `applications` table in MySQL.
 */
async function generateUniqueReferenceNumber(preferredRef = null) {
  const year = new Date().getFullYear();
  if (preferredRef && /^BU-ADM-\d{4}-\d{4,6}$/.test(String(preferredRef).trim())) {
    const cleanRef = String(preferredRef).trim();
    const [existing] = await mysqlPool.query(
      "SELECT COUNT(*) AS cnt FROM `applications` WHERE `reference_number` = ?",
      [cleanRef]
    );
    if (Number(existing[0]?.cnt || 0) === 0) {
      return cleanRef;
    }
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const rand = Math.floor(10000 + Math.random() * 90000);
    const candidate = `BU-ADM-${year}-${rand}`;
    const [rows] = await mysqlPool.query(
      "SELECT COUNT(*) AS cnt FROM `applications` WHERE `reference_number` = ?",
      [candidate]
    );
    if (Number(rows[0]?.cnt || 0) === 0) {
      return candidate;
    }
  }
  return `BU-ADM-${year}-${Date.now().toString().slice(-5)}`;
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
      email,
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
    isDemoRecord: Boolean(r.isDemoRecord)
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

  const fullName = String(body.fullName || "").trim();
  const dateOfBirth = String(body.dateOfBirth || "").trim();
  const email = String(body.email || "").trim();
  const contactNumber = String(body.contactNumber || "").trim();
  const address = String(body.address || "").trim();
  const desiredProgram = String(body.desiredProgram || "").trim();
  const secondChoiceProgram = String(body.secondChoiceProgram || "None").trim() || "None";
  const yearLevel = String(body.yearLevel || "").trim();
  const applicantType =
    String(body.applicantType || "Senior High School Graduate / Freshman").trim() ||
    "Senior High School Graduate / Freshman";
  const previousSchool = String(body.previousSchool || "").trim();
  const educationalBackground = String(body.educationalBackground || "").trim();
  const graduationYear = String(body.graduationYear || "").trim();
  const submittedDate =
    body.submittedDate && /^\d{4}-\d{2}-\d{2}$/.test(String(body.submittedDate).trim())
      ? String(body.submittedDate).trim()
      : formatLocalDate(new Date());

  // Server-side validation of required fields & character length limits
  const fieldErrors = {};
  if (!fullName || fullName.length < 3 || fullName.length > 150) {
    fieldErrors.fullName = "Applicant full name is required (3 to 150 characters).";
  }
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    fieldErrors.dateOfBirth = "A valid date of birth (YYYY-MM-DD) is required.";
  }
  if (!email || !isValidEmail(email) || email.length > 150) {
    fieldErrors.email = "A valid email address is required (max 150 characters).";
  }
  if (!contactNumber || contactNumber.length < 7 || contactNumber.length > 35) {
    fieldErrors.contactNumber = "A valid contact number is required (7 to 35 characters).";
  }
  if (!address || address.length > 255) {
    fieldErrors.address = "Complete home address is required (max 255 characters).";
  }
  if (!desiredProgram || desiredProgram.length > 160) {
    fieldErrors.desiredProgram = "Desired academic program is required.";
  }
  if (!VALID_YEAR_LEVELS.includes(yearLevel)) {
    fieldErrors.yearLevel = "Year level must be Year 1, Year 2, Year 3, or Year 4.";
  }
  if (!previousSchool || previousSchool.length > 180) {
    fieldErrors.previousSchool = "Previous school attended is required (max 180 characters).";
  }
  if (!educationalBackground || educationalBackground.length > 180) {
    fieldErrors.educationalBackground = "Educational background / strand is required (max 180 characters).";
  }
  const gradYrNum = Number(graduationYear);
  if (!graduationYear || isNaN(gradYrNum) || gradYrNum < 1990 || gradYrNum > 2035) {
    fieldErrors.graduationYear = "A valid graduation year between 1990 and 2035 is required.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return sendJson(res, 400, {
      ok: false,
      message: Object.values(fieldErrors)[0],
      fieldErrors
    });
  }

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
    [fullName, email, desiredProgram, submittedDate]
  );

  if (dupRows.length > 0) {
    return sendJson(res, 409, {
      ok: false,
      duplicate: true,
      existingReferenceNumber: dupRows[0].reference_number,
      message: `Duplicate submission prevented: An application for ${fullName} (${desiredProgram}) was already submitted today under Reference No. ${dupRows[0].reference_number}.`
    });
  }

  const referenceNumber = await generateUniqueReferenceNumber(body.referenceNumber);
  const clientId = String(body.id || "").trim() || `app_${Date.now().toString(36)}`;
  const initialStatus = "Pending";
  const remarks =
    String(body.remarks || "").trim() ||
    "Submitted via Online Applicant Portal — Pending Faculty Evaluation.";

  const [insertResult] = await mysqlPool.query(
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
      fullName,
      dateOfBirth,
      email,
      contactNumber,
      address,
      applicantType,
      yearLevel,
      desiredProgram,
      secondChoiceProgram,
      previousSchool,
      educationalBackground,
      String(graduationYear),
      submittedDate,
      initialStatus,
      remarks
    ]
  );

  if (!insertResult || insertResult.affectedRows < 1) {
    return sendJson(res, 500, {
      ok: false,
      message: "Database did not confirm application insertion."
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
      email,
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
    actorName: fullName,
    actorId: email,
    actionType: "APPLICATION_SUBMITTED",
    targetTable: "applications",
    targetRecordId: referenceNumber,
    details: `Submitted new admission application ${referenceNumber} for ${fullName} (${desiredProgram}, ${yearLevel}). Initial status: Pending.`
  });

  await syncSnapshotWithRelationalTables();

  return sendJson(res, 201, {
    ok: true,
    message: `Application ${referenceNumber} saved to MySQL database.`,
    application: savedApplication
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
      email,
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

  await syncSnapshotWithRelationalTables();

  return sendJson(res, 200, {
    ok: true,
    referenceNumber: refNo,
    status: newStatus,
    updatedBy: updatedApplication?.updatedBy || updatedByName,
    statusUpdatedAt: updatedApplication?.statusUpdatedAt || null,
    application: updatedApplication,
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
    if (pathname === "/api/auth/session" && req.method === "GET") {
      const actor = await resolveRequestActor(req);
      return sendJson(res, 200, {
        ok: true,
        authenticated: actor.authenticated,
        role: actor.role || null,
        actorName: actor.actorName || null,
        actorId: actor.actorId || null
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
          const filtered = allApps.filter(
            (a) => a.isDemoRecord || (refQuery && String(a.referenceNumber || "").toUpperCase() === refQuery)
          );
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
      const isFacultyCaller = actor.role === "faculty" || actor.role === "admin";

      const [rows] = await mysqlPool.query(
        "SELECT state_json, schema_version, updated_at FROM `portal_state_store` WHERE `state_key` = 'bantug_university_portal_v2' LIMIT 1"
      );
      const dbApps = await fetchAllApplicationsFromMySQL();
      const dbAnns = await fetchAllAnnouncementsFromMySQL();
      const dbScheds = await fetchAllSchedulesFromMySQL();
      const auditLogs = isFacultyCaller ? await fetchRecentAuditLogs(80) : [];

      const visibleApps = isStudentCaller
        ? dbApps.filter((a) => a.isDemoRecord)
        : dbApps;

      if (rows.length > 0 && rows[0].state_json) {
        const parsedState = JSON.parse(rows[0].state_json);
        if (parsedState && typeof parsedState === "object") {
          parsedState.applications = isStudentCaller
            ? []
            : dbApps.filter((a) => !a.isDemoRecord);
          const demoApps = dbApps.filter((a) => a.isDemoRecord);
          if (demoApps.length > 0) {
            parsedState.demoApplicantRecords = demoApps;
          }
          parsedState.announcements = dbAnns;
          if (isFacultyCaller) {
            parsedState.auditLogs = auditLogs;
          }
        }
        return sendJson(res, 200, {
          ok: true,
          source: "mysql",
          schemaVersion: Number(rows[0].schema_version || 10),
          updatedAt: rows[0].updated_at,
          state: parsedState,
          applications: visibleApps,
          announcements: dbAnns,
          schedules: dbScheds,
          auditLogs
        });
      }

      return sendJson(res, 200, {
        ok: true,
        source: "mysql_relational",
        state: null,
        applications: visibleApps,
        announcements: dbAnns,
        schedules: dbScheds,
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
      const applications = await fetchAllApplicationsFromMySQL();
      return sendJson(res, 200, { ok: true, applications });
    }

    if (action === "submit_application" && req.method === "POST") {
      return await handleSubmitApplication(req, res);
    }

    if (action === "update_application_status" && req.method === "POST") {
      return await handleUpdateApplicationStatus(req, res);
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
    pathname === "/api/portal" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/audit-logs" ||
    pathname.startsWith("/api/applications") ||
    pathname.startsWith("/api/announcements") ||
    pathname.startsWith("/api/schedules") ||
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
