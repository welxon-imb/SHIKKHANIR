import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Printer } from 'lucide-react';
import type {
  AcademicClass,
  ActivityLog,
  AdmissionApplication,
  AttendanceRecord,
  ExamResult,
  MonthlyInvoice,
  Student,
} from '../types';
import {
  calculateAttendancePercentage,
  calculateInvoiceSummary,
  exportRowsToCsv,
  formatTaka,
  getClassNameBn,
  toBengaliDigits,
} from '../utils/academicLogic';

interface AdminReportsPanelProps {
  classes: AcademicClass[];
  students: Student[];
  admissions: AdmissionApplication[];
  attendance: AttendanceRecord[];
  invoices: MonthlyInvoice[];
  results: ExamResult[];
  activityLogs: ActivityLog[];
}

const CHART_COLORS = ['#0F2942', '#1D4ED8', '#C59B38', '#059669'];

export const AdminReportsPanel: React.FC<AdminReportsPanelProps> = ({
  classes,
  students,
  admissions,
  attendance,
  invoices,
  results,
  activityLogs,
}) => {
  const feeSummary = calculateInvoiceSummary(invoices);
  const attSummary = calculateAttendancePercentage(attendance);

  const classDistribution = classes.map((c) => {
    const count = students.filter((s) => s.enrollments.some((e) => e.classId === c.id)).length;
    const classInvoices = invoices.filter((i) => i.classId === c.id);
    const invSummary = calculateInvoiceSummary(classInvoices);
    return {
      name: c.nameBn,
      students: count,
      collected: invSummary.totalPaid,
      due: invSummary.totalDue,
    };
  });

  const monthlyIncomeData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
    const monthInvs = invoices.filter((i) => i.monthIndex === m);
    const sum = calculateInvoiceSummary(monthInvs);
    return {
      month: monthInvs[0]?.monthNameBn ?? String(m),
      আয়: sum.totalPaid,
      বকেয়া: sum.totalDue,
    };
  });

  const handleExportStudentsCsv = () => {
    exportRowsToCsv(
      'shikkhanir_students_report.csv',
      ['Student ID', 'নাম', 'শ্রেণি', 'রোল', 'মোবাইল', 'অভিভাবকের ফোন', 'অবস্থা'],
      students.map((s) => [
        s.studentCode,
        s.name,
        s.enrollments.map((e) => getClassNameBn(e.classId)).join(' + '),
        s.enrollments[0]?.rollNumber ?? '',
        s.phone,
        s.guardianPhone,
        s.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      ])
    );
  };

  const handleExportFinanceCsv = () => {
    exportRowsToCsv(
      'shikkhanir_finance_report.csv',
      ['শ্রেণি', 'শিক্ষার্থী সংখ্যা', 'আদায়কৃত টাকা', 'বকেয়া টাকা'],
      classDistribution.map((c) => [c.name, c.students, c.collected, c.due])
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F2942]">প্রতিবেদন ও বিশ্লেষণ (Reports & Analytics)</h2>
          <p className="text-xs text-slate-500 mt-1">
            মোট আদায়: {formatTaka(feeSummary.totalPaid)} · মোট বকেয়া: {formatTaka(feeSummary.totalDue)} · গড় উপস্থিতি: {toBengaliDigits(attSummary.percentage)}%
          </p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <button
            type="button"
            onClick={handleExportStudentsCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-[#0F2942] hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            শিক্ষার্থী Excel/CSV
          </button>
          <button
            type="button"
            onClick={handleExportFinanceCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-[#0F2942] hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            আর্থিক Excel/CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold hover:bg-[#173a5e]"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF প্রিন্ট রিপোর্ট
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-[#0F2942] mb-4">মাসভিত্তিক আয় ও বকেয়া বিশ্লেষণ (জানুয়ারি – ডিসেম্বর)</h3>
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyIncomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="আয়" fill="#0F2942" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="বকেয়া" fill="#C59B38" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-[#0F2942] mb-4">শ্রেণিভিত্তিক শিক্ষার্থী অনুপাত</h3>
          <div className="h-56 w-full min-w-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={classDistribution}
                  dataKey="students"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={76}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {classDistribution.map((entry, idx) => (
                    <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2 text-xs">
            {classDistribution.map((c, idx) => (
              <div key={c.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  {c.name}
                </span>
                <span className="font-bold tabular-nums">{toBengaliDigits(c.students)} জন</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-[#0F2942] mb-3">শ্রেণিভিত্তিক সারসংক্ষেপ</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">শ্রেণি</th>
                  <th className="py-2.5 px-3 text-right">শিক্ষার্থী</th>
                  <th className="py-2.5 px-3 text-right">আদায়</th>
                  <th className="py-2.5 px-3 text-right">বকেয়া</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classDistribution.map((c) => (
                  <tr key={c.name}>
                    <td className="py-2.5 px-3 font-semibold">{c.name}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{toBengaliDigits(c.students)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700">{formatTaka(c.collected)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-red-600">{formatTaka(c.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            মোট ভর্তি আবেদন: {toBengaliDigits(admissions.length)}টি · প্রকাশিত ফলাফল: {toBengaliDigits(results.filter((r) => r.isPublished).length)}টি
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-[#0F2942] mb-3">সিস্টেম অ্যাক্টিভিটি লগ (Security & Audit)</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
            {activityLogs.slice(0, 15).map((log) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between gap-2">
                <div>
                  <span className="font-bold text-[#0F2942]">{log.action}</span> ·{' '}
                  <span className="text-slate-600">{log.details}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{log.actorName}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                  {new Date(log.timestamp).toLocaleDateString('bn-BD')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
