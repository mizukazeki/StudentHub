// Student profile view and personal information display.
/**
 * ============================================================================
 * StudentHub - Module 2: Student Profile (profile.js)
 * Hydrates `pages/student/profile.html`, handles local profile photo uploads,
 * validates required fields and email format, and persists updates via
 * StudentHubStorage.
 * ============================================================================
 */

const StudentHubProfile = (function () {
  const {
    isValidEmail,
    clearFormErrors,
    setFieldError,
    showToast,
    refreshAll,
    formatReadableDate
  } = window.StudentHubApp;

  let isEditMode = false;

  function parseAcademicTerm(termStr) {
    const raw = String(termStr || "").trim();
    if (!raw) return { semester: "—", academicYear: "—" };
    const ayMatch = raw.match(/(AY\s*\d{4}\s*[–-]\s*\d{4}|\d{4}\s*[–-]\s*\d{4})/i);
    const academicYear = ayMatch ? ayMatch[1].replace(/\s+/g, " ").trim() : "—";
    let semester = raw;
    if (ayMatch) {
      semester = raw
        .replace(ayMatch[0], "")
        .replace(/^[,\s•–-]+|[,\s•–-]+$/g, "")
        .trim();
    }
    return {
      semester: semester || raw,
      academicYear
    };
  }

  function findRosterRecord(state, profile) {
    const roster = Array.isArray(state && state.sectionRoster) ? state.sectionRoster : [];
    const studNo = String((profile && profile.studentNumber) || "").trim().toLowerCase();
    const email = String((profile && profile.email) || "").trim().toLowerCase();
    return (
      roster.find(
        (r) =>
          (studNo && r.studentNumber && r.studentNumber.toLowerCase() === studNo) ||
          (email && r.email && r.email.toLowerCase() === email)
      ) || null
    );
  }

  function setEditMode(open, options = {}) {
    isEditMode = Boolean(open);
    const editCard = document.getElementById("profileEditCard");
    const toggleBtn = document.getElementById("toggleProfileEditBtn");

    if (editCard) {
      editCard.hidden = !isEditMode;
    }
    if (toggleBtn) {
      toggleBtn.textContent = isEditMode ? "Close Editor" : "Edit Profile";
      toggleBtn.setAttribute("aria-expanded", String(isEditMode));
    }

    if (isEditMode && options.focusField) {
      if (editCard && typeof editCard.scrollIntoView === "function") {
        editCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      const firstInput = document.getElementById("profFullName");
      if (firstInput && typeof firstInput.focus === "function") {
        firstInput.focus();
      }
    }
  }

  function bindProfileEventsOnce(container) {
    if (!container || container.dataset.profileEventsBound === "1") return;
    container.dataset.profileEventsBound = "1";

    // Handle Edit Profile toggle & section quick-edit buttons
    const toggleEditBtn = document.getElementById("toggleProfileEditBtn");
    if (toggleEditBtn) {
      toggleEditBtn.addEventListener("click", () => {
        setEditMode(!isEditMode, { focusField: !isEditMode });
      });
    }

    container.addEventListener("click", (e) => {
      const quickEditTrigger = e.target && e.target.closest ? e.target.closest("[data-open-profile-edit]") : null;
      if (quickEditTrigger) {
        setEditMode(true, { focusField: true });
      }
    });

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

    // Handle Discard / Cancel button
    const discardBtn = document.getElementById("discardProfileChangesBtn");
    if (discardBtn) {
      discardBtn.addEventListener("click", () => {
        setEditMode(false);
        render();
        showToast("Profile changes cancelled.", "info");
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
          setEditMode(true);
          showToast("Please fix the highlighted errors before saving.", "error");
          return;
        }

        const currState = StudentHubStorage.getState();
        currState.profile = {
          ...currState.profile,
          ...updated
        };
        StudentHubStorage.saveState(currState);
        setEditMode(false);
        refreshAll();
        showToast("Student profile saved successfully!", "success");
      });
    }
  }

  function setTextById(id, value, fallback = "—") {
    const el = document.getElementById(id);
    if (!el) return;
    const text = value !== undefined && value !== null && String(value).trim() !== ""
      ? String(value).trim()
      : fallback;
    el.textContent = text;
  }

  function render() {
    const container = document.getElementById("profileContainer");
    if (!container) return;

    bindProfileEventsOnce(container);

    const state = StudentHubStorage.getState();
    const p = state.profile || {};
    const normalizedYear = StudentHubStorage.normalizeYearLevel(p.yearLevel, "Year 2");
    const termValue = p.academicTerm || "2nd Semester, AY 2026–2027";
    const parsedTerm = parseAcademicTerm(termValue);
    const rosterMatch = findRosterRecord(state, p);

    const rawDob = p.dateOfBirth || (rosterMatch && rosterMatch.dateOfBirth) || "";
    const formattedDob = rawDob
      ? typeof formatReadableDate === "function"
        ? formatReadableDate(rawDob)
        : rawDob
      : "Not recorded";
    const genderValue = p.gender || (rosterMatch && rosterMatch.gender) || "";
    const accountStatus =
      p.accountStatus ||
      p.enrollmentStatus ||
      p.status ||
      (rosterMatch && rosterMatch.status) ||
      "";

    // Hydrate Profile Overview Card
    const avatarEl = document.getElementById("profileAvatarPreview");
    if (avatarEl) avatarEl.src = p.avatar || "assets/images/default-avatar.svg";

    setTextById("profCardFullName", p.fullName, "Student");
    setTextById("profCardStudentNumber", p.studentNumber, "—");
    setTextById("profCardCourseYear", `${p.course || "—"} • ${normalizedYear}`);
    setTextById("profOverviewSectionBadge", `Section: ${p.section || "—"}`);

    const statusBadgeEl = document.getElementById("profAccountStatusBadge");
    if (statusBadgeEl) {
      if (accountStatus) {
        statusBadgeEl.hidden = false;
        statusBadgeEl.textContent = `Status: ${accountStatus}`;
      } else {
        statusBadgeEl.hidden = true;
      }
    }

    setTextById("profMetaSection", p.section, "—");
    setTextById("profMetaAcademicTerm", termValue, "—");
    setTextById("profMetaEmail", p.email, "—");
    setTextById("profMetaContact", p.contactNumber, "—");
    setTextById("profMetaGuardian", p.guardianName, "N/A");

    // Hydrate Personal Information Card
    setTextById("profPersonalFullName", p.fullName, "—");
    setTextById("profPersonalDob", formattedDob, "Not recorded");
    const genderRowEl = document.getElementById("profPersonalGenderRow");
    if (genderRowEl) {
      genderRowEl.hidden = !genderValue;
    }
    setTextById("profPersonalGender", genderValue, "—");
    setTextById("profPersonalEmail", p.email, "—");
    setTextById("profPersonalContact", p.contactNumber, "—");
    setTextById("profPersonalAddress", p.address, "—");
    setTextById("profPersonalBio", p.bio, "No academic bio added.");

    // Hydrate Academic Information Card
    setTextById("profAcadStudentNumber", p.studentNumber, "—");
    setTextById("profAcadProgram", p.course, "—");
    setTextById("profAcadYearLevel", normalizedYear, "—");
    setTextById("profAcadSection", p.section, "—");
    setTextById("profAcadYear", parsedTerm.academicYear, "—");
    setTextById("profAcadSemester", parsedTerm.semester, "—");
    setTextById("profAcadStatus", accountStatus, "Not specified");
    setTextById("profAcadStandingTag", accountStatus || "Student Record");

    // Hydrate Contact Information Card
    setTextById("profContactEmail", p.email, "—");
    setTextById("profContactPhone", p.contactNumber, "—");
    setTextById("profContactAddress", p.address, "—");
    setTextById("profContactGuardianName", p.guardianName, "N/A");
    setTextById("profContactGuardianPhone", p.guardianContact, "Not specified");

    // Hydrate Edit Form Inputs & Keep Toggle UI Synchronized
    const form = document.getElementById("profileForm");
    if (form) {
      clearFormErrors(form);
    }

    const fieldMap = {
      profStudentNumber: p.studentNumber || "",
      profFullName: p.fullName || "",
      profCourse: p.course || "",
      profYearLevel: normalizedYear,
      profSection: p.section || "",
      profAcademicTerm: termValue,
      profEmail: p.email || "",
      profContact: p.contactNumber || "",
      profAddress: p.address || "",
      profGuardianName: p.guardianName || "",
      profGuardianContact: p.guardianContact || "",
      profBio: p.bio || ""
    };

    Object.entries(fieldMap).forEach(([elId, val]) => {
      const el = document.getElementById(elId);
      if (el) el.value = val;
    });

    setEditMode(isEditMode);
  }

  return { render, setEditMode, parseAcademicTerm };
})();

window.StudentHubProfile = StudentHubProfile;
