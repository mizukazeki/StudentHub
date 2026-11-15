// Admission application form handling, validation, and submission flow.
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Applicant Portal & Applicant Demo Account Module (applicant.js)
 *
 * Implements:
 * 1. Applicant Landing Page (Programs, Sample Requirements, Instructions, Apply Now)
 *    - Does NOT expose sample application statuses during normal application flow.
 * 2. Applicant Registration & Application Form (Validation & Submission Confirmation ONLY)
 *    - Year Level strictly limited to Year 1, Year 2, Year 3, and Year 4.
 *    - Displays ONLY a submission confirmation upon submitting an application
 *      (no application status dashboard or status tracker on the submission page).
 * 3. Dedicated Application Status Page (Applicant Demo Account ONLY)
 *    - Visible only after logging into the separate "Applicant Demo Account".
 *    - Displays sample applicant information and sample application status records
 *      (Submitted, Under Review, Approved, Rejected), clearly distinguished from
 *      actual applications and labeled as simulated demo data.
 * ============================================================================
 */

const StudentHubApplicant = (function () {
  const {
    escapeHtml,
    formatReadableDate,
    isValidEmail,
    clearFormErrors,
    setFieldError,
    openModal,
    closeModal,
    showToast,
    navigateTo,
    refreshAll
  } = window.StudentHubApp;

  const AVAILABLE_PROGRAMS = [
    {
      code: "BSIT",
      title: "Bachelor of Science in Information Technology (BSIT)",
      college: "College of Information Technology & Computing",
      duration: "4 Years (Year 1–Year 4)",
      featured: true,
      description:
        "Focuses on software development, data structures, object-oriented programming, platform technologies, networking, and enterprise systems."
    },
    {
      code: "BSCS",
      title: "Bachelor of Science in Computer Science (BSCS)",
      college: "College of Information Technology & Computing",
      duration: "4 Years (Year 1–Year 4)",
      featured: false,
      description:
        "Covers algorithmic foundations, computational theory, software engineering, and intelligent systems design."
    },
    {
      code: "BSIS",
      title: "Bachelor of Science in Information Systems (BSIS)",
      college: "College of Information Technology & Computing",
      duration: "4 Years (Year 1–Year 4)",
      featured: false,
      description:
        "Integrates information technology solutions with business processes, enterprise data management, and systems analysis."
    },
    {
      code: "BSBA",
      title: "Bachelor of Science in Business Administration (BSBA)",
      college: "College of Business & Management",
      duration: "4 Years (Year 1–Year 4)",
      featured: false,
      description:
        "Prepares students for organizational leadership, operations management, financial analysis, and business communication."
    },
    {
      code: "BSED",
      title: "Bachelor of Secondary Education (BSED)",
      college: "College of Teacher Education",
      duration: "4 Years (Year 1–Year 4)",
      featured: false,
      description:
        "Develops future educators equipped with modern pedagogical strategies, curriculum design, and instructional technology."
    }
  ];

  let preselectedProgram = "";
  let lastSubmittedConfirmation = null;

  function getStatusBadgeClass(status) {
    const s = String(status || "").toLowerCase().trim();
    if (s === "approved") return "badge-success";
    if (s === "rejected") return "badge-danger";
    if (s === "under review") return "badge-info";
    return "badge-warning"; // Pending
  }

  /**
   * Helper: Return short, clear applicant status explanation
   */
  function getStatusExplanation(status) {
    const s = String(status || "").toLowerCase().trim();
    if (s === "approved") {
      return "Congratulations! Your application for admission to BANTUG UNIVERSITY has been approved. Please monitor your registered email address for enrollment instructions and registration schedules.";
    }
    if (s === "rejected") {
      return "We regret to inform you that your application was not accepted for admission for this academic cycle. Thank you for your interest in BANTUG UNIVERSITY.";
    }
    if (s === "under review") {
      return "Your academic credentials and program choices are currently being evaluated by the admissions department faculty. Please check back periodically for updates.";
    }
    // Default: Pending / Submitted
    return "Your admission application has been received and is queued for verification by the Admissions Committee. No further action is required from you at this time.";
  }

  /**
   * Helper: Retrieve the applicant's actual submitted application
   * - Never returns fake simulated demo records
   */
  function getApplicantApplication() {
    if (lastSubmittedConfirmation && lastSubmittedConfirmation.referenceNumber) {
      return lastSubmittedConfirmation;
    }

    try {
      const cached = sessionStorage.getItem("bu_last_submitted_app");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.referenceNumber) {
          lastSubmittedConfirmation = parsed;
          return parsed;
        }
      }
    } catch (_) {}

    const state = StudentHubStorage.getState();
    const realApps = (state.applications || []).filter((a) => !a.isDemoRecord);
    const session = StudentHubStorage.getSession();

    if (session) {
      const ident = String(session.identifier || "").toLowerCase().trim();
      const displayName = String(session.displayName || "").toLowerCase().trim();

      const matched = realApps.find((a) => {
        if (a.referenceNumber && String(a.referenceNumber).toLowerCase() === ident) return true;
        if (a.email && String(a.email).toLowerCase() === ident) return true;
        if (a.username && String(a.username).toLowerCase() === ident) return true;
        if (session.actorId && a.id === session.actorId) return true;
        if (displayName && a.fullName && String(a.fullName).toLowerCase() === displayName) return true;
        return false;
      });

      if (matched) return matched;
    }

    return null;
  }

  /**
   * Helper: Format any ISO date / YYYY-MM-DD string into MM/DD/YYYY
   */
  function formatDateMMDDYYYY(dateStr) {
    if (!dateStr) return "";
    const str = String(dateStr).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[2]}/${match[3]}/${match[1]}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    }
    return str;
  }

  /**
   * Helper: Validate Date of Birth in MM/DD/YYYY format
   * - Ensures real calendar date (checks leap years, valid days per month)
   * - Rejects future dates
   * - Converts to YYYY-MM-DD for MySQL storage
   */
  function validateDateMMDDYYYY(val) {
    const trimmed = String(val || "").trim();
    if (!trimmed) {
      return { valid: false, error: "Date of birth is required." };
    }
    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      return { valid: false, error: "Date of birth must use MM/DD/YYYY format (e.g. 09/12/2007)." };
    }
    const mm = parseInt(match[1], 10);
    const dd = parseInt(match[2], 10);
    const yyyy = parseInt(match[3], 10);

    if (mm < 1 || mm > 12) {
      return { valid: false, error: "Invalid month. Month must be between 01 and 12." };
    }
    const isLeapYear = (yyyy % 4 === 0 && yyyy % 100 !== 0) || (yyyy % 400 === 0);
    const daysInMonths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const maxDays = daysInMonths[mm - 1];

    if (dd < 1 || dd > maxDays) {
      return {
        valid: false,
        error: `Invalid day. Month ${String(mm).padStart(2, "0")} has ${maxDays} days in year ${yyyy}.`
      };
    }

    const today = new Date();
    if (yyyy < 1920) {
      return { valid: false, error: "Year of birth cannot be earlier than 1920." };
    }

    const inputDate = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);
    if (inputDate > today) {
      return { valid: false, error: "Date of birth cannot be a future date." };
    }

    const mysqlDate = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const displayDate = `${String(mm).padStart(2, "0")}/${String(dd).padStart(2, "0")}/${yyyy}`;
    return { valid: true, mysqlDate, displayDate };
  }

  /**
   * Helper: Validate individual name components (First, Middle, Last)
   * - Accepts letters, spaces (compound names like "Maria Clara", "Dela Cruz"), hyphens, apostrophes
   * - Rejects numbers and invalid special characters
   * - Trims whitespace
   */
  function validateNamePart(value, fieldLabel, isOptional = false) {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      if (isOptional) return { valid: true, value: "" };
      return { valid: false, error: `${fieldLabel} is required.` };
    }
    if (/\d/.test(trimmed)) {
      return { valid: false, error: `${fieldLabel} cannot contain numbers.` };
    }
    // Allow Latin/Filipino letters (including ñ, Ñ, accented chars), spaces, hyphens, and apostrophes
    const nameRegex = /^[A-Za-z\u00C0-\u00FF\u0100-\u017F\u00f1\u00d1]+([ A-Za-z\u00C0-\u00FF\u0100-\u017F\u00f1\u00d1'\-]*[A-Za-z\u00C0-\u00FF\u0100-\u017F\u00f1\u00d1]+)?$/;
    if (!nameRegex.test(trimmed)) {
      return {
        valid: false,
        error: `${fieldLabel} contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed.`
      };
    }
    if (trimmed.length < 2) {
      return { valid: false, error: `${fieldLabel} must be at least 2 characters.` };
    }
    if (trimmed.length > 50) {
      return { valid: false, error: `${fieldLabel} must not exceed 50 characters.` };
    }
    return { valid: true, value: trimmed };
  }

  /**
   * Helper: Validate Philippine Contact Number
   * - Fixed +63 international prefix
   * - Exactly 10 digits after prefix, starting with 9
   * - Rejects letters and special characters
   * - Prevents duplicate country codes
   */
  function validatePhilippineContact(value) {
    let raw = String(value || "").trim();
    // Strip accidental leading +63, 63, or 0
    raw = raw.replace(/^\+?63\s*/, "").replace(/^0/, "");
    if (/[^\d\s\-]/.test(raw)) {
      return { valid: false, error: "Contact number can only contain digits." };
    }
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      return { valid: false, error: "Contact number is required." };
    }
    if (digits.length !== 10) {
      return {
        valid: false,
        error: `Contact number must be exactly 10 digits after +63 (currently ${digits.length} digits).`
      };
    }
    if (!digits.startsWith("9")) {
      return {
        valid: false,
        error: "Philippine mobile numbers must start with 9 (e.g. 9XXXXXXXXX)."
      };
    }
    const normalized = `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return { valid: true, digits, normalized };
  }

  /**
   * Helper: Validate Graduation Year
   * - Must consist of exactly 4 numerical digits
   * - Rejects decimals, letters, special characters
   * - Rejects future years (max current year 2026) and years before 1950
   */
  function validateGraduationYear(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return { valid: false, error: "Year graduated / completed is required." };
    }
    if (/\./.test(trimmed) || /\,/.test(trimmed)) {
      return { valid: false, error: "Year graduated must be a 4-digit integer without decimals." };
    }
    if (!/^\d{4}$/.test(trimmed)) {
      return { valid: false, error: "Year graduated must consist of exactly 4 numerical digits." };
    }
    const yr = parseInt(trimmed, 10);
    const currentYear = new Date().getFullYear();
    if (yr < 1950) {
      return { valid: false, error: "Year graduated cannot be earlier than 1950." };
    }
    if (yr > currentYear) {
      return { valid: false, error: `Year graduated cannot be in the future (maximum ${currentYear}).` };
    }
    return { valid: true, year: String(yr) };
  }

  /**
   * Helper: Validate Academic Program Choices
   * - First choice is required
   * - Second choice must be different from First choice
   */
  function validateProgramChoices(desiredProgram, secondChoiceProgram) {
    if (!desiredProgram) {
      return { valid: false, field: "desiredProgram", error: "Please select your desired academic program (1st Choice)." };
    }
    if (
      secondChoiceProgram &&
      secondChoiceProgram !== "None" &&
      secondChoiceProgram.trim().toLowerCase() === desiredProgram.trim().toLowerCase()
    ) {
      return {
        valid: false,
        field: "secondChoiceProgram",
        error: "Your second-choice program must be different from your first choice."
      };
    }
    return { valid: true };
  }

  /**
   * Helper: Copy reference number to clipboard with accessible feedback
   */
  async function copyReferenceNumberToClipboard(text, btnEl, feedbackEl) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;

    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(cleanText);
        success = true;
      } catch (_) {
        success = false;
      }
    }

    if (!success) {
      try {
        const tempTextArea = document.createElement("textarea");
        tempTextArea.value = cleanText;
        tempTextArea.style.position = "fixed";
        tempTextArea.style.top = "-9999px";
        tempTextArea.style.left = "-9999px";
        tempTextArea.setAttribute("readonly", "");
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        success = document.execCommand("copy");
        document.body.removeChild(tempTextArea);
      } catch (_) {
        success = false;
      }
    }

    if (success) {
      if (btnEl) {
        const textSpan = btnEl.querySelector(".copy-btn-text");
        const originalText = textSpan ? textSpan.textContent : "Copy Reference Number";
        btnEl.classList.add("btn-copied");
        if (textSpan) textSpan.textContent = "Copied!";
        setTimeout(() => {
          btnEl.classList.remove("btn-copied");
          if (textSpan) textSpan.textContent = originalText;
        }, 2500);
      }
      if (feedbackEl) {
        feedbackEl.textContent = "Reference number copied!";
        feedbackEl.style.display = "inline-block";
        setTimeout(() => {
          feedbackEl.textContent = "";
          feedbackEl.style.display = "none";
        }, 3000);
      }
      showToast("Reference number copied to clipboard!", "success");
    } else {
      showToast("Unable to copy to clipboard automatically.", "warning");
    }
  }

  /**
   * 1. ADMISSION OVERVIEW DASHBOARD (Phase 3 Redesign)
   * Displays the applicant's official admission overview using actual submitted application
   * data from the database, or a helpful empty state prompting them to apply.
   */
  function renderLanding() {
    const container = document.getElementById("applicantLandingContainer");
    if (!container) return;

    const app = getApplicantApplication();

    container.innerHTML = `
      <!-- Responsive Applicant Navigation Tabs (Mobile & Desktop accessible without hamburger) -->
      <div class="applicant-nav-tabs">
        <button type="button" class="applicant-tab-btn active" data-app-nav="applicant-landing">
          <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Admission Overview</span>
        </button>
        <button type="button" class="applicant-tab-btn" data-app-nav="applicant-form">
          <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <span>Application Form</span>
        </button>
      </div>

      <!-- Page Header -->
      <div class="section-header">
        <div class="section-header-info">
          <h2>Admission Overview</h2>
          <p>Review your official freshman admission application status and submitted program choices.</p>
        </div>
        <div class="section-header-actions">
          <button type="button" class="btn btn-secondary" id="applicantAccountDetailsBtn">
            Account Preferences
          </button>
          <button type="button" class="btn btn-primary" data-app-nav="applicant-form">
            ${app ? "+ Submit Another Application" : "Complete Application Form &rarr;"}
          </button>
        </div>
      </div>

      ${
        app
          ? `
        <!-- Submitted Application Overview Card -->
        <div class="card admission-card" style="margin-bottom:24px;">
          <div class="card-header" style="flex-wrap:wrap;gap:14px;align-items:flex-start;">
            <div>
              <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.06em;color:var(--royal-600);text-transform:uppercase;margin-bottom:4px;">
                Admissions Application Record
              </div>
              <h3 style="font-size:1.6rem;color:var(--royal-900);margin:0 0 8px;">${escapeHtml(app.fullName)}</h3>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="font-size:0.88rem;color:var(--text-secondary);">
                  Reference Number: <strong style="font-family:var(--font-mono);font-size:0.96rem;color:var(--royal-800);">${escapeHtml(app.referenceNumber)}</strong>
                </span>
                <button
                  type="button"
                  class="btn btn-sm btn-secondary copy-ref-btn"
                  id="overviewCopyRefBtn"
                  data-ref="${escapeHtml(app.referenceNumber)}"
                  title="Copy reference number to clipboard"
                  aria-label="Copy reference number ${escapeHtml(app.referenceNumber)}"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span class="copy-btn-text">Copy Reference</span>
                </button>
                <span id="overviewCopyFeedback" class="copy-success-indicator" style="display:none;" role="status">Reference number copied!</span>
              </div>
            </div>

            <div style="text-align:right;">
              <span class="badge ${getStatusBadgeClass(app.status)}" style="font-size:0.92rem;padding:6px 16px;font-weight:700;">
                Status: ${escapeHtml(app.status || "Pending")}
              </span>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">
                Submission Date: <strong>${escapeHtml(formatReadableDate(app.submittedDate))}</strong>
              </div>
            </div>
          </div>

          <!-- Status Explanation Callout -->
          <div class="notice-banner" style="margin:16px 0 20px;">
            <div>
              <strong>Current Application Status &mdash; ${escapeHtml(app.status || "Pending")}:</strong>
              ${escapeHtml(getStatusExplanation(app.status))}
            </div>
          </div>

          <!-- Application Details Grid -->
          <div class="form-grid" style="margin-top:14px;">
            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Selected First-Choice Program</div>
                <div class="dash-item-title" style="color:var(--royal-700);font-weight:700;">${escapeHtml(app.desiredProgram)}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Alternative Program (2nd Choice)</div>
                <div class="dash-item-title">${escapeHtml(app.secondChoiceProgram || "None")}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Applicant Full Name</div>
                <div class="dash-item-title">${escapeHtml(app.fullName)}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Date of Birth (MM/DD/YYYY)</div>
                <div class="dash-item-title">${escapeHtml(formatDateMMDDYYYY(app.dateOfBirth))}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Applying For Year Level</div>
                <div class="dash-item-title"><span class="badge badge-primary">${escapeHtml(app.yearLevel || "Year 1")}</span></div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Applicant Classification</div>
                <div class="dash-item-title">${escapeHtml(app.applicantType)}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Email Address</div>
                <div class="dash-item-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span>${escapeHtml(app.email)}</span>
                  <span class="badge ${app.emailVerified ? 'badge-success' : 'badge-warning'}">
                    ${app.emailVerified ? 'Email Verified' : 'Pending Verification'}
                  </span>
                  ${
                    !app.emailVerified
                      ? `<button type="button" class="btn btn-xs btn-outline-primary" id="overviewVerifyEmailBtn" style="padding:2px 8px;font-size:0.75rem;">Verify Email</button>`
                      : ""
                  }
                </div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Contact Number</div>
                <div class="dash-item-title">${escapeHtml(app.contactNumber)}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Previous School Attended</div>
                <div class="dash-item-title">${escapeHtml(app.previousSchool)}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Complete Home Address</div>
                <div class="dash-item-title">${escapeHtml(app.address)}</div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div style="margin-top:22px;padding-top:16px;border-top:1px solid var(--border-color);display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary" id="viewFullReceiptBtn">
              View Full Confirmation Receipt
            </button>
            <button type="button" class="btn btn-secondary" id="printOverviewBtn">
              Print Status Summary
            </button>
            <button type="button" class="btn btn-primary" id="newApplicationFromOverviewBtn">
              + Submit Another Application
            </button>
          </div>
        </div>
      `
          : `
        <!-- Helpful Empty State: Prompting Applicant to Complete Form -->
        <div class="card empty-state-card" style="text-align:center;padding:48px 24px;margin-bottom:24px;">
          <div style="width:68px;height:68px;border-radius:50%;background:var(--royal-50);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <svg viewBox="0 0 24 24" width="34" height="34" stroke="currentColor" stroke-width="2" fill="none" style="color:var(--royal-600);">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <h3 style="font-size:1.45rem;color:var(--royal-900);margin-bottom:8px;">No Application Submitted Yet</h3>
          <p style="font-size:0.95rem;color:var(--text-secondary);max-width:580px;margin:0 auto 22px;line-height:1.55;">
            Welcome to BANTUG UNIVERSITY Admissions. You have not submitted an admission application yet. To apply for freshman admission, please review our degree programs below and fill out the online application form.
          </p>
          <button type="button" class="btn btn-primary btn-lg" id="emptyStateApplyBtn" style="padding:10px 26px;font-size:0.95rem;">
            Complete Application Form &rarr;
          </button>
        </div>

        <!-- Available Academic Degree Programs -->
        <div class="section-header" style="margin-bottom:14px;">
          <div class="section-header-info">
            <h3 style="font-size:1.2rem;">Available Academic Degree Programs</h3>
            <p>Review our 4-year undergraduate degree programs (Year 1 to Year 4) below.</p>
          </div>
        </div>

        <div class="programs-grid">
          ${AVAILABLE_PROGRAMS.map(
            (prog) => `
            <div class="program-card ${prog.featured ? "featured-program" : ""}">
              <div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
                  <span class="badge ${prog.featured ? "badge-primary" : "badge-info"}">${escapeHtml(prog.code)}</span>
                  <span style="font-size:0.76rem;color:var(--text-muted);font-weight:600;">${escapeHtml(prog.duration)}</span>
                </div>
                <h4 style="font-size:1rem;margin-bottom:4px;">${escapeHtml(prog.title)}</h4>
                <div style="font-size:0.78rem;color:var(--royal-600);font-weight:600;margin-bottom:8px;">
                  ${escapeHtml(prog.college)}
                </div>
                <p style="font-size:0.84rem;color:var(--text-secondary);">${escapeHtml(prog.description)}</p>
              </div>
              <div style="padding-top:10px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;">
                <button
                  type="button"
                  class="btn btn-sm btn-primary select-program-apply-btn"
                  data-program="${escapeHtml(prog.title)}"
                >
                  Apply for ${escapeHtml(prog.code)} &rarr;
                </button>
              </div>
            </div>
          `
          ).join("")}
        </div>
      `
      }
    `;

    // Tab and Navigation Links
    container.querySelectorAll("[data-app-nav]").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.getAttribute("data-app-nav")));
    });

    const emptyApplyBtn = document.getElementById("emptyStateApplyBtn");
    if (emptyApplyBtn) {
      emptyApplyBtn.addEventListener("click", () => {
        preselectedProgram = "";
        navigateTo("applicant-form");
      });
    }

    container.querySelectorAll(".select-program-apply-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        preselectedProgram = btn.getAttribute("data-program");
        lastSubmittedConfirmation = null;
        try {
          sessionStorage.removeItem("bu_last_submitted_app");
        } catch (_) {}
        navigateTo("applicant-form");
      });
    });

    // Copy reference button on overview
    const copyRefBtn = document.getElementById("overviewCopyRefBtn");
    const copyFeedback = document.getElementById("overviewCopyFeedback");
    if (copyRefBtn && app) {
      copyRefBtn.addEventListener("click", async () => {
        const refToCopy = copyRefBtn.getAttribute("data-ref") || app.referenceNumber;
        await copyReferenceNumberToClipboard(refToCopy, copyRefBtn, copyFeedback);
      });
    }

    // View full confirmation receipt
    const viewReceiptBtn = document.getElementById("viewFullReceiptBtn");
    if (viewReceiptBtn && app) {
      viewReceiptBtn.addEventListener("click", () => {
        lastSubmittedConfirmation = app;
        try {
          sessionStorage.setItem("bu_last_submitted_app", JSON.stringify(app));
        } catch (_) {}
        navigateTo("applicant-form");
      });
    }

    // Print summary
    const printBtn = document.getElementById("printOverviewBtn");
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        window.print();
      });
    }

    // Account Preferences / Details button on overview
    const accountDetailsBtn = document.getElementById("applicantAccountDetailsBtn");
    if (accountDetailsBtn) {
      accountDetailsBtn.addEventListener("click", openApplicantAccountModal);
    }

    // Verify Email button on overview
    const verifyEmailBtn = document.getElementById("overviewVerifyEmailBtn");
    if (verifyEmailBtn && app) {
      verifyEmailBtn.addEventListener("click", () => {
        openEmailOtpModal(app.email, app.referenceNumber, app.fullName);
      });
    }

    // Submit another application
    const newAppBtn = document.getElementById("newApplicationFromOverviewBtn");
    if (newAppBtn) {
      newAppBtn.addEventListener("click", () => {
        lastSubmittedConfirmation = null;
        preselectedProgram = "";
        try {
          sessionStorage.removeItem("bu_last_submitted_app");
        } catch (_) {}
        navigateTo("applicant-form");
      });
    }
  }

  /**
   * 2. APPLICANT REGISTRATION & APPLICATION FORM
   * Displays the clean, professional Application Confirmation Receipt upon successful submission.
   * Does not display repetitive technical database messages.
   */
  function renderForm() {
    const container = document.getElementById("applicantFormContainer");
    if (!container) return;

    // Retrieve saved confirmation from session storage to prevent reference number re-generation on refresh
    if (!lastSubmittedConfirmation) {
      try {
        const cached = sessionStorage.getItem("bu_last_submitted_app");
        if (cached) {
          lastSubmittedConfirmation = JSON.parse(cached);
        }
      } catch (_) {}
    }

    if (lastSubmittedConfirmation) {
      const c = lastSubmittedConfirmation;
      container.innerHTML = `
        <div class="section-header">
          <div class="section-header-info">
            <h2>BANTUG UNIVERSITY &mdash; Application Confirmation Receipt</h2>
            <p>Your online admission application has been successfully received.</p>
          </div>
          <div class="section-header-actions">
            <button type="button" class="btn btn-secondary" id="printAppReceiptBtn" title="Print this confirmation receipt">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;vertical-align:text-bottom;">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print Receipt
            </button>
            <button type="button" class="btn btn-secondary" id="backToProgramsAfterSubmitBtn">
              &larr; Back to Admissions Overview
            </button>
            <button type="button" class="btn btn-primary" id="submitAnotherNewAppBtn">
              + Submit Another Application
            </button>
          </div>
        </div>

        <div class="card" style="max-width:760px;margin:0 auto;text-align:center;padding:34px 26px;">
          <div style="margin-bottom:14px;">
            <span class="badge badge-success" style="font-size:0.92rem;padding:8px 20px;font-weight:700;">
              Application Submitted Successfully!
            </span>
          </div>

          <h3 style="font-size:1.5rem;margin-bottom:8px;color:var(--royal-900);">
            Thank you for applying to BANTUG UNIVERSITY, ${escapeHtml(c.fullName)}!
          </h3>

          <p style="font-size:0.96rem;color:var(--text-secondary);max-width:600px;margin:0 auto 22px;line-height:1.5;">
            Your application has been successfully received. Your current application status is <strong>Pending</strong>.
          </p>

          <!-- Clean Professional Reference Box -->
          <div class="confirmation-ref-box">
            <div class="ref-box-eyebrow">Application Reference Number</div>
            <div class="ref-box-number" id="appRefNumberVal">${escapeHtml(c.referenceNumber)}</div>
            <div class="ref-box-actions">
              <button
                type="button"
                class="btn btn-primary copy-ref-btn"
                id="copyRefNumBtn"
                data-ref="${escapeHtml(c.referenceNumber)}"
                aria-label="Copy application reference number ${escapeHtml(c.referenceNumber)}"
                title="Copy reference number to clipboard"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:text-bottom;">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span class="copy-btn-text">Copy Reference Number</span>
              </button>
              <span id="copyFeedbackIndicator" class="copy-success-indicator" style="display:none;" role="status">Reference number copied!</span>
            </div>
            <p class="ref-box-notice">
              Please keep your reference number. You may use it to track your application status or when contacting the university regarding your application.
            </p>
            <div class="ref-box-meta">
              Submitted on ${escapeHtml(formatReadableDate(c.submittedDate))} &bull; Application Status: <strong>Pending</strong>
            </div>
          </div>

          <!-- Email Verification Section on Confirmation Receipt -->
          <div class="card" style="margin:20px 0;background:#f8fafc;border:1px solid ${c.emailVerified ? '#86efac' : '#cbd5e1'};text-align:left;">
            <div class="card-header" style="border-bottom:1px solid #e2e8f0;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
              <span style="font-weight:700;color:var(--text-dark);font-size:0.95rem;">
                Email Address Verification
              </span>
              <span id="receiptVerificationStatusBadge" class="badge ${c.emailVerified ? 'badge-success' : 'badge-warning'}">
                ${c.emailVerified ? '&#10003; Verified' : 'Pending Verification'}
              </span>
            </div>
            <div class="card-body" style="padding:16px;">
              ${
                c.emailVerified
                  ? `<p style="margin:0;font-size:0.9rem;color:#166534;font-weight:500;">
                      &#10003; Email address <strong>${escapeHtml(c.email)}</strong> has been successfully verified. Official admission notifications and enrollment updates will be delivered here.
                    </p>`
                  : `<p style="margin:0 0 12px 0;font-size:0.88rem;color:var(--text-muted);">
                      A 6-digit one-time verification code (OTP) was sent to <strong>${escapeHtml(c.email)}</strong>. Enter the 6-digit code below to confirm email ownership.
                    </p>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
                      <input
                        type="text"
                        id="receiptOtpInput"
                        class="form-control"
                        placeholder="000000"
                        maxlength="6"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        style="width:160px;font-size:1.15rem;letter-spacing:4px;text-align:center;font-weight:700;"
                      />
                      <button type="button" class="btn btn-primary" id="receiptVerifyOtpBtn">Verify Email</button>
                      <button type="button" class="btn btn-secondary" id="receiptResendOtpBtn">Resend Code</button>
                      <span id="receiptResendTimer" style="font-size:0.82rem;color:var(--text-muted);"></span>
                    </div>
                    <div id="receiptOtpFeedback" style="margin-top:10px;font-size:0.85rem;display:none;"></div>`
              }
            </div>
          </div>

          <!-- Submitted Information Summary Grid -->
          <div class="form-grid" style="text-align:left;margin-bottom:24px;">
            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Applicant Full Name</div>
                <div class="dash-item-title">${escapeHtml(c.fullName)}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Date of Birth (MM/DD/YYYY)</div>
                <div class="dash-item-title">${escapeHtml(formatDateMMDDYYYY(c.dateOfBirth))}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Applying For Year Level</div>
                <div class="dash-item-title"><span class="badge badge-primary">${escapeHtml(c.yearLevel || "Year 1")}</span></div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Desired Academic Program (1st Choice)</div>
                <div class="dash-item-title">${escapeHtml(c.desiredProgram)}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Alternative Program (2nd Choice)</div>
                <div class="dash-item-title">${escapeHtml(c.secondChoiceProgram || "None")}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Applicant Classification</div>
                <div class="dash-item-title">${escapeHtml(c.applicantType)}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Email Address</div>
                <div class="dash-item-title" style="display:flex;align-items:center;gap:8px;">
                  <span>${escapeHtml(c.email)}</span>
                  <span class="badge ${c.emailVerified ? 'badge-success' : 'badge-warning'}" style="font-size:0.75rem;">
                    ${c.emailVerified ? '&#10003; Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Contact Number</div>
                <div class="dash-item-title">${escapeHtml(c.contactNumber)}</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Previous School Attended</div>
                <div class="dash-item-title">${escapeHtml(c.previousSchool)} (${escapeHtml(c.graduationYear)})</div>
              </div>
            </div>

            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Educational Background / Track</div>
                <div class="dash-item-title">${escapeHtml(c.educationalBackground)}</div>
              </div>
            </div>
          </div>

          <div class="modal-actions" style="justify-content:center;">
            <button type="button" class="btn btn-secondary" id="confirmReturnOverviewBtn">
              Return to Admissions Overview
            </button>
            <button type="button" class="btn btn-primary" id="confirmNewBlankFormBtn">
              Fill Out New Application Form
            </button>
          </div>
        </div>
      `;

      // Copy Reference Number handler
      const copyBtn = document.getElementById("copyRefNumBtn");
      const copyIndicator = document.getElementById("copyFeedbackIndicator");
      if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
          const refToCopy = copyBtn.getAttribute("data-ref") || c.referenceNumber;
          await copyReferenceNumberToClipboard(refToCopy, copyBtn, copyIndicator);
        });
      }

      // Print Receipt handler
      const printBtn = document.getElementById("printAppReceiptBtn");
      if (printBtn) {
        printBtn.addEventListener("click", () => {
          window.print();
        });
      }

      // Receipt OTP Verification Handlers
      const receiptOtpInput = document.getElementById("receiptOtpInput");
      const receiptVerifyBtn = document.getElementById("receiptVerifyOtpBtn");
      const receiptResendBtn = document.getElementById("receiptResendOtpBtn");
      const receiptResendTimer = document.getElementById("receiptResendTimer");
      const receiptFeedback = document.getElementById("receiptOtpFeedback");

      let receiptCooldown = 0;
      let receiptInterval = null;

      const startReceiptCooldown = (seconds = 60) => {
        receiptCooldown = seconds;
        if (receiptResendBtn) receiptResendBtn.disabled = true;
        if (receiptResendTimer) receiptResendTimer.textContent = `Wait ${receiptCooldown}s to resend`;

        if (receiptInterval) clearInterval(receiptInterval);
        receiptInterval = setInterval(() => {
          receiptCooldown -= 1;
          if (receiptCooldown <= 0) {
            clearInterval(receiptInterval);
            receiptInterval = null;
            if (receiptResendBtn) receiptResendBtn.disabled = false;
            if (receiptResendTimer) receiptResendTimer.textContent = "";
          } else {
            if (receiptResendTimer) receiptResendTimer.textContent = `Wait ${receiptCooldown}s to resend`;
          }
        }, 1000);
      };

      if (receiptVerifyBtn && receiptOtpInput) {
        receiptVerifyBtn.addEventListener("click", async () => {
          const code = String(receiptOtpInput.value || "").trim();
          if (receiptFeedback) receiptFeedback.style.display = "none";

          if (!code || !/^\d{6}$/.test(code)) {
            if (receiptFeedback) {
              receiptFeedback.textContent = "Please enter a valid 6-digit numeric verification code.";
              receiptFeedback.style.color = "#dc2626";
              receiptFeedback.style.display = "block";
            }
            return;
          }

          receiptVerifyBtn.disabled = true;
          receiptVerifyBtn.textContent = "Verifying...";

          try {
            const res = await fetch("/api/otp/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: c.email,
                otp: code,
                purpose: "applicant_email_verification",
                referenceId: c.referenceNumber
              })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              receiptVerifyBtn.disabled = false;
              receiptVerifyBtn.textContent = "Verify Email";
              if (receiptFeedback) {
                receiptFeedback.textContent = data.message || "Invalid or expired verification code.";
                receiptFeedback.style.color = "#dc2626";
                receiptFeedback.style.display = "block";
              }
              return;
            }

            // Successfully verified!
            c.emailVerified = true;
            if (lastSubmittedConfirmation) {
              lastSubmittedConfirmation.emailVerified = true;
              try {
                sessionStorage.setItem("bu_last_submitted_app", JSON.stringify(lastSubmittedConfirmation));
              } catch (_) {}
            }
            try {
              const sess = StudentHubStorage.getSession();
              if (sess) {
                sess.emailVerified = true;
                StudentHubStorage.setSession(sess);
              }
            } catch (_) {}

            showToast("Email address successfully verified!", "success");
            renderForm(); // Re-renders confirmation receipt in verified state
          } catch (_) {
            receiptVerifyBtn.disabled = false;
            receiptVerifyBtn.textContent = "Verify Email";
            if (receiptFeedback) {
              receiptFeedback.textContent = "Network error. Please try again.";
              receiptFeedback.style.color = "#dc2626";
              receiptFeedback.style.display = "block";
            }
          }
        });
      }

      if (receiptResendBtn) {
        receiptResendBtn.addEventListener("click", async () => {
          if (receiptCooldown > 0) return;
          if (receiptFeedback) receiptFeedback.style.display = "none";
          receiptResendBtn.disabled = true;

          try {
            const res = await fetch("/api/otp/request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: c.email,
                purpose: "applicant_email_verification",
                referenceId: c.referenceNumber,
                recipientName: c.fullName
              })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              if (data.cooldownRemaining) {
                startReceiptCooldown(data.cooldownRemaining);
              }
              if (receiptFeedback) {
                receiptFeedback.textContent = data.message || "Failed to resend verification code.";
                receiptFeedback.style.color = "#dc2626";
                receiptFeedback.style.display = "block";
              }
              showToast(data.message || "Unable to resend code at this time.", "error");
              return;
            }

            showToast("A new 6-digit verification code has been dispatched to your email.", "success");
            startReceiptCooldown(data.cooldownSeconds || 60);
          } catch (_) {
            if (receiptFeedback) {
              receiptFeedback.textContent = "Network error. Please try again.";
              receiptFeedback.style.color = "#dc2626";
              receiptFeedback.style.display = "block";
            }
            receiptResendBtn.disabled = false;
          }
        });
      }

      const clearSessionAndReturn = () => {
        try {
          sessionStorage.removeItem("bu_last_submitted_app");
        } catch (_) {}
        lastSubmittedConfirmation = null;
        navigateTo("applicant-landing");
      };

      const clearSessionAndNewForm = () => {
        try {
          sessionStorage.removeItem("bu_last_submitted_app");
        } catch (_) {}
        lastSubmittedConfirmation = null;
        renderForm();
      };

      const backProgramsBtn = document.getElementById("backToProgramsAfterSubmitBtn");
      if (backProgramsBtn) backProgramsBtn.addEventListener("click", clearSessionAndReturn);

      const returnOverviewBtn = document.getElementById("confirmReturnOverviewBtn");
      if (returnOverviewBtn) returnOverviewBtn.addEventListener("click", clearSessionAndReturn);

      const newAppBtn1 = document.getElementById("submitAnotherNewAppBtn");
      if (newAppBtn1) newAppBtn1.addEventListener("click", clearSessionAndNewForm);

      const newAppBtn2 = document.getElementById("confirmNewBlankFormBtn");
      if (newAppBtn2) newAppBtn2.addEventListener("click", clearSessionAndNewForm);

      return;
    }

    container.innerHTML = `
      <!-- Responsive Applicant Navigation Tabs -->
      <div class="applicant-nav-tabs">
        <button type="button" class="applicant-tab-btn" data-app-nav="applicant-landing">
          <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Admission Overview</span>
        </button>
        <button type="button" class="applicant-tab-btn active" data-app-nav="applicant-form">
          <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <span>Application Form</span>
        </button>
      </div>

      <div class="section-header">
        <div class="section-header-info">
          <h2>Online Application Form</h2>
          <p>Complete all required fields (*) below to submit your admission application.</p>
        </div>
        <div class="section-header-actions">
          <button type="button" class="btn btn-secondary" data-app-nav="applicant-landing">
            &larr; Back to Admission Overview
          </button>
        </div>
      </div>

      <div class="notice-banner">
        <div>
          <strong>Application Instructions:</strong> Please ensure all personal, contact, and academic details provided are complete and accurate. All fields marked with (*) are required. Upon submission, an official application confirmation receipt with your unique reference number will be generated.
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Applicant Personal, Contact &amp; Academic Information</h3>
          <span class="badge badge-primary">Undergraduate Admissions</span>
        </div>

        <form id="universityApplicationForm" novalidate>
          <div class="form-grid">
            <!-- 1. Applicant Name Validation: Last Name, First Name, Middle Name -->
            <div class="form-group full-width">
              <div class="name-grid-3">
                <div class="form-group-sub">
                  <label class="form-label" for="appLastName">Last Name <span class="req">*</span></label>
                  <input
                    type="text"
                    id="appLastName"
                    name="lastName"
                    class="form-control"
                    placeholder="e.g. Dela Cruz"
                    autocomplete="family-name"
                    value=""
                  />
                  <div class="field-error" data-error-for="lastName"></div>
                </div>

                <div class="form-group-sub">
                  <label class="form-label" for="appFirstName">First Name <span class="req">*</span></label>
                  <input
                    type="text"
                    id="appFirstName"
                    name="firstName"
                    class="form-control"
                    placeholder="e.g. Maria Clara"
                    autocomplete="given-name"
                    value=""
                  />
                  <div class="field-error" data-error-for="firstName"></div>
                </div>

                <div class="form-group-sub">
                  <label class="form-label" for="appMiddleName">Middle Name <span style="font-size:0.75rem;color:var(--text-muted);font-weight:normal;">(Optional)</span></label>
                  <input
                    type="text"
                    id="appMiddleName"
                    name="middleName"
                    class="form-control"
                    placeholder="e.g. Santos"
                    autocomplete="additional-name"
                    value=""
                  />
                  <div class="field-error" data-error-for="middleName"></div>
                </div>
              </div>
            </div>

            <!-- 2. Date of Birth (Strict MM/DD/YYYY Format - Starts Empty) -->
            <div class="form-group">
              <label class="form-label" for="appDob">Date of Birth (MM/DD/YYYY) <span class="req">*</span></label>
              <input
                type="text"
                id="appDob"
                name="dateOfBirth"
                class="form-control"
                placeholder="MM/DD/YYYY"
                maxlength="10"
                value=""
              />
              <small class="form-hint">Format: MM/DD/YYYY (e.g. 09/12/2007)</small>
              <div class="field-error" data-error-for="dateOfBirth"></div>
            </div>

            <!-- Email Address -->
            <div class="form-group">
              <label class="form-label" for="appEmail">Email Address <span class="req">*</span></label>
              <input
                type="email"
                id="appEmail"
                name="email"
                class="form-control"
                placeholder="e.g. applicant@email.example"
                autocomplete="email"
                value=""
              />
              <div class="field-error" data-error-for="email"></div>
            </div>

            <!-- 3. Philippine Contact Number with Fixed +63 Prefix -->
            <div class="form-group">
              <label class="form-label" for="appContact">Contact Number (Philippines) <span class="req">*</span></label>
              <div class="input-prefix-group">
                <span class="input-fixed-prefix">+63</span>
                <input
                  type="tel"
                  id="appContact"
                  name="contactNumber"
                  class="form-control"
                  placeholder="9175550123"
                  maxlength="10"
                  autocomplete="tel-national"
                  value=""
                />
              </div>
              <small class="form-hint">Fixed +63 prefix. Enter remaining 10 digits starting with 9.</small>
              <div class="field-error" data-error-for="contactNumber"></div>
            </div>

            <!-- Complete Home Address -->
            <div class="form-group full-width">
              <label class="form-label" for="appAddress">Complete Home Address <span class="req">*</span></label>
              <input
                type="text"
                id="appAddress"
                name="address"
                class="form-control"
                placeholder="Street, Barangay, City/Municipality, Province"
                autocomplete="street-address"
                value=""
              />
              <div class="field-error" data-error-for="address"></div>
            </div>

            <!-- 4. Academic & Program Information -->
            <div class="form-group">
              <label class="form-label" for="appDesiredProgram">Desired Academic Program (1st Choice) <span class="req">*</span></label>
              <select id="appDesiredProgram" name="desiredProgram" class="form-control">
                <option value="" disabled ${!preselectedProgram ? "selected" : ""}>-- Select Desired Academic Program (1st Choice) --</option>
                ${AVAILABLE_PROGRAMS.map(
                  (p) =>
                    `<option value="${escapeHtml(p.title)}" ${
                      p.title === preselectedProgram ? "selected" : ""
                    }>${escapeHtml(p.title)}</option>`
                ).join("")}
              </select>
              <div class="field-error" data-error-for="desiredProgram"></div>
            </div>

            <!-- 5. Alternative Program (2nd Choice - Must be Different from 1st Choice) -->
            <div class="form-group">
              <label class="form-label" for="appSecondProgram">Alternative Program (2nd Choice)</label>
              <select id="appSecondProgram" name="secondChoiceProgram" class="form-control">
                <option value="None" selected>None / Not Applicable</option>
                ${AVAILABLE_PROGRAMS.map(
                  (p) => `<option value="${escapeHtml(p.title)}">${escapeHtml(p.title)}</option>`
                ).join("")}
              </select>
              <div class="field-error" data-error-for="secondChoiceProgram"></div>
            </div>

            <!-- 6. Applying For Year Level (Strictly Year 1 for Applicants) -->
            <div class="form-group">
              <label class="form-label" for="appYearLevel">Applying For Year Level <span class="req">*</span></label>
              <input
                type="text"
                id="appYearLevel"
                name="yearLevel"
                class="form-control"
                value="Year 1"
                readonly
                style="background:var(--bg-surface-alt);cursor:not-allowed;font-weight:600;color:var(--royal-700);"
              />
              <small class="form-hint">Admissions are strictly open for incoming freshman (Year 1) applicants.</small>
              <div class="field-error" data-error-for="yearLevel"></div>
            </div>

            <!-- Applicant Classification -->
            <div class="form-group">
              <label class="form-label" for="appType">Applicant Classification <span class="req">*</span></label>
              <select id="appType" name="applicantType" class="form-control">
                <option value="" disabled selected>-- Select Applicant Classification --</option>
                <option value="Senior High School Graduate / Freshman">Senior High School Graduate / Freshman</option>
                <option value="College Transferee">College Transferee</option>
                <option value="Second Degree Applicant">Second Degree Applicant</option>
              </select>
              <div class="field-error" data-error-for="applicantType"></div>
            </div>

            <!-- Previous School Attended -->
            <div class="form-group">
              <label class="form-label" for="appPrevSchool">Previous School Attended <span class="req">*</span></label>
              <input
                type="text"
                id="appPrevSchool"
                name="previousSchool"
                class="form-control"
                placeholder="e.g. Bantug National High School"
                value=""
              />
              <div class="field-error" data-error-for="previousSchool"></div>
            </div>

            <!-- 7. Year Graduated / Completed (Strictly 4 Digits, No Decimals - Starts Empty) -->
            <div class="form-group">
              <label class="form-label" for="appGradYear">Year Graduated / Completed <span class="req">*</span></label>
              <input
                type="text"
                id="appGradYear"
                name="graduationYear"
                class="form-control"
                placeholder="YYYY (e.g. 2026)"
                maxlength="4"
                value=""
              />
              <small class="form-hint">Must be exactly 4 numerical digits (e.g. 2026). Decimals not allowed.</small>
              <div class="field-error" data-error-for="graduationYear"></div>
            </div>

            <!-- Educational Background -->
            <div class="form-group full-width">
              <label class="form-label" for="appEduBg">Educational Background / SHS Track &amp; Strand <span class="req">*</span></label>
              <input
                type="text"
                id="appEduBg"
                name="educationalBackground"
                class="form-control"
                placeholder="e.g. Academic Track - STEM / TVL-ICT Strand"
                value=""
              />
              <div class="field-error" data-error-for="educationalBackground"></div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="reset" class="btn btn-secondary" id="resetApplicantFormBtn">Clear Form</button>
            <button type="submit" class="btn btn-primary">
              Submit Application to BANTUG UNIVERSITY
            </button>
          </div>
        </form>
      </div>
    `;

    container.querySelectorAll("[data-app-nav]").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.getAttribute("data-app-nav")));
    });

    const form = document.getElementById("universityApplicationForm");

    if (form) {
      // Wire real-time error removal on input and change
      form.querySelectorAll("input, select, textarea").forEach((field) => {
        const clearCurrentError = () => {
          field.classList.remove("is-invalid");
          const errEl = form.querySelector(`[data-error-for="${field.name}"]`);
          if (errEl) errEl.textContent = "";
        };
        field.addEventListener("input", clearCurrentError);
        field.addEventListener("change", clearCurrentError);
      });

      // Name inputs: disallow numbers during typing
      ["lastName", "firstName", "middleName"].forEach((name) => {
        const inp = form.querySelector(`[name="${name}"]`);
        if (inp) {
          inp.addEventListener("input", (e) => {
            if (/\d/.test(e.target.value)) {
              e.target.value = e.target.value.replace(/\d/g, "");
            }
          });
        }
      });

      // Date of Birth input: auto-mask MM/DD/YYYY
      const dobInput = form.querySelector('[name="dateOfBirth"]');
      if (dobInput) {
        dobInput.addEventListener("input", (e) => {
          let v = e.target.value.replace(/\D/g, "").slice(0, 8);
          if (v.length >= 5) {
            e.target.value = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
          } else if (v.length >= 3) {
            e.target.value = `${v.slice(0, 2)}/${v.slice(2)}`;
          } else {
            e.target.value = v;
          }
        });
      }

      // Contact Number: disallow non-digits and prevent duplicate +63 / 0 prefix
      const contactInput = form.querySelector('[name="contactNumber"]');
      if (contactInput) {
        contactInput.addEventListener("input", (e) => {
          let v = e.target.value;
          v = v.replace(/^\+?63\s*/, "").replace(/^0/, "");
          e.target.value = v.replace(/\D/g, "").slice(0, 10);
        });
      }

      // Graduation Year: enforce exactly 4 digits, prevent decimals or letters
      const gradYrInput = form.querySelector('[name="graduationYear"]');
      if (gradYrInput) {
        gradYrInput.addEventListener("input", (e) => {
          e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
        });
      }

      // Reset button resets yearLevel back to Year 1
      const resetBtn = document.getElementById("resetApplicantFormBtn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          setTimeout(() => {
            clearFormErrors(form);
            const yl = form.querySelector('[name="yearLevel"]');
            if (yl) yl.value = "Year 1";
          }, 10);
        });
      }
    }


    if (form) {
      let isSubmitting = false;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Prevent accidental duplicate submissions caused by rapid clicks
        if (isSubmitting) return;
        clearFormErrors(form);

        const fd = new FormData(form);
        const lastName = String(fd.get("lastName") || "").trim();
        const firstName = String(fd.get("firstName") || "").trim();
        const middleName = String(fd.get("middleName") || "").trim();
        const dateOfBirthRaw = String(fd.get("dateOfBirth") || "").trim();
        const email = String(fd.get("email") || "").trim();
        const contactRaw = String(fd.get("contactNumber") || "").trim();
        const address = String(fd.get("address") || "").trim();
        const desiredProgram = String(fd.get("desiredProgram") || "").trim();
        const secondChoiceProgram = String(fd.get("secondChoiceProgram") || "None").trim();
        const yearLevel = "Year 1"; // Strictly Year 1 for new applicants
        const applicantType = String(fd.get("applicantType") || "").trim();
        const graduationYearRaw = String(fd.get("graduationYear") || "").trim();
        const previousSchool = String(fd.get("previousSchool") || "").trim();
        const educationalBackground = String(fd.get("educationalBackground") || "").trim();

        let valid = true;

        // 1. Validate Names
        const lastCheck = validateNamePart(lastName, "Last Name", false);
        if (!lastCheck.valid) {
          setFieldError(form, "lastName", lastCheck.error);
          valid = false;
        }

        const firstCheck = validateNamePart(firstName, "First Name", false);
        if (!firstCheck.valid) {
          setFieldError(form, "firstName", firstCheck.error);
          valid = false;
        }

        const middleCheck = validateNamePart(middleName, "Middle Name", true);
        if (!middleCheck.valid) {
          setFieldError(form, "middleName", middleCheck.error);
          valid = false;
        }

        // 2. Validate Date of Birth (MM/DD/YYYY, real date, leap year, no future)
        const dobCheck = validateDateMMDDYYYY(dateOfBirthRaw);
        if (!dobCheck.valid) {
          setFieldError(form, "dateOfBirth", dobCheck.error);
          valid = false;
        }

        // 3. Email
        if (!email || !isValidEmail(email)) {
          setFieldError(form, "email", "Please enter a valid email address.");
          valid = false;
        }

        // 4. Contact Number (+63 9XXXXXXXXX)
        const contactCheck = validatePhilippineContact(contactRaw);
        if (!contactCheck.valid) {
          setFieldError(form, "contactNumber", contactCheck.error);
          valid = false;
        }

        // 5. Address
        if (!address || address.length < 5) {
          setFieldError(form, "address", "Complete home address is required (at least 5 characters).");
          valid = false;
        }

        // 6. Programs (desired vs 2nd choice)
        const programCheck = validateProgramChoices(desiredProgram, secondChoiceProgram);
        if (!programCheck.valid) {
          setFieldError(form, programCheck.field, programCheck.error);
          valid = false;
        }

        // 7. Previous School
        if (!previousSchool || previousSchool.length < 3) {
          setFieldError(form, "previousSchool", "Previous school attended is required.");
          valid = false;
        }

        // 8. Educational Background
        if (!educationalBackground || educationalBackground.length < 3) {
          setFieldError(form, "educationalBackground", "Educational background / strand is required.");
          valid = false;
        }

        // 9. Graduation Year (exactly 4 digits, no decimals, no future)
        const gradCheck = validateGraduationYear(graduationYearRaw);
        if (!gradCheck.valid) {
          setFieldError(form, "graduationYear", gradCheck.error);
          valid = false;
        }

        if (!valid) {
          showToast("Please correct the highlighted errors in the form.", "error");
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent : "Submit Application to BANTUG UNIVERSITY";
        isSubmitting = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Submitting Application...";
        }

        const fullName = middleCheck.value
          ? `${lastCheck.value}, ${firstCheck.value} ${middleCheck.value}`
          : `${lastCheck.value}, ${firstCheck.value}`;

        const newAppPayload = {
          id: StudentHubStorage.uid("app"),
          lastName: lastCheck.value,
          firstName: firstCheck.value,
          middleName: middleCheck.value,
          fullName,
          dateOfBirth: dobCheck.mysqlDate,
          dateOfBirthDisplay: dobCheck.displayDate,
          email,
          contactNumber: contactCheck.normalized,
          address,
          yearLevel: "Year 1",
          applicantType,
          desiredProgram,
          secondChoiceProgram,
          previousSchool,
          educationalBackground,
          graduationYear: gradCheck.year,
          submittedDate: StudentHubStorage.formatLocalDate(new Date()),
          status: "Pending",
          remarks: "Submitted via Online Applicant Portal — Pending Faculty Evaluation.",
          isDemoRecord: false
        };

        const dbResult = await StudentHubStorage.submitApplicationToDatabase(newAppPayload);

        if (!dbResult || !dbResult.ok || !dbResult.application) {
          isSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
          if (dbResult && dbResult.fieldErrors && typeof dbResult.fieldErrors === "object") {
            Object.entries(dbResult.fieldErrors).forEach(([field, msg]) => {
              setFieldError(form, field, msg);
            });
          }
          showToast(
            (dbResult && (dbResult.message || dbResult.error)) ||
              "Unable to submit application at this time. Please verify your information and try again.",
            "error"
          );
          return;
        }

        const savedApp = dbResult.application;
        lastSubmittedConfirmation = savedApp;
        try {
          sessionStorage.setItem("bu_last_submitted_app", JSON.stringify(savedApp));
        } catch (_) {}
        isSubmitting = false;

        // Render single clean confirmation receipt section (without redundant technical modal)
        renderForm();
        window.scrollTo({ top: 0, behavior: "smooth" });

        showToast(
          `Application submitted successfully! Ref: ${savedApp.referenceNumber}`,
          "success"
        );
      });
    }
  }

  /**
   * 3. APPLICATION STATUS / ADMISSION OVERVIEW (Phase 3 Redesign)
   * The applicant status tracker is now unified directly into the official Admission Overview
   * dashboard, displaying only the applicant's real submitted application information.
   */
  function renderStatus() {
    renderLanding();
  }

  /**
   * Accessible Email OTP Verification Modal
   * Allows applicants to verify their email address by entering the 6-digit OTP.
   * Features: 6-digit numeric input, live verification, resend with 60-second cooldown timer.
   */
  function openEmailOtpModal(email, referenceNumber, recipientName, onVerifiedCallback) {
    if (!email) {
      showToast("No email address provided for verification.", "error");
      return;
    }

    let resendCooldown = 0;
    let resendTimerInterval = null;

    const modalBody = `
      <div class="email-otp-dialog" style="padding:4px 0;">
        <div class="notice-banner" style="margin-bottom:16px;">
          <div>
            A 6-digit verification code (OTP) was sent to <strong>${escapeHtml(email)}</strong>. Please check your inbox and enter the code below to verify ownership.
          </div>
        </div>

        <div id="modalOtpAlert" class="field-error" style="margin-bottom:12px;font-size:0.88rem;display:none;" role="alert"></div>

        <form id="emailOtpModalForm" novalidate>
          <div class="form-group" style="text-align:center;margin-bottom:18px;">
            <label class="form-label" for="modalOtpCodeInput" style="font-size:0.95rem;font-weight:600;display:block;margin-bottom:8px;">
              Enter 6-Digit Verification Code
            </label>
            <input
              type="text"
              id="modalOtpCodeInput"
              name="otpCode"
              class="form-control"
              placeholder="000000"
              maxlength="6"
              autocomplete="one-time-code"
              inputmode="numeric"
              style="width:200px;margin:0 auto;font-size:1.5rem;letter-spacing:6px;text-align:center;font-weight:700;"
              required
            />
            <small class="form-hint" style="display:block;margin-top:6px;">Codes expire in 5 minutes. Up to 5 verification attempts allowed.</small>
          </div>

          <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:16px;">
            <button type="button" class="btn btn-sm btn-secondary" id="modalOtpResendBtn">
              Resend Code
            </button>
            <span id="modalOtpResendTimer" style="font-size:0.82rem;color:var(--text-muted);"></span>
          </div>

          <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border-color);padding-top:14px;">
            <button type="button" class="btn btn-secondary" id="modalOtpCloseBtn">Close</button>
            <button type="submit" class="btn btn-primary" id="modalOtpSubmitBtn">Verify Email</button>
          </div>
        </form>
      </div>
    `;

    openModal("Email Address Verification", modalBody, (bodyEl) => {
      const form = bodyEl.querySelector("#emailOtpModalForm");
      const codeInput = bodyEl.querySelector("#modalOtpCodeInput");
      const submitBtn = bodyEl.querySelector("#modalOtpSubmitBtn");
      const resendBtn = bodyEl.querySelector("#modalOtpResendBtn");
      const resendTimerEl = bodyEl.querySelector("#modalOtpResendTimer");
      const closeBtn = bodyEl.querySelector("#modalOtpCloseBtn");
      const alertEl = bodyEl.querySelector("#modalOtpAlert");

      if (codeInput) codeInput.focus();

      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          if (resendTimerInterval) clearInterval(resendTimerInterval);
          closeModal();
        });
      }

      const startCooldown = (seconds = 60) => {
        resendCooldown = seconds;
        if (resendBtn) resendBtn.disabled = true;
        if (resendTimerEl) resendTimerEl.textContent = `Wait ${resendCooldown}s to resend`;

        if (resendTimerInterval) clearInterval(resendTimerInterval);
        resendTimerInterval = setInterval(() => {
          resendCooldown -= 1;
          if (resendCooldown <= 0) {
            clearInterval(resendTimerInterval);
            resendTimerInterval = null;
            if (resendBtn) resendBtn.disabled = false;
            if (resendTimerEl) resendTimerEl.textContent = "";
          } else {
            if (resendTimerEl) resendTimerEl.textContent = `Wait ${resendCooldown}s to resend`;
          }
        }, 1000);
      };

      if (resendBtn) {
        resendBtn.addEventListener("click", async () => {
          if (resendCooldown > 0) return;
          if (alertEl) alertEl.style.display = "none";
          resendBtn.disabled = true;

          try {
            const res = await fetch("/api/otp/request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                purpose: "applicant_email_verification",
                referenceId: referenceNumber,
                recipientName: recipientName || "Applicant"
              })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              if (data.cooldownRemaining) {
                startCooldown(data.cooldownRemaining);
              }
              if (alertEl) {
                alertEl.textContent = data.message || "Failed to resend verification code.";
                alertEl.style.display = "block";
              }
              showToast(data.message || "Unable to resend code at this time.", "error");
              return;
            }

            showToast("A new 6-digit verification code has been dispatched to your email.", "success");
            startCooldown(data.cooldownSeconds || 60);
          } catch (_) {
            if (alertEl) {
              alertEl.textContent = "Network error. Please try again.";
              alertEl.style.display = "block";
            }
            resendBtn.disabled = false;
          }
        });
      }

      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          if (alertEl) alertEl.style.display = "none";

          const enteredCode = String(codeInput.value || "").trim();
          if (!enteredCode || !/^\d{6}$/.test(enteredCode)) {
            if (alertEl) {
              alertEl.textContent = "Please enter a valid 6-digit numeric verification code.";
              alertEl.style.display = "block";
            }
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = "Verifying...";

          try {
            const res = await fetch("/api/otp/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                otp: enteredCode,
                purpose: "applicant_email_verification",
                referenceId: referenceNumber
              })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Verify Email";
              if (alertEl) {
                alertEl.textContent = data.message || "Invalid or expired verification code.";
                alertEl.style.display = "block";
              }
              return;
            }

            // Success!
            if (resendTimerInterval) clearInterval(resendTimerInterval);
            showToast("Email address successfully verified!", "success");

            // Update session and confirmation state
            try {
              const session = StudentHubStorage.getSession();
              if (session && (session.email === email || session.actorId === referenceNumber)) {
                session.emailVerified = true;
                StudentHubStorage.setSession(session);
              }
              if (lastSubmittedConfirmation && lastSubmittedConfirmation.referenceNumber === referenceNumber) {
                lastSubmittedConfirmation.emailVerified = true;
                sessionStorage.setItem("bu_last_submitted_app", JSON.stringify(lastSubmittedConfirmation));
              }
            } catch (_) {}

            if (typeof onVerifiedCallback === "function") {
              onVerifiedCallback();
            } else {
              renderLanding();
            }

            closeModal();
          } catch (_) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Verify Email";
            if (alertEl) {
              alertEl.textContent = "Network error. Please try again.";
              alertEl.style.display = "block";
            }
          }
        });
      }
    });
  }

  /**
   * Accessible Applicant Account Modal
   * Displays Account ID / Reference Number, registered email, verification status, name, status,
   * Change Password button (PBKDF2-SHA256), and Sign Out button.
   */
  function openApplicantAccountModal() {
    const session = StudentHubStorage.getSession();
    const app = getApplicantApplication();
    const refNum = (app && app.referenceNumber) || (session && (session.actorId || session.username)) || "BU-2026-APPLICANT";
    const email = (app && app.email) || (session && session.email) || "Not registered";
    const fullName = (app && app.fullName) || (session && (session.displayName || session.actorName)) || "Applicant";
    const status = (app && app.status) || "Pending";
    const isEmailVerified = !!((app && app.emailVerified) || (session && session.emailVerified));

    const modalBody = `
      <div class="applicant-account-dialog">
        <div class="applicant-account-header" style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
          <img src="assets/images/default-avatar.svg" alt="Applicant Avatar" style="width:52px;height:52px;border-radius:50%;background:#e2e8f0;border:2px solid var(--royal-500);object-fit:cover;" />
          <div>
            <h3 style="margin:0 0 4px 0;font-size:1.1rem;font-weight:700;color:var(--text-dark);">${escapeHtml(fullName)}</h3>
            <div style="display:flex;gap:6px;align-items:center;">
              <span class="badge badge-primary">APPLICANT</span>
              <span class="badge ${getStatusBadgeClass(status)}">Status: ${escapeHtml(status)}</span>
            </div>
          </div>
        </div>

        <div class="settings-account-summary" style="margin-bottom:20px;display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;background:var(--bg-light);padding:14px;border-radius:8px;border:1px solid var(--border-color);">
          <div>
            <span class="settings-summary-label" style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Account ID / Reference No.</span>
            <span class="settings-summary-value" id="applicantModalRefNum" style="font-size:0.92rem;font-weight:600;color:var(--text-dark);">${escapeHtml(refNum)}</span>
          </div>
          <div>
            <span class="settings-summary-label" style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Registered Email Address</span>
            <span class="settings-summary-value" id="applicantModalEmail" style="font-size:0.92rem;font-weight:600;color:var(--text-dark);">${escapeHtml(email)}</span>
          </div>
          <div>
            <span class="settings-summary-label" style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Email Verification</span>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              <span class="badge ${isEmailVerified ? 'badge-success' : 'badge-warning'}">${isEmailVerified ? '&#10003; Verified' : 'Pending Verification'}</span>
              ${!isEmailVerified ? `<button type="button" class="btn btn-xs btn-outline-primary" id="applicantModalVerifyEmailBtn" style="padding:2px 8px;font-size:0.75rem;">Verify</button>` : ''}
            </div>
          </div>
          <div>
            <span class="settings-summary-label" style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Application Status</span>
            <span class="settings-summary-value" id="applicantModalStatus" style="font-size:0.92rem;font-weight:600;color:var(--text-dark);">${escapeHtml(status)}</span>
          </div>
          <div>
            <span class="settings-summary-label" style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Password Security</span>
            <span class="settings-summary-value" style="font-size:0.92rem;font-weight:600;color:var(--text-dark);">PBKDF2-SHA256 Encrypted</span>
          </div>
        </div>

        <div class="modal-actions" style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-color);padding-top:16px;">
          <button type="button" class="btn btn-outline-danger" id="applicantModalLogoutBtn">
            Sign Out Session
          </button>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn btn-primary" id="applicantModalChangePassBtn">
              Change Password
            </button>
            <button type="button" class="btn btn-secondary" id="applicantModalCloseBtn">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    openModal("Applicant Account Information", modalBody, (bodyEl) => {
      const closeBtn = bodyEl.querySelector("#applicantModalCloseBtn");
      if (closeBtn) closeBtn.addEventListener("click", closeModal);

      const logoutBtn = bodyEl.querySelector("#applicantModalLogoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
          closeModal();
          if (window.StudentHubApp) window.StudentHubApp.logoutToLogin();
        });
      }

      const cpBtn = bodyEl.querySelector("#applicantModalChangePassBtn");
      if (cpBtn) {
        cpBtn.addEventListener("click", () => {
          closeModal();
          if (window.StudentHubSettings && window.StudentHubSettings.openChangePasswordModal) {
            window.StudentHubSettings.openChangePasswordModal();
          }
        });
      }

      const verifyEmailBtn = bodyEl.querySelector("#applicantModalVerifyEmailBtn");
      if (verifyEmailBtn) {
        verifyEmailBtn.addEventListener("click", () => {
          closeModal();
          openEmailOtpModal(email, refNum, fullName);
        });
      }
    });
  }

  /**
   * Public Admission Controller (Independent of Student/Faculty/Admin Portals)
   * Flow: PUBLIC ADMISSION PAGE -> APPLICATION FORM -> SUBMIT -> CONFIRMATION
   * No automatic portal login.
   * No automatic student account creation.
   * No unrelated student dashboard.
   * No preloaded applicant overview.
   */
  function initPublicAdmission() {
    const wrap = document.getElementById("publicAdmissionScreen");
    if (!wrap) return;

    // Header Portal Login Button
    const toLoginBtn = document.getElementById("admissionToLoginBtn");
    if (toLoginBtn) {
      toLoginBtn.onclick = () => {
        if (window.StudentHubApp && typeof window.StudentHubApp.showLoginScreen === "function") {
          window.StudentHubApp.showLoginScreen();
        } else {
          window.location.hash = "";
        }
      };
    }

    // Check if user has an active submitted application confirmation in sessionStorage
    const cachedConf = sessionStorage.getItem("bu_public_app_confirmation");
    if (cachedConf) {
      try {
        const parsed = JSON.parse(cachedConf);
        if (parsed && parsed.referenceNumber) {
          renderPublicConfirmation(parsed);
          return;
        }
      } catch (_) {}
    }

    renderPublicFormView();
  }

  function renderPublicFormView() {
    const formWrap = document.getElementById("publicApplicationFormWrap");
    const confWrap = document.getElementById("publicConfirmationWrap");
    if (formWrap) formWrap.hidden = false;
    if (confWrap) confWrap.hidden = true;

    const form = document.getElementById("publicAdmissionForm");
    if (!form) return;

    // Auto-mask MM/DD/YYYY for Date of Birth
    const dobInput = document.getElementById("pubDob");
    if (dobInput && !dobInput.dataset.bound) {
      dobInput.dataset.bound = "1";
      dobInput.addEventListener("input", (e) => {
        let v = e.target.value.replace(/\D/g, "").slice(0, 8);
        if (v.length >= 5) {
          e.target.value = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
        } else if (v.length >= 3) {
          e.target.value = `${v.slice(0, 2)}/${v.slice(2)}`;
        } else {
          e.target.value = v;
        }
      });
    }

    // Contact number input
    const contactInput = document.getElementById("pubContactNumber");
    if (contactInput && !contactInput.dataset.bound) {
      contactInput.dataset.bound = "1";
      contactInput.addEventListener("input", (e) => {
        let v = e.target.value.replace(/^\+?63\s*/, "").replace(/^0/, "");
        e.target.value = v.replace(/\D/g, "").slice(0, 10);
      });
    }

    // Graduation year input (4 digits)
    const gradInput = document.getElementById("pubGraduationYear");
    if (gradInput && !gradInput.dataset.bound) {
      gradInput.dataset.bound = "1";
      gradInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
      });
    }

    // Reset button
    const resetBtn = document.getElementById("pubResetBtn");
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = "1";
      resetBtn.addEventListener("click", () => {
        form.reset();
        clearFormErrors(form);
        const yl = document.getElementById("pubYearLevel");
        if (yl) yl.value = "Year 1";
        const genErr = document.getElementById("pubGeneralError");
        if (genErr) genErr.style.display = "none";
      });
    }

    // Form submit
    if (!form.dataset.bound) {
      form.dataset.bound = "1";
      let isSubmitting = false;

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        clearFormErrors(form);
        const genErr = document.getElementById("pubGeneralError");
        if (genErr) {
          genErr.style.display = "none";
          genErr.textContent = "";
        }

        const fd = new FormData(form);
        const lastName = String(fd.get("lastName") || "").trim();
        const firstName = String(fd.get("firstName") || "").trim();
        const middleName = String(fd.get("middleName") || "").trim();
        const dateOfBirthRaw = String(fd.get("dateOfBirth") || "").trim();
        const email = String(fd.get("email") || "").trim();
        const contactRaw = String(fd.get("contactNumber") || "").trim();
        const address = String(fd.get("address") || "").trim();
        const desiredProgram = String(fd.get("desiredProgram") || "").trim();
        const secondChoiceProgram = String(fd.get("secondChoiceProgram") || "None").trim();
        const yearLevel = "Year 1";
        const applicantType = String(fd.get("applicantType") || "Senior High School Graduate / Freshman").trim();
        const previousSchool = String(fd.get("previousSchool") || "").trim();
        const educationalBackground = String(fd.get("educationalBackground") || "").trim();
        const graduationYearRaw = String(fd.get("graduationYear") || "").trim();

        let valid = true;

        const lastCheck = validateNamePart(lastName, "Last Name", false);
        if (!lastCheck.valid) {
          setFieldError(form, "lastName", lastCheck.error);
          valid = false;
        }

        const firstCheck = validateNamePart(firstName, "First Name", false);
        if (!firstCheck.valid) {
          setFieldError(form, "firstName", firstCheck.error);
          valid = false;
        }

        const middleCheck = validateNamePart(middleName, "Middle Name", true);
        if (!middleCheck.valid) {
          setFieldError(form, "middleName", middleCheck.error);
          valid = false;
        }

        const dobCheck = validateDateMMDDYYYY(dateOfBirthRaw);
        if (!dobCheck.valid) {
          setFieldError(form, "dateOfBirth", dobCheck.error);
          valid = false;
        }

        if (!email || !isValidEmail(email)) {
          setFieldError(form, "email", "Please enter a valid email address.");
          valid = false;
        }

        const contactCheck = validatePhilippineContact(contactRaw);
        if (!contactCheck.valid) {
          setFieldError(form, "contactNumber", contactCheck.error);
          valid = false;
        }

        if (!address || address.length < 5) {
          setFieldError(form, "address", "Complete home address is required (at least 5 characters).");
          valid = false;
        }

        const programCheck = validateProgramChoices(desiredProgram, secondChoiceProgram);
        if (!programCheck.valid) {
          setFieldError(form, programCheck.field, programCheck.error);
          valid = false;
        }

        if (!previousSchool || previousSchool.length < 3) {
          setFieldError(form, "previousSchool", "Previous school attended is required.");
          valid = false;
        }

        if (!educationalBackground || educationalBackground.length < 3) {
          setFieldError(form, "educationalBackground", "Educational background / strand is required.");
          valid = false;
        }

        const gradCheck = validateGraduationYear(graduationYearRaw);
        if (!gradCheck.valid) {
          setFieldError(form, "graduationYear", gradCheck.error);
          valid = false;
        }

        if (!valid) {
          showToast("Please correct the highlighted errors in the application form.", "error");
          const firstErr = form.querySelector(".field-error:not(:empty)");
          if (firstErr) {
            firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          return;
        }

        const submitBtn = document.getElementById("pubSubmitBtn");
        const originalText = submitBtn ? submitBtn.textContent : "Submit Application for Admission";
        isSubmitting = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Submitting Application...";
        }

        const fullName = middleCheck.value
          ? `${lastCheck.value}, ${firstCheck.value} ${middleCheck.value}`
          : `${lastCheck.value}, ${firstCheck.value}`;

        const payload = {
          id: StudentHubStorage.uid("app"),
          lastName: lastCheck.value,
          firstName: firstCheck.value,
          middleName: middleCheck.value,
          fullName,
          dateOfBirth: dobCheck.mysqlDate,
          dateOfBirthDisplay: dobCheck.displayDate,
          email,
          contactNumber: contactCheck.normalized,
          address,
          yearLevel: "Year 1",
          applicantType,
          desiredProgram,
          secondChoiceProgram,
          previousSchool,
          educationalBackground,
          graduationYear: gradCheck.year,
          submittedDate: StudentHubStorage.formatLocalDate(new Date()),
          status: "Pending",
          remarks: "Submitted via Public Online Admission Application — Pending Review.",
          isDemoRecord: false
        };

        try {
          const dbResult = await StudentHubStorage.submitApplicationToDatabase(payload);

          if (!dbResult || !dbResult.ok || !dbResult.application) {
            isSubmitting = false;
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
            }
            if (dbResult && dbResult.fieldErrors && typeof dbResult.fieldErrors === "object") {
              Object.entries(dbResult.fieldErrors).forEach(([field, msg]) => {
                setFieldError(form, field, msg);
              });
            }
            const errMsg = (dbResult && (dbResult.message || dbResult.error)) || "Failed to submit application. Please check your entries and try again.";
            if (genErr) {
              genErr.textContent = errMsg;
              genErr.style.display = "block";
            }
            showToast(errMsg, "error");
            return;
          }

          const savedApp = dbResult.application;
          try {
            sessionStorage.setItem("bu_public_app_confirmation", JSON.stringify(savedApp));
          } catch (_) {}

          form.reset();
          const yl = document.getElementById("pubYearLevel");
          if (yl) yl.value = "Year 1";

          isSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }

          renderPublicConfirmation(savedApp);
          showToast(`Application submitted successfully! Ref: ${savedApp.referenceNumber}`, "success");
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
          isSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }
          if (genErr) {
            genErr.textContent = "Network error while submitting application: " + err.message;
            genErr.style.display = "block";
          }
          showToast("Network error while submitting application. Please try again.", "error");
        }
      });
    }
  }

  function renderPublicConfirmation(app) {
    const formWrap = document.getElementById("publicApplicationFormWrap");
    const confWrap = document.getElementById("publicConfirmationWrap");
    const mount = document.getElementById("publicConfirmationCardMount");

    if (formWrap) formWrap.hidden = true;
    if (confWrap) confWrap.hidden = false;
    if (!mount) return;

    mount.innerHTML = `
      <div class="card" style="max-width:820px;margin:0 auto;text-align:center;padding:36px 28px;box-shadow:0 10px 25px -5px rgba(15,23,42,0.1);">
        <div style="margin-bottom:14px;">
          <span class="badge badge-success" style="font-size:0.95rem;padding:8px 22px;font-weight:700;">
            &#10003; Application Submitted Successfully!
          </span>
        </div>

        <h2 style="font-size:1.65rem;margin-bottom:8px;color:var(--royal-900);">
          Thank you for applying to BANTUG UNIVERSITY, ${escapeHtml(app.fullName)}!
        </h2>

        <p style="font-size:0.96rem;color:var(--text-secondary);max-width:620px;margin:0 auto 22px;line-height:1.6;">
          Your admission application has been received and saved. Your initial application status is <strong>Pending</strong>.
          The Admissions Committee will review your submitted credentials.
        </p>

        <!-- Prominent Reference Box -->
        <div class="confirmation-ref-box">
          <div class="ref-box-eyebrow">Official Application Reference Number</div>
          <div class="ref-box-number" id="pubRefNumVal">${escapeHtml(app.referenceNumber)}</div>
          <div class="ref-box-actions">
            <button
              type="button"
              class="btn btn-primary copy-ref-btn"
              id="pubCopyRefBtn"
              data-ref="${escapeHtml(app.referenceNumber)}"
              aria-label="Copy application reference number ${escapeHtml(app.referenceNumber)}"
              title="Copy reference number to clipboard"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:text-bottom;">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span class="copy-btn-text">Copy Reference Number</span>
            </button>
            <span id="pubCopyFeedback" class="copy-success-indicator" style="display:none;" role="status">Reference number copied!</span>
          </div>
          <p class="ref-box-notice">
            Please save or take note of this reference number. You may use it when contacting the university regarding your admission status.
          </p>
          <div class="ref-box-meta">
            Submitted on <strong>${escapeHtml(formatReadableDate(app.submittedDate))}</strong> &bull; Initial Status: <span class="badge badge-warning" style="font-size:0.8rem;">Pending</span>
          </div>
        </div>

        <!-- Submitted Information Summary Table/Grid -->
        <div class="form-grid" style="text-align:left;margin-bottom:28px;">
          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Applicant Legal Name</div>
              <div class="dash-item-title">${escapeHtml(app.fullName)}</div>
            </div>
          </div>

          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Date of Birth (MM/DD/YYYY)</div>
              <div class="dash-item-title">${escapeHtml(formatDateMMDDYYYY(app.dateOfBirth))}</div>
            </div>
          </div>

          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Applying For Year Level</div>
              <div class="dash-item-title"><span class="badge badge-primary">${escapeHtml(app.yearLevel || "Year 1")}</span></div>
            </div>
          </div>

          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Primary Academic Program (1st Choice)</div>
              <div class="dash-item-title">${escapeHtml(app.desiredProgram)}</div>
            </div>
          </div>

          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Alternative Program (2nd Choice)</div>
              <div class="dash-item-title">${escapeHtml(app.secondChoiceProgram || "None")}</div>
            </div>
          </div>

          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Applicant Classification</div>
              <div class="dash-item-title">${escapeHtml(app.applicantType)}</div>
            </div>
          </div>

          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Email Address</div>
              <div class="dash-item-title">${escapeHtml(app.email)}</div>
            </div>
          </div>

          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Contact Number</div>
              <div class="dash-item-title">${escapeHtml(app.contactNumber)}</div>
            </div>
          </div>

          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Previous School Attended</div>
              <div class="dash-item-title">${escapeHtml(app.previousSchool)} (${escapeHtml(app.graduationYear)})</div>
            </div>
          </div>

          <div class="dash-list-item">
            <div>
              <div class="dash-item-sub">Educational Track / Strand</div>
              <div class="dash-item-title">${escapeHtml(app.educationalBackground)}</div>
            </div>
          </div>
        </div>

        <!-- Receipt Actions -->
        <div class="modal-actions" style="justify-content:center;gap:14px;flex-wrap:wrap;border-top:1px solid var(--border-color);padding-top:24px;">
          <button type="button" class="btn btn-secondary" id="pubPrintReceiptBtn" title="Print this confirmation receipt">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;vertical-align:text-bottom;">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Confirmation
          </button>
          <button type="button" class="btn btn-primary" id="pubNewAppBtn">
            + Submit Another Application
          </button>
          <button type="button" class="btn btn-secondary" id="pubReturnLoginBtn">
            Portal Login &rarr;
          </button>
        </div>
      </div>
    `;

    // Bind Copy Button
    const copyBtn = document.getElementById("pubCopyRefBtn");
    const copyIndicator = document.getElementById("pubCopyFeedback");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const refToCopy = copyBtn.getAttribute("data-ref") || app.referenceNumber;
        await copyReferenceNumberToClipboard(refToCopy, copyBtn, copyIndicator);
      });
    }

    // Bind Print Button
    const printBtn = document.getElementById("pubPrintReceiptBtn");
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }

    // Bind Submit Another Application Button
    const newAppBtn = document.getElementById("pubNewAppBtn");
    if (newAppBtn) {
      newAppBtn.addEventListener("click", () => {
        try {
          sessionStorage.removeItem("bu_public_app_confirmation");
        } catch (_) {}
        renderPublicFormView();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Bind Return to Login Button
    const returnLoginBtn = document.getElementById("pubReturnLoginBtn");
    if (returnLoginBtn) {
      returnLoginBtn.addEventListener("click", () => {
        if (window.StudentHubApp && typeof window.StudentHubApp.showLoginScreen === "function") {
          window.StudentHubApp.showLoginScreen();
        } else {
          window.location.hash = "";
        }
      });
    }
  }

  return {
    renderLanding,
    renderForm,
    renderStatus,
    openApplicantAccountModal,
    openEmailOtpModal,
    initPublicAdmission
  };
})();

window.StudentHubApplicant = StudentHubApplicant;
