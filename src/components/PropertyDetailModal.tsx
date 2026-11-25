import React, { useState } from 'react';
import {
  X,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  ShieldCheck,
  CheckCircle2,
  Star,
  Phone,
  MessageSquare,
  AlertTriangle,
  Flag,
  Share2,
  Heart,
  Sparkles,
  Crown,
  Calendar,
  Check,
  Zap,
  Droplets,
  Building,
} from 'lucide-react';
import type { Property, Review, User } from '../types/index.ts';
import { formatETB, canSubmitReview } from '../utils/rules.ts';
import { sanitizePlainText, MAX_TEXT_LENGTHS } from '../utils/security.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';
import { PropertyLocationMap } from './PropertyLocationMap.tsx';

interface PropertyDetailModalProps {
  property: Property;
  onClose: () => void;
  currentUser: User;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onContactLandlord: (property: Property) => void;
  onReportProperty: (property: Property) => void;
  reviews: Review[];
  onAddReview: (review: { rating: number; comment: string }) => void;
  language: Language;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  onClose,
  currentUser,
  isFavorite,
  onToggleFavorite,
  onContactLandlord,
  onReportProperty,
  reviews,
  onAddReview,
  language,
}) => {
  const t = translations[language];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const propertyReviews = reviews.filter((r) => r.propertyId === property.id);
  const canReview = canSubmitReview(currentUser, property);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReview) return;
    const safeComment = sanitizePlainText(newComment, MAX_TEXT_LENGTHS.review);
    if (!safeComment) return;
    onAddReview({ rating: Math.min(5, Math.max(1, Math.round(newRating))), comment: safeComment });
    setNewComment('');
    setShowReviewForm(false);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {property.propertyType}
            </span>
            {property.isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Property
              </span>
            )}
            {property.featuredTier === 'gold' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                <Crown className="w-3.5 h-3.5 fill-white text-white" />
                Gold Featured
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Share Listing"
              aria-label="Share Listing"
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onToggleFavorite(property.id)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Favorite"
              aria-label="Favorite"
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorite ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Photos Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-16/9 rounded-xl overflow-hidden bg-slate-900 shadow-md">
              <img
                src={property.images[selectedImageIndex] || property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                Photo {selectedImageIndex + 1} of {property.images.length}
              </div>
            </div>

            {/* Thumbnails */}
            {property.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {property.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                      selectedImageIndex === idx
                        ? 'border-emerald-600 ring-2 ring-emerald-600/30'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & Key Summary Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                {property.title}
              </h2>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-sm mt-1.5 font-medium">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {property.address}, {property.neighborhood}, {property.subCity},{' '}
                  {property.city}
                </span>
              </div>
            </div>

            <div className="sm:text-right bg-emerald-50 dark:bg-emerald-950/50 sm:bg-transparent dark:sm:bg-transparent p-4 sm:p-0 rounded-xl">
              <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">
                {formatETB(property.rentPrice)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Monthly Rent • Direct to Landlord</p>
            </div>
          </div>

          {/* Key Specs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bedrooms</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {property.bedrooms > 0 ? `${property.bedrooms} Beds` : 'Studio'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400">
                <Bath className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bathrooms</p>
                <p className="font-bold text-slate-900 dark:text-white">{property.bathrooms} Baths</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Floor Area</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {property.areaSqM ? `${property.areaSqM} m²` : 'Spacious'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-400">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                <p className="font-bold text-slate-900 dark:text-white capitalize">{property.status}</p>
              </div>
            </div>
          </div>

          {/* Landlord Contact Box */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-bold text-xl flex items-center justify-center ring-4 ring-slate-700 shrink-0">
                {property.ownerName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-white">{property.ownerName}</h3>
                  {property.ownerVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Verified ID
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {property.ownerRating}
                  </span>
                  <span>({property.ownerReviewCount} reviews)</span>
                  <span>•</span>
                  <span>Direct Property Owner</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  {property.ownerPhone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {currentUser.id === property.ownerId ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700/80 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.ownListingNotice}</span>
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onContactLandlord(property)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat Directly</span>
                  </button>
                  <a
                    href={`tel:${property.ownerPhone}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">Call</span>
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Property Description</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Approximate Location Map */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3">{t.locationMap}</h3>
            <PropertyLocationMap
              city={property.city}
              subCity={property.subCity}
              neighborhood={property.neighborhood}
              address={property.address}
              language={language}
            />
          </div>

          {/* Amenities Grid */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3">Amenities & Facilities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {property.amenities.map((amenity) => (
                <div
                  key={amenity}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ethiopian Trust & Anti-Broker Banner */}
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-950 dark:text-amber-200 mb-0.5">
                GojoDirect Anti-Broker (Delala) Guarantee
              </p>
              <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                This listing was posted directly by the registered landlord. Never pay any fee
                simply to inspect a house. If anyone claims broker fees or asks for prepayment
                before signing a verified lease, report them immediately.
              </p>
            </div>
            <button
              onClick={() => onReportProperty(property)}
              className="px-3 py-1.5 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800/70 text-amber-900 dark:text-amber-100 font-semibold shrink-0 cursor-pointer transition-colors flex items-center gap-1"
            >
              <Flag className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Report Listing</span>
            </button>
          </div>

          {/* Reviews & Ratings Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <span>Tenant Reviews</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    {propertyReviews.length}
                  </span>
                </h3>
              </div>

              {canReview && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {showReviewForm ? 'Cancel Review' : '+ Add Review'}
                </button>
              )}
            </div>

            {/* Review form */}
            {canReview && showReviewForm && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700 mb-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        aria-label={`Rate ${star} stars`}
                        className="cursor-pointer text-amber-400 p-0.5"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= newRating ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  required
                  placeholder={t.reviewPlaceholder}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer"
                  >
                    {t.submitReview}
                  </button>
                </div>
              </form>
            )}

            {/* Existing Reviews */}
            {propertyReviews.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                {t.noReviewsYet}
              </div>
            ) : (
              <div className="space-y-3">
                {propertyReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/80"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center">
                          {rev.tenantName.charAt(0)}
                        </div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {rev.tenantName}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-amber-400' : 'text-slate-200 dark:text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer CTA */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">{t.totalMonthlyRent}:</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {formatETB(property.rentPrice)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser.id !== property.ownerId && (
              <button
                type="button"
                onClick={() => onContactLandlord(property)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all"
              >
                {t.contactLandlordDirectly}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
