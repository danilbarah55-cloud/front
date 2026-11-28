import { ALLPAL, BT, NR, NRD, NRK, SIZES, TRGB, UN } from './constants.ts';
import { PF, techLv, upLv } from './profile.ts';

export interface Building {
  t: string;
  o: number;
  x: number;
  y: number;
  hp: number;
  max: number;
  cap: boolean;
  cd: number;
  dead: boolean;
  born?: number;
  lt?: number;
  nk?: number;
}

export interface Wreck {
  x: number;
  y: number;
  a: number;
  ta: number;
  k: 'tank' | 'howitzer';
  o: number;
  t0: number;
}

export interface Rubble {
  x: number;
  y: number;
  t: string;
  cap: boolean;
  t0: number;
}

export interface NukeFx {
  x: number;
  y: number;
  t0: number;
}

export interface Projectile {
  k: 'm' | 'd' | 'n' | 's';
  o: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  t: number;
  dur: number;
  w: number;
  hp: number;
  dmg?: number;
  dead?: boolean;
}

export interface Unit {
  id: number;
  k: 'tank' | 'rpg' | 'plane' | 'howitzer';
  o: number;
  x: number;
  y: number;
  hp: number;
  max: number;
  cd: number;
  a: number;
  ta: number;
  dead: boolean;
  scan: number;
  cap: number;
  hold: boolean;
  wp: { x: number; y: number } | null;
  f: Int16Array | null;
  tx?: number;
  ty?: number;
  hx?: number;
  hy?: number;
  bombs?: number;
  bt?: number;
  ret?: boolean;
  tg?: { unit?: Unit; b?: Building } | null;
  alt?: number;
  fireAt?: number;
  ph?: number;
  mvS?: number;
  rta?: number;
  _lx?: number;
  _ly?: number;
  _rt?: number;
  age?: number;
  idle?: number;
  sx?: number;
  sy?: number;
  sa?: number;
  sta?: number;
}

export interface PlayerState {
  money: number;
  sol: number;
  alive: boolean;
  active: boolean;
  sup: number;
  dem: number;
  eff: number;
  aiT: number;
  cnt: Record<string, number>;
  ucnt: Record<string, number>;
  tiles: number;
  skill: number;
  inc: number;
  aggr: number;
  human: boolean;
  col: string;
  skin: string;
  nk?: number;
  nkT?: number;
}

export interface MissionState {
  id: number;
  idx: number;
  type: string;
  goal: number;
  title: string;
  allow: string[] | null;
  aiMode: string;
  calm: number;
  par: number;
  done?: boolean;
}

export const G = {
  W: 160,
  H: 104,
  N: 160 * 104,
  NN: 8,
  curSize: 0,
  TS: 5,
  TSp: 5,
  seed: 1,
  worldSeed: 0,
  tilesSeed: -1,
  WSEED: null as number | null,
  worldReady: false,

  T: new Uint8Array(160 * 104),
  OWN: new Uint8Array(160 * 104),
  BLD: new Int16Array(160 * 104),
  SHADE: new Float32Array(160 * 104),
  HGT: new Float32Array(160 * 104),
  DEP: new Float32Array(160 * 104),
  SC: [null] as Array<{ x: number; y: number } | null>,

  CS: [''] as string[],
  CR: [[0, 0, 0]] as number[][],
  NAMES: [''] as string[],

  B: [] as Building[],
  PR: [] as Projectile[],
  EF: [] as Array<{ x: number; y: number; r: number; c: string; life: number; max: number }>,
  PT: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number }>,
  BM: [] as Array<{ x1: number; y1: number; x2: number; y2: number; life: number; c: string }>,
  P: [null] as Array<PlayerState | null>,
  U: [] as Unit[],
  WK: [] as Wreck[],
  RB: [] as Rubble[],
  NK: [] as NukeFx[],
  uid: 1,

  COAST: [] as number[],
  phase: 'intro' as 'intro' | 'cap' | 'play' | 'end',
  capT: 5,
  gameT: 0,
  econT: 0,
  ownDirty: true,
  tilesDirty: true,
  landTotal: 1,
  shake: 0,
  tool: 'hand',
  hover: null as { x: number; y: number; ok: boolean } | null,
  camGoal: null as { cx: number; cy: number; z: number } | null,
  diff: 1,
  speed: 1,
  selB: null as Building | null,
  brush: null as string | null,
  ME: 1,
  MISSION: null as MissionState | null,
  GAMEMODE: 'battle',
  RS: { tankKills: 0, rpgKills: 0, annex: 0, sam: 0, built: 0, tanks: 0, assaults: 0, lost: 0, shared: false },
  alarmT: 0,
  alarmK: 'm' as 'm' | 'd' | 'n',
  paused: false,
  sndOn: true,

  cw: 300,
  ch: 300,
  dpr: 1,
  dprCap: 3,
  fitZ: 2,
  cam: { cx: 80, cy: 52, z: 3 },
  aim: { on: false, tx: 0, ty: 0, fx: 0, fy: 0, err: '', cost: 15, touch: false },

  AL: [] as Uint8Array[],
  REL: [] as Float32Array[],
  DCD: {} as Record<string, number>,
  OFFER: null as { from: number; t: number } | null,
  GRUDGE: {} as Record<string, number>,
  dipT: 3,
  dipOpen: 0,

  evT: 60,
};

export const miniT = document.createElement('canvas');
export const ownC = document.createElement('canvas');
export const seaC = document.createElement('canvas');
export const landC = document.createElement('canvas');
export const ownHi = document.createElement('canvas');
miniT.width = ownC.width = G.W;
miniT.height = ownC.height = G.H;

export function rng(): number {
  G.seed = (Math.imul(G.seed, 1664525) + 1013904223) >>> 0;
  return G.seed / 4294967296;
}

export function hash(x: number, y: number, s: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, s: number): number {
  let t = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    t += a * vnoise(x * f, y * f, s + i * 17);
    a *= 0.5;
    f *= 2;
  }
  return t;
}

export function fitTS(): void {
  G.TS = Math.max(2, Math.min(G.TSp, Math.floor(1800 / G.W)));
}

export function resizeCanvas(): void {
  const wrap = document.getElementById('wrap');
  const cvs = document.getElementById('cv') as HTMLCanvasElement | null;
  if (!wrap || !cvs) return;
  const r = wrap.getBoundingClientRect();
  G.dpr = Math.min(G.dprCap, window.devicePixelRatio || 1);
  G.cw = Math.max(100, r.width);
  G.ch = Math.max(100, r.height);
  cvs.width = Math.round(G.cw * G.dpr);
  cvs.height = Math.round(G.ch * G.dpr);
  G.fitZ = Math.max(1.5, Math.min(G.cw / G.W, G.ch / G.H));
  if (G.cam.z < G.fitZ) G.cam.z = G.fitZ;
}

export function allocWorld(sz: number): void {
  G.curSize = sz || 0;
  const s = SIZES[G.curSize] || SIZES[0];
  G.W = s.W;
  G.H = s.H;
  G.N = G.W * G.H;
  G.NN = s.c;
  G.T = new Uint8Array(G.N);
  G.OWN = new Uint8Array(G.N);
  G.BLD = new Int16Array(G.N);
  G.SHADE = new Float32Array(G.N);
  G.HGT = new Float32Array(G.N);
  G.DEP = new Float32Array(G.N);
  G.SC = [null];
  for (let k = 1; k <= G.NN; k++) G.SC.push({ x: 0, y: 0 });
  fitTS();
  if (G.worldReady) {
    miniT.width = ownC.width = G.W;
    miniT.height = ownC.height = G.H;
    G.cam.cx = G.W / 2;
    G.cam.cy = G.H / 2;
    resizeCanvas();
  }
}

export function nameOf(k: number): string {
  return k === G.ME ? 'Вы' : G.NAMES[k] || `Страна ${k}`;
}

export function applyPalette(customNames?: Record<number, string>): void {
  for (let k = 1; k <= G.NN; k++) {
    const p = G.P[k];
    if (!p) continue;
    const c = ALLPAL.find((x) => x.id === p.col) || ALLPAL[(k - 1) % ALLPAL.length];
    G.CS[k] = c.h;
    G.CR[k] = [1, 3, 5].map((i) => parseInt(c.h.substr(i, 2), 16));
    G.NAMES[k] = customNames?.[k] || c.c;
  }
}

export function bonusUp(o: number, id: string): number {
  return o === G.ME ? upLv(id) : 0;
}

export function tk(o: number, id: string): number {
  return o === G.ME ? techLv(id) : 0;
}

export function samR(o: number): number {
  return 12 + bonusUp(o, 'sam') + 2 * tk(o, 'air1') + 2 * tk(o, 'air4');
}

export function mr(o: number): number {
  return 65 + 12 * tk(o, 'air6');
}

export function planeCost(o: number): number {
  return Math.round(110 * (1 - 0.2 * tk(o, 'air2') - 0.1 * tk(o, 'eco6')));
}

export function ucost(o: number, k: 'tank' | 'rpg' | 'plane' | 'howitzer'): number {
  return Math.round(UN[k].c * (1 - 0.1 * tk(o, 'eco6')));
}

export function isAlly(a: number, b: number): boolean {
  return Boolean(a && b && a !== b && G.AL.length > a && G.AL[a]?.[b] === 1);
}

export function isFriend(a: number, b: number): boolean {
  return a === b || isAlly(a, b);
}

/* ---- Terrain & World Generation ---- */

export function genTiles(sd: number): void {
  G.seed = sd;
  const s1 = G.seed % 997;
  const { W, H, N, NN, T, HGT, SHADE, DEP, SC } = G;
  const FS = NN === 8 ? 26 : 26 * Math.sqrt(W / 160);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const dx = (x / W - 0.5) * 2;
      const dy = (y / H - 0.5) * 2;
      const n = fbm(x / FS, y / FS, s1) + 0.14 - Math.pow(Math.max(Math.abs(dx), Math.abs(dy)), 3) * 0.5;
      const f = fbm(x / 5, y / 5, s1 + 99);
      HGT[i] = n;
      T[i] = n < 0.36 ? 0 : n < 0.42 ? 1 : n < 0.46 ? 2 : n < 0.66 ? (f > 0.56 ? 4 : 3) : n < 0.76 ? 5 : 6;
      SHADE[i] = (hash(x, y, s1) - 0.5) * 0.14;
    }
  }
  const slots: Array<{ x: number; y: number }> = [];
  if (NN === 8) {
    const cxs = [0.12, 0.37, 0.63, 0.88];
    const cys = [0.27, 0.73];
    for (const yy of cys) {
      for (const xx of cxs) {
        slots.push({
          x: Math.round((xx + (rng() - 0.5) * 0.06) * W),
          y: Math.round((yy + (rng() - 0.5) * 0.1) * H),
        });
      }
    }
  } else {
    const cols = NN === 12 ? 4 : NN <= 16 ? 5 : Math.ceil(Math.sqrt((NN * W) / H));
    const rows = Math.ceil(NN / cols);
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        if (slots.length >= NN) break;
        const rowN = Math.min(cols, NN - r * cols);
        const xx = ((q + 0.5) / rowN) * 0.86 + 0.07 + (rng() - 0.5) * 0.04;
        const yy = ((r + 0.5) / rows) * 0.84 + 0.08 + (rng() - 0.5) * 0.05;
        slots.push({ x: Math.round(xx * W), y: Math.round(yy * H) });
      }
    }
  }
  for (let i = slots.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = slots[i];
    slots[i] = slots[j];
    slots[j] = tmp;
  }
  for (let k = 1; k <= NN; k++) {
    const c = slots[k - 1];
    SC[k] = { x: c.x, y: c.y };
    for (let y = c.y - 7; y <= c.y + 7; y++) {
      for (let x = c.x - 7; x <= c.x + 7; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x;
        if (Math.hypot(x - c.x, y - c.y) <= 5.6 && (T[i] < 2 || T[i] > 4)) {
          T[i] = 3;
          HGT[i] = Math.max(HGT[i], 0.5);
        }
      }
    }
  }
  G.landTotal = 0;
  for (let i = 0; i < N; i++) if (T[i] >= 2) G.landTotal++;
  if (G.landTotal < 1) G.landTotal = 1;

  const q = new Int32Array(N);
  let qh = 0;
  let qt = 0;
  DEP.fill(1);
  for (let i = 0; i < N; i++) {
    if (T[i] >= 2) {
      DEP[i] = 0;
      q[qt++] = i;
    }
  }
  const dist = new Int16Array(N).fill(-1);
  for (let i = 0; i < qt; i++) dist[q[i]] = 0;
  while (qh < qt) {
    const i = q[qh++];
    const x = i % W;
    const y = (i / W) | 0;
    const d = dist[i];
    if (d >= 10) continue;
    for (let k = 0; k < 4; k++) {
      const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0);
      const ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (dist[j] < 0) {
        dist[j] = d + 1;
        q[qt++] = j;
      }
    }
  }
  for (let i = 0; i < N; i++) {
    if (T[i] < 2) DEP[i] = dist[i] < 0 ? 1 : Math.min(1, dist[i] / 9);
  }
}

export function paintMini(): void {
  const { W, H, T, SHADE, DEP } = G;
  const c = miniT.getContext('2d')!;
  const im = c.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const r = TRGB[T[i]];
      let s = 1 + SHADE[i];
      if (T[i] < 2) s = 0.72 + (1 - DEP[i]) * 0.45;
      im.data[i * 4] = Math.min(255, r[0] * s);
      im.data[i * 4 + 1] = Math.min(255, r[1] * s);
      im.data[i * 4 + 2] = Math.min(255, r[2] * s);
      im.data[i * 4 + 3] = 255;
    }
  }
  c.putImageData(im, 0, 0);
}

const LAND = [
  [0, 0, 0],
  [0, 0, 0],
  [233, 212, 138],
  [96, 174, 74],
  [46, 124, 58],
  [124, 124, 132],
  [238, 242, 247],
];

function hAt(fx: number, fy: number): number {
  const { W, H, HGT } = G;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const xa = Math.max(0, Math.min(W - 1, x0));
  const xb = Math.max(0, Math.min(W - 1, x0 + 1));
  const ya = Math.max(0, Math.min(H - 1, y0));
  const yb = Math.max(0, Math.min(H - 1, y0 + 1));
  const a = HGT[ya * W + xa];
  const b = HGT[ya * W + xb];
  const c = HGT[yb * W + xa];
  const d = HGT[yb * W + xb];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

function dAt(fx: number, fy: number): number {
  const { W, H, DEP } = G;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const xa = Math.max(0, Math.min(W - 1, x0));
  const xb = Math.max(0, Math.min(W - 1, x0 + 1));
  const ya = Math.max(0, Math.min(H - 1, y0));
  const yb = Math.max(0, Math.min(H - 1, y0 + 1));
  const a = DEP[ya * W + xa];
  const b = DEP[ya * W + xb];
  const c = DEP[yb * W + xa];
  const d = DEP[yb * W + xb];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

function drawTree(c: CanvasRenderingContext2D, px: number, py: number, u: number, seedv: number): void {
  const k = Math.max(1, Math.round(u));
  c.fillStyle = 'rgba(0,0,0,.28)';
  c.fillRect(px - k, py + k * 2, k * 3, k);
  c.fillStyle = '#4a3320';
  c.fillRect(px, py + k * 2, k, k);
  c.fillStyle = '#1f5a2c';
  c.fillRect(px - k, py + k, k * 3, k);
  c.fillRect(px, py, k, k);
  c.fillStyle = '#2f8a40';
  c.fillRect(px - k, py + k, k, k);
  c.fillRect(px, py - (seedv > 0.5 ? k : 0), k, k);
}

function drawPeak(c: CanvasRenderingContext2D, px: number, py: number, u: number, snow: boolean): void {
  const k = Math.max(1, Math.round(u));
  for (let i = 0; i < 4; i++) {
    const w = (i + 1) * k;
    const x = px - Math.floor(w / 2);
    const y = py + i * k;
    c.fillStyle = snow && i < 2 ? '#ffffff' : '#8d8d97';
    c.fillRect(x, y, Math.ceil(w / 2), k);
    c.fillStyle = snow && i < 2 ? '#cfd8e6' : '#5d5d66';
    c.fillRect(x + Math.ceil(w / 2), y, Math.floor(w / 2) + k, k);
  }
}

export function paintTerrain(): void {
  const { TS: S, W, H, T, worldSeed } = G;
  const w = W * S;
  const h = H * S;
  seaC.width = landC.width = w;
  seaC.height = landC.height = h;
  const sc = seaC.getContext('2d')!;
  const lc = landC.getContext('2d')!;
  const si = sc.createImageData(w, h);
  const li = lc.createImageData(w, h);
  const sd = si.data;
  const ld = li.data;
  const s1 = worldSeed % 997;
  const deep = [11, 42, 92];
  const shal = [46, 150, 214];
  const vsh = [120, 214, 238];

  for (let py = 0; py < h; py++) {
    const fy = (py + 0.5) / S - 0.5;
    for (let px = 0; px < w; px++) {
      const fx = (px + 0.5) / S - 0.5;
      const o = (py * w + px) * 4;
      const wx = fx + (vnoise(fx * 2.1, fy * 2.1, s1 + 5) - 0.5) * 0.9;
      const wy = fy + (vnoise(fx * 2.1 + 50, fy * 2.1, s1 + 9) - 0.5) * 0.9;
      const xi = Math.max(0, Math.min(W - 1, Math.round(wx)));
      const yi = Math.max(0, Math.min(H - 1, Math.round(wy)));
      const tt = T[yi * W + xi];
      const micro = hash(px, py, 3) * 0.08 - 0.04;
      const d = dAt(fx, fy);
      let r: number;
      let g: number;
      let b: number;
      if (d < 0.35) {
        const t = d / 0.35;
        r = vsh[0] + (shal[0] - vsh[0]) * t;
        g = vsh[1] + (shal[1] - vsh[1]) * t;
        b = vsh[2] + (shal[2] - vsh[2]) * t;
      } else {
        const t = Math.min(1, (d - 0.35) / 0.65);
        r = shal[0] + (deep[0] - shal[0]) * t;
        g = shal[1] + (deep[1] - shal[1]) * t;
        b = shal[2] + (deep[2] - shal[2]) * t;
      }
      const wv = 1 + micro * 0.6;
      sd[o] = r * wv;
      sd[o + 1] = g * wv;
      sd[o + 2] = b * wv;
      sd[o + 3] = 255;

      if (tt >= 2) {
        const col = LAND[tt];
        const e = 0.32;
        const sh = Math.max(
          0.62,
          Math.min(1.42, 1 + (hAt(fx - e, fy - e) - hAt(fx + e, fy + e)) * (tt >= 5 ? 9 : 5.5)),
        );
        const det = 1 + micro + (vnoise(fx * 5, fy * 5, s1 + 31) - 0.5) * 0.1;
        const k = sh * det;
        ld[o] = Math.min(255, col[0] * k);
        ld[o + 1] = Math.min(255, col[1] * k);
        ld[o + 2] = Math.min(255, col[2] * k);
        ld[o + 3] = 255;
      }
    }
  }
  sc.putImageData(si, 0, 0);
  lc.putImageData(li, 0, 0);

  const u = S / 5;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = T[y * W + x];
      if (t === 4) {
        for (let k = 0; k < 3; k++) {
          const hx = hash(x, y, k * 7 + 1);
          const hy = hash(x, y, k * 7 + 2);
          if (hash(x, y, k * 7 + 3) < 0.85) {
            drawTree(lc, Math.round((x + hx * 0.8) * S), Math.round((y + hy * 0.6) * S), u, hash(x, y, k));
          }
        }
      } else if (t === 3 && hash(x, y, 41) < 0.05) {
        drawTree(lc, Math.round((x + 0.5) * S), Math.round((y + 0.4) * S), u * 0.8, 0.2);
      } else if (t === 5 && hash(x, y, 43) < 0.5) {
        drawPeak(lc, Math.round((x + hash(x, y, 44) * 0.6 + 0.2) * S), Math.round((y + 0.1) * S), u * 1.1, false);
      } else if (t === 6 && hash(x, y, 45) < 0.55) {
        drawPeak(lc, Math.round((x + hash(x, y, 46) * 0.6 + 0.2) * S), Math.round((y + 0.1) * S), u * 1.2, true);
      }
    }
  }

  G.COAST = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (
        T[y * W + x] < 2 &&
        (T[y * W + x - 1] >= 2 || T[y * W + x + 1] >= 2 || T[(y - 1) * W + x] >= 2 || T[(y + 1) * W + x] >= 2)
      ) {
        G.COAST.push(x, y);
      }
    }
  }
  G.ownDirty = true;
  G.tilesDirty = true;
}

export function crater(x: number, y: number, r: number): void {
  const lc = landC.getContext('2d')!;
  const S = G.TS;
  lc.save();
  lc.globalCompositeOperation = 'source-atop';
  const g = lc.createRadialGradient(x * S, y * S, 0, x * S, y * S, r * S);
  g.addColorStop(0, 'rgba(15,8,4,.75)');
  g.addColorStop(0.6, 'rgba(25,14,8,.45)');
  g.addColorStop(1, 'rgba(25,14,8,0)');
  lc.fillStyle = g;
  lc.beginPath();
  lc.arc(x * S, y * S, r * S, 0, Math.PI * 2);
  lc.fill();
  lc.restore();
}

export function scorch(x: number, y: number, r: number): void {
  const lc = landC.getContext('2d')!;
  const S = G.TS;
  lc.save();
  lc.globalCompositeOperation = 'source-atop';
  const g = lc.createRadialGradient(x * S, y * S, 0, x * S, y * S, r * S);
  g.addColorStop(0, 'rgba(10,6,4,.92)');
  g.addColorStop(0.5, 'rgba(24,14,8,.78)');
  g.addColorStop(0.85, 'rgba(40,24,12,.45)');
  g.addColorStop(1, 'rgba(40,24,12,0)');
  lc.fillStyle = g;
  lc.beginPath();
  lc.arc(x * S, y * S, r * S, 0, Math.PI * 2);
  lc.fill();
  for (let i = 0; i < 26; i++) {
    const a = rng() * 6.283;
    const d = r * (0.5 + rng() * 0.55);
    const rr = r * (0.08 + rng() * 0.14);
    lc.fillStyle = `rgba(20,12,6,${0.25 + rng() * 0.3})`;
    lc.beginPath();
    lc.arc((x + Math.cos(a) * d) * S, (y + Math.sin(a) * d) * S, rr * S, 0, Math.PI * 2);
    lc.fill();
  }
  lc.restore();
}

export function s2w(px: number, py: number) {
  return {
    x: (px - G.cw / 2) / G.cam.z + G.cam.cx,
    y: (py - G.ch / 2) / G.cam.z + G.cam.cy,
  };
}

export function clampCam(): void {
  G.cam.z = Math.max(G.fitZ, Math.min(48, G.cam.z));
  G.cam.cx = Math.max(0, Math.min(G.W, G.cam.cx));
  G.cam.cy = Math.max(0, Math.min(G.H, G.cam.cy));
}

export function zoomAt(px: number, py: number, f: number): void {
  const w = s2w(px, py);
  G.cam.z *= f;
  clampCam();
  G.cam.cx = w.x - (px - G.cw / 2) / G.cam.z;
  G.cam.cy = w.y - (py - G.ch / 2) / G.cam.z;
  clampCam();
  G.camGoal = null;
}

export function inView(x: number, y: number): boolean {
  return Math.abs(x - G.cam.cx) < G.cw / G.cam.z / 2 + 2 && Math.abs(y - G.cam.cy) < G.ch / G.cam.z / 2 + 2;
}

let AC: AudioContext | null = null;
export function snd(f: number, d: number, type?: OscillatorType, v?: number, sl?: number): void {
  if (!G.sndOn) return;
  try {
    if (!AC) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      AC = new AudioCtx();
    }
    if (AC.state === 'suspended') void AC.resume();
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, AC.currentTime);
    if (sl) o.frequency.exponentialRampToValueAtTime(Math.max(20, sl), AC.currentTime + d);
    g.gain.setValueAtTime(v || 0.05, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(g);
    g.connect(AC.destination);
    o.start();
    o.stop(AC.currentTime + d);
  } catch {
    // ignore audio block
  }
}

const mixc = (a: number[], b: number[], t: number) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

function hsl2rgb(h: number, s: number, l: number): number[] {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

export function skinRGB(sk: string, base: number[], x: number, y: number): number[] {
  switch (sk) {
    case 'stripes':
      return (x + y) % 5 < 2 ? mixc(base, [255, 255, 255], 0.62) : base;
    case 'checker':
      return ((x >> 1) + (y >> 1)) & 1 ? mixc(base, [0, 0, 0], 0.5) : base;
    case 'dots':
      return x % 3 === 1 && y % 3 === 1 ? mixc(base, [255, 255, 255], 0.8) : mixc(base, [0, 0, 0], 0.12);
    case 'rainbow':
      return hsl2rgb(((x * 7 + y * 4) % 360) / 360, 0.85, 0.58);
    case 'sunset': {
      const t = Math.abs(((y * 3 + x) % 48) / 24 - 1);
      return mixc([255, 176, 46], [214, 48, 150], t);
    }
    case 'argyle': {
      const q = (x + y) % 6 < 1 || (x - y + 60) % 6 < 1;
      return q ? mixc(base, [255, 255, 255], 0.75) : ((x + y) >> 2) & 1 ? mixc(base, [0, 0, 0], 0.18) : base;
    }
    case 'waves': {
      const t = Math.sin(x * 0.5 + Math.sin(y * 0.45) * 2) * 0.5 + 0.5;
      return mixc(mixc(base, [255, 255, 255], 0.55), mixc(base, [0, 0, 0], 0.35), t);
    }
    case 'ember': {
      const n = hash(x >> 1, y >> 1, 17) * 0.7 + hash(x, y, 5) * 0.3;
      return n < 0.3 ? [255, 214, 90] : n < 0.62 ? [255, 120, 30] : [150, 30, 10];
    }
    case 'gold': {
      const t = (Math.sin((x + y) * 0.55) + 1) / 2;
      return mixc([255, 226, 120], [188, 130, 20], t);
    }
    case 'neon': {
      const g = x % 4 === 0 || y % 4 === 0;
      return g ? [80, 255, 220] : mixc(base, [10, 10, 30], 0.55);
    }
    case 'camo': {
      const n = hash(x >> 1, y >> 1, 9);
      return n < 0.34 ? [84, 104, 56] : n < 0.68 ? [128, 96, 56] : [40, 50, 36];
    }
    default:
      return base;
  }
}

export const rgbs = (c: number[]) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

let ownHiT = 0;
let ownTmp: HTMLCanvasElement | null = null;

function buildOwn(): void {
  const { W, H, OWN, CR } = G;
  const c = ownC.getContext('2d')!;
  const im = c.createImageData(W, H);
  const d = im.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = OWN[i];
      if (!o || !CR[o]) continue;
      const edge =
        x === 0 || OWN[i - 1] !== o || x === W - 1 || OWN[i + 1] !== o || y === 0 || OWN[i - W] !== o || y === H - 1 || OWN[i + W] !== o;
      const r = CR[o];
      d[i * 4] = r[0];
      d[i * 4 + 1] = r[1];
      d[i * 4 + 2] = r[2];
      d[i * 4 + 3] = edge ? 235 : 110;
    }
  }
  c.putImageData(im, 0, 0);
}

export function buildOwnHi(): void {
  const { TS: S, W, H, OWN, P, CR, CS } = G;
  const w = W * S;
  const h = H * S;
  if (ownHi.width !== w || ownHi.height !== h) {
    ownHi.width = w;
    ownHi.height = h;
  }
  if (!ownTmp || ownTmp.width !== W || ownTmp.height !== H) {
    ownTmp = document.createElement('canvas');
    ownTmp.width = W;
    ownTmp.height = H;
  }
  const tc = ownTmp.getContext('2d')!;
  const im = tc.createImageData(W, H);
  const d = im.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = OWN[i];
      if (!o || !CR[o]) continue;
      const p = P[o];
      const sk = p ? p.skin : 'solid';
      const c = skinRGB(sk, CR[o], x, y);
      d[i * 4] = c[0];
      d[i * 4 + 1] = c[1];
      d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = sk === 'solid' ? 87 : 117;
    }
  }
  tc.putImageData(im, 0, 0);
  const c = ownHi.getContext('2d')!;
  c.clearRect(0, 0, w, h);
  c.imageSmoothingEnabled = false;
  c.drawImage(ownTmp, 0, 0, w, h);

  const bw = Math.max(2, Math.round(S * 0.45));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = OWN[i];
      if (!o || !CS[o]) continue;
      const l = x === 0 || OWN[i - 1] !== o;
      const r = x === W - 1 || OWN[i + 1] !== o;
      const t = y === 0 || OWN[i - W] !== o;
      const bt = y === H - 1 || OWN[i + W] !== o;
      if (!(l || r || t || bt)) continue;
      c.fillStyle = CS[o];
      if (l) c.fillRect(x * S, y * S, bw, S);
      if (r) c.fillRect((x + 1) * S - bw, y * S, bw, S);
      if (t) c.fillRect(x * S, y * S, S, bw);
      if (bt) c.fillRect(x * S, (y + 1) * S - bw, S, bw);
    }
  }
  buildOwn();
  G.ownDirty = false;
}

/* ---- Sprites & Renderer ---- */

let gc: CanvasRenderingContext2D;
let R_ox = 0;
let R_oy = 0;
let R_u = 1;
let R_px = 0;
let R_py = 0;
let RT = 0;
let NIGHTK = 0;
let LOD = 2;

function R(x: number, y: number, w: number, h: number, c: string): void {
  gc.fillStyle = c;
  gc.fillRect(R_px + x * R_u, R_py + y * R_u, w * R_u, h * R_u);
}

function RP(x: number, y: number, r: number): void {
  gc.beginPath();
  gc.arc(R_px + x * R_u, R_py + y * R_u, Math.max(0.5, r * R_u), 0, Math.PI * 2);
  gc.fill();
}

function glowAdd(x: number, y: number, r: number, rgb: string, a: number): void {
  if (LOD < 2) return;
  const cx = R_px + x * R_u;
  const cy = R_py + y * R_u;
  const rr = Math.max(1, r * R_u);
  const g = gc.createRadialGradient(cx, cy, 0, cx, cy, rr);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  gc.globalCompositeOperation = 'lighter';
  gc.fillStyle = g;
  gc.beginPath();
  gc.arc(cx, cy, rr, 0, Math.PI * 2);
  gc.fill();
  gc.globalCompositeOperation = 'source-over';
}

function smokeUp(
  x: number,
  y: number,
  t: number,
  per: number,
  n: number,
  rise: number,
  r0: number,
  r1: number,
  col: string,
  a0: number,
  ph0: number,
): void {
  const nn = LOD >= 2 ? n : LOD === 1 ? Math.max(1, n >> 1) : 1;
  for (let k = 0; k < nn; k++) {
    const ph = (t / per + k / nn + ph0) % 1;
    gc.globalAlpha = a0 * (1 - ph) * Math.min(1, ph * 5);
    gc.fillStyle = col;
    RP(x + Math.sin(ph * 4 + k * 1.7) * 0.45 * ph, y - ph * rise, r0 + (r1 - r0) * ph);
  }
  gc.globalAlpha = 1;
}

function drawFlag(x: number, y: number, o: string, t: number, big: boolean): void {
  const hgt = big ? 4.6 : 3.6;
  const fw = big ? 3.4 : 2.4;
  const fh = big ? 1.9 : 1.3;
  const n = LOD >= 1 ? 9 : 4;
  R(x, y, 0.5, hgt, '#2a2a2a');
  R(x - 0.12, y - 0.3, 0.74, 0.34, '#d4af37');
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const ph = t / 170 - i * (9 / n) * 0.8;
    const wv = Math.sin(ph) * 0.42 * (0.2 + k * 0.8) * (big ? 1 : 0.8);
    const sx = x + 0.5 + i * (fw / n);
    const sy = y + 0.15 + wv;
    const w = fw / n + 0.06;
    R(sx, sy, w, fh * 0.55, o);
    R(sx, sy + fh * 0.55, w, fh * 0.45, '#f4f4f4');
    if (LOD >= 1) R(sx, sy, w, fh, `rgba(0,0,0,${0.1 * (1 - Math.cos(ph))})`);
  }
}

function drawDamage(b: Building, t: number): void {
  const f = b.hp / b.max;
  if (f > 0.55) return;
  const sev = f < 0.25 ? 2 : 1;
  const ph = ((b.x * 5 + b.y * 3) % 11) / 11;
  smokeUp(3.5, 4.6, t, 2200, sev === 2 ? 5 : 3, 6, 0.5, 1.8, sev === 2 ? '#232323' : '#4a4a4a', 0.65, ph);
  if (LOD >= 1) smokeUp(7, 3.6, t, 2600, sev === 2 ? 4 : 2, 7, 0.5, 2, '#303030', 0.55, ph * 0.7);
  const nf = LOD >= 1 ? (sev === 2 ? 4 : 2) : 1;
  for (let i = 0; i < nf; i++) {
    const fx = 1.5 + ((i * 2.7 + ph * 9) % 7);
    const fy = 4.8 + hash(b.x + i, b.y, 9) * 2.4;
    const fl = (t / 90 + i * 3.1) | 0;
    const hg = 0.9 + 0.9 * hash(fl, i, b.x) + (sev === 2 ? 0.6 : 0);
    R(fx, fy - hg, 0.9, hg, '#ff7a1a');
    R(fx + 0.2, fy - hg * 0.7, 0.5, hg * 0.7, '#ffd23f');
  }
}

const CARC = ['#d94f4f', '#4f7fd9', '#e8c547', '#f0f0f0', '#59b36a'];
function carDraw(x: number, y: number, col: string, dir: number, night: boolean): void {
  R(x, y, 1, 0.4, col);
  R(x + 0.25, y - 0.14, 0.5, 0.2, '#dfe6f2');
  R(x + 0.12, y + 0.34, 0.24, 0.14, '#111');
  R(x + 0.64, y + 0.34, 0.24, 0.14, '#111');
  if (night) {
    R(dir > 0 ? x + 0.95 : x - 0.05, y + 0.08, 0.1, 0.2, '#fff7c0');
    glowAdd(dir > 0 ? x + 1.4 : x - 0.4, y + 0.2, 0.9, '255,240,170', 0.3);
  }
}

function drawCity(b: Building, t: number, o: string, ph: number): void {
  const night = NIGHTK > 0.3;
  const pf = ph / 97;
  R(0, 8, 10, 1.6, '#8d917f');
  R(0, 8.55, 10, 1.05, '#4a4d57');
  R(0, 8.55, 10, 0.12, '#6a6e7a');
  for (let i = 0; i < 6; i++) R(0.35 + i * 1.7, 9.05, 0.8, 0.13, '#d9d4b0');
  R(0.8, 4.6, 3.2, 4, '#e8e2d0');
  R(0.8, 4, 3.2, 1, o);
  R(0.8, 4, 3.2, 0.35, 'rgba(255,255,255,.5)');
  R(0.8, 8.1, 3.2, 0.4, 'rgba(0,0,0,.12)');
  R(4.8, 2.4, 3.6, 6.2, '#c6cad6');
  R(4.8, 1.8, 3.6, 1, o);
  R(8.4, 2.4, 0.6, 6.2, '#9ea3b4');
  R(4.8, 2.4, 0.35, 6.2, 'rgba(255,255,255,.18)');
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const hh = hash(b.x * 3 + i, b.y * 5 + j, 11);
      let c: string;
      if (night) {
        c =
          hh < 0.78
            ? LOD >= 1 && hash(b.x + i, b.y + j, (t / 2300) | 0) < 0.06
              ? '#9fd0ff'
              : '#ffd978'
            : '#262c48';
      } else {
        c =
          hh < 0.1
            ? '#ffe27a'
            : LOD >= 1 && ((t / 1800 + hh * 9) % 3) < 0.12
              ? '#a9b8d8'
              : '#7f8fb8';
      }
      R(5.3 + j * 1.6, 3.3 + i * 1.7, 0.9, 0.9, c);
    }
  }
  R(1.4, 5.6, 0.8, 0.8, night ? (hash(b.x, b.y, 3) < 0.8 ? '#ffd978' : '#262c48') : '#ffe27a');
  R(2.6, 5.6, 0.8, 0.8, night ? (hash(b.x, b.y, 4) < 0.7 ? '#ffd978' : '#262c48') : '#8aa2c8');
  R(1.9, 7.2, 1, 1.4, '#6b5a3a');
  R(3.3, 3, 0.45, 1.2, '#8a6a5a');
  smokeUp(3.52, 3, t, 2800, 3, 3.4, 0.3, 1, '#d2d2da', 0.5, pf);
  R(2.5, 2.6, 0.35, 1.5, '#e0a800');
  R(2.35, 4, 0.65, 0.2, '#8a6a00');
  if (LOD >= 1) {
    const cs = Math.cos(t / 2300 + pf * 6);
    const mx = 2.68;
    const bx0 = mx - 1.0 * cs;
    const bx1 = mx + 1.9 * cs;
    const hb = 0.5 + 0.4 * Math.sin(t / 900 + pf * 4);
    R(Math.min(bx0, bx1), 2.5, Math.abs(bx1 - bx0) + 0.05, 0.2, '#e0a800');
    R(bx0 - 0.15, 2.4, 0.3, 0.4, '#d9d9d9');
    R(bx1 - 0.04, 2.7, 0.08, hb, '#555');
    R(bx1 - 0.14, 2.7 + hb, 0.28, 0.22, '#d88a2a');
  } else {
    R(1.8, 2.5, 2, 0.2, '#e0a800');
  }
  R(9, 5, 0.4, 3.6, '#555');
  const bl = (t + ph * 37) % 1500 < 200;
  R(8.7, 4.6, 1, 0.5, bl ? '#ff3030' : '#5a1212');
  if (bl) glowAdd(9.2, 4.85, 1.5, '255,60,60', 0.4);
  if (LOD >= 1) {
    const x1 = ((t / 2800 + pf) % 1) * 9;
    const x2 = 9 - ((t / 3600 + pf * 1.7) % 1) * 9;
    carDraw(x1, 8.6, CARC[(b.x + b.y) % 5], 1, night);
    carDraw(x2, 9.07, CARC[(b.x * 2 + b.y + 3) % 5], -1, night);
  }
  if (b.cap) drawFlag(5.8, -2.6, o, t, true);
  if (night) glowAdd(5, 6, 5.8, '255,196,100', 0.1 * NIGHTK);
}

function drawSilo(b: Building, t: number, o: string, ph: number): void {
  const age = b.lt ? t - b.lt : 1e9;
  const nk = Boolean(b.nk);
  const lim = nk ? 2000 : 1100;
  R(0, 7, 10, 2.6, '#4a4f5c');
  R(0.4, 7, 9.2, 0.5, '#6a7080');
  for (let i = 0; i < 8; i++) R(0.4 + i * 1.15, 9.12, 0.62, 0.42, i % 2 ? '#1c1c1c' : '#f6c744');
  R(2.4, 5.2, 5.2, 2.2, '#2c303a');
  R(2.4, 5.2, 5.2, 0.3, '#4a5060');
  R(3.2, 5.9, 1.6, 1, '#f6c744');
  R(5.2, 5.9, 1.6, 1, '#f6c744');
  let od = 0;
  if (age < lim + 500) od = age < 300 ? age / 300 : age < lim ? 1 : 1 - (age - lim) / 500;
  const sh = od * 1.25;
  if (sh > 0) R(5 - sh, 5.45, 2 * sh, 0.35, '#05060a');
  let dy = 0;
  if (age < 1e9) {
    const rs = nk ? 2600 : 1500;
    dy = age < rs ? 8 : Math.max(0, 8 * (1 - (age - rs) / 2800));
  }
  if (dy < 7.6) {
    if (dy > 0) {
      gc.save();
      gc.beginPath();
      gc.rect(R_px + 2 * R_u, R_py - 5 * R_u, 6 * R_u, 10.45 * R_u);
      gc.clip();
    }
    R(4.1, -0.9 + dy, 1.8, 6.3, '#efefef');
    R(4.1, -0.9 + dy, 1.8, 1.8, o);
    R(4.1, 1 + dy, 1.8, 0.5, '#333');
    R(3.4, 4.2 + dy, 0.8, 1.4, '#c9c9c9');
    R(5.8, 4.2 + dy, 0.8, 1.4, '#c9c9c9');
    if (dy > 0) gc.restore();
  }
  R(3 - sh, 5.45, 2, 0.35, '#3b4150');
  R(5 + sh, 5.45, 2, 0.35, '#3b4150');
  if (age < 1100) {
    const p = age / 1100;
    const h = (nk ? 9 : 7) * (1 - p * 0.6) * (0.85 + 0.3 * Math.abs(Math.sin(t / 37)));
    const w = (nk ? 2.4 : 1.6) * (1 - p * 0.5);
    R(5 - w / 2, 5.45 - h, w, h, '#ff6a1a');
    R(5 - w * 0.32, 5.45 - h * 0.75, w * 0.64, h * 0.75, '#ffd23f');
    R(5 - w * 0.15, 5.45 - h * 0.5, w * 0.3, h * 0.5, '#fff6d0');
    glowAdd(5, 5.2, nk ? 5.5 : 4.2, '255,150,60', 0.5 * (1 - p));
  }
  if (age < 3300) {
    const dur = nk ? 2700 : 1900;
    const nn = LOD >= 1 ? 8 : 4;
    for (let k = 0; k < nn; k++) {
      const q = (age - 80 - k * 170 * (8 / nn)) / dur;
      if (q <= 0 || q >= 1) continue;
      gc.globalAlpha = 0.6 * (1 - q);
      gc.fillStyle = q < 0.3 ? '#e9e4dc' : '#a9a9b2';
      RP(5 + Math.sin(k * 2.3) * 1.2 * q + (k % 2 ? 1 : -1) * q * 1.4, 5.2 - q * (nk ? 9 : 7), (nk ? 1 : 0.8) + q * (nk ? 3 : 2.4));
    }
    gc.globalAlpha = 1;
  }
  const alarm = nk && age < 2400;
  const bk = ((t / (alarm ? 110 : 520) + ph) | 0) % 2;
  const lc = alarm ? '#ff3030' : '#ffb02e';
  R(2.55, 5.05, 0.5, 0.3, bk ? lc : '#3a2a10');
  R(6.95, 5.05, 0.5, 0.3, bk ? '#3a2a10' : lc);
  if (alarm && bk) glowAdd(5, 5, 6, '255,40,30', 0.16);
  if (LOD >= 1) {
    const vp = ((t + ph * 93) % 4600) / 4600;
    if (vp < 0.4) {
      gc.globalAlpha = 0.55 * (1 - vp / 0.4);
      gc.fillStyle = '#f2f4f8';
      RP(2.9 + vp * 1.2, 5.1 - vp * 6, 0.4 + vp * 2.2);
      RP(7.1 - vp * 1.2, 5.1 - vp * 6, 0.4 + vp * 2.2);
      gc.globalAlpha = 1;
    }
  }
}

function drawAirfield(b: Building, t: number, o: string, ph: number): void {
  const age = b.lt ? t - b.lt : 1e9;
  const night = NIGHTK > 0.25;
  R(0, 6, 10, 3.6, '#53575f');
  R(0, 6, 10, 0.25, '#6b707a');
  R(0, 9.35, 10, 0.25, '#3f434a');
  for (let i = 0; i < 5; i++) R(0.5 + i * 2, 7.62, 1.1, 0.32, '#f2f2f2');
  for (let i = 0; i < 4; i++) {
    R(0.1, 6.7 + i * 0.55, 0.22, 0.28, '#e8e8e8');
    R(9.68, 6.7 + i * 0.55, 0.22, 0.28, '#e8e8e8');
  }
  const nl = LOD >= 1 ? 9 : 3;
  for (let i = 0; i < nl; i++) {
    const kx = 0.3 + i * (10.3 / nl);
    const on = (((t / 110) | 0) + i) % nl === 0;
    const c = on ? '#fff6b0' : '#8a8570';
    R(kx, 6.1, 0.3, 0.22, c);
    R(kx, 9, 0.3, 0.22, c);
    if (on && night) {
      glowAdd(kx + 0.15, 6.2, 0.9, '255,240,160', 0.4);
      glowAdd(kx + 0.15, 9.1, 0.9, '255,240,160', 0.4);
    }
  }
  R(0.4, 2.6, 2.4, 3.4, '#9aa2ae');
  R(0.4, 2.2, 2.4, 0.8, o);
  const wc = night ? '#ffd978' : '#ffe27a';
  R(0.8, 3.4, 0.6, 0.6, wc);
  R(1.8, 3.4, 0.6, 0.6, wc);
  R(0.8, 4.5, 0.6, 0.6, night ? '#ffd978' : '#8aa2c8');
  R(1.8, 4.5, 0.6, 0.6, night ? '#ffd978' : '#8aa2c8');
  R(1.5, 1.3, 0.25, 1, '#444');
  const cs = Math.cos(t / 650 + ph);
  const bw = Math.max(0.25, 1.0 * Math.abs(cs));
  R(1.62 - bw, 1.1, 2 * bw, 0.22, '#d4d8e2');
  R(1.62 + bw * Math.sign(cs || 1) - 0.12, 1, 0.24, 0.42, '#e04646');
  const g = (t + ph * 50) % 1800 < 260;
  R(0.5, 1.9, 0.4, 0.4, g ? '#46ff7a' : '#1b3a24');
  if (g) glowAdd(0.7, 2.1, 1.2, '80,255,130', 0.4);
  R(9.5, 3.2, 0.22, 3, '#d9d9d9');
  const ns = LOD >= 1 ? 4 : 2;
  for (let i = 0; i < ns; i++) {
    const sx = 9.5 - (i + 1) * ((0.48 * 4) / ns);
    const sy = 3.2 + Math.sin(t / 260 - i * 0.9) * 0.2 * (i + 1) * 0.5;
    R(sx, sy, (0.5 * 4) / ns, 0.45 - i * 0.07 * (4 / ns), i % 2 ? '#ffffff' : '#ff6a1a');
  }
  let show = 1;
  let ga = 1;
  if (age < 1e9) {
    if (age < 2400) show = 0;
    else if (age < 3400) ga = (age - 2400) / 1000;
  }
  if (show) {
    if (ga < 1) gc.globalAlpha = ga;
    R(5.4, 4.9, 3.6, 0.9, '#eceff4');
    R(6.6, 3.7, 0.9, 2.9, '#d6dae2');
    R(8.3, 4.3, 0.7, 0.8, o);
    R(5.4, 5.2, 0.9, 0.3, '#444');
    R(5.4, 4.9, 0.25, 0.9, '#c9ced9');
    if ((t + ph * 31) % 1300 < 120) R(6.9, 3.6, 0.35, 0.35, '#ff3030');
    if (ga < 1) gc.globalAlpha = 1;
  }
}

function drawB(b: Building, t: number): void {
  const z = G.cam.z;
  R_u = z / 10;
  R_px = R_ox + b.x * z;
  R_py = R_oy + b.y * z;
  const o = G.CS[b.o] || '#ef4444';
  if (z < 5) {
    gc.fillStyle = '#000';
    gc.fillRect(R_px - 1, R_py - 1, Math.max(z, 3) + 2, Math.max(z, 3) + 2);
    gc.fillStyle = o;
    gc.fillRect(R_px, R_py, Math.max(z, 3), Math.max(z, 3));
    if (b.cap) {
      gc.fillStyle = '#fff';
      gc.fillRect(R_px + 1, R_py + 1, Math.max(z, 3) - 2, Math.max(z, 3) - 2);
    }
    return;
  }
  LOD = z >= 14 ? 2 : z >= 8 ? 1 : 0;
  if (b.born) {
    const age = t - b.born;
    if (age >= 0 && age < 460) {
      const p = age / 460;
      const k = 1 - Math.pow(1 - p, 3);
      const s = 0.5 + 0.5 * k + 0.1 * Math.sin(p * Math.PI) * (1 - p);
      const u0 = R_u;
      R_px += 5 * u0 * (1 - s);
      R_py += 10 * u0 * (1 - s);
      R_u = u0 * s;
    }
  }
  if (PF.set.shadow) {
    gc.fillStyle = 'rgba(0,0,0,.28)';
    gc.fillRect(R_px + z * 0.12, R_py + z * 0.78, z * 0.95, z * 0.2);
  }
  const ph = (b.x * 7 + b.y * 13) % 97;
  if (b.t === 'city') drawCity(b, t, o, ph);
  else if (b.t === 'power') {
    R(0, 8, 10, 1.6, '#8d917f');
    R(0.5, 5, 9, 3.2, '#a9afc0');
    R(0.5, 4.6, 9, 0.7, '#d4d8e4');
    R(1.2, 0.8, 2.6, 4.2, '#8b909e');
    R(1.5, 0.8, 2, 0.5, '#b0b5c4');
    R(6, 1.6, 2.6, 3.4, '#8b909e');
    R(6.3, 1.6, 2, 0.5, '#b0b5c4');
    R(4.3, 5.8, 1.4, 2, '#ffd23f');
    R(4.8, 5.4, 0.5, 0.6, '#fff');
    const nn = LOD >= 1 ? 3 : 1;
    for (let k = 0; k < nn; k++) {
      const ph2 = (t / 700 + k / nn) % 1;
      gc.globalAlpha = 0.55 * (1 - ph2);
      gc.fillStyle = '#e8e8ee';
      RP(2.5 + k * 0.4, 0.8 - ph2 * 4, 0.8 + ph2 * 1.3);
    }
    gc.globalAlpha = 1;
    R(0.5, 8.2, 9, 0.4, o);
    if (LOD >= 1 && ((t / 90) | 0) % 9 < 2) R(4.6 + hash((t / 90) | 0, b.x, 3) * 1.4, 5.2, 0.3, 0.3, '#9fe7ff');
  } else if (b.t === 'barracks') {
    R(0, 8, 10, 1.6, '#7b8a5a');
    R(0.8, 4.2, 8.4, 4.6, '#7a6a46');
    R(0.8, 3.6, 8.4, 1.2, o);
    R(0.8, 3.6, 8.4, 0.35, 'rgba(255,255,255,.45)');
    R(4, 6.2, 2, 2.6, '#2d251a');
    R(1.4, 5.6, 1.2, 1, '#2d251a');
    R(7.4, 5.6, 1.2, 1, '#2d251a');
    R(0, 7.6, 1.6, 1, '#b09a6a');
    R(8.4, 7.6, 1.6, 1, '#b09a6a');
    drawFlag(9, -0.4, o, t, false);
  } else if (b.t === 'sam') {
    R(1.6, 7, 6.8, 2, '#4e5868');
    R(2, 7, 6, 0.5, '#6d7889');
    R(4.2, 3.4, 1.6, 3.8, '#9aa5b5');
    const cs = Math.cos(t / 500 + (b.x + b.y));
    const bw = Math.max(0.3, 2.6 * Math.abs(cs));
    R(5 - bw, 2.65, 2 * bw, 0.7, '#cfd8e3');
    R(5 + bw * Math.sign(cs || 1) - 0.5, 2.5, 1, 1, o);
    R(3.6, 2.6, 2.8, 0.8, o);
    if (LOD >= 1 && (t + b.x * 91) % 1700 < 180) R(2.2, 7.3, 0.5, 0.4, '#46ff7a');
  } else if (b.t === 'silo') {
    drawSilo(b, t, o, ph);
  } else if (b.t === 'dfac') {
    R(0, 8, 10, 1.6, '#76808c');
    R(0.4, 4.6, 9.2, 4, '#5f6e7d');
    R(0.4, 4, 9.2, 1, o);
    R(0.4, 4, 9.2, 0.35, 'rgba(255,255,255,.45)');
    R(3, 2.2, 4, 1.2, '#222');
    R(1.8, 1.6, 1.8, 0.6, '#222');
    R(6.4, 1.6, 1.8, 0.6, '#222');
    R(4.4, 1.8, 1.2, 0.5, o);
    R(1.2, 5.6, 2.8, 3, '#2a323c');
    R(6, 5.6, 2.8, 3, '#2a323c');
    if (LOD >= 1) {
      const rb = (((t / 400) | 0) + b.x) % 2;
      R(2.6, 5.2, 0.5, 0.3, rb ? '#46ff7a' : '#1b3a24');
      R(7, 5.2, 0.5, 0.3, rb ? '#1b3a24' : '#46ff7a');
    }
  } else if (b.t === 'factory') {
    R(0, 8, 10, 1.6, '#87857a');
    R(0.5, 3.8, 9, 4.8, '#7d7466');
    R(0.5, 3.2, 9, 1.1, o);
    R(0.5, 3.2, 9, 0.35, 'rgba(255,255,255,.45)');
    R(1.2, 0, 1.4, 3.2, '#5a5348');
    R(1.2, 0, 1.4, 0.5, '#8a8274');
    R(3.4, 1, 1.2, 2.2, '#5a5348');
    const nn = LOD >= 1 ? 2 : 1;
    for (let k = 0; k < nn; k++) {
      const ph2 = (t / 800 + k / nn) % 1;
      gc.globalAlpha = 0.5 * (1 - ph2);
      gc.fillStyle = '#bdbdc4';
      RP(1.9, -0.2 - ph2 * 3.5, 0.6 + ph2);
    }
    gc.globalAlpha = 1;
    R(5.4, 4.8, 3.4, 3.6, '#2c2a26');
    R(5.9, 6.2, 2.4, 1.6, '#4d5a38');
    R(6.4, 5.6, 1.2, 0.9, '#4d5a38');
    R(7.2, 5.9, 1.6, 0.4, '#33401f');
    R(1.2, 5.2, 3, 1, '#d8cba8');
    R(1.2, 6.6, 3, 1, '#d8cba8');
    if (LOD >= 1 && ((t / 120) | 0) % 5 < 2) {
      R(5.6 + hash((t / 120) | 0, b.y, 5) * 2.4, 7.6, 0.35, 0.35, '#fff2a0');
      R(6 + hash((t / 120) | 0, b.x, 6) * 2, 7.9, 0.25, 0.25, '#ffb02e');
    }
  } else if (b.t === 'airfield') {
    drawAirfield(b, t, o, ph);
  }
  if (b.hp < b.max) drawDamage(b, t);
  if (b.hp < b.max) {
    R(1, -2, 8, 0.9, '#000');
    R(1, -2, 8 * Math.max(0, b.hp / b.max), 0.9, b.hp / b.max > 0.5 ? '#5be08a' : '#ff6b6b');
  }
}

export function drawMissile(c: CanvasRenderingContext2D, o: number, px: number, py: number, z: number, hh: number): void {
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.fillRect(px - z * 0.2, py - z * 0.1, z * 0.4, z * 0.25);
  c.fillStyle = '#fff';
  c.fillRect(px - z * 0.18, py - hh - z * 0.4, z * 0.36, z * 0.8);
  c.fillStyle = G.CS[o] || '#ef4444';
  c.fillRect(px - z * 0.18, py - hh - z * 0.4, z * 0.36, z * 0.3);
  c.fillStyle = '#ffb02e';
  c.fillRect(px - z * 0.12, py - hh + z * 0.4, z * 0.24, z * 0.5);
}

function drawRubble(r: Rubble, t: number): void {
  const z = G.cam.z;
  const age = (t - r.t0) / 1000;
  if (age > 45 || age < 0) return;
  if (G.BLD[r.y * G.W + r.x] >= 0) return;
  const px = R_ox + r.x * z;
  const py = R_oy + r.y * z;
  if (z < 5) {
    gc.globalAlpha = Math.max(0, 1 - age / 45);
    gc.fillStyle = '#2a2623';
    gc.fillRect(px, py, Math.max(z, 3), Math.max(z, 3));
    gc.globalAlpha = 1;
    return;
  }
  LOD = z >= 14 ? 2 : z >= 8 ? 1 : 0;
  R_u = z / 10;
  R_px = px;
  R_py = py;
  gc.globalAlpha = Math.min(1, (45 - age) / 10);
  R(0.6, 6.6, 8.8, 2.6, '#3a3430');
  const cols = ['#5a534b', '#7a7268', '#2e2a27', '#8a8174'];
  for (let i = 0; i < 9; i++) {
    const hx = hash(r.x + i, r.y, 21);
    const hy = hash(r.x, r.y + i, 22);
    R(0.6 + hx * 7.6, 5.6 + hy * 3.4, 0.8 + hx * 1.2, 0.6 + hy * 0.9, cols[i % 4]);
  }
  gc.globalAlpha = 1;
  if (age < 14) {
    const fi = 1 - age / 14;
    const nf = LOD >= 1 ? 3 : 1;
    for (let i = 0; i < nf; i++) {
      const fx = 1.5 + hash(r.x + i, r.y, 23) * 6.5;
      const fl = (t / 100 + i * 3) | 0;
      const hg = (0.5 + hash(fl, i, r.x) * 1.4) * fi;
      R(fx, 6.8 - hg, 0.8, hg, '#ff7a1a');
      R(fx + 0.2, 6.8 - hg * 0.6, 0.4, hg * 0.6, '#ffd23f');
    }
    smokeUp(5, 6.4, t, 2600, 3, 5, 0.6, 1.9, '#2b2b2b', 0.55 * fi, ((r.x * 3 + r.y) % 7) / 7);
  }
}

function drawWreck(w: Wreck, t: number): void {
  const z = G.cam.z;
  const age = (t - w.t0) / 1000;
  if (age > 26 || age < 0 || z < 5) return;
  const px = R_ox + w.x * z;
  const py = R_oy + w.y * z;
  const fade = age > 20 ? Math.max(0, 1 - (age - 20) / 6) : 1;
  gc.save();
  gc.globalAlpha = fade;
  gc.translate(px, py);
  gc.rotate(w.a);
  const hw = w.k === 'howitzer';
  const L = hw ? 1.04 : 0.88;
  const Wd = hw ? 0.52 : 0.44;
  gc.fillStyle = '#1b1d1e';
  gc.fillRect(-0.5 * z, -0.38 * z, z, 0.2 * z);
  gc.fillRect(-0.5 * z, 0.18 * z, z, 0.2 * z);
  gc.fillStyle = '#2a2c27';
  gc.fillRect((-L / 2) * z, (-Wd / 2) * z, L * z, Wd * z);
  gc.fillStyle = '#161815';
  gc.fillRect(-0.1 * z, -0.15 * z, 0.3 * z, 0.3 * z);
  gc.save();
  gc.translate(0.34 * z, 0.26 * z);
  gc.rotate(0.7);
  gc.fillStyle = '#34382e';
  gc.fillRect(-0.18 * z, -0.17 * z, 0.36 * z, 0.34 * z);
  gc.fillStyle = '#22251c';
  gc.fillRect(0.1 * z, -0.05 * z, hw ? 0.7 * z : 0.45 * z, 0.1 * z);
  gc.restore();
  gc.restore();
  if (age < 18) {
    const fi = 1 - age / 18;
    const nf = z >= 8 ? 3 : 1;
    for (let i = 0; i < nf; i++) {
      const fx = px + (hash(i, w.o, 31) - 0.5) * 0.7 * z;
      const fl = (t / 110 + i * 2) | 0;
      const hg = (0.25 + hash(fl, i, 32) * 0.5) * z * fi;
      gc.fillStyle = '#ff7a1a';
      gc.fillRect(fx - 0.1 * z, py - hg, 0.2 * z, hg);
      gc.fillStyle = '#ffd23f';
      gc.fillRect(fx - 0.05 * z, py - hg * 0.6, 0.1 * z, hg * 0.6);
    }
    const ns = z >= 8 ? 4 : 2;
    for (let k = 0; k < ns; k++) {
      const ph = (t / 3000 + k / ns + (w.t0 % 7) / 7) % 1;
      gc.globalAlpha = 0.6 * fi * (1 - ph) * Math.min(1, ph * 5);
      gc.fillStyle = '#252525';
      gc.beginPath();
      gc.arc(px + Math.sin(ph * 4 + k * 1.7) * z * 0.3 * ph, py - z * 0.15 - ph * z * 3.2, z * (0.2 + 0.6 * ph), 0, Math.PI * 2);
      gc.fill();
    }
    gc.globalAlpha = 1;
  }
}

type DrawableUnit = Pick<
  Unit,
  'k' | 'o' | 'x' | 'y' | 'hp' | 'max' | 'a' | 'ta' | 'id' | 'alt' | 'fireAt' | 'ph' | 'mvS' | 'rta' | '_lx' | '_ly' | '_rt'
>;

function angN(d: number): number {
  while (d > Math.PI) d -= 6.283185;
  while (d < -Math.PI) d += 6.283185;
  return d;
}

function unitMotion(u: DrawableUnit, t: number): number {
  const dtf = u._rt === undefined ? 0 : Math.min(0.06, Math.max(0, (t - u._rt) / 1000));
  let mv = 0;
  if (u._lx !== undefined && u._ly !== undefined) {
    mv = Math.hypot(u.x - u._lx, u.y - u._ly);
    if (mv > 3) mv = 0;
  }
  u._lx = u.x;
  u._ly = u.y;
  u._rt = t;
  u.ph = (u.ph || 0) + mv;
  u.mvS = (u.mvS || 0) * 0.85 + (mv > 0.0004 ? 0.15 : 0);
  const goal = u.ta === undefined ? u.a || 0 : u.ta;
  if (u.rta === undefined) u.rta = goal;
  else {
    const sp = (u.k === 'howitzer' ? 3.2 : u.k === 'tank' ? 6.5 : 12) * dtf;
    const d = angN(goal - u.rta);
    u.rta += Math.abs(d) < sp ? d : d > 0 ? sp : -sp;
  }
  return mv;
}

function recoilK(u: DrawableUnit, t: number, hw: boolean): number {
  const fa = t - (u.fireAt === undefined ? -1e9 : u.fireAt);
  if (fa < 0 || fa > 900) return 0;
  const d = hw ? 700 : 260;
  return fa < 50 ? fa / 50 : Math.max(0, 1 - (fa - 50) / (d - 50));
}

function planeSil(c: CanvasRenderingContext2D): void {
  c.beginPath();
  c.moveTo(0.6, 0);
  c.lineTo(0.4, -0.07);
  c.lineTo(0.1, -0.08);
  c.lineTo(-0.22, -0.58);
  c.lineTo(-0.36, -0.58);
  c.lineTo(-0.28, -0.08);
  c.lineTo(-0.5, -0.08);
  c.lineTo(-0.6, -0.26);
  c.lineTo(-0.66, -0.26);
  c.lineTo(-0.62, -0.04);
  c.lineTo(-0.62, 0.04);
  c.lineTo(-0.66, 0.26);
  c.lineTo(-0.6, 0.26);
  c.lineTo(-0.5, 0.08);
  c.lineTo(-0.28, 0.08);
  c.lineTo(-0.36, 0.58);
  c.lineTo(-0.22, 0.58);
  c.lineTo(0.1, 0.08);
  c.lineTo(0.4, 0.07);
  c.closePath();
  c.fill();
}

function drawPlane(u: DrawableUnit, t: number, px: number, py: number, z: number, o: string): void {
  const al = u.alt === undefined ? 1 : u.alt;
  const a = u.a || 0;
  const sc = 0.36 + 0.64 * al;
  if (PF.set.shadow) {
    const ss = 0.36 + 0.2 * al;
    const so = al * z * 0.55;
    gc.save();
    gc.translate(px + so * 0.6, py + so * 0.95);
    gc.rotate(a);
    gc.scale(z * ss, z * ss);
    gc.globalAlpha = 0.3 * (1 - 0.3 * al);
    gc.fillStyle = '#000';
    planeSil(gc);
    gc.restore();
  }
  gc.save();
  gc.translate(px, py);
  gc.rotate(a);
  gc.scale(z * sc, z * sc);
  gc.fillStyle = '#dfe3ec';
  planeSil(gc);
  gc.fillStyle = '#aab3c4';
  gc.beginPath();
  gc.moveTo(0.1, -0.08);
  gc.lineTo(-0.22, -0.58);
  gc.lineTo(-0.36, -0.58);
  gc.lineTo(-0.28, -0.08);
  gc.closePath();
  gc.fill();
  gc.beginPath();
  gc.moveTo(0.1, 0.08);
  gc.lineTo(-0.22, 0.58);
  gc.lineTo(-0.36, 0.58);
  gc.lineTo(-0.28, 0.08);
  gc.closePath();
  gc.fill();
  gc.fillStyle = o;
  gc.fillRect(-0.33, -0.58, 0.12, 0.1);
  gc.fillRect(-0.33, 0.48, 0.12, 0.1);
  gc.fillRect(-0.6, -0.03, 0.28, 0.06);
  gc.fillStyle = '#2e3f63';
  gc.fillRect(0.18, -0.045, 0.17, 0.09);
  gc.fillStyle = '#4a5060';
  gc.fillRect(-0.16, -0.2, 0.26, 0.07);
  gc.fillRect(-0.16, 0.13, 0.26, 0.07);
  if (al > 0.08) {
    const fl = 0.6 + 0.4 * Math.abs(Math.sin(t / 45 + u.id));
    gc.fillStyle = '#ff9a2e';
    gc.fillRect(-0.16 - 0.16 * fl, -0.185, 0.16 * fl, 0.04);
    gc.fillRect(-0.16 - 0.16 * fl, 0.145, 0.16 * fl, 0.04);
    gc.fillStyle = '#fff1b0';
    gc.fillRect(-0.16 - 0.08 * fl, -0.18, 0.08 * fl, 0.03);
    gc.fillRect(-0.16 - 0.08 * fl, 0.15, 0.08 * fl, 0.03);
  }
  gc.fillStyle = '#ff3030';
  gc.fillRect(-0.33, -0.6, 0.07, 0.07);
  gc.fillStyle = '#38ff6a';
  gc.fillRect(-0.33, 0.53, 0.07, 0.07);
  if ((t / 700 + u.id * 0.37) % 1 < 0.14) {
    gc.fillStyle = '#fff';
    gc.fillRect(-0.68, -0.04, 0.08, 0.08);
  }
  gc.restore();
}

function drawArmor(u: DrawableUnit, t: number, px: number, py: number, z: number, o: string, hw: boolean): void {
  unitMotion(u, t);
  const a = u.a || 0;
  const moving = (u.mvS || 0) > 0.3;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const rc = recoilK(u, t, hw);
  const fa = t - (u.fireAt === undefined ? -1e9 : u.fireAt);
  if (moving && z >= 7) {
    for (let i = 0; i < 4; i++) {
      const q = (t / 560 + i / 4 + u.id * 0.37) % 1;
      const sd = (i % 2 ? 1 : -1) * q * z * 0.35;
      gc.globalAlpha = 0.3 * (1 - q);
      gc.fillStyle = '#bba98a';
      gc.beginPath();
      gc.arc(px - ca * z * (0.5 + q * 0.9) - sa * sd, py - sa * z * (0.5 + q * 0.9) + ca * sd, z * (0.1 + 0.26 * q), 0, Math.PI * 2);
      gc.fill();
    }
    if (z >= 10) {
      for (let i = 0; i < 2; i++) {
        const q = (t / 380 + i * 0.5 + u.id * 0.21) % 1;
        gc.globalAlpha = 0.4 * (1 - q);
        gc.fillStyle = '#3a3a3e';
        gc.beginPath();
        gc.arc(
          px - ca * z * (0.5 + q * 0.45) - sa * z * 0.1,
          py - sa * z * (0.5 + q * 0.45) + ca * z * 0.1 - q * z * 0.15,
          z * (0.05 + 0.12 * q),
          0,
          Math.PI * 2,
        );
        gc.fill();
      }
    }
    gc.globalAlpha = 1;
  }
  if (PF.set.shadow) {
    gc.fillStyle = 'rgba(0,0,0,.28)';
    gc.fillRect(px - z * 0.5, py - z * 0.15, z, z * 0.6);
  }
  gc.save();
  gc.translate(px, py);
  gc.rotate(a);
  gc.scale(z, z);
  if (hw && fa >= 0 && fa < 140) gc.translate(-0.035 * (1 - fa / 140), 0);
  gc.fillStyle = '#202325';
  gc.fillRect(-0.5, -0.4, 1, 0.2);
  gc.fillRect(-0.5, 0.2, 1, 0.2);
  gc.fillStyle = '#454b4f';
  const off = (u.ph || 0) % 0.1;
  for (let i = 0; i < 10; i++) {
    const x = -0.5 + i * 0.1 + off;
    if (x > 0.46) continue;
    gc.fillRect(x, -0.4, 0.04, 0.2);
    gc.fillRect(x, 0.2, 0.04, 0.2);
  }
  gc.fillStyle = '#15171a';
  gc.fillRect(-0.5, -0.4, 1, 0.03);
  gc.fillRect(-0.5, 0.37, 1, 0.03);
  gc.fillStyle = hw ? '#6e6c4f' : '#55603c';
  gc.beginPath();
  gc.moveTo(-0.47, -0.23);
  gc.lineTo(0.36, -0.23);
  gc.lineTo(0.5, -0.13);
  gc.lineTo(0.5, 0.13);
  gc.lineTo(0.36, 0.23);
  gc.lineTo(-0.47, 0.23);
  gc.closePath();
  gc.fill();
  gc.fillStyle = hw ? '#807e5d' : '#66724a';
  gc.fillRect(-0.47, -0.23, 0.83, 0.05);
  gc.fillStyle = hw ? '#5a5841' : '#434b32';
  gc.fillRect(-0.46, -0.14, 0.2, 0.28);
  if (z >= 14) {
    gc.fillStyle = 'rgba(0,0,0,.35)';
    for (let i = 0; i < 3; i++) {
      gc.fillRect(-0.43 + i * 0.05, -0.13, 0.015, 0.09);
      gc.fillRect(-0.43 + i * 0.05, 0.04, 0.015, 0.09);
    }
  }
  gc.fillStyle = o;
  gc.fillRect(-0.45, -0.04, 0.18, 0.08);
  if (hw && !moving) {
    gc.fillStyle = '#3d3c2b';
    gc.fillRect(-0.6, -0.16, 0.11, 0.32);
    gc.fillStyle = '#55543e';
    gc.fillRect(-0.6, -0.16, 0.11, 0.04);
  }
  gc.save();
  gc.translate(hw ? -0.12 : -0.04, 0);
  gc.rotate(angN((u.rta === undefined ? a : u.rta) - a));
  const sh = -rc * (hw ? 0.3 : 0.12);
  if (hw) {
    gc.fillStyle = '#2f3022';
    gc.fillRect(0.1 + sh, -0.05, 0.85, 0.1);
    gc.fillStyle = '#40412f';
    gc.fillRect(0.1 + sh, -0.05, 0.85, 0.03);
    gc.fillStyle = '#262719';
    gc.fillRect(0.42 + sh, -0.075, 0.12, 0.15);
    gc.fillStyle = '#1c1d12';
    gc.fillRect(0.86 + sh, -0.08, 0.14, 0.16);
  } else {
    gc.fillStyle = '#2e3320';
    gc.fillRect(0.1 + sh, -0.045, 0.5, 0.09);
    gc.fillStyle = '#3e4430';
    gc.fillRect(0.1 + sh, -0.045, 0.5, 0.025);
    gc.fillStyle = '#242819';
    gc.fillRect(0.54 + sh, -0.06, 0.08, 0.12);
  }
  gc.fillStyle = hw ? '#7d7b5a' : '#6b7849';
  gc.beginPath();
  if (hw) {
    gc.moveTo(-0.3, -0.2);
    gc.lineTo(0.12, -0.2);
    gc.lineTo(0.22, -0.12);
    gc.lineTo(0.22, 0.12);
    gc.lineTo(0.12, 0.2);
    gc.lineTo(-0.3, 0.2);
    gc.closePath();
  } else {
    gc.moveTo(-0.2, -0.15);
    gc.lineTo(0.1, -0.16);
    gc.lineTo(0.22, -0.09);
    gc.lineTo(0.22, 0.09);
    gc.lineTo(0.1, 0.16);
    gc.lineTo(-0.2, 0.15);
    gc.lineTo(-0.26, 0.08);
    gc.lineTo(-0.26, -0.08);
    gc.closePath();
  }
  gc.fill();
  gc.fillStyle = hw ? '#8f8d69' : '#7d8b58';
  gc.fillRect(hw ? -0.3 : -0.2, hw ? -0.2 : -0.15, hw ? 0.42 : 0.3, 0.04);
  gc.fillStyle = hw ? '#4a4936' : '#3d4630';
  gc.beginPath();
  gc.arc(-0.1, -0.07, 0.05, 0, Math.PI * 2);
  gc.fill();
  gc.fillStyle = o;
  gc.fillRect(hw ? -0.2 : -0.14, 0.01, 0.1, 0.08);
  if (fa >= 0 && fa < (hw ? 120 : 90)) {
    const k = 1 - fa / (hw ? 120 : 90);
    const tip = (hw ? 1.0 : 0.62) + sh;
    const ln = (hw ? 0.45 : 0.3) * k + 0.08;
    gc.fillStyle = `rgba(255,170,50,${0.5 * k})`;
    gc.beginPath();
    gc.arc(tip + 0.08, 0, (hw ? 0.3 : 0.2) * (0.5 + k), 0, Math.PI * 2);
    gc.fill();
    gc.fillStyle = `rgba(255,240,170,${0.95 * k})`;
    gc.beginPath();
    gc.moveTo(tip, 0);
    gc.lineTo(tip + ln, -0.1);
    gc.lineTo(tip + 0.1, 0);
    gc.lineTo(tip + ln, 0.1);
    gc.closePath();
    gc.fill();
  }
  gc.restore();
  gc.restore();
  if (u.hp < u.max * 0.4 && z >= 7) {
    for (let i = 0; i < 2; i++) {
      const q = (t / 1500 + i * 0.5 + u.id * 0.3) % 1;
      gc.globalAlpha = 0.55 * (1 - q);
      gc.fillStyle = '#242424';
      gc.beginPath();
      gc.arc(px + Math.sin(q * 5 + i) * z * 0.1, py - z * 0.1 - q * z * 1.2, z * (0.1 + 0.22 * q), 0, Math.PI * 2);
      gc.fill();
    }
    gc.globalAlpha = 1;
    if (u.hp < u.max * 0.2) {
      const fl = (t / 90 + u.id) | 0;
      const hg = z * (0.15 + 0.2 * hash(fl, u.id, 41));
      gc.fillStyle = '#ff7a1a';
      gc.fillRect(px - z * 0.08, py - hg, z * 0.16, hg);
      gc.fillStyle = '#ffd23f';
      gc.fillRect(px - z * 0.04, py - hg * 0.6, z * 0.08, hg * 0.6);
    }
  }
}

function drawSoldier(u: DrawableUnit, t: number, px: number, py: number, z: number, o: string): void {
  unitMotion(u, t);
  const moving = (u.mvS || 0) > 0.3;
  const st = moving ? Math.sin((u.ph || 0) * 26) * z * 0.055 : 0;
  const bob = moving ? 0 : Math.sin(t / 420 + u.id) * z * 0.01;
  const aim = u.rta === undefined ? u.a || 0 : u.rta;
  const fa = t - (u.fireAt === undefined ? -1e9 : u.fireAt);
  gc.save();
  gc.translate(px, py);
  if (PF.set.shadow) {
    gc.fillStyle = 'rgba(0,0,0,.28)';
    gc.fillRect(-z * 0.2, z * 0.2, z * 0.45, z * 0.14);
  }
  gc.fillStyle = '#2e2e34';
  gc.fillRect(-z * 0.12, z * 0.05 + st, z * 0.1, z * 0.22);
  gc.fillRect(z * 0.02, z * 0.05 - st, z * 0.1, z * 0.22);
  gc.fillStyle = '#1a1a1e';
  gc.fillRect(-z * 0.13, z * 0.25 + st, z * 0.12, z * 0.05);
  gc.fillRect(z * 0.01, z * 0.25 - st, z * 0.12, z * 0.05);
  gc.fillStyle = o;
  gc.fillRect(-z * 0.17, -z * 0.16 + bob, z * 0.34, z * 0.26);
  gc.fillStyle = '#e3c9a3';
  gc.fillRect(-z * 0.1, -z * 0.3 + bob, z * 0.2, z * 0.16);
  gc.fillStyle = '#3d4a2b';
  gc.fillRect(-z * 0.12, -z * 0.34 + bob, z * 0.24, z * 0.08);
  gc.save();
  gc.translate(0, -z * 0.04 + bob);
  gc.rotate(aim);
  gc.fillStyle = '#53585e';
  gc.fillRect(-z * 0.22, -z * 0.06, z * 0.72, z * 0.1);
  gc.fillStyle = '#b64a2b';
  gc.fillRect(z * 0.46, -z * 0.09, z * 0.12, z * 0.15);
  gc.fillStyle = '#2e3236';
  gc.fillRect(-z * 0.24, -z * 0.08, z * 0.06, z * 0.14);
  if (fa >= 0 && fa < 220) {
    const k = 1 - fa / 220;
    gc.fillStyle = `rgba(255,190,90,${0.8 * k})`;
    gc.beginPath();
    gc.moveTo(-z * 0.24, 0);
    gc.lineTo(-z * (0.24 + 0.55 * k), -z * 0.12);
    gc.lineTo(-z * (0.24 + 0.7 * k), 0);
    gc.lineTo(-z * (0.24 + 0.55 * k), z * 0.12);
    gc.closePath();
    gc.fill();
    if (fa < 90) {
      gc.fillStyle = `rgba(255,240,170,${0.9 * (1 - fa / 90)})`;
      gc.beginPath();
      gc.arc(z * 0.62, 0, z * 0.14, 0, Math.PI * 2);
      gc.fill();
    }
  }
  gc.restore();
  gc.restore();
}

export function drawUnit(c: CanvasRenderingContext2D, u: DrawableUnit, t: number, ox: number, oy: number): void {
  gc = c;
  const z = G.cam.z;
  const px = ox + u.x * z;
  const py = oy + u.y * z;
  const o = G.CS[u.o] || '#ef4444';
  if (z < 5) {
    const s = Math.max(4, z * 0.9);
    gc.fillStyle = '#000';
    if (u.k === 'plane') {
      gc.fillRect(px - s * 0.7, py - s * 0.7, s * 1.4, s * 1.4);
      gc.fillStyle = o;
      gc.fillRect(px - s * 0.5, py - s * 0.5, s, s);
      gc.fillStyle = '#fff';
      gc.fillRect(px - 1, py - s * 0.7, 2, s * 1.4);
    } else {
      gc.fillRect(px - s * 0.6, py - s * 0.6, s * 1.2, s * 1.2);
      gc.fillStyle = u.k === 'tank' || u.k === 'howitzer' ? o : '#fff';
      gc.fillRect(px - s * 0.4, py - s * 0.4, s * 0.8, s * 0.8);
      if (u.k === 'rpg') {
        gc.fillStyle = o;
        gc.fillRect(px - s * 0.15, py - s * 0.15, s * 0.3, s * 0.3);
      } else if (u.k === 'howitzer') {
        gc.fillStyle = '#fff';
        gc.fillRect(px - s * 0.12, py - s * 0.12, s * 0.24, s * 0.24);
      }
    }
    return;
  }
  if (u.k === 'plane') drawPlane(u, t, px, py, z, o);
  else if (u.k === 'tank') drawArmor(u, t, px, py, z, o, false);
  else if (u.k === 'howitzer') drawArmor(u, t, px, py, z, o, true);
  else drawSoldier(u, t, px, py, z, o);
  if (u.hp < u.max) {
    gc.fillStyle = '#000';
    gc.fillRect(px - z * 0.4, py - z * 0.6, z * 0.8, 3);
    gc.fillStyle = u.hp / u.max > 0.5 ? '#5be08a' : '#ff6b6b';
    gc.fillRect(px - z * 0.4, py - z * 0.6, z * 0.8 * Math.max(0, u.hp / u.max), 3);
  }
}

let QX = 0;
let QY = 0;
let QGX = 0;
let QGY = 0;

export function arcOf(p: Pick<Projectile, 'k' | 'sx' | 'sy' | 'tx' | 'ty'>): number {
  const d = Math.hypot(p.tx - p.sx, p.ty - p.sy);
  return p.k === 'n' ? Math.min(d * 0.26, 20) : p.k === 's' ? Math.min(d * 0.38, 6.5) : Math.min(d * 0.2, 12);
}

function projAt(p: Projectile, tt: number, z: number, Hh: number): void {
  const gx = R_ox + (p.sx + (p.tx - p.sx) * tt) * z;
  const gy = R_oy + (p.sy + (p.ty - p.sy) * tt) * z;
  QGX = gx;
  QGY = gy;
  QX = gx;
  QY = gy - Math.sin(Math.PI * tt) * Hh * z;
}

function trefoil(x: number, y: number, r: number, col: string): void {
  gc.fillStyle = col;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.0944 - 1.5708;
    gc.beginPath();
    gc.moveTo(x, y);
    gc.arc(x, y, r, a - 0.52, a + 0.52);
    gc.closePath();
    gc.fill();
  }
  gc.beginPath();
  gc.arc(x, y, r * 0.2, 0, Math.PI * 2);
  gc.fill();
}

function drawRocket(p: Projectile, t: number, z: number): void {
  const nuke = p.k === 'n';
  const Hh = arcOf(p);
  const tt = Math.min(1, Math.max(0, p.t));
  const dur = p.dur || 2;
  const pq = [0.5, 0.8, 1][PF.set.part] || 1;
  projAt(p, tt, z, Hh);
  const x = QX;
  const y = QY;
  const gx = QGX;
  const gy = QGY;
  projAt(p, Math.min(1, tt + 0.012), z, Hh);
  const x1 = QX;
  const y1 = QY;
  projAt(p, Math.max(0, tt - 0.012), z, Hh);
  const x0 = QX;
  const y0 = QY;
  const ang = Math.abs(x1 - x0) + Math.abs(y1 - y0) > 1e-4 ? Math.atan2(y1 - y0, x1 - x0) : -Math.PI / 2;
  const trailS = nuke ? 1.8 : 1.0;
  const N = Math.max(4, Math.round((nuke ? 18 : 12) * pq));
  const c0 = nuke ? '#ffd9a0' : '#ffe0b0';
  const c1 = nuke ? '#b9b9c2' : '#e6e6ec';
  for (let i = N; i >= 1; i--) {
    const q = tt - ((i / N) * trailS) / dur;
    if (q < 0) continue;
    projAt(p, q, z, Hh);
    const f = i / N;
    gc.globalAlpha = (nuke ? 0.5 : 0.4) * (1 - f);
    gc.fillStyle = f < 0.18 ? c0 : c1;
    gc.beginPath();
    gc.arc(QX, QY, z * (nuke ? 0.12 : 0.075) * (1 + f * (nuke ? 3.4 : 2.4)), 0, Math.PI * 2);
    gc.fill();
  }
  gc.globalAlpha = 1;
  if (PF.set.shadow) {
    gc.fillStyle = 'rgba(0,0,0,.28)';
    gc.beginPath();
    gc.ellipse(gx, gy + z * 0.05, z * (nuke ? 0.28 : 0.18), z * (nuke ? 0.1 : 0.07), 0, 0, Math.PI * 2);
    gc.fill();
  }
  if (nuke) {
    const hr = z * 1.05;
    const hg = gc.createRadialGradient(x, y, 0, x, y, hr);
    hg.addColorStop(0, `rgba(255,70,50,${0.28 + 0.14 * Math.sin(t / 110)})`);
    hg.addColorStop(1, 'rgba(255,70,50,0)');
    gc.fillStyle = hg;
    gc.beginPath();
    gc.arc(x, y, hr, 0, Math.PI * 2);
    gc.fill();
  }
  const S = z * (nuke ? 1.2 : 0.9);
  const fl = 0.65 + 0.35 * Math.abs(Math.sin(t / 32 + p.sx * 3.1));
  const f0 = (nuke ? 0.75 : 0.5) * fl;
  const oCol = G.CS[p.o] || '#ef4444';
  gc.save();
  gc.translate(x, y);
  gc.rotate(ang);
  gc.scale(S, S);
  gc.fillStyle = '#ff6a1a';
  gc.beginPath();
  gc.moveTo(-0.45, -0.08);
  gc.lineTo(-0.45 - f0, 0);
  gc.lineTo(-0.45, 0.08);
  gc.closePath();
  gc.fill();
  gc.fillStyle = '#ffd23f';
  gc.beginPath();
  gc.moveTo(-0.45, -0.05);
  gc.lineTo(-0.45 - f0 * 0.7, 0);
  gc.lineTo(-0.45, 0.05);
  gc.closePath();
  gc.fill();
  gc.fillStyle = nuke ? '#c4c9b8' : '#f2f2f2';
  gc.fillRect(-0.45, -0.1, 0.8, 0.2);
  gc.fillStyle = 'rgba(0,0,0,.18)';
  gc.fillRect(-0.45, 0.04, 0.8, 0.06);
  gc.fillStyle = nuke ? '#d83b2b' : oCol;
  gc.beginPath();
  gc.moveTo(0.35, -0.1);
  gc.lineTo(0.62, 0);
  gc.lineTo(0.35, 0.1);
  gc.closePath();
  gc.fill();
  gc.fillStyle = '#9aa0aa';
  gc.beginPath();
  gc.moveTo(-0.2, -0.1);
  gc.lineTo(-0.46, -0.24);
  gc.lineTo(-0.46, -0.1);
  gc.closePath();
  gc.fill();
  gc.beginPath();
  gc.moveTo(-0.2, 0.1);
  gc.lineTo(-0.46, 0.24);
  gc.lineTo(-0.46, 0.1);
  gc.closePath();
  gc.fill();
  if (nuke) {
    gc.fillStyle = '#f6c744';
    gc.fillRect(-0.05, -0.1, 0.22, 0.2);
    gc.fillStyle = '#111';
    for (let i = 0; i < 3; i++) gc.fillRect(-0.05 + i * 0.08, -0.1, 0.04, 0.2);
    gc.fillStyle = oCol;
    gc.fillRect(-0.3, -0.1, 0.08, 0.2);
  } else {
    gc.fillStyle = oCol;
    gc.fillRect(0.08, -0.1, 0.1, 0.2);
  }
  gc.restore();
  if (PF.set.part > 0) {
    const ex = x - Math.cos(ang) * 0.5 * S;
    const ey = y - Math.sin(ang) * 0.5 * S;
    const er = S * (nuke ? 0.75 : 0.5) * (0.8 + 0.2 * fl);
    const gr = gc.createRadialGradient(ex, ey, 0, ex, ey, er);
    gr.addColorStop(0, `rgba(255,190,90,${nuke ? 0.6 : 0.5})`);
    gr.addColorStop(1, 'rgba(255,120,40,0)');
    gc.globalCompositeOperation = 'lighter';
    gc.fillStyle = gr;
    gc.beginPath();
    gc.arc(ex, ey, er, 0, Math.PI * 2);
    gc.fill();
    gc.globalCompositeOperation = 'source-over';
  }
}

function drawShell(p: Projectile, z: number): void {
  const Hh = arcOf(p);
  const tt = Math.min(1, Math.max(0, p.t));
  const dur = p.dur || 1;
  projAt(p, tt, z, Hh);
  const x = QX;
  const y = QY;
  const gx = QGX;
  const gy = QGY;
  projAt(p, Math.min(1, tt + 0.02), z, Hh);
  const x1 = QX;
  const y1 = QY;
  projAt(p, Math.max(0, tt - 0.02), z, Hh);
  const x0 = QX;
  const y0 = QY;
  const ang = Math.abs(x1 - x0) + Math.abs(y1 - y0) > 1e-4 ? Math.atan2(y1 - y0, x1 - x0) : 0;
  for (let i = 6; i >= 1; i--) {
    const q = tt - (i * 0.07) / dur;
    if (q < 0) continue;
    projAt(p, q, z, Hh);
    gc.globalAlpha = 0.3 * (1 - i / 7);
    gc.fillStyle = '#eceef2';
    gc.beginPath();
    gc.arc(QX, QY, z * (0.035 + 0.02 * i), 0, Math.PI * 2);
    gc.fill();
  }
  gc.globalAlpha = 1;
  if (PF.set.shadow) {
    gc.fillStyle = 'rgba(0,0,0,.3)';
    gc.beginPath();
    gc.ellipse(gx, gy, z * 0.1, z * 0.045, 0, 0, Math.PI * 2);
    gc.fill();
  }
  gc.save();
  gc.translate(x, y);
  gc.rotate(ang);
  gc.fillStyle = '#2b2c2e';
  gc.fillRect(-z * 0.13, -z * 0.05, z * 0.26, z * 0.1);
  gc.fillStyle = '#caa24a';
  gc.fillRect(z * 0.1, -z * 0.04, z * 0.06, z * 0.08);
  gc.restore();
  if (tt > 0.5) {
    const a = Math.min(1, (tt - 0.5) / 0.5);
    const own = p.o === G.ME || isFriend(G.ME, p.o);
    const cx = R_ox + p.tx * z;
    const cy = R_oy + p.ty * z;
    const rr = z * (1.5 - 0.85 * a);
    gc.strokeStyle = own ? `rgba(255,230,150,${0.25 + 0.45 * a})` : `rgba(255,80,60,${0.25 + 0.55 * a})`;
    gc.lineWidth = Math.max(1.5, z * 0.1);
    gc.beginPath();
    gc.arc(cx, cy, rr, 0, Math.PI * 2);
    gc.stroke();
    gc.beginPath();
    gc.moveTo(cx - rr * 0.5, cy);
    gc.lineTo(cx + rr * 0.5, cy);
    gc.moveTo(cx, cy - rr * 0.5);
    gc.lineTo(cx, cy + rr * 0.5);
    gc.stroke();
  }
}

function drawDrone(p: Projectile, t: number, z: number, px: number, py: number): void {
  if (PF.set.shadow) {
    gc.fillStyle = 'rgba(0,0,0,.25)';
    gc.fillRect(px - z * 0.1, py + z * 0.15, z * 0.5, z * 0.2);
  }
  gc.fillStyle = '#111';
  gc.fillRect(px - z * 0.3, py - z * 0.15, z * 0.6, z * 0.3);
  gc.fillStyle = G.CS[p.o] || '#fff';
  gc.fillRect(px - z * 0.12, py - z * 0.2, z * 0.24, z * 0.4);
  gc.fillStyle = '#ddd';
  const w = (Math.floor(t / 60) % 2 ? 0.9 : 0.5) * z;
  gc.fillRect(px - w / 2, py - z * 0.35, w, z * 0.1);
}

function drawNukeZone(p: Projectile, t: number, z: number): void {
  const cx = R_ox + p.tx * z;
  const cy = R_oy + p.ty * z;
  const rz = NRD * z;
  if (cx < -rz || cx > G.cw + rz || cy < -rz || cy > G.ch + rz) return;
  const pulse = 0.5 + 0.5 * Math.sin(t / 160);
  const g = gc;
  g.fillStyle = `rgba(255,40,30,${0.07 + 0.07 * pulse})`;
  g.beginPath();
  g.arc(cx, cy, rz, 0, Math.PI * 2);
  g.fill();
  g.setLineDash([8, 6]);
  g.lineWidth = 2;
  g.strokeStyle = `rgba(255,150,70,${0.55 + 0.4 * pulse})`;
  g.beginPath();
  g.arc(cx, cy, rz, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = `rgba(255,50,40,${0.7 + 0.3 * pulse})`;
  g.beginPath();
  g.arc(cx, cy, NRK * z, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  trefoil(cx, cy, Math.max(8, z * 1.1), `rgba(255,70,50,${0.55 + 0.35 * pulse})`);
}

function drawNukeFx(n: NukeFx, t: number): void {
  const z = G.cam.z;
  const age = (t - n.t0) / 1000;
  if (age < 0 || age > 16.5) return;
  const cx = R_ox + n.x * z;
  const cy = R_oy + n.y * z;
  const S = Math.min(z, Math.max(0.7, G.ch / (NRK * 3.4)));
  const rB = NRD * 1.8 * z;
  if (cx < -rB || cx > G.cw + rB || cy < -rB - NRK * 2.4 * S || cy > G.ch + rB) return;
  const fade = age < 10 ? 1 : Math.max(0, 1 - (age - 10) / 6.5);
  const g = gc;
  if (age < 4.5) {
    const gl = 1 - age / 4.5;
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, NRD * 1.5 * z);
    gr.addColorStop(0, `rgba(255,200,110,${0.55 * gl})`);
    gr.addColorStop(0.5, `rgba(255,120,40,${0.28 * gl})`);
    gr.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, NRD * 1.5 * z, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  if (age < 5.6) {
    const ft = Math.min(1, age / 1.7);
    const fe = 1 - Math.pow(1 - ft, 3);
    const rf = Math.max(1, NRK * z * 1.08 * fe);
    const fa = age < 2.2 ? 1 : Math.max(0, 1 - (age - 2.2) / 3.4);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rf);
    gr.addColorStop(0, `rgba(255,255,235,${fa})`);
    gr.addColorStop(0.35, `rgba(255,214,100,${fa})`);
    gr.addColorStop(0.7, `rgba(255,110,30,${0.85 * fa})`);
    gr.addColorStop(1, 'rgba(110,26,8,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, rf, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 2; i++) {
    const ta = age - i * 0.35;
    if (ta <= 0 || ta > 2.8) continue;
    const q = ta / 2.8;
    const r = NRD * 1.45 * z * (1 - Math.pow(1 - q, 2));
    g.strokeStyle = i ? `rgba(255,205,140,${0.6 * (1 - q)})` : `rgba(255,255,255,${0.9 * (1 - q)})`;
    g.lineWidth = Math.max(2, z * 0.55 * (1 - q) + 2);
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
  if (age > 0.4 && age < 10) {
    const du = Math.min(1, (age - 0.4) / 4.5);
    const rr = NRK * z * 1.5 * du + 2;
    g.fillStyle = `rgba(112,92,76,${0.34 * (1 - du * 0.75) * fade})`;
    g.beginPath();
    g.ellipse(cx, cy, rr, rr * 0.42, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (age > 0.25) {
    const u = Math.min(1, (age - 0.25) / 6);
    const e = 1 - Math.pow(1 - u, 2.2);
    const heat = Math.max(0, 1 - age / 7.5);
    const hs = NRK * 2.1 * S * e;
    const rx = NRK * S * (0.26 + 0.62 * e);
    const ry = rx * 0.6;
    const capY = cy - hs;
    const ws = NRK * S * (0.2 + 0.12 * e);
    const ns = 14;
    for (let i = 0; i <= ns; i++) {
      const f = i / ns;
      const y = cy - hs * f;
      const rr = ws * (0.42 + 0.5 * Math.pow(1 - f, 3) + 0.1 * Math.sin(i * 1.9 + age * 2.3)) + 1;
      const hh = heat * (1 - f * 0.55);
      g.fillStyle = `rgba(${(72 + hh * 183) | 0},${(60 + hh * 80) | 0},${(56 - hh * 6) | 0},${0.9 * fade})`;
      g.beginPath();
      g.arc(cx + Math.sin(i * 1.3 + age) * ws * 0.06, y, rr, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = `rgba(44,35,33,${0.9 * fade})`;
    g.beginPath();
    g.ellipse(cx, capY + ry * 0.35, rx * 1.02, ry * 0.78, 0, 0, Math.PI * 2);
    g.fill();
    const gr = g.createRadialGradient(cx, capY - ry * 0.3, 0, cx, capY, rx);
    gr.addColorStop(0, `rgba(${(150 + heat * 105) | 0},${(140 + heat * 85) | 0},${(132 + heat * 28) | 0},${fade})`);
    gr.addColorStop(0.6, `rgba(${(100 + heat * 130) | 0},${(88 + heat * 38) | 0},${(80 - heat * 40) | 0},${fade})`);
    gr.addColorStop(1, `rgba(52,41,38,${0.95 * fade})`);
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(cx, capY, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    for (let j = 0; j < 14; j++) {
      const th = (j / 14) * 6.283;
      const sn = Math.sin(th);
      if (sn > 0.45) continue;
      const br = rx * 0.26 * (1 + 0.22 * Math.sin(th * 3 + age * 1.4));
      const bx = cx + Math.cos(th) * rx * 0.93;
      const by = capY + sn * ry * 0.9;
      g.fillStyle = `rgba(${(120 + heat * 110) | 0},${(104 + heat * 60) | 0},${(96 - heat * 20) | 0},${0.5 * fade})`;
      g.beginPath();
      g.arc(bx, by, br, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = `rgba(226,204,182,${0.35 * fade})`;
    g.lineWidth = Math.max(1, S * 0.35);
    g.beginPath();
    g.ellipse(cx, capY + ry * 0.42, rx * 0.82, ry * 0.45, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
  }
  if (age > 1.2 && age < 14) {
    const ne = z >= 5 ? 24 : 8;
    const ef = Math.min(1, (age - 1.2) / 1.5) * Math.max(0, Math.min(1, 1 - (age - 8) / 6));
    for (let i = 0; i < ne; i++) {
      const a = hash(i, 3, 7) * 6.283;
      const d = Math.sqrt(hash(i, 5, 8)) * NRK * 0.92;
      const fl = 0.5 + 0.5 * Math.sin(t / (110 + hash(i, 1, 1) * 220) + i * 3);
      const s = Math.max(1.5, z * 0.13);
      g.fillStyle = `rgba(255,${(90 + fl * 90) | 0},26,${ef * (0.3 + 0.5 * fl)})`;
      g.fillRect(cx + Math.cos(a) * d * z - s / 2, cy + Math.sin(a) * d * z - s / 2, s, s);
    }
  }
}

function nukeFlash(ctx: CanvasRenderingContext2D, t: number): void {
  let a = 0;
  for (const n of G.NK) {
    const age = (t - n.t0) / 1000;
    if (age < 0 || age > 1.5) continue;
    const near = inView(n.x, n.y) ? 1 : 0.4;
    const k = age < 0.1 ? age / 0.1 : Math.max(0, 1 - (age - 0.1) / 1.35);
    a = Math.max(a, 0.94 * k * near);
  }
  if (a > 0.01) {
    ctx.fillStyle = `rgba(255,250,235,${a})`;
    ctx.fillRect(0, 0, G.cw, G.ch);
  }
}

export function iconFor(t: string, cv: HTMLCanvasElement): void {
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cv.width, cv.height);
  const sc = gc;
  const ocam = [G.cam.z, R_ox, R_oy];
  const osh = PF.set.shadow;
  const onk = NIGHTK;
  gc = c;
  G.cam.z = cv.width * 0.95;
  R_ox = 0;
  R_oy = cv.height * 0.12;
  PF.set.shadow = 0;
  NIGHTK = 0;
  drawB({ t, o: G.ME, x: 0, y: 0, hp: 1, max: 1, cap: false, cd: 0, dead: false }, 0);
  gc = sc;
  G.cam.z = ocam[0];
  R_ox = ocam[1];
  R_oy = ocam[2];
  PF.set.shadow = osh;
  NIGHTK = onk;
}

export function drawToolIcon(id: string, cv: HTMLCanvasElement): void {
  const ICN = 44;
  const n = (cv.width = cv.height = ICN);
  const k = n / 30;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  if (BT[id]) {
    iconFor(id, cv);
    return;
  }
  c.clearRect(0, 0, n, n);
  c.save();
  c.scale(k, k);
  const meCol = G.CS[G.ME] || '#ef4444';
  if (id === 'missile') {
    drawMissile(c, G.ME, 15, 18, 16, 0);
  } else if (id === 'drone') {
    c.fillStyle = '#111';
    c.fillRect(5, 13, 20, 8);
    c.fillStyle = meCol;
    c.fillRect(11, 10, 8, 12);
    c.fillStyle = '#ddd';
    c.fillRect(3, 8, 10, 2);
    c.fillRect(17, 8, 10, 2);
  } else if (id === 'assault') {
    c.fillStyle = '#5fae4a';
    c.fillRect(3, 19, 24, 7);
    c.fillStyle = meCol;
    c.fillRect(14, 3, 2, 18);
    c.fillRect(16, 3, 10, 7);
  } else if (id === 'nuke') {
    c.fillStyle = '#4a5040';
    c.fillRect(11, 5, 8, 19);
    c.fillStyle = '#d83b2b';
    c.fillRect(11, 2, 8, 5);
    c.fillRect(12, 0, 6, 3);
    c.fillStyle = '#f6c744';
    c.fillRect(11, 11, 8, 7);
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(15, 14.5, 2.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f6c744';
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 - 1.57;
      c.beginPath();
      c.moveTo(15, 14.5);
      c.arc(15, 14.5, 2.1, a - 0.5, a + 0.5);
      c.closePath();
      c.fill();
    }
    c.fillStyle = '#2c3028';
    c.fillRect(7, 20, 4, 6);
    c.fillRect(19, 20, 4, 6);
    c.fillStyle = '#ffb02e';
    c.fillRect(12, 24, 6, 3);
    c.fillStyle = '#ffe27a';
    c.fillRect(13, 24, 4, 2);
  } else if (id === 'tank' || id === 'rpg' || id === 'plane' || id === 'howitzer') {
    c.restore();
    c.save();
    const oz = G.cam.z;
    const osh = PF.set.shadow;
    G.cam.z = (id === 'howitzer' ? 18 : 24) * k;
    PF.set.shadow = 0;
    drawUnit(
      c,
      id === 'howitzer'
        ? { k: id, o: G.ME, x: 0.56, y: 0.86, hp: 1, max: 1, a: 0, ta: 0, id: 1 }
        : { k: id, o: G.ME, x: 0.6, y: 0.62, hp: 1, max: 1, a: id === 'plane' ? -0.6 : 0, ta: 0, id: 1 },
      0,
      0,
      0,
    );
    G.cam.z = oz;
    PF.set.shadow = osh;
  } else {
    c.beginPath();
    c.moveTo(9, 3);
    c.lineTo(9, 23);
    c.lineTo(14, 18);
    c.lineTo(18, 27);
    c.lineTo(22, 25);
    c.lineTo(18, 17);
    c.lineTo(24, 17);
    c.closePath();
    c.fillStyle = '#eaf0fb';
    c.fill();
    c.lineWidth = 1.6;
    c.strokeStyle = '#0b1020';
    c.stroke();
  }
  c.restore();
}

let wavePatC: CanvasPattern | null = null;
let cloudPatC: CanvasPattern | null = null;
let fpsT = 0;
let fpsN = 0;
let fpsV = 0;
let mmN = 0;

function mkPatterns(ctx: CanvasRenderingContext2D): void {
  const a = document.createElement('canvas');
  a.width = a.height = 128;
  const c = a.getContext('2d')!;
  for (let i = 0; i < 46; i++) {
    const x = hash(i, 1, 5) * 128;
    const y = hash(i, 2, 5) * 128;
    const l = 6 + hash(i, 3, 5) * 16;
    c.fillStyle = `rgba(255,255,255,${0.35 + hash(i, 4, 5) * 0.5})`;
    c.fillRect(x, y, l, 1.5);
    c.fillRect(x + 3, y + 3, l * 0.6, 1);
  }
  wavePatC = ctx.createPattern(a, 'repeat');

  const b = document.createElement('canvas');
  b.width = b.height = 512;
  const d = b.getContext('2d')!;
  for (let i = 0; i < 9; i++) {
    const x = hash(i, 7, 6) * 512;
    const y = hash(i, 8, 6) * 512;
    const r = 60 + hash(i, 9, 6) * 70;
    for (const ox of [-512, 0, 512]) {
      for (const oy of [-512, 0, 512]) {
        const g = d.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, 'rgba(0,10,30,.9)');
        g.addColorStop(1, 'rgba(0,10,30,0)');
        d.fillStyle = g;
        d.beginPath();
        d.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        d.fill();
      }
    }
  }
  cloudPatC = ctx.createPattern(b, 'repeat');
}

function patDraw(ctx: CanvasRenderingContext2D, pat: CanvasPattern | null, alpha: number, sc: number, tx: number, ty: number): void {
  if (!pat) return;
  const { dpr, cw, ch } = G;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * tx, dpr * ty);
  ctx.fillStyle = pat;
  ctx.fillRect(-tx / sc - 4, -ty / sc - 4, cw / sc + 8, ch / sc + 8);
  ctx.restore();
}

export function drawMini(): void {
  const mmc = document.getElementById('mm') as HTMLCanvasElement | null;
  if (!mmc) return;
  const mctx = mmc.getContext('2d')!;
  const w = mmc.width;
  const h = mmc.height;
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(miniT, 0, 0, w, h);
  mctx.drawImage(ownC, 0, 0, w, h);
  const sx = w / G.W;
  const sy = h / G.H;
  for (const b of G.B) {
    if (!b.cap) continue;
    mctx.fillStyle = '#000';
    mctx.fillRect(b.x * sx - 2, b.y * sy - 2, 5, 5);
    mctx.fillStyle = G.P[b.o]?.alive ? G.CS[b.o] : '#888';
    mctx.fillRect(b.x * sx - 1, b.y * sy - 1, 3, 3);
  }
  for (const n of G.NK) {
    const age = (RT - n.t0) / 1000;
    if (age < 0 || age > 12) continue;
    mctx.fillStyle = `rgba(255,${age < 2 ? 200 : 90},40,${Math.max(0, 0.9 - age / 13)})`;
    mctx.beginPath();
    mctx.arc(n.x * sx, n.y * sy, Math.max(3, NRD * sx * Math.min(1, 0.4 + age / 3)), 0, Math.PI * 2);
    mctx.fill();
  }
  for (const p of G.PR) {
    if (p.t < 0) continue;
    if (p.k === 'n') {
      mctx.fillStyle = ((RT / 200) | 0) % 2 ? '#ff3b2b' : '#fff';
      mctx.fillRect(p.x * sx - 2, p.y * sy - 2, 5, 5);
    } else {
      mctx.fillStyle = p.k === 'm' ? '#fff' : '#ffe27a';
      mctx.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2);
    }
  }
  for (const u of G.U) {
    mctx.fillStyle = G.CS[u.o] || '#fff';
    mctx.fillRect(u.x * sx - 1, u.y * sy - 1, 2, 2);
  }
  mctx.strokeStyle = '#fff';
  mctx.lineWidth = 1.5;
  mctx.strokeRect(
    (G.cam.cx - G.cw / G.cam.z / 2) * sx,
    (G.cam.cy - G.ch / G.cam.z / 2) * sy,
    (G.cw / G.cam.z) * sx,
    (G.ch / G.cam.z) * sy,
  );
}

export function renderWorld(t: number): void {
  const cvs = document.getElementById('cv') as HTMLCanvasElement | null;
  if (!cvs) return;
  const ctx = cvs.getContext('2d')!;
  gc = ctx;
  RT = t;
  const { dpr, cw, ch, W, H, N, cam } = G;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!wavePatC) mkPatterns(ctx);
  ctx.fillStyle = '#0b2a52';
  ctx.fillRect(0, 0, cw, ch);
  const z = cam.z;
  let sx = 0;
  let sy = 0;
  if (G.shake > 0.1 && PF.set.shake) {
    sx = (Math.random() - 0.5) * G.shake;
    sy = (Math.random() - 0.5) * G.shake;
  }
  R_ox = cw / 2 - cam.cx * z + sx;
  R_oy = ch / 2 - cam.cy * z + sy;
  ctx.imageSmoothingEnabled = z < G.TS * 0.9;
  ctx.drawImage(seaC, R_ox, R_oy, W * z, H * z);
  if (PF.set.water) {
    const sc = Math.max(1, z / 3.2);
    patDraw(ctx, wavePatC, 0.16, sc, R_ox * 0.5 + t * 0.012 * sc, R_oy * 0.5 + t * 0.006 * sc);
    patDraw(ctx, wavePatC, 0.1, sc * 1.6, R_ox * 0.5 - t * 0.016 * sc, R_oy * 0.5 + t * 0.01 * sc);
  }
  const x0 = Math.max(0, Math.floor(-R_ox / z));
  const x1 = Math.min(W, Math.ceil((cw - R_ox) / z));
  const y0 = Math.max(0, Math.floor(-R_oy / z));
  const y1 = Math.min(H, Math.ceil((ch - R_oy) / z));
  if (PF.set.water && z >= 3) {
    for (let i = 0; i < G.COAST.length; i += 2) {
      const x = G.COAST[i];
      const y = G.COAST[i + 1];
      if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
      const a = 0.14 + 0.14 * Math.sin(t / 520 + x * 0.9 + y * 0.7);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(R_ox + x * z, R_oy + y * z, z, z);
    }
  }
  ctx.drawImage(landC, R_ox, R_oy, W * z, H * z);
  if (G.ownDirty && performance.now() - ownHiT > Math.max(70, (N / 16640) * 50)) {
    ownHiT = performance.now();
    buildOwnHi();
  }
  ctx.drawImage(ownHi, R_ox, R_oy, W * z, H * z);
  if (PF.set.grid && z >= 7) {
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1; x++) {
      ctx.moveTo(R_ox + x * z, R_oy + y0 * z);
      ctx.lineTo(R_ox + x * z, R_oy + y1 * z);
    }
    for (let y = y0; y <= y1; y++) {
      ctx.moveTo(R_ox + x0 * z, R_oy + y * z);
      ctx.lineTo(R_ox + x1 * z, R_oy + y * z);
    }
    ctx.stroke();
  }
  if (PF.set.clouds) {
    const sc = Math.max(0.9, z / 2.6);
    patDraw(ctx, cloudPatC, 0.13, sc, R_ox * 0.7 + t * 0.004 * sc, R_oy * 0.7 + t * 0.002 * sc);
  }
  if (G.phase === 'cap') {
    const c = G.SC[G.ME];
    if (c) {
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath();
      ctx.arc(R_ox + (c.x + 0.5) * z, R_oy + (c.y + 0.5) * z, 10 * z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (G.phase === 'play' && (G.tool === 'missile' || G.tool === 'drone' || G.tool === 'nuke')) {
    const nk = G.tool === 'nuke';
    const rr = G.tool === 'missile' ? mr(G.ME) : G.tool === 'drone' ? 30 : NR;
    const tp = G.tool === 'drone' ? 'dfac' : 'silo';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = nk ? 'rgba(255,120,90,.7)' : 'rgba(255,230,150,.55)';
    for (const b of G.B) {
      if (b.dead || b.o !== G.ME || b.t !== tp) continue;
      ctx.beginPath();
      ctx.arc(R_ox + (b.x + 0.5) * z, R_oy + (b.y + 0.5) * z, rr * z, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  for (const r of G.RB) {
    if (r.x < x0 - 2 || r.x > x1 + 1 || r.y < y0 - 2 || r.y > y1 + 1) continue;
    drawRubble(r, t);
  }
  for (const p of G.PR) {
    if (p.k === 'n' && p.t > 0.02 && !p.dead) drawNukeZone(p, t, z);
  }
  NIGHTK = PF.set.night && G.phase === 'play' ? 0.5 - 0.5 * Math.cos(((G.gameT / 260) % 1) * 6.283) : 0;
  for (const b of G.B) {
    if (b.x < x0 - 2 || b.x > x1 + 1 || b.y < y0 - 2 || b.y > y1 + 1) continue;
    drawB(b, t);
  }
  if (G.phase === 'play' && G.selB && !G.selB.dead) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(R_ox + G.selB.x * z - 1, R_oy + G.selB.y * z - 1, z + 2, z + 2);
    if (G.selB.t === 'sam') {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(120,255,255,.8)';
      ctx.beginPath();
      ctx.arc(R_ox + (G.selB.x + 0.5) * z, R_oy + (G.selB.y + 0.5) * z, samR(G.selB.o) * z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  for (const b of G.B) {
    if (!b.cap) continue;
    const px = R_ox + (b.x + 0.5) * z;
    const py = R_oy + b.y * z - z * (z < 5 ? 0.4 : 1.4);
    ctx.font = `700 ${Math.max(11, Math.min(16, z * 1.6))}px Pixelify Sans,monospace`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    const nm = nameOf(b.o) + (isAlly(G.ME, b.o) ? ' ★' : '');
    ctx.strokeText(nm, px, py);
    ctx.fillStyle = G.P[b.o]?.alive ? G.CS[b.o] : '#888';
    ctx.fillText(nm, px, py);
  }
  if (G.phase === 'play') {
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,.32)';
    for (const u of G.U) {
      if (u.o !== G.ME || u.k === 'plane' || u.tx === undefined || u.ty === undefined) continue;
      ctx.beginPath();
      ctx.moveTo(R_ox + u.x * z, R_oy + u.y * z);
      ctx.lineTo(R_ox + u.tx * z, R_oy + u.ty * z);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  for (const w of G.WK) {
    if (w.x < x0 - 2 || w.x > x1 + 2 || w.y < y0 - 2 || w.y > y1 + 2) continue;
    drawWreck(w, t);
  }
  for (const u of G.U) {
    if (u.x < x0 - 2 || u.x > x1 + 2 || u.y < y0 - 2 || u.y > y1 + 2) continue;
    if (u.k !== 'plane') drawUnit(ctx, u, t, R_ox, R_oy);
  }
  for (const bm of G.BM) {
    ctx.strokeStyle = bm.c;
    ctx.globalAlpha = Math.min(1, bm.life * 6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(R_ox + bm.x1 * z, R_oy + bm.y1 * z);
    ctx.lineTo(R_ox + bm.x2 * z, R_oy + bm.y2 * z);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of G.PR) {
    if (p.t < 0) continue;
    const px = R_ox + p.x * z;
    const py = R_oy + p.y * z;
    if (px < -320 || px > cw + 320 || py < -420 || py > ch + 320) continue;
    if (p.k === 'm' || p.k === 'n') drawRocket(p, t, z);
    else if (p.k === 's') drawShell(p, z);
    else drawDrone(p, t, z, px, py);
  }
  for (const u of G.U) {
    if (u.k === 'plane' && u.x > x0 - 3 && u.x < x1 + 3 && u.y > y0 - 3 && u.y < y1 + 3) {
      drawUnit(ctx, u, t, R_ox, R_oy);
    }
  }
  for (const r of G.EF) {
    ctx.strokeStyle = r.c;
    ctx.globalAlpha = Math.max(0, r.life / r.max);
    ctx.lineWidth = Math.max(2, z * 0.25);
    ctx.beginPath();
    ctx.arc(R_ox + r.x * z, R_oy + r.y * z, r.r * z * (1 - r.life / r.max) + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of G.PT) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.c;
    const s = p.s * z;
    ctx.fillRect(R_ox + p.x * z - s / 2, R_oy + p.y * z - s / 2, s, s);
    ctx.globalAlpha = 1;
  }
  if (PF.set.night && G.phase === 'play') {
    const ph = (G.gameT / 260) % 1;
    const a = 0.34 * (0.5 - 0.5 * Math.cos(ph * 6.283));
    ctx.fillStyle = `rgba(8,16,70,${a})`;
    ctx.fillRect(0, 0, cw, ch);
  }
  for (const n of G.NK) drawNukeFx(n, t);
  nukeFlash(ctx, t);
  if (G.phase === 'play' && G.hover && G.brush && G.tool !== 'hand') {
    const ok = G.hover.ok;
    ctx.fillStyle = ok ? 'rgba(91,224,138,.35)' : 'rgba(255,107,107,.35)';
    ctx.fillRect(R_ox + G.hover.x * z, R_oy + G.hover.y * z, z, z);
    ctx.strokeStyle = ok ? '#5be08a' : '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.strokeRect(R_ox + G.hover.x * z, R_oy + G.hover.y * z, z, z);
  }
  if (G.phase === 'play' && G.aim.on) {
    const ax = R_ox + G.aim.tx * z;
    const ay = R_oy + G.aim.ty * z;
    if (G.tool === 'nuke') {
      ctx.fillStyle = 'rgba(255,60,40,.12)';
      ctx.beginPath();
      ctx.arc(ax, ay, NRD * z, 0, Math.PI * 2);
      ctx.fill();
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,150,70,.9)';
      ctx.beginPath();
      ctx.arc(ax, ay, NRD * z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ff3b2b';
      ctx.beginPath();
      ctx.arc(ax, ay, NRK * z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      trefoil(ax, ay, Math.max(9, z * 1.1), 'rgba(255,70,50,.85)');
    }
    ctx.strokeStyle = G.aim.err ? '#ff6b6b' : '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(R_ox + G.aim.fx * z, R_oy + G.aim.fy * z);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.setLineDash([]);
    const r = Math.max(10, z * 1.2) + Math.sin(t / 120) * 2;
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.moveTo(ax - r - 6, ay);
    ctx.lineTo(ax + r + 6, ay);
    ctx.moveTo(ax, ay - r - 6);
    ctx.lineTo(ax, ay + r + 6);
    ctx.stroke();
  }
  if (PF.set.fps) {
    fpsN++;
    if (t - fpsT > 600) {
      fpsV = Math.round((fpsN * 1000) / (t - fpsT));
      fpsN = 0;
      fpsT = t;
    }
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(cw - 64, ch - 26, 58, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${fpsV} fps`, cw - 58, ch - 11);
  }
  if (mmN++ % 3 === 0) drawMini();
}
