/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 6: Academic Task Manager (tasks.js) — STUDENT SUBMISSION & COMPLETION
 *
 * Student Permissions Enforced:
 * - View assignments published by faculty (instructions, subjects, deadlines)
 * - Inspect full assignment details and connected subject learning resources
 * - Submit completed assignment via submission modal (response notes & status)
 * - Mark assignment as completed or reopen as pending
 * - Cannot modify faculty instructions, change deadlines, or delete assignments
 * ============================================================================
 */

const StudentHubTasks = (function () {
  const {
    escapeHtml,
    formatReadableDate,
    isValidUrl,
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
  let eventsBound = false;

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

  function parseAcademicTerm(termStr) {
    const raw = String(termStr || "").trim();
    if (!raw) {
      return { academicYear: "AY 2026\u20132027", semester: "2nd Semester" };
    }
    const parts = raw.split(/\u2022|\|/).map((p) => p.trim()).filter(Boolean);
    return {
      academicYear: parts[0] || "AY 2026\u20132027",
      semester: parts[1] || "2nd Semester"
    };
  }

  function resolveTaskSubjectInfo(task, state) {
    const subjects = (state && state.subjects) || [];
    const rawSubject = String(task.subject || "").trim();
    let subjectCode = String(task.subjectCode || "").trim();
    let subjectName = rawSubject;
    let instructor = String(task.instructor || task.publishedBy || "").trim();

    const matched = subjects.find((s) => {
      if (subjectCode && s.code && s.code.toLowerCase() === subjectCode.toLowerCase()) {
        return true;
      }
      if (rawSubject && s.code && rawSubject.toLowerCase().startsWith(s.code.toLowerCase())) {
        return true;
      }
      return rawSubject && s.name && rawSubject.toLowerCase().includes(s.name.toLowerCase());
    });

    if (!subjectCode && rawSubject.includes(" - ")) {
      subjectCode = rawSubject.split(" - ")[0].trim();
    }
    if (subjectCode && rawSubject.startsWith(`${subjectCode} - `)) {
      subjectName = rawSubject.slice(subjectCode.length + 3).trim();
    } else if (matched) {
      if (!subjectCode) subjectCode = matched.code || "";
      subjectName = matched.courseCode ? `${matched.courseCode} - ${matched.name}` : matched.name;
    }

    if (!instructor && matched && matched.instructor) {
      instructor = matched.instructor;
    }

    return {
      subjectCode: subjectCode || "SUBJ",
      subjectName: subjectName || rawSubject || "Course Assignment",
      instructor: instructor || "BANTUG UNIVERSITY Faculty"
    };
  }

  function getDeadlineIndicator(task) {
    if (task.status === "Completed") {
      return { label: "Completed", className: "is-normal" };
    }
    if (task.status === "Submitted") {
      return { label: "Turned In", className: "is-normal" };
    }
    const todayStr = StudentHubStorage.formatLocalDate(new Date());
    const deadlineStr = String(task.deadline || "").trim();
    if (!deadlineStr) {
      return { label: "No Deadline Set", className: "is-normal" };
    }
    if (task.status === "Overdue" || deadlineStr < todayStr) {
      return { label: "Past Due", className: "is-overdue" };
    }
    if (deadlineStr === todayStr) {
      return { label: "Due Today", className: "is-soon" };
    }

    const todayMs = new Date(`${todayStr}T00:00:00`).getTime();
    const dueMs = new Date(`${deadlineStr}T00:00:00`).getTime();
    const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return {
        label: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
        className: "is-soon"
      };
    }
    return { label: `Due in ${diffDays} days`, className: "is-normal" };
  }

  function getRelatedResources(task, state) {
    const resources = (state && state.resources) || [];
    const taskSubject = String(task.subject || "").toLowerCase();
    const taskCode = String(task.subjectCode || "").toLowerCase();
    return resources.filter((r) => {
      const resSub = String(r.subject || "").toLowerCase();
      if (taskSubject && resSub === taskSubject) return true;
      if (taskCode && resSub.startsWith(taskCode)) return true;
      return false;
    });
  }

  /**
   * Open Read-Only Assignment Details Modal
   */
  function openDetailsModal(task) {
    if (!task) return;
    const state = StudentHubStorage.getState();
    const studentNo = state.profile.studentNumber || "2025-BSIT-0202";
    const meta = resolveTaskSubjectInfo(task, state);
    const studentSub = task.submissions && task.submissions[studentNo];
    const dateAssigned = task.dateAssigned || task.createdAt || "";
    const relatedResources = getRelatedResources(task, state);
    const deadlineInfo = getDeadlineIndicator(task);

    const resourcesHtml =
      relatedResources.length > 0
        ? `
          <div style="margin-bottom:6px;font-size:0.82rem;font-weight:700;color:var(--text-main);">
            Related Subject Resources (${relatedResources.length})
          </div>
          <div class="task-detail-resources">
            ${relatedResources
              .map((res) => {
                const safeUrl = isValidUrl && isValidUrl(res.url) ? res.url : "";
                return `
                  <div class="task-detail-resource-item">
                    <div style="min-width:0;">
                      <div style="font-weight:600;color:var(--text-main);">${escapeHtml(res.title)}</div>
                      <div style="font-size:0.76rem;color:var(--text-muted);">${escapeHtml(
                        res.category || "Learning Resource"
                      )}</div>
                    </div>
                    ${
                      safeUrl
                        ? `<a href="${escapeHtml(
                            safeUrl
                          )}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary">Open Resource</a>`
                        : ""
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        `
        : "";

    const modalHtml = `
      <div class="task-detail-header">
        <div class="task-subject-cluster">
          <span class="badge badge-primary">${escapeHtml(meta.subjectCode)}</span>
          <span class="badge ${getPriorityBadge(task.priority)}">${escapeHtml(
      task.priority || "Medium"
    )} Priority</span>
        </div>
        <span class="badge ${getStatusBadge(task.status)}">${escapeHtml(task.status)}</span>
      </div>

      <h3 style="font-size:1.08rem;margin-bottom:12px;">${escapeHtml(task.title)}</h3>

      <div class="task-detail-meta-grid">
        <div>
          <span class="task-detail-meta-label">Subject</span>
          <span>${escapeHtml(meta.subjectName)}</span>
        </div>
        <div>
          <span class="task-detail-meta-label">Instructor</span>
          <span>${escapeHtml(meta.instructor)}</span>
        </div>
        <div>
          <span class="task-detail-meta-label">Due Date</span>
          <span>${escapeHtml(formatReadableDate(task.deadline))} <strong class="task-deadline-urgency ${
      deadlineInfo.className
    }">(${escapeHtml(deadlineInfo.label)})</strong></span>
        </div>
        ${
          dateAssigned
            ? `
            <div>
              <span class="task-detail-meta-label">Date Assigned</span>
              <span>${escapeHtml(formatReadableDate(dateAssigned))}</span>
            </div>
          `
            : `
            <div>
              <span class="task-detail-meta-label">Published By</span>
              <span>${escapeHtml(task.publishedBy || meta.instructor)}</span>
            </div>
          `
        }
      </div>

      <div class="task-detail-instructions">
        <span class="task-detail-meta-label">Faculty Instructions</span>
        <div>${escapeHtml(
          task.description || "Follow course guidelines and submit before deadline."
        )}</div>
      </div>

      ${
        studentSub && studentSub.responseText
          ? `
          <div class="task-submission-preview" style="margin-bottom:14px;">
            <div class="task-submission-preview-title">
              Your Submission (${escapeHtml(studentSub.status)} &bull; ${escapeHtml(
              formatReadableDate(studentSub.submittedAt)
            )})
            </div>
            <div class="task-submission-preview-body">${escapeHtml(studentSub.responseText)}</div>
          </div>
        `
          : ""
      }

      ${resourcesHtml}

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="closeTaskDetailsBtn">Close</button>
        <button type="button" class="btn btn-primary" id="openSubmitFromDetailsBtn">
          ${
            task.status === "Submitted" || task.status === "Completed"
              ? "Update Submission"
              : "Submit Assignment"
          }
        </button>
      </div>
    `;

    openModal(`Assignment Details — ${task.title}`, modalHtml, (bodyEl) => {
      const closeBtn = bodyEl.querySelector("#closeTaskDetailsBtn");
      if (closeBtn) closeBtn.addEventListener("click", closeModal);

      const submitBtn = bodyEl.querySelector("#openSubmitFromDetailsBtn");
      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          closeModal();
          openSubmissionModal(task);
        });
      }
    });
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
    const meta = resolveTaskSubjectInfo(task, state);
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
          <span><strong>Instructor:</strong> ${escapeHtml(meta.instructor)}</span>
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

  function updateClearFiltersVisibility() {
    const clearBtn = document.getElementById("taskClearFiltersBtn");
    if (!clearBtn) return;
    const hasFilter =
      searchQuery.trim() !== "" ||
      filterStatus !== "All" ||
      filterSubject !== "All" ||
      sortBy !== "deadline_asc";
    clearBtn.hidden = !hasFilter;
  }

  function bindStaticEvents() {
    if (eventsBound) return;
    eventsBound = true;

    const searchInput = document.getElementById("taskSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
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

    const clearBtn = document.getElementById("taskClearFiltersBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        searchQuery = "";
        filterStatus = "All";
        filterSubject = "All";
        sortBy = "deadline_asc";
        if (searchInput) searchInput.value = "";
        if (statusSel) statusSel.value = "All";
        if (subSel) subSel.value = "All";
        if (sortSel) sortSel.value = "deadline_asc";
        render();
      });
    }

    document.querySelectorAll("[data-status-tab]").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        filterStatus = tabBtn.getAttribute("data-status-tab") || "All";
        render();
      });
    });

    document.querySelectorAll("[data-task-status-filter]").forEach((cardEl) => {
      const activate = () => {
        filterStatus = cardEl.getAttribute("data-task-status-filter") || "All";
        render();
      };
      cardEl.addEventListener("click", activate);
      cardEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });
  }

  function render() {
    const container = document.getElementById("tasksContainer");
    const listHost = document.getElementById("tasksListHost");
    if (!container || !listHost) return;

    bindStaticEvents();

    const state = StudentHubStorage.getState();
    const tasks = state.tasks || [];
    const profile = state.profile || {};
    const studentNo = profile.studentNumber || "2025-BSIT-0202";
    const sectionName = profile.section || "BSIT 2-2";
    const term = parseAcademicTerm(profile.academicYearTerm);

    const pendingCount = tasks.filter((t) => t.status === "Pending").length;
    const submittedCount = tasks.filter((t) => t.status === "Submitted").length;
    const completedCount = tasks.filter((t) => t.status === "Completed").length;
    const overdueCount = tasks.filter((t) => t.status === "Overdue").length;

    // 1. Hydrate Overview Pills & Account Badge
    const sectionPill = document.getElementById("tasksSectionPill");
    if (sectionPill) sectionPill.textContent = `Section: ${sectionName}`;

    const ayPill = document.getElementById("tasksAcademicYearPill");
    if (ayPill) ayPill.textContent = `Academic Year: ${term.academicYear}`;

    const semPill = document.getElementById("tasksSemesterPill");
    if (semPill) semPill.textContent = `Semester: ${term.semester}`;

    const totalPill = document.getElementById("tasksOverviewTotalPill");
    if (totalPill) totalPill.textContent = `Total: ${tasks.length}`;

    const pendingPill = document.getElementById("tasksOverviewPendingPill");
    if (pendingPill) pendingPill.textContent = `Pending: ${pendingCount}`;

    const completedPill = document.getElementById("tasksOverviewCompletedPill");
    if (completedPill) completedPill.textContent = `Completed: ${completedCount}`;

    const overduePill = document.getElementById("tasksOverviewOverduePill");
    if (overduePill) overduePill.textContent = `Overdue: ${overdueCount}`;

    const accountBadge = document.getElementById("tasksAccountBadge");
    if (accountBadge) accountBadge.textContent = `Student Account: ${studentNo}`;

    // 2. Hydrate Summary Cards
    const setElText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    setElText("taskStatAll", tasks.length);
    setElText("taskStatPending", pendingCount);
    setElText("taskStatSubmitted", submittedCount);
    setElText("taskStatSubmittedSub", `Turned in by ${studentNo}`);
    setElText("taskStatCompleted", completedCount);
    setElText("taskStatOverdue", overdueCount);
    setElText(
      "taskStatOverdueSub",
      overdueCount > 0 ? "Deadline passed without submission" : "No overdue assignments"
    );

    // Active state on Summary Cards & Tabs
    document.querySelectorAll("[data-task-status-filter]").forEach((cardEl) => {
      const target = cardEl.getAttribute("data-task-status-filter");
      cardEl.classList.toggle("is-active-filter", target === filterStatus);
    });

    setElText("tabCountAll", tasks.length);
    setElText("tabCountPending", pendingCount);
    setElText("tabCountSubmitted", submittedCount);
    setElText("tabCountCompleted", completedCount);
    setElText("tabCountOverdue", overdueCount);

    document.querySelectorAll("[data-status-tab]").forEach((tabBtn) => {
      const target = tabBtn.getAttribute("data-status-tab");
      const active = target === filterStatus;
      tabBtn.classList.toggle("is-active", active);
      tabBtn.setAttribute("aria-selected", active ? "true" : "false");
    });

    // 3. Populate Filter Dropdowns
    const subjectOptions = Array.from(
      new Set([...StudentHubStorage.getSubjectList(), ...tasks.map((t) => t.subject).filter(Boolean)])
    );
    const subSel = document.getElementById("taskFilterSubject");
    if (subSel) {
      subSel.innerHTML = [
        `<option value="All">All Subjects</option>`,
        ...subjectOptions.map(
          (s) =>
            `<option value="${escapeHtml(s)}" ${
              filterSubject === s ? "selected" : ""
            }>${escapeHtml(s)}</option>`
        )
      ].join("");
    }

    const statusSel = document.getElementById("taskFilterStatus");
    if (statusSel) {
      statusSel.innerHTML = `
        <option value="All" ${filterStatus === "All" ? "selected" : ""}>All Statuses (${tasks.length})</option>
        <option value="Pending" ${filterStatus === "Pending" ? "selected" : ""}>Pending (${pendingCount})</option>
        <option value="Submitted" ${filterStatus === "Submitted" ? "selected" : ""}>Submitted (${submittedCount})</option>
        <option value="Completed" ${filterStatus === "Completed" ? "selected" : ""}>Completed (${completedCount})</option>
        <option value="Overdue" ${filterStatus === "Overdue" ? "selected" : ""}>Overdue (${overdueCount})</option>
      `;
    }

    const sortSel = document.getElementById("taskSortSelect");
    if (sortSel) sortSel.value = sortBy;

    updateClearFiltersVisibility();

    // 4. Filter & Sort Assignments
    const filtered = tasks
      .filter((t) => {
        const matchStatus = filterStatus === "All" || t.status === filterStatus;
        const matchSubject = filterSubject === "All" || t.subject === filterSubject;
        const q = searchQuery.trim().toLowerCase();
        const meta = resolveTaskSubjectInfo(t, state);
        const matchQuery =
          !q ||
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          meta.subjectCode.toLowerCase().includes(q) ||
          meta.instructor.toLowerCase().includes(q) ||
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

    // 5. Render Assignment Cards
    if (filtered.length === 0) {
      listHost.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <h3>No Matching Assignments Found</h3>
            <p>No faculty-published assignments match your current filter criteria.</p>
          </div>
        </div>
      `;
      return;
    }

    listHost.innerHTML = `
      <div class="tasks-grid">
        ${filtered
          .map((t) => {
            const isDone = t.status === "Completed";
            const isSubmitted = t.status === "Submitted";
            const isOverdue = t.status === "Overdue";
            const statusClass = isDone
              ? "is-completed"
              : isOverdue
              ? "is-overdue"
              : isSubmitted
              ? "is-submitted"
              : "is-pending";
            const studentSub = t.submissions && t.submissions[studentNo];
            const meta = resolveTaskSubjectInfo(t, state);
            const deadlineInfo = getDeadlineIndicator(t);
            const dateAssigned = t.dateAssigned || t.createdAt || "";

            return `
              <article class="task-card ${statusClass}" data-task-id="${escapeHtml(t.id)}">
                <div>
                  <div class="task-card-header-badges">
                    <div class="task-subject-cluster">
                      <span class="badge badge-primary task-subject-code-pill">${escapeHtml(
                        meta.subjectCode
                      )}</span>
                      <span class="task-subject-name-text">${escapeHtml(meta.subjectName)}</span>
                    </div>
                    <span class="badge ${getStatusBadge(t.status)}">${escapeHtml(t.status)}</span>
                  </div>

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
                        <div class="task-instructor-line">
                          <strong>Instructor:</strong> ${escapeHtml(meta.instructor)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p class="task-desc">
                    <strong>Instructions:</strong> ${escapeHtml(
                      t.description || "Follow course guidelines and submit before deadline."
                    )}
                  </p>

                  <div class="task-meta-grid">
                    ${
                      dateAssigned
                        ? `
                        <div class="task-meta-item">
                          <strong>Assigned:</strong>
                          <span>${escapeHtml(formatReadableDate(dateAssigned))}</span>
                        </div>
                      `
                        : ""
                    }
                    <div class="task-meta-item">
                      <strong>Due:</strong>
                      <span>${escapeHtml(formatReadableDate(t.deadline))}</span>
                      <span class="task-deadline-urgency ${deadlineInfo.className}">(${escapeHtml(
              deadlineInfo.label
            )})</span>
                    </div>
                    <div class="task-meta-item">
                      <span class="badge ${getPriorityBadge(t.priority)}">${escapeHtml(
              t.priority || "Medium"
            )} Priority</span>
                    </div>
                  </div>

                  ${
                    studentSub && studentSub.responseText
                      ? `
                      <div class="task-submission-preview">
                        <div class="task-submission-preview-title">
                          Your Submission (${escapeHtml(studentSub.status)} &bull; ${escapeHtml(
                          formatReadableDate(studentSub.submittedAt)
                        )}):
                        </div>
                        <div class="task-submission-preview-body">${escapeHtml(
                          studentSub.responseText
                        )}</div>
                      </div>
                    `
                      : ""
                  }
                </div>

                <div class="task-footer">
                  <button
                    type="button"
                    class="btn btn-sm btn-secondary view-task-details-btn"
                    data-id="${escapeHtml(t.id)}"
                  >
                    View Details
                  </button>
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
              </article>
            `;
          })
          .join("")}
      </div>
    `;

    // 6. Bind Card Action Handlers
    listHost.querySelectorAll(".toggle-task-done").forEach((chk) => {
      chk.addEventListener("change", () => {
        const id = chk.getAttribute("data-id");
        markTaskStatus(id, chk.checked ? "Completed" : "Pending");
      });
    });

    listHost.querySelectorAll(".view-task-details-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const task = state.tasks.find((t) => t.id === id);
        if (task) openDetailsModal(task);
      });
    });

    listHost.querySelectorAll(".submit-task-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const task = state.tasks.find((t) => t.id === id);
        if (task) openSubmissionModal(task);
      });
    });

    listHost.querySelectorAll(".mark-complete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        markTaskStatus(id, "Completed");
      });
    });

    listHost.querySelectorAll(".mark-pending-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        markTaskStatus(id, "Pending");
      });
    });
  }

  return { render, openDetailsModal, openSubmissionModal, markTaskStatus };
})();

window.StudentHubTasks = StudentHubTasks;
