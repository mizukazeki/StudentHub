/**
 * ============================================================================
 * BANTUG UNIVERSITY - HTML Partial & Module Bootstrapper (partials-loader.js)
 *
 * Loads reusable HTML partials into `[data-partial]` mount points cleanly
 * (`outerHTML` replacement to preserve the exact DOM hierarchy), then loads all
 * portal JavaScript modules in strict dependency order before triggering
 * initialization so existing JS files remain 100% unmodified and bug-free.
 * ============================================================================
 */

(function () {
  const MODULE_SCRIPTS = [
    "js/storage.js",
    "js/app.js",
    "js/auth.js",
    "js/dashboard.js",
    "js/profile.js",
    "js/subjects.js",
    "js/schedule.js",
    "js/grades.js",
    "js/attendance.js",
    "js/tasks.js",
    "js/announcements.js",
    "js/resources.js",
    "js/faculty.js",
    "js/applicant.js",
    "js/settings.js"
  ];

  async function injectAllPartials() {
    let placeholders = Array.from(document.querySelectorAll("[data-partial]"));
    while (placeholders.length > 0) {
      await Promise.all(
        placeholders.map(async (el) => {
          const partialUrl = el.getAttribute("data-partial");
          el.removeAttribute("data-partial");
          try {
            const res = await fetch(partialUrl, { cache: "no-cache" });
            if (!res.ok) {
              throw new Error(`HTTP ${res.status} loading ${partialUrl}`);
            }
            const html = await res.text();
            el.outerHTML = html;
          } catch (err) {
            console.error("[BANTUG UNIVERSITY Partials Loader]:", err);
            el.innerHTML = `<div style="padding:16px;color:#b91c1c;background:#fee2e2;border-radius:8px;margin:12px;">
              Failed to load UI partial <code>${partialUrl}</code>. Please ensure the portal is running via <code>npm start</code> at <code>http://localhost:3000</code>.
            </div>`;
          }
        })
      );
      placeholders = Array.from(document.querySelectorAll("[data-partial]"));
    }
  }

  function loadScriptSequential(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  }

  async function bootstrapPortal() {
    await injectAllPartials();

    for (const src of MODULE_SCRIPTS) {
      await loadScriptSequential(src);
    }

    // Dispatch DOMContentLoaded now that all partials and module scripts are ready.
    // All existing DOMContentLoaded listeners in storage.js, app.js, and auth.js
    // execute in their original registration order without modifying those files.
    document.dispatchEvent(
      new Event("DOMContentLoaded", {
        bubbles: true,
        cancelable: true
      })
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapPortal, { once: true });
  } else {
    bootstrapPortal();
  }
})();

