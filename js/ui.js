/**
 * ui.js
 * ------------------------------------------------------------------
 * Small, reusable UI helpers shared by every page:
 *   icons, toasts, flash messages, modals, confirm dialogs,
 *   badges, avatars, date formatting and form error helpers.
 *
 * It lives in its own module (instead of inside app.js) so that
 * auth.js can use toasts without a circular import with app.js.
 * ------------------------------------------------------------------
 */

import { getSession, getUserPreferences } from './storage.js';

/* ===================== Text safety ===================== */

/** Escape user-provided text before inserting it with innerHTML. ALWAYS use this. */
export function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ===================== Icons ===================== */
/* Minimal stroke icons (24x24, Lucide-style). Usage: icon('bug') or icon('bug', 16) */

const ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  bug: '<path d="M8 2l1.9 1.9M14.1 3.9L16 2M9 7.1v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9M6.5 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M21 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  'plus-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
  'chevrons-left': '<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M9.9 9.9a3 3 0 1 0 4.2 4.2M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>',
  'arrow-up': '<path d="M12 19V5M5 12l7-7 7 7"/>',
  'arrow-down': '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  'arrow-up-down': '<path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>',
  'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  'user-check': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l2 2 4-4"/>',
  'user-x': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M17 8l5 5M22 8l-5 5"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  layers: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
};

export function icon(name, size = 18, extraClass = '') {
  const paths = ICON_PATHS[name] || ICON_PATHS.info;
  return `<svg class="icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

/**
 * Fill every <span data-icon="name"></span> in static HTML with its SVG.
 * Optional data-icon-size="20". initLayout() runs this for the whole page.
 */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, Number(el.dataset.iconSize) || 16);
  });
}

/* ===================== Toast notifications ===================== */

const TOAST_ICONS = { success: 'check-circle', error: 'alert', warning: 'alert', info: 'info' };

function getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a temporary notification.
 *   showToast('Project saved', 'success')
 * type: 'success' | 'error' | 'warning' | 'info'
 */
export function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `
    <span class="toast__icon">${icon(TOAST_ICONS[type] || 'info', 18)}</span>
    <p class="toast__message">${escapeHTML(message)}</p>
    <button type="button" class="toast__close" aria-label="Dismiss notification">${icon('x', 16)}</button>
  `;
  const remove = () => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 200);
  };
  toast.querySelector('.toast__close').addEventListener('click', remove);
  getToastContainer().appendChild(toast);
  if (duration > 0) setTimeout(remove, duration);
  return toast;
}

/* ===================== Flash messages ===================== */
/* A message saved before a redirect and shown as a toast on the next page. */

const FLASH_KEY = 'bugtracker.flash';

export function setFlash(message, type = 'info', extra = {}) {
  sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type, ...extra }));
}

/** Returns the flash object (and removes it), or null. */
export function consumeFlash() {
  const raw = sessionStorage.getItem(FLASH_KEY);
  sessionStorage.removeItem(FLASH_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Show the pending flash message, if any. Called automatically by initLayout(). */
export function showFlash() {
  const flash = consumeFlash();
  if (flash?.message) showToast(flash.message, flash.type);
  return flash;
}

/* ===================== Modals (native <dialog>) ===================== */
/*
 * Markup:
 *   <dialog class="modal" id="my-modal" aria-labelledby="my-modal-title">
 *     <div class="modal__header"><h2 id="my-modal-title">…</h2>
 *       <button class="icon-btn" data-close-modal aria-label="Close">…</button></div>
 *     <div class="modal__body">…</div>
 *     <div class="modal__footer"><button class="btn btn--secondary" data-close-modal>Cancel</button></div>
 *   </dialog>
 */

function wireModal(dialog) {
  if (dialog.dataset.wired) return;
  dialog.dataset.wired = 'true';
  dialog.addEventListener('click', (event) => {
    // Clicking the dark backdrop (the dialog element itself) closes the modal
    if (event.target === dialog) closeModal(dialog);
    if (event.target.closest('[data-close-modal]')) closeModal(dialog);
  });
}

export function openModal(dialogOrId) {
  const dialog = typeof dialogOrId === 'string' ? document.getElementById(dialogOrId) : dialogOrId;
  if (!dialog) return null;
  wireModal(dialog);
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
  return dialog;
}

export function closeModal(dialogOrId) {
  const dialog = typeof dialogOrId === 'string' ? document.getElementById(dialogOrId) : dialogOrId;
  if (!dialog?.open) return;
  dialog.close();
  if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
}

/**
 * Promise-based confirmation dialog.
 *   if (await confirmDialog({ title: 'Deactivate user?', message: '…', confirmText: 'Deactivate', danger: true })) { … }
 */
export function confirmDialog({ title = 'Are you sure?', message = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'modal modal--sm';
    dialog.setAttribute('aria-labelledby', 'confirm-title');
    dialog.innerHTML = `
      <div class="modal__header">
        <div class="confirm-heading">
          <span class="confirm-icon ${danger ? 'confirm-icon--danger' : ''}">${icon(danger ? 'alert' : 'info', 20)}</span>
          <h2 class="modal__title" id="confirm-title">${escapeHTML(title)}</h2>
        </div>
      </div>
      <div class="modal__body"><p class="text-muted">${escapeHTML(message)}</p></div>
      <div class="modal__footer">
        <button type="button" class="btn btn--secondary" data-action="cancel">${escapeHTML(cancelText)}</button>
        <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-action="confirm">${escapeHTML(confirmText)}</button>
      </div>`;

    let answered = false;
    const finish = (result) => {
      if (answered) return;
      answered = true;
      closeModal(dialog);
      dialog.remove();
      resolve(result);
    };

    dialog.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'confirm') finish(true);
      else if (action === 'cancel' || event.target === dialog) finish(false);
    });
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); finish(false); }); // Esc key

    document.body.appendChild(dialog);
    openModal(dialog);
    dialog.querySelector('[data-action="cancel"]').focus();
  });
}

/* ===================== Dates ===================== */

/** Parse "2026-10-19" or "2026-10-19T10:00:00" as LOCAL time. */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function currentDateFormat() {
  const session = getSession();
  return session ? getUserPreferences(session.userId).dateFormat : 'medium';
}

/**
 * Format a date using the logged-in user's "Date format" preference.
 *   formatDate('2026-10-19T10:00:00')                 -> "Oct 19, 2026"
 *   formatDate('2026-10-19T10:00:00', { time: true }) -> "Oct 19, 2026, 10:00"
 */
export function formatDate(value, { time = false } = {}) {
  const d = parseDate(value);
  if (!d) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  const clock = time ? `, ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
  switch (currentDateFormat()) {
    case 'dmy': return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}${clock}`;
    case 'iso': return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${clock}`;
    default: return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + clock;
  }
}

/** "just now", "5 min ago", "3 days ago"… falls back to formatDate after 30 days. */
export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return '—';
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(value);
}

/* ===================== Badges & avatars ===================== */

const BADGE_VARIANTS = {
  // user / project status
  Active: 'success', Inactive: 'neutral', 'On Hold': 'warning', Completed: 'info',
  // bug status
  Open: 'info', 'In Progress': 'warning', Resolved: 'success', Closed: 'neutral', Reopened: 'danger',
  // severity / priority
  Low: 'neutral', Medium: 'info', High: 'warning', Critical: 'danger',
};

const ROLE_CLASSES = {
  Admin: 'role--admin',
  'Project Manager': 'role--pm',
  Tester: 'role--tester',
  Developer: 'role--developer',
};

/** Status-style badge with a colored dot. Variant is picked automatically from the text. */
export function badge(text, variant = BADGE_VARIANTS[text] || 'neutral') {
  return `<span class="badge badge--${variant}"><span class="badge__dot" aria-hidden="true"></span>${escapeHTML(text)}</span>`;
}

export function roleBadge(role) {
  return `<span class="role-badge ${ROLE_CLASSES[role] || ''}">${escapeHTML(role)}</span>`;
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const AVATAR_COLORS = ['#d7141a', '#0e9f6e', '#d97706', '#db2777', '#0891b2', '#7c3aed', '#dc2626', '#4b5563'];

export function avatarColor(seed = '') {
  let hash = 0;
  for (const char of String(seed)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Circle with the user's initials. size: 'sm' | 'md' | 'lg' */
export function avatarHTML(user, size = 'md') {
  if (!user) return `<span class="avatar avatar--${size} avatar--empty" aria-hidden="true">?</span>`;
  return `<span class="avatar avatar--${size}" style="--avatar-bg:${avatarColor(user.id)}" title="${escapeHTML(user.name)}" aria-hidden="true">${escapeHTML(initials(user.name))}</span>`;
}

/** Empty-state block for lists and tables. */
export function emptyStateHTML(title, message = '', iconName = 'inbox') {
  return `<div class="empty-state">${icon(iconName, 28)}<p class="empty-state__title">${escapeHTML(title)}</p>${message ? `<p class="empty-state__text">${escapeHTML(message)}</p>` : ''}</div>`;
}

/* ===================== Forms ===================== */

function getErrorElement(input) {
  const field = input.closest('.field') || input.parentElement;
  let error = field.querySelector('.field-error');
  if (!error) {
    error = document.createElement('p');
    error.className = 'field-error';
    field.appendChild(error);
  }
  if (!error.id) error.id = `${input.id || input.name}-error`;
  return error;
}

/** Show an error message under a form control (accessible via aria-describedby). */
export function setFieldError(input, message) {
  const error = getErrorElement(input);
  error.textContent = message;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', error.id);
  input.closest('.field')?.classList.add('has-error');
}

export function clearFieldError(input) {
  const field = input.closest('.field');
  const error = field?.querySelector('.field-error');
  if (error) error.textContent = '';
  input.removeAttribute('aria-invalid');
  field?.classList.remove('has-error');
}

export function clearFormErrors(form) {
  form.querySelectorAll('input, select, textarea').forEach(clearFieldError);
}

/** Apply an { fieldName: message } object to a form. Focuses the first invalid field. Returns true if valid. */
export function showFormErrors(form, errors) {
  clearFormErrors(form);
  const names = Object.keys(errors);
  names.forEach((name) => {
    const input = form.elements[name];
    if (input) setFieldError(input.length && !input.tagName ? input[0] : input, errors[name]);
  });
  if (names.length) {
    const first = form.elements[names[0]];
    (first?.length && !first.tagName ? first[0] : first)?.focus();
  }
  return names.length === 0;
}

/* ===================== Misc ===================== */

export function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Read a query-string parameter: getQueryParam('id') on bug-details.html?id=BUG-001 -> "BUG-001" */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
