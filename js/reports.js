/**
 * Reports & Analytics — resolution stats, trend + severity charts, per-project breakdown.
 * Owned by Person 2. Charts use Chart.js (loaded as a global in reports.html).
 */
import { initLayout } from './app.js';
import { getBugs, getProjects, getProjectStats } from './storage.js';
import { BUG_SEVERITIES, OPEN_BUG_STATUSES } from './mock-data.js';
import { escapeHTML, emptyStateHTML, parseDate } from './ui.js';

const TREND_MONTHS = 6;
const DONE_STATUSES = ['Resolved', 'Closed'];
const DAY_MS = 24 * 60 * 60 * 1000;

// Same colour per severity as the badges (Low neutral, Medium info, High warning, Critical danger)
const SEVERITY_TOKENS = {
  Low: '--color-neutral',
  Medium: '--color-info',
  High: '--color-warning',
  Critical: '--color-danger',
};

const charts = {};

const user = initLayout({ pageId: 'reports' });
if (user) {
  const bugs = getBugs();
  renderStats(bugs);
  renderProjects();
  renderCharts(bugs);
}

/* ===================== Stats ===================== */

/** When a bug was first marked Resolved/Closed, from its history. */
function resolvedAt(bug) {
  const entry = (bug.history || []).find((h) => h.type === 'status' && DONE_STATUSES.includes(h.to));
  return entry ? parseDate(entry.at) : null;
}

function renderStats(bugs) {
  const resolutionDays = bugs
    .map((bug) => {
      const created = parseDate(bug.createdAt);
      const resolved = resolvedAt(bug);
      return created && resolved ? (resolved - created) / DAY_MS : null;
    })
    .filter((days) => days !== null);

  const avgDays = resolutionDays.length
    ? resolutionDays.reduce((sum, days) => sum + days, 0) / resolutionDays.length
    : null;
  const criticalOpen = bugs.filter((b) => b.severity === 'Critical' && OPEN_BUG_STATUSES.includes(b.status)).length;
  const weekAgo = Date.now() - 7 * DAY_MS;
  const reportedThisWeek = bugs.filter((b) => parseDate(b.createdAt)?.getTime() >= weekAgo).length;
  const done = bugs.filter((b) => DONE_STATUSES.includes(b.status)).length;

  document.getElementById('stat-resolution').textContent = avgDays === null ? '—' : `${avgDays.toFixed(1)} days`;
  document.getElementById('stat-critical').textContent = criticalOpen;
  document.getElementById('stat-week').textContent = reportedThisWeek;
  document.getElementById('stat-rate').textContent = bugs.length ? `${Math.round((done / bugs.length) * 100)}%` : '—';
  document.getElementById('stat-rate-hint').textContent = `${done} of ${bugs.length} resolved or closed`;
}

/* ===================== Projects table ===================== */

function renderProjects() {
  const projects = getProjects();
  const body = document.getElementById('project-rows');

  if (!projects.length) {
    document.getElementById('project-table').replaceWith(
      Object.assign(document.createElement('div'), { innerHTML: emptyStateHTML('No projects yet', '', 'folder') }),
    );
    return;
  }

  body.innerHTML = projects.map((project) => {
    const stats = getProjectStats(project.id);
    return `
      <tr>
        <td><a href="bugs.html?project=${encodeURIComponent(project.id)}">${escapeHTML(project.name)}</a></td>
        <td class="num">${stats.total}</td>
        <td class="num">${stats.open}</td>
        <td class="num">${stats.bugs.filter((b) => b.severity === 'Critical' && OPEN_BUG_STATUSES.includes(b.status)).length}</td>
        <td>
          <div class="report-progress">
            <div class="progress"><div class="progress__bar" style="width:${stats.percentDone}%"></div></div>
            <span class="text-xs text-muted">${stats.percentDone}%</span>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ===================== Charts ===================== */

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** The last TREND_MONTHS months as { key: 'YYYY-MM', label: 'Oct' }, oldest first. */
function lastMonths() {
  const now = new Date();
  return Array.from({ length: TREND_MONTHS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });
}

function monthKey(date) {
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : null;
}

function renderCharts(bugs) {
  if (typeof window.Chart === 'undefined') {
    document.querySelectorAll('.chart-box').forEach((box) => {
      box.innerHTML = emptyStateHTML('Chart unavailable', 'Charts need an internet connection to load Chart.js.', 'chart');
    });
    return;
  }

  Object.values(charts).forEach((chart) => chart.destroy());

  const text = cssVar('--color-text-muted');
  const grid = cssVar('--color-border');
  window.Chart.defaults.font.family = cssVar('--font-sans');
  window.Chart.defaults.color = text;

  const months = lastMonths();
  const reported = months.map(({ key }) => bugs.filter((b) => monthKey(parseDate(b.createdAt)) === key).length);
  const resolved = months.map(({ key }) => bugs.filter((b) => monthKey(resolvedAt(b)) === key).length);
  const reportedColor = cssVar('--color-secondary');
  const resolvedColor = cssVar('--color-success');

  charts.trend = new window.Chart(document.getElementById('trend-chart'), {
    type: 'line',
    data: {
      labels: months.map((m) => m.label),
      datasets: [
        { label: 'Reported', data: reported, borderColor: reportedColor, backgroundColor: reportedColor, tension: 0.3, pointRadius: 3 },
        { label: 'Resolved', data: resolved, borderColor: resolvedColor, backgroundColor: resolvedColor, tension: 0.3, pointRadius: 3 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12 } } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: grid } },
      },
    },
  });

  charts.severity = new window.Chart(document.getElementById('severity-chart'), {
    type: 'doughnut',
    data: {
      labels: BUG_SEVERITIES,
      datasets: [{
        data: BUG_SEVERITIES.map((s) => bugs.filter((b) => b.severity === s).length),
        backgroundColor: BUG_SEVERITIES.map((s) => cssVar(SEVERITY_TOKENS[s])),
        borderColor: cssVar('--color-surface'),
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12 } } },
    },
  });
}