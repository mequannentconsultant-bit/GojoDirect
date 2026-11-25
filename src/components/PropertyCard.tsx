import React from 'react';
import {
  Heart,
  ShieldCheck,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  Crown,
  Sparkles,
  Star,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import type { Property } from '../types/index.ts';
import { formatETB } from '../utils/rules.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface PropertyCardProps {
  property: Property;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onQuickContact: (property: Property) => void;
  language: Language;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isFavorite,
  onToggleFavorite,
  onSelectProperty,
  onQuickContact,
  language,
}) => {
  const t = translations[language];

  const isGold = property.featuredTier === 'gold';
  const isPremium = property.featuredTier === 'premium';

  return (
    <div
      className={`group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl flex flex-col ${
        isGold
          ? 'border-amber-400 dark:border-amber-500/80 ring-2 ring-amber-400/20 shadow-md'
          : isPremium
          ? 'border-blue-300 dark:border-blue-500/60 shadow-xs'
          : 'border-slate-200/80 dark:border-slate-800 shadow-xs'
      }`}
    >
      {/* Image container */}
      <div className="relative aspect-16/10 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={property.images[0]}
          alt={property.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top left badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {/* Featured tier */}
          {isGold && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md">
              <Crown className="w-3 h-3 text-amber-200 fill-amber-200" />
              GOLD FEATURED
            </span>
          )}
          {isPremium && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white shadow-xs">
              <Sparkles className="w-3 h-3" />
              PREMIUM
            </span>
          )}

          {/* Verified Badge */}
          {property.isVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-600 text-white shadow-xs backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              {language === 'en' ? 'Verified' : 'የተረጋገጠ'}
            </span>
          )}
        </div>

        {/* Top right favorite button & status */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              property.status === 'available'
                ? 'bg-emerald-500/90 text-white'
                : 'bg-slate-700/90 text-slate-200'
            }`}
          >
            {property.status === 'available' ? t.available : t.occupied}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="p-2 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md transition-transform active:scale-90 cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 ${
                isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600 dark:text-slate-300'
              }`}
            />
          </button>
        </div>

        {/* Bottom image overlay: Price banner */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent p-3 pt-6 flex items-end justify-between">
          <div>
            <span className="text-xl font-extrabold text-white tracking-tight drop-shadow-xs">
              {formatETB(property.rentPrice)}
            </span>
            <span className="text-slate-200 text-xs ml-1 font-medium drop-shadow-xs">
              {t.perMonth}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
            {property.propertyType}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">
              {property.city} • {property.subCity} ({property.neighborhood})
            </span>
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelectProperty(property)}
            className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-1 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer mb-2.5 transition-colors"
          >
            {property.title}
          </h3>

          {/* Specifications row */}
          <div className="flex items-center gap-4 py-2 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1">
                <BedDouble className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{property.bedrooms}</span>
                <span className="text-slate-400 dark:text-slate-500">Beds</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">{property.bathrooms}</span>
              <span className="text-slate-400 dark:text-slate-500">Baths</span>
            </div>
            {property.areaSqM && (
              <div className="flex items-center gap-1">
                <Maximize2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{property.areaSqM}</span>
                <span className="text-slate-400 dark:text-slate-500">m²</span>
              </div>
            )}
          </div>

          {/* Amenity pills (Top 2) */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {property.amenities.slice(0, 2).map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                {amenity}
              </span>
            ))}
            {property.amenities.length > 2 && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium self-center">
                +{property.amenities.length - 2} more
              </span>
            )}
          </div>
        </div>

        {/* Footer: Landlord info + CTA buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {/* Landlord info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                {property.ownerName.charAt(0)}
              </div>
              {property.ownerVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-white dark:fill-slate-900 absolute -bottom-1 -right-1" />
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {property.ownerName}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-amber-500">
                <Star className="w-3 h-3 fill-amber-400" />
                <span className="font-bold">{property.ownerRating}</span>
                <span className="text-slate-400 dark:text-slate-500">({property.ownerReviewCount})</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onQuickContact(property)}
              className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
              title={t.contactLandlord}
              aria-label={t.contactLandlord}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectProperty(property)}
              className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white border border-transparent dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              {t.viewDetails}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
