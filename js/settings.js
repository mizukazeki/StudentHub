/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 9: Portal Settings & Data Management (settings.js)
 * Manages Light/Dark mode, notification preferences, BANTUG UNIVERSITY logo
 * configuration, role switching, JSON backup export, and sample data reset.
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

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Portal Settings &amp; Data Management</h2>
          <p>Customize appearance, university logo, notification preferences, active demo role, and localStorage data.</p>
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
        <!-- Card 1: Appearance & Notification Preferences -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Appearance &amp; Notification Preferences</h3>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4>Dark Mode Theme</h4>
              <p>Switch between BANTUG UNIVERSITY light mode and high-contrast dark mode.</p>
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

          <div class="setting-item">
            <div class="setting-info">
              <h4>Overdue Task &amp; Deadline Alerts</h4>
              <p>Display overdue task alerts inside the topbar notification center.</p>
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

        <!-- Card 2: BANTUG UNIVERSITY Logo & Branding Configuration -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">BANTUG UNIVERSITY Logo Configuration</h3>
            <span class="badge badge-primary">Aspect Ratio Preserved</span>
          </div>

          <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:14px;">
            The portal automatically loads your official logo from:<br/>
            <code>assets/images/bantug-university-logo.png</code><br/>
            You can either place your image file at that path in the project folder OR select the image file directly below to preview it across the Login screen, Sidebar, and Applicant Portal.
          </p>

          <div style="display:flex;align-items:center;gap:16px;padding:14px;background:var(--bg-surface-alt);border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-bottom:14px;">
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

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <label for="uploadLogoFileInput" class="btn btn-sm btn-primary" style="cursor:pointer;">
              Select Logo Image File
            </label>
            <input type="file" id="uploadLogoFileInput" accept="image/*" hidden />
            <button type="button" class="btn btn-sm btn-secondary" id="resetDefaultLogoPathBtn">
              Use assets/images/bantug-university-logo.png
            </button>
          </div>
        </div>

        <!-- Card 3: Quick Profile & Academic Term Preferences -->
        <div class="card" style="grid-column: 1 / -1;">
          <div class="card-header">
            <h3 class="card-title">Academic Term &amp; Display Preferences (Current Role: ${escapeHtml(
              activeRole.toUpperCase()
            )})</h3>
            ${
              activeRole === "student"
                ? `<button type="button" class="btn-text" id="goFullProfileBtn">Full Student Profile &rarr;</button>`
                : activeRole === "faculty"
                ? `<button type="button" class="btn-text" id="goFullProfileBtn">Full Faculty Profile &rarr;</button>`
                : ""
            }
          </div>

          <form id="quickPrefsForm" novalidate>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="prefDisplayName">Student Display Name <span class="req">*</span></label>
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
                  value="${escapeHtml(profile.academicTerm || "2nd Semester, AY 2026–2027")}"
                />
                <div class="field-error" data-error-for="academicTerm"></div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">
                Save Academic Preferences
              </button>
            </div>
          </form>
        </div>

        <!-- Card 4: localStorage Data Management & Reset Controls -->
        <div class="card" style="grid-column: 1 / -1;">
          <div class="card-header">
            <h3 class="card-title">Browser localStorage Data Management</h3>
            <span class="badge badge-info">Key: ${escapeHtml(StudentHubStorage.STORAGE_KEY)}</span>
          </div>

          <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:18px;">
            All BANTUG UNIVERSITY portal records (the 9 preloaded <strong>BSIT 2-2</strong> subjects, student &amp; faculty profiles, attendance logs, grades, tasks, announcements, learning resources, and applicant records) are persisted in your browser's <code>localStorage</code>.
          </p>

          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:16px;background:var(--bg-surface-alt);border:1px solid var(--border-color);border-radius:var(--radius-sm);">
            <div>
              <h4 style="font-size:0.95rem;">Demonstration Data Actions</h4>
              <p style="font-size:0.8rem;color:var(--text-muted);">
                Currently storing ${state.schedules.length} BSIT 2-2 subjects, ${
      state.attendance.length
    } attendance logs, ${state.tasks.length} tasks, ${
      state.announcements.length
    } announcements, ${state.resources.length} resources, and ${
      (state.applications || []).length
    } applicant records.
              </p>
            </div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;">
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
    const switchRoleBtn = document.getElementById("settingsSwitchRoleBtn");
    if (switchRoleBtn) {
      switchRoleBtn.addEventListener("click", () => {
        if (window.StudentHubAuth) window.StudentHubAuth.openDemoRoleLauncher();
      });
    }

    const logoutBtn = document.getElementById("settingsLogoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutToLogin);

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

    // Bind Quick Preferences Form
    const prefsForm = document.getElementById("quickPrefsForm");
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
