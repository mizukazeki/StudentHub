// Administrator panel management, user accounts, and applicant review.
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Administrator Panel Controller (js/admin.js)
 *
 * Implements Phase 8 requirements:
 * - Admin Overview & Dashboard Statistics
 * - Comprehensive User Management (Students, Faculty, Applicants)
 * - User Status Toggles (Active / Deactivated) & PBKDF2 Password Resets
 * - Application Records & Decision Review (Approval Email dispatch)
 * - Audit Trail & Security Event Logs
 * - Administrator Profile & Password Security
 * ============================================================================
 */

const StudentHubAdmin = (function () {
  const {
    openModal,
    closeModal,
    confirmDialog,
    showToast,
    escapeHtml,
    clearFormErrors,
    setFieldError
  } = window.StudentHubApp;

  let activeUsersFilter = {
    role: "all",
    status: "all",
    search: "",
    page: 1,
    limit: 50
  };

  let activeAppsFilter = {
    status: "all",
    search: "",
    page: 1,
    limit: 50
  };

  let activeLogsFilter = {
    actionType: "all",
    search: "",
    limit: 100
  };

  function formatDateTime(dtStr) {
    if (!dtStr) return "N/A";
    const d = new Date(dtStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return dtStr;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }

  function getStatusBadge(status) {
    const s = String(status || "").toLowerCase();
    if (s === "approved" || s === "active") {
      return `<span class="admin-badge badge-approved"><span class="badge-dot"></span>${escapeHtml(status)}</span>`;
    }
    if (s === "rejected" || s === "inactive") {
      return `<span class="admin-badge badge-rejected"><span class="badge-dot"></span>${escapeHtml(status)}</span>`;
    }
    if (s === "pending") {
      return `<span class="admin-badge badge-pending"><span class="badge-dot"></span>Pending</span>`;
    }
    if (s === "under review") {
      return `<span class="admin-badge badge-review"><span class="badge-dot"></span>Under Review</span>`;
    }
    return `<span class="admin-badge badge-neutral">${escapeHtml(status)}</span>`;
  }

  function getRoleBadge(role) {
    const r = String(role || "").toLowerCase();
    if (r === "student") return `<span class="admin-badge badge-student">Student</span>`;
    if (r === "faculty") return `<span class="admin-badge badge-faculty">Faculty</span>`;
    if (r === "applicant") return `<span class="admin-badge badge-applicant">Applicant</span>`;
    if (r === "admin") return `<span class="admin-badge badge-admin">Administrator</span>`;
    return `<span class="admin-badge badge-neutral">${escapeHtml(role)}</span>`;
  }

  function checkPasswordStrength(password) {
    let score = 0;
    if (!password) return { score: 0, label: "None", color: "#cbd5e1" };
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 25, label: "Weak", color: "#ef4444" };
    if (score === 3) return { score: 50, label: "Fair", color: "#f59e0b" };
    if (score === 4) return { score: 75, label: "Good", color: "#3b82f6" };
    return { score: 100, label: "Strong", color: "#10b981" };
  }

  // ==========================================================================
  // 1. ADMIN DASHBOARD / OVERVIEW
  // ==========================================================================
  async function renderDashboard() {
    const container = document.getElementById("adminDashboardContainer");
    if (!container) return;

    container.innerHTML = `
      <div style="padding:40px;text-align:center;color:var(--text-secondary);">
        <div class="spinner" style="margin-bottom:12px;"></div>
        Loading administrative metrics and system statistics...
      </div>
    `;

    const res = await StudentHubStorage.fetchAdminStats();
    if (!res.ok) {
      container.innerHTML = `
        <div class="alert alert-danger" style="margin:20px 0;">
          Failed to load administrative statistics: ${escapeHtml(res.error || "Unknown error")}
        </div>
      `;
      return;
    }

    const stats = res.data.stats || {};
    const recentLogs = res.data.recentLogs || [];

    container.innerHTML = `
      <!-- Admin Header Card -->
      <div class="admin-header-card">
        <div class="admin-header-top">
          <div class="admin-title-group">
            <h2>
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="3" y="3" width="7" height="9" rx="1"></rect>
                <rect x="14" y="3" width="7" height="5" rx="1"></rect>
                <rect x="14" y="12" width="7" height="9" rx="1"></rect>
                <rect x="3" y="16" width="7" height="5" rx="1"></rect>
              </svg>
              Administrator Control Center
              <span class="admin-badge-root">System Root</span>
            </h2>
            <p class="admin-subtitle">
              Authoritative overview of university user accounts, application submissions, and database operations.
            </p>
          </div>
          <div>
            <button type="button" class="btn btn-primary" id="adminQuickAddUserBtn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:6px;">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add New User
            </button>
          </div>
        </div>
      </div>

      <!-- Statistics Grid -->
      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <div class="admin-stat-icon primary">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div class="admin-stat-info">
            <div class="admin-stat-label">Total Users</div>
            <div class="admin-stat-value">${stats.totalUsers || 0}</div>
            <div class="admin-stat-sub">${stats.totalActive || 0} active &bull; ${stats.totalInactive || 0} inactive</div>
          </div>
        </div>

        <div class="admin-stat-card">
          <div class="admin-stat-icon info">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
          </div>
          <div class="admin-stat-info">
            <div class="admin-stat-label">Enrolled Students</div>
            <div class="admin-stat-value">${stats.totalStudents || 0}</div>
            <div class="admin-stat-sub">BSIT program cohorts</div>
          </div>
        </div>

        <div class="admin-stat-card">
          <div class="admin-stat-icon primary">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div class="admin-stat-info">
            <div class="admin-stat-label">Faculty Members</div>
            <div class="admin-stat-value">${stats.totalFaculty || 0}</div>
            <div class="admin-stat-sub">Academic department staff</div>
          </div>
        </div>

        <div class="admin-stat-card">
          <div class="admin-stat-icon warning">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="admin-stat-info">
            <div class="admin-stat-label">Applications</div>
            <div class="admin-stat-value">${stats.totalApplications || 0}</div>
            <div class="admin-stat-sub">${stats.pendingApplications || 0} pending review</div>
          </div>
        </div>
      </div>

      <!-- Secondary Stats & Quick Actions -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:24px;">
        <!-- Application Pipeline Card -->
        <div class="admin-table-card">
          <div class="admin-table-header">
            <h3>Admission Application Pipeline</h3>
          </div>
          <div style="padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <span style="display:flex;align-items:center;gap:8px;">
                <span class="admin-badge badge-pending">Pending</span>
                Awaiting Initial Screening
              </span>
              <strong>${stats.pendingApplications || 0}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <span style="display:flex;align-items:center;gap:8px;">
                <span class="admin-badge badge-review">Under Review</span>
                Department Evaluation
              </span>
              <strong>${stats.underReviewApplications || 0}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <span style="display:flex;align-items:center;gap:8px;">
                <span class="admin-badge badge-approved">Approved</span>
                Accepted for Admission
              </span>
              <strong style="color:#15803d;">${stats.approvedApplications || 0}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
              <span style="display:flex;align-items:center;gap:8px;">
                <span class="admin-badge badge-rejected">Rejected</span>
                Prerequisites Not Met
              </span>
              <strong style="color:#b91c1c;">${stats.rejectedApplications || 0}</strong>
            </div>
            <div style="margin-top:16px;text-align:right;">
              <button type="button" class="btn btn-sm btn-secondary" id="adminGoToAppsBtn">
                View All Applications &rarr;
              </button>
            </div>
          </div>
        </div>

        <!-- Recent Audit Trail Snippet -->
        <div class="admin-table-card">
          <div class="admin-table-header">
            <h3>Recent Administrative Activity</h3>
            <button type="button" class="btn btn-sm btn-outline" id="adminGoToLogsBtn">View Full Trail</button>
          </div>
          <div style="padding:8px 0;">
            ${recentLogs.length === 0 ? `
              <div style="padding:24px;text-align:center;color:var(--text-secondary);">No recent audit logs recorded.</div>
            ` : recentLogs.slice(0, 5).map((log) => `
              <div class="admin-log-item">
                <div class="admin-log-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div class="admin-log-content">
                  <div class="admin-log-title">${escapeHtml(log.actionType)}</div>
                  <div class="admin-log-desc">${escapeHtml(log.details)}</div>
                  <div class="admin-log-time">${formatDateTime(log.createdAt)} &bull; ${escapeHtml(log.actorName || "System")} (${escapeHtml(log.actorRole || "sys")})</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector("#adminQuickAddUserBtn")?.addEventListener("click", () => openAddUserModal());
    container.querySelector("#adminGoToAppsBtn")?.addEventListener("click", () => {
      window.StudentHubApp.navigateTo("admin-applications");
    });
    container.querySelector("#adminGoToLogsBtn")?.addEventListener("click", () => {
      window.StudentHubApp.navigateTo("admin-logs");
    });
  }

  // ==========================================================================
  // 2. ADMIN USER MANAGEMENT
  // ==========================================================================
  async function renderUsers(targetRole = "all") {
    const container = document.getElementById("adminUsersContainer");
    if (!container) return;

    if (targetRole && targetRole !== activeUsersFilter.role) {
      activeUsersFilter.role = targetRole;
    }

    container.innerHTML = `
      <!-- Header -->
      <div class="admin-header-card">
        <div class="admin-header-top">
          <div class="admin-title-group">
            <h2>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              User Account Management
            </h2>
            <p class="admin-subtitle">
              Manage student, faculty, and applicant accounts, toggle statuses, and trigger secure PBKDF2 password resets.
            </p>
          </div>
          <div class="admin-header-actions">
            <button type="button" class="btn btn-primary" id="adminAddUserBtn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:6px;">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add New User
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="admin-toolbar">
        <div class="admin-toolbar-left">
          <div class="admin-search-box">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="adminUserSearchInput"
              class="form-control form-control-sm"
              placeholder="Search by name, ID, or email..."
              value="${escapeHtml(activeUsersFilter.search)}"
            />
          </div>

          <div class="admin-filter-group">
            <label for="adminUserRoleFilter">Role:</label>
            <select id="adminUserRoleFilter" class="form-control form-control-sm">
              <option value="all" ${activeUsersFilter.role === "all" ? "selected" : ""}>All Roles</option>
              <option value="student" ${activeUsersFilter.role === "student" ? "selected" : ""}>Students</option>
              <option value="faculty" ${activeUsersFilter.role === "faculty" ? "selected" : ""}>Faculty</option>
              <option value="applicant" ${activeUsersFilter.role === "applicant" ? "selected" : ""}>Applicants</option>
              <option value="admin" ${activeUsersFilter.role === "admin" ? "selected" : ""}>Administrators</option>
            </select>
          </div>

          <div class="admin-filter-group">
            <label for="adminUserStatusFilter">Status:</label>
            <select id="adminUserStatusFilter" class="form-control form-control-sm">
              <option value="all" ${activeUsersFilter.status === "all" ? "selected" : ""}>All Statuses</option>
              <option value="active" ${activeUsersFilter.status === "active" ? "selected" : ""}>Active Only</option>
              <option value="inactive" ${activeUsersFilter.status === "inactive" ? "selected" : ""}>Deactivated Only</option>
            </select>
          </div>
        </div>

        <div class="admin-toolbar-right">
          <button type="button" class="btn btn-sm btn-secondary" id="adminUserRefreshBtn">Refresh Table</button>
        </div>
      </div>

      <!-- Users Table Card -->
      <div class="admin-table-card">
        <div id="adminUsersTableWrap" class="admin-table-responsive">
          <div style="padding:40px;text-align:center;color:var(--text-secondary);">
            <div class="spinner" style="margin-bottom:12px;"></div>
            Loading user accounts...
          </div>
        </div>
      </div>
    `;

    // Attach filters
    const searchInput = container.querySelector("#adminUserSearchInput");
    const roleSelect = container.querySelector("#adminUserRoleFilter");
    const statusSelect = container.querySelector("#adminUserStatusFilter");
    const refreshBtn = container.querySelector("#adminUserRefreshBtn");
    const addBtn = container.querySelector("#adminAddUserBtn");

    if (addBtn) addBtn.addEventListener("click", () => openAddUserModal());

    let searchTimer = null;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          activeUsersFilter.search = searchInput.value.trim();
          loadUsersTable();
        }, 300);
      });
    }

    if (roleSelect) {
      roleSelect.addEventListener("change", () => {
        activeUsersFilter.role = roleSelect.value;
        loadUsersTable();
      });
    }

    if (statusSelect) {
      statusSelect.addEventListener("change", () => {
        activeUsersFilter.status = statusSelect.value;
        loadUsersTable();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => loadUsersTable());
    }

    await loadUsersTable();
  }

  async function loadUsersTable() {
    const wrap = document.getElementById("adminUsersTableWrap");
    if (!wrap) return;

    const res = await StudentHubStorage.fetchAdminUsers(activeUsersFilter);
    if (!res.ok) {
      wrap.innerHTML = `
        <div style="padding:24px;color:#b91c1c;text-align:center;">
          Failed to load users: ${escapeHtml(res.error || "Unknown error")}
        </div>
      `;
      return;
    }

    const users = res.data.users || [];
    const total = res.data.total || 0;

    if (users.length === 0) {
      wrap.innerHTML = `
        <div style="padding:48px 24px;text-align:center;color:var(--text-secondary);">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none" style="margin-bottom:12px;opacity:0.6;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <div style="font-size:1.05rem;font-weight:600;margin-bottom:4px;">No User Accounts Found</div>
          <p style="font-size:0.88rem;margin:0;">No accounts matched your active search or filter criteria.</p>
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th class="col-user">User / Full Name</th>
            <th class="col-role">Role</th>
            <th class="col-id">Account ID / Reference</th>
            <th class="col-email">Email Address</th>
            <th class="col-dept">Department / Section</th>
            <th class="col-status">Account Status</th>
            <th class="col-security">Security Status</th>
            <th class="col-actions" style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map((u) => `
            <tr data-user-id="${escapeHtml(u.userId)}">
              <td class="col-user">
                <div class="admin-user-cell">
                  <div class="admin-user-name">${escapeHtml(u.fullName || u.username)}</div>
                  <div class="admin-user-handle">@${escapeHtml(u.username)}</div>
                </div>
              </td>
              <td class="col-role">${getRoleBadge(u.role)}</td>
              <td class="col-id"><span class="admin-code-badge">${escapeHtml(u.referenceId || "—")}</span></td>
              <td class="col-email"><a href="mailto:${escapeHtml(u.email)}" class="admin-email-link" title="${escapeHtml(u.email)}">${escapeHtml(u.email)}</a></td>
              <td class="col-dept">
                <div class="admin-dept-title">${escapeHtml(u.department || "—")}</div>
                ${u.section ? `<span class="admin-badge badge-section">${escapeHtml(u.section)}</span>` : ""}
              </td>
              <td class="col-status">
                ${u.isActive
                  ? `<span class="admin-badge badge-active"><span class="badge-dot"></span>Active</span>`
                  : `<span class="admin-badge badge-inactive"><span class="badge-dot"></span>Deactivated</span>`}
              </td>
              <td class="col-security">
                ${u.mustChangePassword
                  ? `<span class="admin-badge badge-warning" title="Must change temporary password upon login">Must Change PW</span>`
                  : `<span class="admin-badge badge-verified">&check; Verified</span>`}
              </td>
              <td class="col-actions" style="text-align:right;">
                <div class="admin-actions-cell" style="justify-content:flex-end;">
                  <button type="button" class="admin-btn-action btn-action-edit" data-action="edit" data-id="${escapeHtml(u.userId)}" title="Edit user details">
                    Edit
                  </button>

                  <button type="button" class="admin-btn-action ${u.isActive ? "btn-action-deactivate" : "btn-action-activate"}" data-action="status" data-id="${escapeHtml(u.userId)}" data-active="${u.isActive ? 1 : 0}" title="${u.isActive ? "Deactivate account" : "Activate account"}">
                    ${u.isActive ? "Deactivate" : "Activate"}
                  </button>

                  <button type="button" class="admin-btn-action btn-action-reset" data-action="reset" data-id="${escapeHtml(u.userId)}" data-username="${escapeHtml(u.username)}" title="Reset password to secure temporary credentials">
                    Reset PW
                  </button>

                  ${u.role !== "admin" ? `
                    <button type="button" class="admin-btn-action btn-action-delete" data-action="delete" data-id="${escapeHtml(u.userId)}" data-username="${escapeHtml(u.username)}" title="Delete or soft-deactivate account">
                      Delete
                    </button>
                  ` : ""}
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="admin-table-footer">
        <span>Showing <strong>${users.length}</strong> of <strong>${total}</strong> user account(s)</span>
      </div>
    `;

    // Attach action button handlers
    wrap.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const userId = btn.getAttribute("data-id");
        const user = users.find((u) => String(u.userId) === String(userId));
        if (!user) return;

        if (action === "edit") {
          openEditUserModal(user);
        } else if (action === "status") {
          toggleUserStatus(user);
        } else if (action === "reset") {
          triggerUserPasswordReset(user);
        } else if (action === "delete") {
          deleteUserAccount(user);
        }
      });
    });
  }

  // ==========================================================================
  // USER ACTIONS: ADD, EDIT, STATUS, RESET, DELETE
  // ==========================================================================
  function openAddUserModal() {
    const html = `
      <form id="adminAddUserForm" novalidate style="font-size:0.92rem;">
        <p style="margin:0 0 16px;color:var(--text-secondary);font-size:0.88rem;">
          Create a new authenticated university user account. Accounts will be provisioned in the MySQL database (<code>users</code>, <code>students</code>, or <code>faculty</code>).
        </p>

        <div class="admin-form-grid">
          <div class="form-group">
            <label class="form-label" for="addRoleSelect">Account Role <span class="req">*</span></label>
            <select id="addRoleSelect" name="role" class="form-control" required>
              <option value="student">Student</option>
              <option value="faculty">Faculty Member</option>
              <option value="applicant">Applicant</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="addUsernameInput">Username <span class="req">*</span></label>
            <input type="text" id="addUsernameInput" name="username" class="form-control" placeholder="e.g. j.smith" required />
            <div class="field-error" data-error-for="username"></div>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="addFullNameInput">Full Name <span class="req">*</span></label>
            <input type="text" id="addFullNameInput" name="fullName" class="form-control" placeholder="e.g. Johnathan Smith" required />
            <div class="field-error" data-error-for="fullName"></div>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="addEmailInput">Email Address <span class="req">*</span></label>
            <input type="email" id="addEmailInput" name="email" class="form-control" placeholder="e.g. j.smith@bantug.edu.example" required />
            <div class="field-error" data-error-for="email"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="addDeptInput" id="addDeptLabel">Program / Department</label>
            <input type="text" id="addDeptInput" name="department" class="form-control" placeholder="e.g. BSIT or IT Department" value="Bachelor of Science in Information Technology" />
          </div>

          <div class="form-group" id="addSectionGroup">
            <label class="form-label" for="addSectionInput">Section</label>
            <input type="text" id="addSectionInput" name="section" class="form-control" placeholder="e.g. BSIT 1-1" value="BSIT 1-1" />
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="addPasswordInput">Initial Password (Optional)</label>
            <input type="text" id="addPasswordInput" name="password" class="form-control" placeholder="Leave blank to auto-generate a secure temporary password" />
            <span style="font-size:0.78rem;color:var(--text-secondary);display:block;margin-top:4px;">
              User will be flagged with <code>must_change_password = 1</code> and required to set their own password upon first login.
            </span>
          </div>
        </div>

        <div id="addUserAlert" class="field-error" style="margin:12px 0;" role="alert"></div>

        <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
          <button type="button" class="btn btn-secondary" id="cancelAddUserBtn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="submitAddUserBtn">Create Account</button>
        </div>
      </form>
    `;

    openModal("Provision New University User Account", html, (bodyEl) => {
      bodyEl.querySelector("#cancelAddUserBtn").addEventListener("click", closeModal);
      const form = bodyEl.querySelector("#adminAddUserForm");
      const roleSel = bodyEl.querySelector("#addRoleSelect");
      const secGroup = bodyEl.querySelector("#addSectionGroup");
      const deptLabel = bodyEl.querySelector("#addDeptLabel");
      const deptInput = bodyEl.querySelector("#addDeptInput");

      roleSel.addEventListener("change", () => {
        const val = roleSel.value;
        if (val === "faculty") {
          deptLabel.textContent = "Faculty Department";
          deptInput.value = "Information Technology Department";
          secGroup.style.display = "none";
        } else if (val === "student") {
          deptLabel.textContent = "Degree Program";
          deptInput.value = "Bachelor of Science in Information Technology";
          secGroup.style.display = "block";
        } else {
          deptLabel.textContent = "Desired Program";
          deptInput.value = "Bachelor of Science in Information Technology";
          secGroup.style.display = "none";
        }
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormErrors(form);
        const alertBox = bodyEl.querySelector("#addUserAlert");
        alertBox.textContent = "";

        const fd = new FormData(form);
        const payload = {
          role: fd.get("role"),
          username: String(fd.get("username") || "").trim(),
          fullName: String(fd.get("fullName") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          department: String(fd.get("department") || "").trim(),
          section: String(fd.get("section") || "").trim(),
          password: String(fd.get("password") || "").trim() || undefined
        };

        let hasError = false;
        if (!payload.username) {
          setFieldError(form, "username", "Username is required.");
          hasError = true;
        }
        if (!payload.fullName) {
          setFieldError(form, "fullName", "Full name is required.");
          hasError = true;
        }
        if (!payload.email) {
          setFieldError(form, "email", "Valid email address is required.");
          hasError = true;
        }
        if (hasError) return;

        const subBtn = bodyEl.querySelector("#submitAddUserBtn");
        subBtn.disabled = true;
        subBtn.textContent = "Creating...";

        const res = await StudentHubStorage.createAdminUser(payload);
        if (!res.ok) {
          alertBox.textContent = res.error || "Failed to create user account.";
          subBtn.disabled = false;
          subBtn.textContent = "Create Account";
          return;
        }

        // Show Temporary Password modal
        closeModal();
        showTemporaryPasswordDialog({
          username: payload.username,
          fullName: payload.fullName,
          role: payload.role,
          email: payload.email,
          temporaryPassword: res.data.temporaryPassword
        });

        loadUsersTable();
      });
    });
  }

  function showTemporaryPasswordDialog({ username, fullName, role, email, temporaryPassword }) {
    const html = `
      <div style="font-size:0.92rem;line-height:1.5;">
        <div class="alert alert-success" style="margin-bottom:16px;">
          <strong>Account Provisioned Successfully!</strong> Account for <strong>${escapeHtml(fullName)}</strong> (@${escapeHtml(username)}) is now active in MySQL.
        </div>

        <p style="color:var(--text-secondary);margin-bottom:12px;">
          Provide the temporary credentials below to the user. Upon their first login, they will be required to change this password.
        </p>

        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin-bottom:16px;">
          <div style="margin-bottom:8px;">
            <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Sign-In Username / Email:</span>
            <div style="font-weight:600;font-size:1rem;color:#0f2b5c;">${escapeHtml(username)} &bull; ${escapeHtml(email)}</div>
          </div>
          <div>
            <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Temporary Password:</span>
            <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
              <input type="text" id="tempPwDisplay" class="form-control" value="${escapeHtml(temporaryPassword)}" readonly style="font-family:monospace;font-size:1.1rem;font-weight:700;letter-spacing:0.04em;background:#fff;" />
              <button type="button" class="btn btn-secondary" id="copyTempPwBtn">Copy</button>
            </div>
          </div>
        </div>

        <div class="modal-actions" style="display:flex;justify-content:flex-end;">
          <button type="button" class="btn btn-primary" id="closeTempPwModalBtn">Done</button>
        </div>
      </div>
    `;

    openModal("Temporary Login Credentials", html, (bodyEl) => {
      bodyEl.querySelector("#closeTempPwModalBtn").addEventListener("click", closeModal);
      const copyBtn = bodyEl.querySelector("#copyTempPwBtn");
      const pwInput = bodyEl.querySelector("#tempPwDisplay");
      copyBtn.addEventListener("click", () => {
        pwInput.select();
        navigator.clipboard.writeText(pwInput.value).then(() => {
          copyBtn.textContent = "Copied!";
          setTimeout(() => (copyBtn.textContent = "Copy"), 2000);
          showToast("Temporary password copied to clipboard!", "success");
        });
      });
    });
  }

  function openEditUserModal(user) {
    const html = `
      <form id="adminEditUserForm" novalidate style="font-size:0.92rem;">
        <div class="admin-form-grid">
          <div class="form-group full-width">
            <label class="form-label" for="editFullNameInput">Full Name <span class="req">*</span></label>
            <input type="text" id="editFullNameInput" name="fullName" class="form-control" value="${escapeHtml(user.fullName)}" required />
            <div class="field-error" data-error-for="fullName"></div>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="editEmailInput">Email Address <span class="req">*</span></label>
            <input type="email" id="editEmailInput" name="email" class="form-control" value="${escapeHtml(user.email)}" required />
            <div class="field-error" data-error-for="email"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="editDeptInput">${user.role === 'student' ? 'Course / Program' : 'Department / College'}</label>
            <input type="text" id="editDeptInput" name="department" class="form-control" value="${escapeHtml(user.course || user.department || "")}" />
          </div>

          <div class="form-group">
            <label class="form-label" for="editSectionInput">${user.role === 'faculty' ? 'Advisory Section' : 'Section'}</label>
            <input type="text" id="editSectionInput" name="section" class="form-control" value="${escapeHtml(user.advisorySection || user.section || "")}" />
          </div>

          ${user.role === 'student' ? `
          <div class="form-group">
            <label class="form-label" for="editYearLevelInput">Year Level</label>
            <input type="text" id="editYearLevelInput" name="yearLevel" class="form-control" value="${escapeHtml(user.yearLevel || "")}" placeholder="e.g. Year 2" />
          </div>
          <div class="form-group">
            <label class="form-label" for="editContactNumberInput">Contact Number</label>
            <input type="text" id="editContactNumberInput" name="contactNumber" class="form-control" value="${escapeHtml(user.contactNumber || "")}" placeholder="e.g. +63 917 555 0202" />
          </div>
          ` : ''}

          ${user.role === 'faculty' ? `
          <div class="form-group">
            <label class="form-label" for="editDesignationInput">Position / Designation</label>
            <input type="text" id="editDesignationInput" name="designation" class="form-control" value="${escapeHtml(user.designation || "")}" placeholder="e.g. Assistant Professor III" />
          </div>
          <div class="form-group">
            <label class="form-label" for="editContactNumberInput">Contact Number</label>
            <input type="text" id="editContactNumberInput" name="contactNumber" class="form-control" value="${escapeHtml(user.contactNumber || "")}" placeholder="e.g. +63 917 555 0144" />
          </div>
          <div class="form-group">
            <label class="form-label" for="editOfficeLocationInput">Office Location</label>
            <input type="text" id="editOfficeLocationInput" name="officeLocation" class="form-control" value="${escapeHtml(user.officeLocation || "")}" placeholder="e.g. IT Department Office, Rm 302" />
          </div>
          <div class="form-group">
            <label class="form-label" for="editBirthDateInput">Date of Birth</label>
            <input type="date" id="editBirthDateInput" name="birthDate" class="form-control" value="${escapeHtml(user.birthDate || "")}" />
          </div>
          <div class="form-group full-width">
            <label class="form-label" for="editHomeAddressInput">Home Address</label>
            <input type="text" id="editHomeAddressInput" name="homeAddress" class="form-control" value="${escapeHtml(user.homeAddress || "")}" placeholder="e.g. 123 University Drive, Bantug City" />
          </div>
          ` : ''}
        </div>

        <div id="editUserAlert" class="field-error" style="margin:12px 0;" role="alert"></div>

        <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
          <button type="button" class="btn btn-secondary" id="cancelEditUserBtn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="submitEditUserBtn">Save Changes</button>
        </div>
      </form>
    `;

    openModal(`Edit User Account: ${user.username}`, html, (bodyEl) => {
      bodyEl.querySelector("#cancelEditUserBtn").addEventListener("click", closeModal);
      const form = bodyEl.querySelector("#adminEditUserForm");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormErrors(form);
        const alertBox = bodyEl.querySelector("#editUserAlert");
        alertBox.textContent = "";

        const fd = new FormData(form);
        const payload = {
          fullName: String(fd.get("fullName") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          department: String(fd.get("department") || "").trim(),
          section: String(fd.get("section") || "").trim(),
          course: String(fd.get("department") || "").trim(),
          yearLevel: String(fd.get("yearLevel") || "").trim(),
          contactNumber: String(fd.get("contactNumber") || "").trim(),
          designation: String(fd.get("designation") || "").trim(),
          officeLocation: String(fd.get("officeLocation") || "").trim(),
          advisorySection: String(fd.get("section") || "").trim(),
          birthDate: String(fd.get("birthDate") || "").trim(),
          homeAddress: String(fd.get("homeAddress") || "").trim()
        };

        if (!payload.fullName || !payload.email) {
          if (!payload.fullName) setFieldError(form, "fullName", "Full name is required.");
          if (!payload.email) setFieldError(form, "email", "Email address is required.");
          return;
        }

        const subBtn = bodyEl.querySelector("#submitEditUserBtn");
        subBtn.disabled = true;
        subBtn.textContent = "Saving...";

        const res = await StudentHubStorage.updateAdminUser(user.userId, payload);
        if (!res.ok) {
          alertBox.textContent = res.error || "Failed to update account.";
          subBtn.disabled = false;
          subBtn.textContent = "Save Changes";
          return;
        }

        closeModal();
        showToast(`User @${user.username} updated successfully!`, "success");
        loadUsersTable();
      });
    });
  }

  async function toggleUserStatus(user) {
    const willDeactivate = Boolean(user.isActive);
    const confirmed = await confirmDialog({
      title: willDeactivate ? `Deactivate Account: ${user.username}?` : `Reactivate Account: ${user.username}?`,
      message: willDeactivate
        ? `Are you sure you want to deactivate @${user.username}? The user will immediately be barred from logging into the portal and any active sessions will be revoked.`
        : `Are you sure you want to activate @${user.username}? The user will regain permission to log into the portal.`,
      confirmText: willDeactivate ? "Yes, Deactivate" : "Yes, Activate",
      danger: willDeactivate
    });

    if (!confirmed) return;

    const res = await StudentHubStorage.updateAdminUserStatus(user.userId, !willDeactivate);
    if (!res.ok) {
      showToast(res.error || "Failed to update account status.", "error");
      return;
    }

    showToast(
      willDeactivate ? `Account @${user.username} deactivated.` : `Account @${user.username} reactivated.`,
      "success"
    );
    loadUsersTable();
  }

  async function triggerUserPasswordReset(user) {
    const confirmed = await confirmDialog({
      title: `Reset Password for @${user.username}?`,
      message: `A new random secure password will be generated for @${user.username}. Any active sessions will be terminated and the user will be forced to change this password on next login.`,
      confirmText: "Generate Temporary Password",
      danger: false
    });

    if (!confirmed) return;

    const res = await StudentHubStorage.resetAdminUserPassword(user.userId);
    if (!res.ok) {
      showToast(res.error || "Failed to reset password.", "error");
      return;
    }

    showTemporaryPasswordDialog({
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      email: user.email,
      temporaryPassword: res.data.temporaryPassword
    });

    loadUsersTable();
  }

  async function deleteUserAccount(user) {
    const confirmed = await confirmDialog({
      title: `Remove User Account: ${user.username}?`,
      message: `Are you sure you want to remove @${user.username}? If the user has linked academic records (grades, enrollments, applications), their account will be safely deactivated to preserve data integrity.`,
      confirmText: "Remove Account",
      danger: true
    });

    if (!confirmed) return;

    const res = await StudentHubStorage.deleteAdminUser(user.userId);
    if (!res.ok) {
      showToast(res.error || "Failed to remove user account.", "error");
      return;
    }

    showToast(res.data?.message || `Account @${user.username} processed.`, "success");
    loadUsersTable();
  }

  // ==========================================================================
  // 3. ADMIN APPLICATION MANAGEMENT
  // ==========================================================================
  async function renderApplications() {
    const container = document.getElementById("adminApplicationsContainer");
    if (!container) return;

    container.innerHTML = `
      <!-- Header -->
      <div class="admin-header-card">
        <div class="admin-header-top">
          <div class="admin-title-group">
            <h2>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Admissions &amp; Application Records
            </h2>
            <p class="admin-subtitle">
              Review prospective student admission applications, record status decisions, and automatically dispatch official approval notifications.
            </p>
          </div>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="admin-toolbar">
        <div class="admin-toolbar-left">
          <div class="admin-search-box">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="adminAppSearchInput"
              class="form-control form-control-sm"
              placeholder="Search reference #, name, email, or program..."
              value="${escapeHtml(activeAppsFilter.search)}"
            />
          </div>

          <div class="admin-filter-group">
            <label for="adminAppStatusFilter">Status:</label>
            <select id="adminAppStatusFilter" class="form-control form-control-sm">
              <option value="all" ${activeAppsFilter.status === "all" ? "selected" : ""}>All Statuses</option>
              <option value="Pending" ${activeAppsFilter.status === "Pending" ? "selected" : ""}>Pending</option>
              <option value="Under Review" ${activeAppsFilter.status === "Under Review" ? "selected" : ""}>Under Review</option>
              <option value="Approved" ${activeAppsFilter.status === "Approved" ? "selected" : ""}>Approved</option>
              <option value="Rejected" ${activeAppsFilter.status === "Rejected" ? "selected" : ""}>Rejected</option>
            </select>
          </div>
        </div>

        <div class="admin-toolbar-right">
          <button type="button" class="btn btn-sm btn-secondary" id="adminAppRefreshBtn">Refresh Table</button>
        </div>
      </div>

      <!-- Applications Table Card -->
      <div class="admin-table-card">
        <div id="adminAppsTableWrap" class="admin-table-responsive">
          <div style="padding:40px;text-align:center;color:var(--text-secondary);">
            <div class="spinner" style="margin-bottom:12px;"></div>
            Loading application records...
          </div>
        </div>
      </div>
    `;

    const searchInput = container.querySelector("#adminAppSearchInput");
    const statusSelect = container.querySelector("#adminAppStatusFilter");
    const refreshBtn = container.querySelector("#adminAppRefreshBtn");

    let timer = null;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          activeAppsFilter.search = searchInput.value.trim();
          loadApplicationsTable();
        }, 300);
      });
    }

    if (statusSelect) {
      statusSelect.addEventListener("change", () => {
        activeAppsFilter.status = statusSelect.value;
        loadApplicationsTable();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => loadApplicationsTable());
    }

    await loadApplicationsTable();
  }

  async function loadApplicationsTable() {
    const wrap = document.getElementById("adminAppsTableWrap");
    if (!wrap) return;

    const res = await StudentHubStorage.fetchAdminApplications(activeAppsFilter);
    if (!res.ok) {
      wrap.innerHTML = `
        <div style="padding:24px;color:#b91c1c;text-align:center;">
          Failed to load applications: ${escapeHtml(res.error || "Unknown error")}
        </div>
      `;
      return;
    }

    const apps = res.data.applications || [];
    const total = res.data.total || 0;

    if (apps.length === 0) {
      wrap.innerHTML = `
        <div style="padding:48px 24px;text-align:center;color:var(--text-secondary);">
          <div style="font-size:1.05rem;font-weight:600;margin-bottom:4px;">No Applications Found</div>
          <p style="font-size:0.88rem;margin:0;">No applications matched your search or status filter.</p>
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th class="col-ref">Reference Number</th>
            <th class="col-name">Applicant Name</th>
            <th class="col-program">Desired Degree Program</th>
            <th class="col-date">Submission Date</th>
            <th class="col-status">Application Status</th>
            <th class="col-verified">Email Verification</th>
            <th class="col-decision">Decision Notification</th>
            <th class="col-actions" style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${apps.map((app) => `
            <tr>
              <td class="col-ref">
                <span class="admin-code-badge ref-badge">${escapeHtml(app.referenceNumber)}</span>
              </td>
              <td class="col-name">
                <div class="admin-user-cell">
                  <div class="admin-user-name">${escapeHtml(app.fullName)}</div>
                  <div class="admin-user-sub">${escapeHtml(app.email)}</div>
                </div>
              </td>
              <td class="col-program">
                <div class="admin-program-title">${escapeHtml(app.desiredProgram)}</div>
                ${app.approvedProgram ? `<div class="admin-approved-tag">&check; Approved: ${escapeHtml(app.approvedProgram)}</div>` : ""}
              </td>
              <td class="col-date"><span class="admin-date-text">${escapeHtml(app.submittedDate || "—")}</span></td>
              <td class="col-status">${getStatusBadge(app.status)}</td>
              <td class="col-verified">
                ${app.emailVerified
                  ? `<span class="admin-badge badge-active">&check; Verified</span>`
                  : `<span class="admin-badge badge-warning">Unverified</span>`}
              </td>
              <td class="col-decision">
                ${app.approvalEmailSent
                  ? `<span class="admin-badge badge-active" title="Dispatched at ${escapeHtml(app.approvalEmailSentAt || "")}">&check; Email Sent</span>`
                  : `<span class="admin-badge badge-neutral">— None</span>`}
              </td>
              <td class="col-actions" style="text-align:right;">
                <div class="admin-actions-cell" style="justify-content:flex-end;">
                  <button type="button" class="admin-btn-action btn-action-details" data-app-action="details" data-ref="${escapeHtml(app.referenceNumber)}" title="View complete application record">
                    Details
                  </button>
                  <button type="button" class="admin-btn-action btn-action-review" data-app-action="review" data-ref="${escapeHtml(app.referenceNumber)}" title="Review decision & notify applicant">
                    Review Decision
                  </button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="admin-table-footer">
        <span>Showing <strong>${apps.length}</strong> of <strong>${total}</strong> application(s)</span>
      </div>
    `;

    wrap.querySelectorAll("[data-app-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-app-action");
        const ref = btn.getAttribute("data-ref");
        const app = apps.find((a) => a.referenceNumber === ref);
        if (!app) return;

        if (action === "details") {
          openApplicationDetailsModal(app);
        } else if (action === "review") {
          openApplicationDecisionModal(app);
        }
      });
    });
  }

  function openApplicationDetailsModal(app) {
    const html = `
      <div style="font-size:0.92rem;line-height:1.6;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-family:monospace;font-weight:700;font-size:1.1rem;color:#0f2b5c;">
              ${escapeHtml(app.referenceNumber)}
            </span>
            ${getStatusBadge(app.status)}
          </div>
          <div style="font-size:1.1rem;font-weight:600;color:var(--text-main);">${escapeHtml(app.fullName)}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">${escapeHtml(app.email)} &bull; ${escapeHtml(app.contactNumber || "N/A")}</div>
        </div>

        <div class="admin-form-grid" style="gap:12px;margin-bottom:16px;">
          <div>
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Date of Birth</span>
            <div>${escapeHtml(app.dateOfBirthFormatted || app.dateOfBirth || "—")}</div>
          </div>
          <div>
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Applicant Type</span>
            <div>${escapeHtml(app.applicantType || "—")}</div>
          </div>
          <div>
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Desired Program</span>
            <div>${escapeHtml(app.desiredProgram || "—")}</div>
          </div>
          <div>
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Second Choice Program</span>
            <div>${escapeHtml(app.secondChoiceProgram || "None")}</div>
          </div>
          <div>
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Previous School</span>
            <div>${escapeHtml(app.previousSchool || "—")}</div>
          </div>
          <div>
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Year Graduated / Completed</span>
            <div>${escapeHtml(app.graduationYear || "—")}</div>
          </div>
          <div class="full-width">
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Address</span>
            <div>${escapeHtml(app.address || "—")}</div>
          </div>
          <div class="full-width">
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Educational Background / Strand</span>
            <div>${escapeHtml(app.educationalBackground || "—")}</div>
          </div>
          <div class="full-width">
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Administrative Remarks</span>
            <div style="font-style:italic;color:var(--text-secondary);">${escapeHtml(app.remarks || "No remarks provided.")}</div>
          </div>
        </div>

        <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" class="btn btn-secondary" id="closeAppDetailsBtn">Close</button>
          <button type="button" class="btn btn-primary" id="reviewFromDetailsBtn">Review Decision</button>
        </div>
      </div>
    `;

    openModal(`Application Details: ${app.referenceNumber}`, html, (bodyEl) => {
      bodyEl.querySelector("#closeAppDetailsBtn").addEventListener("click", closeModal);
      bodyEl.querySelector("#reviewFromDetailsBtn").addEventListener("click", () => {
        closeModal();
        openApplicationDecisionModal(app);
      });
    });
  }

  function openApplicationDecisionModal(app) {
    const html = `
      <form id="adminDecisionForm" novalidate style="font-size:0.92rem;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:16px;">
          <div style="font-family:monospace;font-weight:700;color:#0f2b5c;">${escapeHtml(app.referenceNumber)}</div>
          <div style="font-weight:600;">${escapeHtml(app.fullName)} &bull; <span style="font-size:0.85rem;color:var(--text-secondary);">${escapeHtml(app.email)}</span></div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">Applied for: ${escapeHtml(app.desiredProgram)}</div>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label" for="decisionStatusSelect">Application Decision <span class="req">*</span></label>
          <select id="decisionStatusSelect" name="status" class="form-control" required>
            <option value="Under Review" ${app.status === "Under Review" ? "selected" : ""}>Under Review</option>
            <option value="Approved" ${app.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Rejected" ${app.status === "Rejected" ? "selected" : ""}>Rejected</option>
            <option value="Pending" ${app.status === "Pending" ? "selected" : ""}>Pending</option>
          </select>
        </div>

        <div class="form-group" id="approvedProgramGroup" style="margin-bottom:14px;${app.status === "Approved" ? "" : "display:none;"}">
          <label class="form-label" for="decisionProgramInput">Approved Degree Program <span class="req">*</span></label>
          <input
            type="text"
            id="decisionProgramInput"
            name="approvedProgram"
            class="form-control"
            value="${escapeHtml(app.approvedProgram || app.desiredProgram || "Bachelor of Science in Information Technology")}"
          />
          <span style="font-size:0.78rem;color:var(--text-secondary);display:block;margin-top:4px;">
            This program title will be included in the official approval email sent to the applicant.
          </span>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label" for="decisionRemarksInput">Remarks / Admission Office Notes</label>
          <textarea
            id="decisionRemarksInput"
            name="remarks"
            class="form-control"
            rows="3"
            placeholder="e.g. Approved by Admissions Committee. Submitted documents validated."
          >${escapeHtml(app.remarks || "")}</textarea>
        </div>

        <div id="decisionAlertBox" class="alert alert-info" style="font-size:0.84rem;margin-bottom:14px;${app.status === "Approved" ? "" : "display:none;"}">
          <strong>Automated Email Notification:</strong> Approving this application will automatically dispatch an official email to <strong>${escapeHtml(app.email)}</strong> with subject <code>BANTUG UNIVERSITY – Application Approved</code>.
        </div>

        <div id="decisionFormError" class="field-error" style="margin-bottom:12px;"></div>

        <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" class="btn btn-secondary" id="cancelDecisionBtn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="submitDecisionBtn">Submit Decision</button>
        </div>
      </form>
    `;

    openModal(`Review Application: ${app.referenceNumber}`, html, (bodyEl) => {
      bodyEl.querySelector("#cancelDecisionBtn").addEventListener("click", closeModal);
      const form = bodyEl.querySelector("#adminDecisionForm");
      const statusSel = bodyEl.querySelector("#decisionStatusSelect");
      const progGroup = bodyEl.querySelector("#approvedProgramGroup");
      const alertBox = bodyEl.querySelector("#decisionAlertBox");

      statusSel.addEventListener("change", () => {
        const isApproved = statusSel.value === "Approved";
        progGroup.style.display = isApproved ? "block" : "none";
        alertBox.style.display = isApproved ? "block" : "none";
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const errBox = bodyEl.querySelector("#decisionFormError");
        errBox.textContent = "";

        const fd = new FormData(form);
        const newStatus = fd.get("status");
        const approvedProgram = String(fd.get("approvedProgram") || "").trim();
        const remarks = String(fd.get("remarks") || "").trim();

        const payload = {
          status: newStatus,
          remarks,
          approvedProgram: newStatus === "Approved" ? approvedProgram : undefined
        };

        const subBtn = bodyEl.querySelector("#submitDecisionBtn");
        subBtn.disabled = true;
        subBtn.textContent = "Updating...";

        const res = await StudentHubStorage.updateAdminApplicationStatus(app.referenceNumber, payload);
        if (!res.ok) {
          errBox.textContent = res.error || "Failed to update application decision.";
          subBtn.disabled = false;
          subBtn.textContent = "Submit Decision";
          return;
        }

        closeModal();
        showToast(
          newStatus === "Approved"
            ? `Application ${app.referenceNumber} approved! Official confirmation email dispatched.`
            : `Application ${app.referenceNumber} status updated to "${newStatus}".`,
          "success"
        );

        loadApplicationsTable();
      });
    });
  }

  // ==========================================================================
  // 4. ADMIN AUDIT TRAIL / LOGS
  // ==========================================================================
  async function renderLogs() {
    const container = document.getElementById("adminLogsContainer");
    if (!container) return;

    container.innerHTML = `
      <!-- Header -->
      <div class="admin-header-card">
        <div class="admin-header-top">
          <div class="admin-title-group">
            <h2>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              Audit Trail &amp; Activity Logs
            </h2>
            <p class="admin-subtitle">
              Immutable record of system security events, authentication attempts, user modifications, and application status decisions.
            </p>
          </div>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="admin-toolbar">
        <div class="admin-toolbar-left">
          <div class="admin-search-box">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="adminLogSearchInput"
              class="form-control form-control-sm"
              placeholder="Search by actor, action, or details..."
              value="${escapeHtml(activeLogsFilter.search)}"
            />
          </div>

          <div class="admin-filter-group">
            <label for="adminLogActionFilter">Action:</label>
            <select id="adminLogActionFilter" class="form-control form-control-sm">
              <option value="all">All Actions</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="USER_LOGOUT">USER_LOGOUT</option>
              <option value="USER_CREATED">USER_CREATED</option>
              <option value="USER_UPDATED">USER_UPDATED</option>
              <option value="ACCOUNT_ACTIVATED">ACCOUNT_ACTIVATED</option>
              <option value="ACCOUNT_DEACTIVATED">ACCOUNT_DEACTIVATED</option>
              <option value="PASSWORD_RESET_INITIATED">PASSWORD_RESET_INITIATED</option>
              <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
              <option value="APPLICATION_STATUS_UPDATED">APPLICATION_STATUS_UPDATED</option>
            </select>
          </div>
        </div>

        <div class="admin-toolbar-right">
          <button type="button" class="btn btn-sm btn-secondary" id="adminLogRefreshBtn">Refresh Trail</button>
        </div>
      </div>

      <!-- Logs Table Card -->
      <div class="admin-table-card">
        <div id="adminLogsTableWrap" class="admin-table-responsive">
          <div style="padding:40px;text-align:center;color:var(--text-secondary);">
            <div class="spinner" style="margin-bottom:12px;"></div>
            Loading audit trail...
          </div>
        </div>
      </div>
    `;

    const searchInput = container.querySelector("#adminLogSearchInput");
    const actionSelect = container.querySelector("#adminLogActionFilter");
    const refreshBtn = container.querySelector("#adminLogRefreshBtn");

    let timer = null;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          activeLogsFilter.search = searchInput.value.trim();
          loadLogsTable();
        }, 300);
      });
    }

    if (actionSelect) {
      actionSelect.addEventListener("change", () => {
        activeLogsFilter.actionType = actionSelect.value;
        loadLogsTable();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => loadLogsTable());
    }

    await loadLogsTable();
  }

  async function loadLogsTable() {
    const wrap = document.getElementById("adminLogsTableWrap");
    if (!wrap) return;

    const res = await StudentHubStorage.fetchAdminLogs(activeLogsFilter);
    if (!res.ok) {
      wrap.innerHTML = `
        <div style="padding:24px;color:#b91c1c;text-align:center;">
          Failed to load audit trail: ${escapeHtml(res.error || "Unknown error")}
        </div>
      `;
      return;
    }

    const logs = res.data.logs || [];

    if (logs.length === 0) {
      wrap.innerHTML = `
        <div style="padding:48px 24px;text-align:center;color:var(--text-secondary);">
          <div style="font-size:1.05rem;font-weight:600;margin-bottom:4px;">No Audit Logs Found</div>
          <p style="font-size:0.88rem;margin:0;">No log records matched your query.</p>
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Action Type</th>
            <th>Target</th>
            <th>Event Details</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map((log) => `
            <tr>
              <td style="white-space:nowrap;font-size:0.84rem;color:var(--text-secondary);font-family:monospace;">
                ${formatDateTime(log.createdAt)}
              </td>
              <td>
                <div style="font-weight:600;color:var(--text-main);">${escapeHtml(log.actorName || "System")}</div>
                <div style="font-size:0.75rem;">${getRoleBadge(log.actorRole || "system")}</div>
              </td>
              <td>
                <span style="font-family:monospace;font-size:0.82rem;font-weight:700;color:#0f2b5c;">
                  ${escapeHtml(log.actionType)}
                </span>
              </td>
              <td>
                <span style="font-size:0.82rem;font-family:monospace;color:var(--text-secondary);">
                  ${escapeHtml(log.targetType || "record")}:${escapeHtml(log.targetId || "N/A")}
                </span>
              </td>
              <td style="font-size:0.88rem;max-width:400px;line-height:1.4;">
                ${escapeHtml(log.details)}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="admin-table-footer">
        <span>Showing latest <strong>${logs.length}</strong> recorded audit event(s) from MySQL <code>audit_logs</code>.</span>
      </div>
    `;
  }

  // ==========================================================================
  // 5. ADMIN SETTINGS & SECURITY
  // ==========================================================================
  async function renderSettings() {
    const container = document.getElementById("adminSettingsContainer");
    if (!container) return;

    const session = StudentHubStorage.getSession();

    container.innerHTML = `
      <div class="admin-header-card">
        <div class="admin-header-top">
          <div class="admin-title-group">
            <h2>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Administrator Security &amp; Settings
            </h2>
            <p class="admin-subtitle">
              Manage your administrator credentials, configure portal security preferences, and review active sessions.
            </p>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px;">
        <!-- Change Password Card -->
        <div class="admin-table-card">
          <div class="admin-table-header">
            <h3>Change Administrator Password</h3>
          </div>
          <div style="padding:20px;">
            <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:16px;">
              Update your administrative password. Uses PBKDF2-SHA256 password hashing and immediately terminates all other active sessions for security.
            </p>

            <form id="adminChangePwForm" novalidate>
              <div class="form-group" style="margin-bottom:14px;">
                <label class="form-label" for="adminCurrentPw">Current Password <span class="req">*</span></label>
                <div style="position:relative;">
                  <input type="password" id="adminCurrentPw" name="currentPassword" class="form-control" autocomplete="current-password" required />
                  <button type="button" class="btn btn-sm btn-outline pw-toggle-inline" data-toggle="adminCurrentPw" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:2px 8px;font-size:0.75rem;">Show</button>
                </div>
                <div class="field-error" data-error-for="currentPassword"></div>
              </div>

              <div class="form-group" style="margin-bottom:14px;">
                <label class="form-label" for="adminNewPw">New Password <span class="req">*</span></label>
                <div style="position:relative;">
                  <input type="password" id="adminNewPw" name="newPassword" class="form-control" autocomplete="new-password" required />
                  <button type="button" class="btn btn-sm btn-outline pw-toggle-inline" data-toggle="adminNewPw" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:2px 8px;font-size:0.75rem;">Show</button>
                </div>
                <!-- Strength bar -->
                <div class="password-strength-wrap">
                  <div class="password-strength-bar">
                    <div id="adminPwStrengthFill" class="password-strength-fill"></div>
                  </div>
                  <div class="password-strength-label">
                    <span>Password Strength:</span>
                    <strong id="adminPwStrengthText">None</strong>
                  </div>
                </div>
                <div class="field-error" data-error-for="newPassword"></div>
              </div>

              <div class="form-group" style="margin-bottom:18px;">
                <label class="form-label" for="adminConfirmPw">Confirm New Password <span class="req">*</span></label>
                <div style="position:relative;">
                  <input type="password" id="adminConfirmPw" name="confirmPassword" class="form-control" autocomplete="new-password" required />
                  <button type="button" class="btn btn-sm btn-outline pw-toggle-inline" data-toggle="adminConfirmPw" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:2px 8px;font-size:0.75rem;">Show</button>
                </div>
                <div class="field-error" data-error-for="confirmPassword"></div>
              </div>

              <div id="adminChangePwAlert" class="field-error" style="margin-bottom:14px;" role="alert"></div>

              <button type="submit" class="btn btn-primary" id="adminSubmitPwChangeBtn" style="width:100%;">
                Update Administrator Password
              </button>
            </form>
          </div>
        </div>

        <!-- Account Profile & Session Details Card -->
        <div class="admin-table-card">
          <div class="admin-table-header">
            <h3>Connected Administrator Profile</h3>
          </div>
          <div style="padding:20px;font-size:0.92rem;line-height:1.6;">
            <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">System Administrator Name</span>
              <div style="font-weight:600;font-size:1.05rem;color:var(--text-main);">${escapeHtml(session?.displayName || "System Administrator")}</div>
            </div>

            <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Root Username</span>
              <div style="font-family:monospace;font-weight:700;color:#0f2b5c;">@${escapeHtml(session?.identifier || "admin")}</div>
            </div>

            <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Role &amp; Privilege Level</span>
              <div>
                <span class="admin-badge badge-admin">ROOT ADMINISTRATOR</span>
                <span class="admin-badge badge-active">FULL SYSTEM CONTROL</span>
              </div>
            </div>

            <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;font-weight:600;">Connected MySQL Database</span>
              <div style="font-family:monospace;font-size:0.88rem;color:var(--text-main);">bantug_university_db &bull; localhost:3306</div>
            </div>

            <div style="margin-top:20px;">
              <button type="button" class="btn btn-outline btn-danger-action" id="adminSignOutBtn" style="width:100%;">
                Sign Out of Admin Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Inline password toggles
    container.querySelectorAll(".pw-toggle-inline").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-toggle");
        const input = container.querySelector(`#${targetId}`);
        if (!input) return;
        const isPass = input.type === "password";
        input.type = isPass ? "text" : "password";
        btn.textContent = isPass ? "Hide" : "Show";
      });
    });

    // Password strength check
    const newPwInput = container.querySelector("#adminNewPw");
    const fillEl = container.querySelector("#adminPwStrengthFill");
    const textEl = container.querySelector("#adminPwStrengthText");

    if (newPwInput && fillEl && textEl) {
      newPwInput.addEventListener("input", () => {
        const str = checkPasswordStrength(newPwInput.value);
        fillEl.style.width = `${str.score}%`;
        fillEl.style.backgroundColor = str.color;
        textEl.textContent = str.label;
        textEl.style.color = str.color;
      });
    }

    // Sign out button
    container.querySelector("#adminSignOutBtn")?.addEventListener("click", async () => {
      const confirmed = await confirmDialog({
        title: "Sign Out of Administrator Panel?",
        message: "Your administrator session token will be invalidated and you will be returned to the public login page.",
        confirmText: "Sign Out",
        danger: false
      });
      if (confirmed) {
        if (typeof StudentHubStorage.logoutFromDatabase === "function") {
          await StudentHubStorage.logoutFromDatabase();
        }
        StudentHubStorage.clearSession();
        window.location.reload();
      }
    });

    // Change password form
    const form = container.querySelector("#adminChangePwForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormErrors(form);
        const alertBox = container.querySelector("#adminChangePwAlert");
        alertBox.textContent = "";

        const fd = new FormData(form);
        const currentPassword = String(fd.get("currentPassword") || "").trim();
        const newPassword = String(fd.get("newPassword") || "").trim();
        const confirmPassword = String(fd.get("confirmPassword") || "").trim();

        let hasError = false;
        if (!currentPassword) {
          setFieldError(form, "currentPassword", "Current password is required.");
          hasError = true;
        }
        if (!newPassword || newPassword.length < 8) {
          setFieldError(form, "newPassword", "New password must be at least 8 characters long.");
          hasError = true;
        }
        if (newPassword !== confirmPassword) {
          setFieldError(form, "confirmPassword", "Passwords do not match.");
          hasError = true;
        }
        if (hasError) return;

        const subBtn = container.querySelector("#adminSubmitPwChangeBtn");
        subBtn.disabled = true;
        subBtn.textContent = "Updating Password...";

        try {
          const res = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...StudentHubStorage.getAuthHeaders()
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
              confirmPassword
            })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            alertBox.textContent = data.message || "Failed to update password. Please check your current password.";
            subBtn.disabled = false;
            subBtn.textContent = "Update Administrator Password";
            return;
          }

          form.reset();
          if (fillEl) fillEl.style.width = "0%";
          if (textEl) textEl.textContent = "None";
          showToast("Administrator password updated successfully!", "success");

          // Update active session in storage
          const curSess = StudentHubStorage.getSession();
          if (curSess) {
            curSess.mustChangePassword = false;
            StudentHubStorage.saveSession(curSess, true);
          }

          subBtn.disabled = false;
          subBtn.textContent = "Update Administrator Password";
        } catch (_) {
          alertBox.textContent = "Network error: Unable to contact server.";
          subBtn.disabled = false;
          subBtn.textContent = "Update Administrator Password";
        }
      });
    }
  }

  // ==========================================================================
  // 6. MANDATORY FIRST-TIME PASSWORD CHANGE PROMPT
  // ==========================================================================
  function promptMustChangePassword() {
    const html = `
      <form id="adminForcedPwForm" novalidate style="font-size:0.92rem;">
        <div class="alert alert-warning" style="margin-bottom:16px;">
          <strong>Security Action Required:</strong> Your account is currently using the initial setup password. To protect the portal, you must set a new personal password before accessing administrative tools.
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label" for="forcedCurrentPw">Current Password <span class="req">*</span></label>
          <input type="password" id="forcedCurrentPw" name="currentPassword" class="form-control" placeholder="Enter ChangeMeAdmin2026!" required />
          <div class="field-error" data-error-for="currentPassword"></div>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label" for="forcedNewPw">New Secure Password <span class="req">*</span></label>
          <input type="password" id="forcedNewPw" name="newPassword" class="form-control" placeholder="At least 8 characters with letters & numbers" required />
          <div class="password-strength-wrap">
            <div class="password-strength-bar">
              <div id="forcedPwStrengthFill" class="password-strength-fill"></div>
            </div>
            <div class="password-strength-label">
              <span>Password Strength:</span>
              <strong id="forcedPwStrengthText">None</strong>
            </div>
          </div>
          <div class="field-error" data-error-for="newPassword"></div>
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label" for="forcedConfirmPw">Confirm New Password <span class="req">*</span></label>
          <input type="password" id="forcedConfirmPw" name="confirmPassword" class="form-control" placeholder="Re-enter new password" required />
          <div class="field-error" data-error-for="confirmPassword"></div>
        </div>

        <div id="forcedPwAlert" class="field-error" style="margin-bottom:14px;" role="alert"></div>

        <button type="submit" class="btn btn-primary" id="forcedPwSubmitBtn" style="width:100%;">
          Set New Password &amp; Continue
        </button>
      </form>
    `;

    openModal("Mandatory Password Update", html, (bodyEl) => {
      const form = bodyEl.querySelector("#adminForcedPwForm");
      const newPw = bodyEl.querySelector("#forcedNewPw");
      const fillEl = bodyEl.querySelector("#forcedPwStrengthFill");
      const textEl = bodyEl.querySelector("#forcedPwStrengthText");

      newPw.addEventListener("input", () => {
        const str = checkPasswordStrength(newPw.value);
        fillEl.style.width = `${str.score}%`;
        fillEl.style.backgroundColor = str.color;
        textEl.textContent = str.label;
        textEl.style.color = str.color;
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormErrors(form);
        const alertBox = bodyEl.querySelector("#forcedPwAlert");
        alertBox.textContent = "";

        const fd = new FormData(form);
        const currentPassword = String(fd.get("currentPassword") || "").trim();
        const newPassword = String(fd.get("newPassword") || "").trim();
        const confirmPassword = String(fd.get("confirmPassword") || "").trim();

        let hasError = false;
        if (!currentPassword) {
          setFieldError(form, "currentPassword", "Current password is required.");
          hasError = true;
        }
        if (!newPassword || newPassword.length < 8) {
          setFieldError(form, "newPassword", "New password must be at least 8 characters long.");
          hasError = true;
        }
        if (newPassword !== confirmPassword) {
          setFieldError(form, "confirmPassword", "Passwords do not match.");
          hasError = true;
        }
        if (hasError) return;

        const subBtn = bodyEl.querySelector("#forcedPwSubmitBtn");
        subBtn.disabled = true;
        subBtn.textContent = "Updating Password...";

        try {
          const res = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...StudentHubStorage.getAuthHeaders()
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
              confirmPassword
            })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            alertBox.textContent = data.message || "Failed to update password. Current password is incorrect.";
            subBtn.disabled = false;
            subBtn.textContent = "Set New Password & Continue";
            return;
          }

          const curSess = StudentHubStorage.getSession();
          if (curSess) {
            curSess.mustChangePassword = false;
            StudentHubStorage.saveSession(curSess, true);
          }

          closeModal();
          showToast("Password updated successfully! Welcome to the Admin Panel.", "success");
        } catch (_) {
          alertBox.textContent = "Network error: Unable to reach server.";
          subBtn.disabled = false;
          subBtn.textContent = "Set New Password & Continue";
        }
      });
    });
  }

  return {
    renderDashboard,
    renderUsers,
    renderApplications,
    renderLogs,
    renderSettings,
    openAddUserModal,
    promptMustChangePassword
  };
})();

window.StudentHubAdmin = StudentHubAdmin;

