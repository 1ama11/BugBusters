/**
 * storage.js
 * ------------------------------------------------------------------
 * The data layer. Every page gets its data through these functions
 * instead of reading mock-data.js directly.
 *
 *   import { getBugs, addBug, getCurrentUser } from '../js/storage.js';
 *
 * PHASE 1 (now): fully static.
 *   - Read functions return a fresh copy of the sample data in mock-data.js.
 *   - Write functions (addBug, updateBug, addComment, addUser, …) save
 *     NOTHING and return null. Pages show a "demo only" toast instead.
 *   - Nothing is kept in localStorage / sessionStorage.
 *   - There is no login: getCurrentUser() always returns the demo Admin.
 *
 * PHASE 2: replace the inside of these functions with calls to the
 * backend API. Keep the names and parameters so pages don't change.
 * ------------------------------------------------------------------
 */

import {
  MOCK_USERS,
  MOCK_PROJECTS,
  MOCK_BUGS,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  BUG_STATUSES,
  OPEN_BUG_STATUSES,
} from './mock-data.js';

/* ===================== Helpers ===================== */

/** Current local time as "YYYY-MM-DDTHH:mm:ss" (same format as mock data). */
export function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Generate the next sequential ID for a prefix, e.g. generateId('BUG', bugs) -> "BUG-015".
 * Works on any array of objects that have an `id` like "PREFIX-123".
 */
export function generateId(prefix, items = []) {
  const max = items.reduce((highest, item) => {
    const match = String(item.id || '').match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/** A copy, so a page that edits what it gets back can't change the sample data. */
function copy(value) {
  return structuredClone(value);
}

/* ===================== Users ===================== */

export function getUsers() {
  return copy(MOCK_USERS);
}

export function getUserById(id) {
  return getUsers().find((user) => user.id === id) || null;
}

export function getUserByEmail(email) {
  const target = String(email || '').trim().toLowerCase();
  return getUsers().find((user) => user.email.toLowerCase() === target) || null;
}

/** Phase 1: not saved. Phase 2: create the user on the server. */
export function addUser(user) {
  return null;
}

/** Phase 1: not saved. Phase 2: update the user on the server. */
export function updateUser(id, changes) {
  return null;
}

/* ===================== Projects ===================== */

export function getProjects() {
  return copy(MOCK_PROJECTS);
}

export function getProjectById(id) {
  return getProjects().find((project) => project.id === id) || null;
}

/** Phase 1: not saved. Phase 2: create the project on the server. */
export function addProject(project) {
  return null;
}

/** Phase 1: not saved. Phase 2: update the project on the server. */
export function updateProject(id, changes) {
  return null;
}

/* ===================== Bugs ===================== */

export function getBugs() {
  return copy(MOCK_BUGS);
}

export function getBugById(id) {
  return getBugs().find((bug) => bug.id === id) || null;
}

export function getBugsByProject(projectId) {
  return getBugs().filter((bug) => bug.projectId === projectId);
}

/**
 * Bug counts for one project (used by Projects, Dashboard and Reports).
 * Returns { total, open, done, percentDone, byStatus: { Open: 2, ... }, bugs }
 */
export function getProjectStats(projectId) {
  const bugs = getBugsByProject(projectId);
  const open = bugs.filter((b) => OPEN_BUG_STATUSES.includes(b.status)).length;
  const done = bugs.length - open;
  return {
    total: bugs.length,
    open,
    done,
    percentDone: bugs.length ? Math.round((done / bugs.length) * 100) : 0,
    byStatus: Object.fromEntries(BUG_STATUSES.map((s) => [s, bugs.filter((b) => b.status === s).length])),
    bugs,
  };
}

export function getBugsAssignedTo(userId) {
  return getBugs().filter((bug) => bug.assignedTo === userId);
}

export function getBugsReportedBy(userId) {
  return getBugs().filter((bug) => bug.reportedBy === userId);
}

/**
 * Phase 1: not saved.
 * Phase 2: create the bug on the server, which fills in the id, status "Open",
 * timestamps and the "created" history entry.
 *   addBug({ title, description, severity, priority, projectId, assignedTo, deadline }, currentUser.id)
 */
export function addBug(bug, reportedBy) {
  return null;
}

/**
 * Phase 1: not saved.
 * Phase 2: update the bug on the server. Changes to status / assignedTo /
 * priority / severity / deadline should be recorded in bug.history there.
 *   updateBug('BUG-001', { status: 'Resolved' }, currentUser.id, 'Fixed in v2.1');
 */
export function updateBug(id, changes, actorId = null, note = '') {
  return null;
}

/** Phase 1: not saved. Phase 2: add the comment on the server. */
export function addComment(bugId, userId, text) {
  return null;
}

/* ===================== Settings ===================== */

export function getSystemSettings() {
  return copy(DEFAULT_SYSTEM_SETTINGS);
}

/** Phase 1: not saved. Phase 2: save the workspace settings on the server. */
export function updateSystemSettings(changes) {
  return null;
}

/** Preferences for one user. Phase 1: everyone gets the defaults. */
export function getUserPreferences(userId) {
  return copy(DEFAULT_USER_PREFERENCES);
}

/** Phase 1: not saved. Phase 2: save the user's preferences on the server. */
export function updateUserPreferences(userId, changes) {
  return null;
}

/* ===================== Current user (no login in Phase 1) ===================== */

/** Phase 1 has no real login, so the app always acts as this Admin (Sarah Mitchell). */
const DEMO_USER_ID = 'USER-001';

/** The signed-in user. Phase 1: always the demo Admin. Phase 2: the user from the server session. */
export function getCurrentUser() {
  return getUserById(DEMO_USER_ID);
}
