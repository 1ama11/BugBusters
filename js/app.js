/**
 * app.js
 * ------------------------------------------------------------------
 * Shared application layout: sidebar, top bar, profile menu, theme.
 *
 * Every protected page calls initLayout() once:
 *
 *   import { initLayout } from '../js/app.js';
 *   const user = initLayout({ pageId: 'projects', title: 'Projects' });
 *   if (user) { ...render your page... }
 *
 * initLayout() will:
 *   1. seed localStorage on the first visit
 *   2. redirect to login (or dashboard) if the user may not see the page
 *   3. apply the user's theme
 *   4. render the sidebar + top bar into #app-sidebar and #app-topbar
 *   5. show any pending flash message
 *   6. reveal the page (body.is-loading is removed)
 * ------------------------------------------------------------------
 */

import {
  initStorage,
  getSystemSettings,
  getUserPreferences,
  updateUserPreferences,
  getCurrentUser,
} from './storage.js';
import { requireAuth, hasPermission, logout } from './auth.js';
import { icon, escapeHTML, avatarHTML, roleBadge, showFlash, hydrateIcons } from './ui.js';

/* ===================== Navigation config ===================== */
/*
 * id          -> must match the pageId passed to initLayout()
 * permission  -> optional; item is hidden when the user lacks it (see PERMISSIONS in auth.js)
 */
export const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: 'dashboard' },
      { id: 'bugs', label: 'All Bugs', href: 'bugs.html', icon: 'bug', permission: 'bugs.view' },
      { id: 'report-bug', label: 'Report Bug', href: 'report-bug.html', icon: 'plus-circle', permission: 'bugs.report' },
      { id: 'projects', label: 'Projects', href: 'projects.html', icon: 'folder' },
      { id: 'reports', label: 'Reports & Analytics', href: 'reports.html', icon: 'chart', permission: 'reports.view' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { id: 'users', label: 'User Management', href: 'users.html', icon: 'users', permission: 'users.manage', adminOnly: true },
      { id: 'settings', label: 'Settings', href: 'settings.html', icon: 'settings' },
    ],
  },
];

/** Every nav item in one flat list (handy for breadcrumbs / tests). */
export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

let layoutState = { pageId: '', title: '' };

// Lets refreshLayout() remove the document-level listeners added by the previous render
let layoutListeners = null;

/* ===================== Theme ===================== */

export function applyTheme(theme = 'light') {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

/** Switch theme for the current user and save it. Returns the new theme. */
export function toggleTheme() {
  const user = getCurrentUser();
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  if (user) updateUserPreferences(user.id, { theme: next });
  updateThemeButton();
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  return next;
}

function updateThemeButton() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  button.innerHTML = icon(dark ? 'sun' : 'moon', 18);
  button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  button.title = dark ? 'Light theme' : 'Dark theme';
}

/* ===================== Rendering ===================== */

function renderSidebar(user, pageId) {
  const sidebar = document.getElementById('app-sidebar');
  const { appName } = getSystemSettings();

  const sectionsHTML = NAV_SECTIONS.map((section) => {
    const visible = section.items.filter((item) => hasPermission(user, item.permission));
    if (!visible.length) return '';
    return `
      <div class="nav-section">
        <p class="nav-section__label">${escapeHTML(section.label)}</p>
        <ul class="nav-list" role="list">
          ${visible.map((item) => `
            <li>
              <a class="nav-link ${item.id === pageId ? 'is-active' : ''}" href="${item.href}"
                 ${item.id === pageId ? 'aria-current="page"' : ''} title="${escapeHTML(item.label)}">
                ${icon(item.icon, 18, 'nav-link__icon')}
                <span class="nav-link__label">${escapeHTML(item.label)}</span>
                ${item.adminOnly ? '<span class="nav-link__tag">Admin</span>' : ''}
              </a>
            </li>`).join('')}
        </ul>
      </div>`;
  }).join('');

  sidebar.setAttribute('aria-label', 'Main navigation');
  sidebar.innerHTML = `
    <div class="sidebar__header">
      <a class="brand" href="dashboard.html" aria-label="${escapeHTML(appName)} home">
        <span class="brand__logo">${icon('bug', 18)}</span>
        <span class="brand__name">${escapeHTML(appName)}</span>
      </a>
      <button type="button" class="icon-btn sidebar__close" id="sidebar-close" aria-label="Close navigation">${icon('x', 18)}</button>
    </div>
    <nav class="sidebar__nav">${sectionsHTML}</nav>
    <div class="sidebar__footer">
      <p class="demo-chip" title="No backend: data lives in your browser's localStorage">
        ${icon('info', 14)}<span>Demo mode · simulated auth</span>
      </p>
      <button type="button" class="nav-link sidebar__collapse" id="sidebar-collapse" aria-label="Collapse sidebar">
        ${icon('chevrons-left', 18, 'nav-link__icon')}
        <span class="nav-link__label">Collapse</span>
      </button>
    </div>`;
}

function renderTopbar(user, title) {
  const topbar = document.getElementById('app-topbar');
  const showReportButton = hasPermission(user, 'bugs.report') && layoutState.pageId !== 'report-bug';

  topbar.innerHTML = `
    <div class="topbar__left">
      <button type="button" class="icon-btn topbar__menu" id="sidebar-open" aria-label="Open navigation" aria-controls="app-sidebar" aria-expanded="false">${icon('menu', 20)}</button>
      <div class="topbar__title">
        <h1 class="page-title" id="page-title">${escapeHTML(title)}</h1>
      </div>
    </div>
    <div class="topbar__right">
      ${showReportButton ? `<a class="btn btn--primary btn--sm topbar__cta" href="report-bug.html">${icon('plus', 16)}<span>Report bug</span></a>` : ''}
      <button type="button" class="icon-btn" id="theme-toggle"></button>
      <div class="dropdown" id="profile-dropdown">
        <button type="button" class="profile-btn" id="profile-button" aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu">
          ${avatarHTML(user, 'sm')}
          <span class="profile-btn__text">
            <span class="profile-btn__name">${escapeHTML(user.name)}</span>
            <span class="profile-btn__role">${escapeHTML(user.role)}</span>
          </span>
          ${icon('chevron-down', 16, 'profile-btn__chevron')}
        </button>
        <div class="dropdown__menu" id="profile-menu" role="menu" hidden>
          <div class="dropdown__header">
            ${avatarHTML(user, 'md')}
            <div>
              <p class="dropdown__name">${escapeHTML(user.name)}</p>
              <p class="dropdown__email">${escapeHTML(user.email)}</p>
              ${roleBadge(user.role)}
            </div>
          </div>
          <a class="dropdown__item" role="menuitem" href="settings.html#profile">${icon('user', 16)}Profile settings</a>
          <a class="dropdown__item" role="menuitem" href="settings.html#preferences">${icon('settings', 16)}Preferences</a>
          <div class="dropdown__divider" role="separator"></div>
          <button type="button" class="dropdown__item dropdown__item--danger" role="menuitem" id="logout-button">${icon('logout', 16)}Log out</button>
        </div>
      </div>
    </div>`;
  updateThemeButton();
}

/* ===================== Behaviour ===================== */

function bindSidebar(user, signal) {
  const shell = document.querySelector('.app-shell');
  const sidebar = document.getElementById('app-sidebar');
  const openBtn = document.getElementById('sidebar-open');

  // Backdrop for the mobile off-canvas sidebar
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    shell.appendChild(backdrop);
  }

  const setMobileOpen = (open) => {
    shell.classList.toggle('sidebar-open', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) sidebar.querySelector('.nav-link')?.focus();
  };

  openBtn.addEventListener('click', () => setMobileOpen(true));
  document.getElementById('sidebar-close').addEventListener('click', () => { setMobileOpen(false); openBtn.focus(); });
  backdrop.addEventListener('click', () => setMobileOpen(false), { signal });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && shell.classList.contains('sidebar-open')) { setMobileOpen(false); openBtn.focus(); }
  }, { signal });

  // Desktop collapse (remembered per user)
  const collapseBtn = document.getElementById('sidebar-collapse');
  const setCollapsed = (collapsed, save = true) => {
    shell.classList.toggle('sidebar-collapsed', collapsed);
    collapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
    collapseBtn.querySelector('.nav-link__label').textContent = collapsed ? 'Expand' : 'Collapse';
    if (save) updateUserPreferences(user.id, { sidebarCollapsed: collapsed });
  };
  setCollapsed(getUserPreferences(user.id).sidebarCollapsed, false);
  collapseBtn.addEventListener('click', () => setCollapsed(!shell.classList.contains('sidebar-collapsed')));
}

function bindProfileMenu(signal) {
  const dropdown = document.getElementById('profile-dropdown');
  const button = document.getElementById('profile-button');
  const menu = document.getElementById('profile-menu');
  const items = () => [...menu.querySelectorAll('[role="menuitem"]')];

  const setOpen = (open, focusFirst = false) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    dropdown.classList.toggle('is-open', open);
    if (open && focusFirst) items()[0]?.focus();
  };

  button.addEventListener('click', () => setOpen(menu.hidden, true));
  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) setOpen(false);
  }, { signal });
  dropdown.addEventListener('keydown', (event) => {
    if (menu.hidden) return;
    const list = items();
    const index = list.indexOf(document.activeElement);
    if (event.key === 'Escape') { setOpen(false); button.focus(); }
    if (event.key === 'ArrowDown') { event.preventDefault(); list[(index + 1) % list.length].focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); list[(index - 1 + list.length) % list.length].focus(); }
  });

  document.getElementById('logout-button').addEventListener('click', () => logout());
}

/* ===================== Public API ===================== */

/**
 * Set up the shared layout for a protected page.
 * @param {object}  options
 * @param {string}  options.pageId      Nav item id to highlight ('dashboard', 'bugs', 'projects', …)
 * @param {string}  [options.title]     Text shown in the top bar (defaults to the nav label)
 * @param {string}  [options.permission] Permission required to view the page (e.g. 'users.manage')
 * @returns {object|null} The current user, or null if the user was redirected.
 */
export function initLayout({ pageId, title, permission = null } = {}) {
  initStorage();

  const navItem = NAV_ITEMS.find((item) => item.id === pageId);
  const user = requireAuth(permission || navItem?.permission || null);
  if (!user) return null;

  layoutState = { pageId, title: title || navItem?.label || '' };
  applyTheme(getUserPreferences(user.id).theme);
  renderLayout(user);
  hydrateIcons(document);
  showFlash();
  document.body.classList.remove('is-loading');
  return user;
}

/** Re-render the sidebar and top bar (e.g. after the user renames themselves or the app name changes). */
export function refreshLayout() {
  const user = getCurrentUser();
  if (user) renderLayout(user);
}

function renderLayout(user) {
  layoutListeners?.abort();
  layoutListeners = new AbortController();
  const { signal } = layoutListeners;

  renderSidebar(user, layoutState.pageId);
  renderTopbar(user, layoutState.title);
  bindSidebar(user, signal);
  bindProfileMenu(signal);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.title = `${layoutState.title} · ${getSystemSettings().appName}`;
}
