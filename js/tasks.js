/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 6: Academic Task Manager (tasks.js) — STUDENT SUBMISSION & COMPLETION
 *
 * Student Permissions Enforced:
 * - View assignments published by faculty (instructions, subjects, deadlines)
 * - Submit completed assignment via simulated submission form (text response)
 * - Mark assignment as completed
 * - View submission status (Pending, Submitted, Completed, Overdue)
 * - Cannot modify faculty instructions, change deadlines, or delete assignments
 * ============================================================================
 */

const StudentHubTasks = (function () {
  const {
    escapeHtml,
    formatReadableDate,
    clearFormErrors,
    setFieldError,
    openModal,
    closeModal,
    showToast,
    requireRole,
    refreshAll
  } = window.StudentHubApp;

  let searchQuery = "";
  let filterStatus = "All"; // "All" | "Pending" | "Submitted" | "Completed" | "Overdue"
  let filterSubject = "All";
  let sortBy = "deadline_asc"; // "deadline_asc" | "deadline_desc" | "priority"

  const PRIORITY_WEIGHT = { High: 3, Medium: 2, Low: 1 };

  function getStatusBadge(status) {
    if (status === "Completed") return "badge-success";
    if (status === "Submitted") return "badge-info";
    if (status === "Overdue") return "badge-danger";
    return "badge-warning"; // Pending
  }

  function getPriorityBadge(priority) {
    if (priority === "High") return "badge-danger";
    if (priority === "Medium") return "badge-warning";
    return "badge-neutral";
  }

  /**
   * Open Student Assignment Submission Modal
   * Associates submission with the assignment ID and active student account
   */
  function openSubmissionModal(task) {
    if (!requireRole("student", "submit assignments")) return;
    if (!task) return;

    const state = StudentHubStorage.getState();
    const studentNo = state.profile.studentNumber || "2025-BSIT-0202";
    const studentName = state.profile.fullName || "Racel Valiente (Demo Student)";
    const existingSub =
      (task.submissions && task.submissions[studentNo]) || {
        responseText: "",
        status: "Submitted"
      };

    const modalHtml = `
      <div style="margin-bottom:16px;padding:14px;background:var(--bg-surface-alt);border:1px solid var(--border-color);border-radius:var(--radius-sm);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
          <span class="badge badge-primary">${escapeHtml(task.subject)}</span>
          <span class="badge ${getStatusBadge(task.status)}">Current Status: ${escapeHtml(
      task.status
    )}</span>
        </div>
        <h3 style="font-size:1.02rem;margin-bottom:6px;">${escapeHtml(task.title)}</h3>
        <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:8px;">
          <strong>Faculty Instructions:</strong> ${escapeHtml(
            task.description || "Complete and submit the required deliverable before the deadline."
          )}
        </p>
        <div style="font-size:0.78rem;color:var(--text-muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span><strong>Deadline:</strong> ${escapeHtml(formatReadableDate(task.deadline))}</span>
          <span><strong>Student Account:</strong> ${escapeHtml(studentName)} (${escapeHtml(
      studentNo
    )})</span>
        </div>
      </div>

      <form id="studentTaskSubmissionForm" novalidate>
        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label" for="subResponseText">
              Assignment Response / Submission Notes <span class="req">*</span>
            </label>
            <textarea
              id="subResponseText"
              name="responseText"
              rows="4"
              class="form-control"
              placeholder="Enter your assignment answer, repository link, or completion confirmation notes..."
            >${escapeHtml(existingSub.responseText || "")}</textarea>
            <div class="field-error" data-error-for="responseText"></div>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="subActionStatus">Submission Status <span class="req">*</span></label>
            <select id="subActionStatus" name="submissionStatus" class="form-control">
              <option value="Submitted" ${
                existingSub.status !== "Completed" ? "selected" : ""
              }>Submitted (Turned in for Faculty Review)</option>
              <option value="Completed" ${
                existingSub.status === "Completed" ? "selected" : ""
              }>Completed (Assignment Finished &amp; Confirmed)</option>
            </select>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="cancelSubModalBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Submit Assignment</button>
        </div>
      </form>
    `;

    openModal(`Submit Assignment — ${task.title}`, modalHtml, (bodyEl) => {
      bodyEl.querySelector("#cancelSubModalBtn").addEventListener("click", closeModal);
      const form = bodyEl.querySelector("#studentTaskSubmissionForm");

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!requireRole("student", "submit assignments")) return;
        clearFormErrors(form);

        const fd = new FormData(form);
        const responseText = String(fd.get("responseText") || "").trim();
        const submissionStatus =
          fd.get("submissionStatus") === "Completed" ? "Completed" : "Submitted";

        if (!responseText || responseText.length < 3) {
          setFieldError(
            form,
            "responseText",
            "Please enter your assignment response or completion confirmation notes."
          );
          return;
        }

        const currState = StudentHubStorage.getState();
        const todayStr = StudentHubStorage.formatLocalDate(new Date());

        currState.tasks = currState.tasks.map((t) => {
          if (t.id !== task.id) return t;
          const submissions = { ...(t.submissions || {}) };
          submissions[studentNo] = {
            studentNumber: studentNo,
            studentName,
            status: submissionStatus,
            responseText,
            submittedAt: todayStr
          };
          return {
            ...t,
            status: submissionStatus,
            submissions
          };
        });

        StudentHubStorage.saveState(currState);
        closeModal();
        refreshAll();
        showToast(
          `Assignment "${task.title}" marked as ${submissionStatus}!`,
          "success"
        );
      });
    });
  }

  /**
   * Quick toggle between Completed and Pending/Submitted for the active student
   */
  function markTaskStatus(taskId, newStatus) {
    if (!requireRole("student", "update assignment completion status")) return;
    const currState = StudentHubStorage.getState();
    const studentNo = currState.profile.studentNumber || "2025-BSIT-0202";
    const studentName = currState.profile.fullName || "Racel Valiente (Demo Student)";
    const todayStr = StudentHubStorage.formatLocalDate(new Date());

    const target = currState.tasks.find((t) => t.id === taskId);
    if (!target) return;

    currState.tasks = currState.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const submissions = { ...(t.submissions || {}) };
      if (newStatus === "Completed" || newStatus === "Submitted") {
        const prev = submissions[studentNo] || {};
        submissions[studentNo] = {
          studentNumber: studentNo,
          studentName,
          status: newStatus,
          responseText:
            prev.responseText ||
            `Confirmed ${newStatus.toLowerCase()} by ${studentName} (${studentNo}).`,
          submittedAt: prev.submittedAt || todayStr
        };
      } else {
        delete submissions[studentNo];
      }
      return {
        ...t,
        status: newStatus,
        submissions
      };
    });

    StudentHubStorage.saveState(currState);
    refreshAll();
    showToast(`Assignment "${target.title}" status updated to ${newStatus}.`, "success");
  }

  function render() {
    const container = document.getElementById("tasksContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const tasks = state.tasks || [];
    const studentNo = state.profile.studentNumber || "2025-BSIT-0202";

    const pendingCount = tasks.filter((t) => t.status === "Pending").length;
    const submittedCount = tasks.filter((t) => t.status === "Submitted").length;
    const completedCount = tasks.filter((t) => t.status === "Completed").length;
    const overdueCount = tasks.filter((t) => t.status === "Overdue").length;

    const subjectOptions = Array.from(
      new Set([...StudentHubStorage.getSubjectList(), ...tasks.map((t) => t.subject)])
    );

    const filtered = tasks
      .filter((t) => {
        const matchStatus = filterStatus === "All" || t.status === filterStatus;
        const matchSubject = filterSubject === "All" || t.subject === filterSubject;
        const q = searchQuery.trim().toLowerCase();
        const matchQuery =
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q));
        return matchStatus && matchSubject && matchQuery;
      })
      .sort((a, b) => {
        if (sortBy === "deadline_asc") {
          return (a.deadline || "").localeCompare(b.deadline || "");
        }
        if (sortBy === "deadline_desc") {
          return (b.deadline || "").localeCompare(a.deadline || "");
        }
        if (sortBy === "priority") {
          return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
        }
        return 0;
      });

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Academic Task Manager (${escapeHtml(
            state.profile.section || "BSIT 2-2"
          )})</h2>
          <p>View assignments published by your BSIT 2-2 instructors, submit your completed work, and track your submission statuses.</p>
        </div>
        <div class="section-header-actions">
          <span class="badge badge-info" style="padding:8px 14px;font-size:0.82rem;">
            Student Account: ${escapeHtml(studentNo)}
          </span>
        </div>
      </div>

      <div class="notice-banner">
        <div>
          <strong>Assignment Submission Policy:</strong> Assignments, instructions, and deadlines are published and managed by <strong>BANTUG UNIVERSITY Faculty</strong>. Students can submit responses or mark assignments as completed, which automatically updates the assignment status.
        </div>
      </div>

      <!-- Task Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Pending Assignments</span>
            <span class="stat-value">${pendingCount}</span>
            <span class="stat-sub">Awaiting student submission</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Submitted Assignments</span>
            <span class="stat-value">${submittedCount}</span>
            <span class="stat-sub">Turned in by ${escapeHtml(studentNo)}</span>
          </div>
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Completed Assignments</span>
            <span class="stat-value">${completedCount}</span>
            <span class="stat-sub">Finished academic deliverables</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Overdue Assignments</span>
            <span class="stat-value" style="${overdueCount > 0 ? "color:var(--danger-text);" : ""}">${overdueCount}</span>
            <span class="stat-sub">${
              overdueCount > 0 ? "Deadline passed without submission" : "No overdue assignments"
            }</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        </div>
      </div>

      <!-- Search, Filter & Sort Toolbar -->
      <div class="toolbar-row">
        <div class="toolbar-group">
          <input
            type="search"
            id="taskSearchInput"
            class="form-control"
            style="max-width:250px;"
            placeholder="Search assignment or instructions..."
            value="${escapeHtml(searchQuery)}"
          />

          <select id="taskFilterStatus" class="form-control" style="max-width:175px;" aria-label="Filter by Status">
            <option value="All" ${filterStatus === "All" ? "selected" : ""}>All Statuses (${tasks.length})</option>
            <option value="Pending" ${filterStatus === "Pending" ? "selected" : ""}>Pending (${pendingCount})</option>
            <option value="Submitted" ${filterStatus === "Submitted" ? "selected" : ""}>Submitted (${submittedCount})</option>
            <option value="Completed" ${filterStatus === "Completed" ? "selected" : ""}>Completed (${completedCount})</option>
            <option value="Overdue" ${filterStatus === "Overdue" ? "selected" : ""}>Overdue (${overdueCount})</option>
          </select>

          <select id="taskFilterSubject" class="form-control" style="max-width:260px;" aria-label="Filter by Subject">
            <option value="All" ${filterSubject === "All" ? "selected" : ""}>All Subjects</option>
            ${subjectOptions
              .map(
                (s) =>
                  `<option value="${escapeHtml(s)}" ${
                    filterSubject === s ? "selected" : ""
                  }>${escapeHtml(s)}</option>`
              )
              .join("")}
          </select>

          <select id="taskSortSelect" class="form-control" style="max-width:195px;" aria-label="Sort Tasks">
            <option value="deadline_asc" ${sortBy === "deadline_asc" ? "selected" : ""}>Sort: Earliest Deadline</option>
            <option value="deadline_desc" ${sortBy === "deadline_desc" ? "selected" : ""}>Sort: Latest Deadline</option>
            <option value="priority" ${sortBy === "priority" ? "selected" : ""}>Sort: Highest Priority</option>
          </select>
        </div>
      </div>

      <!-- Task Cards Grid -->
      ${
        filtered.length === 0
          ? `
          <div class="card">
            <div class="empty-state">
              <h3>No Matching Assignments Found</h3>
              <p>No faculty-published assignments match your current filter criteria.</p>
            </div>
          </div>
        `
          : `
          <div class="tasks-grid">
            ${filtered
              .map((t) => {
                const isDone = t.status === "Completed";
                const isSubmitted = t.status === "Submitted";
                const isOverdue = t.status === "Overdue";
                const studentSub = t.submissions && t.submissions[studentNo];

                return `
                  <div class="task-card ${isDone ? "is-completed" : ""} ${
                  isOverdue ? "is-overdue" : ""
                }">
                    <div>
                      <div class="task-top">
                        <div class="task-check-wrap">
                          <input
                            type="checkbox"
                            class="task-checkbox toggle-task-done"
                            data-id="${escapeHtml(t.id)}"
                            ${isDone ? "checked" : ""}
                            title="${isDone ? "Reopen as Pending" : "Mark as Completed"}"
                            aria-label="Mark ${escapeHtml(t.title)} as Completed"
                          />
                          <div>
                            <div class="task-title">${escapeHtml(t.title)}</div>
                            <div style="font-size:0.78rem;color:var(--royal-600);font-weight:600;margin-top:2px;">
                              ${escapeHtml(t.subject)}
                            </div>
                          </div>
                        </div>
                        <span class="badge ${getStatusBadge(t.status)}">${escapeHtml(t.status)}</span>
                      </div>

                      <p class="task-desc">
                        <strong>Instructions:</strong> ${escapeHtml(
                          t.description || "Follow course guidelines and submit before deadline."
                        )}
                      </p>

                      ${
                        studentSub && studentSub.responseText
                          ? `
                          <div style="margin-top:10px;padding:10px 12px;background:var(--bg-surface-alt);border-left:3px solid var(--royal-600);border-radius:6px;font-size:0.8rem;">
                            <div style="font-weight:600;color:var(--text-main);margin-bottom:2px;">
                              Your Submission (${escapeHtml(studentSub.status)} &bull; ${escapeHtml(
                              formatReadableDate(studentSub.submittedAt)
                            )}):
                            </div>
                            <div style="color:var(--text-secondary);">${escapeHtml(
                              studentSub.responseText
                            )}</div>
                          </div>
                        `
                          : ""
                      }
                    </div>

                    <div class="task-footer">
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span class="badge ${getPriorityBadge(t.priority)}">${escapeHtml(
                  t.priority || "Medium"
                )} Priority</span>
                        <span style="font-size:0.78rem;color:var(--text-secondary);">
                          <strong>Deadline:</strong> ${escapeHtml(formatReadableDate(t.deadline))}
                        </span>
                      </div>
                      <div class="table-actions">
                        <button
                          type="button"
                          class="btn btn-sm btn-primary submit-task-btn"
                          data-id="${escapeHtml(t.id)}"
                        >
                          ${isSubmitted || isDone ? "Update Submission" : "Submit Assignment"}
                        </button>
                        ${
                          !isDone
                            ? `<button type="button" class="btn btn-sm btn-secondary mark-complete-btn" data-id="${escapeHtml(
                                t.id
                              )}">Mark Completed</button>`
                            : `<button type="button" class="btn btn-sm btn-secondary mark-pending-btn" data-id="${escapeHtml(
                                t.id
                              )}">Reopen</button>`
                        }
                      </div>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        `
      }
    `;

    // Bind Search & Filters
    const searchInput = document.getElementById("taskSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
        const el = document.getElementById("taskSearchInput");
        if (el) {
          el.focus();
          el.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    const statusSel = document.getElementById("taskFilterStatus");
    if (statusSel) {
      statusSel.addEventListener("change", (e) => {
        filterStatus = e.target.value;
        render();
      });
    }

    const subSel = document.getElementById("taskFilterSubject");
    if (subSel) {
      subSel.addEventListener("change", (e) => {
        filterSubject = e.target.value;
        render();
      });
    }

    const sortSel = document.getElementById("taskSortSelect");
    if (sortSel) {
      sortSel.addEventListener("change", (e) => {
        sortBy = e.target.value;
        render();
      });
    }

    // Bind Checkboxes & Action Buttons
    container.querySelectorAll(".toggle-task-done").forEach((chk) => {
      chk.addEventListener("change", () => {
        const id = chk.getAttribute("data-id");
        markTaskStatus(id, chk.checked ? "Completed" : "Pending");
      });
    });

    container.querySelectorAll(".submit-task-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const task = state.tasks.find((t) => t.id === id);
        if (task) openSubmissionModal(task);
      });
    });

    container.querySelectorAll(".mark-complete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        markTaskStatus(id, "Completed");
      });
    });

    container.querySelectorAll(".mark-pending-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        markTaskStatus(id, "Pending");
      });
    });
  }

  return { render, openSubmissionModal, markTaskStatus };
})();

window.StudentHubTasks = StudentHubTasks;
