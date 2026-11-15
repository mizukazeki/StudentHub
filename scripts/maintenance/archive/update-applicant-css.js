// Archived utility script for applicant CSS generation.
const fs = require('fs');

let content = fs.readFileSync('css/pages/applicant.css', 'utf8');

const marker = 'Public Admission Application Page (Independent Public Flow)';
let idx = content.indexOf(marker);
if (idx === -1) {
  console.error('Marker not found!');
  process.exit(1);
}

// Find start of comment block containing marker
const commentStart = content.lastIndexOf('/*', idx);
const preserved = content.slice(0, commentStart);

const newStyles = `/* ==========================================================================
   Public Admission Application Page (Independent Public Flow)
   BANTUG UNIVERSITY Official Color System & High-Contrast Design
   - Primary navy: #172B55
   - Secondary blue: #234B8C
   - Accent blue: #3478D4
   - Main background: #F5F7FB
   - Card background: #FFFFFF
   - Main text: #202B3C
   - Secondary text: #64748B
   - Input border: #CBD5E1
   - Input background: #FFFFFF
   - Success: #15803D
   - Error: #DC2626
   ========================================================================== */

.public-admission-screen {
  min-height: 100vh;
  background-color: #F5F7FB !important;
  color: #202B3C !important;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
}

.public-admission-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #F5F7FB !important;
}

/* 1. Header Bar */
.public-admission-header {
  background: #172B55 !important;
  border-bottom: 2px solid #234B8C !important;
  color: #FFFFFF !important;
  padding: 16px 24px !important;
  box-shadow: 0 4px 12px rgba(23, 43, 85, 0.15) !important;
}

.public-admission-header-inner {
  max-width: 1040px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.public-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
}

.public-logo-box {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.public-logo-img {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.public-brand-title {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 1.18rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #FFFFFF !important;
}

.public-brand-subtitle {
  display: block;
  font-size: 0.78rem;
  color: #CBD5E1 !important;
  font-weight: 400;
}

.btn-portal-login {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  background: #234B8C !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: #FFFFFF !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-portal-login:hover {
  background: #3478D4 !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: #FFFFFF !important;
  transform: translateY(-1px);
}

/* 2. Hero Section */
.public-hero-section {
  background: linear-gradient(135deg, #172B55 0%, #234B8C 100%) !important;
  color: #FFFFFF !important;
  padding: 48px 24px 40px !important;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.public-hero-inner {
  max-width: 820px;
  margin: 0 auto;
}

.public-hero-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.35) !important;
  color: #FFFFFF !important;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 6px 16px;
  border-radius: 9999px;
  text-transform: uppercase;
}

.public-hero-title {
  font-family: 'Poppins', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #FFFFFF !important;
  margin: 16px 0 12px !important;
  line-height: 1.3;
}

.public-hero-desc {
  font-size: 1rem;
  color: #E2E8F0 !important;
  line-height: 1.65;
  margin: 0 auto;
  max-width: 740px;
}

/* 3. Main Container & Intentional Spacing (No Awkward Negative Margin Overlap) */
.public-main-container {
  max-width: 960px;
  margin: 32px auto 48px !important;
  padding: 0 20px;
  width: 100%;
  flex: 1;
}

/* 4. Application Instructions Card */
.public-instructions-card,
.public-admission-screen .notice-banner {
  display: flex !important;
  align-items: flex-start !important;
  gap: 16px !important;
  background: #FFFFFF !important;
  border: 1px solid #CBD5E1 !important;
  border-left: 5px solid #234B8C !important;
  border-radius: 10px !important;
  padding: 18px 22px !important;
  margin-bottom: 24px !important;
  box-shadow: 0 2px 8px rgba(23, 43, 85, 0.05) !important;
  color: #202B3C !important;
}

.instructions-icon-col {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #234B8C;
  flex-shrink: 0;
  margin-top: 2px;
}

.instructions-content {
  flex: 1;
}

.instructions-title,
.public-instructions-card strong,
.public-admission-screen .notice-banner strong {
  display: inline !important;
  font-size: 0.94rem !important;
  font-weight: 700 !important;
  color: #172B55 !important;
  margin-right: 4px;
}

.instructions-text,
.public-instructions-card p,
.public-admission-screen .notice-banner div {
  font-size: 0.9rem !important;
  color: #202B3C !important;
  line-height: 1.6 !important;
  margin: 0 !important;
}

.instructions-text .req,
.public-admission-screen .notice-banner .req {
  color: #DC2626 !important;
  font-weight: 700 !important;
}

/* 5. Main Application Form Card */
.public-form-card,
.public-admission-screen .card.public-form-card {
  background: #FFFFFF !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 14px !important;
  box-shadow: 0 8px 24px rgba(23, 43, 85, 0.06), 0 2px 6px rgba(23, 43, 85, 0.04) !important;
  padding: 34px !important;
  color: #202B3C !important;
}

.public-card-header,
.public-admission-screen .public-form-card .card-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 16px !important;
  padding-bottom: 20px !important;
  border-bottom: 1px solid #CBD5E1 !important;
  margin-bottom: 24px !important;
  flex-wrap: wrap !important;
}

.public-card-title,
.public-admission-screen .public-form-card .card-title {
  font-family: 'Poppins', sans-serif !important;
  font-size: 1.4rem !important;
  font-weight: 700 !important;
  color: #172B55 !important;
  margin: 0 !important;
}

.public-card-subtitle {
  font-size: 0.85rem !important;
  color: #64748B !important;
  margin-top: 3px !important;
}

.public-badge-undergrad,
.public-admission-screen .card-header .badge-primary {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  background: #EFF6FF !important;
  border: 1px solid #BFDBFE !important;
  color: #234B8C !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
  padding: 6px 14px !important;
  border-radius: 9999px !important;
  white-space: nowrap !important;
}

/* 6. Section Dividers & Headings */
.public-admission-screen .form-section-divider {
  border-bottom: 1px solid #E2E8F0 !important;
  padding-bottom: 10px !important;
  margin-top: 26px !important;
  margin-bottom: 18px !important;
}

.public-admission-screen .form-section-divider:first-of-type {
  margin-top: 0 !important;
}

.public-admission-screen .form-section-divider h3 {
  font-family: 'Poppins', sans-serif !important;
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  color: #172B55 !important;
  margin: 0 0 4px !important;
}

.public-admission-screen .form-section-divider p {
  font-size: 0.86rem !important;
  color: #64748B !important;
  margin: 0 !important;
}

/* 7. Form Labels & Required Stars */
.public-admission-screen .form-label {
  display: block !important;
  font-size: 0.88rem !important;
  font-weight: 600 !important;
  color: #202B3C !important;
  margin-bottom: 6px !important;
}

.public-admission-screen .form-label .req,
.public-admission-screen .req {
  color: #DC2626 !important;
  font-weight: 700 !important;
  margin-left: 2px !important;
}

/* 8. Input Fields, Select Dropdowns, Textareas */
.public-admission-screen .form-control,
.public-admission-screen input[type="text"].form-control,
.public-admission-screen input[type="email"].form-control,
.public-admission-screen input[type="tel"].form-control,
.public-admission-screen input[type="date"].form-control,
.public-admission-screen select.form-control,
.public-admission-screen textarea.form-control {
  width: 100% !important;
  height: 44px !important;
  background-color: #FFFFFF !important;
  color: #202B3C !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 8px !important;
  padding: 10px 14px !important;
  font-size: 0.92rem !important;
  font-family: inherit !important;
  line-height: 1.5 !important;
  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}

.public-admission-screen textarea.form-control {
  height: auto !important;
  min-height: 80px !important;
}

/* Select dropdown chevron */
.public-admission-screen select.form-control {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 14px center !important;
  background-size: 16px 16px !important;
  padding-right: 40px !important;
  cursor: pointer !important;
}

/* Input Focus State */
.public-admission-screen .form-control:focus,
.public-admission-screen select.form-control:focus,
.public-admission-screen textarea.form-control:focus {
  outline: none !important;
  border-color: #3478D4 !important;
  background-color: #FFFFFF !important;
  color: #202B3C !important;
  box-shadow: 0 0 0 3px rgba(52, 120, 212, 0.2) !important;
}

/* Input Placeholder */
.public-admission-screen .form-control::placeholder {
  color: #94A3B8 !important;
  opacity: 1 !important;
}

/* Readonly Inputs */
.public-admission-screen .form-control[readonly] {
  background-color: #F8FAFC !important;
  color: #475569 !important;
  border-color: #CBD5E1 !important;
  cursor: not-allowed !important;
}

/* Invalid State */
.public-admission-screen .form-control.is-invalid {
  border-color: #DC2626 !important;
  background-color: #FEF2F2 !important;
}

.public-admission-screen .form-control.is-invalid:focus {
  border-color: #DC2626 !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2) !important;
}

/* 9. Input Prefix Group for Philippine Mobile (+63) */
.public-admission-screen .input-prefix-group {
  display: flex !important;
  align-items: stretch !important;
  width: 100% !important;
}

.public-admission-screen .input-fixed-prefix {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 14px !important;
  background: #F1F5F9 !important;
  border: 1px solid #CBD5E1 !important;
  border-right: none !important;
  border-top-left-radius: 8px !important;
  border-bottom-left-radius: 8px !important;
  font-size: 0.92rem !important;
  font-weight: 700 !important;
  color: #172B55 !important;
  user-select: none !important;
  white-space: nowrap !important;
  height: 44px !important;
}

.public-admission-screen .input-prefix-group .form-control {
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  flex: 1 !important;
}

/* 10. Form Hints & Field Errors */
.public-admission-screen .form-hint {
  font-size: 0.78rem !important;
  color: #64748B !important;
  margin-top: 5px !important;
  display: block !important;
}

.public-admission-screen .field-error {
  font-size: 0.8rem !important;
  color: #DC2626 !important;
  margin-top: 4px !important;
  font-weight: 500 !important;
  display: block !important;
  min-height: 18px !important;
}

/* 11. Buttons & Form Actions */
.public-admission-screen .modal-actions {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 14px !important;
  margin-top: 32px !important;
  padding-top: 24px !important;
  border-top: 1px solid #CBD5E1 !important;
}

#pubResetBtn {
  background: #F1F5F9 !important;
  border: 1px solid #CBD5E1 !important;
  color: #202B3C !important;
  font-size: 0.9rem !important;
  font-weight: 600 !important;
  padding: 10px 22px !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

#pubResetBtn:hover {
  background: #E2E8F0 !important;
  color: #172B55 !important;
}

#pubSubmitBtn {
  background: #172B55 !important;
  border: 1px solid #172B55 !important;
  color: #FFFFFF !important;
  font-size: 0.95rem !important;
  font-weight: 600 !important;
  padding: 12px 28px !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  box-shadow: 0 4px 14px rgba(23, 43, 85, 0.25) !important;
  transition: all 0.2s ease !important;
}

#pubSubmitBtn:hover {
  background: #234B8C !important;
  border-color: #234B8C !important;
  box-shadow: 0 6px 18px rgba(35, 75, 140, 0.3) !important;
  transform: translateY(-1px) !important;
}

/* 12. Confirmation Receipt View */
.public-admission-screen .confirmation-ref-box {
  background: #F8FAFC !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 12px !important;
  padding: 26px !important;
  margin: 0 auto 24px !important;
  max-width: 640px !important;
  text-align: center !important;
  box-shadow: 0 2px 8px rgba(23, 43, 85, 0.04) !important;
}

.public-admission-screen .ref-box-eyebrow {
  font-size: 0.8rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: #234B8C !important;
  margin-bottom: 6px !important;
}

.public-admission-screen .ref-box-number {
  font-family: 'Consolas', monospace !important;
  font-size: 2.2rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.04em !important;
  color: #172B55 !important;
  margin: 8px 0 14px !important;
  user-select: all !important;
}

.public-admission-screen .copy-ref-btn {
  background: #172B55 !important;
  color: #FFFFFF !important;
  border: 1px solid #172B55 !important;
  border-radius: 8px !important;
  padding: 8px 18px !important;
  font-weight: 600 !important;
  font-size: 0.85rem !important;
}

.public-admission-screen .copy-ref-btn:hover {
  background: #234B8C !important;
}

/* 13. Footer */
.public-admission-footer {
  background: #FFFFFF !important;
  border-top: 1px solid #CBD5E1 !important;
  padding: 28px 20px !important;
  text-align: center;
  font-size: 0.86rem;
  color: #64748B !important;
  margin-top: auto;
}

.public-footer-inner {
  max-width: 800px;
  margin: 0 auto;
}

.public-footer-sub {
  font-size: 0.8rem;
  color: #94A3B8 !important;
  margin-top: 5px;
}

/* 14. Responsive Layout Rules */
@media (max-width: 768px) {
  .public-admission-header-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .public-header-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  .public-hero-section {
    padding: 34px 18px 28px !important;
  }

  .public-hero-title {
    font-size: 1.55rem !important;
  }

  .public-hero-desc {
    font-size: 0.92rem !important;
  }

  .public-main-container {
    margin: 20px auto 36px !important;
    padding: 0 14px;
  }

  .public-instructions-card,
  .public-admission-screen .notice-banner {
    flex-direction: column;
    gap: 10px;
    padding: 16px !important;
  }

  .public-form-card,
  .public-admission-screen .card.public-form-card {
    padding: 22px 16px !important;
  }

  .form-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }

  .name-grid-3 {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  .public-admission-screen .modal-actions {
    flex-direction: column-reverse;
    gap: 12px;
  }

  #pubResetBtn,
  #pubSubmitBtn {
    width: 100% !important;
    text-align: center;
    justify-content: center;
  }
}
`;

fs.writeFileSync('css/pages/applicant.css', preserved + newStyles, 'utf8');
console.log('Successfully updated css/pages/applicant.css!');

