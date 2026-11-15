// Core application routing, UI navigation, and lifecycle management.
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Main Application Controller & Role-Based Router (app.js)
 * ============================================================================
 */

const StudentHubApp = (function () {
  const SECTION_TITLES = {
    // Student Portal Sections
    dashboard: "Student Dashboard",
    profile: "My Student Profile",
    subjects: "My Subjects",
    schedule: "Class Schedule (BSIT 2-2)",
    grades: "My Grades (Read-Only)",
    attendance: "My Attendance Records",
    tasks: "Academic Task Manager",
    announcements: "University Announcements",
    resources: "Learning Resources",
    // Faculty Portal Sections
    "faculty-dashboard": "Faculty Dashboard",
    "faculty-profile": "Faculty Profile",
    "faculty-classes": "My Classes & Schedule (BSIT 2-2)",
    "faculty-attendance": "Class Attendance Management",
    "faculty-grades": "Class Grade Management",
    "faculty-tasks": "Assignment Management",
    "faculty-announcements": "Faculty Announcements",
    "faculty-applications": "Student Applications",
    // Applicant Portal Sections
    "applicant-landing": "Admission Overview",
    "applicant-form": "Online Application Form",
    "applicant-status": "Admission Overview",
    // Administrator Portal Sections
    "admin-dashboard": "Administrator Overview",
    "admin-users": "User Account Management",
    "admin-applications": "Admissions & Applications",
    "admin-logs": "Audit Trail & Activity Logs",
    "admin-settings": "Administrator Security & Settings",
    // Shared
    settings: "Portal Settings"
  };

  const ROLE_ALLOWED_SECTIONS = {
    student: [
      "dashboard",
      "profile",
      "subjects",
      "schedule",
      "grades",
      "announcements",
      "resources",
      "settings"
    ],
    faculty: [
      "faculty-dashboard",
      "faculty-profile",
      "faculty-classes",
      "faculty-grades",
      "faculty-announcements",
      "faculty-applications",
      "resources",
      "settings"
    ],
    applicant: ["applicant-landing", "applicant-form"],
    admin: [
      "admin-dashboard",
      "admin-users",
      "admin-applications",
      "admin-logs",
      "admin-settings"
    ]
  };

  const ROLE_HOME_SECTION = {
    student: "dashboard",
    faculty: "faculty-dashboard",
    applicant: "applicant-landing",
    admin: "admin-dashboard"
  };

  let currentSection = "dashboard";
  let confirmResolver = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime12h(time24) {
    if (!time24 || !time24.includes(":")) return time24 || "";
    const [hStr, mStr] = time24.split(":");
    let hour = parseInt(hStr, 10);
    if (isNaN(hour)) return time24;
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${mStr} ${ampm}`;
  }

  function formatReadableDate(dateStr) {
    if (!dateStr) return "N/A";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function getTodayDayName() {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[new Date().getDay()];
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
  }

  function isValidUrl(urlStr) {
    try {
      const u = new URL(String(urlStr).trim());
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  function clearFormErrors(formEl) {
    if (!formEl) return;
    formEl.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    formEl.querySelectorAll(".field-error").forEach((el) => {
      el.textContent = "";
    });
  }

  function setFieldError(formEl, fieldName, message) {
    if (!formEl) return;
    const input = formEl.querySelector(`[name="${fieldName}"]`);
    if (input) {
      input.classList.add("is-invalid");
    }
    const errEl = formEl.querySelector(`[data-error-for="${fieldName}"]`);
    if (errEl) {
      errEl.textContent = message;
    }
  }

  /**
   * Toast Notification System
   */
  function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");

    toast.innerHTML = `
      <div class="toast-content">${escapeHtml(message)}</div>
      <button type="button" class="toast-close" aria-label="Dismiss notification">&times;</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    const removeToast = () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    };

    closeBtn.addEventListener("click", removeToast);
    container.appendChild(toast);
    setTimeout(removeToast, 4000);
  }

  /**
   * Reusable Modal Dialog
   */
  function openModal(title, bodyHtml, onMount) {
    const backdrop = document.getElementById("appModalBackdrop");
    const titleEl = document.getElementById("appModalTitle");
    const bodyEl = document.getElementById("appModalBody");

    if (!backdrop || !titleEl || !bodyEl) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    backdrop.hidden = false;
    backdrop.setAttribute("aria-hidden", "false");

    if (typeof onMount === "function") {
      onMount(bodyEl);
    }

    const firstInput = bodyEl.querySelector("input, select, textarea");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 40);
    }
  }

  function closeModal() {
    const backdrop = document.getElementById("appModalBackdrop");
    const bodyEl = document.getElementById("appModalBody");
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }
    if (bodyEl) {
      bodyEl.innerHTML = "";
    }
  }

  /**
   * Reusable Promise-based Confirmation Dialog
   */
  function confirmDialog({
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    danger = true
  }) {
    return new Promise((resolve) => {
      const backdrop = document.getElementById("confirmModalBackdrop");
      const titleEl = document.getElementById("confirmModalTitle");
      const msgEl = document.getElementById("confirmModalMessage");
      const acceptBtn = document.getElementById("confirmAcceptBtn");

      if (!backdrop || !titleEl || !msgEl || !acceptBtn) {
        resolve(false);
        return;
      }

      confirmResolver = resolve;
      titleEl.textContent = title;
      msgEl.textContent = message;
      acceptBtn.textContent = confirmText;
      acceptBtn.className = danger ? "btn btn-danger" : "btn btn-primary";

      backdrop.hidden = false;
      backdrop.setAttribute("aria-hidden", "false");
    });
  }

  function resolveConfirm(result) {
    const backdrop = document.getElementById("confirmModalBackdrop");
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }
    if (typeof confirmResolver === "function") {
      const fn = confirmResolver;
      confirmResolver = null;
      fn(result);
    }
  }

  /**
   * Get active role ("student" | "faculty" | "applicant")
   */
  function getActiveRole() {
    const session = StudentHubStorage.getSession();
    return session && session.role ? session.role : "student";
  }

  /**
   * Validate inside JS functions that the active user role matches the required role
   */
  function requireRole(expectedRole, actionDescription = "perform this action") {
    const currentRole = getActiveRole();
    const expectedList = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
    if (!expectedList.includes(currentRole)) {
      showToast(
        `Access Denied: Only ${expectedList.join("/").toUpperCase()} accounts can ${actionDescription}.`,
        "error"
      );
      return false;
    }
    return true;
  }

  /**
   * Sync University Logo across all `<img class="bu-logo-img">` elements
   */
  function syncUniversityLogo() {
    const logoSrc = StudentHubStorage.getLogoSrc();
    document.querySelectorAll(".bu-logo-img").forEach((img) => {
      img.style.display = "block";
      if (img.nextElementSibling) {
        img.nextElementSibling.style.display = "none";
      }
      img.src = logoSrc;
    });
  }

  /**
   * Enforce Role-Based Sidebar Visibility & Header Identity
   */
  function getAllowedSectionsForCurrentSession() {
    const role = getActiveRole();
    if (role === "applicant") {
      return ["applicant-landing", "applicant-form"];
    }
    return ROLE_ALLOWED_SECTIONS[role] || ROLE_ALLOWED_SECTIONS.student;
  }

  function applyRolePermissions(role) {
    const allowedSections = getAllowedSectionsForCurrentSession();

    // 1. Show only sidebar items permitted for this role/session
    document.querySelectorAll(".sidebar-nav .nav-item").forEach((li) => {
      const itemRoleAttr = li.getAttribute("data-role-item") || "";
      const itemRoles = itemRoleAttr.split(",").map((r) => r.trim());
      let visible = itemRoles.includes(role) || itemRoles.includes("all");
      if (visible && role === "applicant") {
        const btn = li.querySelector("[data-section]");
        const sec = btn ? btn.getAttribute("data-section") : "";
        if (sec && !allowedSections.includes(sec)) {
          visible = false;
        }
      }
      li.hidden = !visible;
    });

    // 2. Update Sidebar & Topbar Role Labels
    const state = StudentHubStorage.getState();
    const portalSub = document.getElementById("sidebarPortalSubtitle");
    const roleBadgeText = document.getElementById("sidebarRoleBadgeText");
    const roleSubText = document.getElementById("sidebarRoleSubText");
    const topbarRoleLabel = document.getElementById("topbarRoleLabel");
    const nameEl = document.getElementById("topbarStudentName");
    const metaEl = document.getElementById("topbarStudentMeta");
    const avatarEl = document.getElementById("topbarAvatar");
    const termEl = document.getElementById("sidebarTermText");
    const semesterCard = document.querySelector(".semester-card");

    if (termEl) {
      termEl.textContent = state.profile.academicTerm || "2nd Sem, AY 2026–2027";
    }

    if (role === "faculty") {
      if (semesterCard) semesterCard.hidden = false;
      if (portalSub) portalSub.textContent = "Faculty Portal System";
      if (roleBadgeText)
        roleBadgeText.textContent = `Faculty: ${state.facultyProfile.fullName || "Instructor"}`;
      if (roleSubText) roleSubText.textContent = state.facultyProfile.department || "IT Department";
      if (topbarRoleLabel) topbarRoleLabel.textContent = "Faculty";
      if (nameEl) nameEl.textContent = state.facultyProfile.fullName || "Faculty Member";
      if (metaEl)
        metaEl.textContent = `${state.facultyProfile.facultyId || "FAC"} • ${state.facultyProfile.advisorySection || "BSIT 2-2"
          }`;
      if (avatarEl) avatarEl.src = "assets/images/default-avatar.svg";
    } else if (role === "applicant") {
      if (semesterCard) semesterCard.hidden = true;
      if (portalSub) portalSub.textContent = "Admissions Portal";
      if (roleBadgeText) roleBadgeText.textContent = "Applicant Portal";
      if (roleSubText) roleSubText.textContent = "Admission Overview";
      if (topbarRoleLabel) topbarRoleLabel.textContent = "Applicant";

      // Display actual applicant name if available, otherwise "Applicant"
      let applicantDisplayName = "Applicant";
      try {
        const cached = sessionStorage.getItem("bu_last_submitted_app");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.fullName) applicantDisplayName = parsed.fullName;
        }
      } catch (_) {}
      const sess = StudentHubStorage.getSession();
      if (sess && sess.displayName && sess.displayName !== "Prospective Applicant") {
        applicantDisplayName = sess.displayName;
      }
      if (nameEl) nameEl.textContent = applicantDisplayName;
      if (metaEl) metaEl.textContent = "Admissions Overview";
      if (avatarEl) avatarEl.src = "assets/images/default-avatar.svg";
    } else if (role === "admin") {
      if (semesterCard) semesterCard.hidden = true;
      if (portalSub) portalSub.textContent = "Secure Administration";
      if (roleBadgeText) roleBadgeText.textContent = "Administrator Panel";
      if (roleSubText) roleSubText.textContent = "Full System Control";
      if (topbarRoleLabel) topbarRoleLabel.textContent = "Administrator";

      const sess = StudentHubStorage.getSession();
      const adminName = sess?.displayName || "System Administrator";
      if (nameEl) nameEl.textContent = adminName;
      if (metaEl) metaEl.textContent = "Root Admin • bantug.edu.example";
      if (avatarEl) avatarEl.src = "assets/images/default-avatar.svg";
    } else {
      if (semesterCard) semesterCard.hidden = false;
      if (portalSub) portalSub.textContent = "Student Portal System";
      const studentSec = state.profile?.section || "";
      const studentYr = state.profile?.yearLevel || "";
      const secLabel = [studentYr, studentSec].filter(Boolean).join(" • ");
      if (roleBadgeText)
        roleBadgeText.textContent = studentSec ? `Student Portal (${studentSec})` : "Student Portal";
      if (roleSubText)
        roleSubText.textContent = secLabel || "Enrolled Student";
      if (topbarRoleLabel) topbarRoleLabel.textContent = "Student";
      if (nameEl) nameEl.textContent = state.profile?.fullName || "Student";
      if (metaEl)
        metaEl.textContent = secLabel || "Enrolled Student";
      if (avatarEl) avatarEl.src = state.profile?.avatar || "assets/images/default-avatar.svg";
    }
  }

  /**
   * Switch active section (Strictly enforcing role permissions)
   */
  function navigateTo(sectionId, updateHash = true) {
    const session = StudentHubStorage.getSession();
    if (!session) {
      showLoginScreen();
      return;
    }

    const role = session.role || "student";
    const allowed = getAllowedSectionsForCurrentSession();

    // Applicant redirects: applicant-status seamlessly maps to applicant-landing
    if (role === "applicant" && sectionId === "applicant-status") {
      sectionId = "applicant-landing";
    }

    if (!SECTION_TITLES[sectionId] || !allowed.includes(sectionId)) {
      if (sectionId && SECTION_TITLES[sectionId] && !allowed.includes(sectionId)) {
        showToast(
          `Access Denied: Your ${role.toUpperCase()} account cannot access "${SECTION_TITLES[sectionId]}".`,
          "error"
        );
      }
      sectionId = ROLE_HOME_SECTION[role] || "dashboard";
    }

    currentSection = sectionId;

    // Update sidebar active button
    document.querySelectorAll(".nav-link").forEach((btn) => {
      const isMatch = btn.getAttribute("data-section") === sectionId;
      btn.classList.toggle("active", isMatch);
    });

    // Show target section, hide others
    document.querySelectorAll(".module-section").forEach((sec) => {
      const isTarget = sec.id === `section-${sectionId}`;
      sec.hidden = !isTarget;
      sec.classList.toggle("active", isTarget);
    });

    // Update breadcrumb title
    const titleEl = document.getElementById("topbarPageTitle");
    if (titleEl) {
      titleEl.textContent = SECTION_TITLES[sectionId];
    }

    if (updateHash && window.location.hash !== `#${sectionId}`) {
      history.replaceState(null, "", `#${sectionId}`);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    renderSection(sectionId);
  }

  /**
   * Render specific module (with role guard)
   */
  function renderSection(sectionId) {
    const allowed = getAllowedSectionsForCurrentSession();
    if (!allowed.includes(sectionId)) {
      return;
    }

    switch (sectionId) {
      // Student Modules
      case "dashboard":
        if (window.StudentHubDashboard) window.StudentHubDashboard.render();
        break;
      case "profile":
        if (window.StudentHubProfile) window.StudentHubProfile.render();
        break;
      case "subjects":
        if (window.StudentHubSubjects) window.StudentHubSubjects.render();
        break;
      case "schedule":
        if (window.StudentHubSchedule) window.StudentHubSchedule.render();
        break;
      case "grades":
        if (window.StudentHubGrades) window.StudentHubGrades.render();
        break;
      case "attendance":
        if (window.StudentHubAttendance) window.StudentHubAttendance.render();
        break;
      case "tasks":
        if (window.StudentHubTasks) window.StudentHubTasks.render();
        break;
      case "announcements":
        if (window.StudentHubAnnouncements) window.StudentHubAnnouncements.render();
        break;
      case "resources":
        if (window.StudentHubResources) window.StudentHubResources.render();
        break;
      // Faculty Modules
      case "faculty-dashboard":
        if (window.StudentHubFaculty) window.StudentHubFaculty.renderDashboard();
        break;
      case "faculty-profile":
        if (window.StudentHubFaculty) window.StudentHubFaculty.renderProfile();
        break;
      case "faculty-classes":
        if (window.StudentHubFaculty) window.StudentHubFaculty.renderClasses();
        break;
      case "faculty-attendance":
        if (window.StudentHubFaculty) window.StudentHubFaculty.renderAttendance();
        break;
      case "faculty-grades":
        if (window.StudentHubFaculty) window.StudentHubFaculty.renderGrades();
        break;
      case "faculty-tasks":
        if (window.StudentHubFaculty) window.StudentHubFaculty.renderTasks();
        break;
      case "faculty-announcements":
        if (window.StudentHubFaculty) window.StudentHubFaculty.renderAnnouncements();
        break;
      case "faculty-applications":
        if (window.StudentHubFaculty && typeof window.StudentHubFaculty.renderApplications === "function") {
          window.StudentHubFaculty.renderApplications();
        }
        break;
      // Applicant Modules
      case "applicant-landing":
        if (window.StudentHubApplicant) window.StudentHubApplicant.renderLanding();
        break;
      case "applicant-form":
        if (window.StudentHubApplicant) window.StudentHubApplicant.renderForm();
        break;
      case "applicant-status":
        if (window.StudentHubApplicant) window.StudentHubApplicant.renderStatus();
        break;
      // Administrator Modules
      case "admin-dashboard":
        if (window.StudentHubAdmin) window.StudentHubAdmin.renderDashboard();
        break;
      case "admin-users":
        if (window.StudentHubAdmin) window.StudentHubAdmin.renderUsers("all");
        break;
      case "admin-applications":
        if (window.StudentHubAdmin) window.StudentHubAdmin.renderApplications();
        break;
      case "admin-logs":
        if (window.StudentHubAdmin) window.StudentHubAdmin.renderLogs();
        break;
      case "admin-settings":
        if (window.StudentHubAdmin) window.StudentHubAdmin.renderSettings();
        break;
      // Shared Settings
      case "settings":
        if (window.StudentHubSettings) window.StudentHubSettings.render();
        break;
    }
  }

  /**
   * Show Public Admission Page (Independent of Portal Shell and Login)
   */
  function showAdmissionPage() {
    const loginScreen = document.getElementById("loginScreen");
    const appLayout = document.getElementById("appLayout");
    const admissionScreen = document.getElementById("publicAdmissionScreen");

    if (loginScreen) loginScreen.hidden = true;
    if (appLayout) appLayout.hidden = true;
    if (admissionScreen) admissionScreen.hidden = false;

    const path = window.location.pathname.toLowerCase();
    if (!path.endsWith("/admission.html") && !path.endsWith("/applicant.html")) {
      window.location.hash = "#admission";
    }

    if (window.StudentHubApplicant && typeof window.StudentHubApplicant.initPublicAdmission === "function") {
      window.StudentHubApplicant.initPublicAdmission();
    }
    syncUniversityLogo();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Show Login Screen and hide Portal Layout & Admission Page
   */
  function showLoginScreen() {
    const loginScreen = document.getElementById("loginScreen");
    const appLayout = document.getElementById("appLayout");
    const admissionScreen = document.getElementById("publicAdmissionScreen");

    if (admissionScreen) admissionScreen.hidden = true;
    if (appLayout) appLayout.hidden = true;
    if (loginScreen) loginScreen.hidden = false;

    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (hash === "admission" || hash === "apply" || hash === "application") {
      window.location.hash = "";
    }
    syncUniversityLogo();
  }

  /**
   * Enter Authenticated Portal for the active session
   */
  function enterPortal(targetSection = null) {
    const session = StudentHubStorage.getSession();
    if (!session) {
      showLoginScreen();
      return;
    }
    const loginScreen = document.getElementById("loginScreen");
    const appLayout = document.getElementById("appLayout");
    const admissionScreen = document.getElementById("publicAdmissionScreen");

    if (admissionScreen) admissionScreen.hidden = true;
    if (loginScreen) loginScreen.hidden = true;
    if (appLayout) appLayout.hidden = false;

    const role = session.role || "student";
    applyRolePermissions(role);
    refreshAll();
    if (typeof StudentHubStorage.loadFromXamppDatabase === "function") {
      StudentHubStorage.loadFromXamppDatabase();
    }

    const destination =
      targetSection ||
      (role === "applicant" && StudentHubStorage.isApplicantDemoSession()
        ? "applicant-status"
        : ROLE_HOME_SECTION[role] || "dashboard");
    navigateTo(destination);

    if (session.mustChangePassword) {
      setTimeout(() => {
        if (window.StudentHubAdmin && typeof window.StudentHubAdmin.promptMustChangePassword === "function") {
          window.StudentHubAdmin.promptMustChangePassword();
        }
      }, 120);
    }
  }

  /**
   * Log Out and return to Login Screen
   */
  function logoutToLogin() {
    if (typeof StudentHubStorage.logoutFromDatabase === "function") {
      StudentHubStorage.logoutFromDatabase().catch(() => {});
    }
    StudentHubStorage.clearSession();
    closeModal();
    showLoginScreen();
    showToast("Logged out of BANTUG UNIVERSITY Portal.", "info");
  }

  /**
   * Refresh topbar user info, badges, notifications, theme, logo, and active view
   */
  function refreshAll() {
    const state = StudentHubStorage.getState();
    applyTheme(state.settings.theme || "light");
    syncUniversityLogo();

    const appLayout = document.getElementById("appLayout");
    if (appLayout) {
      appLayout.classList.toggle("sidebar-collapsed", Boolean(state.settings.sidebarCollapsed));
    }

    const session = StudentHubStorage.getSession();
    if (!session) {
      return;
    }

    applyRolePermissions(session.role);
    updateBadgesAndNotifications(state);
    renderSection(currentSection);
  }

  function applyTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", normalized);
    const sunIcon = document.getElementById("themeIconSun");
    const moonIcon = document.getElementById("themeIconMoon");
    if (sunIcon && moonIcon) {
      sunIcon.hidden = normalized !== "dark";
      moonIcon.hidden = normalized === "dark";
    }
  }

  function updateBadgesAndNotifications(state) {
    const role = getActiveRole();
    const taskBadge = document.getElementById("navTaskBadge");
    const annBadge = document.getElementById("navAnnouncementBadge");
    const facAppsBadge = document.getElementById("navFacultyApplicationsBadge");
    const notifDot = document.getElementById("notificationDot");
    const notifList = document.getElementById("notificationList");

    const showBadges = state.settings.unreadBadges !== false;

    if (role === "applicant") {
      // Phase 2: Applicants do not have student tasks or student announcements
      if (taskBadge) taskBadge.hidden = true;
      if (annBadge) annBadge.hidden = true;
      if (facAppsBadge) facAppsBadge.hidden = true;

      const appNotifs = (state.announcements || []).filter((a) => !a.read);
      if (notifDot) notifDot.hidden = !(showBadges && appNotifs.length > 0);

      if (notifList) {
        if (appNotifs.length === 0) {
          notifList.innerHTML = `
            <div class="empty-state" style="padding: 20px 10px;">
              <p style="margin:0;">No admission notifications.</p>
            </div>
          `;
        } else {
          notifList.innerHTML = appNotifs
            .map(
              (item) => `
              <button type="button" class="notif-item" data-target-section="applicant-landing">
                <span class="notif-item-title">${escapeHtml(item.title || item.subject)}</span>
                <span class="notif-item-meta">Admission Notice • ${escapeHtml(formatReadableDate(item.date || item.createdAt))}</span>
              </button>
            `
            )
            .join("");

          notifList.querySelectorAll(".notif-item").forEach((btn) => {
            btn.addEventListener("click", () => {
              document.getElementById("notificationDropdown").hidden = true;
              navigateTo("applicant-landing");
            });
          });
        }
      }
      return;
    }

    const pendingOrOverdueTasks = (state.tasks || []).filter(
      (t) => t.status === "Pending" || t.status === "Overdue"
    );
    const overdueTasks = pendingOrOverdueTasks.filter((t) => t.status === "Overdue");
    const visibleAnnouncements =
      role === "faculty"
        ? state.announcements || []
        : (state.announcements || []).filter((a) => a.published !== false && !String(a.targetAudience || "").toLowerCase().includes("applicant"));
    const unreadAnnouncements = visibleAnnouncements.filter((a) => !a.read);

    if (taskBadge) {
      taskBadge.hidden = !(showBadges && pendingOrOverdueTasks.length > 0);
      taskBadge.textContent = String(pendingOrOverdueTasks.length);
    }

    if (annBadge) {
      annBadge.hidden = !(showBadges && unreadAnnouncements.length > 0);
      annBadge.textContent = String(unreadAnnouncements.length);
    }

    if (facAppsBadge) {
      const allApps =
        typeof StudentHubStorage.getAllApplicationsForFaculty === "function"
          ? StudentHubStorage.getAllApplicationsForFaculty(state)
          : state.demoApplicantRecords || [];
      facAppsBadge.hidden = !(showBadges && allApps.length > 0);
      facAppsBadge.textContent = String(allApps.length);
    }

    const totalAlerts = unreadAnnouncements.length + (role === "student" ? overdueTasks.length : 0);
    if (notifDot) {
      notifDot.hidden = !(showBadges && totalAlerts > 0);
    }

    if (notifList) {
      const items = [];

      if (role === "student" && state.settings.deadlineReminders !== false) {
        overdueTasks.forEach((t) => {
          items.push({
            title: `Overdue Task: ${t.title}`,
            meta: `${t.subject} • Due ${formatReadableDate(t.deadline)}`,
            section: "tasks"
          });
        });
      }

      unreadAnnouncements.forEach((a) => {
        items.push({
          title: `Unread: ${a.title}`,
          meta: `${a.category} • ${formatReadableDate(a.date)}`,
          section: role === "faculty" ? "faculty-announcements" : "announcements"
        });
      });

      if (items.length === 0) {
        notifList.innerHTML = `
          <div class="empty-state" style="padding: 20px 10px;">
            <p style="margin:0;">No unread BANTUG UNIVERSITY notifications.</p>
          </div>
        `;
      } else {
        notifList.innerHTML = items
          .map(
            (item) => `
            <button type="button" class="notif-item" data-target-section="${escapeHtml(item.section)}">
              <span class="notif-item-title">${escapeHtml(item.title)}</span>
              <span class="notif-item-meta">${escapeHtml(item.meta)}</span>
            </button>
          `
          )
          .join("");

        notifList.querySelectorAll(".notif-item").forEach((btn) => {
          btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target-section");
            document.getElementById("notificationDropdown").hidden = true;
            navigateTo(target);
          });
        });
      }
    }
  }

  /**
   * Role-aware Global Search
   */
  function handleGlobalSearch(query) {
    const resultsBox = document.getElementById("globalSearchResults");
    if (!resultsBox) return;

    const q = String(query || "").trim().toLowerCase();
    if (!q) {
      resultsBox.hidden = true;
      resultsBox.innerHTML = "";
      return;
    }

    const state = StudentHubStorage.getState();
    const role = getActiveRole();
    const matches = [];

    if (role === "student") {
      const studentSubjects = StudentHubStorage.getStudentEnrolledSubjects(state.profile);
      const catalogSubjects = StudentHubStorage.getAllUniversitySubjects();
      const enrolledCodes = new Set(studentSubjects.map((s) => s.subjectCode));

      const allSubjects = [...studentSubjects];
      catalogSubjects.forEach((cat) => {
        if (!enrolledCodes.has(cat.subjectCode)) {
          allSubjects.push(cat);
        }
      });

      allSubjects.forEach((s) => {
        const hay = `${s.subjectCode || ""} ${s.courseCode || ""} ${s.subjectName || ""} ${
          s.fullSubjectName || ""
        } ${s.instructor || ""} ${s.course || ""} ${s.description || ""} ${s.scheduleSummary || ""}`.toLowerCase();
        if (hay.includes(q)) {
          const isEnrolled = enrolledCodes.has(s.subjectCode);
          matches.push({
            title: `${s.subjectCode} (${s.courseCode || s.subjectCode}) – ${s.subjectName || s.fullSubjectName}`,
            sub: `Instructor: ${s.instructor || "Not specified"}${s.section ? ` • Section: ${s.section}` : ""}${isEnrolled ? " • Enrolled" : " • Catalog"}`,
            type: isEnrolled ? "Enrolled Subject" : "Course Catalog",
            section: "subjects"
          });
        }
      });

      const publishedAnnouncements = (state.announcements || []).filter((a) => a.published !== false);
      publishedAnnouncements.forEach((a) => {
        const hay = `${a.title || ""} ${a.description || ""} ${a.category || ""}`.toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            title: a.title,
            sub: `${a.category || "Announcement"} • ${typeof formatReadableDate === "function" ? formatReadableDate(a.date) : a.date || ""}`,
            type: "Notice",
            section: "announcements"
          });
        }
      });

      (state.tasks || []).forEach((t) => {
        const hay = `${t.title || ""} ${t.subject || ""} ${t.description || ""}`.toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            title: t.title,
            sub: `${t.subject || "Academic"} • ${t.status || "Pending"}`,
            type: "Task",
            section: "tasks"
          });
        }
      });

      (state.resources || []).forEach((r) => {
        const hay = `${r.title || ""} ${r.subject || ""} ${r.description || ""}`.toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            title: r.title,
            sub: `${r.category || "Resource"} • ${r.subject || ""}`,
            type: "Resource",
            section: "resources"
          });
        }
      });
    }

    if (role === "faculty") {
      state.schedules.forEach((s) => {
        const hay = `${s.subjectCode || ""} ${s.courseCode || ""} ${s.subjectName || ""} ${s.instructor || ""}`.toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            title: `${s.subjectCode} (${s.courseCode || s.subjectCode}) – ${s.subjectName}`,
            sub: `Instructor: ${s.instructor || "Not specified"}${s.section ? ` • Section: ${s.section}` : ""}`,
            type: "Subject",
            section: "faculty-classes"
          });
        }
      });

      (state.announcements || []).forEach((a) => {
        if ((a.title && a.title.toLowerCase().includes(q)) || (a.description && a.description.toLowerCase().includes(q))) {
          matches.push({
            title: a.title,
            sub: `${a.category || "Faculty Notice"} • ${typeof formatReadableDate === "function" ? formatReadableDate(a.date) : a.date || ""}`,
            type: "Announcement",
            section: "faculty-announcements"
          });
        }
      });

      (state.tasks || []).forEach((t) => {
        if ((t.title && t.title.toLowerCase().includes(q)) || (t.subject && t.subject.toLowerCase().includes(q))) {
          matches.push({
            title: t.title,
            sub: `${t.subject} • ${t.status || "Pending"}`,
            type: "Task",
            section: "faculty-tasks"
          });
        }
      });

      (state.resources || []).forEach((r) => {
        if ((r.title && r.title.toLowerCase().includes(q)) || (r.subject && r.subject.toLowerCase().includes(q))) {
          matches.push({
            title: r.title,
            sub: `${r.category || "Resource"} • ${r.subject || ""}`,
            type: "Resource",
            section: "resources"
          });
        }
      });
    }

    if (role === "applicant") {
      state.applications.forEach((app) => {
        if (
          app.referenceNumber.toLowerCase().includes(q) ||
          app.fullName.toLowerCase().includes(q) ||
          app.desiredProgram.toLowerCase().includes(q)
        ) {
          matches.push({
            title: `${app.referenceNumber} - ${app.fullName}`,
            sub: `${app.desiredProgram} • Status: ${app.status}`,
            type: "Application",
            section: "applicant-status"
          });
        }
      });
    }

    if (matches.length === 0) {
      resultsBox.innerHTML = `
        <div style="padding: 12px; font-size: 0.85rem; color: var(--text-muted); text-align: center;">
          No matching records found for "${escapeHtml(query)}"
        </div>
      `;
      resultsBox.hidden = false;
      return;
    }

    resultsBox.innerHTML = matches
      .slice(0, 8)
      .map(
        (m) => `
        <button type="button" class="search-result-item" data-section="${escapeHtml(m.section)}">
          <div>
            <div class="search-result-title">${escapeHtml(m.title)}</div>
            <div class="search-result-sub">${escapeHtml(m.sub)}</div>
          </div>
          <span class="search-result-type">${escapeHtml(m.type)}</span>
        </button>
      `
      )
      .join("");

    resultsBox.hidden = false;

    resultsBox.querySelectorAll(".search-result-item").forEach((item) => {
      item.addEventListener("click", () => {
        const sec = item.getAttribute("data-section");
        resultsBox.hidden = true;
        document.getElementById("globalSearchInput").value = "";
        navigateTo(sec);
      });
    });
  }

  function init() {
    const dateEl = document.getElementById("topbarDateDisplay");
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }

    // Sidebar Navigation Clicks
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-section");
        navigateTo(target);
      });
    });

    // Guard against manual URL hash changes to unauthorized sections
    window.addEventListener("hashchange", () => {
      const activeSession = StudentHubStorage.getSession();
      if (!activeSession) return;
      const hashTarget = window.location.hash.replace("#", "");
      if (hashTarget && hashTarget !== currentSection) {
        navigateTo(hashTarget, true);
      }
    });

    // Synchronize across tabs if localStorage changes
    window.addEventListener("storage", (e) => {
      if (e.key === StudentHubStorage.STORAGE_KEY) {
        refreshAll();
      }
    });

    // Brand Logo Click -> Role Home
    const brandLink = document.getElementById("brandLogoLink");
    if (brandLink) {
      brandLink.addEventListener("click", (e) => {
        e.preventDefault();
        const role = getActiveRole();
        navigateTo(ROLE_HOME_SECTION[role] || "dashboard");
      });
    }

    // Topbar Profile Pill -> Role Profile
    const profileBtn = document.getElementById("topbarProfileBtn");
    if (profileBtn) {
      profileBtn.addEventListener("click", () => {
        const role = getActiveRole();
        if (role === "faculty") {
          navigateTo("faculty-profile");
        } else if (role === "applicant") {
          if (window.StudentHubApplicant && window.StudentHubApplicant.openApplicantAccountModal) {
            window.StudentHubApplicant.openApplicantAccountModal();
          } else {
            navigateTo("applicant-landing");
          }
        } else {
          navigateTo("profile");
        }
      });
    }

    // Desktop Sidebar Collapse
    const collapseBtn = document.getElementById("sidebarCollapseBtn");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        const state = StudentHubStorage.getState();
        state.settings.sidebarCollapsed = !state.settings.sidebarCollapsed;
        StudentHubStorage.saveState(state);
        refreshAll();
      });
    }

    // Theme Toggle
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
        const state = StudentHubStorage.getState();
        state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
        StudentHubStorage.saveState(state);
        refreshAll();
        showToast(
          `Switched to ${state.settings.theme === "dark" ? "Dark" : "Light"} Mode.`,
          "info"
        );
      });
    }

    // Notification Dropdown
    const notifBtn = document.getElementById("notificationBtn");
    const notifDropdown = document.getElementById("notificationDropdown");
    const markAllReadTopBtn = document.getElementById("markAllReadTopBtn");

    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        notifDropdown.hidden = !notifDropdown.hidden;
      });
    }

    if (markAllReadTopBtn) {
      markAllReadTopBtn.addEventListener("click", () => {
        const state = StudentHubStorage.getState();
        state.announcements = state.announcements.map((a) => ({ ...a, read: true }));
        StudentHubStorage.saveState(state);
        refreshAll();
        showToast("All announcements marked as read.", "success");
      });
    }

    // Global Search
    const searchInput = document.getElementById("globalSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => handleGlobalSearch(e.target.value));
      searchInput.addEventListener("focus", (e) => {
        if (e.target.value.trim()) handleGlobalSearch(e.target.value);
      });
    }

    document.addEventListener("click", (e) => {
      if (notifDropdown && !notifDropdown.hidden) {
        if (!e.target.closest(".notification-wrapper")) {
          notifDropdown.hidden = true;
        }
      }
      const searchResults = document.getElementById("globalSearchResults");
      if (searchResults && !searchResults.hidden) {
        if (!e.target.closest("#globalSearchWrapper")) {
          searchResults.hidden = true;
        }
      }
    });

    // Modal & Confirmation Close Events
    const modalCloseBtn = document.getElementById("appModalCloseBtn");
    const modalBackdrop = document.getElementById("appModalBackdrop");
    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
    }

    const confirmCancelBtn = document.getElementById("confirmCancelBtn");
    const confirmAcceptBtn = document.getElementById("confirmAcceptBtn");
    if (confirmCancelBtn) confirmCancelBtn.addEventListener("click", () => resolveConfirm(false));
    if (confirmAcceptBtn) confirmAcceptBtn.addEventListener("click", () => resolveConfirm(true));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const confirmBack = document.getElementById("confirmModalBackdrop");
        if (confirmBack && !confirmBack.hidden) {
          resolveConfirm(false);
          return;
        }
        if (modalBackdrop && !modalBackdrop.hidden) {
          closeModal();
        }
      }
    });

    // Logout Buttons (Sidebar and Topbar)
    const sidebarLogoutBtn = document.getElementById("sidebarLogoutBtn");
    const topbarLogoutBtn = document.getElementById("topbarLogoutBtn");

    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener("click", logoutToLogin);
    if (topbarLogoutBtn) topbarLogoutBtn.addEventListener("click", logoutToLogin);

    // Apply initial theme and check session
    const state = StudentHubStorage.getState();
    applyTheme(state.settings.theme || "light");
    syncUniversityLogo();

    const path = window.location.pathname.toLowerCase();
    const initialHash = window.location.hash.replace("#", "").toLowerCase();
    const isPublicAdmission =
      path.endsWith("/admission.html") ||
      path.endsWith("/applicant.html") ||
      initialHash === "admission" ||
      initialHash === "apply" ||
      initialHash === "application";

    if (isPublicAdmission) {
      applyTheme("light");
      showAdmissionPage();
      return;
    }

    const activeSession = StudentHubStorage.getSession();
    if (activeSession) {
      enterPortal(initialHash || null);
    } else {
      showLoginScreen();
    }
  }

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (hash === "admission" || hash === "apply" || hash === "application") {
      showAdmissionPage();
      return;
    }
    if (hash === "login") {
      showLoginScreen();
      return;
    }
    const session = StudentHubStorage.getSession();
    if (session) {
      navigateTo(hash, false);
    } else {
      showLoginScreen();
    }
  });

  document.addEventListener("DOMContentLoaded", init);

  return {
    escapeHtml,
    formatTime12h,
    formatReadableDate,
    getTodayDayName,
    isValidEmail,
    isValidUrl,
    clearFormErrors,
    setFieldError,
    showToast,
    openModal,
    closeModal,
    confirmDialog,
    getActiveRole,
    requireRole,
    syncUniversityLogo,
    showAdmissionPage,
    showLoginScreen,
    enterPortal,
    logoutToLogin,
    navigateTo,
    openChangePasswordModal: () => {
      if (window.StudentHubSettings && window.StudentHubSettings.openChangePasswordModal) {
        window.StudentHubSettings.openChangePasswordModal();
      }
    },
    refreshAll
  };
})();

window.StudentHubApp = StudentHubApp;
