/**
 * Client DOM Simulation & Functional Verification for Phase 3
 */

const fs = require("fs");
const path = require("path");

// Simple lightweight mock DOM for Node.js
class MockElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.id = "";
    this.className = "";
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach((c) => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach((c) => this.classList._classes.delete(c)),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList.contains(c)) this.classList.remove(c);
          else this.classList.add(c);
        } else if (force) {
          this.classList.add(c);
        } else {
          this.classList.remove(c);
        }
      }
    };
    this.attributes = {};
    this.children = [];
    this.style = {};
    this.hidden = false;
    this.textContent = "";
    this._innerHTML = "";
    this.eventListeners = {};
    this.value = "";
    this.name = "";
  }

  getAttribute(attr) {
    return this.attributes[attr] || null;
  }

  setAttribute(attr, val) {
    this.attributes[attr] = String(val);
    if (attr === "id") this.id = String(val);
    if (attr === "name") this.name = String(val);
  }

  hasAttribute(attr) {
    return attr in this.attributes;
  }

  removeAttribute(attr) {
    delete this.attributes[attr];
  }

  addEventListener(evt, fn) {
    if (!this.eventListeners[evt]) this.eventListeners[evt] = [];
    this.eventListeners[evt].push(fn);
  }

  trigger(evt, eventObj = {}) {
    if (this.eventListeners[evt]) {
      this.eventListeners[evt].forEach((fn) => fn(eventObj));
    }
  }

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }

  querySelectorAll(sel) {
    const results = [];
    const search = (node) => {
      for (const child of node.children) {
        if (matches(child, sel)) results.push(child);
        search(child);
      }
    };
    search(this);
    return results;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = parseHtmlToMock(html);
  }
}

function matches(el, sel) {
  if (sel.startsWith("#")) {
    return el.id === sel.slice(1);
  }
  if (sel.startsWith(".")) {
    const cls = sel.slice(1);
    return el.classList && el.classList.contains(cls);
  }
  if (sel.startsWith("[") && sel.endsWith("]")) {
    const attrSel = sel.slice(1, -1);
    if (attrSel.includes("=")) {
      const [k, v] = attrSel.split("=");
      const cleanV = v.replace(/^["']|["']$/g, "");
      return el.getAttribute(k) === cleanV;
    }
    return el.hasAttribute(attrSel);
  }
  return el.tagName.toLowerCase() === sel.toLowerCase();
}

function parseHtmlToMock(html) {
  const elements = [];
  const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9\-]+)([^>]*)\/?>/g;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1] || match[4];
    const attrStr = match[2] || match[5] || "";
    const inner = match[3] || "";

    const el = new MockElement(tagName);
    const attrRegex = /([a-zA-Z0-9\-]+)(?:=["']([^"']*)["'])?/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
      if (attrMatch[1]) {
        el.setAttribute(attrMatch[1], attrMatch[2] !== undefined ? attrMatch[2] : "");
        if (attrMatch[1] === "class") {
          attrMatch[2].split(/\s+/).forEach((c) => el.classList.add(c));
        }
        if (attrMatch[1] === "id") el.id = attrMatch[2];
        if (attrMatch[1] === "name") el.name = attrMatch[2];
        if (attrMatch[1] === "value") el.value = attrMatch[2];
      }
    }
    if (inner) {
      el._innerHTML = inner;
      el.children = parseHtmlToMock(inner);
    }
    elements.push(el);
  }
  return elements;
}

// Global window & document mock
const mockDoc = new MockElement("document");
mockDoc.getElementById = function (id) {
  return this.querySelector(`#${id}`);
};

global.window = {
  StudentHubApp: {
    escapeHtml: (s) => (s ? String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""),
    formatReadableDate: (d) => String(d),
    isValidEmail: (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
    clearFormErrors: () => {},
    setFieldError: () => {},
    openModal: () => {},
    closeModal: () => {},
    showToast: () => {},
    navigateTo: () => {},
    refreshAll: () => {}
  },
  location: { hash: "" }
};
global.document = mockDoc;
global.navigator = { clipboard: null };
global.sessionStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};

// Mock StudentHubStorage
global.StudentHubStorage = {
  getState: () => ({
    applications: [],
    profile: { academicTerm: "2nd Sem, AY 2026–2027", section: "BSIT 2-2", fullName: "Racel Valiente" },
    facultyProfile: { fullName: "Prof. Cruz", department: "IT", facultyId: "FAC-01" },
    settings: { theme: "light" }
  }),
  getSession: () => ({ role: "applicant", identifier: "test@email.example", displayName: "Test Applicant" }),
  getLogoSrc: () => "assets/images/bantug-university-logo.png",
  formatLocalDate: (d) => "2026-11-13",
  uid: (p) => `${p}_${Date.now()}`
};

// Load applicant.js
require(path.join(__dirname, '../../js/applicant.js'));

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("  [PASS] " + msg);
    passed++;
  } else {
    console.error("  [FAIL] " + msg);
    failed++;
  }
}

console.log("=== CLIENT DOM & INTERACTION SIMULATION ===");

// Create containers
const landingContainer = new MockElement("div");
landingContainer.id = "applicantLandingContainer";
mockDoc.children.push(landingContainer);

const formContainer = new MockElement("div");
formContainer.id = "applicantFormContainer";
mockDoc.children.push(formContainer);

// 1. Test empty state of renderLanding
console.log("\n--- Subtest: Admission Overview Empty State ---");
sessionStorage.clear();
window.StudentHubApplicant.renderLanding();
const landingHtml = landingContainer.innerHTML;

assert(landingHtml.includes("Admission Overview"), "Page displays title 'Admission Overview'");
assert(landingHtml.includes("No Application Submitted Yet"), "Displays 'No Application Submitted Yet' empty state");
assert(landingHtml.includes("Complete Application Form"), "Displays 'Complete Application Form' button in empty state");
assert(!landingHtml.includes("Prospective Application"), "No 'Prospective Application' heading");
assert(!landingHtml.includes("2nd Semester"), "No '2nd Semester' academic term displayed");
assert(!landingHtml.includes("AY 2026–2027"), "No 'AY 2026–2027' academic term displayed");
assert(!landingHtml.includes("New Student Application"), "No duplicate 'New Student Application' card");
assert(!landingHtml.includes("sim-demo-status-btn"), "No simulated demo status switcher buttons");

// 2. Test form blank defaults
console.log("\n--- Subtest: Application Form Blank Defaults ---");
window.StudentHubApplicant.renderForm();
const formHtml = formContainer.innerHTML;

assert(!formHtml.includes('value="09/12/2007"'), "Date of birth starts empty (no 09/12/2007 default)");
assert(!formHtml.includes('value="2026"'), "Graduation year starts empty (no 2026 default)");
assert(formHtml.includes('placeholder="MM/DD/YYYY"'), "Date of birth has MM/DD/YYYY placeholder");
assert(formHtml.includes('placeholder="YYYY (e.g. 2026)"'), "Graduation year has YYYY placeholder");
assert(formHtml.includes('-- Select Desired Academic Program'), "Program dropdown starts with disabled select placeholder");
assert(formHtml.includes('-- Select Applicant Classification'), "Classification starts with disabled select placeholder");
assert(!formHtml.includes("fillSampleApplicantFormBtn"), "Auto-fill sample button removed");

// 3. Test Admission Overview with Submitted Application
console.log("\n--- Subtest: Admission Overview with Submitted Application ---");
const sampleApp = {
  referenceNumber: "BU-2026-000038",
  fullName: "Villanueva, Andrea Rose",
  desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
  secondChoiceProgram: "Bachelor of Science in Computer Science (BSCS)",
  dateOfBirth: "2007-05-14",
  email: "andrea.villanueva@email.example",
  contactNumber: "+63 917 555 0244",
  address: "124 Magsaysay St., Poblacion, Bantug City",
  applicantType: "Senior High School Graduate / Freshman",
  yearLevel: "Year 1",
  previousSchool: "Bantug Science High School",
  graduationYear: "2026",
  submittedDate: "2026-11-13",
  status: "Pending"
};
sessionStorage.setItem("bu_last_submitted_app", JSON.stringify(sampleApp));

window.StudentHubApplicant.renderLanding();
const submittedLandingHtml = landingContainer.innerHTML;

assert(submittedLandingHtml.includes("Villanueva, Andrea Rose"), "Displays actual applicant's name: Villanueva, Andrea Rose");
assert(submittedLandingHtml.includes("BU-2026-000038"), "Displays actual reference number: BU-2026-000038");
assert(submittedLandingHtml.includes("Status: Pending"), "Displays current status badge 'Status: Pending'");
assert(submittedLandingHtml.includes("Current Application Status &mdash; Pending"), "Displays clear explanation of Pending status");
assert(submittedLandingHtml.includes("Bachelor of Science in Information Technology (BSIT)"), "Displays selected 1st choice program");
assert(submittedLandingHtml.includes("Bachelor of Science in Computer Science (BSCS)"), "Displays alternative 2nd choice program");
assert(submittedLandingHtml.includes("Bantug Science High School"), "Displays previous school attended");
assert(!submittedLandingHtml.includes("Graduation Year") && !submittedLandingHtml.includes("Year Graduated"), "Omitted 'Year Graduated / Completed' from dashboard display");
assert(!submittedLandingHtml.includes("Prospective Application"), "No 'Prospective Application' heading");
assert(!submittedLandingHtml.includes("2nd Semester"), "No enrolled academic term '2nd Semester'");
assert(!submittedLandingHtml.includes("AY 2026–2027"), "No enrolled academic term 'AY 2026–2027'");
assert(!submittedLandingHtml.includes("New Student Application"), "No duplicate 'New Student Application' card");

console.log(`\n====================================================`);
console.log(`CLIENT SIMULATION: ${passed} PASSED, ${failed} FAILED`);
console.log(`====================================================`);

if (failed > 0) process.exit(1);

