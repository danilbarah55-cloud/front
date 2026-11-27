import { ALLPAL, BT, SIZES, TRGB } from './constants.ts';
import { PF, techLv, upLv } from './profile.ts';
import { MP } from './network.ts';

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
}

export interface Projectile {
  k: 'm' | 'd';
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
  dead?: boolean;
}

export interface Unit {
  id: number;
  k: 'tank' | 'rpg' | 'plane';
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
  alarmK: 'm' as 'm' | 'd',
  paused: false,
  sndOn: true,

  cw: 300,
  ch: 300,
  dpr: 1,
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

  mpFx: [] as Array<[number, number, number]>,
  mpBm: [] as Array<[number, number, number, number]>,
  mpNotice: '',
  evT: 60,
  mpAllies: [] as number[],
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
  G.dpr = Math.min(3, window.devicePixelRatio || 1);
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
  return o === G.ME && !MP.on ? upLv(id) : 0;
}

export function tk(o: number, id: string): number {
  return o === G.ME && !MP.on ? techLv(id) : 0;
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

export function ucost(o: number, k: 'tank' | 'rpg' | 'plane'): number {
  const base = k === 'tank' ? 90 : k === 'rpg' ? 30 : 110;
  return Math.round(base * (1 - 0.1 * tk(o, 'eco6')));
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

function R(x: number, y: number, w: number, h: number, c: string): void {
  gc.fillStyle = c;
  gc.fillRect(R_px + x * R_u, R_py + y * R_u, w * R_u, h * R_u);
}

function drawFlag(x: number, y: number, o: string, t: number, big: boolean): void {
  R(x, y, 0.5, big ? 4.5 : 3.5, '#2a2a2a');
  for (let i = 0; i < 5; i++) {
    const wv = Math.sin(t / 180 + i * 0.9) * 0.45;
    R(x + 0.5 + i * 0.55, y + 0.15 + wv, 0.6, big ? 1.9 : 1.3, i % 2 === 0 ? o : '#ffffff');
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
  if (b.t === 'city') {
    R(0, 8, 10, 1.6, '#8d917f');
    R(0.8, 4.6, 3.2, 4, '#e8e2d0');
    R(0.8, 4, 3.2, 1, o);
    R(0.8, 4, 3.2, 0.35, 'rgba(255,255,255,.5)');
    R(4.8, 2.4, 3.6, 6.2, '#c6cad6');
    R(4.8, 1.8, 3.6, 1, o);
    R(8.4, 2.4, 0.6, 6.2, '#9ea3b4');
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const on = hash(b.x + i, b.y + j, (t / 900) | 0) < 0.8;
        R(5.3 + j * 1.6, 3.3 + i * 1.7, 0.9, 0.9, on ? '#ffe27a' : '#59607a');
      }
    }
    R(1.4, 5.6, 0.8, 0.8, '#ffe27a');
    R(2.6, 5.6, 0.8, 0.8, '#8aa2c8');
    R(9, 5, 0.4, 3.6, '#555');
    R(8.7, 4.6, 1, 0.5, '#d00');
    if (b.cap) drawFlag(5.8, -2.6, o, t, true);
  } else if (b.t === 'power') {
    R(0, 8, 10, 1.6, '#8d917f');
    R(0.5, 5, 9, 3.2, '#a9afc0');
    R(0.5, 4.6, 9, 0.7, '#d4d8e4');
    R(1.2, 0.8, 2.6, 4.2, '#8b909e');
    R(1.5, 0.8, 2, 0.5, '#b0b5c4');
    R(6, 1.6, 2.6, 3.4, '#8b909e');
    R(6.3, 1.6, 2, 0.5, '#b0b5c4');
    R(4.3, 5.8, 1.4, 2, '#ffd23f');
    R(4.8, 5.4, 0.5, 0.6, '#fff');
    for (let k = 0; k < 3; k++) {
      const ph = (t / 700 + k * 0.33) % 1;
      gc.globalAlpha = 0.55 * (1 - ph);
      gc.fillStyle = '#e8e8ee';
      const cx = R_px + (2.5 + k * 0.4) * R_u;
      const cy = R_py + (0.8 - ph * 4) * R_u;
      gc.beginPath();
      gc.arc(cx, cy, R_u * (0.8 + ph * 1.3), 0, Math.PI * 2);
      gc.fill();
    }
    gc.globalAlpha = 1;
    R(0.5, 8.2, 9, 0.4, o);
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
    gc.save();
    gc.translate(R_px + 5 * R_u, R_py + 3 * R_u);
    gc.rotate(t / 500 + (b.x + b.y));
    gc.fillStyle = '#cfd8e3';
    gc.fillRect(-2.6 * R_u, -0.35 * R_u, 5.2 * R_u, 0.7 * R_u);
    gc.fillStyle = o;
    gc.fillRect(1.8 * R_u, -0.5 * R_u, 1 * R_u, 1 * R_u);
    gc.restore();
    R(3.6, 2.6, 2.8, 0.8, o);
  } else if (b.t === 'silo') {
    R(0, 7, 10, 2.6, '#4a4f5c');
    R(0.4, 7, 9.2, 0.5, '#6a7080');
    R(2.4, 5.2, 5.2, 2.2, '#2c303a');
    R(3.2, 5.6, 1.6, 1.2, '#f6c744');
    R(5.2, 5.6, 1.6, 1.2, '#f6c744');
    R(4.3, -0.6, 1.4, 6, '#efefef');
    R(4.3, -0.6, 1.4, 1.6, o);
    R(4.3, 1, 1.4, 0.5, '#333');
    R(3.6, 4.2, 0.8, 1.4, '#c9c9c9');
    R(5.6, 4.2, 0.8, 1.4, '#c9c9c9');
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
  } else if (b.t === 'factory') {
    R(0, 8, 10, 1.6, '#87857a');
    R(0.5, 3.8, 9, 4.8, '#7d7466');
    R(0.5, 3.2, 9, 1.1, o);
    R(0.5, 3.2, 9, 0.35, 'rgba(255,255,255,.45)');
    R(1.2, 0, 1.4, 3.2, '#5a5348');
    R(1.2, 0, 1.4, 0.5, '#8a8274');
    R(3.4, 1, 1.2, 2.2, '#5a5348');
    for (let k = 0; k < 2; k++) {
      const ph = (t / 800 + k * 0.5) % 1;
      gc.globalAlpha = 0.5 * (1 - ph);
      gc.fillStyle = '#bdbdc4';
      gc.beginPath();
      gc.arc(R_px + 1.9 * R_u, R_py + (-0.2 - ph * 3.5) * R_u, R_u * (0.6 + ph), 0, Math.PI * 2);
      gc.fill();
    }
    gc.globalAlpha = 1;
    R(5.4, 4.8, 3.4, 3.6, '#2c2a26');
    R(5.9, 6.2, 2.4, 1.6, '#4d5a38');
    R(6.4, 5.6, 1.2, 0.9, '#4d5a38');
    R(7.2, 5.9, 1.6, 0.4, '#33401f');
    R(1.2, 5.2, 3, 1, '#d8cba8');
    R(1.2, 6.6, 3, 1, '#d8cba8');
  } else if (b.t === 'airfield') {
    R(0, 6, 10, 3.6, '#53575f');
    R(0, 7.7, 10, 0.35, '#d9d9d9');
    for (let i = 0; i < 5; i++) R(0.5 + i * 2, 7.62, 1, 0.5, '#ffffff');
    R(0.4, 2.6, 2.4, 3.4, '#9aa2ae');
    R(0.4, 2.2, 2.4, 0.8, o);
    R(0.8, 3.4, 0.6, 0.6, '#ffe27a');
    R(1.8, 3.4, 0.6, 0.6, '#ffe27a');
    R(5.4, 4.9, 3.6, 0.9, '#eceff4');
    R(6.6, 3.7, 0.9, 2.9, '#d6dae2');
    R(8.3, 4.3, 0.7, 0.8, o);
    R(5.4, 5.2, 0.9, 0.3, '#444');
  }
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

export function drawUnit(c: CanvasRenderingContext2D, u: Pick<Unit, 'k' | 'o' | 'x' | 'y' | 'hp' | 'max' | 'a' | 'ta' | 'id'>, t: number, ox: number, oy: number): void {
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
      gc.fillStyle = u.k === 'tank' ? o : '#fff';
      gc.fillRect(px - s * 0.4, py - s * 0.4, s * 0.8, s * 0.8);
      if (u.k === 'rpg') {
        gc.fillStyle = o;
        gc.fillRect(px - s * 0.15, py - s * 0.15, s * 0.3, s * 0.3);
      }
    }
    return;
  }
  const a = u.a || 0;
  if (u.k === 'plane') {
    if (PF.set.shadow) {
      gc.save();
      gc.translate(px + z * 0.5, py + z * 0.8);
      gc.rotate(a);
      gc.fillStyle = 'rgba(0,0,0,.3)';
      gc.fillRect(-z * 0.5, -z * 0.12, z, z * 0.24);
      gc.fillRect(-z * 0.12, -z * 0.55, z * 0.24, z * 1.1);
      gc.restore();
    }
    gc.save();
    gc.translate(px, py);
    gc.rotate(a);
    gc.fillStyle = '#d9dde6';
    gc.fillRect(-z * 0.55, -z * 0.12, z * 1.1, z * 0.24);
    gc.fillStyle = '#aeb5c4';
    gc.fillRect(-z * 0.12, -z * 0.62, z * 0.3, z * 1.24);
    gc.fillStyle = o;
    gc.fillRect(-z * 0.55, -z * 0.3, z * 0.22, z * 0.6);
    gc.fillRect(z * 0.3, -z * 0.12, z * 0.25, z * 0.24);
    gc.fillStyle = '#3a4a66';
    gc.fillRect(z * 0.12, -z * 0.08, z * 0.2, z * 0.16);
    gc.restore();
  } else if (u.k === 'tank') {
    if (PF.set.shadow) {
      gc.fillStyle = 'rgba(0,0,0,.28)';
      gc.fillRect(px - z * 0.5, py - z * 0.15, z, z * 0.6);
    }
    gc.save();
    gc.translate(px, py);
    gc.rotate(a);
    gc.fillStyle = '#25282a';
    gc.fillRect(-z * 0.5, -z * 0.38, z, z * 0.2);
    gc.fillRect(-z * 0.5, z * 0.18, z, z * 0.2);
    const tr = ((t / 90) | 0) % 2;
    gc.fillStyle = '#3d4245';
    for (let i = 0; i < 5; i++) {
      gc.fillRect(-z * 0.46 + i * z * 0.2 + (tr ? z * 0.04 : 0), -z * 0.38, z * 0.07, z * 0.2);
      gc.fillRect(-z * 0.46 + i * z * 0.2 + (tr ? z * 0.04 : 0), z * 0.18, z * 0.07, z * 0.2);
    }
    gc.fillStyle = '#55603c';
    gc.fillRect(-z * 0.44, -z * 0.22, z * 0.88, z * 0.44);
    gc.fillStyle = o;
    gc.fillRect(-z * 0.44, -z * 0.06, z * 0.4, z * 0.12);
    gc.save();
    gc.rotate((u.ta || 0) - a);
    gc.fillStyle = '#6b7849';
    gc.fillRect(-z * 0.18, -z * 0.17, z * 0.36, z * 0.34);
    gc.fillStyle = '#2e3320';
    gc.fillRect(z * 0.1, -z * 0.05, z * 0.6, z * 0.1);
    gc.fillStyle = o;
    gc.fillRect(-z * 0.1, -z * 0.08, z * 0.16, z * 0.16);
    gc.restore();
    gc.restore();
  } else {
    gc.save();
    gc.translate(px, py);
    if (PF.set.shadow) {
      gc.fillStyle = 'rgba(0,0,0,.28)';
      gc.fillRect(-z * 0.2, z * 0.2, z * 0.45, z * 0.14);
    }
    const st = Math.sin(t / 110 + u.id) * z * 0.04;
    gc.fillStyle = '#2e2e34';
    gc.fillRect(-z * 0.12, z * 0.05 + st, z * 0.1, z * 0.22);
    gc.fillRect(z * 0.02, z * 0.05 - st, z * 0.1, z * 0.22);
    gc.fillStyle = o;
    gc.fillRect(-z * 0.17, -z * 0.16, z * 0.34, z * 0.26);
    gc.fillStyle = '#e3c9a3';
    gc.fillRect(-z * 0.1, -z * 0.3, z * 0.2, z * 0.16);
    gc.fillStyle = '#3d4a2b';
    gc.fillRect(-z * 0.12, -z * 0.34, z * 0.24, z * 0.08);
    gc.rotate(u.a || 0);
    gc.fillStyle = '#53585e';
    gc.fillRect(0, -z * 0.08, z * 0.5, z * 0.1);
    gc.fillStyle = '#b64a2b';
    gc.fillRect(z * 0.46, -z * 0.1, z * 0.1, z * 0.14);
    gc.restore();
  }
  if (u.hp < u.max) {
    gc.fillStyle = '#000';
    gc.fillRect(px - z * 0.4, py - z * 0.6, z * 0.8, 3);
    gc.fillStyle = u.hp / u.max > 0.5 ? '#5be08a' : '#ff6b6b';
    gc.fillRect(px - z * 0.4, py - z * 0.6, z * 0.8 * Math.max(0, u.hp / u.max), 3);
  }
}

export function iconFor(t: string, cv: HTMLCanvasElement): void {
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cv.width, cv.height);
  const sc = gc;
  const ocam = [G.cam.z, R_ox, R_oy];
  const osh = PF.set.shadow;
  gc = c;
  G.cam.z = cv.width * 0.95;
  R_ox = 0;
  R_oy = cv.height * 0.12;
  PF.set.shadow = 0;
  drawB({ t, o: G.ME, x: 0, y: 0, hp: 1, max: 1, cap: false, cd: 0, dead: false }, 0);
  gc = sc;
  G.cam.z = ocam[0];
  R_ox = ocam[1];
  R_oy = ocam[2];
  PF.set.shadow = osh;
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
  } else if (id === 'tank' || id === 'rpg' || id === 'plane') {
    c.restore();
    c.save();
    const oz = G.cam.z;
    const osh = PF.set.shadow;
    G.cam.z = 24 * k;
    PF.set.shadow = 0;
    drawUnit(c, { k: id, o: G.ME, x: 0.6, y: 0.62, hp: 1, max: 1, a: id === 'plane' ? -0.6 : 0, ta: 0, id: 1 }, 0, 0, 0);
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
  for (const p of G.PR) {
    if (p.t < 0) continue;
    mctx.fillStyle = p.k === 'm' ? '#fff' : '#ffe27a';
    mctx.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2);
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
  if (G.phase === 'play' && (G.tool === 'missile' || G.tool === 'drone')) {
    const rr = G.tool === 'missile' ? mr(G.ME) : 30;
    const tp = G.tool === 'missile' ? 'silo' : 'dfac';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,230,150,.55)';
    for (const b of G.B) {
      if (b.dead || b.o !== G.ME || b.t !== tp) continue;
      ctx.beginPath();
      ctx.arc(R_ox + (b.x + 0.5) * z, R_oy + (b.y + 0.5) * z, rr * z, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
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
    if (p.k === 'm') {
      const dist = Math.hypot(p.tx - p.sx, p.ty - p.sy);
      const hh = Math.sin(Math.PI * p.t) * Math.min(dist * 0.2, 12) * z;
      drawMissile(ctx, p.o, px, py, z, hh);
    } else {
      ctx.fillStyle = '#111';
      ctx.fillRect(px - z * 0.3, py - z * 0.15, z * 0.6, z * 0.3);
      ctx.fillStyle = G.CS[p.o] || '#fff';
      ctx.fillRect(px - z * 0.12, py - z * 0.2, z * 0.24, z * 0.4);
      ctx.fillStyle = '#ddd';
      const w = (Math.floor(t / 60) % 2 ? 0.9 : 0.5) * z;
      ctx.fillRect(px - w / 2, py - z * 0.35, w, z * 0.1);
    }
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
  drawMini();
}
