import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  BENGALI_MONTHS,
  assignMeritRanks,
  compileStudentResult,
  isValidBdPhone,
  normalizeBdPhone,
  resolveInvoiceStatus,
} from './src/utils/academicLogic';
import type {
  AcademicClassId,
  AuthUser,
  ExamResult,
  Student,
  UserRole,
} from './src/types';
import {
  hashPassword,
  signSessionToken,
  verifyConstantTimeSecret,
  verifyPassword,
  verifySessionToken,
} from './server/auth';
import { LoginAttemptLimiter } from './server/rateLimiter';
import { getDb, saveDb } from './server/store';
import type { StoredUser } from './server/seedData';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: StoredUser;
      };
    }
  }
}

type AuthedRequest = Request;

function sanitizeUser(u: StoredUser): AuthUser {
  return {
    id: u.id,
    userCode: u.userCode,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    studentId: u.studentId,
    teacherId: u.teacherId,
  };
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'অননুমোদিত প্রবেশ। অনুগ্রহ করে পুনরায় লগইন করুন।' });
    return;
  }
  const token = header.slice(7).trim();
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'সেশন মেয়াদ উত্তীর্ণ হয়েছে। অনুগ্রহ করে পুনরায় লগইন করুন।' });
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === payload.userId);
  if (!user || !user.isActive) {
    res.status(403).json({ error: 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় রয়েছে। অফিসের সাথে যোগাযোগ করুন।' });
    return;
  }
  req.auth = { user };
  next();
}

function requireRoles(roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.user.role)) {
      res.status(403).json({ error: 'এই অংশে প্রবেশের অনুমতি আপনার নেই।' });
      return;
    }
    next();
  };
}

function addActivity(actorName: string, actorRole: UserRole | 'PUBLIC', action: string, details: string) {
  const db = getDb();
  db.activityLogs.unshift({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    actorName,
    actorRole,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
  if (db.activityLogs.length > 200) {
    db.activityLogs = db.activityLogs.slice(0, 200);
  }
}

function pushNotification(
  userId: string,
  title: string,
  body: string,
  category: 'notice' | 'message' | 'exam' | 'result' | 'payment' | 'admission' | 'homework'
) {
  const db = getDb();
  db.notifications.unshift({
    id: `notif-${crypto.randomUUID().slice(0, 8)}`,
    userId,
    title,
    body,
    category,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}

const adminAttemptLimiter = new LoginAttemptLimiter({
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000,
  lockoutMs: 120 * 1000,
});

const userAttemptLimiter = new LoginAttemptLimiter({
  maxAttempts: 8,
  windowMs: 10 * 60 * 1000,
  lockoutMs: 120 * 1000,
});

function getClientAttemptKey(req: Request, scope: string): string {
  const ip = req.ip || req.socket.remoteAddress || 'local';
  return `${scope}:${ip}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================
  app.get('/api/public/bootstrap', (_req, res) => {
    const db = getDb();
    const publishedResults = db.results.filter((r) => r.isPublished);
    res.json({
      settings: db.settings,
      classes: db.classes,
      batches: db.batches,
      subjects: db.subjects,
      teachers: db.teachers.filter((t) => t.isActive),
      notices: db.notices,
      exams: db.exams.filter((e) => e.isPublished),
      results: publishedResults,
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
    });
  });

  app.post('/api/public/admissions', (req, res) => {
    const {
      studentName,
      photoUrl,
      dateOfBirth,
      phone,
      email,
      guardianName,
      guardianPhone,
      address,
      previousSchool,
      classId,
      batchId,
      academicInfo,
    } = req.body ?? {};

    if (!studentName || !dateOfBirth || !phone || !guardianName || !guardianPhone || !address || !previousSchool || !classId || !batchId) {
      res.status(400).json({ error: 'অনুগ্রহ করে সকল আবশ্যক তথ্য সঠিকভাবে পূরণ করুন।' });
      return;
    }

    if (!isValidBdPhone(phone) || !isValidBdPhone(guardianPhone)) {
      res.status(400).json({ error: 'সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।' });
      return;
    }

    const db = getDb();
    const normPhone = normalizeBdPhone(phone);
    const duplicate = db.admissions.find(
      (a) =>
        normalizeBdPhone(a.phone) === normPhone &&
        a.classId === classId &&
        a.status !== 'Rejected'
    );
    if (duplicate) {
      res.status(409).json({
        error: `এই মোবাইল নম্বর দিয়ে উক্ত শ্রেণিতে ইতিমধ্যে একটি আবেদন (${duplicate.applicationId}) জমা রয়েছে।`,
      });
      return;
    }

    const clsExists = db.classes.some((c) => c.id === classId);
    const batchExists = db.batches.some((b) => b.id === batchId && b.classId === classId);
    if (!clsExists || !batchExists) {
      res.status(400).json({ error: 'নির্বাচিত শ্রেণি বা ব্যাচ সঠিক নয়।' });
      return;
    }

    const seq = 100 + db.admissions.length + 1;
    const applicationId = `APP-${db.settings.academicYear}-${String(seq).padStart(3, '0')}`;
    const newAdmission = {
      id: `adm-${crypto.randomUUID().slice(0, 8)}`,
      applicationId,
      studentName: String(studentName).trim(),
      photoUrl: typeof photoUrl === 'string' && photoUrl.startsWith('data:image/') ? photoUrl : undefined,
      dateOfBirth: String(dateOfBirth),
      phone: normPhone,
      email: email ? String(email).trim() : undefined,
      guardianName: String(guardianName).trim(),
      guardianPhone: normalizeBdPhone(guardianPhone),
      address: String(address).trim(),
      previousSchool: String(previousSchool).trim(),
      classId: classId as AcademicClassId,
      batchId: String(batchId),
      academicInfo: String(academicInfo ?? '').trim(),
      status: 'Submitted' as const,
      submittedAt: new Date().toISOString(),
    };

    db.admissions.unshift(newAdmission);
    const admins = db.users.filter((u) => u.role === 'ADMIN');
    admins.forEach((adm) => {
      pushNotification(
        adm.id,
        'নতুন অনলাইন ভর্তি আবেদন',
        `${newAdmission.studentName} (${applicationId}) ভর্তির আবেদন করেছেন।`,
        'admission'
      );
    });
    addActivity(newAdmission.studentName, 'PUBLIC', 'ভর্তি আবেদন জমা', `আবেদন আইডি: ${applicationId}`);
    saveDb(db);

    res.status(201).json({ application: newAdmission });
  });

  app.post('/api/public/contact', (req, res) => {
    const { name, phone, message } = req.body ?? {};
    if (!name || !phone || !message) {
      res.status(400).json({ error: 'নাম, মোবাইল নম্বর এবং বার্তা আবশ্যক।' });
      return;
    }
    const db = getDb();
    const admins = db.users.filter((u) => u.role === 'ADMIN');
    admins.forEach((adm) => {
      pushNotification(adm.id, `যোগাযোগ বার্তা: ${name}`, `${phone} — ${String(message).slice(0, 120)}`, 'notice');
    });
    addActivity(String(name), 'PUBLIC', 'যোগাযোগ ফর্ম বার্তা', String(phone));
    saveDb(db);
    res.json({ ok: true, message: 'আপনার বার্তা সফলভাবে পাঠানো হয়েছে। শীঘ্রই অফিস থেকে যোগাযোগ করা হবে।' });
  });

  // ==========================================================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================================================
  app.post('/api/auth/login', (req, res) => {
    const attemptKey = getClientAttemptKey(req, 'portal');
    const rateCheck = userAttemptLimiter.check(attemptKey);
    if (!rateCheck.allowed) {
      res.status(429).json({
        error: `অতিরিক্ত ব্যর্থ লগইন চেষ্টার কারণে সাময়িকভাবে স্থগিত। ${rateCheck.retryAfterSeconds} সেকেন্ড পর আবার চেষ্টা করুন।`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      });
      return;
    }

    const { identifier, password } = req.body ?? {};
    if (!identifier || !password) {
      res.status(400).json({ error: 'ইউজার আইডি/ইমেইল/ফোন এবং পাসওয়ার্ড দিন।' });
      return;
    }
    const db = getDb();
    const q = String(identifier).trim().toLowerCase();
    const normalizedPhone = normalizeBdPhone(String(identifier).trim());

    const user = db.users.find(
      (u) =>
        u.role !== 'ADMIN' &&
        (u.userCode.toLowerCase() === q ||
          u.email.toLowerCase() === q ||
          normalizeBdPhone(u.phone) === normalizedPhone)
    );

    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      userAttemptLimiter.recordFailure(attemptKey);
      res.status(401).json({ error: 'ভুল আইডি অথবা পাসওয়ার্ড। অনুগ্রহ করে যাচাই করে আবার চেষ্টা করুন।' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({
        error: 'আপনার অ্যাকাউন্টটি এখনও সক্রিয় করা হয়নি অথবা সাময়িকভাবে নিষ্ক্রিয়। অ্যাডমিনের অনুমোদনের পর লগইন করতে পারবেন।',
      });
      return;
    }

    userAttemptLimiter.reset(attemptKey);
    const token = signSessionToken(user.id, user.role);
    addActivity(user.name, user.role, 'সফল লগইন', `আইডি: ${user.userCode}`);
    saveDb(db);
    res.json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/admin-access', (req, res) => {
    const attemptKey = getClientAttemptKey(req, 'hidden-admin');
    const rateCheck = adminAttemptLimiter.check(attemptKey);
    if (!rateCheck.allowed) {
      res.status(429).json({
        error: `Access Denied: অতিরিক্ত ভুল পাসওয়ার্ড দেওয়ায় লগইন সাময়িকভাবে সীমিত করা হয়েছে। ${rateCheck.retryAfterSeconds} সেকেন্ড পর আবার চেষ্টা করুন।`,
        locked: true,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
        remainingAttempts: 0,
      });
      return;
    }

    const { password } = req.body ?? {};
    if (typeof password !== 'string' || !password.trim()) {
      res.status(400).json({
        error: 'অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড প্রদান করুন।',
        locked: false,
        remainingAttempts: rateCheck.remainingAttempts,
      });
      return;
    }

    const db = getDb();
    const adminUser = db.users.find((u) => u.role === 'ADMIN');
    if (!adminUser || !adminUser.isActive) {
      res.status(403).json({
        error: 'Access Denied: অ্যাডমিন অ্যাকাউন্ট সক্রিয় নয়।',
        locked: false,
      });
      return;
    }

    const envSecret = process.env.ADMIN_ACCESS_PASSWORD?.trim();
    const isValid = envSecret
      ? verifyConstantTimeSecret(password, envSecret)
      : verifyPassword(password, adminUser.passwordHash);

    if (!isValid) {
      const failState = adminAttemptLimiter.recordFailure(attemptKey);
      addActivity('অজানা প্রচেষ্টা', 'PUBLIC', 'ব্যর্থ হিডেন অ্যাডমিন প্রবেশ', `অবশিষ্ট চেষ্টা: ${failState.remainingAttempts}`);
      saveDb(db);
      if (failState.locked) {
        res.status(429).json({
          error: `Access Denied: পরপর কয়েকবার ভুল পাসওয়ার্ড দেওয়ায় নিরাপত্তা কারণে ${failState.retryAfterSeconds} সেকেন্ডের জন্য লগইন সীমিত করা হয়েছে।`,
          locked: true,
          retryAfterSeconds: failState.retryAfterSeconds,
          remainingAttempts: 0,
        });
        return;
      }
      res.status(401).json({
        error: 'Access Denied: ভুল অ্যাডমিন পাসওয়ার্ড।',
        locked: false,
        remainingAttempts: failState.remainingAttempts,
      });
      return;
    }

    adminAttemptLimiter.reset(attemptKey);
    const token = signSessionToken(adminUser.id, adminUser.role);
    addActivity(adminUser.name, 'ADMIN', 'হিডেন অ্যাডমিন লগইন', 'লোগো সিক্রেট পোর্টাল যাচাইকৃত');
    saveDb(db);
    res.json({ token, user: sanitizeUser(adminUser) });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: sanitizeUser(req.auth!.user) });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { identifier } = req.body ?? {};
    if (!identifier) {
      res.status(400).json({ error: 'ইউজার আইডি, ইমেইল অথবা মোবাইল নম্বর দিন।' });
      return;
    }
    const db = getDb();
    const q = String(identifier).trim().toLowerCase();
    const normalizedPhone = normalizeBdPhone(String(identifier).trim());
    const user = db.users.find(
      (u) =>
        u.role !== 'ADMIN' &&
        (u.userCode.toLowerCase() === q ||
          u.email.toLowerCase() === q ||
          normalizeBdPhone(u.phone) === normalizedPhone)
    );
    if (!user) {
      res.status(404).json({ error: 'এই তথ্যে কোনো অ্যাকাউন্ট পাওয়া যায়নি।' });
      return;
    }
    const code = String(crypto.randomInt(100000, 999999));
    db.resetCodes[user.id] = { code, expiresAt: Date.now() + 15 * 60 * 1000 };
    saveDb(db);
    res.json({
      ok: true,
      message: 'পাসওয়ার্ড রিসেট কোড তৈরি হয়েছে।',
      demoResetCode: code,
      userCode: user.userCode,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { identifier, code, newPassword } = req.body ?? {};
    if (!identifier || !code || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'সঠিক রিসেট কোড এবং কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড দিন।' });
      return;
    }
    const db = getDb();
    const q = String(identifier).trim().toLowerCase();
    const normalizedPhone = normalizeBdPhone(String(identifier).trim());
    const user = db.users.find(
      (u) =>
        u.role !== 'ADMIN' &&
        (u.userCode.toLowerCase() === q ||
          u.email.toLowerCase() === q ||
          normalizeBdPhone(u.phone) === normalizedPhone)
    );
    if (!user) {
      res.status(404).json({ error: 'ব্যবহারকারী পাওয়া যায়নি।' });
      return;
    }
    const stored = db.resetCodes[user.id];
    if (!stored || stored.code !== String(code).trim() || stored.expiresAt < Date.now()) {
      res.status(400).json({ error: 'রিসেট কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে।' });
      return;
    }
    user.passwordHash = hashPassword(String(newPassword));
    delete db.resetCodes[user.id];
    addActivity(user.name, user.role, 'পাসওয়ার্ড পরিবর্তন', 'রিসেট কোডের মাধ্যমে পাসওয়ার্ড হালনাগাদ');
    saveDb(db);
    res.json({ ok: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।' });
  });

  app.post('/api/auth/change-password', requireAuth, (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'বর্তমান পাসওয়ার্ড ও কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড দিন।' });
      return;
    }
    const db = getDb();
    const user = db.users.find((u) => u.id === req.auth!.user.id)!;
    if (!verifyPassword(String(currentPassword), user.passwordHash)) {
      res.status(400).json({ error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' });
      return;
    }
    user.passwordHash = hashPassword(String(newPassword));
    saveDb(db);
    res.json({ ok: true, message: 'পাসওয়ার্ড সফলভাবে হালনাগাদ হয়েছে।' });
  });

  // ==========================================================================
  // SHARED AUTHENTICATED ENDPOINTS (NOTIFICATIONS & MESSAGING)
  // ==========================================================================
  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const list = db.notifications.filter((n) => n.userId === req.auth!.user.id);
    res.json({ notifications: list });
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    db.notifications.forEach((n) => {
      if (n.userId === req.auth!.user.id) n.isRead = true;
    });
    saveDb(db);
    res.json({ ok: true });
  });

  app.get('/api/messaging/conversations', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const user = req.auth!.user;
    const allowedConvs = db.conversations.filter(
      (c) => user.role === 'ADMIN' || c.participantIds.includes(user.id)
    );
    const convIds = new Set(allowedConvs.map((c) => c.id));
    const messages = db.messages.filter((m) => convIds.has(m.conversationId));
    const contacts = db.users
      .filter((u) => u.id !== user.id && u.isActive)
      .filter((u) => {
        if (user.role === 'ADMIN') return true;
        if (user.role === 'TEACHER') return u.role === 'ADMIN' || u.role === 'STUDENT';
        return u.role === 'ADMIN' || u.role === 'TEACHER';
      })
      .map(sanitizeUser);
    res.json({ conversations: allowedConvs, messages, contacts });
  });

  app.post('/api/messaging/private', requireAuth, (req: AuthedRequest, res) => {
    const { targetUserId } = req.body ?? {};
    const db = getDb();
    const user = req.auth!.user;
    const target = db.users.find((u) => u.id === targetUserId && u.isActive);
    if (!target) {
      res.status(404).json({ error: 'প্রাপক ব্যবহারকারী পাওয়া যায়নি।' });
      return;
    }
    if (user.role === 'STUDENT' && target.role === 'STUDENT') {
      res.status(403).json({ error: 'শিক্ষার্থীরা শুধুমাত্র শিক্ষক বা অ্যাডমিনের সাথে ব্যক্তিগত বার্তা বিনিময় করতে পারবে।' });
      return;
    }
    const existing = db.conversations.find(
      (c) =>
        c.type === 'PRIVATE' &&
        c.participantIds.includes(user.id) &&
        c.participantIds.includes(target.id)
    );
    if (existing) {
      res.json({ conversation: existing });
      return;
    }
    const conv = {
      id: `conv-priv-${crypto.randomUUID().slice(0, 8)}`,
      type: 'PRIVATE' as const,
      title: `${user.name} ↔ ${target.name}`,
      participantIds: [user.id, target.id],
      participantRoles: [user.role, target.role],
    };
    db.conversations.push(conv);
    saveDb(db);
    res.status(201).json({ conversation: conv });
  });

  app.post('/api/messaging/messages', requireAuth, (req: AuthedRequest, res) => {
    const { conversationId, text, attachmentName, attachmentType, replyToId } = req.body ?? {};
    const db = getDb();
    const user = req.auth!.user;
    const conv = db.conversations.find((c) => c.id === conversationId);
    if (!conv) {
      res.status(404).json({ error: 'কথোপকথন পাওয়া যায়নি।' });
      return;
    }
    if (user.role !== 'ADMIN' && !conv.participantIds.includes(user.id)) {
      res.status(403).json({ error: 'এই গ্রুপ বা চ্যাটে বার্তা পাঠানোর অনুমতি নেই।' });
      return;
    }
    if (!text && !attachmentName) {
      res.status(400).json({ error: 'বার্তা লিখুন অথবা ফাইল সংযুক্ত করুন।' });
      return;
    }
    const replyTarget = replyToId ? db.messages.find((m) => m.id === replyToId) : undefined;
    const msg = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      conversationId,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      text: String(text ?? '').trim(),
      attachmentName: attachmentName ? String(attachmentName) : undefined,
      attachmentType: attachmentType === 'image' || attachmentType === 'pdf' ? attachmentType : undefined,
      replyToId: replyTarget?.id,
      replyToPreview: replyTarget ? replyTarget.text.slice(0, 60) : undefined,
      sentAt: new Date().toISOString(),
      readBy: [user.id],
    };
    db.messages.push(msg);

    conv.participantIds
      .filter((pid) => pid !== user.id)
      .forEach((pid) => {
        pushNotification(pid, `নতুন বার্তা: ${conv.title}`, `${user.name}: ${msg.text.slice(0, 80)}`, 'message');
      });

    saveDb(db);
    res.status(201).json({ message: msg });
  });

  app.post('/api/messaging/messages/:id/read', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const msg = db.messages.find((m) => m.id === req.params.id);
    if (msg && !msg.readBy.includes(req.auth!.user.id)) {
      msg.readBy.push(req.auth!.user.id);
      saveDb(db);
    }
    res.json({ ok: true });
  });

  app.post('/api/messaging/messages/:id/report', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const msg = db.messages.find((m) => m.id === req.params.id);
    if (!msg) {
      res.status(404).json({ error: 'বার্তা পাওয়া যায়নি।' });
      return;
    }
    msg.reportedBy = msg.reportedBy ?? [];
    if (!msg.reportedBy.includes(req.auth!.user.id)) {
      msg.reportedBy.push(req.auth!.user.id);
    }
    db.users
      .filter((u) => u.role === 'ADMIN')
      .forEach((adm) => {
        pushNotification(
          adm.id,
          'বার্তা রিপোর্ট করা হয়েছে',
          `${req.auth!.user.name} একটি বার্তা রিপোর্ট করেছেন: "${msg.text.slice(0, 60)}"`,
          'message'
        );
      });
    saveDb(db);
    res.json({ ok: true });
  });

  // ==========================================================================
  // STUDENT ENDPOINTS (STRICTLY OWN DATA)
  // ==========================================================================
  app.get('/api/student/dashboard', requireAuth, requireRoles(['STUDENT']), (req: AuthedRequest, res) => {
    const db = getDb();
    const user = req.auth!.user;
    const student = db.students.find((s) => s.id === user.studentId);
    if (!student) {
      res.status(404).json({ error: 'শিক্ষার্থীর প্রোফাইল পাওয়া যায়নি।' });
      return;
    }
    const enrolledClassIds = new Set(student.enrollments.map((e) => e.classId));
    const enrolledBatchIds = new Set(student.enrollments.map((e) => e.batchId));

    const routines = db.routines.filter((r) => enrolledBatchIds.has(r.batchId));
    const attendance = db.attendance.filter((a) => a.studentId === student.id);
    const invoices = db.invoices.filter((i) => i.studentId === student.id);
    const payments = db.payments.filter((p) => p.studentId === student.id);
    const exams = db.exams.filter((e) => enrolledClassIds.has(e.classId));
    const myResults = db.results.filter((r) => r.studentId === student.id && r.isPublished);
    const allPublishedResults = db.results.filter(
      (r) => r.isPublished && enrolledClassIds.has(r.classId)
    );
    const notices = db.notices.filter(
      (n) => n.targetClassId === 'ALL' || enrolledClassIds.has(n.targetClassId as AcademicClassId)
    );
    const studyMaterials = db.studyMaterials.filter((m) => enrolledClassIds.has(m.classId));
    const homework = db.homework.filter((h) => enrolledBatchIds.has(h.batchId));
    const homeworkSubmissions = db.homeworkSubmissions.filter((hs) => hs.studentId === student.id);

    res.json({
      student,
      classes: db.classes,
      batches: db.batches,
      routines,
      attendance,
      invoices,
      payments,
      exams,
      myResults,
      rankings: allPublishedResults,
      notices,
      studyMaterials,
      homework,
      homeworkSubmissions,
      onlineGatewayConfigured: Boolean(process.env.SSLCOMMERZ_STORE_ID || process.env.BKASH_APP_KEY),
    });
  });

  app.post('/api/student/payments/manual', requireAuth, requireRoles(['STUDENT']), (req: AuthedRequest, res) => {
    const { invoiceId, amount, method, transactionId, senderPhone, notes } = req.body ?? {};
    const db = getDb();
    const student = db.students.find((s) => s.id === req.auth!.user.studentId);
    if (!student) {
      res.status(404).json({ error: 'শিক্ষার্থী পাওয়া যায়নি।' });
      return;
    }
    const invoice = db.invoices.find((i) => i.id === invoiceId && i.studentId === student.id);
    if (!invoice) {
      res.status(404).json({ error: 'ইনভয়েস পাওয়া যায়নি।' });
      return;
    }
    const cleanTx = String(transactionId ?? '').trim().toUpperCase();
    const numericAmount = Number(amount);
    if (!cleanTx || cleanTx.length < 5 || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'সঠিক Transaction ID এবং টাকার পরিমাণ প্রদান করুন।' });
      return;
    }
    const duplicateTx = db.payments.find(
      (p) => p.transactionId.toUpperCase() === cleanTx && p.status !== 'Rejected'
    );
    if (duplicateTx) {
      res.status(409).json({ error: 'এই Transaction ID ইতিমধ্যে ব্যবহৃত হয়েছে। একই লেনদেন দ্বিতীয়বার জমা দেওয়া যাবে না।' });
      return;
    }

    const receiptNo = `RCP-${db.settings.academicYear}-${5000 + db.payments.length + 1}`;
    const payment = {
      id: `pay-${crypto.randomUUID().slice(0, 8)}`,
      receiptNo,
      invoiceId: invoice.id,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.name,
      amount: numericAmount,
      method: method ?? 'বিকাশ',
      transactionId: cleanTx,
      senderPhone: senderPhone ? String(senderPhone).trim() : student.phone,
      status: 'Pending' as const,
      submittedAt: new Date().toISOString(),
      notes: notes ? String(notes).trim() : undefined,
    };

    db.payments.unshift(payment);
    invoice.status = resolveInvoiceStatus(invoice.amount, invoice.paidAmount, true);

    db.users
      .filter((u) => u.role === 'ADMIN')
      .forEach((adm) => {
        pushNotification(
          adm.id,
          'নতুন পেমেন্ট যাচাইয়ের অনুরোধ',
          `${student.name} (${invoice.monthNameBn}) · ${payment.method} · TxID: ${cleanTx}`,
          'payment'
        );
      });
    addActivity(student.name, 'STUDENT', 'ম্যানুয়াল পেমেন্ট জমা', `${invoice.monthNameBn} · TxID: ${cleanTx}`);
    saveDb(db);
    res.status(201).json({ payment, invoice });
  });

  app.post('/api/payments/online/init', requireAuth, (_req, res) => {
    const hasGateway = Boolean(process.env.SSLCOMMERZ_STORE_ID || process.env.BKASH_APP_KEY);
    if (!hasGateway) {
      res.status(501).json({
        status: 'INTEGRATION_PENDING',
        error: 'অনলাইন পেমেন্ট গেটওয়ে (SSLCommerz / bKash Merchant API) এখনও সংযুক্ত হয়নি (Integration Pending)। অনুগ্রহ করে ম্যানুয়াল পেমেন্ট পদ্ধতি ব্যবহার করুন অথবা সার্ভার এনভায়রনমেন্টে গেটওয়ে কী যুক্ত করুন।',
      });
      return;
    }
    res.json({ status: 'READY' });
  });

  app.post('/api/student/homework/submit', requireAuth, requireRoles(['STUDENT']), (req: AuthedRequest, res) => {
    const { homeworkId, note, fileName } = req.body ?? {};
    const db = getDb();
    const student = db.students.find((s) => s.id === req.auth!.user.studentId);
    if (!student) {
      res.status(404).json({ error: 'শিক্ষার্থী পাওয়া যায়নি।' });
      return;
    }
    const hw = db.homework.find((h) => h.id === homeworkId);
    if (!hw) {
      res.status(404).json({ error: 'হোমওয়ার্ক পাওয়া যায়নি।' });
      return;
    }
    const isEnrolled = student.enrollments.some((e) => e.batchId === hw.batchId);
    if (!isEnrolled) {
      res.status(403).json({ error: 'আপনি এই ব্যাচের শিক্ষার্থী নন।' });
      return;
    }
    const existingIdx = db.homeworkSubmissions.findIndex(
      (s) => s.homeworkId === homeworkId && s.studentId === student.id
    );
    const submission = {
      id: existingIdx >= 0 ? db.homeworkSubmissions[existingIdx].id : `hws-${crypto.randomUUID().slice(0, 8)}`,
      homeworkId,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.name,
      note: String(note ?? '').trim() || 'হোমওয়ার্ক জমা দেওয়া হয়েছে।',
      fileName: fileName ? String(fileName) : undefined,
      submittedAt: new Date().toISOString(),
      status: 'Submitted' as const,
    };
    if (existingIdx >= 0) {
      db.homeworkSubmissions[existingIdx] = submission;
    } else {
      db.homeworkSubmissions.unshift(submission);
    }
    saveDb(db);
    res.status(201).json({ submission });
  });

  // ==========================================================================
  // TEACHER ENDPOINTS (RESTRICTED TO ASSIGNED CLASSES)
  // ==========================================================================
  app.get('/api/teacher/dashboard', requireAuth, requireRoles(['TEACHER']), (req: AuthedRequest, res) => {
    const db = getDb();
    const teacher = db.teachers.find((t) => t.id === req.auth!.user.teacherId);
    if (!teacher) {
      res.status(404).json({ error: 'শিক্ষকের প্রোফাইল পাওয়া যায়নি।' });
      return;
    }
    const allowedClasses = new Set(teacher.assignedClassIds);
    const assignedStudents = db.students.filter((s) =>
      s.enrollments.some((e) => allowedClasses.has(e.classId))
    );
    const routines = db.routines.filter((r) => allowedClasses.has(r.classId));
    const attendance = db.attendance.filter((a) => allowedClasses.has(a.classId));
    const exams = db.exams.filter((e) => allowedClasses.has(e.classId));
    const results = db.results.filter((r) => allowedClasses.has(r.classId));
    const studyMaterials = db.studyMaterials.filter((m) => allowedClasses.has(m.classId));
    const homework = db.homework.filter((h) => allowedClasses.has(h.classId));
    const hwIds = new Set(homework.map((h) => h.id));
    const homeworkSubmissions = db.homeworkSubmissions.filter((hs) => hwIds.has(hs.homeworkId));
    const notices = db.notices.filter(
      (n) => n.targetClassId === 'ALL' || allowedClasses.has(n.targetClassId as AcademicClassId)
    );

    res.json({
      teacher,
      classes: db.classes.filter((c) => allowedClasses.has(c.id)),
      batches: db.batches.filter((b) => allowedClasses.has(b.classId)),
      subjects: db.subjects.filter((s) => allowedClasses.has(s.classId)),
      students: assignedStudents,
      routines,
      attendance,
      exams,
      results,
      studyMaterials,
      homework,
      homeworkSubmissions,
      notices,
    });
  });

  app.post('/api/teacher/attendance', requireAuth, requireRoles(['TEACHER', 'ADMIN']), (req: AuthedRequest, res) => {
    const { date, classId, batchId, entries } = req.body ?? {};
    const db = getDb();
    const user = req.auth!.user;
    if (user.role === 'TEACHER') {
      const teacher = db.teachers.find((t) => t.id === user.teacherId);
      if (!teacher || !teacher.assignedClassIds.includes(classId)) {
        res.status(403).json({ error: 'আপনাকে এই শ্রেণির হাজিরা নেওয়ার অনুমতি দেওয়া হয়নি।' });
        return;
      }
    }
    if (!date || !classId || !batchId || !Array.isArray(entries)) {
      res.status(400).json({ error: 'তারিখ, শ্রেণি, ব্যাচ এবং শিক্ষার্থীর উপস্থিতির তথ্য প্রয়োজন।' });
      return;
    }

    // Remove existing records for same date+class+batch and replace cleanly
    db.attendance = db.attendance.filter(
      (a) => !(a.date === date && a.classId === classId && a.batchId === batchId)
    );
    for (const entry of entries) {
      const st = db.students.find((s) => s.id === entry.studentId);
      const enr = st?.enrollments.find((e) => e.batchId === batchId) ?? st?.enrollments[0];
      if (!st || !enr) continue;
      db.attendance.unshift({
        id: `att-${crypto.randomUUID().slice(0, 8)}`,
        date: String(date),
        classId,
        batchId,
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.name,
        rollNumber: enr.rollNumber,
        status: entry.status,
        markedBy: user.name,
        remarks: entry.remarks,
      });
    }
    addActivity(user.name, user.role, 'হাজিরা সংরক্ষণ', `${date} · ${classId}`);
    saveDb(db);
    res.json({ ok: true, attendance: db.attendance });
  });

  app.post('/api/teacher/marks', requireAuth, requireRoles(['TEACHER', 'ADMIN']), (req: AuthedRequest, res) => {
    const { examId, studentId, marksBySubject } = req.body ?? {};
    const db = getDb();
    const user = req.auth!.user;
    const exam = db.exams.find((e) => e.id === examId);
    if (!exam) {
      res.status(404).json({ error: 'পরীক্ষা পাওয়া যায়নি।' });
      return;
    }
    if (user.role === 'TEACHER') {
      const teacher = db.teachers.find((t) => t.id === user.teacherId);
      if (!teacher || !teacher.assignedClassIds.includes(exam.classId)) {
        res.status(403).json({ error: 'আপনাকে এই শ্রেণির নম্বর এন্ট্রি করার অনুমতি দেওয়া হয়নি।' });
        return;
      }
    }
    const student = db.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(404).json({ error: 'শিক্ষার্থী পাওয়া যায়নি।' });
      return;
    }
    const enrollment =
      student.enrollments.find((e) => e.classId === exam.classId) ?? student.enrollments[0];
    if (!enrollment) {
      res.status(400).json({ error: 'শিক্ষার্থী এই শ্রেণিতে তালিকাভুক্ত নয়।' });
      return;
    }

    const compiled = compileStudentResult(
      exam.subjects.map((sub) => {
        const rawVal = Number(marksBySubject?.[sub.subjectName] ?? 0);
        return {
          subjectName: sub.subjectName,
          fullMarks: sub.fullMarks,
          passMarks: sub.passMarks,
          obtainedMarks: Number.isFinite(rawVal) ? rawVal : 0,
        };
      })
    );

    const existingIdx = db.results.findIndex((r) => r.examId === exam.id && r.studentId === student.id);
    const newResult: ExamResult = {
      id: existingIdx >= 0 ? db.results[existingIdx].id : `res-${crypto.randomUUID().slice(0, 8)}`,
      examId: exam.id,
      examTitle: exam.title,
      classId: exam.classId,
      batchId: exam.batchId,
      academicYear: exam.academicYear,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.name,
      rollNumber: enrollment.rollNumber,
      photoUrl: student.photoUrl,
      ...compiled,
      classRank: 0,
      batchRank: 0,
      isPublished: existingIdx >= 0 ? db.results[existingIdx].isPublished : exam.isPublished,
      publishedAt: existingIdx >= 0 ? db.results[existingIdx].publishedAt : undefined,
    };

    if (existingIdx >= 0) {
      db.results[existingIdx] = newResult;
    } else {
      db.results.push(newResult);
    }
    db.results = assignMeritRanks(db.results);
    addActivity(user.name, user.role, 'নম্বর এন্ট্রি', `${exam.title} · ${student.name}`);
    saveDb(db);
    res.json({ ok: true, results: db.results });
  });

  app.post('/api/teacher/materials', requireAuth, requireRoles(['TEACHER', 'ADMIN']), (req: AuthedRequest, res) => {
    const { title, subject, classId, batchId, description, fileName, fileSize } = req.body ?? {};
    const db = getDb();
    const user = req.auth!.user;
    if (!title || !subject || !classId || !fileName) {
      res.status(400).json({ error: 'শিরোনাম, বিষয়, শ্রেণি ও ফাইলের নাম আবশ্যক।' });
      return;
    }
    if (user.role === 'TEACHER') {
      const teacher = db.teachers.find((t) => t.id === user.teacherId);
      if (!teacher || !teacher.assignedClassIds.includes(classId)) {
        res.status(403).json({ error: 'এই শ্রেণিতে ম্যাটেরিয়াল আপলোডের অনুমতি নেই।' });
        return;
      }
    }
    const mat = {
      id: `mat-${crypto.randomUUID().slice(0, 8)}`,
      title: String(title).trim(),
      subject: String(subject).trim(),
      classId,
      batchId: batchId || 'ALL',
      description: String(description ?? '').trim(),
      fileName: String(fileName).trim(),
      fileSize: fileSize ? String(fileSize) : '১.২ MB',
      fileUrl: '#uploaded-material',
      uploadedBy: user.name,
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    db.studyMaterials.unshift(mat);
    saveDb(db);
    res.status(201).json({ material: mat });
  });

  app.post('/api/teacher/homework', requireAuth, requireRoles(['TEACHER', 'ADMIN']), (req: AuthedRequest, res) => {
    const { title, description, subject, classId, batchId, deadline, attachmentName } = req.body ?? {};
    const db = getDb();
    const user = req.auth!.user;
    if (!title || !description || !subject || !classId || !batchId || !deadline) {
      res.status(400).json({ error: 'সকল হোমওয়ার্ক তথ্য পূরণ করুন।' });
      return;
    }
    if (user.role === 'TEACHER') {
      const teacher = db.teachers.find((t) => t.id === user.teacherId);
      if (!teacher || !teacher.assignedClassIds.includes(classId)) {
        res.status(403).json({ error: 'এই শ্রেণিতে হোমওয়ার্ক দেওয়ার অনুমতি নেই।' });
        return;
      }
    }
    const hw = {
      id: `hw-${crypto.randomUUID().slice(0, 8)}`,
      title: String(title).trim(),
      description: String(description).trim(),
      subject: String(subject).trim(),
      classId,
      batchId,
      teacherId: user.teacherId ?? 'admin',
      teacherName: user.name,
      deadline: String(deadline),
      attachmentName: attachmentName ? String(attachmentName) : undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    db.homework.unshift(hw);
    db.students
      .filter((s) => s.enrollments.some((e) => e.batchId === batchId))
      .forEach((s) => {
        const stuUser = db.users.find((u) => u.studentId === s.id);
        if (stuUser) {
          pushNotification(stuUser.id, `নতুন হোমওয়ার্ক: ${hw.title}`, `জমা দেওয়ার শেষ তারিখ: ${hw.deadline}`, 'homework');
        }
      });
    saveDb(db);
    res.status(201).json({ homework: hw });
  });

  // ==========================================================================
  // ADMIN ENDPOINTS
  // ==========================================================================
  app.get('/api/admin/overview', requireAuth, requireRoles(['ADMIN']), (_req, res) => {
    const db = getDb();
    res.json({
      students: db.students,
      teachers: db.teachers,
      classes: db.classes,
      batches: db.batches,
      subjects: db.subjects,
      admissions: db.admissions,
      routines: db.routines,
      attendance: db.attendance,
      invoices: db.invoices,
      payments: db.payments,
      exams: db.exams,
      results: db.results,
      notices: db.notices,
      studyMaterials: db.studyMaterials,
      homework: db.homework,
      homeworkSubmissions: db.homeworkSubmissions,
      activityLogs: db.activityLogs,
      settings: db.settings,
    });
  });

  app.post('/api/admin/students', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const {
      name,
      phone,
      email,
      dateOfBirth,
      guardianName,
      guardianPhone,
      address,
      previousSchool,
      classId,
      batchId,
      rollNumber,
      password,
    } = req.body ?? {};
    if (!name || !phone || !guardianName || !guardianPhone || !classId || !batchId) {
      res.status(400).json({ error: 'শিক্ষার্থীর নাম, মোবাইল, অভিভাবক, শ্রেণি ও ব্যাচ আবশ্যক।' });
      return;
    }
    const db = getDb();
    const normPhone = normalizeBdPhone(phone);
    // Check if student identity already exists (e.g., Class 10 student enrolling in SSC Batch)
    let student = db.students.find((s) => normalizeBdPhone(s.phone) === normPhone);

    if (student) {
      const alreadyEnrolled = student.enrollments.some(
        (e) => e.classId === classId && e.academicYear === db.settings.academicYear
      );
      if (alreadyEnrolled) {
        res.status(409).json({ error: 'এই শিক্ষার্থী ইতিমধ্যে উক্ত শ্রেণিতে তালিকাভুক্ত।' });
        return;
      }
      const nextRoll =
        rollNumber ||
        String(
          db.students.filter((s) => s.enrollments.some((e) => e.batchId === batchId)).length + 1
        ).padStart(2, '0');
      student.enrollments.push({
        id: `enr-${crypto.randomUUID().slice(0, 8)}`,
        studentId: student.id,
        classId,
        batchId,
        rollNumber: nextRoll,
        academicYear: db.settings.academicYear,
        isPrimary: false,
        status: 'ACTIVE',
        enrolledAt: new Date().toISOString().slice(0, 10),
      });
      addActivity(req.auth!.user.name, 'ADMIN', 'ব্যাচ এনরোলমেন্ট যুক্ত', `${student.name} (${student.studentCode}) -> ${classId}`);
      saveDb(db);
      res.status(201).json({ student, reusedExistingIdentity: true });
      return;
    }

    const seq = 100 + db.students.length + 1;
    const studentCode = `SHK-${db.settings.academicYear}-${seq}`;
    const assignedRoll =
      rollNumber ||
      String(
        db.students.filter((s) => s.enrollments.some((e) => e.batchId === batchId)).length + 1
      ).padStart(2, '0');
    const stuId = `stu-${crypto.randomUUID().slice(0, 8)}`;

    student = {
      id: stuId,
      studentCode,
      name: String(name).trim(),
      dateOfBirth: dateOfBirth || '2010-01-01',
      phone: normPhone,
      email: email ? String(email).trim() : `${studentCode.toLowerCase()}@student.shikkhanir.edu.bd`,
      guardianName: String(guardianName).trim(),
      guardianPhone: normalizeBdPhone(guardianPhone),
      address: String(address ?? 'কুষ্টিয়া').trim(),
      previousSchool: String(previousSchool ?? 'স্থানীয় বিদ্যালয়').trim(),
      admissionDate: new Date().toISOString().slice(0, 10),
      isActive: true,
      enrollments: [
        {
          id: `enr-${crypto.randomUUID().slice(0, 8)}`,
          studentId: stuId,
          classId,
          batchId,
          rollNumber: assignedRoll,
          academicYear: db.settings.academicYear,
          isPrimary: true,
          status: 'ACTIVE',
          enrolledAt: new Date().toISOString().slice(0, 10),
        },
      ],
    };

    db.students.unshift(student);
    const userId = `usr-${stuId}`;
    db.users.push({
      id: userId,
      userCode: studentCode,
      name: student.name,
      email: student.email!,
      phone: student.phone,
      role: 'STUDENT',
      passwordHash: hashPassword(password || 'Student@2026'),
      isActive: true,
      studentId: stuId,
    });

    // Add to corresponding class group chat
    const grp = db.conversations.find((c) => c.type === 'GROUP' && c.classId === classId);
    if (grp && !grp.participantIds.includes(userId)) {
      grp.participantIds.push(userId);
    }

    // Generate invoices for Jan-Dec
    const cls = db.classes.find((c) => c.id === classId);
    const fee = cls?.monthlyFee ?? 1500;
    for (let m = 1; m <= 12; m++) {
      db.invoices.push({
        id: `inv-${stuId}-${m}`,
        invoiceNo: `INV-${db.settings.academicYear}-${1000 + db.invoices.length + 1}`,
        studentId: stuId,
        studentCode,
        studentName: student.name,
        classId,
        batchId,
        monthIndex: m,
        monthNameBn: BENGALI_MONTHS[m - 1],
        academicYear: db.settings.academicYear,
        amount: fee,
        paidAmount: 0,
        status: 'Unpaid',
        dueDate: `${db.settings.academicYear}-${String(m).padStart(2, '0')}-10`,
      });
    }

    addActivity(req.auth!.user.name, 'ADMIN', 'নতুন শিক্ষার্থী যোগ', `${student.name} (${studentCode})`);
    saveDb(db);
    res.status(201).json({ student });
  });

  app.patch('/api/admin/students/:id', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const db = getDb();
    const student = db.students.find((s) => s.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: 'শিক্ষার্থী পাওয়া যায়নি।' });
      return;
    }
    const { name, phone, guardianName, guardianPhone, address, previousSchool, isActive, rollNumber, classId, batchId } = req.body ?? {};
    if (name) student.name = String(name).trim();
    if (phone) student.phone = normalizeBdPhone(phone);
    if (guardianName) student.guardianName = String(guardianName).trim();
    if (guardianPhone) student.guardianPhone = normalizeBdPhone(guardianPhone);
    if (address) student.address = String(address).trim();
    if (previousSchool) student.previousSchool = String(previousSchool).trim();
    if (typeof isActive === 'boolean') student.isActive = isActive;
    if (rollNumber && student.enrollments[0]) {
      const targetEnr = classId
        ? student.enrollments.find((e) => e.classId === classId) ?? student.enrollments[0]
        : student.enrollments[0];
      targetEnr.rollNumber = String(rollNumber);
      if (batchId) targetEnr.batchId = String(batchId);
    }
    const usr = db.users.find((u) => u.studentId === student.id);
    if (usr) {
      usr.name = student.name;
      usr.phone = student.phone;
      usr.isActive = student.isActive;
    }
    addActivity(req.auth!.user.name, 'ADMIN', 'শিক্ষার্থী তথ্য হালনাগাদ', `${student.name} (${student.studentCode})`);
    saveDb(db);
    res.json({ student });
  });

  app.post('/api/admin/admissions/:id/review', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const { action, rollNumber, reviewNotes } = req.body ?? {};
    const db = getDb();
    const appItem = db.admissions.find((a) => a.id === req.params.id);
    if (!appItem) {
      res.status(404).json({ error: 'ভর্তি আবেদন পাওয়া যায়নি।' });
      return;
    }

    if (action === 'review') {
      appItem.status = 'Under Review';
      appItem.reviewedAt = new Date().toISOString();
      appItem.reviewNotes = reviewNotes ? String(reviewNotes) : undefined;
      saveDb(db);
      res.json({ application: appItem });
      return;
    }

    if (action === 'reject') {
      appItem.status = 'Rejected';
      appItem.reviewedAt = new Date().toISOString();
      appItem.reviewNotes = reviewNotes ? String(reviewNotes) : 'অযোগ্য / অসম্পূর্ণ তথ্য';
      addActivity(req.auth!.user.name, 'ADMIN', 'ভর্তি আবেদন বাতিল', `${appItem.applicationId} · ${appItem.studentName}`);
      saveDb(db);
      res.json({ application: appItem });
      return;
    }

    if (action === 'approve') {
      if (appItem.status === 'Approved') {
        res.status(400).json({ error: 'এই আবেদনটি ইতিমধ্যে অনুমোদিত হয়েছে।' });
        return;
      }
      const normPhone = normalizeBdPhone(appItem.phone);
      let existingStudent = db.students.find((s) => normalizeBdPhone(s.phone) === normPhone);
      const assignedRoll =
        rollNumber ||
        String(
          db.students.filter((s) => s.enrollments.some((e) => e.batchId === appItem.batchId)).length + 1
        ).padStart(2, '0');

      if (existingStudent) {
        const alreadyHasClass = existingStudent.enrollments.some(
          (e) => e.classId === appItem.classId && e.academicYear === db.settings.academicYear
        );
        if (!alreadyHasClass) {
          existingStudent.enrollments.push({
            id: `enr-${crypto.randomUUID().slice(0, 8)}`,
            studentId: existingStudent.id,
            classId: appItem.classId,
            batchId: appItem.batchId,
            rollNumber: assignedRoll,
            academicYear: db.settings.academicYear,
            isPrimary: false,
            status: 'ACTIVE',
            enrolledAt: new Date().toISOString().slice(0, 10),
          });
        }
        appItem.status = 'Approved';
        appItem.reviewedAt = new Date().toISOString();
        appItem.approvedStudentCode = existingStudent.studentCode;
        appItem.assignedRoll = assignedRoll;
        const stuUser = db.users.find((u) => u.studentId === existingStudent!.id);
        if (stuUser) {
          pushNotification(
            stuUser.id,
            'ভর্তি আবেদন অনুমোদিত',
            `আপনার ${appItem.classId} এনরোলমেন্ট অনুমোদিত হয়েছে। রোল নম্বর: ${assignedRoll}`,
            'admission'
          );
        }
        saveDb(db);
        res.json({ application: appItem, student: existingStudent });
        return;
      }

      const seq = 100 + db.students.length + 1;
      const studentCode = `SHK-${db.settings.academicYear}-${seq}`;
      const stuId = `stu-${crypto.randomUUID().slice(0, 8)}`;
      const newStudent: Student = {
        id: stuId,
        studentCode,
        name: appItem.studentName,
        photoUrl: appItem.photoUrl,
        dateOfBirth: appItem.dateOfBirth,
        phone: normPhone,
        email: appItem.email ?? `${studentCode.toLowerCase()}@student.shikkhanir.edu.bd`,
        guardianName: appItem.guardianName,
        guardianPhone: appItem.guardianPhone,
        address: appItem.address,
        previousSchool: appItem.previousSchool,
        admissionDate: new Date().toISOString().slice(0, 10),
        isActive: true,
        enrollments: [
          {
            id: `enr-${crypto.randomUUID().slice(0, 8)}`,
            studentId: stuId,
            classId: appItem.classId,
            batchId: appItem.batchId,
            rollNumber: assignedRoll,
            academicYear: db.settings.academicYear,
            isPrimary: true,
            status: 'ACTIVE',
            enrolledAt: new Date().toISOString().slice(0, 10),
          },
        ],
      };

      db.students.unshift(newStudent);
      const userId = `usr-${stuId}`;
      db.users.push({
        id: userId,
        userCode: studentCode,
        name: newStudent.name,
        email: newStudent.email!,
        phone: newStudent.phone,
        role: 'STUDENT',
        passwordHash: hashPassword('Student@2026'),
        avatarUrl: newStudent.photoUrl,
        isActive: true,
        studentId: stuId,
      });

      const grp = db.conversations.find((c) => c.type === 'GROUP' && c.classId === appItem.classId);
      if (grp && !grp.participantIds.includes(userId)) {
        grp.participantIds.push(userId);
      }

      const cls = db.classes.find((c) => c.id === appItem.classId);
      const fee = cls?.monthlyFee ?? 1500;
      for (let m = 1; m <= 12; m++) {
        db.invoices.push({
          id: `inv-${stuId}-${m}`,
          invoiceNo: `INV-${db.settings.academicYear}-${1000 + db.invoices.length + 1}`,
          studentId: stuId,
          studentCode,
          studentName: newStudent.name,
          classId: appItem.classId,
          batchId: appItem.batchId,
          monthIndex: m,
          monthNameBn: BENGALI_MONTHS[m - 1],
          academicYear: db.settings.academicYear,
          amount: fee,
          paidAmount: 0,
          status: 'Unpaid',
          dueDate: `${db.settings.academicYear}-${String(m).padStart(2, '0')}-10`,
        });
      }

      appItem.status = 'Approved';
      appItem.reviewedAt = new Date().toISOString();
      appItem.approvedStudentCode = studentCode;
      appItem.assignedRoll = assignedRoll;
      pushNotification(
        userId,
        'শিক্ষানীর অ্যাকাউন্ট সক্রিয় হয়েছে',
        `অভিনন্দন! আপনার স্টুডেন্ট আইডি: ${studentCode}, রোল: ${assignedRoll}`,
        'admission'
      );
      addActivity(
        req.auth!.user.name,
        'ADMIN',
        'ভর্তি অনুমোদন',
        `${appItem.applicationId} -> ${studentCode} (রোল: ${assignedRoll})`
      );
      saveDb(db);
      res.json({ application: appItem, student: newStudent });
      return;
    }

    res.status(400).json({ error: 'অবৈধ রিভিউ অ্যাকশন।' });
  });

  app.post('/api/admin/teachers', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const {
      name,
      designation,
      qualification,
      subjects,
      assignedClassIds,
      phone,
      email,
      bio,
      experienceYears,
      avatarUrl,
    } = req.body ?? {};
    if (!name || !designation || !phone || !email) {
      res.status(400).json({ error: 'শিক্ষকের নাম, পদবি, মোবাইল ও ইমেইল আবশ্যক।' });
      return;
    }
    const safeAvatar =
      typeof avatarUrl === 'string' &&
      avatarUrl.length < 2_500_000 &&
      (avatarUrl.startsWith('data:image/') || avatarUrl.startsWith('/src/assets/') || avatarUrl.startsWith('https://'))
        ? avatarUrl
        : '/src/assets/images/teacher_male_science_1795498507832.jpg';
    const db = getDb();
    const tchId = `tch-${crypto.randomUUID().slice(0, 8)}`;
    const userCode = `TCH-${String(db.teachers.length + 1).padStart(2, '0')}`;
    const teacher = {
      id: tchId,
      userCode,
      name: String(name).trim(),
      designation: String(designation).trim(),
      qualification: String(qualification ?? 'স্নাতকোত্তর').trim(),
      subjects: Array.isArray(subjects)
        ? subjects
        : String(subjects ?? 'গণিত')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean),
      assignedClassIds:
        Array.isArray(assignedClassIds) && assignedClassIds.length > 0 ? assignedClassIds : ['class-8'],
      phone: normalizeBdPhone(phone),
      email: String(email).trim(),
      avatarUrl: safeAvatar,
      bio: String(bio ?? '').trim(),
      experienceYears: Number(experienceYears ?? 3),
      isActive: true,
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    db.teachers.push(teacher);
    const userId = `usr-${tchId}`;
    db.users.push({
      id: userId,
      userCode,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      role: 'TEACHER',
      passwordHash: hashPassword('Teacher@2026'),
      avatarUrl: teacher.avatarUrl,
      isActive: true,
      teacherId: tchId,
    });
    teacher.assignedClassIds.forEach((cid) => {
      const grp = db.conversations.find((c) => c.type === 'GROUP' && c.classId === cid);
      if (grp && !grp.participantIds.includes(userId)) grp.participantIds.push(userId);
    });
    addActivity(req.auth!.user.name, 'ADMIN', 'নতুন শিক্ষক যোগ', `${teacher.name} (${userCode})`);
    saveDb(db);
    res.status(201).json({ teacher });
  });

  app.patch('/api/admin/teachers/:id', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const db = getDb();
    const teacher = db.teachers.find((t) => t.id === req.params.id);
    if (!teacher) {
      res.status(404).json({ error: 'শিক্ষক পাওয়া যায়নি।' });
      return;
    }
    const {
      name,
      designation,
      qualification,
      phone,
      email,
      subjects,
      bio,
      experienceYears,
      avatarUrl,
      assignedClassIds,
      isActive,
    } = req.body ?? {};
    if (name) teacher.name = String(name).trim();
    if (designation) teacher.designation = String(designation).trim();
    if (typeof qualification === 'string') teacher.qualification = qualification.trim();
    if (phone) teacher.phone = normalizeBdPhone(phone);
    if (email) teacher.email = String(email).trim();
    if (Array.isArray(subjects)) {
      teacher.subjects = subjects.map((s: unknown) => String(s).trim()).filter(Boolean);
    } else if (typeof subjects === 'string') {
      teacher.subjects = subjects.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (typeof bio === 'string') teacher.bio = bio.trim();
    if (experienceYears !== undefined && !Number.isNaN(Number(experienceYears))) {
      teacher.experienceYears = Number(experienceYears);
    }
    if (
      typeof avatarUrl === 'string' &&
      avatarUrl.length < 2_500_000 &&
      (avatarUrl.startsWith('data:image/') || avatarUrl.startsWith('/src/assets/') || avatarUrl.startsWith('https://'))
    ) {
      teacher.avatarUrl = avatarUrl;
    }
    if (Array.isArray(assignedClassIds) && assignedClassIds.length > 0) {
      teacher.assignedClassIds = assignedClassIds;
    }
    if (typeof isActive === 'boolean') teacher.isActive = isActive;

    const usr = db.users.find((u) => u.teacherId === teacher.id);
    if (usr) {
      usr.name = teacher.name;
      usr.phone = teacher.phone;
      usr.email = teacher.email;
      usr.avatarUrl = teacher.avatarUrl;
      usr.isActive = teacher.isActive;
    }
    addActivity(req.auth!.user.name, 'ADMIN', 'শিক্ষক তথ্য হালনাগাদ', `${teacher.name} (${teacher.userCode})`);
    saveDb(db);
    res.json({ teacher });
  });

  app.patch('/api/admin/classes/:id', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const db = getDb();
    const cls = db.classes.find((c) => c.id === req.params.id);
    if (!cls) {
      res.status(404).json({ error: 'শ্রেণি পাওয়া যায়নি।' });
      return;
    }
    const { monthlyFee, scheduleSummary, description } = req.body ?? {};
    if (monthlyFee !== undefined && Number(monthlyFee) > 0) cls.monthlyFee = Number(monthlyFee);
    if (scheduleSummary) cls.scheduleSummary = String(scheduleSummary);
    if (description) cls.description = String(description);
    saveDb(db);
    res.json({ cls });
  });

  app.post('/api/admin/batches', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const { classId, name, timeSlot, room, capacity } = req.body ?? {};
    if (!classId || !name || !timeSlot || !room) {
      res.status(400).json({ error: 'ব্যাচের সকল তথ্য পূরণ করুন।' });
      return;
    }
    const db = getDb();
    const batch = {
      id: `batch-${crypto.randomUUID().slice(0, 8)}`,
      classId,
      name: String(name).trim(),
      timeSlot: String(timeSlot).trim(),
      room: String(room).trim(),
      capacity: Number(capacity ?? 40),
      academicYear: db.settings.academicYear,
    };
    db.batches.push(batch);
    saveDb(db);
    res.status(201).json({ batch });
  });

  app.post('/api/admin/subjects', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const { classId, nameBn, code, fullMarks, passMarks } = req.body ?? {};
    if (!classId || !nameBn || !code) {
      res.status(400).json({ error: 'বিষয়ের নাম, কোড এবং শ্রেণি আবশ্যক।' });
      return;
    }
    const db = getDb();
    const subject = {
      id: `sub-${crypto.randomUUID().slice(0, 8)}`,
      classId,
      nameBn: String(nameBn).trim(),
      code: String(code).trim().toUpperCase(),
      fullMarks: Number(fullMarks ?? 100),
      passMarks: Number(passMarks ?? 33),
    };
    db.subjects.push(subject);
    saveDb(db);
    res.status(201).json({ subject });
  });

  app.post('/api/admin/routines', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const { classId, batchId, day, startTime, endTime, subjectName, teacherId, room } = req.body ?? {};
    if (!classId || !batchId || !day || !startTime || !endTime || !subjectName || !teacherId || !room) {
      res.status(400).json({ error: 'রুটিনের সকল তথ্য পূরণ করুন।' });
      return;
    }
    const db = getDb();
    const teacher = db.teachers.find((t) => t.id === teacherId);
    const routine = {
      id: `rt-${crypto.randomUUID().slice(0, 8)}`,
      classId,
      batchId,
      day,
      startTime,
      endTime,
      subjectName,
      teacherId,
      teacherName: teacher?.name ?? 'নির্ধারিত শিক্ষক',
      room,
    };
    db.routines.push(routine);
    saveDb(db);
    res.status(201).json({ routine });
  });

  app.delete('/api/admin/routines/:id', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const db = getDb();
    db.routines = db.routines.filter((r) => r.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  app.post('/api/admin/payments/:id/verify', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const { action } = req.body ?? {};
    const db = getDb();
    const payment = db.payments.find((p) => p.id === req.params.id);
    if (!payment) {
      res.status(404).json({ error: 'পেমেন্ট রেকর্ড পাওয়া যায়নি।' });
      return;
    }
    const invoice = db.invoices.find((i) => i.id === payment.invoiceId);
    if (!invoice) {
      res.status(404).json({ error: 'সংশ্লিষ্ট ইনভয়েস পাওয়া যায়নি।' });
      return;
    }
    if (payment.status === 'Verified') {
      res.status(400).json({ error: 'এই পেমেন্টটি ইতিমধ্যে যাচাইকৃত।' });
      return;
    }

    if (action === 'verify') {
      payment.status = 'Verified';
      payment.verifiedAt = new Date().toISOString();
      payment.verifiedBy = req.auth!.user.name;
      invoice.paidAmount = Math.min(invoice.amount, invoice.paidAmount + payment.amount);
      invoice.status = resolveInvoiceStatus(invoice.amount, invoice.paidAmount, false);
      const stuUser = db.users.find((u) => u.studentId === payment.studentId);
      if (stuUser) {
        pushNotification(
          stuUser.id,
          'বেতন পেমেন্ট নিশ্চিত হয়েছে',
          `${invoice.monthNameBn} মাসের ৳${payment.amount} পেমেন্ট যাচাই সম্পন্ন (রসিদ: ${payment.receiptNo})।`,
          'payment'
        );
      }
      addActivity(req.auth!.user.name, 'ADMIN', 'পেমেন্ট যাচাই', `${payment.receiptNo} · ${payment.studentName}`);
    } else if (action === 'reject') {
      payment.status = 'Rejected';
      payment.verifiedAt = new Date().toISOString();
      payment.verifiedBy = req.auth!.user.name;
      const hasOtherPending = db.payments.some(
        (p) => p.invoiceId === invoice.id && p.id !== payment.id && p.status === 'Pending'
      );
      invoice.status = resolveInvoiceStatus(invoice.amount, invoice.paidAmount, hasOtherPending);
      addActivity(req.auth!.user.name, 'ADMIN', 'পেমেন্ট বাতিল', `${payment.transactionId}`);
    } else {
      res.status(400).json({ error: 'অবৈধ অ্যাকশন।' });
      return;
    }
    saveDb(db);
    res.json({ payment, invoice });
  });

  app.post('/api/admin/payments/offline', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const { invoiceId, amount, method } = req.body ?? {};
    const db = getDb();
    const invoice = db.invoices.find((i) => i.id === invoiceId);
    if (!invoice) {
      res.status(404).json({ error: 'ইনভয়েস পাওয়া যায়নি।' });
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      res.status(400).json({ error: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }
    const receiptNo = `RCP-${db.settings.academicYear}-${5000 + db.payments.length + 1}`;
    const payment = {
      id: `pay-${crypto.randomUUID().slice(0, 8)}`,
      receiptNo,
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      studentCode: invoice.studentCode,
      studentName: invoice.studentName,
      amount: amt,
      method: method ?? 'নগদ (অফিস)',
      transactionId: `OFF-${Date.now().toString().slice(-6)}`,
      status: 'Verified' as const,
      submittedAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      verifiedBy: req.auth!.user.name,
    };
    db.payments.unshift(payment);
    invoice.paidAmount = Math.min(invoice.amount, invoice.paidAmount + amt);
    invoice.status = resolveInvoiceStatus(invoice.amount, invoice.paidAmount, false);
    addActivity(req.auth!.user.name, 'ADMIN', 'অফিস ক্যাশ সংগ্রহ', `${invoice.studentName} · ৳${amt}`);
    saveDb(db);
    res.status(201).json({ payment, invoice });
  });

  app.post('/api/admin/exams', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const { title, classId, batchId, examDate, examTime, subjects } = req.body ?? {};
    if (!title || !classId || !batchId || !examDate || !examTime || !Array.isArray(subjects) || subjects.length === 0) {
      res.status(400).json({ error: 'পরীক্ষার সকল তথ্য ও অন্তত একটি বিষয় প্রদান করুন।' });
      return;
    }
    const db = getDb();
    const exam = {
      id: `ex-${crypto.randomUUID().slice(0, 8)}`,
      title: String(title).trim(),
      classId,
      batchId,
      academicYear: db.settings.academicYear,
      examDate: String(examDate),
      examTime: String(examTime),
      subjects: subjects.map((s: { subjectName: string; fullMarks: number; passMarks: number }) => ({
        subjectName: String(s.subjectName),
        fullMarks: Number(s.fullMarks || 100),
        passMarks: Number(s.passMarks || 33),
      })),
      isPublished: false,
    };
    db.exams.unshift(exam);
    db.students
      .filter((s) => s.enrollments.some((e) => e.batchId === batchId))
      .forEach((s) => {
        const u = db.users.find((x) => x.studentId === s.id);
        if (u) pushNotification(u.id, `আসন্ন পরীক্ষা: ${exam.title}`, `তারিখ: ${exam.examDate} · ${exam.examTime}`, 'exam');
      });
    saveDb(db);
    res.status(201).json({ exam });
  });

  app.post('/api/admin/exams/:id/publish', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const db = getDb();
    const exam = db.exams.find((e) => e.id === req.params.id);
    if (!exam) {
      res.status(404).json({ error: 'পরীক্ষা পাওয়া যায়নি।' });
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    exam.isPublished = true;
    db.results.forEach((r) => {
      if (r.examId === exam.id) {
        r.isPublished = true;
        r.publishedAt = now;
      }
    });
    db.results = assignMeritRanks(db.results);
    db.results
      .filter((r) => r.examId === exam.id)
      .forEach((r) => {
        const u = db.users.find((x) => x.studentId === r.studentId);
        if (u) {
          pushNotification(
            u.id,
            `ফলাফল প্রকাশিত: ${exam.title}`,
            `আপনার প্রাপ্ত GPA: ${r.gpa} (${r.grade}), মেধাক্রম: ${r.classRank}`,
            'result'
          );
        }
      });
    addActivity(req.auth!.user.name, 'ADMIN', 'ফলাফল প্রকাশ', exam.title);
    saveDb(db);
    res.json({ exam, results: db.results });
  });

  app.post('/api/admin/notices', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const { title, description, type, targetClassId, isPinned, attachmentName } = req.body ?? {};
    if (!title || !description || !type) {
      res.status(400).json({ error: 'নোটিশের শিরোনাম, বিবরণ ও ধরন আবশ্যক।' });
      return;
    }
    const db = getDb();
    const notice = {
      id: `not-${crypto.randomUUID().slice(0, 8)}`,
      title: String(title).trim(),
      description: String(description).trim(),
      type,
      date: new Date().toISOString().slice(0, 10),
      targetClassId: targetClassId || 'ALL',
      targetBatchId: 'ALL',
      isPinned: Boolean(isPinned),
      attachmentName: attachmentName ? String(attachmentName) : undefined,
      publishedBy: req.auth!.user.name,
    };
    db.notices.unshift(notice);
    db.users
      .filter((u) => u.isActive && u.id !== req.auth!.user.id)
      .forEach((u) => {
        pushNotification(u.id, `নতুন নোটিশ: ${notice.title}`, notice.description.slice(0, 90), 'notice');
      });
    addActivity(req.auth!.user.name, 'ADMIN', 'নোটিশ প্রকাশ', notice.title);
    saveDb(db);
    res.status(201).json({ notice });
  });

  app.delete('/api/admin/notices/:id', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const db = getDb();
    db.notices = db.notices.filter((n) => n.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  app.patch('/api/admin/settings', requireAuth, requireRoles(['ADMIN']), (req, res) => {
    const db = getDb();
    const allowed = ['tagline', 'heroTitle', 'heroSubtitle', 'address', 'phone', 'email', 'officeHours', 'admissionOpen'] as const;
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        (db.settings as unknown as Record<string, unknown>)[key] = req.body[key];
      }
    }
    if (typeof req.body?.heroBannerUrl === 'string') {
      const candidate = req.body.heroBannerUrl.trim();
      const isValidBanner =
        candidate === '' ||
        candidate.startsWith('data:image/') ||
        candidate.startsWith('https://') ||
        candidate.startsWith('http://') ||
        candidate.startsWith('/');
      if (!isValidBanner) {
        res.status(400).json({ error: 'সঠিক ছবির ফাইল বা নিরাপদ URL দিন।' });
        return;
      }
      db.settings.heroBannerUrl = candidate;
    }
    if (req.body?.achievementStats) {
      db.settings.achievementStats = { ...db.settings.achievementStats, ...req.body.achievementStats };
    }
    addActivity(req.auth!.user.name, 'ADMIN', 'ওয়েবসাইট সেটিংস হালনাগাদ', 'হোমপেজ ব্যানার ও প্রতিষ্ঠানের তথ্য সংশোধন');
    saveDb(db);
    res.json({ settings: db.settings });
  });

  const httpServer = http.createServer(app);

  // ==========================================================================
  // VITE / STATIC SPA SERVING
  // ==========================================================================
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SHIKKHANIR server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
