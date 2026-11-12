/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 1: Student Dashboard (dashboard.js)
 *
 * Hydrates `pages/student/dashboard.html` with live student data:
 * - Welcome banner & student information
 * - 4 summary overview cards (Subjects, Grades, Attendance, Pending Tasks)
 * - Today's / Upcoming classes from the student's timetable
 * - Enrolled subjects summary table & grades link
 * - Upcoming academic assignments with quick completion/submission actions
 * - Recent published university announcements
 * ============================================================================
 */

const StudentHubDashboard = (function () {
  const {
    escapeHtml,
    formatReadableDate,
    getTodayDayName,
    navigateTo
  } = window.StudentHubApp;

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

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

  function findHighlightedClass(sessions, isWeekday, nowDate) {
    if (!isWeekday || !Array.isArray(sessions) || sessions.length === 0) return null;
    const refDate =
      nowDate && typeof nowDate.getHours === "function" ? nowDate : new Date();
    const nowMins = refDate.getHours() * 60 + refDate.getMinutes();

    for (let i = 0; i < sessions.length; i++) {
      const start = parseTimeMinutes(sessions[i].startTime);
      const end = parseTimeMinutes(sessions[i].endTime);
      if (start !== null && end !== null && nowMins >= start && nowMins < end) {
        return { index: i, kind: "current", label: "In Progress", badge: "badge-success" };
      }
    }

    for (let i = 0; i < sessions.length; i++) {
      const start = parseTimeMinutes(sessions[i].startTime);
      if (start !== null && start > nowMins) {
        return { index: i, kind: "next", label: "Up Next", badge: "badge-primary" };
      }
    }

    return null;
  }

  function getGradeStanding(score) {
    if (score === null || score === undefined || isNaN(score)) {
      return { eq: "—", label: "No grade recorded.", badge: "badge-neutral", fill: "" };
    }
    if (score >= 96) return { eq: "1.00", label: "Excellent", badge: "badge-success", fill: "fill-success" };
    if (score >= 93) return { eq: "1.25", label: "Superior", badge: "badge-success", fill: "fill-success" };
    if (score >= 90) return { eq: "1.50", label: "Very Good", badge: "badge-success", fill: "fill-success" };
    if (score >= 87) return { eq: "1.75", label: "Good", badge: "badge-info", fill: "" };
    if (score >= 84) return { eq: "2.00", label: "Above Average", badge: "badge-info", fill: "" };
    if (score >= 81) return { eq: "2.25", label: "Average", badge: "badge-primary", fill: "" };
    if (score >= 78) return { eq: "2.50", label: "Satisfactory", badge: "badge-primary", fill: "" };
    if (score >= 75) return { eq: "3.00", label: "Passing", badge: "badge-warning", fill: "fill-warning" };
    return { eq: "5.00", label: "Needs Improvement", badge: "badge-danger", fill: "fill-danger" };
  }

  function bindDashboardEventsOnce(container) {
    if (!container || container.dataset.dashEventsBound === "1") return;
    container.dataset.dashEventsBound = "1";

    container.addEventListener("click", (e) => {
      const submitBtn = e.target.closest(".dash-open-submit-btn");
      if (submitBtn) {
        const taskId = submitBtn.getAttribute("data-task-id");
        const state = StudentHubStorage.getState();
        const task = (state.tasks || []).find((t) => t.id === taskId);
        if (task && window.StudentHubTasks && window.StudentHubTasks.openSubmissionModal) {
          window.StudentHubTasks.openSubmissionModal(task);
        }
        return;
      }

      const annItem = e.target.closest("[data-open-dash-ann]");
      if (annItem) {
        const annId = annItem.getAttribute("data-open-dash-ann");
        if (
          window.StudentHubAnnouncements &&
          window.StudentHubAnnouncements.openAnnouncementDetails
        ) {
          window.StudentHubAnnouncements.openAnnouncementDetails(annId);
        } else {
          navigateTo("announcements");
        }
        return;
      }

      const navTarget = e.target.closest("[data-nav]");
      if (navTarget) {
        navigateTo(navTarget.getAttribute("data-nav"));
      }
    });

    container.addEventListener("change", (e) => {
      const chk = e.target.closest(".dash-quick-complete");
      if (!chk) return;
      const taskId = chk.getAttribute("data-task-id");
      if (window.StudentHubTasks && window.StudentHubTasks.markTaskStatus) {
        window.StudentHubTasks.markTaskStatus(taskId, "Completed");
      }
    });
  }

  function render() {
    const container = document.getElementById("dashboardContainer");
    if (!container) return;

    bindDashboardEventsOnce(container);

    const state = StudentHubStorage.getState();
    const { profile, schedules, grades = [], tasks = [], gradingWeights = {} } = state;

    // 1. Live Calculated Statistics (Connected to Student's Course, Year Level, and Section)
    const enrolledSubjects = StudentHubStorage.getStudentEnrolledSubjects(profile, schedules);
    const totalEnrolledSubjects = enrolledSubjects.length;
    const overallGradeAvg = StudentHubStorage.computeOverallAverage();
    const overallStanding = getGradeStanding(overallGradeAvg);
    const gradedSubjectsCount = grades.filter((g) => StudentHubStorage.hasRecordedGrade(g)).length;
    const attendanceStats = StudentHubStorage.computeAttendanceStats();

    const activeTasks = tasks.filter(
      (t) => t.status === "Pending" || t.status === "Overdue"
    );
    const overdueCount = activeTasks.filter((t) => t.status === "Overdue").length;
    const submittedOrDoneCount = tasks.filter(
      (t) => t.status === "Completed" || t.status === "Submitted"
    ).length;

    // 2. Upcoming & Today's Classes from Official Section Timetable (sorted chronologically)
    const todayName = getTodayDayName();
    const isWeekday = WEEKDAYS.includes(todayName);
    const scheduleDay = isWeekday ? todayName : "Monday";
    const scheduledToday = [...StudentHubStorage.getSessionsByDay(scheduleDay, enrolledSubjects)].sort(
      (a, b) => (a.startTime || "").localeCompare(b.startTime || "")
    );
    const classHighlight = findHighlightedClass(scheduledToday, isWeekday, new Date());

    // 3. Upcoming Assignments
    const upcomingTasks = [...tasks]
      .filter((t) => t.status !== "Completed")
      .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""))
      .slice(0, 4);

    // 4. Recent Published Announcements
    const recentAnnouncements = StudentHubStorage.getPublishedAnnouncements()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 3);

    // Hydrate Welcome Hero Banner & Student Information in `pages/student/dashboard.html`
    const avatarEl = document.getElementById("dashHeroAvatar");
    const welcomeEl = document.getElementById("dashWelcomeTitle");
    const studNoEl = document.getElementById("dashStudentNumberPill");
    const courseEl = document.getElementById("dashCoursePill");
    const yearSecEl = document.getElementById("dashYearSectionPill");
    const termEl = document.getElementById("dashTermPill");
    const heroSubjectsBtn = document.getElementById("dashHeroSubjectsBtn");

    if (avatarEl) avatarEl.src = profile.avatar || "assets/images/default-avatar.svg";
    if (welcomeEl) welcomeEl.textContent = `Welcome, ${profile.fullName || "Student"}`;
    if (studNoEl) studNoEl.textContent = `Student No: ${profile.studentNumber || "—"}`;
    if (courseEl) courseEl.textContent = profile.course || "Bachelor of Science in Information Technology";
    if (yearSecEl) yearSecEl.textContent = `${profile.yearLevel || "Year 2"} • ${profile.section || "BSIT 2-2"}`;
    if (termEl) termEl.textContent = profile.academicTerm || "2nd Sem, AY 2026–2027";
    if (heroSubjectsBtn) heroSubjectsBtn.textContent = `My Subjects (${totalEnrolledSubjects})`;

    // Hydrate 4 Key Overview Cards
    const statSubVal = document.getElementById("dashStatSubjectsValue");
    const statSubSub = document.getElementById("dashStatSubjectsSub");
    if (statSubVal) statSubVal.textContent = String(totalEnrolledSubjects);
    if (statSubSub) statSubSub.innerHTML = `Section ${escapeHtml(profile.section || "BSIT 2-2")} &bull; View All &rarr;`;

    const statGradeVal = document.getElementById("dashStatGradesValue");
    const statGradeSub = document.getElementById("dashStatGradesSub");
    if (statGradeVal) {
      statGradeVal.textContent = overallGradeAvg !== null ? `${overallGradeAvg.toFixed(2)}%` : "No grade recorded.";
      statGradeVal.classList.toggle("dash-grade-empty-value", overallGradeAvg === null);
    }
    if (statGradeSub) {
      statGradeSub.textContent =
        gradedSubjectsCount > 0
          ? `${gradedSubjectsCount} of ${grades.length} subjects graded by faculty`
          : "Awaiting faculty grade entry";
    }

    const statAttVal = document.getElementById("dashStatAttendanceValue");
    const statAttSub = document.getElementById("dashStatAttendanceSub");
    if (statAttVal) statAttVal.textContent = `${attendanceStats.percentage}%`;
    if (statAttSub) {
      statAttSub.innerHTML = `${attendanceStats.present} Present &bull; ${attendanceStats.late} Late &bull; ${attendanceStats.absent} Absent`;
    }

    const statTaskVal = document.getElementById("dashStatTasksValue");
    const statTaskSub = document.getElementById("dashStatTasksSub");
    if (statTaskVal) statTaskVal.textContent = String(activeTasks.length);
    if (statTaskSub) {
      statTaskSub.innerHTML =
        overdueCount > 0
          ? `<strong style="color:var(--danger-text)">${overdueCount} Overdue</strong> &bull; ${submittedOrDoneCount} Submitted/Done`
          : `${submittedOrDoneCount} Submitted / Completed`;
    }

    // Hydrate Upcoming Classes Widget
    const schedHeadingEl = document.getElementById("dashScheduleHeading");
    const schedSecBadgeEl = document.getElementById("dashScheduleSectionBadge");
    const schedSubEl = document.getElementById("dashScheduleSubtitle");
    const schedListEl = document.getElementById("dashScheduleList");
    if (schedHeadingEl) {
      schedHeadingEl.textContent = isWeekday
        ? `Today's & Upcoming Classes (${scheduleDay})`
        : `Upcoming Monday Classes (${scheduleDay})`;
    }
    if (schedSecBadgeEl) schedSecBadgeEl.textContent = profile.section || "BSIT 2-2";
    if (schedSubEl) {
      schedSubEl.textContent = isWeekday
        ? "Today's classes arranged chronologically"
        : "Next weekday classes arranged chronologically";
    }
    if (schedListEl) {
      schedListEl.innerHTML =
        scheduledToday.length === 0
          ? `<div class="empty-state dash-empty-box-compact"><p>No classes scheduled for Section <strong>${escapeHtml(
              profile.section || "Unspecified"
            )}</strong>.</p></div>`
          : scheduledToday
              .map((c, idx) => {
                const isHighlighted = classHighlight && classHighlight.index === idx;
                const highlightCls = isHighlighted
                  ? classHighlight.kind === "current"
                    ? "is-current-class"
                    : "is-next-class"
                  : "";
                return `
                  <div class="dash-list-item ${highlightCls}">
                    <div class="dash-item-left">
                      <div class="time-pill">${escapeHtml(c.timeLabel)}</div>
                      <div>
                        <div class="dash-item-title">${escapeHtml(c.displaySubject)}</div>
                        <div class="dash-item-sub">
                          <strong>Code:</strong> ${escapeHtml(c.subjectCode)} &bull;
                          <strong>Room:</strong> ${escapeHtml(c.room)} &bull;
                          <strong>Instructor:</strong> ${escapeHtml(c.instructor)}
                        </div>
                      </div>
                    </div>
                    <div class="dash-schedule-badges">
                      ${
                        isHighlighted
                          ? `<span class="badge ${classHighlight.badge}">${escapeHtml(
                              classHighlight.label
                            )}</span>`
                          : ""
                      }
                      <span class="badge ${c.room === "Not specified" ? "badge-neutral" : "badge-info"}">
                        Room: ${escapeHtml(c.room)}
                      </span>
                    </div>
                  </div>
                `;
              })
              .join("");
    }

    // Hydrate My Subjects Summary & Preview Widget
    const subHeadingEl = document.getElementById("dashSubjectsHeading");
    const subBadgeEl = document.getElementById("dashSubjectsCountBadge");
    const subPreviewEl = document.getElementById("dashSubjectsPreviewContainer");
    if (subHeadingEl) subHeadingEl.textContent = `My Subjects (${profile.section || "BSIT 2-2"})`;
    if (subBadgeEl) {
      subBadgeEl.textContent = `${totalEnrolledSubjects} Total Subject${totalEnrolledSubjects === 1 ? "" : "s"}`;
    }
    if (subPreviewEl) {
      subPreviewEl.innerHTML =
        enrolledSubjects.length === 0
          ? `
            <div class="empty-state dash-empty-box">
              <p>
                No subjects have been configured for your current section (<strong>${escapeHtml(
                  profile.section || "Unspecified"
                )}</strong>).
              </p>
              <button type="button" class="btn btn-sm btn-secondary" data-nav="subjects">Open My Subjects</button>
            </div>
          `
          : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Instructor</th>
                    <th>Section</th>
                    <th>Schedule &amp; Room</th>
                  </tr>
                </thead>
                <tbody>
                  ${enrolledSubjects
                    .slice(0, 5)
                    .map((sub) => {
                      const fullName =
                        sub.fullSubjectName || `${sub.courseCode} – ${sub.subjectName}`;
                      return `
                        <tr>
                          <td><strong>${escapeHtml(sub.subjectCode)}</strong></td>
                          <td><strong>${escapeHtml(fullName)}</strong></td>
                          <td>${escapeHtml(sub.instructor || "Not specified")}</td>
                          <td><span class="badge badge-primary">${escapeHtml(
                            sub.section || "BSIT 2-2"
                          )}</span></td>
                          <td class="dash-schedule-summary-cell">${escapeHtml(
                            sub.scheduleSummary || "Not specified"
                          )}</td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
            <div class="dash-subjects-footer">
              <span class="dash-subjects-footer-meta">
                Showing preview of ${Math.min(5, totalEnrolledSubjects)} of <strong>${totalEnrolledSubjects}</strong> enrolled subjects.
              </span>
              <div class="dash-subjects-footer-links">
                <button type="button" class="btn-text" data-nav="grades">View My Grades &rarr;</button>
                <button type="button" class="btn-text" data-nav="subjects">View All ${totalEnrolledSubjects} Subjects &rarr;</button>
              </div>
            </div>
          `;
    }

    // Hydrate Academic Assignments Widget
    const tasksBadgeWrap = document.getElementById("dashTasksStatusBadgeWrap");
    const tasksPreviewEl = document.getElementById("dashTasksPreviewContainer");
    if (tasksBadgeWrap) {
      tasksBadgeWrap.innerHTML =
        overdueCount > 0
          ? `<span class="badge badge-danger">${overdueCount} Overdue</span>`
          : `<span class="badge badge-success">On Track</span>`;
    }
    if (tasksPreviewEl) {
      tasksPreviewEl.innerHTML =
        upcomingTasks.length === 0
          ? `
            <div class="empty-state dash-empty-box">
              <p>All published assignments are completed!</p>
              <button type="button" class="btn btn-sm btn-secondary" data-nav="tasks">View Task History</button>
            </div>
          `
          : `
            <div class="dash-list">
              ${upcomingTasks
                .map((t) => {
                  const statusBadge =
                    t.status === "Overdue"
                      ? "badge-danger"
                      : t.status === "Submitted"
                        ? "badge-info"
                        : "badge-warning";
                  return `
                    <div class="dash-list-item">
                      <div class="dash-item-left">
                        <input
                          type="checkbox"
                          class="task-checkbox dash-quick-complete"
                          data-task-id="${escapeHtml(t.id)}"
                          title="Mark assignment as completed"
                          aria-label="Mark ${escapeHtml(t.title)} as completed"
                        />
                        <div>
                          <div class="dash-item-title">${escapeHtml(t.title)}</div>
                          <div class="dash-item-sub">${escapeHtml(
                            t.subject
                          )} &bull; Due ${escapeHtml(formatReadableDate(t.deadline))}</div>
                        </div>
                      </div>
                      <div class="dash-task-actions">
                        <span class="badge ${statusBadge}">${escapeHtml(t.status)}</span>
                        <button
                          type="button"
                          class="btn btn-sm btn-secondary dash-open-submit-btn"
                          data-task-id="${escapeHtml(t.id)}"
                        >Submit</button>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `;
    }

    // Hydrate Recent Published Announcements Widget
    const annPreviewEl = document.getElementById("dashAnnouncementsPreviewContainer");
    if (annPreviewEl) {
      annPreviewEl.innerHTML =
        recentAnnouncements.length === 0
          ? `<div class="empty-state dash-empty-box-compact"><p>No published announcements.</p></div>`
          : `
            <div class="dash-list">
              ${recentAnnouncements
                .map(
                  (a) => `
                    <div class="dash-list-item dash-ann-item" data-open-dash-ann="${escapeHtml(a.id)}">
                      <div>
                        <div class="dash-ann-meta-row">
                          <span class="badge badge-primary">${escapeHtml(a.category)}</span>
                          ${!a.read ? `<span class="badge badge-warning">Unread</span>` : ""}
                          <span class="dash-ann-date">${escapeHtml(formatReadableDate(a.date))}</span>
                        </div>
                        <div class="dash-item-title">${escapeHtml(a.title)}</div>
                        <div class="dash-item-sub dash-ann-excerpt">${escapeHtml(
                          a.description.length > 110
                            ? a.description.substring(0, 110) + "..."
                            : a.description
                        )}</div>
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>
          `;
    }

    // Hydrate Academic Performance Overview Widget
    const perfGwaBadge = document.getElementById("dashPerfGwaBadge");
    const perfTermLabel = document.getElementById("dashPerfTermLabel");
    const perfScore = document.getElementById("dashPerfScore");
    const perfStandingBadge = document.getElementById("dashPerfStandingBadge");
    const perfStandingText = document.getElementById("dashPerfStandingText");
    const perfGradedMeta = document.getElementById("dashPerfGradedMeta");
    const perfBars = document.getElementById("dashPerfBars");

    if (perfTermLabel) {
      perfTermLabel.textContent = profile.academicTerm || "2nd Sem, AY 2026–2027";
    }
    if (perfGwaBadge) {
      perfGwaBadge.className = `badge ${overallGradeAvg !== null ? overallStanding.badge : "badge-neutral"}`;
      perfGwaBadge.textContent = overallGradeAvg !== null ? `GWA ${overallStanding.eq}` : "GWA Pending";
    }
    if (perfScore) {
      perfScore.textContent = overallGradeAvg !== null ? `${overallGradeAvg.toFixed(2)}%` : "No grade recorded.";
      perfScore.classList.toggle("dash-perf-score-empty", overallGradeAvg === null);
    }
    if (perfStandingBadge) {
      perfStandingBadge.className = `badge ${overallGradeAvg !== null ? overallStanding.badge : "badge-neutral"}`;
      perfStandingBadge.textContent =
        overallGradeAvg !== null ? `${overallStanding.eq} • ${overallStanding.label}` : "No Recorded Grades";
    }
    if (perfStandingText) {
      perfStandingText.textContent =
        overallGradeAvg !== null ? overallStanding.label : "Awaiting faculty grades";
    }
    if (perfGradedMeta) {
      perfGradedMeta.textContent = `${gradedSubjectsCount} of ${grades.length} subject${
        grades.length === 1 ? "" : "s"
      }`;
    }
    if (perfBars) {
      if (grades.length === 0) {
        perfBars.innerHTML = `<div class="empty-state dash-empty-box-compact"><p>No subject grade records available.</p></div>`;
      } else {
        const previewGrades = grades.slice(0, 6);
        const barRowsHtml = previewGrades
          .map((g) => {
            const avg = StudentHubStorage.computeSubjectAverage(g, gradingWeights);
            const st = getGradeStanding(avg);
            const pctWidth = avg === null ? 0 : Math.min(100, Math.max(0, avg));
            return `
              <div class="progress-row">
                <div class="progress-meta">
                  <span><strong>${escapeHtml(g.subjectCode)}</strong> &mdash; ${escapeHtml(g.subjectName)}</span>
                  <span>${avg !== null ? `${avg.toFixed(1)}% (${escapeHtml(st.eq)})` : "No grade"}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill ${st.fill}" style="width:${pctWidth}%"></div>
                </div>
              </div>
            `;
          })
          .join("");
        const moreNote =
          grades.length > 6
            ? `<div class="dash-perf-more-note">+ ${grades.length - 6} more subject${
                grades.length - 6 === 1 ? "" : "s"
              } in <button type="button" class="btn-text" data-nav="grades">My Grades &rarr;</button></div>`
            : "";
        perfBars.innerHTML = barRowsHtml + moreNote;
      }
    }

    // Hydrate Attendance Summary Widget
    const totalAttSessions =
      (attendanceStats.present || 0) + (attendanceStats.late || 0) + (attendanceStats.absent || 0);
    const attBadge = document.getElementById("dashAttSummaryBadge");
    const attMeta = document.getElementById("dashAttSessionsMeta");
    const attPctVal = document.getElementById("dashAttPctValue");
    const attPresentEl = document.getElementById("dashAttPresentCount");
    const attLateEl = document.getElementById("dashAttLateCount");
    const attAbsentEl = document.getElementById("dashAttAbsentCount");

    if (attBadge) {
      const attBadgeCls =
        totalAttSessions === 0
          ? "badge-neutral"
          : attendanceStats.percentage >= 85
            ? "badge-success"
            : attendanceStats.percentage >= 75
              ? "badge-warning"
              : "badge-danger";
      attBadge.className = `badge ${attBadgeCls}`;
      attBadge.textContent = `${attendanceStats.percentage}%`;
    }
    if (attMeta) {
      attMeta.textContent = `${totalAttSessions} recorded attendance session${
        totalAttSessions === 1 ? "" : "s"
      }`;
    }
    if (attPctVal) attPctVal.textContent = `${attendanceStats.percentage}%`;
    if (attPresentEl) attPresentEl.textContent = String(attendanceStats.present || 0);
    if (attLateEl) attLateEl.textContent = String(attendanceStats.late || 0);
    if (attAbsentEl) attAbsentEl.textContent = String(attendanceStats.absent || 0);
  }

  return { render, findHighlightedClass, parseTimeMinutes, getGradeStanding };
})();

window.StudentHubDashboard = StudentHubDashboard;
