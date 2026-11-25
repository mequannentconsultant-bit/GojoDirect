import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizePlainText,
  safeJsonParse,
  isSafeImageUrl,
  validateImageUpload,
  isBreachedOrTrivialPassword,
  constantTimeEqual,
  redactSecurityMetadata,
  hasSuspiciousPathTraversal,
  checkAttemptAllowed,
  recordFailedAttempt,
  clearFailedAttempts,
} from './security.ts';
import {
  hashPassword,
  verifyPasswordHash,
  verifyUserCredentials,
  validateAndPrepareRegistration,
  INITIAL_CREDENTIAL_HASHES,
  createClientSession,
  isClientSessionValid,
} from './auth.ts';
import { encodeIntegrityEnvelope, decodeIntegrityEnvelope } from './storage.ts';
import {
  canModifyProperty,
  canSubmitReview,
  canSubmitVerification,
  sanitizePropertyDraft,
} from './rules.ts';
import { INITIAL_USERS } from '../data/mockData.ts';

test('OWASP A01 Broken Access Control: ownership, IDOR, anti-self-review & verification guards', () => {
  const landlord1 = { id: 'l1', role: 'landlord' as const, status: 'active' as const };
  const landlord2 = { id: 'l2', role: 'landlord' as const, status: 'active' as const };
  const tenant = { id: 't1', role: 'tenant' as const, status: 'active' as const };
  const admin = { id: 'a1', role: 'admin' as const, status: 'active' as const };
  const suspendedLandlord = { id: 'l3', role: 'landlord' as const, status: 'suspended' as const };

  assert.equal(canModifyProperty(landlord1, { ownerId: 'l1' }), true);
  assert.equal(canModifyProperty(landlord2, { ownerId: 'l1' }), false);
  assert.equal(canModifyProperty(tenant, { ownerId: 'l1' }), false);
  assert.equal(canModifyProperty(admin, { ownerId: 'l1' }), true);
  assert.equal(canModifyProperty(suspendedLandlord, { ownerId: 'l3' }), false);

  // Landlords cannot review their own property
  assert.equal(canSubmitReview(landlord1, { ownerId: 'l1' }), false);
  assert.equal(canSubmitReview(tenant, { ownerId: 'l1' }), true);

  // Only active landlords may submit ID verification for themselves (no IDOR userId spoofing)
  assert.equal(canSubmitVerification(landlord1, 'l1'), true);
  assert.equal(canSubmitVerification(landlord1, 'l2'), false);
  assert.equal(canSubmitVerification(tenant, 't1'), false);
});

test('OWASP A04 Cryptographic Failures: salted PBKDF2-SHA256 hashing & constant-time compare', async () => {
  const h1 = await hashPassword('EthioSecure#2026');
  const h2 = await hashPassword('EthioSecure#2026');

  // Random per-user salt ensures identical passwords produce unique hashes
  assert.notEqual(h1, h2);
  assert.match(h1, /^pbkdf2_sha256\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);

  const ok = await verifyPasswordHash('EthioSecure#2026', h1);
  assert.equal(ok.valid, true);
  assert.equal(ok.needsRehash, false);

  const bad = await verifyPasswordHash('WrongPassword#1', h1);
  assert.equal(bad.valid, false);

  assert.equal(constantTimeEqual('abc123', 'abc123'), true);
  assert.equal(constantTimeEqual('abc123', 'abc124'), false);
  assert.equal(constantTimeEqual('abc', 'abcd'), false);
});

test('OWASP A05 Injection: XSS, prototype pollution, path traversal, SVG upload & SSRF prevention', () => {
  // XSS sanitization preserves legitimate text & Amharic while stripping tags/handlers
  const dirty = '<script>alert(1)</script>Bole Villa onclick=steal() \u202Eአዲስ አበባ';
  const clean = sanitizePlainText(dirty, 200);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('onclick='), false);
  assert.equal(clean.includes('\u202E'), false);
  assert.ok(clean.includes('አዲስ አበባ'));

  // Prototype pollution JSON defense
  const poisoned = '{"ok":true,"__proto__":{"polluted":true},"nested":{"constructor":{"evil":1}}}';
  const parsed = safeJsonParse<Record<string, unknown>>(poisoned, {});
  assert.equal((parsed as { ok?: boolean }).ok, true);
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, '__proto__'), false);

  // SSRF & URL XSS blocking
  assert.equal(isSafeImageUrl('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'), true);
  assert.equal(isSafeImageUrl('javascript:alert(document.cookie)'), false);
  assert.equal(isSafeImageUrl('data:image/svg+xml;base64,PHN2Zy8+'), false);
  assert.equal(isSafeImageUrl('http://insecure.example.com/a.jpg'), false);
  assert.equal(isSafeImageUrl('https://127.0.0.1/admin'), false);
  assert.equal(isSafeImageUrl('https://169.254.169.254/latest/meta-data'), false);
  assert.equal(isSafeImageUrl('https://localhost:3000/secret.png'), false);
  assert.equal(isSafeImageUrl('https://user:pass@example.com/pic.png'), false);
  assert.equal(isSafeImageUrl('//evil.com/steal.png'), false);

  // File upload guard blocks SVG XSS and >2MB payloads
  assert.equal(validateImageUpload({ type: 'image/png', size: 1024, name: 'id.png' }).ok, true);
  assert.equal(validateImageUpload({ type: 'image/svg+xml', size: 500, name: 'xss.svg' }).ok, false);
  assert.equal(validateImageUpload({ type: 'image/jpeg', size: 5 * 1024 * 1024, name: 'big.jpg' }).ok, false);

  // Path traversal detection
  assert.equal(hasSuspiciousPathTraversal('/../../etc/passwd'), true);
  assert.equal(hasSuspiciousPathTraversal('/%2e%2e/server.ts'), true);
  assert.equal(hasSuspiciousPathTraversal('/api/health'), false);
});

test('OWASP A06 & A07: Breached password blocklist, 5-attempt brute-force lockout & session TTL', async () => {
  assert.equal(isBreachedOrTrivialPassword('password123'), true);
  assert.equal(isBreachedOrTrivialPassword('ethiopia123'), true);
  assert.equal(isBreachedOrTrivialPassword('EthioSecure#99'), false);

  // Registration rejects breached password
  const weakReg = await validateAndPrepareRegistration(INITIAL_USERS, {
    firstName: 'Test',
    lastName: 'User',
    email: 'testuser@ethioserve.et',
    phone: '0911887766',
    password: 'password123',
    role: 'tenant',
  });
  assert.equal(weakReg.ok, false);
  assert.equal(weakReg.errorCode, 'WEAK_PASSWORD');

  // Brute force lockout after 5 consecutive failures
  const store = new Map();
  const baseTime = 1_700_000_000_000;
  for (let i = 0; i < 5; i++) {
    const res = await verifyUserCredentials(
      INITIAL_USERS,
      'almaz@ethioserve.et',
      'WrongPass#1',
      INITIAL_CREDENTIAL_HASHES,
      store,
      baseTime + i * 1000
    );
    assert.equal(res.ok, false);
    assert.equal(res.errorCode, 'INVALID_PASSWORD');
  }

  // 6th attempt is blocked even with the RIGHT password while locked out
  const locked = await verifyUserCredentials(
    INITIAL_USERS,
    'almaz@ethioserve.et',
    'EthioTenant#2026',
    INITIAL_CREDENTIAL_HASHES,
    store,
    baseTime + 10_000
  );
  assert.equal(locked.ok, false);
  assert.equal(locked.errorCode, 'RATE_LIMITED');
  assert.ok((locked.retryAfterSeconds || 0) > 0);

  // Low-level rate limit helpers clear properly
  clearFailedAttempts(store, 'almaz@ethioserve.et');
  assert.equal(checkAttemptAllowed(store, 'almaz@ethioserve.et', baseTime + 11_000).allowed, true);
  recordFailedAttempt(store, 'ip:1.2.3.4', baseTime);
  assert.equal(checkAttemptAllowed(store, 'ip:1.2.3.4', baseTime + 1000).allowed, true);

  // Session TTL expiry check
  const session = createClientSession('user-tenant-1', baseTime);
  assert.equal(isClientSessionValid(session, baseTime + 60_000), true);
  assert.equal(isClientSessionValid(session, session.expiresAt + 1), false);
});

test('OWASP A08 Integrity: localStorage signed envelope rejects role tampering', () => {
  const users = [{ id: 'u1', role: 'tenant' }];
  const encoded = encodeIntegrityEnvelope('ethioserve_v1_users', users);
  assert.deepEqual(decodeIntegrityEnvelope('ethioserve_v1_users', encoded, []), users);

  // Tamper role from tenant -> admin in raw JSON
  const tampered = encoded.replace('"tenant"', '"admin"');
  assert.deepEqual(decodeIntegrityEnvelope('ethioserve_v1_users', tampered, []), []);
});

test('OWASP A09 & A05 Property Sanitization: audit logs redact PII/secrets and property drafts clamp values', () => {
  const redacted = redactSecurityMetadata({
    email: 'admin@ethioserve.et',
    password: 'SecretPassword123',
    token: 'eyJhbGciOiJIUzI1NiJ9',
    documentNumber: 'ET-12345',
    note: '<b>Attempted</b> login',
  });
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.token, '[REDACTED]');
  assert.equal(redacted.documentNumber, '[REDACTED]');
  assert.equal(redacted.email, 'ad***@ethioserve.et');
  assert.equal(String(redacted.note).includes('<b>'), false);

  const sanitizedProp = sanitizePropertyDraft(
    {
      ownerId: 'spoofed-owner',
      ownerName: 'Spoof',
      ownerPhone: '0900',
      ownerVerified: true,
      title: '<script>xss</script>Nice Bole Flat',
      description: 'Clean house<iframe src="x">',
      rentPrice: -500,
      propertyType: 'Apartment',
      bedrooms: 99,
      bathrooms: 0,
      areaSqM: 5,
      city: 'Addis Ababa',
      subCity: 'Bole',
      neighborhood: 'Edna',
      address: 'Main St',
      latitude: 9,
      longitude: 38.7,
      status: 'available',
      featuredTier: 'basic',
      isVerified: true,
      amenities: ['Wifi', '<img src=x onerror=alert(1)>'],
      images: ['javascript:alert(1)', 'https://127.0.0.1/evil.jpg'],
    },
    {
      id: 'real-owner',
      firstName: 'Dawit',
      lastName: 'Bekele',
      phone: '0911223344',
      isVerifiedLandlord: false,
    }
  );

  assert.equal(sanitizedProp.ownerId, 'real-owner');
  assert.equal(sanitizedProp.isVerified, false);
  assert.equal(sanitizedProp.rentPrice, 1000);
  assert.equal(sanitizedProp.bedrooms, 20);
  assert.equal(sanitizedProp.bathrooms, 1);
  assert.equal(sanitizedProp.areaSqM, 10);
  assert.equal(sanitizedProp.title.includes('<script>'), false);
  assert.ok(sanitizedProp.images[0].startsWith('https://images.unsplash.com/'));
});
