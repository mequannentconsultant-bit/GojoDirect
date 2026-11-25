import React, { useState } from 'react';
import { X, Flag, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { Property, User, FraudReport } from '../types/index.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';
import { sanitizePlainText, MAX_TEXT_LENGTHS } from '../utils/security.ts';

interface FraudReportModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSubmitReport: (report: Omit<FraudReport, 'id' | 'status' | 'createdAt'>) => void;
  language?: Language;
}

export const FraudReportModal: React.FC<FraudReportModalProps> = ({
  property,
  isOpen,
  onClose,
  currentUser,
  onSubmitReport,
  language = 'en',
}) => {
  const t = translations[language];
  const [reason, setReason] = useState<FraudReport['reason']>('Broker pretending to be owner');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !property) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeDetails = sanitizePlainText(details, MAX_TEXT_LENGTHS.fraudDetails);
    if (!safeDetails) return;

    onSubmitReport({
      propertyId: property.id,
      propertyTitle: property.title,
      reporterId: currentUser.id,
      reporterName: sanitizePlainText(`${currentUser.firstName} ${currentUser.lastName}`, MAX_TEXT_LENGTHS.shortName),
      reason,
      details: safeDetails,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setDetails('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-rose-50 dark:bg-rose-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h2 className="font-bold text-rose-950 dark:text-rose-200 text-base">{t.fraudModalTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">{t.fraudTargetListing}</span>
            <p className="text-slate-600 dark:text-slate-300 truncate">{property.title}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[11px]">
              {language === 'am' ? 'አከራይ:' : 'Landlord:'} {property.ownerName} ({property.ownerPhone})
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.fraudReasonLabel}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:border-rose-500"
            >
              <option value="Broker pretending to be owner">{t.fraudReason1}</option>
              <option value="Fake pictures">{t.fraudReason2}</option>
              <option value="Unrealistic price">{t.fraudReason3}</option>
              <option value="Scam request for advance payment">{t.fraudReason4}</option>
              <option value="Already rented">{t.fraudReason5}</option>
              <option value="Other">{t.fraudReason6}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.fraudDetailsLabel}
            </label>
            <textarea
              rows={4}
              required
              placeholder={t.fraudDetailsPlaceholder}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitted}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.reportSubmittedSuccess}</span>
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4" />
                  <span>{t.submitReportBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
