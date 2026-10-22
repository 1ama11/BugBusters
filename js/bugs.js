/* ==========================================================================
   bugs.js — Bug Tracking Logic & Data Binding
   Reads bugs through the shared data layer (storage.js), so the Bug List,
   Report Bug, Bug Details, Dashboard and Reports all show the same bugs.
   Phase 1: the Report Bug form is validated but nothing is saved.
   Loaded as an ES module (<script type="module">).
   ========================================================================== */

import { getBugs, addBug, getProjects, getCurrentUser, getUserById } from './storage.js';
import { showDemoSaved, showFormErrors, clearFieldError } from './ui.js';

const BugStore = { getBugs, getProjects };

const CurrentUser = { get: getCurrentUser };

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function slugify(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, '-');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/* ================= BUG LIST PAGE ================= */
const BugsListPage = (() => {
  let allBugs = [];
  let projects = [];

  function init() {
    const tableBody = document.getElementById('bugsTableBody');
    if (!tableBody) return;

    try {
      allBugs = BugStore.getBugs() || [];
      projects = BugStore.getProjects() || [];
    } catch (err) {
      console.error(err);
      return;
    }

    bindEvents();
    render();
  }

  function bindEvents() {
    document.getElementById('bugSearchInput')?.addEventListener('input', render);
    document.getElementById('filterStatus')?.addEventListener('change', render);
    document.getElementById('filterSeverity')?.addEventListener('change', render);
    document.getElementById('filterPriority')?.addEventListener('change', render);
    document.getElementById('filterProject')?.addEventListener('change', render);
    document.getElementById('sortBugs')?.addEventListener('change', render);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
    document.getElementById('reportBugBtn')?.addEventListener('click', () => {
      window.location.href = 'report-bug.html';
    });
  }

  function clearFilters() {
    if (document.getElementById('bugSearchInput')) document.getElementById('bugSearchInput').value = '';
    if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
    if (document.getElementById('filterSeverity')) document.getElementById('filterSeverity').value = '';
    if (document.getElementById('filterPriority')) document.getElementById('filterPriority').value = '';
    if (document.getElementById('filterProject')) document.getElementById('filterProject').value = '';
    if (document.getElementById('sortBugs')) document.getElementById('sortBugs').value = 'newest';
    render();
  }

  function getFilteredSortedBugs() {
    const query = (document.getElementById('bugSearchInput')?.value || '').trim().toLowerCase();
    const status = document.getElementById('filterStatus')?.value || '';
    const severity = document.getElementById('filterSeverity')?.value || '';
    const priority = document.getElementById('filterPriority')?.value || '';
    const projectId = document.getElementById('filterProject')?.value || '';
    const sortBy = document.getElementById('sortBugs')?.value || 'newest';

    let result = allBugs.filter(bug => {
      const matchesQuery = !query ||
        bug.title?.toLowerCase().includes(query) ||
        bug.id?.toLowerCase().includes(query) ||
        bug.description?.toLowerCase().includes(query);
      const matchesStatus = !status || bug.status === status;
      const matchesSeverity = !severity || bug.severity === severity;
      const matchesPriority = !priority || bug.priority === priority;
      const matchesProject = !projectId || bug.projectId === projectId;
      return matchesQuery && matchesStatus && matchesSeverity && matchesProject && matchesPriority;
    });

    const severityRank = { Low: 1, Medium: 2, High: 3, Critical: 4 };
    const priorityRank = { Low: 1, Medium: 2, High: 3, Critical: 4 };

    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'priority':
        result.sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0));
        break;
      case 'severity':
        result.sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return result;
  }

  function getProjectName(bug) {
    if (bug.projectName) return bug.projectName;
    const p = projects.find(proj => proj.id === bug.projectId);
    return p ? p.name : bug.projectId || '—';
  }

  function render() {
    const tbody = document.getElementById('bugsTableBody');
    const wrapper = document.getElementById('bugsTableWrapper');
    const emptyState = document.getElementById('bugsEmptyState');
    if (!tbody) return;

    const bugs = getFilteredSortedBugs();
    tbody.innerHTML = '';

    if (bugs.length === 0) {
      if (wrapper) wrapper.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (wrapper) wrapper.style.display = '';
    if (emptyState) emptyState.style.display = 'none';

    bugs.forEach(bug => tbody.appendChild(buildRow(bug)));
  }

  function buildRow(bug) {
    const tr = document.createElement('tr');

    tr.appendChild(cell(bug.id, 'bug-id-cell'));
    tr.appendChild(cell(bug.title, 'bug-title-cell'));
    tr.appendChild(cell(getProjectName(bug)));

    tr.appendChild(badgeCell(bug.severity, 'severity'));
    tr.appendChild(badgeCell(bug.priority, 'priority'));
    tr.appendChild(badgeCell(bug.status, 'status'));

    tr.appendChild(cell(getUserById(bug.reportedBy)?.name || bug.reportedBy || '—'));
    tr.appendChild(cell(formatDate(bug.createdAt)));

    const actionTd = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn-view-bug';
    btn.textContent = 'View';
    btn.addEventListener('click', () => {
      window.location.href = `bug-details.html?id=${encodeURIComponent(bug.id)}`;
    });
    actionTd.appendChild(btn);
    tr.appendChild(actionTd);

    return tr;
  }

  function cell(text, className) {
    const td = document.createElement('td');
    if (className) td.className = className;
    td.textContent = text == null ? '—' : text;
    return td;
  }

  function badgeCell(value, type) {
    const td = document.createElement('td');
    const span = document.createElement('span');
    span.className = `badge badge-${type}-${slugify(value)}`;
    span.textContent = value || '—';
    td.appendChild(span);
    return td;
  }

  return { init };
})();

/* ================= REPORT BUG PAGE ================= */
const ReportBugPage = (() => {
  let isSubmitting = false;

  function init() {
    const form = document.getElementById('reportBugForm');
    if (!form) return;

    populateProjects();
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('input', (e) => clearFieldError(e.target));
    form.addEventListener('change', (e) => clearFieldError(e.target));
    document.getElementById('cancelBugBtn')?.addEventListener('click', () => {
      window.location.href = 'bugs.html';
    });
  }

  function populateProjects() {
    const sel = document.getElementById('bugProject');
    if (!sel) return;
    const projects = BugStore.getProjects() || [];
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }

  function validate(data) {
    const errors = {};
    if (!data.title.trim()) errors.title = 'Title is required.';
    if (!data.description.trim()) errors.description = 'Description is required.';
    if (!data.severity) errors.severity = 'Please select a severity.';
    if (!data.priority) errors.priority = 'Please select a priority.';
    if (!data.projectId) errors.projectId = 'Please select a project.';
    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.target;
    const data = {
      title: form.title.value,
      description: form.description.value,
      stepsToReproduce: form.stepsToReproduce ? form.stepsToReproduce.value : '',
      expectedResult: form.expectedResult ? form.expectedResult.value : '',
      actualResult: form.actualResult ? form.actualResult.value : '',
      severity: form.severity.value,
      priority: form.priority.value,
      projectId: form.projectId.value
    };

    // Shows each message under its field; returns false if there are errors
    if (!showFormErrors(form, validate(data))) return;

    isSubmitting = true;
    const user = CurrentUser.get();

    // Phase 1: addBug saves nothing. Phase 2: the server fills in the id, status,
    // timestamps and history, and this can go to bugs.html again.
    addBug({
      title: data.title.trim(),
      description: data.description.trim(),
      severity: data.severity,
      priority: data.priority,
      projectId: data.projectId
    }, user?.id);

    showDemoSaved(`Bug "${data.title.trim()}" reported.`);
    form.reset();
    isSubmitting = false;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  BugsListPage.init();
  ReportBugPage.init();
});