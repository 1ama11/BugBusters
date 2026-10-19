/**
 * projects.js — Projects page
 * Everyone can browse projects. Admins and Project Managers can create projects;
 * Admins edit any project, PMs edit the projects they manage (see canEditProject in auth.js).
 *
 * Integration points for teammates:
 *   projects.html?id=PROJ-001     opens that project's details on load
 *   bugs.html?project=PROJ-001    "View all bugs" link (Person 3's bug list)
 *   bug-details.html?id=BUG-001   recent bug links (Person 4's details page)
 */

import { initLayout } from './app.js';
import {
  getProjects,
  getProjectById,
  addProject,
  updateProject,
  getUsers,
  getUserById,
  getProjectStats,
} from './storage.js';
import { hasPermission, canEditProject } from './auth.js';
import { PROJECT_STATUSES, BUG_STATUSES, ROLES } from './mock-data.js';
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
  getQueryParam,
} from './ui.js';

const currentUser = initLayout({ pageId: 'projects' });

const state = { status: 'All', search: '', sort: 'updated', mineOnly: false };

const els = {
  grid: document.getElementById('projects-grid'),
  empty: document.getElementById('projects-empty'),
  count: document.getElementById('project-count'),
  tabs: document.getElementById('status-tabs'),
  search: document.getElementById('project-search'),
  sort: document.getElementById('project-sort'),
  mineOnly: document.getElementById('mine-only'),
  newBtn: document.getElementById('new-project-btn'),
  viewModal: document.getElementById('project-view-modal'),
  viewBody: document.getElementById('project-view-body'),
  viewEdit: document.getElementById('project-view-edit'),
  formModal: document.getElementById('project-form-modal'),
  form: document.getElementById('project-form'),
};

if (currentUser) {
  els.newBtn.hidden = !hasPermission(currentUser, 'projects.create');
  setupToolbar();
  setupForm();
  setupGridActions();
  render();

  // Deep link: projects.html?id=PROJ-001
  const linkedId = getQueryParam('id');
  if (linkedId && getProjectById(linkedId)) openViewModal(linkedId);
}

/* ===================== Data helpers ===================== */

function isMyProject(project) {
  return project.managerId === currentUser.id || project.memberIds.includes(currentUser.id);
}

function getVisibleProjects() {
  const term = state.search.trim().toLowerCase();
  const projects = getProjects()
    .filter((p) => state.status === 'All' || p.status === state.status)
    .filter((p) => !state.mineOnly || isMyProject(p))
    .filter((p) => !term || [p.name, p.key, p.description].some((v) => v.toLowerCase().includes(term)))
    .map((p) => ({ ...p, stats: getProjectStats(p.id) }));

  const sorters = {
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    name: (a, b) => a.name.localeCompare(b.name),
    bugs: (a, b) => b.stats.total - a.stats.total,
    open: (a, b) => b.stats.open - a.stats.open,
  };
  return projects.sort(sorters[state.sort]);
}

/* ===================== Rendering ===================== */

function renderTabs() {
  const projects = getProjects().filter((p) => !state.mineOnly || isMyProject(p));
  const tabs = ['All', ...PROJECT_STATUSES];
  els.tabs.innerHTML = tabs.map((status) => {
    const count = status === 'All' ? projects.length : projects.filter((p) => p.status === status).length;
    return `<button type="button" class="segmented__btn" data-status="${status}" aria-pressed="${state.status === status}">
      ${status}<span class="segmented__count">${count}</span></button>`;
  }).join('');
}

function memberStackHTML(memberIds, max = 4) {
  const members = memberIds.map(getUserById).filter(Boolean);
  if (!members.length) return '<span class="text-xs text-subtle">No members</span>';
  const shown = members.slice(0, max).map((u) => avatarHTML(u, 'sm')).join('');
  const more = members.length > max ? `<span class="avatar-stack__more">+${members.length - max}</span>` : '';
  return `<div class="avatar-stack" aria-label="${members.length} team members">${shown}${more}</div>`;
}

function cardHTML(project) {
  const { stats } = project;
  const manager = getUserById(project.managerId);
  const editable = canEditProject(currentUser, project);
  return `
    <article class="card project-card" data-id="${project.id}">
      <div class="project-card__top">
        <span class="project-key" aria-label="Project key">${escapeHTML(project.key)}</span>
        ${badge(project.status)}
      </div>
      <h3 class="project-card__title">
        <button type="button" class="project-card__link" data-action="view">${escapeHTML(project.name)}</button>
      </h3>
      <p class="project-card__desc">${escapeHTML(project.description)}</p>

      <div class="project-card__stats">
        <span>${icon('bug', 15)}<strong>${stats.total}</strong> ${stats.total === 1 ? 'bug' : 'bugs'}</span>
        <span class="${stats.open ? 'text-warning' : ''}"><strong>${stats.open}</strong> open</span>
        <span class="project-card__percent">${stats.percentDone}% resolved</span>
      </div>
      <div class="progress" role="progressbar" aria-label="Resolved bugs" aria-valuenow="${stats.percentDone}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress__bar" style="width:${stats.percentDone}%"></div>
      </div>

      <div class="project-card__footer">
        <div class="user-cell">
          ${avatarHTML(manager, 'sm')}
          <div class="user-cell__text">
            <span class="user-cell__name text-sm">${escapeHTML(manager?.name || 'Unassigned')}</span>
            <span class="user-cell__meta text-xs">Updated ${timeAgo(project.updatedAt)}</span>
          </div>
        </div>
        <div class="row">
          ${memberStackHTML(project.memberIds)}
          ${editable ? `<button type="button" class="icon-btn icon-btn--sm project-card__edit" data-action="edit" aria-label="Edit ${escapeHTML(project.name)}" title="Edit project">${icon('edit', 16)}</button>` : ''}
        </div>
      </div>
    </article>`;
}

function render() {
  renderTabs();
  const projects = getVisibleProjects();
  els.grid.innerHTML = projects.map(cardHTML).join('');
  els.grid.hidden = projects.length === 0;
  els.empty.hidden = projects.length > 0;

  if (!projects.length) {
    const filtered = state.search || state.status !== 'All' || state.mineOnly;
    els.empty.innerHTML = filtered
      ? emptyStateHTML('No projects match your filters', 'Try another search term or status.', 'search')
      : emptyStateHTML('No projects yet', hasPermission(currentUser, 'projects.create') ? 'Create the first project to start tracking bugs.' : 'An admin or project manager can create one.', 'folder');
  }
  const total = getProjects().length;
  els.count.textContent = projects.length === total ? `${total} projects` : `Showing ${projects.length} of ${total} projects`;
}

/* ===================== Toolbar ===================== */

function setupToolbar() {
  els.tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-status]');
    if (!button) return;
    state.status = button.dataset.status;
    render();
    els.tabs.querySelector(`[data-status="${state.status}"]`)?.focus();
  });
  els.search.addEventListener('input', debounce(() => { state.search = els.search.value; render(); }, 150));
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; render(); });
  els.mineOnly.addEventListener('change', () => { state.mineOnly = els.mineOnly.checked; render(); });
  els.newBtn.addEventListener('click', () => openFormModal());
}

function setupGridActions() {
  els.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.closest('[data-id]').dataset.id;
    if (button.dataset.action === 'view') openViewModal(id);
    if (button.dataset.action === 'edit') openFormModal(id);
  });

  els.viewEdit.addEventListener('click', () => {
    const id = els.viewModal.dataset.projectId;
    closeModal(els.viewModal);
    openFormModal(id);
  });
}

/* ===================== Details modal ===================== */

function openViewModal(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const stats = getProjectStats(project.id);
  const manager = getUserById(project.managerId);
  const members = project.memberIds.map(getUserById).filter(Boolean);
  const recent = [...stats.bugs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  els.viewModal.dataset.projectId = project.id;
  document.getElementById('project-view-eyebrow').innerHTML = `<span class="project-key">${escapeHTML(project.key)}</span> ${badge(project.status)}`;
  document.getElementById('project-view-title').textContent = project.name;
  document.getElementById('project-view-bugs').href = `bugs.html?project=${encodeURIComponent(project.id)}`;
  els.viewEdit.hidden = !canEditProject(currentUser, project);

  els.viewBody.innerHTML = `
    <p class="project-detail__desc">${escapeHTML(project.description)}</p>

    <div class="status-breakdown" aria-label="Bugs by status">
      ${BUG_STATUSES.map((s) => `
        <div class="status-breakdown__item">
          <span class="status-breakdown__value">${stats.byStatus[s]}</span>
          ${badge(s)}
        </div>`).join('')}
    </div>

    <div class="project-detail__grid">
      <section>
        <h3 class="section-title">Details</h3>
        <dl class="detail-list">
          <dt>Project ID</dt><dd class="mono">${project.id}</dd>
          <dt>Manager</dt><dd>${escapeHTML(manager?.name || 'Unassigned')}</dd>
          <dt>Total bugs</dt><dd>${stats.total} (${stats.open} open)</dd>
          <dt>Created</dt><dd>${formatDate(project.createdAt)}</dd>
          <dt>Last updated</dt><dd>${formatDate(project.updatedAt, { time: true })}</dd>
        </dl>
      </section>
      <section>
        <h3 class="section-title">Team · ${members.length}</h3>
        ${members.length ? `<ul class="member-list" role="list">
          ${members.map((m) => `<li class="user-cell">${avatarHTML(m, 'sm')}<span class="user-cell__name text-sm">${escapeHTML(m.name)}</span>${roleBadge(m.role)}</li>`).join('')}
        </ul>` : '<p class="text-sm text-subtle">No team members yet.</p>'}
      </section>
    </div>

    <section class="mt-6">
      <h3 class="section-title">Recently updated bugs</h3>
      ${recent.length ? `<ul class="bug-list" role="list">
        ${recent.map((bug) => `
          <li>
            <a class="bug-list__item" href="bug-details.html?id=${encodeURIComponent(bug.id)}">
              <span class="mono text-subtle">${bug.id}</span>
              <span class="bug-list__title">${escapeHTML(bug.title)}</span>
              ${badge(bug.priority)}
              ${badge(bug.status)}
            </a>
          </li>`).join('')}
      </ul>` : '<p class="text-sm text-subtle">No bugs reported for this project yet.</p>'}
    </section>`;
  openModal(els.viewModal);
}

/* ===================== Create / edit form ===================== */

function setupForm() {
  const form = els.form;
  form.elements.status.innerHTML = PROJECT_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('');

  form.elements.key.addEventListener('input', () => {
    form.elements.key.value = form.elements.key.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  form.elements.description.addEventListener('input', () => {
    document.getElementById('description-count').textContent = form.elements.description.value.length;
  });
  // Suggest a key from the name for new projects (Customer Portal -> CP)
  form.elements.name.addEventListener('input', () => {
    if (form.elements.id.value || form.dataset.keyTouched) return;
    form.elements.key.value = form.elements.name.value.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  });
  form.elements.key.addEventListener('keydown', () => { form.dataset.keyTouched = 'true'; });

  form.addEventListener('submit', handleFormSubmit);
}

function fillManagerSelect(project) {
  const select = els.form.elements.managerId;
  const hint = document.getElementById('manager-hint');
  const isAdmin = currentUser.role === ROLES.ADMIN;

  let managers = getUsers().filter((u) => u.status === 'Active' && (u.role === ROLES.PROJECT_MANAGER || u.role === ROLES.ADMIN));
  if (!isAdmin) managers = managers.filter((u) => u.id === currentUser.id);
  // Keep the current manager visible even if they were deactivated
  if (project && !managers.some((u) => u.id === project.managerId)) {
    const current = getUserById(project.managerId);
    if (current) managers.push(current);
  }

  select.innerHTML = managers.map((u) => `<option value="${u.id}">${escapeHTML(u.name)} (${u.role})</option>`).join('');
  select.value = project?.managerId || currentUser.id;
  select.disabled = !isAdmin;
  hint.textContent = isAdmin ? '' : 'Only admins can reassign the project manager.';
}

function fillMemberList(selectedIds = []) {
  const candidates = getUsers()
    .filter((u) => (u.role === ROLES.DEVELOPER || u.role === ROLES.TESTER) && (u.status === 'Active' || selectedIds.includes(u.id)))
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  document.getElementById('member-list').innerHTML = candidates.map((u) => `
    <label class="member-option">
      <input type="checkbox" name="memberIds" value="${u.id}" ${selectedIds.includes(u.id) ? 'checked' : ''}>
      ${avatarHTML(u, 'sm')}
      <span class="member-option__text">
        <span class="text-sm">${escapeHTML(u.name)}</span>
        <span class="text-xs text-subtle">${u.role}${u.status !== 'Active' ? ' · inactive' : ''}</span>
      </span>
    </label>`).join('');
}

function openFormModal(projectId = null) {
  const project = projectId ? getProjectById(projectId) : null;
  if (project && !canEditProject(currentUser, project)) {
    showToast('You can only edit projects you manage.', 'error');
    return;
  }
  if (!project && !hasPermission(currentUser, 'projects.create')) return;

  const form = els.form;
  form.reset();
  clearFormErrors(form);
  delete form.dataset.keyTouched;

  form.elements.id.value = project?.id || '';
  form.elements.name.value = project?.name || '';
  form.elements.key.value = project?.key || '';
  form.elements.description.value = project?.description || '';
  form.elements.status.value = project?.status || 'Active';
  document.getElementById('description-count').textContent = form.elements.description.value.length;
  fillManagerSelect(project);
  fillMemberList(project?.memberIds || []);

  document.getElementById('project-form-title').textContent = project ? `Edit ${project.name}` : 'New project';
  document.getElementById('project-form-subtitle').textContent = project
    ? `${project.id} · last updated ${formatDate(project.updatedAt)}`
    : 'Projects group bugs and the people who work on them.';
  document.getElementById('project-submit').textContent = project ? 'Save changes' : 'Create project';

  openModal(els.formModal);
  form.elements.name.focus();
}

function validateProject(data, existingId) {
  const errors = {};
  const others = getProjects().filter((p) => p.id !== existingId);

  if (data.name.length < 3) errors.name = 'Project name must be at least 3 characters.';
  else if (others.some((p) => p.name.toLowerCase() === data.name.toLowerCase())) errors.name = 'A project with this name already exists.';

  if (!/^[A-Z][A-Z0-9]{1,4}$/.test(data.key)) errors.key = 'Use 2–5 characters, starting with a letter.';
  else if (others.some((p) => p.key === data.key)) errors.key = `Key "${data.key}" is already used by another project.`;

  if (data.description.length < 10) errors.description = 'Description must be at least 10 characters.';
  if (!data.managerId) errors.managerId = 'Choose a project manager.';
  return errors;
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const form = els.form;
  const id = form.elements.id.value || null;
  const existing = id ? getProjectById(id) : null;

  const data = {
    name: form.elements.name.value.trim(),
    key: form.elements.key.value.trim().toUpperCase(),
    description: form.elements.description.value.trim(),
    status: form.elements.status.value,
    managerId: form.elements.managerId.value,
    memberIds: [...form.querySelectorAll('input[name="memberIds"]:checked')].map((input) => input.value),
  };

  if (!showFormErrors(form, validateProject(data, id))) return;

  // Confirm closing a project that still has open bugs
  const openBugs = existing ? getProjectStats(existing.id).open : 0;
  if (existing && data.status === 'Completed' && existing.status !== 'Completed' && openBugs > 0) {
    const ok = await confirmDialog({
      title: 'Mark project as completed?',
      message: `${existing.name} still has ${openBugs} open ${openBugs === 1 ? 'bug' : 'bugs'}. You can still change the status later.`,
      confirmText: 'Mark completed',
    });
    if (!ok) return;
  }

  if (existing) {
    updateProject(existing.id, data);
    showToast(`${data.name} was updated.`, 'success');
  } else {
    const created = addProject(data);
    showToast(`Project ${created.name} (${created.key}) created.`, 'success');
  }
  closeModal(els.formModal);
  render();
}
