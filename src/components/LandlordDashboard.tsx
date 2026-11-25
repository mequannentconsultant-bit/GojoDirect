import React from 'react';
import {
  Building2,
  PlusCircle,
  ShieldCheck,
  AlertCircle,
  Eye,
  MessageSquare,
  Sparkles,
  Crown,
  CheckCircle2,
  Trash2,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import type { Property, User, Conversation } from '../types/index.ts';
import { formatETB } from '../utils/rules.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface LandlordDashboardProps {
  currentUser: User;
  properties: Property[];
  conversations: Conversation[];
  onOpenPostProperty: () => void;
  onOpenVerificationModal: () => void;
  onOpenUpgradeModal: (property: Property) => void;
  onTogglePropertyStatus: (propertyId: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  onOpenConversation: (convId: string) => void;
  onSelectProperty: (property: Property) => void;
  language: Language;
}

export const LandlordDashboard: React.FC<LandlordDashboardProps> = ({
  currentUser,
  properties,
  conversations,
  onOpenPostProperty,
  onOpenVerificationModal,
  onOpenUpgradeModal,
  onTogglePropertyStatus,
  onDeleteProperty,
  onOpenConversation,
  onSelectProperty,
  language,
}) => {
  const t = translations[language];

  // Properties belonging to this landlord
  const myProperties = properties.filter((p) => p.ownerId === currentUser.id);

  // Stats
  const activeCount = myProperties.filter((p) => p.status === 'available').length;
  const totalViews = myProperties.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const myConversations = conversations.filter((c) => c.landlordId === currentUser.id);
  const [propertyToDelete, setPropertyToDelete] = React.useState<Property | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Landlord Hero / Profile Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.firstName}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/30"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {currentUser.firstName} {currentUser.lastName}
              </h1>
              {currentUser.isVerifiedLandlord ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Verified Landlord
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Identity Unverified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {currentUser.phone} • Direct Landlord Account
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {!currentUser.isVerifiedLandlord && (
            <button
              type="button"
              onClick={onOpenVerificationModal}
              className="px-4 py-2.5 rounded-xl border border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Verify National ID</span>
            </button>
          )}

          {currentUser.role === 'landlord' && (
            <button
              type="button"
              onClick={onOpenPostProperty}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.postNewPropertyBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Verification Notice banner if unverified */}
      {!currentUser.isVerifiedLandlord && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-amber-500/5 border border-amber-200 dark:border-amber-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                Unlock the GojoDirect Verified Shield Badge
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Submit your Ethiopian National ID, Kebele Card, or Passport. Verified listings get
                3x more inquiries and tenant trust.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenVerificationModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
          >
            Upload ID Now
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Listed
            </span>
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {myProperties.length}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Properties in portfolio</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Rentals
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">{activeCount}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Ready for occupancy</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tenant Views
            </span>
            <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">{totalViews}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Searches & impressions</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Inquiries
            </span>
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {myConversations.length}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Direct tenant chats</p>
        </div>
      </div>

      {/* Property Inventory Management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Your Property Listings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage rent status, boost listings, or update photos</p>
          </div>
          {currentUser.role === 'landlord' && (
            <button
              type="button"
              onClick={onOpenPostProperty}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t.postProperty}</span>
            </button>
          )}
        </div>

        {myProperties.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No properties posted yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              List your Addis Ababa or regional house and start getting direct tenant inquiries.
            </p>
            {currentUser.role === 'landlord' && (
              <button
                type="button"
                onClick={onOpenPostProperty}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.postNewPropertyBtn}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {myProperties.map((prop) => (
              <div
                key={prop.id}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={prop.images[0]}
                    alt={prop.title}
                    className="w-20 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {prop.title}
                      </span>
                      {prop.featuredTier === 'gold' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                          Gold
                        </span>
                      )}
                      {prop.featuredTier === 'premium' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                          <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {prop.city} • {prop.subCity} ({prop.neighborhood})
                    </p>
                    <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatETB(prop.rentPrice)} / mo
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                  {/* Status toggle */}
                  <button
                    type="button"
                    onClick={() => onTogglePropertyStatus(prop.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      prop.status === 'available'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/70'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    Status: {prop.status === 'available' ? 'Available' : 'Rented/Occupied'}
                  </button>

                  {/* Boost Tier */}
                  <button
                    type="button"
                    onClick={() => onOpenUpgradeModal(prop)}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Boost Tier</span>
                  </button>

                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => onSelectProperty(prop)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Preview
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setPropertyToDelete(prop)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    title="Delete listing"
                    aria-label={`Delete listing ${prop.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Inquiries List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-colors">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Recent Tenant Inquiries</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Direct messages from verified house seekers
        </p>

        {myConversations.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
            No inquiries yet. Keep your property price realistic and photos high quality to attract tenants!
          </p>
        ) : (
          <div className="space-y-2">
            {myConversations.map((conv) => (
              <div
                key={conv.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {conv.tenantName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{conv.tenantName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{conv.lastMessage}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenConversation(conv.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  Reply Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {propertyToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Delete Rental Listing?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              "{propertyToDelete.title}"
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPropertyToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProperty(propertyToDelete.id);
                  setPropertyToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
