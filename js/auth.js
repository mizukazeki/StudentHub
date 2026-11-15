// Authentication handler for login, logout, and role session states.
/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Authentication & Demo Role Access Controller (auth.js)
 *
 * Important Academic Note:
 * This module simulates role-based authentication on the client side using
 * JavaScript and localStorage for academic demonstration purposes.
 * - Supports individual Faculty Demo Accounts (each showing only that professor's schedule)
 * - Separates the normal Applicant Portal application flow from the dedicated
 *   "Applicant Demo Account" (which displays sample application status records)
 * ============================================================================
 */

const StudentHubAuth = (function () {
  const {
    clearFormErrors,
    setFieldError,
    openModal,
    closeModal,
    showToast,
    enterPortal
  } = window.StudentHubApp;

  const DEMO_ACCOUNTS = {
    student: {
      role: "student",
      identifiers: [
        "student.demo@bantug.edu.example",
        "r.valiente.demo@bantug.edu.example",
        "r.valiente",
        "racel valiente",
        "valiente, racel",
        "2025-bsit-0202",
        "student",
        // All 15 preloaded BSIT student accounts
        "2025-bsit-0205",
        "a.santos",
        "a.santos.demo@bantug.edu.example",
        "2025-bsit-0209",
        "c.reyes",
        "c.reyes.demo@bantug.edu.example",
        "2025-bsit-0214",
        "p.mendoza",
        "p.mendoza.demo@bantug.edu.example",
        "2025-bsit-0218",
        "m.garcia",
        "m.garcia.demo@bantug.edu.example",
        "2025-bsit-0221",
        "c.villanueva.st",
        "c.villanueva.st@bantug.edu.example",
        "2025-bsit-0225",
        "j.aquino",
        "j.aquino.demo@bantug.edu.example",
        "2026-bsit-0101",
        "a.cruz",
        "a.cruz.demo@bantug.edu.example",
        "2026-bsit-0104",
        "g.bautista",
        "g.bautista.demo@bantug.edu.example",
        "2026-bsit-0108",
        "s.ramos",
        "s.ramos.demo@bantug.edu.example",
        "2024-bsit-0302",
        "k.flores",
        "k.flores.demo@bantug.edu.example",
        "2024-bsit-0307",
        "j.tolentino",
        "j.tolentino.demo@bantug.edu.example",
        "2024-bsit-0312",
        "b.navarro",
        "b.navarro.demo@bantug.edu.example",
        "2023-bsit-0401",
        "e.pascual",
        "e.pascual.demo@bantug.edu.example",
        "2023-bsit-0406",
        "d.soriano",
        "d.soriano.demo@bantug.edu.example"
      ],
      password: "demo123",
      displayEmail: "student.demo@bantug.edu.example",
      displayName: "Racel Valiente (BSIT 2-2)"
    },
    faculty: {
      role: "faculty",
      identifiers: [
        "f.somera.demo@bantug.edu.example",
        "f.somera",
        "fabian somera",
        "somera, fabian",
        "fac-bu-04",
        "faculty.demo@bantug.edu.example",
        "fac-bu-2026-04",
        "faculty",
        // All 15 preloaded faculty accounts
        "f.salvador.demo@bantug.edu.example",
        "f.salvador",
        "francis van salvador",
        "salvador, francis van",
        "fac-bu-07",
        "s.itliong.demo@bantug.edu.example",
        "s.itliong",
        "fac-bu-01",
        "b.duque.demo@bantug.edu.example",
        "b.duque",
        "fac-bu-02",
        "j.albano.demo@bantug.edu.example",
        "j.albano",
        "fac-bu-03",
        "j.quevedo.demo@bantug.edu.example",
        "j.quevedo",
        "fac-bu-05",
        "e.panganiban.demo@bantug.edu.example",
        "e.panganiban",
        "fac-bu-06",
        "g.vallestero.demo@bantug.edu.example",
        "g.vallestero",
        "fac-bu-08",
        "e.santos.demo@bantug.edu.example",
        "e.santos",
        "fac-bu-09",
        "l.binayan.demo@bantug.edu.example",
        "l.binayan",
        "fac-bu-10",
        "w.castillo.demo@bantug.edu.example",
        "w.castillo",
        "fac-bu-11",
        "a.delosreyes.demo@bantug.edu.example",
        "a.delosreyes",
        "fac-bu-12",
        "c.macapagal.demo@bantug.edu.example",
        "c.macapagal",
        "fac-bu-13",
        "r.villamor.demo@bantug.edu.example",
        "r.villamor",
        "fac-bu-14",
        "m.ocampo.demo@bantug.edu.example",
        "m.ocampo",
        "fac-bu-15"
      ],
      password: "faculty123",
      displayEmail: "f.somera.demo@bantug.edu.example",
      displayName: "Somera, Fabian (Faculty - IT 211)"
    },
    faculty2: {
      role: "faculty",
      identifiers: [
        "f.salvador.demo@bantug.edu.example",
        "f.salvador",
        "francis van salvador",
        "salvador, francis van",
        "fac-bu-07"
      ],
      password: "faculty123",
      displayEmail: "f.salvador.demo@bantug.edu.example",
      displayName: "Salvador, Francis Van (Faculty - IT ELEC 2)"
    },
    applicant: {
      role: "applicant",
      isApplicantDemoAccount: true,
      identifiers: [
        "applicant.demo@bantug.edu.example",
        "c.villanueva.demo@bantug.edu.example",
        "c.villanueva",
        "ceasar villanueva",
        "villanueva, ceasar",
        "bu-adm-2026-10482",
        "app-demo-2026-01",
        "applicant",
        // All 15 preloaded applicant accounts
        "bu-adm-2026-10319",
        "r.mendoza",
        "rafael.mendoza.demo@bantug.edu.example",
        "bu-adm-2026-10105",
        "b.aquino",
        "bea.aquino.demo@bantug.edu.example",
        "bu-adm-2026-10044",
        "j.bautista.app",
        "jerome.bautista.demo@bantug.edu.example",
        "bu-adm-2026-10511",
        "h.delarosa",
        "hannah.delarosa.demo@bantug.edu.example",
        "bu-adm-2026-10524",
        "m.castro",
        "miguel.castro.demo@bantug.edu.example",
        "bu-adm-2026-10538",
        "k.mercado",
        "katrina.mercado.demo@bantug.edu.example",
        "bu-adm-2026-10549",
        "l.domingo",
        "lance.domingo.demo@bantug.edu.example",
        "bu-adm-2026-10562",
        "t.salazar",
        "trisha.salazar.demo@bantug.edu.example",
        "bu-adm-2026-10577",
        "v.pangilinan",
        "vincent.pangilinan.demo@bantug.edu.example",
        "bu-adm-2026-10583",
        "c.evangelista",
        "clarisse.evangelista.demo@bantug.edu.example",
        "bu-adm-2026-10590",
        "d.magno",
        "daryl.magno.demo@bantug.edu.example",
        "bu-adm-2026-10604",
        "n.galang",
        "nadine.galang.demo@bantug.edu.example",
        "bu-adm-2026-10618",
        "a.vergara",
        "adrian.vergara.demo@bantug.edu.example",
        "bu-adm-2026-10629",
        "f.lopez",
        "francine.lopez.demo@bantug.edu.example"
      ],
      password: "apply123",
      displayEmail: "applicant.demo@bantug.edu.example",
      displayName: "Ceasar Villanueva (Applicant Demo Account)"
    }
  };

  function selectLoginRoleTab(role) {
    const normalizedRole = role === "faculty2" ? "faculty" : role;
    const roleInput = document.getElementById("loginRoleInput");
    if (roleInput) roleInput.value = normalizedRole;

    document.querySelectorAll(".login-role-tab").forEach((tab) => {
      const isMatch = tab.getAttribute("data-login-role") === normalizedRole;
      tab.classList.toggle("active", isMatch);
      tab.setAttribute("aria-selected", isMatch ? "true" : "false");
    });

    const idInput = document.getElementById("loginIdentifier");
    if (idInput) {
      if (normalizedRole === "faculty") {
        idInput.placeholder = "e.g. f.somera.demo@bantug.edu.example or FAC-BU-04";
      } else if (normalizedRole === "applicant") {
        idInput.placeholder = "e.g. applicant.demo@bantug.edu.example or BU-ADM-2026-10482";
      } else {
        idInput.placeholder = "e.g. student.demo@bantug.edu.example or 2025-BSIT-0202";
      }
    }
  }

  function fillDemoCredentials(roleKey) {
    const account = DEMO_ACCOUNTS[roleKey] || DEMO_ACCOUNTS.student;
    selectLoginRoleTab(account.role);

    const idInput = document.getElementById("loginIdentifier");
    const pwInput = document.getElementById("loginPassword");
    const form = document.getElementById("portalLoginForm");
    if (form) clearFormErrors(form);
    const genErr = document.getElementById("loginGeneralError");
    if (genErr) genErr.textContent = "";

    if (idInput) idInput.value = account.displayEmail;
    if (pwInput) pwInput.value = account.password;

    showToast(
      `Filled ${account.displayName} demo credentials. Click Sign In to continue!`,
      "info"
    );
  }

  /**
   * Instant Demo Login into a specific role or account
   */
  async function launchDemoSession(roleKey, targetSection = null, options = {}) {
    const account = DEMO_ACCOUNTS[roleKey] || DEMO_ACCOUNTS.student;
    const isApplicantDemo =
      account.role === "applicant"
        ? options.isApplicantDemoAccount !== undefined
          ? Boolean(options.isApplicantDemoAccount)
          : true
        : false;

    const identifierToUse =
      options.facultyIdentifier || options.studentIdentifier || account.displayEmail;

    if (account.role === "faculty") {
      StudentHubStorage.setActiveFacultyByIdentifier(identifierToUse);
    } else if (
      account.role === "student" &&
      typeof StudentHubStorage.setActiveStudentByIdentifier === "function"
    ) {
      StudentHubStorage.setActiveStudentByIdentifier(identifierToUse);
    }

    let sessionToken = null;
    let displayName = account.displayName;
    let actorId = identifierToUse;

    // If launching an authenticated demo account (student, faculty, or applicant demo),
    // verify against MySQL `users` table and obtain a server-side session token.
    if (
      (account.role !== "applicant" || isApplicantDemo) &&
      typeof StudentHubStorage.loginWithDatabase === "function"
    ) {
      try {
        const authRes = await StudentHubStorage.loginWithDatabase({
          role: account.role,
          identifier: identifierToUse,
          password: account.password
        });
        if (authRes && authRes.ok && authRes.data && authRes.data.session) {
          sessionToken = authRes.data.session.sessionToken || null;
          displayName = authRes.data.session.displayName || displayName;
          actorId = authRes.data.session.actorId || actorId;
        }
      } catch (_) {}
    }

    StudentHubStorage.saveSession(
      {
        role: account.role,
        identifier: identifierToUse,
        displayName,
        actorId,
        sessionToken,
        isDemo: true,
        isApplicantDemoAccount: isApplicantDemo
      },
      true
    );

    closeModal();
    const defaultSection =
      targetSection ||
      (account.role === "applicant"
        ? "applicant-landing"
        : null);

    enterPortal(defaultSection);
    if (typeof StudentHubStorage.loadFromXamppDatabase === "function") {
      StudentHubStorage.loadFromXamppDatabase();
    }

    if (account.role === "applicant") {
      showToast("Opened BANTUG UNIVERSITY Admission Overview.", "info");
    } else {
      showToast(`Entered BANTUG UNIVERSITY ${account.displayName} Portal.`, "success");
    }
  }

  /**
   * Open Password Reset Assistance Modal with interactive OTP Verification & Password Reset
   */
  function openForgotPasswordModal() {
    let cooldownTimerInterval = null;

    const html = `
      <div class="forgot-password-container" style="font-size:0.92rem;color:var(--text-main);line-height:1.5;">
        <!-- Step 1: Identifier Input -->
        <div id="fpStep1">
          <p style="margin:0 0 16px;color:var(--text-secondary);font-size:0.9rem;">
            Enter your registered email address or account ID (Student Number, Faculty ID, or Reference Number). If an account is found, a 6-digit verification code will be sent to your email.
          </p>

          <form id="fpRequestForm" novalidate style="margin-bottom:14px;">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" for="fpIdentifierInput">Email Address or Account ID <span class="req">*</span></label>
              <input
                type="text"
                id="fpIdentifierInput"
                name="identifier"
                class="form-control"
                placeholder="e.g. name@bantug.edu.example or 2025-BSIT-0202"
                autocomplete="username"
                required
              />
              <div class="field-error" data-error-for="identifier"></div>
            </div>
            <div id="fpRequestAlert" class="field-error" style="margin-bottom:12px;" role="alert"></div>

            <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:10px;">
              <button type="button" class="btn btn-secondary" id="fpCancelBtn">Cancel</button>
              <button type="submit" class="btn btn-primary" id="fpSubmitRequestBtn">Send Verification Code</button>
            </div>
          </form>
        </div>

        <!-- Step 2: Enter OTP & New Password -->
        <div id="fpStep2" hidden>
          <div class="alert alert-info" id="fpCodeSentAlert" style="margin-bottom:16px;padding:12px 14px;background:var(--bg-light);border:1px solid var(--border-color);border-radius:8px;font-size:0.86rem;line-height:1.45;">
            A 6-digit verification code has been dispatched. Enter the code below to set your new password. (Code valid for 5 minutes).
          </div>

          <form id="fpResetForm" novalidate style="margin-bottom:14px;">
            <input type="hidden" id="fpResetIdentifier" name="identifier" />

            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" for="fpOtpInput">6-Digit Verification Code <span class="req">*</span></label>
              <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <input
                  type="text"
                  id="fpOtpInput"
                  name="otp"
                  class="form-control"
                  maxlength="6"
                  placeholder="000000"
                  style="max-width:180px;font-size:1.15rem;letter-spacing:4px;font-weight:700;text-align:center;"
                  required
                />
                <button type="button" class="btn btn-secondary btn-sm" id="fpResendOtpBtn">
                  Resend Code
                </button>
                <span id="fpCooldownTimer" style="font-size:0.8rem;color:var(--text-muted);display:none;"></span>
              </div>
              <div class="field-error" data-error-for="otp"></div>
            </div>

            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" for="fpNewPasswordInput">New Password <span class="req">*</span></label>
              <div class="password-input-wrap">
                <input
                  type="password"
                  id="fpNewPasswordInput"
                  name="newPassword"
                  class="form-control"
                  placeholder="Min. 6 characters"
                  autocomplete="new-password"
                  required
                />
                <button type="button" class="password-toggle-btn" data-toggle-target="fpNewPasswordInput" aria-label="Toggle password visibility">
                  Show
                </button>
              </div>
              <div class="field-error" data-error-for="newPassword"></div>
            </div>

            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" for="fpConfirmPasswordInput">Confirm New Password <span class="req">*</span></label>
              <div class="password-input-wrap">
                <input
                  type="password"
                  id="fpConfirmPasswordInput"
                  name="confirmPassword"
                  class="form-control"
                  placeholder="Re-enter new password"
                  autocomplete="new-password"
                  required
                />
                <button type="button" class="password-toggle-btn" data-toggle-target="fpConfirmPasswordInput" aria-label="Toggle password visibility">
                  Show
                </button>
              </div>
              <div class="field-error" data-error-for="confirmPassword"></div>
            </div>

            <div id="fpResetAlert" class="field-error" style="margin-bottom:12px;" role="alert"></div>

            <div class="modal-actions" style="display:flex;justify-content:space-between;align-items:center;">
              <button type="button" class="btn btn-secondary" id="fpBackToStep1Btn">&larr; Back</button>
              <button type="submit" class="btn btn-primary" id="fpSubmitResetBtn">Reset Password</button>
            </div>
          </form>
        </div>

        <div style="font-size:0.8rem;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:12px;margin-top:14px;">
          Need assistance? Contact ICT Helpdesk at <code>helpdesk@bantug.edu.example</code> or Admissions at <code>admissions@bantug.edu.example</code>.
        </div>
      </div>
    `;

    openModal("Reset Portal Password", html, (bodyEl) => {
      const step1 = bodyEl.querySelector("#fpStep1");
      const step2 = bodyEl.querySelector("#fpStep2");
      const requestForm = bodyEl.querySelector("#fpRequestForm");
      const resetForm = bodyEl.querySelector("#fpResetForm");
      const cancelBtn = bodyEl.querySelector("#fpCancelBtn");
      const backBtn = bodyEl.querySelector("#fpBackToStep1Btn");
      const resendBtn = bodyEl.querySelector("#fpResendOtpBtn");
      const cooldownTimerEl = bodyEl.querySelector("#fpCooldownTimer");
      const identifierInput = bodyEl.querySelector("#fpIdentifierInput");
      const resetIdentifierInput = bodyEl.querySelector("#fpResetIdentifier");
      const requestAlert = bodyEl.querySelector("#fpRequestAlert");
      const resetAlert = bodyEl.querySelector("#fpResetAlert");
      const codeSentAlert = bodyEl.querySelector("#fpCodeSentAlert");

      if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

      // Show/Hide password toggles
      bodyEl.querySelectorAll(".password-toggle-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetId = btn.getAttribute("data-toggle-target");
          const input = bodyEl.querySelector(`#${targetId}`);
          if (!input) return;
          const isPass = input.type === "password";
          input.type = isPass ? "text" : "password";
          btn.textContent = isPass ? "Hide" : "Show";
          btn.setAttribute("aria-label", isPass ? "Hide password" : "Show password");
        });
      });

      function startCooldownTimer(seconds) {
        if (cooldownTimerInterval) clearInterval(cooldownTimerInterval);
        let rem = seconds;
        if (resendBtn) resendBtn.disabled = true;
        if (cooldownTimerEl) {
          cooldownTimerEl.style.display = "inline";
          cooldownTimerEl.textContent = `(Resend in ${rem}s)`;
        }
        cooldownTimerInterval = setInterval(() => {
          rem--;
          if (rem <= 0) {
            clearInterval(cooldownTimerInterval);
            if (resendBtn) resendBtn.disabled = false;
            if (cooldownTimerEl) {
              cooldownTimerEl.style.display = "none";
              cooldownTimerEl.textContent = "";
            }
          } else {
            if (cooldownTimerEl) cooldownTimerEl.textContent = `(Resend in ${rem}s)`;
          }
        }, 1000);
      }

      // Step 1: Request Code
      if (requestForm) {
        requestForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          clearFormErrors(requestForm);
          if (requestAlert) requestAlert.textContent = "";

          const ident = String(identifierInput.value || "").trim();
          if (!ident) {
            setFieldError(requestForm, "identifier", "Please enter your email or account ID.");
            return;
          }

          const submitBtn = bodyEl.querySelector("#fpSubmitRequestBtn");
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Sending Code...";
          }

          try {
            const res = await fetch("/api/auth/forgot-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ identifier: ident })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              if (data.cooldown) {
                if (requestAlert) requestAlert.textContent = data.message || "Please wait before requesting another code.";
              } else {
                if (requestAlert) requestAlert.textContent = data.message || "Unable to initiate password reset.";
              }
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Send Verification Code";
              }
              return;
            }

            // Move to Step 2
            step1.hidden = true;
            step2.hidden = false;
            resetIdentifierInput.value = ident;
            if (codeSentAlert) {
              codeSentAlert.textContent = data.maskedEmail
                ? `A 6-digit verification code has been sent to ${data.maskedEmail}. Enter the code below to reset your password. (Valid for 5 minutes).`
                : "A 6-digit verification code has been dispatched. Enter the code below to reset your password. (Valid for 5 minutes).";
            }
            startCooldownTimer(data.cooldownSeconds || 60);
          } catch (_) {
            if (requestAlert) requestAlert.textContent = "Network error: Unable to reach authentication server.";
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Send Verification Code";
            }
          }
        });
      }

      // Back to Step 1
      if (backBtn) {
        backBtn.addEventListener("click", () => {
          step2.hidden = true;
          step1.hidden = false;
          if (cooldownTimerInterval) clearInterval(cooldownTimerInterval);
        });
      }

      // Resend OTP in Step 2
      if (resendBtn) {
        resendBtn.addEventListener("click", async () => {
          const ident = resetIdentifierInput.value || identifierInput.value;
          resendBtn.disabled = true;
          try {
            const res = await fetch("/api/auth/forgot-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ identifier: ident })
            });
            const data = await res.json().catch(() => ({}));
            if (data.cooldown) {
              startCooldownTimer(data.remainingSeconds || 60);
              showToast(data.message, "warning");
            } else if (res.ok && data.ok) {
              startCooldownTimer(60);
              showToast("New verification code dispatched!", "success");
            } else {
              showToast(data.message || "Unable to resend code.", "error");
              resendBtn.disabled = false;
            }
          } catch (_) {
            showToast("Network error resending code.", "error");
            resendBtn.disabled = false;
          }
        });
      }

      // Step 2: Submit Reset Password
      if (resetForm) {
        resetForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          clearFormErrors(resetForm);
          if (resetAlert) resetAlert.textContent = "";

          const fd = new FormData(resetForm);
          const ident = String(resetIdentifierInput.value || "").trim();
          const otp = String(fd.get("otp") || "").trim();
          const newPassword = String(fd.get("newPassword") || "");
          const confirmPassword = String(fd.get("confirmPassword") || "");

          let hasError = false;
          if (!otp || !/^\d{6}$/.test(otp)) {
            setFieldError(resetForm, "otp", "Please enter the 6-digit verification code.");
            hasError = true;
          }
          if (!newPassword || newPassword.length < 6) {
            setFieldError(resetForm, "newPassword", "Password must be at least 6 characters.");
            hasError = true;
          }
          if (newPassword !== confirmPassword) {
            setFieldError(resetForm, "confirmPassword", "Passwords do not match.");
            hasError = true;
          }

          if (hasError) return;

          const submitBtn = bodyEl.querySelector("#fpSubmitResetBtn");
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Resetting Password...";
          }

          try {
            const res = await fetch("/api/auth/reset-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                identifier: ident,
                otp,
                newPassword,
                confirmPassword
              })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              const errMsg = data.message || "Password reset failed.";
              if (errMsg.toLowerCase().includes("code") || errMsg.toLowerCase().includes("otp")) {
                setFieldError(resetForm, "otp", errMsg);
              } else if (errMsg.toLowerCase().includes("match")) {
                setFieldError(resetForm, "confirmPassword", errMsg);
              } else {
                if (resetAlert) resetAlert.textContent = errMsg;
              }
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Reset Password";
              }
              return;
            }

            // Success
            if (codeSentAlert) {
              codeSentAlert.className = "alert alert-success";
              codeSentAlert.style.background = "#f0fdf4";
              codeSentAlert.style.borderColor = "#bbf7d0";
              codeSentAlert.style.color = "#15803d";
              codeSentAlert.textContent = "Password successfully reset! You can now sign in with your new password.";
            }
            showToast("Password reset successfully!", "success");

            // Prefill login input if on login page
            const loginInput = document.getElementById("loginIdentifier");
            if (loginInput) loginInput.value = ident;

            setTimeout(() => {
              closeModal();
              const loginPw = document.getElementById("loginPassword");
              if (loginPw) loginPw.focus();
            }, 1800);
          } catch (_) {
            if (resetAlert) resetAlert.textContent = "Network error: Unable to complete password reset.";
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Reset Password";
            }
          }
        });
      }
    });
  }

  function init() {
    // Show / Hide Password Button (Does not submit form)
    const togglePwBtn = document.getElementById("togglePasswordBtn");
    const pwInput = document.getElementById("loginPassword");
    if (togglePwBtn && pwInput) {
      togglePwBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const isHidden = pwInput.type === "password";
        pwInput.type = isHidden ? "text" : "password";
        togglePwBtn.textContent = isHidden ? "Hide" : "Show";
        togglePwBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
        togglePwBtn.setAttribute("title", isHidden ? "Hide password" : "Show password");
      });
    }

    // Apply to BANTUG UNIVERSITY Button (Opens Public Admission Page without logging in)
    const applyBtn = document.getElementById("applyToUniversityBtn");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        if (window.StudentHubApp && typeof window.StudentHubApp.showAdmissionPage === "function") {
          window.StudentHubApp.showAdmissionPage();
        } else {
          window.location.hash = "#admission";
        }
      });
    }

    // Forgot Password Button
    const forgotBtn = document.getElementById("forgotPasswordBtn");
    if (forgotBtn) {
      forgotBtn.addEventListener("click", openForgotPasswordModal);
    }

    // Login Form Submit (Role-Based Authentication via MySQL Backend)
    const loginForm = document.getElementById("portalLoginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormErrors(loginForm);
        const genErr = document.getElementById("loginGeneralError");
        if (genErr) genErr.textContent = "";

        const fd = new FormData(loginForm);
        const identifier = String(fd.get("identifier") || "").trim();
        const password = String(fd.get("password") || "").trim();
        const remember = document.getElementById("loginRememberMe")?.checked !== false;

        let valid = true;
        if (!identifier) {
          setFieldError(loginForm, "identifier", "Please enter your email or account ID.");
          valid = false;
        }
        if (!password) {
          setFieldError(loginForm, "password", "Please enter your password.");
          valid = false;
        }
        if (!valid) return;

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Signing in...";
        }

        try {
          // Authenticate against Node.js + MySQL `users` table (`POST /api/auth/login`)
          let authRes = null;
          if (typeof StudentHubStorage.loginWithDatabase === "function") {
            authRes = await StudentHubStorage.loginWithDatabase({
              identifier,
              password
            });
          }

          if (authRes && authRes.ok && authRes.data && authRes.data.session) {
            const session = authRes.data.session;
            const matchedRole = session.role;
            const displayName = session.displayName || session.actorName || session.username;
            const actorId = session.actorId || identifier;
            const sessionToken = session.sessionToken || session.token || null;

            if (matchedRole === "faculty") {
              StudentHubStorage.setActiveFacultyByIdentifier(identifier);
            } else if (
              matchedRole === "student" &&
              typeof StudentHubStorage.setActiveStudentByIdentifier === "function"
            ) {
              StudentHubStorage.setActiveStudentByIdentifier(identifier);
            }

            const isApplicantDemo = matchedRole === "applicant";

            StudentHubStorage.saveSession(
              {
                role: matchedRole,
                identifier,
                displayName,
                actorId,
                sessionToken,
                isDemo: Boolean(session.isDemo),
                isApplicantDemoAccount: isApplicantDemo,
                mustChangePassword: Boolean(session.mustChangePassword)
              },
              remember
            );

            const targetDestination =
              matchedRole === "admin"
                ? "admin-dashboard"
                : matchedRole === "applicant"
                  ? "applicant-landing"
                  : null;

            enterPortal(targetDestination);
            if (typeof StudentHubStorage.loadFromXamppDatabase === "function") {
              StudentHubStorage.loadFromXamppDatabase();
            }

            if (matchedRole === "applicant") {
              showToast(`Welcome to BANTUG UNIVERSITY Admission Portal, ${displayName}!`, "success");
            } else {
              showToast(`Welcome back, ${displayName}!`, "success");
            }
          } else if (authRes && authRes.status === 403) {
            const msg = (authRes.data && authRes.data.message) || authRes.error || "Your account is currently inactive. Please contact the university.";
            if (genErr) genErr.textContent = msg;
            showToast(msg, "error");
          } else if (authRes && authRes.status === 401) {
            const msg = (authRes.data && authRes.data.message) || authRes.error || "Invalid email/ID or password.";
            if (genErr) genErr.textContent = msg;
            showToast(msg, "error");
          } else if (authRes && authRes.status === 400) {
            const msg = (authRes.data && authRes.data.message) || authRes.error || "Please check your inputs and try again.";
            if (authRes.fieldErrors) {
              if (authRes.fieldErrors.identifier) setFieldError(loginForm, "identifier", authRes.fieldErrors.identifier);
              if (authRes.fieldErrors.password) setFieldError(loginForm, "password", authRes.fieldErrors.password);
            }
            if (genErr) genErr.textContent = msg;
          } else {
            const msg = "Unable to connect to the server. Please try again later.";
            if (genErr) genErr.textContent = msg;
            showToast(msg, "error");
          }
        } catch (_) {
          const msg = "Unable to connect to the server. Please try again later.";
          if (genErr) genErr.textContent = msg;
          showToast(msg, "error");
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign In to BANTUG UNIVERSITY";
          }
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  return {};
})();

window.StudentHubAuth = StudentHubAuth;
