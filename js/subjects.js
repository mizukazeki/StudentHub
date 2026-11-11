/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Student My Subjects Module (subjects.js)
 *
 * Implements Revision 4 Requirements:
 * 1. Displays all subjects assigned to the student's current Course, Year Level,
 *    and Section (9 preloaded subjects for BSIT 2-2).
 * 2. Displays Subject Code, Full Subject Name, Instructor, Section, Class
 *    Schedule (all weekly meetings), and Room ("Not specified" when unavailable).
 * 3. Connected directly to the official BSIT 2-2 Monday–Friday class timetable.
 * 4. Strictly READ-ONLY for students (students can view, search, and filter
 *    subjects, but cannot add, edit, or remove subjects, instructors, or schedules).
 * 5. Connected to student accounts by Course, Year Level, and Section — does NOT
 *    show BSIT 2-2 subjects to students from other sections; shows a clear
 *    empty-state message when a student's section has no configured subjects.
 * ============================================================================
 */

const StudentHubSubjects = (function () {
  const { escapeHtml, navigateTo, openModal, closeModal, showToast, refreshAll } =
    window.StudentHubApp;

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  let searchQuery = "";
  let selectedDayFilter = "All";
  let selectedCategoryFilter = "All";
  let layoutMode = "table"; // "table" | "cards"

  /**
   * Return the full subject name matching the official BSIT 2-2 curriculum format
   * e.g. "GE ELEC IT 3 – Foreign Language 2"
   */
  function getFullSubjectName(sub) {
    if (!sub) return "Not specified";
    if (sub.fullSubjectName && String(sub.fullSubjectName).trim()) {
      return String(sub.fullSubjectName).trim();
    }
    if (sub.courseCode && sub.subjectName) {
      return `${sub.courseCode} – ${sub.subjectName}`;
    }
    return sub.subjectName || "Not specified";
  }

  /**
   * Categorize subject as IT Major/Professional vs General Education & PE (for filtering)
   */
  function getSubjectCategoryGroup(sub) {
    const code = String(sub.courseCode || "").toUpperCase();
    if (code.startsWith("IT ")) {
      return "IT";
    }
    return "GE_PE";
  }

  /**
   * Format all weekly class schedule meetings for a subject
   */
  function renderSubjectMeetingsHtml(sub) {
    const sessions = Array.isArray(sub.sessions) ? sub.sessions : [];
    if (sessions.length === 0) {
      return `<span class="badge badge-neutral">Not specified</span>`;
    }
    return `
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${sessions
        .map((sess) => {
          const day = sess.day || "Not specified";
          const timeLabel = sess.timeLabel || "Not specified";
          return `
              <div style="font-size:0.83rem;line-height:1.35;">
                <strong>${escapeHtml(day)}:</strong> ${escapeHtml(timeLabel)}
              </div>
            `;
        })
        .join("")}
      </div>
    `;
  }

  /**
   * Format corresponding room assignments for each meeting of a subject
   */
  function renderSubjectRoomsHtml(sub) {
    const sessions = Array.isArray(sub.sessions) ? sub.sessions : [];
    if (sessions.length === 0) {
      return `<span class="badge badge-neutral">Not specified</span>`;
    }
    return `
      <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start;">
        ${sessions
        .map((sess) => {
          const room =
            sess.room && String(sess.room).trim() !== ""
              ? String(sess.room).trim()
              : "Not specified";
          const isUnspecified = room.toLowerCase() === "not specified";
          return `
              <span class="badge ${isUnspecified ? "badge-neutral" : "badge-info"
            }" style="font-size:0.76rem;">
                ${escapeHtml(sess.day ? `${sess.day.slice(0, 3)}: ` : "")}${escapeHtml(room)}
              </span>
            `;
        })
        .join("")}
      </div>
    `;
  }

  /**
   * Filter subjects by search query (subject code, full subject name, instructor, room)
   * and by selected weekday / category filters.
   */
  function filterSubjectsList(subjects) {
    const q = searchQuery.trim().toLowerCase();

    return subjects.filter((sub) => {
      const fullName = getFullSubjectName(sub);
      const instructor = sub.instructor || "Not specified";
      const rooms = (sub.sessions || []).map((s) => s.room || "Not specified").join(" ");
      const days = (sub.sessions || []).map((s) => `${s.day} ${s.timeLabel}`).join(" ");

      // Also support searching by demo faculty aliases for T148 / T150
      const demoAlias =
        sub.subjectCode === "T148"
          ? "somera, fabian fabian somera"
          : sub.subjectCode === "T150"
            ? "salvador, francis van francis van salvador"
            : "";

      if (q) {
        const haystack = `${sub.subjectCode} ${sub.courseCode || ""} ${sub.subjectName || ""
          } ${fullName} ${instructor} ${sub.section || ""} ${rooms} ${days} ${demoAlias}`.toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }

      if (selectedDayFilter !== "All") {
        const meetsOnDay = (sub.sessions || []).some((s) => s.day === selectedDayFilter);
        if (!meetsOnDay) return false;
      }

      if (selectedCategoryFilter !== "All") {
        if (getSubjectCategoryGroup(sub) !== selectedCategoryFilter) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Open read-only modal with complete subject & schedule details
   */
  function openSubjectDetailsModal(subjectId) {
    const state = StudentHubStorage.getState();
    const enrolledSubjects = StudentHubStorage.getStudentEnrolledSubjects(
      state.profile,
      state.schedules
    );
    const sub = enrolledSubjects.find((s) => s.id === subjectId || s.subjectCode === subjectId);
    if (!sub) return;

    const fullName = getFullSubjectName(sub);
    const sessions = Array.isArray(sub.sessions) ? sub.sessions : [];

    const html = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span class="badge badge-primary" style="font-size:0.85rem;">Subject Code: ${escapeHtml(
      sub.subjectCode
    )}</span>
          <span class="badge badge-info">Section: ${escapeHtml(
      sub.section || state.profile.section || "BSIT 2-2"
    )}</span>
        </div>

        <div>
          <h3 style="font-size:1.15rem;margin-bottom:4px;">${escapeHtml(fullName)}</h3>
          <p style="font-size:0.86rem;color:var(--text-secondary);margin:0;">
            ${escapeHtml(sub.course || state.profile.course)} &bull; ${escapeHtml(
      sub.yearLevel || state.profile.yearLevel || "Year 2"
    )}
          </p>
        </div>

        <div style="padding:12px 14px;background:var(--bg-muted);border-radius:10px;border:1px solid var(--border-color);display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;font-size:0.86rem;">
          <div>
            <span style="color:var(--text-muted);display:block;font-size:0.76rem;">Subject Code</span>
            <strong>${escapeHtml(sub.subjectCode)}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);display:block;font-size:0.76rem;">Course Code</span>
            <strong>${escapeHtml(sub.courseCode || "Not specified")}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);display:block;font-size:0.76rem;">Assigned Instructor</span>
            <strong>${escapeHtml(sub.instructor || "Not specified")}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);display:block;font-size:0.76rem;">Section &amp; Units</span>
            <strong>${escapeHtml(sub.section || "BSIT 2-2")} (${escapeHtml(
      sub.units || 3
    )} Units)</strong>
          </div>
        </div>

        <div>
          <h4 style="font-size:0.92rem;margin-bottom:8px;">Connected Class Schedule &amp; Room Assignments</h4>
          ${sessions.length === 0
        ? `<p style="font-size:0.85rem;color:var(--text-muted);">Schedule: Not specified &bull; Room: Not specified</p>`
        : `
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Meeting Day</th>
                        <th>Class Time</th>
                        <th>Room Assignment</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${sessions
          .map((sess) => {
            const room =
              sess.room && String(sess.room).trim() !== ""
                ? String(sess.room).trim()
                : "Not specified";
            return `
                            <tr>
                              <td><strong>${escapeHtml(sess.day || "Not specified")}</strong></td>
                              <td>${escapeHtml(sess.timeLabel || "Not specified")}</td>
                              <td>
                                <span class="badge ${room.toLowerCase() === "not specified"
                ? "badge-neutral"
                : "badge-info"
              }">${escapeHtml(room)}</span>
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

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="closeSubjectModalBtn">Close</button>
          <button type="button" class="btn btn-primary" id="openFullTimetableFromSubBtn">Open Class Schedule &rarr;</button>
        </div>
      </div>
    `;

    openModal(`Subject Details — ${sub.subjectCode}`, html, (bodyEl) => {
      bodyEl.querySelector("#closeSubjectModalBtn")?.addEventListener("click", closeModal);
      bodyEl.querySelector("#openFullTimetableFromSubBtn")?.addEventListener("click", () => {
        closeModal();
        navigateTo("schedule");
      });
    });
  }

  /**
   * Render only the subjects results area (table or cards) so typing in the search input
   * never loses cursor focus.
   */
  function renderResultsArea() {
    const resultsContainer = document.getElementById("mySubjectsResultsContainer");
    const countBadge = document.getElementById("mySubjectsFilteredCountBadge");
    if (!resultsContainer) return;

    const state = StudentHubStorage.getState();
    const profile = state.profile || {};
    const enrolledSubjects = StudentHubStorage.getStudentEnrolledSubjects(
      profile,
      state.schedules
    );

    // 1. If the student's Course / Year Level / Section has NO configured subjects
    if (enrolledSubjects.length === 0) {
      if (countBadge) {
        countBadge.textContent = "0 Subjects Configured";
      }
      resultsContainer.innerHTML = `
        <div class="card">
          <div class="empty-state" style="padding:40px 20px;">
            <svg viewBox="0 0 24 24" width="44" height="44" stroke="currentColor" stroke-width="1.6" fill="none" style="color:var(--text-muted);margin-bottom:10px;">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <h3>No Subjects Configured for Section ${escapeHtml(
        profile.section || "Unspecified"
      )}</h3>
            <p style="max-width:560px;margin:8px auto 16px;">
              Your student profile is currently set to <strong>${escapeHtml(
        profile.course || "Unspecified Program"
      )}</strong> &bull; <strong>${escapeHtml(
        profile.yearLevel || "Year 1"
      )}</strong> &bull; Section <strong>${escapeHtml(
        profile.section || "Unspecified"
      )}</strong>. No subject load has been configured for this section yet. Official <strong>BSIT 2-2</strong> subjects are only displayed to students enrolled in <strong>Bachelor of Science in Information Technology &bull; Year 2 &bull; BSIT 2-2</strong>.
            </p>
            <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary" id="restoreBsit22SectionBtn">
                Restore BSIT 2-2 Demo Student Section
              </button>
              <button type="button" class="btn btn-secondary" id="goToStudentProfileBtn">
                Open My Profile
              </button>
            </div>
          </div>
        </div>
      `;

      resultsContainer
        .querySelector("#restoreBsit22SectionBtn")
        ?.addEventListener("click", () => {
          const curr = StudentHubStorage.getState();
          curr.profile.course = "Bachelor of Science in Information Technology";
          curr.profile.yearLevel = "Year 2";
          curr.profile.section = "BSIT 2-2";
          StudentHubStorage.saveState(curr);
          refreshAll();
          showToast("Restored student profile to Year 2 • Section BSIT 2-2.", "success");
        });

      resultsContainer.querySelector("#goToStudentProfileBtn")?.addEventListener("click", () => {
        navigateTo("profile");
      });
      return;
    }

    const filtered = filterSubjectsList(enrolledSubjects);
    if (countBadge) {
      countBadge.textContent =
        filtered.length === enrolledSubjects.length
          ? `Showing all ${enrolledSubjects.length} Enrolled Subjects`
          : `Showing ${filtered.length} of ${enrolledSubjects.length} Enrolled Subjects`;
    }

    // 2. If search/filter returned 0 matches among the student's enrolled subjects
    if (filtered.length === 0) {
      resultsContainer.innerHTML = `
        <div class="card">
          <div class="empty-state" style="padding:36px 20px;">
            <h3>No Matching Subjects Found</h3>
            <p>No enrolled subjects matched your search or filter criteria.</p>
            <button type="button" class="btn btn-secondary btn-sm" id="resetSubjectFiltersEmptyBtn" style="margin-top:10px;">
              Reset Search &amp; Filters
            </button>
          </div>
        </div>
      `;
      resultsContainer
        .querySelector("#resetSubjectFiltersEmptyBtn")
        ?.addEventListener("click", () => {
          searchQuery = "";
          selectedDayFilter = "All";
          selectedCategoryFilter = "All";
          render();
        });
      return;
    }

    // 3. Render either Table View or Card Grid View
    if (layoutMode === "cards") {
      resultsContainer.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;">
          ${filtered
          .map((sub) => {
            const fullName = getFullSubjectName(sub);
            const instructor = sub.instructor || "Not specified";
            const isUnspecifiedInst = instructor.toLowerCase() === "not specified";
            return `
                <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
                  <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                      <span class="badge badge-primary" style="font-size:0.82rem;">${escapeHtml(
              sub.subjectCode
            )}</span>
                      <span class="badge badge-info">${escapeHtml(
              sub.section || "BSIT 2-2"
            )}</span>
                    </div>
                    <h3 style="font-size:1.02rem;line-height:1.4;margin-bottom:8px;">
                      ${escapeHtml(fullName)}
                    </h3>
                    <div style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:10px;">
                      <strong>Instructor:</strong>
                      <span style="${isUnspecifiedInst ? "color:var(--text-muted);font-style:italic;" : ""
              }">${escapeHtml(instructor)}</span>
                    </div>
                    <div style="padding-top:10px;border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:8px;">
                      <div>
                        <span style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;display:block;margin-bottom:4px;">Class Schedule</span>
                        ${renderSubjectMeetingsHtml(sub)}
                      </div>
                      <div>
                        <span style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;display:block;margin-bottom:4px;">Room Assignment</span>
                        ${renderSubjectRoomsHtml(sub)}
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border-color);">
                    <button type="button" class="btn btn-sm btn-secondary" data-view-subject="${escapeHtml(
                sub.id
              )}">
                      View Details
                    </button>
                  </div>
                </div>
              `;
          })
          .join("")}
        </div>
      `;
    } else {
      resultsContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <span>Enrolled Subjects &mdash; Section ${escapeHtml(
        profile.section || "BSIT 2-2"
      )}</span>
              <span class="badge badge-primary">${filtered.length} Subject${filtered.length === 1 ? "" : "s"
        }</span>
            </h3>
            <span class="badge badge-neutral">Read-Only Official Load</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Instructor</th>
                  <th>Section</th>
                  <th>Class Schedule</th>
                  <th>Room</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${filtered
          .map((sub) => {
            const fullName = getFullSubjectName(sub);
            const instructor = sub.instructor || "Not specified";
            const isUnspecifiedInst = instructor.toLowerCase() === "not specified";
            return `
                      <tr>
                        <td><strong>${escapeHtml(sub.subjectCode)}</strong></td>
                        <td>
                          <strong>${escapeHtml(fullName)}</strong>
                        </td>
                        <td>
                          <span style="${isUnspecifiedInst ? "color:var(--text-muted);font-style:italic;" : ""
              }">${escapeHtml(instructor)}</span>
                        </td>
                        <td>
                          <span class="badge badge-primary">${escapeHtml(
                sub.section || "BSIT 2-2"
              )}</span>
                        </td>
                        <td>${renderSubjectMeetingsHtml(sub)}</td>
                        <td>${renderSubjectRoomsHtml(sub)}</td>
                        <td>
                          <button
                            type="button"
                            class="btn btn-sm btn-secondary"
                            data-view-subject="${escapeHtml(sub.id)}"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    `;
          })
          .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    resultsContainer.querySelectorAll("[data-view-subject]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openSubjectDetailsModal(btn.getAttribute("data-view-subject"));
      });
    });
  }

  /**
   * Main render for the Student My Subjects Page
   */
  function render() {
    const container = document.getElementById("subjectsContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const profile = state.profile || {};
    const enrolledSubjects = StudentHubStorage.getStudentEnrolledSubjects(
      profile,
      state.schedules
    );
    const allSessions = StudentHubStorage.getAllScheduleSessions(enrolledSubjects);
    const totalUnits = enrolledSubjects.reduce((sum, s) => sum + (Number(s.units) || 3), 0);

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; My Subjects (${escapeHtml(
      profile.section || "BSIT 2-2"
    )})</h2>
          <p>
            <strong>Program:</strong> ${escapeHtml(
      profile.course || "Bachelor of Science in Information Technology"
    )} &bull;
            <strong>Year &amp; Section:</strong> ${escapeHtml(
      profile.yearLevel || "Year 2"
    )} &ndash; ${escapeHtml(profile.section || "BSIT 2-2")} &bull;
            <strong>Term:</strong> ${escapeHtml(
      profile.academicTerm || "2nd Semester, AY 2026–2027"
    )}
          </p>
        </div>
        <div class="section-header-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
          <div class="schedule-view-switcher" role="group" aria-label="Switch Subject Layout">
            <button
              type="button"
              class="btn ${layoutMode === "table" ? "btn-primary" : "btn-secondary"}"
              id="btnSubjectsTableLayout"
            >
              Table View
            </button>
            <button
              type="button"
              class="btn ${layoutMode === "cards" ? "btn-primary" : "btn-secondary"}"
              id="btnSubjectsCardLayout"
            >
              Card View
            </button>
          </div>
          <button type="button" class="btn btn-secondary" id="goToClassScheduleFromSubjectsBtn">
            Open Class Schedule &rarr;
          </button>
        </div>
      </div>

      <!-- Read-Only Permission Banner -->
      <div class="notice-banner">
        <div>
          <strong>Official Enrolled Subjects (Read-Only Student Access):</strong> Your enrolled subjects, assigned instructors, and class schedules are managed by the university registrar and faculty. Students can view, search, and filter their subjects here, and view the connected weekly timetable under <strong>Class Schedule</strong>.
        </div>
      </div>

      <!-- Summary Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Enrolled Subjects</span>
            <span class="stat-value">${enrolledSubjects.length}</span>
            <span class="stat-sub">Section ${escapeHtml(profile.section || "BSIT 2-2")}</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Academic Units</span>
            <span class="stat-value">${totalUnits} Units</span>
            <span class="stat-sub">${escapeHtml(profile.yearLevel || "Year 2")} Curriculum Load</span>
          </div>
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Weekly Class Meetings</span>
            <span class="stat-value">${allSessions.length} Sessions</span>
            <span class="stat-sub">Connected to BSIT 2-2 Timetable</span>
          </div>
          <div class="stat-icon icon-green">
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
            <span class="stat-label">Assigned Instructors</span>
            <span class="stat-value">${enrolledSubjects.filter(
      (s) => s.instructor && s.instructor.toLowerCase() !== "not specified"
    ).length
      } / ${enrolledSubjects.length}</span>
            <span class="stat-sub">1 Subject Instructor Not Specified</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
        </div>
      </div>

      <!-- Search & Filter Toolbar -->
      <div class="toolbar-row">
        <div class="toolbar-group" style="flex:1;min-width:260px;">
          <input
            type="search"
            id="mySubjectsSearchInput"
            class="form-control"
            placeholder="Search by subject code (e.g. T148), subject name, or instructor..."
            value="${escapeHtml(searchQuery)}"
            aria-label="Search Enrolled Subjects"
          />
        </div>

        <div class="toolbar-group" style="flex-wrap:wrap;gap:10px;">
          <select id="mySubjectsDayFilter" class="form-control" style="max-width:190px;" aria-label="Filter by Meeting Day">
            <option value="All" ${selectedDayFilter === "All" ? "selected" : ""}>All Meeting Days</option>
            ${WEEKDAYS.map(
        (day) =>
          `<option value="${day}" ${selectedDayFilter === day ? "selected" : ""
          }>${day} Classes</option>`
      ).join("")}
          </select>

          <select id="mySubjectsCategoryFilter" class="form-control" style="max-width:230px;" aria-label="Filter by Subject Category">
            <option value="All" ${selectedCategoryFilter === "All" ? "selected" : ""
      }>All Enrolled Subjects</option>
            <option value="IT" ${selectedCategoryFilter === "IT" ? "selected" : ""
      }>IT Major &amp; Professional Courses</option>
            <option value="GE_PE" ${selectedCategoryFilter === "GE_PE" ? "selected" : ""
      }>General Education &amp; PE Courses</option>
          </select>

          <span class="badge badge-neutral" id="mySubjectsFilteredCountBadge" style="padding:7px 10px;">
            Showing all ${enrolledSubjects.length} Enrolled Subjects
          </span>
        </div>
      </div>

      <!-- Subjects Table / Card Results Container -->
      <div id="mySubjectsResultsContainer"></div>
    `;

    // Bind Layout View Switchers
    document.getElementById("btnSubjectsTableLayout")?.addEventListener("click", () => {
      layoutMode = "table";
      render();
    });
    document.getElementById("btnSubjectsCardLayout")?.addEventListener("click", () => {
      layoutMode = "cards";
      render();
    });

    // Bind Open Class Schedule Button
    document.getElementById("goToClassScheduleFromSubjectsBtn")?.addEventListener("click", () => {
      navigateTo("schedule");
    });

    // Bind Search Input (updates results without losing input focus)
    const searchInput = document.getElementById("mySubjectsSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderResultsArea();
      });
    }

    // Bind Day Filter
    const daySelect = document.getElementById("mySubjectsDayFilter");
    if (daySelect) {
      daySelect.addEventListener("change", (e) => {
        selectedDayFilter = e.target.value;
        renderResultsArea();
      });
    }

    // Bind Category Filter
    const catSelect = document.getElementById("mySubjectsCategoryFilter");
    if (catSelect) {
      catSelect.addEventListener("change", (e) => {
        selectedCategoryFilter = e.target.value;
        renderResultsArea();
      });
    }

    renderResultsArea();
  }

  return {
    render,
    getFullSubjectName
  };
})();

window.StudentHubSubjects = StudentHubSubjects;
