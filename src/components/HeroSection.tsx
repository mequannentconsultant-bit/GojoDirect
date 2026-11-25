import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Home,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle,
  Building,
  Sparkles,
  Zap,
  Mic,
  MicOff,
  X,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import type { SearchFilters } from '../types/index.ts';
import { ETHIOPIAN_CITIES, ADDIS_SUBCITIES, PROPERTY_TYPES } from '../data/mockData.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface HeroSectionProps {
  filters: SearchFilters;
  onUpdateFilters: (updates: Partial<SearchFilters>) => void;
  onResetFilters: () => void;
  language: Language;
}

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal?: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  language,
}) => {
  const t = translations[language];

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<'am' | 'en'>(language === 'am' ? 'am' : 'en');
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Sync speech language default when platform language changes
  useEffect(() => {
    setSpeechLang(language === 'am' ? 'am' : 'en');
  }, [language]);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        setIsSpeechSupported(false);
      }
    }
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, []);

  const handleToggleVoiceSearch = () => {
    setSpeechError(null);

    // If currently listening, stop it
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      setSpeechFeedback(null);
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsSpeechSupported(false);
      setSpeechError(t.voiceSearchNotSupported);
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      const recognition: SpeechRecognitionInstance = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      // Amharic (am-ET) or English (en-US / en-ET)
      recognition.lang = speechLang === 'am' ? 'am-ET' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setSpeechFeedback(
          speechLang === 'am'
            ? 'አማርኛ እያዳመጠ ነው... የሚፈልጉትን ሰፈር፣ ከተማ ወይም የቤት ዓይነት ይናገሩ'
            : 'Listening in English... Speak property location, city or type'
        );
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        if (!event.results || event.results.length === 0) return;
        const currentResult = event.results[event.results.length - 1];
        const transcript = currentResult[0].transcript;

        if (transcript) {
          onUpdateFilters({ query: transcript });
          setSpeechFeedback(
            speechLang === 'am'
              ? `የተሰማው ድምጽ: "${transcript}"`
              : `Recognized: "${transcript}"`
          );
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        setIsListening(false);
        setSpeechFeedback(null);
        if (event.error === 'not-allowed') {
          setSpeechError(
            language === 'am'
              ? 'የማይክሮፎን ፈቃድ ተከልክሏል። እባክዎ በብሮውዘርዎ ፈቃድ ይስጡ።'
              : 'Microphone permission was denied. Please allow microphone access.'
          );
        } else if (event.error === 'no-speech') {
          setSpeechError(
            language === 'am'
              ? 'ምንም ድምጽ አልተሰማም። እባክዎ እንደገና ይሞክሩ።'
              : 'No voice was detected. Please try speaking again.'
          );
        } else {
          setSpeechError(t.voiceSearchError);
        }
        setTimeout(() => setSpeechError(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => setSpeechFeedback(null), 2500);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setSpeechFeedback(null);
      setSpeechError(t.voiceSearchError);
      setTimeout(() => setSpeechError(null), 4000);
    }
  };

  const handleToggleSpeechLanguage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLang = speechLang === 'am' ? 'en' : 'am';
    setSpeechLang(nextLang);
    // If currently listening, restart with the new language
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
  };

  const quickPicks = [
    { label: 'Bole Medhanialem', city: 'Addis Ababa', subCity: 'Bole' },
    { label: 'CMC & Yeka', city: 'Addis Ababa', subCity: 'Yeka' },
    { label: 'Kazanchis Offices', city: 'Addis Ababa', subCity: 'Kirkos' },
    { label: 'Hawassa Lakefront', city: 'Hawassa', subCity: '' },
    { label: 'Diplomatic Villas (Old Airport)', city: 'Addis Ababa', subCity: 'Nifas Silk' },
  ];

  return (
    <div className="relative bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background architectural geometric texture */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        {/* Ethiopian Flag subtle badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 text-xs font-semibold mb-6 backdrop-blur-xs">
          <span className="flex items-center gap-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </span>
          <span>{language === 'en' ? 'Direct House Rentals in Ethiopia' : 'ቀጥታ የቤት ኪራይ በኢትዮጵያ'}</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          {t.heroTitle}
        </h1>
        <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base mb-8 leading-relaxed">
          {t.heroSubtitle}
        </p>

        {/* Search & Filter Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-2xl text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 max-w-4xl mx-auto text-left transition-colors">
          {/* Main search text input with Web Speech Microphone Search */}
          <div className="relative mb-3.5">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={filters.query}
              onChange={(e) => onUpdateFilters({ query: e.target.value })}
              className={`w-full pl-11 pr-28 sm:pr-32 py-2.5 rounded-xl border text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-white ${
                isListening
                  ? 'border-rose-400 ring-2 ring-rose-400/30 bg-rose-50/20 dark:bg-rose-950/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />

            {/* Right Action Controls: Clear query & Web Speech Microphone */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {filters.query && (
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ query: '' })}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Voice recognition language switch (Amharic am-ET / English en-US) */}
              <button
                type="button"
                onClick={handleToggleSpeechLanguage}
                className="px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                title={
                  speechLang === 'am'
                    ? 'Voice Search: Amharic (Click to switch to English)'
                    : 'Voice Search: English (Click to switch to Amharic)'
                }
                aria-label={speechLang === 'am' ? 'Voice language: Amharic' : 'Voice language: English'}
              >
                {speechLang === 'am' ? 'አማ' : 'EN'}
              </button>

              {/* Web Speech Microphone Button */}
              <button
                type="button"
                onClick={handleToggleVoiceSearch}
                className={`p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center relative ${
                  isListening
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400 animate-pulse'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
                title={
                  isListening
                    ? t.stopListening
                    : `${t.clickToSpeak} (${speechLang === 'am' ? 'አማርኛ' : 'English'})`
                }
                aria-label={isListening ? t.stopListening : t.clickToSpeak}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                )}
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>
            </div>
          </div>

          {/* Active Listening & Speech Feedback Banner */}
          {(isListening || speechFeedback || speechError) && (
            <div
              className={`mb-3.5 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all animate-in fade-in duration-200 ${
                speechError
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                  : isListening
                  ? 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {speechError ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                ) : isListening ? (
                  <span className="flex h-2.5 w-2.5 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                  </span>
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span className="font-medium truncate">
                  {speechError || speechFeedback || (speechLang === 'am' ? t.listeningInAmharic : t.listeningInEnglish)}
                </span>
              </div>

              {isListening && (
                <button
                  type="button"
                  onClick={handleToggleVoiceSearch}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-200 dark:bg-rose-900 hover:bg-rose-300 dark:hover:bg-rose-800 text-rose-900 dark:text-rose-100 transition-colors cursor-pointer shrink-0"
                >
                  {language === 'am' ? 'አቁም' : 'Stop'}
                </button>
              )}
            </div>
          )}

          {/* Grid Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* City */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t.city}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={filters.city}
                  onChange={(e) =>
                    onUpdateFilters({
                      city: e.target.value,
                      subCity: e.target.value !== 'Addis Ababa' ? 'all' : filters.subCity,
                    })
                  }
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 outline-none cursor-pointer"
                >
                  <option value="all">{t.allCities}</option>
                  {ETHIOPIAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-city (Active for Addis Ababa or All) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t.subCity}
              </label>
              <select
                value={filters.subCity}
                disabled={filters.city !== 'Addis Ababa' && filters.city !== 'all'}
                onChange={(e) => onUpdateFilters({ subCity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="all">{t.allSubCities}</option>
                {ADDIS_SUBCITIES.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t.propertyType}
              </label>
              <select
                value={filters.propertyType}
                onChange={(e) => onUpdateFilters({ propertyType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 outline-none cursor-pointer"
              >
                <option value="all">{t.allTypes}</option>
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t.bedrooms}
              </label>
              <select
                value={filters.bedrooms}
                onChange={(e) => onUpdateFilters({ bedrooms: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 outline-none cursor-pointer"
              >
                <option value="all">{t.allBedrooms}</option>
                <option value="1">1 Bedroom / Studio</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4+">4+ Bedrooms</option>
              </select>
            </div>
          </div>

          {/* Secondary filter row: Price bounds + Verified Only Toggle + Reset */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Budget (ETB):
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min ETB"
                  value={filters.minPrice || ''}
                  onChange={(e) =>
                    onUpdateFilters({ minPrice: Number(e.target.value) || 0 })
                  }
                  className="w-24 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 dark:text-slate-500">-</span>
                <input
                  type="number"
                  placeholder="Max ETB"
                  value={filters.maxPrice || ''}
                  onChange={(e) =>
                    onUpdateFilters({ maxPrice: Number(e.target.value) || 0 })
                  }
                  className="w-28 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Verified Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) => onUpdateFilters({ verifiedOnly: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {t.verifiedOnly}
                </span>
              </label>

              {/* Reset Filters button */}
              <button
                onClick={onResetFilters}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer text-xs"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Quick Pick Shortcuts */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Popular:</span>
          {quickPicks.map((pick) => (
            <button
              key={pick.label}
              onClick={() => {
                onUpdateFilters({
                  city: pick.city,
                  subCity: pick.subCity || 'all',
                });
              }}
              className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-emerald-800/80 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer"
            >
              {pick.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
