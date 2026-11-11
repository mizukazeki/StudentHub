/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 4: My Grades (grades.js) — STRICTLY READ-ONLY FOR STUDENTS
 *
 * Student Permissions Enforced:
 * - View grades
 * - View grades by subject
 * - View overall grade average
 * - View academic performance summary
 * - NO grade input forms, NO add/edit/delete grade buttons
 *   (All grade entry and updates are restricted to the Faculty Portal)
 * ============================================================================
 */

const StudentHubGrades = (function () {
  const { escapeHtml } = window.StudentHubApp;

  let selectedSubjectFilter = "All";
  let searchQuery = "";

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

  function formatComponentScore(val) {
    if (val === null || val === undefined || val === "") return "—";
    const num = Number(val);
    return isNaN(num) ? "—" : `${num.toFixed(1)}%`;
  }

  function render() {
    const container = document.getElementById("gradesContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const { grades, gradingWeights, profile } = state;

    const overallAvg = StudentHubStorage.computeOverallAverage();
    const overallStanding = getGradeStanding(overallAvg);

    let highestSub = null;
    let lowestSub = null;
    let gradedCount = 0;
    let passingCount = 0;
    let totalUnits = 0;
    let creditedUnits = 0;

    grades.forEach((g) => {
      const u = Number(g.units) || 3;
      totalUnits += u;
      const avg = StudentHubStorage.computeSubjectAverage(g, gradingWeights);
      if (avg !== null) {
        gradedCount++;
        if (avg >= 75) {
          passingCount++;
          creditedUnits += u;
        }
        if (!highestSub || avg > highestSub.avg) {
          highestSub = { code: g.subjectCode, courseCode: g.courseCode, name: g.subjectName, avg };
        }
        if (!lowestSub || avg < lowestSub.avg) {
          lowestSub = { code: g.subjectCode, courseCode: g.courseCode, name: g.subjectName, avg };
        }
      }
    });

    const filteredGrades = grades.filter((g) => {
      const matchSub = selectedSubjectFilter === "All" || g.subjectCode === selectedSubjectFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        g.subjectCode.toLowerCase().includes(q) ||
        (g.courseCode && g.courseCode.toLowerCase().includes(q)) ||
        g.subjectName.toLowerCase().includes(q) ||
        (g.instructor && g.instructor.toLowerCase().includes(q));
      return matchSub && matchSearch;
    });

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; My Academic Grades (${escapeHtml(
            profile.section || "BSIT 2-2"
          )})</h2>
          <p>Read-only academic grade record for ${escapeHtml(
            profile.fullName
          )} (${escapeHtml(profile.studentNumber)}). Grades are encoded and updated exclusively by assigned faculty members.</p>
        </div>
        <div class="section-header-actions">
          <span class="badge badge-info" style="padding:8px 14px;font-size:0.82rem;">
            Read-Only Student Record &bull; Encoded by Faculty
          </span>
        </div>
      </div>

      <div class="notice-banner">
        <div>
          <strong>Official Role Permission Policy:</strong> Students have <strong>read-only</strong> access to their grade records. Only authorized <strong>BANTUG UNIVERSITY Faculty</strong> members can enter, edit, or update grades from the Faculty Grade Management module.
        </div>
      </div>

      <!-- Summary Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Overall Grade Average</span>
            <span class="stat-value" style="${
              overallAvg === null ? "font-size:1.15rem;" : ""
            }">${overallAvg !== null ? overallAvg.toFixed(2) + "%" : "No grade recorded."}</span>
            <span class="stat-sub">${
              overallAvg !== null
                ? `Standing: <strong>${overallStanding.eq} (${overallStanding.label})</strong>`
                : "Awaiting faculty grade encoding"
            }</span>
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
            <span class="stat-label">Enrolled Subjects</span>
            <span class="stat-value">${grades.length} Subjects</span>
            <span class="stat-sub">${totalUnits} Total Units &bull; ${escapeHtml(
      profile.section || "BSIT 2-2"
    )}</span>
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
            <span class="stat-label">Highest Graded Subject</span>
            <span class="stat-value" style="${
              !highestSub ? "font-size:1.15rem;" : ""
            }">${highestSub ? escapeHtml(highestSub.courseCode || highestSub.code) : "No grade recorded."}</span>
            <span class="stat-sub">${
              highestSub
                ? `${highestSub.avg.toFixed(2)}% &bull; ${escapeHtml(highestSub.name)}`
                : "No subject grades recorded yet"
            }</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Subjects Graded by Faculty</span>
            <span class="stat-value">${gradedCount} / ${grades.length}</span>
            <span class="stat-sub">${passingCount} Passing &bull; ${
      grades.length - gradedCount
    } Pending Faculty Entry</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Syllabus Grading Weights Reference Bar (Read-Only) -->
      <div class="weights-bar">
        <span class="weight-chip">Quizzes: <strong>${gradingWeights.quizzes}%</strong></span>
        <span class="weight-chip">Assignments: <strong>${gradingWeights.assignments}%</strong></span>
        <span class="weight-chip">Activities: <strong>${gradingWeights.activities}%</strong></span>
        <span class="weight-chip">Projects: <strong>${gradingWeights.projects}%</strong></span>
        <span class="weight-chip">Examinations: <strong>${gradingWeights.examinations}%</strong></span>
      </div>

      <!-- Filter by Subject & Search Toolbar -->
      <div class="toolbar-row">
        <div class="toolbar-group">
          <select id="studentGradeSubjectFilter" class="form-control" style="max-width:320px;" aria-label="Filter Grades by Subject">
            <option value="All" ${selectedSubjectFilter === "All" ? "selected" : ""}>All Enrolled BSIT 2-2 Subjects (${
      grades.length
    })</option>
            ${grades
              .map(
                (g) =>
                  `<option value="${escapeHtml(g.subjectCode)}" ${
                    selectedSubjectFilter === g.subjectCode ? "selected" : ""
                  }>${escapeHtml(g.subjectCode)} — ${escapeHtml(g.courseCode)} (${escapeHtml(
                    g.subjectName
                  )})</option>`
              )
              .join("")}
          </select>

          <input
            type="search"
            id="studentGradeSearchInput"
            class="form-control"
            style="max-width:280px;"
            placeholder="Search subject, code, or instructor..."
            value="${escapeHtml(searchQuery)}"
          />
        </div>
      </div>

      <!-- Main Grades Layout: Read-Only Subject Table + Academic Performance Summary -->
      <div class="grades-layout">
        <!-- Left: Enrolled Subjects Grade Table (Strictly Read-Only) -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">BSIT 2-2 Subject Grade Records</h3>
            <span class="badge badge-primary">Showing ${filteredGrades.length} of ${
      grades.length
    } Subjects</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Course Code</th>
                  <th>Subject &amp; Instructor</th>
                  <th>Units</th>
                  <th>Component Breakdown (Q / A / Act / P / Ex)</th>
                  <th>Subject Grade</th>
                  <th>Equivalent &amp; Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${
                  filteredGrades.length === 0
                    ? `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No matching subjects found.</td></tr>`
                    : filteredGrades
                        .map((g) => {
                          const avg = StudentHubStorage.computeSubjectAverage(g, gradingWeights);
                          const st = getGradeStanding(avg);
                          return `
                            <tr>
                              <td><strong>${escapeHtml(g.subjectCode)}</strong></td>
                              <td><span class="badge badge-info">${escapeHtml(
                                g.courseCode || "BSIT"
                              )}</span></td>
                              <td>
                                <div><strong>${escapeHtml(g.subjectName)}</strong></div>
                                <div style="font-size:0.76rem;color:var(--text-muted);">Instructor: ${escapeHtml(
                                  g.instructor || "Not specified"
                                )}</div>
                              </td>
                              <td>${escapeHtml(g.units || 3)}</td>
                              <td>
                                ${
                                  avg !== null
                                    ? `<div style="font-size:0.77rem;color:var(--text-secondary);">
                                        Q: <strong>${formatComponentScore(g.quizzes)}</strong> &bull;
                                        A: <strong>${formatComponentScore(g.assignments)}</strong> &bull;
                                        Act: <strong>${formatComponentScore(g.activities)}</strong><br/>
                                        Proj: <strong>${formatComponentScore(g.projects)}</strong> &bull;
                                        Exam: <strong>${formatComponentScore(g.examinations)}</strong>
                                       </div>`
                                    : `<span style="font-size:0.78rem;color:var(--text-muted);">Not yet encoded by faculty</span>`
                                }
                              </td>
                              <td>
                                ${
                                  avg !== null
                                    ? `<strong style="font-size:0.98rem;">${avg.toFixed(2)}%</strong>`
                                    : `<span class="badge badge-neutral">No grade recorded.</span>`
                                }
                              </td>
                              <td>
                                ${
                                  avg !== null
                                    ? `<span class="badge ${st.badge}">${st.eq} &bull; ${st.label}</span>`
                                    : `<span style="font-size:0.8rem;color:var(--text-muted);">No grade recorded.</span>`
                                }
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

        <!-- Right: Academic Performance Summary (Read-Only) -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Academic Performance Summary</h3>
            <span class="badge ${overallStanding.badge}">${
      overallAvg !== null ? `GWA: ${overallStanding.eq}` : "Pending"
    }</span>
          </div>

          <div class="calc-result-box" style="margin-top:0;margin-bottom:18px;">
            <div style="font-size:0.76rem;text-transform:uppercase;color:var(--text-secondary);font-weight:600;">
              Cumulative Weighted Average (${escapeHtml(profile.academicTerm || "2nd Sem, AY 2026–2027")})
            </div>
            <div class="calc-score">${
              overallAvg !== null ? overallAvg.toFixed(2) + "%" : "No grade recorded."
            }</div>
            <div style="margin-top:6px;">
              <span class="badge ${overallStanding.badge}">
                ${
                  overallAvg !== null
                    ? `Equivalent: ${overallStanding.eq} (${overallStanding.label})`
                    : "Awaiting Faculty Grade Submission"
                }
              </span>
            </div>
          </div>

          <div class="profile-meta-list" style="margin-top:0;padding-top:0;border-top:none;margin-bottom:18px;">
            <div class="profile-meta-row">
              <span>Program &amp; Section</span>
              <span>BSIT 2-2</span>
            </div>
            <div class="profile-meta-row">
              <span>Credited / Total Units</span>
              <span>${creditedUnits} / ${totalUnits} Units</span>
            </div>
            <div class="profile-meta-row">
              <span>Passing Subjects (&ge;75%)</span>
              <span>${passingCount} of ${gradedCount} Graded</span>
            </div>
            <div class="profile-meta-row">
              <span>Highest Subject</span>
              <span>${
                highestSub ? `${highestSub.courseCode} (${highestSub.avg.toFixed(2)}%)` : "—"
              }</span>
            </div>
            <div class="profile-meta-row">
              <span>Lowest Graded Subject</span>
              <span>${
                lowestSub ? `${lowestSub.courseCode} (${lowestSub.avg.toFixed(2)}%)` : "—"
              }</span>
            </div>
          </div>

          <h4 style="font-size:0.84rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);margin-bottom:12px;">
            Performance by Subject
          </h4>
          <div>
            ${grades
              .map((g) => {
                const avg = StudentHubStorage.computeSubjectAverage(g, gradingWeights);
                const st = getGradeStanding(avg);
                const pct = avg !== null ? Math.min(100, Math.max(0, avg)) : 0;
                return `
                  <div class="progress-row">
                    <div class="progress-meta">
                      <span>${escapeHtml(g.courseCode)} (${escapeHtml(g.subjectCode)})</span>
                      <span>${avg !== null ? `${avg.toFixed(2)}% (${st.eq})` : "No grade recorded."}</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill ${st.fill}" style="width: ${pct}%;"></div>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </div>
    `;

    // Bind Subject Filter & Search
    const subFilterEl = document.getElementById("studentGradeSubjectFilter");
    if (subFilterEl) {
      subFilterEl.addEventListener("change", (e) => {
        selectedSubjectFilter = e.target.value;
        render();
      });
    }

    const searchInputEl = document.getElementById("studentGradeSearchInput");
    if (searchInputEl) {
      searchInputEl.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
        const restored = document.getElementById("studentGradeSearchInput");
        if (restored) {
          restored.focus();
          restored.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }
  }

  return { render };
})();

window.StudentHubGrades = StudentHubGrades;
