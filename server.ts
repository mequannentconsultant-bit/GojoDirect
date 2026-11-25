import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { INITIAL_USERS } from './src/data/mockData.ts';
import type { User, UserRole } from './src/types/index.ts';
import {
  INITIAL_CREDENTIAL_HASHES,
  verifyUserCredentials,
  validateAndPrepareRegistration,
  SESSION_TTL_MS,
  type CredentialStore,
} from './src/utils/auth.ts';
import {
  sanitizePlainText,
  hasSuspiciousPathTraversal,
  redactSecurityMetadata,
  stripPrototypePollution,
  type AttemptRecord,
} from './src/utils/security.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const ROOT_DIR = import.meta.dirname;
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

// Ephemeral strong CSPRNG fallback when SESSION_SECRET env var is unset (never a hardcoded weak string)
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const SESSION_COOKIE_NAME = 'ethioserve_sid';

interface ServerSessionPayload {
  jti: string;
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Server-side in-memory stores seeded identically to platform baseline
const serverUsers: User[] = INITIAL_USERS.map((u) => ({ ...u }));
const serverCredentials: CredentialStore = { ...INITIAL_CREDENTIAL_HASHES };
const serverLoginAttempts = new Map<string, AttemptRecord>();
const revokedSessionIds = new Set<string>();

// Sliding-window API rate limiter (per IP)
const apiHits = new Map<string, { count: number; resetAt: number }>();
const API_RATE_WINDOW_MS = 60_000;
const API_RATE_MAX_REQUESTS = 120;

const ADMIN_DOC_FILES: Record<string, { file: string; contentType: string; downloadName?: string }> = {
  '/EthioServe_Rent_HLD_Document.pdf': {
    file: 'EthioServe_Rent_HLD_Document.pdf',
    contentType: 'application/pdf',
    downloadName: 'EthioServe_Rent_HLD_Document.pdf',
  },
  '/EthioServe_Rent_LLD_Document.pdf': {
    file: 'EthioServe_Rent_LLD_Document.pdf',
    contentType: 'application/pdf',
    downloadName: 'EthioServe_Rent_LLD_Document.pdf',
  },
  '/hld.html': {
    file: 'hld.html',
    contentType: 'text/html; charset=utf-8',
  },
  '/lld.html': {
    file: 'lld.html',
    contentType: 'text/html; charset=utf-8',
  },
};

function logSecurityEvent(
  event: string,
  severity: 'info' | 'warn' | 'error',
  meta: Record<string, unknown> = {}
): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    severity,
    ...redactSecurityMetadata(meta),
  };
  if (severity === 'error') {
    console.error('[SECURITY]', JSON.stringify(entry));
  } else if (severity === 'warn') {
    console.warn('[SECURITY]', JSON.stringify(entry));
  } else {
    console.info('[SECURITY]', JSON.stringify(entry));
  }
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signSessionToken(user: Pick<User, 'id' | 'role'>): string {
  const now = Date.now();
  const payload: ServerSessionPayload = {
    jti: crypto.randomUUID(),
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const sig = base64UrlEncode(
    crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest()
  );
  return `${encodedPayload}.${sig}`;
}

function verifySessionToken(token: string | undefined): ServerSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, sig] = parts;
  if (!encodedPayload || !sig) return null;

  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest()
  );

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as ServerSessionPayload;
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    if (payload.exp <= Date.now()) return null;
    if (revokedSessionIds.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function isHttpsRequest(req: Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string' && proto.split(',')[0].trim() === 'https') {
    return true;
  }
  return Boolean(req.secure);
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const https = isHttpsRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    https ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (https) {
    attrs.push('Secure');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const https = isHttpsRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    https ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (https) {
    attrs.push('Secure');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function isSensitiveStaticPath(reqPath: string): boolean {
  const normalized = reqPath.toLowerCase();
  if (!IS_PROD && normalized.startsWith('/node_modules/.vite/')) {
    return false;
  }

  // Block dotfiles & sensitive configuration/source files
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some((seg) => seg.startsWith('.') && seg !== '.well-known')) {
    return true;
  }

  const blockedExact = new Set([
    '/server.ts',
    '/server.js',
    '/package.json',
    '/package-lock.json',
    '/bun.lock',
    '/tsconfig.json',
    '/vite.config.ts',
    '/metadata.json',
  ]);
  if (blockedExact.has(normalized)) return true;

  if (normalized.startsWith('/docs/') || normalized === '/docs') return true;
  if (normalized.endsWith('.test.ts') || normalized.endsWith('.env') || normalized.includes('/.env')) {
    return true;
  }
  if (IS_PROD && (normalized.startsWith('/src/') || normalized.startsWith('/node_modules/'))) {
    return true;
  }
  return false;
}

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function csrfAndOriginGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  const customHeader = req.headers['x-ethioserve-request'];
  if (customHeader !== '1') {
    logSecurityEvent('CSRF_HEADER_MISSING', 'warn', {
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
    });
    res.status(403).json({ error: 'Forbidden: missing security request header.' });
    return;
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        logSecurityEvent('CSRF_ORIGIN_MISMATCH', 'warn', {
          ip: getClientIp(req),
          originHost,
          host,
        });
        res.status(403).json({ error: 'Forbidden: cross-origin request rejected.' });
        return;
      }
    } catch {
      res.status(403).json({ error: 'Forbidden: invalid origin.' });
      return;
    }
  }

  next();
}

function apiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = apiHits.get(ip);

  if (!entry || entry.resetAt <= now) {
    apiHits.set(ip, { count: 1, resetAt: now + API_RATE_WINDOW_MS });
    next();
    return;
  }

  entry.count += 1;
  if (entry.count > API_RATE_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    logSecurityEvent('RATE_LIMIT_EXCEEDED', 'warn', { ip, path: req.path });
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
    return;
  }

  next();
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // OWASP A02: Global Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' https://images.unsplash.com data: blob:",
      "connect-src 'self' ws: wss:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com",
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)'
    );
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    if (isHttpsRequest(req)) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // OWASP A01/A05: Path Traversal & Sensitive File Blocker
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (hasSuspiciousPathTraversal(req.originalUrl) || hasSuspiciousPathTraversal(req.path)) {
      logSecurityEvent('PATH_TRAVERSAL_BLOCKED', 'warn', {
        ip: getClientIp(req),
        path: req.path,
      });
      res.status(400).json({ error: 'Invalid request path.' });
      return;
    }

    if (isSensitiveStaticPath(req.path)) {
      logSecurityEvent('SENSITIVE_PATH_BLOCKED', 'warn', {
        ip: getClientIp(req),
        path: req.path,
      });
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    next();
  });

  // Body parsing with strict size limit + prototype-pollution scrubber
  app.use(express.json({ limit: '64kb' }));
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      req.body = stripPrototypePollution(req.body);
    }
    next();
  });

  // OWASP A01: Admin-Gated Confidential Architecture Documents (before Vite/static middleware)
  app.get(
    [
      '/EthioServe_Rent_HLD_Document.pdf',
      '/EthioServe_Rent_LLD_Document.pdf',
      '/hld.html',
      '/lld.html',
    ],
    (req: Request, res: Response) => {
      const cookies = parseCookies(req);
      const session = verifySessionToken(cookies[SESSION_COOKIE_NAME]);
      if (!session || session.role !== 'admin') {
        logSecurityEvent('ACCESS_DENIED', 'warn', {
          ip: getClientIp(req),
          path: req.path,
          reason: session ? 'INSUFFICIENT_ROLE' : 'UNAUTHENTICATED',
        });
        res.setHeader('Cache-Control', 'no-store');
        res.status(403).send('Forbidden: Administrator authentication required.');
        return;
      }

      const activeAdmin = serverUsers.find((u) => u.id === session.sub);
      if (!activeAdmin || activeAdmin.role !== 'admin' || activeAdmin.status !== 'active') {
        res.setHeader('Cache-Control', 'no-store');
        res.status(403).send('Forbidden.');
        return;
      }

      const docMeta = ADMIN_DOC_FILES[req.path];
      if (!docMeta) {
        res.status(404).send('Not found.');
        return;
      }

      const resolvedPath = path.resolve(PUBLIC_DIR, docMeta.file);
      if (!resolvedPath.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(resolvedPath)) {
        res.status(404).send('Document unavailable.');
        return;
      }

      res.setHeader('Cache-Control', 'no-store, private');
      res.setHeader('Content-Type', docMeta.contentType);
      if (docMeta.downloadName) {
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${docMeta.downloadName}"`
        );
      }
      res.sendFile(resolvedPath);
    }
  );

  // API Routes
  app.use('/api', apiRateLimiter, (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, private');
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/auth/session', (req: Request, res: Response) => {
    const cookies = parseCookies(req);
    const session = verifySessionToken(cookies[SESSION_COOKIE_NAME]);
    if (!session) {
      res.json({ authenticated: false, user: null });
      return;
    }
    const found = serverUsers.find((u) => u.id === session.sub);
    if (!found || found.status !== 'active') {
      clearSessionCookie(req, res);
      res.json({ authenticated: false, user: null });
      return;
    }
    res.json({ authenticated: true, user: found });
  });

  app.post('/api/auth/login', csrfAndOriginGuard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = (req.body || {}) as { identifier?: unknown; password?: unknown };
      const identifier = typeof body.identifier === 'string' ? sanitizePlainText(body.identifier, 254) : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!identifier || !password || password.length > 256) {
        res.status(400).json({ ok: false, errorCode: 'EMPTY_FIELDS' });
        return;
      }

      const ip = getClientIp(req);
      const authRes = await verifyUserCredentials(
        serverUsers,
        identifier,
        password,
        serverCredentials,
        serverLoginAttempts
      );

      if (!authRes.ok || !authRes.user) {
        const eventName =
          authRes.errorCode === 'RATE_LIMITED' ? 'AUTH_LOCKOUT' : 'AUTH_FAILURE';
        logSecurityEvent(eventName, 'warn', {
          ip,
          identifier,
          reason: authRes.errorCode || 'UNKNOWN',
        });

        const statusCode = authRes.errorCode === 'RATE_LIMITED' ? 429 : 401;
        res.status(statusCode).json({
          ok: false,
          errorCode: authRes.errorCode,
          retryAfterSeconds: authRes.retryAfterSeconds,
        });
        return;
      }

      if (authRes.upgradedHash) {
        serverCredentials[authRes.user.id] = authRes.upgradedHash;
      }

      const token = signSessionToken(authRes.user);
      setSessionCookie(req, res, token);

      logSecurityEvent('AUTH_SUCCESS', 'info', {
        ip,
        userId: authRes.user.id,
        role: authRes.user.role,
      });

      res.json({ ok: true, user: authRes.user });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/register', csrfAndOriginGuard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const roleRaw = typeof body.role === 'string' ? body.role : '';
      const regRes = await validateAndPrepareRegistration(serverUsers, {
        firstName: typeof body.firstName === 'string' ? body.firstName : '',
        lastName: typeof body.lastName === 'string' ? body.lastName : '',
        email: typeof body.email === 'string' ? body.email : '',
        phone: typeof body.phone === 'string' ? body.phone : '',
        password: typeof body.password === 'string' ? body.password : '',
        role: roleRaw as UserRole,
      });

      if (!regRes.ok || !regRes.user || !regRes.passwordHash) {
        logSecurityEvent('REGISTER_REJECTED', 'warn', {
          ip: getClientIp(req),
          reason: regRes.errorCode || 'INVALID_INPUT',
        });
        const status = regRes.errorCode === 'DUPLICATE_ACCOUNT' ? 409 : 400;
        res.status(status).json({ ok: false, errorCode: regRes.errorCode });
        return;
      }

      serverUsers.unshift(regRes.user);
      serverCredentials[regRes.user.id] = regRes.passwordHash;

      const token = signSessionToken(regRes.user);
      setSessionCookie(req, res, token);

      logSecurityEvent('REGISTER_SUCCESS', 'info', {
        ip: getClientIp(req),
        userId: regRes.user.id,
        role: regRes.user.role,
      });

      res.status(201).json({ ok: true, user: regRes.user });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/logout', csrfAndOriginGuard, (req: Request, res: Response) => {
    const cookies = parseCookies(req);
    const session = verifySessionToken(cookies[SESSION_COOKIE_NAME]);
    if (session) {
      revokedSessionIds.add(session.jti);
      logSecurityEvent('AUTH_LOGOUT', 'info', {
        ip: getClientIp(req),
        userId: session.sub,
      });
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // Unknown /api/* routes fail closed with 404 JSON
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found.' });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR, { dotfiles: 'deny', index: false }));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  // OWASP A10: Fail-Closed Global Error Handler (never exposes stack traces or internal details)
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const isSyntaxErr =
      err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400;
    logSecurityEvent('SERVER_ERROR', 'error', {
      ip: getClientIp(req),
      path: req.path,
      code: isSyntaxErr ? 'INVALID_JSON' : 'INTERNAL_ERROR',
    });
    if (res.headersSent) return;
    if (isSyntaxErr) {
      res.status(400).json({ error: 'Malformed request payload.' });
      return;
    }
    res.status(500).json({ error: 'Request could not be processed.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.info(`GojoDirect secure server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(() => {
  console.error('Fatal server startup failure.');
  process.exit(1);
});
