/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 4: My Grades (grades.js) — STRICTLY READ-ONLY FOR STUDENTS
 *
 * Hydrates `pages/student/grades.html` in place while enforcing read-only
 * student access:
 * - View grades and component breakdown (Q / A / Act / P / Ex)
 * - Filter and search grades by subject, code, or instructor
 * - View overall grade average and academic performance summary
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

  function renderGradesTableOnly() {
    const state = StudentHubStorage.getState();
    const { grades = [], gradingWeights = {}, profile = {} } = state;
    const sectionLabel = profile.section || "BSIT 2-2";

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

    const tableTitleEl = document.getElementById("gradesTableTitle");
    const showingBadgeEl = document.getElementById("gradesShowingBadge");
    const tableBodyEl = document.getElementById("gradesTableBody");

    if (tableTitleEl) {
      tableTitleEl.textContent = `${sectionLabel} Subject Grade Records`;
    }
    if (showingBadgeEl) {
      showingBadgeEl.textContent = `Showing ${filteredGrades.length} of ${grades.length} Subjects`;
    }
    if (!tableBodyEl) return;

    tableBodyEl.innerHTML =
      filteredGrades.length === 0
        ? `<tr><td colspan="7" class="grades-empty-cell">No matching subjects found.</td></tr>`
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
                    <div class="grades-instructor-sub">Instructor: ${escapeHtml(
                      g.instructor || "Not specified"
                    )}</div>
                  </td>
                  <td class="grades-col-units">${escapeHtml(g.units || 3)}</td>
                  <td>
                    ${
                      avg !== null
                        ? `<div class="grades-components-cell">
                            Q: <strong>${formatComponentScore(g.quizzes)}</strong> &bull;
                            A: <strong>${formatComponentScore(g.assignments)}</strong> &bull;
                            Act: <strong>${formatComponentScore(g.activities)}</strong><br/>
                            Proj: <strong>${formatComponentScore(g.projects)}</strong> &bull;
                            Exam: <strong>${formatComponentScore(g.examinations)}</strong>
                           </div>`
                        : `<span class="grades-not-encoded">Not yet encoded by faculty</span>`
                    }
                  </td>
                  <td class="grades-col-grade">
                    ${
                      avg !== null
                        ? `<strong class="grades-score-strong">${avg.toFixed(2)}%</strong>`
                        : `<span class="badge badge-neutral">No grade recorded.</span>`
                    }
                  </td>
                  <td>
                    ${
                      avg !== null
                        ? `<span class="badge ${st.badge}">${st.eq} &bull; ${st.label}</span>`
                        : `<span class="grades-remarks-empty">No grade recorded.</span>`
                    }
                  </td>
                </tr>
              `;
            })
            .join("");
  }

  function bindGradeEventsOnce(container) {
    if (!container || container.dataset.gradesEventsBound === "1") return;
    container.dataset.gradesEventsBound = "1";

    const subFilterEl = document.getElementById("studentGradeSubjectFilter");
    if (subFilterEl) {
      subFilterEl.addEventListener("change", (e) => {
        selectedSubjectFilter = e.target.value;
        renderGradesTableOnly();
      });
    }

    const searchInputEl = document.getElementById("studentGradeSearchInput");
    if (searchInputEl) {
      searchInputEl.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderGradesTableOnly();
      });
    }
  }

  function render() {
    const container = document.getElementById("gradesContainer");
    if (!container) return;

    bindGradeEventsOnce(container);

    const state = StudentHubStorage.getState();
    const { grades = [], gradingWeights = {}, profile = {} } = state;
    const sectionLabel = profile.section || "BSIT 2-2";

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

    // 1. Hydrate Header
    const titleEl = document.getElementById("gradesSectionTitle");
    const studentSummaryEl = document.getElementById("gradesStudentSummary");
    if (titleEl) {
      titleEl.innerHTML = `BANTUG UNIVERSITY &mdash; My Academic Grades (${escapeHtml(sectionLabel)})`;
    }
    if (studentSummaryEl) {
      studentSummaryEl.textContent = `Read-only academic grade record for ${
        profile.fullName || ""
      } (${profile.studentNumber || ""}). Grades are encoded and updated exclusively by assigned faculty members.`;
    }

    // 2. Hydrate Summary Stat Cards
    const overallEl = document.getElementById("gradesStatOverall");
    const overallSubEl = document.getElementById("gradesStatOverallSub");
    const subjectsEl = document.getElementById("gradesStatSubjects");
    const subjectsSubEl = document.getElementById("gradesStatSubjectsSub");
    const highestEl = document.getElementById("gradesStatHighest");
    const highestSubEl = document.getElementById("gradesStatHighestSub");
    const gradedCountEl = document.getElementById("gradesStatGradedCount");
    const gradedSubEl = document.getElementById("gradesStatGradedSub");

    if (overallEl) {
      overallEl.textContent = overallAvg !== null ? `${overallAvg.toFixed(2)}%` : "No grade recorded.";
      overallEl.classList.toggle("grades-stat-empty", overallAvg === null);
    }
    if (overallSubEl) {
      overallSubEl.innerHTML =
        overallAvg !== null
          ? `Standing: <strong>${overallStanding.eq} (${overallStanding.label})</strong>`
          : "Awaiting faculty grade encoding";
    }

    if (subjectsEl) subjectsEl.textContent = `${grades.length} Subjects`;
    if (subjectsSubEl) {
      subjectsSubEl.innerHTML = `${totalUnits} Total Units &bull; ${escapeHtml(sectionLabel)}`;
    }

    if (highestEl) {
      highestEl.textContent = highestSub
        ? highestSub.courseCode || highestSub.code
        : "No grade recorded.";
      highestEl.classList.toggle("grades-stat-empty", !highestSub);
    }
    if (highestSubEl) {
      highestSubEl.innerHTML = highestSub
        ? `${highestSub.avg.toFixed(2)}% &bull; ${escapeHtml(highestSub.name)}`
        : "No subject grades recorded yet";
    }

    if (gradedCountEl) gradedCountEl.textContent = `${gradedCount} / ${grades.length}`;
    if (gradedSubEl) {
      gradedSubEl.innerHTML = `${passingCount} Passing &bull; ${
        grades.length - gradedCount
      } Pending Faculty Entry`;
    }

    // 3. Hydrate Grading Weights Chips
    const wQuizzes = document.getElementById("weightQuizzes");
    const wAssignments = document.getElementById("weightAssignments");
    const wActivities = document.getElementById("weightActivities");
    const wProjects = document.getElementById("weightProjects");
    const wExaminations = document.getElementById("weightExaminations");
    if (wQuizzes) wQuizzes.textContent = `${gradingWeights.quizzes}%`;
    if (wAssignments) wAssignments.textContent = `${gradingWeights.assignments}%`;
    if (wActivities) wActivities.textContent = `${gradingWeights.activities}%`;
    if (wProjects) wProjects.textContent = `${gradingWeights.projects}%`;
    if (wExaminations) wExaminations.textContent = `${gradingWeights.examinations}%`;

    // 4. Hydrate Filter Select & Search Input
    const subFilterEl = document.getElementById("studentGradeSubjectFilter");
    if (subFilterEl) {
      const hasCurrent =
        selectedSubjectFilter === "All" ||
        grades.some((g) => g.subjectCode === selectedSubjectFilter);
      if (!hasCurrent) selectedSubjectFilter = "All";

      subFilterEl.innerHTML = `
        <option value="All" ${selectedSubjectFilter === "All" ? "selected" : ""}>All Enrolled ${escapeHtml(
        sectionLabel
      )} Subjects (${grades.length})</option>
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
      `;
      subFilterEl.value = selectedSubjectFilter;
    }

    const searchInputEl = document.getElementById("studentGradeSearchInput");
    if (searchInputEl && searchInputEl.value !== searchQuery) {
      searchInputEl.value = searchQuery;
    }

    // 5. Hydrate Read-Only Grade Table
    renderGradesTableOnly();

    // 6. Hydrate Academic Performance Summary Panel
    const gwaBadgeEl = document.getElementById("gradesSummaryGwaBadge");
    const termLabelEl = document.getElementById("gradesSummaryTermLabel");
    const scoreEl = document.getElementById("gradesSummaryScore");
    const standingBadgeEl = document.getElementById("gradesSummaryStandingBadge");
    const metaSectionEl = document.getElementById("gradesMetaSection");
    const metaUnitsEl = document.getElementById("gradesMetaUnits");
    const metaPassingEl = document.getElementById("gradesMetaPassing");
    const metaHighestEl = document.getElementById("gradesMetaHighest");
    const metaLowestEl = document.getElementById("gradesMetaLowest");
    const perfBarsEl = document.getElementById("gradesPerformanceBars");

    if (gwaBadgeEl) {
      gwaBadgeEl.className = `badge ${overallStanding.badge}`;
      gwaBadgeEl.textContent = overallAvg !== null ? `GWA: ${overallStanding.eq}` : "Pending";
    }
    if (termLabelEl) {
      termLabelEl.textContent = `Cumulative Weighted Average (${
        profile.academicTerm || "2nd Sem, AY 2026–2027"
      })`;
    }
    if (scoreEl) {
      scoreEl.textContent = overallAvg !== null ? `${overallAvg.toFixed(2)}%` : "No grade recorded.";
      scoreEl.classList.toggle("grades-summary-score-empty", overallAvg === null);
    }
    if (standingBadgeEl) {
      standingBadgeEl.className = `badge ${overallStanding.badge}`;
      standingBadgeEl.textContent =
        overallAvg !== null
          ? `Equivalent: ${overallStanding.eq} (${overallStanding.label})`
          : "Awaiting Faculty Grade Submission";
    }

    if (metaSectionEl) metaSectionEl.textContent = sectionLabel;
    if (metaUnitsEl) metaUnitsEl.textContent = `${creditedUnits} / ${totalUnits} Units`;
    if (metaPassingEl) metaPassingEl.textContent = `${passingCount} of ${gradedCount} Graded`;
    if (metaHighestEl) {
      metaHighestEl.textContent = highestSub
        ? `${highestSub.courseCode} (${highestSub.avg.toFixed(2)}%)`
        : "—";
    }
    if (metaLowestEl) {
      metaLowestEl.textContent = lowestSub
        ? `${lowestSub.courseCode} (${lowestSub.avg.toFixed(2)}%)`
        : "—";
    }

    if (perfBarsEl) {
      perfBarsEl.innerHTML = grades
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
        .join("");
    }
  }

  return { render };
})();

window.StudentHubGrades = StudentHubGrades;
