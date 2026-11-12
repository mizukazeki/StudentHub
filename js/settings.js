/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 9: Portal Settings & Data Management (settings.js)
 * Manages Light/Dark mode, notification preferences, academic & account
 * preferences, session info, BANTUG UNIVERSITY logo configuration, role
 * switching, JSON backup export, and sample data reset.
 * ============================================================================
 */

const StudentHubSettings = (function () {
  const {
    escapeHtml,
    clearFormErrors,
    setFieldError,
    confirmDialog,
    showToast,
    navigateTo,
    logoutToLogin,
    refreshAll
  } = window.StudentHubApp;

  function render() {
    const container = document.getElementById("settingsContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const { settings, profile } = state;
    const session = StudentHubStorage.getSession();
    const activeRole = session ? session.role : "student";
    const accountIdentifier =
      activeRole === "student"
        ? profile.studentNumber || "2025-BSIT-0202"
        : (session && (session.username || session.email)) || activeRole.toUpperCase();
    const displayTerm =
      profile.academicTerm || profile.academicYearTerm || "2nd Semester, AY 2026\u20132027";
    const accountEmail =
      activeRole === "student"
        ? profile.email || "Not set"
        : (session && session.email) || profile.email || "University Portal Account";

    container.innerHTML = `
      <!-- 1. Settings Overview Header -->
      <div class="section-header settings-overview-header">
        <div class="section-header-info">
          <h2 id="settingsSectionTitle">Settings</h2>
          <p id="settingsSectionSubtitle">
            Manage your appearance preferences, notification alerts, account display settings, session access, and portal data.
          </p>
          <div class="settings-overview-pills">
            <span class="badge badge-primary" id="settingsRolePill">Role: ${escapeHtml(
              activeRole.toUpperCase()
            )}</span>
            <span class="badge badge-info" id="settingsAccountPill">Account: ${escapeHtml(
              accountIdentifier
            )}</span>
            <span class="badge badge-neutral" id="settingsTermPill">${escapeHtml(
              displayTerm
            )}</span>
          </div>
        </div>
        <div class="section-header-actions">
          <button type="button" class="btn btn-secondary" id="settingsSwitchRoleBtn">
            Switch Portal Role
          </button>
          <button type="button" class="btn btn-outline-danger" id="settingsLogoutBtn">
            Log Out to Login Screen
          </button>
        </div>
      </div>

      <div class="settings-grid">
        <!-- 2. Appearance Settings -->
        <div class="card settings-card">
          <div class="card-header">
            <h3 class="card-title">Appearance Settings</h3>
            <span class="badge badge-info">${
              settings.theme === "dark" ? "Dark Mode" : "Light Mode"
            }</span>
          </div>
          <p class="settings-card-desc">
            Customize the portal visual theme and navigation sidebar layout across all modules.
          </p>

          <div class="setting-item">
            <div class="setting-info">
              <h4>Dark Mode Theme</h4>
              <p>Switch between BANTUG UNIVERSITY light mode and high-contrast dark mode (synced with header theme toggle).</p>
            </div>
            <label class="switch" aria-label="Toggle Dark Mode">
              <input type="checkbox" id="setDarkModeToggle" ${
                settings.theme === "dark" ? "checked" : ""
              } />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4>Compact Sidebar on Desktop</h4>
              <p>Collapse the left navigation sidebar into an icon-only rail on larger screens.</p>
            </div>
            <label class="switch" aria-label="Toggle Compact Sidebar">
              <input type="checkbox" id="setSidebarCollapseToggle" ${
                settings.sidebarCollapsed ? "checked" : ""
              } />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- 3. Notification Settings -->
        <div class="card settings-card">
          <div class="card-header">
            <h3 class="card-title">Notification Settings</h3>
            <span class="badge badge-primary">Real-Time Sync</span>
          </div>
          <p class="settings-card-desc">
            Control how assignment deadlines, unread announcements, and navigation counters appear in your portal.
          </p>

          <div class="setting-item">
            <div class="setting-info">
              <h4>Overdue Task &amp; Deadline Alerts</h4>
              <p>Display overdue assignment reminders inside the topbar notification center.</p>
            </div>
            <label class="switch" aria-label="Toggle Deadline Reminders">
              <input type="checkbox" id="setDeadlineRemindersToggle" ${
                settings.deadlineReminders !== false ? "checked" : ""
              } />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4>Sidebar &amp; Topbar Counter Badges</h4>
              <p>Show unread announcement and pending task count badges in navigation.</p>
            </div>
            <label class="switch" aria-label="Toggle Navigation Badges">
              <input type="checkbox" id="setUnreadBadgesToggle" ${
                settings.unreadBadges !== false ? "checked" : ""
              } />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- 4. Account & Academic Preferences -->
        <div class="card settings-card settings-card-full">
          <div class="card-header">
            <h3 class="card-title">Account Preferences</h3>
            ${
              activeRole === "student"
                ? `<button type="button" class="btn-text" id="goFullProfileBtn">Full Student Profile &rarr;</button>`
                : activeRole === "faculty"
                ? `<button type="button" class="btn-text" id="goFullProfileBtn">Full Faculty Profile &rarr;</button>`
                : ""
            }
          </div>
          <p class="settings-card-desc">
            Review your connected portal account details and update your display name or current academic term.
          </p>

          <div class="settings-account-summary">
            <div>
              <span class="settings-summary-label">Account ID</span>
              <span class="settings-summary-value">${escapeHtml(accountIdentifier)}</span>
            </div>
            <div>
              <span class="settings-summary-label">Email Address</span>
              <span class="settings-summary-value">${escapeHtml(accountEmail)}</span>
            </div>
            <div>
              <span class="settings-summary-label">Section / Affiliation</span>
              <span class="settings-summary-value">${escapeHtml(
                profile.section || "BANTUG UNIVERSITY"
              )}</span>
            </div>
          </div>

          <form id="quickPrefsForm" novalidate>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="prefDisplayName">Display Name <span class="req">*</span></label>
                <input
                  type="text"
                  id="prefDisplayName"
                  name="fullName"
                  class="form-control"
                  value="${escapeHtml(profile.fullName)}"
                />
                <div class="field-error" data-error-for="fullName"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="prefTerm">Current Academic Term <span class="req">*</span></label>
                <input
                  type="text"
                  id="prefTerm"
                  name="academicTerm"
                  class="form-control"
                  value="${escapeHtml(displayTerm)}"
                />
                <div class="field-error" data-error-for="academicTerm"></div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" id="cancelQuickPrefsBtn">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                Save Academic Preferences
              </button>
            </div>
          </form>
        </div>

        <!-- 5. Security & Session Information -->
        <div class="card settings-card">
          <div class="card-header">
            <h3 class="card-title">Security &amp; Session Information</h3>
            <span class="badge badge-success">Active Session</span>
          </div>
          <p class="settings-card-desc">
            Current authentication session status and role-based access summary. Passwords are never displayed in portal settings.
          </p>

          <div class="settings-session-box">
            <div>
              <span class="settings-summary-label">Signed-In Role</span>
              <span class="settings-summary-value">${escapeHtml(activeRole.toUpperCase())}</span>
            </div>
            <div>
              <span class="settings-summary-label">Session Account</span>
              <span class="settings-summary-value">${escapeHtml(accountIdentifier)}</span>
            </div>
          </div>

          <div class="settings-logo-actions">
            <button type="button" class="btn btn-sm btn-secondary" id="settingsSecSwitchRoleBtn">
              Switch Portal Role
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" id="settingsSecLogoutBtn">
              Sign Out Session
            </button>
          </div>
        </div>

        <!-- 6. BANTUG UNIVERSITY Logo & Branding Configuration -->
        <div class="card settings-card">
          <div class="card-header">
            <h3 class="card-title">BANTUG UNIVERSITY Logo Configuration</h3>
            <span class="badge badge-primary">Aspect Ratio Preserved</span>
          </div>
          <p class="settings-card-desc">
            Default path: <code>assets/images/bantug-university-logo.png</code>. You may also preview a custom image file locally.
          </p>

          <div class="settings-logo-preview-box">
            <img
              src="${escapeHtml(StudentHubStorage.getLogoSrc())}"
              alt="BANTUG UNIVERSITY Logo Preview"
              class="bu-logo-img"
              style="max-height:64px;max-width:120px;"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="bu-logo-fallback-sm" style="display:none;">BU</div>
            <div>
              <div style="font-size:0.88rem;font-weight:600;">Active Logo Source</div>
              <div style="font-size:0.76rem;color:var(--text-muted);word-break:break-all;">
                ${
                  settings.customLogoDataUrl
                    ? "Custom Uploaded Logo (Stored in localStorage)"
                    : "assets/images/bantug-university-logo.png"
                }
              </div>
            </div>
          </div>

          <div class="settings-logo-actions">
            <label for="uploadLogoFileInput" class="btn btn-sm btn-primary" style="cursor:pointer;">
              Select Logo Image File
            </label>
            <input type="file" id="uploadLogoFileInput" accept="image/*" hidden />
            <button type="button" class="btn btn-sm btn-secondary" id="resetDefaultLogoPathBtn">
              Use Default Logo Path
            </button>
          </div>
        </div>

        <!-- 7. Browser localStorage Data Management & Reset Controls -->
        <div class="card settings-card settings-card-full">
          <div class="card-header">
            <h3 class="card-title">Browser localStorage Data Management</h3>
            <span class="badge badge-info">Key: ${escapeHtml(StudentHubStorage.STORAGE_KEY)}</span>
          </div>

          <p class="settings-card-desc">
            Portal records (the ${(state.schedules || []).length} <strong>BSIT 2-2</strong> subjects, profiles, attendance logs, grades, tasks, announcements, learning resources, and applicant records) are persisted in your browser's <code>localStorage</code>.
          </p>

          <div class="settings-data-panel">
            <div>
              <h4 style="font-size:0.95rem;">Demonstration Data Actions</h4>
              <p style="font-size:0.8rem;color:var(--text-muted);">
                Currently storing ${(state.schedules || []).length} subjects, ${
      (state.attendance || []).length
    } attendance logs, ${(state.tasks || []).length} tasks, ${
      (state.announcements || []).length
    } announcements, ${(state.resources || []).length} resources, and ${
      (state.applications || []).length
    } applicant records.
              </p>
            </div>

            <div class="settings-data-actions">
              <button type="button" class="btn btn-secondary" id="exportDataJsonBtn">
                Export JSON Backup
              </button>
              <button type="button" class="btn btn-outline-danger" id="clearDemoDataBtn">
                Clear Demonstration Data
              </button>
              <button type="button" class="btn btn-primary" id="resetSampleDataBtn">
                Reset to Default BSIT 2-2 Data
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind Role Switcher & Logout
    const openRoleSwitcher = () => {
      if (window.StudentHubAuth) window.StudentHubAuth.openDemoRoleLauncher();
    };
    const switchRoleBtn = document.getElementById("settingsSwitchRoleBtn");
    if (switchRoleBtn) switchRoleBtn.addEventListener("click", openRoleSwitcher);
    const secSwitchRoleBtn = document.getElementById("settingsSecSwitchRoleBtn");
    if (secSwitchRoleBtn) secSwitchRoleBtn.addEventListener("click", openRoleSwitcher);

    const logoutBtn = document.getElementById("settingsLogoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutToLogin);
    const secLogoutBtn = document.getElementById("settingsSecLogoutBtn");
    if (secLogoutBtn) secLogoutBtn.addEventListener("click", logoutToLogin);

    // Bind Toggle Switches
    const darkToggle = document.getElementById("setDarkModeToggle");
    if (darkToggle) {
      darkToggle.addEventListener("change", () => {
        const currState = StudentHubStorage.getState();
        currState.settings.theme = darkToggle.checked ? "dark" : "light";
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast(
          `Theme set to ${darkToggle.checked ? "Dark" : "Light"} Mode.`,
          "success"
        );
      });
    }

    const collapseToggle = document.getElementById("setSidebarCollapseToggle");
    if (collapseToggle) {
      collapseToggle.addEventListener("change", () => {
        const currState = StudentHubStorage.getState();
        currState.settings.sidebarCollapsed = collapseToggle.checked;
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast(
          collapseToggle.checked ? "Compact sidebar enabled." : "Expanded sidebar enabled.",
          "info"
        );
      });
    }

    const deadlineToggle = document.getElementById("setDeadlineRemindersToggle");
    if (deadlineToggle) {
      deadlineToggle.addEventListener("change", () => {
        const currState = StudentHubStorage.getState();
        currState.settings.deadlineReminders = deadlineToggle.checked;
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast("Deadline notification preference saved.", "success");
      });
    }

    const badgesToggle = document.getElementById("setUnreadBadgesToggle");
    if (badgesToggle) {
      badgesToggle.addEventListener("change", () => {
        const currState = StudentHubStorage.getState();
        currState.settings.unreadBadges = badgesToggle.checked;
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast("Navigation badge preference saved.", "success");
      });
    }

    // Bind Logo File Upload & Reset
    const logoFileInput = document.getElementById("uploadLogoFileInput");
    if (logoFileInput) {
      logoFileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          showToast("Please select a valid image file (PNG, JPG, SVG, WebP).", "error");
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const currState = StudentHubStorage.getState();
          currState.settings.customLogoDataUrl = ev.target.result;
          StudentHubStorage.saveState(currState);
          refreshAll();
          showToast("BANTUG UNIVERSITY logo updated across all portals!", "success");
        };
        reader.readAsDataURL(file);
      });
    }

    const resetLogoBtn = document.getElementById("resetDefaultLogoPathBtn");
    if (resetLogoBtn) {
      resetLogoBtn.addEventListener("click", () => {
        const currState = StudentHubStorage.getState();
        currState.settings.customLogoDataUrl = "";
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast("Logo path set to assets/images/bantug-university-logo.png", "info");
      });
    }

    // Bind Go Full Profile
    const goProfBtn = document.getElementById("goFullProfileBtn");
    if (goProfBtn) {
      goProfBtn.addEventListener("click", () => {
        navigateTo(activeRole === "faculty" ? "faculty-profile" : "profile");
      });
    }

    // Bind Quick Preferences Form & Cancel Button
    const prefsForm = document.getElementById("quickPrefsForm");
    const cancelPrefsBtn = document.getElementById("cancelQuickPrefsBtn");
    if (cancelPrefsBtn && prefsForm) {
      cancelPrefsBtn.addEventListener("click", () => {
        clearFormErrors(prefsForm);
        const currState = StudentHubStorage.getState();
        const nameInput = document.getElementById("prefDisplayName");
        const termInput = document.getElementById("prefTerm");
        if (nameInput) nameInput.value = currState.profile.fullName || "";
        if (termInput) {
          termInput.value =
            currState.profile.academicTerm ||
            currState.profile.academicYearTerm ||
            "2nd Semester, AY 2026\u20132027";
        }
        showToast("Reverted unsaved account preference changes.", "info");
      });
    }

    if (prefsForm) {
      prefsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        clearFormErrors(prefsForm);

        const fd = new FormData(prefsForm);
        const fullName = String(fd.get("fullName") || "").trim();
        const academicTerm = String(fd.get("academicTerm") || "").trim();

        let valid = true;
        if (!fullName || fullName.length < 2) {
          setFieldError(prefsForm, "fullName", "Display name cannot be empty.");
          valid = false;
        }
        if (!academicTerm) {
          setFieldError(prefsForm, "academicTerm", "Academic term is required.");
          valid = false;
        }

        if (!valid) return;

        const currState = StudentHubStorage.getState();
        currState.profile.fullName = fullName;
        currState.profile.academicTerm = academicTerm;
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast("Academic preferences saved!", "success");
      });
    }

    // Bind Export JSON Backup
    const exportBtn = document.getElementById("exportDataJsonBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const dataStr = JSON.stringify(StudentHubStorage.getState(), null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bantug-university-portal-backup-${StudentHubStorage.formatLocalDate(
          new Date()
        )}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Exported BANTUG UNIVERSITY JSON backup!", "success");
      });
    }

    // Bind Clear Demonstration Data
    const clearBtn = document.getElementById("clearDemoDataBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        const confirmed = await confirmDialog({
          title: "Clear Demonstration Activity Records",
          message:
            "This will clear entered schedules, entered grades, attendance logs, tasks, announcements, resources, and applicant records while preserving the 9 preloaded BSIT 2-2 subjects (resetting them to 'Schedule not yet provided.' and 'No grade recorded.'). Continue?",
          confirmText: "Clear Records",
          danger: true
        });

        if (confirmed) {
          StudentHubStorage.clearAllDemoRecords();
          refreshAll();
          showToast(
            "Cleared activity records! BSIT 2-2 subjects reset to unscheduled/ungraded state.",
            "warning"
          );
        }
      });
    }

    // Bind Reset to Default Sample Data
    const resetBtn = document.getElementById("resetSampleDataBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", async () => {
        const confirmed = await confirmDialog({
          title: "Reset Portal to Default BSIT 2-2 Dataset",
          message:
            "This will restore the complete original BANTUG UNIVERSITY sample dataset (BSIT 2-2 subjects, faculty directory, attendance logs, tasks, announcements, learning resources, and demo application). Continue?",
          confirmText: "Restore Default Data",
          danger: false
        });

        if (confirmed) {
          StudentHubStorage.resetToSampleData();
          refreshAll();
          showToast("Portal reset to default BANTUG UNIVERSITY BSIT 2-2 dataset!", "success");
        }
      });
    }
  }

  return { render };
})();

window.StudentHubSettings = StudentHubSettings;
