/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Student My Subjects Module (subjects.js)
 *
 * Hydrates `pages/student/subjects.html` with the student's enrolled subjects:
 * 1. Displays all subjects assigned to the student's current Course, Year Level,
 *    and Section (9 preloaded subjects for BSIT 2-2).
 * 2. Displays Subject Code, Full Subject Name, Instructor, Section, Units,
 *    Semester/Academic Term, Class Schedule (all weekly meetings), and Room
 *    ("Not specified" when unavailable).
 * 3. Connected directly to the student's timetable.
 * 4. Strictly READ-ONLY for students (view, search, filter, inspect details).
 * 5. Connected to student accounts by Course, Year Level, and Section — shows a
 *    clear empty-state message when a student's section has no configured subjects.
 * ============================================================================
 */

const StudentHubSubjects = (function () {
  const {
    escapeHtml,
    navigateTo,
    openModal,
    closeModal,
    showToast,
    refreshAll,
    formatReadableDate
  } = window.StudentHubApp;

  let searchQuery = "";
  let selectedDayFilter = "All";
  let selectedCategoryFilter = "All";
  let selectedSemesterFilter = "All";
  let selectedSortOrder = "default";
  let layoutMode = "cards"; // "cards" | "table"

  /**
   * Parse academic term string (e.g. "2nd Semester, AY 2026–2027") into semester & AY
   */
  function parseAcademicTerm(termStr) {
    const raw = String(termStr || "").trim();
    if (!raw) return { semester: "—", academicYear: "—" };
    const ayMatch = raw.match(/(AY\s*\d{4}\s*[–-]\s*\d{4}|\d{4}\s*[–-]\s*\d{4})/i);
    const academicYear = ayMatch ? ayMatch[1].replace(/\s+/g, " ").trim() : "—";
    let semester = raw;
    if (ayMatch) {
      semester = raw
        .replace(ayMatch[0], "")
        .replace(/^[,\s•–-]+|[,\s•–-]+$/g, "")
        .trim();
    }
    return {
      semester: semester || raw,
      academicYear
    };
  }

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
    const code = String((sub && sub.courseCode) || "").toUpperCase();
    if (code.startsWith("IT ")) {
      return "IT";
    }
    return "GE_PE";
  }

  function getSubjectCategoryLabel(sub) {
    if (sub && sub.category && String(sub.category).trim()) {
      return String(sub.category).trim();
    }
    return getSubjectCategoryGroup(sub) === "IT" ? "IT Major" : "GE & PE";
  }

  function getSubjectSemesterLabel(sub, profile) {
    if (sub && sub.semester && String(sub.semester).trim()) {
      return String(sub.semester).trim();
    }
    const rawTerm =
      (sub && sub.academicTerm) ||
      (profile && profile.academicTerm) ||
      "2nd Semester, AY 2026–2027";
    return parseAcademicTerm(rawTerm).semester;
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
      <div class="subjects-meetings-list">
        ${sessions
          .map((sess) => {
            const day = sess.day || "Not specified";
            const timeLabel = sess.timeLabel || "Not specified";
            return `
              <div class="subjects-meeting-item">
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
      <div class="subjects-rooms-list">
        ${sessions
          .map((sess) => {
            const room =
              sess.room && String(sess.room).trim() !== ""
                ? String(sess.room).trim()
                : "Not specified";
            const isUnspecified = room.toLowerCase() === "not specified";
            return `
              <span class="badge subjects-room-badge ${
                isUnspecified ? "badge-neutral" : "badge-info"
              }">
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
   * and by selected weekday / category / semester filters.
   */
  function filterSubjectsList(subjects, profile) {
    const q = searchQuery.trim().toLowerCase();

    return subjects.filter((sub) => {
      const fullName = getFullSubjectName(sub);
      const instructor = sub.instructor || "Not specified";
      const rooms = (sub.sessions || []).map((s) => s.room || "Not specified").join(" ");
      const days = (sub.sessions || []).map((s) => `${s.day} ${s.timeLabel}`).join(" ");
      const categoryLabel = getSubjectCategoryLabel(sub);
      const semesterLabel = getSubjectSemesterLabel(sub, profile);

      // Also support searching by demo faculty aliases for T148 / T150
      const demoAlias =
        sub.subjectCode === "T148"
          ? "somera, fabian fabian somera"
          : sub.subjectCode === "T150"
            ? "salvador, francis van francis van salvador"
            : "";

      if (q) {
        const haystack = `${sub.subjectCode} ${sub.courseCode || ""} ${
          sub.subjectName || ""
        } ${fullName} ${instructor} ${sub.section || ""} ${categoryLabel} ${semesterLabel} ${rooms} ${days} ${demoAlias}`.toLowerCase();
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

      if (selectedSemesterFilter !== "All") {
        if (semesterLabel !== selectedSemesterFilter) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort subjects according to selectedSortOrder
   */
  function sortSubjectsList(subjects, sortOrder = selectedSortOrder) {
    if (!Array.isArray(subjects)) return [];
    const copy = [...subjects];
    if (sortOrder === "name-asc") {
      return copy.sort((a, b) => getFullSubjectName(a).localeCompare(getFullSubjectName(b)));
    }
    if (sortOrder === "name-desc") {
      return copy.sort((a, b) => getFullSubjectName(b).localeCompare(getFullSubjectName(a)));
    }
    if (sortOrder === "code-asc") {
      return copy.sort((a, b) =>
        String(a.subjectCode || "").localeCompare(String(b.subjectCode || ""))
      );
    }
    return copy;
  }

  function getRelatedAssignmentsForSubject(tasks, sub) {
    const list = Array.isArray(tasks) ? tasks : [];
    const subCode = String((sub && sub.subjectCode) || "").trim().toLowerCase();
    const courseCode = String((sub && sub.courseCode) || "").trim().toLowerCase();
    return list.filter((t) => {
      const tCode = String((t && t.subjectCode) || "").trim().toLowerCase();
      const tSub = String((t && t.subject) || "").trim().toLowerCase();
      if (subCode && (tCode === subCode || tSub.includes(subCode))) return true;
      if (courseCode && tSub.includes(courseCode)) return true;
      return false;
    });
  }

  /**
   * Open read-only modal with complete subject & schedule details
   */
  function openSubjectDetailsModal(subjectId) {
    const state = StudentHubStorage.getState();
    const profile = state.profile || {};
    const enrolledSubjects = StudentHubStorage.getStudentEnrolledSubjects(
      profile,
      state.schedules
    );
    const sub = enrolledSubjects.find((s) => s.id === subjectId || s.subjectCode === subjectId);
    if (!sub) return;

    const fullName = getFullSubjectName(sub);
    const sessions = Array.isArray(sub.sessions) ? sub.sessions : [];
    const categoryLabel = getSubjectCategoryLabel(sub);
    const semesterLabel = getSubjectSemesterLabel(sub, profile);
    const rawDescription =
      (sub.description && String(sub.description).trim()) ||
      (sub.syllabusDescription && String(sub.syllabusDescription).trim()) ||
      "";
    const relatedTasks = getRelatedAssignmentsForSubject(state.tasks, sub);

    const html = `
      <div class="subject-modal-wrap">
        <div class="subject-modal-badges">
          <span class="badge badge-primary subject-modal-code-badge">Subject Code: ${escapeHtml(
            sub.subjectCode
          )}</span>
          <div class="subject-modal-badges-right">
            <span class="badge badge-neutral">${escapeHtml(categoryLabel)}</span>
            <span class="badge badge-info">Section: ${escapeHtml(
              sub.section || profile.section || "BSIT 2-2"
            )}</span>
          </div>
        </div>

        <div>
          <h3 class="subject-modal-title">${escapeHtml(fullName)}</h3>
          <p class="subject-modal-subtitle">
            ${escapeHtml(sub.course || profile.course || "")} &bull; ${escapeHtml(
              sub.yearLevel || profile.yearLevel || "Year 2"
            )}
          </p>
        </div>

        ${
          rawDescription
            ? `
              <div class="subject-modal-description-box">
                <span class="subject-modal-meta-label">Subject Description</span>
                <p>${escapeHtml(rawDescription)}</p>
              </div>
            `
            : ""
        }

        <div class="subject-modal-meta-grid">
          <div>
            <span class="subject-modal-meta-label">Subject Code</span>
            <strong>${escapeHtml(sub.subjectCode)}</strong>
          </div>
          <div>
            <span class="subject-modal-meta-label">Course Code</span>
            <strong>${escapeHtml(sub.courseCode || "Not specified")}</strong>
          </div>
          <div>
            <span class="subject-modal-meta-label">Assigned Instructor</span>
            <strong>${escapeHtml(sub.instructor || "Not specified")}</strong>
          </div>
          <div>
            <span class="subject-modal-meta-label">Units &amp; Section</span>
            <strong>${escapeHtml(Number(sub.units) || 3)} Units &bull; ${escapeHtml(
              sub.section || profile.section || "BSIT 2-2"
            )}</strong>
          </div>
          <div>
            <span class="subject-modal-meta-label">Subject Category</span>
            <strong>${escapeHtml(categoryLabel)}</strong>
          </div>
          <div>
            <span class="subject-modal-meta-label">Semester</span>
            <strong>${escapeHtml(semesterLabel)}</strong>
          </div>
        </div>

        <div>
          <h4 class="subject-modal-schedule-title">Connected Class Schedule &amp; Room Assignments</h4>
          ${
            sessions.length === 0
              ? `<p class="subject-modal-schedule-empty">Schedule: Not specified &bull; Room: Not specified</p>`
              : `
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Meeting Day</th>
                        <th>Class Time</th>
                        <th>Room / Laboratory</th>
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
                                <span class="badge ${
                                  room.toLowerCase() === "not specified"
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

        <div>
          <h4 class="subject-modal-schedule-title">Related Assignments (${relatedTasks.length})</h4>
          ${
            relatedTasks.length === 0
              ? `<p class="subject-modal-schedule-empty">No assignments linked to this subject.</p>`
              : `
                <div class="subject-modal-tasks-list">
                  ${relatedTasks
                    .map((t) => {
                      const statusCls =
                        t.status === "Completed"
                          ? "badge-success"
                          : t.status === "Overdue"
                            ? "badge-danger"
                            : t.status === "Submitted"
                              ? "badge-info"
                              : "badge-warning";
                      const dueText =
                        typeof formatReadableDate === "function" && t.deadline
                          ? formatReadableDate(t.deadline)
                          : t.deadline || "No deadline";
                      return `
                        <div class="subject-modal-task-item">
                          <div>
                            <div class="subject-modal-task-title">${escapeHtml(t.title)}</div>
                            <div class="subject-modal-task-meta">Due ${escapeHtml(dueText)}</div>
                          </div>
                          <span class="badge ${statusCls}">${escapeHtml(t.status || "Pending")}</span>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              `
          }
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="closeSubjectModalBtn">Close</button>
          ${
            relatedTasks.length > 0
              ? `<button type="button" class="btn btn-secondary" id="openTasksFromSubBtn">Task Manager</button>`
              : ""
          }
          <button type="button" class="btn btn-primary" id="openFullTimetableFromSubBtn">Open Class Schedule &rarr;</button>
        </div>
      </div>
    `;

    openModal(`Subject Details — ${sub.subjectCode}`, html, (bodyEl) => {
      bodyEl.querySelector("#closeSubjectModalBtn")?.addEventListener("click", closeModal);
      bodyEl.querySelector("#openTasksFromSubBtn")?.addEventListener("click", () => {
        closeModal();
        navigateTo("tasks");
      });
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
          <div class="empty-state subjects-empty-state">
            <svg class="subjects-empty-icon" viewBox="0 0 24 24" width="44" height="44" stroke="currentColor" stroke-width="1.6" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <h3>No Subjects Configured for Section ${escapeHtml(
              profile.section || "Unspecified"
            )}</h3>
            <p class="subjects-empty-desc">
              Your student profile is currently set to <strong>${escapeHtml(
                profile.course || "Unspecified Program"
              )}</strong> &bull; <strong>${escapeHtml(
                profile.yearLevel || "Year 1"
              )}</strong> &bull; Section <strong>${escapeHtml(
                profile.section || "Unspecified"
              )}</strong>. No subject load has been configured for this section yet. Official <strong>BSIT 2-2</strong> subjects are only displayed to students enrolled in <strong>Bachelor of Science in Information Technology &bull; Year 2 &bull; BSIT 2-2</strong>.
            </p>
            <div class="subjects-empty-actions">
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

    const filtered = sortSubjectsList(filterSubjectsList(enrolledSubjects, profile), selectedSortOrder);
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
          <div class="empty-state subjects-empty-filtered">
            <h3>No Matching Subjects Found</h3>
            <p>No enrolled subjects matched your search or filter criteria.</p>
            <button type="button" class="btn btn-secondary btn-sm subjects-empty-reset-btn" id="resetSubjectFiltersEmptyBtn">
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
          selectedSemesterFilter = "All";
          selectedSortOrder = "default";
          render();
        });
      return;
    }

    // 3. Render either Card Grid View (default) or Table View
    if (layoutMode === "cards") {
      resultsContainer.innerHTML = `
        <div class="subjects-cards-grid">
          ${filtered
            .map((sub) => {
              const fullName = getFullSubjectName(sub);
              const instructor = sub.instructor || "Not specified";
              const isUnspecifiedInst = instructor.toLowerCase() === "not specified";
              const categoryLabel = getSubjectCategoryLabel(sub);
              const unitsVal = Number(sub.units) || 3;
              const semesterLabel = getSubjectSemesterLabel(sub, profile);
              return `
                <article class="card subject-card">
                  <div class="subject-card-body">
                    <div class="subject-card-top">
                      <span class="badge badge-primary subject-code-badge">${escapeHtml(
                        sub.subjectCode
                      )}</span>
                      <div class="subject-card-badges-right">
                        <span class="badge ${
                          getSubjectCategoryGroup(sub) === "IT" ? "badge-info" : "badge-neutral"
                        }">${escapeHtml(categoryLabel)}</span>
                        <span class="badge badge-neutral">${escapeHtml(unitsVal)} ${
                          unitsVal === 1 ? "Unit" : "Units"
                        }</span>
                      </div>
                    </div>
                    <h3 class="subject-card-title">
                      ${escapeHtml(fullName)}
                    </h3>
                    <div class="subject-card-instructor">
                      <span class="subject-card-meta-label">Instructor</span>
                      <span class="subject-card-meta-value ${
                        isUnspecifiedInst ? "subjects-instructor-unspecified" : ""
                      }">${escapeHtml(instructor)}</span>
                    </div>
                    <div class="subject-card-schedule-group">
                      <div class="subject-card-detail-block">
                        <span class="subject-card-section-label">Class Schedule</span>
                        ${renderSubjectMeetingsHtml(sub)}
                      </div>
                      <div class="subject-card-detail-block">
                        <span class="subject-card-section-label">Room / Laboratory</span>
                        ${renderSubjectRoomsHtml(sub)}
                      </div>
                    </div>
                  </div>
                  <div class="subject-card-footer">
                    <span class="subject-card-footer-meta">${escapeHtml(
                      sub.section || profile.section || "BSIT 2-2"
                    )} &bull; ${escapeHtml(semesterLabel)}</span>
                    <button type="button" class="btn btn-sm btn-secondary" data-view-subject="${escapeHtml(
                      sub.id
                    )}">
                      View Details
                    </button>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      `;
    } else {
      resultsContainer.innerHTML = `
        <div class="card subjects-table-card">
          <div class="card-header">
            <h3 class="card-title">
              <span>Enrolled Subjects &mdash; Section ${escapeHtml(
                profile.section || "BSIT 2-2"
              )}</span>
              <span class="badge badge-primary">${filtered.length} Subject${
                filtered.length === 1 ? "" : "s"
              }</span>
            </h3>
            <span class="badge badge-neutral">Read-Only Official Load</span>
          </div>

          <div class="table-responsive">
            <table class="data-table subjects-data-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Category</th>
                  <th>Units</th>
                  <th>Instructor</th>
                  <th>Class Schedule</th>
                  <th>Room / Lab</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${filtered
                  .map((sub) => {
                    const fullName = getFullSubjectName(sub);
                    const instructor = sub.instructor || "Not specified";
                    const isUnspecifiedInst = instructor.toLowerCase() === "not specified";
                    const categoryLabel = getSubjectCategoryLabel(sub);
                    const unitsVal = Number(sub.units) || 3;
                    return `
                      <tr>
                        <td><span class="badge badge-primary">${escapeHtml(
                          sub.subjectCode
                        )}</span></td>
                        <td>
                          <strong>${escapeHtml(fullName)}</strong>
                        </td>
                        <td><span class="badge badge-neutral">${escapeHtml(
                          categoryLabel
                        )}</span></td>
                        <td><strong>${escapeHtml(unitsVal)}</strong></td>
                        <td>
                          <span class="${
                            isUnspecifiedInst ? "subjects-instructor-unspecified" : ""
                          }">${escapeHtml(instructor)}</span>
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
   * Bind static toolbar & layout switcher listeners once
   */
  function bindSubjectsEventsOnce(container) {
    if (!container || container.dataset.subjectsEventsBound === "1") return;
    container.dataset.subjectsEventsBound = "1";

    document.getElementById("btnSubjectsTableLayout")?.addEventListener("click", () => {
      layoutMode = "table";
      render();
    });

    document.getElementById("btnSubjectsCardLayout")?.addEventListener("click", () => {
      layoutMode = "cards";
      render();
    });

    document
      .getElementById("goToClassScheduleFromSubjectsBtn")
      ?.addEventListener("click", () => {
        navigateTo("schedule");
      });

    const searchInput = document.getElementById("mySubjectsSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderResultsArea();
      });
    }

    const daySelect = document.getElementById("mySubjectsDayFilter");
    if (daySelect) {
      daySelect.addEventListener("change", (e) => {
        selectedDayFilter = e.target.value;
        renderResultsArea();
      });
    }

    const catSelect = document.getElementById("mySubjectsCategoryFilter");
    if (catSelect) {
      catSelect.addEventListener("change", (e) => {
        selectedCategoryFilter = e.target.value;
        renderResultsArea();
      });
    }

    const semSelect = document.getElementById("mySubjectsSemesterFilter");
    if (semSelect) {
      semSelect.addEventListener("change", (e) => {
        selectedSemesterFilter = e.target.value;
        renderResultsArea();
      });
    }

    const sortSelect = document.getElementById("mySubjectsSortSelect");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        selectedSortOrder = e.target.value;
        renderResultsArea();
      });
    }
  }

  function populateSemesterFilterOptions(enrolledSubjects, profile) {
    const semSelect = document.getElementById("mySubjectsSemesterFilter");
    if (!semSelect) return;
    const semesterSet = new Set();
    (enrolledSubjects || []).forEach((sub) => {
      const label = getSubjectSemesterLabel(sub, profile);
      if (label && label !== "—") semesterSet.add(label);
    });
    if (semesterSet.size === 0) {
      const fallbackSem = parseAcademicTerm(
        (profile && profile.academicTerm) || "2nd Semester, AY 2026–2027"
      ).semester;
      if (fallbackSem && fallbackSem !== "—") semesterSet.add(fallbackSem);
    }

    const optionsHtml = [
      `<option value="All">All Semesters</option>`,
      ...[...semesterSet].map(
        (sem) => `<option value="${escapeHtml(sem)}">${escapeHtml(sem)}</option>`
      )
    ].join("");
    semSelect.innerHTML = optionsHtml;
    if (selectedSemesterFilter !== "All" && !semesterSet.has(selectedSemesterFilter)) {
      selectedSemesterFilter = "All";
    }
    semSelect.value = selectedSemesterFilter;
  }

  /**
   * Main render for the Student My Subjects Page
   * Hydrates `pages/student/subjects.html` in place.
   */
  function render() {
    const container = document.getElementById("subjectsContainer");
    if (!container) return;

    bindSubjectsEventsOnce(container);

    const state = StudentHubStorage.getState();
    const profile = state.profile || {};
    const enrolledSubjects = StudentHubStorage.getStudentEnrolledSubjects(
      profile,
      state.schedules
    );
    const allSessions = StudentHubStorage.getAllScheduleSessions(enrolledSubjects);
    const totalUnits = enrolledSubjects.reduce((sum, s) => sum + (Number(s.units) || 3), 0);
    const assignedInstructorsCount = enrolledSubjects.filter(
      (s) => s.instructor && s.instructor.toLowerCase() !== "not specified"
    ).length;
    const unspecifiedCount = enrolledSubjects.length - assignedInstructorsCount;
    const termStr = profile.academicTerm || "2nd Semester, AY 2026–2027";
    const parsedTerm = parseAcademicTerm(termStr);

    // Hydrate Overview Header & Academic Year / Semester Pills
    const titleEl = document.getElementById("subjectsSectionTitle");
    const termSummaryEl = document.getElementById("subjectsTermSummary");
    const sectionPillEl = document.getElementById("subjectsSectionPill");
    const ayPillEl = document.getElementById("subjectsAcademicYearPill");
    const semPillEl = document.getElementById("subjectsSemesterPill");

    if (titleEl) {
      titleEl.innerHTML = `My Subjects &mdash; ${escapeHtml(profile.section || "BSIT 2-2")}`;
    }
    if (termSummaryEl) {
      termSummaryEl.innerHTML = `
        <strong>Program:</strong> ${escapeHtml(
          profile.course || "Bachelor of Science in Information Technology"
        )} &bull;
        <strong>Year Level:</strong> ${escapeHtml(profile.yearLevel || "Year 2")}
      `;
    }
    if (sectionPillEl) {
      sectionPillEl.textContent = `Section: ${profile.section || "BSIT 2-2"}`;
    }
    if (ayPillEl) {
      ayPillEl.textContent = `Academic Year: ${parsedTerm.academicYear}`;
    }
    if (semPillEl) {
      semPillEl.textContent = `Semester: ${parsedTerm.semester}`;
    }

    // Update active view switcher button states
    const tableBtn = document.getElementById("btnSubjectsTableLayout");
    const cardBtn = document.getElementById("btnSubjectsCardLayout");
    if (tableBtn) {
      tableBtn.classList.toggle("btn-primary", layoutMode === "table");
      tableBtn.classList.toggle("btn-secondary", layoutMode !== "table");
    }
    if (cardBtn) {
      cardBtn.classList.toggle("btn-primary", layoutMode === "cards");
      cardBtn.classList.toggle("btn-secondary", layoutMode !== "cards");
    }

    // Hydrate Summary Stat Cards
    const statCountEl = document.getElementById("subjectsStatCount");
    const statSectionSubEl = document.getElementById("subjectsStatSectionSub");
    const statUnitsEl = document.getElementById("subjectsStatUnits");
    const statUnitsSubEl = document.getElementById("subjectsStatUnitsSub");
    const statSessionsEl = document.getElementById("subjectsStatSessions");
    const statSessionsSubEl = document.getElementById("subjectsStatSessionsSub");
    const statInstrEl = document.getElementById("subjectsStatInstructors");
    const statInstrSubEl = document.getElementById("subjectsStatInstructorsSub");

    if (statCountEl) statCountEl.textContent = String(enrolledSubjects.length);
    if (statSectionSubEl) {
      statSectionSubEl.textContent = `Section ${profile.section || "BSIT 2-2"}`;
    }
    if (statUnitsEl) statUnitsEl.textContent = `${totalUnits} Units`;
    if (statUnitsSubEl) {
      statUnitsSubEl.textContent = `${profile.yearLevel || "Year 2"} Curriculum Load`;
    }
    if (statSessionsEl) statSessionsEl.textContent = `${allSessions.length} Sessions`;
    if (statSessionsSubEl) {
      statSessionsSubEl.textContent = `Connected to ${profile.section || "BSIT 2-2"} Timetable`;
    }
    if (statInstrEl) {
      statInstrEl.textContent = `${assignedInstructorsCount} / ${enrolledSubjects.length}`;
    }
    if (statInstrSubEl) {
      statInstrSubEl.textContent =
        unspecifiedCount > 0
          ? `${unspecifiedCount} Subject Instructor Not Specified`
          : "All Instructors Assigned";
    }

    // Sync Toolbar Inputs
    const searchInput = document.getElementById("mySubjectsSearchInput");
    const daySelect = document.getElementById("mySubjectsDayFilter");
    const catSelect = document.getElementById("mySubjectsCategoryFilter");
    const sortSelect = document.getElementById("mySubjectsSortSelect");
    if (searchInput && searchInput.value !== searchQuery) searchInput.value = searchQuery;
    if (daySelect) daySelect.value = selectedDayFilter;
    if (catSelect) catSelect.value = selectedCategoryFilter;
    if (sortSelect) sortSelect.value = selectedSortOrder;
    populateSemesterFilterOptions(enrolledSubjects, profile);

    renderResultsArea();
  }

  return {
    render,
    getFullSubjectName,
    parseAcademicTerm,
    getSubjectCategoryGroup,
    getSubjectCategoryLabel,
    getSubjectSemesterLabel,
    sortSubjectsList,
    filterSubjectsList
  };
})();

window.StudentHubSubjects = StudentHubSubjects;
