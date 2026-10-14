import { parseIndonesianExamQuestions, validateQuestionSet, DocumentBlock } from '../server/documentParser.ts';

console.log('=== TEST 1: 10 Soal Pilihan Ganda + 5 Soal Uraian (Total 15 Soal) ===');

const sampleExamDocumentText = `
PEMERINTAH PROVINSI DKI JAKARTA
DINAS PENDIDIKAN
PENILAIAN AKHIR SEMESTER (PAS) TAHUN 2024/2025
Mata Pelajaran: Ilmu Pengetahuan Alam (IPA)
Kelas: X (Sepuluh)
Waktu: 90 Menit

PETUNJUK UMUM:
1. Periksalah naskah soal sebelum mengerjakan.
2. Jawablah soal-soal berikut dengan teliti.

BAGIAN I. SOAL PILIHAN GANDA
Pilihlah salah satu jawaban yang paling tepat!

1. Satuan internasional (SI) untuk besaran suhu adalah...
A. Celcius
B. Fahrenheit
C. Kelvin
D. Reamur
E. Rankine

2. Sebuah mobil bergerak lurus beraturan dengan kecepatan 20 m/s selama 10 detik. Jarak yang ditempuh mobil tersebut adalah...
A. 100 meter
B. 150 meter
C. 200 meter
D. 250 meter
E. 300 meter

3. Perhatikan pilihan berikut. Manakah yang merupakan contoh perubahan fisika?
A. Kertas dibakar menjadi abu
B. Es mencair menjadi air
C. Besi berkarat
D. Singkong menjadi tape
E. Kayu lapuk

4. Rumus kimia dari senyawa asam cuka yang biasa digunakan di rumah tangga adalah...
A. HCl   B. H2SO4   C. CH3COOH   D. NaOH   E. NaCl

5. Organel sel yang berfungsi sebagai tempat respirasi seluler dan penghasil energi ATP adalah...
A. Ribosom
B. Mitokondria
C. Lisosom
D. Badan Golgi
E. Retikulum Endoplasma

6. Di bawah ini yang bukan merupakan gas rumah kaca penyebab pemanasan global adalah...
A. Karbon dioksida (CO2)
B. Metana (CH4)
C. Oksigen (O2)
D. Dinitrogen oksida (N2O)
E. Klorofluorokarbon (CFC)

7. Percepatan gravitasi bumi di permukaan laut secara umum bernilai sekitar...
A. 8,0 m/s²
B. 9,8 m/s²
C. 10,5 m/s²
D. 12,0 m/s²
E. 15,0 m/s²

8. Pasangan besaran pokok berikut ini yang benar menurut Satuan Internasional adalah...
A. Panjang (meter) dan Massa (kilogram)
B. Berat (Newton) dan Suhu (Celcius)
C. Waktu (menit) dan Arus (Ampere)
D. Intensitas Cahaya (watt) dan Massa (gram)
E. Luas (m²) dan Volume (m³)

9. Suatu benda bermassa 2 kg ditarik dengan gaya 10 N pada lantai licin. Percepatan benda tersebut adalah...
A. 2 m/s²   B. 5 m/s²   C. 10 m/s²   D. 20 m/s²   E. 0,2 m/s²

10. Simbiosis antara ikan badut dan anemon laut merupakan contoh dari interaksi...
A. Parasitisme
B. Komensalisme
C. Mutualisme
D. Predasi
E. Amensalisme

BAGIAN II. SOAL URAIAN / ESSAY
Jawablah pertanyaan berikut dengan singkat, tepat, dan jelas!

11. Jelaskan perbedaan mendasar antara pembelahan sel secara mitosis dan meiosis dilihat dari jumlah sel anakan dan kromosomnya!

12. Sebutkan dan jelaskan 3 faktor utama yang mempengaruhi laju fotosintesis pada tumbuhan hijau!

13. Sebuah balok memiliki panjang 10 cm, lebar 5 cm, dan tinggi 4 cm. Jika massa balok tersebut adalah 400 gram, hitunglah massa jenis balok tersebut dalam satuan g/cm³!

14. Uraikan dampak negatif dari pencemaran limbah plastik terhadap ekosistem perairan dan sebutkan 2 solusi nyata untuk menguranginya!

15. Mengapa lapisan ozon pada atmosfer sangat penting bagi kelangsungan hidup makhluk hidup di bumi? Jelaskan mekanisme perlindungannya!

KUNCI JAWABAN:
1. C
2. C
3. B
4. C
5. B
6. C
7. B
8. A
9. B
10. C
`;

const questions = parseIndonesianExamQuestions([], sampleExamDocumentText);

console.log(`-> Total Soal Terbaca: ${questions.length}`);
console.log(`-> Pilihan Ganda: ${questions.filter(q => q.type === 'multiple_choice').length}`);
console.log(`-> Soal Uraian: ${questions.filter(q => q.type === 'essay').length}`);

const validation = validateQuestionSet(questions, 15);
if (questions.length === 15 && validation.warnings.length === 0) {
  console.log('===> TEST 1 PASSED: SEMUA 15 SOAL (10 PG + 5 ESSAY) LOLOS UJI DENGAN SEMPURNA! <===');
} else {
  console.error('TEST 1 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 2: Presisi Penempatan Gambar pada Soal Terkait ===');

const blocksWithImages: DocumentBlock[] = [
  { text: 'SOAL UJIAN GEOGRAFI', images: [] },
  { text: '1. Perhatikan peta kontur di bawah ini!', images: ['/uploads/peta-kontur.png'] },
  { text: 'A. Lereng curam', images: [] },
  { text: 'B. Lereng landai', images: [] },
  { text: 'C. Puncak gunung', images: [] },
  { text: 'D. Lembah sungai', images: [] },
  { text: '2. Negara dengan jumlah penduduk terbanyak di dunia adalah...', images: [] },
  { text: 'A. India   B. China   C. Amerika Serikat   D. Indonesia', images: [] },
  { text: '3. Perhatikan gambar siklus air berikut!', images: [] },
  { text: 'Tahapan yang ditunjukkan oleh huruf X pada gambar di atas adalah...', images: ['/uploads/siklus-air.png'] },
  { text: 'A. Evaporasi   B. Kondensasi   C. Presipitasi   D. Infiltrasi', images: [] },
];

const parsedImgQuestions = parseIndonesianExamQuestions(blocksWithImages, '');
console.log(`-> Soal #1 Gambar:`, parsedImgQuestions[0]?.images);
console.log(`-> Soal #2 Gambar:`, parsedImgQuestions[1]?.images);
console.log(`-> Soal #3 Gambar:`, parsedImgQuestions[2]?.images);

if (
  parsedImgQuestions[0]?.images.includes('/uploads/peta-kontur.png') &&
  parsedImgQuestions[1]?.images.length === 0 &&
  parsedImgQuestions[2]?.images.includes('/uploads/siklus-air.png')
) {
  console.log('===> TEST 2 PASSED: GAMBAR TEPAT TERPASANG PADA SOAL #1 DAN #3 (BUKAN MODULO/ACAK)! <===');
} else {
  console.error('TEST 2 FAILED');
  process.exit(1);
}
