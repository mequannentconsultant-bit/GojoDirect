import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  FileText,
  Download,
  Send,
  ShieldCheck,
  Calendar,
  Building2,
  User as UserIcon,
} from 'lucide-react';
import type { RentalAgreementData } from '../types/index.ts';
import { formatETB } from '../utils/rules.ts';
import {
  downloadRentalAgreementFile,
  getEndDateIso,
  sanitizeAgreementData,
} from '../utils/rentalAgreement.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface RentalAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: RentalAgreementData | null;
  readOnly?: boolean;
  onSendToTenant?: (agreement: RentalAgreementData) => void;
  language?: Language;
}

const PAYMENT_METHODS: RentalAgreementData['paymentMethod'][] = [
  'Telebirr',
  'CBE Birr',
  'Bank Transfer',
  'Cash Receipt',
];

export const RentalAgreementModal: React.FC<RentalAgreementModalProps> = ({
  isOpen,
  onClose,
  initialData,
  readOnly = false,
  onSendToTenant,
  language = 'en',
}) => {
  const t = translations[language];
  const [formData, setFormData] = useState<RentalAgreementData | null>(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData, isOpen]);

  const sanitizedPreview = useMemo(() => {
    return formData ? sanitizeAgreementData(formData) : null;
  }, [formData]);

  if (!isOpen || !formData || !sanitizedPreview) return null;

  const endDate = getEndDateIso(sanitizedPreview.startDate, sanitizedPreview.leaseTermMonths);
  const fullAddress = [
    sanitizedPreview.address,
    sanitizedPreview.neighborhood,
    sanitizedPreview.subCity,
    sanitizedPreview.city,
  ]
    .filter(Boolean)
    .join(', ');

  const handleFieldChange = <K extends keyof RentalAgreementData>(
    key: K,
    value: RentalAgreementData[K]
  ) => {
    setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleDownloadHtml = () => {
    downloadRentalAgreementFile(sanitizedPreview, 'html');
  };

  const handleDownloadTxt = () => {
    downloadRentalAgreementFile(sanitizedPreview, 'txt');
  };

  const handleSend = () => {
    if (!onSendToTenant || readOnly) return;
    onSendToTenant(sanitizedPreview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/75 dark:bg-slate-950/85 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                {t.rentalAgreementModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {t.rentalAgreementSubtitle} · Ref {sanitizedPreview.agreementId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close rental agreement generator"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Pane: Editable Contract Fields */}
          {!readOnly && (
            <div className="lg:col-span-5 overflow-y-auto p-5 space-y-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              {/* Property Summary */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Property Information</span>
                </div>

                <div>
                  <label
                    htmlFor="ra-property-title"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Property Title
                  </label>
                  <input
                    id="ra-property-title"
                    type="text"
                    value={formData.propertyTitle}
                    onChange={(e) => handleFieldChange('propertyTitle', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="ra-city"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      City
                    </label>
                    <input
                      id="ra-city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ra-subcity"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Sub-City / Woreda
                    </label>
                    <input
                      id="ra-subcity"
                      type="text"
                      value={formData.subCity}
                      onChange={(e) => handleFieldChange('subCity', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="ra-address"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Street Address / Landmark
                  </label>
                  <input
                    id="ra-address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="e.g. Cameroon St, House #12"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Tenant & Landlord Info */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Tenant &amp; Landlord Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="ra-tenant-name"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Tenant Full Name
                    </label>
                    <input
                      id="ra-tenant-name"
                      type="text"
                      value={formData.tenantName}
                      onChange={(e) => handleFieldChange('tenantName', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ra-tenant-phone"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Tenant Phone
                    </label>
                    <input
                      id="ra-tenant-phone"
                      type="text"
                      value={formData.tenantPhone || ''}
                      onChange={(e) => handleFieldChange('tenantPhone', e.target.value)}
                      placeholder="09..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="ra-landlord-name"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Landlord Full Name
                    </label>
                    <input
                      id="ra-landlord-name"
                      type="text"
                      value={formData.landlordName}
                      onChange={(e) => handleFieldChange('landlordName', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ra-landlord-phone"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Landlord Phone
                    </label>
                    <input
                      id="ra-landlord-phone"
                      type="text"
                      value={formData.landlordPhone}
                      onChange={(e) => handleFieldChange('landlordPhone', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Lease & Financial Terms */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Lease &amp; Payment Terms</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="ra-monthly-rent"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Monthly Rent (ETB)
                    </label>
                    <input
                      id="ra-monthly-rent"
                      type="number"
                      min={500}
                      max={2000000}
                      value={formData.monthlyRentETB}
                      onChange={(e) =>
                        handleFieldChange('monthlyRentETB', Number(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white tabular-nums outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ra-security-deposit"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Security Deposit (ETB)
                    </label>
                    <input
                      id="ra-security-deposit"
                      type="number"
                      min={0}
                      max={12000000}
                      value={formData.securityDepositETB}
                      onChange={(e) =>
                        handleFieldChange('securityDepositETB', Number(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white tabular-nums outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="ra-start-date"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Lease Start Date
                    </label>
                    <input
                      id="ra-start-date"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleFieldChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ra-lease-months"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Duration (Months)
                    </label>
                    <input
                      id="ra-lease-months"
                      type="number"
                      min={1}
                      max={60}
                      value={formData.leaseTermMonths}
                      onChange={(e) =>
                        handleFieldChange('leaseTermMonths', Number(e.target.value) || 1)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white tabular-nums outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="ra-due-day"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Monthly Due Day (1–28)
                    </label>
                    <input
                      id="ra-due-day"
                      type="number"
                      min={1}
                      max={28}
                      value={formData.paymentDueDay}
                      onChange={(e) =>
                        handleFieldChange('paymentDueDay', Number(e.target.value) || 1)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white tabular-nums outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ra-payment-method"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Payment Channel
                    </label>
                    <select
                      id="ra-payment-method"
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        handleFieldChange(
                          'paymentMethod',
                          e.target.value as RentalAgreementData['paymentMethod']
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="ra-special-clauses"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Special Clauses &amp; Utility Notes
                  </label>
                  <textarea
                    id="ra-special-clauses"
                    rows={3}
                    value={formData.specialClauses}
                    onChange={(e) => handleFieldChange('specialClauses', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Right Pane: Standard Contract Template Preview */}
          <div
            className={`${
              readOnly ? 'lg:col-span-12' : 'lg:col-span-7'
            } overflow-y-auto p-5 sm:p-6 bg-slate-100/80 dark:bg-slate-950/60`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.contractPreviewTitle}
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Direct Lease · Zero Broker Fee</span>
              </span>
            </div>

            <article className="bg-white text-slate-900 rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5 text-xs leading-relaxed">
              {/* Contract Header */}
              <div className="border-b-2 border-emerald-600 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                    GojoDirect · Standard Ethiopian Lease
                  </p>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                    Residential Rental Agreement
                  </h3>
                </div>
                <div className="text-[11px] text-slate-600 sm:text-right tabular-nums">
                  <p>
                    <strong>Ref:</strong> {sanitizedPreview.agreementId}
                  </p>
                  <p>
                    <strong>Generated:</strong> {sanitizedPreview.generatedAt.slice(0, 10)}
                  </p>
                </div>
              </div>

              {/* 1. Parties */}
              <section className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] border-b border-slate-200 pb-1">
                  1. Contracting Parties
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase text-slate-500">
                      Landlord (Lessor)
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {sanitizedPreview.landlordName}
                    </p>
                    {sanitizedPreview.landlordPhone && (
                      <p className="text-slate-600">Phone: {sanitizedPreview.landlordPhone}</p>
                    )}
                    {sanitizedPreview.landlordEmail && (
                      <p className="text-slate-600 truncate">
                        Email: {sanitizedPreview.landlordEmail}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase text-slate-500">
                      Tenant (Lessee)
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {sanitizedPreview.tenantName}
                    </p>
                    {sanitizedPreview.tenantPhone && (
                      <p className="text-slate-600">Phone: {sanitizedPreview.tenantPhone}</p>
                    )}
                    {sanitizedPreview.tenantEmail && (
                      <p className="text-slate-600 truncate">
                        Email: {sanitizedPreview.tenantEmail}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* 2. Premises & Lease Terms */}
              <section className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] border-b border-slate-200 pb-1">
                  2. Property Premises &amp; Financial Terms
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 border-b border-slate-200">
                    <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                      Property
                    </div>
                    <div className="col-span-2 px-3 py-2 text-slate-900">
                      {sanitizedPreview.propertyTitle} ({sanitizedPreview.propertyType})
                    </div>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-200">
                    <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                      Location
                    </div>
                    <div className="col-span-2 px-3 py-2 text-slate-900">{fullAddress}</div>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-200">
                    <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                      Lease Term
                    </div>
                    <div className="col-span-2 px-3 py-2 text-slate-900 tabular-nums">
                      {sanitizedPreview.leaseTermMonths} month(s) · {sanitizedPreview.startDate} to{' '}
                      {endDate}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-200">
                    <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                      Monthly Rent
                    </div>
                    <div className="col-span-2 px-3 py-2 font-bold text-emerald-700 tabular-nums">
                      {formatETB(sanitizedPreview.monthlyRentETB)} / month (Due Day{' '}
                      {sanitizedPreview.paymentDueDay} via {sanitizedPreview.paymentMethod})
                    </div>
                  </div>
                  <div className="grid grid-cols-3">
                    <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                      Security Deposit
                    </div>
                    <div className="col-span-2 px-3 py-2 text-slate-900 tabular-nums">
                      {formatETB(sanitizedPreview.securityDepositETB)} (refundable upon handover)
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Standard Covenants */}
              <section className="space-y-1.5">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] border-b border-slate-200 pb-1">
                  3. Covenants &amp; Special Clauses
                </h4>
                <p className="text-slate-700">
                  <strong>Zero Broker (Delala) Guarantee:</strong> Executed directly between Landlord
                  and Tenant without informal broker commissions.
                </p>
                <p className="text-slate-700">
                  <strong>Maintenance &amp; Notice:</strong> Tenant shall maintain the premises in
                  clean condition, and either party must provide at least 30 days written notice
                  prior to termination.
                </p>
                {sanitizedPreview.specialClauses && (
                  <p className="text-slate-700">
                    <strong>Special Clauses:</strong> {sanitizedPreview.specialClauses}
                  </p>
                )}
              </section>

              {/* 4. Signatures */}
              <section className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-[11px] text-slate-600">
                <div>
                  <div className="border-b border-slate-400 h-7 mb-1.5" />
                  <p className="font-semibold text-slate-900">
                    Landlord: {sanitizedPreview.landlordName}
                  </p>
                  <p>Date: ___________________</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 h-7 mb-1.5" />
                  <p className="font-semibold text-slate-900">
                    Tenant: {sanitizedPreview.tenantName}
                  </p>
                  <p>Date: ___________________</p>
                </div>
              </section>
            </article>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.downloadAgreementBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.downloadTxtBtn}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {t.cancelBtn}
            </button>

            {!readOnly && onSendToTenant && (
              <button
                type="button"
                onClick={handleSend}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t.sendAgreementToChat}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
