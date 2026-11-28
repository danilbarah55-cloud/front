import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ACH, SKINS, TASKPOOL, TECHS, UPG } from './constants.ts';

export interface ProfileData {
  coins: number;
  total: number;
  stats: Record<string, number>;
  ach: Record<string, number>;
  up: Record<string, number>;
  skins: Record<string, number>;
  skin: string;
  color: string;
  cstars: Record<string, number>;
  rating: number;
  tech: Record<string, number>;
  tutDone: number;
  tasks: { day: string; prog: Record<string, number>; claimed: Record<string, number>; bonus: number };
  set: {
    q: number; part: number; shadow: number; water: number; clouds: number;
    night: number; grid: number; snd: number; shake: number; fps: number;
    diff: number; auto: number; size: number;
  };
  _ts?: number;
}

export const DEFPF: ProfileData = {
  coins: 0,
  total: 0,
  stats: {},
  ach: {},
  up: {},
  skins: { solid: 1 },
  skin: 'solid',
  color: 'red',
  cstars: {},
  rating: 0,
  tech: {},
  tutDone: 0,
  tasks: { day: '', prog: {}, claimed: {}, bonus: 0 },
  set: {
    q: 1, part: 1, shadow: 1, water: 1, clouds: 1, night: 0,
    grid: 0, snd: 1, shake: 1, fps: 0, diff: 1, auto: 1, size: 0,
  },
};

export function mergeDef<T extends Record<string, any>>(d: T, o: any): T {
  const r: any = Array.isArray(d) ? [] : {};
  for (const k in d) {
    if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) {
      r[k] = mergeDef(d[k], o && typeof o[k] === 'object' ? o[k] : {});
    } else {
      r[k] = o && o[k] !== undefined ? o[k] : d[k];
    }
  }
  if (o && typeof o === 'object') {
    for (const k in o) {
      if (!(k in r)) r[k] = o[k];
    }
  }
  return r;
}

function normalizeSupabaseUrl(raw: string | undefined): string {
  const cleaned = String(raw || '').trim().replace(/^["']+|["']+$/g, '');
  if (!cleaned) return '';
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
const VITE_SB_URL = normalizeSupabaseUrl(env.VITE_SUPABASE_URL);
const VITE_SB_ANON = (env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']+|["']+$/g, '');

let directSupabase: SupabaseClient | null = null;
if (VITE_SB_URL && VITE_SB_ANON) {
  try {
    directSupabase = createClient(VITE_SB_URL, VITE_SB_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    directSupabase = null;
  }
}

export function getDirectSupabase(): SupabaseClient | null {
  return directSupabase;
}

export type StorageMode = 'server' | 'supabase-direct' | 'local';

export let PF: ProfileData = mergeDef(DEFPF, {});
export let ACC: { slug: string; name: string } | null = null;
export let authToken = '';
export let supabaseEnabled = Boolean(directSupabase);
export let supabaseMissingTable = false;
export let supabaseRlsBlocked = false;
export let backendAvailable: boolean | null = null;
export let storageMode: StorageMode = 'server';

let pfTimer: ReturnType<typeof setTimeout> | null = null;
let notifyFn: (m: string) => void = () => {};
let onAuthChangeFn: () => void = () => {};
let probePromise: Promise<boolean> | null = null;

const LS_ACCS = 'pixelfront.v7.accs';
const LS_PRE = 'pixelfront.v7.p.';
const LS_ACC = 'pixelfront.v7.acc';
const LS_TOK = 'pixelfront.v7.tok';

function storeSessionToken(token: string, remember: boolean): void {
  try {
    if (token && remember) {
      localStorage.setItem(LS_TOK, token);
      sessionStorage.removeItem(LS_TOK);
    } else if (token) {
      sessionStorage.setItem(LS_TOK, token);
      localStorage.removeItem(LS_TOK);
    } else {
      localStorage.removeItem(LS_TOK);
      sessionStorage.removeItem(LS_TOK);
    }
  } catch {
    // ignore storage errors
  }
}

function readSessionToken(): string {
  try {
    return sessionStorage.getItem(LS_TOK) || localStorage.getItem(LS_TOK) || '';
  } catch {
    return '';
  }
}

function isMissingTableErr(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === 'PGRST205' || err.code === '42P01') return true;
  const msg = String(err.message || '');
  return msg.includes('schema cache') || msg.includes('does not exist');
}

function isRlsErr(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === '42501') return true;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('row-level security') || msg.includes('permission denied');
}

function isStaticEnvironment(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return (
    Boolean(cap?.isNativePlatform?.()) ||
    location.protocol === 'file:' ||
    location.protocol === 'capacitor:' ||
    location.hostname.endsWith('.github.io') ||
    location.hostname === 'github.io'
  );
}

export function setPfNotify(fn: (m: string) => void) {
  notifyFn = fn;
}

export function setOnAuthChange(fn: () => void) {
  onAuthChangeFn = fn;
}

function slugOf(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]/gi, '')
    .slice(0, 16);
}

async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

async function pbkdf2Hash(password: string, salt: string, iterations = 100000): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
      key,
      256,
    );
    const hex = Array.from(new Uint8Array(bits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `pbkdf2$${iterations}$${hex}`;
  }
  return sha256Hex(`${salt}:${password}`);
}

async function verifyClientHash(password: string, salt: string, expected: string): Promise<boolean> {
  if (!expected) return false;
  if (expected.startsWith('pbkdf2$')) {
    const parts = expected.split('$');
    const iter = Number(parts[1]) || 100000;
    const actual = await pbkdf2Hash(password, salt, iter);
    return actual === expected;
  }
  if (/^[0-9a-f]{64}$/i.test(expected)) {
    const legacy = await sha256Hex(`${salt}:${password}`);
    return legacy === expected;
  }
  return false;
}

function randomSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(36).slice(2, 14);
}

export async function probeBackend(force = false): Promise<boolean> {
  if (!force && backendAvailable !== null) return backendAvailable;
  if (!force && probePromise) return probePromise;
  if (force) {
    backendAvailable = null;
    probePromise = null;
  }

  probePromise = (async () => {
    if (isStaticEnvironment()) {
      backendAvailable = false;
      storageMode = directSupabase ? 'supabase-direct' : 'local';
      supabaseEnabled = Boolean(directSupabase);
      return false;
    }

    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 2500) : null;
    try {
      const res = await fetch('/api/health', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: ctrl?.signal,
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const d = await res.json();
        supabaseMissingTable = Boolean(d?.missingTable);
        supabaseRlsBlocked = Boolean(d?.rlsBlocked);
        if (d && d.ok) {
          backendAvailable = true;
          storageMode = 'server';
          supabaseEnabled = Boolean(d.supabase) && !supabaseRlsBlocked;
          return true;
        }
      }
    } catch {
      // Static hosting or server offline
    } finally {
      if (timer) clearTimeout(timer);
    }

    backendAvailable = false;
    storageMode = directSupabase && !supabaseMissingTable && !supabaseRlsBlocked ? 'supabase-direct' : 'local';
    supabaseEnabled = Boolean(directSupabase && !supabaseMissingTable && !supabaseRlsBlocked);
    return false;
  })();

  return probePromise;
}

async function apiFetch(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const ctrl = typeof AbortController !== 'undefined' && !init.signal ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    return await fetch(url, {
      ...init,
      headers,
      credentials: 'same-origin',
      signal: init.signal || ctrl?.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function parseJsonSafe(res: Response): Promise<{ ok: boolean; data: any }> {
  try {
    const text = await res.text();
    if (!text) return { ok: false, data: null };
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: null };
  }
}

async function apiAuthRequest(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true; res: Response; data: any } | { ok: false }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const parsed = await parseJsonSafe(res);
      if (parsed.ok && (res.status < 500 || typeof parsed.data?.error === 'string')) {
        return { ok: true, res, data: parsed.data };
      }
    } catch {
      // transient network/timeout error
    }
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 350));
      const alive = await probeBackend(true);
      if (!alive) break;
    }
  }
  backendAvailable = false;
  storageMode = directSupabase && !supabaseMissingTable && !supabaseRlsBlocked ? 'supabase-direct' : 'local';
  supabaseEnabled = Boolean(directSupabase && !supabaseMissingTable && !supabaseRlsBlocked);
  return { ok: false };
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore quota errors
  }
}

function lsDel(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function savePF() {
  if (!ACC) return;
  PF._ts = Date.now();
  lsSet(LS_PRE + ACC.slug, PF);

  if (storageMode === 'server' && authToken) {
    void apiFetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile: PF }),
    }).catch(() => {});
    return;
  }

  if (storageMode === 'supabase-direct' && directSupabase && !supabaseMissingTable) {
    const coins = Math.max(0, Math.floor(PF.coins || 0));
    const rating = Math.max(0, Math.floor(PF.rating || 0));
    const wins = Math.max(0, Math.floor(PF.stats?.wins || 0));
    void directSupabase
      .from('players')
      .update({
        coins,
        rating,
        wins,
        profile: PF,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', ACC.slug)
      .then(() => {}, () => {});
  }
}

export function savePFSoon() {
  if (pfTimer) clearTimeout(pfTimer);
  pfTimer = setTimeout(savePF, 500);
}

export function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export function todayTasks() {
  const k = dayKey();
  if (PF.tasks.day !== k) {
    PF.tasks = { day: k, prog: {}, claimed: {}, bonus: 0 };
    savePFSoon();
  }
  let h = dayHash(k);
  const pool = TASKPOOL.slice();
  const out = [];
  for (let i = 0; i < 3; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
}

export function statGet(s: string): number {
  return PF.stats[s] || 0;
}

export function track(st: string, n = 1) {
  PF.stats[st] = (PF.stats[st] || 0) + n;
  todayTasks();
  PF.tasks.prog[st] = (PF.tasks.prog[st] || 0) + n;
  checkAch();
  savePFSoon();
}

export function trackMax(st: string, v: number) {
  if (v > (PF.stats[st] || 0)) {
    PF.stats[st] = v;
    checkAch();
    savePFSoon();
  }
}

export function addCoins(n: number, why?: string) {
  n = Math.round(n);
  if (n <= 0) return;
  PF.coins += n;
  PF.total += n;
  PF.stats.coinsTotal = PF.total;
  if (why) notifyFn(`+${n} монет: ${why}`);
  checkAch();
  savePFSoon();
}

export function checkAch() {
  for (const a of ACH) {
    if (!PF.ach[a.id] && statGet(a.st) >= a.goal) {
      PF.ach[a.id] = 1;
      PF.coins += a.r;
      PF.total += a.r;
      PF.stats.coinsTotal = PF.total;
      notifyFn(`Достижение: ${a.n} (+${a.r})`);
      savePFSoon();
    }
  }
}

export function taskDone(t: (typeof TASKPOOL)[number]): boolean {
  return (PF.tasks.prog[t.st] || 0) >= t.goal;
}

export function claimTask(t: (typeof TASKPOOL)[number]): boolean {
  todayTasks();
  if (PF.tasks.claimed[t.id] || !taskDone(t)) return false;
  PF.tasks.claimed[t.id] = 1;
  addCoins(t.r, 'задание');
  const ts = todayTasks();
  if (ts.every((x) => PF.tasks.claimed[x.id]) && !PF.tasks.bonus) {
    PF.tasks.bonus = 1;
    addCoins(60, 'все задания дня');
  }
  savePF();
  return true;
}

export function upLv(id: string): number {
  return PF.up[id] || 0;
}

export function upBuy(id: string): string {
  const u = UPG.find((x) => x.id === id);
  const l = upLv(id);
  if (!u || l >= u.max) return 'Максимум';
  const c = u.c[l];
  if (PF.coins < c) return 'Не хватает монет';
  PF.coins -= c;
  PF.up[id] = l + 1;
  savePF();
  return '';
}

export function skinBuy(id: string): string {
  const s = SKINS.find((x) => x.id === id);
  if (!s || PF.skins[id]) return 'Уже куплено';
  if (PF.coins < s.p) return 'Не хватает монет';
  PF.coins -= s.p;
  PF.skins[id] = 1;
  PF.skin = id;
  savePF();
  return '';
}

export function resetPF() {
  PF = mergeDef(DEFPF, {});
  savePF();
}

export function techLv(id: string): number {
  return PF.tech[id] ? 1 : 0;
}

export function techBuy(id: string): string {
  const t = TECHS.find((x) => x.id === id);
  if (!t || PF.tech[id]) return 'Уже изучено';
  if (t.req && !PF.tech[t.req]) {
    const reqName = TECHS.find((x) => x.id === t.req)?.n || '';
    return `Сначала изучите «${reqName}»`;
  }
  if (PF.coins < t.c) return 'Не хватает монет';
  PF.coins -= t.c;
  PF.tech[id] = 1;
  savePF();
  return '';
}

function syncLoadedProfile(raw: any): void {
  PF = mergeDef(DEFPF, raw || {});
  if (PF.set.q === undefined) PF.set.q = 1;
  const completedLevels = Object.values(PF.cstars).filter((s) => s > 0).length;
  if (completedLevels > (PF.stats.campDone || 0)) {
    PF.stats.campDone = completedLevels;
  }
}

export async function accRegister(name: string, password: string, remember: boolean): Promise<string> {
  const hasServer = await probeBackend();
  const cleanName = String(name || '').trim().slice(0, 16);
  const slug = slugOf(cleanName);
  if (cleanName.length < 2 || slug.length < 2) return 'Имя: от 2 символов, буквы и цифры';
  if (password.length < 4 || password.length > 128) return 'Пароль: от 4 символов';

  let serverFailed = false;
  if (hasServer) {
    const attempt = await apiAuthRequest('/api/auth/register', {
      name: cleanName,
      password,
      remember,
      initialProfile: mergeDef(DEFPF, {}),
    });
    if (attempt.ok) {
      const { res, data } = attempt;
      if (!res.ok) {
        if (data?.rlsBlocked) {
          supabaseRlsBlocked = true;
          supabaseEnabled = false;
        }
        return data?.error || 'Ошибка регистрации';
      }
      authToken = data.token || '';
      storeSessionToken(authToken, remember);
      ACC = data.user;
      syncLoadedProfile(data.profile);
      if (ACC) {
        lsSet(LS_PRE + ACC.slug, PF);
        if (remember) lsSet(LS_ACC, ACC);
        else lsDel(LS_ACC);
      }
      supabaseRlsBlocked = Boolean(data.rlsBlocked);
      supabaseMissingTable = Boolean(data.missingTable);
      supabaseEnabled = Boolean(data.supabase) && !supabaseRlsBlocked;
      if (supabaseMissingTable) {
        notifyFn('Аккаунт сохранён только на этом устройстве: создайте таблицу players в Supabase.');
      }
      onAuthChangeFn();
      return '';
    }
    serverFailed = true;
  }

  const salt = randomSalt();
  const hash = await pbkdf2Hash(password, salt);
  const initProf = mergeDef(DEFPF, {});

  if (directSupabase && !supabaseMissingTable) {
    try {
      const { data: existing, error: selErr } = await directSupabase
        .from('players')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
      if (selErr && isMissingTableErr(selErr)) {
        supabaseMissingTable = true;
        supabaseEnabled = false;
        storageMode = 'local';
      } else if (selErr && isRlsErr(selErr)) {
        supabaseRlsBlocked = true;
        supabaseEnabled = false;
        return 'В Supabase заблокирован доступ к таблице players (RLS). Выполните SQL из supabase_schema.sql в Supabase SQL Editor.';
      } else if (selErr) {
        return `Ошибка Supabase: ${selErr.message}`;
      } else {
        if (existing) return 'Такое имя уже занято. Войдите в аккаунт.';
        const { error } = await directSupabase.from('players').insert({
          slug,
          name: cleanName,
          salt,
          password_hash: hash,
          coins: 0,
          rating: 0,
          wins: 0,
          profile: initProf,
          updated_at: new Date().toISOString(),
        });
        if (!error) {
          supabaseRlsBlocked = false;
          supabaseEnabled = true;
          storageMode = 'supabase-direct';
          ACC = { slug, name: cleanName };
          syncLoadedProfile(initProf);
          lsSet(LS_PRE + slug, PF);
          if (remember) lsSet(LS_ACC, ACC);
          else lsDel(LS_ACC);
          onAuthChangeFn();
          return '';
        }
        if (isMissingTableErr(error)) {
          supabaseMissingTable = true;
          supabaseEnabled = false;
          storageMode = 'local';
        } else if (isRlsErr(error)) {
          supabaseRlsBlocked = true;
          supabaseEnabled = false;
          return 'В Supabase заблокирована запись (RLS). Выполните SQL из supabase_schema.sql в Supabase SQL Editor.';
        } else if (error.code === '23505') {
          return 'Такое имя уже занято. Войдите в аккаунт.';
        } else {
          return `Не удалось создать аккаунт в Supabase: ${error.message}`;
        }
      }
    } catch {
      return 'Ошибка подключения к Supabase';
    }
  }

  if (serverFailed && !supabaseMissingTable && !isStaticEnvironment()) {
    return 'Сервер недоступен — не удалось сохранить аккаунт в базу Supabase. Попробуйте ещё раз.';
  }

  const accs = lsGet<Record<string, { slug: string; name: string; salt: string; hash: string }>>(LS_ACCS, {});
  if (accs[slug]) return 'Такое имя уже занято. Войдите в аккаунт.';
  accs[slug] = { slug, name: cleanName, salt, hash };
  lsSet(LS_ACCS, accs);
  ACC = { slug, name: cleanName };
  syncLoadedProfile(initProf);
  lsSet(LS_PRE + slug, PF);
  if (remember) lsSet(LS_ACC, ACC);
  else lsDel(LS_ACC);
  if (supabaseMissingTable) {
    notifyFn('Аккаунт сохранён только на этом устройстве: создайте таблицу players в Supabase.');
  } else if (serverFailed) {
    notifyFn('Сервер не ответил — аккаунт создан локально на этом устройстве.');
  }
  onAuthChangeFn();
  return '';
}

export async function accLogin(name: string, password: string, remember: boolean): Promise<string> {
  const hasServer = await probeBackend();
  const cleanName = String(name || '').trim().slice(0, 16);
  const slug = slugOf(cleanName);
  if (slug.length < 2 || !password) return 'Введите имя и пароль';

  let serverFailed = false;
  if (hasServer) {
    const attempt = await apiAuthRequest('/api/auth/login', {
      name: cleanName,
      password,
      remember,
    });
    if (attempt.ok) {
      const { res, data } = attempt;
      if (!res.ok) return data?.error || 'Ошибка входа';
      authToken = data.token || '';
      storeSessionToken(authToken, remember);
      ACC = data.user;
      syncLoadedProfile(data.profile);
      if (ACC) {
        lsSet(LS_PRE + ACC.slug, PF);
        if (remember) lsSet(LS_ACC, ACC);
        else lsDel(LS_ACC);
      }
      supabaseMissingTable = Boolean(data.missingTable);
      supabaseEnabled = Boolean(data.supabase) && !supabaseRlsBlocked;
      onAuthChangeFn();
      return '';
    }
    serverFailed = true;
  }

  if (directSupabase && !supabaseMissingTable) {
    try {
      const { data, error } = await directSupabase
        .from('players')
        .select('slug, name, salt, password_hash, profile')
        .eq('slug', slug)
        .maybeSingle();
      if (error && isMissingTableErr(error)) {
        supabaseMissingTable = true;
        supabaseEnabled = false;
        storageMode = 'local';
      } else if (error && isRlsErr(error)) {
        supabaseRlsBlocked = true;
        supabaseEnabled = false;
        return 'В Supabase заблокирован доступ к таблице players (RLS). Выполните SQL из supabase_schema.sql в Supabase SQL Editor.';
      } else {
        if (error || !data) return 'Аккаунт не найден';
        const storedHash = String(data.password_hash || '');
        const ok = await verifyClientHash(password, String(data.salt || ''), storedHash);
        if (!ok) {
          if (/^[0-9a-f]{128}$/i.test(storedHash)) {
            return 'Аккаунт создан старым способом на веб-сервере. Войдите 1 раз через сайт для обновления или зарегистрируйте новый.';
          }
          return 'Неверный пароль';
        }
        if (!storedHash.startsWith('pbkdf2$')) {
          const upgraded = await pbkdf2Hash(password, String(data.salt || ''));
          void directSupabase
            .from('players')
            .update({ password_hash: upgraded, updated_at: new Date().toISOString() })
            .eq('slug', slug)
            .then(() => {}, () => {});
        }
        supabaseRlsBlocked = false;
        ACC = { slug: String(data.slug), name: String(data.name) };
        syncLoadedProfile(data.profile);
        lsSet(LS_PRE + slug, PF);
        if (remember) lsSet(LS_ACC, ACC);
        else lsDel(LS_ACC);
        onAuthChangeFn();
        return '';
      }
    } catch {
      return 'Ошибка подключения к Supabase';
    }
  }

  const accs = lsGet<Record<string, { slug: string; name: string; salt: string; hash: string }>>(LS_ACCS, {});
  const rec = accs[slug];
  if (!rec) {
    return serverFailed ? 'Сервер недоступен. Попробуйте ещё раз.' : 'Аккаунт не найден';
  }
  const ok = await verifyClientHash(password, rec.salt, rec.hash);
  if (!ok) return 'Неверный пароль';
  if (!rec.hash.startsWith('pbkdf2$')) {
    rec.hash = await pbkdf2Hash(password, rec.salt);
    lsSet(LS_ACCS, accs);
  }
  ACC = { slug: rec.slug, name: rec.name };
  syncLoadedProfile(lsGet(LS_PRE + slug, DEFPF));
  if (remember) lsSet(LS_ACC, ACC);
  else lsDel(LS_ACC);
  if (serverFailed) {
    notifyFn('Сервер не ответил — загружен локальный профиль.');
  }
  onAuthChangeFn();
  return '';
}

export async function accLogout(): Promise<void> {
  savePF();
  authToken = '';
  storeSessionToken('', false);
  ACC = null;
  PF = mergeDef(DEFPF, {});
  lsDel(LS_ACC);
  onAuthChangeFn();
  if (storageMode === 'server') {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }
}

export async function accAuto(): Promise<boolean> {
  authToken = readSessionToken();
  const hasServer = await probeBackend();
  if (hasServer) {
    try {
      const res = await apiFetch('/api/auth/me', { method: 'GET' });
      const parsed = await parseJsonSafe(res);
      if (res.ok && parsed.ok && parsed.data?.user) {
        const data = parsed.data;
        authToken = data.token || authToken;
        if (authToken) {
          const hadRemember = Boolean(localStorage.getItem(LS_TOK));
          storeSessionToken(authToken, hadRemember);
        }
        ACC = data.user;
        syncLoadedProfile(data.profile);
        if (ACC) lsSet(LS_PRE + ACC.slug, PF);
        supabaseMissingTable = Boolean(data.missingTable);
        supabaseEnabled = Boolean(data.supabase) && !supabaseRlsBlocked;
        onAuthChangeFn();
        return true;
      }
      if (res.status === 401 || res.status === 403) {
        storeSessionToken('', false);
        authToken = '';
      }
      return false;
    } catch {
      return false;
    }
  }

  const saved = lsGet<{ slug: string; name: string } | null>(LS_ACC, null);
  if (!saved?.slug) return false;

  if (directSupabase && !supabaseMissingTable) {
    try {
      const { data, error } = await directSupabase
        .from('players')
        .select('slug, name, profile')
        .eq('slug', saved.slug)
        .maybeSingle();
      if (error && isMissingTableErr(error)) {
        supabaseMissingTable = true;
        supabaseEnabled = false;
        storageMode = 'local';
      } else if (data) {
        ACC = { slug: String(data.slug), name: String(data.name) };
        syncLoadedProfile(data.profile);
        lsSet(LS_PRE + ACC.slug, PF);
        onAuthChangeFn();
        return true;
      }
    } catch {
      // fall through to local cache
    }
  }

  const accs = lsGet<Record<string, { slug: string; name: string }>>(LS_ACCS, {});
  if (!accs[saved.slug] && (!directSupabase || supabaseMissingTable)) return false;
  ACC = saved;
  syncLoadedProfile(lsGet(LS_PRE + saved.slug, DEFPF));
  onAuthChangeFn();
  return true;
}

export async function fetchLeaderboard(): Promise<{
  list: Array<{ name: string; rating: number; wins: number }>;
  supabase: boolean;
}> {
  const hasServer = await probeBackend();
  if (hasServer) {
    try {
      const res = await apiFetch('/api/leaderboard', { method: 'GET' });
      const parsed = await parseJsonSafe(res);
      if (!res.ok || !parsed.ok || !Array.isArray(parsed.data?.list)) {
        return { list: [], supabase: false };
      }
      return parsed.data;
    } catch {
      return { list: [], supabase: false };
    }
  }

  if (directSupabase) {
    try {
      const { data, error } = await directSupabase
        .from('players')
        .select('name, rating, wins')
        .order('rating', { ascending: false })
        .limit(15);
      if (!error && Array.isArray(data)) {
        return {
          list: data.map((r) => ({
            name: String(r.name),
            rating: Number(r.rating) || 0,
            wins: Number(r.wins) || 0,
          })),
          supabase: true,
        };
      }
    } catch {
      // fallback
    }
  }

  const accs = lsGet<Record<string, { slug: string; name: string }>>(LS_ACCS, {});
  const list = Object.values(accs)
    .map((a) => {
      const p = lsGet<Partial<ProfileData>>(LS_PRE + a.slug, {});
      return {
        name: a.name,
        rating: Number(p.rating) || 0,
        wins: Number(p.stats?.wins) || 0,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.wins - a.wins)
    .slice(0, 15);
  return { list, supabase: false };
}

export async function checkBackendHealth(): Promise<boolean> {
  return probeBackend();
}
