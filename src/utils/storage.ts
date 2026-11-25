import {
  safeJsonParse,
  computeClientIntegrityTag,
  verifyClientIntegrityTag,
} from './security.ts';

const STORAGE_PREFIX = 'ethioserve_v1_';

export const STORAGE_KEYS = {
  users: `${STORAGE_PREFIX}users`,
  properties: `${STORAGE_PREFIX}properties`,
  conversations: `${STORAGE_PREFIX}conversations`,
  messages: `${STORAGE_PREFIX}messages`,
  verifications: `${STORAGE_PREFIX}verifications`,
  fraudReports: `${STORAGE_PREFIX}fraud_reports`,
  reviews: `${STORAGE_PREFIX}reviews`,
  notifications: `${STORAGE_PREFIX}notifications`,
  favorites: `${STORAGE_PREFIX}favorites`,
  credentials: `${STORAGE_PREFIX}credentials`,
  sessionUserId: `${STORAGE_PREFIX}session_user_id`,
  sessionRecord: `${STORAGE_PREFIX}session_record`,
} as const;

const INTEGRITY_PROTECTED_KEYS = new Set<string>([
  STORAGE_KEYS.users,
  STORAGE_KEYS.credentials,
  STORAGE_KEYS.sessionUserId,
  STORAGE_KEYS.sessionRecord,
]);

export interface SignedEnvelope<T> {
  v: 1;
  payload: T;
  mac: string;
}

export function encodeIntegrityEnvelope<T>(key: string, value: T): string {
  const serializedPayload = JSON.stringify(value);
  const mac = computeClientIntegrityTag(`${key}:${serializedPayload}`);
  return JSON.stringify({ v: 1, payload: value, mac });
}

export function decodeIntegrityEnvelope<T>(key: string, raw: string, fallback: T): T {
  const parsed = safeJsonParse<unknown>(raw, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fallback;
  }

  const env = parsed as Partial<SignedEnvelope<T>>;
  if (env.v !== 1 || typeof env.mac !== 'string' || !('payload' in env)) {
    return fallback;
  }

  const serializedPayload = JSON.stringify(env.payload);
  if (!verifyClientIntegrityTag(`${key}:${serializedPayload}`, env.mac)) {
    return fallback;
  }

  return env.payload as T;
}

export function loadStoredState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;

    if (INTEGRITY_PROTECTED_KEYS.has(key)) {
      const verified = decodeIntegrityEnvelope<T | null>(key, raw, null);
      if (verified === null) {
        // Fail closed if integrity check fails or legacy tampered format detected
        window.localStorage.removeItem(key);
        return fallback;
      }
      return verified;
    }

    return safeJsonParse<T>(raw, fallback);
  } catch {
    return fallback;
  }
}

export function saveStoredState<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    if (INTEGRITY_PROTECTED_KEYS.has(key)) {
      window.localStorage.setItem(key, encodeIntegrityEnvelope(key, value));
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors gracefully
  }
}

export function clearStoredKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
