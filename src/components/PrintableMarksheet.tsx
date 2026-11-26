import React from 'react';
import { Printer, X } from 'lucide-react';
import type { ExamResult, WebsiteSettings } from '../types';
import { formatBengaliOrdinal, getClassNameBn, toBengaliDigits } from '../utils/academicLogic';
import { BrandLogo } from './BrandLogo';

interface PrintableMarksheetProps {
  result: ExamResult;
  settings: WebsiteSettings;
  onClose: () => void;
}

export const PrintableMarksheet: React.FC<PrintableMarksheetProps> = ({
  result,
  settings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl border border-slate-200 shadow-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 no-print">
          <h3 className="text-base font-bold text-[#0F2942]">একাডেমিক মার্কশিট প্রিভিউ</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F2942] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173a5e] transition-colors"
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট / PDF ডাউনলোড
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="বন্ধ করুন"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-8 print-sheet bg-white">
          <div className="border-2 border-[#0F2942] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <BrandLogo size="lg" subtitle="একাডেমিক ট্রান্সক্রিপ্ট ও মূল্যায়ন পত্র" />
              <div className="text-center sm:text-right text-xs text-slate-600 space-y-0.5">
                <p className="font-semibold text-[#0F2942]">{settings.instituteNameBn} ({settings.instituteNameEn})</p>
                <p>{settings.address}</p>
                <p className="tabular-nums">ফোন: {settings.phone} · {settings.email}</p>
              </div>
            </div>

            <div className="text-center my-5">
              <h2 className="text-xl font-bold text-[#0F2942]">{result.examTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">
                শিক্ষাবর্ষ: {toBengaliDigits(result.academicYear)} · প্রকাশের তারিখ: {toBengaliDigits(result.publishedAt ?? '২০২৬-১১-১৮')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-sm">
              <div>
                <span className="block text-xs text-slate-500">শিক্ষার্থীর নাম</span>
                <span className="font-bold text-slate-900">{result.studentName}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">স্টুডেন্ট আইডি</span>
                <span className="font-mono font-semibold text-[#0F2942] tabular-nums">{result.studentCode}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">শ্রেণি ও রোল</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {getClassNameBn(result.classId)} · রোল {toBengaliDigits(result.rollNumber)}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">মেধাক্রম</span>
                <span className="font-bold text-[#1D4ED8] tabular-nums">
                  শ্রেণি: {formatBengaliOrdinal(result.classRank)} · ব্যাচ: {formatBengaliOrdinal(result.batchRank)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-[#0F2942] text-white text-left">
                    <th className="py-2.5 px-3 font-semibold border border-[#0F2942]">বিষয়</th>
                    <th className="py-2.5 px-3 font-semibold text-right border border-[#0F2942]">পূর্ণমান</th>
                    <th className="py-2.5 px-3 font-semibold text-right border border-[#0F2942]">পাস নম্বর</th>
                    <th className="py-2.5 px-3 font-semibold text-right border border-[#0F2942]">প্রাপ্ত নম্বর</th>
                    <th className="py-2.5 px-3 font-semibold text-center border border-[#0F2942]">গ্রেড</th>
                    <th className="py-2.5 px-3 font-semibold text-right border border-[#0F2942]">জিপিএ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.subjectMarks.map((sub) => (
                    <tr key={sub.subjectName} className="border-b border-slate-200">
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                        {sub.subjectName}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 border-r border-slate-200">
                        {toBengaliDigits(sub.fullMarks)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 border-r border-slate-200">
                        {toBengaliDigits(sub.passMarks)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900 border-r border-slate-200">
                        {toBengaliDigits(sub.obtainedMarks)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200">
                        <span className={sub.grade === 'F' ? 'text-red-600' : 'text-emerald-700'}>
                          {sub.grade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-800">
                        {toBengaliDigits(sub.gpa.toFixed(2))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div>
                <span className="block text-xs text-slate-500">মোট প্রাপ্ত নম্বর</span>
                <span className="text-lg font-bold text-[#0F2942] tabular-nums">
                  {toBengaliDigits(result.totalObtained)} / {toBengaliDigits(result.totalFullMarks)}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">গড় GPA</span>
                <span className="text-lg font-bold text-[#1D4ED8] tabular-nums">
                  {toBengaliDigits(result.gpa.toFixed(2))}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">চূড়ান্ত গ্রেড</span>
                <span className="text-lg font-bold text-slate-900">{result.grade}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">ফলাফল অবস্থা</span>
                <span className={`text-lg font-bold ${result.passed ? 'text-emerald-700' : 'text-red-600'}`}>
                  {result.passed ? 'উত্তীর্ণ' : 'অকৃতকার্য'}
                </span>
              </div>
            </div>

            <div className="mt-10 pt-6 flex items-end justify-between text-xs text-slate-600">
              <div className="text-center">
                <div className="w-36 border-t border-slate-400 pt-1.5">পরীক্ষা নিয়ন্ত্রক</div>
              </div>
              <div className="text-center">
                <div className="w-40 border-t border-slate-400 pt-1.5 font-semibold text-[#0F2942]">
                  পরিচালক, শিক্ষানীর
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
