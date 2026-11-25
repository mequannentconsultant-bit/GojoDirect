export interface ApproximateLocationData {
  city: string;
  subCity: string;
  lat: number;
  lng: number;
  /** Normalized 0..100 coordinates on the city/region map canvas */
  mapX: number;
  mapY: number;
  approxRadiusMeters: number;
  nearbyLandmarks: string[];
  isAddisAbaba: boolean;
  /** Regional zone description */
  zoneDescription: string;
  zoneDescriptionAm: string;
}

interface SubCityGeo {
  lat: number;
  lng: number;
  mapX: number;
  mapY: number;
  landmarks: string[];
  descEn: string;
  descAm: string;
}

export const ADDIS_SUBCITY_GEO: Record<string, SubCityGeo> = {
  Bole: {
    lat: 8.995,
    lng: 38.79,
    mapX: 70,
    mapY: 58,
    landmarks: ['Bole Int\'l Airport', 'Edna Mall', 'Medhanialem Cathedral'],
    descEn: 'Eastern diplomatic & commercial hub',
    descAm: 'ምስራቃዊ የዲፕሎማቲክና የንግድ ማዕከል',
  },
  Yeka: {
    lat: 9.032,
    lng: 38.822,
    mapX: 76,
    mapY: 32,
    landmarks: ['CMC St. Michael', 'Megenagna Hub', 'Yeka Park'],
    descEn: 'Northeastern residential & highland belt',
    descAm: 'ሰሜን ምስራቅ የመኖሪያና አረንጓዴ ክልል',
  },
  Kirkos: {
    lat: 9.011,
    lng: 38.761,
    mapX: 52,
    mapY: 52,
    landmarks: ['Meskel Square', 'Kazanchis UNECA', 'National Stadium'],
    descEn: 'Central business & diplomatic district',
    descAm: 'ማዕከላዊ የንግድና የዲፕሎማቲክ አካባቢ',
  },
  Arada: {
    lat: 9.036,
    lng: 38.752,
    mapX: 48,
    mapY: 34,
    landmarks: ['Piazza', 'St. George Cathedral', 'City Hall'],
    descEn: 'Historic heart of Addis Ababa',
    descAm: 'ታሪካዊ የአዲስ አበባ መሃል ከተማ',
  },
  Lideta: {
    lat: 9.012,
    lng: 38.736,
    mapX: 38,
    mapY: 51,
    landmarks: ['Mexico Square', 'AU Headquarters', 'Lideta Church'],
    descEn: 'Central-west institutional corridor',
    descAm: 'ማዕከላዊ ምዕራብ የአፍሪካ ህብረት አካባቢ',
  },
  'Nifas Silk': {
    lat: 8.972,
    lng: 38.742,
    mapX: 42,
    mapY: 72,
    landmarks: ['Old Airport (ICS)', 'Sarbet', 'Goffa Gebriel'],
    descEn: 'Southern diplomatic villa & residential zone',
    descAm: 'ደቡባዊ የዲፕሎማቲክ ቪላና መኖሪያ አካባቢ',
  },
  'Kolfe Keranio': {
    lat: 9.018,
    lng: 38.702,
    mapX: 22,
    mapY: 46,
    landmarks: ['Ayer Tena', 'Tor Hailoch', 'Kolfe Ring Road'],
    descEn: 'Western residential & Ring Road corridor',
    descAm: 'ምዕራባዊ የመኖሪያና የቀለበት መንገድ አካባቢ',
  },
  Gullele: {
    lat: 9.062,
    lng: 38.738,
    mapX: 40,
    mapY: 18,
    landmarks: ['Entoto Park', 'Addis Ababa University', 'Shiro Meda'],
    descEn: 'Northern highland & university foothills',
    descAm: 'ሰሜናዊ የእንጦጦና የዩኒቨርሲቲ አካባቢ',
  },
  'Akaki Kality': {
    lat: 8.905,
    lng: 38.775,
    mapX: 60,
    mapY: 85,
    landmarks: ['Kality Hub', 'Expressway Gate', 'Saris Abo'],
    descEn: 'Southern gateway & industrial-residential hub',
    descAm: 'ደቡባዊ መግቢያና የኢንዱስትሪ-መኖሪያ አካባቢ',
  },
  'Lemi Kura': {
    lat: 9.012,
    lng: 38.868,
    mapX: 88,
    mapY: 48,
    landmarks: ['Ayat Condos', 'Summit', 'CMC East'],
    descEn: 'Fast-growing eastern residential district',
    descAm: 'በፍጥነት እያደገ ያለ ምስራቃዊ መኖሪያ ክፍለ ከተማ',
  },
};

export const REGIONAL_CITY_GEO: Record<string, SubCityGeo> = {
  Adama: {
    lat: 8.54,
    lng: 39.27,
    mapX: 52,
    mapY: 50,
    landmarks: ['Posta Bet Square', 'Adama Stadium', 'Modjo-Hawassa Highway'],
    descEn: 'Oromia commercial & Rift Valley transit hub',
    descAm: 'የኦሮሚያ የንግድና የስምጥ ሸለቆ መገናኛ ከተማ',
  },
  Hawassa: {
    lat: 7.058,
    lng: 38.472,
    mapX: 50,
    mapY: 52,
    landmarks: ['Lake Hawassa Shore', 'Piazza Center', 'Hawassa University'],
    descEn: 'Scenic lakeside regional capital',
    descAm: 'ውብ የሐዋሳ ሐይቅ ዳርቻ ክልላዊ ዋና ከተማ',
  },
  'Bahir Dar': {
    lat: 11.594,
    lng: 37.391,
    mapX: 48,
    mapY: 48,
    landmarks: ['Lake Tana Promenade', 'Blue Nile Bridge', 'Kebele 4 Center'],
    descEn: 'Lake Tana & Blue Nile heritage city',
    descAm: 'የጣና ሐይቅና የአባይ ወንዝ ታሪካዊ ከተማ',
  },
  'Dire Dawa': {
    lat: 9.601,
    lng: 41.85,
    mapX: 50,
    mapY: 50,
    landmarks: ['Kezira District', 'Megala Market', 'Ethio-Djibouti Rail'],
    descEn: 'Eastern railway & cosmopolitan trade center',
    descAm: 'ምስራቃዊ የባቡርና የንግድ ማዕከል ከተማ',
  },
};

function findMatchingKey(record: Record<string, SubCityGeo>, query: string): string | undefined {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === normalized) return key;
  }
  for (const key of Object.keys(record)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return key;
    }
  }
  return undefined;
}

/**
 * Resolves an approximate map coordinate and zone metadata solely from city and subCity fields
 * (plus optional neighborhood/lat/lng hints).
 */
export function resolveApproximateLocation(
  city: string,
  subCity: string,
  neighborhood?: string
): ApproximateLocationData {
  const cleanCity = (city || 'Addis Ababa').trim();
  const cleanSubCity = (subCity || 'City Center').trim();

  if (cleanCity.toLowerCase() === 'addis ababa') {
    const matchedSubCityKey = findMatchingKey(ADDIS_SUBCITY_GEO, cleanSubCity);
    const geo = matchedSubCityKey
      ? ADDIS_SUBCITY_GEO[matchedSubCityKey]
      : ADDIS_SUBCITY_GEO['Kirkos'];

    // Deterministic slight offset based on neighborhood hash so different neighborhoods in the same sub-city sit slightly distinctly within the sub-city zone
    const seed = (neighborhood || cleanSubCity)
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const offsetX = ((seed % 7) - 3) * 0.9;
    const offsetY = (((seed * 3) % 7) - 3) * 0.9;

    return {
      city: cleanCity,
      subCity: matchedSubCityKey || cleanSubCity,
      lat: Number((geo.lat + offsetY * 0.002).toFixed(4)),
      lng: Number((geo.lng + offsetX * 0.002).toFixed(4)),
      mapX: Math.max(12, Math.min(90, geo.mapX + offsetX)),
      mapY: Math.max(12, Math.min(88, geo.mapY + offsetY)),
      approxRadiusMeters: 800,
      nearbyLandmarks: geo.landmarks,
      isAddisAbaba: true,
      zoneDescription: geo.descEn,
      zoneDescriptionAm: geo.descAm,
    };
  }

  const matchedCityKey = findMatchingKey(REGIONAL_CITY_GEO, cleanCity);
  const cityGeo = matchedCityKey
    ? REGIONAL_CITY_GEO[matchedCityKey]
    : {
        lat: 9.0,
        lng: 38.75,
        mapX: 50,
        mapY: 50,
        landmarks: [`${cleanSubCity} Main Road`, `${cleanCity} Central Plaza`],
        descEn: `${cleanSubCity} district in ${cleanCity}`,
        descAm: `በ${cleanCity} የ${cleanSubCity} አካባቢ`,
      };

  const seed = cleanSubCity.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const offsetX = ((seed % 11) - 5) * 1.4;
  const offsetY = (((seed * 5) % 11) - 5) * 1.4;

  return {
    city: matchedCityKey || cleanCity,
    subCity: cleanSubCity,
    lat: Number((cityGeo.lat + offsetY * 0.0025).toFixed(4)),
    lng: Number((cityGeo.lng + offsetX * 0.0025).toFixed(4)),
    mapX: Math.max(18, Math.min(82, cityGeo.mapX + offsetX)),
    mapY: Math.max(18, Math.min(82, cityGeo.mapY + offsetY)),
    approxRadiusMeters: 1200,
    nearbyLandmarks: cityGeo.landmarks,
    isAddisAbaba: false,
    zoneDescription: cityGeo.descEn,
    zoneDescriptionAm: cityGeo.descAm,
  };
}
