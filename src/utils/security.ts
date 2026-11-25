/**
 * EthioServe Rent — OWASP Top 10 (2026) Core Security Utilities
 * Pure, deterministic helpers usable in both browser React components and Node.js server/tests.
 */

export const MAX_TEXT_LENGTHS = {
  shortName: 80,
  title: 140,
  neighborhood: 120,
  address: 180,
  description: 2000,
  message: 1200,
  review: 1000,
  fraudDetails: 1500,
  docNumber: 64,
  url: 2048,
} as const;

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB strict upload limit
export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

// Common breached / weak passwords (OWASP ASVS / NIST 800-63B baseline blocklist)
const BREACHED_PASSWORDS = new Set([
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '000000',
  '00000000',
  '11111111',
  'password',
  'password1',
  'password123',
  'qwerty',
  'qwerty123',
  'admin123',
  'admin1234',
  'letmein1',
  'welcome1',
  'iloveyou',
  'ethiopia',
  'ethiopia123',
  'addisababa',
  'ethioserve',
  'gojodirect',
  'abc12345',
  'passw0rd',
]);

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively clones parsed JSON values while stripping prototype-pollution keys
 * (__proto__, constructor, prototype).
 */
export function stripPrototypePollution<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripPrototypePollution(item)) as unknown as T;
  }

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(k)) continue;
    clean[k] = stripPrototypePollution(v);
  }
  return clean as T;
}

/**
 * Prototype-pollution-safe JSON parser with fail-closed fallback.
 */
export function safeJsonParse<T>(raw: string, fallback: T): T {
  if (typeof raw !== 'string' || raw.length === 0) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw);
    return stripPrototypePollution(parsed) as T;
  } catch {
    return fallback;
  }
}

/**
 * Sanitizes user-supplied plain text to neutralize XSS vectors, bidi/zero-width spoofing,
 * control characters, and oversized payload abuse while preserving Amharic/Unicode text.
 */
export function sanitizePlainText(input: string, maxLength = 500): string {
  if (typeof input !== 'string') return '';

  let cleaned = input
    // Strip ASCII control characters except newline/tab
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Strip Unicode Bidi override & zero-width spoofing chars
    .replace(/[\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    // Neutralize dangerous HTML/script markers & inline JS handlers
    .replace(/<\s*\/?\s*(script|iframe|object|embed|svg|style|link|meta)[^>]*>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/\b(?:javascript|vbscript)\s*:/gi, '')
    .replace(/\bon(?:load|error|click|mouseover|focus|submit|input)\s*=/gi, '')
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength).trim();
  }
  return cleaned;
}

/**
 * Detects private, loopback, link-local, and cloud metadata IP/hostname targets (SSRF prevention).
 */
export function isPrivateOrRestrictedHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '::' ||
    host.startsWith('fe80:') ||
    host.startsWith('fc') ||
    host.startsWith('fd')
  ) {
    return true;
  }

  // IPv4 literal check
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, aStr, bStr, cStr, dStr] = ipv4Match;
    const a = Number(aStr);
    const b = Number(bStr);
    const c = Number(cStr);
    const d = Number(dStr);
    if ([a, b, c, d].some((oct) => oct < 0 || oct > 255)) return true;

    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 cloud metadata / link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  }

  return false;
}

/**
 * Validates image URLs against Stored XSS (javascript:, data:image/svg+xml), insecure HTTP,
 * embedded credentials, and SSRF private network targets.
 */
export function isSafeImageUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2_900_000) return false;

  // Reject control chars or quotes
  if (/[\u0000-\u001F\u007F"'<>]/.test(trimmed)) return false;

  // Allow safe root-relative local asset paths (no //, no .., no \)
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('..') || trimmed.includes('\\')) {
      return false;
    }
    return trimmed.length <= MAX_TEXT_LENGTHS.url;
  }

  // Allow validated raster image Data URIs only (explicitly block image/svg+xml & text/html)
  if (/^data:/i.test(trimmed)) {
    return /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed);
  }

  // Require HTTPS for external URLs
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  if (trimmed.length > MAX_TEXT_LENGTHS.url) return false;
  if (isPrivateOrRestrictedHost(parsed.hostname)) return false;

  return true;
}

/**
 * Validates uploaded verification document images (MIME + size + extension, blocks SVG XSS).
 */
export function validateImageUpload(file: {
  type: string;
  size: number;
  name?: string;
}): { ok: boolean; errorCode?: 'INVALID_TYPE' | 'FILE_TOO_LARGE' } {
  const mime = (file.type || '').toLowerCase().trim();
  const ext = (file.name || '').toLowerCase().split('.').pop() || '';
  const validExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(mime) || (file.name && !validExt)) {
    return { ok: false, errorCode: 'INVALID_TYPE' };
  }

  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, errorCode: 'FILE_TOO_LARGE' };
  }

  return { ok: true };
}

/**
 * Checks whether a password is on the common/breached password blocklist or matches user identity.
 */
export function isBreachedOrTrivialPassword(
  password: string,
  context?: { email?: string; phone?: string; firstName?: string; lastName?: string }
): boolean {
  const lower = password.trim().toLowerCase();
  if (!lower) return true;
  if (BREACHED_PASSWORDS.has(lower)) return true;

  // Sequential or repeated single character (e.g. "aaaaaaaa", "11111111")
  if (/^(.)\1{5,}$/.test(lower)) return true;

  if (context) {
    const emailLocal = (context.email || '').trim().toLowerCase().split('@')[0];
    if (emailLocal && emailLocal.length >= 4 && lower.includes(emailLocal)) return true;
    const phoneDigits = (context.phone || '').replace(/\D/g, '');
    if (phoneDigits.length >= 6 && lower.includes(phoneDigits.slice(-6))) return true;
    const first = (context.firstName || '').trim().toLowerCase();
    const last = (context.lastName || '').trim().toLowerCase();
    if (first.length >= 4 && lower === first) return true;
    if (last.length >= 4 && lower === last) return true;
  }

  return false;
}

/**
 * Constant-time string equality comparison (mitigates timing side-channels).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

/**
 * Computes a deterministic keyed integrity tag (FNV-64 + salted mix) for client-side storage
 * tamper detection without requiring async WebCrypto on synchronous boot hydration.
 */
export function computeClientIntegrityTag(payload: string, pepper = 'ethioserve_integrity_2026'): string {
  const full = `${pepper}|${payload.length}|${payload}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;

  for (let i = 0; i < full.length; i++) {
    const ch = full.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ ((ch + i) & 0xff), 0x85ebca77);
    h3 = Math.imul(h3 ^ (h1 >>> 5), 0xc2b2ae3d);
    h4 = Math.imul(h4 ^ (h2 >>> 7), 0x27d4eb2f);
  }

  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const p4 = (h4 >>> 0).toString(16).padStart(8, '0');
  return `mac1_${p1}${p2}${p3}${p4}`;
}

export function verifyClientIntegrityTag(
  payload: string,
  tag: string,
  pepper = 'ethioserve_integrity_2026'
): boolean {
  if (typeof tag !== 'string' || !tag.startsWith('mac1_')) return false;
  const expected = computeClientIntegrityTag(payload, pepper);
  return constantTimeEqual(expected, tag);
}

/**
 * Rate-limit & brute-force lockout state tracker (pure, reusable on client & server).
 */
export interface AttemptRecord {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

export interface RateLimitPolicy {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

export const DEFAULT_LOGIN_RATE_POLICY: RateLimitPolicy = {
  maxAttempts: 5,
  windowMs: 5 * 60 * 1000, // 5 minutes
  lockoutMs: 5 * 60 * 1000, // 5 minute lockout
};

export function checkAttemptAllowed(
  store: Map<string, AttemptRecord>,
  key: string,
  now = Date.now(),
  policy: RateLimitPolicy = DEFAULT_LOGIN_RATE_POLICY
): { allowed: boolean; retryAfterSeconds: number } {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return { allowed: true, retryAfterSeconds: 0 };

  const record = store.get(normalized);
  if (!record) return { allowed: true, retryAfterSeconds: 0 };

  if (record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((record.lockedUntil - now) / 1000)),
    };
  }

  // Expired window resets cleanly
  if (now - record.firstFailureAt > policy.windowMs) {
    store.delete(normalized);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedAttempt(
  store: Map<string, AttemptRecord>,
  key: string,
  now = Date.now(),
  policy: RateLimitPolicy = DEFAULT_LOGIN_RATE_POLICY
): AttemptRecord {
  const normalized = key.trim().toLowerCase();
  const existing = store.get(normalized);

  if (!existing || now - existing.firstFailureAt > policy.windowMs) {
    const next: AttemptRecord = {
      failures: 1,
      firstFailureAt: now,
      lockedUntil: policy.maxAttempts <= 1 ? now + policy.lockoutMs : 0,
    };
    store.set(normalized, next);
    return next;
  }

  const failures = existing.failures + 1;
  const lockedUntil = failures >= policy.maxAttempts ? now + policy.lockoutMs : existing.lockedUntil;
  const next: AttemptRecord = {
    failures,
    firstFailureAt: existing.firstFailureAt,
    lockedUntil,
  };
  store.set(normalized, next);
  return next;
}

export function clearFailedAttempts(store: Map<string, AttemptRecord>, key: string): void {
  store.delete(key.trim().toLowerCase());
}

/**
 * Redacts PII & credentials from structured security audit metadata (OWASP A09).
 */
const SENSITIVE_META_KEYS = /password|pass|token|secret|cookie|authorization|docnumber|documentnumber/i;

export function maskIdentifier(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '[empty]';
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    const safeLocal = local.length <= 2 ? '**' : `${local.slice(0, 2)}***`;
    return `${safeLocal}@${domain || 'unknown'}`;
  }
  if (trimmed.length <= 4) return '****';
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

export function redactSecurityMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(meta)) {
    if (SENSITIVE_META_KEYS.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (/email|phone|identifier/i.test(key) && typeof val === 'string') {
      out[key] = maskIdentifier(val);
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = redactSecurityMetadata(val as Record<string, unknown>);
      continue;
    }
    out[key] = typeof val === 'string' ? sanitizePlainText(val, 240) : val;
  }
  return out;
}

/**
 * Safe URL path normalization guard against path traversal (OWASP A01/A05).
 */
export function hasSuspiciousPathTraversal(rawPath: string): boolean {
  if (typeof rawPath !== 'string') return true;
  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return true;
  }
  return (
    rawPath.includes('\0') ||
    decoded.includes('\0') ||
    decoded.includes('..') ||
    decoded.includes('\\')
  );
}
