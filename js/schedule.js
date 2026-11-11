/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 3: Class Schedule (schedule.js)
 *
 * Program: Bachelor of Science in Information Technology
 * Year and Section: BSIT 2-2
 *
 * Displays the official BSIT 2-2 Monday–Friday class timetable connected
 * directly to the 9 unique BSIT 2-2 subject records (no duplicate subjects).
 * Features:
 * - Weekly Timetable View (all 5 weekdays with current day highlighted)
 * - Daily Schedule View (switch between Monday–Friday daily timetables)
 * - Connected 9 Enrolled Subjects Reference Table
 * - Search by subject code, course code, subject name, instructor, or room
 * ============================================================================
 */

const StudentHubSchedule = (function () {
  const { escapeHtml, getTodayDayName } = window.StudentHubApp;

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  let viewMode = "weekly"; // "weekly" | "daily"
  let selectedDay = null;
  let searchQuery = "";

  function getDefaultSelectedDay() {
    const today = getTodayDayName();
    return WEEKDAYS.includes(today) ? today : "Monday";
  }

  function filterSession(sess, q) {
    if (!q) return true;
    const hay = `${sess.subjectCode} ${sess.courseCode} ${sess.subjectName} ${sess.displaySubject} ${sess.instructor} ${sess.room} ${sess.timeLabel} ${sess.day}`.toLowerCase();
    return hay.includes(q);
  }

  function render() {
    const container = document.getElementById("scheduleContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const subjects = StudentHubStorage.getStudentEnrolledSubjects(
      state.profile,
      state.schedules
    );
    const todayName = getTodayDayName();
    if (!selectedDay || !WEEKDAYS.includes(selectedDay)) {
      selectedDay = getDefaultSelectedDay();
    }

    const allSessions = StudentHubStorage.getAllScheduleSessions(subjects);
    const q = searchQuery.trim().toLowerCase();

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Class Schedule (${escapeHtml(
      state.profile.section || "BSIT 2-2"
    )})</h2>
          <p>
            <strong>Program:</strong> Bachelor of Science in Information Technology &bull;
            <strong>Year &amp; Section:</strong> BSIT 2-2 &bull;
            <strong>Term:</strong> ${escapeHtml(state.profile.academicTerm || "2nd Semester, AY 2026–2027")}
          </p>
        </div>
        <div class="section-header-actions">
          <div class="schedule-view-switcher" role="group" aria-label="Switch Schedule View">
            <button
              type="button"
              class="btn ${viewMode === "weekly" ? "btn-primary" : "btn-secondary"}"
              id="btnWeeklyView"
            >
              Weekly Timetable View
            </button>
            <button
              type="button"
              class="btn ${viewMode === "daily" ? "btn-primary" : "btn-secondary"}"
              id="btnDailyView"
            >
              Daily Schedule View
            </button>
          </div>
        </div>
      </div>

      <!-- Summary Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Year &amp; Section</span>
            <span class="stat-value">BSIT 2-2</span>
            <span class="stat-sub">BS in Information Technology</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Enrolled Subjects</span>
            <span class="stat-value">${subjects.length} Subjects</span>
            <span class="stat-sub">Connected to Official Records</span>
          </div>
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Weekly Class Sessions</span>
            <span class="stat-value">${allSessions.length} Classes</span>
            <span class="stat-sub">Monday to Friday Timetable</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Current Day</span>
            <span class="stat-value" style="font-size:1.35rem;">${escapeHtml(todayName)}</span>
            <span class="stat-sub">${WEEKDAYS.includes(todayName)
        ? `${StudentHubStorage.getSessionsByDay(todayName, subjects).length} classes scheduled today`
        : "Weekend — Next classes on Monday"
      }</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
        </div>
      </div>

      <!-- Day Selector Tabs & Search Toolbar -->
      <div class="toolbar-row">
        <div class="day-tabs" role="tablist" aria-label="Select Weekday">
          ${viewMode === "weekly"
        ? `<span style="font-size:0.84rem;font-weight:600;color:var(--text-secondary);align-self:center;margin-right:6px;">Quick Jump / Daily View:</span>`
        : ""
      }
          ${WEEKDAYS.map((day) => {
        const count = StudentHubStorage.getSessionsByDay(day, subjects).length;
        const isToday = day === todayName;
        const isActive = viewMode === "daily" && selectedDay === day;
        return `
              <button
                type="button"
                class="day-tab ${isActive ? "active" : ""} ${isToday ? "today-indicator" : ""}"
                data-select-day="${day}"
              >
                ${day} (${count})${isToday ? " • Today" : ""}
              </button>
            `;
      }).join("")}
        </div>

        <div style="min-width:260px;">
          <input
            type="search"
            id="scheduleSearchInput"
            class="form-control"
            placeholder="Search subject, code, room (R5, CL3), or instructor..."
            value="${escapeHtml(searchQuery)}"
          />
        </div>
      </div>

      ${viewMode === "weekly"
        ? renderWeeklyTimetable(subjects, todayName, q)
        : renderDailySchedule(subjects, selectedDay, todayName, q)
      }

      <!-- Connected Enrolled BSIT 2-2 Subjects Reference Table (No Duplicate Subject Records) -->
      <div class="card" style="margin-top:22px;">
        <div class="card-header">
          <h3 class="card-title">
            <span>Connected BSIT 2-2 Subject Records &amp; Assigned Instructors</span>
            <span class="badge badge-primary">${subjects.length} Unique Subjects</span>
          </h3>
          <span class="badge badge-info">Official Curriculum Load</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Course Code</th>
                <th>Subject Name</th>
                <th>Assigned Instructor</th>
                <th>Units</th>
                <th>Weekly Schedule &amp; Room Assignments</th>
              </tr>
            </thead>
            <tbody>
              ${subjects
        .map(
          (sub) => `
                  <tr>
                    <td><strong>${escapeHtml(sub.subjectCode)}</strong></td>
                    <td><span class="badge badge-primary">${escapeHtml(sub.courseCode)}</span></td>
                    <td><strong>${escapeHtml(sub.subjectName)}</strong></td>
                    <td>${escapeHtml(sub.instructor)}</td>
                    <td>${escapeHtml(sub.units || 3)}</td>
                    <td>
                      <div style="display:flex;flex-direction:column;gap:4px;">
                        ${(sub.sessions || [])
              .map(
                (s) =>
                  `<div style="font-size:0.82rem;">
                                <strong>${escapeHtml(s.day)}:</strong> ${escapeHtml(s.timeLabel)}
                                <span class="badge badge-neutral" style="margin-left:6px;">Room: ${escapeHtml(
                    s.room
                  )}</span>
                              </div>`
              )
              .join("")}
                      </div>
                    </td>
                  </tr>
                `
        )
        .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind Weekly vs Daily View Switcher
    const btnWeekly = document.getElementById("btnWeeklyView");
    const btnDaily = document.getElementById("btnDailyView");
    if (btnWeekly) {
      btnWeekly.addEventListener("click", () => {
        viewMode = "weekly";
        render();
      });
    }
    if (btnDaily) {
      btnDaily.addEventListener("click", () => {
        viewMode = "daily";
        render();
      });
    }

    // Bind Weekday Tabs
    container.querySelectorAll("[data-select-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedDay = btn.getAttribute("data-select-day");
        viewMode = "daily";
        render();
      });
    });

    // Bind Search Input
    const searchInput = document.getElementById("scheduleSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
        const restored = document.getElementById("scheduleSearchInput");
        if (restored) {
          restored.focus();
          restored.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }
  }

  /**
   * Render Weekly Timetable (Monday through Friday)
   */
  function renderWeeklyTimetable(subjects, todayName, q) {
    return `
      <div style="display:flex;flex-direction:column;gap:18px;">
        ${WEEKDAYS.map((day) => {
      const daySessions = StudentHubStorage.getSessionsByDay(day, subjects).filter((s) =>
        filterSession(s, q)
      );
      const isToday = day === todayName;

      return `
            <div class="card ${isToday ? "is-today" : ""}" style="${isToday ? "border: 2px solid var(--royal-600);" : ""
        }">
              <div class="card-header">
                <h3 class="card-title">
                  <span>${escapeHtml(day.toUpperCase())}</span>
                  ${isToday
          ? `<span class="badge badge-primary">Today (${escapeHtml(day)})</span>`
          : `<span class="badge badge-neutral">${daySessions.length} ${daySessions.length === 1 ? "Class" : "Classes"
          }</span>`
        }
                </h3>
                <span style="font-size:0.8rem;color:var(--text-muted);">BSIT 2-2 Official Timetable</span>
              </div>

              ${daySessions.length === 0
          ? `<div class="empty-state" style="padding:18px;"><p>No classes match your search on ${escapeHtml(
            day
          )}.</p></div>`
          : `
                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th style="width:210px;">Time</th>
                          <th>Subject</th>
                          <th style="width:140px;">Subject Code</th>
                          <th style="width:220px;">Instructor</th>
                          <th style="width:150px;">Room</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${daySessions
            .map(
              (sess) => `
                            <tr>
                              <td>
                                <span class="time-pill" style="display:inline-block;">${escapeHtml(
                sess.timeLabel
              )}</span>
                              </td>
                              <td>
                                <strong>${escapeHtml(sess.displaySubject)}</strong>
                              </td>
                              <td>
                                <span class="badge badge-info">${escapeHtml(sess.subjectCode)}</span>
                              </td>
                              <td>${escapeHtml(sess.instructor)}</td>
                              <td>
                                <span class="badge ${sess.room === "Not specified" ? "badge-neutral" : "badge-primary"
                }">
                                  ${escapeHtml(sess.room)}
                                </span>
                              </td>
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
    }).join("")}
      </div>
    `;
  }

  /**
   * Render Daily Schedule View for the selected weekday
   */
  function renderDailySchedule(subjects, day, todayName, q) {
    const daySessions = StudentHubStorage.getSessionsByDay(day, subjects).filter((s) =>
      filterSession(s, q)
    );
    const isToday = day === todayName;

    return `
      <div class="card" style="${isToday ? "border: 2px solid var(--royal-600);" : ""}">
        <div class="card-header">
          <h3 class="card-title">
            <span>${escapeHtml(day.toUpperCase())} &mdash; Daily Class Schedule (BSIT 2-2)</span>
            ${isToday ? `<span class="badge badge-primary">Today</span>` : ""}
          </h3>
          <span class="badge badge-info">${daySessions.length} Scheduled ${daySessions.length === 1 ? "Class" : "Classes"
      }</span>
        </div>

        ${daySessions.length === 0
        ? `<div class="empty-state"><p>No classes match your search for ${escapeHtml(day)}.</p></div>`
        : `
            <div class="table-responsive" style="margin-bottom:18px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:210px;">Time</th>
                    <th>Subject</th>
                    <th style="width:140px;">Subject Code</th>
                    <th style="width:220px;">Instructor</th>
                    <th style="width:150px;">Room</th>
                  </tr>
                </thead>
                <tbody>
                  ${daySessions
          .map(
            (sess) => `
                      <tr>
                        <td><span class="time-pill" style="display:inline-block;">${escapeHtml(
              sess.timeLabel
            )}</span></td>
                        <td><strong>${escapeHtml(sess.displaySubject)}</strong></td>
                        <td><span class="badge badge-info">${escapeHtml(sess.subjectCode)}</span></td>
                        <td>${escapeHtml(sess.instructor)}</td>
                        <td>
                          <span class="badge ${sess.room === "Not specified" ? "badge-neutral" : "badge-primary"
              }">${escapeHtml(sess.room)}</span>
                        </td>
                      </tr>
                    `
          )
          .join("")}
                </tbody>
              </table>
            </div>

            <div class="schedule-days-grid">
              ${daySessions
          .map(
            (sess) => `
                  <div class="schedule-item-card" style="margin-bottom:0;">
                    <div class="schedule-item-top">
                      <span class="time-pill">${escapeHtml(sess.timeLabel)}</span>
                      <span class="badge badge-primary">Room: ${escapeHtml(sess.room)}</span>
                    </div>
                    <div class="schedule-subject" style="margin-top:6px;">
                      ${escapeHtml(sess.displaySubject)}
                    </div>
                    <div class="schedule-details">
                      <span><strong>Subject Code:</strong> ${escapeHtml(sess.subjectCode)}</span>
                      <span><strong>Section:</strong> ${escapeHtml(sess.section)}</span>
                    </div>
                    <div class="schedule-details">
                      <span><strong>Instructor:</strong> ${escapeHtml(sess.instructor)}</span>
                    </div>
                  </div>
                `
          )
          .join("")}
            </div>
          `
      }
      </div>
    `;
  }

  return { render };
})();

window.StudentHubSchedule = StudentHubSchedule;
