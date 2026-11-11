/**
 * ============================================================================
 * StudentHub - Module 2: Student Profile (profile.js)
 * View and edit personal student information, upload local profile photo,
 * validate required fields and email format, and persist to localStorage.
 * ============================================================================
 */

const StudentHubProfile = (function () {
  const {
    escapeHtml,
    isValidEmail,
    clearFormErrors,
    setFieldError,
    showToast,
    refreshAll
  } = window.StudentHubApp;

  function render() {
    const container = document.getElementById("profileContainer");
    if (!container) return;

    const state = StudentHubStorage.getState();
    const p = state.profile;

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header-info">
          <h2>BANTUG UNIVERSITY &mdash; My Student Profile</h2>
          <p>View and manage your personal academic record, BSIT 2-2 section details, and contact information.</p>
        </div>
      </div>

      <div class="notice-banner">
        <div>
          <strong>BANTUG UNIVERSITY Demonstration Student Record:</strong> This profile contains sample academic data stored locally in your browser via <code>localStorage</code>. Changes you save here immediately update the portal header and dashboard.
        </div>
      </div>

      <div class="profile-layout">
        <!-- Left Card: Avatar & Summary -->
        <div class="card profile-card-left">
          <div class="profile-avatar-wrapper">
            <img
              src="${escapeHtml(p.avatar || "assets/images/default-avatar.svg")}"
              alt="Profile Avatar"
              class="profile-avatar-lg"
              id="profileAvatarPreview"
            />
          </div>
          <h3 style="font-size:1.15rem;margin-bottom:4px;">${escapeHtml(p.fullName)}</h3>
          <span class="badge badge-primary" style="margin-bottom:8px;">${escapeHtml(p.studentNumber)}</span>
          <p style="font-size:0.84rem;color:var(--text-secondary);">${escapeHtml(p.course)} &bull; ${escapeHtml(p.yearLevel)}</p>

          <div class="avatar-upload-actions">
            <label for="avatarFileInput" class="btn btn-sm btn-secondary" style="cursor:pointer;">
              Upload Photo
            </label>
            <input type="file" id="avatarFileInput" accept="image/*" hidden />
            <button type="button" class="btn btn-sm btn-outline-danger" id="resetAvatarBtn">
              Default Avatar
            </button>
          </div>
          <span class="form-hint" style="margin-top:6px;">Supports PNG, JPG, SVG (max 1.5MB)</span>

          <div class="profile-meta-list">
            <div class="profile-meta-row">
              <span>Section</span>
              <span>${escapeHtml(p.section)}</span>
            </div>
            <div class="profile-meta-row">
              <span>Academic Term</span>
              <span>${escapeHtml(p.academicTerm || "1st Sem, AY 2026–2027")}</span>
            </div>
            <div class="profile-meta-row">
              <span>Email</span>
              <span style="word-break:break-all;">${escapeHtml(p.email)}</span>
            </div>
            <div class="profile-meta-row">
              <span>Contact</span>
              <span>${escapeHtml(p.contactNumber)}</span>
            </div>
            <div class="profile-meta-row">
              <span>Guardian</span>
              <span>${escapeHtml(p.guardianName || "N/A")}</span>
            </div>
          </div>
        </div>

        <!-- Right Card: Edit Personal Information Form -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Edit Personal & Academic Information</h3>
            <span class="badge badge-neutral">Required fields marked with *</span>
          </div>

          <form id="profileForm" novalidate>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="profStudentNumber">Student Number <span class="req">*</span></label>
                <input
                  type="text"
                  id="profStudentNumber"
                  name="studentNumber"
                  class="form-control"
                  value="${escapeHtml(p.studentNumber)}"
                  placeholder="e.g. 2024-DEMO-0108"
                />
                <div class="field-error" data-error-for="studentNumber"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="profFullName">Full Name <span class="req">*</span></label>
                <input
                  type="text"
                  id="profFullName"
                  name="fullName"
                  class="form-control"
                  value="${escapeHtml(p.fullName)}"
                  placeholder="Enter your full name"
                />
                <div class="field-error" data-error-for="fullName"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="profCourse">Course / Degree Program <span class="req">*</span></label>
                <input
                  type="text"
                  id="profCourse"
                  name="course"
                  class="form-control"
                  value="${escapeHtml(p.course)}"
                  placeholder="e.g. BS in Computer Science"
                />
                <div class="field-error" data-error-for="course"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="profYearLevel">Year Level <span class="req">*</span></label>
                <select id="profYearLevel" name="yearLevel" class="form-control">
                  ${StudentHubStorage.VALID_YEAR_LEVELS.map(
                    (yr) =>
                      `<option value="${yr}" ${
                        StudentHubStorage.normalizeYearLevel(p.yearLevel, "Year 2") === yr
                          ? "selected"
                          : ""
                      }>${yr}</option>`
                  ).join("")}
                </select>
                <div class="field-error" data-error-for="yearLevel"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="profSection">Section <span class="req">*</span></label>
                <input
                  type="text"
                  id="profSection"
                  name="section"
                  class="form-control"
                  value="${escapeHtml(p.section)}"
                  placeholder="e.g. BSCS 3-A"
                />
                <div class="field-error" data-error-for="section"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="profAcademicTerm">Academic Term <span class="req">*</span></label>
                <input
                  type="text"
                  id="profAcademicTerm"
                  name="academicTerm"
                  class="form-control"
                  value="${escapeHtml(p.academicTerm || "1st Semester, AY 2026–2027")}"
                  placeholder="e.g. 1st Semester, AY 2026–2027"
                />
                <div class="field-error" data-error-for="academicTerm"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="profEmail">Email Address <span class="req">*</span></label>
                <input
                  type="email"
                  id="profEmail"
                  name="email"
                  class="form-control"
                  value="${escapeHtml(p.email)}"
                  placeholder="student@university.edu"
                />
                <div class="field-error" data-error-for="email"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="profContact">Contact Number <span class="req">*</span></label>
                <input
                  type="tel"
                  id="profContact"
                  name="contactNumber"
                  class="form-control"
                  value="${escapeHtml(p.contactNumber)}"
                  placeholder="e.g. +63 917 555 0148"
                />
                <div class="field-error" data-error-for="contactNumber"></div>
              </div>

              <div class="form-group full-width">
                <label class="form-label" for="profAddress">Home / Dormitory Address <span class="req">*</span></label>
                <input
                  type="text"
                  id="profAddress"
                  name="address"
                  class="form-control"
                  value="${escapeHtml(p.address || "")}"
                  placeholder="Enter complete address"
                />
                <div class="field-error" data-error-for="address"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="profGuardianName">Emergency Contact / Guardian Name</label>
                <input
                  type="text"
                  id="profGuardianName"
                  name="guardianName"
                  class="form-control"
                  value="${escapeHtml(p.guardianName || "")}"
                  placeholder="Guardian's full name"
                />
                <div class="field-error" data-error-for="guardianName"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="profGuardianContact">Emergency Contact Number</label>
                <input
                  type="tel"
                  id="profGuardianContact"
                  name="guardianContact"
                  class="form-control"
                  value="${escapeHtml(p.guardianContact || "")}"
                  placeholder="Emergency phone number"
                />
                <div class="field-error" data-error-for="guardianContact"></div>
              </div>

              <div class="form-group full-width">
                <label class="form-label" for="profBio">Academic Bio / Goals</label>
                <textarea
                  id="profBio"
                  name="bio"
                  rows="3"
                  class="form-control"
                  placeholder="Brief academic bio or semester goals..."
                >${escapeHtml(p.bio || "")}</textarea>
                <div class="field-error" data-error-for="bio"></div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" id="discardProfileChangesBtn">Discard Unsaved Changes</button>
              <button type="submit" class="btn btn-primary">Save Profile Information</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Handle local profile picture upload
    const fileInput = document.getElementById("avatarFileInput");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
          showToast("Please select a valid image file (PNG, JPG, SVG, WebP).", "error");
          return;
        }
        if (file.size > 1.5 * 1024 * 1024) {
          showToast("Image file is too large. Please choose an image under 1.5 MB.", "error");
          return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          const currState = StudentHubStorage.getState();
          currState.profile.avatar = dataUrl;
          StudentHubStorage.saveState(currState);
          refreshAll();
          showToast("Profile picture updated and saved locally!", "success");
        };
        reader.readAsDataURL(file);
      });
    }

    // Handle reset avatar to default SVG
    const resetAvatarBtn = document.getElementById("resetAvatarBtn");
    if (resetAvatarBtn) {
      resetAvatarBtn.addEventListener("click", () => {
        const currState = StudentHubStorage.getState();
        currState.profile.avatar = "assets/images/default-avatar.svg";
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast("Profile picture reset to default avatar.", "info");
      });
    }

    // Handle Discard button
    const discardBtn = document.getElementById("discardProfileChangesBtn");
    if (discardBtn) {
      discardBtn.addEventListener("click", () => {
        render();
        showToast("Unsaved form edits discarded.", "info");
      });
    }

    // Handle Form Submission & Validation
    const form = document.getElementById("profileForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        clearFormErrors(form);

        const formData = new FormData(form);
        const updated = {
          studentNumber: String(formData.get("studentNumber") || "").trim(),
          fullName: String(formData.get("fullName") || "").trim(),
          course: String(formData.get("course") || "").trim(),
          yearLevel: String(formData.get("yearLevel") || "").trim(),
          section: String(formData.get("section") || "").trim(),
          academicTerm: String(formData.get("academicTerm") || "").trim(),
          email: String(formData.get("email") || "").trim(),
          contactNumber: String(formData.get("contactNumber") || "").trim(),
          address: String(formData.get("address") || "").trim(),
          guardianName: String(formData.get("guardianName") || "").trim(),
          guardianContact: String(formData.get("guardianContact") || "").trim(),
          bio: String(formData.get("bio") || "").trim()
        };

        let isValid = true;

        if (!updated.studentNumber) {
          setFieldError(form, "studentNumber", "Student number is required.");
          isValid = false;
        }
        if (!updated.fullName || updated.fullName.length < 2) {
          setFieldError(form, "fullName", "Please enter your full name.");
          isValid = false;
        }
        if (!updated.course) {
          setFieldError(form, "course", "Course / program is required.");
          isValid = false;
        }
        if (!updated.yearLevel || !StudentHubStorage.isValidYearLevel(updated.yearLevel)) {
          setFieldError(
            form,
            "yearLevel",
            "Please select a valid Year Level (Year 1, Year 2, Year 3, or Year 4)."
          );
          isValid = false;
        }
        if (!updated.section) {
          setFieldError(form, "section", "Section is required.");
          isValid = false;
        }
        if (!updated.academicTerm) {
          setFieldError(form, "academicTerm", "Academic term is required.");
          isValid = false;
        }
        if (!updated.email) {
          setFieldError(form, "email", "Email address is required.");
          isValid = false;
        } else if (!isValidEmail(updated.email)) {
          setFieldError(form, "email", "Please enter a valid email address (e.g., name@domain.edu).");
          isValid = false;
        }
        if (!updated.contactNumber || updated.contactNumber.length < 7) {
          setFieldError(form, "contactNumber", "Please enter a valid contact number.");
          isValid = false;
        }
        if (!updated.address) {
          setFieldError(form, "address", "Address cannot be empty.");
          isValid = false;
        }

        if (!isValid) {
          showToast("Please fix the highlighted errors before saving.", "error");
          return;
        }

        const currState = StudentHubStorage.getState();
        currState.profile = {
          ...currState.profile,
          ...updated
        };
        StudentHubStorage.saveState(currState);
        refreshAll();
        showToast("Student profile saved successfully!", "success");
      });
    }
  }

  return { render };
})();

window.StudentHubProfile = StudentHubProfile;

