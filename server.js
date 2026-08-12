'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { generateLab } = require('./lib/generator');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// ── Admin password ────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[WARNING] No ADMIN_PASSWORD in .env. Ephemeral:', ADMIN_PASSWORD);
}

// ── Data store ────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadStudents() {
  if (!fs.existsSync(STUDENTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8')); }
  catch { return []; }
}
function saveStudents(list) {
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// ── Download tokens (one-time, expires after 60s) ─────────
const downloadTokens = new Map(); // token -> { zipBuffer, filename, expires }

function createDownloadToken(zipBuffer, filename) {
  const token = crypto.randomBytes(24).toString('hex');
  downloadTokens.set(token, {
    zipBuffer,
    filename,
    expires: Date.now() + 60 * 1000, // 60 seconds
  });
  // Auto-cleanup
  setTimeout(function () { downloadTokens.delete(token); }, 65 * 1000);
  return token;
}

// ── Security middleware ───────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  xFrameOptions: { action: 'deny' },
}));

// Block access to sensitive paths BEFORE static serving
app.use(function (req, res, next) {
  const lower = req.path.toLowerCase();
  // Block direct access to data, lib, private, .env, package.json, node_modules
  if (lower.startsWith('/data') ||
      lower.startsWith('/lib') ||
      lower.startsWith('/private') ||
      lower.startsWith('/assets') ||
      lower.startsWith('/node_modules') ||
      lower.startsWith('/.env') ||
      lower.startsWith('/.git') ||
      lower === '/package.json' ||
      lower === '/package-lock.json' ||
      lower === '/server.js') {
    return res.status(404).send('Not found');
  }
  next();
});

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));
const genLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Wait a moment.' } });

app.use(express.json({ limit: '2kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Validation ────────────────────────────────────────────
function validateName(name) {
  if (!name || typeof name !== 'string') return 'Name is required.';
  var t = name.trim();
  if (t.length < 5 || t.length > 100) return 'Name must be 5-100 characters.';
  if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(t)) return 'Name must contain only letters and spaces.';
  var parts = t.split(/\s+/).filter(function (p) { return p.length > 0; });
  if (parts.length < 3) return 'Full name must have at least 3 parts.';
  return null;
}
function validateId(id) {
  if (!id || typeof id !== 'string') return 'Student ID is required.';
  if (!/^\d{4,12}$/.test(id.trim())) return 'Student ID must be 4-12 digits.';
  return null;
}

// ── Admin session tokens ──────────────────────────────────
const adminSessions = new Set();

// ── Routes ────────────────────────────────────────────────

// Student form
app.get('/', function (_req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin page — serves login form
app.get('/admin', function (_req, res) {
  res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// Admin JS
app.get('/admin/app.js', function (_req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'private', 'admin.js'));
});

// Catch-all: block any other /admin/* paths
app.get('/admin/*', function (_req, res) {
  res.status(404).send('Not found');
});

// ── Generate lab (Step 1: validate, generate, return download token) ──
app.post('/api/generate', genLimiter, async function (req, res) {
  try {
    var body = req.body || {};
    var name = body.name;
    var studentId = body.studentId;

    var nameErr = validateName(name);
    if (nameErr) return res.status(400).json({ error: nameErr });
    var idErr = validateId(studentId);
    if (idErr) return res.status(400).json({ error: idErr });

    var cleanName = name.trim().replace(/\s+/g, ' ');
    var cleanId = studentId.trim();

    var students = loadStudents();
    var normName = cleanName.toLowerCase();
    var existing = students.find(function (s) {
      return s.studentId === cleanId || s.studentName.toLowerCase() === normName;
    });

    if (existing) {
      return res.status(409).json({
        error: 'Registration declined: This student record has already been registered. Each student is permitted to generate their assignment only once. Contact your instructor if you require assistance.'
      });
    }

    var result = generateLab(cleanName, cleanId);
    var zipData = await result.zipBuffer;
    var answerKey = result.answerKey;

    // Save student record
    students.push({
      studentName: cleanName,
      studentId: cleanId,
      generatedAt: new Date().toISOString(),
      finalToken: answerKey.finalToken,
      opCode: answerKey.opCode,
      noiseInterval: answerKey.noiseInterval,
      cases: answerKey.cases,
      stegoMessage: answerKey.stegoMessage,
      cipherOrder: answerKey.cipherOrder,
    });
    saveStudents(students);

    // Create one-time download token
    var safeId = cleanId.replace(/[^a-zA-Z0-9]/g, '');
    var filename = 'MIDTERM_LAB_' + safeId + '.zip';
    var dlToken = createDownloadToken(zipData, filename);

    res.json({ token: dlToken });
  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: 'Internal error. Please try again.' });
  }
});

// ── Download ZIP (Step 2: one-time token download) ────────
app.get('/api/download/:token', function (req, res) {
  var token = req.params.token;
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{48}$/.test(token)) {
    return res.status(400).send('Invalid token.');
  }

  var entry = downloadTokens.get(token);
  if (!entry) {
    return res.status(410).send('Download link expired or already used. Please generate again.');
  }

  if (Date.now() > entry.expires) {
    downloadTokens.delete(token);
    return res.status(410).send('Download link expired.');
  }

  // Delete token — one-time use
  downloadTokens.delete(token);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="' + entry.filename + '"');
  res.setHeader('Content-Length', entry.zipBuffer.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.send(entry.zipBuffer);
});

// ── Admin API ─────────────────────────────────────────────
app.post('/api/admin/login', function (req, res) {
  var password = (req.body || {}).password;
  if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Password required.' });
  var pwBuf = Buffer.from(password);
  var adBuf = Buffer.from(ADMIN_PASSWORD);
  if (pwBuf.length !== adBuf.length || !crypto.timingSafeEqual(pwBuf, adBuf)) {
    return res.status(401).json({ error: 'Invalid password.' });
  }
  var tok = crypto.randomBytes(32).toString('hex');
  adminSessions.add(tok);
  setTimeout(function () { adminSessions.delete(tok); }, 2 * 60 * 60 * 1000);
  res.json({ token: tok });
});

function requireAdmin(req, res, next) {
  var h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized.' });
  if (!adminSessions.has(h.slice(7))) return res.status(401).json({ error: 'Session expired.' });
  next();
}

app.get('/api/admin/students', requireAdmin, function (_req, res) {
  res.json({ students: loadStudents() });
});

app.get('/api/admin/export', requireAdmin, function (_req, res) {
  var students = loadStudents();
  var csv = 'Name,ID,Date,Token,Cipher Order\n';
  for (var i = 0; i < students.length; i++) {
    var s = students[i];
    var escaped = '"' + s.studentName.replace(/"/g, '""') + '"';
    var order = (s.cipherOrder || []).join(' > ');
    csv += escaped + ',' + s.studentId + ',' + s.generatedAt + ',' + s.finalToken + ',"' + order + '"\n';
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(csv);
});

app.post('/api/admin/clear', requireAdmin, function (_req, res) {
  saveStudents([]);
  res.json({ success: true, message: 'All student records have been reset.' });
});

// ── Catch-all for undefined routes ────────────────────────
app.use(function (_req, res) {
  res.status(404).send('Not found');
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', function () {
  console.log('\n  Midterm Lab Generator');
  console.log('  Running on port ' + PORT);
});
