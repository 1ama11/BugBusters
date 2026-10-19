/**
 * bug-details.js — Bug Details page (Person 4)
 * Opened as bug-details.html?id=BUG-001 (linked from All Bugs, Dashboard, Projects…).
 * Add #comments or #history to the URL to jump straight to that section.
 *
 * What the page does, and who may do it (the rules themselves live in auth.js):
 *   - full bug information + status progress bar      everyone
 *   - change status (see STATUS_FLOW below)           canUpdateBug()
 *   - assign a developer and set a deadline           'bugs.assign'
 *   - attach screenshots / files                      canUpdateBug() or 'bugs.report'
 *   - comments & discussion                           everyone
 *   - status-history timeline (from bug.history)      everyone
 *
 * Attachments are stored in bug.attachments with this shape
 * (Person 3's Report Bug form can use the same one):
 *   { id: 'ATT-001', name, type, size, dataUrl, uploadedBy, uploadedAt }
 */

import { initLayout } from './app.js';
import {
  getBugs,
  getBugById,
  updateBug,
  addComment,
  getUsers,
  getUserById,
  getProjectById,
  getSystemSettings,
  generateId,
  nowISO,
  STORAGE_KEYS,
} from './storage.js';
import { hasPermission, canUpdateBug } from './auth.js';
import { ROLES, OPEN_BUG_STATUSES } from './mock-data.js';
import {
  icon,
  escapeHTML,
  badge,
  roleBadge,
  avatarHTML,
  formatDate,
  timeAgo,
  parseDate,
  emptyStateHTML,
  openModal,
  closeModal,
  confirmDialog,
  showToast,
  setFieldError,
  clearFieldError,
  clearFormErrors,
  getQueryParam,
} from './ui.js';

const currentUser = initLayout({ pageId: 'bugs', title: 'Bug Details' });
const bugId = getQueryParam('id');
let bug = null;

/* ===================== Config ===================== */

/** The main path shown in the progress bar. "Reopened" takes the place of "Open". */
const STATUS_STEPS = ['Open', 'In Progress', 'Resolved', 'Closed'];

/** Which statuses a bug may move to from its current status. */
const STATUS_FLOW = {
  Open: ['In Progress', 'Resolved', 'Closed'],
  'In Progress': ['Resolved', 'Open'],
  Resolved: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Reopened: ['In Progress', 'Resolved'],
};

const STATUS_ACTIONS = {
  'In Progress': { label: 'Start progress', icon: 'arrow-right', placeholder: 'e.g. Investigating the auth service logs' },
  Resolved: { label: 'Mark as resolved', icon: 'check-circle', placeholder: 'e.g. Fixed in v2.1, added a null check' },
  Closed: { label: 'Close bug', icon: 'lock', placeholder: 'e.g. Verified on staging' },
  Reopened: { label: 'Reopen bug', icon: 'refresh', placeholder: 'What still fails? e.g. Still happens on Android 15' },
  Open: { label: 'Move back to Open', icon: 'arrow-left', placeholder: 'Why is work on this bug stopping?' },
};

/** Moving to these statuses needs a reason, so the next person knows why. */
const NOTE_REQUIRED = ['Reopened'];

/** Colour of each status in the timeline (same colours as the shared badges). */
const STATUS_TONES = { Open: 'info', 'In Progress': 'warning', Resolved: 'success', Closed: 'neutral', Reopened: 'danger' };

const COMMENT_MAX = 1000;
const IMAGE_MAX_SIDE = 1600; // px: screenshots are scaled down to save localStorage space
const RESIZABLE_IMAGES = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];

/* Extra icons this page needs (same 24x24 stroke style as ICON_PATHS in ui.js) */
const PAGE_ICONS = {
  'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  paperclip: '<path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
};

function pageIcon(name, size = 18) {
  if (!PAGE_ICONS[name]) return icon(name, size);
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PAGE_ICONS[name]}</svg>`;
}

/* ===================== Elements ===================== */

const byId = (id) => document.getElementById(id);

const els = {
  page: byId('bug-page'),
  missing: byId('bug-missing'),
  crumbProject: byId('crumb-project'),
  crumbBug: byId('crumb-bug'),
  id: byId('bug-id'),
  title: byId('bug-title'),
  badges: byId('bug-badges'),
  meta: byId('bug-meta'),
  jumpComments: byId('jump-comments'),
  copyLink: byId('copy-link'),
  steps: byId('status-steps'),
  description: byId('bug-description'),
  attachCard: byId('attachments'),
  attachSubtitle: byId('attach-subtitle'),
  attachList: byId('attach-list'),
  attachEmpty: byId('attach-empty'),
  attachBtn: byId('attach-btn'),
  attachInput: byId('attach-input'),
  dropzone: byId('dropzone'),
  dropzoneHint: byId('dropzone-hint'),
  historySummary: byId('history-summary'),
  timeline: byId('timeline'),
  commentsCount: byId('comments-count'),
  commentList: byId('comment-list'),
  commentForm: byId('comment-form'),
  commentText: byId('comment-text'),
  commentCounter: byId('comment-counter'),
  statusCurrent: byId('status-current'),
  statusActions: byId('status-actions'),
  assignSummary: byId('assign-summary'),
  assignReadonly: byId('assign-readonly'),
  assignForm: byId('assign-form'),
  details: byId('bug-details'),
  statusModal: byId('status-modal'),
  statusForm: byId('status-form'),
  statusTitle: byId('status-modal-title'),
  statusSubtitle: byId('status-modal-subtitle'),
  statusPreview: byId('status-preview'),
  statusNoteLabel: byId('status-note-label'),
  statusNote: byId('status-note'),
  statusSubmit: byId('status-submit'),
  previewModal: byId('preview-modal'),
  previewTitle: byId('preview-title'),
  previewMeta: byId('preview-meta'),
  previewImg: byId('preview-img'),
  previewDownload: byId('preview-download'),
};

/* ===================== Start ===================== */

if (currentUser) {
  bug = bugId ? getBugById(bugId) : null;
  if (!bug) {
    renderMissing();
  } else {
    setupHeader();
    setupStatus();
    setupAssignment();
    setupAttachments();
    setupComments();
    setupModals();
    render();

    // The page was hidden while loading, so the browser couldn't scroll to #comments by itself
    if (window.location.hash) byId(window.location.hash.slice(1))?.scrollIntoView();

    // Another tab changed the bugs (e.g. a teammate's page): show the latest version
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEYS.BUGS) refresh();
    });
  }
}

/* ===================== Small helpers ===================== */

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function todayISO() {
  return nowISO().slice(0, 10);
}

/** <time> showing "3 days ago", with the full date on hover. */
function timeHTML(value) {
  if (!value) return '—';
  return `<time datetime="${escapeHTML(value)}" title="${escapeHTML(formatDate(value, { time: true }))}">${escapeHTML(timeAgo(value))}</time>`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}

function humanDuration(from, to) {
  const minutes = Math.max(0, Math.round((to - from) / 60_000));
  if (minutes < 60) return plural(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 48) return plural(hours, 'hour');
  return plural(Math.round(hours / 24), 'day');
}

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Latest time the bug entered `status`, from its history. */
function lastReached(status) {
  const entry = [...(bug.history || [])].reverse()
    .find((h) => (h.type === 'status' || h.type === 'created') && h.to === status);
  return entry?.at || null;
}

/** When the bug was last resolved or closed (used for resolution time and deadlines). */
function lastFinishedAt() {
  const entry = [...(bug.history || [])].reverse()
    .find((h) => h.type === 'status' && (h.to === 'Resolved' || h.to === 'Closed'));
  return entry?.at || bug.updatedAt || bug.createdAt;
}

function isOpen() {
  return OPEN_BUG_STATUSES.includes(bug.status);
}

/** Statuses the current user may move this bug to. */
function allowedStatuses() {
  if (!canUpdateBug(currentUser, bug)) return [];
  const next = STATUS_FLOW[bug.status] || [];
  // Closing confirms the fix was verified, so developers leave that to testers / PMs
  return currentUser.role === ROLES.DEVELOPER ? next.filter((status) => status !== 'Closed') : next;
}

function canAttach() {
  return canUpdateBug(currentUser, bug) || hasPermission(currentUser, 'bugs.report');
}

/** "Overdue by 2 days", "Due today", "Finished on time"… plus the badge colour. */
function deadlineStatus() {
  const due = parseDate(bug.deadline);
  if (!due) return null;
  if (!isOpen()) {
    const late = daysBetween(due, parseDate(lastFinishedAt()) || new Date());
    return late > 0
      ? { text: `Finished ${plural(late, 'day')} late`, variant: 'warning' }
      : { text: 'Finished on time', variant: 'success' };
  }
  const left = daysBetween(new Date(), due);
  if (left < 0) return { text: `Overdue by ${plural(-left, 'day')}`, variant: 'danger' };
  if (left === 0) return { text: 'Due today', variant: 'warning' };
  if (left === 1) return { text: 'Due tomorrow', variant: 'warning' };
  return { text: `Due in ${plural(left, 'day')}`, variant: left <= 3 ? 'warning' : 'neutral' };
}

/**
 * Run a storage change, then re-render. localStorage throws when it is full
 * (big attachments), so the error is caught and shown instead of breaking the page.
 */
function save(action, successMessage) {
  try {
    action();
  } catch (error) {
    console.error(error);
    const full = error?.name === 'QuotaExceededError';
    showToast(full
      ? 'Browser storage is full. Remove some attachments and try again.'
      : 'Could not save your changes. Please try again.', 'error');
    return false;
  }
  if (successMessage) showToast(successMessage, 'success');
  refresh();
  return true;
}

/* ===================== Rendering ===================== */

function refresh() {
  bug = getBugById(bugId);
  if (!bug) renderMissing();
  else render();
}

function render() {
  els.missing.hidden = true;
  els.page.hidden = false;
  renderHeader();
  renderSteps();
  els.description.textContent = bug.description || 'No description provided.';
  renderAttachments();
  renderTimeline();
  renderComments();
  renderStatusCard();
  renderAssignment();
  renderDetails();
  document.title = `${bug.id}: ${bug.title} · ${getSystemSettings().appName}`;
}

function renderMissing() {
  els.page.hidden = true;
  els.missing.hidden = false;
  const message = bugId
    ? `There is no bug with the ID "${bugId}". It may have been deleted.`
    : 'No bug was selected. Open a bug from the All Bugs list.';
  els.missing.innerHTML = `
    ${emptyStateHTML('Bug not found', message, 'bug')}
    <div class="bug-missing__actions">
      <a class="btn btn--primary" href="bugs.html">${pageIcon('arrow-left', 16)}<span>Back to All Bugs</span></a>
    </div>`;
}

function renderHeader() {
  const project = getProjectById(bug.projectId);
  const reporter = getUserById(bug.reportedBy);
  const comments = bug.comments || [];

  els.crumbProject.innerHTML = project
    ? `<a href="projects.html?id=${encodeURIComponent(project.id)}">${escapeHTML(project.name)}</a>`
    : '<span>No project</span>';
  els.crumbBug.textContent = bug.id;

  els.id.textContent = bug.id;
  els.title.textContent = bug.title || 'Untitled bug';
  els.badges.innerHTML = `
    ${badge(bug.status)}
    <span class="bug-chip"><span class="bug-chip__label">Severity</span>${badge(bug.severity)}</span>
    <span class="bug-chip"><span class="bug-chip__label">Priority</span>${badge(bug.priority)}</span>`;
  els.meta.innerHTML = `Reported by <strong>${escapeHTML(reporter?.name || 'Unknown user')}</strong>
    ${timeHTML(bug.createdAt)} · Updated ${timeHTML(bug.updatedAt)}`;

  els.jumpComments.innerHTML = `${pageIcon('message', 16)}<span>${comments.length}</span>`;
  els.jumpComments.setAttribute('aria-label', `Jump to comments (${plural(comments.length, 'comment')})`);
}

function renderSteps() {
  const reopened = bug.status === 'Reopened';
  const current = reopened ? 0 : STATUS_STEPS.indexOf(bug.status);

  els.steps.innerHTML = STATUS_STEPS.map((step, index) => {
    const label = index === 0 && reopened ? 'Reopened' : step;
    const state = index < current ? 'done' : index === current ? 'current' : 'todo';
    const reachedAt = state === 'todo' ? null : lastReached(label);
    const classes = ['status-step', `status-step--${state}`, index === 0 && reopened ? 'status-step--reopened' : ''].join(' ');
    return `
      <li class="${classes}" ${state === 'current' ? 'aria-current="step"' : ''}>
        <span class="status-step__dot">${state === 'done' ? icon('check', 14) : index + 1}</span>
        <span class="status-step__text">
          <span class="status-step__label">${escapeHTML(label)}</span>
          <span class="status-step__date">${reachedAt ? escapeHTML(formatDate(reachedAt)) : ''}</span>
        </span>
      </li>`;
  }).join('');
}

/* --- Attachments --- */

function safeDataUrl(attachment) {
  return typeof attachment.dataUrl === 'string' && attachment.dataUrl.startsWith('data:') ? attachment.dataUrl : '';
}

function attachmentHTML(attachment) {
  const url = safeDataUrl(attachment);
  const isImage = String(attachment.type || '').startsWith('image/') && url;
  const uploader = getUserById(attachment.uploadedBy);
  const canRemove = canUpdateBug(currentUser, bug) || attachment.uploadedBy === currentUser.id;
  const name = escapeHTML(attachment.name);
  const extension = (String(attachment.name).split('.').pop() || 'file').slice(0, 4).toUpperCase();

  const thumb = isImage
    ? `<button type="button" class="attach-item__thumb" data-preview="${escapeHTML(attachment.id)}" aria-label="Preview ${name}">
         <img src="${escapeHTML(url)}" alt="" loading="lazy">
       </button>`
    : `<div class="attach-item__thumb attach-item__thumb--file">${pageIcon('file', 28)}<span class="attach-item__ext">${escapeHTML(extension)}</span></div>`;

  return `
    <li class="attach-item">
      ${thumb}
      <div class="attach-item__info">
        <p class="attach-item__name" title="${name}">${name}</p>
        <p class="attach-item__meta">${formatSize(attachment.size)} · ${escapeHTML(uploader?.name || 'Unknown')} · ${timeHTML(attachment.uploadedAt)}</p>
      </div>
      <div class="attach-item__actions">
        ${url ? `<a class="icon-btn icon-btn--sm" href="${escapeHTML(url)}" download="${name}" title="Download" aria-label="Download ${name}">${pageIcon('download', 16)}</a>` : ''}
        ${canRemove ? `<button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-remove="${escapeHTML(attachment.id)}" title="Remove" aria-label="Remove ${name}">${pageIcon('trash', 16)}</button>` : ''}
      </div>
    </li>`;
}

function renderAttachments() {
  const attachments = bug.attachments || [];
  const allowed = canAttach();
  const { maxAttachmentSizeMB } = getSystemSettings();

  els.attachSubtitle.textContent = attachments.length
    ? `${plural(attachments.length, 'file')} attached`
    : 'Screenshots, logs and other files';
  els.attachList.innerHTML = attachments.map(attachmentHTML).join('');
  els.attachList.hidden = attachments.length === 0;

  // Users who can't attach see an empty state; everyone else sees the drop zone instead
  els.attachEmpty.hidden = attachments.length > 0 || allowed;
  els.attachBtn.hidden = !allowed;
  els.dropzone.hidden = !allowed;
  els.dropzoneHint.textContent = `Images, PDFs, logs… up to ${maxAttachmentSizeMB} MB each. You can also paste a screenshot with Ctrl + V.`;
}

/* --- Timeline --- */

function timelineItemHTML(entry) {
  const actor = getUserById(entry.by);
  const who = `<strong>${escapeHTML(actor?.name || 'Someone')}</strong>`;
  const userName = (id) => `<strong>${escapeHTML(getUserById(id)?.name || 'Unknown user')}</strong>`;
  const date = (value) => `<strong>${escapeHTML(formatDate(value))}</strong>`;
  const arrow = icon('arrow-right', 12, 'timeline__arrow');
  let text;
  let tone = 'neutral';
  let iconName = 'edit';

  switch (entry.type) {
    case 'created':
      text = `${who} reported this bug`;
      tone = 'info';
      iconName = 'bug';
      break;
    case 'status':
      text = `${who} changed the status ${entry.from ? badge(entry.from) : ''} ${arrow} ${badge(entry.to)}`;
      tone = STATUS_TONES[entry.to] || 'neutral';
      iconName = STATUS_ACTIONS[entry.to]?.icon || 'refresh';
      break;
    case 'assignment':
      if (!entry.from) text = `${who} assigned this bug to ${userName(entry.to)}`;
      else if (!entry.to) text = `${who} unassigned ${userName(entry.from)}`;
      else text = `${who} reassigned this bug from ${userName(entry.from)} to ${userName(entry.to)}`;
      tone = 'primary';
      iconName = 'user-check';
      break;
    case 'priority':
    case 'severity':
      text = `${who} changed the ${entry.type} ${entry.from ? badge(entry.from) : ''} ${arrow} ${badge(entry.to)}`;
      tone = 'warning';
      iconName = 'arrow-up-down';
      break;
    case 'deadline':
      if (!entry.from) text = `${who} set the deadline to ${date(entry.to)}`;
      else if (!entry.to) text = `${who} removed the deadline`;
      else text = `${who} moved the deadline from ${date(entry.from)} to ${date(entry.to)}`;
      iconName = 'calendar';
      break;
    default:
      text = `${who} updated this bug`;
  }

  const showNote = entry.note && !(entry.type === 'created' && entry.note === 'Bug reported');
  return `
    <li class="timeline__item">
      <span class="timeline__marker tone--${tone}">${pageIcon(iconName, 15)}</span>
      <div class="timeline__content">
        <p class="timeline__text">${text}</p>
        <p class="timeline__time">${escapeHTML(formatDate(entry.at, { time: true }))} · ${escapeHTML(timeAgo(entry.at))}</p>
        ${showNote ? `<p class="timeline__note">${escapeHTML(entry.note)}</p>` : ''}
      </div>
    </li>`;
}

function renderTimeline() {
  const history = [...(bug.history || [])].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const created = parseDate(bug.createdAt);
  let age = '';
  if (created) {
    age = isOpen()
      ? ` · open for ${humanDuration(created, new Date())}`
      : ` · ${String(bug.status).toLowerCase()} after ${humanDuration(created, parseDate(lastFinishedAt()) || new Date())}`;
  }

  els.historySummary.textContent = `${plural(history.length, 'event')}${age}`;
  els.timeline.innerHTML = history.length
    ? history.map(timelineItemHTML).join('')
    : `<li>${emptyStateHTML('No history yet', 'Status changes and assignments will appear here.', 'layers')}</li>`;
}

/* --- Comments --- */

function commentHTML(comment) {
  const author = getUserById(comment.userId);
  const tags = [];
  if (comment.userId === bug.reportedBy) tags.push('Reporter');
  if (comment.userId === bug.assignedTo) tags.push('Assignee');
  const mine = comment.userId === currentUser.id;

  return `
    <li class="comment ${mine ? 'comment--mine' : ''}" id="${escapeHTML(comment.id)}">
      ${avatarHTML(author, 'md')}
      <div class="comment__bubble">
        <div class="comment__header">
          <span class="comment__author">${escapeHTML(author?.name || 'Deleted user')}${mine ? ' <span class="text-subtle">(you)</span>' : ''}</span>
          ${author ? roleBadge(author.role) : ''}
          ${tags.map((tag) => `<span class="comment__tag">${tag}</span>`).join('')}
          <span class="comment__time">${timeHTML(comment.createdAt)}</span>
        </div>
        <p class="comment__text">${escapeHTML(comment.text)}</p>
      </div>
    </li>`;
}

function renderComments() {
  const comments = [...(bug.comments || [])].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const last = comments[comments.length - 1];

  els.commentsCount.innerHTML = comments.length
    ? `${plural(comments.length, 'comment')} · last ${timeHTML(last.createdAt)}`
    : 'No comments yet';
  els.commentList.innerHTML = comments.length
    ? comments.map(commentHTML).join('')
    : `<li>${emptyStateHTML('Start the discussion', 'Ask a question, share what you found or post an update for the team.', 'inbox')}</li>`;
}

/* --- Side column --- */

function renderStatusCard() {
  const since = lastReached(bug.status) || bug.createdAt;
  els.statusCurrent.innerHTML = `${badge(bug.status)}<span class="text-sm text-subtle">since ${timeHTML(since)}</span>`;

  if (!canUpdateBug(currentUser, bug)) {
    els.statusActions.innerHTML = `<p class="status-hint">${icon('lock', 14)}<span>Only the assigned developer, the tester who reported it, or a project manager can change the status.</span></p>`;
    return;
  }

  const buttons = allowedStatuses().map((status, index) => `
    <button type="button" class="btn ${index === 0 ? 'btn--primary' : 'btn--secondary'} btn--block status-actions__btn" data-status="${escapeHTML(status)}">
      ${pageIcon(STATUS_ACTIONS[status].icon, 16)}<span>${escapeHTML(STATUS_ACTIONS[status].label)}</span>
    </button>`).join('');
  const developerHint = currentUser.role === ROLES.DEVELOPER && STATUS_FLOW[bug.status]?.includes('Closed')
    ? `<p class="status-hint">${icon('info', 14)}<span>A tester or project manager closes the bug after verifying the fix.</span></p>`
    : '';

  els.statusActions.innerHTML = (buttons + developerHint) || '<p class="status-hint">No further status changes are available.</p>';
}

function developerOptionsHTML(selectedId) {
  const project = getProjectById(bug.projectId);
  const developers = getUsers()
    .filter((u) => (u.role === ROLES.DEVELOPER && u.status === 'Active') || u.id === selectedId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const team = developers.filter((u) => project?.memberIds.includes(u.id));
  const others = developers.filter((u) => !team.includes(u));

  const option = (u) => `<option value="${escapeHTML(u.id)}" ${u.id === selectedId ? 'selected' : ''}>
    ${escapeHTML(u.name)}${u.status !== 'Active' ? ' (inactive)' : ''}</option>`;
  const group = (label, users) => (users.length ? `<optgroup label="${escapeHTML(label)}">${users.map(option).join('')}</optgroup>` : '');

  return `<option value="">Unassigned</option>
    ${group(project ? `${project.name} team` : 'Project team', team)}
    ${group(team.length ? 'Other developers' : 'Developers', others)}`;
}

function renderAssignment() {
  const assignee = getUserById(bug.assignedTo);
  const due = deadlineStatus();

  els.assignSummary.innerHTML = `
    <div class="user-cell">
      ${avatarHTML(assignee, 'md')}
      <div class="user-cell__text">
        <span class="user-cell__name">${assignee ? escapeHTML(assignee.name) : 'Unassigned'}</span>
        <span class="user-cell__meta">${assignee ? escapeHTML(assignee.jobTitle || assignee.role) : 'No developer assigned yet'}</span>
      </div>
    </div>
    <p class="deadline-row">
      ${pageIcon('clock', 16)}
      ${due
        ? `<span>Due <strong>${escapeHTML(formatDate(bug.deadline))}</strong></span>${badge(due.text, due.variant)}`
        : '<span>No deadline set</span>'}
    </p>`;

  const canAssign = hasPermission(currentUser, 'bugs.assign');
  els.assignForm.hidden = !canAssign;
  els.assignReadonly.hidden = canAssign;
  if (!canAssign) return;

  const form = els.assignForm;
  form.elements.assignedTo.innerHTML = developerOptionsHTML(bug.assignedTo);
  form.elements.deadline.value = bug.deadline || '';
  form.elements.deadline.min = todayISO();
  clearFormErrors(form);
}

function renderDetails() {
  const project = getProjectById(bug.projectId);
  const reporter = getUserById(bug.reportedBy);

  els.details.innerHTML = `
    <dt>Bug ID</dt><dd class="mono">${escapeHTML(bug.id)}</dd>
    <dt>Project</dt>
    <dd>${project
      ? `<a href="projects.html?id=${encodeURIComponent(project.id)}">${escapeHTML(project.name)}</a> <span class="mono text-subtle">${escapeHTML(project.key)}</span>`
      : '—'}</dd>
    <dt>Reported by</dt>
    <dd>${reporter ? `<span class="user-inline">${avatarHTML(reporter, 'sm')}${escapeHTML(reporter.name)}</span>` : 'Unknown user'}</dd>
    <dt>Severity</dt><dd>${badge(bug.severity)}</dd>
    <dt>Priority</dt><dd>${badge(bug.priority)}</dd>
    <dt>Created</dt><dd>${escapeHTML(formatDate(bug.createdAt, { time: true }))}</dd>
    <dt>Last updated</dt><dd>${escapeHTML(formatDate(bug.updatedAt, { time: true }))}</dd>`;
}

/* ===================== Behaviour ===================== */

function setupHeader() {
  els.copyLink.innerHTML = `${pageIcon('link', 16)}<span>Copy link</span>`;
  els.copyLink.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy the link. Copy it from the address bar instead.', 'error');
    }
  });
}

/* --- Status --- */

function openStatusModal(target) {
  const action = STATUS_ACTIONS[target];
  const required = NOTE_REQUIRED.includes(target);

  els.statusForm.dataset.target = target;
  els.statusTitle.textContent = action.label;
  els.statusSubtitle.textContent = `${bug.id} · ${bug.title}`;
  els.statusPreview.innerHTML = `${badge(bug.status)}${icon('arrow-right', 16)}${badge(target)}`;
  els.statusNoteLabel.innerHTML = required
    ? 'Reason<span class="required" aria-hidden="true">*</span>'
    : 'Note <span class="text-subtle">(optional)</span>';
  els.statusNote.required = required;
  els.statusNote.placeholder = action.placeholder;
  els.statusNote.value = '';
  els.statusSubmit.textContent = action.label;
  clearFieldError(els.statusNote);

  openModal(els.statusModal);
  els.statusNote.focus();
}

function setupStatus() {
  els.statusActions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-status]');
    if (button) openStatusModal(button.dataset.status);
  });

  els.statusNote.addEventListener('input', () => clearFieldError(els.statusNote));

  els.statusForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const target = els.statusForm.dataset.target;
    const note = els.statusNote.value.trim();

    if (NOTE_REQUIRED.includes(target) && !note) {
      setFieldError(els.statusNote, 'Please explain why the bug is being reopened.');
      els.statusNote.focus();
      return;
    }

    // Re-check against the latest saved data (another tab may have changed it)
    const latest = getBugById(bugId);
    if (!latest) {
      closeModal(els.statusModal);
      refresh();
      return;
    }
    bug = latest;
    if (!allowedStatuses().includes(target)) {
      closeModal(els.statusModal);
      showToast(`This bug can no longer be moved to ${target}. The page has been refreshed.`, 'warning');
      refresh();
      return;
    }

    const from = bug.status;
    const saved = save(
      () => updateBug(bug.id, { status: target }, currentUser.id, note), // history entry is added by updateBug
      `${bug.id} moved from ${from} to ${target}.`,
    );
    if (saved) closeModal(els.statusModal);
  });
}

/* --- Assignment & deadline --- */

function setupAssignment() {
  const form = els.assignForm;
  form.addEventListener('input', (event) => clearFieldError(event.target));
  form.addEventListener('change', (event) => clearFieldError(event.target));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!hasPermission(currentUser, 'bugs.assign')) return;

    const assignedTo = form.elements.assignedTo.value || null;
    const deadline = form.elements.deadline.value || null;
    const note = form.elements.note.value.trim();

    const changes = {};
    if (assignedTo !== (bug.assignedTo || null)) changes.assignedTo = assignedTo;
    if (deadline !== (bug.deadline || null)) changes.deadline = deadline;

    if (!Object.keys(changes).length) {
      showToast('Nothing to save: the developer and deadline are unchanged.', 'info');
      return;
    }
    if (changes.deadline && changes.deadline < todayISO()) {
      setFieldError(form.elements.deadline, "The deadline can't be in the past.");
      form.elements.deadline.focus();
      return;
    }

    let message = 'Deadline updated.';
    if ('assignedTo' in changes) {
      message = assignedTo ? `${bug.id} assigned to ${getUserById(assignedTo)?.name}.` : `${bug.id} is now unassigned.`;
    }

    // updateBug logs both changes in the history (assignedTo and deadline are tracked fields)
    if (save(() => updateBug(bug.id, changes, currentUser.id, note), message)) {
      form.elements.note.value = '';
    }
  });
}

/* --- Attachments --- */

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Scale big screenshots down and re-encode them; keeps the original if that is smaller. */
function shrinkImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const smaller = canvas.toDataURL('image/webp', 0.85);
      resolve(smaller.length < dataUrl.length ? smaller : dataUrl);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function readAttachment(file) {
  let dataUrl = await readAsDataURL(file);
  if (RESIZABLE_IMAGES.includes(file.type)) dataUrl = await shrinkImage(dataUrl).catch(() => dataUrl);

  const type = /^data:([^;,]+)/.exec(dataUrl)?.[1] || file.type || 'application/octet-stream';
  let name = file.name || 'file';
  if (type === 'image/webp' && file.type !== 'image/webp') name = `${name.replace(/\.[^.]+$/, '')}.webp`;

  return {
    name,
    type,
    size: Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4),
    dataUrl,
  };
}

async function addFiles(fileList) {
  if (!canAttach()) return;
  const files = [...fileList];
  if (!files.length) return;

  const { maxAttachmentSizeMB } = getSystemSettings();
  const maxBytes = maxAttachmentSizeMB * 1024 * 1024;
  files.filter((f) => f.size > maxBytes)
    .forEach((f) => showToast(`${f.name} is larger than ${maxAttachmentSizeMB} MB and was skipped.`, 'warning'));
  const accepted = files.filter((f) => f.size <= maxBytes);
  if (!accepted.length) return;

  els.dropzone.classList.add('is-busy');
  els.attachBtn.disabled = true;
  try {
    const read = await Promise.all(accepted.map(readAttachment));
    const latest = getBugById(bugId);
    if (!latest) return refresh();

    let allAttachments = getBugs().flatMap((b) => b.attachments || []);
    const uploadedAt = nowISO();
    const added = read.map((file) => {
      const attachment = { id: generateId('ATT', allAttachments), ...file, uploadedBy: currentUser.id, uploadedAt };
      allAttachments = [...allAttachments, attachment];
      return attachment;
    });

    save(
      () => updateBug(bugId, { attachments: [...(latest.attachments || []), ...added] }),
      `${plural(added.length, 'file')} attached.`,
    );
  } catch (error) {
    console.error(error);
    showToast('Could not read one of the files. Please try again.', 'error');
  } finally {
    els.dropzone.classList.remove('is-busy');
    els.attachBtn.disabled = false;
    els.attachInput.value = '';
  }
}

async function removeAttachment(attachmentId) {
  const attachment = (bug.attachments || []).find((a) => a.id === attachmentId);
  if (!attachment) return;
  const confirmed = await confirmDialog({
    title: 'Remove attachment?',
    message: `"${attachment.name}" will be removed from ${bug.id}. This can't be undone.`,
    confirmText: 'Remove',
    danger: true,
  });
  if (!confirmed) return;

  const latest = getBugById(bugId);
  if (!latest) return refresh();
  save(
    () => updateBug(bugId, { attachments: (latest.attachments || []).filter((a) => a.id !== attachmentId) }),
    'Attachment removed.',
  );
}

function openPreview(attachmentId) {
  const attachment = (bug.attachments || []).find((a) => a.id === attachmentId);
  const url = attachment && safeDataUrl(attachment);
  if (!url) return;
  const uploader = getUserById(attachment.uploadedBy);

  els.previewTitle.textContent = attachment.name;
  els.previewMeta.textContent = `${formatSize(attachment.size)} · uploaded by ${uploader?.name || 'Unknown'} on ${formatDate(attachment.uploadedAt, { time: true })}`;
  els.previewImg.src = url;
  els.previewImg.alt = attachment.name;
  els.previewDownload.href = url;
  els.previewDownload.download = attachment.name;
  els.previewDownload.innerHTML = `${pageIcon('download', 16)}<span>Download</span>`;
  openModal(els.previewModal);
}

function setupAttachments() {
  byId('dropzone-icon').innerHTML = pageIcon('upload', 18);
  els.attachBtn.innerHTML = `${pageIcon('paperclip', 16)}<span>Add files</span>`;

  const browse = () => els.attachInput.click();
  els.attachBtn.addEventListener('click', browse);
  byId('dropzone-browse').addEventListener('click', browse);
  els.attachInput.addEventListener('change', () => addFiles(els.attachInput.files));

  els.attachList.addEventListener('click', (event) => {
    const preview = event.target.closest('[data-preview]');
    const remove = event.target.closest('[data-remove]');
    if (preview) openPreview(preview.dataset.preview);
    if (remove) removeAttachment(remove.dataset.remove);
  });

  // Drag & drop files anywhere on the Attachments card
  const draggingFiles = (event) => event.dataTransfer?.types.includes('Files');
  ['dragenter', 'dragover'].forEach((type) => {
    els.attachCard.addEventListener(type, (event) => {
      if (!canAttach() || !draggingFiles(event)) return;
      event.preventDefault();
      els.attachCard.classList.add('is-dragover');
    });
  });
  els.attachCard.addEventListener('dragleave', (event) => {
    if (!els.attachCard.contains(event.relatedTarget)) els.attachCard.classList.remove('is-dragover');
  });
  els.attachCard.addEventListener('drop', (event) => {
    els.attachCard.classList.remove('is-dragover');
    if (!canAttach() || !draggingFiles(event)) return;
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  });
  // A file dropped next to the card would otherwise make the browser leave the page
  ['dragover', 'drop'].forEach((type) => {
    window.addEventListener(type, (event) => { if (draggingFiles(event)) event.preventDefault(); });
  });

  // Paste a screenshot (e.g. after Win + Shift + S) straight onto the page
  document.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files || [])];
    if (!files.length || !canAttach()) return;
    event.preventDefault();
    const stamp = nowISO().replace(/[-:]/g, '').replace('T', '-');
    addFiles(files.map((file) => (file.name && file.name !== 'image.png'
      ? file
      : new File([file], `screenshot-${stamp}.${file.type.split('/')[1] || 'png'}`, { type: file.type }))));
  });
}

/* --- Comments --- */

function setupComments() {
  byId('comment-avatar').innerHTML = avatarHTML(currentUser, 'md');
  const form = els.commentForm;
  const textarea = els.commentText;
  const updateCounter = () => { els.commentCounter.textContent = `${textarea.value.length} / ${COMMENT_MAX}`; };

  textarea.addEventListener('input', () => {
    clearFieldError(textarea);
    updateCounter();
  });
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = textarea.value.trim();
    if (!text) {
      setFieldError(textarea, 'Write something before posting.');
      textarea.focus();
      return;
    }

    let comment = null;
    if (!save(() => { comment = addComment(bugId, currentUser.id, text.slice(0, COMMENT_MAX)); }, 'Comment posted.')) return;

    form.reset();
    updateCounter();
    const added = comment && byId(comment.id);
    if (added) {
      added.classList.add('is-new');
      added.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  updateCounter();
}

/* --- Modals --- */

function setupModals() {
  // Esc closes a <dialog> natively; make sure the page can scroll again afterwards
  [els.statusModal, els.previewModal].forEach((dialog) => {
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
    });
  });
}
