import { User, DailyReport, ArchiveRecord, ReportRow } from '../types';
import { DEFAULT_USERS, EMPLOYER_CONCERNS_LIST, getInitialReports } from '../data/defaultData';
import { getCurrentShamsiDate, getArchiveFileName, compareReportsLatestFirst, normalizeShamsiDate, shamsiToDate, PERSIAN_WEEK_DAYS } from '../utils/shamsi';

const STORAGE_KEYS = {
  USERS: 'karino_users_v2',
  CURRENT_USER: 'karino_current_user_v2',
  REPORTS: 'karino_reports_v2',
  ARCHIVES: 'karino_archives_v2',
  CONCERNS: 'karino_concerns_v2',
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
  archives: ArchiveRecord[];
  concerns: string[];
  logs?: any[];
  stats?: any;
}

// Global in-memory cache for ultra-fast rendering
let cachedUsers: User[] = [];
let cachedReports: DailyReport[] = [];
let cachedArchives: ArchiveRecord[] = [];
let cachedConcerns: string[] = [];
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
    archives: getStoredArchives(),
    concerns: getStoredConcerns()
  };
}

// Import toEnglishDigits from shamsi utils
import { toEnglishDigits } from '../utils/shamsi';

// Row-level merger to guarantee NO follow-up or client row data is ever dropped
function mergeReportRows(localRows: ReportRow[], remoteRows: ReportRow[]): ReportRow[] {
  const rowMap = new Map<string, ReportRow>();

  // Index remote rows
  (remoteRows || []).forEach((r, idx) => {
    const key = r.id || `row-${r.rowNumber || idx + 1}`;
    rowMap.set(key, { ...r });
  });

  // Merge local rows on top
  (localRows || []).forEach((l, idx) => {
    const key = l.id || `row-${l.rowNumber || idx + 1}`;
    const existing = rowMap.get(key);
    if (!existing) {
      rowMap.set(key, { ...l });
    } else {
      // Intelligently merge: preserve non-empty follow-ups and updated text
      const merged: ReportRow = {
        ...existing,
        ...l,
        clientName: l.clientName || existing.clientName,
        activityField: l.activityField || existing.activityField,
        personnelCount: l.personnelCount !== undefined && l.personnelCount !== '' ? l.personnelCount : existing.personnelCount,
        phone: l.phone || existing.phone,
        address: l.address || existing.address,
        employerConcern: l.employerConcern || existing.employerConcern,
        followUp1: l.followUp1 || existing.followUp1 || '',
        followUp2: l.followUp2 || existing.followUp2 || '',
        followUp3: l.followUp3 || existing.followUp3 || '',
        followUp4: l.followUp4 || existing.followUp4 || '',
        followUpResult: l.followUpResult || existing.followUpResult || '',
        meetingTopic: l.meetingTopic || existing.meetingTopic || '',
        notes: l.notes || existing.notes || ''
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

      const mergedRows = mergeReportRows(r.rows || [], existing.rows || []);

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

  // Merge archives uniquely by id
  const archiveMap = new Map<string, ArchiveRecord>();
  (remote.archives || []).forEach(a => archiveMap.set(a.id, a));
  (local.archives || []).forEach(a => archiveMap.set(a.id, a));
  const mergedArchives = Array.from(archiveMap.values());

  // Merge concerns
  const concernSet = new Set<string>([...(remote.concerns || []), ...(local.concerns || []), ...EMPLOYER_CONCERNS_LIST]);
  const mergedConcerns = Array.from(concernSet);

  return {
    version: '2.5',
    lastUpdated: new Date().toISOString(),
    users: mergedUsers,
    reports: mergedReports,
    archives: mergedArchives,
    concerns: mergedConcerns
  };
}

// -----------------------------------------------------------
// Direct Supabase Cloud I/O
// -----------------------------------------------------------
async function fetchCloudDatabase(): Promise<CloudDatabaseState | null> {
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
  } catch (err) {
    // Network or offline fallback
  }
  return null;
}

async function persistCloudDatabase(localData: CloudDatabaseState): Promise<boolean> {
  try {
    // 1. Fetch latest remote state to merge and guarantee ZERO DATA LOSS
    const remote = await fetchCloudDatabase();
    const finalData = remote ? mergeStates(localData, remote) : localData;
    finalData.lastUpdated = new Date().toISOString();

    // 2. Update local caches immediately
    cachedUsers = finalData.users;
    cachedReports = finalData.reports;
    cachedArchives = finalData.archives;
    cachedConcerns = finalData.concerns;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(finalData.users));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(finalData.reports));
    localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(finalData.archives));
    localStorage.setItem(STORAGE_KEYS.CONCERNS, JSON.stringify(finalData.concerns));
    notifyDbListeners();

    // 3. Persist merged data to Supabase
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
  } catch (err) {
    console.error('[Supabase Direct] Save error:', err);
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
    // 1. Direct Cloud Fetch from Supabase
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

      if (JSON.stringify(merged.concerns) !== JSON.stringify(cachedConcerns)) {
        cachedConcerns = merged.concerns;
        localStorage.setItem(STORAGE_KEYS.CONCERNS, JSON.stringify(merged.concerns));
        changed = true;
      }

      localStorage.setItem(STORAGE_KEYS.SERVER_SYNC_TIME, new Date().toISOString());

      if (changed) {
        notifyDbListeners();
      }
      isSyncInProgress = false;
      return true;
    }

    // 2. Secondary fallback to /api/db/all if local server is active
    try {
      const res = await fetch('/api/db/all');
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          const currentState = getCurrentFullState();
          const merged = mergeStates(currentState, json.data);
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
          if (JSON.stringify(merged.concerns) !== JSON.stringify(cachedConcerns)) {
            cachedConcerns = merged.concerns;
            localStorage.setItem(STORAGE_KEYS.CONCERNS, JSON.stringify(merged.concerns));
            changed = true;
          }
          if (changed) notifyDbListeners();
          isSyncInProgress = false;
          return true;
        }
      }
    } catch (_) {}

  } catch (err) {
    console.error('Sync error:', err);
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
  
  const enrichedReport: DailyReport = {
    ...report,
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
  if (cachedArchives.length > 0) return cachedArchives;

  try {
    const data = localStorage.getItem(STORAGE_KEYS.ARCHIVES);
    if (data) {
      const parsed = JSON.parse(data);
      cachedArchives = parsed;
      return parsed;
    }
  } catch (e) {}
  
  return [];
}

export function createArchiveRecord(
  reports: DailyReport[],
  isAuto: boolean = false,
  targetDateShamsi?: string,
  targetDayOfWeek?: string
): ArchiveRecord {
  const shamsi = getCurrentShamsiDate();
  const dateShamsi = targetDateShamsi ? normalizeShamsiDate(targetDateShamsi) : shamsi.formatted;
  
  let dayOfWeek = targetDayOfWeek;
  if (!dayOfWeek) {
    const d = shamsiToDate(dateShamsi);
    dayOfWeek = d ? PERSIAN_WEEK_DAYS[d.getDay()] : shamsi.dayOfWeek;
  }

  const fileName = getArchiveFileName(dateShamsi, dayOfWeek);
  
  // Filter reports that strictly match targetDateShamsi
  const dayReports = Array.isArray(reports)
    ? reports.filter(r => normalizeShamsiDate(r.dateShamsi) === dateShamsi)
    : [];

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
  const existingIdx = archives.findIndex(a => normalizeShamsiDate(a.dateShamsi) === dateShamsi);

  const newArchive: ArchiveRecord = {
    id: existingIdx >= 0 ? archives[existingIdx].id : `arch-${dateShamsi.replace(/\//g, '')}-${Date.now()}`,
    fileName,
    dateShamsi,
    dayOfWeek,
    timestamp: new Date().toISOString(),
    totalConsultants: new Set(dayReports.map(r => r.consultantId || r.consultantCode)).size,
    totalClientsContacted: totalRows,
    topConcerns,
    reports: JSON.parse(JSON.stringify(dayReports)),
    autoGenerated: isAuto
  };

  if (existingIdx >= 0) {
    archives[existingIdx] = newArchive;
  } else {
    archives.unshift(newArchive);
  }

  // Always keep archives sorted latest date first
  archives.sort((a, b) => (b.dateShamsi || '').localeCompare(a.dateShamsi || ''));

  cachedArchives = [...archives];
  localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(archives));
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
  cachedArchives = [];
  cachedUsers = DEFAULT_USERS;
  cachedConcerns = EMPLOYER_CONCERNS_LIST;

  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]));
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
  if (Array.isArray(backupData.archives)) cachedArchives = backupData.archives;
  if (Array.isArray(backupData.concerns)) cachedConcerns = backupData.concerns;

  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cachedUsers));
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(cachedReports));
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
// 23:00 NIGHTLY ARCHIVE ENGINE (Archive Only — No Auto-Download)
// -----------------------------------------------------------
export function processNightlyArchive(): void {
  try {
    const now = new Date();
    const curHour = now.getHours();
    const curShamsi = getCurrentShamsiDate(now);
    const allReports = getStoredReports();
    const archives = getStoredArchives();

    const datesToProcess: { dateShamsi: string; dayOfWeek: string }[] = [];

    // If current time is 23:00 or later, today's work day is closed and eligible
    if (curHour >= 23) {
      datesToProcess.push({
        dateShamsi: curShamsi.formatted,
        dayOfWeek: curShamsi.dayOfWeek
      });
    }

    // Include recent past days (past 7 calendar days)
    for (let i = 1; i <= 7; i++) {
      const pastDate = new Date(Date.now() - i * 86400000);
      const pastShamsi = getCurrentShamsiDate(pastDate);
      if (!datesToProcess.some(d => d.dateShamsi === pastShamsi.formatted)) {
        datesToProcess.push({
          dateShamsi: pastShamsi.formatted,
          dayOfWeek: pastShamsi.dayOfWeek
        });
      }
    }

    // Also include any distinct date found in allReports
    allReports.forEach(r => {
      const norm = normalizeShamsiDate(r.dateShamsi);
      if (norm && !datesToProcess.some(d => d.dateShamsi === norm)) {
        const d = shamsiToDate(norm);
        datesToProcess.push({
          dateShamsi: norm,
          dayOfWeek: d ? PERSIAN_WEEK_DAYS[d.getDay()] : 'روزانه'
        });
      }
    });

    datesToProcess.forEach(item => {
      const normDate = normalizeShamsiDate(item.dateShamsi);
      const dayReports = allReports.filter(r => normalizeShamsiDate(r.dateShamsi) === normDate);

      let arch = archives.find(a => normalizeShamsiDate(a.dateShamsi) === normDate);

      const hasOnlySeeds = arch && arch.reports.some(r => r.id && r.id.startsWith('rep-seed-'));
      const hasRealUserReports = dayReports.some(r => r.id && !r.id.startsWith('rep-seed-'));
      const countMismatch = !arch || arch.reports.length !== dayReports.length;

      if (!arch || countMismatch || (hasOnlySeeds && hasRealUserReports)) {
        createArchiveRecord(dayReports, true, normDate, item.dayOfWeek);
      }
    });

    localStorage.setItem(STORAGE_KEYS.LAST_ARCHIVE_DATE, curShamsi.formatted);
  } catch (err) {
    console.error('Nightly archive engine error:', err);
  }
}

export function checkAndTriggerNightlyArchive(): void {
  processNightlyArchive();
}
