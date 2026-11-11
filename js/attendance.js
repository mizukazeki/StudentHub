/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 5: Attendance Tracker (attendance.js) — STRICTLY READ-ONLY FOR STUDENTS
 *
 * Student Permissions Enforced:
 * - View attendance records
 * - View attendance by subject
 * - View attendance history
 * - View total present days, absent days, late records, and attendance percentage
 * - NO self-marking, NO editing, NO deleting attendance records (Faculty-only)
 * ============================================================================
 */

const StudentHubAttendance = (function () {
  const { escapeHtml, formatReadableDate } = window.StudentHubApp;

  let filterSubject = "All";
  let filterStatus = "All";
  let searchQuery = "";

  function getStatusBadge(status) {
    if (status === "Present") return "badge-success";
    if (status === "Late") return "badge-warning";
    if (status === "Absent") return "badge-danger";
    return "badge-neutral";
  }

  function render() {
    const container = document.getElementById("attendanceContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const records = state.attendance || [];
    const stats = StudentHubStorage.computeAttendanceStats();
    const bySubject = StudentHubStorage.computeAttendanceBySubject();

    // Unique subjects in attendance + enrolled subjects
    const allSubjects = Array.from(
      new Set([...StudentHubStorage.getSubjectList(), ...records.map((r) => r.subject)])
    );

    const filtered = records
      .filter((r) => {
        const matchSub = filterSubject === "All" || r.subject === filterSubject;
        const matchStatus = filterStatus === "All" || r.status === filterStatus;
        const q = searchQuery.trim().toLowerCase();
        const matchQuery =
          !q ||
          r.subject.toLowerCase().includes(q) ||
          (r.remarks && r.remarks.toLowerCase().includes(q)) ||
          r.status.toLowerCase().includes(q) ||
          r.date.includes(q);
        return matchSub && matchStatus && matchQuery;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; My Attendance Records (${escapeHtml(
            state.profile.section || "BSIT 2-2"
          )})</h2>
          <p>Read-only class attendance summary and session history for ${escapeHtml(
            state.profile.fullName
          )} (${escapeHtml(state.profile.studentNumber)}).</p>
        </div>
        <div class="section-header-actions">
          <span class="badge badge-info" style="padding:8px 14px;font-size:0.82rem;">
            Read-Only Record &bull; Recorded by Faculty
          </span>
        </div>
      </div>

      <div class="notice-banner">
        <div>
          <strong>Official Attendance Recording Policy:</strong> Students have <strong>read-only</strong> access to their attendance records. Attendance is recorded and updated exclusively by <strong>BANTUG UNIVERSITY Faculty</strong> during class roll call.
        </div>
      </div>

      <!-- Summary Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Attendance Percentage</span>
            <span class="stat-value">${stats.percentage}%</span>
            <span class="stat-sub">Across ${stats.total} faculty-recorded sessions</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Total Present Days</span>
            <span class="stat-value">${stats.present}</span>
            <span class="stat-sub">On-time class attendance</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Late Records</span>
            <span class="stat-value">${stats.late}</span>
            <span class="stat-sub">Tardy arrivals recorded</span>
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
            <span class="stat-label">Total Absent Days</span>
            <span class="stat-value">${stats.absent}</span>
            <span class="stat-sub">Missed class sessions</span>
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

      <!-- Attendance Breakdown by BSIT 2-2 Subject -->
      <div class="card" style="margin-bottom:22px;">
        <div class="card-header">
          <h3 class="card-title">Attendance Summary by Subject (BSIT 2-2)</h3>
          <span class="badge badge-primary">${bySubject.length} Enrolled Subjects</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Course Code</th>
                <th>Subject Name &amp; Instructor</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Total Sessions</th>
                <th>Subject Attendance %</th>
              </tr>
            </thead>
            <tbody>
              ${bySubject
                .map((sub) => {
                  const badgeClass =
                    sub.percentage === null
                      ? "badge-neutral"
                      : sub.percentage >= 90
                      ? "badge-success"
                      : sub.percentage >= 75
                      ? "badge-info"
                      : "badge-danger";
                  return `
                    <tr>
                      <td><strong>${escapeHtml(sub.subjectCode)}</strong></td>
                      <td><span class="badge badge-info">${escapeHtml(sub.courseCode)}</span></td>
                      <td>
                        <div><strong>${escapeHtml(sub.subjectName)}</strong></div>
                        <div style="font-size:0.76rem;color:var(--text-muted);">Instructor: ${escapeHtml(
                          sub.instructor
                        )}</div>
                      </td>
                      <td><strong>${sub.present}</strong></td>
                      <td>${sub.late}</td>
                      <td>${sub.absent}</td>
                      <td>${sub.total}</td>
                      <td>
                        <span class="badge ${badgeClass}">
                          ${sub.percentage !== null ? `${sub.percentage}%` : "No sessions logged"}
                        </span>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Search & Filter Toolbar for Attendance History -->
      <div class="toolbar-row">
        <div class="toolbar-group">
          <input
            type="search"
            id="attSearchInput"
            class="form-control"
            style="max-width:280px;"
            placeholder="Search subject, date, or faculty remarks..."
            value="${escapeHtml(searchQuery)}"
          />

          <select id="attFilterSubject" class="form-control" style="max-width:290px;" aria-label="Filter by Subject">
            <option value="All">All Subjects (${records.length} Sessions)</option>
            ${allSubjects
              .map(
                (s) =>
                  `<option value="${escapeHtml(s)}" ${
                    filterSubject === s ? "selected" : ""
                  }>${escapeHtml(s)}</option>`
              )
              .join("")}
          </select>

          <select id="attFilterStatus" class="form-control" style="max-width:170px;" aria-label="Filter by Status">
            <option value="All" ${filterStatus === "All" ? "selected" : ""}>All Statuses</option>
            <option value="Present" ${filterStatus === "Present" ? "selected" : ""}>Present (${
      stats.present
    })</option>
            <option value="Late" ${filterStatus === "Late" ? "selected" : ""}>Late (${
      stats.late
    })</option>
            <option value="Absent" ${filterStatus === "Absent" ? "selected" : ""}>Absent (${
      stats.absent
    })</option>
          </select>
        </div>
      </div>

      <!-- Attendance History Table (Strictly Read-Only) -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Attendance History Log</h3>
          <span class="badge badge-neutral">Showing ${filtered.length} of ${
      records.length
    } records</span>
        </div>

        ${
          filtered.length === 0
            ? `
            <div class="empty-state">
              <h3>No Attendance Records Found</h3>
              <p>No faculty-recorded attendance logs match your current search or filter criteria.</p>
            </div>
          `
            : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Attendance Status</th>
                    <th>Faculty Remarks / Session Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered
                    .map(
                      (r) => `
                    <tr>
                      <td><strong>${escapeHtml(formatReadableDate(r.date))}</strong></td>
                      <td><strong>${escapeHtml(r.subject)}</strong></td>
                      <td>
                        <span class="badge ${getStatusBadge(r.status)}">${escapeHtml(
                        r.status
                      )}</span>
                      </td>
                      <td>${escapeHtml(r.remarks || "Recorded by Faculty")}</td>
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
    `;

    // Bind Filters & Search
    const searchInput = document.getElementById("attSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
        const el = document.getElementById("attSearchInput");
        if (el) {
          el.focus();
          el.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    const subSelect = document.getElementById("attFilterSubject");
    if (subSelect) {
      subSelect.addEventListener("change", (e) => {
        filterSubject = e.target.value;
        render();
      });
    }

    const statusSelect = document.getElementById("attFilterStatus");
    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        filterStatus = e.target.value;
        render();
      });
    }
  }

  return { render };
})();

window.StudentHubAttendance = StudentHubAttendance;
