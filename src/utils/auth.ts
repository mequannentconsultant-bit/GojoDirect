import type { User, UserRole } from '../types/index.ts';
import {
  sanitizePlainText,
  isBreachedOrTrivialPassword,
  constantTimeEqual,
  checkAttemptAllowed,
  recordFailedAttempt,
  clearFailedAttempts,
  type AttemptRecord,
} from './security.ts';

export type CredentialStore = Record<string, string>;

export const MIN_PASSWORD_LENGTH = 8;
export const PBKDF2_ITERATIONS = 100_000;
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12-hour idle/absolute expiry

export interface SessionRecord {
  userId: string;
  issuedAt: number;
  expiresAt: number;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Legacy v1 verification only (kept strictly for seamless auto-migration from pre-hardening localStorage).
 */
function legacyHashPassword(password: string): string {
  const input = `ethioserve_salt_2026:${password}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `esv1_${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * OWASP A04 Cryptographic Hardening:
 * Salted PBKDF2-HMAC-SHA256 (100,000 iterations, 16-byte CSPRNG salt, 256-bit key).
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function hashPassword(password: string, explicitSaltHex?: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto SubtleCrypto API unavailable.');
  }

  let saltBytes: Uint8Array;
  if (explicitSaltHex) {
    saltBytes = hexToBytes(explicitSaltHex);
  } else {
    const generated = new Uint8Array(new ArrayBuffer(16));
    globalThis.crypto.getRandomValues(generated);
    saltBytes = generated;
  }

  const encoder = new TextEncoder();
  const baseKey = await subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(saltBytes),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  const hashHex = bytesToHex(new Uint8Array(derivedBits));
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${bytesToHex(saltBytes)}$${hashHex}`;
}

/**
 * Verifies a password against a stored PBKDF2-SHA256 hash (or legacy esv1_ hash for migration)
 * using constant-time equality comparison.
 */
export async function verifyPasswordHash(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!password || !storedHash) {
    return { valid: false, needsRehash: false };
  }

  if (storedHash.startsWith('pbkdf2_sha256$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return { valid: false, needsRehash: false };
    const [, iterStr, saltHex, expectedHex] = parts;
    const iterations = Number(iterStr);
    if (!Number.isFinite(iterations) || iterations < 10_000 || !saltHex || !expectedHex) {
      return { valid: false, needsRehash: false };
    }

    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return { valid: false, needsRehash: false };

    const saltBytes = hexToBytes(saltHex);
    const encoder = new TextEncoder();
    const baseKey = await subtle.importKey(
      'raw',
      toArrayBuffer(encoder.encode(password)),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: toArrayBuffer(saltBytes),
        iterations,
        hash: 'SHA-256',
      },
      baseKey,
      256
    );
    const actualHex = bytesToHex(new Uint8Array(derivedBits));
    const valid = constantTimeEqual(actualHex, expectedHex);
    return { valid, needsRehash: valid && iterations < PBKDF2_ITERATIONS };
  }

  // Legacy esv1 migration path
  if (storedHash.startsWith('esv1_')) {
    const valid = constantTimeEqual(legacyHashPassword(password), storedHash);
    return { valid, needsRehash: valid };
  }

  return { valid: false, needsRehash: false };
}

export function normalizeEthiopianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+251')) {
    return '0' + cleaned.slice(4);
  }
  if (cleaned.startsWith('251') && cleaned.length === 12) {
    return '0' + cleaned.slice(3);
  }
  return cleaned;
}

export function isValidEthiopianPhone(phone: string): boolean {
  const normalized = normalizeEthiopianPhone(phone);
  return /^0[79]\d{8}$/.test(normalized);
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'strong';

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  score: 0 | 1 | 2 | 3;
  checks: {
    minLength: boolean;
    recommendedLength: boolean;
    hasLowerAndUpper: boolean;
    hasNumberOrSymbol: boolean;
    notCommonBreached: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const minLength = password.length >= MIN_PASSWORD_LENGTH;
  const recommendedLength = password.length >= 10;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const notCommonBreached = password.length > 0 && !isBreachedOrTrivialPassword(password);

  const checks = {
    minLength,
    recommendedLength,
    hasLowerAndUpper: hasLower && hasUpper,
    hasNumberOrSymbol: hasNumber || hasSymbol,
    notCommonBreached,
  };

  if (password.length === 0) {
    return { level: 'empty', score: 0, checks };
  }

  const charTypes = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  if (!minLength || !notCommonBreached || (charTypes <= 1 && password.length < 12)) {
    return { level: 'weak', score: 1, checks };
  }

  if (minLength && charTypes >= 3) {
    return { level: 'strong', score: 3, checks };
  }

  return { level: 'fair', score: 2, checks };
}

export const INITIAL_CREDENTIAL_HASHES: CredentialStore = {
  'user-tenant-1':
    'pbkdf2_sha256$100000$7d150dad39986b1269e65db5074e6c41$3138421dd57a57efe787d0d73b56e0cfa9bb9dabb9446cd1ac14ef86dc60c7aa',
  'user-landlord-1':
    'pbkdf2_sha256$100000$6b294d973fd0a33d36ff9825c4d6ebd0$514941f0457ffab7a99c6ad92fcf57c42b896007e0934e01f6858fab480f1aa9',
  'user-landlord-2':
    'pbkdf2_sha256$100000$98a9a2082040480d84421343c9248b3c$4326f74926623e860d1fd73bc0489a5b7cbc22dc2facbc2112fd35a31d3f4079',
  'user-admin-1':
    'pbkdf2_sha256$100000$b8ea9cead2c298f380e8ee5b52088cfe$304d620d7600a541f16809c2f6393efd978bbbee42d824d96e9b9908da894178',
};

export interface AuthResult {
  ok: boolean;
  user?: User;
  upgradedHash?: string;
  retryAfterSeconds?: number;
  errorCode?:
    | 'EMPTY_FIELDS'
    | 'NOT_FOUND'
    | 'INVALID_PASSWORD'
    | 'SUSPENDED'
    | 'RATE_LIMITED';
}

// Per-runtime login brute-force tracker (shared safely or injected in tests)
const defaultLoginAttemptStore = new Map<string, AttemptRecord>();

export async function verifyUserCredentials(
  users: User[],
  identifier: string,
  password: string,
  credentials: CredentialStore,
  attemptStore: Map<string, AttemptRecord> = defaultLoginAttemptStore,
  now = Date.now()
): Promise<AuthResult> {
  const trimmedId = sanitizePlainText(identifier, 254);
  if (!trimmedId || !password) {
    return { ok: false, errorCode: 'EMPTY_FIELDS' };
  }

  const lowerEmail = trimmedId.toLowerCase();
  const normalizedPhone = normalizeEthiopianPhone(trimmedId);
  const rateKey = normalizedPhone && /^0\d{9}$/.test(normalizedPhone) ? normalizedPhone : lowerEmail;

  const limit = checkAttemptAllowed(attemptStore, rateKey, now);
  if (!limit.allowed) {
    return {
      ok: false,
      errorCode: 'RATE_LIMITED',
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === lowerEmail ||
      normalizeEthiopianPhone(u.phone) === normalizedPhone
  );

  // Constant-work verification even on missing/suspended users to avoid timing enumeration
  const expectedHash = user
    ? credentials[user.id] ?? INITIAL_CREDENTIAL_HASHES[user.id]
    : INITIAL_CREDENTIAL_HASHES['user-tenant-1'];

  const pwCheck = expectedHash
    ? await verifyPasswordHash(password, expectedHash)
    : { valid: false, needsRehash: false };

  if (!user) {
    recordFailedAttempt(attemptStore, rateKey, now);
    return { ok: false, errorCode: 'NOT_FOUND' };
  }

  if (user.status === 'suspended') {
    recordFailedAttempt(attemptStore, rateKey, now);
    return { ok: false, errorCode: 'SUSPENDED' };
  }

  if (!pwCheck.valid) {
    recordFailedAttempt(attemptStore, rateKey, now);
    return { ok: false, errorCode: 'INVALID_PASSWORD' };
  }

  clearFailedAttempts(attemptStore, rateKey);

  let upgradedHash: string | undefined;
  if (pwCheck.needsRehash) {
    upgradedHash = await hashPassword(password);
  }

  return { ok: true, user, upgradedHash };
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

export interface RegisterResult {
  ok: boolean;
  user?: User;
  passwordHash?: string;
  errorCode?:
    | 'MISSING_FIELDS'
    | 'INVALID_EMAIL'
    | 'INVALID_PHONE'
    | 'WEAK_PASSWORD'
    | 'INVALID_ROLE'
    | 'DUPLICATE_ACCOUNT';
}

export async function validateAndPrepareRegistration(
  existingUsers: User[],
  input: RegisterInput
): Promise<RegisterResult> {
  const firstName = sanitizePlainText(input.firstName, 60);
  const lastName = sanitizePlainText(input.lastName, 60);
  const email = sanitizePlainText(input.email, 254).toLowerCase();
  const phone = sanitizePlainText(input.phone, 24);
  const password = input.password;

  if (!firstName || !lastName || !email || !phone || !password) {
    return { ok: false, errorCode: 'MISSING_FIELDS' };
  }

  // Strictly block public self-registration as admin (OWASP A01)
  if (input.role !== 'tenant' && input.role !== 'landlord') {
    return { ok: false, errorCode: 'INVALID_ROLE' };
  }

  if (!isValidEmail(email)) {
    return { ok: false, errorCode: 'INVALID_EMAIL' };
  }

  if (!isValidEthiopianPhone(phone)) {
    return { ok: false, errorCode: 'INVALID_PHONE' };
  }

  const strength = evaluatePasswordStrength(password);
  const matchesIdentity = isBreachedOrTrivialPassword(password, {
    email,
    phone,
    firstName,
    lastName,
  });

  if (password.length < MIN_PASSWORD_LENGTH || strength.level === 'weak' || matchesIdentity) {
    return { ok: false, errorCode: 'WEAK_PASSWORD' };
  }

  const normalizedPhone = normalizeEthiopianPhone(phone);
  const duplicate = existingUsers.some(
    (u) =>
      u.email.toLowerCase() === email ||
      normalizeEthiopianPhone(u.phone) === normalizedPhone
  );

  if (duplicate) {
    return { ok: false, errorCode: 'DUPLICATE_ACCOUNT' };
  }

  const randomSuffixBytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(randomSuffixBytes);
  const randomSuffix = bytesToHex(randomSuffixBytes);

  const newUser: User = {
    id: `user-${Date.now()}-${randomSuffix}`,
    firstName,
    lastName,
    email,
    phone: normalizedPhone,
    role: input.role,
    status: 'active',
    isVerifiedLandlord: false,
    avatarUrl:
      input.role === 'landlord'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    user: newUser,
    passwordHash: await hashPassword(password),
  };
}

export function createClientSession(userId: string, now = Date.now()): SessionRecord {
  return {
    userId,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
}

export function isClientSessionValid(session: unknown, now = Date.now()): session is SessionRecord {
  if (!session || typeof session !== 'object') return false;
  const s = session as Partial<SessionRecord>;
  return (
    typeof s.userId === 'string' &&
    s.userId.length > 0 &&
    typeof s.issuedAt === 'number' &&
    typeof s.expiresAt === 'number' &&
    s.expiresAt > now
  );
}
