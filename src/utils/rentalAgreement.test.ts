import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultAgreementData,
  canGenerateRentalAgreement,
  escapeHtml,
  formatRentalAgreementHtml,
  formatRentalAgreementText,
  getEndDateIso,
  getSafeAgreementFilename,
  sanitizeAgreementData,
} from './rentalAgreement.ts';
import type { Conversation, Property, User } from '../types/index.ts';

const sampleLandlord: User = {
  id: 'user-landlord-1',
  firstName: 'Dawit',
  lastName: 'Haile',
  email: 'dawit@ethioserve.et',
  phone: '+251 91 234 5678',
  role: 'landlord',
  status: 'active',
  isVerifiedLandlord: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const sampleTenant: User = {
  id: 'user-tenant-1',
  firstName: 'Almaz',
  lastName: 'Tadesse',
  email: 'almaz@ethioserve.et',
  phone: '+251 91 123 4567',
  role: 'tenant',
  status: 'active',
  createdAt: '2026-01-02T00:00:00Z',
};

const sampleProperty: Property = {
  id: 'prop-1',
  ownerId: 'user-landlord-1',
  ownerName: 'Dawit Haile',
  ownerPhone: '+251 91 234 5678',
  ownerVerified: true,
  ownerRating: 4.9,
  ownerReviewCount: 18,
  title: 'Luxury 3-Bedroom Apartment in Bole Medhanialem',
  description: 'Modern apartment near Edna Mall',
  rentPrice: 65000,
  propertyType: 'Apartment',
  bedrooms: 3,
  bathrooms: 2,
  areaSqM: 175,
  city: 'Addis Ababa',
  subCity: 'Bole',
  neighborhood: 'Bole Medhanialem',
  address: 'Cameroon St #12',
  latitude: 8.995,
  longitude: 38.789,
  status: 'available',
  featuredTier: 'gold',
  isVerified: true,
  amenities: ['Backup Generator', 'Reserve Water Tank', '24/7 Gated Security'],
  images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750'],
  createdAt: '2026-10-10T10:00:00Z',
};

const sampleConversation: Conversation = {
  id: 'conv-101',
  tenantId: 'user-tenant-1',
  tenantName: 'Almaz Tadesse',
  landlordId: 'user-landlord-1',
  landlordName: 'Dawit Haile',
  propertyId: 'prop-1',
  propertyTitle: 'Luxury 3-Bedroom Apartment in Bole Medhanialem',
  propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
  propertyPrice: 65000,
  lastMessage: 'Hello',
  lastMessageTime: '10:00 AM',
  unreadCountTenant: 0,
  unreadCountLandlord: 0,
};

test('buildDefaultAgreementData populates property, landlord, and tenant fields', () => {
  const agreement = buildDefaultAgreementData({
    conversation: sampleConversation,
    property: sampleProperty,
    landlord: sampleLandlord,
    tenant: sampleTenant,
    now: new Date('2026-11-19T12:00:00Z'),
  });

  assert.equal(agreement.propertyTitle, sampleProperty.title);
  assert.equal(agreement.city, 'Addis Ababa');
  assert.equal(agreement.subCity, 'Bole');
  assert.equal(agreement.landlordName, 'Dawit Haile');
  assert.equal(agreement.landlordPhone, '+251 91 234 5678');
  assert.equal(agreement.tenantName, 'Almaz Tadesse');
  assert.equal(agreement.tenantEmail, 'almaz@ethioserve.et');
  assert.equal(agreement.monthlyRentETB, 65000);
  assert.equal(agreement.securityDepositETB, 65000);
  assert.equal(agreement.leaseTermMonths, 12);
  assert.equal(agreement.startDate, '2026-11-26');
  assert.ok(agreement.utilitiesIncluded.includes('Backup Generator'));
});

test('canGenerateRentalAgreement strictly allows only the active landlord of the conversation', () => {
  assert.equal(canGenerateRentalAgreement(sampleLandlord, sampleConversation), true);
  assert.equal(canGenerateRentalAgreement(sampleTenant, sampleConversation), false);
  assert.equal(
    canGenerateRentalAgreement({ ...sampleLandlord, status: 'suspended' }, sampleConversation),
    false
  );
  assert.equal(
    canGenerateRentalAgreement({ ...sampleLandlord, id: 'other-landlord' }, sampleConversation),
    false
  );
  assert.equal(canGenerateRentalAgreement(null, sampleConversation), false);
});

test('sanitizeAgreementData clamps invalid numbers and strips XSS from clauses', () => {
  const base = buildDefaultAgreementData({
    conversation: sampleConversation,
    property: sampleProperty,
    landlord: sampleLandlord,
    tenant: sampleTenant,
  });

  const dirty = sanitizeAgreementData({
    ...base,
    monthlyRentETB: -999,
    leaseTermMonths: 500,
    paymentDueDay: 45,
    specialClauses: '<script>alert(1)</script>No pets allowed.',
  });

  assert.equal(dirty.monthlyRentETB, 500);
  assert.equal(dirty.leaseTermMonths, 60);
  assert.equal(dirty.paymentDueDay, 28);
  assert.equal(dirty.specialClauses.includes('<script>'), false);
  assert.ok(dirty.specialClauses.includes('No pets allowed.'));
});

test('formatRentalAgreementText and formatRentalAgreementHtml include full contract details and escape HTML safely', () => {
  const base = buildDefaultAgreementData({
    conversation: sampleConversation,
    property: sampleProperty,
    landlord: sampleLandlord,
    tenant: sampleTenant,
    now: new Date('2026-11-19T12:00:00Z'),
  });

  const text = formatRentalAgreementText(base);
  assert.ok(text.includes('STANDARD RESIDENTIAL RENTAL AGREEMENT'));
  assert.ok(text.includes('Almaz Tadesse'));
  assert.ok(text.includes('Dawit Haile'));
  assert.ok(text.includes('65,000 ETB'));
  assert.ok(text.includes('Luxury 3-Bedroom Apartment in Bole Medhanialem'));

  const html = formatRentalAgreementHtml({
    ...base,
    tenantName: 'Almaz <img src=x onerror=alert(1)>',
  });
  assert.ok(html.includes('default-src \'none\''));
  assert.equal(html.includes('<img src=x'), false);
  assert.ok(html.includes(escapeHtml('Almaz ')));
  assert.equal(getEndDateIso('2026-12-01', 12), '2027-12-01');
  assert.equal(getSafeAgreementFilename('../evil/GD-01', 'html'), 'GojoDirect_Rental_Agreement____evil_GD-01.html');
});
