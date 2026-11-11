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

  let preselectedProgram = "Bachelor of Science in Information Technology (BSIT)";
  let lastSubmittedConfirmation = null;
  let selectedDemoRecordId = "app_demo_1";
  let demoStatusFilter = "All";
  let demoYearFilter = "All";

  function getStatusBadgeClass(status) {
    if (status === "Approved") return "badge-success";
    if (status === "Rejected") return "badge-danger";
    if (status === "Under Review") return "badge-warning";
    return "badge-info"; // Submitted
  }

  /**
   * 1. APPLICANT LANDING PAGE (Admissions Overview)
   * Does not expose sample application status records to prospective applicants.
   */
  function renderLanding() {
    const container = document.getElementById("applicantLandingContainer");
    if (!container) return;

    const isDemoAccount = StudentHubStorage.isApplicantDemoSession();

    container.innerHTML = `
      <!-- Applicant Welcome Hero Banner -->
      <div class="hero-banner applicant-hero">
        <div class="hero-left">
          <div class="university-logo-wrap">
            <img
              src="${escapeHtml(StudentHubStorage.getLogoSrc())}"
              alt="BANTUG UNIVERSITY Logo"
              class="bu-logo-img"
              style="max-height:70px;max-width:110px;"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="bu-logo-fallback" style="display:none;">BU</div>
          </div>
          <div>
            <div class="hero-greeting">BANTUG UNIVERSITY &bull; Online Admissions Portal</div>
            <h2 class="hero-title">Apply to BANTUG UNIVERSITY</h2>
            <div class="hero-meta">
              <span class="hero-pill">Academic Year 2026–2027</span>
              <span class="hero-pill">4-Year Degree Programs (Year 1–Year 4)</span>
              <span class="hero-pill">Local Academic Demonstration</span>
            </div>
          </div>
        </div>
        <div class="hero-actions">
          ${
            isDemoAccount
              ? `<button type="button" class="btn btn-hero" data-app-nav="applicant-status">
                  &larr; Back to Demo Application Status
                </button>`
              : `<button type="button" class="btn btn-applicant-cta" style="width:auto;" data-app-nav="applicant-form">
                  Apply Now &rarr;
                </button>`
          }
        </div>
      </div>

      <div class="notice-banner">
        <div>
          <strong>Academic Database Notice:</strong> This Applicant Portal is connected to the <strong>BANTUG UNIVERSITY Student Portal System</strong> Node.js + MySQL backend (<code>bantug_university_db</code>). Submitted applications are saved directly in the MySQL <code>applications</code> table and immediately forwarded to Faculty Application Management for review.
        </div>
      </div>

      <!-- Available Academic Programs -->
      <div class="section-header" style="margin-bottom:14px;">
        <div class="section-header-info">
          <h3 style="font-size:1.2rem;">Available Academic Degree Programs</h3>
          <p>Review our 4-year undergraduate programs (Year 1 to Year 4) below.</p>
        </div>
      </div>

      <div class="programs-grid">
        ${AVAILABLE_PROGRAMS.map(
          (prog) => `
          <div class="program-card ${prog.featured ? "featured-program" : ""}">
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
                <span class="badge ${prog.featured ? "badge-primary" : "badge-info"}">${escapeHtml(
            prog.code
          )}</span>
                <span style="font-size:0.76rem;color:var(--text-muted);font-weight:600;">${escapeHtml(
                  prog.duration
                )}</span>
              </div>
              <h4 style="font-size:1rem;margin-bottom:4px;">${escapeHtml(prog.title)}</h4>
              <div style="font-size:0.78rem;color:var(--royal-600);font-weight:600;margin-bottom:8px;">
                ${escapeHtml(prog.college)}
              </div>
              <p style="font-size:0.84rem;color:var(--text-secondary);">${escapeHtml(
                prog.description
              )}</p>
            </div>
            ${
              !isDemoAccount
                ? `<div style="padding-top:10px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;">
                    <button
                      type="button"
                      class="btn btn-sm btn-primary select-program-apply-btn"
                      data-program="${escapeHtml(prog.title)}"
                    >
                      Apply for ${escapeHtml(prog.code)} &rarr;
                    </button>
                  </div>`
                : ""
            }
          </div>
        `
        ).join("")}
      </div>

      <!-- Sample Admission Requirements & Application Instructions -->
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Basic Admission Requirements (Sample Information)</h3>
            <span class="badge badge-neutral">Sample Checklist</span>
          </div>
          <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:12px;">
            The items below represent <strong>sample demonstration checklist information</strong> for academic presentation purposes (no document uploads are required in this portal):
          </p>
          <div class="dash-list">
            <div class="dash-list-item">
              <div>
                <div class="dash-item-title">1. Completed Online Application Form</div>
                <div class="dash-item-sub">Personal, contact, year level (Year 1–Year 4), and educational background details filled out in the Applicant Portal.</div>
              </div>
              <span class="badge badge-info">Required in Form</span>
            </div>
            <div class="dash-list-item">
              <div>
                <div class="dash-item-title">2. Senior High School Report Card / Academic Record (Sample)</div>
                <div class="dash-item-sub">For incoming Year 1 applicants (or Transcript of Records for Year 2–Year 4 transferees).</div>
              </div>
              <span class="badge badge-neutral">Sample Info</span>
            </div>
            <div class="dash-list-item">
              <div>
                <div class="dash-item-title">3. Certificate of Good Moral Character (Sample)</div>
                <div class="dash-item-sub">Issued by the applicant's previous school guidance or principal's office.</div>
              </div>
              <span class="badge badge-neutral">Sample Info</span>
            </div>
            <div class="dash-list-item">
              <div>
                <div class="dash-item-title">4. Application Submission Confirmation</div>
                <div class="dash-item-sub">A confirmation receipt with your generated <code>BU-ADM-...</code> reference number is displayed upon submitting the form.</div>
              </div>
              <span class="badge badge-success">Auto-Generated</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Step-by-Step Application Instructions</h3>
            <span class="badge badge-primary">3 Easy Steps</span>
          </div>
          <div class="dash-list">
            <div class="dash-list-item">
              <div class="dash-item-left">
                <div class="time-pill" style="min-width:68px;">Step 1</div>
                <div>
                  <div class="dash-item-title">Choose Your Desired Program &amp; Year Level</div>
                  <div class="dash-item-sub">Review the BANTUG UNIVERSITY degree offerings above and select your entry year level (Year 1 to Year 4).</div>
                </div>
              </div>
            </div>
            <div class="dash-list-item">
              <div class="dash-item-left">
                <div class="time-pill" style="min-width:68px;">Step 2</div>
                <div>
                  <div class="dash-item-title">Complete the Registration &amp; Application Form</div>
                  <div class="dash-item-sub">Provide your name, date of birth, contact details, desired program, year level, and previous school information.</div>
                </div>
              </div>
            </div>
            <div class="dash-list-item">
              <div class="dash-item-left">
                <div class="time-pill" style="min-width:68px;">Step 3</div>
                <div>
                  <div class="dash-item-title">Receive Your Submission Confirmation</div>
                  <div class="dash-item-sub">Submit your application to receive your official submission confirmation and reference number.</div>
                </div>
              </div>
            </div>
          </div>

          ${
            !isDemoAccount
              ? `<div style="margin-top:18px;display:flex;justify-content:flex-end;gap:10px;">
                  <button type="button" class="btn btn-primary" data-app-nav="applicant-form">
                    Proceed to Application Form &rarr;
                  </button>
                </div>`
              : ""
          }
        </div>
      </div>
    `;

    container.querySelectorAll("[data-app-nav]").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.getAttribute("data-app-nav")));
    });

    container.querySelectorAll(".select-program-apply-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        preselectedProgram = btn.getAttribute("data-program");
        lastSubmittedConfirmation = null;
        navigateTo("applicant-form");
      });
    });
  }

  /**
   * 2. APPLICANT REGISTRATION & APPLICATION FORM
   * Shows ONLY a submission confirmation after submitting an application.
   * Does NOT display an application status dashboard or status-tracking section.
   */
  function renderForm() {
    const container = document.getElementById("applicantFormContainer");
    if (!container) return;

    const validYears = StudentHubStorage.VALID_YEAR_LEVELS; // ["Year 1", "Year 2", "Year 3", "Year 4"]

    if (lastSubmittedConfirmation) {
      const c = lastSubmittedConfirmation;
      container.innerHTML = `
        <div class="section-header">
          <div class="section-header-info">
            <h2>BANTUG UNIVERSITY &mdash; Application Submission Confirmation</h2>
            <p>Your online admission application has been submitted successfully.</p>
          </div>
          <div class="section-header-actions">
            <button type="button" class="btn btn-secondary" id="backToProgramsAfterSubmitBtn">
              &larr; Back to Admissions Overview
            </button>
            <button type="button" class="btn btn-primary" id="submitAnotherNewAppBtn">
              + Submit Another Application
            </button>
          </div>
        </div>

        <div class="card" style="max-width:740px;margin:0 auto;text-align:center;padding:32px 24px;">
          <div style="margin-bottom:14px;">
            <span class="badge badge-success" style="font-size:0.9rem;padding:8px 18px;">
              Application Submitted Successfully
            </span>
          </div>
          <h3 style="font-size:1.45rem;margin-bottom:8px;">
            Thank you for applying to BANTUG UNIVERSITY, ${escapeHtml(c.fullName)}!
          </h3>
          <p style="font-size:0.92rem;color:var(--text-secondary);max-width:560px;margin:0 auto 20px;">
            Your application form has been received and permanently recorded in the <strong>BANTUG UNIVERSITY MySQL Database (<code>bantug_university_db</code>)</strong> with initial status <strong>Pending</strong>. Please keep your reference details below for your records.
          </p>

          <div class="calc-result-box" style="margin-bottom:22px;padding:18px;">
            <div style="font-size:0.78rem;text-transform:uppercase;color:var(--text-secondary);font-weight:700;">
              Confirmation Reference Number
            </div>
            <div class="calc-score" style="font-size:1.75rem;margin:6px 0;">
              ${escapeHtml(c.referenceNumber)}
            </div>
            <div style="font-size:0.84rem;color:var(--text-secondary);">
              Submitted on ${escapeHtml(formatReadableDate(c.submittedDate))}
            </div>
          </div>

          <div class="form-grid" style="text-align:left;margin-bottom:22px;">
            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Applicant Full Name</div>
                <div class="dash-item-title">${escapeHtml(c.fullName)}</div>
              </div>
            </div>
            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Applying For Year Level</div>
                <div class="dash-item-title">${escapeHtml(c.yearLevel)}</div>
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
                <div class="dash-item-sub">Applicant Classification</div>
                <div class="dash-item-title">${escapeHtml(c.applicantType)}</div>
              </div>
            </div>
            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Email &amp; Contact Number</div>
                <div class="dash-item-title">${escapeHtml(c.email)} &bull; ${escapeHtml(c.contactNumber)}</div>
              </div>
            </div>
            <div class="dash-list-item">
              <div>
                <div class="dash-item-sub">Previous School Attended</div>
                <div class="dash-item-title">${escapeHtml(c.previousSchool)} (${escapeHtml(c.graduationYear)})</div>
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

      const backProgramsBtn = document.getElementById("backToProgramsAfterSubmitBtn");
      if (backProgramsBtn) {
        backProgramsBtn.addEventListener("click", () => {
          lastSubmittedConfirmation = null;
          navigateTo("applicant-landing");
        });
      }
      const returnOverviewBtn = document.getElementById("confirmReturnOverviewBtn");
      if (returnOverviewBtn) {
        returnOverviewBtn.addEventListener("click", () => {
          lastSubmittedConfirmation = null;
          navigateTo("applicant-landing");
        });
      }
      const newAppBtn1 = document.getElementById("submitAnotherNewAppBtn");
      if (newAppBtn1) {
        newAppBtn1.addEventListener("click", () => {
          lastSubmittedConfirmation = null;
          renderForm();
        });
      }
      const newAppBtn2 = document.getElementById("confirmNewBlankFormBtn");
      if (newAppBtn2) {
        newAppBtn2.addEventListener("click", () => {
          lastSubmittedConfirmation = null;
          renderForm();
        });
      }
      return;
    }

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; Online Application &amp; Registration Form</h2>
          <p>Complete all required fields (*) below to submit your admission application.</p>
        </div>
        <div class="section-header-actions">
          <button type="button" class="btn btn-secondary" id="backToLandingBtn">
            &larr; Back to Programs
          </button>
        </div>
      </div>

      <div class="notice-banner">
        <div>
          <strong>Database Persistence Notice:</strong> Your application entry is validated and saved directly to the <strong>BANTUG UNIVERSITY MySQL Database (<code>bantug_university_db.applications</code>)</strong> with initial status <code>Pending</code>. Upon database confirmation, you will receive an official application confirmation receipt.
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Applicant Personal, Contact &amp; Academic Information</h3>
          <span class="badge badge-primary">AY 2026–2027 Admissions</span>
        </div>

        <form id="universityApplicationForm" novalidate>
          <div class="form-grid">
            <!-- Personal Information -->
            <div class="form-group">
              <label class="form-label" for="appFullName">Full Name (Last, First, Middle) <span class="req">*</span></label>
              <input
                type="text"
                id="appFullName"
                name="fullName"
                class="form-control"
                placeholder="e.g. Dela Cruz, Maria Clara"
              />
              <div class="field-error" data-error-for="fullName"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="appDob">Date of Birth <span class="req">*</span></label>
              <input
                type="date"
                id="appDob"
                name="dateOfBirth"
                class="form-control"
                value="2007-06-15"
              />
              <div class="field-error" data-error-for="dateOfBirth"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="appEmail">Email Address <span class="req">*</span></label>
              <input
                type="email"
                id="appEmail"
                name="email"
                class="form-control"
                placeholder="applicant.sample@email.example"
              />
              <div class="field-error" data-error-for="email"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="appContact">Contact Number <span class="req">*</span></label>
              <input
                type="tel"
                id="appContact"
                name="contactNumber"
                class="form-control"
                placeholder="+63 917 555 0123"
              />
              <div class="field-error" data-error-for="contactNumber"></div>
            </div>

            <div class="form-group full-width">
              <label class="form-label" for="appAddress">Complete Home Address <span class="req">*</span></label>
              <input
                type="text"
                id="appAddress"
                name="address"
                class="form-control"
                placeholder="Street, Barangay, City/Municipality, Province"
              />
              <div class="field-error" data-error-for="address"></div>
            </div>

            <!-- Academic & Program Information -->
            <div class="form-group">
              <label class="form-label" for="appDesiredProgram">Desired Academic Program (1st Choice) <span class="req">*</span></label>
              <select id="appDesiredProgram" name="desiredProgram" class="form-control">
                ${AVAILABLE_PROGRAMS.map(
                  (p) =>
                    `<option value="${escapeHtml(p.title)}" ${
                      p.title === preselectedProgram ? "selected" : ""
                    }>${escapeHtml(p.title)}</option>`
                ).join("")}
              </select>
              <div class="field-error" data-error-for="desiredProgram"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="appSecondProgram">Alternative Program (2nd Choice)</label>
              <select id="appSecondProgram" name="secondChoiceProgram" class="form-control">
                <option value="None">None / Not Applicable</option>
                ${AVAILABLE_PROGRAMS.map(
                  (p) => `<option value="${escapeHtml(p.title)}">${escapeHtml(p.title)}</option>`
                ).join("")}
              </select>
              <div class="field-error" data-error-for="secondChoiceProgram"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="appYearLevel">Applying For Year Level <span class="req">*</span></label>
              <select id="appYearLevel" name="yearLevel" class="form-control">
                ${validYears
                  .map((yr) => `<option value="${escapeHtml(yr)}">${escapeHtml(yr)}</option>`)
                  .join("")}
              </select>
              <div class="field-error" data-error-for="yearLevel"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="appType">Applicant Classification <span class="req">*</span></label>
              <select id="appType" name="applicantType" class="form-control">
                <option value="Senior High School Graduate / Freshman">Senior High School Graduate / Freshman</option>
                <option value="College Transferee">College Transferee</option>
                <option value="Second Degree Applicant">Second Degree Applicant</option>
              </select>
              <div class="field-error" data-error-for="applicantType"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="appPrevSchool">Previous School Attended <span class="req">*</span></label>
              <input
                type="text"
                id="appPrevSchool"
                name="previousSchool"
                class="form-control"
                placeholder="e.g. Bantug National High School"
              />
              <div class="field-error" data-error-for="previousSchool"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="appGradYear">Year Graduated / Completed <span class="req">*</span></label>
              <input
                type="number"
                id="appGradYear"
                name="graduationYear"
                class="form-control"
                min="1990"
                max="2030"
                value="2026"
              />
              <div class="field-error" data-error-for="graduationYear"></div>
            </div>

            <div class="form-group full-width">
              <label class="form-label" for="appEduBg">Educational Background / SHS Track &amp; Strand <span class="req">*</span></label>
              <input
                type="text"
                id="appEduBg"
                name="educationalBackground"
                class="form-control"
                placeholder="e.g. Academic Track - STEM / TVL-ICT Strand"
              />
              <div class="field-error" data-error-for="educationalBackground"></div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="fillSampleApplicantFormBtn" style="margin-right:auto;">
              Auto-Fill Sample Form Fields
            </button>
            <button type="reset" class="btn btn-secondary">Clear Form</button>
            <button type="submit" class="btn btn-primary">
              Submit Application to BANTUG UNIVERSITY
            </button>
          </div>
        </form>
      </div>
    `;

    const backBtn = document.getElementById("backToLandingBtn");
    if (backBtn) backBtn.addEventListener("click", () => navigateTo("applicant-landing"));

    const fillSampleBtn = document.getElementById("fillSampleApplicantFormBtn");
    const form = document.getElementById("universityApplicationForm");

    if (fillSampleBtn && form) {
      fillSampleBtn.addEventListener("click", () => {
        clearFormErrors(form);
        form.querySelector('[name="fullName"]').value = "Dela Rosa, Hannah Sophia";
        form.querySelector('[name="dateOfBirth"]').value = "2007-09-12";
        form.querySelector('[name="email"]').value = "hannah.delarosa@email.example";
        form.querySelector('[name="contactNumber"]').value = "+63 917 555 0311";
        form.querySelector('[name="address"]').value = "54 Bonifacio St., Central Poblacion";
        form.querySelector('[name="desiredProgram"]').value =
          "Bachelor of Science in Information Technology (BSIT)";
        form.querySelector('[name="secondChoiceProgram"]').value =
          "Bachelor of Science in Computer Science (BSCS)";
        form.querySelector('[name="yearLevel"]').value = "Year 1";
        form.querySelector('[name="applicantType"]').value =
          "Senior High School Graduate / Freshman";
        form.querySelector('[name="previousSchool"]').value = "Bantug Science High School";
        form.querySelector('[name="educationalBackground"]').value = "STEM / ICT Strand";
        form.querySelector('[name="graduationYear"]').value = "2026";
        showToast("Filled form with sample applicant details!", "info");
      });
    }

    if (form) {
      let isSubmitting = false;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        clearFormErrors(form);

        const fd = new FormData(form);
        const fullName = String(fd.get("fullName") || "").trim();
        const dateOfBirth = String(fd.get("dateOfBirth") || "").trim();
        const email = String(fd.get("email") || "").trim();
        const contactNumber = String(fd.get("contactNumber") || "").trim();
        const address = String(fd.get("address") || "").trim();
        const desiredProgram = String(fd.get("desiredProgram") || "").trim();
        const secondChoiceProgram = String(fd.get("secondChoiceProgram") || "").trim();
        const yearLevel = String(fd.get("yearLevel") || "").trim();
        const applicantType = String(fd.get("applicantType") || "").trim();
        const graduationYear = String(fd.get("graduationYear") || "").trim();
        const previousSchool = String(fd.get("previousSchool") || "").trim();
        const educationalBackground = String(fd.get("educationalBackground") || "").trim();

        let valid = true;
        if (!fullName || fullName.length < 3) {
          setFieldError(form, "fullName", "Please enter the applicant's full name.");
          valid = false;
        }
        if (!dateOfBirth || isNaN(new Date(dateOfBirth).getTime())) {
          setFieldError(form, "dateOfBirth", "Please enter a valid date of birth.");
          valid = false;
        }
        if (!email || !isValidEmail(email)) {
          setFieldError(form, "email", "Please enter a valid email address.");
          valid = false;
        }
        if (!contactNumber || contactNumber.length < 7) {
          setFieldError(form, "contactNumber", "Please enter a valid contact number.");
          valid = false;
        }
        if (!address) {
          setFieldError(form, "address", "Complete home address is required.");
          valid = false;
        }
        if (!desiredProgram) {
          setFieldError(form, "desiredProgram", "Please select a desired program.");
          valid = false;
        }
        if (!yearLevel || !StudentHubStorage.isValidYearLevel(yearLevel)) {
          setFieldError(
            form,
            "yearLevel",
            "Please select a valid Year Level (Year 1, Year 2, Year 3, or Year 4)."
          );
          valid = false;
        }
        if (!previousSchool) {
          setFieldError(form, "previousSchool", "Previous school is required.");
          valid = false;
        }
        if (!educationalBackground) {
          setFieldError(form, "educationalBackground", "Educational background is required.");
          valid = false;
        }
        if (!graduationYear || Number(graduationYear) < 1990 || Number(graduationYear) > 2035) {
          setFieldError(form, "graduationYear", "Enter a valid graduation year.");
          valid = false;
        }

        if (!valid) {
          showToast("Please complete all required application fields.", "error");
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent : "Submit Application to BANTUG UNIVERSITY";
        isSubmitting = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Saving Application to MySQL Database...";
        }

        const newAppPayload = {
          id: StudentHubStorage.uid("app"),
          referenceNumber: StudentHubStorage.generateAppRef(),
          fullName,
          dateOfBirth,
          email,
          contactNumber,
          address,
          yearLevel,
          applicantType,
          desiredProgram,
          secondChoiceProgram,
          previousSchool,
          educationalBackground,
          graduationYear,
          submittedDate: StudentHubStorage.formatLocalDate(new Date()),
          status: "Pending",
          remarks: "Submitted via Online Applicant Portal — Pending Faculty Evaluation.",
          isDemoRecord: false
        };

        const dbResult = await StudentHubStorage.submitApplicationToDatabase(newAppPayload);
        isSubmitting = false;

        if (!dbResult || !dbResult.ok) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
          if (dbResult && dbResult.errors && typeof dbResult.errors === "object") {
            Object.entries(dbResult.errors).forEach(([field, msg]) => {
              setFieldError(form, field, msg);
            });
          }
          showToast(
            (dbResult && dbResult.error) ||
              "Failed to save application to MySQL database. Please verify the Node.js and XAMPP MySQL server are running.",
            "error"
          );
          return;
        }

        const savedApp = dbResult.application || newAppPayload;
        lastSubmittedConfirmation = savedApp;
        renderForm();

        // Show Submission Confirmation Modal ONLY after MySQL confirms insertion
        openModal(
          "Application Submitted Successfully",
          `
            <div style="text-align:center;padding:8px 4px;">
              <div class="badge badge-success" style="font-size:0.86rem;padding:6px 14px;margin-bottom:12px;">
                MySQL Database Insertion Confirmed
              </div>
              <h3 style="font-size:1.25rem;margin-bottom:6px;">Thank you, ${escapeHtml(
                savedApp.fullName
              )}!</h3>
              <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:14px;">
                Your application to <strong>BANTUG UNIVERSITY</strong> (${escapeHtml(
                  savedApp.yearLevel
                )}) has been saved in the MySQL database with initial status <strong>Pending</strong>.
              </p>

              <div class="calc-result-box" style="margin-bottom:16px;">
                <div style="font-size:0.76rem;text-transform:uppercase;color:var(--text-secondary);font-weight:600;">
                  Application Reference Number
                </div>
                <div class="calc-score" style="font-size:1.65rem;">${escapeHtml(
                  savedApp.referenceNumber
                )}</div>
                <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">
                  Program: <strong>${escapeHtml(savedApp.desiredProgram)}</strong> &bull; ${escapeHtml(
            savedApp.yearLevel
          )}
                </div>
              </div>

              <div class="modal-actions" style="justify-content:center;">
                <button type="button" class="btn btn-primary" id="closeAppSubmittedConfirmBtn">
                  Done
                </button>
              </div>
            </div>
          `,
          (bodyEl) => {
            bodyEl
              .querySelector("#closeAppSubmittedConfirmBtn")
              .addEventListener("click", closeModal);
          }
        );

        showToast(
          `Application saved to MySQL database! Ref: ${savedApp.referenceNumber}`,
          "success"
        );
      });
    }
  }

  /**
   * 3. APPLICATION STATUS PAGE (Applicant Demo Account ONLY)
   * Displays sample applicant information and sample application status records
   * (Submitted, Under Review, Approved, Rejected), clearly distinguished from
   * actual applications and labeled as simulated demo data.
   */
  function renderStatus() {
    const container = document.getElementById("applicantStatusContainer");
    if (!container) return;

    // Enforce that Application Status records are only visible inside the separate Applicant Demo Account
    if (!StudentHubStorage.isApplicantDemoSession()) {
      container.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <h3>Applicant Demo Account Required</h3>
            <p>Sample application status records are only accessible when logged into the dedicated <strong>Applicant Demo Account</strong> from the Sign-In page.</p>
          </div>
        </div>
      `;
      return;
    }

    const state = StudentHubStorage.getState();
    const demoProfile = state.demoApplicantProfile || {};
    const demoRecords = state.demoApplicantRecords || [];
    const actualSubmissionsCount = (state.applications || []).length;
    const validYears = StudentHubStorage.VALID_YEAR_LEVELS;

    const filteredRecords = demoRecords.filter((rec) => {
      const normalizedRecStatus = rec.status === "Submitted" ? "Pending" : rec.status;
      const matchSt =
        demoStatusFilter === "All" ||
        rec.status === demoStatusFilter ||
        normalizedRecStatus === demoStatusFilter;
      const matchYr = demoYearFilter === "All" || rec.yearLevel === demoYearFilter;
      return matchSt && matchYr;
    });

    if (!filteredRecords.some((r) => r.id === selectedDemoRecordId) && filteredRecords[0]) {
      selectedDemoRecordId = filteredRecords[0].id;
    }

    const activeRecord =
      filteredRecords.find((r) => r.id === selectedDemoRecordId) || filteredRecords[0] || null;

    const countByStatus = {
      Pending: demoRecords.filter((r) => r.status === "Pending" || r.status === "Submitted").length,
      "Under Review": demoRecords.filter((r) => r.status === "Under Review").length,
      Approved: demoRecords.filter((r) => r.status === "Approved").length,
      Rejected: demoRecords.filter((r) => r.status === "Rejected").length
    };

    container.innerHTML = `
      <!-- Applicant Demo Account Banner -->
      <div class="hero-banner applicant-hero">
        <div class="hero-left">
          <div class="university-logo-wrap">
            <img
              src="${escapeHtml(StudentHubStorage.getLogoSrc())}"
              alt="BANTUG UNIVERSITY Logo"
              class="bu-logo-img"
              style="max-height:68px;max-width:105px;"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="bu-logo-fallback" style="display:none;">BU</div>
          </div>
          <div>
            <div class="hero-greeting">BANTUG UNIVERSITY &bull; Dedicated Applicant Demo Account</div>
            <h2 class="hero-title">${escapeHtml(
              demoProfile.fullName || "Ceasar Villanueva (Applicant Demo Account)"
            )}</h2>
            <div class="hero-meta">
              <span class="hero-pill">Demo ID: ${escapeHtml(
                demoProfile.applicantId || "APP-DEMO-2026-01"
              )}</span>
              <span class="hero-pill">Email: ${escapeHtml(
                demoProfile.email || "applicant.demo@bantug.edu.example"
              )}</span>
              <span class="hero-pill">${escapeHtml(demoProfile.yearLevel || "Year 1")}</span>
              <span class="hero-pill">Simulated Demo Account</span>
            </div>
          </div>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-hero" data-demo-app-nav="applicant-landing">
            View Degree Programs
          </button>
        </div>
      </div>

      <!-- Clear Distinction Notice -->
      <div class="notice-banner">
        <div>
          <strong>Simulated Applicant Demo Account Notice:</strong> You are signed into the separate <strong>Applicant Demo Account</strong>. All application status records shown on this page are <strong>preloaded sample demonstration records</strong> stored locally in <code>localStorage</code> and are <strong>not connected to a real university admissions database</strong>. These sample statuses are separated from the normal application submission form${
            actualSubmissionsCount > 0
              ? ` (${actualSubmissionsCount} separate form submission${
                  actualSubmissionsCount > 1 ? "s" : ""
                } recorded in the normal application flow)`
              : ""
          }.
        </div>
      </div>

      <!-- Sample Status Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Pending / Submitted</span>
            <span class="stat-value">${countByStatus["Pending"]}</span>
            <span class="stat-sub">Demo Status Record</span>
          </div>
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Under Review (Sample)</span>
            <span class="stat-value">${countByStatus["Under Review"]}</span>
            <span class="stat-sub">Demo Status Record</span>
          </div>
          <div class="stat-icon icon-amber">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Approved (Sample)</span>
            <span class="stat-value">${countByStatus["Approved"]}</span>
            <span class="stat-sub">Demo Status Record</span>
          </div>
          <div class="stat-icon icon-green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Rejected (Sample)</span>
            <span class="stat-value">${countByStatus["Rejected"]}</span>
            <span class="stat-sub">Demo Status Record</span>
          </div>
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
        </div>
      </div>

      <!-- Sample Application Records Table -->
      <div class="card" style="margin-bottom:22px;">
        <div class="card-header">
          <div>
            <h3 class="card-title">Sample Application Status Records (Applicant Demo Account)</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:2px;">
              Select any sample application record below to inspect its simulated status details.
            </p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <select id="demoStatusFilterSelect" class="form-control" style="max-width:190px;" aria-label="Filter by Status">
              <option value="All" ${demoStatusFilter === "All" ? "selected" : ""}>All Statuses (${
      demoRecords.length
    })</option>
              ${["Pending", "Under Review", "Approved", "Rejected"]
                .map(
                  (st) =>
                    `<option value="${st}" ${
                      demoStatusFilter === st ? "selected" : ""
                    }>${st}</option>`
                )
                .join("")}
            </select>

            <select id="demoYearFilterSelect" class="form-control" style="max-width:170px;" aria-label="Filter by Year Level">
              <option value="All" ${demoYearFilter === "All" ? "selected" : ""}>All Year Levels</option>
              ${validYears
                .map(
                  (yr) =>
                    `<option value="${yr}" ${
                      demoYearFilter === yr ? "selected" : ""
                    }>${yr}</option>`
                )
                .join("")}
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Reference No.</th>
                <th>Sample Applicant Name</th>
                <th>Desired Program</th>
                <th>Year Level</th>
                <th>Record Type</th>
                <th>Sample Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                filteredRecords.length === 0
                  ? `<tr><td colspan="7" style="text-align:center;padding:20px;">No sample demo records match the selected filters.</td></tr>`
                  : filteredRecords
                      .map(
                        (rec) => `
                      <tr style="${
                        activeRecord && activeRecord.id === rec.id
                          ? "background:var(--primary-50);"
                          : ""
                      }">
                        <td><strong>${escapeHtml(rec.referenceNumber)}</strong></td>
                        <td><strong>${escapeHtml(rec.fullName)}</strong></td>
                        <td>${escapeHtml(rec.desiredProgram)}</td>
                        <td><span class="badge badge-info">${escapeHtml(rec.yearLevel)}</span></td>
                        <td><span class="badge badge-neutral">Simulated Demo Record</span></td>
                        <td>
                          <span class="badge ${getStatusBadgeClass(rec.status)}">
                            ${escapeHtml(rec.status)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            class="btn btn-sm ${
                              activeRecord && activeRecord.id === rec.id
                                ? "btn-primary"
                                : "btn-secondary"
                            } inspect-demo-rec-btn"
                            data-id="${escapeHtml(rec.id)}"
                          >
                            ${
                              activeRecord && activeRecord.id === rec.id
                                ? "Viewing Details"
                                : "Inspect Status"
                            }
                          </button>
                        </td>
                      </tr>
                    `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detailed Sample Application Status Viewer -->
      ${
        activeRecord
          ? `
          <div class="card">
            <div class="card-header">
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span class="badge badge-warning">Simulated Demo Record</span>
                  <span style="font-size:0.78rem;text-transform:uppercase;color:var(--text-muted);font-weight:700;">
                    Reference: ${escapeHtml(activeRecord.referenceNumber)}
                  </span>
                </div>
                <h3 style="font-size:1.3rem;color:var(--royal-600);">
                  ${escapeHtml(activeRecord.fullName)}
                </h3>
              </div>

              <div style="text-align:right;">
                <span style="font-size:0.76rem;color:var(--text-muted);display:block;margin-bottom:4px;">
                  Simulated Application Status (Click to Preview Statuses)
                </span>
                <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
                  ${["Submitted", "Under Review", "Approved", "Rejected"]
                    .map(
                      (st) => `
                    <button
                      type="button"
                      class="btn btn-sm ${
                        activeRecord.status === st ? "btn-primary" : "btn-secondary"
                      } sim-demo-status-btn"
                      data-status="${st}"
                    >${st}</button>
                  `
                    )
                    .join("")}
                </div>
              </div>
            </div>

            <!-- 4-Step Visual Progress Tracker -->
            <div class="status-tracker-steps">
              <div class="status-step ${
                ["Submitted", "Under Review", "Approved", "Rejected"].includes(activeRecord.status)
                  ? "active-step"
                  : ""
              }">
                1. Submitted
              </div>
              <div class="status-step ${
                ["Under Review", "Approved", "Rejected"].includes(activeRecord.status)
                  ? "active-step"
                  : ""
              }">
                2. Under Review
              </div>
              <div class="status-step ${
                activeRecord.status === "Approved" ? "approved-step" : ""
              }">
                3. Approved
              </div>
              <div class="status-step ${
                activeRecord.status === "Rejected" ? "rejected-step" : ""
              }">
                4. Rejected (If Applicable)
              </div>
            </div>

            <!-- Status Explanation Message -->
            <div class="notice-banner" style="margin-bottom:18px;">
              <div>
                ${
                  activeRecord.status === "Submitted"
                    ? `<strong>Sample Status — Submitted:</strong> This simulated demo record (<code>${escapeHtml(
                        activeRecord.referenceNumber
                      )}</code>) illustrates an application that has been submitted and is awaiting initial review.`
                    : activeRecord.status === "Under Review"
                    ? `<strong>Sample Status — Under Review:</strong> This simulated demo record for <strong>${escapeHtml(
                        activeRecord.desiredProgram
                      )} (${escapeHtml(
                        activeRecord.yearLevel
                      )})</strong> illustrates an application currently being evaluated.`
                    : activeRecord.status === "Approved"
                    ? `<strong>Sample Status — Approved:</strong> This simulated demo record for <strong>${escapeHtml(
                        activeRecord.desiredProgram
                      )} (${escapeHtml(
                        activeRecord.yearLevel
                      )})</strong> illustrates an approved admission application.`
                    : `<strong>Sample Status — Rejected:</strong> This simulated demo record illustrates an application marked as Rejected for demonstration purposes.`
                }
              </div>
            </div>

            <!-- Sample Application Details Grid -->
            <div class="form-grid">
              <div class="dash-list-item">
                <div>
                  <div class="dash-item-sub">Sample Applicant Name</div>
                  <div class="dash-item-title">${escapeHtml(activeRecord.fullName)}</div>
                </div>
              </div>

              <div class="dash-list-item">
                <div>
                  <div class="dash-item-sub">Applying For Year Level</div>
                  <div class="dash-item-title">${escapeHtml(activeRecord.yearLevel)}</div>
                </div>
              </div>

              <div class="dash-list-item">
                <div>
                  <div class="dash-item-sub">Preferred Program (1st Choice)</div>
                  <div class="dash-item-title">${escapeHtml(activeRecord.desiredProgram)}</div>
                </div>
              </div>

              <div class="dash-list-item">
                <div>
                  <div class="dash-item-sub">Alternative Program (2nd Choice)</div>
                  <div class="dash-item-title">${escapeHtml(
                    activeRecord.secondChoiceProgram || "None"
                  )}</div>
                </div>
              </div>

              <div class="dash-list-item">
                <div>
                  <div class="dash-item-sub">Applicant Classification</div>
                  <div class="dash-item-title">${escapeHtml(activeRecord.applicantType)}</div>
                </div>
              </div>

              <div class="dash-list-item">
                <div>
                  <div class="dash-item-sub">Email &amp; Contact Number (Sample)</div>
                  <div class="dash-item-title">${escapeHtml(activeRecord.email)} &bull; ${escapeHtml(
              activeRecord.contactNumber
            )}</div>
                </div>
              </div>

              <div class="dash-list-item">
                <div>
                  <div class="dash-item-sub">Previous School &amp; Graduation Year (Sample)</div>
                  <div class="dash-item-title">${escapeHtml(
                    activeRecord.previousSchool
                  )} (${escapeHtml(activeRecord.graduationYear || "2026")})</div>
                </div>
              </div>

              <div class="dash-list-item">
                <div>
                  <div class="dash-item-sub">Educational Background &amp; Sample Date</div>
                  <div class="dash-item-title">${escapeHtml(
                    activeRecord.educationalBackground
                  )} &bull; ${escapeHtml(formatReadableDate(activeRecord.submittedDate))}</div>
                </div>
              </div>
            </div>
          </div>
        `
          : ""
      }
    `;

    container.querySelectorAll("[data-demo-app-nav]").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.getAttribute("data-demo-app-nav")));
    });

    const stFilterEl = document.getElementById("demoStatusFilterSelect");
    if (stFilterEl) {
      stFilterEl.addEventListener("change", (e) => {
        demoStatusFilter = e.target.value;
        renderStatus();
      });
    }

    const yrFilterEl = document.getElementById("demoYearFilterSelect");
    if (yrFilterEl) {
      yrFilterEl.addEventListener("change", (e) => {
        demoYearFilter = e.target.value;
        renderStatus();
      });
    }

    container.querySelectorAll(".inspect-demo-rec-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedDemoRecordId = btn.getAttribute("data-id");
        renderStatus();
      });
    });

    container.querySelectorAll(".sim-demo-status-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!activeRecord) return;
        const newStatus = btn.getAttribute("data-status");
        const currState = StudentHubStorage.getState();
        currState.demoApplicantRecords = (currState.demoApplicantRecords || []).map((r) =>
          r.id === activeRecord.id ? { ...r, status: newStatus } : r
        );
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast(
          `Simulated status for demo record ${activeRecord.referenceNumber} set to: ${newStatus}`,
          "info"
        );
      });
    });
  }

  return {
    renderLanding,
    renderForm,
    renderStatus
  };
})();

window.StudentHubApplicant = StudentHubApplicant;
