import React, { useMemo, useState } from 'react';
import {
  MapPin,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  ADDIS_SUBCITY_GEO,
  resolveApproximateLocation,
} from '../utils/locationMap.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface PropertyLocationMapProps {
  city: string;
  subCity: string;
  neighborhood?: string;
  address?: string;
  language: Language;
}

export const PropertyLocationMap: React.FC<PropertyLocationMapProps> = ({
  city,
  subCity,
  neighborhood,
  address,
  language,
}) => {
  const t = translations[language];
  const [zoom, setZoom] = useState<number>(1);

  const location = useMemo(
    () => resolveApproximateLocation(city, subCity, neighborhood),
    [city, subCity, neighborhood]
  );

  const handleZoomIn = () => setZoom((z) => Math.min(2.2, Number((z + 0.3).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.8, Number((z - 0.3).toFixed(2))));
  const handleReset = () => setZoom(1);

  const noteText = t.approxLocationNote
    .replace('{radius}', String(location.approxRadiusMeters))
    .replace('{subCity}', location.subCity)
    .replace('{city}', location.city);

  const externalMapUrl = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=14/${location.lat}/${location.lng}`;

  // Calculate SVG transform so zooming centers around the property pin
  const cx = location.mapX * 4; // map 0..100 -> 0..400 SVG width
  const cy = location.mapY * 2.2; // map 0..100 -> 0..220 SVG height
  const tx = cx - cx * zoom + (200 - cx) * (zoom - 1) * 0.25;
  const ty = cy - cy * zoom + (110 - cy) * (zoom - 1) * 0.25;

  return (
    <div
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 overflow-hidden"
      data-testid="property-location-map"
    >
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
              {t.approxLocationTitle}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {location.subCity}, {location.city}
              {neighborhood ? ` • ${neighborhood}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <Navigation className="w-3 h-3" />
            {location.lat.toFixed(3)}°N, {location.lng.toFixed(3)}°E
          </span>
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <span>{t.openExternalMap}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Interactive SVG Map Canvas */}
      <div className="relative h-60 sm:h-64 w-full overflow-hidden bg-[#eef4f1] dark:bg-[#0b1520] select-none">
        <svg
          viewBox="0 0 400 220"
          className="w-full h-full block"
          role="img"
          aria-label={`${t.approxLocationTitle}: ${location.subCity}, ${location.city}`}
        >
          <defs>
            <pattern
              id="ethio-map-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.4"
                className="text-slate-300/60 dark:text-slate-700/40"
              />
            </pattern>
            <radialGradient id="approx-zone-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="75%" stopColor="#10b981" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </radialGradient>
          </defs>

          {/* Background Grid */}
          <rect width="400" height="220" fill="url(#ethio-map-grid)" />

          <g transform={`translate(${tx}, ${ty}) scale(${zoom})`}>
            {/* Topographic / Green Belt Patches */}
            <ellipse
              cx="155"
              cy="32"
              rx="95"
              ry="24"
              className="fill-emerald-200/40 dark:fill-emerald-950/50"
            />
            <ellipse
              cx="320"
              cy="170"
              rx="65"
              ry="32"
              className="fill-emerald-200/35 dark:fill-emerald-950/40"
            />

            {/* Regional Water Features for Hawassa / Bahir Dar */}
            {!location.isAddisAbaba &&
              (location.city.toLowerCase().includes('hawassa') ||
                location.city.toLowerCase().includes('bahir dar')) && (
                <path
                  d="M 0,155 Q 85,120 140,175 T 230,220 L 0,220 Z"
                  className="fill-sky-300/45 dark:fill-sky-900/40 stroke-sky-400/50 dark:stroke-sky-700/50"
                  strokeWidth="1"
                />
              )}

            {/* Major Urban Ring Road & Arterial Highways */}
            {location.isAddisAbaba ? (
              <g className="stroke-slate-300/90 dark:stroke-slate-700" fill="none">
                {/* Addis Ring Road */}
                <ellipse cx="210" cy="115" rx="115" ry="72" strokeWidth="3.5" />
                <ellipse
                  cx="210"
                  cy="115"
                  rx="115"
                  ry="72"
                  strokeWidth="1.2"
                  className="stroke-amber-300/80 dark:stroke-amber-500/40"
                  strokeDasharray="6 4"
                />
                {/* Bole - Meskel Square - Arada Axis */}
                <path d="M 192,35 Q 202,105 280,132 L 365,155" strokeWidth="3" />
                {/* East-West Corridor (Tor Hailoch - Megenagna - CMC - Ayat) */}
                <path d="M 45,108 L 210,112 L 304,70 L 385,102" strokeWidth="2.8" />
                {/* North-South Corridor (Entoto - Piazza - Sarbet - Kality) */}
                <path d="M 160,15 L 195,90 L 170,158 L 245,205" strokeWidth="2.6" />
              </g>
            ) : (
              <g className="stroke-slate-300/90 dark:stroke-slate-700" fill="none">
                <path d="M 20,110 Q 200,98 380,115" strokeWidth="3.2" />
                <path d="M 200,15 Q 208,110 195,205" strokeWidth="2.8" />
                <path d="M 85,35 L 315,185" strokeWidth="1.8" strokeDasharray="4 4" />
                <circle cx="200" cy="110" r="46" strokeWidth="2" />
              </g>
            )}

            {/* Addis Ababa Sub-City District Nodes */}
            {location.isAddisAbaba &&
              Object.entries(ADDIS_SUBCITY_GEO).map(([name, info]) => {
                const sx = info.mapX * 4;
                const sy = info.mapY * 2.2;
                const isActive =
                  name.toLowerCase() === location.subCity.toLowerCase();
                return (
                  <g key={name}>
                    <circle
                      cx={sx}
                      cy={sy}
                      r={isActive ? 5 : 3}
                      className={
                        isActive
                          ? 'fill-emerald-600 dark:fill-emerald-400'
                          : 'fill-slate-400/80 dark:fill-slate-600'
                      }
                    />
                    <text
                      x={sx}
                      y={sy - (isActive ? 9 : 6)}
                      textAnchor="middle"
                      fontSize={isActive ? 9 : 7.2}
                      fontWeight={isActive ? 800 : 600}
                      className={
                        isActive
                          ? 'fill-emerald-900 dark:fill-emerald-300'
                          : 'fill-slate-500 dark:fill-slate-400'
                      }
                    >
                      {name}
                    </text>
                  </g>
                );
              })}

            {/* Approximate Location Privacy Radius Zone */}
            <circle
              cx={cx}
              cy={cy}
              r={26}
              fill="url(#approx-zone-grad)"
              className="stroke-emerald-500/70 dark:stroke-emerald-400/70"
              strokeWidth="1.4"
              strokeDasharray="4 3"
            />
            <circle
              cx={cx}
              cy={cy}
              r={12}
              className="fill-emerald-500/25 dark:fill-emerald-400/25"
            />

            {/* Central Location Marker Pin */}
            <g transform={`translate(${cx}, ${cy})`}>
              <circle
                r={5.5}
                className="fill-emerald-600 dark:fill-emerald-400 stroke-white dark:stroke-slate-900"
                strokeWidth="2"
              />
              <circle r={2} className="fill-white dark:fill-slate-950" />
            </g>
          </g>
        </svg>

        {/* Top-Left District Chip */}
        <div className="absolute top-2.5 left-2.5 max-w-[70%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
              {location.subCity} • {location.city}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {language === 'am' ? location.zoneDescriptionAm : location.zoneDescription}
          </p>
        </div>

        {/* Bottom-Right Zoom Controls */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label={t.zoomIn}
            title={t.zoomIn}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label={t.zoomOut}
            title={t.zoomOut}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            aria-label={t.resetView}
            title={t.resetView}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer Info & Nearby Landmarks */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            {noteText}
            {address ? ` (${address})` : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
            {t.nearbyLandmarksLabel}:
          </span>
          {location.nearbyLandmarks.map((landmark) => (
            <span
              key={landmark}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700"
            >
              {landmark}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
