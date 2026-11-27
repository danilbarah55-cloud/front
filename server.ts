import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  createPlayerRecord,
  getLeaderboardRecords,
  getPlayerBySlug,
  isSupabaseConnected,
  updatePlayerProfileRecord,
} from './src/db/supabase.ts';

const PORT = 3000;
const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

function slugOf(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]/gi, '')
    .slice(0, 16);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHex: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

interface SessionPayload {
  slug: string;
  name: string;
  exp: number;
}

function signSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

function verifySession(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || !parsed.slug || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

function setSessionCookie(res: Response, token: string): void {
  const maxAge = 30 * 24 * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `pf_sess=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None; Partitioned`,
  );
}

function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    'pf_sess=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned',
  );
}

interface AuthedRequest extends Request {
  user?: SessionPayload;
}

function extractAuth(req: http.IncomingMessage): SessionPayload | null {
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    const payload = verifySession(auth.slice(7).trim());
    if (payload) return payload;
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.pf_sess) {
    return verifySession(cookies.pf_sess);
  }
  return null;
}

function verifySameOriginForCookie(req: Request): boolean {
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return true;
  if (req.headers.authorization?.startsWith('Bearer ')) return true;
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = extractAuth(req);
  if (!user) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }
  if (req.method !== 'GET' && !verifySameOriginForCookie(req)) {
    res.status(403).json({ error: 'Запрос отклонён проверкой источника' });
    return;
  }
  req.user = user;
  next();
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '512kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, supabase: isSupabaseConnected() });
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const rawName = typeof req.body?.name === 'string' ? req.body.name : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const remember = Boolean(req.body?.remember);
    const name = rawName.trim().slice(0, 16);
    const slug = slugOf(name);

    if (name.length < 2 || slug.length < 2) {
      res.status(400).json({ error: 'Имя: от 2 символов, буквы и цифры' });
      return;
    }
    if (password.length < 4 || password.length > 128) {
      res.status(400).json({ error: 'Пароль: от 4 символов' });
      return;
    }

    const existing = await getPlayerBySlug(slug);
    if (existing) {
      res.status(409).json({ error: 'Такое имя уже занято. Войдите в аккаунт.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const initialProfile =
      req.body?.initialProfile && typeof req.body.initialProfile === 'object'
        ? req.body.initialProfile
        : {};

    await createPlayerRecord({
      slug,
      name,
      salt,
      password_hash: passwordHash,
      coins: Number((initialProfile as Record<string, unknown>).coins) || 0,
      rating: Number((initialProfile as Record<string, unknown>).rating) || 0,
      wins: 0,
      profile: initialProfile as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    });

    const token = signSession({
      slug,
      name,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    if (remember) {
      setSessionCookie(res, token);
    }

    res.json({
      token,
      user: { slug, name },
      profile: initialProfile,
      supabase: isSupabaseConnected(),
    });
  } catch (err) {
    console.error('[API] Register error:', err);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const rawName = typeof req.body?.name === 'string' ? req.body.name : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const remember = Boolean(req.body?.remember);
    const slug = slugOf(rawName);

    if (!slug) {
      res.status(400).json({ error: 'Введите имя' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Введите пароль' });
      return;
    }

    const rec = await getPlayerBySlug(slug);
    if (!rec) {
      res.status(404).json({ error: 'Аккаунт не найден. Зарегистрируйтесь.' });
      return;
    }

    if (!verifyPassword(password, rec.salt, rec.password_hash)) {
      res.status(401).json({ error: 'Неверный пароль' });
      return;
    }

    const token = signSession({
      slug: rec.slug,
      name: rec.name,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    if (remember) {
      setSessionCookie(res, token);
    }

    res.json({
      token,
      user: { slug: rec.slug, name: rec.name },
      profile: rec.profile || {},
      supabase: isSupabaseConnected(),
    });
  } catch (err) {
    console.error('[API] Login error:', err);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', async (req: AuthedRequest, res: Response) => {
  try {
    const user = extractAuth(req);
    if (!user) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }
    const rec = await getPlayerBySlug(user.slug);
    if (!rec) {
      clearSessionCookie(res);
      res.status(401).json({ error: 'Аккаунт не найден' });
      return;
    }
    const freshToken = signSession({
      slug: rec.slug,
      name: rec.name,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    res.json({
      token: freshToken,
      user: { slug: rec.slug, name: rec.name },
      profile: rec.profile || {},
      supabase: isSupabaseConnected(),
    });
  } catch (err) {
    console.error('[API] Auth me error:', err);
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
});

app.put('/api/profile', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const profile = req.body?.profile;
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      res.status(400).json({ error: 'Некорректный профиль' });
      return;
    }
    await updatePlayerProfileRecord(req.user!.slug, profile as Record<string, unknown>);
    res.json({ ok: true });
  } catch (err) {
    console.error('[API] Save profile error:', err);
    res.status(500).json({ error: 'Не удалось сохранить профиль' });
  }
});

app.get('/api/leaderboard', async (_req: Request, res: Response) => {
  try {
    const list = await getLeaderboardRecords(15);
    res.json({ list, supabase: isSupabaseConnected() });
  } catch (err) {
    console.error('[API] Leaderboard error:', err);
    res.status(500).json({ error: 'Не удалось загрузить рейтинг' });
  }
});

const server = http.createServer(app);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Pixel Front server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
