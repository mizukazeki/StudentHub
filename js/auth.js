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
        ? isApplicantDemo
          ? "applicant-status"
          : "applicant-landing"
        : null);

    enterPortal(defaultSection);
    if (typeof StudentHubStorage.loadFromXamppDatabase === "function") {
      StudentHubStorage.loadFromXamppDatabase();
    }

    if (account.role === "applicant" && !isApplicantDemo) {
      showToast("Opened BANTUG UNIVERSITY Online Application Portal.", "info");
    } else if (account.role === "applicant" && isApplicantDemo) {
      showToast("Logged into BANTUG UNIVERSITY Applicant Demo Account!", "success");
    } else {
      showToast(`Entered BANTUG UNIVERSITY ${account.displayName} Portal.`, "success");
    }
  }

  /**
   * Open "Explore Demo Portal" Role Launcher Modal
   */
  function openDemoRoleLauncher() {
    const html = `
      <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px;">
        Choose which <strong>BANTUG UNIVERSITY</strong> portal interface or demonstration account you want to explore. All portals connect to the Node.js &amp; MySQL database (<code>bantug_university_db</code>) with role-based access control.
      </p>

      <div class="role-launcher-grid">
        <button type="button" class="role-launcher-card" data-launch-role="student">
          <div>
            <span class="badge badge-primary" style="margin-bottom:4px;">1. Student Portal (Year 2)</span>
            <h3 style="font-size:1.05rem;">Racel Valiente (BSIT 2-2 Student)</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:3px;">
              View the 9 BSIT 2-2 subjects, Monday–Friday timetable, read-only grades &amp; GWA, attendance records, task submissions, and announcements.
            </p>
          </div>
          <span class="btn btn-sm btn-primary">Enter Student &rarr;</span>
        </button>

        <button type="button" class="role-launcher-card" data-launch-role="faculty">
          <div>
            <span class="badge badge-info" style="margin-bottom:4px;">2. Faculty Account 1 (IT 211)</span>
            <h3 style="font-size:1.05rem;">Prof. Fabian Somera Schedule</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:3px;">
              Displays <strong>only</strong> Instructor Fabian Somera's assigned subjects and class schedule, plus student application management, announcements, grades, and attendance.
            </p>
          </div>
          <span class="btn btn-sm btn-primary">Enter Faculty 1 &rarr;</span>
        </button>

        <button type="button" class="role-launcher-card" data-launch-role="faculty2">
          <div>
            <span class="badge badge-info" style="margin-bottom:4px;">3. Faculty Account 2 (IT ELEC 2)</span>
            <h3 style="font-size:1.05rem;">Prof. Francis Van Salvador Schedule</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:3px;">
              Displays <strong>only</strong> Instructor Francis Van Salvador's assigned subjects and non-overlapping class schedule.
            </p>
          </div>
          <span class="btn btn-sm btn-primary">Enter Faculty 2 &rarr;</span>
        </button>

        <button type="button" class="role-launcher-card" data-launch-role="applicant">
          <div>
            <span class="badge badge-warning" style="margin-bottom:4px;">4. Applicant Demo Account</span>
            <h3 style="font-size:1.05rem;">Ceasar Villanueva (Applicant Demo Account)</h3>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:3px;">
              Dedicated demo account displaying sample applicant profile and sample application statuses (<strong>Pending</strong>, <strong>Under Review</strong>, <strong>Approved</strong>, <strong>Rejected</strong>).
            </p>
          </div>
          <span class="btn btn-sm btn-primary">Enter Applicant Demo &rarr;</span>
        </button>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="closeDemoLauncherBtn">Cancel</button>
      </div>
    `;

    openModal("Explore BANTUG UNIVERSITY Demo Portal", html, (bodyEl) => {
      bodyEl.querySelector("#closeDemoLauncherBtn").addEventListener("click", closeModal);
      bodyEl.querySelectorAll("[data-launch-role]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const roleKey = btn.getAttribute("data-launch-role");
          if (roleKey === "applicant") {
            launchDemoSession("applicant", "applicant-status", { isApplicantDemoAccount: true });
          } else {
            launchDemoSession(roleKey);
          }
        });
      });
    });
  }

  /**
   * Open Forgot Password Demonstration Modal
   */
  function openForgotPasswordModal() {
    const html = `
      <div class="notice-banner" style="margin-bottom:16px;">
        <div>
          <strong>BANTUG UNIVERSITY Demonstration Credentials Notice:</strong> All 45 preloaded Student, Faculty, and Applicant accounts are stored with SHA-256 password hashes in the MySQL <code>users</code> table (<code>bantug_university_db</code>). Use any of the demonstration accounts below or click <strong>Explore Demo Portal</strong>.
        </div>
      </div>

      <div style="font-size:0.86rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:10px;">
        <div style="padding:10px 12px;border:1px solid var(--border-color);border-radius:8px;">
          <strong>Student Demo Account (Racel Valiente &bull; BSIT 2-2 &bull; Year 2):</strong><br/>
          Username/Email: <code>student.demo@bantug.edu.example</code> or <code>2025-BSIT-0202</code><br/>
          Password: <code>demo123</code>
        </div>
        <div style="padding:10px 12px;border:1px solid var(--border-color);border-radius:8px;">
          <strong>Faculty Demo Accounts (15 Individual Professor Schedules):</strong><br/>
          &bull; Prof. Fabian Somera (BSIT 2-1 &amp; 3-2): <code>f.somera.demo@bantug.edu.example</code> or <code>FAC-BU-04</code><br/>
          &bull; Prof. Lee-mher Binay-an (IT 211 BSIT 2-2): <code>l.binayan.demo@bantug.edu.example</code> or <code>FAC-BU-10</code><br/>
          &bull; Prof. Wendell Castillo (IT ELEC 2 BSIT 2-2): <code>w.castillo.demo@bantug.edu.example</code> or <code>FAC-BU-11</code><br/>
          &bull; Prof. Francis Van Salvador (BSIT 2-1 &amp; 3-2): <code>f.salvador.demo@bantug.edu.example</code> or <code>FAC-BU-07</code><br/>
          &bull; Prof. Edward Panganiban (IT ELEC 1): <code>e.panganiban.demo@bantug.edu.example</code> or <code>FAC-BU-06</code><br/>
          &bull; Prof. Joseph Quevedo (IT BPO 1): <code>j.quevedo.demo@bantug.edu.example</code> or <code>FAC-BU-05</code><br/>
          &bull; Prof. Gorgonio Vallestero III (IT INST 2): <code>g.vallestero.demo@bantug.edu.example</code> or <code>FAC-BU-08</code><br/>
          &bull; Prof. Bush Duque (GEC 6): <code>b.duque.demo@bantug.edu.example</code> or <code>FAC-BU-02</code><br/>
          &bull; Prof. Samantha Dominique Itliong (GE ELEC IT 3): <code>s.itliong.demo@bantug.edu.example</code> or <code>FAC-BU-01</code><br/>
          &bull; Prof. Joan Albano (GEC 8): <code>j.albano.demo@bantug.edu.example</code> or <code>FAC-BU-03</code><br/>
          Password for all faculty demo accounts: <code>faculty123</code>
        </div>
        <div style="padding:10px 12px;border:1px solid var(--border-color);border-radius:8px;">
          <strong>Applicant Demo Account (Ceasar Villanueva &bull; Sample Application Statuses):</strong><br/>
          Username/Email: <code>applicant.demo@bantug.edu.example</code> or <code>BU-ADM-2026-10482</code><br/>
          Password: <code>apply123</code>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-primary" id="closeForgotModalBtn">Got It</button>
      </div>
    `;

    openModal("Demonstration Account Credentials", html, (bodyEl) => {
      bodyEl.querySelector("#closeForgotModalBtn").addEventListener("click", closeModal);
    });
  }

  function init() {
    // Role Tabs on Login Page
    document.querySelectorAll(".login-role-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const role = tab.getAttribute("data-login-role");
        selectLoginRoleTab(role);
      });
    });

    // Show / Hide Password Button
    const togglePwBtn = document.getElementById("togglePasswordBtn");
    const pwInput = document.getElementById("loginPassword");
    if (togglePwBtn && pwInput) {
      togglePwBtn.addEventListener("click", () => {
        const isHidden = pwInput.type === "password";
        pwInput.type = isHidden ? "text" : "password";
        togglePwBtn.textContent = isHidden ? "Hide" : "Show";
      });
    }

    // Auto-Fill Demo Credential Cards
    document.querySelectorAll("[data-fill-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        fillDemoCredentials(btn.getAttribute("data-fill-role"));
      });
    });

    // Explore Demo Portal Button
    const exploreBtn = document.getElementById("exploreDemoPortalBtn");
    if (exploreBtn) {
      exploreBtn.addEventListener("click", openDemoRoleLauncher);
    }

    // Apply to BANTUG UNIVERSITY Button (Opens normal application flow — NOT the Applicant Demo Account)
    const applyBtn = document.getElementById("applyToUniversityBtn");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        launchDemoSession("applicant", "applicant-landing", { isApplicantDemoAccount: false });
      });
    }

    // Forgot Password Button
    const forgotBtn = document.getElementById("forgotPasswordBtn");
    if (forgotBtn) {
      forgotBtn.addEventListener("click", openForgotPasswordModal);
    }

    // Login Form Submit
    const loginForm = document.getElementById("portalLoginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormErrors(loginForm);
        const genErr = document.getElementById("loginGeneralError");
        if (genErr) genErr.textContent = "";

        const fd = new FormData(loginForm);
        const selectedRole = String(fd.get("role") || "student").trim();
        const identifier = String(fd.get("identifier") || "").trim().toLowerCase();
        const password = String(fd.get("password") || "").trim();
        const remember = document.getElementById("loginRememberMe")?.checked !== false;

        let valid = true;
        if (!identifier) {
          setFieldError(loginForm, "identifier", "Please enter your email, username, or ID.");
          valid = false;
        }
        if (!password) {
          setFieldError(loginForm, "password", "Please enter your demonstration password.");
          valid = false;
        }
        if (!valid) return;

        let matchedRole = null;
        let sessionToken = null;
        let displayName = null;
        let actorId = identifier;
        let backendReached = false;

        // 1. Authenticate against Node.js + MySQL `users` table (`POST /api/auth/login`)
        if (typeof StudentHubStorage.loginWithDatabase === "function") {
          const authRes = await StudentHubStorage.loginWithDatabase({
            role: selectedRole,
            identifier,
            password
          });

          if (authRes && authRes.ok && authRes.data && authRes.data.session) {
            backendReached = true;
            matchedRole = authRes.data.session.role;
            sessionToken = authRes.data.session.sessionToken || null;
            displayName = authRes.data.session.displayName || null;
            actorId = authRes.data.session.actorId || identifier;
          } else if (authRes && authRes.status === 401) {
            backendReached = true;
            matchedRole = null;
          }
        }

        // 2. Fallback to local DEMO_ACCOUNTS only if backend server was unreachable
        if (!backendReached) {
          const targetAcc = DEMO_ACCOUNTS[selectedRole];
          if (
            targetAcc &&
            targetAcc.identifiers.includes(identifier) &&
            targetAcc.password === password
          ) {
            matchedRole = targetAcc.role;
            displayName = targetAcc.displayName;
          } else {
            Object.values(DEMO_ACCOUNTS).forEach((acc) => {
              if (acc.identifiers.includes(identifier) && acc.password === password) {
                matchedRole = acc.role;
                displayName = acc.displayName;
              }
            });
          }
        }

        if (!matchedRole) {
          if (genErr) {
            genErr.textContent =
              "Invalid credentials. Please verify your username/ID and password, or click one of the sample accounts below to auto-fill.";
          }
          showToast("Invalid credentials. Please use a registered account or Explore Demo Portal.", "error");
          return;
        }

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
            isDemo: true,
            isApplicantDemoAccount: isApplicantDemo
          },
          remember
        );

        enterPortal(isApplicantDemo ? "applicant-status" : null);
        if (typeof StudentHubStorage.loadFromXamppDatabase === "function") {
          StudentHubStorage.loadFromXamppDatabase();
        }

        if (isApplicantDemo) {
          showToast("Welcome to the BANTUG UNIVERSITY Applicant Demo Account!", "success");
        } else {
          showToast(`Welcome to BANTUG UNIVERSITY (${matchedRole.toUpperCase()} Portal)!`, "success");
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    openDemoRoleLauncher,
    launchDemoSession
  };
})();

window.StudentHubAuth = StudentHubAuth;
