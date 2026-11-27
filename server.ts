import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  createPlayerRecord,
  deletePartyRecord,
  getLeaderboardRecords,
  getPlayerBySlug,
  isSupabaseConnected,
  recordMatchResult,
  updatePlayerProfileRecord,
  upsertPartyRecord,
  type PartyMemberRecord,
} from './src/db/supabase.ts';

const PORT = 3000;
const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const PAL_IDS = [
  'red',
  'orange',
  'purple',
  'yellow',
  'pink',
  'lime',
  'white',
  'brown',
  'magenta',
  'graphite',
  'green',
  'salmon',
  'maroon',
  'stone',
  'rust',
  'violet',
];

const SKIN_IDS = [
  'solid',
  'stripes',
  'checker',
  'dots',
  'rainbow',
  'sunset',
  'camo',
  'argyle',
  'waves',
  'ember',
  'gold',
  'neon',
];

const MAP_LIMITS = [8, 12, 16];

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

/* ==================== WebSocket Party & Multiplayer Engine ==================== */

interface ClientConn {
  ws: WebSocket;
  peer: string;
  slug: string;
  name: string;
  roomCode: string | null;
  inQueue: boolean;
  queueJoinedAt: number;
  color: string;
  skin: string;
}

interface PartyRoom {
  code: string;
  isParty: boolean;
  hostPeer: string;
  hostSlug: string;
  mode: 'coop' | 'ffa';
  size: number;
  diff: number;
  started: boolean;
  members: Map<string, PartyMemberRecord & { ws: WebSocket }>;
  chat: Array<{ name: string; text: string; ts: number }>;
  startedAt: number;
}

const clients = new Map<string, ClientConn>();
const rooms = new Map<string, PartyRoom>();
const queuePeers: string[] = [];

function genCode(len = 4): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

function safeSend(ws: WebSocket | undefined, payload: unknown): void {
  if (!ws || ws.readyState !== 1) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // ignore send failures on closing sockets
  }
}

function broadcastRoom(room: PartyRoom, payload: unknown, exceptPeer?: string): void {
  for (const [peer, member] of room.members) {
    if (exceptPeer && peer === exceptPeer) continue;
    safeSend(member.ws, payload);
  }
}

function serializePartyState(room: PartyRoom) {
  const members = Array.from(room.members.values())
    .sort((a, b) => a.slot - b.slot)
    .map((m) => ({
      peer: m.peer,
      slug: m.slug,
      name: m.name,
      slot: m.slot,
      color: m.color,
      skin: m.skin,
      ready: m.ready,
      isHost: m.peer === room.hostPeer,
    }));

  return {
    type: 'party_state',
    code: room.code,
    isParty: room.isParty,
    hostPeer: room.hostPeer,
    mode: room.mode,
    size: room.size,
    diff: room.diff,
    started: room.started,
    maxPlayers: MAP_LIMITS[room.size] || 8,
    members,
    chat: room.chat.slice(-25),
  };
}

async function persistRoom(room: PartyRoom): Promise<void> {
  const members: PartyMemberRecord[] = Array.from(room.members.values()).map((m) => ({
    peer: m.peer,
    slug: m.slug,
    name: m.name,
    slot: m.slot,
    color: m.color,
    skin: m.skin,
    ready: m.ready,
    isHost: m.peer === room.hostPeer,
  }));
  await upsertPartyRecord({
    code: room.code,
    host_slug: room.hostSlug,
    mode: room.mode,
    map_size: room.size,
    diff: room.diff,
    status: room.started ? 'playing' : 'lobby',
    members,
    updated_at: new Date().toISOString(),
  });
}

function pickAvailableColor(room: PartyRoom, preferred: string): string {
  const used = new Set(Array.from(room.members.values()).map((m) => m.color));
  if (PAL_IDS.includes(preferred) && !used.has(preferred)) {
    return preferred;
  }
  const free = PAL_IDS.find((c) => !used.has(c));
  return free || PAL_IDS[room.members.size % PAL_IDS.length];
}

function pickAvailableSlot(room: PartyRoom): number | null {
  const limit = MAP_LIMITS[room.size] || 8;
  const used = new Set(Array.from(room.members.values()).map((m) => m.slot));
  for (let s = 1; s <= limit; s++) {
    if (!used.has(s)) return s;
  }
  return null;
}

function leaveQueue(conn: ClientConn): void {
  if (!conn.inQueue) return;
  conn.inQueue = false;
  const idx = queuePeers.indexOf(conn.peer);
  if (idx >= 0) queuePeers.splice(idx, 1);
  broadcastQueueState();
}

function broadcastQueueState(): void {
  const count = queuePeers.length;
  for (const peer of queuePeers) {
    const c = clients.get(peer);
    if (c) {
      safeSend(c.ws, { type: 'queue_state', count });
    }
  }
}

async function leaveCurrentRoom(conn: ClientConn, reason = 'left'): Promise<void> {
  const code = conn.roomCode;
  if (!code) return;
  conn.roomCode = null;
  const room = rooms.get(code);
  if (!room) return;

  const member = room.members.get(conn.peer);
  room.members.delete(conn.peer);

  if (room.members.size === 0) {
    rooms.delete(code);
    await deletePartyRecord(code);
    return;
  }

  if (room.started) {
    if (conn.peer === room.hostPeer) {
      broadcastRoom(room, {
        type: 'game_msg',
        topic: 'host_left',
        from: conn.peer,
        data: { reason },
      });
      room.started = false;
    } else if (member) {
      const host = room.members.get(room.hostPeer);
      if (host) {
        safeSend(host.ws, {
          type: 'peer_left',
          peer: conn.peer,
          slot: member.slot,
          name: member.name,
        });
      }
    }
  } else {
    if (conn.peer === room.hostPeer) {
      const next = Array.from(room.members.values()).sort((a, b) => a.slot - b.slot)[0];
      if (next) {
        room.hostPeer = next.peer;
        room.hostSlug = next.slug;
        next.isHost = true;
        next.ready = true;
        room.chat.push({
          name: 'Система',
          text: `${next.name} стал лидером пати`,
          ts: Date.now(),
        });
      }
    }
    broadcastRoom(room, serializePartyState(room));
    await persistRoom(room);
  }
}

let queueMatchTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleQueueCheck(): void {
  if (queuePeers.length < 2) {
    if (queueMatchTimer) {
      clearTimeout(queueMatchTimer);
      queueMatchTimer = null;
    }
    return;
  }
  if (queuePeers.length >= 8) {
    if (queueMatchTimer) {
      clearTimeout(queueMatchTimer);
      queueMatchTimer = null;
    }
    void triggerQueueMatch();
    return;
  }
  if (!queueMatchTimer) {
    queueMatchTimer = setTimeout(() => {
      queueMatchTimer = null;
      void triggerQueueMatch();
    }, 3000);
  }
}

async function triggerQueueMatch(): Promise<void> {
  const valid = queuePeers
    .map((p) => clients.get(p))
    .filter((c): c is ClientConn => Boolean(c && c.ws.readyState === 1));
  if (valid.length < 2) {
    broadcastQueueState();
    return;
  }

  const batch = valid.slice(0, 8);
  let code = 'm' + genCode(5);
  while (rooms.has(code)) code = 'm' + genCode(5);

  const host = batch[0];
  const room: PartyRoom = {
    code,
    isParty: false,
    hostPeer: host.peer,
    hostSlug: host.slug,
    mode: 'ffa',
    size: 0,
    diff: 1,
    started: false,
    members: new Map(),
    chat: [],
    startedAt: 0,
  };
  rooms.set(code, room);

  batch.forEach((conn, idx) => {
    leaveQueue(conn);
    conn.roomCode = code;
    const slot = idx + 1;
    const color = pickAvailableColor(room, conn.color);
    room.members.set(conn.peer, {
      peer: conn.peer,
      slug: conn.slug,
      name: conn.name,
      slot,
      color,
      skin: SKIN_IDS.includes(conn.skin) ? conn.skin : 'solid',
      ready: true,
      isHost: idx === 0,
      ws: conn.ws,
    });
  });

  await persistRoom(room);
  for (const conn of batch) {
    safeSend(conn.ws, {
      type: 'queue_matched',
      code,
      isHost: conn.peer === host.peer,
    });
  }
  broadcastRoom(room, serializePartyState(room));

  // Auto-start quick match after brief lobby sync
  setTimeout(() => {
    const r = rooms.get(code);
    if (!r || r.started) return;
    const hostConn = clients.get(r.hostPeer);
    if (hostConn) {
      safeSend(hostConn.ws, { type: 'auto_start_request', code });
    }
  }, 1200);
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/ws', `http://${req.headers.host || 'localhost'}`);
  const tokenParam = url.searchParams.get('token') || '';
  const auth = verifySession(tokenParam) || extractAuth(req);

  const peer = 'p_' + crypto.randomBytes(6).toString('hex');
  const conn: ClientConn = {
    ws,
    peer,
    slug: auth?.slug || peer,
    name: auth?.name || 'Игрок',
    roomCode: null,
    inQueue: false,
    queueJoinedAt: 0,
    color: 'red',
    skin: 'solid',
  };
  clients.set(peer, conn);

  safeSend(ws, {
    type: 'welcome',
    peer,
    slug: conn.slug,
    name: conn.name,
  });

  ws.on('message', async (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    const t = msg.type;

    if (t === 'auth_update') {
      const tok = typeof msg.token === 'string' ? msg.token : '';
      const verified = verifySession(tok);
      if (verified) {
        conn.slug = verified.slug;
        conn.name = verified.name;
      } else if (typeof msg.name === 'string' && msg.name.trim()) {
        conn.name = msg.name.trim().slice(0, 16);
      }
      return;
    }

    if (t === 'queue_join') {
      await leaveCurrentRoom(conn);
      conn.color = PAL_IDS.includes(String(msg.color)) ? String(msg.color) : 'red';
      conn.skin = SKIN_IDS.includes(String(msg.skin)) ? String(msg.skin) : 'solid';
      if (!conn.inQueue) {
        conn.inQueue = true;
        conn.queueJoinedAt = Date.now();
        queuePeers.push(conn.peer);
      }
      broadcastQueueState();
      scheduleQueueCheck();
      return;
    }

    if (t === 'queue_leave') {
      leaveQueue(conn);
      return;
    }

    if (t === 'party_create' || t === 'party_join') {
      leaveQueue(conn);
      await leaveCurrentRoom(conn);

      const isCreate = t === 'party_create';
      let code = String(msg.code || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 12);

      if (isCreate && !code) {
        code = genCode(4);
        while (rooms.has(code)) code = genCode(4);
      }
      if (code.length < 3) {
        safeSend(ws, {
          type: 'party_error',
          error: 'Код должен содержать от 3 латинских букв или цифр',
        });
        return;
      }

      const prefColor = PAL_IDS.includes(String(msg.color)) ? String(msg.color) : 'red';
      const prefSkin = SKIN_IDS.includes(String(msg.skin)) ? String(msg.skin) : 'solid';
      const reqName =
        typeof msg.name === 'string' && msg.name.trim()
          ? msg.name.trim().slice(0, 16)
          : conn.name;
      conn.name = reqName;
      conn.color = prefColor;
      conn.skin = prefSkin;

      let room = rooms.get(code);
      if (isCreate) {
        if (room) {
          safeSend(ws, {
            type: 'party_error',
            error: `Комната ${code.toUpperCase()} уже существует. Введите другой код или войдите в неё.`,
          });
          return;
        }
        const reqMode = msg.mode === 'ffa' ? 'ffa' : 'coop';
        const reqSize = Math.max(0, Math.min(2, Number(msg.size) || 0));
        const reqDiff = Math.max(0, Math.min(2, Number(msg.diff) ?? 1));
        room = {
          code,
          isParty: msg.isParty !== false,
          hostPeer: conn.peer,
          hostSlug: conn.slug,
          mode: reqMode,
          size: reqSize,
          diff: reqDiff,
          started: false,
          members: new Map(),
          chat: [
            {
              name: 'Система',
              text: `${conn.name} создал пати (${code.toUpperCase()})`,
              ts: Date.now(),
            },
          ],
          startedAt: 0,
        };
        rooms.set(code, room);
      } else {
        if (!room) {
          safeSend(ws, {
            type: 'party_error',
            error: `Пати с кодом ${code.toUpperCase()} не найдено`,
          });
          return;
        }
        if (room.started) {
          safeSend(ws, {
            type: 'party_error',
            error: 'Бой в этом пати уже начался',
          });
          return;
        }
      }

      const slot = pickAvailableSlot(room);
      if (slot === null) {
        safeSend(ws, { type: 'party_error', error: 'Пати переполнено' });
        return;
      }

      const color = pickAvailableColor(room, prefColor);
      conn.roomCode = code;
      room.members.set(conn.peer, {
        peer: conn.peer,
        slug: conn.slug,
        name: conn.name,
        slot,
        color,
        skin: prefSkin,
        ready: conn.peer === room.hostPeer,
        isHost: conn.peer === room.hostPeer,
        ws,
      });

      if (!isCreate) {
        room.chat.push({
          name: 'Система',
          text: `${conn.name} присоединился к пати`,
          ts: Date.now(),
        });
        if (room.chat.length > 40) room.chat = room.chat.slice(-40);
      }

      broadcastRoom(room, serializePartyState(room));
      await persistRoom(room);
      return;
    }

    if (t === 'party_leave') {
      await leaveCurrentRoom(conn);
      return;
    }

    const room = conn.roomCode ? rooms.get(conn.roomCode) : undefined;
    if (!room) return;
    const member = room.members.get(conn.peer);
    if (!member) return;

    if (t === 'party_update') {
      if (room.started) return;
      if (typeof msg.color === 'string' && PAL_IDS.includes(msg.color)) {
        const taken = Array.from(room.members.values()).some(
          (m) => m.peer !== conn.peer && m.color === msg.color,
        );
        if (!taken) {
          member.color = msg.color;
        } else {
          safeSend(ws, { type: 'party_error', error: 'Этот цвет уже занят другим игроком' });
        }
      }
      if (typeof msg.skin === 'string' && SKIN_IDS.includes(msg.skin)) {
        member.skin = msg.skin;
      }
      if (typeof msg.ready === 'boolean') {
        member.ready = msg.ready;
      }
      if (conn.peer === room.hostPeer) {
        if (msg.mode === 'coop' || msg.mode === 'ffa') room.mode = msg.mode;
        if (msg.size !== undefined) {
          const newSize = Math.max(0, Math.min(2, Number(msg.size) || 0));
          if (room.members.size <= (MAP_LIMITS[newSize] || 8)) {
            room.size = newSize;
          }
        }
        if (msg.diff !== undefined) {
          room.diff = Math.max(0, Math.min(2, Number(msg.diff) || 0));
        }
      }
      broadcastRoom(room, serializePartyState(room));
      await persistRoom(room);
      return;
    }

    if (t === 'party_kick') {
      if (conn.peer !== room.hostPeer || room.started) return;
      const targetPeer = String(msg.peer || '');
      if (!targetPeer || targetPeer === conn.peer) return;
      const targetConn = clients.get(targetPeer);
      const targetMember = room.members.get(targetPeer);
      if (!targetMember) return;
      room.members.delete(targetPeer);
      if (targetConn) {
        targetConn.roomCode = null;
        safeSend(targetConn.ws, {
          type: 'party_kicked',
          reason: 'Лидер исключил вас из пати',
        });
      }
      room.chat.push({
        name: 'Система',
        text: `${targetMember.name} исключён из пати`,
        ts: Date.now(),
      });
      broadcastRoom(room, serializePartyState(room));
      await persistRoom(room);
      return;
    }

    if (t === 'party_chat') {
      const text = String(msg.text || '').trim().slice(0, 120);
      if (!text) return;
      const entry = { name: member.name, text, ts: Date.now() };
      room.chat.push(entry);
      if (room.chat.length > 40) room.chat = room.chat.slice(-40);
      broadcastRoom(room, { type: 'party_chat', entry });
      return;
    }

    if (t === 'party_start') {
      if (conn.peer !== room.hostPeer || room.started) return;
      room.started = true;
      room.startedAt = Date.now();
      const seedv = crypto.randomInt(1, 999999999);
      const limit = MAP_LIMITS[room.size] || 8;
      const slots: Record<string, number> = {};
      const cols: Record<number, string> = {};
      const skins: Record<number, string> = {};
      const names: Record<number, string> = {};
      const partyPeers: number[] = [];

      // Re-index slots cleanly 1..N
      const ordered = Array.from(room.members.values()).sort((a, b) =>
        a.peer === room.hostPeer ? -1 : b.peer === room.hostPeer ? 1 : a.slot - b.slot,
      );
      ordered.forEach((m, idx) => {
        m.slot = idx + 1;
        if (m.slot <= limit) {
          slots[m.peer] = m.slot;
          cols[m.slot] = m.color;
          skins[m.slot] = m.skin;
          names[m.slot] = m.name;
          if (room.mode === 'coop') {
            partyPeers.push(m.slot);
          }
        }
      });

      broadcastRoom(room, {
        type: 'game_start',
        code: room.code,
        hostPeer: room.hostPeer,
        mode: room.mode,
        size: room.size,
        diff: room.diff,
        seed: seedv,
        slots,
        cols,
        skins,
        names,
        partyAllies: partyPeers,
      });
      await persistRoom(room);
      return;
    }

    if (t === 'party_return') {
      if (conn.peer === room.hostPeer) {
        room.started = false;
        for (const m of room.members.values()) {
          m.ready = m.peer === room.hostPeer;
        }
        broadcastRoom(room, serializePartyState(room));
        await persistRoom(room);
      }
      return;
    }

    if (t === 'game_end') {
      if (conn.peer !== room.hostPeer) return;
      room.started = false;
      const durationSec = room.startedAt
        ? Math.max(1, Math.round((Date.now() - room.startedAt) / 1000))
        : 0;
      const winners = Array.isArray(msg.winners) ? msg.winners : [];
      const winnerNames = Array.isArray(msg.winnerNames)
        ? msg.winnerNames.map((n) => String(n).slice(0, 20)).join(', ')
        : '';

      broadcastRoom(
        room,
        {
          type: 'game_msg',
          topic: 'end',
          from: conn.peer,
          data: { winners, winnerNames, durationSec },
        },
        conn.peer,
      );

      await recordMatchResult({
        party_code: room.code,
        mode: room.mode,
        winner_names: winnerNames,
        duration_sec: durationSec,
        player_count: room.members.size,
      });
      await persistRoom(room);
      return;
    }

    if (t === 'game_msg') {
      const topic = String(msg.topic || '');
      if (topic === 'cmd') {
        const host = room.members.get(room.hostPeer);
        if (host) {
          safeSend(host.ws, {
            type: 'game_msg',
            topic: 'cmd',
            from: conn.peer,
            data: msg.data,
          });
        }
      } else if (topic === 'chat') {
        const d = (msg.data || {}) as Record<string, unknown>;
        broadcastRoom(
          room,
          {
            type: 'game_msg',
            topic: 'chat',
            from: conn.peer,
            data: {
              n: member.name,
              t: String(d.t || '').slice(0, 120),
            },
          },
          conn.peer,
        );
      } else if (
        conn.peer === room.hostPeer &&
        ['ph', 'pl', 'ow', 'bl', 'pr', 'un', 'fx', 'al', 'msg'].includes(topic)
      ) {
        broadcastRoom(
          room,
          {
            type: 'game_msg',
            topic,
            from: conn.peer,
            data: msg.data,
          },
          conn.peer,
        );
      }
    }
  });

  ws.on('close', () => {
    clients.delete(peer);
    leaveQueue(conn);
    void leaveCurrentRoom(conn, 'disconnect');
  });
});

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
