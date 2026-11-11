/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 7: Announcements (announcements.js) — READ-ONLY FOR STUDENTS
 *
 * Student Permissions Enforced:
 * - View published announcements
 * - Open complete announcement details modal
 * - Search & filter announcements by category and read status
 * - Mark announcements as read
 * - NO create, edit, delete, or publish buttons (Faculty-only in faculty.js)
 * ============================================================================
 */

const StudentHubAnnouncements = (function () {
  const {
    escapeHtml,
    formatReadableDate,
    openModal,
    closeModal,
    showToast,
    refreshAll
  } = window.StudentHubApp;

  const CATEGORIES = [
    "Academic",
    "Class Advisory",
    "Examination",
    "Events",
    "Campus Notice",
    "Scholarship",
    "Emergency"
  ];

  let searchQuery = "";
  let filterCategory = "All";
  let filterReadState = "All"; // "All" | "Unread" | "Read"

  function getCategoryBadge(cat) {
    if (cat === "Academic" || cat === "Class Advisory") return "badge-primary";
    if (cat === "Events" || cat === "Examination") return "badge-info";
    if (cat === "Scholarship") return "badge-success";
    if (cat === "Emergency") return "badge-danger";
    return "badge-neutral";
  }

  /**
   * Open read-only complete announcement details modal for students
   */
  function openAnnouncementDetails(annId) {
    const state = StudentHubStorage.getState();
    const ann = (state.announcements || []).find(
      (a) => a.id === annId && a.published !== false
    );
    if (!ann) return;

    // Automatically mark as read when opened
    if (!ann.read) {
      ann.read = true;
      StudentHubStorage.saveState(state);
      if (typeof StudentHubStorage.updateAnnouncementInDatabase === "function") {
        StudentHubStorage.updateAnnouncementInDatabase(ann.id, { read: true });
      }
      refreshAll();
    }

    const html = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="badge ${getCategoryBadge(ann.category)}">${escapeHtml(ann.category)}</span>
            <span class="badge badge-info">Audience: ${escapeHtml(
              ann.targetAudience || "All BSIT Students"
            )}</span>
            <span class="badge badge-success">Published Bulletin</span>
          </div>
          <span style="font-size:0.84rem;color:var(--text-muted);font-weight:500;">
            Published Date: <strong>${escapeHtml(formatReadableDate(ann.date))}</strong>
          </span>
        </div>

        <div style="padding:16px;background:var(--bg-surface-alt);border:1px solid var(--border-color);border-radius:var(--radius-sm);line-height:1.7;font-size:0.94rem;color:var(--text-main);white-space:pre-line;">${escapeHtml(
          ann.description
        )}</div>

        <div style="font-size:0.83rem;color:var(--text-secondary);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span><strong>Published By:</strong> ${escapeHtml(
            ann.author || "BANTUG UNIVERSITY Faculty"
          )}</span>
          <span><strong>Status:</strong> Marked as Read</span>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-primary" id="closeAnnDetailModalBtn">Close Bulletin</button>
        </div>
      </div>
    `;

    openModal(ann.title, html, (bodyEl) => {
      const closeBtn = bodyEl.querySelector("#closeAnnDetailModalBtn");
      if (closeBtn) closeBtn.addEventListener("click", closeModal);
    });
  }

  function render() {
    const container = document.getElementById("announcementsContainer");
    if (!container) return;

    const publishedAnnouncements = StudentHubStorage.getPublishedAnnouncements();
    const unreadCount = publishedAnnouncements.filter((a) => !a.read).length;

    const filtered = publishedAnnouncements
      .filter((a) => {
        const matchCat = filterCategory === "All" || a.category === filterCategory;
        const matchRead =
          filterReadState === "All" ||
          (filterReadState === "Unread" && !a.read) ||
          (filterReadState === "Read" && a.read);
        const q = searchQuery.trim().toLowerCase();
        const matchQuery =
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.author && a.author.toLowerCase().includes(q)) ||
          a.category.toLowerCase().includes(q);
        return matchCat && matchRead && matchQuery;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Announcements</h2>
          <p>Stay informed with published university advisories, BSIT 2-2 class reminders, and faculty bulletins.</p>
        </div>
        <div class="section-header-actions">
          ${
            unreadCount > 0
              ? `<button type="button" class="btn btn-secondary" id="markAllAnnouncementsReadBtn">Mark All as Read (${unreadCount})</button>`
              : `<span class="badge badge-success" style="padding:8px 14px;font-size:0.82rem;">All Bulletins Read</span>`
          }
        </div>
      </div>

      <div class="notice-banner">
        <div>
          <strong>Official Notice Board Policy:</strong> Only <strong>BANTUG UNIVERSITY Faculty</strong> can create, publish, edit, or delete announcements. Students can view published announcements, search/filter notices, open full details, and mark bulletins as read.
        </div>
      </div>

      <!-- Search & Filter Toolbar -->
      <div class="toolbar-row">
        <div class="toolbar-group">
          <input
            type="search"
            id="annSearchInput"
            class="form-control"
            style="max-width:300px;"
            placeholder="Search announcement title, author, or content..."
            value="${escapeHtml(searchQuery)}"
          />

          <select id="annFilterCategory" class="form-control" style="max-width:210px;" aria-label="Filter by Category">
            <option value="All" ${filterCategory === "All" ? "selected" : ""}>All Categories (${
      publishedAnnouncements.length
    })</option>
            ${CATEGORIES.map(
              (c) => `<option value="${c}" ${filterCategory === c ? "selected" : ""}>${c}</option>`
            ).join("")}
          </select>

          <select id="annFilterRead" class="form-control" style="max-width:190px;" aria-label="Filter by Read Status">
            <option value="All" ${filterReadState === "All" ? "selected" : ""}>All Published (${
      publishedAnnouncements.length
    })</option>
            <option value="Unread" ${
              filterReadState === "Unread" ? "selected" : ""
            }>Unread Only (${unreadCount})</option>
            <option value="Read" ${filterReadState === "Read" ? "selected" : ""}>Read Only</option>
          </select>
        </div>
      </div>

      <!-- Announcements List -->
      ${
        filtered.length === 0
          ? `
          <div class="card">
            <div class="empty-state">
              <h3>No Published Announcements Found</h3>
              <p>No published announcements match your current search or filter criteria.</p>
            </div>
          </div>
        `
          : `
          <div class="announcements-list">
            ${filtered
              .map(
                (a) => `
              <article class="announcement-card ${!a.read ? "is-unread" : ""}">
                <div class="announcement-header">
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                      <span class="badge ${getCategoryBadge(a.category)}">${escapeHtml(
                  a.category
                )}</span>
                      <span class="badge badge-info">Audience: ${escapeHtml(
                        a.targetAudience || "All BSIT Students"
                      )}</span>
                      ${
                        !a.read
                          ? `<span class="badge badge-warning">Unread</span>`
                          : `<span class="badge badge-success">Read</span>`
                      }
                    </div>
                    <h3 class="announcement-title" style="cursor:pointer;" data-open-ann="${escapeHtml(
                      a.id
                    )}">${escapeHtml(a.title)}</h3>
                  </div>
                  <div style="font-size:0.82rem;color:var(--text-muted);font-weight:500;">
                    Published: ${escapeHtml(formatReadableDate(a.date))}
                  </div>
                </div>

                <p class="announcement-body">${escapeHtml(a.description)}</p>

                <div class="announcement-footer">
                  <div>
                    <strong>Published by:</strong> ${escapeHtml(
                      a.author || "BANTUG UNIVERSITY Faculty"
                    )}
                  </div>
                  <div class="table-actions">
                    <button
                      type="button"
                      class="btn btn-sm btn-primary open-ann-detail-btn"
                      data-id="${escapeHtml(a.id)}"
                    >View Full Details</button>
                    <button
                      type="button"
                      class="btn btn-sm btn-secondary toggle-read-btn"
                      data-id="${escapeHtml(a.id)}"
                    >${a.read ? "Mark Unread" : "Mark as Read"}</button>
                  </div>
                </div>
              </article>
            `
              )
              .join("")}
          </div>
        `
      }
    `;

    // Bind Mark All Read Button
    const markAllBtn = document.getElementById("markAllAnnouncementsReadBtn");
    if (markAllBtn) {
      markAllBtn.addEventListener("click", async () => {
        if (typeof StudentHubStorage.markAllAnnouncementsReadInDatabase === "function") {
          await StudentHubStorage.markAllAnnouncementsReadInDatabase();
        } else {
          const currState = StudentHubStorage.getState();
          currState.announcements = currState.announcements.map((a) => ({ ...a, read: true }));
          StudentHubStorage.saveState(currState);
        }
        refreshAll();
        showToast("All published announcements marked as read.", "success");
      });
    }

    // Bind Search & Category Filters
    const searchInput = document.getElementById("annSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
        const el = document.getElementById("annSearchInput");
        if (el) {
          el.focus();
          el.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    const catSel = document.getElementById("annFilterCategory");
    if (catSel) {
      catSel.addEventListener("change", (e) => {
        filterCategory = e.target.value;
        render();
      });
    }

    const readSel = document.getElementById("annFilterRead");
    if (readSel) {
      readSel.addEventListener("change", (e) => {
        filterReadState = e.target.value;
        render();
      });
    }

    // Bind Open Details Modal
    container.querySelectorAll(".open-ann-detail-btn, [data-open-ann]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id") || el.getAttribute("data-open-ann");
        openAnnouncementDetails(id);
      });
    });

    // Bind Read/Unread Toggle
    container.querySelectorAll(".toggle-read-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const currState = StudentHubStorage.getState();
        const ann = currState.announcements.find((a) => a.id === id);
        if (ann) {
          const nextRead = !ann.read;
          ann.read = nextRead;
          StudentHubStorage.saveState(currState);
          if (typeof StudentHubStorage.updateAnnouncementInDatabase === "function") {
            await StudentHubStorage.updateAnnouncementInDatabase(id, { read: nextRead });
          }
          refreshAll();
          showToast(
            nextRead ? "Announcement marked as read." : "Announcement marked as unread.",
            "info"
          );
        }
      });
    });
  }

  return { render, openAnnouncementDetails };
})();

window.StudentHubAnnouncements = StudentHubAnnouncements;
