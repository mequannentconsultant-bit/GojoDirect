export type UserRole = 'tenant' | 'landlord' | 'admin';

export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  isVerifiedLandlord?: boolean;
  idDocumentType?: 'National ID / Kebele' | 'Passport' | 'Driver License';
  idDocumentNumber?: string;
  avatarUrl?: string;
  createdAt: string;
}

export type PropertyType =
  | 'Apartment'
  | 'Villa'
  | 'Condominium'
  | 'Studio'
  | 'Commercial Building'
  | 'Office'
  | 'Shop';

export type City =
  | 'Addis Ababa'
  | 'Adama'
  | 'Hawassa'
  | 'Bahir Dar'
  | 'Dire Dawa';

export type PropertyStatus = 'available' | 'occupied';

export type FeaturedTier = 'basic' | 'premium' | 'gold';

export interface Property {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerVerified: boolean;
  ownerRating: number;
  ownerReviewCount: number;
  title: string;
  description: string;
  rentPrice: number; // in ETB
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  areaSqM?: number;
  city: City;
  subCity: string;
  neighborhood: string;
  address: string;
  latitude: number;
  longitude: number;
  status: PropertyStatus;
  featuredTier: FeaturedTier;
  isVerified: boolean; // physical/title deed verified by EthioServe team
  amenities: string[];
  images: string[];
  createdAt: string;
  featuredExpiresAt?: string;
  viewsCount?: number;
}

export interface Review {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  tenantName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export type ChecklistCondition = 'Good' | 'Fair' | 'Needs Repair' | 'N/A';

export type ChecklistCategory = 'Utilities' | 'Appliances' | 'Fixtures & Keys';

export interface MoveInChecklistItem {
  id: string;
  category: ChecklistCategory;
  name: string;
  condition: ChecklistCondition;
  notes: string;
}

export interface MoveInChecklistData {
  checklistId: string;
  agreementId: string;
  propertyId: string;
  propertyTitle: string;
  landlordId: string;
  landlordName: string;
  tenantId: string;
  tenantName: string;
  inspectionDate: string;
  electricityMeterReading: string;
  waterMeterReading: string;
  keysHandedOver: number;
  items: MoveInChecklistItem[];
  status: 'pending_tenant' | 'signed';
  tenantSignature?: string;
  tenantSignedAt?: string;
  tenantAcknowledgement?: boolean;
  tenantGeneralNotes?: string;
}

export interface RentalAgreementData {
  agreementId: string;
  generatedAt: string;
  propertyId: string;
  propertyTitle: string;
  propertyType: string;
  city: string;
  subCity: string;
  neighborhood: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  areaSqM?: number;
  landlordId: string;
  landlordName: string;
  landlordPhone: string;
  landlordEmail?: string;
  tenantId: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  monthlyRentETB: number;
  securityDepositETB: number;
  leaseTermMonths: number;
  startDate: string;
  paymentDueDay: number;
  paymentMethod: 'Telebirr' | 'CBE Birr' | 'Bank Transfer' | 'Cash Receipt';
  utilitiesIncluded: string[];
  specialClauses: string;
  moveInChecklist?: MoveInChecklistData;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  rentalAgreement?: RentalAgreementData;
}

export interface Conversation {
  id: string;
  tenantId: string;
  tenantName: string;
  landlordId: string;
  landlordName: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  propertyPrice: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCountTenant: number;
  unreadCountLandlord: number;
}

export interface LandlordVerification {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  documentType: 'National ID / Kebele' | 'Passport' | 'Driver License';
  documentNumber: string;
  documentUrl: string;
  selfieUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface FraudReport {
  id: string;
  propertyId: string;
  propertyTitle: string;
  reporterId: string;
  reporterName: string;
  reason:
    | 'Fake pictures'
    | 'Broker pretending to be owner'
    | 'Unrealistic price'
    | 'Scam request for advance payment'
    | 'Already rented'
    | 'Other';
  details: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: string;
  suspiciousAlertFlag?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'inquiry' | 'message' | 'verification' | 'featured' | 'alert';
  isRead: boolean;
  createdAt: string;
  linkId?: string;
}

export interface SearchFilters {
  city: string;
  subCity: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: string; // 'all' | '1' | '2' | '3' | '4+'
  propertyType: string; // 'all' | PropertyType
  status: string; // 'all' | 'available' | 'occupied'
  verifiedOnly: boolean;
  query: string;
  sortBy: 'featured' | 'price_low' | 'price_high' | 'newest';
}
