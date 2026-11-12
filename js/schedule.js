/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 3: Class Schedule (schedule.js)
 *
 * Hydrates `pages/student/schedule.html` with the student's Monday–Friday
 * (and Saturday if applicable) timetable connected directly to enrolled records:
 * - Overview pills (Section, Academic Year, Semester) & total class hours
 * - Weekly Timetable Grid with chronological order, subtle subject colors & overlap check
 * - Daily Schedule View with Prev / Today / Next weekday navigation
 * - Class Details modal & Connected Enrolled Subjects Reference Table
 * - Live search by subject code, course code, subject name, instructor, or room
 * ============================================================================
 */

const StudentHubSchedule = (function () {
  const { escapeHtml, getTodayDayName, openModal, closeModal, navigateTo } =
    window.StudentHubApp;

  const BASE_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  let viewMode = "weekly"; // "weekly" | "daily"
  let selectedDay = null;
  let searchQuery = "";
  let renderedSessionsByKey = Object.create(null);

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

  function parseTimeMinutes(hhmm) {
    if (!hhmm || typeof hhmm !== "string") return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const mins = Number(match[2]);
    if (isNaN(hours) || isNaN(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
      return null;
    }
    return hours * 60 + mins;
  }

  function computeSessionDurationMinutes(sess) {
    if (!sess) return 0;
    const start = parseTimeMinutes(sess.startTime);
    const end = parseTimeMinutes(sess.endTime);
    if (start === null || end === null || end <= start) return 0;
    return end - start;
  }

  function formatDurationLabel(mins) {
    if (!mins || mins <= 0) return "Not specified";
    if (mins < 60) return `${mins} mins`;
    const hrs = mins / 60;
    const rounded = Number.isInteger(hrs) ? String(hrs) : hrs.toFixed(1);
    return `${rounded} ${hrs === 1 ? "hr" : "hrs"}`;
  }

  function formatTotalWeeklyHours(sessions) {
    const totalMins = (sessions || []).reduce(
      (sum, sess) => sum + computeSessionDurationMinutes(sess),
      0
    );
    if (totalMins <= 0) return "0 hrs/wk total class hours";
    const hrs = totalMins / 60;
    const label = Number.isInteger(hrs) ? String(hrs) : hrs.toFixed(1);
    return `${label} hrs/wk total class hours`;
  }

  function sortChronologicalSessions(sessions) {
    return [...(sessions || [])].sort((a, b) => {
      const startCmp = String(a.startTime || "").localeCompare(String(b.startTime || ""));
      if (startCmp !== 0) return startCmp;
      return String(a.endTime || "").localeCompare(String(b.endTime || ""));
    });
  }

  function detectOverlappingIndices(sortedSessions) {
    const conflictIndices = new Set();
    for (let i = 0; i < sortedSessions.length; i++) {
      const aStart = parseTimeMinutes(sortedSessions[i].startTime);
      const aEnd = parseTimeMinutes(sortedSessions[i].endTime);
      if (aStart === null || aEnd === null) continue;
      for (let j = i + 1; j < sortedSessions.length; j++) {
        const bStart = parseTimeMinutes(sortedSessions[j].startTime);
        const bEnd = parseTimeMinutes(sortedSessions[j].endTime);
        if (bStart === null || bEnd === null) continue;
        if (aStart < bEnd && bStart < aEnd) {
          conflictIndices.add(i);
          conflictIndices.add(j);
        }
      }
    }
    return conflictIndices;
  }

  function getSubjectToneClass(subjectCode) {
    const code = String(subjectCode || "");
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (hash * 31 + code.charCodeAt(i)) % 7;
    }
    return `schedule-tone-${Math.abs(hash) % 7}`;
  }

  function getActiveDays(subjects) {
    const satSessions = StudentHubStorage.getSessionsByDay("Saturday", subjects) || [];
    return satSessions.length > 0 ? [...BASE_WEEKDAYS, "Saturday"] : [...BASE_WEEKDAYS];
  }

  function getDefaultSelectedDay(activeDays) {
    const today = getTodayDayName();
    return activeDays.includes(today) ? today : "Monday";
  }

  function filterSession(sess, q) {
    if (!q) return true;
    const hay = `${sess.subjectCode} ${sess.courseCode} ${sess.subjectName} ${sess.displaySubject} ${sess.instructor} ${sess.room} ${sess.timeLabel} ${sess.day}`.toLowerCase();
    return hay.includes(q);
  }

  function openClassDetailsModal(sessionKey) {
    const entry = renderedSessionsByKey[sessionKey];
    if (!entry || typeof openModal !== "function") return;
    const { sess, isConflict, sectionLabel } = entry;
    const durationMins = computeSessionDurationMinutes(sess);
    const durationLabel = formatDurationLabel(durationMins);
    const room =
      sess.room && String(sess.room).trim() !== "" ? String(sess.room).trim() : "Not specified";

    const html = `
      <div class="schedule-modal-wrap">
        <div class="schedule-modal-badges">
          <span class="badge badge-primary">${escapeHtml(sess.subjectCode)}</span>
          <div class="schedule-modal-badges-right">
            <span class="badge badge-info">${escapeHtml(sess.day || "Not specified")}</span>
            ${
              isConflict
                ? `<span class="badge badge-danger">Schedule Overlap Detected</span>`
                : ""
            }
          </div>
        </div>

        <div>
          <h3 class="schedule-modal-title">${escapeHtml(sess.displaySubject || sess.subjectName)}</h3>
          <p class="schedule-modal-sub">${escapeHtml(
            sess.courseCode ? `${sess.courseCode} • ` : ""
          )}Section ${escapeHtml(sess.section || sectionLabel || "BSIT 2-2")}</p>
        </div>

        <div class="schedule-modal-meta-grid">
          <div>
            <span class="schedule-modal-meta-label">Schedule Day</span>
            <strong>${escapeHtml(sess.day || "Not specified")}</strong>
          </div>
          <div>
            <span class="schedule-modal-meta-label">Class Time</span>
            <strong>${escapeHtml(sess.timeLabel || "Not specified")}</strong>
          </div>
          <div>
            <span class="schedule-modal-meta-label">Class Duration</span>
            <strong>${escapeHtml(durationLabel)}</strong>
          </div>
          <div>
            <span class="schedule-modal-meta-label">Room / Laboratory</span>
            <strong>${escapeHtml(room)}</strong>
          </div>
          <div>
            <span class="schedule-modal-meta-label">Assigned Instructor</span>
            <strong>${escapeHtml(sess.instructor || "Not specified")}</strong>
          </div>
          <div>
            <span class="schedule-modal-meta-label">Units</span>
            <strong>${escapeHtml(Number(sess.units) || 3)} Units</strong>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="closeClassDetailModalBtn">Close</button>
          <button type="button" class="btn btn-primary" id="openSubjectsFromClassBtn">My Subjects &rarr;</button>
        </div>
      </div>
    `;

    openModal(`Class Details — ${sess.subjectCode}`, html, (bodyEl) => {
      bodyEl.querySelector("#closeClassDetailModalBtn")?.addEventListener("click", closeModal);
      bodyEl.querySelector("#openSubjectsFromClassBtn")?.addEventListener("click", () => {
        if (typeof closeModal === "function") closeModal();
        if (typeof navigateTo === "function") navigateTo("subjects");
      });
    });
  }

  function renderTimetableOnly() {
    const timetableEl = document.getElementById("scheduleTimetableContainer");
    if (!timetableEl) return;

    const state = StudentHubStorage.getState();
    const subjects = StudentHubStorage.getStudentEnrolledSubjects(
      state.profile,
      state.schedules
    );
    const activeDays = getActiveDays(subjects);
    const todayName = getTodayDayName();
    if (!selectedDay || !activeDays.includes(selectedDay)) {
      selectedDay = getDefaultSelectedDay(activeDays);
    }
    const sectionLabel = (state.profile && state.profile.section) || "BSIT 2-2";
    const q = searchQuery.trim().toLowerCase();

    renderedSessionsByKey = Object.create(null);

    timetableEl.innerHTML =
      viewMode === "weekly"
        ? renderWeeklyTimetable(subjects, activeDays, todayName, q, sectionLabel)
        : renderDailySchedule(subjects, activeDays, selectedDay, todayName, q, sectionLabel);
  }

  function bindScheduleEventsOnce(container) {
    if (!container || container.dataset.scheduleEventsBound === "1") return;
    container.dataset.scheduleEventsBound = "1";

    document.getElementById("btnWeeklyView")?.addEventListener("click", () => {
      viewMode = "weekly";
      render();
    });

    document.getElementById("btnDailyView")?.addEventListener("click", () => {
      viewMode = "daily";
      render();
    });

    document.getElementById("btnJumpTodaySchedule")?.addEventListener("click", () => {
      const state = StudentHubStorage.getState();
      const subjects = StudentHubStorage.getStudentEnrolledSubjects(
        state.profile,
        state.schedules
      );
      const activeDays = getActiveDays(subjects);
      selectedDay = getDefaultSelectedDay(activeDays);
      viewMode = "daily";
      render();
    });

    container.addEventListener("click", (e) => {
      const dayTabBtn = e.target.closest ? e.target.closest("[data-select-day]") : null;
      if (dayTabBtn) {
        selectedDay = dayTabBtn.getAttribute("data-select-day");
        viewMode = "daily";
        render();
        return;
      }

      const navDayBtn = e.target.closest ? e.target.closest("[data-nav-day]") : null;
      if (navDayBtn) {
        const dir = navDayBtn.getAttribute("data-nav-day");
        const state = StudentHubStorage.getState();
        const subjects = StudentHubStorage.getStudentEnrolledSubjects(
          state.profile,
          state.schedules
        );
        const activeDays = getActiveDays(subjects);
        if (dir === "today") {
          selectedDay = getDefaultSelectedDay(activeDays);
        } else {
          const curIdx = Math.max(0, activeDays.indexOf(selectedDay));
          const delta = dir === "prev" ? -1 : 1;
          const nextIdx = (curIdx + delta + activeDays.length) % activeDays.length;
          selectedDay = activeDays[nextIdx];
        }
        viewMode = "daily";
        render();
        return;
      }

      const detailTrigger = e.target.closest ? e.target.closest("[data-open-class-detail]") : null;
      if (detailTrigger) {
        openClassDetailsModal(detailTrigger.getAttribute("data-open-class-detail"));
      }
    });

    const searchInput = document.getElementById("scheduleSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderTimetableOnly();
      });
    }
  }

  function render() {
    const container = document.getElementById("scheduleContainer");
    if (!container) return;

    bindScheduleEventsOnce(container);

    const state = StudentHubStorage.getState();
    const profile = state.profile || {};
    const subjects = StudentHubStorage.getStudentEnrolledSubjects(profile, state.schedules);
    const activeDays = getActiveDays(subjects);
    const todayName = getTodayDayName();
    if (!selectedDay || !activeDays.includes(selectedDay)) {
      selectedDay = getDefaultSelectedDay(activeDays);
    }

    const sectionLabel = profile.section || "BSIT 2-2";
    const courseLabel = profile.course || "Bachelor of Science in Information Technology";
    const termLabel = profile.academicTerm || "2nd Semester, AY 2026–2027";
    const parsedTerm = parseAcademicTerm(termLabel);
    const allSessions = StudentHubStorage.getAllScheduleSessions(subjects);

    // Check full-week overlaps for conflict banner
    const conflictDays = [];
    activeDays.forEach((d) => {
      const sortedDay = sortChronologicalSessions(
        StudentHubStorage.getSessionsByDay(d, subjects)
      );
      if (detectOverlappingIndices(sortedDay).size > 0) {
        conflictDays.push(d);
      }
    });

    const conflictBanner = document.getElementById("scheduleConflictBanner");
    const conflictBannerText = document.getElementById("scheduleConflictBannerText");
    if (conflictBanner && conflictBannerText) {
      if (conflictDays.length > 0) {
        conflictBanner.hidden = false;
        conflictBannerText.innerHTML = `<strong>Schedule Overlap Notice:</strong> Overlapping class times detected on <strong>${escapeHtml(
          conflictDays.join(", ")
        )}</strong>. Conflicting classes are highlighted below.`;
      } else {
        conflictBanner.hidden = true;
        conflictBannerText.textContent = "";
      }
    }

    // 1. Hydrate Overview Header & Pills
    const titleEl = document.getElementById("scheduleSectionTitle");
    const termSummaryEl = document.getElementById("scheduleTermSummary");
    const sectionPillEl = document.getElementById("scheduleSectionPill");
    const ayPillEl = document.getElementById("scheduleAcademicYearPill");
    const semPillEl = document.getElementById("scheduleSemesterPill");

    if (titleEl) {
      titleEl.innerHTML = `Class Schedule &mdash; ${escapeHtml(sectionLabel)}`;
    }
    if (termSummaryEl) {
      termSummaryEl.innerHTML = `
        <strong>Program:</strong> ${escapeHtml(courseLabel)} &bull;
        <strong>Year &amp; Section:</strong> ${escapeHtml(sectionLabel)}
      `;
    }
    if (sectionPillEl) sectionPillEl.textContent = `Section: ${sectionLabel}`;
    if (ayPillEl) ayPillEl.textContent = `Academic Year: ${parsedTerm.academicYear}`;
    if (semPillEl) semPillEl.textContent = `Semester: ${parsedTerm.semester}`;

    const btnWeekly = document.getElementById("btnWeeklyView");
    const btnDaily = document.getElementById("btnDailyView");
    if (btnWeekly) {
      btnWeekly.classList.toggle("btn-primary", viewMode === "weekly");
      btnWeekly.classList.toggle("btn-secondary", viewMode !== "weekly");
    }
    if (btnDaily) {
      btnDaily.classList.toggle("btn-primary", viewMode === "daily");
      btnDaily.classList.toggle("btn-secondary", viewMode !== "daily");
    }

    // 2. Hydrate Summary Stat Cards
    const statSecEl = document.getElementById("scheduleStatSection");
    const statCourseSubEl = document.getElementById("scheduleStatCourseSub");
    const statSubEl = document.getElementById("scheduleStatSubjects");
    const statSessEl = document.getElementById("scheduleStatSessions");
    const statHoursEl = document.getElementById("scheduleStatHours");
    const statTodayEl = document.getElementById("scheduleStatToday");
    const statTodaySubEl = document.getElementById("scheduleStatTodaySub");

    if (statSecEl) statSecEl.textContent = sectionLabel;
    if (statCourseSubEl) statCourseSubEl.textContent = courseLabel;
    if (statSubEl) statSubEl.textContent = `${subjects.length} Subjects`;
    if (statSessEl) statSessEl.textContent = `${allSessions.length} Classes`;
    if (statHoursEl) statHoursEl.textContent = formatTotalWeeklyHours(allSessions);
    if (statTodayEl) statTodayEl.textContent = todayName;
    if (statTodaySubEl) {
      statTodaySubEl.textContent = activeDays.includes(todayName)
        ? `${StudentHubStorage.getSessionsByDay(todayName, subjects).length} classes scheduled today`
        : "Weekend — Next classes on Monday";
    }

    // 3. Hydrate Weekday Tabs & Search Input
    const quickJumpLabel = document.getElementById("scheduleQuickJumpLabel");
    if (quickJumpLabel) {
      quickJumpLabel.hidden = viewMode !== "weekly";
    }
    container.querySelectorAll("[data-select-day]").forEach((btn) => {
      const day = btn.getAttribute("data-select-day");
      const showDay = activeDays.includes(day);
      btn.hidden = !showDay;
      if (!showDay) return;

      const count = StudentHubStorage.getSessionsByDay(day, subjects).length;
      const isToday = day === todayName;
      const isActive = viewMode === "daily" && selectedDay === day;

      btn.classList.toggle("active", isActive);
      btn.classList.toggle("today-indicator", isToday);
      btn.textContent = `${day} (${count})${isToday ? " • Today" : ""}`;
    });

    const searchInput = document.getElementById("scheduleSearchInput");
    if (searchInput && searchInput.value !== searchQuery) {
      searchInput.value = searchQuery;
    }

    // 4. Hydrate Weekly / Daily Timetable
    renderTimetableOnly();

    // 5. Hydrate Connected Enrolled Subjects Reference Table
    const refHeadingEl = document.getElementById("scheduleRefHeading");
    const refCountBadgeEl = document.getElementById("scheduleRefCountBadge");
    const refBodyEl = document.getElementById("scheduleRefTableBody");

    if (refHeadingEl) {
      refHeadingEl.textContent = `Connected ${sectionLabel} Subject Records & Assigned Instructors`;
    }
    if (refCountBadgeEl) {
      refCountBadgeEl.textContent = `${subjects.length} Unique Subjects`;
    }
    if (refBodyEl) {
      refBodyEl.innerHTML =
        subjects.length === 0
          ? `<tr><td colspan="6" class="schedule-ref-empty">No enrolled subject records found for Section ${escapeHtml(
              sectionLabel
            )}.</td></tr>`
          : subjects
              .map(
                (sub) => `
                  <tr>
                    <td><strong>${escapeHtml(sub.subjectCode)}</strong></td>
                    <td><span class="badge badge-primary">${escapeHtml(
                      sub.courseCode || "BSIT"
                    )}</span></td>
                    <td><strong>${escapeHtml(sub.subjectName)}</strong></td>
                    <td>${escapeHtml(sub.instructor || "Not specified")}</td>
                    <td>${escapeHtml(sub.units || 3)}</td>
                    <td>
                      <div class="schedule-ref-sessions-list">
                        ${(sub.sessions || [])
                          .map(
                            (s) =>
                              `<div class="schedule-ref-session-row">
                                <strong>${escapeHtml(s.day)}:</strong> ${escapeHtml(s.timeLabel)}
                                <span class="badge badge-neutral schedule-ref-room-badge">Room: ${escapeHtml(
                                  s.room || "Not specified"
                                )}</span>
                              </div>`
                          )
                          .join("")}
                      </div>
                    </td>
                  </tr>
                `
              )
              .join("");
    }
  }

  /**
   * Render Weekly Timetable Grid (Monday–Friday, plus Saturday if applicable)
   */
  function renderWeeklyTimetable(subjects, activeDays, todayName, q, sectionLabel = "BSIT 2-2") {
    if (!subjects || subjects.length === 0) {
      return `
        <div class="card">
          <div class="empty-state schedule-empty-compact">
            <h3>No Class Schedule Found</h3>
            <p>No classes have been scheduled for Section <strong>${escapeHtml(
              sectionLabel
            )}</strong>.</p>
          </div>
        </div>
      `;
    }

    const boardColsCls =
      activeDays.length >= 6 ? "schedule-week-board schedule-week-board-6" : "schedule-week-board";

    return `
      <div class="card schedule-board-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Weekly Class Timetable &mdash; ${escapeHtml(sectionLabel)}</h3>
            <p class="schedule-card-sublabel">Chronological schedule per weekday &bull; Click any class for details</p>
          </div>
          <span class="badge badge-neutral">${escapeHtml(activeDays[0])} &ndash; ${escapeHtml(
            activeDays[activeDays.length - 1]
          )}</span>
        </div>

        <div class="schedule-board-scroll">
          <div class="${boardColsCls}">
            ${activeDays
              .map((day) => {
                const sortedDaySessions = sortChronologicalSessions(
                  StudentHubStorage.getSessionsByDay(day, subjects)
                );
                const conflictIndices = detectOverlappingIndices(sortedDaySessions);
                const visiblePairs = sortedDaySessions
                  .map((sess, idx) => ({ sess, idx, isConflict: conflictIndices.has(idx) }))
                  .filter((pair) => filterSession(pair.sess, q));
                const isToday = day === todayName;

                return `
                  <div class="schedule-week-col ${isToday ? "is-today" : ""}">
                    <div class="schedule-week-col-header">
                      <span class="schedule-week-day-title">${escapeHtml(day)}</span>
                      ${
                        isToday
                          ? `<span class="badge badge-primary">Today</span>`
                          : `<span class="badge badge-neutral">${visiblePairs.length}</span>`
                      }
                    </div>

                    <div class="schedule-week-col-body">
                      ${
                        visiblePairs.length === 0
                          ? `<div class="schedule-col-empty">No matching classes</div>`
                          : visiblePairs
                              .map(({ sess, idx, isConflict }) => {
                                const key = `${day}__${idx}__${sess.subjectCode}`;
                                renderedSessionsByKey[key] = { sess, isConflict, sectionLabel };
                                const toneCls = getSubjectToneClass(sess.subjectCode);
                                const durationMins = computeSessionDurationMinutes(sess);
                                return `
                                  <button
                                    type="button"
                                    class="schedule-slot-card ${toneCls} ${
                                      isConflict ? "is-conflict" : ""
                                    }"
                                    data-open-class-detail="${escapeHtml(key)}"
                                  >
                                    <div class="schedule-slot-top">
                                      <span class="badge badge-primary">${escapeHtml(
                                        sess.subjectCode
                                      )}</span>
                                      ${
                                        isConflict
                                          ? `<span class="badge badge-danger">Overlap</span>`
                                          : durationMins > 0
                                            ? `<span class="schedule-slot-dur">${escapeHtml(
                                                formatDurationLabel(durationMins)
                                              )}</span>`
                                            : ""
                                      }
                                    </div>
                                    <div class="schedule-slot-time">${escapeHtml(
                                      sess.timeLabel || "Not specified"
                                    )}</div>
                                    <div class="schedule-slot-subject">${escapeHtml(
                                      sess.displaySubject || sess.subjectName
                                    )}</div>
                                    <div class="schedule-slot-meta">
                                      <span><strong>Instructor:</strong> ${escapeHtml(
                                        sess.instructor || "Not specified"
                                      )}</span>
                                      <span><strong>Room:</strong> ${escapeHtml(
                                        sess.room || "Not specified"
                                      )}</span>
                                    </div>
                                  </button>
                                `;
                              })
                              .join("")
                      }
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Daily Schedule View for the selected weekday
   */
  function renderDailySchedule(
    subjects,
    activeDays,
    day,
    todayName,
    q,
    sectionLabel = "BSIT 2-2"
  ) {
    const sortedDaySessions = sortChronologicalSessions(
      StudentHubStorage.getSessionsByDay(day, subjects)
    );
    const conflictIndices = detectOverlappingIndices(sortedDaySessions);
    const dayPairs = sortedDaySessions
      .map((sess, idx) => ({ sess, idx, isConflict: conflictIndices.has(idx) }))
      .filter((pair) => filterSession(pair.sess, q));
    const isToday = day === todayName;

    return `
      <div class="card schedule-day-card ${isToday ? "is-today" : ""}">
        <div class="card-header">
          <div>
            <h3 class="card-title">
              <span>${escapeHtml(day.toUpperCase())} &mdash; Daily Class Schedule (${escapeHtml(
                sectionLabel
              )})</span>
              ${isToday ? `<span class="badge badge-primary">Today</span>` : ""}
              <span class="badge badge-info">${dayPairs.length} Scheduled ${
                dayPairs.length === 1 ? "Class" : "Classes"
              }</span>
            </h3>
            <p class="schedule-card-sublabel">Chronological daily classes &bull; Use controls to step through days</p>
          </div>
          <div class="schedule-daily-nav" role="group" aria-label="Navigate Days">
            <button type="button" class="btn btn-sm btn-secondary" data-nav-day="prev">&larr; Prev Day</button>
            <button type="button" class="btn btn-sm btn-secondary" data-nav-day="today">Today</button>
            <button type="button" class="btn btn-sm btn-secondary" data-nav-day="next">Next Day &rarr;</button>
          </div>
        </div>

        ${
          dayPairs.length === 0
            ? `<div class="empty-state schedule-empty-compact"><p>No classes match your search for ${escapeHtml(
                day
              )}.</p></div>`
            : `
            <div class="table-responsive schedule-daily-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="schedule-col-time">Time</th>
                    <th>Subject</th>
                    <th class="schedule-col-code">Subject Code</th>
                    <th class="schedule-col-instructor">Instructor</th>
                    <th class="schedule-col-room">Room</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  ${dayPairs
                    .map(({ sess, idx, isConflict }) => {
                      const key = `${day}__daily__${idx}__${sess.subjectCode}`;
                      renderedSessionsByKey[key] = { sess, isConflict, sectionLabel };
                      return `
                        <tr class="${isConflict ? "schedule-row-conflict" : ""}">
                          <td>
                            <span class="time-pill schedule-time-pill-inline">${escapeHtml(
                              sess.timeLabel
                            )}</span>
                            ${
                              isConflict
                                ? `<span class="badge badge-danger schedule-inline-conflict-badge">Overlap</span>`
                                : ""
                            }
                          </td>
                          <td><strong>${escapeHtml(sess.displaySubject)}</strong></td>
                          <td><span class="badge badge-info">${escapeHtml(sess.subjectCode)}</span></td>
                          <td>${escapeHtml(sess.instructor)}</td>
                          <td>
                            <span class="badge ${
                              sess.room === "Not specified" ? "badge-neutral" : "badge-primary"
                            }">${escapeHtml(sess.room)}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              class="btn btn-sm btn-secondary"
                              data-open-class-detail="${escapeHtml(key)}"
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

            <div class="schedule-days-grid">
              ${dayPairs
                .map(({ sess, idx, isConflict }) => {
                  const key = `${day}__daily__${idx}__${sess.subjectCode}`;
                  const toneCls = getSubjectToneClass(sess.subjectCode);
                  return `
                    <div
                      class="schedule-item-card schedule-daily-card-item ${toneCls} ${
                        isConflict ? "is-conflict" : ""
                      }"
                    >
                      <div class="schedule-item-top">
                        <span class="time-pill">${escapeHtml(sess.timeLabel)}</span>
                        <span class="badge ${
                          isConflict ? "badge-danger" : "badge-primary"
                        }">${
                          isConflict ? "Overlap" : `Room: ${escapeHtml(sess.room)}`
                        }</span>
                      </div>
                      <div class="schedule-subject schedule-daily-subject">
                        ${escapeHtml(sess.displaySubject)}
                      </div>
                      <div class="schedule-details">
                        <span><strong>Subject Code:</strong> ${escapeHtml(sess.subjectCode)}</span>
                        <span><strong>Room:</strong> ${escapeHtml(sess.room)}</span>
                      </div>
                      <div class="schedule-details">
                        <span><strong>Instructor:</strong> ${escapeHtml(sess.instructor)}</span>
                      </div>
                      <div class="schedule-item-footer">
                        <button
                          type="button"
                          class="btn btn-sm btn-secondary"
                          data-open-class-detail="${escapeHtml(key)}"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
        }
      </div>
    `;
  }

  return {
    render,
    parseAcademicTerm,
    parseTimeMinutes,
    computeSessionDurationMinutes,
    formatDurationLabel,
    detectOverlappingIndices,
    sortChronologicalSessions,
    getActiveDays
  };
})();

window.StudentHubSchedule = StudentHubSchedule;
