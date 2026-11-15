// Learning resource downloads and category filtering.
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 8: Learning Resources (resources.js)
 * Organizes study materials by Subject and Category, validates resource URLs,
 * supports search & filtering, and preserves faculty-only CRUD management.
 * ============================================================================
 */

const StudentHubResources = (function () {
  const {
    escapeHtml,
    formatReadableDate,
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
  let eventsBound = false;

  function getCategoryBadge(cat) {
    if (cat === "Lecture Notes") return "badge-primary";
    if (cat === "Study Materials") return "badge-success";
    if (cat === "Tutorials") return "badge-info";
    if (cat === "Reference Links") return "badge-warning";
    return "badge-neutral";
  }

  function getResourceTypeMeta(resource) {
    const cat = (resource && resource.category) || "";
    if (cat === "Lecture Notes") {
      return {
        className: "type-notes",
        label: resource.fileType || "Lecture Notes",
        svg: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
      };
    }
    if (cat === "Study Materials") {
      return {
        className: "type-study",
        label: resource.fileType || "Study Guide",
        svg: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
      };
    }
    if (cat === "Tutorials") {
      return {
        className: "type-tutorial",
        label: resource.fileType || "Interactive Tutorial",
        svg: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`
      };
    }
    if (cat === "Reference Links") {
      return {
        className: "type-link",
        label: resource.fileType || "Web Reference",
        svg: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
      };
    }
    return {
      className: "type-other",
      label: resource.fileType || "Resource",
      svg: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
    };
  }

  /**
   * Open Resource Details Modal
   */
  function openResourceDetailsModal(resource) {
    if (!resource) return;
    const safeUrl = isValidUrl && isValidUrl(resource.url) ? resource.url : "";
    const subjectCode = String(resource.subject || "").split(" - ")[0] || "SUBJ";

    const optionalMeta = [];
    if (resource.fileType) {
      optionalMeta.push(`<span><strong>Type:</strong> ${escapeHtml(resource.fileType)}</span>`);
    }
    if (resource.uploadDate) {
      const dateText = formatReadableDate
        ? formatReadableDate(resource.uploadDate)
        : resource.uploadDate;
      optionalMeta.push(`<span><strong>Added:</strong> ${escapeHtml(dateText)}</span>`);
    }
    if (resource.fileSize) {
      optionalMeta.push(`<span><strong>Size:</strong> ${escapeHtml(resource.fileSize)}</span>`);
    }
    if (resource.uploadedBy) {
      optionalMeta.push(`<span><strong>Uploaded By:</strong> ${escapeHtml(resource.uploadedBy)}</span>`);
    }

    const html = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span class="badge ${getCategoryBadge(resource.category)}">${escapeHtml(
      resource.category
    )}</span>
          <span class="badge badge-primary">${escapeHtml(subjectCode)}</span>
        </div>

        <div style="padding:12px 14px;background:var(--bg-surface-alt);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.84rem;">
          <div style="color:var(--text-muted);font-size:0.74rem;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Associated Subject</div>
          <div style="font-weight:600;color:var(--text-main);">${escapeHtml(resource.subject)}</div>
          ${
            optionalMeta.length > 0
              ? `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;color:var(--text-muted);font-size:0.78rem;">${optionalMeta.join(
                  ""
                )}</div>`
              : ""
          }
        </div>

        <div style="padding:14px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.9rem;color:var(--text-secondary);line-height:1.6;">
          ${escapeHtml(resource.description)}
        </div>

        ${
          safeUrl
            ? `<div style="font-size:0.8rem;color:var(--text-muted);word-break:break-all;"><strong>Verified URL:</strong> ${escapeHtml(
                safeUrl
              )}</div>`
            : ""
        }

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="closeResDetailBtn">Close</button>
          ${
            safeUrl
              ? `<a href="${escapeHtml(
                  safeUrl
                )}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Open Resource &nearr;</a>`
              : ""
          }
        </div>
      </div>
    `;

    openModal(resource.title, html, (bodyEl) => {
      const closeBtn = bodyEl.querySelector("#closeResDetailBtn");
      if (closeBtn) closeBtn.addEventListener("click", closeModal);
    });
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

  function updateClearFiltersVisibility() {
    const clearBtn = document.getElementById("resClearFiltersBtn");
    if (!clearBtn) return;
    const hasFilter =
      searchQuery.trim() !== "" || filterCategory !== "All" || filterSubject !== "All";
    clearBtn.hidden = !hasFilter;
  }

  function bindStaticEvents() {
    if (eventsBound) return;
    eventsBound = true;

    const addBtn = document.getElementById("addResourceBtn");
    if (addBtn) {
      addBtn.addEventListener("click", () => openResourceModal(null));
    }

    const searchInput = document.getElementById("resSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
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

    const clearBtn = document.getElementById("resClearFiltersBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        searchQuery = "";
        filterCategory = "All";
        filterSubject = "All";
        if (searchInput) searchInput.value = "";
        if (catSel) catSel.value = "All";
        if (subSel) subSel.value = "All";
        render();
      });
    }
  }

  function render() {
    const container = document.getElementById("resourcesContainer");
    const listHost = document.getElementById("resourcesListHost");
    if (!container || !listHost) return;

    bindStaticEvents();

    const state = StudentHubStorage.getState();
    const resources = state.resources || [];
    const isFaculty = getActiveRole() === "faculty";

    const activeCategoriesCount = new Set(
      resources.map((r) => r.category).filter((c) => CATEGORIES.includes(c))
    ).size;
    const connectedSubjectsCount = new Set(
      resources.map((r) => r.subject).filter(Boolean)
    ).size;

    // 1. Hydrate Header Role State, Overview Pills & Summary Cards
    const addBtn = document.getElementById("addResourceBtn");
    const studentBadge = document.getElementById("resStudentViewBadge");
    if (addBtn) addBtn.hidden = !isFaculty;
    if (studentBadge) studentBadge.hidden = isFaculty;

    const policyEl = document.getElementById("resPolicyBannerText");
    if (policyEl) {
      policyEl.innerHTML = `<strong>Open Educational Resources Policy:</strong> All sample links point to publicly accessible, copyright-safe educational documentation (MDN, W3C, MIT OpenCourseWare, etc.). ${
        isFaculty
          ? "As a faculty member, you can add or update validated study URLs below."
          : "Browse, search, and open resources published for your subjects."
      }`;
    }

    const setElText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    setElText("resOverviewTotalPill", `Resources: ${resources.length}`);
    setElText("resOverviewCatPill", `Categories: ${activeCategoriesCount}`);
    setElText("resOverviewSubPill", `Subjects: ${connectedSubjectsCount}`);
    setElText("resStatTotal", resources.length);
    setElText("resStatCategories", activeCategoriesCount);
    setElText("resStatSubjects", connectedSubjectsCount);

    // 2. Hydrate Category Tabs from supported CATEGORIES
    const tabsHost = document.getElementById("resCategoryTabs");
    if (tabsHost) {
      const countByCat = (cat) => resources.filter((r) => r.category === cat).length;
      const tabItems = [
        { key: "All", label: "All Categories", count: resources.length },
        ...CATEGORIES.map((c) => ({ key: c, label: c, count: countByCat(c) }))
      ];

      tabsHost.innerHTML = tabItems
        .map(
          (item) => `
          <button
            type="button"
            class="res-tab-btn ${filterCategory === item.key ? "is-active" : ""}"
            data-res-cat-tab="${escapeHtml(item.key)}"
            role="tab"
            aria-selected="${filterCategory === item.key ? "true" : "false"}"
          >
            ${escapeHtml(item.label)} <span class="res-tab-count">${item.count}</span>
          </button>
        `
        )
        .join("");

      tabsHost.querySelectorAll("[data-res-cat-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          filterCategory = btn.getAttribute("data-res-cat-tab") || "All";
          render();
        });
      });
    }

    // 3. Populate Filter Dropdowns
    const allSubjects = Array.from(
      new Set([...StudentHubStorage.getSubjectList(), ...resources.map((r) => r.subject).filter(Boolean)])
    );

    const catSel = document.getElementById("resFilterCategory");
    if (catSel) {
      catSel.innerHTML = `
        <option value="All" ${filterCategory === "All" ? "selected" : ""}>All Categories (${
        resources.length
      })</option>
        ${CATEGORIES.map(
          (c) =>
            `<option value="${escapeHtml(c)}" ${
              filterCategory === c ? "selected" : ""
            }>${escapeHtml(c)}</option>`
        ).join("")}
      `;
    }

    const subSel = document.getElementById("resFilterSubject");
    if (subSel) {
      subSel.innerHTML = [
        `<option value="All">All Subjects</option>`,
        ...allSubjects.map(
          (s) =>
            `<option value="${escapeHtml(s)}" ${
              filterSubject === s ? "selected" : ""
            }>${escapeHtml(s)}</option>`
        )
      ].join("");
    }

    updateClearFiltersVisibility();

    // 4. Filter Resources
    const filtered = resources.filter((r) => {
      const matchCat = filterCategory === "All" || r.category === filterCategory;
      const matchSub = filterSubject === "All" || r.subject === filterSubject;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.subject && r.subject.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q));
      return matchCat && matchSub && matchQuery;
    });

    // 5. Render Resource Cards
    if (filtered.length === 0) {
      listHost.innerHTML = `
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
      `;
      const emptyAddBtn = document.getElementById("emptyAddResBtn");
      if (emptyAddBtn) emptyAddBtn.addEventListener("click", () => openResourceModal(null));
      return;
    }

    listHost.innerHTML = `
      <div class="resources-grid">
        ${filtered
          .map((r) => {
            const typeMeta = getResourceTypeMeta(r);
            const subjectCode = String(r.subject || "").split(" - ")[0] || "SUBJ";
            const safeUrl = isValidUrl && isValidUrl(r.url) ? r.url : "";

            const optionalMetaItems = [];
            if (r.fileType) optionalMetaItems.push(`<span><strong>Type:</strong> ${escapeHtml(r.fileType)}</span>`);
            if (r.uploadDate) {
              const dt = formatReadableDate ? formatReadableDate(r.uploadDate) : r.uploadDate;
              optionalMetaItems.push(`<span><strong>Added:</strong> ${escapeHtml(dt)}</span>`);
            }
            if (r.fileSize) optionalMetaItems.push(`<span><strong>Size:</strong> ${escapeHtml(r.fileSize)}</span>`);
            if (r.uploadedBy) optionalMetaItems.push(`<span><strong>By:</strong> ${escapeHtml(r.uploadedBy)}</span>`);

            return `
              <article class="resource-card" data-resource-id="${escapeHtml(r.id)}">
                <div>
                  <div class="resource-card-top">
                    <div class="resource-card-type-wrap">
                      <span class="resource-type-icon ${typeMeta.className}" aria-hidden="true">${
              typeMeta.svg
            }</span>
                      <span class="badge ${getCategoryBadge(r.category)}">${escapeHtml(
              r.category
            )}</span>
                    </div>
                    <span class="resource-subject-pill">${escapeHtml(subjectCode)}</span>
                  </div>

                  <h3 class="resource-title">${escapeHtml(r.title)}</h3>
                  <div class="resource-subject-name">${escapeHtml(r.subject)}</div>
                  <p class="resource-desc">${escapeHtml(r.description)}</p>

                  ${
                    optionalMetaItems.length > 0
                      ? `<div class="resource-meta-row">${optionalMetaItems.join("")}</div>`
                      : ""
                  }
                </div>

                <div class="resource-footer">
                  <div class="table-actions">
                    ${
                      safeUrl
                        ? `<a
                            href="${escapeHtml(safeUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-sm btn-primary"
                          >
                            Open Resource &nearr;
                          </a>`
                        : ""
                    }
                    <button
                      type="button"
                      class="btn btn-sm btn-secondary view-res-details-btn"
                      data-id="${escapeHtml(r.id)}"
                    >
                      Details
                    </button>
                  </div>
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
              </article>
            `;
          })
          .join("")}
      </div>
    `;

    // 6. Bind Card Action Handlers
    listHost.querySelectorAll(".view-res-details-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const res = state.resources.find((r) => r.id === id);
        if (res) openResourceDetailsModal(res);
      });
    });

    listHost.querySelectorAll(".edit-res-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const res = state.resources.find((r) => r.id === id);
        if (res) openResourceModal(res);
      });
    });

    listHost.querySelectorAll(".delete-res-btn").forEach((btn) => {
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

  return { render, openResourceDetailsModal };
})();

window.StudentHubResources = StudentHubResources;
