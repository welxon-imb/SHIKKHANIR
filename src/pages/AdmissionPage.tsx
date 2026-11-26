import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Upload } from 'lucide-react';
import { apiFetch } from '../services/api';
import type { AcademicClass, AcademicClassId, AdmissionApplication, Batch } from '../types';
import { formatTaka, getClassNameBn, isValidBdPhone } from '../utils/academicLogic';

interface AdmissionPageProps {
  classes: AcademicClass[];
  batches: Batch[];
  initialClassId?: AcademicClassId;
  onBack: () => void;
  onGoLogin: () => void;
}

export const AdmissionPage: React.FC<AdmissionPageProps> = ({
  classes,
  batches,
  initialClassId,
  onBack,
  onGoLogin,
}) => {
  const defaultClass = initialClassId ?? 'class-8';
  const defaultBatch = batches.find((b) => b.classId === defaultClass)?.id ?? '';

  const [form, setForm] = useState({
    studentName: '',
    photoUrl: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
    previousSchool: '',
    classId: defaultClass as AcademicClassId,
    batchId: defaultBatch,
    academicInfo: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<AdmissionApplication | null>(null);

  const availableBatches = useMemo(
    () => batches.filter((b) => b.classId === form.classId),
    [batches, form.classId]
  );

  const handleClassChange = (classId: AcademicClassId) => {
    const firstBatch = batches.find((b) => b.classId === classId)?.id ?? '';
    setForm((prev) => ({ ...prev, classId, batchId: firstBatch }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 1.5) {
      setError('ছবির সাইজ ১.৫ MB-এর কম হতে হবে।');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, photoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !form.studentName.trim() ||
      !form.dateOfBirth ||
      !form.phone.trim() ||
      !form.guardianName.trim() ||
      !form.guardianPhone.trim() ||
      !form.address.trim() ||
      !form.previousSchool.trim() ||
      !form.batchId
    ) {
      setError('অনুগ্রহ করে তারকা (*) চিহ্নিত সকল আবশ্যক ঘর পূরণ করুন।');
      return;
    }

    if (!isValidBdPhone(form.phone) || !isValidBdPhone(form.guardianPhone)) {
      setError('শিক্ষার্থী এবং অভিভাবকের সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ application: AdmissionApplication }>('/api/public/admissions', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSubmittedApp(res.application);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            হোমপেজ
          </button>
          <button
            type="button"
            onClick={onGoLogin}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F2942] rounded-xl hover:bg-[#173a5e]"
          >
            লগইন
          </button>
        </div>
        {submittedApp ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F2942]">ভর্তি আবেদন সফলভাবে জমা হয়েছে</h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              আপনার আবেদনটি বর্তমানে <strong>Submitted</strong> অবস্থায় রয়েছে। অ্যাডমিন তথ্য যাচাই ও অনুমোদন করলে আপনার Student ID, রোল নম্বর ও স্টুডেন্ট অ্যাকাউন্ট সক্রিয় হবে।
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-md mx-auto text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Application ID</span>
                <span className="font-mono font-bold text-[#0F2942]">{submittedApp.applicationId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">শিক্ষার্থীর নাম</span>
                <span className="font-semibold">{submittedApp.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">নির্বাচিত শ্রেণি</span>
                <span className="font-semibold">{getClassNameBn(submittedApp.classId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">আবেদনের অবস্থা</span>
                <span className="font-semibold text-[#1D4ED8]">{submittedApp.status}</span>
              </div>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold"
              >
                হোমপেজে ফিরে যান
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmittedApp(null);
                  setForm((p) => ({ ...p, studentName: '', phone: '' }));
                }}
                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold"
              >
                আরেকটি আবেদন করুন
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-200 pb-5 mb-6">
              <p className="text-xs font-semibold text-[#C59B38]">শিক্ষানীর অনলাইন ভর্তি ফর্ম</p>
              <h1 className="text-2xl font-bold text-[#0F2942] mt-1">নতুন শিক্ষার্থী ভর্তি আবেদন</h1>
              <p className="text-xs text-slate-500 mt-1">
                শিক্ষার্থীরা সরাসরি অ্যাকাউন্ট সক্রিয় করতে পারবেন না; অ্যাডমিনের অনুমোদনের পর স্টুডেন্ট অ্যাকাউন্ট চালু হবে।
              </p>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adm-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    শিক্ষার্থীর পূর্ণ নাম *
                  </label>
                  <input
                    id="adm-name"
                    type="text"
                    value={form.studentName}
                    onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                    placeholder="যেমন: রাফিউল করিম"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label htmlFor="adm-dob" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    জন্মতারিখ *
                  </label>
                  <input
                    id="adm-dob"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adm-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    শিক্ষার্থীর মোবাইল নম্বর *
                  </label>
                  <input
                    id="adm-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label htmlFor="adm-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ইমেইল (ঐচ্ছিক)
                  </label>
                  <input
                    id="adm-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="student@example.com"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adm-gname" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    অভিভাবকের নাম *
                  </label>
                  <input
                    id="adm-gname"
                    type="text"
                    value={form.guardianName}
                    onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                    placeholder="পিতা / মাতার নাম"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label htmlFor="adm-gphone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    অভিভাবকের মোবাইল নম্বর *
                  </label>
                  <input
                    id="adm-gphone"
                    type="tel"
                    value={form.guardianPhone}
                    onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adm-school" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    পূর্ববর্তী / বর্তমান শিক্ষাপ্রতিষ্ঠান *
                  </label>
                  <input
                    id="adm-school"
                    type="text"
                    value={form.previousSchool}
                    onChange={(e) => setForm({ ...form, previousSchool: e.target.value })}
                    placeholder="বিদ্যালয়ের নাম"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label htmlFor="adm-address" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    বর্তমান ঠিকানা *
                  </label>
                  <input
                    id="adm-address"
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="গ্রাম/মহল্লা, থানা, জেলা"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adm-class" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    শ্রেণি নির্বাচন *
                  </label>
                  <select
                    id="adm-class"
                    value={form.classId}
                    onChange={(e) => handleClassChange(e.target.value as AcademicClassId)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#1D4ED8]"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameBn} ({formatTaka(c.monthlyFee)}/মাস)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="adm-batch" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ব্যাচ নির্বাচন *
                  </label>
                  <select
                    id="adm-batch"
                    value={form.batchId}
                    onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#1D4ED8]"
                  >
                    {availableBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.timeSlot})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="adm-academic" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  প্রয়োজনীয় শিক্ষাগত তথ্য (পূর্ববর্তী পরীক্ষার ফলাফল / বিভাগ)
                </label>
                <textarea
                  id="adm-academic"
                  rows={2}
                  value={form.academicInfo}
                  onChange={(e) => setForm({ ...form, academicInfo: e.target.value })}
                  placeholder="যেমন: অষ্টম শ্রেণিতে বিজ্ঞান বিভাগ, বার্ষিক পরীক্ষায় GPA 5.00"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  শিক্ষার্থীর পাসপোর্ট সাইজ ছবি (ঐচ্ছিক)
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                    <Upload className="w-4 h-4" />
                    ছবি নির্বাচন করুন
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {form.photoUrl && (
                    <img
                      src={form.photoUrl}
                      alt="শিক্ষার্থীর ছবি প্রিভিউ"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                    />
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#0F2942] text-white text-sm font-semibold hover:bg-[#173a5e] disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'আবেদন পাঠানো হচ্ছে...' : 'ভর্তি আবেদন জমা দিন'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
