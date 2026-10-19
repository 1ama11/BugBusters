/**
 * settings.js — Settings page
 *   Personal (every user): profile, preferences, notifications
 *   Workspace (Admin only): system settings, reset demo data
 */

import { initLayout, refreshLayout } from './app.js';
import {
  getCurrentUser,
  updateUser,
  getUserPreferences,
  updateUserPreferences,
  getSystemSettings,
  updateSystemSettings,
  resetDemoData,
  nowISO,
} from './storage.js';
import { hasPermission } from './auth.js';
import { BUG_PRIORITIES, BUG_SEVERITIES } from './mock-data.js';
import {
  escapeHTML,
  avatarHTML,
  roleBadge,
  formatDate,
  showToast,
  showFormErrors,
  clearFormErrors,
  confirmDialog,
  setFlash,
} from './ui.js';

const currentUser = initLayout({ pageId: 'settings' });

const NOTIFICATION_OPTIONS = [
  { key: 'bugAssigned', label: 'Bug assigned to me', hint: 'When someone assigns a bug to you.' },
  { key: 'statusChanged', label: 'Status changes', hint: 'When a bug you reported or own changes status.' },
  { key: 'newComment', label: 'New comments', hint: 'When someone comments on your bugs.' },
  { key: 'projectUpdates', label: 'Project updates', hint: 'When a project you belong to changes status.' },
  { key: 'weeklySummary', label: 'Weekly summary', hint: 'A Monday digest of your open bugs.' },
];

if (currentUser) {
  initProfile();
  initPreferences();
  initNotifications();
  initSystem();
  highlightNavOnScroll();
}

/* ===================== Profile ===================== */

function renderProfileSummary(user) {
  document.getElementById('profile-summary').innerHTML = `
    ${avatarHTML(user, 'lg')}
    <div>
      <p class="profile-summary__name">${escapeHTML(user.name)}</p>
      <p class="text-muted text-sm">${escapeHTML(user.email)}</p>
      <div class="row mt-2">${roleBadge(user.role)}<span class="text-xs text-subtle">Member since ${formatDate(user.createdAt)}</span></div>
    </div>`;
}

function initProfile() {
  const form = document.getElementById('profile-form');

  const fill = () => {
    const user = getCurrentUser();
    clearFormErrors(form);
    form.elements.name.value = user.name;
    form.elements.jobTitle.value = user.jobTitle || '';
    form.elements.email.value = user.email;
    form.elements.role.value = user.role;
    renderProfileSummary(user);
  };
  fill();

  document.getElementById('profile-reset').addEventListener('click', fill);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const jobTitle = form.elements.jobTitle.value.trim();

    const errors = {};
    if (!name) errors.name = 'Full name is required.';
    else if (name.length < 3) errors.name = 'Full name must be at least 3 characters.';
    if (!showFormErrors(form, errors)) return;

    const updated = updateUser(currentUser.id, { name, jobTitle });
    renderProfileSummary(updated);
    refreshLayout(); // top bar shows the new name immediately
    showToast('Profile saved.', 'success');
  });
}

/* ===================== Preferences (auto-save) ===================== */

function initPreferences() {
  const prefs = getUserPreferences(currentUser.id);
  const dateSelect = document.getElementById('pref-date-format');
  const sidebarToggle = document.getElementById('pref-sidebar');
  const preview = document.getElementById('date-preview');

  dateSelect.value = prefs.dateFormat;
  sidebarToggle.checked = prefs.sidebarCollapsed;
  const updatePreview = () => { preview.textContent = formatDate(nowISO(), { time: true }); };
  updatePreview();

  dateSelect.addEventListener('change', () => {
    updateUserPreferences(currentUser.id, { dateFormat: dateSelect.value });
    updatePreview();
    renderProfileSummary(getCurrentUser());
    showToast('Date format saved.', 'success', 2000);
  });

  sidebarToggle.addEventListener('change', () => {
    updateUserPreferences(currentUser.id, { sidebarCollapsed: sidebarToggle.checked });
    refreshLayout();
    showToast('Sidebar preference saved.', 'success', 2000);
  });
}

/* ===================== Notifications (simulated, auto-save) ===================== */

function initNotifications() {
  const container = document.getElementById('notification-toggles');
  const prefs = getUserPreferences(currentUser.id).notifications;

  container.innerHTML = NOTIFICATION_OPTIONS.map((option) => `
    <div class="setting-row">
      <div class="setting-row__text">
        <label class="setting-row__label" for="notify-${option.key}">${option.label}</label>
        <p class="setting-row__hint">${option.hint}</p>
      </div>
      <label class="switch">
        <input type="checkbox" role="switch" id="notify-${option.key}" data-key="${option.key}" ${prefs[option.key] ? 'checked' : ''}>
        <span class="switch__track"></span>
      </label>
    </div>`).join('');

  container.addEventListener('change', (event) => {
    const key = event.target.dataset.key;
    if (!key) return;
    updateUserPreferences(currentUser.id, { notifications: { [key]: event.target.checked } });
    showToast('Notification preference saved.', 'success', 2000);
  });

  const channelInputs = document.querySelectorAll('input[name="channel"]');
  channelInputs.forEach((input) => {
    input.checked = input.value === prefs.channel;
    input.addEventListener('change', () => {
      updateUserPreferences(currentUser.id, { notifications: { channel: input.value } });
      showToast('Delivery channel saved.', 'success', 2000);
    });
  });

  document.getElementById('test-notification').addEventListener('click', () => {
    const current = getUserPreferences(currentUser.id).notifications;
    const enabled = NOTIFICATION_OPTIONS.filter((o) => current[o.key]).length;
    const channel = { 'in-app': 'in-app', email: 'email', both: 'in-app and email' }[current.channel];
    if (enabled === 0) {
      showToast('All notification types are turned off, so nothing would be sent.', 'warning');
      return;
    }
    showToast(`Test notification (simulated) delivered via ${channel}. ${enabled} of ${NOTIFICATION_OPTIONS.length} notification types are on.`, 'info', 5000);
  });
}

/* ===================== System (Admin only) ===================== */

function initSystem() {
  const isAdmin = hasPermission(currentUser, 'settings.system');
  const form = document.getElementById('system-form');
  document.getElementById('system-locked').hidden = isAdmin;
  form.hidden = !isAdmin;
  document.getElementById('danger-zone').hidden = !isAdmin;
  if (!isAdmin) return; // non-admins never get the controls wired up

  form.elements.defaultBugPriority.innerHTML = BUG_PRIORITIES.map((p) => `<option value="${p}">${p}</option>`).join('');
  form.elements.defaultBugSeverity.innerHTML = BUG_SEVERITIES.map((s) => `<option value="${s}">${s}</option>`).join('');

  const fill = () => {
    const system = getSystemSettings();
    clearFormErrors(form);
    form.elements.appName.value = system.appName;
    form.elements.sessionTimeoutHours.value = String(system.sessionTimeoutHours);
    form.elements.defaultBugPriority.value = system.defaultBugPriority;
    form.elements.defaultBugSeverity.value = system.defaultBugSeverity;
    form.elements.maxAttachmentSizeMB.value = system.maxAttachmentSizeMB;
    form.elements.allowRegistration.checked = system.allowRegistration;
  };
  fill();
  document.getElementById('system-reset').addEventListener('click', fill);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = {
      appName: form.elements.appName.value.trim(),
      sessionTimeoutHours: Number(form.elements.sessionTimeoutHours.value),
      defaultBugPriority: form.elements.defaultBugPriority.value,
      defaultBugSeverity: form.elements.defaultBugSeverity.value,
      maxAttachmentSizeMB: Number(form.elements.maxAttachmentSizeMB.value),
      allowRegistration: form.elements.allowRegistration.checked,
    };

    const errors = {};
    if (data.appName.length < 2) errors.appName = 'Application name must be at least 2 characters.';
    if (!Number.isInteger(data.maxAttachmentSizeMB) || data.maxAttachmentSizeMB < 1 || data.maxAttachmentSizeMB > 25) {
      errors.maxAttachmentSizeMB = 'Enter a whole number between 1 and 25.';
    }
    if (!showFormErrors(form, errors)) return;

    const previous = getSystemSettings();
    if (previous.allowRegistration && !data.allowRegistration) {
      const ok = await confirmDialog({
        title: 'Disable public registration?',
        message: 'New visitors will no longer be able to create accounts from the sign-up page.',
        confirmText: 'Disable registration',
        danger: true,
      });
      if (!ok) return;
    }

    updateSystemSettings(data);
    refreshLayout(); // app name in the sidebar
    showToast('System settings saved.', 'success');
  });

  document.getElementById('reset-data').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reset all demo data?',
      message: 'Every user, project, bug and setting saved in this browser will be replaced with the original sample data. This cannot be undone.',
      confirmText: 'Reset everything',
      danger: true,
    });
    if (!ok) return;
    resetDemoData();
    setFlash('Demo data was reset. Sign in again to continue.', 'success');
    window.location.href = 'login.html';
  });
}

/* ===================== Section nav highlighting ===================== */

function highlightNavOnScroll() {
  const links = [...document.querySelectorAll('.settings-nav__link')];
  const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);

  const setActive = (id) => links.forEach((link) => {
    const active = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) setActive(visible[0].target.id);
  }, { rootMargin: '-80px 0px -60% 0px' });
  sections.forEach((section) => observer.observe(section));

  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  setActive(target ? target.id : 'profile');
  target?.scrollIntoView();
}
