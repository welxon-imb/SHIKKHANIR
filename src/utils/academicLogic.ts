import type {
  AcademicClassId,
  AttendanceRecord,
  ExamResult,
  InvoiceStatus,
  MonthlyInvoice,
  SubjectMark,
} from '../types';

export const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
] as const;

export function toBengaliDigits(value: string | number): string {
  const map: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
  };
  return String(value).replace(/[0-9]/g, (d) => map[d] ?? d);
}

export function formatTaka(amount: number): string {
  return `৳${toBengaliDigits(amount.toLocaleString('en-IN'))}`;
}

export function formatBengaliOrdinal(rank: number): string {
  const n = Math.floor(rank);
  if (n <= 0) return '-';
  const special: Record<number, string> = {
    1: '১ম',
    2: '২য়',
    3: '৩য়',
    4: '৪র্থ',
    5: '৫ম',
    6: '৬ষ্ঠ',
    7: '৭ম',
    8: '৮ম',
    9: '৯ম',
    10: '১০ম',
  };
  return special[n] ?? `${toBengaliDigits(n)}তম`;
}

export function getClassNameBn(classId: AcademicClassId): string {
  switch (classId) {
    case 'class-8':
      return 'অষ্টম শ্রেণি';
    case 'class-9':
      return 'নবম শ্রেণি';
    case 'class-10':
      return 'দশম শ্রেণি';
    case 'ssc-batch':
      return 'SSC ব্যাচ';
  }
}

/**
 * Bangladesh Secondary (SSC / JSC) 5.00 GPA scale calculation.
 */
export function calculateSubjectGradeAndGpa(
  obtained: number,
  fullMarks: number,
  passMarks?: number
): { gpa: number; grade: string; passed: boolean } {
  if (fullMarks <= 0) {
    return { gpa: 0, grade: 'F', passed: false };
  }
  const effectivePass = passMarks ?? Math.ceil(fullMarks * 0.33);
  if (obtained < effectivePass) {
    return { gpa: 0.0, grade: 'F', passed: false };
  }
  const percentage = (obtained / fullMarks) * 100;
  if (percentage >= 80) return { gpa: 5.0, grade: 'A+', passed: true };
  if (percentage >= 70) return { gpa: 4.0, grade: 'A', passed: true };
  if (percentage >= 60) return { gpa: 3.5, grade: 'A-', passed: true };
  if (percentage >= 50) return { gpa: 3.0, grade: 'B', passed: true };
  if (percentage >= 40) return { gpa: 2.0, grade: 'C', passed: true };
  if (percentage >= 33) return { gpa: 1.0, grade: 'D', passed: true };
  return { gpa: 0.0, grade: 'F', passed: false };
}

export function getOverallGradeFromGpa(gpa: number, passed: boolean): string {
  if (!passed || gpa <= 0) return 'F';
  if (gpa >= 5.0) return 'A+';
  if (gpa >= 4.0) return 'A';
  if (gpa >= 3.5) return 'A-';
  if (gpa >= 3.0) return 'B';
  if (gpa >= 2.0) return 'C';
  if (gpa >= 1.0) return 'D';
  return 'F';
}

export function compileStudentResult(
  marksInput: Array<{
    subjectName: string;
    fullMarks: number;
    passMarks: number;
    obtainedMarks: number;
    remarks?: string;
  }>
): {
  subjectMarks: SubjectMark[];
  totalFullMarks: number;
  totalObtained: number;
  gpa: number;
  grade: string;
  passed: boolean;
} {
  let totalFullMarks = 0;
  let totalObtained = 0;
  let gpaSum = 0;
  let allPassed = marksInput.length > 0;

  const subjectMarks: SubjectMark[] = marksInput.map((item) => {
    const safeObtained = Math.max(0, Math.min(item.fullMarks, item.obtainedMarks));
    const { gpa, grade, passed } = calculateSubjectGradeAndGpa(
      safeObtained,
      item.fullMarks,
      item.passMarks
    );
    if (!passed) {
      allPassed = false;
    }
    totalFullMarks += item.fullMarks;
    totalObtained += safeObtained;
    gpaSum += gpa;
    return {
      subjectName: item.subjectName,
      fullMarks: item.fullMarks,
      passMarks: item.passMarks,
      obtainedMarks: safeObtained,
      gpa,
      grade,
      remarks: item.remarks,
    };
  });

  const finalGpa =
    allPassed && subjectMarks.length > 0
      ? Number((gpaSum / subjectMarks.length).toFixed(2))
      : 0.0;
  const finalGrade = getOverallGradeFromGpa(finalGpa, allPassed);

  return {
    subjectMarks,
    totalFullMarks,
    totalObtained,
    gpa: finalGpa,
    grade: finalGrade,
    passed: allPassed,
  };
}

/**
 * Tie-breaking rule:
 * 1. Pass status (passed > failed)
 * 2. Higher Total Obtained Marks
 * 3. Higher GPA
 * 4. Higher combined Math + English marks
 * 5. Lower Roll Number (ascending)
 */
export function compareForMeritRanking(a: ExamResult, b: ExamResult): number {
  if (a.passed !== b.passed) return a.passed ? -1 : 1;
  if (b.totalObtained !== a.totalObtained) return b.totalObtained - a.totalObtained;
  if (b.gpa !== a.gpa) return b.gpa - a.gpa;

  const coreScore = (res: ExamResult) =>
    res.subjectMarks
      .filter((m) => m.subjectName.includes('গণিত') || m.subjectName.includes('ইংরেজি'))
      .reduce((acc, m) => acc + m.obtainedMarks, 0);

  const coreDiff = coreScore(b) - coreScore(a);
  if (coreDiff !== 0) return coreDiff;

  return a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true });
}

export function assignMeritRanks(results: ExamResult[]): ExamResult[] {
  const byExamClass = new Map<string, ExamResult[]>();
  for (const r of results) {
    const key = `${r.examId}::${r.classId}`;
    const arr = byExamClass.get(key) ?? [];
    arr.push({ ...r });
    byExamClass.set(key, arr);
  }

  const rankedAll: ExamResult[] = [];
  for (const group of byExamClass.values()) {
    group.sort(compareForMeritRanking);
    group.forEach((item, idx) => {
      item.classRank = idx + 1;
    });

    const byBatch = new Map<string, ExamResult[]>();
    for (const item of group) {
      const bArr = byBatch.get(item.batchId) ?? [];
      bArr.push(item);
      byBatch.set(item.batchId, bArr);
    }
    for (const bGroup of byBatch.values()) {
      bGroup.sort(compareForMeritRanking);
      bGroup.forEach((item, bIdx) => {
        item.batchRank = bIdx + 1;
      });
    }
    rankedAll.push(...group);
  }

  return rankedAll;
}

export function resolveInvoiceStatus(
  amount: number,
  paidAmount: number,
  hasPendingPayment = false
): InvoiceStatus {
  if (paidAmount >= amount && amount > 0) return 'Paid';
  if (hasPendingPayment && paidAmount === 0) return 'Pending';
  if (paidAmount > 0 && paidAmount < amount) return 'Partial';
  return 'Unpaid';
}

export function calculateInvoiceSummary(invoices: MonthlyInvoice[]): {
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
} {
  let totalBilled = 0;
  let totalPaid = 0;
  for (const inv of invoices) {
    totalBilled += inv.amount;
    totalPaid += Math.min(inv.amount, inv.paidAmount);
  }
  return {
    totalBilled,
    totalPaid,
    totalDue: Math.max(0, totalBilled - totalPaid),
  };
}

export function calculateAttendancePercentage(records: AttendanceRecord[]): {
  total: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  leaveCount: number;
  percentage: number;
} {
  const total = records.length;
  if (total === 0) {
    return { total: 0, presentCount: 0, lateCount: 0, absentCount: 0, leaveCount: 0, percentage: 0 };
  }
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  for (const rec of records) {
    if (rec.status === 'Present') presentCount++;
    else if (rec.status === 'Late') lateCount++;
    else if (rec.status === 'Absent') absentCount++;
    else if (rec.status === 'Leave') leaveCount++;
  }
  const effectivePresent = presentCount + lateCount;
  return {
    total,
    presentCount,
    lateCount,
    absentCount,
    leaveCount,
    percentage: Math.round((effectivePresent / total) * 100),
  };
}

export function normalizeBdPhone(phone: string): string {
  return phone.replace(/[\s-]/g, '').replace(/^\+88/, '');
}

export function isValidBdPhone(phone: string): boolean {
  const normalized = normalizeBdPhone(phone);
  return /^01[3-9]\d{8}$/.test(normalized);
}

export function exportRowsToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
