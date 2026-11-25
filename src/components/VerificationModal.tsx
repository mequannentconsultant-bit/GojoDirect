import React, { useState } from 'react';
import { X, ShieldCheck, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import type { User, LandlordVerification } from '../types/index.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';
import { validateImageUpload, isSafeImageUrl, sanitizePlainText, MAX_TEXT_LENGTHS } from '../utils/security.ts';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSubmitVerification: (verif: Omit<LandlordVerification, 'id' | 'status' | 'submittedAt'>) => void;
  language?: Language;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubmitVerification,
  language = 'en',
}) => {
  const t = translations[language];
  const [docType, setDocType] = useState<'National ID / Kebele' | 'Passport' | 'Driver License'>(
    'National ID / Kebele'
  );
  const [docNumber, setDocNumber] = useState('');
  const [docImageUrl, setDocImageUrl] = useState(
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80'
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageUpload({
      type: file.type,
      size: file.size,
      name: file.name,
    });
    if (!validation.ok) {
      setUploadError(t.securityInvalidUpload);
      e.target.value = '';
      return;
    }

    setUploadError('');
    setUploadedFileName(sanitizePlainText(file.name, 80));
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && isSafeImageUrl(reader.result)) {
        setDocImageUrl(reader.result);
      } else {
        setUploadError(t.securityInvalidUpload);
        setUploadedFileName(null);
      }
    };
    reader.onerror = () => {
      setUploadError(t.securityInvalidUpload);
      setUploadedFileName(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeDocNum = sanitizePlainText(docNumber, MAX_TEXT_LENGTHS.docNumber);
    if (!safeDocNum) return;
    onSubmitVerification({
      userId: currentUser.id,
      userName: sanitizePlainText(`${currentUser.firstName} ${currentUser.lastName}`, MAX_TEXT_LENGTHS.shortName),
      userEmail: currentUser.email,
      userPhone: currentUser.phone,
      documentType: docType,
      documentNumber: safeDocNum,
      documentUrl: isSafeImageUrl(docImageUrl)
        ? docImageUrl
        : 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    });
    setDocNumber('');
    setUploadedFileName(null);
    setUploadError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">{t.verifModalTitle}</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
            {t.verifNotice}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.docTypeLabel}</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:border-emerald-500"
            >
              <option value="National ID / Kebele">{t.docNationalId}</option>
              <option value="Passport">{t.docPassport}</option>
              <option value="Driver License">{t.docDriverLicense}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.docNumberLabel}</label>
            <input
              type="text"
              required
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-mono outline-none focus:border-emerald-500"
              placeholder={t.docNumberPlaceholder}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.docPhotoLabel}
            </label>
            <div className="relative aspect-16/9 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center group">
              <img
                src={docImageUrl}
                alt="Document Preview"
                className="w-full h-full object-cover"
              />
              <label className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer gap-1.5">
                <Upload className="w-5 h-5" />
                <span>{uploadedFileName || t.docPreviewText}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <label className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-bold cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>{language === 'am' ? 'ፋይል ይምረጡ' : 'Upload ID Image'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <button
                type="button"
                onClick={() => {
                  setUploadedFileName(null);
                  setDocImageUrl(
                    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80'
                  );
                }}
                className="text-[11px] text-slate-600 dark:text-slate-400 hover:underline font-semibold cursor-pointer"
              >
                {language === 'am' ? 'የቀበሌ መታወቂያ ናሙና' : 'Sample Kebele ID'}
              </button>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <button
                type="button"
                onClick={() => {
                  setUploadedFileName(null);
                  setDocImageUrl(
                    'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80'
                  );
                }}
                className="text-[11px] text-slate-600 dark:text-slate-400 hover:underline font-semibold cursor-pointer"
              >
                {language === 'am' ? 'የፓስፖርት ናሙና' : 'Sample Passport'}
              </button>
            </div>
            {uploadError && (
              <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.submitVerifBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
