/**
 * ============================================================================
 * StudentHub - Module 8: Learning Resources (resources.js)
 * Organizes study materials by Subject and Category, validates resource URLs,
 * supports search & filtering, and provides full CRUD management.
 * ============================================================================
 */

const StudentHubResources = (function () {
  const {
    escapeHtml,
    isValidUrl,
    clearFormErrors,
    setFieldError,
    openModal,
    closeModal,
    confirmDialog,
    showToast,
    refreshAll,
    getActiveRole,
    requireRole
  } = window.StudentHubApp;

  const CATEGORIES = [
    "Lecture Notes",
    "Study Materials",
    "Tutorials",
    "Reference Links",
    "Other Resources"
  ];

  let searchQuery = "";
  let filterCategory = "All";
  let filterSubject = "All";

  function getCategoryBadge(cat) {
    if (cat === "Lecture Notes") return "badge-primary";
    if (cat === "Study Materials") return "badge-success";
    if (cat === "Tutorials") return "badge-info";
    if (cat === "Reference Links") return "badge-warning";
    return "badge-neutral";
  }

  /**
   * Open Add or Edit Learning Resource Modal (Faculty Only)
   */
  function openResourceModal(existing = null) {
    if (!requireRole("faculty", "Only faculty members can add or edit learning resources.")) return;
    const isEdit = Boolean(existing);
    const subjectOptions = StudentHubStorage.getSubjectList();

    const item = existing || {
      title: "",
      subject: subjectOptions[0] || "T148 - IT 211 - Data Structures and Algorithms",
      category: "Reference Links",
      url: "https://",
      description: ""
    };

    if (item.subject && !subjectOptions.includes(item.subject)) {
      subjectOptions.unshift(item.subject);
    }

    const modalHtml = `
      <form id="resourceForm" novalidate>
        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label" for="resTitle">Resource Title <span class="req">*</span></label>
            <input
              type="text"
              id="resTitle"
              name="title"
              class="form-control"
              placeholder="e.g. MDN CSS Grid Layout Guide"
              value="${escapeHtml(item.title)}"
            />
            <div class="field-error" data-error-for="title"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="resSubject">Associated Subject <span class="req">*</span></label>
            <select id="resSubject" name="subject" class="form-control">
              ${subjectOptions
                .map(
                  (s) =>
                    `<option value="${escapeHtml(s)}" ${
                      item.subject === s ? "selected" : ""
                    }>${escapeHtml(s)}</option>`
                )
                .join("")}
            </select>
            <div class="field-error" data-error-for="subject"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="resCategory">Resource Category <span class="req">*</span></label>
            <select id="resCategory" name="category" class="form-control">
              ${CATEGORIES.map(
                (c) => `<option value="${c}" ${item.category === c ? "selected" : ""}>${c}</option>`
              ).join("")}
            </select>
            <div class="field-error" data-error-for="category"></div>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="resUrl">Resource URL (http:// or https://) <span class="req">*</span></label>
            <input
              type="url"
              id="resUrl"
              name="url"
              class="form-control"
              placeholder="https://developer.mozilla.org/"
              value="${escapeHtml(item.url)}"
            />
            <div class="field-error" data-error-for="url"></div>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="resDesc">Description / Summary <span class="req">*</span></label>
            <textarea
              id="resDesc"
              name="description"
              rows="3"
              class="form-control"
              placeholder="Briefly describe what this learning resource covers..."
            >${escapeHtml(item.description)}</textarea>
            <div class="field-error" data-error-for="description"></div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="cancelResModalBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${
            isEdit ? "Update Resource" : "Add Learning Resource"
          }</button>
        </div>
      </form>
    `;

    openModal(isEdit ? "Edit Learning Resource" : "Add Learning Resource", modalHtml, (bodyEl) => {
      bodyEl.querySelector("#cancelResModalBtn").addEventListener("click", closeModal);
      const form = bodyEl.querySelector("#resourceForm");

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        clearFormErrors(form);

        const fd = new FormData(form);
        const title = String(fd.get("title") || "").trim();
        const subject = String(fd.get("subject") || "").trim();
        const category = String(fd.get("category") || "").trim();
        const url = String(fd.get("url") || "").trim();
        const description = String(fd.get("description") || "").trim();

        let valid = true;
        if (!title) {
          setFieldError(form, "title", "Resource title is required.");
          valid = false;
        }
        if (!subject) {
          setFieldError(form, "subject", "Please select a subject.");
          valid = false;
        }
        if (!CATEGORIES.includes(category)) {
          setFieldError(form, "category", "Please select a valid resource category.");
          valid = false;
        }
        if (!url || !isValidUrl(url)) {
          setFieldError(
            form,
            "url",
            "Please enter a valid URL starting with http:// or https:// (e.g., https://example.edu)."
          );
          valid = false;
        }
        if (!description) {
          setFieldError(form, "description", "Please provide a brief description.");
          valid = false;
        }

        if (!valid) {
          showToast("Please fix the validation errors before saving.", "error");
          return;
        }

        const state = StudentHubStorage.getState();
        if (isEdit) {
          state.resources = state.resources.map((r) =>
            r.id === existing.id ? { ...r, title, subject, category, url, description } : r
          );
          showToast(`Updated resource "${title}".`, "success");
        } else {
          state.resources.unshift({
            id: StudentHubStorage.uid("res"),
            title,
            subject,
            category,
            url,
            description
          });
          showToast(`Added learning resource "${title}".`, "success");
        }

        StudentHubStorage.saveState(state);
        closeModal();
        refreshAll();
      });
    });
  }

  function render() {
    const container = document.getElementById("resourcesContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const resources = state.resources || [];
    const isFaculty = getActiveRole() === "faculty";

    const allSubjects = Array.from(
      new Set([...StudentHubStorage.getSubjectList(), ...resources.map((r) => r.subject)])
    );

    const filtered = resources.filter((r) => {
      const matchCat = filterCategory === "All" || r.category === filterCategory;
      const matchSub = filterSubject === "All" || r.subject === filterSubject;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q));
      return matchCat && matchSub && matchQuery;
    });

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Learning Resources (BSIT 2-2)</h2>
          <p>Access open-access lecture notes, tutorials, documentation links, and reference materials organized by BSIT 2-2 subject.</p>
        </div>
        ${
          isFaculty
            ? `<div class="section-header-actions">
                <button type="button" class="btn btn-primary" id="addResourceBtn">
                  + Add Resource Link
                </button>
              </div>`
            : `<div class="section-header-actions">
                <span class="badge badge-info" style="font-size:0.82rem;padding:8px 14px;">Student View &mdash; Curated Course Materials</span>
              </div>`
        }
      </div>

      <div class="notice-banner">
        <div>
          <strong>Open Educational Resources Policy:</strong> All sample links point to publicly accessible, copyright-safe educational documentation (MDN, W3C, MIT OpenCourseWare, etc.). ${
            isFaculty
              ? "As a faculty member, you can add or update validated study URLs below."
              : "Browse, search, and open resources published for your BSIT 2-2 subjects."
          }
        </div>
      </div>

      <!-- Search & Filter Toolbar -->
      <div class="toolbar-row">
        <div class="toolbar-group">
          <input
            type="search"
            id="resSearchInput"
            class="form-control"
            style="max-width:280px;"
            placeholder="Search resource title, topic, or subject..."
            value="${escapeHtml(searchQuery)}"
          />

          <select id="resFilterCategory" class="form-control" style="max-width:210px;" aria-label="Filter by Category">
            <option value="All" ${filterCategory === "All" ? "selected" : ""}>All Categories (${
      resources.length
    })</option>
            ${CATEGORIES.map(
              (c) =>
                `<option value="${c}" ${filterCategory === c ? "selected" : ""}>${c}</option>`
            ).join("")}
          </select>

          <select id="resFilterSubject" class="form-control" style="max-width:260px;" aria-label="Filter by Subject">
            <option value="All" ${filterSubject === "All" ? "selected" : ""}>All Subjects</option>
            ${allSubjects
              .map(
                (s) =>
                  `<option value="${escapeHtml(s)}" ${
                    filterSubject === s ? "selected" : ""
                  }>${escapeHtml(s)}</option>`
              )
              .join("")}
          </select>
        </div>
      </div>

      <!-- Resources Grid -->
      ${
        filtered.length === 0
          ? `
          <div class="card">
            <div class="empty-state">
              <h3>No Learning Resources Found</h3>
              <p>No resources match your current filters.</p>
              ${
                isFaculty
                  ? `<button type="button" class="btn btn-primary" id="emptyAddResBtn">+ Add Learning Resource</button>`
                  : ""
              }
            </div>
          </div>
        `
          : `
          <div class="resources-grid">
            ${filtered
              .map(
                (r) => `
              <div class="resource-card">
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
                    <span class="badge ${getCategoryBadge(r.category)}">${escapeHtml(
                  r.category
                )}</span>
                    <span style="font-size:0.76rem;color:var(--royal-600);font-weight:600;">${escapeHtml(
                      r.subject.split(" - ")[0]
                    )}</span>
                  </div>
                  <h3 style="font-size:1rem;margin-bottom:4px;">${escapeHtml(r.title)}</h3>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px;">${escapeHtml(
                    r.subject
                  )}</div>
                  <p style="font-size:0.85rem;color:var(--text-secondary);">${escapeHtml(
                    r.description
                  )}</p>
                </div>

                <div class="task-footer">
                  <a
                    href="${escapeHtml(r.url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-sm btn-primary"
                  >
                    Open Resource &nearr;
                  </a>
                  ${
                    isFaculty
                      ? `<div class="table-actions">
                          <button type="button" class="btn btn-sm btn-secondary edit-res-btn" data-id="${escapeHtml(
                            r.id
                          )}">Edit</button>
                          <button type="button" class="btn btn-sm btn-outline-danger delete-res-btn" data-id="${escapeHtml(
                            r.id
                          )}">Delete</button>
                        </div>`
                      : `<span class="badge badge-neutral">Verified Link</span>`
                  }
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
      }
    `;

    // Bind Add Buttons
    const addBtn = document.getElementById("addResourceBtn");
    if (addBtn) addBtn.addEventListener("click", () => openResourceModal(null));

    const emptyAddBtn = document.getElementById("emptyAddResBtn");
    if (emptyAddBtn) emptyAddBtn.addEventListener("click", () => openResourceModal(null));

    // Bind Search & Filters
    const searchInput = document.getElementById("resSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
        const el = document.getElementById("resSearchInput");
        if (el) {
          el.focus();
          el.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    const catSel = document.getElementById("resFilterCategory");
    if (catSel) {
      catSel.addEventListener("change", (e) => {
        filterCategory = e.target.value;
        render();
      });
    }

    const subSel = document.getElementById("resFilterSubject");
    if (subSel) {
      subSel.addEventListener("change", (e) => {
        filterSubject = e.target.value;
        render();
      });
    }

    // Bind Edit & Delete
    container.querySelectorAll(".edit-res-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const res = state.resources.find((r) => r.id === id);
        if (res) openResourceModal(res);
      });
    });

    container.querySelectorAll(".delete-res-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!requireRole("faculty", "Only faculty members can delete learning resources.")) return;
        const id = btn.getAttribute("data-id");
        const res = state.resources.find((r) => r.id === id);
        if (!res) return;

        const confirmed = await confirmDialog({
          title: "Delete Learning Resource",
          message: `Remove "${res.title}" from your learning resources?`,
          confirmText: "Delete Resource",
          danger: true
        });

        if (confirmed) {
          const currState = StudentHubStorage.getState();
          currState.resources = currState.resources.filter((r) => r.id !== id);
          StudentHubStorage.saveState(currState);
          refreshAll();
          showToast(`Deleted resource "${res.title}".`, "info");
        }
      });
    });
  }

  return { render };
})();

window.StudentHubResources = StudentHubResources;

