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

export let PF: ProfileData = mergeDef(DEFPF, {});
export let ACC: { slug: string; name: string } | null = null;
export let authToken = '';
export let supabaseEnabled = false;

let pfTimer: ReturnType<typeof setTimeout> | null = null;
let notifyFn: (m: string) => void = () => {};
let onAuthChangeFn: () => void = () => {};

export function setPfNotify(fn: (m: string) => void) {
  notifyFn = fn;
}

export function setOnAuthChange(fn: () => void) {
  onAuthChangeFn = fn;
}

async function apiFetch(url: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: 'same-origin',
  });
}

export function savePF() {
  if (!ACC || !authToken) return;
  PF._ts = Date.now();
  void apiFetch('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ profile: PF }),
  }).catch(() => {});
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

export async function accRegister(name: string, password: string, remember: boolean): Promise<string> {
  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        password,
        remember,
        initialProfile: mergeDef(DEFPF, {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || 'Ошибка регистрации';
    authToken = data.token || '';
    ACC = data.user;
    PF = mergeDef(DEFPF, data.profile || {});
    supabaseEnabled = Boolean(data.supabase);
    onAuthChangeFn();
    return '';
  } catch {
    return 'Сервер недоступен. Попробуйте ещё раз.';
  }
}

export async function accLogin(name: string, password: string, remember: boolean): Promise<string> {
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, password, remember }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || 'Ошибка входа';
    authToken = data.token || '';
    ACC = data.user;
    PF = mergeDef(DEFPF, data.profile || {});
    if (PF.set.q === undefined) PF.set.q = 1;
    // Sync campDone with actual stars in case older profile had mismatch
    const completedLevels = Object.values(PF.cstars).filter((s) => s > 0).length;
    if (completedLevels > (PF.stats.campDone || 0)) {
      PF.stats.campDone = completedLevels;
    }
    supabaseEnabled = Boolean(data.supabase);
    onAuthChangeFn();
    return '';
  } catch {
    return 'Сервер недоступен. Попробуйте ещё раз.';
  }
}

export async function accLogout(): Promise<void> {
  savePF();
  authToken = '';
  ACC = null;
  PF = mergeDef(DEFPF, {});
  onAuthChangeFn();
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
}

export async function accAuto(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/auth/me', { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    authToken = data.token || '';
    ACC = data.user;
    PF = mergeDef(DEFPF, data.profile || {});
    if (PF.set.q === undefined) PF.set.q = 1;
    supabaseEnabled = Boolean(data.supabase);
    onAuthChangeFn();
    return true;
  } catch {
    return false;
  }
}

export async function fetchLeaderboard(): Promise<{
  list: Array<{ name: string; rating: number; wins: number }>;
  supabase: boolean;
}> {
  try {
    const res = await apiFetch('/api/leaderboard', { method: 'GET' });
    if (!res.ok) return { list: [], supabase: false };
    return await res.json();
  } catch {
    return { list: [], supabase: false };
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return false;
    const d = await res.json();
    supabaseEnabled = Boolean(d.supabase);
    return true;
  } catch {
    return false;
  }
}
