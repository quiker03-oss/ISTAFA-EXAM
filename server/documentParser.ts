import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
// @ts-ignore
import mammoth from 'mammoth';
import { createRequire } from 'module';
import { GoogleGenAI } from '@google/genai';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export interface ParsedOption {
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
  imageUrl?: string;
}

export interface ExtractedQuestion {
  number: number;
  type: 'multiple_choice' | 'essay';
  text: string;
  options: ParsedOption[];
  correctAnswer: string;
  images: string[];
  tables: string[];
  scoreWeight: number;
  explanation: string;
  sourcePage?: number;
  extractionStatus: 'valid' | 'needs_review' | 'warning';
  warningMessage?: string;
}

export interface DocumentBlock {
  text: string;
  images: string[];
  isTable?: boolean;
}

export interface ValidationSummary {
  totalFound: number;
  multipleChoiceCount: number;
  essayCount: number;
  missingAnswerKeyCount: number;
  missingOptionCount: number;
  imagesExtractedCount: number;
  needsReviewCount: number;
  sequenceGaps: number[];
  duplicateNumbers: number[];
  warnings: string[];
  isComplete: boolean;
}

// Helper: Clean and normalize text
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
    .replace(/\t/g, ' ')
    .trim();
}

// -------------------------------------------------------------
// 1. DOCX High-Fidelity Block & Image Extraction using JSZip + XML
// -------------------------------------------------------------

export async function extractDocxBlocks(
  filePath: string,
  uploadsDir: string
): Promise<{ blocks: DocumentBlock[]; allImages: string[]; rawText: string }> {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  // A. Extract all images and map relationship IDs
  const relsFile = zip.file('word/_rels/document.xml.rels');
  const relsMap: Record<string, string> = {}; // rId -> /uploads/extracted-xxx.png

  if (relsFile) {
    const relsXml = await relsFile.async('text');
    // Match: <Relationship Id="rId4" Type=".../image" Target="media/image1.png"/>
    const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g;
    let match;
    while ((match = relRegex.exec(relsXml)) !== null) {
      const rId = match[1];
      const target = match[2];
      if (target.includes('media/')) {
        const mediaPath = target.startsWith('media/') ? `word/${target}` : `word/${target.replace(/^\.\.\//, '')}`;
        const imageEntry = zip.file(mediaPath);
        if (imageEntry) {
          const imgBuffer = await imageEntry.async('nodebuffer');
          const ext = path.extname(target) || '.png';
          const uniqueName = `docx-img-${Date.now()}-${Math.round(Math.random() * 1e7)}${ext}`;
          const diskPath = path.join(uploadsDir, uniqueName);
          fs.writeFileSync(diskPath, imgBuffer);
          relsMap[rId] = `/uploads/${uniqueName}`;
        }
      }
    }
  }

  // Also extract any media files not listed in rels
  const allImages: string[] = Object.values(relsMap);
  const mediaFolder = zip.folder('word/media');
  if (mediaFolder) {
    for (const [filename, fileEntry] of Object.entries(mediaFolder.files)) {
      if (!fileEntry.dir) {
        const alreadyExists = allImages.some((url) => url.includes(filename));
        if (!alreadyExists) {
          const imgBuffer = await fileEntry.async('nodebuffer');
          const ext = path.extname(filename) || '.png';
          const uniqueName = `docx-media-${Date.now()}-${Math.round(Math.random() * 1e7)}${ext}`;
          const diskPath = path.join(uploadsDir, uniqueName);
          fs.writeFileSync(diskPath, imgBuffer);
          allImages.push(`/uploads/${uniqueName}`);
        }
      }
    }
  }

  // B. Parse word/document.xml in exact order of paragraphs and tables
  const docXmlFile = zip.file('word/document.xml');
  const blocks: DocumentBlock[] = [];
  let rawText = '';

  if (docXmlFile) {
    const docXml = await docXmlFile.async('text');

    // Split into paragraphs <w:p> and table cells <w:tc>
    const pRegex = /<w:p[\s>]([\s\S]*?)<\/w:p>/g;
    let pMatch;

    while ((pMatch = pRegex.exec(docXml)) !== null) {
      const pContent = pMatch[1];

      // 1. Extract text from <w:t> tags
      const textMatches = pContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const pText = textMatches
        .map((tTag) => {
          const m = /<w:t[^>]*>([^<]*)<\/w:t>/.exec(tTag);
          return m ? m[1] : '';
        })
        .join('')
        .trim();

      // 2. Extract embedded images in this paragraph
      const pImages: string[] = [];
      const embedMatches = pContent.match(/(?:embed|id)="([^"]+)"/g) || [];
      embedMatches.forEach((embedTag) => {
        const m = /(?:embed|id)="([^"]+)"/.exec(embedTag);
        if (m && relsMap[m[1]]) {
          pImages.push(relsMap[m[1]]);
        }
      });

      if (pText.length > 0 || pImages.length > 0) {
        blocks.push({
          text: pText,
          images: pImages,
          isTable: pContent.includes('<w:tcPr'),
        });
        if (pText.length > 0) {
          rawText += `${pText}\n`;
        }
      }
    }
  }

  // Fallback to mammoth if XML parsing yielded nothing
  if (blocks.length === 0) {
    const mammothRes = await mammoth.extractRawText({ buffer });
    rawText = mammothRes.value;
    const lines = rawText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    lines.forEach((l: string) => {
      blocks.push({ text: l, images: [] });
    });
  }

  return { blocks, allImages, rawText };
}

// -------------------------------------------------------------
// 2. Deterministic Indonesian Exam Parsing Engine
// -------------------------------------------------------------

export function parseIndonesianExamQuestions(
  blocks: DocumentBlock[],
  rawTextFallback: string
): ExtractedQuestion[] {
  // Flatten blocks into linear items with associated images
  const items: { text: string; images: string[] }[] = [];

  if (blocks && blocks.length > 0) {
    blocks.forEach((b) => {
      if (b.text.includes('\n')) {
        const subLines = b.text.split('\n').map((s) => s.trim()).filter(Boolean);
        subLines.forEach((sl, idx) => {
          items.push({
            text: sl,
            images: idx === 0 ? b.images : [], // attach images to first line of block
          });
        });
      } else if (b.text.length > 0 || b.images.length > 0) {
        items.push({ text: b.text, images: b.images });
      }
    });
  } else {
    const lines = rawTextFallback.split('\n').map((l) => l.trim()).filter(Boolean);
    lines.forEach((l) => items.push({ text: l, images: [] }));
  }

  const questions: ExtractedQuestion[] = [];
  let currentQ: ExtractedQuestion | null = null;
  let currentSection: 'multiple_choice' | 'essay' = 'multiple_choice';

  // Standalone Answer Key map parsed from the bottom of document
  const answerKeyMap: Record<number, string> = {};

  // Regex Patterns
  // Section Headers
  // Section Headers
  const essaySectionRegex = /(?:bagian\s+[b-z]|bagian\s+ii|soal\s+uraian|soal\s+essay|soal\s+esai|b\.\s*soal\s+uraian|b\.\s*soal\s+essay|ii\.\s*soal\s+uraian)/i;
  const mcSectionRegex = /(?:bagian\s+a|bagian\s+i|soal\s+pilihan\s+ganda|pilihlah\s+salah\s+satu|a\.\s*soal\s+pilihan\s+ganda|i\.\s*pilihan\s+ganda)/i;
  const instructionHeaderRegex = /^(?:petunjuk\s+umum|petunjuk\s+khusus|petunjuk\s+pengerjaan|tata\s+tertib)/i;
  const generalHeaderRegex = /^(?:ulangan|penilaian|ujian|nama\s*:|kelas\s*:|mata\s+pelajaran\s*:|waktu\s*:|tahun\s+pelajaran\s*:)/i;
  const answerKeySectionHeaderRegex = /^(?:kunci\s+jawaban|kunci\s+soal|kunci\s*:)/i;

  let inInstructionBlock = false;
  let inAnswerKeyBlock = false;

  // Question Start: "1.", "1)", "(1)", "Soal 1.", "No. 1", "1 .", "1.1"
  // Must be at line start, number between 1 and 200, followed by dot/paren/colon
  const qStartRegex = /^(?:(?:soal|no|nomor)\.?\s*)?\(?(\d{1,3})\)?[\.\)\:]\s*(.*)$/i;

  // Single Option: "A. ...", "A) ...", "(A) ...", "[A] ..."
  const singleOptRegex = /^\(?([A-Ea-e])\)?[\.\)\]\:]\s*(.*)$/;

  // Multi-option line: e.g. "A. 10 cm   B. 20 cm   C. 30 cm   D. 40 cm"
  const multiOptRegex = /(?:^|\s+)\(?([A-Ea-e])\)?[\.\)\]\:]\s*([^\n\r]*?)(?=(?:\s+\(?[B-Eb-e]\)?[\.\)\]\:]\s*|$))/g;

  // Answer Key line: "Kunci: A", "Kunci Jawaban: B", "Jawaban: C", "Kunci = A"
  const keyRegex = /^(?:kunci\s*jawaban|kunci|jawaban|answer|key)\s*[:=]\s*([A-Ea-e])/i;

  // Pre-scan for Bottom Answer Key Table Block
  const bottomKeyBlockRegex = /(?:kunci\s+jawaban|kunci\s+soal)[\s\S]*$/i;
  const bottomKeyMatch = rawTextFallback.match(bottomKeyBlockRegex);
  if (bottomKeyMatch) {
    const keySectionText = bottomKeyMatch[0];
    const pairRegex = /(\d{1,3})[\.\)\:\s]+([A-Ea-e])/g;
    let km;
    while ((km = pairRegex.exec(keySectionText)) !== null) {
      const qNum = parseInt(km[1], 10);
      const kVal = km[2].toUpperCase();
      answerKeyMap[qNum] = kVal;
    }
  }

  // Process items sequentially
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const line = item.text.trim();
    const images = item.images || [];

    if (!line && images.length === 0) continue;

    // A. Check if line marks the start of the Answer Key Block
    if (answerKeySectionHeaderRegex.test(line)) {
      if (currentQ) {
        finalizeQuestion(currentQ, currentSection);
        questions.push(currentQ);
        currentQ = null;
      }
      inAnswerKeyBlock = true;
      continue;
    }

    // If currently in Answer Key Block, do not parse questions
    if (inAnswerKeyBlock) {
      const pairRegex = /(\d{1,3})[\.\)\:\s]+([A-Ea-e])/g;
      let km;
      while ((km = pairRegex.exec(line)) !== null) {
        const qNum = parseInt(km[1], 10);
        const kVal = km[2].toUpperCase();
        answerKeyMap[qNum] = kVal;
      }
      continue;
    }

    // B. Check if line is an Instruction Header
    if (instructionHeaderRegex.test(line)) {
      inInstructionBlock = true;
      continue;
    }

    // C. Check Section Headers
    if (essaySectionRegex.test(line)) {
      inInstructionBlock = false;
      currentSection = 'essay';
      continue;
    }
    if (mcSectionRegex.test(line)) {
      inInstructionBlock = false;
      currentSection = 'multiple_choice';
      continue;
    }
    if (generalHeaderRegex.test(line) && !qStartRegex.test(line)) {
      continue;
    }

    // D. While inside instruction block, ignore numbered instructions
    if (inInstructionBlock) {
      // If line is not a section header, ignore instruction lines
      continue;
    }

    // 2. Check if line is an answer key for current question
    const keyMatch = line.match(keyRegex);
    if (keyMatch && currentQ) {
      currentQ.correctAnswer = keyMatch[1].toUpperCase();
      continue;
    }

    // 3. Check if line starts a New Question
    const qMatch = line.match(qStartRegex);
    // Disqualify if it looks like an option e.g. "A." or roman numeral header
    const isActuallyOption = singleOptRegex.test(line) && !/^\d/.test(line);

    if (qMatch && !isActuallyOption) {
      const detectedNum = parseInt(qMatch[1], 10);
      const remainingText = qMatch[2].trim();

      // Ensure number makes sense (e.g. not year like 1945. or date)
      if (detectedNum > 0 && detectedNum <= 250) {
        if (currentQ) {
          finalizeQuestion(currentQ, currentSection);
          questions.push(currentQ);
        }

        currentQ = {
          number: detectedNum,
          type: currentSection,
          text: remainingText,
          options: [],
          correctAnswer: answerKeyMap[detectedNum] || '',
          images: [...images],
          tables: [],
          scoreWeight: currentSection === 'essay' ? 5 : 2,
          explanation: '',
          extractionStatus: 'valid',
        };
        continue;
      }
    }

    // 4. Check if line has Options
    // First, check multi-option line: e.g. "A. 10   B. 20   C. 30   D. 40"
    const hasMultipleOptions = (line.match(/(?:^|\s+)[A-Ea-e][\.\)]/g) || []).length >= 2;

    if (hasMultipleOptions && currentQ) {
      const optionMatches: ParsedOption[] = [];
      const optSplitRegex = /(?:^|\s+)\(?([A-Ea-e])\)?[\.\)\]\:]\s*([^\n\r]*?)(?=(?:\s+\(?[A-Ea-e]\)?[\.\)\]\:]\s*|$))/g;
      let om;
      while ((om = optSplitRegex.exec(line)) !== null) {
        const key = om[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
        const optText = om[2].trim();
        optionMatches.push({ key, text: optText });
      }

      if (optionMatches.length >= 2) {
        currentQ.type = 'multiple_choice';
        optionMatches.forEach((opt) => {
          // Avoid duplicate option keys
          if (!currentQ!.options.some((o) => o.key === opt.key)) {
            currentQ!.options.push(opt);
          }
        });
        if (images.length > 0) {
          currentQ.images.push(...images);
        }
        continue;
      }
    }

    // Check single option: "A. Text"
    const singleOptMatch = line.match(singleOptRegex);
    if (singleOptMatch && currentQ) {
      const key = singleOptMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
      const optText = singleOptMatch[2].trim();

      currentQ.type = 'multiple_choice';
      if (!currentQ.options.some((o) => o.key === key)) {
        currentQ.options.push({ key, text: optText });
      }
      if (images.length > 0) {
        currentQ.images.push(...images);
      }
      continue;
    }

    // 5. Otherwise: text or images belong to current question
    if (currentQ) {
      if (images.length > 0) {
        currentQ.images.push(...images);
      }
      if (line.length > 0) {
        if (currentQ.options.length > 0) {
          // Append to the last option if we are in options
          currentQ.options[currentQ.options.length - 1].text += ` ${line}`;
        } else {
          // Append to question text
          currentQ.text += currentQ.text ? `\n${line}` : line;
        }
      }
    }
  }

  if (currentQ) {
    finalizeQuestion(currentQ, currentSection);
    questions.push(currentQ);
  }

  // Second pass: apply answer keys from bottom table if still missing
  questions.forEach((q) => {
    if (!q.correctAnswer && answerKeyMap[q.number]) {
      q.correctAnswer = answerKeyMap[q.number];
    }
  });

  // Ensure all question numbers are unique and sequential (handles Part I & Part II restarts)
  const seenNumbers = new Set<number>();
  let hasDuplicateNumbers = false;
  for (const q of questions) {
    if (seenNumbers.has(q.number)) {
      hasDuplicateNumbers = true;
      break;
    }
    seenNumbers.add(q.number);
  }

  if (hasDuplicateNumbers) {
    questions.forEach((q, idx) => {
      q.number = idx + 1;
    });
  }

  return questions;
}

function finalizeQuestion(q: ExtractedQuestion, activeSection: 'multiple_choice' | 'essay') {
  // Ensure options have unique keys
  const seenOptionKeys = new Set<string>();
  const uniqueOptions: ParsedOption[] = [];
  for (const opt of q.options) {
    if (!seenOptionKeys.has(opt.key)) {
      seenOptionKeys.add(opt.key);
      uniqueOptions.push(opt);
    }
  }
  q.options = uniqueOptions;

  // If in essay section, force essay
  if (activeSection === 'essay' && q.options.length === 0) {
    q.type = 'essay';
  } else if (q.options.length === 0) {
    // Check if it's an essay question by keywords
    const essayKeywords = /(?:jelaskan|sebutkan|uraikan|bagaimana|mengapa|hitunglah|tuliskan|tentukan|analisislah|buktikan)/i;
    if (essayKeywords.test(q.text)) {
      q.type = 'essay';
    } else {
      q.type = 'essay'; // default to essay if 0 options
    }
  } else {
    q.type = 'multiple_choice';
  }

  // Sort options A, B, C, D, E
  if (q.options.length > 0) {
    q.options.sort((a, b) => a.key.localeCompare(b.key));
  }

  // Validate answer key
  if (q.type === 'multiple_choice') {
    if (!q.correctAnswer && q.options.length > 0) {
      q.extractionStatus = 'needs_review';
      q.warningMessage = 'Kunci jawaban belum terdeteksi otomatis. Silakan pilih kunci.';
    } else if (q.options.length < 3) {
      q.extractionStatus = 'warning';
      q.warningMessage = `Hanya ${q.options.length} pilihan jawaban yang terdeteksi.`;
    }
  }

  // Check empty question text
  if (!q.text.trim()) {
    q.extractionStatus = 'warning';
    q.warningMessage = 'Teks pertanyaan kosong atau hanya berisi gambar.';
  }
}

// -------------------------------------------------------------
// 3. Controlled Gemini AI Parsing Assistant (@google/genai)
// -------------------------------------------------------------

export async function parseWithGeminiAssistant(
  rawText: string,
  existingQuestions: ExtractedQuestion[]
): Promise<ExtractedQuestion[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[AI Parser] GEMINI_API_KEY not found, using deterministic parser results.');
    return null;
  }

  try {
    const ai = new GoogleGenAI();
    const prompt = `Anda adalah parser naskah ujian online berstandar nasional Indonesia untuk platform ISTAFA EXAM.
Tugas Anda adalah membaca teks naskah ujian berikut dan mengekstrak SELURUH butir soal (baik Pilihan Ganda maupun Uraian/Esai) tanpa memotong, mengarang, atau menghilangkan nomor soal dan pilihan jawaban.

Aturan Penting:
1. Ekstrak SEMUA soal secara berurutan sesuai teks asli (Pilihan Ganda 1..N dan Esai 1..M).
2. Untuk Pilihan Ganda: pisahkan pertanyaan dan pilihan A, B, C, D, dan E secara lengkap.
3. Untuk Soal Uraian/Esai: tandai type sebagai "essay" dan simpan pertanyaan lengkapnya.
4. Kunci jawaban: Jika ada di teks (misal: "Kunci: A" atau tabel kunci di akhir), sertakan pada correctAnswer. Jika tidak ada, kosongkan ("").
5. Jangan mengubah nomor urut soal atau menghapus butir soal.

Naskah Ujian:
"""
${rawText.slice(0, 30000)}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              number: { type: 'INTEGER' },
              type: { type: 'STRING', enum: ['multiple_choice', 'essay'] },
              text: { type: 'STRING' },
              options: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    key: { type: 'STRING', enum: ['A', 'B', 'C', 'D', 'E'] },
                    text: { type: 'STRING' },
                  },
                  required: ['key', 'text'],
                },
              },
              correctAnswer: { type: 'STRING' },
              scoreWeight: { type: 'NUMBER' },
              explanation: { type: 'STRING' },
            },
            required: ['number', 'type', 'text', 'options'],
          },
        },
      },
    });

    const aiOutput = response.text;
    if (!aiOutput) return null;

    const parsed: any[] = JSON.parse(aiOutput);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Map AI output to ExtractedQuestion structure and associate any existing extracted images
    const aiQuestions: ExtractedQuestion[] = parsed.map((item, idx) => {
      const originalMatch = existingQuestions.find((eq) => eq.number === item.number);
      const images = originalMatch ? originalMatch.images : [];

      const opts: ParsedOption[] = (item.options || []).map((o: any) => ({
        key: o.key as 'A' | 'B' | 'C' | 'D' | 'E',
        text: o.text || '',
      }));

      const qType = item.type === 'essay' || opts.length === 0 ? 'essay' : 'multiple_choice';

      return {
        number: item.number || idx + 1,
        type: qType,
        text: item.text || '',
        options: opts,
        correctAnswer: item.correctAnswer || originalMatch?.correctAnswer || '',
        images: images,
        tables: [],
        scoreWeight: item.scoreWeight || (qType === 'essay' ? 5 : 2),
        explanation: item.explanation || '',
        extractionStatus: !item.text ? 'warning' : qType === 'multiple_choice' && !item.correctAnswer ? 'needs_review' : 'valid',
      };
    });

    // Ensure all question numbers are unique and sequential
    const seenAiNumbers = new Set<number>();
    let hasAiDuplicates = false;
    for (const q of aiQuestions) {
      if (seenAiNumbers.has(q.number)) {
        hasAiDuplicates = true;
        break;
      }
      seenAiNumbers.add(q.number);
    }
    if (hasAiDuplicates) {
      aiQuestions.forEach((q, idx) => {
        q.number = idx + 1;
      });
    }

    return aiQuestions;
  } catch (err) {
    console.warn('[AI Parser] Error invoking Gemini API assistant:', err);
    return null;
  }
}

// -------------------------------------------------------------
// 4. OCR Support for Scanned PDFs and Images using Tesseract
// -------------------------------------------------------------

export async function extractOcrFromImage(filePath: string): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('ind+eng');
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    return ret.data.text || '';
  } catch (err) {
    console.error('[OCR Engine] Tesseract OCR failed:', err);
    return '';
  }
}

// -------------------------------------------------------------
// 5. Automated Pre-Publication Validation
// -------------------------------------------------------------

export function validateQuestionSet(
  questions: ExtractedQuestion[],
  expectedCount?: number
): ValidationSummary {
  const warnings: string[] = [];
  const numbers = questions.map((q) => q.number);
  const duplicates: number[] = [];
  const sequenceGaps: number[] = [];

  // Check duplicates
  const seenNumbers = new Set<number>();
  numbers.forEach((n) => {
    if (seenNumbers.has(n)) {
      duplicates.push(n);
    } else {
      seenNumbers.add(n);
    }
  });

  if (duplicates.length > 0) {
    warnings.push(`Ditemukan nomor soal ganda: Nomor ${[...new Set(duplicates)].join(', ')}.`);
  }

  // Check sequence gaps (e.g. 1, 2, 4 -> 3 missing)
  if (numbers.length > 1) {
    const sorted = [...new Set(numbers)].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] !== sorted[i] + 1) {
        for (let gap = sorted[i] + 1; gap < sorted[i + 1]; gap++) {
          sequenceGaps.push(gap);
        }
      }
    }
  }

  if (sequenceGaps.length > 0) {
    warnings.push(`Urutan nomor soal melompat! Nomor yang tidak ditemukan: ${sequenceGaps.join(', ')}.`);
  }

  // Check multiple choice missing options
  const missingOptions = questions.filter(
    (q) => q.type === 'multiple_choice' && q.options.length < 3
  );
  if (missingOptions.length > 0) {
    warnings.push(
      `${missingOptions.length} soal pilihan ganda memiliki pilihan jawaban tidak lengkap (< 3 pilihan): Soal nomor ${missingOptions.map((q) => q.number).join(', ')}.`
    );
  }

  // Check missing answer keys
  const missingKeys = questions.filter(
    (q) => q.type === 'multiple_choice' && !q.correctAnswer
  );
  if (missingKeys.length > 0) {
    warnings.push(
      `${missingKeys.length} soal pilihan ganda belum memiliki kunci jawaban.`
    );
  }

  // Check empty question texts
  const emptyTexts = questions.filter((q) => !q.text.trim());
  if (emptyTexts.length > 0) {
    warnings.push(`Ditemukan ${emptyTexts.length} soal dengan teks pertanyaan kosong.`);
  }

  // Check expected count mismatch
  if (expectedCount && expectedCount > 0 && questions.length !== expectedCount) {
    warnings.push(
      `Perbedaan jumlah: Anda memperkirakan ${expectedCount} soal, namun sistem mendeteksi ${questions.length} soal.`
    );
  }

  const mcCount = questions.filter((q) => q.type === 'multiple_choice').length;
  const essayCount = questions.filter((q) => q.type === 'essay').length;
  const totalImages = questions.reduce((sum, q) => sum + (q.images?.length || 0), 0);

  return {
    totalFound: questions.length,
    multipleChoiceCount: mcCount,
    essayCount,
    missingAnswerKeyCount: missingKeys.length,
    missingOptionCount: missingOptions.length,
    imagesExtractedCount: totalImages,
    needsReviewCount: questions.filter((q) => q.extractionStatus !== 'valid').length,
    sequenceGaps,
    duplicateNumbers: [...new Set(duplicates)],
    warnings,
    isComplete: questions.length > 0 && warnings.length === 0,
  };
}
