/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 1: Student Dashboard (dashboard.js)
 *
 * Displays BSIT 2-2 overview, upcoming classes from the official Monday–Friday
 * BSIT 2-2 timetable, read-only subject grade summary, attendance rate,
 * upcoming assignments, and recent published university announcements.
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

  function render() {
    const container = document.getElementById("dashboardContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const { profile, schedules, grades, gradingWeights, tasks } = state;

    // 1. Live Calculated Statistics (Connected to Student's Course, Year Level, and Section)
    const enrolledSubjects = StudentHubStorage.getStudentEnrolledSubjects(profile, schedules);
    const totalEnrolledSubjects = enrolledSubjects.length;
    const overallGradeAvg = StudentHubStorage.computeOverallAverage();
    const gradedSubjectsCount = grades.filter((g) => StudentHubStorage.hasRecordedGrade(g)).length;
    const attendanceStats = StudentHubStorage.computeAttendanceStats();

    const activeTasks = tasks.filter(
      (t) => t.status === "Pending" || t.status === "Overdue"
    );
    const overdueCount = activeTasks.filter((t) => t.status === "Overdue").length;
    const submittedOrDoneCount = tasks.filter(
      (t) => t.status === "Completed" || t.status === "Submitted"
    ).length;

    // 2. Upcoming & Today's Classes from Official BSIT 2-2 Timetable
    const todayName = getTodayDayName();
    const isWeekday = WEEKDAYS.includes(todayName);
    const scheduleDay = isWeekday ? todayName : "Monday";
    const scheduledToday = StudentHubStorage.getSessionsByDay(scheduleDay, enrolledSubjects);

    // 3. Upcoming Assignments
    const upcomingTasks = [...tasks]
      .filter((t) => t.status !== "Completed")
      .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""))
      .slice(0, 4);

    // 4. Recent Published Announcements
    const recentAnnouncements = StudentHubStorage.getPublishedAnnouncements()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 3);

    container.innerHTML = `
      <!-- Welcome Hero Banner -->
      <div class="hero-banner">
        <div class="hero-left">
          <img
            src="${escapeHtml(profile.avatar || "assets/images/default-avatar.svg")}"
            alt="Student Avatar"
            class="hero-avatar"
          />
          <div>
            <div class="hero-greeting">BANTUG UNIVERSITY &bull; Student Portal</div>
            <h2 class="hero-title">Welcome, ${escapeHtml(profile.fullName)}</h2>
            <div class="hero-meta">
              <span class="hero-pill">Student No: ${escapeHtml(profile.studentNumber)}</span>
              <span class="hero-pill">${escapeHtml(profile.course)}</span>
              <span class="hero-pill">${escapeHtml(profile.yearLevel)} &bull; ${escapeHtml(
      profile.section
    )}</span>
              <span class="hero-pill">${escapeHtml(
      profile.academicTerm || "2nd Sem, AY 2026–2027"
    )}</span>
            </div>
          </div>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-hero" data-nav="profile">My Profile</button>
          <button type="button" class="btn btn-hero" data-nav="subjects">My Subjects (${totalEnrolledSubjects})</button>
          <button type="button" class="btn btn-primary" data-nav="schedule">Class Schedule</button>
        </div>
      </div>

      <!-- 4 Key Statistic Cards -->
      <div class="stats-grid">
        <div class="stat-card" data-nav="subjects" title="Open My Subjects">
          <div class="stat-info">
            <span class="stat-label">My Subjects</span>
            <span class="stat-value">${totalEnrolledSubjects}</span>
            <span class="stat-sub">Section ${escapeHtml(profile.section || "BSIT 2-2")} &bull; View All &rarr;</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
        </div>

        <div class="stat-card" data-nav="grades" title="View Read-Only Grades">
          <div class="stat-info">
            <span class="stat-label">Overall Grade Average</span>
            <span class="stat-value" style="${overallGradeAvg === null ? "font-size:1.15rem;" : ""
      }">${overallGradeAvg !== null ? overallGradeAvg.toFixed(2) + "%" : "No grade recorded."
      }</span>
            <span class="stat-sub">${gradedSubjectsCount > 0
        ? `${gradedSubjectsCount} of ${grades.length} subjects graded by faculty`
        : "Awaiting faculty grade entry"
      }</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
          </div>
        </div>

        <div class="stat-card" data-nav="attendance" title="View Attendance Records">
          <div class="stat-info">
            <span class="stat-label">Attendance Percentage</span>
            <span class="stat-value">${attendanceStats.percentage}%</span>
            <span class="stat-sub">${attendanceStats.present} Present &bull; ${attendanceStats.late} Late &bull; ${attendanceStats.absent} Absent</span>
          </div>
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </div>
        </div>

        <div class="stat-card" data-nav="tasks" title="View Academic Task Manager">
          <div class="stat-info">
            <span class="stat-label">Pending Assignments</span>
            <span class="stat-value">${activeTasks.length}</span>
            <span class="stat-sub">${overdueCount > 0
        ? `<strong style="color:var(--danger-text)">${overdueCount} Overdue</strong> &bull; ${submittedOrDoneCount} Submitted/Done`
        : `${submittedOrDoneCount} Submitted / Completed`
      }</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>
      </div>

      <!-- Main Two-Column Dashboard Content -->
      <div class="dashboard-grid">
        <!-- Left Column: Upcoming Classes + BSIT 2-2 Subjects & Grade Summary -->
        <div class="dashboard-col">
          <!-- Upcoming Classes Card -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <span>${isWeekday
        ? `Today's & Upcoming Classes (${escapeHtml(scheduleDay)})`
        : `Upcoming Monday Classes (${escapeHtml(scheduleDay)})`
      }</span>
                <span class="badge badge-primary">BSIT 2-2</span>
              </h3>
              <button type="button" class="btn-text" data-nav="schedule">Full Timetable &rarr;</button>
            </div>

            <div class="dash-list">
              ${scheduledToday.length === 0
              ? `<div class="empty-state" style="padding:20px 14px;"><p style="margin:0;">No classes scheduled for Section <strong>${escapeHtml(
                profile.section || "Unspecified"
              )}</strong>.</p></div>`
              : scheduledToday
                .map(
                  (c) => `
                  <div class="dash-list-item">
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
                    <span class="badge ${c.room === "Not specified" ? "badge-neutral" : "badge-info"
                    }">Room: ${escapeHtml(c.room)}</span>
                  </div>
                `
                      )
                      .join("")
              }
            </div>
          </div>

          <!-- My Subjects Summary & Preview Card (Revision 4 Dashboard Integration) -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <span>My Subjects (${escapeHtml(profile.section || "BSIT 2-2")})</span>
                <span class="badge badge-primary">${totalEnrolledSubjects} Total Subject${totalEnrolledSubjects === 1 ? "" : "s"
            }</span>
              </h3>
              <button type="button" class="btn btn-sm btn-primary" data-nav="subjects">Open My Subjects &rarr;</button>
            </div>
            ${enrolledSubjects.length === 0
                    ? `
                  <div class="empty-state" style="padding:24px 14px;">
                    <p style="margin-bottom:10px;">
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
                                <td style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(
                  sub.scheduleSummary || "Not specified"
                )}</td>
                              </tr>
                            `;
              })
              .join("")}
                      </tbody>
                    </table>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;margin-top:8px;border-top:1px solid var(--border-color);flex-wrap:wrap;gap:8px;">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">
                      Showing preview of ${Math.min(5, totalEnrolledSubjects)} of <strong>${totalEnrolledSubjects}</strong> enrolled subjects.
                    </span>
                    <div style="display:flex;gap:10px;">
                      <button type="button" class="btn-text" data-nav="grades">View My Grades &rarr;</button>
                      <button type="button" class="btn-text" data-nav="subjects">View All ${totalEnrolledSubjects} Subjects &rarr;</button>
                    </div>
                  </div>
                `
            }
          </div>
        </div>

        <!-- Right Column: Upcoming Assignments + Recent Published Announcements -->
        <div class="dashboard-col">
          <!-- Upcoming Assignments Card -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <span>Academic Assignments</span>
                ${overdueCount > 0
        ? `<span class="badge badge-danger">${overdueCount} Overdue</span>`
        : `<span class="badge badge-success">On Track</span>`
      }
              </h3>
              <button type="button" class="btn-text" data-nav="tasks">Task Manager &rarr;</button>
            </div>
            ${upcomingTasks.length === 0
        ? `
                <div class="empty-state" style="padding:24px 12px;">
                  <p style="margin-bottom:10px;">All published assignments are completed!</p>
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
                          <div style="display:flex;align-items:center;gap:8px;">
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
              `
      }
          </div>

          <!-- Recent Published Announcements Card -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent Published Announcements</h3>
              <button type="button" class="btn-text" data-nav="announcements">View All &rarr;</button>
            </div>
            ${recentAnnouncements.length === 0
        ? `<div class="empty-state" style="padding:20px;"><p>No published announcements.</p></div>`
        : `
                <div class="dash-list">
                  ${recentAnnouncements
          .map(
            (a) => `
                    <div class="dash-list-item" style="align-items:flex-start;cursor:pointer;" data-open-dash-ann="${escapeHtml(
              a.id
            )}">
                      <div>
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                          <span class="badge badge-primary">${escapeHtml(a.category)}</span>
                          ${!a.read ? `<span class="badge badge-warning">Unread</span>` : ""}
                          <span style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(
              formatReadableDate(a.date)
            )}</span>
                        </div>
                        <div class="dash-item-title">${escapeHtml(a.title)}</div>
                        <div class="dash-item-sub" style="margin-top:3px;">${escapeHtml(
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
              `
      }
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        navigateTo(el.getAttribute("data-nav"));
      });
    });

    container.querySelectorAll(".dash-quick-complete").forEach((chk) => {
      chk.addEventListener("change", () => {
        const taskId = chk.getAttribute("data-task-id");
        if (window.StudentHubTasks && window.StudentHubTasks.markTaskStatus) {
          window.StudentHubTasks.markTaskStatus(taskId, "Completed");
        }
      });
    });

    container.querySelectorAll(".dash-open-submit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const taskId = btn.getAttribute("data-task-id");
        const task = state.tasks.find((t) => t.id === taskId);
        if (task && window.StudentHubTasks && window.StudentHubTasks.openSubmissionModal) {
          window.StudentHubTasks.openSubmissionModal(task);
        }
      });
    });

    container.querySelectorAll("[data-open-dash-ann]").forEach((item) => {
      item.addEventListener("click", () => {
        const annId = item.getAttribute("data-open-dash-ann");
        if (
          window.StudentHubAnnouncements &&
          window.StudentHubAnnouncements.openAnnouncementDetails
        ) {
          window.StudentHubAnnouncements.openAnnouncementDetails(annId);
        } else {
          navigateTo("announcements");
        }
      });
    });
  }

  return { render };
})();

window.StudentHubDashboard = StudentHubDashboard;
