import React from 'react';
import { Heart, Building, ArrowLeft } from 'lucide-react';
import type { Property } from '../types/index.ts';
import { PropertyCard } from './PropertyCard.tsx';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface FavoritesViewProps {
  favoriteProperties: Property[];
  onToggleFavorite: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onQuickContact: (property: Property) => void;
  onBackToExplore: () => void;
  language: Language;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favoriteProperties,
  onToggleFavorite,
  onSelectProperty,
  onQuickContact,
  onBackToExplore,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={onBackToExplore}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-semibold mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.backToExploreBtn}</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            <span>{t.favoritesTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'am'
              ? `${favoriteProperties.length} የተቀመጡ ቤቶች`
              : `${favoriteProperties.length} properties saved for comparison`}
          </p>
        </div>
      </div>

      {favoriteProperties.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Heart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t.noFavoritesTitle}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {t.noFavoritesDesc}
          </p>
          <button
            type="button"
            onClick={onBackToExplore}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            {t.backToExploreBtn}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteProperties.map((prop) => (
            <PropertyCard
              key={prop.id}
              property={prop}
              isFavorite={true}
              onToggleFavorite={onToggleFavorite}
              onSelectProperty={onSelectProperty}
              onQuickContact={onQuickContact}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
};
