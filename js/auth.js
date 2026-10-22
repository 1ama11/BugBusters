/**
 * auth.js
 * ------------------------------------------------------------------
 * SIMULATED authentication + role-based UI permissions.
 *
 * ⚠️  PHASE 1 is fully static: there is no real login. The forms check
 *     what was typed, then open the dashboard as the demo Admin
 *     (see getCurrentUser() in storage.js). Nothing is stored.
 *     Real sign-in and sessions come with the Phase 2 backend.
 *     The permission checks below only control what the UI shows.
 *
 * Contents:
 *   1. Permissions        hasPermission(), canEditProject(), canUpdateBug()
 *   2. Validation         isValidEmail(), validateRegistration()
 *   3. Auth actions       logout(), requireAuth()
 *   4. Page controllers   initLoginPage(), initRegisterPage()
 * ------------------------------------------------------------------
 */

import { getCurrentUser, getUserByEmail, getSystemSettings } from './storage.js';
import { ROLES, ROLE_LIST, PUBLIC_ROLES } from './mock-data.js';
import {
  icon,
  showToast,
  showFormErrors,
  clearFieldError,
  setFieldError,
} from './ui.js';

/* =================================================================
 * 1. PERMISSIONS
 * One table decides who can do what. Change it here, not in pages.
 * ================================================================= */

const { ADMIN, PROJECT_MANAGER, TESTER, DEVELOPER } = ROLES;

export const PERMISSIONS = Object.freeze({
  'users.manage': [ADMIN],
  'settings.system': [ADMIN],
  'projects.create': [ADMIN, PROJECT_MANAGER],
  'projects.edit': [ADMIN, PROJECT_MANAGER], // PMs: only projects they manage (see canEditProject)
  'bugs.view': ROLE_LIST,
  'bugs.report': [ADMIN, PROJECT_MANAGER, TESTER],
  'bugs.assign': [ADMIN, PROJECT_MANAGER, TESTER],
  'bugs.update': ROLE_LIST, // Developers: only bugs assigned to them (see canUpdateBug)
  'bugs.delete': [ADMIN, PROJECT_MANAGER],
  'reports.view': ROLE_LIST,
});

/** Does this user's role have the permission? */
export function hasPermission(user, permission) {
  if (!user) return false;
  if (!permission) return true;
  return (PERMISSIONS[permission] || []).includes(user.role);
}

export function isAdmin(user) {
  return user?.role === ADMIN;
}

/** Admins edit any project; Project Managers only the projects they manage. */
export function canEditProject(user, project) {
  if (!user || !project) return false;
  if (user.role === ADMIN) return true;
  return user.role === PROJECT_MANAGER && project.managerId === user.id;
}

/**
 * Who may change a bug (status, fields):
 *   Admin / PM -> any bug
 *   Developer  -> bugs assigned to them
 *   Tester     -> bugs they reported or that are assigned to them
 */
export function canUpdateBug(user, bug) {
  if (!user || !bug) return false;
  if (user.role === ADMIN || user.role === PROJECT_MANAGER) return true;
  if (user.role === DEVELOPER) return bug.assignedTo === user.id;
  if (user.role === TESTER) return bug.reportedBy === user.id || bug.assignedTo === user.id;
  return false;
}

/* =================================================================
 * 2. VALIDATION
 * ================================================================= */

export const PASSWORD_MIN_LENGTH = 8;

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}

/** Returns an { field: message } object. Empty object means valid. */
export function validateRegistration({ name, email, password, confirmPassword, role }) {
  const errors = {};
  const cleanName = String(name || '').trim();

  if (!cleanName) errors.name = 'Full name is required.';
  else if (cleanName.length < 3) errors.name = 'Full name must be at least 3 characters.';
  else if (cleanName.length > 60) errors.name = 'Full name must be 60 characters or fewer.';

  if (!String(email || '').trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address, e.g. name@company.com.';
  else if (getUserByEmail(email)) errors.email = 'An account with this email already exists.';

  if (!password) errors.password = 'Password is required.';
  else if (password.length < PASSWORD_MIN_LENGTH) errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;

  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';

  if (!role) errors.role = 'Please select a role.';
  else if (!PUBLIC_ROLES.includes(role)) errors.role = 'This role cannot be selected during registration.';

  return errors;
}

/** 0–4 score used by the strength meter. Purely cosmetic in this demo. */
export function passwordStrength(password = '') {
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

/* =================================================================
 * 3. AUTH ACTIONS
 * ================================================================= */

/** Phase 1: nothing to sign out of, so this just goes back to the login page. */
export function logout() {
  window.location.href = 'login.html';
}

/**
 * Permission check for a page (initLayout does it for you).
 * Phase 1 always acts as the demo Admin, so this passes; it is kept for Phase 2.
 *   - missing permission  -> dashboard.html
 * Returns the current user, or null if a redirect happened.
 */
export function requireAuth(permission = null) {
  const user = getCurrentUser();
  if (permission && !hasPermission(user, permission)) {
    window.location.replace('dashboard.html');
    return null;
  }
  return user;
}

/* =================================================================
 * 4. PAGE CONTROLLERS (login.html, register.html)
 * ================================================================= */

/** Wire up every [data-toggle-password] button inside root. */
export function initPasswordToggles(root = document) {
  root.querySelectorAll('[data-toggle-password]').forEach((button) => {
    const input = document.getElementById(button.dataset.togglePassword);
    button.innerHTML = icon('eye', 18);
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.innerHTML = icon(show ? 'eye-off' : 'eye', 18);
      button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      button.setAttribute('aria-pressed', String(show));
    });
  });
}

function fillAppName() {
  const { appName } = getSystemSettings();
  document.querySelectorAll('[data-app-name]').forEach((el) => { el.textContent = appName; });
  document.querySelectorAll('[data-app-logo]').forEach((el) => { el.innerHTML = icon('bug', 20); });
}

function setLoading(button, loading, label) {
  button.disabled = loading;
  button.classList.toggle('is-loading', loading);
  if (label) button.querySelector('.btn__label').textContent = label;
}

/**
 * Login page. Phase 1: the email and password are only checked for format,
 * then the dashboard opens as the demo Admin. Nothing is sent or stored.
 */
export function initLoginPage() {
  fillAppName();
  initPasswordToggles();

  const form = document.getElementById('login-form');
  const submitBtn = form.querySelector('[type="submit"]');

  // Clear a field's error as soon as the user edits it
  form.addEventListener('input', (event) => clearFieldError(event.target));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    const errors = {};
    if (!email) errors.email = 'Email is required.';
    else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    if (!showFormErrors(form, errors)) return;

    setLoading(submitBtn, true, 'Signing in…');
    // Small delay so the loading state is visible (there is no real network call)
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 350);
  });
}

/**
 * Register page. Phase 1: the form is fully validated, then the dashboard
 * opens as the demo Admin. No account is created.
 */
export function initRegisterPage() {
  fillAppName();
  initPasswordToggles();

  const form = document.getElementById('register-form');
  const fieldset = form.querySelector('fieldset');
  const alertBox = document.getElementById('register-alert');
  const submitBtn = form.querySelector('[type="submit"]');
  const meter = document.getElementById('password-strength');

  // Role options come from the shared constants (Admin is intentionally excluded)
  const roleSelect = form.elements.role;
  roleSelect.innerHTML = '<option value="">Select your role</option>' +
    PUBLIC_ROLES.map((role) => `<option value="${role}">${role}</option>`).join('');

  if (!getSystemSettings().allowRegistration) {
    alertBox.innerHTML = `${icon('lock', 18)}<span>Public registration is currently disabled by an administrator. Please ask an admin for an account.</span>`;
    alertBox.hidden = false;
    fieldset.disabled = true;
    return;
  }

  // Password strength meter
  const LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  form.elements.password.addEventListener('input', () => {
    const value = form.elements.password.value;
    const label = meter.querySelector('.strength__label');
    if (!value) {
      delete meter.dataset.score;
      label.textContent = '';
      return;
    }
    // Under the minimum length is always "Too short" (score 0); otherwise 1–4
    const score = value.length < PASSWORD_MIN_LENGTH ? 0 : Math.max(1, passwordStrength(value));
    meter.dataset.score = score;
    label.textContent = LABELS[score];
  });

  const readForm = () => ({
    name: form.elements.name.value,
    email: form.elements.email.value,
    password: form.elements.password.value,
    confirmPassword: form.elements.confirmPassword.value,
    role: form.elements.role.value,
  });

  // Validate a single field when the user leaves it (only after they've typed something)
  form.addEventListener('focusout', (event) => {
    const input = event.target;
    if (!input.name || !input.value) return;
    const errors = validateRegistration(readForm());
    if (errors[input.name]) setFieldError(input, errors[input.name]);
    else clearFieldError(input);
  });
  form.addEventListener('input', (event) => clearFieldError(event.target));
  form.addEventListener('change', (event) => clearFieldError(event.target));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    alertBox.hidden = true;
    const errors = validateRegistration(readForm());

    if (Object.keys(errors).length) {
      showFormErrors(form, errors);
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    fieldset.disabled = true;
    setLoading(submitBtn, true, 'Opening dashboard…');
    showToast('Demo: no account is created in Phase 1. Opening the dashboard…', 'info');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1400);
  });
}
