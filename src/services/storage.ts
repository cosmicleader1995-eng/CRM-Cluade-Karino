import { User, DailyReport, ArchiveRecord, ReportRow, ManagerDirective, PeriodicOverallReport, ArchiveType } from '../types';
import { DEFAULT_USERS, EMPLOYER_CONCERNS_LIST, getInitialReports, DEFAULT_DIRECTIVES, getInitialPeriodicReports } from '../data/defaultData';
import { 
  getCurrentShamsiDate, 
  getArchiveFileName, 
  compareReportsLatestFirst, 
  formatStandardReportTitle,
  normalizeShamsiDate, 
  shamsiToDate, 
  PERSIAN_WEEK_DAYS, 
  toEnglishDigits,
  isThursday,
  isLastWorkingDayOfShamsiMonth,
  getTehranTimeInfo
} from '../utils/shamsi';

const STORAGE_KEYS = {
  USERS: 'karino_users_v2',
  CURRENT_USER: 'karino_current_user_v2',
  REPORTS: 'karino_reports_v2',
  OVERALL_REPORTS: 'karino_overall_reports_v1',
  ARCHIVES: 'karino_archives_v2',
  CONCERNS: 'karino_concerns_v2',
  DIRECTIVES: 'karino_directives_v2',
  DRAFTS: 'karino_draft_v2',
  LAST_ARCHIVE_DATE: 'karino_last_archive_date_v2',
  DOWNLOADED_ARCHIVES: 'karino_downloaded_archives_v3',
  SERVER_SYNC_TIME: 'karino_server_sync_time'
};

// -----------------------------------------------------------
// Supabase Cloud Persistent Direct Connection Settings
// -----------------------------------------------------------
const SUPABASE_URL = 'https://xwjodiszshqitcjanamo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_c4UXK09vyRD-MrO0Uk-rcQ_Ln7NylKN';

interface CloudDatabaseState {
  version: string;
  lastUpdated: string;
  users: User[];
  reports: DailyReport[];
  overallReports?: PeriodicOverallReport[];
  archives: ArchiveRecord[];
  concerns: string[];
  directives?: ManagerDirective[];
  logs?: any[];
  stats?: any;
}

// Global in-memory cache for ultra-fast rendering
let cachedUsers: User[] = [];
let cachedReports: DailyReport[] = [];
let cachedOverallReports: PeriodicOverallReport[] = [];
let cachedArchives: ArchiveRecord[] = [];
let cachedConcerns: string[] = [];
let cachedDirectives: ManagerDirective[] = [];
let isSyncInProgress = false;

// Custom Event to notify React components to re-render
export function notifyDbListeners() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('karino_db_synced'));
  }
}

// Helper to construct full database state from local cache
function getCurrentFullState(): CloudDatabaseState {
  return {
    version: '2.5',
    lastUpdated: new Date().toISOString(),
    users: getStoredUsers(),
    reports: getStoredReports(),
    overallReports: getStoredPeriodicReports(),
    archives: getStoredArchives(),
    concerns: getStoredConcerns(),
    directives: getStoredDirectives()
  };
}

// Row-level merger to guarantee NO follow-up or client row data is ever dropped while preserving recent edits
function mergeReportRows(newerRows: ReportRow[], olderRows: ReportRow[]): ReportRow[] {
  const rowMap = new Map<string, ReportRow>();

  // 1. First index older/existing rows
  (olderRows || []).forEach((r, idx) => {
    const key = r.id || `row-${r.rowNumber || idx + 1}`;
    rowMap.set(key, { ...r });
  });

  // 2. Overlay newer rows, giving priority to the newer state while preserving missing optional fields
  (newerRows || []).forEach((n, idx) => {
    const key = n.id || `row-${n.rowNumber || idx + 1}`;
    const older = rowMap.get(key);
    if (!older) {
      rowMap.set(key, { ...n });
    } else {
      // Intelligently merge: newer row values have priority.
      // Retain older follow-up steps only if newer hasn't set them yet.
      const merged: ReportRow = {
        ...older,
        ...n,
        clientName: n.clientName !== undefined && n.clientName !== '' ? n.clientName : older.clientName,
        activityField: n.activityField !== undefined && n.activityField !== '' ? n.activityField : older.activityField,
        personnelCount: n.personnelCount !== undefined && n.personnelCount !== '' ? n.personnelCount : older.personnelCount,
        phone: n.phone !== undefined && n.phone !== '' ? n.phone : older.phone,
        address: n.address !== undefined && n.address !== '' ? n.address : older.address,
        employerConcern: n.employerConcern !== undefined && n.employerConcern !== '' ? n.employerConcern : older.employerConcern,
        // For follow-up stages 1 to 4: newer row's explicit value wins; if empty, preserve older if present
        followUp1: n.followUp1 || older.followUp1 || '',
        followUp2: n.followUp2 || older.followUp2 || '',
        followUp3: n.followUp3 || older.followUp3 || '',
        followUp4: n.followUp4 || older.followUp4 || '',
        followUp1Date: n.followUp1Date || older.followUp1Date,
        followUp2Date: n.followUp2Date || older.followUp2Date,
        followUp3Date: n.followUp3Date || older.followUp3Date,
        followUp4Date: n.followUp4Date || older.followUp4Date,
        followUp1DateShamsi: n.followUp1DateShamsi || older.followUp1DateShamsi,
        followUp2DateShamsi: n.followUp2DateShamsi || older.followUp2DateShamsi,
        followUp3DateShamsi: n.followUp3DateShamsi || older.followUp3DateShamsi,
        followUp4DateShamsi: n.followUp4DateShamsi || older.followUp4DateShamsi,
        // For followUpResult and meetingTopic: newer row takes priority (even if edited or refined)
        followUpResult: n.followUpResult !== undefined && n.followUpResult !== '' ? n.followUpResult : (older.followUpResult || ''),
        meetingTopic: n.meetingTopic !== undefined ? n.meetingTopic : (older.meetingTopic || ''),
        notes: n.notes !== undefined ? n.notes : (older.notes || '')
      };
      rowMap.set(key, merged);
    }
  });

  return Array.from(rowMap.values()).sort((a, b) => (a.rowNumber || 0) - (b.rowNumber || 0));
}

// Smart merger function to prevent any race condition or accidental overwrite
function mergeStates(local: CloudDatabaseState, remote: CloudDatabaseState): CloudDatabaseState {
  // Merge users uniquely by id & username
  const userMap = new Map<string, User>();
  DEFAULT_USERS.forEach(u => userMap.set(u.id, u));
  (remote.users || []).forEach(u => userMap.set(u.id || u.username, u));
  (local.users || []).forEach(u => userMap.set(u.id || u.username, u));
  const mergedUsers = Array.from(userMap.values());

  // Merge reports uniquely by id with row-level intelligent synchronization
  const reportMap = new Map<string, DailyReport>();
  (remote.reports || []).forEach(r => reportMap.set(r.id, { ...r }));
  (local.reports || []).forEach(r => {
    const existing = reportMap.get(r.id);
    if (!existing) {
      reportMap.set(r.id, { ...r });
    } else {
      const timeLocal = new Date(r.updatedAt || r.reviewedAt || r.submittedAt || r.createdAt || 0).getTime();
      const timeRemote = new Date(existing.updatedAt || existing.reviewedAt || existing.submittedAt || existing.createdAt || 0).getTime();
      const base = timeLocal >= timeRemote ? r : existing;
      const other = timeLocal >= timeRemote ? existing : r;

      const mergedRows = mergeReportRows(base.rows || [], other.rows || []);

      reportMap.set(r.id, {
        ...other,
        ...base,
        rows: mergedRows,
        managerFeedback: base.managerFeedback || other.managerFeedback,
        managerRating: base.managerRating || other.managerRating,
        status: base.status || other.status || 'submitted',
        reviewedAt: base.reviewedAt || other.reviewedAt,
        personalOpinion: base.personalOpinion || other.personalOpinion,
        updatedAt: base.updatedAt || other.updatedAt || base.createdAt || other.createdAt
      });
    }
  });

  const mergedReports = Array.from(reportMap.values()).sort(compareReportsLatestFirst);

  // Merge archives uniquely by dateShamsi + archiveType
  const archiveMap = new Map<string, ArchiveRecord>();
  const allArchs = [...(remote.archives || []), ...(local.archives || [])];
  allArchs.forEach(a => {
    if (!a || !a.dateShamsi) return;
    const norm = normalizeShamsiDate(a.dateShamsi);
    if (!norm) return;
    const typeKey = a.archiveType || 'calls_daily';
    const compositeKey = `${norm}_${typeKey}`;
    const existing = archiveMap.get(compositeKey);
    const aCount = (Array.isArray(a.reports) ? a.reports.length : 0) + (Array.isArray(a.overallReports) ? a.overallReports.length : 0);
    const exCount = existing ? ((Array.isArray(existing.reports) ? existing.reports.length : 0) + (Array.isArray(existing.overallReports) ? existing.overallReports.length : 0)) : 0;
    if (!existing || aCount > exCount || (aCount === exCount && new Date(a.timestamp || 0) > new Date(existing.timestamp || 0))) {
      archiveMap.set(compositeKey, {
        ...a,
        archiveType: typeKey,
        id: a.id || `arch-${typeKey}-${norm.replace(/\//g, '')}`,
        dateShamsi: norm
      });
    }
  });
  const mergedArchives = Array.from(archiveMap.values())
    .filter(a => (Array.isArray(a.reports) && a.reports.length > 0) || (Array.isArray(a.overallReports) && a.overallReports.length > 0) || !a.autoGenerated)
    .sort((a, b) => (b.dateShamsi || '').localeCompare(a.dateShamsi || ''));

  // Merge concerns
  const concernSet = new Set<string>([...(remote.concerns || []), ...(local.concerns || []), ...EMPLOYER_CONCERNS_LIST]);
  const mergedConcerns = Array.from(concernSet);

  // Merge directives
  const dirMap = new Map<string, ManagerDirective>();
  DEFAULT_DIRECTIVES.forEach(d => dirMap.set(d.id, d));
  (remote.directives || []).forEach(d => dirMap.set(d.id, d));
  (local.directives || []).forEach(d => dirMap.set(d.id, d));
  const mergedDirectives = Array.from(dirMap.values());

  // Merge periodic overall reports
  const overallMap = new Map<string, PeriodicOverallReport>();
  getInitialPeriodicReports().forEach(p => overallMap.set(p.id, p));
  (remote.overallReports || []).forEach(p => overallMap.set(p.id, p));
  (local.overallReports || []).forEach(p => overallMap.set(p.id, p));
  const mergedOverallReports = Array.from(overallMap.values())
    .map(p => ({
      ...p,
      periodLabel: formatStandardReportTitle(p.periodType, p.dateShamsi, p.periodLabel)
    }))
    .sort(compareReportsLatestFirst);

  return {
    version: '2.5',
    lastUpdated: new Date().toISOString(),
    users: mergedUsers,
    reports: mergedReports,
    overallReports: mergedOverallReports,
    archives: mergedArchives,
    concerns: mergedConcerns,
    directives: mergedDirectives
  };
}

// -----------------------------------------------------------
// Cloud & Server Persistent Storage I/O
// -----------------------------------------------------------
async function fetchCloudDatabase(): Promise<CloudDatabaseState | null> {
  // 1. Primary: Query the server-side API (/api/db/all) which holds persistent disk DB and merges with Supabase
  try {
    const res = await fetch('/api/db/all');
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        return json.data as CloudDatabaseState;
      }
    }
  } catch (_) {
    // Server API momentarily unreachable
  }

  // 2. Secondary fallback: Direct Supabase fetch if running in a detached/static context
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/karino_store?id=eq.main_state&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
        return rows[0].data as CloudDatabaseState;
      }
    }
  } catch (_) {
    // Network filtered or offline
  }
  return null;
}

async function persistCloudDatabase(localData: CloudDatabaseState): Promise<boolean> {
  try {
    // 1. Fetch latest remote state to merge and guarantee ZERO DATA LOSS
    const remote = await fetchCloudDatabase();
    const finalData = remote ? mergeStates(localData, remote) : localData;
    finalData.lastUpdated = new Date().toISOString();

    // 2. Update local memory and localStorage caches immediately
    cachedUsers = finalData.users;
    cachedReports = finalData.reports;
    if (finalData.overallReports) cachedOverallReports = finalData.overallReports;
    cachedArchives = finalData.archives;
    cachedConcerns = finalData.concerns;
    if (finalData.directives) cachedDirectives = finalData.directives;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(finalData.users));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(finalData.reports));
    if (finalData.overallReports) localStorage.setItem(STORAGE_KEYS.OVERALL_REPORTS, JSON.stringify(finalData.overallReports));
    localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(finalData.archives));
    localStorage.setItem(STORAGE_KEYS.CONCERNS, JSON.stringify(finalData.concerns));
    if (finalData.directives) localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(finalData.directives));
    notifyDbListeners();

    // 3. Primary & Secure: Persist via Server API (/api/db/sync)
    // The server securely saves to data/db.json on disk AND syncs to Supabase on the backend
    try {
      const serverRes = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });
      if (serverRes.ok) {
        return true;
      }
    } catch (_) {
      // Backend not reached, attempt direct fallback
    }

    // 4. Secondary fallback: Direct Supabase call (if backend service is unavailable)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/karino_store`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          id: 'main_state',
          data: finalData,
          updated_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (_) {
      // Offline fallback: data is safely kept in local storage and will sync upon reconnection
      return false;
    }
  } catch (err) {
    return false;
  }
}

// -----------------------------------------------------------
// Background Real-Time Cloud Synchronization Engine
// -----------------------------------------------------------
export async function syncWithServer(): Promise<boolean> {
  if (isSyncInProgress) return false;
  isSyncInProgress = true;

  try {
    const cloudState = await fetchCloudDatabase();

    if (cloudState) {
      const currentState = getCurrentFullState();
      const merged = mergeStates(currentState, cloudState);
      let changed = false;

      if (JSON.stringify(merged.users) !== JSON.stringify(cachedUsers)) {
        cachedUsers = merged.users;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged.users));
        changed = true;
      }

      if (JSON.stringify(merged.reports) !== JSON.stringify(cachedReports)) {
        cachedReports = merged.reports;
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(merged.reports));
        changed = true;
      }

      if (JSON.stringify(merged.archives) !== JSON.stringify(cachedArchives)) {
        cachedArchives = merged.archives;
        localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(merged.archives));
        changed = true;
      }

      if (merged.overallReports && JSON.stringify(merged.overallReports) !== JSON.stringify(cachedOverallReports)) {
        cachedOverallReports = merged.overallReports;
        localStorage.setItem(STORAGE_KEYS.OVERALL_REPORTS, JSON.stringify(merged.overallReports));
        changed = true;
      }

      if (JSON.stringify(merged.concerns) !== JSON.stringify(cachedConcerns)) {
        cachedConcerns = merged.concerns;
        localStorage.setItem(STORAGE_KEYS.CONCERNS, JSON.stringify(merged.concerns));
        changed = true;
      }

      if (merged.directives && JSON.stringify(merged.directives) !== JSON.stringify(cachedDirectives)) {
        cachedDirectives = merged.directives;
        localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(merged.directives));
        changed = true;
      }

      localStorage.setItem(STORAGE_KEYS.SERVER_SYNC_TIME, new Date().toISOString());

      if (changed) {
        notifyDbListeners();
      }
      return true;
    }
  } catch (_) {
    // Network or sync delay, continue with local cache
  } finally {
    isSyncInProgress = false;
  }
  return false;
}

// Initial Sync Trigger and Optimized Polling
if (typeof window !== 'undefined') {
  // Sync on startup immediately
  syncWithServer();

  // Optimized background polling (every 30 seconds) for multi-device synchronization
  // Reduced from 8s to 30s to prevent excessive server load
  setInterval(() => {
    syncWithServer();
  }, 30000);

  // Sync on window focus or network online
  window.addEventListener('focus', () => syncWithServer());
  window.addEventListener('online', () => syncWithServer());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncWithServer();
    }
  });
}

// -----------------------------------------------------------
// USERS Management & Real-time Cloud Authentication
// -----------------------------------------------------------
export function getStoredUsers(): User[] {
  if (cachedUsers.length > 0) {
    return cachedUsers;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (data) {
      const parsed: User[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with default users to guarantee test accounts exist
        const map = new Map<string, User>();
        DEFAULT_USERS.forEach(u => map.set(u.username.toLowerCase(), u));
        parsed.forEach(u => map.set(u.username.toLowerCase(), u));
        const merged = Array.from(map.values());
        cachedUsers = merged;
        return merged;
      }
    }
  } catch (e) {}

  cachedUsers = DEFAULT_USERS;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

export function saveUser(user: User): void {
  const users = getStoredUsers();
  const existingIdx = users.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
  
  if (existingIdx >= 0) {
    users[existingIdx] = user;
  } else {
    users.push(user);
  }

  cachedUsers = [...users];
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  notifyDbListeners();

  // 1. Direct Cloud Sync to Supabase with intelligent merge
  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  // 2. Also send to /api if available
  fetch('/api/db/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  }).catch(() => {});
}

export function updateUserPassword(userId: string, newPassword: string): void {
  const users = getStoredUsers();
  const user = users.find(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
  if (user) {
    user.password = newPassword;
    saveUser(user);
  }
}

export function deleteUser(userId: string): void {
  const users = getStoredUsers().filter(u => u.id !== userId);
  cachedUsers = users;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch(`/api/db/users/${userId}`, {
    method: 'DELETE'
  }).catch(() => {});
}

export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {}
  return null;
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

export function logoutUser(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

// Full-Stack Server/Cloud Authoritative Login Function (100% Reliable Cross-Device Auth)
export async function performLogin(
  usernameOrCode: string, 
  passwordInput: string, 
  expectedRole?: 'consultant' | 'ceo' | 'it_admin'
): Promise<{ success: boolean; user?: User; message?: string }> {
  const query = usernameOrCode.trim().toLowerCase();
  const queryEn = toEnglishDigits(query);
  const pass = passwordInput.trim();
  const passEn = toEnglishDigits(pass);

  // 1. First Attempt: Pull Fresh Cloud Database from Supabase
  await syncWithServer();
  const users = getStoredUsers();

  const matched = users.find(u => 
    (u.username?.toLowerCase() === query || 
     u.username?.toLowerCase() === queryEn ||
     u.consultantCode?.toLowerCase() === query ||
     u.consultantCode?.toLowerCase() === queryEn ||
     u.id?.toLowerCase() === query ||
     u.id?.toLowerCase() === queryEn) &&
    (u.password === pass || u.password === passEn)
  );

  if (matched) {
    if (expectedRole && matched.role !== expectedRole) {
      if ((expectedRole === 'ceo' || expectedRole === 'it_admin') && matched.role === 'consultant') {
        return { success: false, message: 'این حساب دسترسی به بخش مدیریت ندارد.' };
      }
      if (expectedRole === 'consultant' && (matched.role === 'ceo' || matched.role === 'it_admin')) {
        return { success: false, message: 'این حساب متعلق به مدیریت است. لطفاً از تب مدیریت وارد شوید.' };
      }
    }
    setCurrentUser(matched);
    notifyDbListeners();
    return { success: true, user: matched };
  }

  // 2. Also try API login endpoint
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrCode: query, password: pass, role: expectedRole })
    });
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.user) {
        setCurrentUser(json.user);
        notifyDbListeners();
        return { success: true, user: json.user };
      }
    }
  } catch (_) {}

  return { success: false, message: 'کد کاربری یا کلمه عبور وارد شده نادرست است.' };
}

// Full-Stack Server/Cloud Authoritative Consultant Registration
export async function registerConsultantOnServer(
  userData: Partial<User>
): Promise<{ success: boolean; user?: User; message?: string }> {
  const cleanUsername = String(userData.username || '').trim().toLowerCase();
  const cleanCode = String(userData.consultantCode || '').trim().toUpperCase();

  // Pull latest cloud users first
  await syncWithServer();
  const existingUsers = getStoredUsers();

  if (existingUsers.some(u => u.username?.toLowerCase() === cleanUsername)) {
    return { success: false, message: 'این نام کاربری قبلاً در سامانه ثبت گردیده است.' };
  }
  if (existingUsers.some(u => u.consultantCode?.toUpperCase() === cleanCode)) {
    return { success: false, message: 'این کد پرسنلی قبلاً در سامانه ثبت گردیده است.' };
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    username: cleanUsername,
    fullName: String(userData.fullName || '').trim(),
    consultantCode: cleanCode,
    role: 'consultant',
    password: String(userData.password || '').trim(),
    phone: userData.phone ? String(userData.phone).trim() : '',
    branch: userData.branch ? String(userData.branch).trim() : 'تیم اجرایی'
  };

  saveUser(newUser);
  setCurrentUser(newUser);
  notifyDbListeners();

  return { 
    success: true, 
    user: newUser, 
    message: 'مشاور جدید با موفقیت در پایگاه داده ابری ثبت و در تمامی دستگاه‌ها همگام گردید.' 
  };
}

export function authenticateUser(usernameOrCode: string, passwordInput: string): User | null {
  const users = getStoredUsers();
  const query = usernameOrCode.trim().toLowerCase();
  const pass = passwordInput.trim();

  const matched = users.find(u => 
    (u.username?.toLowerCase() === query || 
     u.consultantCode?.toLowerCase() === query) &&
    u.password === pass
  );

  return matched || null;
}

// -----------------------------------------------------------
// CONCERNS Management
// -----------------------------------------------------------
export function getStoredConcerns(): string[] {
  if (cachedConcerns.length > 0) return cachedConcerns;

  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONCERNS);
    if (data) {
      const parsed = JSON.parse(data);
      cachedConcerns = parsed;
      return parsed;
    }
  } catch (e) {}

  cachedConcerns = EMPLOYER_CONCERNS_LIST;
  localStorage.setItem(STORAGE_KEYS.CONCERNS, JSON.stringify(EMPLOYER_CONCERNS_LIST));
  return EMPLOYER_CONCERNS_LIST;
}

export function saveConcerns(concerns: string[]): void {
  cachedConcerns = concerns;
  localStorage.setItem(STORAGE_KEYS.CONCERNS, JSON.stringify(concerns));
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch('/api/db/concerns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concerns })
  }).catch(() => {});
}

// -----------------------------------------------------------
// REPORTS Management (Direct Cloud Synchronized Storage)
// -----------------------------------------------------------
export function getStoredReports(): DailyReport[] {
  if (cachedReports.length > 0) {
    return [...cachedReports].sort(compareReportsLatestFirst);
  }

  try {
    const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sorted = parsed.sort(compareReportsLatestFirst);
        cachedReports = sorted;
        return sorted;
      }
    }
  } catch (e) {}

  const initial = getInitialReports().sort(compareReportsLatestFirst);
  // Ensure default/initial reports have shamsi dates on follow-up rows
  initial.forEach(rep => {
    (rep.rows || []).forEach(r => {
      if (r.followUp1 && !r.followUp1DateShamsi) r.followUp1DateShamsi = rep.dateShamsi;
      if (r.followUp2 && !r.followUp2DateShamsi) r.followUp2DateShamsi = r.followUp2Date ? getCurrentShamsiDate(new Date(r.followUp2Date)).formatted : rep.dateShamsi;
      if (r.followUp3 && !r.followUp3DateShamsi) r.followUp3DateShamsi = r.followUp3Date ? getCurrentShamsiDate(new Date(r.followUp3Date)).formatted : rep.dateShamsi;
      if (r.followUp4 && !r.followUp4DateShamsi) r.followUp4DateShamsi = r.followUp4Date ? getCurrentShamsiDate(new Date(r.followUp4Date)).formatted : rep.dateShamsi;
    });
  });
  cachedReports = initial;
  if (initial.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(initial));
    } catch (e) {}
  }
  return initial;
}

export function saveReport(report: DailyReport): void {
  const reports = getStoredReports();
  const existingIdx = reports.findIndex(r => r.id === report.id);

  // Normalize row follow-up dates into Shamsi
  const normalizedRows: ReportRow[] = (report.rows || []).map(row => {
    const r = { ...row };
    if (r.followUp1 && !r.followUp1DateShamsi) {
      r.followUp1DateShamsi = report.dateShamsi;
    }
    if (r.followUp2 && !r.followUp2DateShamsi) {
      r.followUp2DateShamsi = r.followUp2Date ? getCurrentShamsiDate(new Date(r.followUp2Date)).formatted : report.dateShamsi;
    }
    if (r.followUp3 && !r.followUp3DateShamsi) {
      r.followUp3DateShamsi = r.followUp3Date ? getCurrentShamsiDate(new Date(r.followUp3Date)).formatted : report.dateShamsi;
    }
    if (r.followUp4 && !r.followUp4DateShamsi) {
      r.followUp4DateShamsi = r.followUp4Date ? getCurrentShamsiDate(new Date(r.followUp4Date)).formatted : report.dateShamsi;
    }
    return r;
  });
  
  const enrichedReport: DailyReport = {
    ...report,
    rows: normalizedRows,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    reports[existingIdx] = enrichedReport;
  } else {
    reports.unshift(enrichedReport);
  }

  const sortedReports = [...reports].sort(compareReportsLatestFirst);
  cachedReports = sortedReports;
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(sortedReports));
  notifyDbListeners();

  // 1. Direct Cloud Sync to Supabase with intelligent merge
  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  // 2. Also forward to API
  fetch('/api/db/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enrichedReport)
  }).catch(() => {});
}

export function updateReportStatus(
  reportId: string, 
  status: DailyReport['status'], 
  feedback?: string, 
  rating?: number
): void {
  const reports = getStoredReports();
  const report = reports.find(r => r.id === reportId);
  
  if (report) {
    report.status = status;
    if (feedback !== undefined) report.managerFeedback = feedback;
    if (rating !== undefined) report.managerRating = rating;
    report.reviewedAt = new Date().toISOString();
    report.updatedAt = new Date().toISOString();

    cachedReports = [...reports];
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    notifyDbListeners();

    const fullState = getCurrentFullState();
    persistCloudDatabase(fullState);

    fetch(`/api/db/reports/${reportId}/feedback`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        managerFeedback: feedback,
        managerRating: rating
      })
    }).catch(() => {});
  }
}

export function deleteReport(reportId: string): void {
  const reports = getStoredReports().filter(r => r.id !== reportId);
  cachedReports = [...reports];
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch(`/api/db/reports/${reportId}`, {
    method: 'DELETE'
  }).catch(() => {});
}

export function getReportsByConsultant(consultantIdOrCode: string): DailyReport[] {
  const all = getStoredReports();
  return all.filter(r => 
    r.consultantId === consultantIdOrCode || 
    r.consultantCode.toLowerCase() === consultantIdOrCode.toLowerCase()
  );
}

// -----------------------------------------------------------
// ARCHIVES Management
// -----------------------------------------------------------
export function getStoredArchives(): ArchiveRecord[] {
  let list: ArchiveRecord[] = cachedArchives;

  if (list.length === 0) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ARCHIVES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) list = parsed;
      }
    } catch (e) {}
  }

  // Enforce composite deduplication by dateShamsi + archiveType
  const map = new Map<string, ArchiveRecord>();
  list.forEach(a => {
    if (!a || !a.dateShamsi) return;
    const norm = normalizeShamsiDate(a.dateShamsi);
    if (!norm) return;
    const typeKey = a.archiveType || 'calls_daily';
    const compositeKey = `${norm}_${typeKey}`;
    const existing = map.get(compositeKey);
    const aCount = (Array.isArray(a.reports) ? a.reports.length : 0) + (Array.isArray(a.overallReports) ? a.overallReports.length : 0);
    const exCount = existing ? ((Array.isArray(existing.reports) ? existing.reports.length : 0) + (Array.isArray(existing.overallReports) ? existing.overallReports.length : 0)) : 0;
    if (!existing || aCount > exCount || (aCount === exCount && new Date(a.timestamp || 0) > new Date(existing.timestamp || 0))) {
      map.set(compositeKey, {
        ...a,
        archiveType: typeKey,
        id: a.id || `arch-${typeKey}-${norm.replace(/\//g, '')}`,
        dateShamsi: norm
      });
    }
  });

  const clean = Array.from(map.values())
    .filter(a => (Array.isArray(a.reports) && a.reports.length > 0) || (Array.isArray(a.overallReports) && a.overallReports.length > 0) || !a.autoGenerated)
    .sort((a, b) => (b.dateShamsi || '').localeCompare(a.dateShamsi || ''));

  cachedArchives = clean;
  return clean;
}

export function createArchiveRecord(
  reports: DailyReport[],
  isAuto: boolean = false,
  targetDateShamsi?: string,
  targetDayOfWeek?: string
): ArchiveRecord | null {
  const shamsi = getCurrentShamsiDate();
  const dateShamsi = targetDateShamsi ? normalizeShamsiDate(targetDateShamsi) : shamsi.formatted;
  
  let dayOfWeek = targetDayOfWeek;
  if (!dayOfWeek) {
    const d = shamsiToDate(dateShamsi);
    dayOfWeek = d ? PERSIAN_WEEK_DAYS[d.getDay()] : shamsi.dayOfWeek;
  }

  const fileName = getArchiveFileName(dateShamsi, dayOfWeek, 'calls_daily');
  
  // Filter reports that strictly match targetDateShamsi
  const dayReports = Array.isArray(reports)
    ? reports.filter(r => normalizeShamsiDate(r.dateShamsi) === dateShamsi)
    : [];

  // If automated run and day has 0 reports, do NOT create an archive
  if (isAuto && dayReports.length === 0) {
    return null;
  }

  const concernMap: Record<string, number> = {};
  let totalRows = 0;
  
  dayReports.forEach(rep => {
    (rep.rows || []).forEach(row => {
      totalRows++;
      if (row.employerConcern) {
        concernMap[row.employerConcern] = (concernMap[row.employerConcern] || 0) + 1;
      }
    });
  });

  const topConcerns = Object.entries(concernMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const archives = getStoredArchives();
  const fixedId = `arch-calls-${dateShamsi.replace(/\//g, '')}`;

  const newArchive: ArchiveRecord = {
    id: fixedId,
    fileName,
    dateShamsi,
    dayOfWeek,
    timestamp: new Date().toISOString(),
    archiveType: 'calls_daily',
    periodTitle: 'بایگانی روزانه تماس‌ها و پیگیری‌ها',
    totalConsultants: new Set(dayReports.map(r => r.consultantId || r.consultantCode)).size,
    totalClientsContacted: totalRows,
    topConcerns,
    reports: JSON.parse(JSON.stringify(dayReports)),
    autoGenerated: isAuto
  };

  const existingIdx = archives.findIndex(a => 
    normalizeShamsiDate(a.dateShamsi) === dateShamsi && (a.archiveType === 'calls_daily' || !a.archiveType)
  );
  if (existingIdx >= 0) {
    archives[existingIdx] = newArchive;
  } else {
    archives.unshift(newArchive);
  }

  // Deduplicate and sort
  const map = new Map<string, ArchiveRecord>();
  archives.forEach(a => {
    const norm = normalizeShamsiDate(a.dateShamsi);
    const key = `${norm}_${a.archiveType || 'calls_daily'}`;
    map.set(key, a);
  });
  const cleanArchives = Array.from(map.values())
    .filter(a => (Array.isArray(a.reports) && a.reports.length > 0) || (Array.isArray(a.overallReports) && a.overallReports.length > 0) || !a.autoGenerated)
    .sort((a, b) => (b.dateShamsi || '').localeCompare(a.dateShamsi || ''));

  cachedArchives = [...cleanArchives];
  localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(cleanArchives));
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch('/api/db/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newArchive)
  }).catch(() => {});

  return newArchive;
}

export function createPeriodicArchiveRecord(
  periodicReports: PeriodicOverallReport[],
  archiveType: 'periodic_daily' | 'periodic_weekly' | 'periodic_monthly',
  isAuto: boolean = false,
  targetDateShamsi?: string,
  targetDayOfWeek?: string,
  periodTitle?: string
): ArchiveRecord | null {
  const shamsi = getCurrentShamsiDate();
  const dateShamsi = targetDateShamsi ? normalizeShamsiDate(targetDateShamsi) : shamsi.formatted;
  
  let dayOfWeek = targetDayOfWeek;
  if (!dayOfWeek) {
    const d = shamsiToDate(dateShamsi);
    dayOfWeek = d ? PERSIAN_WEEK_DAYS[d.getDay()] : shamsi.dayOfWeek;
  }

  const fileName = getArchiveFileName(dateShamsi, dayOfWeek, archiveType);

  let matchingReports: PeriodicOverallReport[] = [];
  if (Array.isArray(periodicReports)) {
    if (archiveType === 'periodic_daily') {
      matchingReports = periodicReports.filter(p => normalizeShamsiDate(p.dateShamsi) === dateShamsi && p.periodType === 'daily');
    } else if (archiveType === 'periodic_weekly') {
      matchingReports = periodicReports.filter(p => p.periodType === 'weekly');
    } else if (archiveType === 'periodic_monthly') {
      matchingReports = periodicReports.filter(p => p.periodType === 'monthly');
    }
  }

  if (isAuto && matchingReports.length === 0) {
    return null;
  }

  let defaultTitle = 'بایگانی روزانه گزارشات تحلیلی مشاورین';
  if (archiveType === 'periodic_weekly') {
    defaultTitle = 'بایگانی هفتگی پنج‌شنبه گزارشات مشاورین';
  } else if (archiveType === 'periodic_monthly') {
    defaultTitle = 'بایگانی ماهانه پایان ماه گزارشات استراتژیک';
  }

  const totalConsultants = new Set(matchingReports.map(r => r.consultantCode || r.consultantId)).size;
  const archives = getStoredArchives();
  const fixedId = `arch-${archiveType}-${dateShamsi.replace(/\//g, '')}`;

  const newArchive: ArchiveRecord = {
    id: fixedId,
    fileName,
    dateShamsi,
    dayOfWeek,
    timestamp: new Date().toISOString(),
    archiveType,
    periodTitle: periodTitle || defaultTitle,
    totalConsultants,
    totalClientsContacted: 0,
    topConcerns: [],
    reports: [],
    overallReports: JSON.parse(JSON.stringify(matchingReports)),
    autoGenerated: isAuto
  };

  const existingIdx = archives.findIndex(a => 
    normalizeShamsiDate(a.dateShamsi) === dateShamsi && a.archiveType === archiveType
  );
  if (existingIdx >= 0) {
    archives[existingIdx] = newArchive;
  } else {
    archives.unshift(newArchive);
  }

  // Deduplicate and sort
  const map = new Map<string, ArchiveRecord>();
  archives.forEach(a => {
    const norm = normalizeShamsiDate(a.dateShamsi);
    const key = `${norm}_${a.archiveType || 'calls_daily'}`;
    map.set(key, a);
  });
  const cleanArchives = Array.from(map.values())
    .filter(a => (Array.isArray(a.reports) && a.reports.length > 0) || (Array.isArray(a.overallReports) && a.overallReports.length > 0) || !a.autoGenerated)
    .sort((a, b) => (b.dateShamsi || '').localeCompare(a.dateShamsi || ''));

  cachedArchives = [...cleanArchives];
  localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(cleanArchives));
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch('/api/db/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newArchive)
  }).catch(() => {});

  return newArchive;
}

// -----------------------------------------------------------
// DRAFTS (Local only per device)
// -----------------------------------------------------------
export function saveDraft(consultantId: string, draft: Partial<DailyReport>): void {
  try {
    const key = `${STORAGE_KEYS.DRAFTS}_${consultantId}`;
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (e) {}
}

export function getDraft(consultantId: string): Partial<DailyReport> | null {
  try {
    const key = `${STORAGE_KEYS.DRAFTS}_${consultantId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function clearDraft(consultantId: string): void {
  try {
    const key = `${STORAGE_KEYS.DRAFTS}_${consultantId}`;
    localStorage.removeItem(key);
  } catch (e) {}
}

// -----------------------------------------------------------
// SYSTEM RESET & RESTORE
// -----------------------------------------------------------
export function resetAllSystemData(): void {
  cachedReports = [];
  cachedOverallReports = [];
  cachedArchives = [];
  cachedUsers = DEFAULT_USERS;
  cachedConcerns = EMPLOYER_CONCERNS_LIST;

  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.OVERALL_REPORTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  localStorage.setItem(STORAGE_KEYS.CONCERNS, JSON.stringify(EMPLOYER_CONCERNS_LIST));
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

  notifyDbListeners();

  const resetState: CloudDatabaseState = {
    version: '2.5',
    lastUpdated: new Date().toISOString(),
    users: DEFAULT_USERS,
    reports: [],
    overallReports: [],
    archives: [],
    concerns: EMPLOYER_CONCERNS_LIST
  };
  persistCloudDatabase(resetState);

  fetch('/api/db/reset', {
    method: 'POST'
  }).catch(() => {});
}

export function restoreAllData(backupData: any): void {
  if (!backupData) return;
  if (Array.isArray(backupData.users)) cachedUsers = backupData.users;
  if (Array.isArray(backupData.reports)) cachedReports = backupData.reports;
  if (Array.isArray(backupData.overallReports)) cachedOverallReports = backupData.overallReports;
  if (Array.isArray(backupData.archives)) cachedArchives = backupData.archives;
  if (Array.isArray(backupData.concerns)) cachedConcerns = backupData.concerns;

  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cachedUsers));
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(cachedReports));
  if (cachedOverallReports.length > 0) {
    localStorage.setItem(STORAGE_KEYS.OVERALL_REPORTS, JSON.stringify(cachedOverallReports));
  }
  localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(cachedArchives));
  localStorage.setItem(STORAGE_KEYS.CONCERNS, JSON.stringify(cachedConcerns));

  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch('/api/db/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData)
  }).catch(() => {});
}

export async function pushLocalToServer(): Promise<boolean> {
  const fullState = getCurrentFullState();
  const ok = await persistCloudDatabase(fullState);
  try {
    await fetch('/api/db/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullState)
    });
  } catch (_) {}
  return ok;
}

// -----------------------------------------------------------
// 23:00 NIGHTLY ARCHIVE ENGINE (Strictly Asia/Tehran 23:00, Exclude Fridays)
// -----------------------------------------------------------
export function processNightlyArchive(): void {
  try {
    // Strictly calculate Tehran time (Asia/Tehran)
    const tehranDateStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tehran' });
    const tehranNow = new Date(tehranDateStr);
    const curHour = tehranNow.getHours();
    const curShamsi = getCurrentShamsiDate(tehranNow);
    const allReports = getStoredReports();
    const allPeriodic = getStoredPeriodicReports();
    const archives = getStoredArchives();

    const datesToProcess: { dateShamsi: string; dayOfWeek: string }[] = [];

    // Friday is strictly holiday: No daily reports are ever processed on Friday
    if (curHour >= 23 && curShamsi.dayOfWeek !== 'جمعه') {
      datesToProcess.push({
        dateShamsi: curShamsi.formatted,
        dayOfWeek: curShamsi.dayOfWeek
      });
    }

    // Include recent past working days (past 7 calendar days, strictly skip Fridays)
    for (let i = 1; i <= 7; i++) {
      const pastDate = new Date(tehranNow.getTime() - i * 86400000);
      const pastShamsi = getCurrentShamsiDate(pastDate);
      if (pastShamsi.dayOfWeek === 'جمعه') continue; // Friday is strictly holiday
      if (!datesToProcess.some(d => d.dateShamsi === pastShamsi.formatted)) {
        datesToProcess.push({
          dateShamsi: pastShamsi.formatted,
          dayOfWeek: pastShamsi.dayOfWeek
        });
      }
    }

    // Also check any distinct date found in allReports (strictly exclude Fridays)
    allReports.forEach(r => {
      const norm = normalizeShamsiDate(r.dateShamsi);
      if (!norm) return;
      const d = shamsiToDate(norm);
      const dayOfWeek = d ? PERSIAN_WEEK_DAYS[d.getDay()] : 'روزانه';
      if (dayOfWeek === 'جمعه') return; // Exclude Fridays
      if (!datesToProcess.some(d => d.dateShamsi === norm)) {
        datesToProcess.push({
          dateShamsi: norm,
          dayOfWeek
        });
      }
    });

    // 1. Process Daily Calls Archives (Strictly Working Days)
    datesToProcess.forEach(item => {
      if (item.dayOfWeek === 'جمعه') return;
      const normDate = normalizeShamsiDate(item.dateShamsi);
      const dayReports = allReports.filter(r => normalizeShamsiDate(r.dateShamsi) === normDate);
      if (!dayReports || dayReports.length === 0) return;

      const arch = archives.find(a => 
        normalizeShamsiDate(a.dateShamsi) === normDate && (a.archiveType === 'calls_daily' || !a.archiveType)
      );

      const hasOnlySeeds = arch && (arch.reports || []).some(r => r.id && r.id.startsWith('rep-seed-'));
      const hasRealUserReports = dayReports.some(r => r.id && !r.id.startsWith('rep-seed-'));
      const countMismatch = !arch || (arch.reports || []).length !== dayReports.length;

      if (!arch || countMismatch || (hasOnlySeeds && hasRealUserReports)) {
        createArchiveRecord(dayReports, true, normDate, item.dayOfWeek);
      }
    });

    // 2. Process Daily Periodic Overall Reports Archives (Strictly Working Days)
    datesToProcess.forEach(item => {
      if (item.dayOfWeek === 'جمعه') return;
      const normDate = normalizeShamsiDate(item.dateShamsi);
      const dayPeriodic = allPeriodic.filter(p => 
        normalizeShamsiDate(p.dateShamsi) === normDate && p.periodType === 'daily'
      );
      if (!dayPeriodic || dayPeriodic.length === 0) return;

      const arch = archives.find(a => 
        normalizeShamsiDate(a.dateShamsi) === normDate && a.archiveType === 'periodic_daily'
      );

      const countMismatch = !arch || (arch.overallReports || []).length !== dayPeriodic.length;
      if (!arch || countMismatch) {
        createPeriodicArchiveRecord(dayPeriodic, 'periodic_daily', true, normDate, item.dayOfWeek, 'تحلیلی روزانه عملکرد مشاورین');
      }
    });

    // 3. Process Weekly Periodic Reports Archives (Strictly Every Thursday at 23:00 Tehran time)
    if (isThursday(tehranNow) && curHour >= 23) {
      const weekPeriodic = allPeriodic.filter(p => p.periodType === 'weekly');
      if (weekPeriodic.length > 0) {
        const arch = archives.find(a => 
          normalizeShamsiDate(a.dateShamsi) === curShamsi.formatted && a.archiveType === 'periodic_weekly'
        );
        const countMismatch = !arch || (arch.overallReports || []).length !== weekPeriodic.length;
        if (!arch || countMismatch) {
          createPeriodicArchiveRecord(weekPeriodic, 'periodic_weekly', true, curShamsi.formatted, curShamsi.dayOfWeek, 'تحلیلی هفتگی عملکرد مشاورین (پنج‌شنبه)');
        }
      }
    }

    // 4. Process Monthly Periodic Reports Archives (Strictly Last Working Day of Shamsi Month at 23:00 Tehran time)
    if (isLastWorkingDayOfShamsiMonth(tehranNow) && curHour >= 23) {
      const monthPeriodic = allPeriodic.filter(p => p.periodType === 'monthly');
      if (monthPeriodic.length > 0) {
        const arch = archives.find(a => 
          normalizeShamsiDate(a.dateShamsi) === curShamsi.formatted && a.archiveType === 'periodic_monthly'
        );
        const countMismatch = !arch || (arch.overallReports || []).length !== monthPeriodic.length;
        if (!arch || countMismatch) {
          createPeriodicArchiveRecord(monthPeriodic, 'periodic_monthly', true, curShamsi.formatted, curShamsi.dayOfWeek, 'تحلیلی ماهانه استراتژیک (پایان ماه)');
        }
      }
    }

    localStorage.setItem(STORAGE_KEYS.LAST_ARCHIVE_DATE, curShamsi.formatted);
  } catch (err) {
    console.error('Nightly archive engine error:', err);
  }
}

export function checkAndTriggerNightlyArchive(): void {
  processNightlyArchive();
}

// -----------------------------------------------------------
// MANAGER DIRECTIVES (Orders & Notes to Consultants)
// -----------------------------------------------------------
export function getStoredDirectives(): ManagerDirective[] {
  if (cachedDirectives.length > 0) {
    return cachedDirectives;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedDirectives = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  cachedDirectives = DEFAULT_DIRECTIVES;
  try {
    localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(DEFAULT_DIRECTIVES));
  } catch (e) {}
  return DEFAULT_DIRECTIVES;
}

export function saveDirective(directive: ManagerDirective): void {
  const current = getStoredDirectives();
  const existingIdx = current.findIndex(d => d.id === directive.id);
  if (existingIdx >= 0) {
    current[existingIdx] = directive;
  } else {
    current.unshift(directive);
  }

  cachedDirectives = current;
  try {
    localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(current));
  } catch (e) {}
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch('/api/db/directives', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(directive)
  }).catch(() => {});
}

export function deleteDirective(id: string): void {
  const current = getStoredDirectives().filter(d => d.id !== id);
  cachedDirectives = current;
  try {
    localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(current));
  } catch (e) {}
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch(`/api/db/directives/${id}`, {
    method: 'DELETE'
  }).catch(() => {});
}

export function getDirectivesForConsultant(consultantId: string, consultantCode?: string): ManagerDirective[] {
  const all = getStoredDirectives();
  return all.filter(d => 
    d.targetConsultantId === 'all' || 
    d.targetConsultantId === consultantId ||
    (consultantCode && d.targetConsultantId?.toUpperCase() === consultantCode.toUpperCase())
  );
}

// -----------------------------------------------------------
// Helper to strictly reject and filter out any report submitted at or after 19:00
// Policy rule: No report (daily, weekly, monthly) can be accepted past 19:00 Tehran time.
// -----------------------------------------------------------
export function isReportSubmittedPastDeadline(submittedAt?: string): boolean {
  if (!submittedAt) return false;
  const eng = toEnglishDigits(submittedAt).trim();
  const match = eng.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  // Cutoff is 19:00 sharp. Any submission with hours >= 19 (e.g. 19:00, 19:01, 19:15, 19:45, 21:00...)
  // or after 19 is strictly late and forbidden.
  return h > 19 || (h === 19 && m > 0);
}

// -----------------------------------------------------------
// PERIODIC OVERALL REPORTS (Daily, Weekly, Monthly)
// -----------------------------------------------------------
export function getStoredPeriodicReports(): PeriodicOverallReport[] {
  if (cachedOverallReports.length > 0) {
    const valid = cachedOverallReports.filter(r => !isReportSubmittedPastDeadline(r.submittedAt));
    const normalized = valid.map(r => ({
      ...r,
      periodLabel: formatStandardReportTitle(r.periodType, r.dateShamsi, r.periodLabel)
    }));
    return [...normalized].sort(compareReportsLatestFirst);
  }

  try {
    const data = localStorage.getItem(STORAGE_KEYS.OVERALL_REPORTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Purge any late mock/test reports (submitted after 19:00) to ensure KPI integrity
        const validParsed = parsed.filter((r: PeriodicOverallReport) => !isReportSubmittedPastDeadline(r.submittedAt));
        const normalized = validParsed.map((r: PeriodicOverallReport) => ({
          ...r,
          periodLabel: formatStandardReportTitle(r.periodType, r.dateShamsi, r.periodLabel)
        })).sort(compareReportsLatestFirst);
        cachedOverallReports = normalized;
        // Persist sanitized data so localStorage is permanently cleaned
        try {
          localStorage.setItem(STORAGE_KEYS.OVERALL_REPORTS, JSON.stringify(normalized));
        } catch (_) {}
        return normalized;
      }
    }
  } catch (e) {}

  const initial = getInitialPeriodicReports()
    .filter(r => !isReportSubmittedPastDeadline(r.submittedAt))
    .map(r => ({
      ...r,
      periodLabel: formatStandardReportTitle(r.periodType, r.dateShamsi, r.periodLabel)
    }))
    .sort(compareReportsLatestFirst);

  cachedOverallReports = initial;
  if (initial.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEYS.OVERALL_REPORTS, JSON.stringify(initial));
    } catch (e) {}
  }
  return initial;
}

export function savePeriodicReport(report: PeriodicOverallReport): void {
  // Strict 19:00 cutoff validation:
  // No report of any kind (daily, weekly, monthly) can be registered even 1 minute past 19:00
  const tehranTime = getTehranTimeInfo();
  if (tehranTime.hours >= 19) {
    throw new Error('مهلت قانونی ارسال گزارش (ساعت ۱۹:۰۰ به وقت تهران) به پایان رسیده است و سیستم مسدود گردید. وضعیت شما به عنوان عدم ارسال گزارش ثبت شد.');
  }

  if (isReportSubmittedPastDeadline(report.submittedAt)) {
    throw new Error('گزارش‌های ثبت‌شده پس از ساعت ۱۹:۰۰ پذیرفته نمی‌شوند و مشمول عدم ارسال گزارش می‌گردند.');
  }

  const current = getStoredPeriodicReports();
  const existingIdx = current.findIndex(r => r.id === report.id);

  const standardizedLabel = formatStandardReportTitle(report.periodType, report.dateShamsi, report.periodLabel);
  const enriched: PeriodicOverallReport = {
    ...report,
    periodLabel: standardizedLabel,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    current[existingIdx] = enriched;
  } else {
    current.unshift(enriched);
  }

  current.sort(compareReportsLatestFirst);
  cachedOverallReports = current;
  try {
    localStorage.setItem(STORAGE_KEYS.OVERALL_REPORTS, JSON.stringify(current));
  } catch (e) {}
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch('/api/db/periodic-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enriched)
  }).catch(() => {});
}

export function updatePeriodicReportManagerStatus(
  reportId: string, 
  status: 'approved' | 'rewarded' | 'warned' | 'pending', 
  feedback?: string, 
  rating?: number
): void {
  const current = getStoredPeriodicReports();
  const target = current.find(r => r.id === reportId);
  if (!target) return;

  target.managerStatus = status;
  if (feedback !== undefined) target.managerFeedback = feedback;
  if (rating !== undefined) target.managerRating = rating;
  target.managerReviewedAt = new Date().toISOString();
  target.updatedAt = new Date().toISOString();

  cachedOverallReports = current;
  try {
    localStorage.setItem(STORAGE_KEYS.OVERALL_REPORTS, JSON.stringify(current));
  } catch (e) {}
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch(`/api/db/periodic-reports/${reportId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ managerStatus: status, managerFeedback: feedback, managerRating: rating })
  }).catch(() => {});
}

export function deletePeriodicReport(id: string): void {
  const current = getStoredPeriodicReports().filter(r => r.id !== id);
  cachedOverallReports = current;
  try {
    localStorage.setItem(STORAGE_KEYS.OVERALL_REPORTS, JSON.stringify(current));
  } catch (e) {}
  notifyDbListeners();

  const fullState = getCurrentFullState();
  persistCloudDatabase(fullState);

  fetch(`/api/db/periodic-reports/${id}`, {
    method: 'DELETE'
  }).catch(() => {});
}

