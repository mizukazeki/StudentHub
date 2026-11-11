/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Faculty Portal Module (faculty.js)
 *
 * Implements:
 * 1. Faculty Dashboard
 * 2. Faculty Profile
 * 3. My Classes & Schedule (BSIT 2-2 Assigned Subject Schedules & Student Roster)
 * 4. Attendance Management (Roll Call, Edit Sessions, & Summary by Subject/Date)
 * 5. Grade Management (Enter/Edit Student Grades & Component Breakdown, Synced)
 * 6. Assignment Management (Create, Publish, Edit, Delete Tasks & View Submissions)
 * 7. Faculty Announcements (Create, Publish/Unpublish, Edit, Delete Notices)
 * ============================================================================
 */

const StudentHubFaculty = (function () {
  const {
    escapeHtml,
    formatReadableDate,
    isValidEmail,
    clearFormErrors,
    setFieldError,
    openModal,
    closeModal,
    confirmDialog,
    showToast,
    requireRole,
    navigateTo,
    refreshAll
  } = window.StudentHubApp;

  let selectedAttendanceSubjectCode = "T148";
  let selectedAttendanceDate = StudentHubStorage.formatLocalDate(new Date());
  let selectedAttendanceRemarks = "";
  let selectedGradeSubjectCode = "T148";
  let rosterYearFilter = "All";
  let facAppSearchQuery = "";
  let facAppStatusFilter = "All";
  let facAppCourseFilter = "All";

  // Faculty Schedule & Master Schedule Management State
  let facSchedScope = "personal"; // "personal" | "master"
  let facPersonalViewMode = "both"; // "both" | "weekly" | "table"
  let facPersonalSearch = "";
  let facPersonalDayFilter = "All";
  let facPersonalRoomFilter = "All";
  let facPersonalSubjectFilter = "All";
  let facPersonalSectionFilter = "All";
  let facPersonalTypeFilter = "All";

  let facMasterSubView = "both"; // "both" | "weekly" | "table" | "rooms" | "historical"
  let facMasterSearch = "";
  let facMasterProfFilter = "All";
  let facMasterSubjectFilter = "All";
  let facMasterSectionFilter = "All";
  let facMasterYearFilter = "All";
  let facMasterDayFilter = "All";
  let facMasterRoomFilter = "All";
  let facMasterTypeFilter = "All";

  /**
   * Return ONLY the subjects assigned to the currently logged-in faculty member.
   * Never combines multiple professors' schedules or displays another professor's classes.
   */
  function getFacultySubjects(state) {
    const instructorName =
      (state.facultyProfile && state.facultyProfile.fullName) || "Somera, Fabian";
    return StudentHubStorage.getFacultyAssignedSubjects(instructorName);
  }

  /**
   * Return subjects available for Grade / Attendance encoding by the logged-in professor
   */
  function getFacultyGradeableSubjectsList(state) {
    const instructorName =
      (state.facultyProfile && state.facultyProfile.fullName) || "Somera, Fabian";
    if (typeof StudentHubStorage.getFacultyGradeableSubjects === "function") {
      return StudentHubStorage.getFacultyGradeableSubjects(instructorName);
    }
    return getFacultySubjects(state);
  }

  function renderClassTypeBadge(classType) {
    const t = String(classType || "Lecture").trim();
    if (t === "Laboratory") {
      return `<span class="badge badge-info" title="Laboratory Session">Laboratory</span>`;
    }
    if (t === "Physical Education") {
      return `<span class="badge badge-success" title="Physical Education Session">Physical Education</span>`;
    }
    return `<span class="badge badge-primary" title="Lecture Session">Lecture</span>`;
  }

  function renderScheduleOriginBadge(isSampleData, isCustomDbSchedule = false) {
    if (isCustomDbSchedule) {
      return `<span class="badge badge-info" title="Custom Schedule Entry Saved in MySQL">MySQL Custom</span>`;
    }
    if (isSampleData) {
      return `<span class="badge badge-warning" title="Sample / Demo University Schedule Data">Sample Data</span>`;
    }
    return `<span class="badge badge-success" title="Official Verified BSIT 2-2 Timetable">Official BSIT 2-2</span>`;
  }

  /**
   * Switch active faculty demo account to a specific professor
   */
  function switchFacultyAccount(instructorName) {
    if (!requireRole("faculty", "switch faculty account")) return;
    const updatedProfile = StudentHubStorage.setActiveFacultyByIdentifier(instructorName);
    const state = StudentHubStorage.getState();
    const gradeable = getFacultyGradeableSubjectsList(state);
    if (gradeable.length > 0) {
      selectedAttendanceSubjectCode = gradeable[0].subjectCode;
      selectedGradeSubjectCode = gradeable[0].subjectCode;
    }
    facPersonalSubjectFilter = "All";
    facPersonalSectionFilter = "All";
    facPersonalRoomFilter = "All";
    refreshAll();
    showToast(`Switched active faculty account to: ${updatedProfile.fullName}`, "info");
  }

  function formatSubjectSessionsHtml(subject) {
    const sessions = subject.sessions || [];
    if (sessions.length === 0) {
      return `<span class="badge badge-neutral">Schedule not yet provided.</span>`;
    }
    return sessions
      .map((sess) => {
        const cType =
          sess.classType ||
          (typeof StudentHubStorage.getClassTypeForSession === "function"
            ? StudentHubStorage.getClassTypeForSession(subject, sess)
            : "Lecture");
        return `<div style="font-size:0.8rem;margin-bottom:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <strong>${escapeHtml(sess.day)}:</strong> ${escapeHtml(sess.timeLabel)}
            <span class="badge badge-neutral">Room: ${escapeHtml(sess.room)}</span>
            ${renderClassTypeBadge(cType)}
          </div>`;
      })
      .join("");
  }

  /**
   * 1. FACULTY DASHBOARD
   */
  function renderDashboard() {
    if (!requireRole("faculty", "access the Faculty Dashboard")) return;
    const container = document.getElementById("facultyDashboardContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const fp = state.facultyProfile;
    const assignedSubjects = getFacultySubjects(state);
    const assignedSessions = StudentHubStorage.getFacultyScheduleSessions(fp.fullName);
    const rosterCount = (state.sectionRoster || []).length;
    const recentAnnouncements = [...(state.announcements || [])]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 3);

    const allApplications =
      typeof StudentHubStorage.getAllApplicationsForFaculty === "function"
        ? StudentHubStorage.getAllApplicationsForFaculty(state)
        : state.demoApplicantRecords || [];

    const appCounts = {
      Pending: allApplications.filter((a) => (a.status === "Submitted" ? "Pending" : a.status) === "Pending").length,
      "Under Review": allApplications.filter((a) => a.status === "Under Review").length,
      Approved: allApplications.filter((a) => a.status === "Approved").length,
      Rejected: allApplications.filter((a) => a.status === "Rejected").length
    };
    const recentApplications = allApplications.slice(0, 5);
    const recentAuditLogs = Array.isArray(state.auditLogs) ? state.auditLogs.slice(0, 6) : [];

    const directory = state.facultyDirectory || [];

    container.innerHTML = `
      <!-- Distinct Faculty Hero Banner -->
      <div class="hero-banner faculty-hero">
        <div class="hero-left">
          <img
            src="assets/images/default-avatar.svg"
            alt="Faculty Avatar"
            class="hero-avatar"
          />
          <div>
            <div class="hero-greeting">BANTUG UNIVERSITY &bull; Faculty Portal</div>
            <h2 class="hero-title">Welcome, Instructor ${escapeHtml(fp.fullName)}</h2>
            <div class="hero-meta">
              <span class="hero-pill">ID: ${escapeHtml(fp.facultyId)}</span>
              <span class="hero-pill">${escapeHtml(fp.department)}</span>
              <span class="hero-pill">Assigned Section: ${escapeHtml(
                fp.advisorySection || "BSIT 2-2"
              )}</span>
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <button type="button" class="btn btn-hero" data-fac-nav="faculty-profile">Faculty Profile</button>
          <button type="button" class="btn btn-primary" data-fac-nav="faculty-classes">My Schedule</button>
        </div>
      </div>

      <!-- Individual Faculty Account Switcher (Strictly 1 Professor at a time) -->
      <div class="toolbar-row">
        <div class="toolbar-group" style="justify-content:space-between;">
          <div>
            <strong>Active Faculty Demo Account:</strong>
            <span style="font-size:0.82rem;color:var(--text-secondary);margin-left:6px;">
              Each faculty account displays <strong>only that professor's own assigned subjects and schedule</strong>:
            </span>
          </div>
          <select id="facultyPerspectiveSelect" class="form-control" style="max-width:360px;" aria-label="Switch Active Faculty Demo Account">
            ${directory
              .map(
                (prof) =>
                  `<option value="${escapeHtml(prof.name)}" ${
                    fp.fullName.toLowerCase() === prof.name.toLowerCase() ? "selected" : ""
                  }>${escapeHtml(prof.name)} (${escapeHtml(prof.facultyId)})</option>`
              )
              .join("")}
          </select>
        </div>
      </div>

      <!-- Faculty Statistics Grid -->
      <div class="stats-grid">
        <div class="stat-card" data-fac-nav="faculty-classes">
          <div class="stat-info">
            <span class="stat-label">My Assigned Subjects</span>
            <span class="stat-value">${assignedSubjects.length}</span>
            <span class="stat-sub">${assignedSessions.length} Weekly Class Sessions</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
        </div>

        <div class="stat-card" data-fac-nav="faculty-applications">
          <div class="stat-info">
            <span class="stat-label">Student Applications</span>
            <span class="stat-value">${allApplications.length}</span>
            <span class="stat-sub">${appCounts["Pending"]} Pending &bull; ${appCounts["Under Review"]} Under Review</span>
          </div>
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <polyline points="17 11 19 13 23 9"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card" data-fac-nav="faculty-tasks">
          <div class="stat-info">
            <span class="stat-label">Published Assignments</span>
            <span class="stat-value">${(state.tasks || []).length}</span>
            <span class="stat-sub">Manage tasks &amp; view submissions</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card" data-fac-nav="faculty-announcements">
          <div class="stat-info">
            <span class="stat-label">Faculty Announcements</span>
            <span class="stat-value">${(state.announcements || []).length}</span>
            <span class="stat-sub">Synced with BSIT Student Portal</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Left: Professor's Own Assigned Subjects & Schedule + Student Applications Overview -->
        <div class="dashboard-col">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <span>My Assigned Class Schedule &mdash; ${escapeHtml(fp.fullName)}</span>
                <span class="badge badge-primary">${assignedSubjects.length} Assigned Subject${
      assignedSubjects.length === 1 ? "" : "s"
    }</span>
              </h3>
              <button type="button" class="btn-text" data-fac-nav="faculty-classes">Full Faculty Schedule &rarr;</button>
            </div>

            ${
              assignedSubjects.length === 0
                ? `
                <div class="empty-state" style="padding:28px 16px;">
                  <h3>No Assigned Class Schedule</h3>
                  <p>Instructor <strong>${escapeHtml(
                    fp.fullName
                  )}</strong> currently has no assigned subjects or class schedule for this semester.</p>
                </div>
              `
                : `
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Subject Code</th>
                        <th>Subject Name</th>
                        <th>Section</th>
                        <th>Day, Time &amp; Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${assignedSubjects
                        .map(
                          (s) => `
                            <tr>
                              <td><strong>${escapeHtml(s.subjectCode)}</strong></td>
                              <td>
                                <div><strong>${escapeHtml(s.courseCode)} &ndash; ${escapeHtml(
                            s.subjectName
                          )}</strong></div>
                                <div style="font-size:0.76rem;color:var(--text-muted);">Instructor: ${escapeHtml(
                                  s.instructor
                                )}</div>
                              </td>
                              <td><span class="badge badge-primary">${escapeHtml(
                                s.section || "BSIT 2-2"
                              )}</span></td>
                              <td>${formatSubjectSessionsHtml(s)}</td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
            }
          </div>

          <!-- Student Application Overview with Status Counts -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <span>Student Application Overview &amp; Status Counts</span>
                <span class="badge badge-primary">${allApplications.length} Total</span>
              </h3>
              <button type="button" class="btn-text" data-fac-nav="faculty-applications">Manage Applications &rarr;</button>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
              <div style="padding:10px 12px;border-radius:8px;background:var(--surface-muted,#f8fafc);border-left:4px solid #f59e0b;">
                <div style="font-size:0.75rem;color:var(--text-secondary);">Pending</div>
                <div style="font-size:1.35rem;font-weight:700;">${appCounts["Pending"]}</div>
              </div>
              <div style="padding:10px 12px;border-radius:8px;background:var(--surface-muted,#f8fafc);border-left:4px solid #0284c7;">
                <div style="font-size:0.75rem;color:var(--text-secondary);">Under Review</div>
                <div style="font-size:1.35rem;font-weight:700;">${appCounts["Under Review"]}</div>
              </div>
              <div style="padding:10px 12px;border-radius:8px;background:var(--surface-muted,#f8fafc);border-left:4px solid #16a34a;">
                <div style="font-size:0.75rem;color:var(--text-secondary);">Approved</div>
                <div style="font-size:1.35rem;font-weight:700;">${appCounts["Approved"]}</div>
              </div>
              <div style="padding:10px 12px;border-radius:8px;background:var(--surface-muted,#f8fafc);border-left:4px solid #dc2626;">
                <div style="font-size:0.75rem;color:var(--text-secondary);">Rejected</div>
                <div style="font-size:1.35rem;font-weight:700;">${appCounts["Rejected"]}</div>
              </div>
            </div>

            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ref No.</th>
                    <th>Applicant</th>
                    <th>Program</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentApplications
                    .map((app) => {
                      const st = app.status === "Submitted" ? "Pending" : app.status || "Pending";
                      return `
                        <tr>
                          <td><strong>${escapeHtml(app.referenceNumber)}</strong></td>
                          <td>
                            <div><strong>${escapeHtml(app.fullName)}</strong></div>
                            <div style="font-size:0.73rem;color:var(--text-muted);">${escapeHtml(
                              formatReadableDate(app.submittedDate)
                            )}</div>
                          </td>
                          <td style="font-size:0.8rem;">${escapeHtml(app.desiredProgram)}</td>
                          <td>
                            <span class="badge ${getAppStatusBadgeClass(st)}">${escapeHtml(st)}</span>
                          </td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right: Faculty Quick Actions + Recent Announcements + Audit Trail -->
        <div class="dashboard-col">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Faculty Management Tools</h3>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
              <button type="button" class="btn btn-primary" data-fac-nav="faculty-grades">
                Manage Student Grades
              </button>
              <button type="button" class="btn btn-primary" data-fac-nav="faculty-attendance">
                Record Class Attendance
              </button>
              <button type="button" class="btn btn-secondary" data-fac-nav="faculty-tasks">
                Create / Edit Assignments
              </button>
              <button type="button" class="btn btn-secondary" data-fac-nav="faculty-announcements">
                Publish Announcement
              </button>
              <button type="button" class="btn btn-primary" style="grid-column:1 / -1;" data-fac-nav="faculty-applications">
                Review Student Applications (${allApplications.length})
              </button>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent Faculty &amp; University Announcements</h3>
              <button type="button" class="btn-text" data-fac-nav="faculty-announcements">Manage &rarr;</button>
            </div>
            <div class="dash-list">
              ${recentAnnouncements
                .map(
                  (a) => `
                <div class="dash-list-item" style="align-items:flex-start;">
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                      <span class="badge badge-primary">${escapeHtml(a.category)}</span>
                      <span class="badge ${
                        a.published !== false ? "badge-success" : "badge-neutral"
                      }">${a.published !== false ? "Published" : "Unpublished"}</span>
                      <span style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(
                        formatReadableDate(a.date)
                      )}</span>
                    </div>
                    <div class="dash-item-title">${escapeHtml(a.title)}</div>
                    <div class="dash-item-sub">${escapeHtml(a.author)}</div>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent Audit Trail (MySQL Activity Log)</h3>
              <button type="button" class="btn-text" data-fac-nav="faculty-applications">Full Log &rarr;</button>
            </div>
            ${
              recentAuditLogs.length === 0
                ? `<div style="padding:14px;font-size:0.84rem;color:var(--text-secondary);">Audit log entries from MySQL (<code>audit_logs</code>) will appear here as applications, statuses, schedules, and announcements are updated.</div>`
                : `<div class="dash-list">
                    ${recentAuditLogs
                      .map(
                        (log) => `
                        <div class="dash-list-item" style="align-items:flex-start;">
                          <div>
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
                              <span class="badge badge-info" style="font-size:0.68rem;">${escapeHtml(
                                log.actionType || "ACTION"
                              )}</span>
                              <span style="font-size:0.74rem;color:var(--text-muted);">${escapeHtml(
                                log.createdAt || ""
                              )}</span>
                            </div>
                            <div style="font-size:0.83rem;font-weight:600;">${escapeHtml(
                              log.details || ""
                            )}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);">By: ${escapeHtml(
                              log.actorName || "System"
                            )} (${escapeHtml(log.actorRole || "user")})</div>
                          </div>
                        </div>
                      `
                      )
                      .join("")}
                  </div>`
            }
          </div>
        </div>
      </div>
    `;

    // Bind navigation buttons
    container.querySelectorAll("[data-fac-nav]").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.getAttribute("data-fac-nav")));
    });

    // Bind Faculty Account Switcher
    const perspSelect = document.getElementById("facultyPerspectiveSelect");
    if (perspSelect) {
      perspSelect.addEventListener("change", (e) => {
        switchFacultyAccount(e.target.value);
      });
    }
  }

  /**
   * 2. FACULTY PROFILE
   */
  function renderProfile() {
    if (!requireRole("faculty", "access Faculty Profile")) return;
    const container = document.getElementById("facultyProfileContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const fp = state.facultyProfile;
    const assignedSubjects = getFacultySubjects(state);

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Faculty Profile</h2>
          <p>View and update your faculty profile and assigned BSIT 2-2 subjects.</p>
        </div>
      </div>

      <div class="profile-layout">
        <div class="card profile-card-left">
          <img
            src="assets/images/default-avatar.svg"
            alt="Faculty Avatar"
            class="profile-avatar-lg"
            style="margin-bottom:12px;"
          />
          <h3 style="font-size:1.15rem;margin-bottom:4px;">${escapeHtml(fp.fullName)}</h3>
          <span class="badge badge-info" style="margin-bottom:8px;">${escapeHtml(
            fp.facultyId
          )}</span>
          <p style="font-size:0.84rem;color:var(--text-secondary);">${escapeHtml(fp.department)}</p>

          <div class="profile-meta-list">
            <div class="profile-meta-row">
              <span>Assigned Section</span>
              <span>${escapeHtml(fp.advisorySection || "BSIT 2-2")}</span>
            </div>
            <div class="profile-meta-row">
              <span>Email</span>
              <span style="word-break:break-all;">${escapeHtml(fp.email)}</span>
            </div>
            <div class="profile-meta-row">
              <span>Contact</span>
              <span>${escapeHtml(fp.contactNumber)}</span>
            </div>
            <div class="profile-meta-row">
              <span>Assigned Subjects</span>
              <span>${
                assignedSubjects.length > 0
                  ? assignedSubjects.map((s) => `${s.subjectCode} (${s.courseCode})`).join(", ")
                  : "No assigned subjects"
              }</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Edit Faculty Information</h3>
            <span class="badge badge-neutral">Faculty Account</span>
          </div>

          <form id="facultyProfileForm" novalidate>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="facIdInput">Faculty ID <span class="req">*</span></label>
                <input type="text" id="facIdInput" name="facultyId" class="form-control" value="${escapeHtml(
                  fp.facultyId
                )}" />
                <div class="field-error" data-error-for="facultyId"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="facNameInput">Full Name <span class="req">*</span></label>
                <input type="text" id="facNameInput" name="fullName" class="form-control" value="${escapeHtml(
                  fp.fullName
                )}" />
                <div class="field-error" data-error-for="fullName"></div>
              </div>

              <div class="form-group full-width">
                <label class="form-label" for="facDeptInput">Department / College <span class="req">*</span></label>
                <input type="text" id="facDeptInput" name="department" class="form-control" value="${escapeHtml(
                  fp.department
                )}" />
                <div class="field-error" data-error-for="department"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="facEmailInput">University Email <span class="req">*</span></label>
                <input type="email" id="facEmailInput" name="email" class="form-control" value="${escapeHtml(
                  fp.email
                )}" />
                <div class="field-error" data-error-for="email"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="facContactInput">Contact Number <span class="req">*</span></label>
                <input type="text" id="facContactInput" name="contactNumber" class="form-control" value="${escapeHtml(
                  fp.contactNumber
                )}" />
                <div class="field-error" data-error-for="contactNumber"></div>
              </div>

              <div class="form-group full-width">
                <label class="form-label" for="facSectionInput">Assigned Section <span class="req">*</span></label>
                <input type="text" id="facSectionInput" name="advisorySection" class="form-control" value="${escapeHtml(
                  fp.advisorySection || "BSIT 2-2"
                )}" />
                <div class="field-error" data-error-for="advisorySection"></div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">Save Faculty Profile</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById("facultyProfileForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!requireRole("faculty", "update Faculty Profile")) return;
        clearFormErrors(form);

        const fd = new FormData(form);
        const facultyId = String(fd.get("facultyId") || "").trim();
        const fullName = String(fd.get("fullName") || "").trim();
        const department = String(fd.get("department") || "").trim();
        const email = String(fd.get("email") || "").trim();
        const contactNumber = String(fd.get("contactNumber") || "").trim();
        const advisorySection = String(fd.get("advisorySection") || "").trim();

        let valid = true;
        if (!facultyId) {
          setFieldError(form, "facultyId", "Faculty ID is required.");
          valid = false;
        }
        if (!fullName) {
          setFieldError(form, "fullName", "Full name is required.");
          valid = false;
        }
        if (!department) {
          setFieldError(form, "department", "Department is required.");
          valid = false;
        }
        if (!email || !isValidEmail(email)) {
          setFieldError(form, "email", "Please enter a valid email address.");
          valid = false;
        }
        if (!contactNumber) {
          setFieldError(form, "contactNumber", "Contact number is required.");
          valid = false;
        }
        if (!advisorySection) {
          setFieldError(form, "advisorySection", "Assigned section is required.");
          valid = false;
        }

        if (!valid) {
          showToast("Please check highlighted fields.", "error");
          return;
        }

        const currState = StudentHubStorage.getState();
        currState.facultyProfile = {
          ...currState.facultyProfile,
          facultyId,
          fullName,
          department,
          email,
          contactNumber,
          advisorySection,
          activeInstructorFilter: fullName
        };
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast("Faculty profile updated!", "success");
      });
    }
  }

  /**
   * Open Modal to Edit a Student's Year Level in Faculty Student Records (Year 1–Year 4)
   */
  function openEditStudentYearModal(studentRecord) {
    if (!requireRole("faculty", "update student year level")) return;
    const validYears = StudentHubStorage.VALID_YEAR_LEVELS;

    const html = `
      <form id="facEditStudentYearForm" novalidate>
        <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:14px;">
          Update academic year level for <strong>${escapeHtml(studentRecord.fullName)}</strong> (${escapeHtml(
      studentRecord.studentNumber
    )}). Only <strong>Year 1</strong> to <strong>Year 4</strong> are permitted.
        </p>
        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label" for="facStudentYearSelect">Year Level <span class="req">*</span></label>
          <select id="facStudentYearSelect" name="yearLevel" class="form-control">
            ${validYears
              .map(
                (yr) =>
                  `<option value="${escapeHtml(yr)}" ${
                    StudentHubStorage.normalizeYearLevel(studentRecord.yearLevel, "Year 2") === yr
                      ? "selected"
                      : ""
                  }>${escapeHtml(yr)}</option>`
              )
              .join("")}
          </select>
          <div class="field-error" data-error-for="yearLevel"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="cancelFacYearModalBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Year Level</button>
        </div>
      </form>
    `;

    openModal(`Update Student Year Level — ${studentRecord.studentNumber}`, html, (bodyEl) => {
      bodyEl.querySelector("#cancelFacYearModalBtn").addEventListener("click", closeModal);
      const form = bodyEl.querySelector("#facEditStudentYearForm");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        clearFormErrors(form);
        const fd = new FormData(form);
        const yearLevel = String(fd.get("yearLevel") || "").trim();

        if (!StudentHubStorage.isValidYearLevel(yearLevel)) {
          setFieldError(
            form,
            "yearLevel",
            "Invalid year level. Please select Year 1, Year 2, Year 3, or Year 4."
          );
          return;
        }

        const currState = StudentHubStorage.getState();
        currState.sectionRoster = (currState.sectionRoster || []).map((st) =>
          st.studentNumber === studentRecord.studentNumber ? { ...st, yearLevel } : st
        );
        if (studentRecord.isPrimaryDemoStudent && currState.profile) {
          currState.profile.yearLevel = yearLevel;
        }
        StudentHubStorage.saveState(currState);
        closeModal();
        refreshAll();
        showToast(`Updated ${studentRecord.fullName} to ${yearLevel}.`, "success");
      });
    });
  }

  /**
   * 3. COMPLETE FACULTY SCHEDULE MANAGEMENT SYSTEM
   * Supports:
   *  A. Individual Professor Schedule ("My Personal Faculty Schedule") - strictly isolated to the logged-in professor.
   *  B. University Master Schedule ("University Master Schedule") - authorized schedule-management view for all 15 professors,
   *     all 33 subjects, all 8 BSIT sections (BSIT 1-1 to BSIT 4-2), and all 14 campus rooms & facilities,
   *     plus real-time conflict detection, MySQL schedule creation, and the Sept 15–17 Historical Schedule Reference Archive.
   */
  function renderClasses() {
    if (!requireRole("faculty", "view Faculty Classes & Schedules")) return;
    const container = document.getElementById("facultyClassesContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const fp = state.facultyProfile;
    const directory = state.facultyDirectory || [];
    const assignedSubjects = getFacultySubjects(state);
    const allPersonalSessions = StudentHubStorage.getFacultyScheduleSessions(
      fp.fullName,
      state.schedules
    );
    const allUniversitySubjects = StudentHubStorage.getAllUniversitySubjects(state.schedules);
    const allUniversitySessions = StudentHubStorage.getAllUniversityScheduleSessions(state.schedules);
    const campusRooms = StudentHubStorage.CAMPUS_ROOMS_AND_FACILITIES || [];
    const universitySections = StudentHubStorage.UNIVERSITY_SECTIONS || [];
    const validYears = StudentHubStorage.VALID_YEAR_LEVELS || ["Year 1", "Year 2", "Year 3", "Year 4"];
    const weekdays = StudentHubStorage.WEEKDAYS || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const roster = state.sectionRoster || [];

    const filteredRoster = roster.filter(
      (st) =>
        rosterYearFilter === "All" ||
        StudentHubStorage.normalizeYearLevel(st.yearLevel, "Year 2") === rosterYearFilter
    );

    // Filter personal schedule sessions
    const personalQuery = (facPersonalSearch || "").trim().toLowerCase();
    const filteredPersonalSessions = allPersonalSessions.filter((sess) => {
      if (facPersonalDayFilter !== "All" && sess.day !== facPersonalDayFilter) return false;
      if (
        facPersonalRoomFilter !== "All" &&
        StudentHubStorage.normalizeRoomName(sess.room) !== facPersonalRoomFilter
      ) {
        return false;
      }
      if (facPersonalSubjectFilter !== "All" && sess.subjectCode !== facPersonalSubjectFilter) {
        return false;
      }
      if (facPersonalSectionFilter !== "All" && sess.section !== facPersonalSectionFilter) {
        return false;
      }
      if (facPersonalTypeFilter !== "All" && sess.classType !== facPersonalTypeFilter) {
        return false;
      }
      if (personalQuery) {
        const hay = `${sess.subjectCode} ${sess.courseCode || ""} ${sess.subjectName || ""} ${
          sess.displaySubject || ""
        } ${sess.section || ""} ${sess.room || ""} ${sess.canonicalRoom || ""} ${
          sess.day || ""
        } ${sess.classType || ""}`.toLowerCase();
        if (!hay.includes(personalQuery)) return false;
      }
      return true;
    });

    // Unique personal rooms & sections for personal filter dropdowns
    const personalCanonicalRooms = Array.from(
      new Set(allPersonalSessions.map((s) => StudentHubStorage.normalizeRoomName(s.room)))
    );
    const personalSections = Array.from(new Set(allPersonalSessions.map((s) => s.section)));

    // Filter Master Schedule sessions
    const masterQuery = (facMasterSearch || "").trim().toLowerCase();
    const filteredMasterSessions = allUniversitySessions.filter((sess) => {
      if (
        facMasterProfFilter !== "All" &&
        sess.instructor.toLowerCase() !== facMasterProfFilter.toLowerCase()
      ) {
        return false;
      }
      if (facMasterSubjectFilter !== "All" && sess.subjectCode !== facMasterSubjectFilter) {
        return false;
      }
      if (facMasterSectionFilter !== "All" && sess.section !== facMasterSectionFilter) {
        return false;
      }
      if (facMasterYearFilter !== "All" && sess.yearLevel !== facMasterYearFilter) {
        return false;
      }
      if (facMasterDayFilter !== "All" && sess.day !== facMasterDayFilter) {
        return false;
      }
      if (
        facMasterRoomFilter !== "All" &&
        StudentHubStorage.normalizeRoomName(sess.room) !== facMasterRoomFilter
      ) {
        return false;
      }
      if (facMasterTypeFilter !== "All" && sess.classType !== facMasterTypeFilter) {
        return false;
      }
      if (masterQuery) {
        const hay = `${sess.instructor || ""} ${sess.facultyId || ""} ${sess.subjectCode || ""} ${
          sess.courseCode || ""
        } ${sess.subjectName || ""} ${sess.displaySubject || ""} ${sess.section || ""} ${
          sess.yearLevel || ""
        } ${sess.day || ""} ${sess.room || ""} ${sess.canonicalRoom || ""} ${
          sess.classType || ""
        }`.toLowerCase();
        if (!hay.includes(masterQuery)) return false;
      }
      return true;
    });

    const activeConflicts = StudentHubStorage.detectAllScheduleConflicts(state.schedules);
    const historicalSeptEntries = StudentHubStorage.getHistoricalSept15To17Schedule();

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Complete Faculty Schedule Management System</h2>
          <p>View your personal professor teaching schedule or inspect &amp; manage the complete University Master Schedule across all 15 professors, 8 BSIT sections, and 14 campus classrooms &amp; laboratories.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn ${
            facSchedScope === "personal" ? "btn-primary" : "btn-secondary"
          }" id="facScopePersonalBtn">
            My Personal Schedule (${escapeHtml(fp.fullName)})
          </button>
          <button type="button" class="btn ${
            facSchedScope === "master" ? "btn-primary" : "btn-secondary"
          }" id="facScopeMasterBtn">
            University Master Schedule (All 15 Professors)
          </button>
          <button type="button" class="btn btn-primary" id="facOpenAddScheduleModalBtn" style="background:#0f766e;border-color:#0f766e;">
            + Add Class Schedule (MySQL)
          </button>
        </div>
      </div>

      <!-- Faculty Account Switcher & Summary Metrics Toolbar -->
      <div class="toolbar-row" style="margin-bottom:18px;">
        <div class="toolbar-group" style="justify-content:space-between;width:100%;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <strong>Logged-In Professor:</strong>
            <span class="badge badge-info">${escapeHtml(fp.fullName)} (${escapeHtml(
      fp.facultyId
    )})</span>
            <span class="badge badge-primary">${assignedSubjects.length} Assigned Subject${
      assignedSubjects.length === 1 ? "" : "s"
    } &bull; ${allPersonalSessions.length} Personal Session${
      allPersonalSessions.length === 1 ? "" : "s"
    }</span>
            <span class="badge ${
              activeConflicts.length === 0 ? "badge-success" : "badge-danger"
            }">
              ${
                activeConflicts.length === 0
                  ? "0 Schedule Conflicts Verified"
                  : `${activeConflicts.length} Conflict(s) Detected`
              }
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <label for="facultyClassesAccountSelect" style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);">Switch Demo Professor:</label>
            <select id="facultyClassesAccountSelect" class="form-control" style="max-width:340px;">
              ${directory
                .map(
                  (prof) =>
                    `<option value="${escapeHtml(prof.name)}" ${
                      fp.fullName.toLowerCase() === prof.name.toLowerCase() ? "selected" : ""
                    }>${escapeHtml(prof.name)} (${escapeHtml(prof.facultyId)})</option>`
                )
                .join("")}
            </select>
          </div>
        </div>
      </div>

      ${
        facSchedScope === "personal"
          ? `
        <!-- =========================================================================
             SCOPE A: INDIVIDUAL PROFESSOR SCHEDULE (STRICTLY ISOLATED TO LOGGED-IN PROFESSOR)
             ========================================================================= -->
        <div class="card" style="margin-bottom:22px;">
          <div class="card-header" style="flex-wrap:wrap;gap:12px;">
            <div>
              <h3 class="card-title">Personal Faculty Schedule &mdash; ${escapeHtml(
                fp.fullName
              )} (${escapeHtml(fp.facultyId)})</h3>
              <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:2px;">
                Showing <strong>only ${escapeHtml(
                  fp.fullName
                )}'s</strong> assigned subjects, sections, year levels, days, start/end times, and room assignments.
                Other professors' schedules are strictly separated into the University Master Schedule.
              </p>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-sm ${
                facPersonalViewMode === "both" ? "btn-primary" : "btn-secondary"
              }" data-pview="both">Timetable + List</button>
              <button type="button" class="btn btn-sm ${
                facPersonalViewMode === "timetable" ? "btn-primary" : "btn-secondary"
              }" data-pview="timetable">Weekly Timetable Only</button>
              <button type="button" class="btn btn-sm ${
                facPersonalViewMode === "table" ? "btn-primary" : "btn-secondary"
              }" data-pview="table">Schedule List Only</button>
            </div>
          </div>

          <!-- Personal Schedule Search & Filter Bar -->
          <div class="toolbar-row" style="background:var(--surface-muted,#f8fafc);padding:12px;border-radius:10px;margin-bottom:18px;border:1px solid var(--border-color,#e2e8f0);">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;width:100%;align-items:end;">
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Search My Schedule</label>
                <input type="search" id="facPersonalSearchInput" class="form-control" placeholder="Subject code, name, room, section..." value="${escapeHtml(
                  facPersonalSearch
                )}" />
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Day</label>
                <select id="facPersonalDayFilterSelect" class="form-control">
                  <option value="All" ${facPersonalDayFilter === "All" ? "selected" : ""}>All Days (Mon–Fri)</option>
                  ${weekdays
                    .map(
                      (d) =>
                        `<option value="${escapeHtml(d)}" ${
                          facPersonalDayFilter === d ? "selected" : ""
                        }>${escapeHtml(d)}</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Subject</label>
                <select id="facPersonalSubjectFilterSelect" class="form-control">
                  <option value="All" ${
                    facPersonalSubjectFilter === "All" ? "selected" : ""
                  }>All Assigned Subjects (${assignedSubjects.length})</option>
                  ${assignedSubjects
                    .map(
                      (sub) =>
                        `<option value="${escapeHtml(sub.subjectCode)}" ${
                          facPersonalSubjectFilter === sub.subjectCode ? "selected" : ""
                        }>${escapeHtml(sub.subjectCode)} &ndash; ${escapeHtml(
                          sub.courseCode
                        )}</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Section</label>
                <select id="facPersonalSectionFilterSelect" class="form-control">
                  <option value="All" ${
                    facPersonalSectionFilter === "All" ? "selected" : ""
                  }>All Assigned Sections (${personalSections.length})</option>
                  ${personalSections
                    .map(
                      (sec) =>
                        `<option value="${escapeHtml(sec)}" ${
                          facPersonalSectionFilter === sec ? "selected" : ""
                        }>${escapeHtml(sec)}</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Room / Lab</label>
                <select id="facPersonalRoomFilterSelect" class="form-control">
                  <option value="All" ${
                    facPersonalRoomFilter === "All" ? "selected" : ""
                  }>All Assigned Rooms (${personalCanonicalRooms.length})</option>
                  ${personalCanonicalRooms
                    .map(
                      (rm) =>
                        `<option value="${escapeHtml(rm)}" ${
                          facPersonalRoomFilter === rm ? "selected" : ""
                        }>${escapeHtml(rm)}</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Class Type</label>
                <select id="facPersonalTypeFilterSelect" class="form-control">
                  <option value="All" ${facPersonalTypeFilter === "All" ? "selected" : ""}>All Class Types</option>
                  <option value="Lecture" ${facPersonalTypeFilter === "Lecture" ? "selected" : ""}>Lecture</option>
                  <option value="Laboratory" ${facPersonalTypeFilter === "Laboratory" ? "selected" : ""}>Laboratory</option>
                  <option value="Physical Education" ${
                    facPersonalTypeFilter === "Physical Education" ? "selected" : ""
                  }>Physical Education</option>
                </select>
              </div>
              <div style="display:flex;gap:6px;">
                <button type="button" class="btn btn-secondary" id="facClearPersonalFiltersBtn" style="width:100%;">Clear Filters</button>
              </div>
            </div>
          </div>

          <!-- Class Type Legend -->
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px;font-size:0.8rem;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <strong>Class Type &amp; Source Legend:</strong>
              ${renderClassTypeBadge("Lecture")}
              ${renderClassTypeBadge("Laboratory")}
              ${renderClassTypeBadge("Physical Education")}
              <span class="badge badge-primary" style="font-size:0.68rem;">Official BSIT 2-2</span>
              <span class="badge badge-warning" style="font-size:0.68rem;">Sample Demo Schedule</span>
            </div>
            <span class="badge badge-info">Showing ${filteredPersonalSessions.length} of ${
              allPersonalSessions.length
            } Personal Class Session${allPersonalSessions.length === 1 ? "" : "s"}</span>
          </div>

          ${
            filteredPersonalSessions.length === 0
              ? `
              <div class="empty-state" style="padding:32px 20px;">
                <h3>No Matching Personal Schedule Sessions</h3>
                <p>No class sessions matched your current filter criteria for <strong>${escapeHtml(
                  fp.fullName
                )}</strong>.</p>
                <button type="button" class="btn btn-secondary" id="facResetPersonalEmptyBtn">Reset Personal Filters</button>
              </div>
            `
              : `
              ${
                facPersonalViewMode === "both" || facPersonalViewMode === "timetable"
                  ? `
                  <!-- Weekly Timetable Grid -->
                  <div class="schedule-days-grid" style="margin-bottom:22px;">
                    ${weekdays
                      .map((dayName) => {
                        const daySessions = filteredPersonalSessions.filter(
                          (s) => s.day === dayName
                        );
                        return `
                          <div class="day-column">
                            <div class="day-column-header">
                              <span>${escapeHtml(dayName)}</span>
                              <span class="badge ${
                                daySessions.length > 0 ? "badge-primary" : "badge-neutral"
                              }">${daySessions.length} Class${
                          daySessions.length === 1 ? "" : "es"
                        }</span>
                            </div>
                            <div class="day-column-body">
                              ${
                                daySessions.length === 0
                                  ? `<div class="day-empty-slot">No assigned classes on ${escapeHtml(
                                      dayName
                                    )}.</div>`
                                  : daySessions
                                      .map(
                                        (sess) => `
                                      <div class="schedule-class-card" style="border-left:4px solid ${
                                        sess.classType === "Laboratory"
                                          ? "#0891b2"
                                          : sess.classType === "Physical Education"
                                          ? "#16a34a"
                                          : "#2563eb"
                                      };">
                                        <div class="schedule-card-top" style="flex-wrap:wrap;gap:4px;">
                                          <span class="badge badge-info">${escapeHtml(
                                            sess.subjectCode
                                          )}</span>
                                          <span class="schedule-room-pill">Room: ${escapeHtml(
                                            sess.canonicalRoom || sess.room
                                          )}</span>
                                        </div>
                                        <div class="schedule-card-title">${escapeHtml(
                                          sess.displaySubject
                                        )}</div>
                                        <div class="schedule-card-time">${escapeHtml(
                                          sess.timeLabel
                                        )} (${escapeHtml(sess.startTime)} &ndash; ${escapeHtml(
                                          sess.endTime
                                        )})</div>
                                        <div style="display:flex;gap:4px;flex-wrap:wrap;margin:6px 0;">
                                          ${renderClassTypeBadge(sess.classType)}
                                          ${renderScheduleOriginBadge(sess)}
                                        </div>
                                        <div class="schedule-card-meta">
                                          <span><strong>Section:</strong> ${escapeHtml(
                                            sess.section
                                          )} (${escapeHtml(sess.yearLevel)})</span>
                                          <span><strong>Professor:</strong> ${escapeHtml(
                                            sess.instructor
                                          )}</span>
                                        </div>
                                      </div>
                                    `
                                      )
                                      .join("")
                              }
                            </div>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                `
                  : ""
              }

              ${
                facPersonalViewMode === "both" || facPersonalViewMode === "table"
                  ? `
                  <!-- Detailed Personal Schedule List / Table -->
                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Start &ndash; End Time</th>
                          <th>Subject Code &amp; Name</th>
                          <th>Section &amp; Year Level</th>
                          <th>Room / Facility</th>
                          <th>Class Type &amp; Source</th>
                          <th>Professor</th>
                          <th>Quick Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${filteredPersonalSessions
                          .map(
                            (sess) => `
                              <tr>
                                <td><strong>${escapeHtml(sess.day)}</strong></td>
                                <td>
                                  <span class="badge badge-info">${escapeHtml(
                                    sess.timeLabel
                                  )}</span>
                                  <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px;">${escapeHtml(
                                    sess.startTime
                                  )} &ndash; ${escapeHtml(sess.endTime)}</div>
                                </td>
                                <td>
                                  <strong>${escapeHtml(sess.subjectCode)}</strong> &mdash; ${escapeHtml(
                              sess.courseCode
                            )}
                                  <div style="font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(
                                    sess.subjectName
                                  )}</div>
                                </td>
                                <td>
                                  <span class="badge badge-primary">${escapeHtml(
                                    sess.section
                                  )}</span>
                                  <span class="badge badge-neutral" style="margin-left:4px;">${escapeHtml(
                                    sess.yearLevel
                                  )}</span>
                                </td>
                                <td>
                                  <strong>${escapeHtml(sess.canonicalRoom || sess.room)}</strong>
                                  ${
                                    sess.canonicalRoom && sess.canonicalRoom !== sess.room
                                      ? `<div style="font-size:0.72rem;color:var(--text-secondary);">Code: ${escapeHtml(
                                          sess.room
                                        )}</div>`
                                      : ""
                                  }
                                </td>
                                <td>
                                  <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;">
                                    ${renderClassTypeBadge(sess.classType)}
                                    ${renderScheduleOriginBadge(sess)}
                                  </div>
                                </td>
                                <td>
                                  <strong>${escapeHtml(sess.instructor)}</strong>
                                  <div style="font-size:0.72rem;color:var(--text-secondary);">${escapeHtml(
                                    sess.facultyId || fp.facultyId
                                  )}</div>
                                </td>
                                <td>
                                  <div class="table-actions">
                                    <button type="button" class="btn btn-sm btn-secondary fac-open-att-btn" data-code="${escapeHtml(
                                      sess.subjectCode
                                    )}">Attendance</button>
                                    <button type="button" class="btn btn-sm btn-primary fac-open-grd-btn" data-code="${escapeHtml(
                                      sess.subjectCode
                                    )}">Grades</button>
                                    ${
                                      sess.isCustomSchedule && sess.scheduleId
                                        ? `<button type="button" class="btn btn-sm btn-danger fac-delete-sched-btn" data-sched-id="${escapeHtml(
                                            String(sess.scheduleId)
                                          )}">Delete</button>`
                                        : ""
                                    }
                                  </div>
                                </td>
                              </tr>
                            `
                          )
                          .join("")}
                      </tbody>
                    </table>
                  </div>
                `
                  : ""
              }
            `
          }
        </div>
      `
          : `
        <!-- =========================================================================
             SCOPE B: UNIVERSITY MASTER SCHEDULE (AUTHORIZED VIEW FOR ALL 15 PROFESSORS)
             ========================================================================= -->
        <div class="card" style="margin-bottom:22px;">
          <div class="card-header" style="flex-wrap:wrap;gap:12px;">
            <div>
              <h3 class="card-title">BANTUG UNIVERSITY &mdash; Complete Faculty Master Schedule</h3>
              <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:2px;">
                Authorized University Schedule Management View covering <strong>all 15 professors</strong>, <strong>${
                  allUniversitySubjects.length
                } subjects</strong>, <strong>8 BSIT sections (Year 1&ndash;Year 4)</strong>, and <strong>14 classrooms, computer laboratories, &amp; facilities</strong>.
              </p>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="btn btn-sm ${
                facMasterSubView === "both" ? "btn-primary" : "btn-secondary"
              }" data-msubview="both">Timetable + Master List</button>
              <button type="button" class="btn btn-sm ${
                facMasterSubView === "timetable" ? "btn-primary" : "btn-secondary"
              }" data-msubview="timetable">Weekly Master Timetable</button>
              <button type="button" class="btn btn-sm ${
                facMasterSubView === "table" ? "btn-primary" : "btn-secondary"
              }" data-msubview="table">Master Table View</button>
              <button type="button" class="btn btn-sm ${
                facMasterSubView === "rooms" ? "btn-primary" : "btn-secondary"
              }" data-msubview="rooms">14 Rooms &amp; Labs Matrix</button>
              <button type="button" class="btn btn-sm ${
                facMasterSubView === "historical" ? "btn-primary" : "btn-secondary"
              }" data-msubview="historical">Sept 15&ndash;17 Historical Reference</button>
            </div>
          </div>

          <!-- Conflict Detection & University Coverage Banner -->
          <div style="padding:12px 16px;border-radius:10px;margin-bottom:16px;background:${
            activeConflicts.length === 0 ? "#ecfdf5" : "#fef2f2"
          };border:1px solid ${activeConflicts.length === 0 ? "#a7f3d0" : "#fecaca"};color:${
            activeConflicts.length === 0 ? "#065f46" : "#991b1b"
          };display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div>
              <strong>${
                activeConflicts.length === 0
                  ? "University Schedule Conflict Check: PASSED (0 Conflicts)"
                  : `WARNING: ${activeConflicts.length} Schedule Conflict(s) Detected`
              }</strong>
              <div style="font-size:0.8rem;margin-top:2px;">
                ${
                  activeConflicts.length === 0
                    ? `Verified across ${allUniversitySessions.length} active weekly class sessions: No professor teaches two classes at overlapping times, no room is double-booked, and no section has overlapping classes. Official BSIT 2-2 schedules (9 subjects / 18 sessions) are 100% preserved.`
                    : activeConflicts.map((c) => escapeHtml(c.message)).join(" | ")
                }
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span class="badge badge-primary">15 / 15 Professors Scheduled</span>
              <span class="badge badge-info">${allUniversitySubjects.length} Subjects (${
              allUniversitySessions.length
            } Sessions)</span>
              <span class="badge badge-success">8 Sections &bull; 14 Rooms &amp; Labs</span>
            </div>
          </div>

          <!-- Master Schedule Multi-Filter Toolbar -->
          <div class="toolbar-row" style="background:var(--surface-muted,#f8fafc);padding:14px;border-radius:10px;margin-bottom:18px;border:1px solid var(--border-color,#e2e8f0);">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px;width:100%;align-items:end;">
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Search Professor / Subject / Room</label>
                <input type="search" id="facMasterSearchInput" class="form-control" placeholder="Search professor, code, title, room..." value="${escapeHtml(
                  facMasterSearch
                )}" />
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Professor</label>
                <select id="facMasterProfFilterSelect" class="form-control">
                  <option value="All" ${
                    facMasterProfFilter === "All" ? "selected" : ""
                  }>All 15 Professors</option>
                  ${directory
                    .map(
                      (prof) =>
                        `<option value="${escapeHtml(prof.name)}" ${
                          facMasterProfFilter.toLowerCase() === prof.name.toLowerCase()
                            ? "selected"
                            : ""
                        }>${escapeHtml(prof.name)} (${escapeHtml(prof.facultyId)})</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Subject</label>
                <select id="facMasterSubjectFilterSelect" class="form-control">
                  <option value="All" ${
                    facMasterSubjectFilter === "All" ? "selected" : ""
                  }>All Subjects (${allUniversitySubjects.length})</option>
                  ${allUniversitySubjects
                    .map(
                      (sub) =>
                        `<option value="${escapeHtml(sub.subjectCode)}" ${
                          facMasterSubjectFilter === sub.subjectCode ? "selected" : ""
                        }>${escapeHtml(sub.subjectCode)} &ndash; ${escapeHtml(
                          sub.courseCode
                        )} (${escapeHtml(sub.section)})</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Section</label>
                <select id="facMasterSectionFilterSelect" class="form-control">
                  <option value="All" ${
                    facMasterSectionFilter === "All" ? "selected" : ""
                  }>All Sections (8 BSIT Sections)</option>
                  ${universitySections
                    .map(
                      (sec) =>
                        `<option value="${escapeHtml(sec.section)}" ${
                          facMasterSectionFilter === sec.section ? "selected" : ""
                        }>${escapeHtml(sec.section)} (${escapeHtml(sec.yearLevel)})</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Year Level</label>
                <select id="facMasterYearFilterSelect" class="form-control">
                  <option value="All" ${
                    facMasterYearFilter === "All" ? "selected" : ""
                  }>All Year Levels (Year 1&ndash;4)</option>
                  ${validYears
                    .map(
                      (yr) =>
                        `<option value="${escapeHtml(yr)}" ${
                          facMasterYearFilter === yr ? "selected" : ""
                        }>${escapeHtml(yr)}</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Day</label>
                <select id="facMasterDayFilterSelect" class="form-control">
                  <option value="All" ${
                    facMasterDayFilter === "All" ? "selected" : ""
                  }>All Weekdays (Mon&ndash;Fri)</option>
                  ${weekdays
                    .map(
                      (d) =>
                        `<option value="${escapeHtml(d)}" ${
                          facMasterDayFilter === d ? "selected" : ""
                        }>${escapeHtml(d)}</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Room / Facility</label>
                <select id="facMasterRoomFilterSelect" class="form-control">
                  <option value="All" ${
                    facMasterRoomFilter === "All" ? "selected" : ""
                  }>All 14 Rooms &amp; Facilities</option>
                  ${campusRooms
                    .map(
                      (rm) =>
                        `<option value="${escapeHtml(rm.name)}" ${
                          facMasterRoomFilter === rm.name ? "selected" : ""
                        }>${escapeHtml(rm.name)} (${escapeHtml(rm.category)})</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Filter by Class Type</label>
                <select id="facMasterTypeFilterSelect" class="form-control">
                  <option value="All" ${
                    facMasterTypeFilter === "All" ? "selected" : ""
                  }>All Class Types</option>
                  <option value="Lecture" ${
                    facMasterTypeFilter === "Lecture" ? "selected" : ""
                  }>Lecture</option>
                  <option value="Laboratory" ${
                    facMasterTypeFilter === "Laboratory" ? "selected" : ""
                  }>Laboratory</option>
                  <option value="Physical Education" ${
                    facMasterTypeFilter === "Physical Education" ? "selected" : ""
                  }>Physical Education</option>
                </select>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:12px;padding-top:10px;border-top:1px solid var(--border-color,#e2e8f0);flex-wrap:wrap;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.8rem;">
                <span>Showing <strong>${filteredMasterSessions.length}</strong> of <strong>${
      allUniversitySessions.length
    }</strong> Weekly Sessions</span>
                ${renderClassTypeBadge("Lecture")}
                ${renderClassTypeBadge("Laboratory")}
                ${renderClassTypeBadge("Physical Education")}
                <span class="badge badge-primary" style="font-size:0.68rem;">Official BSIT 2-2</span>
                <span class="badge badge-warning" style="font-size:0.68rem;">Sample Demo Schedule</span>
              </div>
              <button type="button" class="btn btn-sm btn-secondary" id="facClearMasterFiltersBtn">Reset All Master Filters</button>
            </div>
          </div>

          ${
            facMasterSubView === "rooms"
              ? `
              <!-- 14 CAMPUS CLASSROOMS, COMPUTER LABS, & FACILITIES UTILIZATION MATRIX -->
              <div style="margin-bottom:20px;">
                <h4 style="margin-bottom:10px;">Campus Classrooms, Computer Laboratories, &amp; Facilities Allocation (14 Total Facilities)</h4>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;">
                  ${campusRooms
                    .map((rm) => {
                      const rmSessions = allUniversitySessions.filter(
                        (s) => StudentHubStorage.normalizeRoomName(s.room) === rm.name
                      );
                      return `
                        <div class="card" style="padding:14px;border:1px solid var(--border-color,#e2e8f0);box-shadow:none;">
                          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                            <div>
                              <strong>${escapeHtml(rm.name)}</strong>
                              <div style="font-size:0.75rem;color:var(--text-secondary);">Code: ${escapeHtml(
                                rm.shortCode
                              )} &bull; ${escapeHtml(rm.category)}</div>
                            </div>
                            <span class="badge ${
                              rmSessions.length > 0 ? "badge-primary" : "badge-neutral"
                            }">${rmSessions.length} Session${rmSessions.length === 1 ? "" : "s"}</span>
                          </div>
                          <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;">
                            ${rmSessions
                              .map(
                                (s) => `
                                <div style="font-size:0.76rem;padding:6px 8px;background:var(--surface-muted,#f8fafc);border-radius:6px;border-left:3px solid ${
                                  s.classType === "Laboratory"
                                    ? "#0891b2"
                                    : s.classType === "Physical Education"
                                    ? "#16a34a"
                                    : "#2563eb"
                                };">
                                  <div><strong>${escapeHtml(s.day)}</strong> &bull; ${escapeHtml(
                                  s.timeLabel
                                )}</div>
                                  <div><strong>${escapeHtml(s.subjectCode)}</strong> (${escapeHtml(
                                  s.section
                                )}) &mdash; ${escapeHtml(s.instructor)}</div>
                                </div>
                              `
                              )
                              .join("")}
                          </div>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            `
              : facMasterSubView === "historical"
              ? `
              <!-- SEPTEMBER 15–17 HISTORICAL MASTER SCHEDULE REFERENCE ARCHIVE -->
              <div style="margin-bottom:20px;">
                <div style="padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;color:#92400e;margin-bottom:14px;">
                  <strong>September 15&ndash;17 Master Schedule Reference Archive (Read-Only Historical Records)</strong>
                  <p style="font-size:0.82rem;margin-top:4px;">
                    Per Requirement 2, these dated September 15&ndash;17 master schedule records are preserved as a separate historical schedule reference and are intentionally not merged into the active weekly BSIT 2-2 timetable so no duplicate classes or room conflicts occur.
                  </p>
                </div>
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Historical Date</th>
                        <th>Day</th>
                        <th>Time Slot</th>
                        <th>Subject Code &amp; Title</th>
                        <th>Historical Instructor</th>
                        <th>Room</th>
                        <th>Archive Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${historicalSeptEntries
                        .map(
                          (item) => `
                          <tr>
                            <td><strong>${escapeHtml(item.dateLabel)}</strong></td>
                            <td>${escapeHtml(item.day)}</td>
                            <td><span class="badge badge-info">${escapeHtml(
                              item.timeLabel
                            )}</span></td>
                            <td><strong>${escapeHtml(item.subjectCode)}</strong> &mdash; ${escapeHtml(
                            item.subjectName
                          )}</td>
                            <td>${escapeHtml(item.instructor)}</td>
                            <td><span class="badge badge-neutral">${escapeHtml(
                              item.room
                            )}</span></td>
                            <td style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(
                              item.note
                            )}</td>
                          </tr>
                        `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            `
              : filteredMasterSessions.length === 0
              ? `
              <div class="empty-state" style="padding:32px 20px;">
                <h3>No Master Schedule Classes Match Your Filters</h3>
                <p>Try clearing one or more filters to view all 58 scheduled sessions across the 15 university professors.</p>
                <button type="button" class="btn btn-secondary" id="facResetMasterEmptyBtn">Reset All Master Filters</button>
              </div>
            `
              : `
              ${
                facMasterSubView === "both" || facMasterSubView === "timetable"
                  ? `
                  <!-- Master Weekly Timetable Grid -->
                  <div class="schedule-days-grid" style="margin-bottom:22px;">
                    ${weekdays
                      .map((dayName) => {
                        const daySessions = filteredMasterSessions.filter(
                          (s) => s.day === dayName
                        );
                        return `
                          <div class="day-column">
                            <div class="day-column-header">
                              <span>${escapeHtml(dayName)}</span>
                              <span class="badge ${
                                daySessions.length > 0 ? "badge-primary" : "badge-neutral"
                              }">${daySessions.length} Class${
                          daySessions.length === 1 ? "" : "es"
                        }</span>
                            </div>
                            <div class="day-column-body" style="max-height:540px;overflow-y:auto;">
                              ${
                                daySessions.length === 0
                                  ? `<div class="day-empty-slot">No matching classes on ${escapeHtml(
                                      dayName
                                    )}.</div>`
                                  : daySessions
                                      .map(
                                        (sess) => `
                                      <div class="schedule-class-card" style="border-left:4px solid ${
                                        sess.classType === "Laboratory"
                                          ? "#0891b2"
                                          : sess.classType === "Physical Education"
                                          ? "#16a34a"
                                          : "#2563eb"
                                      };">
                                        <div class="schedule-card-top" style="flex-wrap:wrap;gap:4px;">
                                          <span class="badge badge-info">${escapeHtml(
                                            sess.subjectCode
                                          )}</span>
                                          <span class="schedule-room-pill">${escapeHtml(
                                            sess.canonicalRoom || sess.room
                                          )}</span>
                                        </div>
                                        <div class="schedule-card-title">${escapeHtml(
                                          sess.displaySubject
                                        )}</div>
                                        <div class="schedule-card-time">${escapeHtml(
                                          sess.timeLabel
                                        )}</div>
                                        <div style="display:flex;gap:4px;flex-wrap:wrap;margin:5px 0;">
                                          ${renderClassTypeBadge(sess.classType)}
                                          ${renderScheduleOriginBadge(sess)}
                                        </div>
                                        <div class="schedule-card-meta">
                                          <span><strong>Prof:</strong> ${escapeHtml(
                                            sess.instructor
                                          )}</span>
                                          <span><strong>Sec:</strong> ${escapeHtml(
                                            sess.section
                                          )} (${escapeHtml(sess.yearLevel)})</span>
                                        </div>
                                      </div>
                                    `
                                      )
                                      .join("")
                              }
                            </div>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                `
                  : ""
              }

              ${
                facMasterSubView === "both" || facMasterSubView === "table"
                  ? `
                  <!-- Master Schedule Complete Table View -->
                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Professor</th>
                          <th>Subject Code &amp; Name</th>
                          <th>Section &amp; Year Level</th>
                          <th>Day</th>
                          <th>Start &ndash; End Time</th>
                          <th>Room / Lab</th>
                          <th>Class Type &amp; Source</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${filteredMasterSessions
                          .map(
                            (sess) => `
                            <tr>
                              <td>
                                <strong>${escapeHtml(sess.instructor)}</strong>
                                <div style="font-size:0.74rem;color:var(--text-secondary);">${escapeHtml(
                                  sess.facultyId || ""
                                )}</div>
                              </td>
                              <td>
                                <strong>${escapeHtml(sess.subjectCode)}</strong> &mdash; ${escapeHtml(
                              sess.courseCode
                            )}
                                <div style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(
                                  sess.subjectName
                                )}</div>
                              </td>
                              <td>
                                <span class="badge badge-primary">${escapeHtml(
                                  sess.section
                                )}</span>
                                <span class="badge badge-neutral" style="margin-left:4px;">${escapeHtml(
                                  sess.yearLevel
                                )}</span>
                              </td>
                              <td><strong>${escapeHtml(sess.day)}</strong></td>
                              <td>
                                <span class="badge badge-info">${escapeHtml(
                                  sess.timeLabel
                                )}</span>
                                <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px;">${escapeHtml(
                                  sess.startTime
                                )} &ndash; ${escapeHtml(sess.endTime)}</div>
                              </td>
                              <td>
                                <strong>${escapeHtml(sess.canonicalRoom || sess.room)}</strong>
                                ${
                                  sess.canonicalRoom && sess.canonicalRoom !== sess.room
                                    ? `<div style="font-size:0.72rem;color:var(--text-secondary);">Code: ${escapeHtml(
                                        sess.room
                                      )}</div>`
                                    : ""
                                }
                              </td>
                              <td>
                                <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;">
                                  ${renderClassTypeBadge(sess.classType)}
                                  ${renderScheduleOriginBadge(sess)}
                                </div>
                              </td>
                              <td>
                                <div class="table-actions">
                                  <button type="button" class="btn btn-sm btn-secondary fac-inspect-prof-btn" data-prof="${escapeHtml(
                                    sess.instructor
                                  )}">View Prof</button>
                                  ${
                                    (sess.isCustomDbSchedule || sess.isCustomSchedule) && sess.scheduleId
                                      ? `<button type="button" class="btn btn-sm btn-danger fac-delete-sched-btn" data-sched-id="${escapeHtml(
                                          String(sess.scheduleId)
                                        )}" data-sched-label="${escapeHtml(
                                          `${sess.subjectCode} (${sess.section}) — ${sess.day} ${sess.timeLabel}`
                                        )}">Delete</button>`
                                      : ""
                                  }
                                </div>
                              </td>
                            </tr>
                          `
                          )
                          .join("")}
                      </tbody>
                    </table>
                  </div>
                `
                  : ""
              }
            `
          }
        </div>
      `
      }

      <!-- Enrolled BSIT 2-2 Student Roster (With Year 1–Year 4 Filter & Validation) -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">BSIT 2-2 Enrolled Student Records</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:2px;">
              Student records strictly support academic year levels <strong>Year 1</strong> to <strong>Year 4</strong>.
            </p>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <select id="facRosterYearFilterSelect" class="form-control" style="max-width:190px;" aria-label="Filter Roster by Year Level">
              <option value="All" ${rosterYearFilter === "All" ? "selected" : ""}>All Year Levels (${
      roster.length
    })</option>
              ${validYears
                .map(
                  (yr) =>
                    `<option value="${yr}" ${
                      rosterYearFilter === yr ? "selected" : ""
                    }>${yr}</option>`
                )
                .join("")}
            </select>
            <span class="badge badge-success">${filteredRoster.length} Students Shown</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Full Name</th>
                <th>Year Level</th>
                <th>Section</th>
                <th>Email Address</th>
                <th>Enrollment Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                filteredRoster.length === 0
                  ? `<tr><td colspan="7" style="text-align:center;padding:20px;">No students enrolled in ${escapeHtml(
                      rosterYearFilter
                    )}.</td></tr>`
                  : filteredRoster
                      .map(
                        (st) => `
                      <tr>
                        <td><strong>${escapeHtml(st.studentNumber)}</strong></td>
                        <td>
                          <strong>${escapeHtml(st.fullName)}</strong>
                          ${
                            st.isPrimaryDemoStudent
                              ? `<span class="badge badge-primary" style="margin-left:6px;">Synced Student Account</span>`
                              : ""
                          }
                        </td>
                        <td><span class="badge badge-info">${escapeHtml(
                          StudentHubStorage.normalizeYearLevel(st.yearLevel, "Year 2")
                        )}</span></td>
                        <td>${escapeHtml(st.section)}</td>
                        <td>${escapeHtml(st.email)}</td>
                        <td><span class="badge badge-success">${escapeHtml(st.status)}</span></td>
                        <td>
                          <button
                            type="button"
                            class="btn btn-sm btn-secondary fac-edit-student-year-btn"
                            data-student-no="${escapeHtml(st.studentNumber)}"
                          >
                            Edit Year Level
                          </button>
                        </td>
                      </tr>
                    `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Scope switcher events
    const personalBtn = document.getElementById("facScopePersonalBtn");
    if (personalBtn) {
      personalBtn.addEventListener("click", () => {
        facSchedScope = "personal";
        renderClasses();
      });
    }
    const masterBtn = document.getElementById("facScopeMasterBtn");
    if (masterBtn) {
      masterBtn.addEventListener("click", () => {
        facSchedScope = "master";
        renderClasses();
      });
    }
    const addSchedBtn = document.getElementById("facOpenAddScheduleModalBtn");
    if (addSchedBtn) {
      addSchedBtn.addEventListener("click", () => {
        openAddScheduleSessionModal();
      });
    }

    const switchSelect = document.getElementById("facultyClassesAccountSelect");
    if (switchSelect) {
      switchSelect.addEventListener("change", (e) => {
        switchFacultyAccount(e.target.value);
      });
    }

    // Personal schedule filter listeners
    container.querySelectorAll("[data-pview]").forEach((btn) => {
      btn.addEventListener("click", () => {
        facPersonalViewMode = btn.getAttribute("data-pview") || "both";
        renderClasses();
      });
    });

    const pSearchEl = document.getElementById("facPersonalSearchInput");
    if (pSearchEl) {
      pSearchEl.addEventListener("input", (e) => {
        facPersonalSearch = e.target.value;
        renderClasses();
        const restored = document.getElementById("facPersonalSearchInput");
        if (restored) {
          restored.focus();
          restored.setSelectionRange(restored.value.length, restored.value.length);
        }
      });
    }
    const pDayEl = document.getElementById("facPersonalDayFilterSelect");
    if (pDayEl) {
      pDayEl.addEventListener("change", (e) => {
        facPersonalDayFilter = e.target.value;
        renderClasses();
      });
    }
    const pSubEl = document.getElementById("facPersonalSubjectFilterSelect");
    if (pSubEl) {
      pSubEl.addEventListener("change", (e) => {
        facPersonalSubjectFilter = e.target.value;
        renderClasses();
      });
    }
    const pSecEl = document.getElementById("facPersonalSectionFilterSelect");
    if (pSecEl) {
      pSecEl.addEventListener("change", (e) => {
        facPersonalSectionFilter = e.target.value;
        renderClasses();
      });
    }
    const pRoomEl = document.getElementById("facPersonalRoomFilterSelect");
    if (pRoomEl) {
      pRoomEl.addEventListener("change", (e) => {
        facPersonalRoomFilter = e.target.value;
        renderClasses();
      });
    }
    const pTypeEl = document.getElementById("facPersonalTypeFilterSelect");
    if (pTypeEl) {
      pTypeEl.addEventListener("change", (e) => {
        facPersonalTypeFilter = e.target.value;
        renderClasses();
      });
    }
    const resetPersonalFilters = () => {
      facPersonalSearch = "";
      facPersonalDayFilter = "All";
      facPersonalRoomFilter = "All";
      facPersonalSubjectFilter = "All";
      facPersonalSectionFilter = "All";
      facPersonalTypeFilter = "All";
      renderClasses();
    };
    const clearPBtn = document.getElementById("facClearPersonalFiltersBtn");
    if (clearPBtn) clearPBtn.addEventListener("click", resetPersonalFilters);
    const emptyPBtn = document.getElementById("facResetPersonalEmptyBtn");
    if (emptyPBtn) emptyPBtn.addEventListener("click", resetPersonalFilters);

    // Master schedule subview & filter listeners
    container.querySelectorAll("[data-msubview]").forEach((btn) => {
      btn.addEventListener("click", () => {
        facMasterSubView = btn.getAttribute("data-msubview") || "both";
        renderClasses();
      });
    });

    const mSearchEl = document.getElementById("facMasterSearchInput");
    if (mSearchEl) {
      mSearchEl.addEventListener("input", (e) => {
        facMasterSearch = e.target.value;
        renderClasses();
        const restored = document.getElementById("facMasterSearchInput");
        if (restored) {
          restored.focus();
          restored.setSelectionRange(restored.value.length, restored.value.length);
        }
      });
    }
    const mProfEl = document.getElementById("facMasterProfFilterSelect");
    if (mProfEl) {
      mProfEl.addEventListener("change", (e) => {
        facMasterProfFilter = e.target.value;
        renderClasses();
      });
    }
    const mSubEl = document.getElementById("facMasterSubjectFilterSelect");
    if (mSubEl) {
      mSubEl.addEventListener("change", (e) => {
        facMasterSubjectFilter = e.target.value;
        renderClasses();
      });
    }
    const mSecEl = document.getElementById("facMasterSectionFilterSelect");
    if (mSecEl) {
      mSecEl.addEventListener("change", (e) => {
        facMasterSectionFilter = e.target.value;
        renderClasses();
      });
    }
    const mYearEl = document.getElementById("facMasterYearFilterSelect");
    if (mYearEl) {
      mYearEl.addEventListener("change", (e) => {
        facMasterYearFilter = e.target.value;
        renderClasses();
      });
    }
    const mDayEl = document.getElementById("facMasterDayFilterSelect");
    if (mDayEl) {
      mDayEl.addEventListener("change", (e) => {
        facMasterDayFilter = e.target.value;
        renderClasses();
      });
    }
    const mRoomEl = document.getElementById("facMasterRoomFilterSelect");
    if (mRoomEl) {
      mRoomEl.addEventListener("change", (e) => {
        facMasterRoomFilter = e.target.value;
        renderClasses();
      });
    }
    const mTypeEl = document.getElementById("facMasterTypeFilterSelect");
    if (mTypeEl) {
      mTypeEl.addEventListener("change", (e) => {
        facMasterTypeFilter = e.target.value;
        renderClasses();
      });
    }
    const resetMasterFilters = () => {
      facMasterSearch = "";
      facMasterProfFilter = "All";
      facMasterSubjectFilter = "All";
      facMasterSectionFilter = "All";
      facMasterYearFilter = "All";
      facMasterDayFilter = "All";
      facMasterRoomFilter = "All";
      facMasterTypeFilter = "All";
      renderClasses();
    };
    const clearMBtn = document.getElementById("facClearMasterFiltersBtn");
    if (clearMBtn) clearMBtn.addEventListener("click", resetMasterFilters);
    const emptyMBtn = document.getElementById("facResetMasterEmptyBtn");
    if (emptyMBtn) emptyMBtn.addEventListener("click", resetMasterFilters);

    container.querySelectorAll(".fac-inspect-prof-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const profName = btn.getAttribute("data-prof");
        if (profName) {
          switchFacultyAccount(profName);
          facSchedScope = "personal";
          renderClasses();
        }
      });
    });

    container.querySelectorAll(".fac-delete-sched-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!requireRole("faculty", "delete faculty schedule session")) return;
        const schedId = btn.getAttribute("data-sched-id");
        const schedLabel = btn.getAttribute("data-sched-label") || `Schedule #${schedId}`;
        if (!schedId) return;

        const ok = await confirmDialog({
          title: "Delete Custom Schedule Session",
          message: `Are you sure you want to permanently remove "${schedLabel}" from the MySQL database?`,
          confirmText: "Delete Schedule",
          danger: true
        });
        if (!ok) return;

        const result = await StudentHubStorage.deleteScheduleSessionInDatabase(schedId);
        if (!result.ok) {
          showToast(result.error || result.message || "Could not remove schedule entry.", "error");
          return;
        }
        showToast(result.message || "Schedule session deleted from MySQL.", "success");
        renderClasses();
      });
    });

    const yrFilterEl = document.getElementById("facRosterYearFilterSelect");
    if (yrFilterEl) {
      yrFilterEl.addEventListener("change", (e) => {
        rosterYearFilter = e.target.value;
        renderClasses();
      });
    }

    container.querySelectorAll(".fac-edit-student-year-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const studentNo = btn.getAttribute("data-student-no");
        const stRec = roster.find((r) => r.studentNumber === studentNo);
        if (stRec) openEditStudentYearModal(stRec);
      });
    });

    container.querySelectorAll(".fac-open-att-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedAttendanceSubjectCode = btn.getAttribute("data-code");
        navigateTo("faculty-attendance");
      });
    });

    container.querySelectorAll(".fac-open-grd-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedGradeSubjectCode = btn.getAttribute("data-code");
        navigateTo("faculty-grades");
      });
    });
  }

  /**
   * Modal to Add a New Faculty Schedule Session with Real-Time Conflict Validation & MySQL Persistence
   */
  function openAddScheduleSessionModal() {
    if (!requireRole("faculty", "create a faculty schedule entry")) return;
    const state = StudentHubStorage.getState();
    const fp = state.facultyProfile;
    const directory = state.facultyDirectory || [];
    const campusRooms = StudentHubStorage.CAMPUS_ROOMS_AND_FACILITIES || [];
    const universitySections = StudentHubStorage.UNIVERSITY_SECTIONS || [];
    const weekdays = StudentHubStorage.WEEKDAYS || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    openModal(
      "Add University Class Schedule Session (MySQL + Conflict Prevention)",
      `
        <form id="facAddScheduleSessionForm">
          <div style="padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:0.8rem;color:#1e40af;margin-bottom:14px;">
            <strong>Automatic Schedule Conflict Protection:</strong>
            This form validates against all existing MySQL schedule sessions to prevent (1) Professor time overlaps, (2) Classroom/Laboratory time overlaps, (3) Section time overlaps, (4) Invalid start/end times, and (5) Duplicate entries. Back-to-back classes (e.g., ending at 10:00 and starting at 10:00) are permitted.
          </div>

          <div id="facAddSchedConflictAlert" style="display:none;padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:0.82rem;color:#991b1b;margin-bottom:14px;"></div>

          <div class="form-grid">
            <div class="form-group">
              <label for="addSchedProfSelect">Assigned Professor</label>
              <select id="addSchedProfSelect" class="form-control" required>
                ${directory
                  .map(
                    (prof) =>
                      `<option value="${escapeHtml(prof.name)}" data-fac-id="${escapeHtml(
                        prof.facultyId
                      )}" ${
                        fp.fullName.toLowerCase() === prof.name.toLowerCase() ? "selected" : ""
                      }>${escapeHtml(prof.name)} (${escapeHtml(prof.facultyId)})</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="addSchedSectionSelect">Assigned Section &amp; Year Level</label>
              <select id="addSchedSectionSelect" class="form-control" required>
                ${universitySections
                  .map(
                    (sec) =>
                      `<option value="${escapeHtml(sec.section)}" data-year="${escapeHtml(
                        sec.yearLevel
                      )}">${escapeHtml(sec.section)} (${escapeHtml(sec.yearLevel)})</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="addSchedSubjectCode">Subject Code (e.g., T405)</label>
              <input type="text" id="addSchedSubjectCode" class="form-control" placeholder="e.g., T405" required />
            </div>
            <div class="form-group">
              <label for="addSchedCourseCode">Course Code (e.g., IT 415)</label>
              <input type="text" id="addSchedCourseCode" class="form-control" placeholder="e.g., IT 415" required />
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
              <label for="addSchedSubjectName">Full Subject Descriptive Title</label>
              <input type="text" id="addSchedSubjectName" class="form-control" placeholder="e.g., Enterprise Architecture and Cloud Operations" required />
            </div>
            <div class="form-group">
              <label for="addSchedDaySelect">Day of Week</label>
              <select id="addSchedDaySelect" class="form-control" required>
                ${weekdays.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="addSchedRoomSelect">Classroom / Laboratory / Facility</label>
              <select id="addSchedRoomSelect" class="form-control" required>
                ${campusRooms
                  .map(
                    (rm) =>
                      `<option value="${escapeHtml(rm.name)}">${escapeHtml(rm.name)} (${escapeHtml(
                        rm.category
                      )})</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="addSchedStartTime">Start Time (24h HH:MM)</label>
              <input type="time" id="addSchedStartTime" class="form-control" value="17:30" required />
            </div>
            <div class="form-group">
              <label for="addSchedEndTime">End Time (24h HH:MM)</label>
              <input type="time" id="addSchedEndTime" class="form-control" value="19:00" required />
            </div>
            <div class="form-group">
              <label for="addSchedClassType">Class Type</label>
              <select id="addSchedClassType" class="form-control" required>
                <option value="Lecture">Lecture</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Physical Education">Physical Education</option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancelAddSchedModalBtn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="submitAddSchedModalBtn">Validate &amp; Save to MySQL</button>
          </div>
        </form>
      `
    );

    const cancelBtn = document.getElementById("cancelAddSchedModalBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    const form = document.getElementById("facAddScheduleSessionForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById("facAddSchedConflictAlert");
        const submitBtn = document.getElementById("submitAddSchedModalBtn");
        if (alertBox) {
          alertBox.style.display = "none";
          alertBox.textContent = "";
        }

        const profSelect = document.getElementById("addSchedProfSelect");
        const secSelect = document.getElementById("addSchedSectionSelect");
        const instructor = profSelect ? profSelect.value : fp.fullName;
        const facultyId =
          profSelect && profSelect.selectedOptions[0]
            ? profSelect.selectedOptions[0].getAttribute("data-fac-id")
            : fp.facultyId;
        const section = secSelect ? secSelect.value : "BSIT 4-2";
        const yearLevel =
          secSelect && secSelect.selectedOptions[0]
            ? secSelect.selectedOptions[0].getAttribute("data-year")
            : "Year 4";

        const payload = {
          facultyId,
          instructor,
          subjectCode: (document.getElementById("addSchedSubjectCode")?.value || "").trim().toUpperCase(),
          courseCode: (document.getElementById("addSchedCourseCode")?.value || "").trim(),
          subjectName: (document.getElementById("addSchedSubjectName")?.value || "").trim(),
          section,
          yearLevel,
          day: document.getElementById("addSchedDaySelect")?.value || "Monday",
          startTime: document.getElementById("addSchedStartTime")?.value || "",
          endTime: document.getElementById("addSchedEndTime")?.value || "",
          room: document.getElementById("addSchedRoomSelect")?.value || "Room 1",
          classType: document.getElementById("addSchedClassType")?.value || "Lecture",
          isSampleData: true,
        };

        if (submitBtn) submitBtn.disabled = true;
        const result = await StudentHubStorage.createScheduleSessionInDatabase(payload);
        if (submitBtn) submitBtn.disabled = false;

        if (!result.ok) {
          if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `<strong>Schedule Conflict / Validation Error:</strong> ${escapeHtml(
              result.message || "Unable to save schedule entry."
            )}`;
          }
          showToast(result.message || "Schedule conflict detected.", "danger");
          return;
        }

        closeModal();
        showToast(result.message || "Schedule session saved to MySQL!", "success");
        renderClasses();
      });
    }
  }

  /**
   * 4. FACULTY ATTENDANCE MANAGEMENT
   */
  function renderAttendance() {
    if (!requireRole("faculty", "manage class attendance")) return;
    const container = document.getElementById("facultyAttendanceContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const subjects = getFacultyGradeableSubjectsList(state);
    const roster = state.sectionRoster || [];

    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="section-header">
          <div class="section-header-info">
            <h2>BANTUG UNIVERSITY &mdash; Faculty Attendance Management</h2>
            <p>Instructor: <strong>${escapeHtml(state.facultyProfile.fullName)}</strong></p>
          </div>
        </div>
        <div class="card">
          <div class="empty-state">
            <h3>No Assigned Subjects for Attendance Recording</h3>
            <p>Professor <strong>${escapeHtml(
              state.facultyProfile.fullName
            )}</strong> currently has no assigned subjects for this term.</p>
            <button type="button" class="btn btn-primary" id="attGoClassesBtn">Go to My Classes &amp; Schedule</button>
          </div>
        </div>
      `;
      const btn = document.getElementById("attGoClassesBtn");
      if (btn) btn.addEventListener("click", () => navigateTo("faculty-classes"));
      return;
    }

    if (!subjects.some((s) => s.subjectCode === selectedAttendanceSubjectCode) && subjects[0]) {
      selectedAttendanceSubjectCode = subjects[0].subjectCode;
    }

    const activeSubject =
      subjects.find((s) => s.subjectCode === selectedAttendanceSubjectCode) || subjects[0];

    // Check existing faculty attendance log for this subjectCode + date
    const existingSession = (state.facultyAttendanceLogs || []).find(
      (log) =>
        log.subjectCode === selectedAttendanceSubjectCode && log.date === selectedAttendanceDate
    );

    // Also check if primary student has an attendance record on that date for this subject
    const demoStudent = roster.find((r) => r.isPrimaryDemoStudent);
    const existingDemoRecord =
      demoStudent &&
      (state.attendance || []).find(
        (a) =>
          a.date === selectedAttendanceDate &&
          (a.subjectCode === selectedAttendanceSubjectCode ||
            (a.subject && a.subject.startsWith(selectedAttendanceSubjectCode)))
      );

    const studentStatuses = {};
    roster.forEach((st) => {
      if (existingSession && existingSession.records && existingSession.records[st.studentNumber]) {
        studentStatuses[st.studentNumber] = existingSession.records[st.studentNumber];
      } else if (st.isPrimaryDemoStudent && existingDemoRecord) {
        studentStatuses[st.studentNumber] = existingDemoRecord.status;
      } else {
        studentStatuses[st.studentNumber] = "Present";
      }
    });

    // Summary across all faculty attendance logs for this subject
    const subjectLogs = (state.facultyAttendanceLogs || [])
      .filter((l) => l.subjectCode === selectedAttendanceSubjectCode)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    subjectLogs.forEach((l) => {
      Object.values(l.records || {}).forEach((val) => {
        if (val === "Present") totalPresent++;
        else if (val === "Late") totalLate++;
        else if (val === "Absent") totalAbsent++;
      });
    });

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Faculty Attendance Management</h2>
          <p>Select an assigned BSIT 2-2 subject and class date to mark students Present, Late, or Absent. Updates automatically synchronize with the Student Portal.</p>
        </div>
      </div>

      <!-- Subject & Date Selector Toolbar -->
      <div class="toolbar-row">
        <div class="toolbar-group">
          <div style="flex:1;min-width:260px;">
            <label class="form-label" for="facAttSubjectSelect">Assigned Subject (BSIT 2-2)</label>
            <select id="facAttSubjectSelect" class="form-control">
              ${subjects
                .map(
                  (s) =>
                    `<option value="${escapeHtml(s.subjectCode)}" ${
                      s.subjectCode === selectedAttendanceSubjectCode ? "selected" : ""
                    }>${escapeHtml(s.subjectCode)} (${escapeHtml(
                      s.courseCode || ""
                    )}) - ${escapeHtml(s.subjectName)} [${escapeHtml(s.instructor)}]</option>`
                )
                .join("")}
            </select>
          </div>

          <div>
            <label class="form-label" for="facAttDateInput">Class Date</label>
            <input
              type="date"
              id="facAttDateInput"
              class="form-control"
              value="${escapeHtml(selectedAttendanceDate)}"
            />
          </div>

          <div style="align-self:flex-end;">
            <button type="button" class="btn btn-secondary" id="facMarkAllPresentBtn">
              Mark All Present
            </button>
          </div>
        </div>
      </div>

      <!-- Attendance Summary Cards for Selected Subject -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Recorded Sessions</span>
            <span class="stat-value">${subjectLogs.length}</span>
            <span class="stat-sub">${escapeHtml(
              activeSubject ? `${activeSubject.subjectCode} (${activeSubject.courseCode})` : ""
            )}</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Total Present Marks</span>
            <span class="stat-value">${totalPresent}</span>
            <span class="stat-sub">BSIT 2-2 Roster</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Total Late Marks</span>
            <span class="stat-value">${totalLate}</span>
            <span class="stat-sub">BSIT 2-2 Roster</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Total Absent Marks</span>
            <span class="stat-value">${totalAbsent}</span>
            <span class="stat-sub">BSIT 2-2 Roster</span>
          </div>
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
        </div>
      </div>

      <!-- Class Roll Call Sheet -->
      <div class="card" style="margin-bottom:22px;">
        <div class="card-header">
          <h3 class="card-title">
            <span>BSIT 2-2 Attendance Roll Call &mdash; ${escapeHtml(
              activeSubject ? `${activeSubject.subjectCode} (${activeSubject.courseCode})` : ""
            )}</span>
            <span class="badge ${existingSession ? "badge-success" : "badge-warning"}">
              ${
                existingSession
                  ? "Recorded Session (" + formatReadableDate(selectedAttendanceDate) + ")"
                  : "New Roll Call (" + formatReadableDate(selectedAttendanceDate) + ")"
              }
            </span>
          </h3>
        </div>

        <form id="facultyRollCallForm">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Student Number</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>Attendance Status (${escapeHtml(formatReadableDate(selectedAttendanceDate))})</th>
                </tr>
              </thead>
              <tbody>
                ${roster
                  .map((st) => {
                    const currSt = studentStatuses[st.studentNumber];
                    return `
                      <tr>
                        <td><strong>${escapeHtml(st.studentNumber)}</strong></td>
                        <td>
                          <strong>${escapeHtml(st.fullName)}</strong>
                          ${
                            st.isPrimaryDemoStudent
                              ? `<span class="badge badge-primary" style="margin-left:6px;">Synced to Student Portal</span>`
                              : ""
                          }
                        </td>
                        <td>${escapeHtml(st.section)}</td>
                        <td>
                          <select
                            name="att_${escapeHtml(st.studentNumber)}"
                            class="form-control fac-att-select"
                            style="max-width:190px;"
                          >
                            <option value="Present" ${
                              currSt === "Present" ? "selected" : ""
                            }>Present</option>
                            <option value="Late" ${currSt === "Late" ? "selected" : ""}>Late</option>
                            <option value="Absent" ${
                              currSt === "Absent" ? "selected" : ""
                            }>Absent</option>
                          </select>
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="facAttRemarksInput">Session Notes / Remarks (Synced to Student Record)</label>
            <input
              type="text"
              id="facAttRemarksInput"
              name="sessionRemarks"
              class="form-control"
              placeholder="e.g. Recorded by Faculty — Laboratory / Lecture session"
              value="${escapeHtml(
                existingDemoRecord
                  ? existingDemoRecord.remarks
                  : selectedAttendanceRemarks ||
                      `Recorded by Faculty (${activeSubject ? activeSubject.instructor : "Instructor"})`
              )}"
            />
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn btn-primary">
              Save / Update Class Attendance for ${escapeHtml(formatReadableDate(selectedAttendanceDate))}
            </button>
          </div>
        </form>
      </div>

      <!-- Recorded Attendance Sessions History for Selected Subject -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recorded Attendance Sessions (${escapeHtml(
            selectedAttendanceSubjectCode
          )})</h3>
          <span class="badge badge-info">${subjectLogs.length} Sessions</span>
        </div>

        ${
          subjectLogs.length === 0
            ? `<div class="empty-state" style="padding:20px;"><p>No attendance sessions recorded yet for ${escapeHtml(
                selectedAttendanceSubjectCode
              )}.</p></div>`
            : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Session Date</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Primary Student (2025-BSIT-0202)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${subjectLogs
                    .map((log) => {
                      const vals = Object.values(log.records || {});
                      const pCount = vals.filter((v) => v === "Present").length;
                      const lCount = vals.filter((v) => v === "Late").length;
                      const aCount = vals.filter((v) => v === "Absent").length;
                      const demoSt = (log.records && log.records["2025-BSIT-0202"]) || "Present";
                      return `
                        <tr>
                          <td><strong>${escapeHtml(formatReadableDate(log.date))}</strong></td>
                          <td>${pCount}</td>
                          <td>${lCount}</td>
                          <td>${aCount}</td>
                          <td><span class="badge ${
                            demoSt === "Present"
                              ? "badge-success"
                              : demoSt === "Late"
                              ? "badge-warning"
                              : "badge-danger"
                          }">${escapeHtml(demoSt)}</span></td>
                          <td>
                            <button type="button" class="btn btn-sm btn-secondary load-att-date-btn" data-date="${escapeHtml(
                              log.date
                            )}">Load &amp; Edit</button>
                          </td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          `
        }
      </div>
    `;

    const subSel = document.getElementById("facAttSubjectSelect");
    if (subSel) {
      subSel.addEventListener("change", (e) => {
        selectedAttendanceSubjectCode = e.target.value;
        selectedAttendanceRemarks = "";
        renderAttendance();
      });
    }

    const dateInp = document.getElementById("facAttDateInput");
    if (dateInp) {
      dateInp.addEventListener("change", (e) => {
        if (e.target.value) {
          selectedAttendanceDate = e.target.value;
          selectedAttendanceRemarks = "";
          renderAttendance();
        }
      });
    }

    container.querySelectorAll(".load-att-date-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedAttendanceDate = btn.getAttribute("data-date");
        renderAttendance();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    const markAllBtn = document.getElementById("facMarkAllPresentBtn");
    if (markAllBtn) {
      markAllBtn.addEventListener("click", () => {
        container.querySelectorAll(".fac-att-select").forEach((sel) => {
          sel.value = "Present";
        });
        showToast("Marked all BSIT 2-2 students as Present. Click Save to persist.", "info");
      });
    }

    const form = document.getElementById("facultyRollCallForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!requireRole("faculty", "record or update attendance")) return;

        const fd = new FormData(form);
        const records = {};
        roster.forEach((st) => {
          records[st.studentNumber] = String(fd.get(`att_${st.studentNumber}`) || "Present");
        });
        const sessionRemarks =
          String(fd.get("sessionRemarks") || "").trim() ||
          `Recorded by Faculty (${activeSubject ? activeSubject.instructor : "Instructor"})`;

        const currState = StudentHubStorage.getState();
        const idx = currState.facultyAttendanceLogs.findIndex(
          (l) =>
            l.subjectCode === selectedAttendanceSubjectCode && l.date === selectedAttendanceDate
        );

        const logEntry = {
          id:
            idx >= 0 ? currState.facultyAttendanceLogs[idx].id : StudentHubStorage.uid("facatt"),
          subjectCode: selectedAttendanceSubjectCode,
          date: selectedAttendanceDate,
          records
        };

        if (idx >= 0) {
          currState.facultyAttendanceLogs[idx] = logEntry;
        } else {
          currState.facultyAttendanceLogs.unshift(logEntry);
        }

        // Sync primary demo student's attendance into Student Portal `attendance`
        if (demoStudent && activeSubject) {
          const fullSubLabel = `${activeSubject.subjectCode} - ${activeSubject.courseCode} - ${activeSubject.subjectName}`;
          const demoStatus = records[demoStudent.studentNumber] || "Present";
          const existingStudentAttIdx = currState.attendance.findIndex(
            (a) =>
              a.date === selectedAttendanceDate &&
              (a.subjectCode === activeSubject.subjectCode ||
                (a.subject && a.subject.startsWith(activeSubject.subjectCode)))
          );
          if (existingStudentAttIdx >= 0) {
            currState.attendance[existingStudentAttIdx].subjectCode = activeSubject.subjectCode;
            currState.attendance[existingStudentAttIdx].subject = fullSubLabel;
            currState.attendance[existingStudentAttIdx].status = demoStatus;
            currState.attendance[existingStudentAttIdx].remarks = sessionRemarks;
          } else {
            currState.attendance.unshift({
              id: StudentHubStorage.uid("att"),
              studentNumber: demoStudent.studentNumber,
              subjectCode: activeSubject.subjectCode,
              subject: fullSubLabel,
              date: selectedAttendanceDate,
              status: demoStatus,
              remarks: sessionRemarks
            });
          }
        }

        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast(
          `Saved BSIT 2-2 attendance for ${selectedAttendanceSubjectCode} on ${formatReadableDate(
            selectedAttendanceDate
          )} (synced with Student Portal)!`,
          "success"
        );
      });
    }
  }

  /**
   * 5. FACULTY GRADE MANAGEMENT
   */
  function openComponentGradeModal(subjectObj) {
    if (!requireRole("faculty", "edit student component grades")) return;
    const state = StudentHubStorage.getState();
    const g =
      state.grades.find((item) => item.subjectCode === subjectObj.subjectCode) || subjectObj;
    const hasGrade = StudentHubStorage.hasRecordedGrade(g);

    const qVal = hasGrade ? g.quizzes : 90;
    const aVal = hasGrade ? g.assignments : 90;
    const actVal = hasGrade ? g.activities : 90;
    const pVal = hasGrade ? g.projects : 90;
    const exVal = hasGrade ? g.examinations : 90;

    const html = `
      <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:14px;">
        Enter detailed component scores (0–100) for <strong>${escapeHtml(
          state.profile.fullName || "Racel Valiente"
        )} (2025-BSIT-0202)</strong> in
        <strong>${escapeHtml(g.subjectCode)} — ${escapeHtml(g.courseCode)} (${escapeHtml(
      g.subjectName
    )})</strong>.
      </p>
      <form id="facComponentGradeForm" novalidate>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="fcQuizzes">Quizzes (${state.gradingWeights.quizzes}%) <span class="req">*</span></label>
            <input type="number" id="fcQuizzes" name="quizzes" class="form-control" min="0" max="100" step="0.1" value="${qVal}" />
            <div class="field-error" data-error-for="quizzes"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="fcAssign">Assignments (${state.gradingWeights.assignments}%) <span class="req">*</span></label>
            <input type="number" id="fcAssign" name="assignments" class="form-control" min="0" max="100" step="0.1" value="${aVal}" />
            <div class="field-error" data-error-for="assignments"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="fcAct">Activities (${state.gradingWeights.activities}%) <span class="req">*</span></label>
            <input type="number" id="fcAct" name="activities" class="form-control" min="0" max="100" step="0.1" value="${actVal}" />
            <div class="field-error" data-error-for="activities"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="fcProj">Projects (${state.gradingWeights.projects}%) <span class="req">*</span></label>
            <input type="number" id="fcProj" name="projects" class="form-control" min="0" max="100" step="0.1" value="${pVal}" />
            <div class="field-error" data-error-for="projects"></div>
          </div>
          <div class="form-group full-width">
            <label class="form-label" for="fcExam">Examinations (${state.gradingWeights.examinations}%) <span class="req">*</span></label>
            <input type="number" id="fcExam" name="examinations" class="form-control" min="0" max="100" step="0.1" value="${exVal}" />
            <div class="field-error" data-error-for="examinations"></div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="cancelCompModalBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Component Grades</button>
        </div>
      </form>
    `;

    openModal(`Detailed Component Grades — ${g.subjectCode}`, html, (bodyEl) => {
      bodyEl.querySelector("#cancelCompModalBtn").addEventListener("click", closeModal);
      const form = bodyEl.querySelector("#facComponentGradeForm");

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!requireRole("faculty", "save student grades")) return;
        clearFormErrors(form);

        const fd = new FormData(form);
        const comps = ["quizzes", "assignments", "activities", "projects", "examinations"];
        const scores = {};
        let valid = true;

        comps.forEach((c) => {
          const raw = fd.get(c);
          const num = Number(raw);
          if (raw === "" || raw === null || isNaN(num) || num < 0 || num > 100) {
            setFieldError(form, c, "Enter a score between 0 and 100.");
            valid = false;
          } else {
            scores[c] = num;
          }
        });

        if (!valid) return;

        const currState = StudentHubStorage.getState();
        currState.grades = currState.grades.map((item) =>
          item.subjectCode === g.subjectCode ? { ...item, ...scores } : item
        );

        const updatedRecord = currState.grades.find((item) => item.subjectCode === g.subjectCode);
        const computedAvg = StudentHubStorage.computeSubjectAverage(
          updatedRecord,
          currState.gradingWeights
        );

        if (!currState.facultyGrades) currState.facultyGrades = {};
        if (!currState.facultyGrades[g.subjectCode]) currState.facultyGrades[g.subjectCode] = {};
        currState.facultyGrades[g.subjectCode]["2025-BSIT-0202"] = computedAvg;

        StudentHubStorage.saveState(currState);
        closeModal();
        refreshAll();
        showToast(
          `Updated component grades for 2025-BSIT-0202 in ${g.subjectCode} (${computedAvg.toFixed(
            2
          )}%)!`,
          "success"
        );
      });
    });
  }

  function renderGrades() {
    if (!requireRole("faculty", "manage student grades")) return;
    const container = document.getElementById("facultyGradesContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const subjects = getFacultyGradeableSubjectsList(state);
    const roster = state.sectionRoster || [];

    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="section-header">
          <div class="section-header-info">
            <h2>BANTUG UNIVERSITY &mdash; Faculty Grade Management</h2>
            <p>Instructor: <strong>${escapeHtml(state.facultyProfile.fullName)}</strong></p>
          </div>
        </div>
        <div class="card">
          <div class="empty-state">
            <h3>No Assigned Subjects for Grade Encoding</h3>
            <p>Professor <strong>${escapeHtml(
              state.facultyProfile.fullName
            )}</strong> currently has no assigned subjects for this term.</p>
            <button type="button" class="btn btn-primary" id="grdGoClassesBtn">Go to My Classes &amp; Schedule</button>
          </div>
        </div>
      `;
      const btn = document.getElementById("grdGoClassesBtn");
      if (btn) btn.addEventListener("click", () => navigateTo("faculty-classes"));
      return;
    }

    if (!subjects.some((s) => s.subjectCode === selectedGradeSubjectCode) && subjects[0]) {
      selectedGradeSubjectCode = subjects[0].subjectCode;
    }

    const activeSubject =
      subjects.find((s) => s.subjectCode === selectedGradeSubjectCode) || subjects[0];

    const subGradeMap =
      (state.facultyGrades && state.facultyGrades[selectedGradeSubjectCode]) || {};

    // Check primary demo student's grade in `state.grades` so both stay synced
    const studentGradeObj = state.grades.find((g) => g.subjectCode === selectedGradeSubjectCode);
    const demoStudentAvg = studentGradeObj
      ? StudentHubStorage.computeSubjectAverage(studentGradeObj, state.gradingWeights)
      : null;

    let recordedCount = 0;
    let sumGrades = 0;
    let passingCount = 0;

    roster.forEach((st) => {
      let val = subGradeMap[st.studentNumber];
      if (st.isPrimaryDemoStudent && demoStudentAvg !== null) {
        val = demoStudentAvg;
      }
      if (val !== null && val !== undefined && val !== "") {
        const num = Number(val);
        if (!isNaN(num)) {
          recordedCount++;
          sumGrades += num;
          if (num >= 75) passingCount++;
        }
      }
    });

    const classAvg = recordedCount > 0 ? (sumGrades / recordedCount).toFixed(2) : null;

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Faculty Grade Management</h2>
          <p>Select an assigned BSIT 2-2 subject to enter, edit, or update student grades. All changes automatically synchronize with the Student Portal.</p>
        </div>
        <div class="section-header-actions">
          ${
            activeSubject
              ? `<button type="button" class="btn btn-secondary" id="openDetailedCompModalBtn">
                  Edit Component Breakdown (2025-BSIT-0202)
                </button>`
              : ""
          }
        </div>
      </div>

      <!-- Subject Selector -->
      <div class="toolbar-row">
        <div class="toolbar-group">
          <div style="flex:1;min-width:280px;">
            <label class="form-label" for="facGradeSubjectSelect">Select Assigned Subject (BSIT 2-2)</label>
            <select id="facGradeSubjectSelect" class="form-control">
              ${subjects
                .map(
                  (s) =>
                    `<option value="${escapeHtml(s.subjectCode)}" ${
                      s.subjectCode === selectedGradeSubjectCode ? "selected" : ""
                    }>${escapeHtml(s.subjectCode)} (${escapeHtml(
                      s.courseCode || ""
                    )}) - ${escapeHtml(s.subjectName)} [Instructor: ${escapeHtml(
                      s.instructor
                    )}]</option>`
                )
                .join("")}
            </select>
          </div>
        </div>
      </div>

      <!-- Class Grade Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Class Grade Average</span>
            <span class="stat-value" style="${
              classAvg === null ? "font-size:1.15rem;" : ""
            }">${classAvg !== null ? classAvg + "%" : "No grade recorded."}</span>
            <span class="stat-sub">${escapeHtml(
              activeSubject ? activeSubject.subjectCode : ""
            )} (${escapeHtml(activeSubject ? activeSubject.courseCode : "")})</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Students Graded</span>
            <span class="stat-value">${recordedCount} / ${roster.length}</span>
            <span class="stat-sub">${roster.length - recordedCount} ungraded</span>
          </div>
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Students Passing (&ge;75%)</span>
            <span class="stat-value">${passingCount}</span>
            <span class="stat-sub">Of ${recordedCount} graded students</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Assigned Instructor</span>
            <span class="stat-value" style="font-size:1.05rem;">${escapeHtml(
              activeSubject ? activeSubject.instructor : "Not specified"
            )}</span>
            <span class="stat-sub">Section BSIT 2-2</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
        </div>
      </div>

      <!-- Grade Entry Sheet -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            <span>BSIT 2-2 Grade Sheet &mdash; ${escapeHtml(
              activeSubject
                ? `${activeSubject.subjectCode} (${activeSubject.courseCode}) - ${activeSubject.subjectName}`
                : ""
            )}</span>
          </h3>
          <span class="badge badge-info">Faculty Grade Encoding</span>
        </div>

        <form id="facultyGradeSheetForm" novalidate>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Student Number</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>Current Recorded Grade</th>
                  <th>Enter / Update Grade (0–100)</th>
                </tr>
              </thead>
              <tbody>
                ${roster
                  .map((st) => {
                    let currentVal = subGradeMap[st.studentNumber];
                    if (st.isPrimaryDemoStudent && demoStudentAvg !== null) {
                      currentVal = demoStudentAvg;
                    }
                    const hasVal =
                      currentVal !== null && currentVal !== undefined && currentVal !== "";

                    return `
                      <tr>
                        <td><strong>${escapeHtml(st.studentNumber)}</strong></td>
                        <td>
                          <strong>${escapeHtml(st.fullName)}</strong>
                          ${
                            st.isPrimaryDemoStudent
                              ? `<span class="badge badge-primary" style="margin-left:6px;">Synced to Student Portal</span>`
                              : ""
                          }
                        </td>
                        <td>${escapeHtml(st.section)}</td>
                        <td>
                          ${
                            hasVal
                              ? `<span class="badge ${
                                  Number(currentVal) >= 75 ? "badge-success" : "badge-danger"
                                }">${Number(currentVal).toFixed(2)}%</span>`
                              : `<span class="badge badge-neutral">No grade recorded.</span>`
                          }
                        </td>
                        <td>
                          <input
                            type="number"
                            name="grd_${escapeHtml(st.studentNumber)}"
                            class="form-control"
                            style="max-width:200px;"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="No grade recorded."
                            value="${hasVal ? escapeHtml(currentVal) : ""}"
                          />
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>

          <div id="facGradeSheetError" class="field-error" style="margin-top:10px;"></div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline-danger" id="clearAllSubjectGradesBtn" style="margin-right:auto;">
              Clear Subject Grades ("No grade recorded.")
            </button>
            <button type="submit" class="btn btn-primary">
              Save &amp; Publish Grades for ${escapeHtml(selectedGradeSubjectCode)}
            </button>
          </div>
        </form>
      </div>
    `;

    const subSel = document.getElementById("facGradeSubjectSelect");
    if (subSel) {
      subSel.addEventListener("change", (e) => {
        selectedGradeSubjectCode = e.target.value;
        renderGrades();
      });
    }

    const compBtn = document.getElementById("openDetailedCompModalBtn");
    if (compBtn && activeSubject) {
      compBtn.addEventListener("click", () => openComponentGradeModal(activeSubject));
    }

    const clearAllBtn = document.getElementById("clearAllSubjectGradesBtn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => {
        if (!requireRole("faculty", "clear subject grades")) return;
        const currState = StudentHubStorage.getState();
        if (!currState.facultyGrades) currState.facultyGrades = {};
        currState.facultyGrades[selectedGradeSubjectCode] = {};

        currState.grades = currState.grades.map((g) =>
          g.subjectCode === selectedGradeSubjectCode
            ? {
                ...g,
                quizzes: null,
                assignments: null,
                activities: null,
                projects: null,
                examinations: null
              }
            : g
        );

        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast(
          `Cleared grades for ${selectedGradeSubjectCode}. Status is now "No grade recorded."`,
          "info"
        );
      });
    }

    const form = document.getElementById("facultyGradeSheetForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!requireRole("faculty", "save or update grades")) return;

        const errBox = document.getElementById("facGradeSheetError");
        if (errBox) errBox.textContent = "";

        const fd = new FormData(form);
        const newSubMap = {};
        let invalidFound = false;

        roster.forEach((st) => {
          const raw = String(fd.get(`grd_${st.studentNumber}`) || "").trim();
          const inputEl = form.querySelector(`[name="grd_${st.studentNumber}"]`);
          if (inputEl) inputEl.classList.remove("is-invalid");

          if (raw === "") {
            newSubMap[st.studentNumber] = null;
          } else {
            const num = Number(raw);
            if (isNaN(num) || num < 0 || num > 100) {
              invalidFound = true;
              if (inputEl) inputEl.classList.add("is-invalid");
            } else {
              newSubMap[st.studentNumber] = num;
            }
          }
        });

        if (invalidFound) {
          if (errBox) {
            errBox.textContent = "All entered grades must be valid numbers between 0 and 100.";
          }
          showToast("Please enter valid grades between 0 and 100.", "error");
          return;
        }

        const currState = StudentHubStorage.getState();
        if (!currState.facultyGrades) currState.facultyGrades = {};
        currState.facultyGrades[selectedGradeSubjectCode] = newSubMap;

        // Sync primary demo student's grade with Student Portal `grades`
        const demoStudent = roster.find((r) => r.isPrimaryDemoStudent);
        if (demoStudent) {
          const demoScore = newSubMap[demoStudent.studentNumber];
          currState.grades = currState.grades.map((g) => {
            if (g.subjectCode !== selectedGradeSubjectCode) return g;
            if (demoScore === null || demoScore === undefined) {
              return {
                ...g,
                quizzes: null,
                assignments: null,
                activities: null,
                projects: null,
                examinations: null
              };
            }
            return {
              ...g,
              quizzes: demoScore,
              assignments: demoScore,
              activities: demoScore,
              projects: demoScore,
              examinations: demoScore
            };
          });
        }

        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast(
          `Saved grades for ${selectedGradeSubjectCode} (synced with Student Portal)!`,
          "success"
        );
      });
    }
  }

  /**
   * 6. FACULTY ASSIGNMENT MANAGEMENT (Create, Publish, Edit, Delete Assignments)
   */
  function renderTasks() {
    if (!requireRole("faculty", "manage assignments")) return;
    const container = document.getElementById("facultyTasksContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const tasks = [...(state.tasks || [])].sort((a, b) =>
      (a.deadline || "").localeCompare(b.deadline || "")
    );
    const subjectOptions = StudentHubStorage.getSubjectList();
    const primaryStudentNo = state.profile.studentNumber || "2025-BSIT-0202";

    const openFacultyTaskModal = (existing = null) => {
      if (!requireRole("faculty", "create or edit assignments")) return;
      const isEdit = Boolean(existing);
      const defaultDeadline = StudentHubStorage.offsetDate(3);

      const item = existing || {
        title: "",
        subject: subjectOptions[0] || "T148 - IT 211 - Data Structures and Algorithms",
        deadline: defaultDeadline,
        priority: "High",
        description: ""
      };

      const html = `
        <form id="facTaskForm" novalidate>
          <div class="form-grid">
            <div class="form-group full-width">
              <label class="form-label" for="fTskTitle">Assignment / Task Title <span class="req">*</span></label>
              <input
                type="text"
                id="fTskTitle"
                name="title"
                class="form-control"
                placeholder="e.g. Binary Search Tree Implementation Lab"
                value="${escapeHtml(item.title)}"
              />
              <div class="field-error" data-error-for="title"></div>
            </div>

            <div class="form-group full-width">
              <label class="form-label" for="fTskSubject">Associated BSIT 2-2 Subject <span class="req">*</span></label>
              <select id="fTskSubject" name="subject" class="form-control">
                ${subjectOptions
                  .map(
                    (sub) =>
                      `<option value="${escapeHtml(sub)}" ${
                        item.subject === sub ? "selected" : ""
                      }>${escapeHtml(sub)}</option>`
                  )
                  .join("")}
              </select>
              <div class="field-error" data-error-for="subject"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fTskDeadline">Submission Deadline <span class="req">*</span></label>
              <input
                type="date"
                id="fTskDeadline"
                name="deadline"
                class="form-control"
                value="${escapeHtml(item.deadline)}"
              />
              <div class="field-error" data-error-for="deadline"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fTskPriority">Priority Level <span class="req">*</span></label>
              <select id="fTskPriority" name="priority" class="form-control">
                ${["High", "Medium", "Low"]
                  .map(
                    (p) =>
                      `<option value="${p}" ${item.priority === p ? "selected" : ""}>${p}</option>`
                  )
                  .join("")}
              </select>
            </div>

            <div class="form-group full-width">
              <label class="form-label" for="fTskDesc">Assignment Instructions &amp; Description <span class="req">*</span></label>
              <textarea
                id="fTskDesc"
                name="description"
                rows="4"
                class="form-control"
                placeholder="Provide clear assignment instructions, deliverables, and grading rubric notes..."
              >${escapeHtml(item.description || "")}</textarea>
              <div class="field-error" data-error-for="description"></div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancelFacTaskBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">${
              isEdit ? "Save Assignment Changes" : "Publish Assignment to Students"
            }</button>
          </div>
        </form>
      `;

      openModal(
        isEdit ? "Edit Published Assignment" : "Create & Publish New Assignment",
        html,
        (bodyEl) => {
          bodyEl.querySelector("#cancelFacTaskBtn").addEventListener("click", closeModal);
          const form = bodyEl.querySelector("#facTaskForm");

          form.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!requireRole("faculty", "publish or update assignments")) return;
            clearFormErrors(form);

            const fd = new FormData(form);
            const title = String(fd.get("title") || "").trim();
            const subject = String(fd.get("subject") || "").trim();
            const deadline = String(fd.get("deadline") || "").trim();
            const priority = String(fd.get("priority") || "Medium").trim();
            const description = String(fd.get("description") || "").trim();

            let valid = true;
            if (!title) {
              setFieldError(form, "title", "Assignment title is required.");
              valid = false;
            }
            if (!subject) {
              setFieldError(form, "subject", "Please select an associated subject.");
              valid = false;
            }
            if (!deadline || isNaN(new Date(deadline).getTime())) {
              setFieldError(form, "deadline", "Valid deadline date is required.");
              valid = false;
            }
            if (!description || description.length < 5) {
              setFieldError(form, "description", "Please provide assignment instructions.");
              valid = false;
            }

            if (!valid) return;

            const currState = StudentHubStorage.getState();
            const subjectCode = subject.split(" - ")[0] || "";

            if (isEdit) {
              currState.tasks = currState.tasks.map((t) =>
                t.id === existing.id
                  ? {
                      ...t,
                      title,
                      subjectCode,
                      subject,
                      deadline,
                      priority,
                      description
                    }
                  : t
              );
              showToast(`Assignment "${title}" updated!`, "success");
            } else {
              currState.tasks.unshift({
                id: StudentHubStorage.uid("tsk"),
                title,
                subjectCode,
                subject,
                instructor: currState.facultyProfile.fullName,
                publishedBy: currState.facultyProfile.fullName,
                deadline,
                priority,
                status: "Pending",
                description,
                submissions: {}
              });
              showToast(
                `Assignment "${title}" published to BSIT 2-2 Student Task Manager!`,
                "success"
              );
            }

            StudentHubStorage.saveState(currState);
            closeModal();
            refreshAll();
          });
        }
      );
    };

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Faculty Assignment Management</h2>
          <p>Create, publish, edit, and delete BSIT 2-2 academic assignments, and review student submission statuses.</p>
        </div>
        <div class="section-header-actions">
          <button type="button" class="btn btn-primary" id="facCreateTaskBtn">
            + Create &amp; Publish Assignment
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Published Assignments &amp; Student Submissions (BSIT 2-2)</h3>
          <span class="badge badge-primary">${tasks.length} Assignments</span>
        </div>

        ${
          tasks.length === 0
            ? `<div class="empty-state"><p>No assignments published yet.</p></div>`
            : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Assignment Title &amp; Instructions</th>
                    <th>Associated Subject</th>
                    <th>Deadline</th>
                    <th>Student Status (${escapeHtml(primaryStudentNo)})</th>
                    <th>Submitted Response</th>
                    <th>Faculty Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${tasks
                    .map((t) => {
                      const sub = t.submissions && t.submissions[primaryStudentNo];
                      const stBadge =
                        t.status === "Completed"
                          ? "badge-success"
                          : t.status === "Submitted"
                          ? "badge-info"
                          : t.status === "Overdue"
                          ? "badge-danger"
                          : "badge-warning";
                      return `
                        <tr>
                          <td>
                            <div><strong>${escapeHtml(t.title)}</strong></div>
                            <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">
                              ${escapeHtml(t.description)}
                            </div>
                          </td>
                          <td><span class="badge badge-primary">${escapeHtml(t.subject)}</span></td>
                          <td><strong>${escapeHtml(formatReadableDate(t.deadline))}</strong></td>
                          <td><span class="badge ${stBadge}">${escapeHtml(t.status)}</span></td>
                          <td>
                            ${
                              sub && sub.responseText
                                ? `<div style="font-size:0.79rem;color:var(--text-main);">
                                    "${escapeHtml(sub.responseText)}"
                                    <div style="font-size:0.72rem;color:var(--text-muted);">Submitted: ${escapeHtml(
                                      formatReadableDate(sub.submittedAt)
                                    )}</div>
                                   </div>`
                                : `<span style="font-size:0.78rem;color:var(--text-muted);">No submission recorded</span>`
                            }
                          </td>
                          <td>
                            <div class="table-actions">
                              <button type="button" class="btn btn-sm btn-secondary fac-edit-task-btn" data-id="${escapeHtml(
                                t.id
                              )}">Edit</button>
                              <button type="button" class="btn btn-sm btn-outline-danger fac-del-task-btn" data-id="${escapeHtml(
                                t.id
                              )}">Delete</button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          `
        }
      </div>
    `;

    const createBtn = document.getElementById("facCreateTaskBtn");
    if (createBtn) createBtn.addEventListener("click", () => openFacultyTaskModal(null));

    container.querySelectorAll(".fac-edit-task-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const target = state.tasks.find((t) => t.id === id);
        if (target) openFacultyTaskModal(target);
      });
    });

    container.querySelectorAll(".fac-del-task-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!requireRole("faculty", "delete assignments")) return;
        const id = btn.getAttribute("data-id");
        const target = state.tasks.find((t) => t.id === id);
        if (!target) return;

        const confirmed = await confirmDialog({
          title: "Delete Published Assignment",
          message: `Remove assignment "${target.title}" from the portal?`,
          confirmText: "Delete Assignment",
          danger: true
        });

        if (confirmed) {
          const currState = StudentHubStorage.getState();
          currState.tasks = currState.tasks.filter((t) => t.id !== id);
          StudentHubStorage.saveState(currState);
          refreshAll();
          showToast(`Deleted assignment "${target.title}".`, "info");
        }
      });
    });
  }

  /**
   * 7. FACULTY ANNOUNCEMENTS
   */
  function renderAnnouncements() {
    if (!requireRole("faculty", "manage announcements")) return;
    const container = document.getElementById("facultyAnnouncementsContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const announcements = [...(state.announcements || [])].sort((a, b) =>
      (b.date || "").localeCompare(a.date || "")
    );

    const openFacultyAnnModal = (existing = null) => {
      if (!requireRole("faculty", "create or edit announcements")) return;
      const isEdit = Boolean(existing);
      const todayStr = StudentHubStorage.formatLocalDate(new Date());
      const activeFacultyId =
        (state.facultyProfile &&
          (state.facultyProfile.facultyNumber || state.facultyProfile.facultyId)) ||
        "FAC-2026-0101";
      const item = existing || {
        title: "",
        category: "Academic",
        date: todayStr,
        author: `${state.facultyProfile.fullName} • ${state.facultyProfile.department}`,
        facultyId: activeFacultyId,
        targetAudience: "All BSIT Students",
        description: "",
        published: true
      };

      const audienceOptions = [
        "All BSIT Students",
        "BSIT 2-2",
        "Year 1 BSIT",
        "Year 2 BSIT",
        "Year 3 BSIT",
        "Year 4 BSIT"
      ];

      const html = `
        <form id="facAnnForm" novalidate>
          <div class="form-grid">
            <div class="form-group full-width">
              <label class="form-label" for="fAnnTitle">Announcement Title <span class="req">*</span></label>
              <input type="text" id="fAnnTitle" name="title" class="form-control" placeholder="e.g. BSIT 2-2 Quiz & Laboratory Schedule Advisory" value="${escapeHtml(
                item.title
              )}" />
              <div class="field-error" data-error-for="title"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fAnnCat">Category <span class="req">*</span></label>
              <select id="fAnnCat" name="category" class="form-control">
                ${[
                  "Academic",
                  "Class Advisory",
                  "Examination",
                  "Events",
                  "Campus Notice",
                  "Scholarship",
                  "Emergency"
                ]
                  .map(
                    (c) => `<option value="${c}" ${item.category === c ? "selected" : ""}>${c}</option>`
                  )
                  .join("")}
              </select>
              <div class="field-error" data-error-for="category"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fAnnDate">Publication Date <span class="req">*</span></label>
              <input type="date" id="fAnnDate" name="date" class="form-control" value="${escapeHtml(
                item.date
              )}" />
              <div class="field-error" data-error-for="date"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fAnnAuthor">Published By (Author) <span class="req">*</span></label>
              <input type="text" id="fAnnAuthor" name="author" class="form-control" value="${escapeHtml(
                item.author
              )}" />
              <div class="field-error" data-error-for="author"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fAnnTargetAudience">Target Audience <span class="req">*</span></label>
              <select id="fAnnTargetAudience" name="targetAudience" class="form-control">
                ${audienceOptions
                  .map(
                    (aud) =>
                      `<option value="${escapeHtml(aud)}" ${
                        (item.targetAudience || "All BSIT Students") === aud ? "selected" : ""
                      }>${escapeHtml(aud)}</option>`
                  )
                  .join("")}
              </select>
              <div class="field-error" data-error-for="targetAudience"></div>
            </div>

            <div class="form-group full-width">
              <label class="form-label" for="fAnnPublished">Publication Status <span class="req">*</span></label>
              <select id="fAnnPublished" name="published" class="form-control">
                <option value="true" ${
                  item.published !== false ? "selected" : ""
                }>Published (Visible to Students)</option>
                <option value="false" ${
                  item.published === false ? "selected" : ""
                }>Unpublished / Draft (Hidden from Students)</option>
              </select>
            </div>

            <div class="form-group full-width">
              <label class="form-label" for="fAnnDesc">Announcement Content / Description <span class="req">*</span></label>
              <textarea id="fAnnDesc" name="description" rows="4" class="form-control" placeholder="Write the complete announcement description for BSIT students...">${escapeHtml(
                item.description
              )}</textarea>
              <div class="field-error" data-error-for="description"></div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancelFacAnnBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">${
              isEdit ? "Update Announcement in MySQL" : "Publish Announcement to MySQL"
            }</button>
          </div>
        </form>
      `;

      openModal(
        isEdit ? "Edit Faculty Announcement" : "Create & Publish Faculty Announcement",
        html,
        (bodyEl) => {
          bodyEl.querySelector("#cancelFacAnnBtn").addEventListener("click", closeModal);
          const form = bodyEl.querySelector("#facAnnForm");
          let isSavingAnn = false;

          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (isSavingAnn) return;
            if (!requireRole("faculty", "publish or update announcements")) return;
            clearFormErrors(form);

            const fd = new FormData(form);
            const title = String(fd.get("title") || "").trim();
            const category = String(fd.get("category") || "").trim();
            const date = String(fd.get("date") || "").trim();
            const author = String(fd.get("author") || "").trim();
            const targetAudience =
              String(fd.get("targetAudience") || "All BSIT Students").trim() ||
              "All BSIT Students";
            const published = fd.get("published") !== "false";
            const description = String(fd.get("description") || "").trim();

            let valid = true;
            if (!title) {
              setFieldError(form, "title", "Title is required.");
              valid = false;
            }
            if (!category) {
              setFieldError(form, "category", "Category is required.");
              valid = false;
            }
            if (!date) {
              setFieldError(form, "date", "Publication date is required.");
              valid = false;
            }
            if (!author) {
              setFieldError(form, "author", "Author is required.");
              valid = false;
            }
            if (!targetAudience) {
              setFieldError(form, "targetAudience", "Target audience is required.");
              valid = false;
            }
            if (!description || description.length < 10) {
              setFieldError(form, "description", "Please enter at least 10 characters.");
              valid = false;
            }

            if (!valid) return;

            const submitBtn = form.querySelector('button[type="submit"]');
            const origText = submitBtn ? submitBtn.textContent : "Publish Announcement";
            isSavingAnn = true;
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.textContent = "Saving to MySQL Database...";
            }

            const currState = StudentHubStorage.getState();
            const facultyId =
              (existing && existing.facultyId) ||
              (currState.facultyProfile &&
                (currState.facultyProfile.facultyNumber || currState.facultyProfile.facultyId)) ||
              "FAC-2026-0101";

            let dbRes;
            if (isEdit) {
              dbRes = await StudentHubStorage.updateAnnouncementInDatabase(existing.id, {
                title,
                category,
                date,
                author,
                facultyId,
                targetAudience,
                description,
                published,
                read: Boolean(existing.read)
              });
            } else {
              dbRes = await StudentHubStorage.createAnnouncementInDatabase({
                id: StudentHubStorage.uid("ann"),
                title,
                category,
                date,
                author,
                facultyId,
                targetAudience,
                description,
                published,
                read: false
              });
            }

            isSavingAnn = false;
            if (!dbRes || !dbRes.ok) {
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = origText;
              }
              if (dbRes && dbRes.errors && typeof dbRes.errors === "object") {
                Object.entries(dbRes.errors).forEach(([field, msg]) => {
                  setFieldError(form, field, msg);
                });
              }
              showToast(
                (dbRes && dbRes.error) ||
                  "Failed to save announcement to MySQL database. Please verify the Node.js and XAMPP MySQL server are running.",
                "error"
              );
              return;
            }

            closeModal();
            refreshAll();
            if (isEdit) {
              showToast("Faculty announcement updated in MySQL database!", "success");
            } else {
              showToast(
                published
                  ? "Announcement saved to MySQL database! It now appears in the Student Portal and Dashboard."
                  : "Announcement saved to MySQL database as Unpublished Draft.",
                "success"
              );
            }
          });
        }
      );
    };

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Faculty Announcements</h2>
          <p>Create, publish, edit, and delete class advisories and university announcements in the MySQL database for BSIT students.</p>
        </div>
        <div class="section-header-actions">
          <button type="button" class="btn btn-primary" id="facCreateAnnBtn">
            + Publish New Announcement
          </button>
        </div>
      </div>

      <div class="announcements-list">
        ${announcements
          .map(
            (a) => `
          <article class="announcement-card">
            <div class="announcement-header">
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                  <span class="badge badge-primary">${escapeHtml(a.category)}</span>
                  <span class="badge badge-info">Audience: ${escapeHtml(
                    a.targetAudience || "All BSIT Students"
                  )}</span>
                  <span class="badge ${
                    a.published !== false ? "badge-success" : "badge-neutral"
                  }">
                    ${
                      a.published !== false
                        ? "Published to Student Portal"
                        : "Unpublished Draft (Hidden from Students)"
                    }
                  </span>
                </div>
                <h3 class="announcement-title">${escapeHtml(a.title)}</h3>
              </div>
              <div style="font-size:0.82rem;color:var(--text-muted);">
                ${escapeHtml(formatReadableDate(a.date))}
              </div>
            </div>
            <p class="announcement-body">${escapeHtml(a.description)}</p>
            <div class="announcement-footer">
              <div>
                <strong>Published by:</strong> ${escapeHtml(a.author)}
                ${
                  a.facultyId
                    ? `<span style="font-size:0.76rem;color:var(--text-muted);margin-left:6px;">(${escapeHtml(
                        a.facultyId
                      )})</span>`
                    : ""
                }
              </div>
              <div class="table-actions">
                <button type="button" class="btn btn-sm btn-secondary fac-toggle-pub-btn" data-id="${escapeHtml(
                  a.id
                )}">${a.published !== false ? "Unpublish" : "Publish"}</button>
                <button type="button" class="btn btn-sm btn-secondary fac-edit-ann-btn" data-id="${escapeHtml(
                  a.id
                )}">Edit</button>
                <button type="button" class="btn btn-sm btn-outline-danger fac-del-ann-btn" data-id="${escapeHtml(
                  a.id
                )}">Delete</button>
              </div>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    `;

    const createBtn = document.getElementById("facCreateAnnBtn");
    if (createBtn) createBtn.addEventListener("click", () => openFacultyAnnModal(null));

    container.querySelectorAll(".fac-toggle-pub-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!requireRole("faculty", "change announcement publication status")) return;
        const id = btn.getAttribute("data-id");
        const currState = StudentHubStorage.getState();
        const target = currState.announcements.find((a) => a.id === id);
        if (!target) return;

        const nextPublished = target.published === false;
        btn.disabled = true;
        const dbRes = await StudentHubStorage.updateAnnouncementInDatabase(id, {
          published: nextPublished
        });
        btn.disabled = false;

        if (!dbRes || !dbRes.ok) {
          showToast(
            (dbRes && dbRes.error) || "Failed to update announcement status in MySQL database.",
            "error"
          );
          return;
        }

        refreshAll();
        showToast(
          nextPublished
            ? "Announcement published to Student Portal (saved in MySQL)!"
            : "Announcement unpublished and hidden from students (saved in MySQL).",
          "info"
        );
      });
    });

    container.querySelectorAll(".fac-edit-ann-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const currState = StudentHubStorage.getState();
        const target = currState.announcements.find((a) => a.id === id);
        if (target) openFacultyAnnModal(target);
      });
    });

    container.querySelectorAll(".fac-del-ann-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!requireRole("faculty", "delete announcements")) return;
        const id = btn.getAttribute("data-id");
        const currState = StudentHubStorage.getState();
        const target = currState.announcements.find((a) => a.id === id);
        if (!target) return;

        const confirmed = await confirmDialog({
          title: "Delete Announcement from MySQL Database",
          message: `Permanently remove "${target.title}" from the MySQL database and portal notice board?`,
          confirmText: "Delete Announcement",
          danger: true
        });

        if (confirmed) {
          btn.disabled = true;
          const dbRes = await StudentHubStorage.deleteAnnouncementInDatabase(id);
          btn.disabled = false;
          if (!dbRes || !dbRes.ok) {
            showToast(
              (dbRes && dbRes.error) || "Failed to delete announcement from MySQL database.",
              "error"
            );
            return;
          }
          refreshAll();
          showToast("Announcement deleted from MySQL database.", "info");
        }
      });
    });
  }

  /**
   * 8. FACULTY STUDENT APPLICATION MANAGEMENT
   * Allows authorized faculty members to view, search, filter, inspect details,
   * and update application statuses (Pending, Under Review, Approved, Rejected)
   * with changes persisted to MySQL and localStorage.
   */
  function getAppStatusBadgeClass(status) {
    if (status === "Approved") return "badge-success";
    if (status === "Rejected") return "badge-danger";
    if (status === "Under Review") return "badge-warning";
    return "badge-info"; // Pending
  }

  function openApplicationDetailsModal(appRecord) {
    if (!requireRole("faculty", "view or update student application details")) return;
    if (!appRecord) return;

    const statuses = StudentHubStorage.VALID_APPLICATION_STATUSES || [
      "Pending",
      "Under Review",
      "Approved",
      "Rejected"
    ];
    const currentStatus =
      appRecord.status === "Submitted" ? "Pending" : appRecord.status || "Pending";

    const html = `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 14px;background:var(--surface-hover);border-radius:10px;border:1px solid var(--border-color);">
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-secondary);font-weight:700;">
              Application Reference Number
            </div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--primary-600);">
              ${escapeHtml(appRecord.referenceNumber)}
            </div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">
              Submitted on ${escapeHtml(formatReadableDate(appRecord.submittedDate))}
            </div>
          </div>
          <div style="text-align:right;">
            <span class="badge ${getAppStatusBadgeClass(currentStatus)}" style="font-size:0.86rem;padding:6px 12px;">
              ${escapeHtml(currentStatus)}
            </span>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
              ${appRecord.isDemoRecord ? "Preloaded Database Record" : "Submitted via Applicant Portal"}
            </div>
            ${
              appRecord.updatedBy || appRecord.statusUpdatedAt
                ? `<div style="font-size:0.74rem;color:var(--text-secondary);margin-top:3px;">
                    Last updated by <strong>${escapeHtml(appRecord.updatedBy || "Faculty")}</strong>
                    ${appRecord.statusUpdatedAt ? `on ${escapeHtml(appRecord.statusUpdatedAt)}` : ""}
                  </div>`
                : ""
            }
          </div>
        </div>
      </div>

      <div class="form-grid" style="margin-bottom:18px;">
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Applicant Full Name</div>
            <div class="dash-item-title">${escapeHtml(appRecord.fullName)}</div>
          </div>
        </div>
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Date of Birth</div>
            <div class="dash-item-title">${escapeHtml(formatReadableDate(appRecord.dateOfBirth || "2007-05-14"))}</div>
          </div>
        </div>
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Email Address</div>
            <div class="dash-item-title" style="word-break:break-all;">${escapeHtml(appRecord.email)}</div>
          </div>
        </div>
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Contact Number</div>
            <div class="dash-item-title">${escapeHtml(appRecord.contactNumber || "Not specified")}</div>
          </div>
        </div>
        <div class="dash-list-item" style="grid-column:1 / -1;">
          <div>
            <div class="dash-item-sub">Complete Home Address</div>
            <div class="dash-item-title">${escapeHtml(appRecord.address || "Bantug District (Sample Address)")}</div>
          </div>
        </div>
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Selected Course (1st Choice)</div>
            <div class="dash-item-title">${escapeHtml(appRecord.desiredProgram)}</div>
          </div>
        </div>
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Alternative Course (2nd Choice)</div>
            <div class="dash-item-title">${escapeHtml(appRecord.secondChoiceProgram || "None")}</div>
          </div>
        </div>
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Applying For Year Level</div>
            <div class="dash-item-title">${escapeHtml(appRecord.yearLevel || "Year 1")}</div>
          </div>
        </div>
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Applicant Classification</div>
            <div class="dash-item-title">${escapeHtml(appRecord.applicantType || "Senior High School Graduate / Freshman")}</div>
          </div>
        </div>
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Previous School Attended</div>
            <div class="dash-item-title">${escapeHtml(appRecord.previousSchool || "Not specified")} (${escapeHtml(appRecord.graduationYear || "2026")})</div>
          </div>
        </div>
        <div class="dash-list-item">
          <div>
            <div class="dash-item-sub">Educational Background / Strand</div>
            <div class="dash-item-title">${escapeHtml(appRecord.educationalBackground || "STEM / ICT Strand")}</div>
          </div>
        </div>
      </div>

      <form id="facUpdateAppStatusModalForm" novalidate style="padding-top:14px;border-top:1px solid var(--border-color);">
        <h4 style="font-size:0.96rem;margin-bottom:10px;">Update Application Status (Saved to MySQL)</h4>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="facModalAppStatusSelect">Application Status <span class="req">*</span></label>
            <select id="facModalAppStatusSelect" name="status" class="form-control">
              ${statuses
                .map(
                  (st) =>
                    `<option value="${escapeHtml(st)}" ${
                      currentStatus === st ? "selected" : ""
                    }>${escapeHtml(st)}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="facModalAppRemarksInput">Faculty Evaluation Remarks</label>
            <input
              type="text"
              id="facModalAppRemarksInput"
              name="remarks"
              class="form-control"
              placeholder="Enter evaluation remarks or admission notes..."
              value="${escapeHtml(appRecord.remarks || "")}"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="closeFacAppDetailModalBtn">Close</button>
          <button type="submit" class="btn btn-primary">Save Status to Database</button>
        </div>
      </form>
    `;

    openModal(
      `Applicant Details — ${appRecord.referenceNumber}`,
      html,
      (bodyEl) => {
        bodyEl.querySelector("#closeFacAppDetailModalBtn").addEventListener("click", closeModal);
        const form = bodyEl.querySelector("#facUpdateAppStatusModalForm");
        let isUpdatingStatus = false;
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          if (isUpdatingStatus) return;
          if (!requireRole("faculty", "update application status")) return;
          const fd = new FormData(form);
          const newStatus = String(fd.get("status") || "Pending").trim();
          const newRemarks = String(fd.get("remarks") || "").trim();

          if (newStatus !== currentStatus) {
            const ok = await confirmDialog({
              title: "Confirm Application Status Update",
              message: `Change status for ${appRecord.fullName} (${appRecord.referenceNumber}) from "${currentStatus}" to "${newStatus}" and save to MySQL?`,
              confirmText: `Set to ${newStatus}`,
              danger: newStatus === "Rejected"
            });
            if (!ok) return;
          }

          const submitBtn = form.querySelector('button[type="submit"]');
          const origBtnText = submitBtn ? submitBtn.textContent : "Save Status to Database";
          isUpdatingStatus = true;
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Saving to MySQL...";
          }

          const res = await StudentHubStorage.updateApplicationStatusInDatabase(
            appRecord.referenceNumber,
            newStatus,
            newRemarks
          );
          isUpdatingStatus = false;
          if (res && res.ok) {
            if (typeof StudentHubStorage.fetchAuditLogsFromDatabase === "function") {
              await StudentHubStorage.fetchAuditLogsFromDatabase(60);
            }
            closeModal();
            refreshAll();
            showToast(
              `Application ${appRecord.referenceNumber} updated to "${newStatus}" and saved to MySQL database!`,
              "success"
            );
          } else {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = origBtnText;
            }
            showToast(
              (res && res.error) ||
                "Failed to update application status in MySQL database. Please verify the server is running.",
              "error"
            );
          }
        });
      }
    );
  }

  function renderApplications() {
    if (!requireRole("faculty", "access Student Application Management")) return;
    const container = document.getElementById("facultyApplicationsContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const allApplications = StudentHubStorage.getAllApplicationsForFaculty(state);
    const auditLogs = Array.isArray(state.auditLogs) ? state.auditLogs : [];
    const statuses = StudentHubStorage.VALID_APPLICATION_STATUSES || [
      "Pending",
      "Under Review",
      "Approved",
      "Rejected"
    ];

    const countByStatus = {
      Pending: allApplications.filter((a) => a.status === "Pending").length,
      "Under Review": allApplications.filter((a) => a.status === "Under Review").length,
      Approved: allApplications.filter((a) => a.status === "Approved").length,
      Rejected: allApplications.filter((a) => a.status === "Rejected").length
    };

    const queryLower = facAppSearchQuery.trim().toLowerCase();
    const filteredApps = allApplications.filter((app) => {
      const matchSearch =
        !queryLower ||
        String(app.fullName || "").toLowerCase().includes(queryLower) ||
        String(app.referenceNumber || "").toLowerCase().includes(queryLower) ||
        String(app.email || "").toLowerCase().includes(queryLower) ||
        String(app.desiredProgram || "").toLowerCase().includes(queryLower);

      const matchStatus = facAppStatusFilter === "All" || app.status === facAppStatusFilter;
      const matchCourse =
        facAppCourseFilter === "All" ||
        String(app.desiredProgram || "").toUpperCase().includes(facAppCourseFilter);

      return matchSearch && matchStatus && matchCourse;
    });

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Student Applications Management</h2>
          <p>Review submitted student applications from the MySQL database, inspect applicant details, and update admission statuses (Pending, Under Review, Approved, Rejected).</p>
        </div>
      </div>

      <!-- Summary Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Total Applications</span>
            <span class="stat-value">${allApplications.length}</span>
            <span class="stat-sub">${countByStatus["Pending"]} Pending Evaluation</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <polyline points="17 11 19 13 23 9"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Under Review</span>
            <span class="stat-value">${countByStatus["Under Review"]}</span>
            <span class="stat-sub">Being Evaluated by Faculty</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Approved</span>
            <span class="stat-value">${countByStatus["Approved"]}</span>
            <span class="stat-sub">Qualified for Admission</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Rejected</span>
            <span class="stat-value">${countByStatus["Rejected"]}</span>
            <span class="stat-sub">Did Not Meet Requirements</span>
          </div>
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
        </div>
      </div>

      <!-- Search & Filter Toolbar -->
      <div class="toolbar-row">
        <div class="toolbar-group" style="justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:260px;">
            <label class="form-label" for="facAppSearchInput">Search by Applicant Name or Application Number</label>
            <input
              type="search"
              id="facAppSearchInput"
              class="form-control"
              placeholder="e.g. Ceasar Villanueva, BU-ADM-2026-10482, or email..."
              value="${escapeHtml(facAppSearchQuery)}"
            />
          </div>

          <div style="min-width:190px;">
            <label class="form-label" for="facAppStatusFilterSelect">Filter by Status</label>
            <select id="facAppStatusFilterSelect" class="form-control">
              <option value="All" ${facAppStatusFilter === "All" ? "selected" : ""}>All Statuses (${allApplications.length})</option>
              ${statuses
                .map(
                  (st) =>
                    `<option value="${escapeHtml(st)}" ${
                      facAppStatusFilter === st ? "selected" : ""
                    }>${escapeHtml(st)} (${countByStatus[st] || 0})</option>`
                )
                .join("")}
            </select>
          </div>

          <div style="min-width:190px;">
            <label class="form-label" for="facAppCourseFilterSelect">Filter by Course</label>
            <select id="facAppCourseFilterSelect" class="form-control">
              <option value="All" ${facAppCourseFilter === "All" ? "selected" : ""}>All Courses</option>
              ${["BSIT", "BSCS", "BSIS", "BSBA", "BSED"]
                .map(
                  (c) =>
                    `<option value="${c}" ${
                      facAppCourseFilter === c ? "selected" : ""
                    }>${c}</option>`
                )
                .join("")}
            </select>
          </div>

          <div style="align-self:flex-end;">
            <button type="button" class="btn btn-secondary" id="facAppResetFiltersBtn">
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Submitted Student Applications Table -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Submitted Student Applications (MySQL Database Records)</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:2px;">
              Showing <strong>${filteredApps.length}</strong> of <strong>${allApplications.length}</strong> application records. Select a new status to update MySQL immediately or click <strong>View Details</strong>.
            </p>
          </div>
          <span class="badge badge-primary">${filteredApps.length} Shown</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Application No.</th>
                <th>Applicant Full Name</th>
                <th>Email &amp; Contact</th>
                <th>Selected Course</th>
                <th>Application Date</th>
                <th>Status &amp; Audit Info</th>
                <th>Update Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${
                filteredApps.length === 0
                  ? `<tr><td colspan="8" style="text-align:center;padding:24px;">No student applications match your current search or filter criteria.</td></tr>`
                  : filteredApps
                      .map((app) => {
                        const currSt = app.status === "Submitted" ? "Pending" : app.status || "Pending";
                        return `
                          <tr>
                            <td>
                              <strong>${escapeHtml(app.referenceNumber)}</strong>
                              <div style="font-size:0.72rem;color:var(--text-muted);">
                                ${escapeHtml(app.yearLevel || "Year 1")}
                              </div>
                            </td>
                            <td>
                              <strong>${escapeHtml(app.fullName)}</strong>
                              <div style="font-size:0.74rem;color:var(--text-secondary);">
                                ${escapeHtml(app.applicantType || "Freshman Applicant")}
                              </div>
                            </td>
                            <td>
                              <div style="font-size:0.82rem;word-break:break-all;">${escapeHtml(app.email)}</div>
                              <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(
                                app.contactNumber || "N/A"
                              )}</div>
                            </td>
                            <td>
                              <div style="font-size:0.83rem;font-weight:600;">${escapeHtml(app.desiredProgram)}</div>
                              <div style="font-size:0.74rem;color:var(--text-muted);">Prev: ${escapeHtml(
                                app.previousSchool || "N/A"
                              )}</div>
                            </td>
                            <td><strong>${escapeHtml(formatReadableDate(app.submittedDate))}</strong></td>
                            <td>
                              <span class="badge ${getAppStatusBadgeClass(currSt)}">
                                ${escapeHtml(currSt)}
                              </span>
                              ${
                                app.updatedBy
                                  ? `<div style="font-size:0.71rem;color:var(--text-muted);margin-top:4px;">
                                      By: ${escapeHtml(app.updatedBy)}
                                      ${app.statusUpdatedAt ? `<br/>${escapeHtml(app.statusUpdatedAt)}` : ""}
                                    </div>`
                                  : ""
                              }
                            </td>
                            <td>
                              <select
                                class="form-control fac-inline-app-status-select"
                                data-ref="${escapeHtml(app.referenceNumber)}"
                                data-prev-status="${escapeHtml(currSt)}"
                                data-applicant-name="${escapeHtml(app.fullName)}"
                                style="min-width:142px;font-size:0.82rem;padding:5px 8px;"
                                aria-label="Update status for ${escapeHtml(app.fullName)}"
                              >
                                ${statuses
                                  .map(
                                    (st) =>
                                      `<option value="${escapeHtml(st)}" ${
                                        currSt === st ? "selected" : ""
                                      }>${escapeHtml(st)}</option>`
                                  )
                                  .join("")}
                              </select>
                            </td>
                            <td>
                              <button
                                type="button"
                                class="btn btn-sm btn-secondary fac-view-app-detail-btn"
                                data-ref="${escapeHtml(app.referenceNumber)}"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        `;
                      })
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- System Audit Trail Card -->
      <div class="card" style="margin-top:20px;">
        <div class="card-header">
          <div>
            <h3 class="card-title">System Audit Trail &amp; Activity Log (MySQL <code>audit_logs</code>)</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:2px;">
              Tracks application submissions, faculty status updates, announcement creations/edits/deletions, schedule modifications, and user authentication events.
            </p>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" id="facRefreshAuditLogsBtn">Refresh Audit Trail</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action Type</th>
                <th>Actor &amp; Role</th>
                <th>Target Table / Record</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${
                auditLogs.length === 0
                  ? `<tr><td colspan="5" style="text-align:center;padding:20px;">No audit log entries loaded yet. Click <strong>Refresh Audit Trail</strong> or perform an action to view MySQL audit records.</td></tr>`
                  : auditLogs
                      .slice(0, 25)
                      .map(
                        (log) => `
                          <tr>
                            <td style="white-space:nowrap;font-size:0.78rem;"><strong>${escapeHtml(
                              log.createdAt || ""
                            )}</strong></td>
                            <td><span class="badge badge-info">${escapeHtml(
                              log.actionType || ""
                            )}</span></td>
                            <td>
                              <strong>${escapeHtml(log.actorName || "System")}</strong>
                              <div style="font-size:0.72rem;color:var(--text-secondary);">${escapeHtml(
                                log.actorRole || ""
                              )} ${log.actorId ? `&bull; ${escapeHtml(log.actorId)}` : ""}</div>
                            </td>
                            <td style="font-size:0.78rem;">
                              <code>${escapeHtml(log.targetTable || "")}</code>
                              ${log.targetRecordId ? `<div><strong>${escapeHtml(log.targetRecordId)}</strong></div>` : ""}
                            </td>
                            <td style="font-size:0.81rem;">${escapeHtml(log.details || "")}</td>
                          </tr>
                        `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    const searchInp = document.getElementById("facAppSearchInput");
    if (searchInp) {
      searchInp.addEventListener("input", (e) => {
        facAppSearchQuery = e.target.value;
        const pos = e.target.selectionStart;
        renderApplications();
        const newInp = document.getElementById("facAppSearchInput");
        if (newInp) {
          newInp.focus();
          try {
            newInp.setSelectionRange(pos, pos);
          } catch (_) {}
        }
      });
    }

    const statusSel = document.getElementById("facAppStatusFilterSelect");
    if (statusSel) {
      statusSel.addEventListener("change", (e) => {
        facAppStatusFilter = e.target.value;
        renderApplications();
      });
    }

    const courseSel = document.getElementById("facAppCourseFilterSelect");
    if (courseSel) {
      courseSel.addEventListener("change", (e) => {
        facAppCourseFilter = e.target.value;
        renderApplications();
      });
    }

    const resetBtn = document.getElementById("facAppResetFiltersBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        facAppSearchQuery = "";
        facAppStatusFilter = "All";
        facAppCourseFilter = "All";
        renderApplications();
      });
    }

    const refreshAuditBtn = document.getElementById("facRefreshAuditLogsBtn");
    if (refreshAuditBtn) {
      refreshAuditBtn.addEventListener("click", async () => {
        refreshAuditBtn.disabled = true;
        refreshAuditBtn.textContent = "Loading...";
        if (typeof StudentHubStorage.fetchAuditLogsFromDatabase === "function") {
          const res = await StudentHubStorage.fetchAuditLogsFromDatabase(80);
          if (res.ok) {
            showToast(`Loaded ${res.auditLogs.length} audit log entries from MySQL.`, "success");
          } else {
            showToast(res.error || "Could not refresh audit logs.", "error");
          }
        }
        renderApplications();
      });
    }

    container.querySelectorAll(".fac-inline-app-status-select").forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        if (!requireRole("faculty", "update application status")) return;
        const refNo = sel.getAttribute("data-ref");
        const prevStatus = sel.getAttribute("data-prev-status") || "Pending";
        const applicantName = sel.getAttribute("data-applicant-name") || refNo;
        const newStatus = e.target.value;

        const ok = await confirmDialog({
          title: "Confirm Application Status Update",
          message: `Change status for ${applicantName} (${refNo}) from "${prevStatus}" to "${newStatus}" and save to MySQL?`,
          confirmText: `Set to ${newStatus}`,
          danger: newStatus === "Rejected"
        });
        if (!ok) {
          sel.value = prevStatus;
          return;
        }

        sel.disabled = true;
        const res = await StudentHubStorage.updateApplicationStatusInDatabase(refNo, newStatus);
        sel.disabled = false;
        if (res && res.ok) {
          if (typeof StudentHubStorage.fetchAuditLogsFromDatabase === "function") {
            await StudentHubStorage.fetchAuditLogsFromDatabase(60);
          }
          refreshAll();
          showToast(
            `Updated application ${refNo} status to "${newStatus}" (saved to MySQL database).`,
            "success"
          );
        } else {
          renderApplications();
          showToast(
            (res && res.error) || "Failed to save application status in MySQL database.",
            "error"
          );
        }
      });
    });

    container.querySelectorAll(".fac-view-app-detail-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const refNo = btn.getAttribute("data-ref");
        const target = allApplications.find((a) => a.referenceNumber === refNo);
        if (target) {
          openApplicationDetailsModal(target);
        }
      });
    });
  }

  return {
    renderDashboard,
    renderProfile,
    renderClasses,
    renderAttendance,
    renderGrades,
    renderTasks,
    renderAnnouncements,
    renderApplications
  };
})();

window.StudentHubFaculty = StudentHubFaculty;
