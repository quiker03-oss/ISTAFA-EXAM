export type UserRole = 'super_admin' | 'school_admin';

export interface School {
  id: string;
  npsn: string;
  name: string;
  educationLevel: 'SD' | 'MI' | 'SMP' | 'MTs' | 'SMA' | 'MA' | 'SMK' | 'Lainnya';
  address: string;
  subdistrict: string;
  city: string;
  province: string;
  postalCode: string;
  principalName: string;
  principalNip: string;
  logoUrl?: string;
  regionalLogoUrl?: string;
  phone: string;
  email: string;
  website?: string;
  academicYear: string; // e.g. "2024/2025"
  semester: 'Ganjil' | 'Genap';
  letterheadText?: string;
  status: 'active' | 'pending_approval' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolId?: string; // null for super_admin
  createdAt: string;
  lastLogin?: string;
}

export interface Student {
  id: string;
  schoolId: string;
  nis: string;
  nisn?: string;
  fullName: string;
  gender: 'L' | 'P';
  gradeClass: string; // e.g. "X IPA 1"
  rombel?: string;
  academicYear: string;
  participantCode: string; // unique exam participant code
  status: 'active' | 'inactive';
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = 'multiple_choice' | 'essay' | 'true_false' | 'short_answer';

export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
  imageUrl?: string;
}

export interface QuestionItem {
  id: string;
  schoolId: string;
  subject: string;
  gradeClass: string;
  number: number;
  type: QuestionType;
  text: string;
  images?: string[];
  tables?: string[];
  options: QuestionOption[];
  correctAnswer: string; // 'A', 'B', etc. or keyword for short answer
  scoreWeight: number; // default: 1 or 2
  explanation?: string;
  sourcePage?: number;
  extractionStatus?: 'valid' | 'needs_review' | 'warning';
  createdAt: string;
}

export interface Exam {
  id: string;
  schoolId: string;
  title: string;
  subject: string;
  gradeClass: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  examCode: string; // token or passcode e.g. "MAT-101"
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationMinutes: number;
  lateToleranceMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  kkm: number; // passing grade e.g. 75
  maxScore: number;
  showScoreToStudent: boolean;
  showDiscussionToStudent: boolean;
  status: 'draft' | 'scheduled' | 'active' | 'finished';
  allowedClasses?: string[];
  allowedStudentIds?: string[];
  tokenActive?: boolean;
  questions: QuestionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ViolationEvent {
  id: string;
  sessionId: string;
  examId: string;
  studentId: string;
  studentName: string;
  gradeClass: string;
  type: 'tab_switch' | 'window_blur' | 'fullscreen_exit' | 'devtools_opened' | 'multiple_window';
  details: string;
  timestamp: string;
  reviewed: boolean;
}

export interface StudentAnswer {
  questionId: string;
  selectedOption?: string;
  essayAnswer?: string;
  isCorrect?: boolean;
  scoreAwarded?: number;
  answeredAt: string;
  markedForReview?: boolean; // ragu-ragu
}

export interface ExamSession {
  id: string;
  examId: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  nis: string;
  gradeClass: string;
  startedAt: string;
  submittedAt?: string;
  serverDeadline: string;
  status: 'in_progress' | 'completed' | 'terminated' | 'timed_out';
  answers: Record<string, StudentAnswer>;
  questionOrder: string[]; // randomized or ordered question IDs
  violations: ViolationEvent[];
  lastHeartbeat: string;
  totalScore?: number;
  graded: boolean;
  essayGraded: boolean;
  notes?: string;
}

export interface BeritaAcara {
  id: string;
  examId: string;
  schoolId: string;
  examTitle: string;
  subject: string;
  gradeClass: string;
  dayDate: string;
  timeRange: string;
  totalRegistered: number;
  totalPresent: number;
  totalAbsent: number;
  absentStudentsNote: string;
  incidentNotes: string;
  headProctorName: string;
  proctorNip?: string;
  principalName: string;
  principalNip?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolSettings {
  schoolId: string;
  antiCheatSensitivity: 'low' | 'medium' | 'strict';
  maxViolationsBeforeWarning: number;
  maxViolationsBeforeLockout: number;
  enableSoundAlerts: boolean;
  enableTtsAlerts: boolean;
  allowResumeOnDisconnect: boolean;
  requireFullscreen: boolean;
  watermarkOnExamScreen: boolean;
}
