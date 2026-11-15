// Handles announcement feeds, category filtering, and notice displays.
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 7: Announcements (announcements.js) — READ-ONLY FOR STUDENTS
 *
 * Student Permissions Enforced:
 * - View published announcements
 * - Open complete announcement details modal
 * - Search & filter announcements by category, read status, and date order
 * - Mark announcements as read / unread
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
  let sortOrder = "newest"; // "newest" | "oldest"
  let eventsBound = false;

  function getCategoryBadge(cat) {
    if (cat === "Academic" || cat === "Class Advisory") return "badge-primary";
    if (cat === "Events" || cat === "Examination") return "badge-info";
    if (cat === "Scholarship") return "badge-success";
    if (cat === "Emergency") return "badge-danger";
    return "badge-neutral";
  }

  function isImportantAnnouncement(ann) {
    if (!ann) return false;
    return (
      ann.category === "Emergency" ||
      ann.category === "Examination" ||
      ann.priority === "High" ||
      ann.important === true
    );
  }

  function getPreviewText(text, maxLen = 190) {
    const raw = String(text || "").trim();
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, maxLen).trimEnd()}...`;
  }

  function getLatestDate(list) {
    const dates = (list || [])
      .map((a) => String(a.date || "").trim())
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
    return dates[0] || "";
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

    const important = isImportantAnnouncement(ann);
    const attachments = Array.isArray(ann.attachments) ? ann.attachments : [];
    const attachmentsHtml =
      attachments.length > 0
        ? `
          <div style="font-size:0.84rem;color:var(--text-main);">
            <strong>Attachments (${attachments.length}):</strong>
            <ul style="margin:6px 0 0 18px;color:var(--text-secondary);">
              ${attachments
                .map((att) => `<li>${escapeHtml(typeof att === "string" ? att : att.name || att.title || "Attachment")}</li>`)
                .join("")}
            </ul>
          </div>
        `
        : "";

    const html = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="badge ${getCategoryBadge(ann.category)}">${escapeHtml(ann.category)}</span>
            ${
              important
                ? `<span class="badge badge-danger">Important Notice</span>`
                : ""
            }
            <span class="badge badge-info">Audience: ${escapeHtml(
              ann.targetAudience || "All BSIT Students"
            )}</span>
            <span class="badge badge-success">Published Bulletin</span>
          </div>
        </div>

        <div class="ann-detail-meta-grid">
          <div>
            <span class="ann-detail-meta-label">Published By</span>
            <span>${escapeHtml(ann.author || "BANTUG UNIVERSITY Faculty")}</span>
          </div>
          <div>
            <span class="ann-detail-meta-label">Publication Date</span>
            <span>${escapeHtml(formatReadableDate(ann.date))}</span>
          </div>
          <div>
            <span class="ann-detail-meta-label">Category</span>
            <span>${escapeHtml(ann.category || "General")}</span>
          </div>
          <div>
            <span class="ann-detail-meta-label">Status</span>
            <span>Marked as Read</span>
          </div>
        </div>

        <div class="ann-detail-body">${escapeHtml(ann.description)}</div>

        ${attachmentsHtml}

        <div class="modal-actions">
          <button type="button" class="btn btn-primary" id="closeAnnDetailModalBtn">Back to Announcements</button>
        </div>
      </div>
    `;

    openModal(ann.title, html, (bodyEl) => {
      const closeBtn = bodyEl.querySelector("#closeAnnDetailModalBtn");
      if (closeBtn) closeBtn.addEventListener("click", closeModal);
    });
  }

  function updateClearFiltersVisibility() {
    const clearBtn = document.getElementById("annClearFiltersBtn");
    if (!clearBtn) return;
    const hasFilter =
      searchQuery.trim() !== "" ||
      filterCategory !== "All" ||
      filterReadState !== "All" ||
      sortOrder !== "newest";
    clearBtn.hidden = !hasFilter;
  }

  function bindStaticEvents() {
    if (eventsBound) return;
    eventsBound = true;

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

    const searchInput = document.getElementById("annSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
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

    const sortSel = document.getElementById("annSortSelect");
    if (sortSel) {
      sortSel.addEventListener("change", (e) => {
        sortOrder = e.target.value === "oldest" ? "oldest" : "newest";
        render();
      });
    }

    const clearBtn = document.getElementById("annClearFiltersBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        searchQuery = "";
        filterCategory = "All";
        filterReadState = "All";
        sortOrder = "newest";
        if (searchInput) searchInput.value = "";
        if (catSel) catSel.value = "All";
        if (readSel) readSel.value = "All";
        if (sortSel) sortSel.value = "newest";
        render();
      });
    }

    document.querySelectorAll("[data-ann-read-filter]").forEach((cardEl) => {
      const activate = () => {
        filterReadState = cardEl.getAttribute("data-ann-read-filter") || "All";
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
    const container = document.getElementById("announcementsContainer");
    const listHost = document.getElementById("announcementsListHost");
    if (!container || !listHost) return;

    bindStaticEvents();

    const publishedAnnouncements = StudentHubStorage.getPublishedAnnouncements();
    const unreadCount = publishedAnnouncements.filter((a) => !a.read).length;
    const readCount = publishedAnnouncements.length - unreadCount;
    const latestDate = getLatestDate(publishedAnnouncements);
    const latestFormatted = latestDate ? formatReadableDate(latestDate) : "\u2014";

    // 1. Hydrate Overview Pills & Action Button
    const setElText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    setElText("annOverviewTotalPill", `Total: ${publishedAnnouncements.length}`);
    setElText("annOverviewUnreadPill", `Unread: ${unreadCount}`);
    setElText("annOverviewLatestPill", `Latest: ${latestFormatted}`);

    const markAllBtn = document.getElementById("markAllAnnouncementsReadBtn");
    const allReadBadge = document.getElementById("annAllReadBadge");
    if (markAllBtn) {
      markAllBtn.hidden = unreadCount === 0;
      markAllBtn.textContent = `Mark All as Read (${unreadCount})`;
    }
    if (allReadBadge) {
      allReadBadge.hidden = unreadCount > 0;
    }

    // 2. Hydrate Summary Cards
    setElText("annStatTotal", publishedAnnouncements.length);
    setElText("annStatUnread", unreadCount);
    setElText(
      "annStatUnreadSub",
      unreadCount > 0 ? "Awaiting review" : "All bulletins reviewed"
    );
    setElText("annStatLatest", latestFormatted);

    document.querySelectorAll("[data-ann-read-filter]").forEach((cardEl) => {
      const target = cardEl.getAttribute("data-ann-read-filter");
      cardEl.classList.toggle("is-active-filter", target === filterReadState);
    });

    // 3. Hydrate Category Tabs from supported CATEGORIES
    const categoryTabsHost = document.getElementById("annCategoryTabs");
    if (categoryTabsHost) {
      const countByCat = (cat) =>
        publishedAnnouncements.filter((a) => a.category === cat).length;

      const tabItems = [
        { key: "All", label: "All Categories", count: publishedAnnouncements.length },
        ...CATEGORIES.map((c) => ({ key: c, label: c, count: countByCat(c) }))
      ];

      categoryTabsHost.innerHTML = tabItems
        .map(
          (item) => `
          <button
            type="button"
            class="ann-tab-btn ${filterCategory === item.key ? "is-active" : ""}"
            data-ann-cat-tab="${escapeHtml(item.key)}"
            role="tab"
            aria-selected="${filterCategory === item.key ? "true" : "false"}"
          >
            ${escapeHtml(item.label)} <span class="ann-tab-count">${item.count}</span>
          </button>
        `
        )
        .join("");

      categoryTabsHost.querySelectorAll("[data-ann-cat-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          filterCategory = btn.getAttribute("data-ann-cat-tab") || "All";
          render();
        });
      });
    }

    // 4. Hydrate Filter Dropdowns
    const catSel = document.getElementById("annFilterCategory");
    if (catSel) {
      catSel.innerHTML = `
        <option value="All" ${filterCategory === "All" ? "selected" : ""}>All Categories (${
        publishedAnnouncements.length
      })</option>
        ${CATEGORIES.map(
          (c) =>
            `<option value="${escapeHtml(c)}" ${
              filterCategory === c ? "selected" : ""
            }>${escapeHtml(c)}</option>`
        ).join("")}
      `;
    }

    const readSel = document.getElementById("annFilterRead");
    if (readSel) {
      readSel.innerHTML = `
        <option value="All" ${filterReadState === "All" ? "selected" : ""}>All Published (${
        publishedAnnouncements.length
      })</option>
        <option value="Unread" ${
          filterReadState === "Unread" ? "selected" : ""
        }>Unread Only (${unreadCount})</option>
        <option value="Read" ${
          filterReadState === "Read" ? "selected" : ""
        }>Read Only (${readCount})</option>
      `;
    }

    const sortSel = document.getElementById("annSortSelect");
    if (sortSel) sortSel.value = sortOrder;

    updateClearFiltersVisibility();

    // 5. Filter & Sort Announcements
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
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          (a.author && a.author.toLowerCase().includes(q)) ||
          (a.category && a.category.toLowerCase().includes(q));
        return matchCat && matchRead && matchQuery;
      })
      .sort((a, b) => {
        if (sortOrder === "oldest") {
          return (a.date || "").localeCompare(b.date || "");
        }
        return (b.date || "").localeCompare(a.date || "");
      });

    // 6. Render Announcement Cards
    if (filtered.length === 0) {
      listHost.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <h3>No Published Announcements Found</h3>
            <p>No published announcements match your current search or filter criteria.</p>
          </div>
        </div>
      `;
      return;
    }

    listHost.innerHTML = `
      <div class="announcements-list">
        ${filtered
          .map((a) => {
            const important = isImportantAnnouncement(a);
            const cardClasses = [
              "announcement-card",
              !a.read ? "is-unread" : "",
              important ? "is-important" : ""
            ]
              .filter(Boolean)
              .join(" ");

            return `
              <article class="${cardClasses}" data-ann-id="${escapeHtml(a.id)}">
                <div class="announcement-header">
                  <div>
                    <div class="announcement-badges-row">
                      <span class="badge ${getCategoryBadge(a.category)}">${escapeHtml(
              a.category
            )}</span>
                      ${
                        important
                          ? `<span class="badge badge-danger">Important Notice</span>`
                          : ""
                      }
                      <span class="badge badge-info">Audience: ${escapeHtml(
                        a.targetAudience || "All BSIT Students"
                      )}</span>
                      ${
                        !a.read
                          ? `<span class="badge badge-warning">Unread</span>`
                          : `<span class="badge badge-success">Read</span>`
                      }
                    </div>
                    <h3 class="announcement-title" data-open-ann="${escapeHtml(
                      a.id
                    )}">${escapeHtml(a.title)}</h3>
                  </div>
                  <div class="announcement-date-pill">
                    Published: ${escapeHtml(formatReadableDate(a.date))}
                  </div>
                </div>

                <p class="announcement-body">${escapeHtml(getPreviewText(a.description))}</p>

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
            `;
          })
          .join("")}
      </div>
    `;

    // 7. Bind Card Action Handlers
    listHost.querySelectorAll(".open-ann-detail-btn, [data-open-ann]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id") || el.getAttribute("data-open-ann");
        openAnnouncementDetails(id);
      });
    });

    listHost.querySelectorAll(".toggle-read-btn").forEach((btn) => {
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
