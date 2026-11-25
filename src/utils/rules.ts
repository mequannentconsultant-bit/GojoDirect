import type {
  Property,
  SearchFilters,
  FeaturedTier,
  Review,
  Conversation,
  NotificationItem,
  User,
} from '../types/index.ts';
import {
  sanitizePlainText,
  isSafeImageUrl,
  MAX_TEXT_LENGTHS,
} from './security.ts';

export function formatETB(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 ETB';
  }
  return `${amount.toLocaleString('en-US')} ETB`;
}

export function calculateFeaturedPrice(tier: FeaturedTier): number {
  switch (tier) {
    case 'gold':
      return 800;
    case 'premium':
      return 300;
    case 'basic':
    default:
      return 0;
  }
}

export function filterProperties(
  properties: Property[],
  filters: Partial<SearchFilters>
): Property[] {
  return properties.filter((item) => {
    // City filter
    if (filters.city && filters.city !== 'all') {
      if (item.city.toLowerCase() !== filters.city.toLowerCase()) {
        return false;
      }
    }

    // Sub-city filter
    if (filters.subCity && filters.subCity !== 'all') {
      if (!item.subCity.toLowerCase().includes(filters.subCity.toLowerCase())) {
        return false;
      }
    }

    // Property Type filter
    if (filters.propertyType && filters.propertyType !== 'all') {
      if (item.propertyType.toLowerCase() !== filters.propertyType.toLowerCase()) {
        return false;
      }
    }

    // Bedrooms filter
    if (filters.bedrooms && filters.bedrooms !== 'all') {
      if (filters.bedrooms === '4+') {
        if (item.bedrooms < 4) return false;
      } else {
        const num = parseInt(filters.bedrooms, 10);
        if (!isNaN(num) && item.bedrooms !== num) return false;
      }
    }

    // Min price filter
    if (typeof filters.minPrice === 'number' && filters.minPrice > 0) {
      if (item.rentPrice < filters.minPrice) return false;
    }

    // Max price filter
    if (typeof filters.maxPrice === 'number' && filters.maxPrice > 0) {
      if (item.rentPrice > filters.maxPrice) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (item.status !== filters.status) return false;
    }

    // Verified only filter
    if (filters.verifiedOnly) {
      if (!item.isVerified && !item.ownerVerified) return false;
    }

    // Free text query filter (title, description, neighborhood, subCity)
    if (filters.query && filters.query.trim().length > 0) {
      const q = filters.query.toLowerCase().trim();
      const haystack = `${item.title} ${item.description} ${item.subCity} ${item.neighborhood} ${item.propertyType}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export function sortProperties(
  properties: Property[],
  sortBy: SearchFilters['sortBy'] = 'featured'
): Property[] {
  const cloned = [...properties];
  return cloned.sort((a, b) => {
    // In 'featured' sorting: Gold comes first, then Premium, then Basic
    if (sortBy === 'featured') {
      const tierRank: Record<FeaturedTier, number> = { gold: 3, premium: 2, basic: 1 };
      const rankDiff = (tierRank[b.featuredTier] || 1) - (tierRank[a.featuredTier] || 1);
      if (rankDiff !== 0) return rankDiff;
      // Secondary: verified listings boost
      if (b.isVerified !== a.isVerified) {
        return b.isVerified ? 1 : -1;
      }
      // Tertiary: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sortBy === 'price_low') {
      return a.rentPrice - b.rentPrice;
    }

    if (sortBy === 'price_high') {
      return b.rentPrice - a.rentPrice;
    }

    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    return 0;
  });
}

/**
 * Fraud Detection: Check if a property's price is suspiciously low compared to the expected benchmark
 * E.g. A 3-bedroom villa in Bole for 4,000 ETB is highly likely to be a broker fraud / scam
 */
export function detectSuspiciousPrice(
  price: number,
  averageBenchmarkPrice: number
): { isSuspicious: boolean; warning?: string } {
  if (averageBenchmarkPrice <= 0) return { isSuspicious: false };
  const ratio = price / averageBenchmarkPrice;
  if (ratio < 0.35) {
    return {
      isSuspicious: true,
      warning: `Suspiciously low price! Listed at ${Math.round(ratio * 100)}% of typical market average (${formatETB(averageBenchmarkPrice)}). Possible broker advance fee scam.`,
    };
  }
  return { isSuspicious: false };
}

/**
 * Fraud Detection: Check if another landlord is reusing the same image
 */
export function detectDuplicateImages(
  property: Property,
  allProperties: Property[]
): Property[] {
  const matches: Property[] = [];
  const propertyImgSet = new Set(property.images);

  for (const other of allProperties) {
    if (other.id === property.id || other.ownerId === property.ownerId) continue;
    const hasOverlap = other.images.some((img) => propertyImgSet.has(img));
    if (hasOverlap) {
      matches.push(other);
    }
  }

  return matches;
}

export function calculateAverageRating(reviews: Review[]): {
  average: number;
  count: number;
} {
  if (!reviews || reviews.length === 0) {
    return { average: 0, count: 0 };
  }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = Math.round((sum / reviews.length) * 10) / 10;
  return { average, count: reviews.length };
}

/**
 * RBAC Policy: Only active Landlord accounts are allowed to post rental properties.
 */
export function canPostProperty(user?: { role?: string; status?: string } | null): boolean {
  if (!user) return false;
  if (user.status && user.status !== 'active') return false;
  return user.role === 'landlord';
}

/**
 * IDOR / Ownership Policy: Only the property owner or an active admin may modify or delete a listing.
 */
export function canModifyProperty(
  user?: Pick<User, 'id' | 'role' | 'status'> | null,
  property?: Pick<Property, 'ownerId'> | null
): boolean {
  if (!user || !property || user.status !== 'active') return false;
  return property.ownerId === user.id || user.role === 'admin';
}

/**
 * Anti-Self-Review & RBAC Policy: Active authenticated users may review properties they do NOT own.
 */
export function canSubmitReview(
  user?: Pick<User, 'id' | 'status'> | null,
  property?: Pick<Property, 'ownerId'> | null
): boolean {
  if (!user || !property || user.status !== 'active') return false;
  return property.ownerId !== user.id;
}

/**
 * Verification RBAC Policy: Only active landlords may submit ID verification for themselves.
 */
export function canSubmitVerification(
  user?: Pick<User, 'id' | 'role' | 'status'> | null,
  targetUserId?: string
): boolean {
  if (!user || user.status !== 'active' || user.role !== 'landlord') return false;
  return !targetUserId || targetUserId === user.id;
}

/**
 * Sanitizes and bounds-checks new property submissions against injection and integer overflow/abuse.
 */
export function sanitizePropertyDraft(
  draft: Omit<Property, 'id' | 'createdAt' | 'ownerRating' | 'ownerReviewCount'>,
  owner: Pick<User, 'id' | 'firstName' | 'lastName' | 'phone' | 'isVerifiedLandlord'>
): Omit<Property, 'id' | 'createdAt' | 'ownerRating' | 'ownerReviewCount'> {
  const safeImages = (draft.images || []).filter((img) => isSafeImageUrl(img));
  const fallbackImage =
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80';

  const clampNum = (val: number, min: number, max: number, def: number) =>
    Number.isFinite(val) ? Math.min(max, Math.max(min, Math.round(val))) : def;

  return {
    ...draft,
    ownerId: owner.id,
    ownerName: sanitizePlainText(`${owner.firstName} ${owner.lastName}`, MAX_TEXT_LENGTHS.shortName),
    ownerPhone: sanitizePlainText(owner.phone, 24),
    ownerVerified: Boolean(owner.isVerifiedLandlord),
    isVerified: Boolean(owner.isVerifiedLandlord),
    title: sanitizePlainText(draft.title, MAX_TEXT_LENGTHS.title),
    description: sanitizePlainText(draft.description, MAX_TEXT_LENGTHS.description),
    subCity: sanitizePlainText(draft.subCity, MAX_TEXT_LENGTHS.shortName),
    neighborhood: sanitizePlainText(draft.neighborhood, MAX_TEXT_LENGTHS.neighborhood),
    address: sanitizePlainText(draft.address || draft.neighborhood, MAX_TEXT_LENGTHS.address),
    rentPrice: clampNum(draft.rentPrice, 1000, 10_000_000, 35000),
    bedrooms: clampNum(draft.bedrooms, 0, 20, 1),
    bathrooms: clampNum(draft.bathrooms, 1, 20, 1),
    areaSqM: clampNum(draft.areaSqM || 80, 10, 50_000, 80),
    amenities: (draft.amenities || [])
      .slice(0, 25)
      .map((a) => sanitizePlainText(a, 50))
      .filter(Boolean),
    images: safeImages.length > 0 ? safeImages.slice(0, 10) : [fallbackImage],
  };
}

/**
 * Privacy Policy: Users may only view conversations in which they are a participant.
 */
export function getVisibleConversations(
  conversations: Conversation[],
  user?: Pick<User, 'id'> | null
): Conversation[] {
  if (!user) return [];
  return conversations.filter(
    (c) => c.tenantId === user.id || c.landlordId === user.id
  );
}

/**
 * Privacy Policy: Users only receive notifications addressed to their own userId.
 */
export function getVisibleNotifications(
  notifications: NotificationItem[],
  user?: Pick<User, 'id'> | null
): NotificationItem[] {
  if (!user) return [];
  return notifications.filter((n) => n.userId === user.id);
}

/**
 * Computes unread message badge count strictly from the current user's own conversations.
 */
export function getUnreadMessageCount(
  conversations: Conversation[],
  user?: Pick<User, 'id'> | null
): number {
  if (!user) return 0;
  return getVisibleConversations(conversations, user).reduce((sum, conv) => {
    if (conv.tenantId === user.id) return sum + (conv.unreadCountTenant || 0);
    if (conv.landlordId === user.id) return sum + (conv.unreadCountLandlord || 0);
    return sum;
  }, 0);
}
