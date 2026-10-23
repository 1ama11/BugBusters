/**
 * Dashboard — overview cards, status breakdown, my open bugs and recent activity.
 * Owned by Person 2.
 */
import { initLayout } from './app.js';
import { getBugs, getBugsAssignedTo, getUserById } from './storage.js';
import { hasPermission } from './auth.js';
import { BUG_STATUSES, OPEN_BUG_STATUSES } from './mock-data.js';
import { badge, escapeHTML, emptyStateHTML, timeAgo, parseDate } from './ui.js';

const RECENT_ACTIVITY_LIMIT = 6;

// Matches the badge colours used for each status elsewhere in the app
const STATUS_BAR_COLORS = {
  Open: 'var(--color-info)',
  'In Progress': 'var(--color-warning)',
  Resolved: 'var(--color-success)',
  Closed: 'var(--color-neutral)',
  Reopened: 'var(--color-danger)',
};

const user = initLayout({ pageId: 'dashboard' });
if (user) render(user);

function render(currentUser) {
  const bugs = getBugs();

  document.getElementById('welcome-title').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}`;
  document.getElementById('report-bug-btn').hidden = !hasPermission(currentUser, 'bugs.report');

  renderStats(bugs);
  renderStatusBreakdown(bugs);
  renderMyBugs(currentUser);
  renderActivity(bugs);
}

function countBy(bugs, status) {
  return bugs.filter((bug) => bug.status === status).length;
}

function renderStats(bugs) {
  const open = bugs.filter((bug) => OPEN_BUG_STATUSES.includes(bug.status));
  const criticalOpen = open.filter((bug) => bug.severity === 'Critical').length;

  document.getElementById('stat-total').textContent = bugs.length;
  document.getElementById('stat-open').textContent = open.length;
  document.getElementById('stat-resolved').textContent = countBy(bugs, 'Resolved');
  document.getElementById('stat-closed').textContent = countBy(bugs, 'Closed');
  document.getElementById('stat-open-hint').textContent = criticalOpen
    ? `${criticalOpen} critical`
    : 'No critical bugs open';
}

function renderStatusBreakdown(bugs) {
  const list = document.getElementById('status-breakdown');
  if (!bugs.length) {
    list.innerHTML = emptyStateHTML('No bugs yet', 'Reported bugs will show up here.', 'bug');
    return;
  }

  list.innerHTML = BUG_STATUSES.map((status) => {
    const count = countBy(bugs, status);
    const percent = Math.round((count / bugs.length) * 100);
    return `
      <li class="status-bar">
        <div class="status-bar__label">
          <span>${escapeHTML(status)}</span>
          <span class="text-muted">${count} <span class="text-subtle">· ${percent}%</span></span>
        </div>
        <div class="progress" role="progressbar" aria-label="${escapeHTML(status)}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress__bar" style="width:${percent}%; background:${STATUS_BAR_COLORS[status]}"></div>
        </div>
      </li>`;
  }).join('');
}

function renderMyBugs(currentUser) {
  const mine = getBugsAssignedTo(currentUser.id)
    .filter((bug) => OPEN_BUG_STATUSES.includes(bug.status))
    .sort((a, b) => parseDate(b.updatedAt) - parseDate(a.updatedAt));

  document.getElementById('my-bugs-count').textContent = mine.length;
  const container = document.getElementById('my-bugs');

  if (!mine.length) {
    container.innerHTML = emptyStateHTML('Nothing assigned to you', 'Open bugs assigned to you will appear here.', 'check-circle');
    return;
  }

  container.innerHTML = `
    <ul class="dash-bug-list" role="list">
      ${mine.map((bug) => `
        <li>
          <a class="dash-bug-list__item" href="bug-details.html?id=${encodeURIComponent(bug.id)}">
            <span class="mono text-subtle">${escapeHTML(bug.id)}</span>
            <span class="dash-bug-list__title">${escapeHTML(bug.title)}</span>
            ${badge(bug.priority)}
            ${badge(bug.status)}
          </a>
        </li>`).join('')}
    </ul>`;
}

/** One sentence describing a history entry, e.g. "moved BUG-002 to In Progress". */
function describeActivity(entry, bug) {
  const bugLink = `<a href="bug-details.html?id=${encodeURIComponent(bug.id)}"><strong>${escapeHTML(bug.id)}</strong></a>`;
  switch (entry.type) {
    case 'created':
      return `reported ${bugLink}`;
    case 'status':
      return `moved ${bugLink} to <strong>${escapeHTML(entry.to)}</strong>`;
    case 'assignment': {
      const assignee = getUserById(entry.to);
      return assignee
        ? `assigned ${bugLink} to <strong>${escapeHTML(assignee.name)}</strong>`
        : `unassigned ${bugLink}`;
    }
    default:
      return `changed the ${escapeHTML(entry.field || entry.type)} of ${bugLink}`;
  }
}

function renderActivity(bugs) {
  const entries = bugs
    .flatMap((bug) => (bug.history || []).map((entry) => ({ entry, bug })))
    .sort((a, b) => parseDate(b.entry.at) - parseDate(a.entry.at))
    .slice(0, RECENT_ACTIVITY_LIMIT);

  const list = document.getElementById('activity-list');
  if (!entries.length) {
    list.innerHTML = emptyStateHTML('No activity yet', '', 'inbox');
    return;
  }

  list.innerHTML = entries.map(({ entry, bug }) => {
    const actor = getUserById(entry.by);
    return `
      <li class="activity">
        <p class="activity__text"><strong>${escapeHTML(actor?.name || 'Someone')}</strong> ${describeActivity(entry, bug)}</p>
        <p class="activity__time text-xs text-subtle">${escapeHTML(timeAgo(entry.at))}</p>
      </li>`;
  }).join('');
}