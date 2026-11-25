import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Building,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  ExternalLink,
  Crown,
  Search,
  Filter,
  Ban,
  UserCheck,
} from 'lucide-react';
import type {
  User,
  Property,
  LandlordVerification,
  FraudReport,
} from '../types/index.ts';
import { formatETB } from '../utils/rules.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface AdminDashboardProps {
  users: User[];
  properties: Property[];
  verifications: LandlordVerification[];
  fraudReports: FraudReport[];
  onApproveVerification: (verificationId: string) => void;
  onRejectVerification: (verificationId: string, reason: string) => void;
  onResolveFraudReport: (reportId: string, action: 'dismiss' | 'remove_property') => void;
  onToggleUserStatus: (userId: string) => void;
  onSelectProperty: (property: Property) => void;
  language?: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  properties,
  verifications,
  fraudReports,
  onApproveVerification,
  onRejectVerification,
  onResolveFraudReport,
  onToggleUserStatus,
  onSelectProperty,
  language = 'en',
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'verifications' | 'fraud' | 'users' | 'revenue'>('verifications');
  const [filterPendingOnly, setFilterPendingOnly] = useState(true);
  const [rejectingVerifId, setRejectingVerifId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Document image blurry or expired');

  // Computed KPIs
  const totalLandlords = users.filter((u) => u.role === 'landlord').length;
  const totalTenants = users.filter((u) => u.role === 'tenant').length;
  const activeListings = properties.filter((p) => p.status === 'available').length;
  const pendingVerifs = verifications.filter((v) => v.status === 'pending');
  const pendingReports = fraudReports.filter((r) => r.status === 'pending');

  // Compute revenue from featured tiers: Gold (800 ETB) and Premium (300 ETB)
  const totalRevenueETB = properties.reduce((sum, p) => {
    if (p.featuredTier === 'gold') return sum + 800;
    if (p.featuredTier === 'premium') return sum + 300;
    return sum;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500 text-slate-950">
              Operations Center
            </span>
            <span className="text-slate-400 text-xs">Trust & Safety Platform</span>
          </div>
          <h1 className="text-2xl font-extrabold">GojoDirect Administration</h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time identity verification, anti-fraud delala triage, and rental ecosystem governance
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated Revenue</p>
            <p className="text-lg font-black text-emerald-400">{formatETB(totalRevenueETB)}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Users</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{users.length}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{totalTenants} Tenants • {totalLandlords} Landlords</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Active Properties</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeListings}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{properties.length} Total in Database</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Pending IDs</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingVerifs.length}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">National ID verification</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">Fraud Reports</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{pendingReports.length}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Flagged / broker reports</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Verified Landlords</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {users.filter((u) => u.isVerifiedLandlord).length}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">High trust partners</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">Featured Boosts</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {properties.filter((p) => p.featuredTier !== 'basic').length}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Gold & Premium</p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'verifications'
                ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Landlord Verifications</span>
            {pendingVerifs.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full">
                {pendingVerifs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fraud')}
            className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'fraud'
                ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Fraud & Scam Reports</span>
            {pendingReports.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-full">
                {pendingReports.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>User Management ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('revenue')}
            className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'revenue'
                ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Subscriptions & Revenue</span>
          </button>
        </div>

        {/* Tab 1: Landlord Verifications */}
        {activeTab === 'verifications' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Landlord Identity Verification Queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verify Ethiopian National ID, Kebele ID, or Passport to assign the Verified Shield
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterPendingOnly}
                  onChange={(e) => setFilterPendingOnly(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                Show Pending Only
              </label>
            </div>

            {(filterPendingOnly ? pendingVerifs : verifications).length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                No landlord verification requests matching this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {(filterPendingOnly ? pendingVerifs : verifications).map((verif) => (
                  <div
                    key={verif.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={verif.documentUrl}
                        alt="National ID Document"
                        className="w-24 h-16 rounded-lg object-cover border border-slate-300 dark:border-slate-600 shadow-xs shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{verif.userName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              verif.status === 'approved'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : verif.status === 'rejected'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {verif.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {verif.documentType}: <strong>{verif.documentNumber}</strong>
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {verif.userEmail} • {verif.userPhone} • Submitted:{' '}
                          {new Date(verif.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {verif.status === 'pending' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApproveVerification(verif.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve ID</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingVerifId(verif.id)}
                          className="px-3 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Status: {verif.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Fraud & Scam Reports */}
        {activeTab === 'fraud' && (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Tenant Anti-Broker & Fraud Incident Queue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reports submitted by users against fake listings, unregistered brokers (delalas), or scams
              </p>
            </div>

            {fraudReports.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                No active fraud reports. All listings are clean!
              </div>
            ) : (
              <div className="space-y-3">
                {fraudReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/40 dark:bg-rose-950/20 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {report.propertyTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 dark:bg-rose-900/70 text-rose-900 dark:text-rose-200 uppercase">
                          {report.reason}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Reported by: <strong>{report.reporterName}</strong> on{' '}
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 leading-relaxed">
                      "{report.details}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Status: <strong className="uppercase">{report.status}</strong>
                      </span>

                      {report.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onResolveFraudReport(report.id, 'remove_property')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Fake Listing</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onResolveFraudReport(report.id, 'dismiss')}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                          >
                            Dismiss Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: User Management */}
        {activeTab === 'users' && (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Registered Platform Users</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Oversee landlords, tenants, and active account standing
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatarUrl}
                      alt={u.firstName}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {u.firstName} {u.lastName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                              : u.role === 'landlord'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {u.role}
                        </span>
                        {u.isVerifiedLandlord && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {u.email} • {u.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        u.status === 'active'
                          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
                          : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50'
                      }`}
                    >
                      {u.status}
                    </span>

                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => onToggleUserStatus(u.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Revenue & Subscriptions */}
        {activeTab === 'revenue' && (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Monetization & Featured Upgrades</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Telebirr & CBE Birr payments received for 30-day listing boosts
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Basic Tier (Free)</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {properties.filter((p) => p.featuredTier === 'basic').length}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">0 ETB / mo</p>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase">Premium Boost</span>
                  <Crown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-black text-blue-950 dark:text-blue-200 mt-1">
                  {properties.filter((p) => p.featuredTier === 'premium').length}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">300 ETB / mo per property</p>
              </div>

              <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">Gold Boost</span>
                  <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                </div>
                <p className="text-2xl font-black text-amber-950 dark:text-amber-200 mt-1">
                  {properties.filter((p) => p.featuredTier === 'gold').length}
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">800 ETB / mo per property</p>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-2">
                Active Monetized Listings
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {properties
                  .filter((p) => p.featuredTier !== 'basic')
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt={p.title}
                          className="w-12 h-10 rounded-lg object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">{p.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Owner: {p.ownerName} • {p.city}, {p.subCity}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            p.featuredTier === 'gold'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300'
                          }`}
                        >
                          {p.featuredTier.toUpperCase()} ({p.featuredTier === 'gold' ? '800 ETB' : '300 ETB'})
                        </span>

                        <button
                          type="button"
                          onClick={() => onSelectProperty(p)}
                          className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ID Rejection Reason Modal */}
      {rejectingVerifId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Reject Landlord ID Document</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Provide an explanation for the applicant</p>
              </div>
            </div>

            <div>
              <label htmlFor="admin-rejection-reason" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Rejection:
              </label>
              <select
                id="admin-rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Document image blurry or unreadable">Document image blurry or unreadable</option>
                <option value="Expired National ID / Kebele card">Expired National ID / Kebele card</option>
                <option value="Name on ID does not match account name">Name on ID does not match account name</option>
                <option value="Invalid or unrecognized document type">Invalid or unrecognized document type</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingVerifId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRejectVerification(rejectingVerifId, rejectionReason);
                  setRejectingVerifId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
