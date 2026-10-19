/**
 * storage.js
 * ------------------------------------------------------------------
 * The ONLY file that talks to localStorage / sessionStorage.
 * Every page (yours and your teammates') should import these helpers
 * instead of calling localStorage directly.
 *
 *   import { getBugs, addBug, getCurrentUser } from '../js/storage.js';
 *
 * Data is seeded from mock-data.js the first time a key is missing.
 * Existing data is never overwritten on reload.
 * ------------------------------------------------------------------
 */

import {
  MOCK_USERS,
  MOCK_PROJECTS,
  MOCK_BUGS,
  MOCK_SETTINGS,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  BUG_STATUSES,
  OPEN_BUG_STATUSES,
} from './mock-data.js';

/* ===================== Keys ===================== */

export const STORAGE_KEYS = Object.freeze({
  USERS: 'bugtracker.users',
  PROJECTS: 'bugtracker.projects',
  BUGS: 'bugtracker.bugs',
  SESSION: 'bugtracker.session',
  SETTINGS: 'bugtracker.settings',
});

/* ===================== Low-level helpers ===================== */

/** Read and parse a JSON value. Returns `fallback` if missing or corrupted. */
export function readData(key, fallback = null, store = localStorage) {
  try {
    const raw = store.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`[storage] Could not read "${key}". Using fallback.`, error);
    return fallback;
  }
}

/** Serialize and save a value. */
export function saveData(key, value, store = localStorage) {
  store.setItem(key, JSON.stringify(value));
}

/** Remove a key. */
export function removeData(key, store = localStorage) {
  store.removeItem(key);
}

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

/* ===================== Seeding ===================== */

/**
 * Load sample data the first time the app runs.
 * Each key is seeded only if it does not exist yet, so user changes survive reloads.
 * Safe to call on every page load.
 */
export function initStorage() {
  const seeds = {
    [STORAGE_KEYS.USERS]: MOCK_USERS,
    [STORAGE_KEYS.PROJECTS]: MOCK_PROJECTS,
    [STORAGE_KEYS.BUGS]: MOCK_BUGS,
    [STORAGE_KEYS.SETTINGS]: MOCK_SETTINGS,
  };
  Object.entries(seeds).forEach(([key, value]) => {
    if (localStorage.getItem(key) === null) {
      // structuredClone avoids sharing references with the frozen-ish mock arrays
      saveData(key, structuredClone(value));
    }
  });
}

/** Wipe all app data (including the session) and reseed from mock-data.js. */
export function resetDemoData() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  initStorage();
}

/* ===================== Generic collection helpers ===================== */

function getCollection(key) {
  return readData(key, []);
}

function addToCollection(key, item) {
  const items = getCollection(key);
  items.push(item);
  saveData(key, items);
  return item;
}

function updateInCollection(key, id, changes) {
  const items = getCollection(key);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...changes, id }; // id can never be changed
  saveData(key, items);
  return items[index];
}

/* ===================== Users ===================== */

export function getUsers() {
  return getCollection(STORAGE_KEYS.USERS);
}

export function getUserById(id) {
  return getUsers().find((user) => user.id === id) || null;
}

export function getUserByEmail(email) {
  const target = String(email || '').trim().toLowerCase();
  return getUsers().find((user) => user.email.toLowerCase() === target) || null;
}

/** Add a user. Fills in id, status and createdAt if missing. */
export function addUser(user) {
  const users = getUsers();
  const newUser = {
    id: generateId('USER', users),
    status: 'Active',
    jobTitle: '',
    createdAt: nowISO(),
    lastLoginAt: null,
    ...user,
  };
  newUser.email = newUser.email.trim().toLowerCase();
  return addToCollection(STORAGE_KEYS.USERS, newUser);
}

export function updateUser(id, changes) {
  return updateInCollection(STORAGE_KEYS.USERS, id, changes);
}

/* ===================== Projects ===================== */

export function getProjects() {
  return getCollection(STORAGE_KEYS.PROJECTS);
}

export function getProjectById(id) {
  return getProjects().find((project) => project.id === id) || null;
}

export function addProject(project) {
  const projects = getProjects();
  const now = nowISO();
  const newProject = {
    id: generateId('PROJ', projects),
    status: 'Active',
    memberIds: [],
    createdAt: now,
    updatedAt: now,
    ...project,
  };
  return addToCollection(STORAGE_KEYS.PROJECTS, newProject);
}

export function updateProject(id, changes) {
  return updateInCollection(STORAGE_KEYS.PROJECTS, id, { ...changes, updatedAt: nowISO() });
}

/* ===================== Bugs ===================== */

export function getBugs() {
  return getCollection(STORAGE_KEYS.BUGS);
}

export function getBugById(id) {
  return getBugs().find((bug) => bug.id === id) || null;
}

export function getBugsByProject(projectId) {
  return getBugs().filter((bug) => bug.projectId === projectId);
}

/**
 * Bug counts for one project (used by Projects, handy for Dashboard/Reports).
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

/** Internal: build a history entry with a unique HIST id. */
function makeHistoryEntry(allBugs, entry) {
  const allHistory = allBugs.flatMap((bug) => bug.history || []);
  return { id: generateId('HIST', allHistory), at: nowISO(), note: '', field: null, from: null, to: null, ...entry };
}

/**
 * Create a bug. Only the fields from the form are required; the rest is filled in.
 *   addBug({ title, description, severity, priority, projectId, assignedTo, deadline }, currentUser.id)
 */
export function addBug(bug, reportedBy) {
  const bugs = getBugs();
  const now = nowISO();
  const system = getSystemSettings();
  const reporter = reportedBy || bug.reportedBy || null;
  const newBug = {
    id: generateId('BUG', bugs),
    title: '',
    description: '',
    severity: system.defaultBugSeverity,
    priority: system.defaultBugPriority,
    status: 'Open',
    projectId: null,
    assignedTo: null,
    deadline: null,
    attachments: [],
    comments: [],
    ...bug,
    reportedBy: reporter,
    createdAt: now,
    updatedAt: now,
  };
  newBug.history = [
    makeHistoryEntry(bugs, { type: 'created', to: newBug.status, by: reporter, at: now, note: 'Bug reported' }),
  ];
  bugs.push(newBug);
  saveData(STORAGE_KEYS.BUGS, bugs);
  return newBug;
}

/** Fields whose changes are written to the bug history automatically. */
const TRACKED_BUG_FIELDS = {
  status: 'status',
  assignedTo: 'assignment',
  priority: 'priority',
  severity: 'severity',
<<<<<<< HEAD
=======
  deadline: 'deadline',
>>>>>>> bug-details-(Abdelrahman)
};

/**
 * Update a bug. If `actorId` is given, changes to status / assignedTo /
<<<<<<< HEAD
 * priority / severity are recorded in bug.history automatically.
=======
 * priority / severity / deadline are recorded in bug.history automatically.
>>>>>>> bug-details-(Abdelrahman)
 *   updateBug('BUG-001', { status: 'Resolved' }, currentUser.id, 'Fixed in v2.1');
 */
export function updateBug(id, changes, actorId = null, note = '') {
  const bugs = getBugs();
  const index = bugs.findIndex((bug) => bug.id === id);
  if (index === -1) return null;

  const current = bugs[index];
  const now = nowISO();
  const history = [...(current.history || [])];

  if (actorId) {
    Object.entries(TRACKED_BUG_FIELDS).forEach(([field, type]) => {
      if (field in changes && changes[field] !== current[field]) {
        history.push(makeHistoryEntry(bugs, { type, field, from: current[field] ?? null, to: changes[field], by: actorId, at: now, note }));
        bugs[index].history = history; // keep ids unique while looping
      }
    });
  }

  bugs[index] = { ...current, ...changes, id, history, updatedAt: now };
  saveData(STORAGE_KEYS.BUGS, bugs);
  return bugs[index];
}

/** Add a comment to a bug and return the new comment. */
export function addComment(bugId, userId, text) {
  const bugs = getBugs();
  const bug = bugs.find((b) => b.id === bugId);
  if (!bug) return null;
  const allComments = bugs.flatMap((b) => b.comments || []);
  const comment = { id: generateId('CMT', allComments), userId, text: String(text).trim(), createdAt: nowISO() };
  bug.comments = [...(bug.comments || []), comment];
  bug.updatedAt = comment.createdAt;
  saveData(STORAGE_KEYS.BUGS, bugs);
  return comment;
}

/* ===================== Settings ===================== */

export function getSettings() {
  const stored = readData(STORAGE_KEYS.SETTINGS, {});
  return {
    system: { ...DEFAULT_SYSTEM_SETTINGS, ...(stored.system || {}) },
    userPreferences: stored.userPreferences || {},
  };
}

export function saveSettings(settings) {
  saveData(STORAGE_KEYS.SETTINGS, settings);
}

export function getSystemSettings() {
  return getSettings().system;
}

export function updateSystemSettings(changes) {
  const settings = getSettings();
  settings.system = { ...settings.system, ...changes };
  saveSettings(settings);
  return settings.system;
}

/** Preferences for one user, merged with defaults (so new options always have a value). */
export function getUserPreferences(userId) {
  const stored = getSettings().userPreferences[userId] || {};
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...stored,
    notifications: { ...DEFAULT_USER_PREFERENCES.notifications, ...(stored.notifications || {}) },
  };
}

export function updateUserPreferences(userId, changes) {
  const settings = getSettings();
  const current = getUserPreferences(userId);
  const next = {
    ...current,
    ...changes,
    notifications: { ...current.notifications, ...(changes.notifications || {}) },
  };
  settings.userPreferences[userId] = next;
  saveSettings(settings);
  return next;
}

/* ===================== Session (simulated) ===================== */
/*
 * "Remember me" checked   -> session saved in localStorage (survives closing the browser)
 * "Remember me" unchecked -> session saved in sessionStorage (cleared when the tab closes)
 * Both use the same key: bugtracker.session
 */

export function getSession() {
  const session = readData(STORAGE_KEYS.SESSION, null) || readData(STORAGE_KEYS.SESSION, null, sessionStorage);
  if (!session) return null;

  const { sessionTimeoutHours } = getSystemSettings();
  if (sessionTimeoutHours > 0) {
    const ageMs = Date.now() - new Date(session.loginAt).getTime();
    if (ageMs > sessionTimeoutHours * 60 * 60 * 1000) {
      clearSession();
      return null;
    }
  }
  return session;
}

export function saveSession(userId, remember = true) {
  clearSession();
  const session = { userId, loginAt: nowISO(), remember };
  saveData(STORAGE_KEYS.SESSION, session, remember ? localStorage : sessionStorage);
  return session;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);
}

/** The logged-in user object, or null. Deactivated or deleted users are logged out. */
export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const user = getUserById(session.userId);
  if (!user || user.status !== 'Active') {
    clearSession();
    return null;
  }
  return user;
}
