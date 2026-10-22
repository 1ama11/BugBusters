# BugBusters
Bug Tracking System 
## Bug Tracking System&#x20;

The **Bug Tracking System** is a web-based application designed to simplify the process of reporting, managing, tracking, and resolving software bugs throughout the software development lifecycle.

The system provides a centralized platform where **developers, testers, project managers, and administrators** can collaborate efficiently to identify and resolve software issues.

Users can report bugs by providing detailed descriptions, severity levels, priorities, and supporting attachments such as screenshots. Testers and project managers can assign bugs to developers, set deadlines, and monitor their progress. Developers can update bug statuses, communicate through comments, and mark issues as resolved.

The system also includes **role-based access control**, ensuring each user has appropriate permissions based on their responsibilities.

Additionally, an admin dashboard provides an overview of bug statistics, project progress, and team performance. Advanced search, filtering, and reporting features help users monitor unresolved issues, analyze bug trends, and improve resolution efficiency.

### Project Objective

The main objective of the Bug Tracking System is to **improve software quality, enhance team collaboration, and streamline bug resolution** by providing an organized and efficient platform for managing software issues.

---

# BugTrack — Bug Tracking System (Phase 1: Frontend)

A university project: a bug tracker for developers, testers, project managers and admins, built with **HTML5, CSS3 and vanilla JavaScript (ES modules)** only.

**Phase 1 is fully static.** Pages show the sample data from `js/mock-data.js`, and nothing is saved anywhere — no `localStorage`, no `sessionStorage`, no backend. Forms still validate, but a valid submit only shows a *"Demo: … Nothing was saved"* toast. The database and backend arrive in **Phase 2**.

> ⚠️ **No real login in Phase 1.** Any valid email and password opens the app as the demo **Admin** (Sarah Mitchell), so every page and button is visible. Role checks only control what the UI shows.

---

## 1. Running the app (VS Code Live Server)

ES modules (`import` / `export`) do **not** work when you double-click an HTML file (`file://`). You need a local server.

1. Open the `Bug-Tracking-System` folder in VS Code (**File → Open Folder**).
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.
4. You'll land on the login page. Enter any valid email and any password to open the dashboard.

Any other static server works too, e.g. `python -m http.server 5500` and open `http://localhost:5500`.

### Sample data

12 users (2 inactive), 5 projects and 14 bugs, all in `js/mock-data.js`. The app always acts as the Admin, `USER-001` Sarah Mitchell (`DEMO_USER_ID` in `js/storage.js`). To preview another role while developing, change `DEMO_USER_ID` to another user's id:

| Role            | User id    | Name           | Can do                                                       |
|-----------------|------------|----------------|--------------------------------------------------------------|
| Admin           | `USER-001` | Sarah Mitchell | Everything, incl. User Management and System settings        |
| Project Manager | `USER-004` | Karim Mostafa  | Create projects, edit projects they manage, report/assign bugs |
| Tester          | `USER-002` | Omar Hassan    | Report and assign bugs                                       |
| Developer       | `USER-003` | Lina Farouk    | View bugs, update bugs assigned to them                      |

Because nothing is saved, reloading a page always shows the original sample data.

---

## 2. Folder structure

```
Bug-Tracking-System/
├── index.html               Redirects to the login page
├── pages/
│   ├── login.html           ✅ Person 1
│   ├── register.html        ✅ Person 1
│   ├── users.html           ✅ Person 5 (Admin only)
│   ├── projects.html        ✅ Person 5
│   ├── settings.html        ✅ Person 5
│   ├── dashboard.html       ✅ Person 2
│   ├── reports.html         ✅ Person 2 (Chart.js from CDN)
│   ├── bugs.html            ✅ Person 3
│   ├── report-bug.html      ✅ Person 3
│   └── bug-details.html     ✅ Person 4
├── css/
│   ├── style.css            Design tokens + ALL shared components (link first)
│   ├── auth.css             Login / register only
│   ├── admin.css            Users / projects / settings only
│   ├── bug-details.css      Bug details page only
│   └── responsive.css       All breakpoints (link last)
├── js/
│   ├── mock-data.js         Constants + sample data (Phase 1's only data source)
│   ├── storage.js           Data layer: every page reads/writes through it (Phase 2 → backend)
│   ├── ui.js                Toasts, demo-save notice, modals, confirm, badges, avatars, dates, form errors, icons
│   ├── auth.js              Permissions, form validation, login/register pages
│   ├── app.js               Shared layout: sidebar, top bar, profile menu
│   ├── users.js | projects.js | settings.js | bug-details.js   Page scripts
├── assets/icons/favicon.svg, assets/images/logo.svg
└── README.md
```

**One file beyond the original plan:** `js/ui.js`. Toast/modal helpers are needed by both `auth.js` (login page) and `app.js` (which imports `auth.js`). Putting them in `app.js` would create a circular import, so they live in their own module.

### How the modules depend on each other

```
mock-data.js ← storage.js ← ui.js ← auth.js ← app.js ← page scripts (users.js, your-page.js…)
```

No file imports "upwards", so there are no circular imports.

---

## 3. How it works

- **Data:** `storage.js` read functions (`getBugs()`, `getUsers()`…) return a fresh copy of the sample data in `mock-data.js`. Write functions (`addBug()`, `updateBug()`, `addComment()`, `addUser()`…) keep their names but **save nothing** and return `null`.
- **Forms:** every form still validates and shows its errors. A valid submit calls the write function, then shows `showDemoSaved(message)` — *"Demo: … Nothing was saved. Saving arrives in Phase 2."* — and the form resets. The page shows the unchanged sample data.
- **Login / register:** the forms are validated, then open the dashboard. No account is checked or created. `getCurrentUser()` always returns the demo Admin. Log out just goes back to the login page.
- **Page permissions:** every app page calls `initLayout()`, which still checks the page's permission (`requireAuth()`), so roles keep working once Phase 2 adds real users. With the demo Admin it always passes.
- **Preferences** (date format, collapsed sidebar, notifications) use the defaults from `mock-data.js`; changes aren't remembered.
- **Registration** validates the password (8+ chars, must match) and the role (Admin can't be chosen).

### Phase 2: connecting the backend

Only `js/storage.js` (and the session part of `js/auth.js`) should need to change: replace the inside of each function with a call to the API, keeping the names and parameters. Then remove the `showDemoSaved(...)` calls in the page scripts (search for `showDemoSaved`) and show a real success message after the request succeeds. Redirect messages (e.g. *"Bug reported"* after going back to the list) were removed in Phase 1 because they needed `sessionStorage`; bring them back with the backend if needed.

### Permissions (`PERMISSIONS` in `js/auth.js`)

| Permission        | Admin | Project Manager | Tester | Developer |
|-------------------|:-----:|:---------------:|:------:|:---------:|
| `users.manage`    | ✅ |    |    |    |
| `settings.system` | ✅ |    |    |    |
| `projects.create` | ✅ | ✅ |    |    |
| `projects.edit`   | ✅ | ✅ own projects |  |  |
| `bugs.view`       | ✅ | ✅ | ✅ | ✅ |
| `bugs.report`     | ✅ | ✅ | ✅ |    |
| `bugs.assign`     | ✅ | ✅ | ✅ |    |
| `bugs.update`     | ✅ | ✅ | ✅ reported/assigned | ✅ assigned only |
| `bugs.delete`     | ✅ | ✅ |    |    |
| `reports.view`    | ✅ | ✅ | ✅ | ✅ |

The "own / assigned" rules are in `canEditProject(user, project)` and `canUpdateBug(user, bug)`. To change who can do what, edit this one table — not individual pages.

---

## 4. Integration guide for Persons 2, 3 and 4

### 4.1 Page template

Your placeholder page already looks like this. Keep the shell; replace what's inside `<main>`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All Bugs · BugTrack</title>
  <link rel="icon" href="../assets/icons/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../css/style.css">      <!-- 1. shared, always first -->
  <link rel="stylesheet" href="../css/bugs.css">       <!-- 2. your own page CSS (optional) -->
  <link rel="stylesheet" href="../css/responsive.css"> <!-- 3. always last -->
</head>
<body class="is-loading">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="app-shell">
    <aside class="sidebar" id="app-sidebar"></aside>   <!-- filled by app.js -->
    <div class="main">
      <header class="topbar" id="app-topbar"></header> <!-- filled by app.js -->
      <main class="content" id="main-content" tabindex="-1">
        <!-- YOUR PAGE CONTENT -->
      </main>
    </div>
  </div>
  <script type="module" src="../js/bugs.js"></script>
</body>
</html>
```

```js
// js/bugs.js
import { initLayout } from './app.js';
import { getBugs, getUserById, getProjectById } from './storage.js';
import { badge, escapeHTML, formatDate, showToast } from './ui.js';

const user = initLayout({ pageId: 'bugs' });   // returns null if redirected
if (user) {
  // render your page
}
```

`pageId` values: `dashboard`, `bugs`, `report-bug`, `projects`, `reports`, `users`, `settings`. Bug Details uses `initLayout({ pageId: 'bugs', title: 'Bug Details' })` so "All Bugs" stays highlighted.

Pass `permission` to protect a page: `initLayout({ pageId: 'report-bug', permission: 'bugs.report' })` (nav items already declare theirs, so this is automatic for sidebar pages).

### 4.2 Data functions — `js/storage.js`

Never import `mock-data.js` arrays directly. Use these, so Phase 2 only has to change `storage.js`:

| Function | Returns / does |
|---|---|
| `getUsers()`, `getUserById(id)`, `getUserByEmail(email)` | Users |
| `getProjects()`, `getProjectById(id)` | Projects |
| `getProjectStats(projectId)` | `{ total, open, done, percentDone, byStatus, bugs }` |
| `getBugs()`, `getBugById(id)` | Bugs |
| `getBugsByProject(id)`, `getBugsAssignedTo(userId)`, `getBugsReportedBy(userId)` | Filtered bugs |
| `getCurrentUser()` | Phase 1: always the demo Admin |
| `getSystemSettings()` | `{ appName, defaultBugPriority, defaultBugSeverity, maxAttachmentSizeMB, … }` |
| `getUserPreferences(userId)` | `{ dateFormat, sidebarCollapsed, notifications: {…} }` (defaults in Phase 1) |
| `addUser`, `updateUser`, `addProject`, `updateProject`, `addBug`, `updateBug`, `addComment`, `updateSystemSettings`, `updateUserPreferences` | **Phase 1: save nothing, return `null`.** Phase 2: send the change to the backend |
| `generateId(prefix, items)`, `nowISO()` | Helpers |

Examples:

```js
// Person 3 — Report Bug form (after validation passes)
addBug({ title, description, severity, priority, projectId }, user.id); // Phase 1: saves nothing
showDemoSaved(`Bug "${title}" reported.`);
form.reset();

// Person 3 — Bug list filtered by project (link from Projects page)
const projectId = getQueryParam('project');           // bugs.html?project=PROJ-001
const bugs = projectId ? getBugsByProject(projectId) : getBugs();

// Person 4 — Bug details
const bug = getBugById(getQueryParam('id'));         // bug-details.html?id=BUG-001
if (canUpdateBug(user, bug)) {
  updateBug(bug.id, { status: 'Resolved' }, user.id, 'Fixed in v2.1'); // Phase 1: saves nothing
}
addComment(bug.id, user.id, 'Verified on staging.');

// Person 2 — Dashboard
const mine = getBugsAssignedTo(user.id).filter((b) => OPEN_BUG_STATUSES.includes(b.status));
```

### 4.3 Permissions — `js/auth.js`

```js
import { hasPermission, canUpdateBug, canEditProject, isAdmin } from './auth.js';
if (hasPermission(user, 'bugs.assign')) { /* show assignee dropdown */ }
```

### 4.4 UI helpers — `js/ui.js`

| Helper | Use |
|---|---|
| `escapeHTML(text)` | **Always** wrap user text before putting it in `innerHTML` |
| `showToast(msg, 'success' \| 'error' \| 'warning' \| 'info')` | Notification |
| `showDemoSaved(msg)` | Phase 1: call after a form passes validation — shows *"Demo: msg Nothing was saved…"* |
| `openModal(id)`, `closeModal(id)` | Native `<dialog class="modal">`; any `[data-close-modal]` button closes it |
| `await confirmDialog({ title, message, confirmText, danger })` | Returns `true`/`false` |
| `badge(text)` | Coloured badge; colour chosen from the text (`Open`, `Critical`, `Resolved`…) |
| `roleBadge(role)`, `avatarHTML(user, 'sm'\|'md'\|'lg')` | User display |
| `formatDate(value, { time })`, `timeAgo(value)` | Respects the user's date-format preference |
| `setFieldError(input, msg)`, `showFormErrors(form, errors)`, `clearFormErrors(form)` | Accessible form errors |
| `icon(name, size)` / `<span data-icon="bug">` | SVG icons (see `ICON_PATHS` for names) |
| `emptyStateHTML(title, text, icon)`, `debounce(fn)`, `getQueryParam(name)` | Misc |

### 4.5 Constants — `js/mock-data.js`

`ROLES`, `ROLE_LIST`, `BUG_STATUSES`, `OPEN_BUG_STATUSES`, `BUG_SEVERITIES`, `BUG_PRIORITIES`, `PROJECT_STATUSES`, `USER_STATUSES`. Use these to build dropdowns so everyone uses the same spelling.

### 4.6 Data shapes

```js
// User
{ id: 'USER-003', name, email, role, status: 'Active'|'Inactive', jobTitle, createdAt, lastLoginAt }

// Project
{ id: 'PROJ-001', key: 'CP', name, description, status: 'Active'|'On Hold'|'Completed',
  managerId: 'USER-004', memberIds: ['USER-002', …], createdAt, updatedAt }

// Bug
{ id: 'BUG-001', title, description, severity, priority, status, projectId, reportedBy, assignedTo,
  createdAt, updatedAt, deadline: 'YYYY-MM-DD'|null,
  attachments: [{ id: 'ATT-001', name, type: 'image/png', size: bytes, dataUrl: 'data:…', uploadedBy: userId, uploadedAt }],
  comments: [{ id: 'CMT-001', userId, text, createdAt }],
  history:  [{ id: 'HIST-001', type: 'created'|'status'|'assignment'|'priority'|'severity'|'deadline',
               field, from, to, by: userId, at, note }] }
```

Attachments are stored as `data:` URLs (read with `FileReader.readAsDataURL`), so the Bug Details page can preview and download them. Use `generateId('ATT', allAttachments)` for the id. The Bug Details page scales screenshots down before uploading. In Phase 1, adding or removing an attachment is validated but not saved.

Dates are local ISO strings without a timezone: `"2026-10-19T10:00:00"`. Use `nowISO()` to create one.

### 4.7 Shared CSS classes (`css/style.css`)

- Layout: `.page-header` (`__title`, `__subtitle`, `__actions`), `.card` (`__header`, `__title`, `__body`, `__footer`), `.stats-grid` + `.stat-card`
- Buttons: `.btn` + `--primary | --secondary | --ghost | --danger | --danger-outline`, sizes `--sm | --lg`, `.icon-btn`
- Forms: `.field`, `.field__label`, `.field__hint`, `.field-error`, `.input`, `.select`, `.textarea`, `.form-row`, `.form-grid`, `.check`, `.switch`, `.input-group`
- Data: `.table-wrapper` + `.table`, `.toolbar`, `.segmented`, `.badge`, `.role-badge`, `.avatar`, `.user-cell`, `.detail-list`, `.progress`, `.empty-state`, `.alert--error|info|warning|success`
- Colours: use the CSS variables (`var(--color-primary)`, `var(--color-text-muted)`, `var(--color-border)` …) — never hard-coded hex values — so every page matches the app's dark theme.

### 4.8 Team rules

1. Put page-specific CSS in your own file (e.g. `css/bugs.css`) and link it between `style.css` and `responsive.css`. If a component is useful to others, move it into `style.css`.
2. Use relative paths from `pages/`: `../css/…`, `../js/…`, links to other pages are just `bugs.html`.
3. Escape user content with `escapeHTML()` before using `innerHTML`.
4. Test with all four demo roles.
