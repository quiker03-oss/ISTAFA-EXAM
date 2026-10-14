import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
// @ts-ignore
import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { createServer as createViteServer } from 'vite';
import {
  extractDocxBlocks,
  parseIndonesianExamQuestions,
  parseWithGeminiAssistant,
  extractOcrFromImage,
  validateQuestionSet,
} from './server/documentParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'istafa-exam-secure-jwt-secret-key-2026';
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'istafa_exam_db.json');

// Ensure data and uploads directory exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Setup Multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Database State Structure
interface DatabaseSchema {
  schools: any[];
  users: any[];
  students: any[];
  questions: any[];
  exams: any[];
  sessions: any[];
  violations: any[];
  beritaAcara: any[];
  settings: any[];
  loginAttempts: Record<string, { count: number; lockedUntil?: number }>;
}

function getInitialDatabase(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);
  const superAdminPasswordHash = bcrypt.hashSync('superadmin123', salt);

  const defaultSchoolId = 'sch_sman1_teladan';
  const defaultSchool = {
    id: defaultSchoolId,
    npsn: '20109988',
    name: 'SMA NEGERI 1 TELADAN ISTAFA',
    educationLevel: 'SMA',
    address: 'Jl. Pendidikan Karakter No. 45',
    subdistrict: 'Kebayoran Baru',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postalCode: '12160',
    principalName: 'Dr. H. Ahmad Dahlan, M.Pd.',
    principalNip: '19750812 199903 1 002',
    logoUrl: '',
    phone: '(021) 7890123',
    email: 'info@sman1teladan.sch.id',
    website: 'https://sman1teladan.sch.id',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    letterheadText: 'PEMERINTAH PROVINSI DKI JAKARTA\nDINAS PENDIDIKAN\nSEKOLAH MENENGAH ATAS NEGERI 1 TELADAN',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const pendingSchool = {
    id: 'sch_smk_teknologi',
    npsn: '20105544',
    name: 'SMK TEKNOLOGI NUSANTARA',
    educationLevel: 'SMK',
    address: 'Jl. Industri Mandiri Kav. 12',
    subdistrict: 'Cikarang',
    city: 'Bekasi',
    province: 'Jawa Barat',
    postalCode: '17530',
    principalName: 'Ir. Hendra Wijaya, M.T.',
    principalNip: '19800415 200501 1 008',
    logoUrl: '',
    phone: '(021) 8901234',
    email: 'kontak@smkteknusa.sch.id',
    website: 'https://smkteknusa.sch.id',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const users = [
    {
      id: 'usr_superadmin',
      username: 'superadmin',
      email: 'superadmin@istafaexam.id',
      fullName: 'Super Administrator ISTAFA',
      role: 'super_admin',
      passwordHash: superAdminPasswordHash,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr_admin_sman1',
      username: 'adminsman1',
      email: 'admin@sman1teladan.sch.id',
      fullName: 'M. Rizky Pratama, S.Kom',
      role: 'school_admin',
      schoolId: defaultSchoolId,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
    },
  ];

  const students = [
    {
      id: 'std_1001',
      schoolId: defaultSchoolId,
      nis: '240101',
      nisn: '0071234561',
      fullName: 'Aditya Pratama Putra',
      gender: 'L',
      gradeClass: 'X IPA 1',
      rombel: 'Rombel A',
      academicYear: '2024/2025',
      participantCode: 'IST-240101-01',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'std_1002',
      schoolId: defaultSchoolId,
      nis: '240102',
      nisn: '0071234562',
      fullName: 'Annisa Fitriani Rahma',
      gender: 'P',
      gradeClass: 'X IPA 1',
      rombel: 'Rombel A',
      academicYear: '2024/2025',
      participantCode: 'IST-240102-02',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'std_1003',
      schoolId: defaultSchoolId,
      nis: '240103',
      nisn: '0071234563',
      fullName: 'Bagas Wahyu Nugroho',
      gender: 'L',
      gradeClass: 'X IPA 1',
      rombel: 'Rombel A',
      academicYear: '2024/2025',
      participantCode: 'IST-240103-03',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'std_1004',
      schoolId: defaultSchoolId,
      nis: '240104',
      nisn: '0071234564',
      fullName: 'Cantika Dewi Larasati',
      gender: 'P',
      gradeClass: 'X IPA 1',
      rombel: 'Rombel A',
      academicYear: '2024/2025',
      participantCode: 'IST-240104-04',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'std_1005',
      schoolId: defaultSchoolId,
      nis: '240105',
      nisn: '0071234565',
      fullName: 'Dimas Aditya Wicaksono',
      gender: 'L',
      gradeClass: 'X IPA 2',
      rombel: 'Rombel B',
      academicYear: '2024/2025',
      participantCode: 'IST-240105-05',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const initialQuestions = [
    {
      id: 'q_mat_1',
      schoolId: defaultSchoolId,
      subject: 'Matematika Peminatan',
      gradeClass: 'X IPA 1',
      number: 1,
      type: 'multiple_choice',
      text: 'Jika f(x) = 2x² - 4x + 5, tentukan koordinat titik puncak parabola fungsi kuadrat tersebut!',
      options: [
        { key: 'A', text: '(1, 3)' },
        { key: 'B', text: '(2, 5)' },
        { key: 'C', text: '(-1, 3)' },
        { key: 'D', text: '(1, -3)' },
        { key: 'E', text: '(-2, 5)' },
      ],
      correctAnswer: 'A',
      scoreWeight: 2,
      explanation: 'Sumbu simetri x = -b/(2a) = -(-4)/(2*2) = 1. f(1) = 2(1) - 4(1) + 5 = 3. Jadi titik puncak (1, 3).',
      extractionStatus: 'valid',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q_mat_2',
      schoolId: defaultSchoolId,
      subject: 'Matematika Peminatan',
      gradeClass: 'X IPA 1',
      number: 2,
      type: 'multiple_choice',
      text: 'Nilai dari sin 30° + cos 60° - tan 45° adalah...',
      options: [
        { key: 'A', text: '0' },
        { key: 'B', text: '1/2' },
        { key: 'C', text: '1' },
        { key: 'D', text: '√3' },
        { key: 'E', text: '2' },
      ],
      correctAnswer: 'A',
      scoreWeight: 2,
      explanation: 'sin 30° = 1/2, cos 60° = 1/2, tan 45° = 1. Maka (1/2 + 1/2 - 1) = 0.',
      extractionStatus: 'valid',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q_mat_3',
      schoolId: defaultSchoolId,
      subject: 'Matematika Peminatan',
      gradeClass: 'X IPA 1',
      number: 3,
      type: 'multiple_choice',
      text: 'Sebuah segitiga ABC siku-siku di B dengan panjang sisi AB = 6 cm dan BC = 8 cm. Panjang sisi miring AC adalah...',
      options: [
        { key: 'A', text: '10 cm' },
        { key: 'B', text: '12 cm' },
        { key: 'C', text: '14 cm' },
        { key: 'D', text: '9 cm' },
        { key: 'E', text: '16 cm' },
      ],
      correctAnswer: 'A',
      scoreWeight: 2,
      explanation: 'AC = √(AB² + BC²) = √(36 + 64) = √100 = 10 cm.',
      extractionStatus: 'valid',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q_mat_4',
      schoolId: defaultSchoolId,
      subject: 'Matematika Peminatan',
      gradeClass: 'X IPA 1',
      number: 4,
      type: 'multiple_choice',
      text: 'Himpunan penyelesaian dari pertidaksamaan 2x - 3 < 7 adalah...',
      options: [
        { key: 'A', text: 'x < 5' },
        { key: 'B', text: 'x > 5' },
        { key: 'C', text: 'x < 2' },
        { key: 'D', text: 'x > 2' },
        { key: 'E', text: 'x ≤ 5' },
      ],
      correctAnswer: 'A',
      scoreWeight: 2,
      explanation: '2x < 10 => x < 5.',
      extractionStatus: 'valid',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q_mat_5',
      schoolId: defaultSchoolId,
      subject: 'Matematika Peminatan',
      gradeClass: 'X IPA 1',
      number: 5,
      type: 'essay',
      text: 'Jelaskan pengertian fungsi bijektif dan berikan satu contoh fungsi nyata yang bersifat bijektif beserta penjelasannya!',
      options: [],
      correctAnswer: 'Fungsi bijektif adalah fungsi yang injektif (satu-satu) dan surjektif (pada). Contoh: f(x) = 2x + 1.',
      scoreWeight: 5,
      explanation: 'Kriteria penilaian: Pengertian tepat (2 poin), Contoh tepat (2 poin), Penjelasan domain-kodomain (1 poin).',
      extractionStatus: 'valid',
      createdAt: new Date().toISOString(),
    },
  ];

  const now = new Date();
  const examStartTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const examEndTime = new Date(now.getTime() + 180 * 60 * 1000).toISOString();

  const sampleExam = {
    id: 'ex_pts_mat_x',
    schoolId: defaultSchoolId,
    title: 'Penilaian Tengah Semester (PTS) Matematika Peminatan',
    subject: 'Matematika Peminatan',
    gradeClass: 'X IPA 1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    examCode: 'MAT-PTS10',
    startTime: examStartTime,
    endTime: examEndTime,
    durationMinutes: 90,
    lateToleranceMinutes: 30,
    shuffleQuestions: true,
    shuffleOptions: true,
    kkm: 75,
    maxScore: 100,
    showScoreToStudent: true,
    showDiscussionToStudent: false,
    status: 'active',
    questions: initialQuestions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleSettings = {
    schoolId: defaultSchoolId,
    antiCheatSensitivity: 'medium',
    maxViolationsBeforeWarning: 1,
    maxViolationsBeforeLockout: 5,
    enableSoundAlerts: true,
    enableTtsAlerts: true,
    allowResumeOnDisconnect: true,
    requireFullscreen: true,
    watermarkOnExamScreen: true,
  };

  return {
    schools: [defaultSchool, pendingSchool],
    users,
    students,
    questions: initialQuestions,
    exams: [sampleExam],
    sessions: [],
    violations: [],
    beritaAcara: [],
    settings: [sampleSettings],
    loginAttempts: {},
  };
}

// Read database
function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDatabase();
      writeDb(initial);
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB file, returning initial database:', err);
    return getInitialDatabase();
  }
}

// Write database atomically
function writeDb(data: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

// Authentication & Tenant Middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    schoolId?: string;
  };
  schoolId?: string;
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token autentikasi tidak ditemukan.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token kedaluwarsa atau tidak valid.' });
    }
    req.user = user;
    if (user.schoolId) {
      req.schoolId = user.schoolId;
    }
    next();
  });
}

function requireSchoolAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'school_admin' || !req.user.schoolId) {
    return res.status(403).json({ error: 'Akses ditolak: Hanya untuk Admin Sekolah.' });
  }
  // Verify school is active
  const db = readDb();
  const school = db.schools.find((s) => s.id === req.user?.schoolId);
  if (!school || school.status !== 'active') {
    return res.status(403).json({ error: 'Akun sekolah sedang tidak aktif atau belum disetujui Super Admin.' });
  }
  req.schoolId = req.user.schoolId;
  next();
}

function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Akses ditolak: Memerlukan hak Super Admin ISTAFA.' });
  }
  next();
}

// ==========================================
// Document Parser Helper for DOCX, PDF & OCR
// ==========================================

interface ParsedQuestion {
  number: number;
  type: 'multiple_choice' | 'essay';
  text: string;
  options: { key: 'A' | 'B' | 'C' | 'D' | 'E'; text: string; imageUrl?: string }[];
  correctAnswer: string;
  images: string[];
  tables: string[];
  scoreWeight: number;
  explanation: string;
  sourcePage?: number;
  extractionStatus: 'valid' | 'needs_review' | 'warning';
}

async function extractQuestionsFromDocx(filePath: string): Promise<{ questions: ParsedQuestion[]; totalExtracted: number; imagesCount: number }> {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  // 1. Extract embedded images from word/media/
  const extractedImages: { name: string; url: string }[] = [];
  const mediaFolder = zip.folder('word/media');
  if (mediaFolder) {
    for (const [filename, fileEntry] of Object.entries(mediaFolder.files)) {
      if (!fileEntry.dir) {
        const imageBuffer = await fileEntry.async('nodebuffer');
        const ext = path.extname(filename) || '.png';
        const uniqueName = `extracted-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        const targetPath = path.join(UPLOADS_DIR, uniqueName);
        fs.writeFileSync(targetPath, imageBuffer);
        extractedImages.push({
          name: filename,
          url: `/uploads/${uniqueName}`,
        });
      }
    }
  }

  // 2. Extract HTML & text with mammoth
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value;

  // Split lines and parse questions
  const lines = rawText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  const parsedQuestions: ParsedQuestion[] = [];
  let currentQ: ParsedQuestion | null = null;
  let qNumber = 1;

  // Regex patterns
  const qStartRegex = /^(\d+)[\.\)]\s*(.*)/; // e.g. "1. ..." or "1) ..."
  const optRegex = /^([A-Ea-e])[\.\)]\s*(.*)/; // e.g. "A. ..." or "a) ..."
  const keyRegex = /^(?:kunci|kunci jawaban|jawaban|answer|key)\s*[:=]\s*([A-Ea-e])/i;

  for (const line of lines) {
    // Check if line is answer key for current question
    const keyMatch = line.match(keyRegex);
    if (keyMatch && currentQ) {
      currentQ.correctAnswer = keyMatch[1].toUpperCase();
      continue;
    }

    // Check if new question
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      if (currentQ) {
        // Validate prior question before pushing
        if (currentQ.type === 'multiple_choice' && currentQ.options.length === 0) {
          currentQ.type = 'essay';
        }
        if (currentQ.options.length > 0 && !currentQ.correctAnswer) {
          currentQ.correctAnswer = currentQ.options[0].key; // default fallback if missing
          currentQ.extractionStatus = 'needs_review';
        }
        parsedQuestions.push(currentQ);
      }

      const num = parseInt(qMatch[1], 10);
      const text = qMatch[2];
      currentQ = {
        number: !isNaN(num) ? num : qNumber++,
        type: 'multiple_choice',
        text: text,
        options: [],
        correctAnswer: '',
        images: [],
        tables: [],
        scoreWeight: 2,
        explanation: '',
        extractionStatus: 'valid',
      };
      continue;
    }

    // Check if option
    const optMatch = line.match(optRegex);
    if (optMatch && currentQ) {
      const key = optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
      const text = optMatch[2];
      currentQ.options.push({ key, text });
      continue;
    }

    // Otherwise append to current question text or options
    if (currentQ) {
      if (currentQ.options.length > 0) {
        // Append to last option
        currentQ.options[currentQ.options.length - 1].text += ` ${line}`;
      } else {
        currentQ.text += ` ${line}`;
      }
    }
  }

  if (currentQ) {
    if (currentQ.type === 'multiple_choice' && currentQ.options.length === 0) {
      currentQ.type = 'essay';
    }
    if (currentQ.options.length > 0 && !currentQ.correctAnswer) {
      currentQ.correctAnswer = currentQ.options[0].key;
      currentQ.extractionStatus = 'needs_review';
    }
    parsedQuestions.push(currentQ);
  }

  // Associate extracted images to questions if available
  if (extractedImages.length > 0 && parsedQuestions.length > 0) {
    extractedImages.forEach((img, idx) => {
      const qIdx = idx % parsedQuestions.length;
      parsedQuestions[qIdx].images.push(img.url);
    });
  }

  return {
    questions: parsedQuestions,
    totalExtracted: parsedQuestions.length,
    imagesCount: extractedImages.length,
  };
}

async function extractQuestionsFromPdf(filePath: string): Promise<{ questions: ParsedQuestion[]; totalExtracted: number; imagesCount: number }> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  const rawText = data.text;

  const lines = rawText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  const parsedQuestions: ParsedQuestion[] = [];
  let currentQ: ParsedQuestion | null = null;
  let qNumber = 1;

  const qStartRegex = /^(\d+)[\.\)]\s*(.*)/;
  const optRegex = /^([A-Ea-e])[\.\)]\s*(.*)/;
  const keyRegex = /^(?:kunci|kunci jawaban|jawaban|answer|key)\s*[:=]\s*([A-Ea-e])/i;

  for (const line of lines) {
    const keyMatch = line.match(keyRegex);
    if (keyMatch && currentQ) {
      currentQ.correctAnswer = keyMatch[1].toUpperCase();
      continue;
    }

    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      if (currentQ) {
        if (currentQ.type === 'multiple_choice' && currentQ.options.length === 0) {
          currentQ.type = 'essay';
        }
        if (currentQ.options.length > 0 && !currentQ.correctAnswer) {
          currentQ.correctAnswer = currentQ.options[0].key;
          currentQ.extractionStatus = 'needs_review';
        }
        parsedQuestions.push(currentQ);
      }

      const num = parseInt(qMatch[1], 10);
      currentQ = {
        number: !isNaN(num) ? num : qNumber++,
        type: 'multiple_choice',
        text: qMatch[2],
        options: [],
        correctAnswer: '',
        images: [],
        tables: [],
        scoreWeight: 2,
        explanation: '',
        sourcePage: data.numpages > 1 ? 1 : undefined,
        extractionStatus: 'valid',
      };
      continue;
    }

    const optMatch = line.match(optRegex);
    if (optMatch && currentQ) {
      const key = optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
      currentQ.options.push({ key, text: optMatch[2] });
      continue;
    }

    if (currentQ) {
      if (currentQ.options.length > 0) {
        currentQ.options[currentQ.options.length - 1].text += ` ${line}`;
      } else {
        currentQ.text += ` ${line}`;
      }
    }
  }

  if (currentQ) {
    if (currentQ.type === 'multiple_choice' && currentQ.options.length === 0) {
      currentQ.type = 'essay';
    }
    if (currentQ.options.length > 0 && !currentQ.correctAnswer) {
      currentQ.correctAnswer = currentQ.options[0].key;
      currentQ.extractionStatus = 'needs_review';
    }
    parsedQuestions.push(currentQ);
  }

  return {
    questions: parsedQuestions,
    totalExtracted: parsedQuestions.length,
    imagesCount: 0,
  };
}

// Start Server Setup
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve static uploads
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  // Admin Sekolah Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const db = readDb();
    const attempts = db.loginAttempts[username] || { count: 0 };
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const waitSeconds = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        error: `Terlalu banyak percobaan gagal. Akun dikunci sementara. Silakan coba lagi dalam ${waitSeconds} detik.`,
      });
    }

    const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.role === 'school_admin');
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      attempts.count = (attempts.count || 0) + 1;
      if (attempts.count >= 5) {
        attempts.lockedUntil = Date.now() + 60 * 1000; // lock for 1 minute
      }
      db.loginAttempts[username] = attempts;
      writeDb(db);
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    // Check school status
    const school = db.schools.find((s) => s.id === user.schoolId);
    if (!school) {
      return res.status(403).json({ error: 'Sekolah terhubung tidak ditemukan.' });
    }
    if (school.status === 'pending_approval') {
      return res.status(403).json({ error: 'Pendaftaran sekolah Anda masih menunggu persetujuan Super Admin ISTAFA.' });
    }
    if (school.status === 'suspended') {
      return res.status(403).json({ error: 'Akun sekolah sedang ditangguhkan. Hubungi Super Admin ISTAFA.' });
    }

    // Reset attempts on successful login
    delete db.loginAttempts[username];
    user.lastLogin = new Date().toISOString();
    writeDb(db);

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
      school,
    });
  });

  // Super Admin ISTAFA Login (Discreet pathway)
  app.post('/api/auth/super-login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const db = readDb();
    const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.role === 'super_admin');
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Kredensial Super Admin tidak sah.' });
    }

    user.lastLogin = new Date().toISOString();
    writeDb(db);

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  });

  // New School Registration
  app.post('/api/auth/register-school', (req, res) => {
    const {
      name,
      npsn,
      educationLevel,
      address,
      subdistrict,
      city,
      province,
      principalName,
      principalNip,
      phone,
      email,
      academicYear,
      semester,
      adminUsername,
      adminPassword,
      adminFullName,
    } = req.body;

    if (!name || !npsn || !adminUsername || !adminPassword || !email) {
      return res.status(400).json({ error: 'Mohon lengkapi formulir pendaftaran sekolah.' });
    }

    const db = readDb();

    // Check duplicate NPSN
    if (db.schools.some((s) => s.npsn === npsn)) {
      return res.status(400).json({ error: `NPSN ${npsn} sudah terdaftar di sistem ISTAFA EXAM.` });
    }

    // Check duplicate username
    if (db.users.some((u) => u.username.toLowerCase() === adminUsername.toLowerCase())) {
      return res.status(400).json({ error: `Username ${adminUsername} sudah digunakan.` });
    }

    const newSchoolId = `sch_${Date.now()}`;
    const newSchool = {
      id: newSchoolId,
      npsn,
      name,
      educationLevel: educationLevel || 'SMA',
      address: address || '',
      subdistrict: subdistrict || '',
      city: city || '',
      province: province || '',
      postalCode: '',
      principalName: principalName || '',
      principalNip: principalNip || '',
      phone: phone || '',
      email,
      website: '',
      academicYear: academicYear || '2024/2025',
      semester: semester || 'Ganjil',
      letterheadText: `DINAS PENDIDIKAN\n${name.toUpperCase()}`,
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(adminPassword, salt);
    const newAdminUser = {
      id: `usr_${Date.now()}`,
      username: adminUsername,
      email,
      fullName: adminFullName || `Admin ${name}`,
      role: 'school_admin',
      schoolId: newSchoolId,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    const defaultSetting = {
      schoolId: newSchoolId,
      antiCheatSensitivity: 'medium',
      maxViolationsBeforeWarning: 1,
      maxViolationsBeforeLockout: 5,
      enableSoundAlerts: true,
      enableTtsAlerts: true,
      allowResumeOnDisconnect: true,
      requireFullscreen: true,
      watermarkOnExamScreen: true,
    };

    db.schools.push(newSchool);
    db.users.push(newAdminUser);
    db.settings.push(defaultSetting);
    writeDb(db);

    res.json({
      success: true,
      message: 'Pendaftaran sekolah berhasil diajukan. Akun akan aktif setelah ditinjau dan disetujui Super Admin ISTAFA.',
    });
  });

  // Verify Current User Session
  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.user?.id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    let school = null;
    if (user.schoolId) {
      school = db.schools.find((s) => s.id === user.schoolId);
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
      school,
    });
  });

  // ==========================================
  // SUPER ADMIN ROUTES
  // ==========================================

  // List all schools
  app.get('/api/super/schools', authenticateToken, requireSuperAdmin, (_req, res) => {
    const db = readDb();
    const schoolsWithMetrics = db.schools.map((school) => {
      const studentCount = db.students.filter((s) => s.schoolId === school.id).length;
      const examCount = db.exams.filter((e) => e.schoolId === school.id).length;
      const admin = db.users.find((u) => u.schoolId === school.id);
      return {
        ...school,
        studentCount,
        examCount,
        adminUsername: admin?.username || '-',
      };
    });
    res.json(schoolsWithMetrics);
  });

  // Approve school
  app.post('/api/super/schools/:id/approve', authenticateToken, requireSuperAdmin, (req, res) => {
    const db = readDb();
    const school = db.schools.find((s) => s.id === req.params.id);
    if (!school) return res.status(404).json({ error: 'Sekolah tidak ditemukan.' });

    school.status = 'active';
    school.updatedAt = new Date().toISOString();
    writeDb(db);

    res.json({ success: true, message: `Sekolah ${school.name} berhasil diaktivasi.` });
  });

  // Update school status (active / suspended)
  app.post('/api/super/schools/:id/status', authenticateToken, requireSuperAdmin, (req, res) => {
    const { status } = req.body;
    const db = readDb();
    const school = db.schools.find((s) => s.id === req.params.id);
    if (!school) return res.status(404).json({ error: 'Sekolah tidak ditemukan.' });

    school.status = status;
    school.updatedAt = new Date().toISOString();
    writeDb(db);

    res.json({ success: true, message: `Status sekolah diperbarui menjadi ${status}.` });
  });

  // Delete School (Super Admin)
  app.delete('/api/super/schools/:id', authenticateToken, requireSuperAdmin, (req, res) => {
    const schoolId = req.params.id;
    const db = readDb();
    const exists = db.schools.some((s) => s.id === schoolId);
    if (!exists) return res.status(404).json({ error: 'Sekolah tidak ditemukan.' });

    // Clean up school and its associated data
    db.schools = db.schools.filter((s) => s.id !== schoolId);
    db.students = db.students.filter((s) => s.schoolId !== schoolId);
    db.exams = db.exams.filter((e) => e.schoolId !== schoolId);
    db.questions = db.questions.filter((q) => q.schoolId !== schoolId);
    db.sessions = db.sessions.filter((s) => s.schoolId !== schoolId);
    db.violations = (db.violations || []).filter((v) => v.schoolId !== schoolId);

    writeDb(db);
    res.json({ success: true, message: 'Sekolah dan seluruh datanya berhasil dihapus.' });
  });

  // Super Admin Stats
  app.get('/api/super/stats', authenticateToken, requireSuperAdmin, (_req, res) => {
    const db = readDb();
    const totalSchools = db.schools.length;
    const activeSchools = db.schools.filter((s) => s.status === 'active').length;
    const pendingSchools = db.schools.filter((s) => s.status === 'pending_approval').length;
    const totalStudents = db.students.length;
    const totalExams = db.exams.length;
    const totalSessions = db.sessions.length;

    res.json({
      totalSchools,
      activeSchools,
      pendingSchools,
      totalStudents,
      totalExams,
      totalSessions,
    });
  });

  // ==========================================
  // SCHOOL ADMIN: PROFILE & SETTINGS
  // ==========================================

  // Get School Profile
  app.get('/api/school/profile', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const school = db.schools.find((s) => s.id === req.schoolId);
    if (!school) return res.status(404).json({ error: 'Data sekolah tidak ditemukan.' });
    res.json(school);
  });

  // Update School Profile
  app.put('/api/school/profile', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const schoolIndex = db.schools.findIndex((s) => s.id === req.schoolId);
    if (schoolIndex === -1) return res.status(404).json({ error: 'Sekolah tidak ditemukan.' });

    const currentSchool = db.schools[schoolIndex];

    // Explicitly protect logos from accidental overwrite:
    let finalLogoUrl = currentSchool.logoUrl || '';
    if (req.body.removeLogo === true) {
      finalLogoUrl = '';
    } else if (req.body.logoUrl !== undefined && req.body.logoUrl !== '') {
      finalLogoUrl = req.body.logoUrl;
    }

    let finalRegionalLogoUrl = currentSchool.regionalLogoUrl || '';
    if (req.body.removeRegionalLogo === true) {
      finalRegionalLogoUrl = '';
    } else if (req.body.regionalLogoUrl !== undefined && req.body.regionalLogoUrl !== '') {
      finalRegionalLogoUrl = req.body.regionalLogoUrl;
    }

    const { removeLogo, removeRegionalLogo, ...bodyData } = req.body;

    const updated = {
      ...currentSchool,
      ...bodyData,
      logoUrl: finalLogoUrl,
      regionalLogoUrl: finalRegionalLogoUrl,
      id: req.schoolId, // preserve immutable ID
      status: currentSchool.status, // preserve status
      updatedAt: new Date().toISOString(),
    };

    db.schools[schoolIndex] = updated;
    writeDb(db);
    res.json({ success: true, school: updated });
  });

  // Upload School Logo
  app.post('/api/school/upload-logo', authenticateToken, requireSchoolAdmin, upload.single('logo'), (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File logo tidak ditemukan.' });
    }
    const filePath = path.join(UPLOADS_DIR, req.file.filename);
    let logoUrl = `/uploads/${req.file.filename}`;
    try {
      const mime = req.file.mimetype || 'image/png';
      const fileBuffer = fs.readFileSync(filePath);
      if (fileBuffer.length <= 2.5 * 1024 * 1024) {
        logoUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;
      }
    } catch (e) {
      // fallback
    }

    const db = readDb();
    const school = db.schools.find((s) => s.id === req.schoolId);
    if (school) {
      school.logoUrl = logoUrl;
      school.updatedAt = new Date().toISOString();
      writeDb(db);
    }
    res.json({ success: true, logoUrl, school });
  });

  // Upload Regional / Pemda Logo
  app.post('/api/school/upload-regional-logo', authenticateToken, requireSchoolAdmin, upload.single('logo'), (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File logo daerah tidak ditemukan.' });
    }
    const filePath = path.join(UPLOADS_DIR, req.file.filename);
    let regionalLogoUrl = `/uploads/${req.file.filename}`;
    try {
      const mime = req.file.mimetype || 'image/png';
      const fileBuffer = fs.readFileSync(filePath);
      if (fileBuffer.length <= 2.5 * 1024 * 1024) {
        regionalLogoUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;
      }
    } catch (e) {
      // fallback
    }

    const db = readDb();
    const school = db.schools.find((s) => s.id === req.schoolId);
    if (school) {
      school.regionalLogoUrl = regionalLogoUrl;
      school.updatedAt = new Date().toISOString();
      writeDb(db);
    }
    res.json({ success: true, regionalLogoUrl, school });
  });

  // Remove School Logo
  app.post('/api/school/remove-logo', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const school = db.schools.find((s) => s.id === req.schoolId);
    if (school) {
      school.logoUrl = '';
      school.updatedAt = new Date().toISOString();
      writeDb(db);
    }
    res.json({ success: true });
  });

  // Remove Regional Logo
  app.post('/api/school/remove-regional-logo', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const school = db.schools.find((s) => s.id === req.schoolId);
    if (school) {
      school.regionalLogoUrl = '';
      school.updatedAt = new Date().toISOString();
      writeDb(db);
    }
    res.json({ success: true });
  });

  // Get/Update Settings
  app.get('/api/school/settings', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    let settings = db.settings.find((s) => s.schoolId === req.schoolId);
    if (!settings) {
      settings = {
        schoolId: req.schoolId,
        antiCheatSensitivity: 'medium',
        maxViolationsBeforeWarning: 1,
        maxViolationsBeforeLockout: 5,
        enableSoundAlerts: true,
        enableTtsAlerts: true,
        allowResumeOnDisconnect: true,
        requireFullscreen: true,
        watermarkOnExamScreen: true,
      };
      db.settings.push(settings);
      writeDb(db);
    }
    res.json(settings);
  });

  app.put('/api/school/settings', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const idx = db.settings.findIndex((s) => s.schoolId === req.schoolId);
    const newSettings = {
      ...req.body,
      schoolId: req.schoolId,
    };
    if (idx !== -1) {
      db.settings[idx] = newSettings;
    } else {
      db.settings.push(newSettings);
    }
    writeDb(db);
    res.json({ success: true, settings: newSettings });
  });

  // Backup and Restore
  app.get('/api/school/backup', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const schoolData = {
      school: db.schools.find((s) => s.id === req.schoolId),
      students: db.students.filter((s) => s.schoolId === req.schoolId),
      questions: db.questions.filter((q) => q.schoolId === req.schoolId),
      exams: db.exams.filter((e) => e.schoolId === req.schoolId),
      settings: db.settings.find((s) => s.schoolId === req.schoolId),
      exportedAt: new Date().toISOString(),
    };
    res.json(schoolData);
  });

  // ==========================================
  // DASHBOARD STATS
  // ==========================================

  app.get('/api/school/dashboard', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const schoolId = req.schoolId;

    const schoolStudents = db.students.filter((s) => s.schoolId === schoolId && s.status === 'active');
    const schoolExams = db.exams.filter((e) => e.schoolId === schoolId);
    const ongoingExams = schoolExams.filter((e) => e.status === 'active');
    const upcomingExams = schoolExams.filter((e) => e.status === 'scheduled');

    const schoolSessions = db.sessions.filter((ses) => ses.schoolId === schoolId);
    const completedStudents = schoolSessions.filter((s) => s.status === 'completed').length;
    const inProgressStudents = schoolSessions.filter((s) => s.status === 'in_progress').length;

    const schoolViolations = db.violations.filter((v) => {
      const exam = schoolExams.find((e) => e.id === v.examId);
      return !!exam;
    });
    const unreviewedViolations = schoolViolations.filter((v) => !v.reviewed).length;

    // Calculate average score across all graded sessions
    const gradedSessions = schoolSessions.filter((s) => s.graded && s.totalScore !== undefined);
    const avgScore = gradedSessions.length > 0 ? gradedSessions.reduce((acc, curr) => acc + (curr.totalScore || 0), 0) / gradedSessions.length : 0;

    // Recent activities & exams
    const recentExams = schoolExams.slice(0, 5);

    res.json({
      stats: {
        totalStudents: schoolStudents.length,
        totalExams: schoolExams.length,
        ongoingExamsCount: ongoingExams.length,
        upcomingExamsCount: upcomingExams.length,
        completedStudentsCount: completedStudents,
        inProgressStudentsCount: inProgressStudents,
        totalViolationsCount: schoolViolations.length,
        unreviewedViolationsCount: unreviewedViolations,
        averageScore: Math.round(avgScore * 10) / 10,
      },
      recentExams,
      recentViolations: schoolViolations.slice(-6).reverse(),
    });
  });

  // ==========================================
  // STUDENTS MANAGEMENT & BULK EXCEL IMPORT
  // ==========================================

  // List Students
  app.get('/api/students', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const students = db.students.filter((s) => s.schoolId === req.schoolId);
    res.json(students);
  });

  // Download Student Excel Template
  app.get('/api/students/template', authenticateToken, requireSchoolAdmin, (_req, res) => {
    const templateRows = [
      {
        NIS: '240101',
        NISN: '0071234561',
        'Nama Lengkap': 'Aditya Pratama Putra',
        'Jenis Kelamin': 'L',
        Kelas: 'X IPA 1',
        Rombel: 'Rombel A',
        'Tahun Pelajaran': '2024/2025',
        Status: 'Aktif',
      },
      {
        NIS: '240102',
        NISN: '0071234562',
        'Nama Lengkap': 'Annisa Fitriani Rahma',
        'Jenis Kelamin': 'P',
        Kelas: 'X IPA 1',
        Rombel: 'Rombel A',
        'Tahun Pelajaran': '2024/2025',
        Status: 'Aktif',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Template_Data_Siswa_ISTAFA.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  });

  // Bulk Import Students from Excel
  app.post('/api/students/bulk-import', authenticateToken, requireSchoolAdmin, upload.single('file'), (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File Excel (.xlsx, .csv) tidak ditemukan.' });
    }

    try {
      const buffer = fs.readFileSync(req.file.path);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

      const db = readDb();
      const existingStudents = db.students.filter((s) => s.schoolId === req.schoolId);
      const existingNisSet = new Set(existingStudents.map((s) => String(s.nis).trim()));

      let successCount = 0;
      let duplicateCount = 0;
      let failedCount = 0;
      const issues: any[] = [];
      const newStudentsToInsert: any[] = [];

      rows.forEach((row, idx) => {
        const rowNumber = idx + 2;
        const nis = String(row['NIS'] || row['nis'] || '').trim();
        const nama = String(row['Nama Lengkap'] || row['Nama'] || row['nama'] || '').trim();
        const jk = String(row['Jenis Kelamin'] || row['JK'] || 'L').trim().toUpperCase();
        const kelas = String(row['Kelas'] || row['kelas'] || '').trim();

        if (!nis || !nama) {
          failedCount++;
          issues.push({ row: rowNumber, reason: 'NIS atau Nama Lengkap kosong.' });
          return;
        }

        if (existingNisSet.has(nis)) {
          duplicateCount++;
          issues.push({ row: rowNumber, reason: `NIS ${nis} sudah terdaftar.` });
          return;
        }

        const participantCode = `IST-${nis}-${Math.floor(100 + Math.random() * 900)}`;

        const newStudent = {
          id: `std_${Date.now()}_${idx}`,
          schoolId: req.schoolId,
          nis,
          nisn: String(row['NISN'] || row['nisn'] || '').trim(),
          fullName: nama,
          gender: jk === 'P' ? 'P' : 'L',
          gradeClass: kelas || 'Kelas Umum',
          rombel: String(row['Rombel'] || '').trim(),
          academicYear: String(row['Tahun Pelajaran'] || '2024/2025').trim(),
          participantCode,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newStudentsToInsert.push(newStudent);
        existingNisSet.add(nis);
        successCount++;
      });

      if (newStudentsToInsert.length > 0) {
        db.students.push(...newStudentsToInsert);
        writeDb(db);
      }

      // Cleanup uploaded temp file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}

      res.json({
        success: true,
        totalRows: rows.length,
        successCount,
        duplicateCount,
        failedCount,
        issues,
      });
    } catch (err: any) {
      console.error('Error importing students Excel:', err);
      res.status(500).json({ error: `Gagal membaca file Excel: ${err.message}` });
    }
  });

  // Create Student Manually
  app.post('/api/students', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { nis, nisn, fullName, gender, gradeClass, rombel, academicYear } = req.body;
    if (!nis || !fullName || !gradeClass) {
      return res.status(400).json({ error: 'NIS, Nama Lengkap, dan Kelas wajib diisi.' });
    }

    const db = readDb();
    const duplicate = db.students.find((s) => s.schoolId === req.schoolId && s.nis === nis);
    if (duplicate) {
      return res.status(400).json({ error: `NIS ${nis} sudah terdaftar di sekolah ini.` });
    }

    const participantCode = `IST-${nis}-${Math.floor(100 + Math.random() * 900)}`;
    const newStudent = {
      id: `std_${Date.now()}`,
      schoolId: req.schoolId,
      nis,
      nisn: nisn || '',
      fullName,
      gender: gender || 'L',
      gradeClass,
      rombel: rombel || '',
      academicYear: academicYear || '2024/2025',
      participantCode,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.students.push(newStudent);
    writeDb(db);
    res.json({ success: true, student: newStudent });
  });

  // Update Student
  app.put('/api/students/:id', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const idx = db.students.findIndex((s) => s.id === req.params.id && s.schoolId === req.schoolId);
    if (idx === -1) return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });

    const updated = {
      ...db.students[idx],
      ...req.body,
      schoolId: req.schoolId,
      updatedAt: new Date().toISOString(),
    };

    db.students[idx] = updated;
    writeDb(db);
    res.json({ success: true, student: updated });
  });

  // Delete Single Student
  app.delete('/api/students/:id', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const student = db.students.find((s) => s.id === req.params.id && s.schoolId === req.schoolId);
    if (!student) return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });

    db.students = db.students.filter((s) => !(s.id === req.params.id && s.schoolId === req.schoolId));
    db.sessions = db.sessions.filter((ses) => ses.studentId !== req.params.id);
    db.violations = (db.violations || []).filter((v) => v.studentId !== req.params.id);

    writeDb(db);
    res.json({ success: true, message: `Data siswa ${student.fullName} berhasil dihapus.` });
  });

  // Bulk Delete Students
  app.post('/api/students/bulk-delete', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Daftar ID siswa yang akan dihapus tidak valid.' });
    }

    const db = readDb();
    const idSet = new Set(studentIds);
    const beforeCount = db.students.length;

    db.students = db.students.filter((s) => !(idSet.has(s.id) && s.schoolId === req.schoolId));
    const deletedCount = beforeCount - db.students.length;

    db.sessions = db.sessions.filter((ses) => !idSet.has(ses.studentId));
    db.violations = (db.violations || []).filter((v) => !idSet.has(v.studentId));

    writeDb(db);
    res.json({ success: true, message: `Berhasil menghapus ${deletedCount} siswa.`, deletedCount });
  });

  // Delete All Students (with optional class filter)
  app.delete('/api/students', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const targetClass = req.query.gradeClass as string | undefined;
    const db = readDb();

    let removedIds: string[] = [];
    if (targetClass && targetClass !== 'ALL') {
      const remaining: typeof db.students = [];
      db.students.forEach((s) => {
        if (s.schoolId === req.schoolId && s.gradeClass === targetClass) {
          removedIds.push(s.id);
        } else {
          remaining.push(s);
        }
      });
      db.students = remaining;
    } else {
      const remaining: typeof db.students = [];
      db.students.forEach((s) => {
        if (s.schoolId === req.schoolId) {
          removedIds.push(s.id);
        } else {
          remaining.push(s);
        }
      });
      db.students = remaining;
    }

    const removedSet = new Set(removedIds);
    db.sessions = db.sessions.filter((ses) => !removedSet.has(ses.studentId));
    db.violations = (db.violations || []).filter((v) => !removedSet.has(v.studentId));

    writeDb(db);
    res.json({
      success: true,
      message: `Berhasil menghapus ${removedIds.length} data siswa.`,
      deletedCount: removedIds.length,
    });
  });

  // Class Promotion (Kenaikan Kelas tanpa duplikasi)
  app.post('/api/students/promote-class', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { currentClass, targetClass, newAcademicYear } = req.body;
    if (!currentClass || !targetClass) {
      return res.status(400).json({ error: 'Kelas asal dan kelas tujuan wajib dipilih.' });
    }

    const db = readDb();
    let count = 0;
    db.students.forEach((s) => {
      if (s.schoolId === req.schoolId && s.gradeClass === currentClass && s.status === 'active') {
        s.gradeClass = targetClass;
        if (newAcademicYear) s.academicYear = newAcademicYear;
        s.updatedAt = new Date().toISOString();
        count++;
      }
    });

    writeDb(db);
    res.json({ success: true, count, message: `Berhasil menaikkan kelas sebanyak ${count} siswa.` });
  });

  // Export Students to Excel
  app.get('/api/students/export', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const students = db.students.filter((s) => s.schoolId === req.schoolId);
    const rows = students.map((s) => ({
      NIS: s.nis,
      NISN: s.nisn || '',
      'Nama Lengkap': s.fullName,
      'Jenis Kelamin': s.gender,
      Kelas: s.gradeClass,
      Rombel: s.rombel || '',
      'Kode Peserta': s.participantCode,
      'Tahun Pelajaran': s.academicYear,
      Status: s.status === 'active' ? 'Aktif' : 'Nonaktif',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Export_Data_Siswa.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  });

  // ==========================================
  // FITUR UTAMA: DOCUMENT UPLOAD & PARSER (DOCX / PDF / OCR)
  // ==========================================

  app.post('/api/questions/upload-doc', authenticateToken, requireSchoolAdmin, upload.single('docFile'), async (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File dokumen soal tidak ditemukan.' });
    }

    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const expectedCount = req.body.expectedCount ? parseInt(req.body.expectedCount, 10) : undefined;
      let questions: any[] = [];
      let allExtractedImages: string[] = [];
      let rawText = '';
      let isScannedPdf = false;

      if (ext === '.docx' || ext === '.doc') {
        // 1. DOCX Extraction via JSZip XML Block Traversal & Mammoth
        const docxResult = await extractDocxBlocks(req.file.path, UPLOADS_DIR);
        allExtractedImages = docxResult.allImages;
        rawText = docxResult.rawText;

        // Parse with deterministic Indonesian exam parser
        questions = parseIndonesianExamQuestions(docxResult.blocks, rawText);

        // Controlled AI enhancement if available
        if (process.env.GEMINI_API_KEY && (questions.length < 5 || questions.length < (expectedCount || 0))) {
          const aiRefined = await parseWithGeminiAssistant(rawText, questions);
          if (aiRefined && aiRefined.length >= questions.length) {
            questions = aiRefined;
          }
        }
      } else if (ext === '.pdf') {
        // 2. PDF Digital & Scanned PDF
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        rawText = pdfData.text || '';

        // Check if scanned PDF (no text layer)
        if (rawText.trim().length < 50) {
          isScannedPdf = true;
          // Run OCR via Tesseract
          const ocrText = await extractOcrFromImage(req.file.path);
          if (ocrText.trim().length > 0) {
            rawText = ocrText;
          }
        }

        // Parse questions
        questions = parseIndonesianExamQuestions([], rawText);

        // Controlled AI enhancement if available
        if (process.env.GEMINI_API_KEY) {
          const aiRefined = await parseWithGeminiAssistant(rawText, questions);
          if (aiRefined && aiRefined.length >= questions.length) {
            questions = aiRefined;
          }
        }
      } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        // 3. Image OCR via Tesseract and AI
        allExtractedImages = [`/uploads/${req.file.filename}`];
        const ocrText = await extractOcrFromImage(req.file.path);
        rawText = ocrText;

        if (ocrText.trim().length > 20) {
          questions = parseIndonesianExamQuestions([], ocrText);
          if (questions.length > 0) {
            questions[0].images.push(`/uploads/${req.file.filename}`);
          }
        }

        if (process.env.GEMINI_API_KEY && rawText.length > 0) {
          const aiRefined = await parseWithGeminiAssistant(rawText, questions);
          if (aiRefined && aiRefined.length > 0) {
            questions = aiRefined;
            if (questions.length > 0 && questions[0].images.length === 0) {
              questions[0].images.push(`/uploads/${req.file.filename}`);
            }
          }
        }

        if (questions.length === 0) {
          questions = [
            {
              number: 1,
              type: 'multiple_choice',
              text: `Soal dari file gambar ${req.file.originalname}. Periksa gambar terlampir:`,
              options: [
                { key: 'A', text: 'Pilihan Jawaban A' },
                { key: 'B', text: 'Pilihan Jawaban B' },
                { key: 'C', text: 'Pilihan Jawaban C' },
                { key: 'D', text: 'Pilihan Jawaban D' },
              ],
              correctAnswer: 'A',
              images: [`/uploads/${req.file.filename}`],
              tables: [],
              scoreWeight: 2,
              explanation: '',
              extractionStatus: 'needs_review',
              warningMessage: 'Teks soal hasil gambar memerlukan verifikasi guru.',
            },
          ];
        }
      } else {
        return res.status(400).json({ error: 'Format file tidak didukung. Harap gunakan DOCX, PDF, atau gambar.' });
      }

      // Pre-validation checklist
      const validationSummary = validateQuestionSet(questions, expectedCount);

      res.json({
        success: true,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        questions,
        validationSummary,
        rawTextPreview: rawText.slice(0, 2000),
        allImages: allExtractedImages,
        isScannedPdf,
      });
    } catch (err: any) {
      console.error('Error parsing document:', err);
      res.status(500).json({ error: `Gagal memproses dokumen: ${err.message}` });
    }
  });

  // Re-validate question set on the fly
  app.post('/api/questions/validate', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { questions, expectedCount } = req.body;
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Daftar soal tidak valid.' });
    }
    const validationSummary = validateQuestionSet(questions, expectedCount);
    res.json({ success: true, validationSummary });
  });

  // Upload image attachment to a specific question
  app.post('/api/questions/upload-image', authenticateToken, requireSchoolAdmin, upload.single('imageFile'), (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File gambar tidak ditemukan.' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  });

  // Save parsed questions to Question Bank
  app.post('/api/bank-questions/batch', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { questions, subject, gradeClass } = req.body;
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Daftar soal tidak valid.' });
    }

    const db = readDb();
    const formattedQuestions = questions.map((q: any, idx: number) => ({
      id: `q_${Date.now()}_${idx}`,
      schoolId: req.schoolId,
      subject: subject || 'Mata Pelajaran Umum',
      gradeClass: gradeClass || 'Umum',
      number: q.number || idx + 1,
      type: q.type || 'multiple_choice',
      text: q.text || '',
      options: q.options || [],
      correctAnswer: q.correctAnswer || (q.options?.[0]?.key ?? 'A'),
      images: q.images || [],
      tables: q.tables || [],
      scoreWeight: q.scoreWeight || 2,
      explanation: q.explanation || '',
      extractionStatus: 'valid',
      createdAt: new Date().toISOString(),
    }));

    db.questions.push(...formattedQuestions);
    writeDb(db);

    res.json({ success: true, count: formattedQuestions.length, questions: formattedQuestions });
  });

  // Get Question Bank
  app.get('/api/bank-questions', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const questions = db.questions.filter((q) => q.schoolId === req.schoolId);
    res.json(questions);
  });

  // Single Question CRUD
  app.post('/api/bank-questions', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const newQ = {
      ...req.body,
      id: `q_${Date.now()}`,
      schoolId: req.schoolId,
      createdAt: new Date().toISOString(),
    };
    db.questions.push(newQ);
    writeDb(db);
    res.json({ success: true, question: newQ });
  });

  app.put('/api/bank-questions/:id', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const idx = db.questions.findIndex((q) => q.id === req.params.id && q.schoolId === req.schoolId);
    if (idx === -1) return res.status(404).json({ error: 'Soal tidak ditemukan.' });

    db.questions[idx] = { ...db.questions[idx], ...req.body, schoolId: req.schoolId };
    writeDb(db);
    res.json({ success: true, question: db.questions[idx] });
  });

  // Delete Single Question
  app.delete('/api/bank-questions/:id', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    db.questions = db.questions.filter((q) => !(q.id === req.params.id && q.schoolId === req.schoolId));
    writeDb(db);
    res.json({ success: true });
  });

  // Bulk Delete Questions
  app.post('/api/bank-questions/bulk-delete', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: 'Daftar ID soal tidak valid.' });
    }
    const db = readDb();
    const idSet = new Set(questionIds);
    db.questions = db.questions.filter((q) => !(idSet.has(q.id) && q.schoolId === req.schoolId));
    writeDb(db);
    res.json({ success: true, message: `Berhasil menghapus ${questionIds.length} soal.` });
  });

  // Delete All Questions (with optional subject filter)
  app.delete('/api/bank-questions', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const subject = req.query.subject as string | undefined;
    const db = readDb();
    if (subject && subject !== 'ALL') {
      db.questions = db.questions.filter((q) => !(q.schoolId === req.schoolId && q.subject === subject));
    } else {
      db.questions = db.questions.filter((q) => q.schoolId !== req.schoolId);
    }
    writeDb(db);
    res.json({ success: true, message: 'Bank soal berhasil dibersihkan.' });
  });

  // ==========================================
  // EXAM MANAGEMENT (CREATE, PUBLISH, MANAGE)
  // ==========================================

  // List Exams
  app.get('/api/exams', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const exams = db.exams.filter((e) => e.schoolId === req.schoolId);
    res.json(exams);
  });

  // Create Exam (Directly from Document or Bank)
  app.post('/api/exams', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const {
      title,
      subject,
      gradeClass,
      academicYear,
      semester,
      examCode,
      startTime,
      endTime,
      durationMinutes,
      lateToleranceMinutes,
      shuffleQuestions,
      shuffleOptions,
      kkm,
      maxScore,
      showScoreToStudent,
      showDiscussionToStudent,
      status,
      questions,
    } = req.body;

    if (!title || !subject || !gradeClass || !startTime || !endTime) {
      return res.status(400).json({ error: 'Mohon lengkapi judul, mata pelajaran, kelas, dan jadwal ujian.' });
    }

    const db = readDb();
    const school = db.schools.find((s) => s.id === req.schoolId);

    const newExam = {
      id: `ex_${Date.now()}`,
      schoolId: req.schoolId,
      title,
      subject,
      gradeClass,
      allowedClasses: req.body.allowedClasses || [gradeClass],
      allowedStudentIds: req.body.allowedStudentIds || [],
      tokenActive: req.body.tokenActive !== false,
      academicYear: academicYear || school?.academicYear || '2024/2025',
      semester: semester || school?.semester || 'Ganjil',
      examCode: (examCode || `EX-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase(),
      startTime,
      endTime,
      durationMinutes: durationMinutes || 90,
      lateToleranceMinutes: lateToleranceMinutes || 15,
      shuffleQuestions: shuffleQuestions !== false,
      shuffleOptions: shuffleOptions !== false,
      kkm: kkm || 75,
      maxScore: maxScore || 100,
      showScoreToStudent: showScoreToStudent !== false,
      showDiscussionToStudent: !!showDiscussionToStudent,
      status: status || 'draft',
      questions: questions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.exams.push(newExam);
    writeDb(db);
    res.json({ success: true, exam: newExam });
  });

  // Update Exam
  app.put('/api/exams/:id', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const idx = db.exams.findIndex((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (idx === -1) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    const updated = {
      ...db.exams[idx],
      ...req.body,
      allowedClasses: req.body.allowedClasses !== undefined ? req.body.allowedClasses : (db.exams[idx].allowedClasses || [db.exams[idx].gradeClass]),
      allowedStudentIds: req.body.allowedStudentIds !== undefined ? req.body.allowedStudentIds : (db.exams[idx].allowedStudentIds || []),
      tokenActive: req.body.tokenActive !== undefined ? req.body.tokenActive : (db.exams[idx].tokenActive !== false),
      schoolId: req.schoolId,
      updatedAt: new Date().toISOString(),
    };

    db.exams[idx] = updated;
    writeDb(db);
    res.json({ success: true, exam: updated });
  });

  // Regenerate Exam Token
  app.post('/api/exams/:id/regenerate-token', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const exam = db.exams.find((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    // Generate unique 6-8 chars token
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = exam.subject ? exam.subject.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') : 'EXM';
    const newToken = `${prefix}-${randomChars}`;

    exam.examCode = newToken;
    exam.updatedAt = new Date().toISOString();
    writeDb(db);

    res.json({ success: true, examCode: newToken, exam });
  });

  // Toggle Exam Token / Link Active status
  app.post('/api/exams/:id/toggle-token', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { active } = req.body;
    const db = readDb();
    const exam = db.exams.find((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    exam.tokenActive = active !== undefined ? Boolean(active) : !(exam.tokenActive !== false);
    exam.updatedAt = new Date().toISOString();
    writeDb(db);

    res.json({
      success: true,
      tokenActive: exam.tokenActive,
      message: exam.tokenActive ? 'Tautan dan token ujian berhasil diaktifkan.' : 'Tautan dan token ujian dinonaktifkan.',
      exam,
    });
  });

  // Get Detailed Participants Status for an Exam
  app.get('/api/exams/:id/participants-status', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const exam = db.exams.find((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    // Gather eligible students
    let targetStudents: any[] = [];
    if (exam.allowedStudentIds && exam.allowedStudentIds.length > 0) {
      targetStudents = db.students.filter(
        (s: any) => s.schoolId === req.schoolId && exam.allowedStudentIds.includes(s.id) && s.status === 'active'
      );
    } else {
      const allowedClasses = exam.allowedClasses && exam.allowedClasses.length > 0 ? exam.allowedClasses : [exam.gradeClass];
      targetStudents = db.students.filter(
        (s: any) => s.schoolId === req.schoolId && allowedClasses.includes(s.gradeClass) && s.status === 'active'
      );
    }

    const sessions = db.sessions.filter((s: any) => s.examId === exam.id);
    const violations = db.violations.filter((v: any) => v.examId === exam.id);

    const participantsData = targetStudents.map((s: any) => {
      const session = sessions.find((ses: any) => ses.studentId === s.id);
      const studentViolations = violations.filter((v: any) => v.studentId === s.id);
      const isOnline = session && session.status === 'in_progress' && (Date.now() - new Date(session.lastHeartbeat || session.startedAt).getTime() < 60000);

      return {
        id: s.id,
        nis: s.nis,
        fullName: s.fullName,
        gradeClass: s.gradeClass,
        participantCode: s.participantCode,
        sessionStatus: session ? session.status : 'not_started', // 'not_started' | 'in_progress' | 'completed'
        isOnline: !!isOnline,
        startedAt: session ? session.startedAt : null,
        submittedAt: session ? session.submittedAt : null,
        answeredCount: session && session.answers ? Object.keys(session.answers).length : 0,
        totalQuestions: exam.questions.length,
        totalViolations: studentViolations.length,
        finalScore: session && session.graded ? session.finalScore : null,
      };
    });

    const summary = {
      totalAssigned: targetStudents.length,
      notStartedCount: participantsData.filter((p: any) => p.sessionStatus === 'not_started').length,
      inProgressCount: participantsData.filter((p: any) => p.sessionStatus === 'in_progress').length,
      completedCount: participantsData.filter((p: any) => p.sessionStatus === 'completed').length,
      violationsCount: violations.length,
    };

    res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        gradeClass: exam.gradeClass,
        examCode: exam.examCode,
        status: exam.status,
        tokenActive: exam.tokenActive !== false,
      },
      summary,
      participants: participantsData,
    });
  });

  // Publish / Change Status of Exam
  app.post('/api/exams/:id/publish', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { status } = req.body;
    const db = readDb();
    const exam = db.exams.find((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    exam.status = status || 'active';
    exam.updatedAt = new Date().toISOString();
    writeDb(db);
    res.json({ success: true, message: `Status ujian diubah menjadi ${exam.status}.`, exam });
  });

  // Delete Exam
  app.delete('/api/exams/:id', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    db.exams = db.exams.filter((e) => !(e.id === req.params.id && e.schoolId === req.schoolId));
    db.sessions = db.sessions.filter((s) => s.examId !== req.params.id);
    db.violations = (db.violations || []).filter((v) => v.examId !== req.params.id);
    writeDb(db);
    res.json({ success: true });
  });

  // ==========================================
  // REAL-TIME MONITORING & ANTI-CHEAT EVENTS
  // ==========================================

  app.get('/api/exams/:id/monitoring', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const exam = db.exams.find((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    const students = db.students.filter((s) => s.schoolId === req.schoolId && s.gradeClass === exam.gradeClass && s.status === 'active');
    const sessions = db.sessions.filter((s) => s.examId === exam.id);
    const violations = db.violations.filter((v) => v.examId === exam.id);

    const now = Date.now();
    const studentStatusList = students.map((std) => {
      const session = sessions.find((s) => s.studentId === std.id);
      const studentViolations = violations.filter((v) => v.studentId === std.id);

      let connectionStatus: 'online' | 'disconnected' | 'idle' = 'idle';
      let examProgress = 'Belum Mulai';
      let answeredCount = 0;

      if (session) {
        answeredCount = Object.keys(session.answers || {}).length;
        const lastHeartbeatTime = new Date(session.lastHeartbeat || session.startedAt).getTime();
        const diffSeconds = (now - lastHeartbeatTime) / 1000;

        if (session.status === 'completed') {
          connectionStatus = 'idle';
          examProgress = 'Selesai';
        } else if (diffSeconds <= 45) {
          connectionStatus = 'online';
          examProgress = `${answeredCount}/${exam.questions.length} Soal`;
        } else {
          connectionStatus = 'disconnected';
          examProgress = `Terputus (${answeredCount} terjawab)`;
        }
      }

      return {
        studentId: std.id,
        nis: std.nis,
        fullName: std.fullName,
        gradeClass: std.gradeClass,
        participantCode: std.participantCode,
        sessionStatus: session?.status || 'not_started',
        connectionStatus,
        startedAt: session?.startedAt,
        submittedAt: session?.submittedAt,
        answeredCount,
        totalQuestions: exam.questions.length,
        violationsCount: studentViolations.length,
        currentScore: session?.totalScore,
        sessionId: session?.id,
      };
    });

    const notStartedCount = studentStatusList.filter((s) => s.sessionStatus === 'not_started').length;
    const inProgressCount = studentStatusList.filter((s) => s.sessionStatus === 'in_progress').length;
    const completedCount = studentStatusList.filter((s) => s.sessionStatus === 'completed').length;
    const disconnectedCount = studentStatusList.filter((s) => s.connectionStatus === 'disconnected').length;

    res.json({
      exam,
      metrics: {
        totalEligible: students.length,
        notStartedCount,
        inProgressCount,
        completedCount,
        disconnectedCount,
        totalViolations: violations.length,
      },
      participants: studentStatusList,
      recentViolations: violations.slice(-15).reverse(),
    });
  });

  // Mark violation as reviewed or reset session
  app.post('/api/monitoring/reset-session', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { sessionId } = req.body;
    const db = readDb();
    const session = db.sessions.find((s) => s.id === sessionId && s.schoolId === req.schoolId);
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });

    session.status = 'in_progress';
    session.lastHeartbeat = new Date().toISOString();
    writeDb(db);
    res.json({ success: true, message: 'Sesi ujian siswa berhasil diizinkan kembali.' });
  });

  // Delete student session completely (force reset)
  app.post('/api/monitoring/delete-session', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { sessionId } = req.body;
    const db = readDb();
    const session = db.sessions.find((s) => s.id === sessionId && s.schoolId === req.schoolId);
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });

    db.sessions = db.sessions.filter((s) => s.id !== sessionId);
    db.violations = (db.violations || []).filter((v) => v.sessionId !== sessionId);
    writeDb(db);
    res.json({ success: true, message: 'Sesi ujian siswa berhasil direset/dihapus total.' });
  });

  // ==========================================
  // RESULTS & GRADE ANALYTICS
  // ==========================================

  app.get('/api/exams/:id/results', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const exam = db.exams.find((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    const sessions = db.sessions.filter((s) => s.examId === exam.id && s.status === 'completed');
    const students = db.students.filter((s) => s.schoolId === req.schoolId);

    // Calculate score for each student
    const studentResults = sessions.map((ses) => {
      const student = students.find((s) => s.id === ses.studentId);
      let correctCount = 0;
      let wrongCount = 0;
      let essayTotalAwarded = 0;
      let maxEssayScore = 0;

      exam.questions.forEach((q: any) => {
        const ans = ses.answers?.[q.id];
        if (q.type === 'multiple_choice') {
          if (ans?.selectedOption === q.correctAnswer) {
            correctCount++;
          } else if (ans?.selectedOption) {
            wrongCount++;
          }
        } else if (q.type === 'essay') {
          maxEssayScore += q.scoreWeight || 5;
          if (ans?.scoreAwarded !== undefined) {
            essayTotalAwarded += ans.scoreAwarded;
          }
        }
      });

      const mcQuestions = exam.questions.filter((q: any) => q.type === 'multiple_choice');
      const mcScore = mcQuestions.length > 0 ? (correctCount / mcQuestions.length) * 100 : 0;
      const finalScore = ses.totalScore !== undefined ? ses.totalScore : Math.round(mcScore);
      const isPassed = finalScore >= (exam.kkm || 75);

      return {
        sessionId: ses.id,
        studentId: ses.studentId,
        nis: ses.nis || student?.nis || '-',
        fullName: ses.studentName || student?.fullName || 'Peserta',
        gradeClass: ses.gradeClass || student?.gradeClass || exam.gradeClass,
        startedAt: ses.startedAt,
        submittedAt: ses.submittedAt,
        correctCount,
        wrongCount,
        answeredCount: Object.keys(ses.answers || {}).length,
        totalQuestions: exam.questions.length,
        finalScore,
        isPassed,
        essayGraded: ses.essayGraded || false,
        answers: ses.answers,
      };
    });

    // Summary statistics
    const scores = studentResults.map((r) => r.finalScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passedCount = studentResults.filter((r) => r.isPassed).length;

    // Item Analysis (Analisis Butir Soal)
    const itemAnalysis = exam.questions.map((q: any) => {
      const answersForQ = sessions.map((s) => s.answers?.[q.id]?.selectedOption);
      const correctParticipants = answersForQ.filter((a) => a === q.correctAnswer).length;
      const difficulty = sessions.length > 0 ? Math.round((correctParticipants / sessions.length) * 100) : 0;

      return {
        questionId: q.id,
        number: q.number,
        type: q.type,
        correctAnswer: q.correctAnswer,
        totalAnswered: answersForQ.filter(Boolean).length,
        correctCount: correctParticipants,
        difficultyRate: difficulty,
        difficultyCategory: difficulty >= 70 ? 'Mudah' : difficulty >= 30 ? 'Sedang' : 'Sukar',
      };
    });

    res.json({
      exam,
      summary: {
        totalFinished: studentResults.length,
        avgScore: Math.round(avgScore * 10) / 10,
        highestScore,
        lowestScore,
        passedCount,
        failedCount: studentResults.length - passedCount,
        passingRate: studentResults.length > 0 ? Math.round((passedCount / studentResults.length) * 100) : 0,
      },
      results: studentResults,
      itemAnalysis,
    });
  });

  // Grade Essay Questions Manually
  app.post('/api/exams/:id/grade-essay', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const { sessionId, questionId, scoreAwarded, notes } = req.body;
    const db = readDb();
    const session = db.sessions.find((s) => s.id === sessionId && s.schoolId === req.schoolId);
    if (!session) return res.status(404).json({ error: 'Sesi siswa tidak ditemukan.' });

    const exam = db.exams.find((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    if (!session.answers) session.answers = {};
    if (!session.answers[questionId]) {
      session.answers[questionId] = {
        questionId,
        answeredAt: new Date().toISOString(),
      };
    }

    session.answers[questionId].scoreAwarded = Number(scoreAwarded);

    // Recalculate total score
    let totalScore = 0;
    let totalPossible = 0;

    exam.questions.forEach((q: any) => {
      const ans = session.answers[q.id];
      const weight = q.scoreWeight || 2;
      totalPossible += weight;

      if (q.type === 'multiple_choice') {
        if (ans?.selectedOption === q.correctAnswer) {
          totalScore += weight;
        }
      } else if (q.type === 'essay') {
        totalScore += ans?.scoreAwarded || 0;
      }
    });

    const scaledScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    session.totalScore = scaledScore;
    session.essayGraded = true;
    session.notes = notes || session.notes;

    writeDb(db);
    res.json({ success: true, totalScore: scaledScore, session });
  });

  // Export Exam Results to Excel
  app.get('/api/exams/:id/export-results', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const exam = db.exams.find((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    const sessions = db.sessions.filter((s) => s.examId === exam.id && s.status === 'completed');
    const rows = sessions.map((ses, idx) => ({
      No: idx + 1,
      NIS: ses.nis,
      'Nama Peserta': ses.studentName,
      Kelas: ses.gradeClass,
      'Waktu Mulai': new Date(ses.startedAt).toLocaleTimeString('id-ID'),
      'Waktu Selesai': ses.submittedAt ? new Date(ses.submittedAt).toLocaleTimeString('id-ID') : '-',
      'Nilai Akhir': ses.totalScore ?? 0,
      Status: (ses.totalScore ?? 0) >= (exam.kkm || 75) ? 'Tuntas' : 'Belum Tuntas',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Ujian');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="Hasil_Ujian_${exam.examCode}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  });

  // ==========================================
  // BERITA ACARA UJIAN
  // ==========================================

  app.get('/api/exams/:id/berita-acara', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const exam = db.exams.find((e) => e.id === req.params.id && e.schoolId === req.schoolId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    const school = db.schools.find((s) => s.id === req.schoolId);
    let beritaAcara = db.beritaAcara.find((b) => b.examId === exam.id);

    const eligibleStudents = db.students.filter((s) => s.schoolId === req.schoolId && s.gradeClass === exam.gradeClass && s.status === 'active');
    const sessions = db.sessions.filter((s) => s.examId === exam.id);
    const presentCount = sessions.length;
    const absentCount = Math.max(0, eligibleStudents.length - presentCount);

    if (!beritaAcara) {
      const examDate = new Date(exam.startTime);
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dayStr = dayNames[examDate.getDay()];
      const dateStr = examDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

      beritaAcara = {
        id: `ba_${exam.id}`,
        examId: exam.id,
        schoolId: req.schoolId,
        examTitle: exam.title,
        subject: exam.subject,
        gradeClass: exam.gradeClass,
        dayDate: `${dayStr}, ${dateStr}`,
        timeRange: `${new Date(exam.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${new Date(exam.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
        totalRegistered: eligibleStudents.length,
        totalPresent: presentCount,
        totalAbsent: absentCount,
        absentStudentsNote: absentCount > 0 ? `${absentCount} siswa tidak hadir tanpa keterangan.` : 'Semua peserta hadir.',
        incidentNotes: 'Ujian berlangsung tertib, lancar, dan aman dengan pengawasan sistem ISTAFA EXAM.',
        headProctorName: 'Pengawas Ujian 1',
        proctorNip: '-',
        principalName: school?.principalName || 'Kepala Sekolah',
        principalNip: school?.principalNip || '-',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.beritaAcara.push(beritaAcara);
      writeDb(db);
    }

    res.json({ beritaAcara, school });
  });

  app.put('/api/exams/:id/berita-acara', authenticateToken, requireSchoolAdmin, (req: AuthRequest, res) => {
    const db = readDb();
    const idx = db.beritaAcara.findIndex((b) => b.examId === req.params.id && b.schoolId === req.schoolId);
    if (idx === -1) return res.status(404).json({ error: 'Berita acara tidak ditemukan.' });

    db.beritaAcara[idx] = {
      ...db.beritaAcara[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    writeDb(db);
    res.json({ success: true, beritaAcara: db.beritaAcara[idx] });
  });

  // ==========================================
  // STUDENT EXAM PORTAL (NO GENERAL LOGIN REQUIRED)
  // Secure Access via Proctored Token / Link / QR
  // ==========================================

  // Rate Limiting for Token Guessing (max 5 failed attempts per 5 minutes per IP)
  const studentTokenAttempts: Record<string, { count: number; lockedUntil: number }> = {};
  function checkStudentTokenRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
    const now = Date.now();
    const entry = studentTokenAttempts[ip];
    if (!entry) return { allowed: true };
    if (entry.lockedUntil > now) {
      return { allowed: false, waitSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    if (entry.lockedUntil <= now && entry.count >= 5) {
      delete studentTokenAttempts[ip];
      return { allowed: true };
    }
    return { allowed: true };
  }
  function recordFailedTokenAttempt(ip: string) {
    const now = Date.now();
    const entry = studentTokenAttempts[ip] || { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= 5) {
      entry.lockedUntil = now + 5 * 60 * 1000; // 5 minutes lock
    }
    studentTokenAttempts[ip] = entry;
  }
  function clearFailedTokenAttempt(ip: string) {
    delete studentTokenAttempts[ip];
  }

  // Public Info Endpoint: Displays exam header & school info on landing
  // (CRITICAL: Does NOT return student list, does NOT return answer keys or questions)
  app.get('/api/student-exam/public-info', (req, res) => {
    const { examId, token } = req.query;
    const db = readDb();

    let exam: any = null;
    if (examId) {
      exam = db.exams.find((e) => e.id === examId);
    } else if (token) {
      exam = db.exams.find((e) => e.examCode.toUpperCase() === String(token).trim().toUpperCase());
    }

    if (!exam) {
      return res.status(404).json({ error: 'Data ujian tidak ditemukan. Harap periksa kembali tautan yang diberikan sekolah.' });
    }

    const school = db.schools.find((s) => s.id === exam.schoolId);
    const allowedClasses = exam.allowedClasses && exam.allowedClasses.length > 0 ? exam.allowedClasses : [exam.gradeClass];

    res.json({
      examId: exam.id,
      title: exam.title,
      subject: exam.subject,
      gradeClass: exam.gradeClass,
      allowedClasses,
      durationMinutes: exam.durationMinutes,
      totalQuestions: exam.questions ? exam.questions.length : 0,
      startTime: exam.startTime,
      endTime: exam.endTime,
      status: exam.status,
      tokenActive: exam.tokenActive !== false,
      hasPredefinedParticipants: Array.isArray(exam.allowedStudentIds) && exam.allowedStudentIds.length > 0,
      school: {
        name: school?.name || 'Sekolah Terdaftar',
        logoUrl: school?.logoUrl || '',
        regionalLogoUrl: school?.regionalLogoUrl || '',
      },
      instructions: [
        'Pastikan koneksi internet stabil sebelum dan selama ujian berlangsung.',
        'Sistem mengaktifkan Mode Layar Penuh dan pengawasan otomatis (Anti-Cheat).',
        'Dilarang berpindah tab browser, membuka aplikasi lain, atau keluar dari layar penuh.',
        'Setiap perpindahan jendela akan dicatat dan dilaporkan langsung ke pengawas.',
        'Jawaban Anda tersimpan secara berkala dan otomatis.',
      ],
    });
  });

  // Step 1: Validate Exam Token with Rate Limiting
  // Only after the token is valid, returns the filtered student roster authorized for this exam
  app.post('/api/student-exam/validate-token', (req, res) => {
    const clientIp = String(req.ip || req.headers['x-forwarded-for'] || 'client');
    const rateCheck = checkStudentTokenRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Terlalu banyak percobaan kode token yang salah. Akses ditangguhkan sementara selama ${rateCheck.waitSeconds} detik demi keamanan.`,
      });
    }

    const { examId, examCode } = req.body;
    if (!examCode) {
      return res.status(400).json({ error: 'Kode Token Ujian wajib diisi.' });
    }

    const db = readDb();
    const cleanExamCode = String(examCode).trim().toUpperCase();

    let exam: any = null;
    if (examId) {
      exam = db.exams.find((e) => e.id === examId && e.examCode.toUpperCase() === cleanExamCode);
    } else {
      exam = db.exams.find((e) => e.examCode.toUpperCase() === cleanExamCode);
    }

    if (!exam) {
      recordFailedTokenAttempt(clientIp);
      return res.status(404).json({
        error: 'Kode Token Ujian tidak valid atau salah. Periksa kembali token dari Pengawas.',
      });
    }

    // Check token active flag
    if (exam.tokenActive === false) {
      return res.status(403).json({
        error: 'Tautan dan token ujian ini sedang dinonaktifkan oleh Admin Sekolah. Hubungi pengawas/proktor.',
      });
    }

    // Check exam status
    if (exam.status !== 'active') {
      return res.status(403).json({
        error: `Ujian ini berstatus "${exam.status}". Belum diaktifkan oleh Admin Sekolah untuk dikerjakan.`,
      });
    }

    // Check schedule window
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    if (now < startTime) {
      return res.status(403).json({
        error: `Ujian belum dimulai. Jadwal mulai: ${startTime.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      });
    }
    if (now > endTime) {
      return res.status(403).json({
        error: `Waktu pengerjaan ujian telah berakhir pada ${endTime.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      });
    }

    // Valid token! Clear failure tracking
    clearFailedTokenAttempt(clientIp);

    const school = db.schools.find((s) => s.id === exam.schoolId);

    // Retrieve eligible student roster for this exam
    let eligibleStudents: any[] = [];
    if (exam.allowedStudentIds && exam.allowedStudentIds.length > 0) {
      eligibleStudents = db.students.filter(
        (s: any) => s.schoolId === exam.schoolId && exam.allowedStudentIds.includes(s.id) && s.status === 'active'
      );
    } else {
      const allowedClasses = exam.allowedClasses && exam.allowedClasses.length > 0 ? exam.allowedClasses : [exam.gradeClass];
      eligibleStudents = db.students.filter(
        (s: any) => s.schoolId === exam.schoolId && allowedClasses.includes(s.gradeClass) && s.status === 'active'
      );
    }

    const availableClasses = Array.from(new Set(eligibleStudents.map((s: any) => s.gradeClass))).filter(Boolean);

    // Get sessions to mark students as completed / in_progress
    const sessions = db.sessions.filter((s: any) => s.examId === exam.id);

    const sanitizedParticipants = eligibleStudents.map((s: any) => {
      const ses = sessions.find((item: any) => item.studentId === s.id);
      return {
        id: s.id,
        nis: s.nis,
        fullName: s.fullName,
        gradeClass: s.gradeClass,
        participantCode: s.participantCode,
        isCompleted: ses?.status === 'completed',
        isInProgress: ses?.status === 'in_progress',
      };
    });

    res.json({
      valid: true,
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        gradeClass: exam.gradeClass,
        durationMinutes: exam.durationMinutes,
        totalQuestions: exam.questions ? exam.questions.length : 0,
      },
      school: {
        name: school?.name || 'Sekolah Terdaftar',
        logoUrl: school?.logoUrl || '',
        regionalLogoUrl: school?.regionalLogoUrl || '',
      },
      classes: availableClasses.length > 0 ? availableClasses : [exam.gradeClass],
      participants: sanitizedParticipants,
    });
  });

  // Backward-compatible verification endpoint
  app.post('/api/student-exam/verify', (req, res) => {
    const { nis, examCode } = req.body;
    if (!nis || !examCode) {
      return res.status(400).json({ error: 'NIS dan Kode Ujian wajib diisi.' });
    }

    const db = readDb();
    const cleanNis = String(nis).trim();
    const cleanExamCode = String(examCode).trim().toUpperCase();

    // Find exam by code
    const exam = db.exams.find((e) => e.examCode.toUpperCase() === cleanExamCode);
    if (!exam) {
      return res.status(404).json({ error: 'Kode Ujian tidak ditemukan. Periksa kembali kode dari pengawas.' });
    }

    if (exam.tokenActive === false) {
      return res.status(403).json({ error: 'Tautan dan token ujian ini telah dinonaktifkan oleh Admin Sekolah.' });
    }

    if (exam.status !== 'active') {
      return res.status(403).json({ error: `Ujian sedang dalam status ${exam.status}. Belum diizinkan untuk dikerjakan.` });
    }

    // Check schedule window
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    if (now < startTime) {
      return res.status(403).json({ error: `Ujian belum dimulai. Jadwal mulai: ${startTime.toLocaleString('id-ID')}` });
    }
    if (now > endTime) {
      return res.status(403).json({ error: `Waktu ujian telah berakhir pada ${endTime.toLocaleString('id-ID')}` });
    }

    // Check student existence
    const student = db.students.find((s) => s.schoolId === exam.schoolId && s.nis === cleanNis && s.status === 'active');
    if (!student) {
      return res.status(404).json({ error: `Siswa dengan NIS ${cleanNis} tidak terdaftar atau nonaktif di sekolah ini.` });
    }

    // Check participant eligibility
    if (exam.allowedStudentIds && exam.allowedStudentIds.length > 0) {
      if (!exam.allowedStudentIds.includes(student.id)) {
        return res.status(403).json({ error: 'Anda tidak terdaftar sebagai peserta pada paket ujian ini.' });
      }
    } else {
      const allowedClasses = exam.allowedClasses && exam.allowedClasses.length > 0 ? exam.allowedClasses : [exam.gradeClass];
      if (!allowedClasses.includes(student.gradeClass)) {
        return res.status(403).json({
          error: `Anda berada di kelas ${student.gradeClass}. Ujian ini hanya ditujukan untuk kelas ${allowedClasses.join(', ')}.`,
        });
      }
    }

    const school = db.schools.find((s) => s.id === exam.schoolId);

    // Check existing session
    const existingSession = db.sessions.find((s) => s.examId === exam.id && s.studentId === student.id);
    if (existingSession && existingSession.status === 'completed') {
      return res.status(403).json({ error: 'Anda sudah menyelesaikan ujian ini dan tidak dapat masuk kembali.' });
    }

    res.json({
      verified: true,
      student: {
        id: student.id,
        nis: student.nis,
        fullName: student.fullName,
        gradeClass: student.gradeClass,
        participantCode: student.participantCode,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        gradeClass: exam.gradeClass,
        durationMinutes: exam.durationMinutes,
        totalQuestions: exam.questions ? exam.questions.length : 0,
        kkm: exam.kkm,
      },
      school: {
        name: school?.name || 'Sekolah',
        logoUrl: school?.logoUrl || '',
        regionalLogoUrl: school?.regionalLogoUrl || '',
      },
      hasActiveSession: !!existingSession,
    });
  });

  // Step 2: Start or Resume Exam Session
  app.post('/api/student-exam/start', (req, res) => {
    const { studentId, examId } = req.body;
    if (!studentId || !examId) {
      return res.status(400).json({ error: 'Data peserta tidak lengkap.' });
    }

    const db = readDb();
    const exam = db.exams.find((e) => e.id === examId);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });
    if (exam.status !== 'active') return res.status(403).json({ error: 'Ujian tidak aktif atau telah ditutup.' });
    if (exam.tokenActive === false) return res.status(403).json({ error: 'Tautan ujian ini telah dinonaktifkan oleh Admin Sekolah.' });

    const student = db.students.find((s) => s.id === studentId);
    if (!student) return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });

    // Validate participant eligibility
    if (exam.allowedStudentIds && exam.allowedStudentIds.length > 0) {
      if (!exam.allowedStudentIds.includes(student.id)) {
        return res.status(403).json({ error: 'Siswa ini tidak terdaftar sebagai peserta pada ujian ini.' });
      }
    } else {
      const allowedClasses = exam.allowedClasses && exam.allowedClasses.length > 0 ? exam.allowedClasses : [exam.gradeClass];
      if (!allowedClasses.includes(student.gradeClass)) {
        return res.status(403).json({
          error: `Siswa berada di kelas ${student.gradeClass}, sedangkan ujian ini ditujukan untuk kelas ${allowedClasses.join(', ')}.`,
        });
      }
    }

    let session = db.sessions.find((s) => s.examId === exam.id && s.studentId === student.id);
    if (session && session.status === 'completed') {
      return res.status(403).json({ error: 'Siswa sudah menyelesaikan ujian ini.' });
    }

    if (!session) {
      // Calculate server deadline based on duration
      const now = new Date();
      const durationMs = exam.durationMinutes * 60 * 1000;
      const calculatedDeadline = new Date(now.getTime() + durationMs);
      const examEnd = new Date(exam.endTime);

      // Cannot exceed exam end window
      const finalDeadline = calculatedDeadline < examEnd ? calculatedDeadline : examEnd;

      // Question order
      let questionOrder = exam.questions.map((q: any) => q.id);
      if (exam.shuffleQuestions) {
        questionOrder = [...questionOrder].sort(() => Math.random() - 0.5);
      }

      session = {
        id: `ses_${Date.now()}_${student.nis}`,
        examId: exam.id,
        schoolId: exam.schoolId,
        studentId: student.id,
        studentName: student.fullName,
        nis: student.nis,
        gradeClass: student.gradeClass,
        startedAt: now.toISOString(),
        serverDeadline: finalDeadline.toISOString(),
        status: 'in_progress',
        answers: {},
        questionOrder,
        violations: [],
        lastHeartbeat: now.toISOString(),
        graded: false,
        essayGraded: false,
      };

      db.sessions.push(session);
      writeDb(db);
    } else {
      // Resume existing session
      session.lastHeartbeat = new Date().toISOString();
      writeDb(db);
    }

    // Prepare questions (sanitized without answer keys)
    const sanitizedQuestions = exam.questions.map((q: any) => {
      let options = q.options;
      if (exam.shuffleOptions && options?.length > 0) {
        options = [...options].sort(() => Math.random() - 0.5);
      }
      return {
        id: q.id,
        number: q.number,
        type: q.type,
        text: q.text,
        images: q.images,
        tables: q.tables,
        options: options.map((opt: any) => ({ key: opt.key, text: opt.text, imageUrl: opt.imageUrl })),
        scoreWeight: q.scoreWeight,
      };
    });

    res.json({
      session: {
        id: session.id,
        startedAt: session.startedAt,
        serverDeadline: session.serverDeadline,
        answers: session.answers,
        questionOrder: session.questionOrder,
      },
      questions: sanitizedQuestions,
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
      },
    });
  });

  // Step 3: Atomic Answer Save
  app.post('/api/student-exam/save-answer', (req, res) => {
    const { sessionId, questionId, selectedOption, essayAnswer, markedForReview } = req.body;
    if (!sessionId || !questionId) {
      return res.status(400).json({ error: 'Session dan ID soal diperlukan.' });
    }

    const db = readDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });

    if (session.status !== 'in_progress') {
      return res.status(403).json({ error: 'Sesi ujian telah selesai atau terkunci.' });
    }

    // Check server deadline
    if (new Date() > new Date(session.serverDeadline)) {
      session.status = 'timed_out';
      writeDb(db);
      return res.status(403).json({ error: 'Waktu ujian telah habis.' });
    }

    if (!session.answers) session.answers = {};
    session.answers[questionId] = {
      questionId,
      selectedOption,
      essayAnswer,
      markedForReview: !!markedForReview,
      answeredAt: new Date().toISOString(),
    };
    session.lastHeartbeat = new Date().toISOString();

    writeDb(db);
    res.json({ success: true, savedAt: new Date().toISOString() });
  });

  // Step 4: Record Anti-Cheat Violation Event
  app.post('/api/student-exam/violation', (req, res) => {
    const { sessionId, type, details } = req.body;
    if (!sessionId || !type) {
      return res.status(400).json({ error: 'Session ID dan tipe pelanggaran diperlukan.' });
    }

    const db = readDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });

    const violation = {
      id: `viol_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sessionId: session.id,
      examId: session.examId,
      studentId: session.studentId,
      studentName: session.studentName,
      gradeClass: session.gradeClass,
      type: type as any,
      details: details || 'Pelanggaran mode ujian terdeteksi',
      timestamp: new Date().toISOString(),
      reviewed: false,
    };

    if (!session.violations) session.violations = [];
    session.violations.push(violation);
    db.violations.push(violation);
    session.lastHeartbeat = new Date().toISOString();

    writeDb(db);
    res.json({ success: true, violationCount: session.violations.length });
  });

  // Step 5: Finish & Submit Exam
  app.post('/api/student-exam/finish', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID diperlukan.' });

    const db = readDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });

    const exam = db.exams.find((e) => e.id === session.examId);

    session.status = 'completed';
    session.submittedAt = new Date().toISOString();

    // Auto-grade objective multiple choice questions
    if (exam) {
      let correctCount = 0;
      let totalMcWeight = 0;
      let totalEarned = 0;

      exam.questions.forEach((q: any) => {
        const ans = session.answers?.[q.id];
        const weight = q.scoreWeight || 2;
        totalMcWeight += weight;

        if (q.type === 'multiple_choice') {
          if (ans?.selectedOption === q.correctAnswer) {
            correctCount++;
            totalEarned += weight;
            if (ans) ans.isCorrect = true;
          } else if (ans) {
            ans.isCorrect = false;
          }
        }
      });

      const mcScore = totalMcWeight > 0 ? Math.round((totalEarned / totalMcWeight) * 100) : 0;
      session.totalScore = mcScore;
      session.graded = true;
    }

    writeDb(db);
    res.json({
      success: true,
      message: 'Ujian berhasil diselesaikan dan seluruh jawaban tersimpan permanen.',
      submittedAt: session.submittedAt,
      showScore: exam?.showScoreToStudent,
      score: exam?.showScoreToStudent ? session.totalScore : undefined,
    });
  });

  // Step 6: Heartbeat & sync session state
  app.get('/api/student-exam/session/:sessionId', (req, res) => {
    const db = readDb();
    const session = db.sessions.find((s) => s.id === req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });

    session.lastHeartbeat = new Date().toISOString();
    writeDb(db);

    const now = new Date();
    const deadline = new Date(session.serverDeadline);
    const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

    res.json({
      status: session.status,
      remainingSeconds,
      serverTime: now.toISOString(),
      answeredCount: Object.keys(session.answers || {}).length,
    });
  });

  // Mount Vite middleware for dev or serve dist in prod
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ISTAFA EXAM] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ISTAFA EXAM] Fatal server startup error:', err);
});
