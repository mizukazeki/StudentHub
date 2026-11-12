/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 5: Attendance Tracker (attendance.js) — STRICTLY READ-ONLY FOR STUDENTS
 *
 * Hydrates `pages/student/attendance.html` in place while enforcing read-only
 * student access:
 * - Overview header with Academic Year, Semester, Overall % & Record Count
 * - Summary cards (Attendance Rate, Present, Late, Absent)
 * - Dedicated Attendance Performance progress section
 * - Subject-level attendance breakdown table
 * - Search, Subject, Status, and Date filters with read-only History Log
 * - NO self-marking, NO editing, NO deleting attendance records (Faculty-only)
 * ============================================================================
 */

const StudentHubAttendance = (function () {
  const { escapeHtml, formatReadableDate } = window.StudentHubApp;

  let filterSubject = "All";
  let filterStatus = "All";
  let filterDate = "";
  let searchQuery = "";

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

  function getStatusBadge(status) {
    if (status === "Present") return "badge-success";
    if (status === "Late") return "badge-warning";
    if (status === "Absent") return "badge-danger";
    if (status === "Excused") return "badge-info";
    return "badge-neutral";
  }

  function resolveSubjectMetaForRecord(rec, subjects) {
    const list = Array.isArray(subjects) ? subjects : [];
    const recCode = String((rec && rec.subjectCode) || "").trim().toLowerCase();
    const recSub = String((rec && rec.subject) || "").trim().toLowerCase();

    const matched = list.find((s) => {
      const sCode = String((s && s.subjectCode) || "").trim().toLowerCase();
      const sCourse = String((s && s.courseCode) || "").trim().toLowerCase();
      const sName = String((s && s.subjectName) || "").trim().toLowerCase();
      if (recCode && sCode === recCode) return true;
      if (recSub && sCode && recSub.startsWith(sCode)) return true;
      if (recSub && sCourse && recSub.includes(sCourse)) return true;
      if (recSub && sName && recSub.includes(sName)) return true;
      return false;
    });

    if (matched) {
      return {
        subjectCode: matched.subjectCode || rec.subjectCode || "—",
        subjectName:
          matched.fullSubjectName ||
          (matched.courseCode && matched.subjectName
            ? `${matched.courseCode} – ${matched.subjectName}`
            : matched.subjectName) ||
          rec.subject ||
          "—",
        instructor: matched.instructor || "Not specified",
        scheduleSummary: matched.scheduleSummary || "Not specified"
      };
    }

    // Fallback parsing from `rec.subject` (e.g. "T148 - IT 211 - Data Structures")
    const parts = String((rec && rec.subject) || "")
      .split(" - ")
      .map((p) => p.trim())
      .filter(Boolean);
    return {
      subjectCode: (rec && rec.subjectCode) || parts[0] || "—",
      subjectName:
        parts.length > 1 ? parts.slice(1).join(" – ") : (rec && rec.subject) || "—",
      instructor: (rec && rec.instructor) || "Not specified",
      scheduleSummary: (rec && rec.scheduleSummary) || "Not specified"
    };
  }

  function updateClearFiltersVisibility() {
    const clearBtn = document.getElementById("attClearFiltersBtn");
    if (!clearBtn) return;
    const hasActive =
      filterSubject !== "All" ||
      filterStatus !== "All" ||
      Boolean(filterDate) ||
      searchQuery.trim() !== "";
    clearBtn.hidden = !hasActive;
  }

  function renderHistoryOnly() {
    const state = StudentHubStorage.getState();
    const records = state.attendance || [];
    const subjects =
      typeof StudentHubStorage.getStudentEnrolledSubjects === "function"
        ? StudentHubStorage.getStudentEnrolledSubjects(state.profile, state.schedules)
        : state.schedules || [];

    updateClearFiltersVisibility();

    const enriched = records.map((r) => ({
      rec: r,
      meta: resolveSubjectMetaForRecord(r, subjects)
    }));

    const filtered = enriched
      .filter(({ rec: r, meta }) => {
        const matchSub = filterSubject === "All" || r.subject === filterSubject;
        const matchStatus = filterStatus === "All" || r.status === filterStatus;
        const matchDate = !filterDate || r.date === filterDate;
        const q = searchQuery.trim().toLowerCase();
        const matchQuery =
          !q ||
          (r.subject && r.subject.toLowerCase().includes(q)) ||
          meta.subjectCode.toLowerCase().includes(q) ||
          meta.subjectName.toLowerCase().includes(q) ||
          meta.instructor.toLowerCase().includes(q) ||
          (r.remarks && r.remarks.toLowerCase().includes(q)) ||
          (r.status && r.status.toLowerCase().includes(q)) ||
          (r.date && r.date.toLowerCase().includes(q));
        return matchSub && matchStatus && matchDate && matchQuery;
      })
      .sort((a, b) => (b.rec.date || "").localeCompare(a.rec.date || ""));

    const countBadgeEl = document.getElementById("attendanceHistoryCountBadge");
    const historyBodyEl = document.getElementById("attendanceHistoryBodyContainer");

    if (countBadgeEl) {
      countBadgeEl.textContent = `Showing ${filtered.length} of ${records.length} records`;
    }
    if (!historyBodyEl) return;

    historyBodyEl.innerHTML =
      filtered.length === 0
        ? `
          <div class="empty-state attendance-empty-state">
            <h3>No Attendance Records Found</h3>
            <p>No faculty-recorded attendance logs match your current search or filter criteria.</p>
          </div>
        `
        : `
          <div class="table-responsive">
            <table class="data-table attendance-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Instructor</th>
                  <th>Class Schedule</th>
                  <th>Attendance Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${filtered
                  .map(
                    ({ rec: r, meta }) => `
                  <tr>
                    <td class="att-col-date"><strong>${escapeHtml(
                      formatReadableDate(r.date)
                    )}</strong></td>
                    <td><span class="badge badge-info">${escapeHtml(
                      meta.subjectCode
                    )}</span></td>
                    <td><strong>${escapeHtml(meta.subjectName)}</strong></td>
                    <td>${escapeHtml(meta.instructor)}</td>
                    <td class="att-col-schedule">${escapeHtml(meta.scheduleSummary)}</td>
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
        `;
  }

  function bindAttendanceEventsOnce(container) {
    if (!container || container.dataset.attendanceEventsBound === "1") return;
    container.dataset.attendanceEventsBound = "1";

    const searchInput = document.getElementById("attSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderHistoryOnly();
      });
    }

    const subSelect = document.getElementById("attFilterSubject");
    if (subSelect) {
      subSelect.addEventListener("change", (e) => {
        filterSubject = e.target.value;
        renderHistoryOnly();
      });
    }

    const statusSelect = document.getElementById("attFilterStatus");
    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        filterStatus = e.target.value;
        renderHistoryOnly();
      });
    }

    const dateInput = document.getElementById("attFilterDate");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        filterDate = e.target.value;
        renderHistoryOnly();
      });
    }

    const clearBtn = document.getElementById("attClearFiltersBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        filterSubject = "All";
        filterStatus = "All";
        filterDate = "";
        searchQuery = "";
        if (searchInput) searchInput.value = "";
        if (subSelect) subSelect.value = "All";
        if (statusSelect) statusSelect.value = "All";
        if (dateInput) dateInput.value = "";
        renderHistoryOnly();
      });
    }
  }

  function render() {
    const container = document.getElementById("attendanceContainer");
    if (!container) return;

    bindAttendanceEventsOnce(container);

    const state = StudentHubStorage.getState();
    const profile = state.profile || {};
    const records = state.attendance || [];
    const stats = StudentHubStorage.computeAttendanceStats();
    const bySubject = StudentHubStorage.computeAttendanceBySubject();
    const sectionLabel = profile.section || "BSIT 2-2";
    const parsedTerm = parseAcademicTerm(profile.academicTerm || "2nd Semester, AY 2026–2027");

    // Unique subjects in attendance + enrolled subjects
    const allSubjects = Array.from(
      new Set([...StudentHubStorage.getSubjectList(), ...records.map((r) => r.subject)])
    );

    // 1. Hydrate Overview Header & Pills
    const titleEl = document.getElementById("attendanceSectionTitle");
    const subtitleEl = document.getElementById("attendanceSectionSubtitle");
    const secPillEl = document.getElementById("attSectionPill");
    const ayPillEl = document.getElementById("attAcademicYearPill");
    const semPillEl = document.getElementById("attSemesterPill");
    const ovPctPillEl = document.getElementById("attOverviewPctPill");
    const ovTotalPillEl = document.getElementById("attOverviewTotalPill");

    if (titleEl) {
      titleEl.innerHTML = `Attendance &mdash; ${escapeHtml(sectionLabel)}`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = `Read-only class attendance summary and session history for ${
        profile.fullName || ""
      } (${profile.studentNumber || ""}).`;
    }
    if (secPillEl) secPillEl.textContent = `Section: ${sectionLabel}`;
    if (ayPillEl) ayPillEl.textContent = `Academic Year: ${parsedTerm.academicYear}`;
    if (semPillEl) semPillEl.textContent = `Semester: ${parsedTerm.semester}`;
    if (ovPctPillEl) {
      ovPctPillEl.className = `badge ${
        stats.total === 0
          ? "badge-neutral"
          : stats.percentage >= 90
            ? "badge-success"
            : stats.percentage >= 75
              ? "badge-warning"
              : "badge-danger"
      }`;
      ovPctPillEl.textContent = `Attendance: ${stats.percentage}%`;
    }
    if (ovTotalPillEl) {
      ovTotalPillEl.textContent = `${stats.total} ${stats.total === 1 ? "Record" : "Records"}`;
    }

    // 2. Hydrate Summary Stat Cards
    const pctEl = document.getElementById("attStatPercentage");
    const totalSubEl = document.getElementById("attStatTotalSub");
    const presentEl = document.getElementById("attStatPresent");
    const lateEl = document.getElementById("attStatLate");
    const absentEl = document.getElementById("attStatAbsent");

    if (pctEl) pctEl.textContent = `${stats.percentage}%`;
    if (totalSubEl) {
      totalSubEl.textContent = `Across ${stats.total} faculty-recorded sessions`;
    }
    if (presentEl) presentEl.textContent = String(stats.present);
    if (lateEl) lateEl.textContent = String(stats.late);
    if (absentEl) absentEl.textContent = String(stats.absent);

    // 3. Hydrate Dedicated Attendance Performance Section
    const perfPctEl = document.getElementById("attPerfPctValue");
    const perfBadgeEl = document.getElementById("attPerfStandingBadge");
    const perfTextEl = document.getElementById("attPerfProgressText");
    const perfBarEl = document.getElementById("attPerfProgressBar");
    const perfTotalEl = document.getElementById("attPerfTotalCount");
    const perfPresentEl = document.getElementById("attPerfPresentCount");
    const perfLateEl = document.getElementById("attPerfLateCount");
    const perfAbsentEl = document.getElementById("attPerfAbsentCount");

    if (perfPctEl) perfPctEl.textContent = `${stats.percentage}%`;
    if (perfTotalEl) perfTotalEl.textContent = String(stats.total);
    if (perfPresentEl) perfPresentEl.textContent = String(stats.present);
    if (perfLateEl) perfLateEl.textContent = String(stats.late);
    if (perfAbsentEl) perfAbsentEl.textContent = String(stats.absent);

    const attendedSessions =
      typeof stats.attendedCount === "number"
        ? stats.attendedCount
        : (stats.present || 0) + (stats.late || 0);
    if (perfTextEl) {
      perfTextEl.textContent = `${attendedSessions} of ${stats.total} sessions attended`;
    }
    if (perfBadgeEl) {
      const standing =
        stats.total === 0
          ? { cls: "badge-neutral", label: "No Sessions Logged" }
          : stats.percentage >= 90
            ? { cls: "badge-success", label: "Excellent Standing" }
            : stats.percentage >= 75
              ? { cls: "badge-warning", label: "Satisfactory" }
              : { cls: "badge-danger", label: "Attendance Warning" };
      perfBadgeEl.className = `badge ${standing.cls}`;
      perfBadgeEl.textContent = standing.label;
    }
    if (perfBarEl) {
      const barWidth = stats.total > 0 ? Math.min(100, Math.max(0, stats.percentage)) : 0;
      const fillCls =
        stats.total === 0
          ? ""
          : stats.percentage >= 90
            ? "fill-success"
            : stats.percentage >= 75
              ? "fill-warning"
              : "fill-danger";
      perfBarEl.className = `progress-fill ${fillCls}`.trim();
      perfBarEl.style.width = `${barWidth}%`;
    }

    // 4. Hydrate Subject Attendance Summary Card
    const subCardTitleEl = document.getElementById("attendanceSubjectCardTitle");
    const subCountBadgeEl = document.getElementById("attendanceSubjectCountBadge");
    const subTableBodyEl = document.getElementById("attendanceSubjectTableBody");

    if (subCardTitleEl) {
      subCardTitleEl.textContent = `Attendance Summary by Subject (${sectionLabel})`;
    }
    if (subCountBadgeEl) {
      subCountBadgeEl.textContent = `${bySubject.length} Enrolled Subjects`;
    }
    if (subTableBodyEl) {
      subTableBodyEl.innerHTML = bySubject
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
                <div class="attendance-instructor-sub">Instructor: ${escapeHtml(
                  sub.instructor
                )}</div>
              </td>
              <td><strong class="text-present">${sub.present}</strong></td>
              <td><strong class="text-late">${sub.late}</strong></td>
              <td><strong class="text-absent">${sub.absent}</strong></td>
              <td>${sub.total}</td>
              <td>
                <span class="badge ${badgeClass}">
                  ${sub.percentage !== null ? `${sub.percentage}%` : "No sessions logged"}
                </span>
              </td>
            </tr>
          `;
        })
        .join("");
    }

    // 5. Hydrate Search & Filter Toolbar
    const searchInput = document.getElementById("attSearchInput");
    if (searchInput && searchInput.value !== searchQuery) {
      searchInput.value = searchQuery;
    }

    const subSelect = document.getElementById("attFilterSubject");
    if (subSelect) {
      if (filterSubject !== "All" && !allSubjects.includes(filterSubject)) {
        filterSubject = "All";
      }
      subSelect.innerHTML = `
        <option value="All" ${filterSubject === "All" ? "selected" : ""}>All Subjects (${records.length} Sessions)</option>
        ${allSubjects
          .map(
            (s) =>
              `<option value="${escapeHtml(s)}" ${
                filterSubject === s ? "selected" : ""
              }>${escapeHtml(s)}</option>`
          )
          .join("")}
      `;
      subSelect.value = filterSubject;
    }

    const statusSelect = document.getElementById("attFilterStatus");
    if (statusSelect) {
      statusSelect.innerHTML = `
        <option value="All" ${filterStatus === "All" ? "selected" : ""}>All Statuses</option>
        <option value="Present" ${filterStatus === "Present" ? "selected" : ""}>Present (${stats.present})</option>
        <option value="Late" ${filterStatus === "Late" ? "selected" : ""}>Late (${stats.late})</option>
        <option value="Absent" ${filterStatus === "Absent" ? "selected" : ""}>Absent (${stats.absent})</option>
      `;
      statusSelect.value = filterStatus;
    }

    const dateInput = document.getElementById("attFilterDate");
    if (dateInput && dateInput.value !== filterDate) {
      dateInput.value = filterDate;
    }

    // 6. Hydrate Attendance History Table
    renderHistoryOnly();
  }

  return {
    render,
    parseAcademicTerm,
    resolveSubjectMetaForRecord,
    getStatusBadge
  };
})();

window.StudentHubAttendance = StudentHubAttendance;
