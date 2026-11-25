import React, { useState } from 'react';
import { X, Crown, Sparkles, CheckCircle2, Smartphone } from 'lucide-react';
import type { Property, FeaturedTier } from '../types/index.ts';
import { calculateFeaturedPrice, formatETB } from '../utils/rules.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface UpgradeTierModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onUpgradeTier: (propertyId: string, newTier: FeaturedTier) => void;
  language?: Language;
}

export const UpgradeTierModal: React.FC<UpgradeTierModalProps> = ({
  property,
  isOpen,
  onClose,
  onUpgradeTier,
  language = 'en',
}) => {
  const t = translations[language];
  const [selectedTier, setSelectedTier] = useState<FeaturedTier>('gold');
  const [paymentProvider, setPaymentProvider] = useState<'telebirr' | 'cbe' | 'chapa'>('telebirr');
  const [phoneNumber, setPhoneNumber] = useState('0912345678');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  if (!isOpen || !property) return null;

  const cost = calculateFeaturedPrice(selectedTier);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
      setTimeout(() => {
        onUpgradeTier(property.id, selectedTier);
        setIsComplete(false);
        onClose();
      }, 900);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">{t.boostModalTitle}</h2>
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

        {/* Content */}
        <form onSubmit={handlePay} className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-12 h-10 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{property.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{property.city} • {property.subCity}</p>
            </div>
          </div>

          {/* Tier options */}
          <div className="grid grid-cols-2 gap-3">
            {/* Premium */}
            <button
              type="button"
              onClick={() => setSelectedTier('premium')}
              className={`p-3.5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                selectedTier === 'premium'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-900 dark:text-blue-300">
                  {language === 'am' ? 'ፕሪሚየም' : 'Premium'}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xl font-extrabold text-blue-950 dark:text-white mt-1">300 ETB</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'am' ? 'የ30 ቀናት ሰማያዊ ድምቀት' : '30-day highlighted border'}
              </p>
            </button>

            {/* Gold */}
            <button
              type="button"
              onClick={() => setSelectedTier('gold')}
              className={`p-3.5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                selectedTier === 'gold'
                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-md ring-2 ring-amber-400/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-900 dark:text-amber-300">
                  {language === 'am' ? 'ወርቅ ደረጃ' : 'Gold Priority'}
                </span>
                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              </div>
              <p className="text-xl font-extrabold text-amber-950 dark:text-white mt-1">800 ETB</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'am' ? 'የፊት ገጽ ደረጃ + የወርቅ ዘውድ' : 'Top rank + gold crown badge'}
              </p>
            </button>
          </div>

          {/* Payment Provider Selection */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'am' ? 'የኢትዮጵያ የክፍያ አማራጭ ይምረጡ:' : 'Select Ethiopian Payment Provider:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentProvider('telebirr')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  paymentProvider === 'telebirr'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <span>{t.telebirrWallet}</span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">{t.telebirrProvider}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentProvider('cbe')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  paymentProvider === 'cbe'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <span>{t.cbeBirrWallet}</span>
                <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold">{t.cbeProvider}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentProvider('chapa')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  paymentProvider === 'chapa'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <span>{t.chapaWallet}</span>
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold">{t.chapaProvider}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.walletNumberLabel}
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-emerald-500"
                placeholder={t.walletPhonePlaceholder}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">{t.totalDueLabel}</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{formatETB(cost)}</span>
            </div>

            <button
              type="submit"
              disabled={isProcessing || isComplete}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isProcessing ? (
                <span>{t.processingPaymentBtn}</span>
              ) : isComplete ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'am' ? 'ማስተዋወቂያው ነቅቷል!' : 'Boost Activated!'}</span>
                </>
              ) : (
                <span>
                  {language === 'am' ? `ክፈልና አድምቅ (${formatETB(cost)})` : `Pay & Activate (${formatETB(cost)})`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
