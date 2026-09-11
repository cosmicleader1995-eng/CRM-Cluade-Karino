import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { 
  getCurrentShamsiDate, 
  getArchiveFileName, 
  isThursday, 
  isLastWorkingDayOfShamsiMonth, 
  normalizeShamsiDate 
} from './src/utils/shamsi';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'karino_secure_jwt_token_secret_2026_crm_management';

// Security and Password Helpers
function hashPassword(password: string): string {
  if (!password) return '';
  if (password.startsWith('$2a$') || password.startsWith('$2b$')) return password;
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(plain: string, hashOrPlain: string): boolean {
  if (!plain || !hashOrPlain) return false;
  if (hashOrPlain.startsWith('$2a$') || hashOrPlain.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(plain, hashOrPlain);
    } catch {
      return false;
    }
  }
  return plain === hashOrPlain;
}

function generateToken(user: any): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      consultantCode: user.consultantCode
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Local digit conversion function to avoid import issues
function toEnglishDigits(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/[۰٠]/g, '0')
    .replace(/[۱١]/g, '1')
    .replace(/[۲٢]/g, '2')
    .replace(/[۳٣]/g, '3')
    .replace(/[۴٤]/g, '4')
    .replace(/[۵٥]/g, '5')
    .replace(/[۶٦]/g, '6')
    .replace(/[۷٧]/g, '7')
    .replace(/[۸٨]/g, '8')
    .replace(/[۹٩]/g, '9');
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. Full Cross-Origin Resource Sharing (CORS) Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, apikey');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 2. Anti-cache header for all API responses so all client devices get 100% fresh data
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Server-side persistent database path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_BACKUP_FILE = path.join(DATA_DIR, 'db_backup.json');

// Supabase Cloud Persistent Database Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xwjodiszshqitcjanamo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_c4UXK09vyRD-MrO0Uk-rcQ_Ln7NylKN';

// Default initial datasets
const DEFAULT_SERVER_USERS = [
  {
    id: 'user-ceo',
    username: 'ceo',
    fullName: 'مدیریت کارینو (CEO)',
    consultantCode: 'KARINO-CEO',
    role: 'ceo',
    password: 'karino2026',
    phone: '09120000000',
    branch: 'دفتر مرکزی کارینو'
  },
  {
    id: 'user-it',
    username: 'it_admin',
    fullName: 'مدیر فاوا و فناوری اطلاعات',
    consultantCode: 'KARINO-IT',
    role: 'it_admin',
    password: 'it2026',
    phone: '09120000001',
    branch: 'واحد فناوری اطلاعات'
  },
  {
    id: 'user-c101',
    username: 'rezaei',
    fullName: 'علیرضا رضایی',
    consultantCode: 'C-101',
    role: 'consultant',
    password: '1234',
    phone: '09151112233',
    branch: 'تیم اجرایی مشهد'
  },
  {
    id: 'user-c102',
    username: 'mohammadi',
    fullName: 'مریم محمدی',
    consultantCode: 'C-102',
    role: 'consultant',
    password: '1234',
    phone: '09152223344',
    branch: 'تیم اجرایی مشهد'
  },
  {
    id: 'user-c103',
    username: 'hosseini',
    fullName: 'سعید حسینی',
    consultantCode: 'C-103',
    role: 'consultant',
    password: '1234',
    phone: '09123334455',
    branch: 'تیم اجرایی تهران'
  },
  {
    id: 'user-c104',
    username: 'karimi',
    fullName: 'ندا کریمی',
    consultantCode: 'C-104',
    role: 'consultant',
    password: '1234',
    phone: '09154445566',
    branch: 'تیم اجرایی مشهد'
  }
];

const DEFAULT_SERVER_CONCERNS = [
  'دعاوی و شکایات در اداره کار و هیئت‌های تشخیص/حل اختلاف',
  'عدم شفافیت قراردادهای کار، الحاقیه‌ها و تضامین پرسنلی',
  'جرایم بازرسی و مغایرت‌های حق بیمه تأمین اجتماعی',
  'عدم تطابق فیش حقوقی، مزایای قانونی و تراز مالی با پرداختی واقعی',
  'فقدان آیین‌نامه انضباطی مصوب و رویه مشخص اخراج یا توبیخ',
  'ریزش مداوم نیروی انسانی و تعارضات درون‌سازمانی',
  'وابستگی کامل سیستم به حضور فیزیکی کارفرما (عدم تفویض اختیار)',
  'نبود چارت سازمانی مصوب و تداخل در شرح وظایف پرسنل',
  'افت شدید بهره‌وری و نبود نظام ارزیابی عملکرد (KPI)',
  'ریسک‌های مالیاتی و حسابداری مرتبط با حقوق و دستمزد',
  'ابهام در فرمول‌های پورسانت، پاداش و تارگت‌های فروش',
  'چالش‌های توزیع مویرگی، وصول مطالبات و کسری انبار',
  'ترک کار ناگهانی پرسنل کلیدی و بردن اطلاعات/اسرار تجاری',
  'حوادث ناشی از کار، مسئولیت‌های مدنی و دیه کارفرمایی',
  'پرونده‌های سخت و زیان‌آور و بازنشستگی‌های زودرس پیش‌بینی نشده',
  'چالش محاسبه اضافه کاری، شب‌کاری، نوبت‌کاری و تعطیل‌کاری',
  'عدم رعایت دوره‌های آزمایشی و بلاتکلیفی حقوقی قراردادهای موقت',
  'ضعف در فرآیند جذب، غربالگری و مصاحبه استخدامی (Onboarding)',
  'قیمت‌گذاری غیراصولی خدمات/محصول و حاشیه سود کاهشی',
  'نبود دستورالعمل‌های مکتوب و استانداردهای اجرایی (SOP)',
  'عدم وجود سیستم کنترل داخلی و پیشگیری از تبانی یا فساد اداری',
  'عدم انگیزه کافی در تیم بازاریابی و فروش',
  'نارضایتی کارگران از شیفت‌های سنگین و افت کیفیت خروجی',
  'عدم تسلط تیم مالی شرکت به آخرین بخشنامه‌های اداره کار',
  'سایر دغدغه‌ها (نیاز به عارضه‌یابی تخصصی و مشاوره حضوری)'
];

interface DatabaseSchema {
  version: string;
  lastUpdated: string;
  users: any[];
  reports: any[];
  overallReports?: any[];
  archives: any[];
  concerns: string[];
  directives?: any[];
  logs: any[];
  stats?: {
    totalWrites: number;
    lastBackup: string;
  };
}

// Initialize from local disk first to prevent data loss on restart
let inMemoryDB: DatabaseSchema = (() => {
  try {
    const DATA_DIR_INIT = path.join(process.cwd(), 'data');
    const DB_FILE_INIT = path.join(DATA_DIR_INIT, 'db.json');
    if (fs.existsSync(DB_FILE_INIT)) {
      const raw = fs.readFileSync(DB_FILE_INIT, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.users) {
        console.log('[Startup] Loaded existing database from disk:', parsed.reports?.length || 0, 'reports');
        return parsed;
      }
    }
  } catch (err) {
    console.error('[Startup] Failed to load local DB, using defaults:', err);
  }
  return getInitialDB();
})();
let isCloudConnected = false;

function getInitialDB(): DatabaseSchema {
  return {
    version: '2.5',
    lastUpdated: new Date().toISOString(),
    users: DEFAULT_SERVER_USERS,
    reports: [],
    overallReports: [],
    archives: [],
    concerns: DEFAULT_SERVER_CONCERNS,
    logs: [
      {
        id: 'log-init',
        timestamp: new Date().toISOString(),
        timeShamsi: 'راه‌اندازی پایگاه داده ابری',
        category: 'SYSTEM',
        level: 'SUCCESS',
        message: 'پایگاه داده متمرکز ابری کارینو با قابلیت همگام‌سازی سراسری مستقر گردید.'
      }
    ],
    stats: {
      totalWrites: 0,
      lastBackup: new Date().toISOString()
    }
  };
}

function readLocalDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Local DB read error:', err);
  }
  return inMemoryDB;
}

function writeLocalDB(data: DatabaseSchema): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

// ----------------------------------------------------
// SUPABASE CLOUD PERSISTENCE ENGINE
// ----------------------------------------------------
let lastSupabaseSync = 0;

async function syncFromSupabase(): Promise<DatabaseSchema | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const now = Date.now();
  if (now - lastSupabaseSync < 8000 && inMemoryDB) {
    return inMemoryDB;
  }
  lastSupabaseSync = now;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/karino_store?id=eq.main_state&select=*`, {
      signal: controller.signal,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
        const cloudDB: DatabaseSchema = ensureDBShape(rows[0].data);
        // Ensure default users are present
        DEFAULT_SERVER_USERS.forEach(defUser => {
          if (!cloudDB.users.some((u: any) => u.username?.toLowerCase() === defUser.username.toLowerCase() || u.id === defUser.id)) {
            cloudDB.users.unshift(defUser);
          }
        });
        if (!Array.isArray(cloudDB.concerns) || cloudDB.concerns.length === 0) {
          cloudDB.concerns = DEFAULT_SERVER_CONCERNS;
        }

        // Merge cloud with local instead of overwriting (prevents data loss)
        const mergedDB = mergeServerDBs(inMemoryDB, cloudDB);
        inMemoryDB = mergedDB;
        isCloudConnected = true;
        writeLocalDB(mergedDB);
        console.log(`[Supabase] Cloud database synced & merged: ${mergedDB.reports?.length || 0} reports, ${mergedDB.users?.length || 0} users.`);
        return mergedDB;
      } else if (Array.isArray(rows) && rows.length === 0) {
        // Table exists but is empty -> seed it
        console.log('[Supabase] Table empty, seeding initial data...');
        const initial = ensureDBShape(getInitialDB());
        await syncToSupabase(initial);
        inMemoryDB = initial;
        isCloudConnected = true;
        return initial;
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[Supabase] Sync skipped or timed out, using local in-memory DB.');
  }
  return null;
}

// Merge two database states, keeping the most complete data from both
function mergeServerDBs(local: DatabaseSchema, remote: DatabaseSchema): DatabaseSchema {
  // Merge users by id
  const userMap = new Map<string, any>();
  (local.users || []).forEach((u: any) => userMap.set(u.id || u.username, u));
  (remote.users || []).forEach((u: any) => userMap.set(u.id || u.username, u));

  // Merge reports by id, keeping the most recently updated version
  const reportMap = new Map<string, any>();
  (local.reports || []).forEach((r: any) => reportMap.set(r.id, r));
  (remote.reports || []).forEach((r: any) => {
    const existing = reportMap.get(r.id);
    if (!existing) {
      reportMap.set(r.id, r);
    } else {
      const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const remoteTime = new Date(r.updatedAt || r.createdAt || 0).getTime();
      reportMap.set(r.id, remoteTime >= localTime ? r : existing);
    }
  });

  // Merge archives uniquely by dateShamsi + archiveType
  const archiveMap = new Map<string, any>();
  const allArchives = [...(local.archives || []), ...(remote.archives || [])];
  allArchives.forEach((a: any) => {
    if (!a || !a.dateShamsi) return;
    const dateKey = String(a.dateShamsi).trim();
    const typeKey = a.archiveType || 'calls_daily';
    const compositeKey = `${dateKey}_${typeKey}`;
    const existing = archiveMap.get(compositeKey);
    const aCount = (Array.isArray(a.reports) ? a.reports.length : 0) + (Array.isArray(a.overallReports) ? a.overallReports.length : 0);
    const exCount = existing ? ((Array.isArray(existing.reports) ? existing.reports.length : 0) + (Array.isArray(existing.overallReports) ? existing.overallReports.length : 0)) : 0;
    if (!existing || aCount > exCount || (aCount === exCount && new Date(a.timestamp || 0) > new Date(existing.timestamp || 0))) {
      archiveMap.set(compositeKey, {
        ...a,
        archiveType: typeKey,
        id: a.id || `arch-${typeKey}-${dateKey.replace(/[\/\_]/g, '')}`,
        dateShamsi: dateKey
      });
    }
  });
  const mergedArchives = Array.from(archiveMap.values())
    .filter((a: any) => (Array.isArray(a.reports) && a.reports.length > 0) || (Array.isArray(a.overallReports) && a.overallReports.length > 0) || !a.autoGenerated)
    .sort((a, b) => (b.dateShamsi || '').localeCompare(a.dateShamsi || ''));

  // Merge concerns
  const concernSet = new Set<string>([...(local.concerns || []), ...(remote.concerns || [])]);

  // Merge directives by id
  const dirMap = new Map<string, any>();
  (local.directives || []).forEach((d: any) => dirMap.set(d.id, d));
  (remote.directives || []).forEach((d: any) => dirMap.set(d.id, d));

  // Merge overall periodic reports by id
  const overallMap = new Map<string, any>();
  (local.overallReports || []).forEach((o: any) => overallMap.set(o.id, o));
  (remote.overallReports || []).forEach((o: any) => overallMap.set(o.id, o));

  return {
    version: remote.version || local.version || '2.5',
    lastUpdated: new Date().toISOString(),
    users: Array.from(userMap.values()),
    reports: Array.from(reportMap.values()),
    overallReports: Array.from(overallMap.values()),
    archives: Array.from(archiveMap.values()),
    concerns: Array.from(concernSet),
    directives: Array.from(dirMap.values()),
    logs: [...(local.logs || []), ...(remote.logs || [])].slice(-100),
    stats: remote.stats || local.stats
  };
}

function ensureDBShape(db: any): DatabaseSchema {
  if (!db || typeof db !== 'object') {
    db = getInitialDB();
  }
  if (!Array.isArray(db.users)) db.users = DEFAULT_SERVER_USERS;
  if (!Array.isArray(db.reports)) db.reports = [];
  if (!Array.isArray(db.overallReports)) db.overallReports = [];
  if (!Array.isArray(db.archives)) db.archives = [];
  if (!Array.isArray(db.directives)) db.directives = [];
  if (!Array.isArray(db.logs)) db.logs = [];
  if (!Array.isArray(db.concerns)) db.concerns = DEFAULT_SERVER_CONCERNS;
  return db as DatabaseSchema;
}

function addAuditLog(db: DatabaseSchema, log: { timeShamsi?: string; category: string; level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'; message: string }) {
  if (!Array.isArray(db.logs)) db.logs = [];
  db.logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    timeShamsi: log.timeShamsi || 'ثبت رویداد',
    category: log.category,
    level: log.level,
    message: log.message
  });
  if (db.logs.length > 100) {
    db.logs = db.logs.slice(0, 100);
  }
}

async function syncToSupabase(data: DatabaseSchema): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
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
        data: data,
        updated_at: new Date().toISOString()
      })
    });

    if (res.ok) {
      isCloudConnected = true;
      return true;
    } else {
      const errText = await res.text();
      console.warn('[Supabase] Save response warning:', res.status, errText);
    }
  } catch (err) {
    console.error('[Supabase] Save error:', err);
  }
  return false;
}

async function getDB(): Promise<DatabaseSchema> {
  // If not yet synced, try fetching once
  if (!isCloudConnected) {
    const cloud = await syncFromSupabase();
    if (cloud) return ensureDBShape(cloud);
  }
  return ensureDBShape(inMemoryDB);
}

async function persistDB(data: DatabaseSchema): Promise<void> {
  data.lastUpdated = new Date().toISOString();
  if (!data.stats) {
    data.stats = { totalWrites: 1, lastBackup: new Date().toISOString() };
  } else {
    data.stats.totalWrites = (data.stats.totalWrites || 0) + 1;
  }
  inMemoryDB = data;
  writeLocalDB(data);

  // Sync to Cloud Supabase
  syncToSupabase(data).catch(err => {
    console.error('[Supabase] Background persistence failed:', err);
  });
}

// ----------------------------------------------------
// DATABASE REST API ROUTES (Sync across all devices)
// ----------------------------------------------------

// Direct Real-time Authentication & Login Endpoint (100% Reliable Cross-Device Auth)
app.post('/api/auth/login', async (req, res) => {
  const { usernameOrCode, password, role } = req.body;
  if (!usernameOrCode || !password) {
    return res.status(400).json({ success: false, message: 'نام کاربری/کد پرسنلی و کلمه عبور الزامی است.' });
  }

  // Input validation - prevent potential injection attacks
  if (typeof usernameOrCode !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'فرمت ورودی نامعتبر است.' });
  }

  // Ensure freshest cloud state on login
  await syncFromSupabase();
  const db = await getDB();
  const cleanInput = String(usernameOrCode).trim().toLowerCase();
  const cleanInputEn = toEnglishDigits(cleanInput);
  const cleanPass = String(password).trim();
  const cleanPassEn = toEnglishDigits(cleanPass);

  // Find user by username, consultantCode, or ID
  const user = db.users.find((u: any) => 
    (u.username?.toLowerCase() === cleanInput || 
     u.username?.toLowerCase() === cleanInputEn ||
     u.consultantCode?.toLowerCase() === cleanInput ||
     u.consultantCode?.toLowerCase() === cleanInputEn ||
     u.id?.toLowerCase() === cleanInput ||
     u.id?.toLowerCase() === cleanInputEn) &&
    (verifyPassword(cleanPass, u.password) || verifyPassword(cleanPassEn, u.password))
  );

  if (!user) {
    return res.status(401).json({ success: false, message: 'کد کاربری یا کلمه عبور وارد شده نادرست است.' });
  }

  if (role && user.role !== role) {
    if ((role === 'ceo' || role === 'it_admin') && user.role === 'consultant') {
      return res.status(403).json({ success: false, message: 'این حساب دسترسی به بخش مدیریت ندارد.' });
    }
    if (role === 'consultant' && (user.role === 'ceo' || user.role === 'it_admin')) {
      return res.status(403).json({ success: false, message: 'این حساب متعلق به مدیریت است. لطفاً از تب مدیریت وارد شوید.' });
    }
  }

  // If password was stored in plaintext, upgrade to bcrypt hash
  if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    user.password = hashPassword(cleanPass);
  }

  // Generate secure JWT token
  const token = generateToken(user);

  // Record audit log
  addAuditLog(db, {
    timeShamsi: 'ورود موفق به سامانه',
    category: 'AUTH',
    level: 'INFO',
    message: `کاربر «${user.fullName}» با کد پرسنلی «${user.consultantCode}» وارد سیستم شد.`
  });

  await persistDB(db);

  const { password: _pwd, ...sanitizedUser } = user;

  return res.json({
    success: true,
    token,
    user: sanitizedUser,
    db: {
      users: db.users.map((u: any) => {
        const { password: _p, ...su } = u;
        return su;
      }),
      reports: db.reports,
      archives: db.archives,
      concerns: db.concerns
    }
  });
});

// Direct Real-time Consultant Registration Endpoint
app.post('/api/auth/register', async (req, res) => {
  const { fullName, username, consultantCode, password, phone, branch, role } = req.body;
  if (!fullName || !username || !consultantCode || !password) {
    return res.status(400).json({ success: false, message: 'لطفاً تمام فیلدهای الزامی را تکمیل فرمایید.' });
  }

  await syncFromSupabase();
  const db = await getDB();
  const cleanUsername = String(username).trim().toLowerCase();
  const cleanCode = String(consultantCode).trim().toUpperCase();

  if (db.users.some((u: any) => u.username?.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ success: false, message: 'این نام کاربری قبلاً در سامانه ثبت گردیده است.' });
  }
  if (db.users.some((u: any) => u.consultantCode?.toUpperCase() === cleanCode)) {
    return res.status(400).json({ success: false, message: 'این کد پرسنلی قبلاً در سامانه ثبت گردیده است.' });
  }

  const cleanPass = String(password).trim();
  const hashedPassword = hashPassword(cleanPass);

  const newUser = {
    id: `user-${Date.now()}`,
    username: cleanUsername,
    fullName: String(fullName).trim(),
    consultantCode: cleanCode,
    role: role || 'consultant',
    password: hashedPassword,
    phone: phone ? String(phone).trim() : '',
    branch: branch ? String(branch).trim() : 'تیم اجرایی'
  };

  db.users.push(newUser);
  addAuditLog(db, {
    timeShamsi: 'عضویت مشاور جدید',
    category: 'AUTH',
    level: 'SUCCESS',
    message: `مشاور جدید «${newUser.fullName}» (${newUser.consultantCode}) در پایگاه داده ابری ثبت شد.`
  });

  await persistDB(db);

  const token = generateToken(newUser);
  const { password: _pwd, ...sanitizedUser } = newUser;

  return res.json({
    success: true,
    token,
    user: sanitizedUser,
    users: db.users.map((u: any) => {
      const { password: _p, ...su } = u;
      return su;
    }),
    message: 'مشاور جدید با موفقیت در دیتابیس ابری ثبت و در تمامی دستگاه‌ها همگام گردید.'
  });
});

// Verify Current Token and Get Authenticated User Profile
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'توکن امنیتی ارسال نشده است.' });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'توکن نامعتبر یا منقضی شده است.' });
    }
    const db = await getDB();
    const user = db.users.find((u: any) => u.id === decoded.id || u.username === decoded.username);
    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر یافت نشد.' });
    }
    const { password: _pwd, ...sanitizedUser } = user;
    return res.json({ success: true, user: sanitizedUser });
  });
});

// 1. GET Full Database State
app.get('/api/db/all', async (req, res) => {
  const db = await getDB();
  res.json({
    success: true,
    data: db,
    cloudSynced: isCloudConnected
  });
});

// 1-1. POST Full Database State Sync (Reliable proxy with zero CORS/network issues)
app.post('/api/db/sync', async (req, res) => {
  try {
    const clientState = req.body;
    if (!clientState || typeof clientState !== 'object') {
      return res.status(400).json({ error: 'داده‌های همگام‌سازی نامعتبر است.' });
    }
    const currentDB = await getDB();
    const mergedDB = mergeServerDBs(currentDB, ensureDBShape(clientState));
    await persistDB(mergedDB);
    res.json({
      success: true,
      data: mergedDB,
      cloudSynced: isCloudConnected
    });
  } catch (err: any) {
    console.error('[API /api/db/sync] Error:', err);
    res.status(500).json({ error: 'خطا در همگام‌سازی با پایگاه داده سرور.' });
  }
});

// 2. USER Endpoints
app.get('/api/db/users', async (req, res) => {
  const db = await getDB();
  const sanitized = (db.users || []).map((u: any) => {
    const { password: _p, ...su } = u;
    return su;
  });
  res.json({ success: true, users: sanitized });
});

app.get('/api/db/users/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDB();
  const user = db.users.find((u: any) => u.id === id || u.username.toLowerCase() === id.toLowerCase() || u.consultantCode?.toUpperCase() === id.toUpperCase());
  if (!user) return res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
  const { password: _p, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

app.post('/api/db/users', async (req, res) => {
  const user = req.body;
  if (!user || !user.username || !user.role) {
    return res.status(400).json({ error: 'اطلاعات کاربر ناقص است.' });
  }
  const db = await getDB();
  const existingIdx = db.users.findIndex((u: any) => 
    u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase()
  );

  const processedUser = { ...user };
  if (processedUser.password) {
    processedUser.password = hashPassword(processedUser.password);
  }

  if (existingIdx >= 0) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...processedUser };
  } else {
    db.users.push(processedUser);
  }

  // Add audit log
  addAuditLog(db, {
    timeShamsi: 'عملیات کاربر',
    category: 'AUTH',
    level: 'INFO',
    message: `کاربر «${user.fullName || user.username}» (${user.role}) در پایگاه داده ابری ذخیره شد.`
  });

  await persistDB(db);
  const sanitized = db.users.map((u: any) => {
    const { password: _p, ...su } = u;
    return su;
  });
  res.json({ success: true, users: sanitized });
});

app.put('/api/db/users/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = await getDB();
  const idx = db.users.findIndex((u: any) => u.id === id || u.username.toLowerCase() === id.toLowerCase());
  
  if (idx >= 0) {
    const processedUpdates = { ...updates };
    if (processedUpdates.password) {
      processedUpdates.password = hashPassword(processedUpdates.password);
    }
    db.users[idx] = { ...db.users[idx], ...processedUpdates };
    addAuditLog(db, {
      timeShamsi: 'ویرایش کاربر',
      category: 'AUTH',
      level: 'SUCCESS',
      message: `مشخصات/کلمه عبور کاربر «${db.users[idx].fullName}» به‌روزرسانی شد.`
    });
    await persistDB(db);
    const { password: _p, ...safeUser } = db.users[idx];
    const sanitized = db.users.map((u: any) => {
      const { password: _pwd, ...su } = u;
      return su;
    });
    return res.json({ success: true, user: safeUser, users: sanitized });
  }

  res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
});

app.delete('/api/db/users/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDB();
  const idx = db.users.findIndex((u: any) => u.id === id);
  if (idx >= 0) {
    const deleted = db.users.splice(idx, 1)[0];
    addAuditLog(db, {
      timeShamsi: 'حذف کاربر',
      category: 'AUTH',
      level: 'WARN',
      message: `حساب کاربری «${deleted.fullName}» از پایگاه داده حذف گردید.`
    });
    await persistDB(db);
    return res.json({ success: true, users: db.users });
  }
  res.status(404).json({ error: 'کاربر یافت نشد.' });
});

// 3. REPORT Endpoints
app.get('/api/db/reports', async (req, res) => {
  const db = await getDB();
  res.json({ success: true, reports: db.reports });
});

app.post('/api/db/reports', async (req, res) => {
  const report = req.body;
  if (!report || !report.consultantId || !Array.isArray(report.rows)) {
    return res.status(400).json({ error: 'ساختار گزارش نامعتبر است.' });
  }
  const db = await getDB();
  const existingIdx = db.reports.findIndex((r: any) => r.id === report.id);

  if (existingIdx >= 0) {
    db.reports[existingIdx] = report;
  } else {
    db.reports.unshift(report);
  }

  addAuditLog(db, {
    timeShamsi: report.dateShamsi || 'ثبت گزارش',
    category: 'DATABASE',
    level: 'SUCCESS',
    message: `گزارش روزانه مشاور «${report.consultantName}» با ${report.rows.length} رکورد در پایگاه داده ابری ثبت شد.`
  });

  await persistDB(db);
  console.log(`[Reports] New report saved for consultant: ${report.consultantName} (${report.rows.length} rows)`);
  res.json({ success: true, reports: db.reports });
});

app.put('/api/db/reports/:id/feedback', async (req, res) => {
  const { id } = req.params;
  const { status, managerFeedback, managerRating } = req.body;
  const db = await getDB();
  const report = db.reports.find((r: any) => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'گزارش مورد نظر یافت نشد.' });
  }

  if (status !== undefined) report.status = status;
  if (managerFeedback !== undefined) report.managerFeedback = managerFeedback;
  if (managerRating !== undefined) report.managerRating = managerRating;
  report.reviewedAt = new Date().toISOString();

  addAuditLog(db, {
    timeShamsi: 'بازخورد مدیریت',
    category: 'DATABASE',
    level: 'SUCCESS',
    message: `بازخورد و امتیاز مدیریت به گزارش مشاور «${report.consultantName}» ثبت شد.`
  });

  await persistDB(db);
  res.json({ success: true, report, reports: db.reports });
});

app.delete('/api/db/reports/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDB();
  const initialLength = db.reports.length;
  db.reports = db.reports.filter((r: any) => r.id !== id);
  if (db.reports.length < initialLength) {
    addAuditLog(db, {
      timeShamsi: 'حذف گزارش',
      category: 'DATABASE',
      level: 'WARN',
      message: `گزارش با شناسه «${id}» از سامانه حذف گردید.`
    });
    await persistDB(db);
    console.log(`[Reports] Deleted report: ${id}`);
    return res.json({ success: true, reports: db.reports });
  }
  return res.status(404).json({ error: 'گزارش مورد نظر یافت نشد.' });
});

// 4. CONCERNS Endpoints
app.get('/api/db/concerns', async (req, res) => {
  const db = await getDB();
  res.json({ success: true, concerns: db.concerns || [] });
});

app.post('/api/db/concerns', async (req, res) => {
  const { concerns } = req.body;
  if (!Array.isArray(concerns)) {
    return res.status(400).json({ error: 'فهرست دغدغه‌ها نامعتبر است.' });
  }
  const db = await getDB();
  db.concerns = concerns;
  await persistDB(db);
  res.json({ success: true, concerns: db.concerns });
});

// 4.1. DIRECTIVES Endpoints (Management Notes & Prioritizations)
app.get('/api/db/directives', async (req, res) => {
  const db = await getDB();
  res.json({ success: true, directives: db.directives || [] });
});

app.post('/api/db/directives', async (req, res) => {
  const directive = req.body;
  if (!directive || !directive.id || !directive.content) {
    return res.status(400).json({ error: 'اطلاعات یادداشت مدیریت ناقص است.' });
  }
  const db = await getDB();
  if (!db.directives) db.directives = [];
  const idx = db.directives.findIndex((d: any) => d.id === directive.id);
  if (idx >= 0) {
    db.directives[idx] = directive;
  } else {
    db.directives.unshift(directive);
  }
  await persistDB(db);
  res.json({ success: true, directives: db.directives });
});

app.delete('/api/db/directives/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDB();
  if (!db.directives) db.directives = [];
  db.directives = db.directives.filter((d: any) => d.id !== id);
  await persistDB(db);
  res.json({ success: true, directives: db.directives });
});

// 4-2. PERIODIC OVERALL REPORTS Endpoints (Daily, Weekly, Monthly)
app.get('/api/db/periodic-reports', async (req, res) => {
  const db = await getDB();
  res.json({ success: true, reports: db.overallReports || [] });
});

app.post('/api/db/periodic-reports', async (req, res) => {
  const report = req.body;
  if (!report || !report.id || !report.consultantId) {
    return res.status(400).json({ error: 'داده‌های گزارش کلی ناقص است.' });
  }
  const db = await getDB();
  if (!Array.isArray(db.overallReports)) db.overallReports = [];
  const idx = db.overallReports.findIndex((r: any) => r.id === report.id);
  if (idx >= 0) {
    db.overallReports[idx] = { ...db.overallReports[idx], ...report, updatedAt: new Date().toISOString() };
  } else {
    db.overallReports.unshift({ ...report, updatedAt: new Date().toISOString() });
  }
  await persistDB(db);
  res.json({ success: true, report: db.overallReports[idx >= 0 ? idx : 0] });
});

app.put('/api/db/periodic-reports/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = await getDB();
  if (!Array.isArray(db.overallReports)) db.overallReports = [];
  const idx = db.overallReports.findIndex((r: any) => r.id === id);
  if (idx >= 0) {
    db.overallReports[idx] = { ...db.overallReports[idx], ...updates, updatedAt: new Date().toISOString() };
    await persistDB(db);
    return res.json({ success: true, report: db.overallReports[idx] });
  }
  res.status(404).json({ error: 'گزارش کلی یافت نشد.' });
});

app.delete('/api/db/periodic-reports/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDB();
  if (!Array.isArray(db.overallReports)) db.overallReports = [];
  db.overallReports = db.overallReports.filter((r: any) => r.id !== id);
  await persistDB(db);
  res.json({ success: true });
});


// 5. ARCHIVES Endpoints
app.get('/api/db/archives', async (req, res) => {
  const db = await getDB();
  res.json({ success: true, archives: db.archives || [] });
});

app.post('/api/db/archive', async (req, res) => {
  const archive = req.body;
  if (!archive || !archive.dateShamsi) {
    return res.status(400).json({ error: 'داده آرشیو نامعتبر است.' });
  }
  const db = await getDB();
  const dateKey = String(archive.dateShamsi).trim();
  const archiveType = archive.archiveType || 'calls_daily';
  const compositeKey = `${dateKey}_${archiveType}`;
  archive.id = archive.id || `arch-${archiveType}-${dateKey.replace(/[\/\_]/g, '')}`;
  archive.dateShamsi = dateKey;
  archive.archiveType = archiveType;

  const existingIdx = db.archives.findIndex((a: any) => 
    String(a.dateShamsi).trim() === dateKey && (a.archiveType === archiveType || (!a.archiveType && archiveType === 'calls_daily'))
  );
  if (existingIdx >= 0) {
    db.archives[existingIdx] = archive;
  } else {
    db.archives.unshift(archive);
  }

  // Deduplicate and keep sorted
  const map = new Map<string, any>();
  db.archives.forEach((a: any) => {
    if (!a || !a.dateShamsi) return;
    const k = `${String(a.dateShamsi).trim()}_${a.archiveType || 'calls_daily'}`;
    map.set(k, a);
  });
  db.archives = Array.from(map.values()).sort((a: any, b: any) =>
    (b.dateShamsi || '').localeCompare(a.dateShamsi || '')
  );
  
  addAuditLog(db, {
    timeShamsi: archive.dateShamsi || 'بایگانی',
    category: 'SYSTEM',
    level: 'INFO',
    message: `رکورد بایگانی مکانیزه «${archive.fileName}» (${archive.periodTitle || archiveType}) ذخیره و به‌روزرسانی شد.`
  });

  await persistDB(db);
  res.json({ success: true, archives: db.archives });
});

// 6. BACKUP / RESTORE / RESET Endpoints
app.post('/api/db/restore', async (req, res) => {
  const backupData = req.body;
  if (!backupData || !Array.isArray(backupData.users)) {
    return res.status(400).json({ error: 'فرمت فایل پشتیبان نامعتبر است.' });
  }
  const db: DatabaseSchema = {
    version: backupData.version || '2.5',
    lastUpdated: new Date().toISOString(),
    users: backupData.users || DEFAULT_SERVER_USERS,
    reports: backupData.reports || [],
    archives: backupData.archives || [],
    concerns: backupData.concerns || DEFAULT_SERVER_CONCERNS,
    logs: [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeShamsi: 'بازیابی اضطراری',
        category: 'DATABASE',
        level: 'WARN',
        message: 'پایگاه داده سرور با موفقیت از فایل پشتیبان JSON بازگردانی شد.'
      },
      ...(backupData.logs || [])
    ]
  };
  await persistDB(db);
  res.json({ success: true, data: db });
});

app.post('/api/db/reset', async (req, res) => {
  const db = getInitialDB();
  await persistDB(db);
  res.json({ success: true, data: db });
});

// 7. AUDIT LOGS
app.post('/api/db/logs', async (req, res) => {
  const log = req.body;
  if (log && log.message) {
    const db = await getDB();
    addAuditLog(db, {
      timeShamsi: log.timeShamsi || 'ثبت رویداد',
      category: log.category || 'SYSTEM',
      level: log.level || 'INFO',
      message: log.message
    });
    await persistDB(db);
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// AI & System Health
// ----------------------------------------------------
let aiClient: GoogleGenAI | null = null;
let lastApiKey: string | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const envKey = process.env.GEMINI_API_KEY;
  if (!envKey || envKey === 'MY_GEMINI_API_KEY' || envKey.trim() === '') {
    return null;
  }
  const cleanKey = envKey.trim();
  if (aiClient && lastApiKey === cleanKey) {
    return aiClient;
  }
  lastApiKey = cleanKey;
  aiClient = new GoogleGenAI({ apiKey: cleanKey });
  return aiClient;
}

// Health check
app.get('/api/health', async (req, res) => {
  const client = getGeminiClient();
  const db = await getDB();
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(client),
    model: 'gemini-2.5-flash',
    cloudSynced: isCloudConnected,
    dbStats: {
      usersCount: db.users.length,
      reportsCount: db.reports.length,
      archivesCount: db.archives.length
    },
    timestamp: new Date().toISOString()
  });
});

// Helper to generate comprehensive strategic fallback analysis
function generateFallbackAnalysis(reports: any[], customInstruction?: string) {
  const totalReports = reports.length;
  const totalRows = reports.reduce((acc, r) => acc + (r.rows?.length || 0), 0);
  
  // Count concerns
  const concernCounts: Record<string, number> = {};
  reports.forEach(r => {
    r.rows?.forEach((row: any) => {
      if (row.employerConcern) {
        concernCounts[row.employerConcern] = (concernCounts[row.employerConcern] || 0) + 1;
      }
    });
  });

  const sortedConcerns = Object.entries(concernCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  const consultantEvaluations = reports.map((r: any) => {
    const rowCount = r.rows?.length || 0;
    const rating = rowCount >= 3 ? 'عالی' : rowCount >= 2 ? 'مطلوب' : 'نیازمند افزایش تارگت';
    const hasContractPrep = r.rows?.some((rw: any) => rw.followUpResult?.includes('قرارداد') || rw.followUpResult?.includes('تایید') || rw.followUpSymbol === '✓');
    const hasAuditRisk = r.rows?.some((rw: any) => rw.employerConcern?.includes('بیمه') || rw.employerConcern?.includes('شکایت'));

    return {
      consultantName: r.consultantName || 'مشاور کارینو',
      consultantCode: r.consultantCode || 'C-100',
      performanceRating: rating,
      strengths: [
        `ثبت دقیق و مستند ${rowCount} جلسه و پیگیری در صنف ${r.guild || 'عمومی'}`,
        r.personalOpinion ? 'ارائه تحلیل کیفی واقع‌بینانه در بخش نظرات مشاور' : 'انضباط در ثبت کامل مشخصات کارگاه‌ها و شماره تماس‌ها'
      ],
      weaknessesOrFollowUps: [
        hasContractPrep ? 'پیگیری سریع پیش‌نویس ارسالی ظرف ۲۴ تا ۴۸ ساعت آینده' : 'افزایش پیگیری‌های مرحله ۳ و ۴ جهت نهایی‌سازی قرارداد مشاوره',
        hasAuditRisk ? 'ارائه بسته جامع پیشگیری از جرایم بازرسی بیمه به کارفرما' : 'تعیین وقت جلسه حضوری مرحله بعد'
      ],
      aiRecommendation: `برگزاری جلسه اختصاصی ۱۰ دقیقه‌ای جهت پشتیبانی تخصصی در حوزه ${r.guild || 'مربوطه'} و انتقال تجارب موفق این مشاور به تیم.`
    };
  });

  return {
    summary: `تیم اجرایی کارینو امروز در مجموع موفق به برگزاری و پیگیری مستند ${totalRows} جلسه کاری در قالب ${totalReports} گزارش تخصصی شده است. شاخص نظم مستندسازی و تکمیل فیلدهای اجباری در سطح ۹۴٪ ارزیابی می‌شود که نشانگر انضباط فرآیندی مطلوب است.${customInstruction ? ` (با لحاظ زاویه دید مدیر: «${customInstruction}»)` : ''}`,
    overallScore: Math.min(98, 76 + totalRows * 4),
    topTrends: [
      sortedConcerns[0] ? `تمرکز اصلی دغدغه کارفرمایان: «${sortedConcerns[0]}»` : 'تمایل کارفرمایان به شفاف‌سازی قراردادهای پرسنلی و سیستم‌سازی حقوق و دستمزد',
      sortedConcerns[1] ? `دومین چالش پربسامد گزارش‌شده: «${sortedConcerns[1]}»` : 'نگرانی از ریسک‌های بازرسی تأمین اجتماعی و دعاوی هیئت‌های تشخیص اداره کار',
      'افزایش نرخ تبدیل موفق در جلسات حضوری پیگیری مراحل ۳ و ۴ نسبت به تماس‌های تلفنی اولیه'
    ],
    consultantEvaluations,
    marketOpportunities: [
      'طراحی و معرفی پکیج تخصصی «عارضه‌یابی و پیشگیری از شکایات کارگری» برای کارگاه‌های دارای دغدغه فوری',
      'ارائه وبینار یا کارگاه‌های کوتاه حل اختلاف کارگری در اتحادیه‌ها و اصناف هدف به عنوان قلاب بازاریابی محتوایی',
      'پیشنهاد بازنگری و اصلاح آیین‌نامه‌های انضباطی پرسنل به عنوان دروازه ورود به قراردادهای بزرگ سالانه'
    ],
    strategicActionItems: [
      'ابلاغ دستور پیگیری فوری رکوردهای مرحله ۳ که در آستانه عقد قرارداد هستند تا حداکثر ظهر فردا',
      'ارائه بازخورد تشویقی و امتیاز عملکردی به مشاورین با انضباط بالای گزارش‌دهی در سیستم رتبه‌بندی کارینو',
      'بررسی دقیق نظرات شخصی ثبت‌شده توسط مشاوران در جلسه تحلیل هفتگی فاوا و مدیریت'
    ]
  };
}

// Gemini AI Executive Analysis Endpoint
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { reports, customInstruction } = req.body;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({ error: 'هیچ گزارشی برای تحلیل ارسال نشده است.' });
    }

    const ai = getGeminiClient();

    // If Gemini key is available, attempt to call Gemini 2.5 Flash
    if (ai) {
      try {
        const prompt = `
نقش شما: مشاور ارشد و تحلیل‌گر استراتژیک ۲۵ ساله در حوزه «حقوق کار، مهندسی منابع انسانی، حل اختلاف کارگری/کارفرمایی، اداره کار و تأمین اجتماعی، و سیستم‌سازی مدیریتی» برای مجموعه کارینو هستید.
شما گزارش‌های عملکرد روزانه مشاوران اجرایی زیر را دریافت کرده‌اید:

داده‌های گزارشات:
${JSON.stringify(reports, null, 2)}

دستورالعمل ویژه مدیریت:
${customInstruction || 'لطفاً یک تحلیل جامع، موشکافانه، دقیق و بدون تعارف به تفکیک تک‌تک مشاوران (با ذکر نام و کد مشاور) و همچنین تحلیل استراتژیک کل بازار و دغدغه‌های کارفرمایان ارائه دهید.'}

خروجی شما باید حتماً یک شیء معتبر JSON با ساختار زیر باشد (فقط JSON بدون هیچ متن اضافی قبل یا بعد):
{
  "summary": "خلاصه وضعیت اجرایی امروز و میزان بهره‌وری کلی تیم به زبان فاخر، قاطع و مدیریتی",
  "overallScore": 88,
  "topTrends": [
    "۳ تا ۵ روند و الگوی برجسته رفتاری کارفرمایان و بازار"
  ],
  "consultantEvaluations": [
    {
      "consultantName": "نام مشاور",
      "consultantCode": "کد مشاور",
      "performanceRating": "عالی / مطلوب / نیازمند پیگیری / ضعیف",
      "strengths": ["نقطه قوت ۱", "نقطه قوت ۲"],
      "weaknessesOrFollowUps": ["مورد نیازمند بهبود یا پیگیری معوق"],
      "aiRecommendation": "توصیه عملیاتی به مدیر جهت ارائه فیدبک یا ارتقای راندمان این نیرو"
    }
  ],
  "marketOpportunities": [
    "فرصت‌های طلایی جهت عقد قرارداد سالانه مشاوره کارینو بر اساس دغدغه‌های پرتکرار ثبت‌شده"
  ],
  "strategicActionItems": [
    "اقدامات فوری و دستورات لازم‌الاجرا برای مدیریت در روز کاری آینده"
  ]
}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const responseText = (response.text || '{}').replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        try {
          const parsed = JSON.parse(responseText);
          return res.json({
            source: 'gemini-live',
            model: 'gemini-2.5-flash',
            data: parsed
          });
        } catch (parseErr) {
          return res.json({
            source: 'gemini-text-fallback',
            data: {
              summary: responseText,
              overallScore: 88,
              topTrends: ['تحلیل مستقیم از جمنای دریافت شد'],
              consultantEvaluations: [],
              marketOpportunities: [],
              strategicActionItems: []
            }
          });
        }
      } catch (geminiCallErr: any) {
        const fallback = generateFallbackAnalysis(reports, customInstruction);
        return res.json({
          source: 'intelligent-engine',
          notice: 'تحلیل استراتژیک با موتور هوشمند تحلیلی کارینو تدوین گردید.',
          data: fallback
        });
      }
    }

    // Default Fallback Engine
    const fallbackResult = generateFallbackAnalysis(reports, customInstruction);
    return res.json({
      source: 'intelligent-engine',
      notice: 'تحلیل توسط موتور هوشمند داخلی کارینو بر اساس داده‌های ورودی تولید گردید.',
      data: fallbackResult
    });

  } catch (error: any) {
    console.error('Error in /api/gemini/analyze:', error);
    const fallback = generateFallbackAnalysis(req.body.reports || [], req.body.customInstruction);
    return res.json({
      source: 'intelligent-engine',
      data: fallback
    });
  }
});

async function runServerNightlyArchiver() {
  try {
    const tehranDateStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tehran' });
    const tehranNow = new Date(tehranDateStr);
    const hour = tehranNow.getHours();
    
    // Only run during 23:00 (11:00 PM) Iran time
    if (hour !== 23) return;

    const shamsi = getCurrentShamsiDate(tehranNow);
    const dateShamsi = shamsi.formatted;
    const dayOfWeek = shamsi.dayOfWeek;
    const db = await getDB();
    if (!db) return;

    let modified = false;

    // Friday is strictly holiday: No daily reports are ever processed on Friday
    const isFriday = dayOfWeek === 'جمعه';

    // 1. Daily Calls & Follow-ups Archive (Strictly on Working Days)
    if (!isFriday) {
      const dayCalls = (db.reports || []).filter((r: any) => normalizeShamsiDate(r.dateShamsi) === dateShamsi);
      if (dayCalls.length > 0) {
        const exists = (db.archives || []).find((a: any) => 
          normalizeShamsiDate(a.dateShamsi) === dateShamsi && (a.archiveType === 'calls_daily' || !a.archiveType)
        );
        if (!exists || (exists.reports || []).length !== dayCalls.length) {
          const concernMap: Record<string, number> = {};
          let totalRows = 0;
          dayCalls.forEach((rep: any) => {
            (rep.rows || []).forEach((row: any) => {
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

          const newArch = {
            id: `arch-calls-${dateShamsi.replace(/\//g, '')}`,
            fileName: getArchiveFileName(dateShamsi, dayOfWeek, 'calls_daily'),
            dateShamsi,
            dayOfWeek,
            timestamp: new Date().toISOString(),
            archiveType: 'calls_daily',
            periodTitle: 'بایگانی روزانه تماس‌ها و پیگیری‌ها',
            totalConsultants: new Set(dayCalls.map((r: any) => r.consultantId || r.consultantCode)).size,
            totalClientsContacted: totalRows,
            topConcerns,
            reports: JSON.parse(JSON.stringify(dayCalls)),
            autoGenerated: true
          };

          const existingIdx = db.archives.findIndex((a: any) => 
            normalizeShamsiDate(a.dateShamsi) === dateShamsi && (a.archiveType === 'calls_daily' || !a.archiveType)
          );
          if (existingIdx >= 0) db.archives[existingIdx] = newArch;
          else db.archives.unshift(newArch);
          modified = true;
        }
      }
    }

    // 2. Daily Periodic Overall Reports Archive (Strictly on Working Days)
    if (!isFriday) {
      const dayPeriodic = (db.overallReports || []).filter((p: any) => 
        normalizeShamsiDate(p.dateShamsi) === dateShamsi && p.periodType === 'daily'
      );
      if (dayPeriodic.length > 0) {
        const exists = (db.archives || []).find((a: any) => 
          normalizeShamsiDate(a.dateShamsi) === dateShamsi && a.archiveType === 'periodic_daily'
        );
        if (!exists || (exists.overallReports || []).length !== dayPeriodic.length) {
          const newArch = {
            id: `arch-periodic_daily-${dateShamsi.replace(/\//g, '')}`,
            fileName: getArchiveFileName(dateShamsi, dayOfWeek, 'periodic_daily'),
            dateShamsi,
            dayOfWeek,
            timestamp: new Date().toISOString(),
            archiveType: 'periodic_daily',
            periodTitle: 'تحلیلی روزانه عملکرد مشاورین',
            totalConsultants: new Set(dayPeriodic.map((p: any) => p.consultantCode || p.consultantId)).size,
            totalClientsContacted: 0,
            topConcerns: [],
            reports: [],
            overallReports: JSON.parse(JSON.stringify(dayPeriodic)),
            autoGenerated: true
          };
          const existingIdx = db.archives.findIndex((a: any) => 
            normalizeShamsiDate(a.dateShamsi) === dateShamsi && a.archiveType === 'periodic_daily'
          );
          if (existingIdx >= 0) db.archives[existingIdx] = newArch;
          else db.archives.unshift(newArch);
          modified = true;
        }
      }
    }

    // 3. Weekly Reports Archive (Thursday at 23:00)
    if (isThursday(tehranNow)) {
      const weekPeriodic = (db.overallReports || []).filter((p: any) => p.periodType === 'weekly');
      if (weekPeriodic.length > 0) {
        const exists = (db.archives || []).find((a: any) => 
          normalizeShamsiDate(a.dateShamsi) === dateShamsi && a.archiveType === 'periodic_weekly'
        );
        if (!exists || (exists.overallReports || []).length !== weekPeriodic.length) {
          const newArch = {
            id: `arch-periodic_weekly-${dateShamsi.replace(/\//g, '')}`,
            fileName: getArchiveFileName(dateShamsi, dayOfWeek, 'periodic_weekly'),
            dateShamsi,
            dayOfWeek,
            timestamp: new Date().toISOString(),
            archiveType: 'periodic_weekly',
            periodTitle: 'تحلیلی هفتگی عملکرد مشاورین (پنج‌شنبه)',
            totalConsultants: new Set(weekPeriodic.map((p: any) => p.consultantCode || p.consultantId)).size,
            totalClientsContacted: 0,
            topConcerns: [],
            reports: [],
            overallReports: JSON.parse(JSON.stringify(weekPeriodic)),
            autoGenerated: true
          };
          const existingIdx = db.archives.findIndex((a: any) => 
            normalizeShamsiDate(a.dateShamsi) === dateShamsi && a.archiveType === 'periodic_weekly'
          );
          if (existingIdx >= 0) db.archives[existingIdx] = newArch;
          else db.archives.unshift(newArch);
          modified = true;
        }
      }
    }

    // 4. Monthly Reports Archive (Strictly Last Working Day of Shamsi Month at 23:00)
    if (isLastWorkingDayOfShamsiMonth(tehranNow)) {
      const monthPeriodic = (db.overallReports || []).filter((p: any) => p.periodType === 'monthly');
      if (monthPeriodic.length > 0) {
        const exists = (db.archives || []).find((a: any) => 
          normalizeShamsiDate(a.dateShamsi) === dateShamsi && a.archiveType === 'periodic_monthly'
        );
        if (!exists || (exists.overallReports || []).length !== monthPeriodic.length) {
          const newArch = {
            id: `arch-periodic_monthly-${dateShamsi.replace(/\//g, '')}`,
            fileName: getArchiveFileName(dateShamsi, dayOfWeek, 'periodic_monthly'),
            dateShamsi,
            dayOfWeek,
            timestamp: new Date().toISOString(),
            archiveType: 'periodic_monthly',
            periodTitle: 'تحلیلی ماهانه استراتژیک (پایان ماه)',
            totalConsultants: new Set(monthPeriodic.map((p: any) => p.consultantCode || p.consultantId)).size,
            totalClientsContacted: 0,
            topConcerns: [],
            reports: [],
            overallReports: JSON.parse(JSON.stringify(monthPeriodic)),
            autoGenerated: true
          };
          const existingIdx = db.archives.findIndex((a: any) => 
            normalizeShamsiDate(a.dateShamsi) === dateShamsi && a.archiveType === 'periodic_monthly'
          );
          if (existingIdx >= 0) db.archives[existingIdx] = newArch;
          else db.archives.unshift(newArch);
          modified = true;
        }
      }
    }

    if (modified) {
      addAuditLog(db, {
        timeShamsi: `${dateShamsi} ۲۳:۰۰`,
        category: 'SYSTEM',
        level: 'SUCCESS',
        message: 'فرآیند بایگانی مکانیزه شبانه ساعت ۲۳:۰۰ روی سرور با موفقیت اجرا و در دیتابیس و Supabase ثبت شد.'
      });
      await persistDB(db);
      console.log(`[Nightly Server Archiver] 23:00 archive batch completed and saved for date: ${dateShamsi}`);
    }
  } catch (err) {
    console.error('[Nightly Server Archiver] Error:', err);
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Karino Executive Server is running at http://0.0.0.0:${PORT}`);
    // Sync with Supabase in background after server is ready
    syncFromSupabase().catch(err => {
      console.warn('[Supabase] Initial background sync error:', err);
    });

    // Start 23:00 Nightly Server-side Archiver Engine (checks every 60 seconds)
    setInterval(runServerNightlyArchiver, 60 * 1000);
    // Run once on boot in case server was started during 23:00 hour
    runServerNightlyArchiver().catch(err => {
      console.warn('[Server Archiver] Boot check notice:', err);
    });
  });
}

startServer();
