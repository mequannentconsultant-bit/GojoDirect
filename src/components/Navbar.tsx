import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Heart,
  MessageSquare,
  Bell,
  PlusCircle,
  Globe,
  LayoutDashboard,
  Home,
  CheckCircle2,
  AlertCircle,
  X,
  LogOut,
  Sun,
  Moon,
  Menu,
  User as UserIcon,
} from 'lucide-react';
import type { User, NotificationItem } from '../types/index.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';
import type { Theme } from '../utils/theme.ts';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  currentTab: 'explore' | 'landlord' | 'admin' | 'favorites';
  onSelectTab: (tab: 'explore' | 'landlord' | 'admin' | 'favorites') => void;
  favoritesCount: number;
  unreadMessagesCount: number;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  onMarkAllNotificationsRead: () => void;
  onOpenMessages: () => void;
  onOpenPostProperty: () => void;
  language: Language;
  onToggleLanguage: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  currentTab,
  onSelectTab,
  favoritesCount,
  unreadMessagesCount,
  notifications,
  onOpenNotifications,
  onMarkAllNotificationsRead,
  onOpenMessages,
  onOpenPostProperty,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
}) => {
  const t = translations[language];
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNotifsMenu, setShowNotifsMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const handleToggleNotifs = () => {
    const next = !showNotifsMenu;
    setShowNotifsMenu(next);
    setShowAccountMenu(false);
    if (next) {
      onOpenNotifications();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Logo + Desktop Nav */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-8 min-w-0">
          <button
            type="button"
            onClick={() => setShowMobileNav((prev) => !prev)}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('explore');
              setShowMobileNav(false);
            }}
            className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-700 to-emerald-800 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Gojo<span className="text-emerald-600 dark:text-emerald-400">Direct</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800/60">
                  Rent
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{language === 'en' ? 'Verified Homes' : 'የተረጋገጡ ቤቶች'}</span>
              </div>
            </div>
          </button>

          {/* Nav Links - RBAC Filtered */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectTab('explore')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'explore'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>{t.allCities}</span>
            </button>

            {/* Landlord Hub: Only visible to Landlord and Admin roles */}
            {(currentUser.role === 'landlord' || currentUser.role === 'admin') && (
              <button
                type="button"
                onClick={() => onSelectTab('landlord')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'landlord'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{t.landlordHub}</span>
                {currentUser.role === 'landlord' && currentUser.isVerifiedLandlord && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </button>
            )}

            {/* Admin Dashboard: Exclusively visible to System Administrator */}
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => onSelectTab('admin')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'admin'
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t.adminDashboard}</span>
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              </button>
            )}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Post Property Button: Strictly visible to Landlords only */}
          {currentUser.role === 'landlord' && (
            <button
              type="button"
              onClick={onOpenPostProperty}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.postProperty}</span>
            </button>
          )}

          {/* Favorites (Desktop/Tablet header; mobile accesses via menu drawer) */}
          <button
            type="button"
            onClick={() => onSelectTab('favorites')}
            className={`hidden sm:inline-flex relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              currentTab === 'favorites' ? 'bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400' : ''
            }`}
            title={t.favorites}
            aria-label={t.favorites}
          >
            <Heart
              className={`w-5 h-5 ${favoritesCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`}
            />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Messages */}
          <button
            type="button"
            onClick={onOpenMessages}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t.messages}
            aria-label={t.messages}
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={handleToggleNotifs}
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={t.notifications}
              aria-label={t.notifications}
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifsMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.notifications}</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    {unreadNotifsCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {t.markAllRead}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifsMenu(false)}
                      aria-label="Close notifications"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      {t.noNotificationsYet}
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          !item.isRead ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-0.5">
                            {item.type === 'inquiry' ? (
                              <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            ) : item.type === 'verification' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : item.type === 'alert' ? (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                            <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{item.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title={theme === 'dark' ? t.themeToggleLight : t.themeToggleDark}
            aria-label={theme === 'dark' ? t.themeToggleLight : t.themeToggleDark}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Language Switcher (Desktop/Tablet; available in mobile menu) */}
          <button
            type="button"
            onClick={onToggleLanguage}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title={t.langToggleLabel}
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'en' ? 'አማርኛ' : 'EN'}</span>
          </button>

          {/* Account Menu Pill (Own Profile Only — No Public Role Switching) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAccountMenu((prev) => !prev);
                setShowNotifsMenu(false);
              }}
              aria-label="Open account menu"
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.firstName}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
              />
              <span className="font-semibold text-slate-900 dark:text-white hidden md:inline">
                {currentUser.firstName}
              </span>
              <span
                className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase ${
                  currentUser.role === 'admin'
                    ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                    : currentUser.role === 'landlord'
                    ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {currentUser.role}
              </span>
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-2.5">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {currentUser.firstName} {currentUser.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {currentUser.phone}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('favorites');
                      setShowAccountMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      {t.favorites}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{favoritesCount}</span>
                  </button>

                  {(currentUser.role === 'landlord' || currentUser.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('landlord');
                        setShowAccountMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{t.landlordHub}</span>
                    </button>
                  )}

                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('admin');
                        setShowAccountMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>{t.adminDashboard}</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.logOutExitSession}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Direct Sign Out Button on Desktop */}
          <button
            type="button"
            onClick={onLogout}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900"
            title={t.logOut}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.logOut}</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {showMobileNav && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1.5">
          <button
            type="button"
            onClick={() => {
              onSelectTab('explore');
              setShowMobileNav(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              currentTab === 'explore'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{t.allCities}</span>
          </button>

          {(currentUser.role === 'landlord' || currentUser.role === 'admin') && (
            <button
              type="button"
              onClick={() => {
                onSelectTab('landlord');
                setShowMobileNav(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                currentTab === 'landlord'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{t.landlordHub}</span>
            </button>
          )}

          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                onSelectTab('admin');
                setShowMobileNav(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t.adminDashboard}</span>
            </button>
          )}

          {currentUser.role === 'landlord' && (
            <button
              type="button"
              onClick={() => {
                onOpenPostProperty();
                setShowMobileNav(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.postProperty}</span>
            </button>
          )}

          <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => {
                onSelectTab('favorites');
                setShowMobileNav(false);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} />
              <span>{t.favorites} ({favoritesCount})</span>
            </button>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'en' ? 'አማርኛ' : 'EN'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
