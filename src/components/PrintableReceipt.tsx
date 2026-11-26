import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import type { MonthlyInvoice, PaymentRecord, WebsiteSettings } from '../types';
import { formatTaka, toBengaliDigits } from '../utils/academicLogic';
import { BrandLogo } from './BrandLogo';

interface PrintableReceiptProps {
  payment: PaymentRecord;
  invoice?: MonthlyInvoice;
  settings: WebsiteSettings;
  onClose: () => void;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  payment,
  invoice,
  settings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 no-print">
          <h3 className="text-base font-bold text-[#0F2942]">বেতন পরিশোধ রসিদ</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F2942] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173a5e]"
            >
              <Printer className="w-4 h-4" />
              রসিদ প্রিন্ট
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

        <div className="p-6 print-sheet bg-white">
          <div className="border border-slate-300 rounded-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <BrandLogo size="md" subtitle="অফিসিয়াল পেমেন্ট রসিদ" />
              <div className="text-right text-xs">
                <p className="font-mono font-bold text-[#0F2942]">{payment.receiptNo}</p>
                <p className="text-slate-500 tabular-nums">
                  {new Date(payment.verifiedAt ?? payment.submittedAt).toLocaleDateString('bn-BD')}
                </p>
              </div>
            </div>

            <div className="my-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">শিক্ষার্থীর নাম</span>
                <span className="font-semibold text-slate-900">{payment.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">স্টুডেন্ট আইডি</span>
                <span className="font-mono font-semibold text-[#0F2942]">{payment.studentCode}</span>
              </div>
              {invoice && (
                <div className="flex justify-between">
                  <span className="text-slate-500">মাস ও ইনভয়েস</span>
                  <span className="font-semibold text-slate-800">
                    {invoice.monthNameBn} {toBengaliDigits(invoice.academicYear)} ({invoice.invoiceNo})
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">পেমেন্ট মাধ্যম</span>
                <span className="font-semibold text-slate-800">{payment.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono font-semibold text-slate-800">{payment.transactionId}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-200 text-base">
                <span className="font-bold text-[#0F2942]">পরিশোধিত পরিমাণ</span>
                <span className="font-bold text-emerald-700 tabular-nums">{formatTaka(payment.amount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                {payment.status === 'Verified' ? 'অ্যাডমিন কর্তৃক যাচাইকৃত' : 'যাচাই প্রক্রিয়াধীন'}
              </span>
              <span>{settings.address}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
