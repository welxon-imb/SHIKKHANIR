import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignMeritRanks,
  calculateAttendancePercentage,
  calculateInvoiceSummary,
  calculateSubjectGradeAndGpa,
  compileStudentResult,
  formatBengaliOrdinal,
  isValidBdPhone,
  resolveInvoiceStatus,
} from './academicLogic';
import type { ExamResult } from '../types';

test('calculateSubjectGradeAndGpa follows Bangladesh 5.00 GPA scale', () => {
  assert.deepEqual(calculateSubjectGradeAndGpa(85, 100, 33), { gpa: 5.0, grade: 'A+', passed: true });
  assert.deepEqual(calculateSubjectGradeAndGpa(72, 100, 33), { gpa: 4.0, grade: 'A', passed: true });
  assert.deepEqual(calculateSubjectGradeAndGpa(60, 100, 33), { gpa: 3.5, grade: 'A-', passed: true });
  assert.deepEqual(calculateSubjectGradeAndGpa(32, 100, 33), { gpa: 0.0, grade: 'F', passed: false });
  assert.deepEqual(calculateSubjectGradeAndGpa(40, 50, 17), { gpa: 5.0, grade: 'A+', passed: true });
});

test('compileStudentResult sets overall GPA to 0.00 if any subject fails', () => {
  const failed = compileStudentResult([
    { subjectName: 'গণিত', fullMarks: 100, passMarks: 33, obtainedMarks: 90 },
    { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33, obtainedMarks: 28 },
  ]);
  assert.equal(failed.passed, false);
  assert.equal(failed.gpa, 0);
  assert.equal(failed.grade, 'F');
  assert.equal(failed.totalObtained, 118);

  const passed = compileStudentResult([
    { subjectName: 'গণিত', fullMarks: 100, passMarks: 33, obtainedMarks: 88 },
    { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33, obtainedMarks: 74 },
  ]);
  assert.equal(passed.passed, true);
  assert.equal(passed.gpa, 4.5);
  assert.equal(passed.grade, 'A');
});

test('assignMeritRanks applies tie-breaking rules deterministically', () => {
  const base: Omit<ExamResult, 'id' | 'studentId' | 'studentCode' | 'studentName' | 'rollNumber' | 'subjectMarks' | 'totalObtained' | 'gpa' | 'classRank' | 'batchRank'> = {
    examId: 'ex-1',
    examTitle: 'মডেল টেস্ট',
    classId: 'class-10',
    batchId: 'batch-10-a',
    academicYear: 2026,
    totalFullMarks: 200,
    grade: 'A+',
    passed: true,
    isPublished: true,
  };

  const r1: ExamResult = {
    ...base,
    id: 'r1',
    studentId: 's1',
    studentCode: 'SHK-1',
    studentName: 'আরিফ',
    rollNumber: '02',
    totalObtained: 170,
    gpa: 5.0,
    classRank: 0,
    batchRank: 0,
    subjectMarks: [
      { subjectName: 'গণিত', fullMarks: 100, passMarks: 33, obtainedMarks: 82, gpa: 5, grade: 'A+' },
      { subjectName: 'বাংলা', fullMarks: 100, passMarks: 33, obtainedMarks: 88, gpa: 5, grade: 'A+' },
    ],
  };

  const r2: ExamResult = {
    ...base,
    id: 'r2',
    studentId: 's2',
    studentCode: 'SHK-2',
    studentName: 'তানজিম',
    rollNumber: '05',
    totalObtained: 170,
    gpa: 5.0,
    classRank: 0,
    batchRank: 0,
    subjectMarks: [
      { subjectName: 'গণিত', fullMarks: 100, passMarks: 33, obtainedMarks: 90, gpa: 5, grade: 'A+' },
      { subjectName: 'বাংলা', fullMarks: 100, passMarks: 33, obtainedMarks: 80, gpa: 5, grade: 'A+' },
    ],
  };

  const ranked = assignMeritRanks([r1, r2]);
  const tanzim = ranked.find((x) => x.studentId === 's2')!;
  const arif = ranked.find((x) => x.studentId === 's1')!;
  assert.equal(tanzim.classRank, 1);
  assert.equal(arif.classRank, 2);
});

test('invoice status and due calculation handle partial, paid, and pending states', () => {
  assert.equal(resolveInvoiceStatus(1500, 1500, false), 'Paid');
  assert.equal(resolveInvoiceStatus(1500, 500, false), 'Partial');
  assert.equal(resolveInvoiceStatus(1500, 0, true), 'Pending');
  assert.equal(resolveInvoiceStatus(1500, 0, false), 'Unpaid');

  const summary = calculateInvoiceSummary([
    {
      id: '1',
      invoiceNo: 'INV-1',
      studentId: 's1',
      studentCode: 'SHK-1',
      studentName: 'A',
      classId: 'class-8',
      batchId: 'b1',
      monthIndex: 1,
      monthNameBn: 'জানুয়ারি',
      academicYear: 2026,
      amount: 1200,
      paidAmount: 1200,
      status: 'Paid',
      dueDate: '2026-01-10',
    },
    {
      id: '2',
      invoiceNo: 'INV-2',
      studentId: 's1',
      studentCode: 'SHK-1',
      studentName: 'A',
      classId: 'class-8',
      batchId: 'b1',
      monthIndex: 2,
      monthNameBn: 'ফেব্রুয়ারি',
      academicYear: 2026,
      amount: 1200,
      paidAmount: 400,
      status: 'Partial',
      dueDate: '2026-02-10',
    },
  ]);

  assert.deepEqual(summary, { totalBilled: 2400, totalPaid: 1600, totalDue: 800 });
});

test('attendance percentage counts Present and Late as attended and validates BD phone', () => {
  const att = calculateAttendancePercentage([
    { id: '1', date: '2026-11-01', classId: 'class-8', batchId: 'b1', studentId: 's1', studentCode: '1', studentName: 'A', rollNumber: '01', status: 'Present', markedBy: 't1' },
    { id: '2', date: '2026-11-02', classId: 'class-8', batchId: 'b1', studentId: 's1', studentCode: '1', studentName: 'A', rollNumber: '01', status: 'Late', markedBy: 't1' },
    { id: '3', date: '2026-11-03', classId: 'class-8', batchId: 'b1', studentId: 's1', studentCode: '1', studentName: 'A', rollNumber: '01', status: 'Absent', markedBy: 't1' },
    { id: '4', date: '2026-11-04', classId: 'class-8', batchId: 'b1', studentId: 's1', studentCode: '1', studentName: 'A', rollNumber: '01', status: 'Leave', markedBy: 't1' },
  ]);
  assert.equal(att.percentage, 50);
  assert.equal(isValidBdPhone('01712345678'), true);
  assert.equal(isValidBdPhone('+8801812-345678'), true);
  assert.equal(isValidBdPhone('12345'), false);
});

test('formatBengaliOrdinal produces proper Bengali rank ordinals', () => {
  assert.equal(formatBengaliOrdinal(1), '১ম');
  assert.equal(formatBengaliOrdinal(2), '২য়');
  assert.equal(formatBengaliOrdinal(3), '৩য়');
  assert.equal(formatBengaliOrdinal(4), '৪র্থ');
  assert.equal(formatBengaliOrdinal(5), '৫ম');
  assert.equal(formatBengaliOrdinal(6), '৬ষ্ঠ');
  assert.equal(formatBengaliOrdinal(11), '১১তম');
});
