import React, { useState } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  Crown,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import type { Property, PropertyType, City, FeaturedTier, User } from '../types/index.ts';
import { ETHIOPIAN_CITIES, ADDIS_SUBCITIES, PROPERTY_TYPES } from '../data/mockData.ts';
import { detectSuspiciousPrice } from '../utils/rules.ts';
import { resolveApproximateLocation } from '../utils/locationMap.ts';
import { isSafeImageUrl, sanitizePlainText, MAX_TEXT_LENGTHS } from '../utils/security.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface PostPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onAddProperty: (newProp: Omit<Property, 'id' | 'createdAt' | 'ownerRating' | 'ownerReviewCount'>) => void;
  language: Language;
}

const AMENITY_TRANSLATIONS: Record<string, string> = {
  'Backup Generator': 'ተጠባባቂ ጄኔሬተር',
  'Reserve Water Tank': 'የውሃ ማጠራቀሚያ ታንከር',
  '24/7 Gated Security': 'የ24 ሰዓት ጥበቃ',
  'High-Speed Wi-Fi': 'ፈጣን ዋይፋይ',
  'Dedicated Parking': 'የተመደበ የመኪና ማቆሚያ',
  'Elevator': 'ሊፍት',
  'Balcony': 'በረንዳ',
  'Furnished Kitchen': 'የተሟላ ዘመናዊ ማብሰያ',
  'Water Heater': 'የውሃ ማሞቂያ (ቦይለር)',
  'Private Garden': 'የግል ጓሮ / የአትክልት ቦታ',
  'CCTV Surveillance': 'የሲሲቲቪ ካሜራ ጥበቃ',
};

const PROPERTY_TYPE_TRANSLATIONS: Record<string, string> = {
  Apartment: 'አፓርታማ',
  Condominium: 'ኮንዶሚኒየም',
  Villa: 'ቪላ',
  Studio: 'ስቱዲዮ',
  'Commercial Building': 'የንግድ ህንፃ',
  Office: 'ቢሮ',
  Shop: 'ሱቅ',
};

const PRESET_PHOTOS = [
  {
    label: 'Modern Apartment Interior',
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Condominium Living Room',
    url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Diplomatic Villa Exterior',
    url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Modern Kitchen & Dining',
    url: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Master Bedroom Suite',
    url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Commercial Office Space',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80',
  },
];

const COMMON_AMENITIES = [
  'Backup Generator',
  'Reserve Water Tank',
  '24/7 Gated Security',
  'High-Speed Wi-Fi',
  'Dedicated Parking',
  'Elevator',
  'Balcony',
  'Furnished Kitchen',
  'Water Heater',
  'Private Garden',
  'CCTV Surveillance',
];

export const PostPropertyModal: React.FC<PostPropertyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAddProperty,
  language,
}) => {
  const t = translations[language];
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('Apartment');
  const [rentPrice, setRentPrice] = useState<number>(35000);
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [areaSqM, setAreaSqM] = useState<number>(110);

  // Location states
  const [city, setCity] = useState<City>('Addis Ababa');
  const [subCity, setSubCity] = useState<string>('Bole');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  // Photos & Amenities
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([
    PRESET_PHOTOS[0].url,
    PRESET_PHOTOS[3].url,
  ]);
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Backup Generator',
    'Reserve Water Tank',
    '24/7 Gated Security',
    'Dedicated Parking',
  ]);

  // Featured Tier & Payment
  const [featuredTier, setFeaturedTier] = useState<FeaturedTier>('basic');
  const [paymentPhone, setPaymentPhone] = useState(currentUser.phone || '09');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || currentUser.role !== 'landlord') return null;

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setPropertyType('Apartment');
    setRentPrice(35000);
    setBedrooms(2);
    setBathrooms(2);
    setAreaSqM(110);
    setCity('Addis Ababa');
    setSubCity('Bole');
    setNeighborhood('');
    setAddress('');
    setSelectedPhotos([PRESET_PHOTOS[0].url, PRESET_PHOTOS[3].url]);
    setCustomPhotoInput('');
    setSelectedAmenities([
      'Backup Generator',
      'Reserve Water Tank',
      '24/7 Gated Security',
      'Dedicated Parking',
    ]);
    setFeaturedTier('basic');
    setPaymentPhone(currentUser.phone || '09');
    setErrorMessage('');
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleAddCustomPhoto = () => {
    const trimmed = customPhotoInput.trim();
    if (!trimmed) return;
    if (isSafeImageUrl(trimmed) && /^https:\/\//i.test(trimmed)) {
      setSelectedPhotos((prev) => [...prev, trimmed]);
      setCustomPhotoInput('');
      setErrorMessage('');
    } else {
      setErrorMessage(t.securityBlockedUrl);
    }
  };

  const handleTogglePresetPhoto = (url: string) => {
    if (selectedPhotos.includes(url)) {
      if (selectedPhotos.length > 1) {
        setSelectedPhotos(selectedPhotos.filter((p) => p !== url));
      }
    } else {
      setSelectedPhotos([...selectedPhotos, url]);
    }
  };

  // Price validation warning check
  const priceWarning = detectSuspiciousPrice(
    rentPrice,
    subCity === 'Bole' ? 55000 : 35000
  );

  const handleNextStep = () => {
    if (step === 1) {
      if (!title.trim() || title.trim().length < 4) {
        setErrorMessage(
          language === 'am' ? 'እባክዎ ትክክለኛ የቤቱን አርዕስት ያስገቡ።' : 'Please enter a descriptive listing title.'
        );
        return;
      }
      if (!description.trim() || description.trim().length < 10) {
        setErrorMessage(
          language === 'am' ? 'እባክዎ ዝርዝር መግለጫ (ቢያንስ 10 ፊደላት) ይጻፉ።' : 'Please provide a brief property description (at least 10 characters).'
        );
        return;
      }
      if (!rentPrice || rentPrice < 1000) {
        setErrorMessage(
          language === 'am' ? 'የወር ኪራይ ቢያንስ 1,000 ብር መሆን አለበት።' : 'Monthly rent must be at least 1,000 ETB.'
        );
        return;
      }
    }

    if (step === 2) {
      if (!subCity.trim() || !neighborhood.trim()) {
        setErrorMessage(
          language === 'am' ? 'እባክዎ ክፍለ ከተማ እና ሰፈር/ታዋቂ ቦታ ያስገቡ።' : 'Please provide both Sub-city/District and Neighborhood/Landmark.'
        );
        return;
      }
    }

    setErrorMessage('');
    setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNextStep();
      return;
    }
    if (!title.trim() || !description.trim() || !neighborhood.trim()) {
      setErrorMessage(
        language === 'am' ? 'እባክዎ ሁሉንም አስፈላጊ መረጃዎች ያረጋግጡ።' : 'Please complete all required listing fields.'
      );
      return;
    }

    const approxGeo = resolveApproximateLocation(city, subCity, neighborhood);

    onAddProperty({
      ownerId: currentUser.id,
      ownerName: sanitizePlainText(`${currentUser.firstName} ${currentUser.lastName}`, MAX_TEXT_LENGTHS.shortName),
      ownerPhone: sanitizePlainText(currentUser.phone, 24),
      ownerVerified: !!currentUser.isVerifiedLandlord,
      title: sanitizePlainText(title, MAX_TEXT_LENGTHS.title),
      description: sanitizePlainText(description, MAX_TEXT_LENGTHS.description),
      rentPrice,
      propertyType,
      bedrooms,
      bathrooms,
      areaSqM,
      city,
      subCity: sanitizePlainText(subCity, MAX_TEXT_LENGTHS.shortName),
      neighborhood: sanitizePlainText(neighborhood, MAX_TEXT_LENGTHS.neighborhood),
      address: sanitizePlainText(address || neighborhood, MAX_TEXT_LENGTHS.address),
      latitude: approxGeo.lat,
      longitude: approxGeo.lng,
      status: 'available',
      featuredTier,
      isVerified: !!currentUser.isVerifiedLandlord,
      amenities: selectedAmenities,
      images: selectedPhotos.length > 0 ? selectedPhotos : [PRESET_PHOTOS[0].url],
    });

    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with step indicator */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.postModalTitle}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'en' ? `Step ${step} of 4: Direct Ethiopian Landlord Listing` : `ደረጃ ${step} ከ 4፡ የቀጥታ አከራይ ምዝገባ`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 flex">
          <div
            className={`h-full bg-emerald-600 transition-all duration-300 ${
              step === 1 ? 'w-1/4' : step === 2 ? 'w-2/4' : step === 3 ? 'w-3/4' : 'w-full'
            }`}
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 flex-1 space-y-4">
          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-200 dark:border-slate-800 pb-2">
                {t.step1Title}
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.propTitleLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.propTitlePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.propTypeLabel}
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {PROPERTY_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {language === 'am' ? PROPERTY_TYPE_TRANSLATIONS[pt] || pt : pt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.monthlyRentLabel}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1000}
                      step={500}
                      value={rentPrice}
                      onChange={(e) => setRentPrice(Number(e.target.value))}
                      className="w-full pl-3 pr-14 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:border-emerald-500 font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                      ETB/mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Price anomaly alert check */}
              {priceWarning.isSuspicious && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Price Alert:</p>
                    <p>{priceWarning.warning}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.bedroomsLabel}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm text-center outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.bathroomsLabel}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm text-center outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.areaLabel}
                  </label>
                  <input
                    type="number"
                    min={15}
                    value={areaSqM}
                    onChange={(e) => setAreaSqM(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm text-center outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.descLabel}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={t.descPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-200 dark:border-slate-800 pb-2">
                {t.step2Title}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.cityLabel}
                  </label>
                  <select
                    value={city}
                    onChange={(e) => {
                      const nextCity = e.target.value as City;
                      setCity(nextCity);
                      setSubCity(nextCity === 'Addis Ababa' ? 'Bole' : '');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {ETHIOPIAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.subCityLabel}
                  </label>
                  {city === 'Addis Ababa' ? (
                    <select
                      value={subCity}
                      onChange={(e) => setSubCity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {ADDIS_SUBCITIES.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder={language === 'am' ? 'ለምሳሌ ማዕከል ወይም ወረዳ' : 'e.g. City Center or District'}
                      value={subCity}
                      onChange={(e) => setSubCity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.neighborhoodLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.neighborhoodPlaceholder}
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.addressLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.addressPlaceholder}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Tenants trust listings with clear Ethiopian landmarks. Accurate landmarks reduce
                  unnecessary calls by 60%.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Photos & Amenities */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-200 dark:border-slate-800 pb-2">
                {t.step3Title}
              </h3>

              {/* Photo presets picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Real Estate Photos ({selectedPhotos.length} selected)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_PHOTOS.map((photo) => {
                    const isSelected = selectedPhotos.includes(photo.url);
                    return (
                      <button
                        type="button"
                        key={photo.url}
                        onClick={() => handleTogglePresetPhoto(photo.url)}
                        className={`relative aspect-4/3 rounded-lg overflow-hidden cursor-pointer border-2 transition-all text-left ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-600/40'
                            : 'border-slate-200 dark:border-slate-700 opacity-65 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-[9px] text-white px-1.5 py-0.5 truncate">
                          {photo.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image URL */}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder={t.customPhotoPlaceholder}
                  value={customPhotoInput}
                  onChange={(e) => setCustomPhotoInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomPhoto}
                  className="px-3 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  {t.addPhotoBtn}
                </button>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {t.amenitiesLabel}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COMMON_AMENITIES.map((amenity) => {
                    const active = selectedAmenities.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={`p-2 rounded-lg text-xs font-medium border text-left flex items-center justify-between cursor-pointer transition-colors ${
                          active
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{language === 'am' ? AMENITY_TRANSLATIONS[amenity] || amenity : amenity}</span>
                        {active && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Promotion Tier & Telebirr/CBE */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-200 dark:border-slate-800 pb-2">
                {t.step4Title}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Basic */}
                <button
                  type="button"
                  onClick={() => setFeaturedTier('basic')}
                  className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${
                    featuredTier === 'basic'
                      ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{t.boostStandard}</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white my-1">{language === 'am' ? 'ነጻ' : 'Free'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.boostStandardDesc}
                  </p>
                </button>

                {/* Premium */}
                <button
                  type="button"
                  onClick={() => setFeaturedTier('premium')}
                  className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${
                    featuredTier === 'premium'
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-blue-900 dark:text-blue-300 text-sm">{language === 'am' ? 'ፕሪሚየም' : 'Premium'}</p>
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xl font-extrabold text-blue-950 dark:text-white my-1">300 ETB</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.boostPremiumDesc}
                  </p>
                </button>

                {/* Gold */}
                <button
                  type="button"
                  onClick={() => setFeaturedTier('gold')}
                  className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${
                    featuredTier === 'gold'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 shadow-md ring-2 ring-amber-400/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">{language === 'am' ? 'ወርቅ ተመራጭ' : 'Gold Boost'}</p>
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <p className="text-xl font-extrabold text-amber-950 dark:text-white my-1">800 ETB</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.boostGoldDesc}
                  </p>
                </button>
              </div>

              {/* Payment details for Premium / Gold */}
              {featuredTier !== 'basic' && (
                <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      {language === 'am' ? 'በቴሌብር ወይም በሲቢኢ ብር ክፍያ' : 'Payment via Telebirr or CBE Birr'}
                    </span>
                    <span className="text-xs text-slate-300">
                      {language === 'am' ? 'መጠን፡ ' : 'Amount: '}
                      <strong className="text-white">
                        {featuredTier === 'gold' ? '800 ETB' : '300 ETB'}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      {t.paymentWalletPhoneLabel}
                    </label>
                    <input
                      type="tel"
                      required
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                      placeholder={t.walletPhonePlaceholder}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {language === 'am' ? 'ክፍያውን ለማረጋገጥ ወደ ስልክዎ የUSSD ወይም የኤስኤምኤስ ጥያቄ ይላካል።' : 'An USSD prompt or SMS push will be sent to your mobile wallet for instant activation.'}
                  </p>
                </div>
              )}

              {/* Final Summary */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">{language === 'am' ? 'የምዝገባ ማጠቃለያ፡' : 'Summary Review:'}</p>
                <p className="text-slate-600 dark:text-slate-300">
                  {title || (language === 'am' ? 'ያልተሰየመ' : 'Untitled')} • {city}, {subCity} • {language === 'am' ? 'ኪራይ፡' : 'Rent:'} {rentPrice.toLocaleString()} ETB/mo
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {language === 'am' ? 'አከራይ፡' : 'Landlord:'} {currentUser.firstName} {currentUser.lastName} ({currentUser.phone})
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Modal Navigation Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.backStepBtn}</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                key="next-step-btn"
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-md"
              >
                <span>{t.nextStepBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                key="publish-property-btn"
                type="submit"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.publishPropertyBtn}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
