/**
 * mock-data.js
 * ------------------------------------------------------------------
 * Shared constants + realistic sample data for the Bug Tracking System.
 *
 * This file is ONLY used to seed localStorage on the first visit
 * (see initStorage() in storage.js). Pages should never read these
 * arrays directly — always go through storage.js so that user changes
 * are respected.
 *
 * ID conventions (keep these consistent across the team):
 *   Users     USER-001   Projects  PROJ-001   Bugs     BUG-001
 *   Comments  CMT-001    History   HIST-001
 *
 * Dates use local ISO strings without a timezone: "YYYY-MM-DDTHH:mm:ss"
 * ------------------------------------------------------------------
 */

/* ===================== Shared constants ===================== */

export const ROLES = Object.freeze({
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  TESTER: 'Tester',
  DEVELOPER: 'Developer',
});

/** All roles, in display order. */
export const ROLE_LIST = [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TESTER, ROLES.DEVELOPER];

/** Roles a visitor may choose on the public registration form (no Admin). */
export const PUBLIC_ROLES = [ROLES.DEVELOPER, ROLES.TESTER, ROLES.PROJECT_MANAGER];

export const USER_STATUSES = ['Active', 'Inactive'];
export const PROJECT_STATUSES = ['Active', 'On Hold', 'Completed'];
export const BUG_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened'];
export const BUG_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
export const BUG_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

/** Bug statuses that count as "still open" in counts and progress bars. */
export const OPEN_BUG_STATUSES = ['Open', 'In Progress', 'Reopened'];

/* ===================== Users ===================== */
/*
 * NOTE: No passwords are stored. Login is simulated: any non-empty
 * password is accepted for an existing, active account.
 */
export const MOCK_USERS = [
  { id: 'USER-001', name: 'Sarah Mitchell', email: 'admin@bugtracker.dev', role: 'Admin', status: 'Active', jobTitle: 'Engineering Operations Lead', createdAt: '2026-06-02T09:15:00', lastLoginAt: '2026-10-18T17:40:00' },
  { id: 'USER-002', name: 'Omar Hassan', email: 'tester@bugtracker.dev', role: 'Tester', status: 'Active', jobTitle: 'QA Engineer', createdAt: '2026-06-10T11:00:00', lastLoginAt: '2026-10-19T08:55:00' },
  { id: 'USER-003', name: 'Lina Farouk', email: 'dev@bugtracker.dev', role: 'Developer', status: 'Active', jobTitle: 'Frontend Developer', createdAt: '2026-06-11T10:20:00', lastLoginAt: '2026-10-19T09:30:00' },
  { id: 'USER-004', name: 'Karim Mostafa', email: 'pm@bugtracker.dev', role: 'Project Manager', status: 'Active', jobTitle: 'Product Manager', createdAt: '2026-06-05T13:45:00', lastLoginAt: '2026-10-18T15:10:00' },
  { id: 'USER-005', name: 'Emily Carter', email: 'emily.carter@bugtracker.dev', role: 'Developer', status: 'Active', jobTitle: 'Backend Developer', createdAt: '2026-06-20T09:00:00', lastLoginAt: '2026-10-17T12:05:00' },
  { id: 'USER-006', name: 'Youssef Adel', email: 'youssef.adel@bugtracker.dev', role: 'Tester', status: 'Active', jobTitle: 'Automation Tester', createdAt: '2026-07-01T14:30:00', lastLoginAt: '2026-10-16T10:00:00' },
  { id: 'USER-007', name: 'Mariam Saleh', email: 'mariam.saleh@bugtracker.dev', role: 'Developer', status: 'Active', jobTitle: 'Mobile Developer', createdAt: '2026-07-08T08:50:00', lastLoginAt: '2026-10-18T11:25:00' },
  { id: 'USER-008', name: 'Daniel Park', email: 'daniel.park@bugtracker.dev', role: 'Project Manager', status: 'Active', jobTitle: 'Delivery Manager', createdAt: '2026-07-12T10:10:00', lastLoginAt: '2026-10-15T09:45:00' },
  { id: 'USER-009', name: 'Hana Ibrahim', email: 'hana.ibrahim@bugtracker.dev', role: 'Tester', status: 'Active', jobTitle: 'QA Analyst', createdAt: '2026-08-03T12:00:00', lastLoginAt: '2026-10-14T16:20:00' },
  { id: 'USER-010', name: 'James Wilson', email: 'james.wilson@bugtracker.dev', role: 'Developer', status: 'Inactive', jobTitle: 'Full-stack Developer', createdAt: '2026-06-15T09:30:00', lastLoginAt: '2026-08-29T18:00:00' },
  { id: 'USER-011', name: 'Nour El-Sayed', email: 'nour.elsayed@bugtracker.dev', role: 'Developer', status: 'Active', jobTitle: 'Data Engineer', createdAt: '2026-09-01T10:00:00', lastLoginAt: '2026-10-18T13:00:00' },
  { id: 'USER-012', name: 'Priya Raman', email: 'priya.raman@bugtracker.dev', role: 'Tester', status: 'Inactive', jobTitle: 'QA Intern', createdAt: '2026-07-20T09:00:00', lastLoginAt: '2026-09-05T10:30:00' },
];

/* ===================== Projects ===================== */
export const MOCK_PROJECTS = [
  {
    id: 'PROJ-001',
    key: 'CP',
    name: 'Customer Portal',
    description: 'Self-service web portal where customers manage accounts, invoices and support tickets.',
    status: 'Active',
    managerId: 'USER-004',
    memberIds: ['USER-002', 'USER-003', 'USER-005', 'USER-009'],
    createdAt: '2026-06-12T10:00:00',
    updatedAt: '2026-10-18T16:30:00',
  },
  {
    id: 'PROJ-002',
    key: 'MBA',
    name: 'Mobile Banking App',
    description: 'iOS and Android banking app with transfers, card controls and biometric sign-in.',
    status: 'Active',
    managerId: 'USER-008',
    memberIds: ['USER-006', 'USER-007', 'USER-003', 'USER-002'],
    createdAt: '2026-07-14T09:30:00',
    updatedAt: '2026-10-19T09:10:00',
  },
  {
    id: 'PROJ-003',
    key: 'IMS',
    name: 'Inventory Management System',
    description: 'Internal tool for tracking warehouse stock levels, suppliers and purchase orders.',
    status: 'On Hold',
    managerId: 'USER-004',
    memberIds: ['USER-005', 'USER-009', 'USER-010'],
    createdAt: '2026-06-25T11:15:00',
    updatedAt: '2026-09-30T14:00:00',
  },
  {
    id: 'PROJ-004',
    key: 'ADB',
    name: 'Analytics Dashboard',
    description: 'Real-time KPI dashboard for sales and operations teams with exportable reports.',
    status: 'Active',
    managerId: 'USER-008',
    memberIds: ['USER-011', 'USER-005', 'USER-006'],
    createdAt: '2026-08-10T10:45:00',
    updatedAt: '2026-10-17T12:20:00',
  },
  {
    id: 'PROJ-005',
    key: 'LBM',
    name: 'Legacy Billing Migration',
    description: 'Migration of the legacy billing engine to the new payments platform.',
    status: 'Completed',
    managerId: 'USER-004',
    memberIds: ['USER-003', 'USER-005', 'USER-002'],
    createdAt: '2026-06-03T08:00:00',
    updatedAt: '2026-09-12T17:00:00',
  },
];

/* ===================== Bugs ===================== */
/*
 * comments: [{ id, userId, text, createdAt }]
 * history:  [{ id, type, field, from, to, by, at, note }]
 *   type is one of: "created" | "status" | "assignment" | "priority" | "severity" | "update"
 */
export const MOCK_BUGS = [
  {
    id: 'BUG-001',
    title: 'Login button not working',
    description: 'The login button does not respond after entering valid credentials.',
    severity: 'High', priority: 'Critical', status: 'Open',
    projectId: 'PROJ-001', reportedBy: 'USER-002', assignedTo: 'USER-003',
    createdAt: '2026-10-19T10:00:00', updatedAt: '2026-10-19T10:00:00', deadline: '2026-10-25',
    attachments: [],
    comments: [],
    history: [
      { id: 'HIST-001', type: 'created', field: null, from: null, to: 'Open', by: 'USER-002', at: '2026-10-19T10:00:00', note: 'Bug reported' },
    ],
  },
  {
    id: 'BUG-002',
    title: 'Invoice PDF shows wrong currency symbol',
    description: 'Invoices for EGP accounts render with the USD "$" symbol in the downloaded PDF.',
    severity: 'Medium', priority: 'High', status: 'In Progress',
    projectId: 'PROJ-001', reportedBy: 'USER-009', assignedTo: 'USER-005',
    createdAt: '2026-10-12T09:20:00', updatedAt: '2026-10-16T14:05:00', deadline: '2026-10-22',
    attachments: [],
    comments: [
      { id: 'CMT-001', userId: 'USER-005', text: 'Reproduced. The PDF template ignores the account locale. Working on a fix.', createdAt: '2026-10-16T14:05:00' },
    ],
    history: [
      { id: 'HIST-002', type: 'created', field: null, from: null, to: 'Open', by: 'USER-009', at: '2026-10-12T09:20:00', note: 'Bug reported' },
      { id: 'HIST-003', type: 'status', field: 'status', from: 'Open', to: 'In Progress', by: 'USER-005', at: '2026-10-16T14:05:00', note: '' },
    ],
  },
  {
    id: 'BUG-003',
    title: 'Password reset email never arrives',
    description: 'Requesting a password reset shows a success message, but no email is delivered.',
    severity: 'Critical', priority: 'Critical', status: 'Resolved',
    projectId: 'PROJ-001', reportedBy: 'USER-002', assignedTo: 'USER-005',
    createdAt: '2026-10-02T11:00:00', updatedAt: '2026-10-09T16:45:00', deadline: '2026-10-08',
    attachments: [],
    comments: [
      { id: 'CMT-002', userId: 'USER-005', text: 'SMTP credentials expired on staging. Rotated and added an alert.', createdAt: '2026-10-09T16:40:00' },
      { id: 'CMT-003', userId: 'USER-002', text: 'Verified on staging — emails arrive within a minute.', createdAt: '2026-10-09T17:30:00' },
    ],
    history: [
      { id: 'HIST-004', type: 'created', field: null, from: null, to: 'Open', by: 'USER-002', at: '2026-10-02T11:00:00', note: 'Bug reported' },
      { id: 'HIST-005', type: 'status', field: 'status', from: 'Open', to: 'In Progress', by: 'USER-005', at: '2026-10-05T10:00:00', note: '' },
      { id: 'HIST-006', type: 'status', field: 'status', from: 'In Progress', to: 'Resolved', by: 'USER-005', at: '2026-10-09T16:45:00', note: 'Fixed SMTP config' },
    ],
  },
  {
    id: 'BUG-004',
    title: 'Support ticket list does not paginate',
    description: 'Customers with more than 50 tickets only see the first page; the "Next" button is missing.',
    severity: 'Low', priority: 'Medium', status: 'Open',
    projectId: 'PROJ-001', reportedBy: 'USER-009', assignedTo: 'USER-003',
    createdAt: '2026-10-15T15:30:00', updatedAt: '2026-10-15T15:30:00', deadline: '2026-10-30',
    attachments: [], comments: [],
    history: [
      { id: 'HIST-007', type: 'created', field: null, from: null, to: 'Open', by: 'USER-009', at: '2026-10-15T15:30:00', note: 'Bug reported' },
    ],
  },
  {
    id: 'BUG-005',
    title: 'App crashes when enabling Face ID on iOS 19',
    description: 'Toggling biometric sign-in in Settings closes the app immediately on iPhone 15 devices.',
    severity: 'Critical', priority: 'Critical', status: 'In Progress',
    projectId: 'PROJ-002', reportedBy: 'USER-006', assignedTo: 'USER-007',
    createdAt: '2026-10-14T08:45:00', updatedAt: '2026-10-18T10:15:00', deadline: '2026-10-20',
    attachments: [],
    comments: [
      { id: 'CMT-004', userId: 'USER-007', text: 'Crash log points to a missing NSFaceIDUsageDescription key after the SDK update.', createdAt: '2026-10-18T10:15:00' },
    ],
    history: [
      { id: 'HIST-008', type: 'created', field: null, from: null, to: 'Open', by: 'USER-006', at: '2026-10-14T08:45:00', note: 'Bug reported' },
      { id: 'HIST-009', type: 'status', field: 'status', from: 'Open', to: 'In Progress', by: 'USER-007', at: '2026-10-15T09:00:00', note: '' },
    ],
  },
  {
    id: 'BUG-006',
    title: 'Transfer amount field accepts negative numbers',
    description: 'Users can type "-500" in the transfer amount; the request then fails with a generic error.',
    severity: 'High', priority: 'High', status: 'Open',
    projectId: 'PROJ-002', reportedBy: 'USER-002', assignedTo: 'USER-003',
    createdAt: '2026-10-17T13:10:00', updatedAt: '2026-10-17T13:10:00', deadline: '2026-10-24',
    attachments: [], comments: [],
    history: [
      { id: 'HIST-010', type: 'created', field: null, from: null, to: 'Open', by: 'USER-002', at: '2026-10-17T13:10:00', note: 'Bug reported' },
    ],
  },
  {
    id: 'BUG-007',
    title: 'Card freeze toggle does not update until refresh',
    description: 'After freezing a card, the toggle flips back visually until the screen is pulled to refresh.',
    severity: 'Medium', priority: 'Medium', status: 'Reopened',
    projectId: 'PROJ-002', reportedBy: 'USER-006', assignedTo: 'USER-007',
    createdAt: '2026-09-28T10:00:00', updatedAt: '2026-10-13T11:30:00', deadline: '2026-10-21',
    attachments: [],
    comments: [
      { id: 'CMT-005', userId: 'USER-006', text: 'Still happening on Android 15 after the fix. Reopening.', createdAt: '2026-10-13T11:30:00' },
    ],
    history: [
      { id: 'HIST-011', type: 'created', field: null, from: null, to: 'Open', by: 'USER-006', at: '2026-09-28T10:00:00', note: 'Bug reported' },
      { id: 'HIST-012', type: 'status', field: 'status', from: 'Open', to: 'Resolved', by: 'USER-007', at: '2026-10-08T15:00:00', note: 'Optimistic UI update added' },
      { id: 'HIST-013', type: 'status', field: 'status', from: 'Resolved', to: 'Reopened', by: 'USER-006', at: '2026-10-13T11:30:00', note: 'Fails on Android 15' },
    ],
  },
  {
    id: 'BUG-008',
    title: 'Push notifications arrive twice',
    description: 'Every transaction alert is delivered two times on devices that upgraded from v2.3.',
    severity: 'Low', priority: 'Low', status: 'Closed',
    projectId: 'PROJ-002', reportedBy: 'USER-002', assignedTo: 'USER-007',
    createdAt: '2026-09-15T09:00:00', updatedAt: '2026-09-24T12:00:00', deadline: '2026-09-30',
    attachments: [], comments: [],
    history: [
      { id: 'HIST-014', type: 'created', field: null, from: null, to: 'Open', by: 'USER-002', at: '2026-09-15T09:00:00', note: 'Bug reported' },
      { id: 'HIST-015', type: 'status', field: 'status', from: 'Open', to: 'Resolved', by: 'USER-007', at: '2026-09-22T17:00:00', note: 'Duplicate device token removed' },
      { id: 'HIST-016', type: 'status', field: 'status', from: 'Resolved', to: 'Closed', by: 'USER-002', at: '2026-09-24T12:00:00', note: 'Verified' },
    ],
  },
  {
    id: 'BUG-009',
    title: 'Stock count goes negative after concurrent orders',
    description: 'Two purchase orders processed at the same time can reduce stock below zero.',
    severity: 'High', priority: 'Medium', status: 'Open',
    projectId: 'PROJ-003', reportedBy: 'USER-009', assignedTo: 'USER-005',
    createdAt: '2026-09-20T14:00:00', updatedAt: '2026-09-20T14:00:00', deadline: '2026-11-15',
    attachments: [], comments: [],
    history: [
      { id: 'HIST-017', type: 'created', field: null, from: null, to: 'Open', by: 'USER-009', at: '2026-09-20T14:00:00', note: 'Bug reported' },
    ],
  },
  {
    id: 'BUG-010',
    title: 'Supplier search is case-sensitive',
    description: 'Searching "acme" returns no results while "Acme" works.',
    severity: 'Low', priority: 'Low', status: 'Open',
    projectId: 'PROJ-003', reportedBy: 'USER-009', assignedTo: null,
    createdAt: '2026-09-25T10:30:00', updatedAt: '2026-09-25T10:30:00', deadline: null,
    attachments: [], comments: [],
    history: [
      { id: 'HIST-018', type: 'created', field: null, from: null, to: 'Open', by: 'USER-009', at: '2026-09-25T10:30:00', note: 'Bug reported' },
    ],
  },
  {
    id: 'BUG-011',
    title: 'Revenue chart ignores selected date range',
    description: 'Changing the date range filter updates the table but the revenue chart keeps showing the last 30 days.',
    severity: 'Medium', priority: 'High', status: 'In Progress',
    projectId: 'PROJ-004', reportedBy: 'USER-006', assignedTo: 'USER-011',
    createdAt: '2026-10-10T09:15:00', updatedAt: '2026-10-17T12:20:00', deadline: '2026-10-23',
    attachments: [],
    comments: [
      { id: 'CMT-006', userId: 'USER-011', text: 'The chart component caches the query key. Adding the range to the key.', createdAt: '2026-10-17T12:20:00' },
    ],
    history: [
      { id: 'HIST-019', type: 'created', field: null, from: null, to: 'Open', by: 'USER-006', at: '2026-10-10T09:15:00', note: 'Bug reported' },
      { id: 'HIST-020', type: 'assignment', field: 'assignedTo', from: 'USER-005', to: 'USER-011', by: 'USER-008', at: '2026-10-11T10:00:00', note: 'Reassigned to data team' },
      { id: 'HIST-021', type: 'status', field: 'status', from: 'Open', to: 'In Progress', by: 'USER-011', at: '2026-10-14T09:00:00', note: '' },
    ],
  },
  {
    id: 'BUG-012',
    title: 'CSV export cuts off rows over 10,000',
    description: 'Exports from the Orders report stop at exactly 10,000 rows without any warning.',
    severity: 'High', priority: 'Medium', status: 'Open',
    projectId: 'PROJ-004', reportedBy: 'USER-002', assignedTo: 'USER-005',
    createdAt: '2026-10-18T16:00:00', updatedAt: '2026-10-18T16:00:00', deadline: '2026-10-31',
    attachments: [], comments: [],
    history: [
      { id: 'HIST-022', type: 'created', field: null, from: null, to: 'Open', by: 'USER-002', at: '2026-10-18T16:00:00', note: 'Bug reported' },
    ],
  },
  {
    id: 'BUG-013',
    title: 'Tax rounding differs from legacy system',
    description: 'Totals differ by 0.01 for invoices with more than 20 line items.',
    severity: 'Medium', priority: 'High', status: 'Closed',
    projectId: 'PROJ-005', reportedBy: 'USER-002', assignedTo: 'USER-003',
    createdAt: '2026-08-20T11:00:00', updatedAt: '2026-09-05T15:00:00', deadline: '2026-09-01',
    attachments: [],
    comments: [
      { id: 'CMT-007', userId: 'USER-003', text: 'Switched to banker\'s rounding per line item to match the legacy engine.', createdAt: '2026-08-30T10:00:00' },
    ],
    history: [
      { id: 'HIST-023', type: 'created', field: null, from: null, to: 'Open', by: 'USER-002', at: '2026-08-20T11:00:00', note: 'Bug reported' },
      { id: 'HIST-024', type: 'status', field: 'status', from: 'Open', to: 'Resolved', by: 'USER-003', at: '2026-08-30T10:00:00', note: '' },
      { id: 'HIST-025', type: 'status', field: 'status', from: 'Resolved', to: 'Closed', by: 'USER-004', at: '2026-09-05T15:00:00', note: 'Signed off by finance' },
    ],
  },
  {
    id: 'BUG-014',
    title: 'Duplicate customer records after import',
    description: 'Customers with trailing spaces in their email were imported twice.',
    severity: 'Medium', priority: 'Medium', status: 'Resolved',
    projectId: 'PROJ-005', reportedBy: 'USER-002', assignedTo: 'USER-005',
    createdAt: '2026-08-25T09:30:00', updatedAt: '2026-09-02T13:00:00', deadline: '2026-09-05',
    attachments: [], comments: [],
    history: [
      { id: 'HIST-026', type: 'created', field: null, from: null, to: 'Open', by: 'USER-002', at: '2026-08-25T09:30:00', note: 'Bug reported' },
      { id: 'HIST-027', type: 'status', field: 'status', from: 'Open', to: 'Resolved', by: 'USER-005', at: '2026-09-02T13:00:00', note: 'Emails trimmed before import' },
    ],
  },
];

/* ===================== Settings ===================== */
export const DEFAULT_SYSTEM_SETTINGS = {
  appName: 'BugTrack',
  allowRegistration: true,
  defaultBugPriority: 'Medium',
  defaultBugSeverity: 'Medium',
  maxAttachmentSizeMB: 5,
  sessionTimeoutHours: 0, // 0 = never expire
};

export const DEFAULT_USER_PREFERENCES = {
  theme: 'light',            // 'light' | 'dark'
  dateFormat: 'medium',      // 'medium' (Oct 19, 2026) | 'dmy' (19/10/2026) | 'iso' (2026-10-19)
  sidebarCollapsed: false,
  notifications: {
    bugAssigned: true,
    statusChanged: true,
    newComment: true,
    projectUpdates: false,
    weeklySummary: false,
    channel: 'in-app',       // 'in-app' | 'email' | 'both'
  },
};

/** Shape stored under the "bugtracker.settings" key. */
export const MOCK_SETTINGS = {
  system: { ...DEFAULT_SYSTEM_SETTINGS },
  userPreferences: {
    // userId -> preferences. Missing users fall back to DEFAULT_USER_PREFERENCES.
  },
};
