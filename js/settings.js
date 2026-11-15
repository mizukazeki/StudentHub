// User settings, password changes, and theme preferences.
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Module 9: Portal Settings & Data Management (settings.js)
 * Manages Light/Dark mode, notification preferences, academic & account
 * preferences, session info, password management, BANTUG UNIVERSITY logo configuration,
 * role switching, JSON backup export, and sample data reset.
 * Supports Student and Faculty roles with role-aware account configurations.
 * ============================================================================
 */

const StudentHubSettings = (function () {
  const {
    escapeHtml,
    clearFormErrors,
    setFieldError,
    openModal,
    closeModal,
    confirmDialog,
    showToast,
    navigateTo,
    logoutToLogin,
    refreshAll
  } = window.StudentHubApp;

  /**
   * Reusable Password Management Dialog Entry Point
   * Securely authenticates current password and updates to PBKDF2 hash via POST /api/auth/change-password
   */
  function openChangePasswordModal() {
    const modalBody = `
      <form id="changePasswordModalForm" class="auth-form" novalidate style="margin-top:4px;">
        <div id="changePasswordModalAlert" class="field-error" style="margin-bottom:12px;font-size:0.86rem;" role="alert"></div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label" for="cpModalCurrentPassword">Current Password <span class="req">*</span></label>
          <div class="password-input-wrap">
            <input
              type="password"
              id="cpModalCurrentPassword"
              name="currentPassword"
              class="form-control"
              autocomplete="current-password"
              placeholder="Enter your current password"
              required
            />
            <button type="button" class="password-toggle-btn" data-toggle-target="cpModalCurrentPassword" aria-label="Toggle password visibility">
              Show
            </button>
          </div>
          <div class="field-error" data-error-for="currentPassword"></div>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label" for="cpModalNewPassword">New Password <span class="req">*</span></label>
          <div class="password-input-wrap">
            <input
              type="password"
              id="cpModalNewPassword"
              name="newPassword"
              class="form-control"
              autocomplete="new-password"
              placeholder="Enter new password (min. 6 characters)"
              required
            />
            <button type="button" class="password-toggle-btn" data-toggle-target="cpModalNewPassword" aria-label="Toggle password visibility">
              Show
            </button>
          </div>
          <div class="field-error" data-error-for="newPassword"></div>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label" for="cpModalConfirmPassword">Confirm New Password <span class="req">*</span></label>
          <div class="password-input-wrap">
            <input
              type="password"
              id="cpModalConfirmPassword"
              name="confirmPassword"
              class="form-control"
              autocomplete="new-password"
              placeholder="Re-enter your new password"
              required
            />
            <button type="button" class="password-toggle-btn" data-toggle-target="cpModalConfirmPassword" aria-label="Toggle password visibility">
              Show
            </button>
          </div>
          <div class="field-error" data-error-for="confirmPassword"></div>
        </div>

        <div class="form-help-text" style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;">
          Password must be at least 6 characters. Passwords are securely hashed using PBKDF2-SHA256 and never stored in plain text.
        </div>

        <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" class="btn btn-secondary" id="cpModalCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="cpModalSubmitBtn">Update Password</button>
        </div>
      </form>
    `;

    openModal("Change Account Password", modalBody, (bodyEl) => {
      const form = bodyEl.querySelector("#changePasswordModalForm");
      const cancelBtn = bodyEl.querySelector("#cpModalCancelBtn");
      const alertEl = bodyEl.querySelector("#changePasswordModalAlert");

      if (cancelBtn) {
        cancelBtn.addEventListener("click", closeModal);
      }

      // Bind Show/Hide password toggles
      bodyEl.querySelectorAll(".password-toggle-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetId = btn.getAttribute("data-toggle-target");
          const input = bodyEl.querySelector(`#${targetId}`);
          if (!input) return;
          const isPassword = input.type === "password";
          input.type = isPassword ? "text" : "password";
          btn.textContent = isPassword ? "Hide" : "Show";
          btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        });
      });

      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          clearFormErrors(form);
          if (alertEl) alertEl.textContent = "";

          const fd = new FormData(form);
          const currentPassword = String(fd.get("currentPassword") || "");
          const newPassword = String(fd.get("newPassword") || "");
          const confirmPassword = String(fd.get("confirmPassword") || "");

          let hasError = false;
          if (!currentPassword) {
            setFieldError(form, "currentPassword", "Current password is required.");
            hasError = true;
          }
          if (!newPassword || newPassword.length < 6) {
            setFieldError(form, "newPassword", "New password must be at least 6 characters long.");
            hasError = true;
          }
          if (newPassword !== confirmPassword) {
            setFieldError(form, "confirmPassword", "New password and confirmation do not match.");
            hasError = true;
          }
          if (newPassword && currentPassword && newPassword === currentPassword) {
            setFieldError(form, "newPassword", "New password must be different from current password.");
            hasError = true;
          }

          if (hasError) return;

          const submitBtn = form.querySelector("#cpModalSubmitBtn");
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Updating...";
          }

          try {
            const session = StudentHubStorage.getSession();
            const token = session ? session.token : "";
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/auth/change-password", {
              method: "POST",
              headers,
              body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword,
                sessionToken: token
              })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              const errMsg = data.message || "Failed to update password. Please check your credentials.";
              if (errMsg.toLowerCase().includes("current password")) {
                setFieldError(form, "currentPassword", errMsg);
              } else if (errMsg.toLowerCase().includes("match")) {
                setFieldError(form, "confirmPassword", errMsg);
              } else if (errMsg.toLowerCase().includes("different") || errMsg.toLowerCase().includes("6 character")) {
                setFieldError(form, "newPassword", errMsg);
              } else if (alertEl) {
                alertEl.textContent = errMsg;
              } else {
                showToast(errMsg, "error");
              }
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Update Password";
              }
              return;
            }

            closeModal();
            showToast("Password updated successfully!", "success");
          } catch (_) {
            if (alertEl) alertEl.textContent = "Network error: Unable to connect to server.";
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Update Password";
            }
          }
        });
      }
    });
  }

  function render() {
    const container = document.getElementById("settingsContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const { settings, profile } = state;
    const session = StudentHubStorage.getSession();
    const activeRole = session ? session.role : "student";

    const facultyProfile = state.facultyProfile || {};
    const facultyId = (session && session.actorId) || facultyProfile.facultyId || "FAC-BU-04";
    const facultyEmail = (session && session.email) || facultyProfile.email || "f.somera.demo@bantug.edu.example";
    const facultyName = facultyProfile.fullName || (session && (session.displayName || session.actorName)) || profile.fullName || "Somera, Fabian";
    const facultyDept = facultyProfile.department || "College of Information Technology";
    const facultySection = facultyProfile.advisorySection || "BSIT 2-2";

    const accountIdentifier =
      activeRole === "student"
        ? profile.studentNumber || "2025-BSIT-0202"
        : activeRole === "faculty"
        ? facultyId
        : (session && (session.username || session.email)) || activeRole.toUpperCase();

    const displayTerm =
      profile.academicTerm || profile.academicYearTerm || "2nd Semester, AY 2026\u20132027";

    const accountEmail =
      activeRole === "student"
        ? profile.email || "Not set"
        : activeRole === "faculty"
        ? facultyEmail
        : (session && session.email) || profile.email || "University Portal Account";

    const accountAffiliation =
      activeRole === "faculty"
        ? `${facultyDept} (${facultySection})`
        : profile.section || "BANTUG UNIVERSITY";

    const isStudent = activeRole === "student";

    let guardianDisplay = "Not provided";
    if (profile.guardianName && profile.guardianContact) {
      guardianDisplay = `${profile.guardianName} (${profile.guardianContact})`;
    } else if (profile.guardianName) {
      guardianDisplay = profile.guardianName;
    } else if (profile.guardianContact) {
      guardianDisplay = profile.guardianContact;
    }

    const studentDob = profile.birthDate || profile.dateOfBirth || "Not provided";
    const studentGender = profile.gender || "Not provided";
    const studentStatus = profile.accountStatus || profile.enrollmentStatus || "Active";

    if (isStudent) {
      // ======================================================================
      // PHASE 4: DEDICATED STUDENT SETTINGS VIEW (VIEW-ONLY OFFICIAL RECORDS)
      // ======================================================================
      container.innerHTML = `
        <!-- 1. Settings Overview Header (Student: No Role Switching) -->
        <div class="section-header settings-overview-header">
          <div class="section-header-info">
            <h2 id="settingsSectionTitle">Settings</h2>
            <p id="settingsSectionSubtitle">
              Review your official university account records, personal details, contact information, and password security.
            </p>
            <div class="settings-overview-pills">
              <span class="badge badge-primary" id="settingsRolePill">Role: STUDENT</span>
              <span class="badge badge-info" id="settingsAccountPill">Account: ${escapeHtml(
                accountIdentifier
              )}</span>
              <span class="badge badge-neutral" id="settingsTermPill">${escapeHtml(
                displayTerm
              )}</span>
            </div>
          </div>
          <div class="section-header-actions">
            <button type="button" class="btn btn-outline-danger" id="settingsLogoutBtn">
              Log Out to Login Screen
            </button>
          </div>
        </div>

        <!-- 2. Administrator-Only Editing Notice Banner -->
        <div class="settings-notice-banner" role="status">
          <div class="settings-notice-icon" aria-hidden="true">ℹ️</div>
          <div class="settings-notice-text">
            <strong>Need to update your personal information?</strong> Please contact the university administrator.
          </div>
        </div>

        <div class="settings-grid">
          <!-- 3. Account Preferences (Read-Only) -->
          <div class="card settings-card settings-card-full">
            <div class="card-header">
              <h3 class="card-title">Account Preferences</h3>
              <button type="button" class="btn-text" id="goFullProfileBtn">Full Student Profile &rarr;</button>
            </div>
            <p class="settings-card-desc">
              Review your connected university student account records and academic enrollment information.
            </p>

            <div class="settings-account-summary">
              <div>
                <span class="settings-summary-label">Student ID</span>
                <span class="settings-summary-value">${escapeHtml(profile.studentNumber || accountIdentifier || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Full Name</span>
                <span class="settings-summary-value">${escapeHtml(profile.fullName || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Email Address</span>
                <span class="settings-summary-value">${escapeHtml(profile.email || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Contact Number</span>
                <span class="settings-summary-value">${escapeHtml(profile.contactNumber || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Course / Program</span>
                <span class="settings-summary-value">${escapeHtml(profile.course || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Year Level</span>
                <span class="settings-summary-value">${escapeHtml(profile.yearLevel || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Section</span>
                <span class="settings-summary-value">${escapeHtml(profile.section || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Academic Term</span>
                <span class="settings-summary-value">${escapeHtml(displayTerm || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Account Status</span>
                <span class="settings-summary-value"><span class="badge badge-success">${escapeHtml(studentStatus)}</span></span>
              </div>
            </div>
          </div>

          <!-- 4. Personal Information (Read-Only) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3 class="card-title">Personal Information</h3>
              <span class="badge badge-info">View-Only</span>
            </div>
            <p class="settings-card-desc">
              Official student identification details on file with the Office of the University Registrar.
            </p>

            <div class="settings-session-box" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
              <div>
                <span class="settings-summary-label">Full Name</span>
                <span class="settings-summary-value">${escapeHtml(profile.fullName || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Date of Birth</span>
                <span class="settings-summary-value">${escapeHtml(studentDob)}</span>
              </div>
              <div>
                <span class="settings-summary-label">Gender</span>
                <span class="settings-summary-value">${escapeHtml(studentGender)}</span>
              </div>
              <div>
                <span class="settings-summary-label">Course / Program</span>
                <span class="settings-summary-value">${escapeHtml(profile.course || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Year Level</span>
                <span class="settings-summary-value">${escapeHtml(profile.yearLevel || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Section</span>
                <span class="settings-summary-value">${escapeHtml(profile.section || "Not provided")}</span>
              </div>
            </div>
          </div>

          <!-- 5. Contact Information (Read-Only) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3 class="card-title">Contact Information</h3>
              <span class="badge badge-info">View-Only</span>
            </div>
            <p class="settings-card-desc">
              Registered contact details and emergency guardian contacts on file for university communications.
            </p>

            <div class="settings-session-box" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
              <div>
                <span class="settings-summary-label">Email Address</span>
                <span class="settings-summary-value">${escapeHtml(profile.email || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Contact Number</span>
                <span class="settings-summary-value">${escapeHtml(profile.contactNumber || "Not provided")}</span>
              </div>
              <div style="grid-column: 1 / -1;">
                <span class="settings-summary-label">Home Address</span>
                <span class="settings-summary-value">${escapeHtml(profile.address || "Not provided")}</span>
              </div>
              <div style="grid-column: 1 / -1;">
                <span class="settings-summary-label">Guardian / Emergency Contact</span>
                <span class="settings-summary-value">${escapeHtml(guardianDisplay)}</span>
              </div>
            </div>
          </div>

          <!-- 6. Appearance Settings (Preserved for Students) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3 class="card-title">Appearance Settings</h3>
              <span class="badge badge-info">${
                settings.theme === "dark" ? "Dark Mode" : "Light Mode"
              }</span>
            </div>
            <p class="settings-card-desc">
              Customize your portal visual theme and navigation sidebar layout.
            </p>

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
          </div>

          <!-- 7. Notification Settings (Preserved for Students) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3 class="card-title">Notification Settings</h3>
              <span class="badge badge-primary">Real-Time Sync</span>
            </div>
            <p class="settings-card-desc">
              Control how assignment deadlines, unread announcements, and navigation counters appear.
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

          <!-- 8. Account Security (Student: Change Password & Sign Out) -->
          <div class="card settings-card settings-card-full">
            <div class="card-header">
              <h3 class="card-title">Account Security</h3>
              <span class="badge badge-success">Active Session</span>
            </div>
            <p class="settings-card-desc">
              Current authentication session status and credential security. Passwords are never stored in plain text.
            </p>

            <div class="settings-session-box">
              <div>
                <span class="settings-summary-label">Signed-In Role</span>
                <span class="settings-summary-value"><span class="badge badge-primary">STUDENT (View-Only Records)</span></span>
              </div>
              <div>
                <span class="settings-summary-label">Session Account</span>
                <span class="settings-summary-value">${escapeHtml(accountIdentifier)}</span>
              </div>
            </div>

            <div class="settings-logo-actions" style="margin-top:14px;display:flex;gap:10px;">
              <button type="button" class="btn btn-sm btn-primary" id="openChangePasswordBtn">
                Change Password
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger" id="settingsSecLogoutBtn">
                Sign Out Session
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // ======================================================================
      // PHASE 5: DEDICATED FACULTY SETTINGS VIEW (VIEW-ONLY OFFICIAL RECORDS)
      // ======================================================================
      container.innerHTML = `
        <!-- 1. Settings Overview Header (Faculty: No Role Switching) -->
        <div class="section-header settings-overview-header">
          <div class="section-header-info">
            <h2 id="settingsSectionTitle">Settings</h2>
            <p id="settingsSectionSubtitle">
              Review your official university faculty account records, personal details, contact information, and password security.
            </p>
            <div class="settings-overview-pills">
              <span class="badge badge-primary" id="settingsRolePill">Role: FACULTY</span>
              <span class="badge badge-info" id="settingsAccountPill">Account: ${escapeHtml(
                accountIdentifier
              )}</span>
              <span class="badge badge-neutral" id="settingsTermPill">${escapeHtml(
                facultyDept
              )}</span>
            </div>
          </div>
          <div class="section-header-actions">
            <button type="button" class="btn btn-outline-danger" id="settingsLogoutBtn">
              Log Out to Login Screen
            </button>
          </div>
        </div>

        <!-- 2. Administrator-Only Notice Banner -->
        <div class="settings-notice-banner" role="status">
          <div class="settings-notice-icon" aria-hidden="true">ℹ️</div>
          <div class="settings-notice-text">
            <strong>Need to update your personal or contact information?</strong> Please contact the university administrator.
          </div>
        </div>

        <div class="settings-grid">
          <!-- 3. Account Information (Read-Only) -->
          <div class="card settings-card settings-card-full">
            <div class="card-header">
              <h3 class="card-title">Account Information</h3>
              <button type="button" class="btn-text" id="goFullProfileBtn">Full Faculty Profile &rarr;</button>
            </div>
            <p class="settings-card-desc">
              Review your connected university faculty account records and institutional appointment.
            </p>

            <div class="settings-account-summary">
              <div>
                <span class="settings-summary-label">Faculty ID</span>
                <span class="settings-summary-value">${escapeHtml(accountIdentifier)}</span>
              </div>
              <div>
                <span class="settings-summary-label">Full Name</span>
                <span class="settings-summary-value">${escapeHtml(facultyName || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">University Email</span>
                <span class="settings-summary-value">${escapeHtml(accountEmail || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Contact Number</span>
                <span class="settings-summary-value">${escapeHtml(facultyProfile.contactNumber || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Department / College</span>
                <span class="settings-summary-value">${escapeHtml(facultyDept || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Position / Designation</span>
                <span class="settings-summary-value">${escapeHtml(facultyProfile.designation || "Instructor")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Advisory Section</span>
                <span class="settings-summary-value">${escapeHtml(facultySection || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Office Location</span>
                <span class="settings-summary-value">${escapeHtml(facultyProfile.officeLocation || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Account Status</span>
                <span class="settings-summary-value"><span class="badge badge-success">${escapeHtml(facultyProfile.accountStatus || "Active")}</span></span>
              </div>
            </div>
          </div>

          <!-- 4. Personal Information (Read-Only) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3 class="card-title">Personal Information</h3>
              <span class="badge badge-info">View-Only</span>
            </div>
            <p class="settings-card-desc">
              Official faculty identification records registered with the University Human Resources Office.
            </p>

            <div class="settings-session-box" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
              <div>
                <span class="settings-summary-label">Full Name</span>
                <span class="settings-summary-value">${escapeHtml(facultyName || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Date of Birth</span>
                <span class="settings-summary-value">${escapeHtml(facultyProfile.birthDate || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Department / College</span>
                <span class="settings-summary-value">${escapeHtml(facultyDept || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Academic Rank / Position</span>
                <span class="settings-summary-value">${escapeHtml(facultyProfile.designation || "Instructor")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Advisory Section</span>
                <span class="settings-summary-value">${escapeHtml(facultySection || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Employment Status</span>
                <span class="settings-summary-value">Full-Time</span>
              </div>
            </div>
          </div>

          <!-- 5. Contact Information (Read-Only) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3 class="card-title">Contact Information</h3>
              <span class="badge badge-info">View-Only</span>
            </div>
            <p class="settings-card-desc">
              Registered faculty contact details and university consultation office assignment.
            </p>

            <div class="settings-session-box" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
              <div>
                <span class="settings-summary-label">University Email</span>
                <span class="settings-summary-value">${escapeHtml(accountEmail || "Not provided")}</span>
              </div>
              <div>
                <span class="settings-summary-label">Contact Number</span>
                <span class="settings-summary-value">${escapeHtml(facultyProfile.contactNumber || "Not provided")}</span>
              </div>
              <div style="grid-column: 1 / -1;">
                <span class="settings-summary-label">Campus Office / Consultation Room</span>
                <span class="settings-summary-value">${escapeHtml(facultyProfile.officeLocation || "Not provided")}</span>
              </div>
              <div style="grid-column: 1 / -1;">
                <span class="settings-summary-label">Home Address</span>
                <span class="settings-summary-value">${escapeHtml(facultyProfile.homeAddress || "Not provided")}</span>
              </div>
            </div>
          </div>

          <!-- 6. Appearance Settings (Preserved for Faculty) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3 class="card-title">Appearance Settings</h3>
              <span class="badge badge-info">${
                settings.theme === "dark" ? "Dark Mode" : "Light Mode"
              }</span>
            </div>
            <p class="settings-card-desc">
              Customize your portal visual theme and navigation sidebar layout.
            </p>

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
          </div>

          <!-- 7. Notification Settings (Preserved for Faculty) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3 class="card-title">Notification Settings</h3>
              <span class="badge badge-primary">Real-Time Sync</span>
            </div>
            <p class="settings-card-desc">
              Control how assignment deadlines, unread announcements, and navigation counters appear.
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

          <!-- 8. Account Security (Faculty: Change Password & Sign Out) -->
          <div class="card settings-card settings-card-full">
            <div class="card-header">
              <h3 class="card-title">Account Security</h3>
              <span class="badge badge-success">Active Session</span>
            </div>
            <p class="settings-card-desc">
              Current authentication session status and credential security. Passwords are never stored in plain text.
            </p>

            <div class="settings-session-box">
              <div>
                <span class="settings-summary-label">Signed-In Role</span>
                <span class="settings-summary-value"><span class="badge badge-primary">FACULTY (View-Only Records)</span></span>
              </div>
              <div>
                <span class="settings-summary-label">Session Account</span>
                <span class="settings-summary-value">${escapeHtml(accountIdentifier)}</span>
              </div>
            </div>

            <div class="settings-logo-actions" style="margin-top:14px;display:flex;gap:10px;">
              <button type="button" class="btn btn-sm btn-primary" id="openChangePasswordBtn">
                Change Password
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger" id="settingsSecLogoutBtn">
                Sign Out Session
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // Bind Password Management Button
    const changePassBtn = document.getElementById("openChangePasswordBtn");
    if (changePassBtn) {
      changePassBtn.addEventListener("click", openChangePasswordModal);
    }

    // Bind Logout
    const logoutBtn = document.getElementById("settingsLogoutBtn") || document.getElementById("settingsSignOutBtn");
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

    // Bind Go Full Profile
    const goProfBtn = document.getElementById("goFullProfileBtn");
    if (goProfBtn) {
      goProfBtn.addEventListener("click", () => {
        navigateTo(activeRole === "faculty" ? "faculty-profile" : "profile");
      });
    }
  }

  return {
    render,
    openChangePasswordModal
  };
})();

window.StudentHubSettings = StudentHubSettings;
