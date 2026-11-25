import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatETB,
  calculateFeaturedPrice,
  filterProperties,
  sortProperties,
  detectSuspiciousPrice,
  detectDuplicateImages,
  calculateAverageRating,
} from './rules.ts';
import type { Property, Review } from '../types/index.ts';

const mockProperties: Property[] = [
  {
    id: 'prop-1',
    ownerId: 'landlord-1',
    ownerName: 'Abebe Kebede',
    ownerPhone: '+251911223344',
    ownerVerified: true,
    ownerRating: 4.8,
    ownerReviewCount: 12,
    title: 'Luxury 3-Bedroom Villa in Bole',
    description: 'Modern villa near Bole Medhanialem with backup generator.',
    rentPrice: 65000,
    propertyType: 'Villa',
    bedrooms: 3,
    bathrooms: 3,
    city: 'Addis Ababa',
    subCity: 'Bole',
    neighborhood: 'Bole Medhanialem',
    address: 'Near Edna Mall',
    latitude: 8.995,
    longitude: 38.789,
    status: 'available',
    featuredTier: 'gold',
    isVerified: true,
    amenities: ['Backup Generator', 'Water Tank', 'Security'],
    images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    createdAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'prop-2',
    ownerId: 'landlord-2',
    ownerName: 'Sara Mengistu',
    ownerPhone: '+251922334455',
    ownerVerified: false,
    ownerRating: 4.2,
    ownerReviewCount: 4,
    title: 'Cozy 1-Bedroom Condo in CMC',
    description: 'Furnished condo near CMC St. Michael.',
    rentPrice: 18000,
    propertyType: 'Condominium',
    bedrooms: 1,
    bathrooms: 1,
    city: 'Addis Ababa',
    subCity: 'Yeka',
    neighborhood: 'CMC Michael',
    address: 'Building 42, Apt 3B',
    latitude: 9.02,
    longitude: 38.83,
    status: 'available',
    featuredTier: 'basic',
    isVerified: false,
    amenities: ['Water Tank', 'Parking'],
    images: ['https://example.com/img3.jpg'],
    createdAt: '2026-10-12T10:00:00Z',
  },
  {
    id: 'prop-3',
    ownerId: 'landlord-3',
    ownerName: 'Getachew Tilahun',
    ownerPhone: '+251933445566',
    ownerVerified: true,
    ownerRating: 4.9,
    ownerReviewCount: 20,
    title: 'Modern 2-Bedroom Apartment in Hawassa',
    description: 'Lakeside apartment with balcony.',
    rentPrice: 22000,
    propertyType: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    city: 'Hawassa',
    subCity: 'Piazza',
    neighborhood: 'Lake View',
    address: 'Lakeside Ave',
    latitude: 7.05,
    longitude: 38.48,
    status: 'occupied',
    featuredTier: 'premium',
    isVerified: true,
    amenities: ['Balcony', 'Wifi'],
    images: ['https://example.com/img1.jpg'], // duplicate with prop-1 intentionally
    createdAt: '2026-10-15T10:00:00Z',
  },
];

test('formatETB formats currency properly with ETB suffix', () => {
  assert.equal(formatETB(45000), '45,000 ETB');
  assert.equal(formatETB(0), '0 ETB');
  assert.equal(formatETB(1200500), '1,200,500 ETB');
});

test('calculateFeaturedPrice returns correct monthly fee in ETB', () => {
  assert.equal(calculateFeaturedPrice('basic'), 0);
  assert.equal(calculateFeaturedPrice('premium'), 300);
  assert.equal(calculateFeaturedPrice('gold'), 800);
});

test('filterProperties handles city, price range and bedrooms filtering', () => {
  const addisProps = filterProperties(mockProperties, { city: 'Addis Ababa' });
  assert.equal(addisProps.length, 2);

  const priceFiltered = filterProperties(mockProperties, {
    minPrice: 15000,
    maxPrice: 25000,
  });
  assert.equal(priceFiltered.length, 2); // 18000 and 22000

  const bedroomFiltered = filterProperties(mockProperties, { bedrooms: '3' });
  assert.equal(bedroomFiltered.length, 1);
  assert.equal(bedroomFiltered[0].id, 'prop-1');

  const verifiedFiltered = filterProperties(mockProperties, { verifiedOnly: true });
  assert.equal(verifiedFiltered.length, 2);
});

test('sortProperties puts gold featured tier above premium and basic', () => {
  const sorted = sortProperties(mockProperties, 'featured');
  assert.equal(sorted[0].featuredTier, 'gold');
  assert.equal(sorted[1].featuredTier, 'premium');
  assert.equal(sorted[2].featuredTier, 'basic');
});

test('sortProperties handles price_low and price_high', () => {
  const lowToHigh = sortProperties(mockProperties, 'price_low');
  assert.equal(lowToHigh[0].rentPrice, 18000);
  assert.equal(lowToHigh[2].rentPrice, 65000);

  const highToLow = sortProperties(mockProperties, 'price_high');
  assert.equal(highToLow[0].rentPrice, 65000);
  assert.equal(highToLow[2].rentPrice, 18000);
});

test('detectSuspiciousPrice flags drastically underpriced listings', () => {
  const averageBoleVilla = 70000;
  const normalPriceCheck = detectSuspiciousPrice(65000, averageBoleVilla);
  assert.equal(normalPriceCheck.isSuspicious, false);

  const scamPriceCheck = detectSuspiciousPrice(5000, averageBoleVilla);
  assert.equal(scamPriceCheck.isSuspicious, true);
  assert.match(scamPriceCheck.warning || '', /Suspiciously low price/);
});

test('detectDuplicateImages detects cross-owner photo reuse', () => {
  const duplicates = detectDuplicateImages(mockProperties[0], mockProperties);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].id, 'prop-3');
});

test('calculateAverageRating computes mean rating accurately', () => {
  const reviews: Review[] = [
    {
      id: 'r1',
      propertyId: 'p1',
      landlordId: 'l1',
      tenantId: 't1',
      tenantName: 'Helen',
      rating: 5,
      comment: 'Excellent landlord, very honest',
      createdAt: '2026-10-01',
    },
    {
      id: 'r2',
      propertyId: 'p1',
      landlordId: 'l1',
      tenantId: 't2',
      tenantName: 'Kidus',
      rating: 4,
      comment: 'Good house, prompt water fix',
      createdAt: '2026-10-05',
    },
  ];

  const result = calculateAverageRating(reviews);
  assert.equal(result.average, 4.5);
  assert.equal(result.count, 2);

  const emptyResult = calculateAverageRating([]);
  assert.equal(emptyResult.average, 0);
  assert.equal(emptyResult.count, 0);
});

test('i18n dictionaries provide consistent keys for English and Amharic', async () => {
  const { translations } = await import('./i18n.ts');
  const enKeys = Object.keys(translations.en).sort();
  const amKeys = Object.keys(translations.am).sort();

  assert.equal(enKeys.length > 50, true);
  assert.equal(amKeys.length > 50, true);
  // Ensure every key in en exists in am
  for (const key of enKeys) {
    assert.ok(key in translations.am, `Missing Amharic translation for key: ${key}`);
  }
});

test('theme utils toggle between light and dark appropriately', async () => {
  const { toggleTheme, THEME_STORAGE_KEY } = await import('./theme.ts');
  assert.equal(toggleTheme('light'), 'dark');
  assert.equal(toggleTheme('dark'), 'light');
  assert.equal(THEME_STORAGE_KEY, 'ethioserve_theme');
});

test('canPostProperty strictly allows only landlord role', async () => {
  const { canPostProperty } = await import('./rules.ts');
  assert.equal(canPostProperty({ role: 'landlord' }), true);
  assert.equal(canPostProperty({ role: 'tenant' }), false);
  assert.equal(canPostProperty({ role: 'admin' }), false);
  assert.equal(canPostProperty(null), false);
  assert.equal(canPostProperty(undefined), false);
});

test('resolveApproximateLocation maps city and sub-city fields accurately', async () => {
  const { resolveApproximateLocation } = await import('./locationMap.ts');

  const bole = resolveApproximateLocation('Addis Ababa', 'Bole', 'Bole Medhanialem');
  assert.equal(bole.isAddisAbaba, true);
  assert.equal(bole.city, 'Addis Ababa');
  assert.equal(bole.subCity, 'Bole');
  assert.equal(bole.approxRadiusMeters, 800);
  assert.ok(bole.nearbyLandmarks.length >= 2);
  assert.ok(bole.lat > 8.9 && bole.lat < 9.1);
  assert.ok(bole.lng > 38.7 && bole.lng < 38.9);

  const yeka = resolveApproximateLocation('Addis Ababa', 'Yeka', 'CMC Michael');
  assert.notEqual(bole.mapX, yeka.mapX);

  const hawassa = resolveApproximateLocation('Hawassa', 'Piazza');
  assert.equal(hawassa.isAddisAbaba, false);
  assert.equal(hawassa.city, 'Hawassa');
  assert.equal(hawassa.subCity, 'Piazza');
  assert.equal(hawassa.approxRadiusMeters, 1200);
  assert.ok(hawassa.nearbyLandmarks.some((l) => l.includes('Lake Hawassa')));

  const fallback = resolveApproximateLocation('Mekelle', 'Hawelti');
  assert.equal(fallback.isAddisAbaba, false);
  assert.equal(fallback.city, 'Mekelle');
  assert.equal(fallback.subCity, 'Hawelti');
});

test('auth validates credentials, normalizes Ethiopian phones, and blocks admin registration', async () => {
  const {
    normalizeEthiopianPhone,
    isValidEthiopianPhone,
    verifyUserCredentials,
    validateAndPrepareRegistration,
    INITIAL_CREDENTIAL_HASHES,
  } = await import('./auth.ts');
  const { INITIAL_USERS } = await import('../data/mockData.ts');

  assert.equal(normalizeEthiopianPhone('+251 91 123 4567'), '0911234567');
  assert.equal(isValidEthiopianPhone('0919798913'), true);
  assert.equal(isValidEthiopianPhone('+251711223344'), true);
  assert.equal(isValidEthiopianPhone('12345'), false);

  const attemptStore = new Map();

  // Wrong password rejected
  const badPass = await verifyUserCredentials(
    INITIAL_USERS,
    'admin@ethioserve.et',
    'wrongpass',
    INITIAL_CREDENTIAL_HASHES,
    attemptStore
  );
  assert.equal(badPass.ok, false);
  assert.equal(badPass.errorCode, 'INVALID_PASSWORD');

  // Correct email + password accepted
  const goodAuth = await verifyUserCredentials(
    INITIAL_USERS,
    'admin@ethioserve.et',
    'EthioAdmin#2026',
    INITIAL_CREDENTIAL_HASHES,
    attemptStore
  );
  assert.equal(goodAuth.ok, true);
  assert.equal(goodAuth.user?.role, 'admin');

  // Phone login accepted
  const phoneAuth = await verifyUserCredentials(
    INITIAL_USERS,
    '0919798913',
    'EthioAdmin#2026',
    INITIAL_CREDENTIAL_HASHES,
    attemptStore
  );
  assert.equal(phoneAuth.ok, true);
  assert.equal(phoneAuth.user?.id, 'user-admin-1');

  // Public admin registration blocked
  const adminReg = await validateAndPrepareRegistration(INITIAL_USERS, {
    firstName: 'Test',
    lastName: 'User',
    email: 'hacker@example.com',
    phone: '0911998877',
    password: 'StrongPassword#99',
    role: 'admin',
  });
  assert.equal(adminReg.ok, false);
  assert.equal(adminReg.errorCode, 'INVALID_ROLE');

  // Duplicate phone rejected
  const dupReg = await validateAndPrepareRegistration(INITIAL_USERS, {
    firstName: 'Another',
    lastName: 'User',
    email: 'new@example.com',
    phone: '0911234567',
    password: 'StrongPassword#99',
    role: 'tenant',
  });
  assert.equal(dupReg.ok, false);
  assert.equal(dupReg.errorCode, 'DUPLICATE_ACCOUNT');

  // Valid landlord registration succeeds with salted PBKDF2-SHA256 hash
  const okReg = await validateAndPrepareRegistration(INITIAL_USERS, {
    firstName: 'Hanna',
    lastName: 'Tesfaye',
    email: 'hanna@ethioserve.et',
    phone: '+251922334455',
    password: 'SecurePassword#1',
    role: 'landlord',
  });
  assert.equal(okReg.ok, true);
  assert.equal(okReg.user?.role, 'landlord');
  assert.equal(okReg.user?.phone, '0922334455');
  assert.ok(okReg.passwordHash?.startsWith('pbkdf2_sha256$100000$'));
});

test('privacy helpers scope conversations, notifications, and unread counts to current user', async () => {
  const {
    getVisibleConversations,
    getVisibleNotifications,
    getUnreadMessageCount,
  } = await import('./rules.ts');

  const convs = [
    {
      id: 'c1',
      tenantId: 't1',
      tenantName: 'Tenant One',
      landlordId: 'l1',
      landlordName: 'Landlord One',
      propertyId: 'p1',
      propertyTitle: 'Apt 1',
      propertyImage: '',
      propertyPrice: 20000,
      lastMessage: 'Hi',
      lastMessageTime: 'Now',
      unreadCountTenant: 2,
      unreadCountLandlord: 1,
    },
    {
      id: 'c2',
      tenantId: 't2',
      tenantName: 'Tenant Two',
      landlordId: 'l2',
      landlordName: 'Landlord Two',
      propertyId: 'p2',
      propertyTitle: 'Apt 2',
      propertyImage: '',
      propertyPrice: 30000,
      lastMessage: 'Hello',
      lastMessageTime: 'Now',
      unreadCountTenant: 5,
      unreadCountLandlord: 3,
    },
  ];

  assert.equal(getVisibleConversations(convs, { id: 't1' }).length, 1);
  assert.equal(getUnreadMessageCount(convs, { id: 't1' }), 2);
  assert.equal(getUnreadMessageCount(convs, { id: 'l1' }), 1);
  assert.equal(getVisibleConversations(convs, { id: 'stranger' }).length, 0);

  const notifs = [
    { id: 'n1', userId: 't1', title: 'A', message: 'a', type: 'inquiry' as const, isRead: false, createdAt: '' },
    { id: 'n2', userId: 'l1', title: 'B', message: 'b', type: 'alert' as const, isRead: false, createdAt: '' },
  ];
  assert.equal(getVisibleNotifications(notifs, { id: 't1' }).length, 1);
  assert.equal(getVisibleNotifications(notifs, { id: 't1' })[0].id, 'n1');
});

test('evaluatePasswordStrength classifies empty, weak, fair, and strong passwords accurately', async () => {
  const { evaluatePasswordStrength } = await import('./auth.ts');

  const empty = evaluatePasswordStrength('');
  assert.equal(empty.level, 'empty');
  assert.equal(empty.score, 0);

  const tooShort = evaluatePasswordStrength('Ab1!xy');
  assert.equal(tooShort.level, 'weak');
  assert.equal(tooShort.score, 1);
  assert.equal(tooShort.checks.minLength, false);

  const breached = evaluatePasswordStrength('password123');
  assert.equal(breached.level, 'weak');
  assert.equal(breached.checks.notCommonBreached, false);

  const fairMixed = evaluatePasswordStrength('secret12');
  assert.equal(fairMixed.level, 'fair');
  assert.equal(fairMixed.score, 2);
  assert.equal(fairMixed.checks.hasNumberOrSymbol, true);

  const strongPw = evaluatePasswordStrength('Ethio#2026');
  assert.equal(strongPw.level, 'strong');
  assert.equal(strongPw.score, 3);
  assert.equal(strongPw.checks.minLength, true);
  assert.equal(strongPw.checks.hasLowerAndUpper, true);
  assert.equal(strongPw.checks.hasNumberOrSymbol, true);
});

