/**
 * users.js — User Management page (Admin only)
 * Search, filter, sort, view details, edit role/status/name, activate/deactivate.
 */

import { initLayout, refreshLayout } from './app.js';
import {
  getUsers,
  getUserById,
  updateUser,
  getProjects,
  getBugsAssignedTo,
  getBugsReportedBy,
} from './storage.js';
import { ROLE_LIST, USER_STATUSES, OPEN_BUG_STATUSES, ROLES } from './mock-data.js';
import {
  icon,
  escapeHTML,
  badge,
  roleBadge,
  avatarHTML,
  formatDate,
  timeAgo,
  emptyStateHTML,
  openModal,
  closeModal,
  confirmDialog,
  showToast,
  showFormErrors,
  clearFormErrors,
  debounce,
} from './ui.js';

const currentUser = initLayout({ pageId: 'users', permission: 'users.manage' });

/* ---------- Page state ---------- */
const state = {
  search: '',
  role: '',
  status: '',
  sortKey: 'createdAt',
  sortDir: 'desc', // 'asc' | 'desc'
};

/* ---------- Elements ---------- */
const els = {
  tbody: document.getElementById('users-tbody'),
  empty: document.getElementById('users-empty'),
  count: document.getElementById('user-count'),
  search: document.getElementById('user-search'),
  roleFilter: document.getElementById('role-filter'),
  statusFilter: document.getElementById('status-filter'),
  clearBtn: document.getElementById('clear-filters'),
  table: document.querySelector('.users-table'),
  viewModal: document.getElementById('user-view-modal'),
  viewBody: document.getElementById('user-view-body'),
  viewEditBtn: document.getElementById('user-view-edit'),
  editModal: document.getElementById('user-edit-modal'),
  editForm: document.getElementById('user-edit-form'),
};

if (currentUser) {
  setupFilters();
  setupSorting();
  setupTableActions();
  setupEditForm();
  render();
}

/* ===================== Rendering ===================== */

function getFilteredUsers() {
  const term = state.search.trim().toLowerCase();
  const users = getUsers().filter((user) => {
    const matchesSearch = !term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
    const matchesRole = !state.role || user.role === state.role;
    const matchesStatus = !state.status || user.status === state.status;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const dir = state.sortDir === 'asc' ? 1 : -1;
  return users.sort((a, b) => {
    const x = a[state.sortKey] ?? '';
    const y = b[state.sortKey] ?? '';
    return String(x).localeCompare(String(y), undefined, { sensitivity: 'base' }) * dir;
  });
}

function renderStats() {
  const users = getUsers();
  document.getElementById('stat-total').textContent = users.length;
  document.getElementById('stat-active').textContent = users.filter((u) => u.status === 'Active').length;
  document.getElementById('stat-inactive').textContent = users.filter((u) => u.status !== 'Active').length;
  document.getElementById('stat-admins').textContent = users.filter((u) => u.role === ROLES.ADMIN).length;
}

function rowHTML(user) {
  const isSelf = user.id === currentUser.id;
  const active = user.status === 'Active';
  return `
    <tr class="${active ? '' : 'row-inactive'}" data-id="${user.id}">
      <td>
        <div class="user-cell">
          ${avatarHTML(user, 'md')}
          <div class="user-cell__text">
            <span class="user-cell__name">${escapeHTML(user.name)}${isSelf ? ' <span class="you-tag">You</span>' : ''}</span>
            <span class="user-cell__meta">${escapeHTML(user.email)}</span>
          </div>
        </div>
      </td>
      <td>${roleBadge(user.role)}</td>
      <td>${badge(user.status)}</td>
      <td class="text-muted">${formatDate(user.createdAt)}</td>
      <td class="text-muted col-hide-md">${user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'Never'}</td>
      <td class="col-actions">
        <div class="row-actions">
          <button type="button" class="icon-btn icon-btn--sm" data-action="view" aria-label="View ${escapeHTML(user.name)}" title="View details">${icon('eye', 16)}</button>
          <button type="button" class="icon-btn icon-btn--sm" data-action="edit" aria-label="Edit ${escapeHTML(user.name)}" title="Edit user">${icon('edit', 16)}</button>
          <button type="button" class="btn btn--sm ${active ? 'btn--ghost' : 'btn--secondary'}" data-action="toggle-status"
            ${isSelf ? 'disabled title="You can\'t deactivate your own account"' : ''}>
            ${active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </td>
    </tr>`;
}

function render() {
  const users = getFilteredUsers();
  const total = getUsers().length;

  els.tbody.innerHTML = users.map(rowHTML).join('');
  els.empty.hidden = users.length > 0;
  els.table.hidden = users.length === 0;
  if (!users.length) {
    els.empty.innerHTML = emptyStateHTML('No users match your filters', 'Try a different search term or clear the filters.', 'search');
  }

  els.count.textContent = users.length === total ? `${total} users` : `Showing ${users.length} of ${total} users`;
  els.clearBtn.hidden = !(state.search || state.role || state.status);
  renderStats();
  updateSortHeaders();
}

/* ===================== Filters & sorting ===================== */

function setupFilters() {
  els.roleFilter.insertAdjacentHTML('beforeend', ROLE_LIST.map((r) => `<option value="${r}">${r}</option>`).join(''));
  els.statusFilter.insertAdjacentHTML('beforeend', USER_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join(''));

  els.search.addEventListener('input', debounce(() => { state.search = els.search.value; render(); }, 150));
  els.roleFilter.addEventListener('change', () => { state.role = els.roleFilter.value; render(); });
  els.statusFilter.addEventListener('change', () => { state.status = els.statusFilter.value; render(); });
  els.clearBtn.addEventListener('click', () => {
    Object.assign(state, { search: '', role: '', status: '' });
    els.search.value = '';
    els.roleFilter.value = '';
    els.statusFilter.value = '';
    render();
    els.search.focus();
  });
}

function setupSorting() {
  els.table.querySelectorAll('th[data-sort]').forEach((th) => {
    th.querySelector('.sort-btn').insertAdjacentHTML('beforeend', icon('arrow-up-down', 14));
    th.querySelector('.sort-btn').addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else Object.assign(state, { sortKey: key, sortDir: key === 'name' || key === 'role' ? 'asc' : 'desc' });
      render();
    });
  });
}

function updateSortHeaders() {
  els.table.querySelectorAll('th[data-sort]').forEach((th) => {
    const active = th.dataset.sort === state.sortKey;
    if (active) th.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
    else th.removeAttribute('aria-sort');
    th.querySelector('.sort-btn .icon').outerHTML = icon(active ? (state.sortDir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down', 14);
  });
}

/* ===================== Row actions ===================== */

function setupTableActions() {
  els.tbody.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const userId = button.closest('tr').dataset.id;
    const action = button.dataset.action;
    if (action === 'view') openViewModal(userId);
    if (action === 'edit') openEditModal(userId);
    if (action === 'toggle-status') toggleStatus(userId);
  });

  els.viewEditBtn.addEventListener('click', () => {
    const id = els.viewModal.dataset.userId;
    closeModal(els.viewModal);
    openEditModal(id);
  });
}

/** Number of ACTIVE admins other than `exceptId`. Used to protect the last admin. */
function otherActiveAdmins(exceptId) {
  return getUsers().filter((u) => u.role === ROLES.ADMIN && u.status === 'Active' && u.id !== exceptId).length;
}

async function toggleStatus(userId) {
  const user = getUserById(userId);
  if (!user || user.id === currentUser.id) return;
  const activating = user.status !== 'Active';

  if (!activating && user.role === ROLES.ADMIN && otherActiveAdmins(user.id) === 0) {
    showToast('You cannot deactivate the last active administrator.', 'error');
    return;
  }

  const confirmed = await confirmDialog({
    title: activating ? `Activate ${user.name}?` : `Deactivate ${user.name}?`,
    message: activating
      ? 'They will be able to sign in and use the workspace again.'
      : 'They will be signed out and won\'t be able to sign in until an admin reactivates the account. Their bugs and history are kept.',
    confirmText: activating ? 'Activate' : 'Deactivate',
    danger: !activating,
  });
  if (!confirmed) return;

  updateUser(user.id, { status: activating ? 'Active' : 'Inactive' });
  showToast(`${user.name} has been ${activating ? 'activated' : 'deactivated'}.`, 'success');
  render();
}

/* ===================== View modal ===================== */

function openViewModal(userId) {
  const user = getUserById(userId);
  if (!user) return;

  const assigned = getBugsAssignedTo(user.id);
  const openAssigned = assigned.filter((b) => OPEN_BUG_STATUSES.includes(b.status)).length;
  const reported = getBugsReportedBy(user.id).length;
  const projects = getProjects().filter((p) => p.managerId === user.id || p.memberIds.includes(user.id));

  els.viewModal.dataset.userId = user.id;
  els.viewBody.innerHTML = `
    <div class="profile-summary">
      ${avatarHTML(user, 'lg')}
      <div>
        <p class="profile-summary__name">${escapeHTML(user.name)}</p>
        <p class="text-muted">${escapeHTML(user.jobTitle || 'No job title')}</p>
        <div class="row mt-2">${roleBadge(user.role)} ${badge(user.status)}</div>
      </div>
    </div>

    <div class="mini-stats">
      <div class="mini-stat"><span class="mini-stat__value">${reported}</span><span class="mini-stat__label">Bugs reported</span></div>
      <div class="mini-stat"><span class="mini-stat__value">${assigned.length}</span><span class="mini-stat__label">Bugs assigned</span></div>
      <div class="mini-stat"><span class="mini-stat__value">${openAssigned}</span><span class="mini-stat__label">Still open</span></div>
    </div>

    <dl class="detail-list">
      <dt>User ID</dt><dd class="mono">${user.id}</dd>
      <dt>Email</dt><dd>${escapeHTML(user.email)}</dd>
      <dt>Registered</dt><dd>${formatDate(user.createdAt, { time: true })}</dd>
      <dt>Last active</dt><dd>${user.lastLoginAt ? formatDate(user.lastLoginAt, { time: true }) : 'Never signed in'}</dd>
      <dt>Projects</dt>
      <dd>${projects.length
        ? `<div class="chip-list">${projects.map((p) => `<span class="chip">${escapeHTML(p.name)}${p.managerId === user.id ? ' · Manager' : ''}</span>`).join('')}</div>`
        : '<span class="text-muted">Not on any project</span>'}</dd>
    </dl>`;
  openModal(els.viewModal);
}

/* ===================== Edit modal ===================== */

function setupEditForm() {
  const form = els.editForm;
  form.elements.role.innerHTML = ROLE_LIST.map((r) => `<option value="${r}">${r}</option>`).join('');
  form.elements.status.innerHTML = USER_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('');
  form.addEventListener('submit', handleEditSubmit);
}

function openEditModal(userId) {
  const user = getUserById(userId);
  if (!user) return;
  const form = els.editForm;
  const isSelf = user.id === currentUser.id;

  clearFormErrors(form);
  form.elements.id.value = user.id;
  form.elements.name.value = user.name;
  form.elements.email.value = user.email;
  form.elements.role.value = user.role;
  form.elements.status.value = user.status;
  form.elements.jobTitle.value = user.jobTitle || '';
  form.elements.role.disabled = isSelf;
  form.elements.status.disabled = isSelf;
  document.getElementById('user-edit-self-note').hidden = !isSelf;
  document.getElementById('user-edit-subtitle').textContent = `${user.id} · joined ${formatDate(user.createdAt)}`;

  openModal(els.editModal);
  form.elements.name.focus();
}

async function handleEditSubmit(event) {
  event.preventDefault();
  const form = els.editForm;
  const user = getUserById(form.elements.id.value);
  if (!user) return;

  const changes = {
    name: form.elements.name.value.trim(),
    jobTitle: form.elements.jobTitle.value.trim(),
    role: form.elements.role.value,
    status: form.elements.status.value,
  };

  // Validation
  const errors = {};
  if (changes.name.length < 3) errors.name = 'Full name must be at least 3 characters.';
  const losesAdmin = user.role === ROLES.ADMIN && user.status === 'Active' &&
    (changes.role !== ROLES.ADMIN || changes.status !== 'Active');
  if (losesAdmin && otherActiveAdmins(user.id) === 0) {
    errors[changes.role !== ROLES.ADMIN ? 'role' : 'status'] = 'The workspace needs at least one active administrator.';
  }
  if (!showFormErrors(form, errors)) return;

  // Confirm important changes (role or status)
  const important = [];
  if (changes.role !== user.role) important.push(`role from ${user.role} to ${changes.role}`);
  if (changes.status !== user.status) important.push(`status from ${user.status} to ${changes.status}`);
  if (important.length) {
    const confirmed = await confirmDialog({
      title: 'Confirm changes',
      message: `You are about to change ${user.name}'s ${important.join(' and ')}. This changes what they can access.`,
      confirmText: 'Apply changes',
      danger: changes.status === 'Inactive' || (user.role === ROLES.ADMIN && changes.role !== ROLES.ADMIN),
    });
    if (!confirmed) return;
  }

  const nothingChanged = Object.keys(changes).every((key) => changes[key] === (user[key] || ''));
  if (nothingChanged) {
    closeModal(els.editModal);
    return;
  }

  updateUser(user.id, changes);
  closeModal(els.editModal);
  showToast(`${changes.name} was updated.`, 'success');
  if (user.id === currentUser.id) refreshLayout();
  render();
}
