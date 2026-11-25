import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import type { UserRole } from '../types/index.ts';
import { translations, type Language } from '../utils/i18n.ts';
import type { Theme } from '../utils/theme.ts';
import { evaluatePasswordStrength } from '../utils/auth.ts';

interface AuthActionResult {
  ok: boolean;
  error?: string;
}

interface LoginViewProps {
  onSignIn: (identifier: string, password: string) => AuthActionResult | Promise<AuthActionResult>;
  onRegister: (newUser: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: Exclude<UserRole, 'admin'>;
  }) => AuthActionResult | Promise<AuthActionResult>;
  language: Language;
  onToggleLanguage?: () => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSignIn,
  onRegister,
  language,
  onToggleLanguage,
  theme = 'light',
  onToggleTheme,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Sign in form state (never pre-filled for public security)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('09');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState<'tenant' | 'landlord'>('tenant');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = evaluatePasswordStrength(regPassword);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setLoginError('');
    setIsSubmitting(true);
    try {
      const result = await onSignIn(loginIdentifier, loginPassword);
      if (!result.ok) {
        setLoginError(result.error || t.authInvalidCreds);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setRegError('');
    setIsSubmitting(true);
    try {
      const result = await onRegister({
        firstName: regFirstName,
        lastName: regLastName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        role: regRole,
      });

      if (!result.ok && result.error) {
        setRegError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden">
      {/* Background architectural geometric texture */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Language and Theme Toggle */}
      <div className="relative z-20 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-400" />
          <span className="font-extrabold text-sm tracking-wide text-white">
            Gojo<span className="text-emerald-400">Direct</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-700 bg-slate-800/80 text-amber-300 hover:border-amber-400 hover:text-white transition-all cursor-pointer shadow-xs"
              title={theme === 'dark' ? t.themeToggleLight : t.themeToggleDark}
              aria-label={theme === 'dark' ? t.themeToggleLight : t.themeToggleDark}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline text-[11px] text-amber-200">{t.lightMode}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-300" />
                  <span className="hidden sm:inline text-[11px] text-slate-300">{t.darkMode}</span>
                </>
              )}
            </button>
          )}

          {onToggleLanguage && (
            <button
              type="button"
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-700 bg-slate-800/80 text-emerald-300 hover:border-emerald-500 hover:text-white transition-all cursor-pointer shadow-xs"
              title={t.langToggleLabel}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{t.langToggle}</span>
              <span className="text-[10px] text-slate-400 font-mono">({language.toUpperCase()})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 sm:py-10 w-full my-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-xl shadow-emerald-700/30 mb-3">
            <Building2 className="w-8 h-8 text-emerald-100" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.loginHeading}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
            {t.loginTagline}
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 max-w-lg mx-auto transition-colors">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setLoginError('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.signInTab}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.createAccountTab}
            </button>
          </div>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              {loginError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {loginError}
                </div>
              )}

              <div>
                <label htmlFor="login-identifier" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.identifierLabel}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    autoComplete="username"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={t.identifierPlaceholder}
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.passwordLabel}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{t.signInBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 pt-1">
                {language === 'am' ? 'አዲስ ተጠቃሚ ነዎት?' : 'New to GojoDirect?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setLoginError('');
                  }}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  {t.createAccountTab}
                </button>
              </p>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {regError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {regError}
                </div>
              )}

              {/* Role selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.roleSelectLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('tenant')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                      regRole === 'tenant'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{t.roleTenantChoice}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {language === 'am' ? 'ይፈልጉ እና ይከራዩ' : 'Search & Rent'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('landlord')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                      regRole === 'landlord'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{t.roleLandlordChoice}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {language === 'am' ? 'ያከራዩ እና ያስተዳድሩ' : 'Post & Manage'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="reg-first-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.firstNameLabel}</label>
                  <input
                    id="reg-first-name"
                    type="text"
                    required
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder={t.firstNamePlaceholder}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="reg-last-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.lastNameLabel}</label>
                  <input
                    id="reg-last-name"
                    type="text"
                    required
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder={t.lastNamePlaceholder}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.emailLabel}</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="reg-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.phoneLabel}
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder={t.phonePlaceholder}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.passwordLabel}</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full pl-3 pr-9 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Real-Time Password Strength Visual Meter */}
                <div
                  className="mt-2 space-y-1.5"
                  role="status"
                  aria-live="polite"
                  aria-label={`${t.passwordStrengthLabel}: ${
                    passwordStrength.level === 'strong'
                      ? t.passwordStrengthStrong
                      : passwordStrength.level === 'fair'
                      ? t.passwordStrengthFair
                      : passwordStrength.level === 'weak'
                      ? t.passwordStrengthWeak
                      : t.passwordStrengthEmpty
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {t.passwordStrengthLabel}
                    </span>
                    <span
                      className={`font-bold ${
                        passwordStrength.level === 'strong'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : passwordStrength.level === 'fair'
                          ? 'text-amber-600 dark:text-amber-400'
                          : passwordStrength.level === 'weak'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {passwordStrength.level === 'strong'
                        ? t.passwordStrengthStrong
                        : passwordStrength.level === 'fair'
                        ? t.passwordStrengthFair
                        : passwordStrength.level === 'weak'
                        ? t.passwordStrengthWeak
                        : t.passwordStrengthEmpty}
                    </span>
                  </div>

                  {/* 3-segment Strength Bar */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((segment) => {
                      const active = passwordStrength.score >= segment;
                      const barColor =
                        passwordStrength.level === 'strong'
                          ? 'bg-emerald-500'
                          : passwordStrength.level === 'fair'
                          ? 'bg-amber-500'
                          : 'bg-rose-500';
                      return (
                        <div
                          key={segment}
                          className={`h-1.5 rounded-full transition-colors duration-200 ${
                            active ? barColor : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Compact Requirement Indicators */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] pt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 transition-colors ${
                        passwordStrength.checks.minLength
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{t.pwReqMinLength}</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 transition-colors ${
                        passwordStrength.checks.hasLowerAndUpper
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{t.pwReqMixedCase}</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 transition-colors ${
                        passwordStrength.checks.hasNumberOrSymbol
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{t.pwReqNumberSymbol}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{t.createAccountSubmitBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Trust Note */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{t.safeRentalStandard}</span>
          </div>
        </div>

        {/* Developer Attribution & Direct Support Hotline */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p className="text-[11px] text-slate-400">
            {t.devAttribution} • {t.supportHotlineLabel}: <strong className="text-emerald-400">0919798913</strong>
          </p>
        </div>
      </div>
    </div>
  );
};
