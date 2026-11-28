import {
  ACOST,
  AID,
  ALLPAL,
  AR,
  BT,
  DCOST,
  DIFF,
  DR,
  LCOST,
  LEVELS,
  LR,
  MCOST,
  NCOST,
  NR,
  NRD,
  NRK,
  UN,
} from './constants.ts';
import { addCoins, PF, savePF, track, trackMax } from './profile.ts';
import {
  allocWorld,
  applyPalette,
  arcOf,
  bonusUp,
  crater,
  G,
  genTiles,
  hash,
  inView,
  isAlly,
  isFriend,
  mr,
  nameOf,
  paintMini,
  paintTerrain,
  planeCost,
  rng,
  samR,
  scorch,
  snd,
  tk,
  ucost,
  type Building,
  type MissionState,
  type Unit,
} from './world.ts';

export interface EndReward {
  coins: number;
  lines: string[];
  stars: number;
  win: boolean;
}

interface SimHooks {
  toast?: (m: string) => void;
  hud?: () => void;
  closeInfo?: () => void;
  offerUI?: () => void;
  dipRefresh?: () => void;
  onEndCapture?: () => void;
  onShowEnd?: (win: boolean, r: EndReward) => void;
}

const simHooks: SimHooks = {};
export function setSimHooks(next: SimHooks): void {
  Object.assign(simHooks, next);
}

export function say(m: string): void {
  simHooks.toast?.(m);
}

export function pct(k: number): string {
  const p = G.P[k];
  if (!p) return '0';
  const v = (p.tiles / G.landTotal) * 100;
  return G.NN >= 32 ? v.toFixed(1) : String(Math.round(v));
}

export function allyList(a: number): number[] {
  const r: number[] = [];
  for (let b = 1; b <= G.NN; b++) {
    if (isAlly(a, b) && G.P[b]?.alive) r.push(b);
  }
  return r;
}

export function allyCount(a: number): number {
  return allyList(a).length;
}

export function maxAllies(o: number): number {
  return 2 + tk(o, 'dip3') + tk(o, 'dip4');
}

export function relGet(a: number, b: number): number {
  return G.REL[a] ? G.REL[a][b] : 0;
}

function hostile(by: number | undefined, o: number, amt: number): void {
  if (by && o && by !== o && G.REL[o]) {
    G.REL[o][by] = Math.max(-100, G.REL[o][by] - amt);
  }
}

export function allyErr(o: number, tx: number, ty: number): string {
  if (tx < 0 || ty < 0 || tx >= G.W || ty >= G.H) return '';
  const i = Math.floor(ty) * G.W + Math.floor(tx);
  const f = G.OWN[i];
  if (isAlly(o, f)) return 'Это территория союзника. Сначала разорвите союз';
  const bi = G.BLD[i];
  if (bi >= 0 && G.B[bi] && isAlly(o, G.B[bi].o)) {
    return 'Это здание союзника. Сначала разорвите союз';
  }
  return '';
}

function bonusUpAll(id: string): number {
  return bonusUp(G.ME, id);
}

export function dipInit(): void {
  G.AL = [];
  G.REL = [];
  G.DCD = {};
  G.OFFER = null;
  G.GRUDGE = {};
  G.dipT = 3;
  G.dipOpen = 0;
  for (let a = 0; a <= G.NN; a++) {
    G.AL.push(new Uint8Array(G.NN + 1));
    G.REL.push(new Float32Array(G.NN + 1));
  }
  simHooks.offerUI?.();
}

export interface NewGameConfig {
  seed?: number;
  size?: number;
  diff?: number;
  colorId?: string;
  skin?: string;
  slot?: number;
  cols?: Record<number, string> | string[];
  skins?: Record<number, string> | string[];
  names?: Record<number, string>;
  enemies?: number[];
  humans?: number[];
  mission?: Partial<MissionState> | null;
  startMoney?: number;
  aiAggr?: number;
  paint?: boolean;
}

export function newGame(cfg: NewGameConfig = {}): void {
  const sd = cfg.seed != null ? cfg.seed : (Math.random() * 1e9) | 0;
  const sz = cfg.size || 0;
  if (sz !== G.curSize) {
    allocWorld(sz);
    G.tilesSeed = -1;
  }
  G.worldSeed = sd;
  G.WSEED = sd;
  if (G.tilesSeed !== sd) {
    genTiles(sd);
    paintMini();
    G.tilesSeed = sd;
  }
  if (cfg.paint !== false) paintTerrain();
  G.seed = (sd * 7 + 13) >>> 0;

  G.B = [];
  G.PR = [];
  G.EF = [];
  G.PT = [];
  G.BM = [];
  G.U = [];
  G.WK = [];
  G.RB = [];
  G.NK = [];
  G.OWN.fill(0);
  G.BLD.fill(-1);
  G.P = [null];
  G.selB = null;
  G.aim.on = false;
  G.brush = null;
  G.RS = { tankKills: 0, rpgKills: 0, annex: 0, sam: 0, built: 0, tanks: 0, assaults: 0, lost: 0, shared: false };

  if (cfg.diff != null) G.diff = cfg.diff;
  const D = DIFF[G.diff] || DIFF[1];
  G.ME = cfg.slot || 1;
  G.MISSION = cfg.mission ? ({ done: false, ...cfg.mission } as MissionState) : null;

  const used = new Set<string>();
  const colors: Array<string | null> = [];
  const myCol = cfg.colorId || PF.color;
  const colsMap = cfg.cols as Record<number, string> | undefined;
  for (let k = 1; k <= G.NN; k++) {
    colors[k] = colsMap ? colsMap[k] || null : k === G.ME ? myCol : null;
    if (colors[k]) used.add(colors[k]!);
  }
  const free = ALLPAL.filter((c) => !used.has(c.id));
  for (let k = 1; k <= G.NN; k++) {
    if (!colors[k]) {
      colors[k] = free.shift()?.id || ALLPAL[k % ALLPAL.length].id;
    }
  }

  const enemies = cfg.enemies;
  const humans = cfg.humans || [G.ME];
  const skinsMap = cfg.skins as Record<number, string> | undefined;

  for (let k = 1; k <= G.NN; k++) {
    const act = enemies ? k === G.ME || enemies.includes(k) || humans.includes(k) : true;
    const sk = skinsMap
      ? skinsMap[k] || 'solid'
      : k === G.ME
        ? cfg.skin || PF.skin
        : ['solid', 'stripes', 'checker', 'dots', 'camo'][(rng() * 5) | 0];
    const isHuman = humans.includes(k);
    const money = isHuman
      ? cfg.startMoney != null
        ? cfg.startMoney
        : 400 + bonusUpAll('cash') * 100
      : 350 * D.m;
    G.P.push({
      money,
      sol: 20 + (k === G.ME ? 60 * tk(k, 'army6') : 0),
      alive: act,
      active: act,
      sup: 0,
      dem: 0,
      eff: 1,
      aiT: 4 + rng() * 3,
      cnt: {},
      ucnt: {},
      tiles: 0,
      skill: D.sk + rng() * 0.3,
      inc: 0,
      aggr: (0.6 + rng() * 0.8) * (cfg.aiAggr || 1),
      human: isHuman,
      col: colors[k]!,
      skin: sk || 'solid',
    });
  }

  applyPalette(cfg.names);

  for (let k = 1; k <= G.NN; k++) {
    const p = G.P[k];
    const c = G.SC[k];
    if (!p?.active || !c) continue;
    for (let y = c.y - 6; y <= c.y + 6; y++) {
      for (let x = c.x - 6; x <= c.x + 6; x++) {
        if (x < 0 || y < 0 || x >= G.W || y >= G.H) continue;
        if (Math.hypot(x - c.x, y - c.y) <= 5 && G.T[y * G.W + x] >= 2) {
          G.OWN[y * G.W + x] = k;
        }
      }
    }
    addB('city', k, c.x, c.y, true);
  }

  dipInit();

  G.ownDirty = true;
  G.tilesDirty = true;
  G.gameT = 0;
  G.econT = 0;
  G.phase = 'intro';
  G.alarmT = 0;
  G.evT = 60;
  recount();
  G.cam.cx = G.W / 2;
  G.cam.cy = G.H / 2;
  G.cam.z = G.fitZ;
  G.camGoal = null;
}

export function addB(t: string, o: number, x: number, y: number, cap = false): Building {
  const m = Math.round((cap ? 300 * (1 + 0.5 * tk(o, 'fort4')) : BT[t].hp) * (1 + 0.15 * tk(o, 'fort1')));
  const b: Building = {
    t,
    o,
    x,
    y,
    hp: m,
    max: m,
    cap,
    cd: 0,
    dead: false,
    born: cap ? 0 : performance.now(),
  };
  G.BLD[y * G.W + x] = G.B.length;
  G.B.push(b);
  return b;
}

export function recount(): void {
  const td = G.tilesDirty;
  G.tilesDirty = false;
  for (let k = 1; k <= G.NN; k++) {
    const p = G.P[k];
    if (!p) continue;
    p.cnt = {};
    p.sup = 0;
    p.dem = 0;
    if (td) p.tiles = 0;
    p.ucnt = {};
  }
  for (const b of G.B) {
    if (b.dead) continue;
    const p = G.P[b.o];
    if (!p) continue;
    p.cnt[b.t] = (p.cnt[b.t] || 0) + 1;
    const e = b.cap ? 0 : BT[b.t].en;
    if (e > 0) p.sup += e;
    else p.dem -= e;
  }
  for (const u of G.U) {
    if (u.dead) continue;
    const p = G.P[u.o];
    if (p) p.ucnt[u.k] = (p.ucnt[u.k] || 0) + 1;
  }
  if (td) {
    for (let i = 0; i < G.N; i++) {
      const o = G.OWN[i];
      if (o && G.P[o]) G.P[o]!.tiles++;
    }
  }
  const D = DIFF[G.diff] || DIFF[1];
  for (let k = 1; k <= G.NN; k++) {
    const p = G.P[k];
    if (!p) continue;
    p.eff = p.dem <= p.sup ? 1 : p.sup / p.dem;
    p.inc =
      (2 + p.tiles * 0.03 + (p.cnt.city || 0) * 3) *
        Math.max(0.25, p.eff) *
        (p.human
          ? 1 + 0.08 * bonusUp(k, 'inc') + 0.1 * tk(k, 'eco1') + 0.15 * tk(k, 'eco2') + 0.2 * tk(k, 'eco3') + 0.25 * tk(k, 'eco4')
          : D.ai * 0.9) +
      (p.human ? p.tiles * 0.02 * tk(k, 'eco5') : 0);
  }
}

function dstStart(k: number, x: number, y: number): number {
  const c = G.SC[k];
  if (!c) return 999;
  return Math.max(0, Math.hypot(x - c.x, y - c.y) - 5);
}

export function paintAt(k: number, fx: number, fy: number, r: number): void {
  for (let y = Math.floor(fy - r); y <= Math.ceil(fy + r); y++) {
    for (let x = Math.floor(fx - r); x <= Math.ceil(fx + r); x++) {
      if (x < 0 || y < 0 || x >= G.W || y >= G.H || Math.hypot(x + 0.5 - fx, y + 0.5 - fy) > r) continue;
      const i = y * G.W + x;
      if (G.OWN[i] || G.T[i] < 2 || dstStart(k, x, y) > 5) continue;
      G.OWN[i] = k;
      G.ownDirty = true;
      G.tilesDirty = true;
    }
  }
}

export function paintMe(x: number, y: number, r: number): void {
  paintAt(G.ME, x, y, r);
}

function ring(x: number, y: number, r: number, c: string, life: number): void {
  G.EF.push({ x, y, r, c, life, max: life });
}

function sparks(x: number, y: number, n: number, spd: number, cols: string[], s: number): void {
  const q = [0, 0.5, 1][PF.set.part] ?? 1;
  const count = Math.round(n * q);
  for (let i = 0; i < count; i++) {
    const a = rng() * 6.283;
    const v = spd * (0.3 + rng());
    const l = 0.4 + rng() * 0.6;
    G.PT.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: l,
      max: l,
      c: cols[(rng() * cols.length) | 0],
      s: s * (0.5 + rng()),
    });
  }
}

function hitUnit(u: Unit, dmg: number, byO?: number, byK?: string): void {
  if (u.dead) return;
  u.hp -= dmg;
  if (u.hp <= 0) {
    u.dead = true;
    sparks(
      u.x,
      u.y,
      u.k === 'plane' ? 14 : u.k === 'tank' || u.k === 'howitzer' ? 24 : 10,
      3,
      ['#ffb02e', '#ff6b2e', '#555', '#222'],
      0.35,
    );
    ring(u.x, u.y, 1.2, '#ff8a3d', 0.4);
    if (u.k === 'tank' || u.k === 'howitzer') {
      G.WK.push({
        x: u.x,
        y: u.y,
        a: u.a || 0,
        ta: u.ta === undefined ? u.a || 0 : u.ta,
        k: u.k,
        o: u.o,
        t0: performance.now(),
      });
      if (G.WK.length > 40) G.WK.shift();
    }
    if (inView(u.x, u.y)) snd(u.k === 'plane' ? 200 : 130, 0.3, 'sawtooth', 0.06, 40);
    if (byO === G.ME && u.o !== G.ME) {
      if (u.k === 'tank') {
        G.RS.tankKills++;
        track('tankKills');
        if (byK === 'rpg') {
          G.RS.rpgKills++;
          track('rpgKills');
        }
      }
    }
  }
}

export function boom(x: number, y: number, r: number, dmg: number, by?: number): void {
  ring(x, y, r + 1, '#ffd27a', 0.45);
  sparks(x, y, Math.round(8 + r * 8), 3 + r * 2, ['#ffb02e', '#ff6b2e', '#ffe27a', '#555'], 0.35);
  if (r >= 1 && PF.set.part) {
    G.PT.push({ x, y, vx: 0, vy: -0.6, life: 1.4, max: 1.4, c: '#4a4a4a', s: r * 0.9 });
  }
  if (inView(x, y)) {
    snd(r >= 2 ? 90 : 150, r >= 2 ? 0.5 : 0.25, 'sawtooth', r >= 2 ? 0.14 : 0.07, 30);
    if (r >= 2) G.shake = Math.max(G.shake, 7);
  }
  if (r >= 1) crater(x, y, r * 0.85);
  if (dmg > 0) {
    for (const b of G.B) {
      if (b.dead || (by && isFriend(by, b.o))) continue;
      const d = Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y);
      if (d <= r + 0.6) {
        b.hp -= dmg * (1 - (0.6 * d) / (r + 0.6));
        hostile(by, b.o, 0.5);
        if (b.hp <= 0) destroyB(b, by);
      }
    }
    for (const u of G.U) {
      if (u.dead || u.k === 'plane' || (by && isFriend(by, u.o))) continue;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d <= r + 0.6) {
        hitUnit(u, dmg * (1 - (0.6 * d) / (r + 0.6)) * (u.k === 'tank' ? 0.55 : 1.2), by, 'boom');
      }
    }
  }
}

function destroyB(b: Building, by?: number): void {
  if (b.dead) return;
  b.dead = true;
  G.BLD[b.y * G.W + b.x] = -1;
  if (b.o === G.ME && !b.cap) G.RS.lost = (G.RS.lost || 0) + 1;
  sparks(b.x + 0.5, b.y + 0.5, 22, 4, ['#ffb02e', '#ff6b2e', '#444', '#888'], 0.4);
  ring(b.x + 0.5, b.y + 0.5, 2.2, '#ff8a3d', 0.6);
  G.RB.push({ x: b.x, y: b.y, t: b.t, cap: b.cap, t0: performance.now() });
  if (G.RB.length > 60) G.RB.shift();
  if (b.cap) {
    if (by && by !== b.o) annex(b.o, by);
    else eliminate(b.o);
  }
}

function killUnitsOf(o: number): void {
  for (const u of G.U) if (u.o === o) u.dead = true;
}

function eliminate(o: number): void {
  const p = G.P[o];
  if (!p?.alive) return;
  p.alive = false;
  killUnitsOf(o);
  for (const b of G.B) {
    if (b.o === o && !b.dead) {
      b.dead = true;
      G.BLD[b.y * G.W + b.x] = -1;
      sparks(b.x + 0.5, b.y + 0.5, 10, 3, ['#ffb02e', '#555'], 0.35);
    }
  }
  for (let i = 0; i < G.N; i++) if (G.OWN[i] === o) G.OWN[i] = 0;
  G.ownDirty = true;
  G.tilesDirty = true;
  say(o === G.ME ? 'Ваша столица уничтожена' : `${G.NAMES[o]} повержена`);
  checkEnd();
}

function annex(f: number, h: number): void {
  const pf = G.P[f];
  const ph = G.P[h];
  if (!pf?.alive || !ph) return;
  pf.alive = false;
  killUnitsOf(f);
  ph.money += pf.money * 0.5;
  ph.sol = Math.min(300, ph.sol + pf.sol * 0.5);
  pf.money = 0;
  pf.sol = 0;
  for (const b of G.B) {
    if (b.o === f && !b.dead) {
      b.o = h;
      b.hp = Math.max(10, b.hp * 0.6);
      if (b.cap) {
        b.cap = false;
        b.max = BT.city.hp;
        b.hp = Math.min(b.hp, b.max);
      }
    }
  }
  for (let i = 0; i < G.N; i++) if (G.OWN[i] === f) G.OWN[i] = h;
  G.ownDirty = true;
  G.tilesDirty = true;
  const sc = G.SC[f];
  if (sc) {
    ring(sc.x + 0.5, sc.y + 0.5, 6, G.CS[h], 0.9);
    sparks(sc.x + 0.5, sc.y + 0.5, 24, 4, [G.CS[h], '#fff'], 0.4);
  }
  if (h === G.ME) {
    G.RS.annex++;
    track('annex');
  }
  recount();
  say(`${G.NAMES[f]} капитулировала. Территория и города отходят: ${G.NAMES[h]}`);
  checkEnd();
}

export function finishGame(win: boolean): void {
  if (G.phase === 'end') return;
  G.phase = 'end';
  const r: EndReward = { coins: 0, lines: [], stars: 0, win };

  if (G.MISSION && G.MISSION.type === 'tut') {
    const first = PF.tutDone !== 1;
    PF.tutDone = 1;
    track('tutorial');
    if (first) {
      r.coins = 100;
      r.lines.push('Обучение пройдено: +100');
    } else {
      r.coins = 10;
      r.lines.push('Повторное обучение: +10');
    }
  } else if (G.MISSION) {
    const L = LEVELS[G.MISSION.idx];
    if (win && L) {
      const cap = G.B.find((b) => b.cap && b.o === G.ME);
      let st = 1;
      if (cap && cap.hp >= cap.max * 0.6) st++;
      if (G.MISSION.type === 'survive') {
        if (!(G.RS.lost > 0)) st++;
      } else if (G.gameT <= G.MISSION.par) {
        st++;
      }
      r.stars = st;
      const prev = PF.cstars[L.id] || 0;
      if (prev === 0) {
        r.coins = 60 + 40 * st;
        track('campDone');
        r.lines.push(`Первое прохождение: +${r.coins}`);
      } else if (st > prev) {
        r.coins = 20 * (st - prev) + 10;
        r.lines.push(`Новые звёзды: +${r.coins}`);
      } else {
        r.coins = 10;
        r.lines.push('Повторное прохождение: +10');
      }
      if (st > prev) PF.cstars[L.id] = st;
    } else {
      r.coins = 5;
      r.lines.push('Попытка: +5');
    }
  } else {
    if (win) {
      const m = DIFF[G.diff].r * [1, 1.5, 2, 3, 4][G.curSize];
      let base = Math.round(100 * m);
      if (G.RS.shared) {
        base = Math.round(base * 0.7);
        r.lines.push('Союзная победа: награда 70%');
      }
      if (G.curSize >= 2) track('winsHuge');
      r.coins = base;
      r.lines.push(`Победа: +${base}`);
      track('wins');
      if (G.diff === 2) track('winsHard');
    } else {
      r.coins = 15;
      r.lines.push('Участие: +15');
    }
    if (G.RS.annex > 0) {
      const b = G.RS.annex * (win ? 25 : 10);
      r.coins += b;
      r.lines.push(`Присоединено стран: ${G.RS.annex} (+${b})`);
    }
  }

  const dr = G.MISSION ? (win ? 15 : 0) : win ? 25 : -10;
  if (dr) {
    PF.rating = Math.max(0, PF.rating + dr);
    r.lines.push(`Рейтинг: ${dr > 0 ? '+' : ''}${dr}`);
  }
  addCoins(r.coins);
  savePF();
  simHooks.onShowEnd?.(win, r);
}

export function checkEnd(): void {
  if (G.phase === 'end') return;
  if (!G.P[G.ME]?.alive) {
    finishGame(false);
    return;
  }
  if (G.MISSION && G.MISSION.type !== 'elim') return;
  if (G.P.every((p, i) => !p || i === G.ME || !p.alive || isAlly(G.ME, i))) {
    G.RS.shared = G.P.some((p, i) => Boolean(p && i !== G.ME && p.alive));
    finishGame(true);
  }
}

export function canPlace(o: number, t: string, x: number, y: number): string {
  const i = y * G.W + x;
  if (x < 0 || y < 0 || x >= G.W || y >= G.H) return 'Вне карты';
  if (G.OWN[i] !== o) return 'Стройте на своей земле';
  if (G.T[i] < 2 || G.T[i] > 4) return 'Здесь строить нельзя';
  if (G.BLD[i] >= 0) return 'Клетка занята';
  if ((G.P[o]?.money || 0) < BT[t].c) return 'Не хватает денег';
  return '';
}

export function place(o: number, t: string, x: number, y: number): string {
  const e = canPlace(o, t, x, y);
  if (e) return e;
  G.P[o]!.money -= BT[t].c;
  addB(t, o, x, y);
  ring(x + 0.5, y + 0.6, 1.4, '#e8e2d0', 0.45);
  sparks(x + 0.5, y + 0.9, 6, 1.6, ['#e8e2d0', '#b9b29a', '#8d917f'], 0.25);
  recount();
  if (o === G.ME) {
    snd(300, 0.12, 'square', 0.05, 500);
    G.RS.built++;
    track('built');
  }
  return '';
}

export function nearestB(o: number, type: string, x: number, y: number, maxR = 1e9): Building | null {
  let best: Building | null = null;
  let bd = maxR;
  for (const b of G.B) {
    if (!b.dead && b.o === o && b.t === type) {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d <= bd) {
        bd = d;
        best = b;
      }
    }
  }
  return best;
}

export function launchMissile(o: number, tx: number, ty: number): string {
  const p = G.P[o];
  if (!p?.cnt.silo) return 'Нужна ракетная шахта';
  const ae = allyErr(o, tx, ty);
  if (ae) return ae;
  const s = nearestB(o, 'silo', tx, ty, mr(o));
  if (!s) return `Цель дальше ${mr(o)} км от ваших шахт`;
  if (p.money < MCOST) return 'Не хватает денег';
  p.money -= MCOST;
  const d = Math.hypot(tx - s.x, ty - s.y);
  G.PR.push({
    k: 'm',
    o,
    sx: s.x + 0.5,
    sy: s.y + 0.5,
    tx,
    ty,
    x: s.x + 0.5,
    y: s.y + 0.5,
    t: 0,
    dur: Math.max(1.6, d / 11),
    w: 0,
    hp: 2,
  });
  ring(s.x + 0.5, s.y + 0.5, 2, '#fff', 0.4);
  s.lt = performance.now();
  s.nk = 0;
  if (o === G.ME) {
    snd(200, 0.6, 'sawtooth', 0.06, 900);
    track('missiles');
  }
  return '';
}

export function launchNuke(o: number, tx: number, ty: number): string {
  const p = G.P[o];
  if (!p?.cnt.silo) return 'Нужна ракетная шахта';
  const ae = allyErr(o, tx, ty);
  if (ae) return ae;
  const s = nearestB(o, 'silo', tx, ty, NR);
  if (!s) return `Цель дальше ${NR} км от ваших шахт`;
  if (p.money < NCOST) return `Нужно ${NCOST} монет`;
  p.money -= NCOST;
  const d = Math.hypot(tx - s.x, ty - s.y);
  G.PR.push({
    k: 'n',
    o,
    sx: s.x + 0.5,
    sy: s.y + 0.5,
    tx,
    ty,
    x: s.x + 0.5,
    y: s.y + 0.5,
    t: 0,
    dur: Math.max(8, d / 6),
    w: 0,
    hp: 6,
  });
  s.lt = performance.now();
  s.nk = 1;
  ring(s.x + 0.5, s.y + 0.5, 3, '#ff5a3a', 0.8);
  say(`${o === G.ME ? 'Вы запустили' : `${G.NAMES[o]} запустила`} ядерную ракету!`);
  if (inView(s.x, s.y) || o === G.ME) snd(120, 1.2, 'sawtooth', 0.1, 40);
  if (o === G.ME) track('nukes');
  return '';
}

function nukeFx(x: number, y: number): void {
  G.NK.push({ x, y, t0: performance.now() });
  if (G.NK.length > 4) G.NK.shift();
  G.shake = Math.max(G.shake, inView(x, y) ? 34 : 16);
  snd(60, 2.6, 'sawtooth', 0.22, 16);
  setTimeout(() => snd(110, 1.4, 'square', 0.12, 25), 150);
  setTimeout(() => snd(220, 0.7, 'sawtooth', 0.08, 40), 500);
  scorch(x, y, NRK * 1.15);
  sparks(x, y, 60, 9, ['#fff3c0', '#ffb02e', '#ff6b2e', '#ffe27a'], 0.5);
  ring(x, y, NRD * 1.5, '#fff3c0', 1.6);
  ring(x, y, NRK * 1.2, '#ff9a3a', 1.1);
}

function nukeBlast(x: number, y: number, by?: number): void {
  nukeFx(x, y);
  const hit = new Set<number>();
  for (const b of G.B) {
    if (b.dead) continue;
    const d = Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y);
    if (d > NRD) continue;
    hit.add(b.o);
    if (d <= NRK) b.hp = 0;
    else b.hp -= b.max * 1.2 * (1 - (d - NRK) / (NRD - NRK));
    if (b.hp <= 0) destroyB(b);
    else sparks(b.x + 0.5, b.y + 0.5, 6, 3, ['#ffb02e', '#555'], 0.3);
  }
  for (const u of G.U) {
    if (u.dead || u.k === 'plane') continue;
    if (Math.hypot(u.x - x, u.y - y) <= NRD) hitUnit(u, 9999, by, 'nuke');
  }
  for (const p of G.PR) {
    if (!p.dead && Math.hypot(p.x - x, p.y - y) <= NRK) p.dead = true;
  }
  for (let yy = Math.floor(y - NRK); yy <= Math.ceil(y + NRK); yy++) {
    for (let xx = Math.floor(x - NRK); xx <= Math.ceil(x + NRK); xx++) {
      if (xx < 0 || yy < 0 || xx >= G.W || yy >= G.H) continue;
      if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) > NRK * (0.88 + 0.12 * hash(xx, yy, 5))) continue;
      G.OWN[yy * G.W + xx] = 0;
    }
  }
  G.ownDirty = true;
  G.tilesDirty = true;
  if (by) {
    for (let k = 1; k <= G.NN; k++) if (k !== by && G.P[k]?.alive) hostile(by, k, 25);
    for (const v of hit) if (v !== by && isAlly(by, v)) breakAlliance(by, v);
  }
  recount();
}

export function launchDrones(o: number, tx: number, ty: number): string {
  const p = G.P[o];
  if (!p?.cnt.dfac) return 'Нужен завод дронов';
  const ae = allyErr(o, tx, ty);
  if (ae) return ae;
  const s = nearestB(o, 'dfac', tx, ty, DR);
  if (!s) return `Цель дальше ${DR} км от ваших заводов`;
  if (p.money < DCOST) return 'Не хватает денег';
  p.money -= DCOST;
  const d = Math.hypot(tx - s.x, ty - s.y);
  for (let i = 0; i < 3; i++) {
    G.PR.push({
      k: 'd',
      o,
      sx: s.x + 0.5,
      sy: s.y + 0.5,
      tx: tx + (rng() - 0.5) * 1.6,
      ty: ty + (rng() - 0.5) * 1.6,
      x: s.x + 0.5,
      y: s.y + 0.5,
      t: -i * 0.04,
      dur: Math.max(2, d / 4.2),
      w: rng() * 6,
      hp: 1,
    });
  }
  if (o === G.ME) snd(400, 0.3, 'triangle', 0.05, 250);
  return '';
}

export function assaultInfo(o: number, tx: number, ty: number): { err: string; cost: number; amph: boolean } {
  const p = G.P[o];
  if (!p) return { err: 'Ошибка', cost: ACOST, amph: false };
  if (tx < 0 || ty < 0 || tx >= G.W || ty >= G.H) return { err: 'Вне карты', cost: ACOST, amph: false };
  if (G.T[ty * G.W + tx] < 2) return { err: 'На воду не высадиться', cost: ACOST, amph: false };
  if (isAlly(o, G.OWN[ty * G.W + tx])) {
    return { err: 'Это земля союзника. Сначала разорвите союз', cost: ACOST, amph: false };
  }
  let n2 = 1e9;
  const y0 = Math.max(0, ty - LR);
  const y1 = Math.min(G.H - 1, ty + LR);
  const x0 = Math.max(0, tx - LR);
  const x1 = Math.min(G.W - 1, tx + LR);
  for (let y = y0; y <= y1; y++) {
    const dy = (y - ty) * (y - ty);
    const row = y * G.W;
    for (let x = x0; x <= x1; x++) {
      if (G.OWN[row + x] !== o) continue;
      const d = (x - tx) * (x - tx) + dy;
      if (d < n2) n2 = d;
    }
  }
  const near = Math.sqrt(n2);
  if (near > LR) return { err: `Дальше ${LR} км от вашей земли`, cost: ACOST, amph: false };
  const amph = near > AR;
  const cost = amph ? LCOST : ACOST;
  if (p.sol < cost) return { err: `Мало солдат: нужно ${cost}`, cost, amph };
  return { err: '', cost, amph };
}

export function defenseAt(f: number, x: number, y: number): number {
  const p = G.P[f];
  if (!p) return 0;
  let s = p.sol * 0.12 + 10 * tk(f, 'fort3') + 8 * tk(f, 'fort5');
  for (const b of G.B) {
    if (b.dead || b.o !== f) continue;
    if (Math.hypot(b.x - x, b.y - y) <= 7) {
      if (b.cap) s += 16;
      else if (b.t === 'barracks') s += 12;
      else if (b.t === 'city') s += 3;
    }
  }
  for (const u of G.U) {
    if (u.dead || u.o !== f || u.k === 'plane') continue;
    if (Math.hypot(u.x - x, u.y - y) <= 6) s += u.k === 'tank' ? 9 : 3;
  }
  return s;
}

export function assault(o: number, tx: number, ty: number): string {
  const info = assaultInfo(o, tx, ty);
  if (info.err) return info.err;
  const p = G.P[o]!;
  const f = G.OWN[ty * G.W + tx];
  const enemy = Boolean(f && f !== o);
  p.sol -= info.cost;
  const att = info.cost * (info.amph ? 1 : 1.3) * (1 + 0.12 * bonusUp(o, 'assault') + 0.15 * tk(o, 'army7'));
  const def = enemy ? defenseAt(f, tx, ty) : 0;
  const rho = def > 0 ? att / def : 9;

  if (enemy && rho < 0.6) {
    G.P[f]!.sol = Math.max(0, G.P[f]!.sol - att * 0.3);
    ring(tx + 0.5, ty + 0.5, 2, '#888', 0.5);
    sparks(tx + 0.5, ty + 0.5, 10, 2.5, ['#888', '#ffb02e'], 0.3);
    return `Штурм отбит. Оборона врага ${Math.round(def)}, ваша сила ${Math.round(att)}`;
  }
  if (enemy) G.P[f]!.sol = Math.max(0, G.P[f]!.sol - att * 0.5);

  const r = (info.amph ? 3.6 : 3) * (enemy ? Math.min(1.5, 0.7 + rho * 0.4) : 1);
  let capHit: number | null = null;
  for (let y = Math.floor(ty - r); y <= Math.ceil(ty + r); y++) {
    for (let x = Math.floor(tx - r); x <= Math.ceil(tx + r); x++) {
      if (x < 0 || y < 0 || x >= G.W || y >= G.H || Math.hypot(x - tx, y - ty) > r) continue;
      const i = y * G.W + x;
      if (G.T[i] < 2 || isFriend(o, G.OWN[i])) continue;
      const bi = G.BLD[i];
      const b = bi >= 0 ? G.B[bi] : null;
      if (b && b.cap && !isFriend(o, b.o)) {
        b.hp -= 60;
        sparks(b.x + 0.5, b.y + 0.5, 8, 3, ['#ffb02e', '#555'], 0.3);
        if (b.hp <= 0) capHit = b.o;
        continue;
      }
      G.OWN[i] = o;
      G.ownDirty = true;
      G.tilesDirty = true;
      if (b && !b.dead) {
        b.o = o;
        b.hp = Math.max(10, b.hp * 0.6);
      }
    }
  }
  ring(tx + 0.5, ty + 0.5, r + 1, G.CS[o], 0.6);
  sparks(tx + 0.5, ty + 0.5, 12, 3, [G.CS[o], '#fff'], 0.3);
  if (o === G.ME) {
    snd(180, 0.2, 'square', 0.06, 120);
    track('assaults');
    if (info.amph) track('landings');
  }
  recount();
  if (capHit) annex(capHit, o);
  return '';
}

export function repair(b: Building): string {
  if (b.dead || b.o !== G.ME) return 'Это не ваше здание';
  const need = b.max - b.hp;
  if (need < 1) return 'Здание целое';
  const c = Math.ceil(need * 0.5 * (1 - 0.3 * tk(G.ME, 'fort2')));
  if (G.P[G.ME]!.money < c) return `Не хватает денег: ${c}`;
  G.P[G.ME]!.money -= c;
  b.hp = b.max;
  return '';
}

const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];
let FQ: Int32Array | null = null;

export function mkField(tx: number, ty: number, sx?: number, sy?: number): Int16Array | null {
  const { W, H, N, T } = G;
  if (tx < 0 || ty < 0 || tx >= W || ty >= H || T[ty * W + tx] < 2) return null;
  if (!FQ || FQ.length !== N) FQ = new Int32Array(N);
  const f = new Int16Array(N).fill(-1);
  const q = FQ;
  const si = sx === undefined || sy === undefined ? -1 : sy * W + sx;
  let h = 0;
  let t = 0;
  f[ty * W + tx] = 0;
  q[t++] = ty * W + tx;
  while (h < t) {
    const i = q[h++];
    if (i === si) break;
    const x = i % W;
    const y = (i / W) | 0;
    const d = f[i] + 1;
    for (let k = 0; k < 8; k++) {
      const nx = x + DX[k];
      const ny = y + DY[k];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (f[j] >= 0 || T[j] < 2) continue;
      if (DX[k] && DY[k] && (T[y * W + nx] < 2 || T[ny * W + x] < 2)) continue;
      f[j] = d;
      q[t++] = j;
    }
  }
  return f;
}

function unitCount(o: number): number {
  let n = 0;
  for (const u of G.U) if (!u.dead && u.o === o) n++;
  return n;
}

function mkUnit(k: 'tank' | 'rpg' | 'plane' | 'howitzer', o: number, x: number, y: number): Unit {
  const d = UN[k];
  let hp = d.hp;
  if (k === 'tank') hp *= 1 + 0.15 * bonusUp(o, 'armor') + 0.2 * tk(o, 'army3');
  const u: Unit = {
    id: G.uid++,
    k,
    o,
    x: x + 0.5,
    y: y + 0.5,
    hp,
    max: hp,
    cd: k === 'howitzer' ? 1.5 : 0.5,
    a: 0,
    ta: 0,
    dead: false,
    scan: 0,
    cap: 1,
    hold: false,
    wp: null,
    f: null,
  };
  G.U.push(u);
  return u;
}

export function orderGround(o: number, k: 'tank' | 'rpg' | 'howitzer', tx: number, ty: number, srcType: string): string {
  const p = G.P[o];
  if (!p) return 'Ошибка';
  const lim = p.human ? 30 : 14;
  if (unitCount(o) >= lim) return `Лимит техники: ${lim}`;
  if (tx < 0 || ty < 0 || tx >= G.W || ty >= G.H) return 'Вне карты';
  if (G.T[ty * G.W + tx] < 2) return 'Цель в воде';
  const ae = allyErr(o, tx, ty);
  if (ae) return ae;
  const src = nearestB(o, srcType, tx, ty);
  if (!src) return srcType === 'factory' ? 'Нужен завод техники' : 'Нужна казарма';
  const d = UN[k];
  const dc = ucost(o, k);
  if (p.money < dc) return 'Не хватает денег';
  if (p.sol < d.sol) return `Мало солдат: нужно ${d.sol}`;
  const f = mkField(tx, ty, src.x, src.y);
  if (!f || f[src.y * G.W + src.x] < 0) {
    return 'Цель на другом острове. Нужны самолёты, ракеты или десант';
  }
  p.money -= dc;
  p.sol -= d.sol;
  const u = mkUnit(k, o, src.x, src.y);
  u.f = f;
  u.tx = tx + 0.5;
  u.ty = ty + 0.5;
  ring(src.x + 0.5, src.y + 0.5, 1.2, G.CS[o], 0.4);
  if (o === G.ME) {
    if (k === 'tank') {
      G.RS.tanks++;
      track('tanks');
    }
    if (k === 'howitzer') track('howitzers');
    snd(160, 0.25, 'square', 0.05, 110);
  }
  return '';
}

export function orderPlane(o: number, tx: number, ty: number): string {
  const p = G.P[o];
  if (!p) return 'Ошибка';
  const lim = p.human ? 30 : 14;
  if (unitCount(o) >= lim) return `Лимит техники: ${lim}`;
  if (tx < 0 || ty < 0 || tx >= G.W || ty >= G.H) return 'Вне карты';
  if (!p.cnt.airfield) return 'Нужен аэродром';
  const ae = allyErr(o, tx, ty);
  if (ae) return ae;
  const src = nearestB(o, 'airfield', tx, ty, 70);
  if (!src) return 'Цель дальше 70 км от аэродромов';
  const pc = planeCost(o);
  if (p.money < pc) return 'Не хватает денег';
  p.money -= pc;
  const u = mkUnit('plane', o, src.x + 0.22, src.y + 0.035);
  u.tx = tx;
  u.ty = ty;
  u.hx = src.x + 0.72;
  u.hy = src.y + 0.535;
  u.bombs = 4 + 2 * tk(o, 'air7');
  u.bt = 0;
  u.ret = false;
  u.age = 0;
  u.alt = 0;
  src.lt = performance.now();
  if (o === G.ME) {
    track('planes');
    snd(300, 0.5, 'sawtooth', 0.05, 700);
  }
  return '';
}

function findTarget(u: Unit): { unit?: Unit; b?: Building } | null {
  const d = UN[u.k];
  const R = d.rg;
  const mn = d.min || 0;
  let best: { unit?: Unit; b?: Building } | null = null;
  let bs = 1e9;
  for (const v of G.U) {
    if (v.dead || v.k === 'plane') continue;
    const ax = v.x - u.x;
    const ay = v.y - u.y;
    if (ax > R || ax < -R || ay > R || ay < -R || isFriend(v.o, u.o)) continue;
    const dd = Math.hypot(ax, ay);
    if (dd > R || dd < mn) continue;
    const pri =
      u.k === 'howitzer'
        ? v.k === 'tank' || v.k === 'howitzer'
          ? 0
          : v.k === 'rpg'
            ? 1
            : 2
        : u.k === 'rpg' && v.k === 'tank'
          ? 0
          : u.k === 'tank' && v.k === 'tank'
            ? 1
            : 2;
    const s = pri * 10 + dd;
    if (s < bs) {
      bs = s;
      best = { unit: v };
    }
  }
  if (best) return best;
  for (const b of G.B) {
    if (b.dead) continue;
    const ax = b.x + 0.5 - u.x;
    const ay = b.y + 0.5 - u.y;
    if (ax > R || ax < -R || ay > R || ay < -R || isFriend(b.o, u.o)) continue;
    const dd = Math.hypot(ax, ay);
    if (dd <= R && dd >= mn && dd < bs) {
      bs = dd;
      best = { b };
    }
  }
  return best;
}

function stepUnit(u: Unit, dt: number): void {
  const { W, H, T } = G;
  const f = u.f;
  if (!f) {
    u.hold = true;
    return;
  }
  const ix = Math.floor(u.x);
  const iy = Math.floor(u.y);
  const i = iy * W + ix;
  const cur = f[i];
  if (cur === 0 || cur < 0) {
    if (cur < 0) u.f = null;
    u.hold = true;
    return;
  }
  if (!u.wp || Math.hypot(u.x - u.wp.x, u.y - u.wp.y) < 0.12) {
    let best: { x: number; y: number } | null = null;
    let bv = cur;
    for (let k = 0; k < 8; k++) {
      const nx = ix + DX[k];
      const ny = iy + DY[k];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (f[j] < 0 || f[j] >= bv) continue;
      if (DX[k] && DY[k] && (T[iy * W + nx] < 2 || T[ny * W + ix] < 2)) continue;
      bv = f[j];
      best = { x: nx, y: ny };
    }
    if (!best) {
      u.hold = true;
      return;
    }
    u.wp = { x: best.x + 0.5, y: best.y + 0.5 };
  }
  const dx = u.wp.x - u.x;
  const dy = u.wp.y - u.y;
  const dist = Math.hypot(dx, dy) || 1;
  const sp = UN[u.k].sp * (u.k === 'tank' ? 1 + 0.15 * tk(u.o, 'army8') : 1) * (T[i] >= 5 ? 0.6 : 1) * dt;
  const m = Math.min(sp, dist);
  u.x += (dx / dist) * m;
  u.y += (dy / dist) * m;
  const ta = Math.atan2(dy, dx);
  let da = ta - u.a;
  while (da > Math.PI) da -= 6.283;
  while (da < -Math.PI) da += 6.283;
  u.a += da * Math.min(1, dt * 8);
  u.ta = u.a;
}

function howitzerFire(u: Unit, tg: { unit?: Unit; b?: Building }): void {
  const tx = tg.unit ? tg.unit.x : tg.b!.x + 0.5;
  const ty = tg.unit ? tg.unit.y : tg.b!.y + 0.5;
  u.ta = Math.atan2(ty - u.y, tx - u.x);
  const d = Math.hypot(tx - u.x, ty - u.y);
  const sc = 0.3 + d * 0.05;
  const a = rng() * 6.283;
  const r = Math.sqrt(rng()) * sc;
  const dm = (UN.howitzer.shell || 70) * (1 + 0.2 * tk(u.o, 'army5'));
  G.PR.push({
    k: 's',
    o: u.o,
    sx: u.x,
    sy: u.y,
    tx: tx + Math.cos(a) * r,
    ty: ty + Math.sin(a) * r,
    x: u.x,
    y: u.y,
    t: 0,
    dur: Math.max(0.9, d / 9),
    w: 0,
    hp: 1,
    dmg: dm,
  });
  u.fireAt = performance.now();
  const ca = Math.cos(u.ta);
  const sa = Math.sin(u.ta);
  if (PF.set.part) {
    for (let i = 0; i < 5; i++) {
      G.PT.push({
        x: u.x + ca * 1.1 + (rng() - 0.5) * 0.4,
        y: u.y + sa * 1.1 + (rng() - 0.5) * 0.4,
        vx: ca * 0.8 + (rng() - 0.5) * 0.5,
        vy: sa * 0.8 + (rng() - 0.5) * 0.5,
        life: 0.9 + rng() * 0.5,
        max: 1.4,
        c: '#e6e6ea',
        s: 0.45,
      });
    }
  }
  ring(u.x, u.y, 1.6, '#d8c9a0', 0.35);
  if (inView(u.x, u.y)) snd(100, 0.35, 'sawtooth', 0.09, 45);
}

function unitFire(u: Unit, tg: { unit?: Unit; b?: Building }): void {
  if (u.k === 'howitzer') {
    howitzerFire(u, tg);
    return;
  }
  const d = UN[u.k];
  let dm: number;
  if (tg.unit) {
    const v = tg.unit;
    dm = d.dmg[v.k] || 10;
    u.ta = Math.atan2(v.y - u.y, v.x - u.x);
  } else {
    dm = d.dmg.b;
    const kb = tg.b!;
    u.ta = Math.atan2(kb.y + 0.5 - u.y, kb.x + 0.5 - u.x);
  }
  if (u.k === 'rpg') dm *= 1 + 0.15 * bonusUp(u.o, 'rpg') + 0.2 * tk(u.o, 'army2');
  if (u.k === 'tank') dm *= 1 + 0.2 * tk(u.o, 'army5');
  const tx = tg.unit ? tg.unit.x : tg.b!.x + 0.5;
  const ty = tg.unit ? tg.unit.y : tg.b!.y + 0.5;
  const ca = Math.cos(u.ta);
  const sa = Math.sin(u.ta);
  const mz = u.k === 'tank' ? 0.72 : 0.5;
  u.fireAt = performance.now();
  G.BM.push({
    x1: u.x + ca * mz,
    y1: u.y + sa * mz,
    x2: tx,
    y2: ty,
    life: 0.12,
    c: u.k === 'rpg' ? '#ff9a4a' : '#ffe9a0',
  });
  if (PF.set.part) {
    G.PT.push({
      x: u.x + ca * mz,
      y: u.y + sa * mz,
      vx: ca * 0.5,
      vy: sa * 0.5,
      life: 0.55,
      max: 0.55,
      c: '#d8d8dc',
      s: 0.28,
    });
    if (u.k === 'rpg') {
      G.PT.push({
        x: u.x - ca * 0.35,
        y: u.y - sa * 0.35,
        vx: -ca * 0.9,
        vy: -sa * 0.9,
        life: 0.6,
        max: 0.6,
        c: '#e6e0d0',
        s: 0.35,
      });
    }
  }
  sparks(tx, ty, 4, 2, ['#ffb02e', '#ffe27a'], 0.25);
  if (inView(u.x, u.y)) snd(u.k === 'rpg' ? 320 : 220, 0.1, 'square', 0.03, 90);
  if (tg.unit) hitUnit(tg.unit, dm, u.o, u.k);
  else if (tg.b) {
    tg.b.hp -= dm;
    if (tg.b.hp <= 0) destroyB(tg.b, u.o);
  }
}

function occupy(u: Unit): void {
  if (G.P[u.o] && !G.P[u.o]!.alive) return;
  for (const v of G.U) {
    if (!v.dead && !isFriend(v.o, u.o) && v.k !== 'plane' && Math.hypot(v.x - u.x, v.y - u.y) < 4) return;
  }
  let n = 0;
  const cx = Math.floor(u.x);
  const cy = Math.floor(u.y);
  for (let y = cy - 3; y <= cy + 3; y++) {
    for (let x = cx - 3; x <= cx + 3; x++) {
      if (x < 0 || y < 0 || x >= G.W || y >= G.H || Math.hypot(x + 0.5 - u.x, y + 0.5 - u.y) > 2.5) continue;
      const i = y * G.W + x;
      if (G.T[i] < 2 || isFriend(G.OWN[i], u.o)) continue;
      const bi = G.BLD[i];
      if (bi >= 0 && G.B[bi] && !isFriend(G.B[bi].o, u.o)) continue;
      G.OWN[i] = u.o;
      n++;
    }
  }
  if (n) {
    G.ownDirty = true;
    G.tilesDirty = true;
    recount();
    if (u.o === G.ME) track('assaults');
  }
}

function updateUnits(dt: number): void {
  for (const u of G.U) {
    if (u.dead) continue;
    if (u.k === 'plane') {
      const tx = u.ret ? u.hx! : u.tx!;
      const ty = u.ret ? u.hy! : u.ty!;
      const dx = tx - u.x;
      const dy = ty - u.y;
      const dist = Math.hypot(dx, dy);
      u.a = Math.atan2(dy, dx);
      u.age = (u.age || 0) + dt;
      u.alt = Math.min(1, u.age / 1.4);
      if (u.ret) u.alt = Math.min(u.alt, Math.max(0, (dist - 0.15) / 4));
      if (!u.ret && dist < 0.7) {
        u.bt = (u.bt || 0) - dt;
        if (u.bt <= 0 && (u.bombs || 0) > 0) {
          u.bt = 0.22;
          u.bombs!--;
          boom(u.x + (rng() - 0.5) * 1.6, u.y + (rng() - 0.5) * 1.6, 1.25, 58 * (1 + 0.3 * tk(u.o, 'air3')), u.o);
          if (u.bombs! <= 0) u.ret = true;
        }
      } else if (u.ret && dist < 0.5) {
        u.dead = true;
      } else {
        const kf = u.ret ? Math.min(1, 0.3 + dist / 5) : Math.min(1, 0.22 + u.age * 0.56);
        const m = Math.min(UN.plane.sp * (1 + 0.2 * tk(u.o, 'air5')) * kf * dt, dist);
        u.x += (dx / (dist || 1)) * m;
        u.y += (dy / (dist || 1)) * m;
      }
      if (u.alt > 0.45 && PF.set.part && rng() < dt * 26) {
        G.PT.push({
          x: u.x - Math.cos(u.a) * 0.5,
          y: u.y - Math.sin(u.a) * 0.5,
          vx: 0,
          vy: 0,
          life: 0.9,
          max: 0.9,
          c: '#f4f7ff',
          s: 0.14,
        });
      }
      continue;
    }
    u.cd -= dt;
    u.scan -= dt;
    if (u.scan <= 0) {
      u.scan = 0.25;
      u.tg = findTarget(u);
    }
    let tg = u.tg;
    if (tg && ((tg.unit && tg.unit.dead) || (tg.b && tg.b.dead))) {
      tg = u.tg = null;
    }
    if (tg) {
      const R = UN[u.k].rg;
      const tx = tg.unit ? tg.unit.x : tg.b!.x + 0.5;
      const ty = tg.unit ? tg.unit.y : tg.b!.y + 0.5;
      if (Math.hypot(tx - u.x, ty - u.y) <= R + 0.4) {
        if (u.cd <= 0) {
          u.cd = UN[u.k].cd;
          unitFire(u, tg);
        }
        u.ta = Math.atan2(ty - u.y, tx - u.x);
        u.idle = 0;
        continue;
      }
    }
    u.hold = false;
    stepUnit(u, dt);
    if (u.hold) {
      u.idle = (u.idle || 0) + dt;
      if (u.idle >= 20) {
        u.dead = true;
        ring(u.x, u.y, 1, '#ffffff', 0.5);
        continue;
      }
    } else {
      u.idle = 0;
    }
    if (u.k === 'howitzer' && !u.hold) u.cd = Math.max(u.cd, 0.9);
    if (u.hold && u.k !== 'howitzer') {
      u.cap -= dt;
      if (u.cap <= 0) {
        u.cap = 1.5;
        occupy(u);
      }
    }
  }
}

function aiBuild(k: number, t: string): void {
  const c = G.SC[k];
  if (!c) return;
  for (let n = 0; n < 60; n++) {
    let x: number;
    let y: number;
    if (n < 45) {
      const a = rng() * 6.283;
      const r = 1 + rng() * (t === 'sam' ? 6 : 11);
      x = Math.round(c.x + Math.cos(a) * r);
      y = Math.round(c.y + Math.sin(a) * r);
    } else {
      x = (rng() * G.W) | 0;
      y = (rng() * G.H) | 0;
    }
    if (place(k, t, x, y) === '') return;
  }
}

function aiAssault(k: number, f: number): boolean {
  if (f && rng() < 0.4) {
    const cb = G.B.find((b) => b.cap && b.o === f && !b.dead);
    if (cb) {
      for (let n = 0; n < 25; n++) {
        const x = Math.round(cb.x + (rng() - 0.5) * 6);
        const y = Math.round(cb.y + (rng() - 0.5) * 6);
        if (x >= 0 && y >= 0 && x < G.W && y < G.H && G.OWN[y * G.W + x] === f && assault(k, x, y) === '') return true;
      }
    }
  }
  for (let n = 0; n < 80; n++) {
    const x = (rng() * G.W) | 0;
    const y = (rng() * G.H) | 0;
    if (G.OWN[y * G.W + x] === f && assault(k, x, y) === '') return true;
  }
  return false;
}

function aiThink(k: number): void {
  const p = G.P[k];
  if (!p) return;
  p.aiT = (3.4 + rng() * 3.2) / DIFF[G.diff].ai;
  const c = (n: string) => p.cnt[n] || 0;
  let want: string | null = null;
  const mode = G.MISSION?.aiMode || '';
  if (p.sup < p.dem + 2) want = 'power';
  else if (c('city') < 3) want = 'city';
  else if (c('sam') < Math.min(5, 1 + Math.floor(G.gameT / 60))) want = 'sam';
  else if (c('barracks') < 1) want = 'barracks';
  else if (c('silo') < 1 && mode !== 'tanks') want = 'silo';
  else if (c('factory') < 1 && G.gameT > 35) want = 'factory';
  else if (c('dfac') < 1 && mode !== 'tanks') want = 'dfac';
  else if (c('barracks') < 2) want = 'barracks';
  else if (c('city') < 7) want = 'city';
  else if (c('airfield') < 1 && G.gameT > 100 && mode !== 'tanks') want = 'airfield';
  else if (c('silo') < 3 && mode !== 'tanks') want = 'silo';
  else if (c('factory') < 2 && G.gameT > 150) want = 'factory';
  else if (c('sam') < 7) want = 'sam';

  if (want && p.money >= BT[want].c + (want === 'power' ? 0 : 30)) aiBuild(k, want);
  const calmTime = G.MISSION && G.MISSION.calm != null ? G.MISSION.calm : 55;
  if (G.gameT < calmTime + (k % 12) * 6) {
    if (p.sol >= ACOST + 10 && rng() < 0.3) aiAssault(k, 0);
    return;
  }
  const foes: number[] = [];
  for (let j = 1; j <= G.NN; j++) if (j !== k && G.P[j]?.alive && !isAlly(k, j)) foes.push(j);
  if (!foes.length) return;
  if (foes.length > 6) {
    const c0 = G.SC[k]!;
    foes.sort((a, b) => Math.hypot(G.SC[a]!.x - c0.x, G.SC[a]!.y - c0.y) - Math.hypot(G.SC[b]!.x - c0.x, G.SC[b]!.y - c0.y));
    foes.length = 5;
  }
  const hs = foes.filter((j) => G.P[j]?.human);
  const f = hs.length && rng() < 0.2 * p.aggr ? hs[(rng() * hs.length) | 0] : foes[(rng() * foes.length) | 0];
  const tb = G.B.filter((b) => b.o === f && !b.dead);
  if (!tb.length) return;
  let t = tb[(rng() * tb.length) | 0];
  if (rng() < 0.1) t = tb.find((b) => b.cap) || t;
  if (!G.MISSION && G.diff >= 1 && G.gameT > 420 && c('silo') >= 1 && p.nk !== 1 && G.gameT > (p.nkT || 0)) {
    p.nkT = G.gameT + 90;
    if (G.P.filter((q) => q && q.nk === 1 && q.alive).length < 2 && rng() < 0.3) {
      p.nk = 1;
      say(`${G.NAMES[k]} начала ядерную программу!`);
    }
  }
  if (p.nk === 1) {
    if (c('silo') < 1) {
      p.nk = 0;
      p.nkT = G.gameT + 120;
    } else {
      if (p.money >= NCOST) {
        const cb = tb.find((b) => b.cap) || t;
        if (launchNuke(k, cb.x + 0.5, cb.y + 0.5) === '') {
          p.nk = 0;
          p.nkT = G.gameT + 150;
        }
      }
      return;
    }
  }
  const tx = t.x + 0.5 + (rng() - 0.5) * 1.4;
  const ty = t.y + 0.5 + (rng() - 0.5) * 1.4;
  const r = rng();

  const sck = G.SC[k];
  const enemyTank = sck
    ? G.U.find((u) => !u.dead && u.o !== k && !isFriend(k, u.o) && u.k === 'tank' && Math.hypot(u.x - sck.x, u.y - sck.y) < 20)
    : undefined;
  if (enemyTank && c('barracks') && p.sol >= UN.rpg.sol && p.money >= UN.rpg.c && (p.ucnt.rpg || 0) < 8) {
    if (orderGround(k, 'rpg', Math.round(enemyTank.x), Math.round(enemyTank.y), 'barracks') === '') return;
  }
  if (c('factory') && p.money >= UN.tank.c + 50 && (p.ucnt.tank || 0) < (mode === 'tanks' ? 10 : 5) && r < (mode === 'tanks' ? 0.8 : 0.45)) {
    const cap = tb.find((b) => b.cap) || t;
    const ax = Math.round(cap.x + (rng() - 0.5) * 5);
    const ay = Math.round(cap.y + (rng() - 0.5) * 5);
    if (orderGround(k, 'tank', ax, ay, 'factory') === '') return;
  }
  if (c('factory') && G.gameT > 180 && p.money >= UN.howitzer.c + 60 && p.sol >= UN.howitzer.sol && (p.ucnt.howitzer || 0) < (mode === 'tanks' ? 3 : 2) && r < 0.25) {
    const cap = tb.find((b) => b.cap) || t;
    const ax = Math.round(cap.x + (rng() - 0.5) * 6);
    const ay = Math.round(cap.y + (rng() - 0.5) * 6);
    if (orderGround(k, 'howitzer', ax, ay, 'factory') === '') return;
  }
  if (c('airfield') && p.money >= UN.plane.c + 60 && r < 0.4 && orderPlane(k, tx, ty) === '') return;
  if (c('silo') && p.money >= MCOST + 60 && r < 0.5 && launchMissile(k, tx, ty) === '') return;
  if (c('dfac') && p.money >= DCOST + 30 && r < 0.85 && launchDrones(k, tx, ty) === '') return;
  if (p.sol >= 40) aiAssault(k, rng() < 0.5 ? f : 0);
}

/* ---- Diplomacy ---- */
function strongestK(): number {
  let b = 0;
  let bt = -1;
  for (let k = 1; k <= G.NN; k++) {
    const p = G.P[k];
    if (p?.alive && p.tiles > bt) {
      bt = p.tiles;
      b = k;
    }
  }
  return b;
}

export function pairKey(a: number, b: number): string {
  return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

function aiAccept(b: number, a: number): { ok: boolean; why?: string } {
  if (G.MISSION && G.MISSION.type === 'tut') return { ok: true };
  if (G.DCD[pairKey(a, b)] > G.gameT) return { ok: false, why: 'просит не торопить: попробуйте позже' };
  if (G.GRUDGE[`${b}-${a}`] > G.gameT) return { ok: false, why: 'не забыла разорванный союз' };
  if (allyCount(b) >= 2) return { ok: false, why: 'уже связана союзами' };
  if (relGet(b, a) < -25) return { ok: false, why: 'враждебно настроена к вам' };
  let sc = 0.5 + relGet(b, a) / 150;
  const st = strongestK();
  if (b === st) sc -= 0.3;
  if (a === st) sc -= 0.1;
  if ((G.P[b]?.tiles || 0) < (G.landTotal / G.NN) * 0.8) sc += 0.15;
  if (a === G.ME) sc += 0.2 * tk(G.ME, 'dip1');
  return rng() < sc ? { ok: true } : { ok: false, why: 'отклонила предложение' };
}

export function setAlly(a: number, b: number, v: number): void {
  if (!G.AL[a] || !G.AL[b]) return;
  G.AL[a][b] = G.AL[b][a] = v ? 1 : 0;
  if (v) {
    G.REL[a][b] = Math.min(100, G.REL[a][b] + 30);
    G.REL[b][a] = Math.min(100, G.REL[b][a] + 30);
    if (a === G.ME || b === G.ME) track('alliances');
  }
  for (const u of G.U) u.tg = null;
  say(v ? `${nameOf(a)} и ${nameOf(b)} заключили союз` : `Союз расторгнут: ${nameOf(a)} и ${nameOf(b)}`);
  simHooks.dipRefresh?.();
}

export function proposeAlliance(a: number, b: number): string {
  if (!G.P[b]?.alive || !G.P[a]?.alive) return 'Страна недоступна';
  if (isAlly(a, b)) return 'Вы уже союзники';
  if (allyCount(a) >= maxAllies(a)) return `Лимит союзников: ${maxAllies(a)}. Разорвите один из союзов`;
  if (G.P[b]!.human) {
    if (G.DCD[pairKey(a, b)] > G.gameT) return 'Попробуйте чуть позже';
    setAlly(a, b, 1);
    return '';
  }
  const r = aiAccept(b, a);
  if (!r.ok) {
    G.DCD[pairKey(a, b)] = G.gameT + 25;
    return `${nameOf(b)} ${r.why}`;
  }
  setAlly(a, b, 1);
  return '';
}

export function breakAlliance(a: number, b: number): void {
  if (!isAlly(a, b)) return;
  setAlly(a, b, 0);
  G.GRUDGE[`${b}-${a}`] = G.gameT + 120;
  if (G.REL[b]) G.REL[b][a] = Math.max(-100, G.REL[b][a] - 45);
  G.DCD[pairKey(a, b)] = G.gameT + 60;
}

export function aidMult(o: number): number {
  return 1 + 0.5 * tk(o, 'dip2');
}

export function aidCost(o: number, id: string): number {
  const a = AID.find((x) => x.id === id);
  if (id === 'tank' || id === 'rpg') return ucost(o, id);
  if (id === 'sam') return BT.sam.c;
  return typeof a?.c === 'number' ? a.c : 0;
}

export function sendAid(o: number, b: number, id: string): string {
  if (!isAlly(o, b)) return 'Помогать можно только союзникам';
  const po = G.P[o];
  const pb = G.P[b];
  if (!po || !pb) return 'Страна недоступна';
  const m = aidMult(o);
  const cost = aidCost(o, id);
  if (id === 'sol') {
    if (po.sol < 20) return 'Мало солдат: нужно 20';
    po.sol -= 20;
    pb.sol = Math.min(300, pb.sol + Math.round(20 * m));
  } else {
    if (po.money < cost) return `Не хватает денег: ${cost}`;
    const cap = G.B.find((x) => x.cap && x.o === b && !x.dead);
    if (!cap && id !== 'money') return 'У союзника нет столицы';
    if (id === 'money') {
      po.money -= cost;
      pb.money += Math.round(100 * m);
    } else if (id === 'tank' || id === 'rpg') {
      if (unitCount(b) >= (pb.human ? 30 : 14)) return 'У союзника лимит техники';
      if (id === 'rpg') {
        if (po.sol < UN.rpg.sol) return `Мало солдат: нужно ${UN.rpg.sol}`;
        po.sol -= UN.rpg.sol;
      }
      let px = cap!.x;
      let py = cap!.y;
      for (let n = 0; n < 30; n++) {
        const x = cap!.x + Math.round((rng() - 0.5) * 5);
        const y = cap!.y + Math.round((rng() - 0.5) * 5);
        if (x >= 0 && y >= 0 && x < G.W && y < G.H && G.T[y * G.W + x] >= 2) {
          px = x;
          py = y;
          break;
        }
      }
      po.money -= cost;
      const u = mkUnit(id, b, px, py);
      if (m > 1) u.hp = u.max = u.max * 1.15;
      ring(px + 0.5, py + 0.5, 1.4, G.CS[o], 0.5);
    } else if (id === 'sam') {
      let spot: { x: number; y: number } | null = null;
      for (let n = 0; n < 80 && !spot; n++) {
        const x = cap!.x + Math.round((rng() - 0.5) * 12);
        const y = cap!.y + Math.round((rng() - 0.5) * 12);
        if (
          x >= 0 &&
          y >= 0 &&
          x < G.W &&
          y < G.H &&
          G.OWN[y * G.W + x] === b &&
          G.T[y * G.W + x] >= 2 &&
          G.T[y * G.W + x] <= 4 &&
          G.BLD[y * G.W + x] < 0
        ) {
          spot = { x, y };
        }
      }
      if (!spot) return 'Нет места для ПВО у союзника';
      po.money -= cost;
      addB('sam', b, spot.x, spot.y);
      recount();
      ring(spot.x + 0.5, spot.y + 0.5, 1.4, G.CS[o], 0.5);
    }
  }
  if (G.REL[b]) G.REL[b][o] = Math.min(100, G.REL[b][o] + 8);
  if (o === G.ME) {
    track('aids');
    snd(520, 0.12, 'triangle', 0.05, 780);
  }
  return '';
}

function dipTick(dt: number): void {
  if (G.phase !== 'play') return;
  if (G.OFFER && G.gameT > G.OFFER.t) {
    G.OFFER = null;
    simHooks.offerUI?.();
  }
  G.dipT -= dt;
  if (G.dipT > 0) return;
  G.dipT = 3;
  const alive: number[] = [];
  for (let k = 1; k <= G.NN; k++) if (G.P[k]?.alive) alive.push(k);
  for (const k of alive) {
    const p = G.P[k]!;
    if (p.human) continue;
    for (const j of allyList(k)) {
      if (j === G.ME && tk(G.ME, 'dip5')) continue;
      const ch = alive.length <= 3 ? 0.2 : p.tiles > G.P[j]!.tiles * 2.4 && p.aggr > 1.1 ? 0.03 : 0;
      if (ch && rng() < ch) {
        breakAlliance(k, j);
        if (j === G.ME) simHooks.toast?.(`${nameOf(k)} предал вас и разорвал союз!`);
      }
    }
    if (G.gameT < 25 || allyCount(k) >= 2 || rng() > 0.14) continue;
    const cand = alive
      .filter(
        (j) =>
          j !== k &&
          !isAlly(k, j) &&
          !(G.DCD[pairKey(k, j)] > G.gameT) &&
          !(G.GRUDGE[`${j}-${k}`] > G.gameT) &&
          alive.length > 3,
      )
      .sort(
        (a, b) =>
          Math.hypot(G.SC[a]!.x - G.SC[k]!.x, G.SC[a]!.y - G.SC[k]!.y) -
          Math.hypot(G.SC[b]!.x - G.SC[k]!.x, G.SC[b]!.y - G.SC[k]!.y),
      )
      .slice(0, 3);
    if (!cand.length) continue;
    const j = cand[(rng() * cand.length) | 0];
    if (j === G.ME) {
      if (!G.OFFER && allyCount(G.ME) < maxAllies(G.ME) && relGet(k, G.ME) > -25) {
        G.OFFER = { from: k, t: G.gameT + 18 };
        simHooks.offerUI?.();
        snd(700, 0.15, 'triangle', 0.05, 900);
      }
    } else if (allyCount(j) < 2 && aiAccept(j, k).ok) {
      setAlly(k, j, 1);
    } else {
      G.DCD[pairKey(k, j)] = G.gameT + 40;
    }
  }
}

export function checkMission(): void {
  const m = G.MISSION;
  if (!m || G.phase !== 'play') return;
  if (m.type === 'land' && (G.P[G.ME]!.tiles / G.landTotal) * 100 >= m.goal) finishGame(true);
  else if (m.type === 'survive' && G.gameT >= m.goal && G.P[G.ME]!.alive) finishGame(true);
  else if (m.type === 'killTanks' && G.RS.tankKills >= m.goal) finishGame(true);
  else if (m.type === 'ally' && allyCount(G.ME) >= m.goal) finishGame(true);
}

export function endCapture(): void {
  G.phase = 'play';
  recount();
  simHooks.onEndCapture?.();
}

function updateCap(dt: number): void {
  G.capT -= dt;
  for (let k = 1; k <= G.NN; k++) {
    const p = G.P[k];
    if (!p || p.human || !p.alive) continue;
    if (rng() < p.skill * dt * 60 * 0.22) {
      const c = G.SC[k]!;
      const a = rng() * 6.283;
      const r = 1 + rng() * 9;
      paintAt(k, c.x + 0.5 + Math.cos(a) * r, c.y + 0.5 + Math.sin(a) * r, 1.6);
    }
  }
  if (G.capT <= 0) endCapture();
}

function updatePlay(dt: number): void {
  G.gameT += dt;
  G.econT -= dt;
  if (G.econT <= 0) {
    G.econT = 0.5;
    recount();
    trackMax('landMax', Math.round((G.P[G.ME]!.tiles / G.landTotal) * 100));
    if (G.MISSION) checkMission();
  }
  for (let k = 1; k <= G.NN; k++) {
    const p = G.P[k];
    if (!p?.alive) continue;
    p.money += p.inc * dt;
    p.sol = Math.min(300, p.sol + (p.cnt.barracks || 0) * 0.6 * (1 + 0.1 * tk(k, 'army1') + 0.15 * tk(k, 'army4')) * Math.max(0.25, p.eff) * dt);
    if (!p.human) {
      p.aiT -= dt;
      if (p.aiT <= 0) aiThink(k);
    }
  }
  for (const b of G.B) {
    if (b.dead || b.t !== 'sam') continue;
    b.cd -= dt;
    if (b.cd > 0 || (G.P[b.o]?.eff || 0) < 0.3) continue;
    let tg: any = null;
    let td = samR(b.o);
    let isU = false;
    for (const p of G.PR) {
      if (p.dead || p.k === 's' || isFriend(p.o, b.o) || p.t < 0) continue;
      const d = Math.hypot(p.x - b.x - 0.5, p.y - b.y - 0.5);
      if (d < td) {
        td = d;
        tg = p;
        isU = false;
      }
    }
    for (const u of G.U) {
      if (u.dead || u.k !== 'plane' || isFriend(u.o, b.o)) continue;
      const d = Math.hypot(u.x - b.x - 0.5, u.y - b.y - 0.5);
      if (d < td) {
        td = d;
        tg = u;
        isU = true;
      }
    }
    if (tg) {
      b.cd = 1.4;
      const ey =
        !isU && (tg.k === 'm' || tg.k === 'n')
          ? tg.y - Math.sin(Math.PI * Math.min(1, Math.max(0, tg.t))) * arcOf(tg)
          : tg.y;
      G.BM.push({ x1: b.x + 0.5, y1: b.y + 0.5, x2: tg.x, y2: ey, life: 0.18, c: '#9ff' });
      if (inView(b.x, b.y)) snd(900, 0.12, 'square', 0.03, 300);
      const hitp = (isU ? 0.65 : tg.k === 'n' ? 0.55 : tg.k === 'm' ? 0.7 : 0.8) * Math.min(1, (G.P[b.o]?.eff || 0) + 0.2);
      if (rng() < hitp) {
        if (isU) {
          tg.hp -= 40;
          if (tg.hp <= 0) {
            tg.dead = true;
            boom(tg.x, tg.y, 0.8, 0);
            if (b.o === G.ME) {
              G.RS.sam++;
              track('samKills');
            }
          } else {
            sparks(tg.x, tg.y, 6, 2, ['#ffe27a', '#fff'], 0.25);
          }
        } else {
          tg.hp--;
          if (tg.hp <= 0) {
            tg.dead = true;
            if (tg.k === 'n') {
              ring(tg.x, ey, 3, '#ffd27a', 0.7);
              ring(tg.x, ey, 1.6, '#fff', 0.4);
              sparks(tg.x, ey, 40, 6, ['#ffb02e', '#ff6b2e', '#ffe27a', '#fff'], 0.5);
              if (inView(tg.x, ey)) {
                G.shake = Math.max(G.shake, 10);
                snd(90, 0.6, 'sawtooth', 0.14, 30);
              }
              say('Ядерная ракета перехвачена ПВО!');
              if (b.o === G.ME) track('nukeStops');
            } else {
              boom(tg.x, ey, 0.8, 0);
            }
            if (b.o === G.ME) {
              G.RS.sam++;
              track('samKills');
            }
          } else {
            sparks(tg.x, tg.y, 6, 2, ['#ffe27a', '#fff'], 0.25);
          }
        }
      }
    }
  }
  dipTick(dt);
  if (tk(G.ME, 'fort6')) {
    for (const b of G.B) if (!b.dead && b.o === G.ME && b.hp < b.max) b.hp = Math.min(b.max, b.hp + 0.6 * dt);
  }
  let inc: 'm' | 'd' | 'n' | null = null;
  for (const p of G.PR) {
    if (p.dead) continue;
    p.t += dt / p.dur;
    if (p.t < 0) continue;
    const t = Math.min(1, p.t);
    p.x = p.sx + (p.tx - p.sx) * t;
    p.y = p.sy + (p.ty - p.sy) * t;
    if (p.k === 'd') {
      p.x += Math.sin(G.gameT * 6 + p.w) * 0.15;
      p.y += Math.cos(G.gameT * 5 + p.w) * 0.15;
      if (rng() < dt * 40) G.PT.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, max: 0.5, c: '#ddd', s: 0.25 });
    }
    if (p.o !== G.ME && p.k !== 's' && inc !== 'n') {
      const tx = Math.floor(p.tx);
      const ty = Math.floor(p.ty);
      if (p.k === 'n') {
        const scMe = G.SC[G.ME];
        if (
          p.t > 0.02 &&
          ((scMe && Math.hypot(p.tx - scMe.x, p.ty - scMe.y) < NRD + 6) ||
            (tx >= 0 && ty >= 0 && tx < G.W && ty < G.H && G.OWN[ty * G.W + tx] === G.ME))
        ) {
          inc = 'n';
        }
      } else if (tx >= 0 && ty >= 0 && tx < G.W && ty < G.H && G.OWN[ty * G.W + tx] === G.ME && p.t > 0.05) {
        inc = p.k;
      }
    }
    if (p.t >= 1) {
      p.dead = true;
      if (p.k === 'm') boom(p.tx, p.ty, 3, 150, p.o);
      else if (p.k === 'n') nukeBlast(p.tx, p.ty, p.o);
      else if (p.k === 's') boom(p.tx, p.ty, 1.6, p.dmg || 70, p.o);
      else boom(p.tx, p.ty, 1.2, 34, p.o);
    }
  }
  G.PR = G.PR.filter((p) => !p.dead);
  updateUnits(dt);
  if (inc) {
    G.alarmT = 1.2;
    G.alarmK = inc;
  } else {
    G.alarmT -= dt;
  }
}

export function compact(): void {
  if (G.U.some((u) => u.dead)) G.U = G.U.filter((u) => !u.dead);
  if (!G.B.some((b) => b.dead)) return;
  const sel = G.selB;
  G.B = G.B.filter((b) => !b.dead);
  G.BLD.fill(-1);
  G.B.forEach((b, i) => {
    G.BLD[b.y * G.W + b.x] = i;
  });
  if (sel && sel.dead) simHooks.closeInfo?.();
}

export function updateWorld(dt: number): void {
  if (G.phase === 'cap') updateCap(dt);
  else if (G.phase === 'play') updatePlay(dt);
  for (const r of G.EF) r.life -= dt;
  G.EF = G.EF.filter((r) => r.life > 0);
  for (const p of G.PT) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  G.PT = G.PT.filter((p) => p.life > 0);
  for (const b of G.BM) b.life -= dt;
  G.BM = G.BM.filter((b) => b.life > 0);
  if (G.NK.length) {
    const nw = performance.now();
    G.NK = G.NK.filter((n) => nw - n.t0 < 17000);
  }
  G.shake *= Math.pow(0.02, dt);
  compact();
}

export function evTick(dt: number): void {
  G.evT -= dt;
  if (G.evT > 0) return;
  G.evT = 70 + rng() * 50;
  const alive: number[] = [];
  for (let k = 1; k <= G.NN; k++) if (G.P[k]?.alive) alive.push(k);
  if (!alive.length) return;
  if (rng() < 0.5) {
    const land: Array<{ x: number; y: number }> = [];
    for (let n = 0; n < 400 && land.length < 1; n++) {
      const x = (rng() * G.W) | 0;
      const y = (rng() * G.H) | 0;
      if (G.T[y * G.W + x] >= 2) land.push({ x, y });
    }
    if (!land.length) return;
    const c = land[0];
    say(`Метеоритный дождь: удар у координат ${c.x}:${c.y}`);
    for (let i = 0; i < 7; i++) {
      const x = c.x + (rng() - 0.5) * 14;
      const y = c.y + (rng() - 0.5) * 14;
      if (x > 0 && y > 0 && x < G.W && y < G.H) boom(x, y, 1.8, 70);
    }
  } else {
    const k = alive[(rng() * alive.length) | 0];
    G.P[k]!.money += 300;
    say(`Нефтяной бум: ${nameOf(k)} получает 300`);
  }
}

export function doAct(kind: string, a: { t?: string; x?: number; y?: number; tx?: number; ty?: number; b?: Building }): string {
  const me = G.ME;
  if (kind === 'place') return place(me, a.t!, a.x!, a.y!);
  if (kind === 'missile') return launchMissile(me, a.tx!, a.ty!);
  if (kind === 'nuke') return launchNuke(me, a.tx!, a.ty!);
  if (kind === 'drone') return launchDrones(me, a.tx!, a.ty!);
  if (kind === 'assault') return assault(me, a.x!, a.y!);
  if (kind === 'repair') return repair(a.b!);
  if (kind === 'tank') return orderGround(me, 'tank', a.x!, a.y!, 'factory');
  if (kind === 'rpg') return orderGround(me, 'rpg', a.x!, a.y!, 'barracks');
  if (kind === 'howitzer') return orderGround(me, 'howitzer', a.x!, a.y!, 'factory');
  if (kind === 'plane') return orderPlane(me, a.tx!, a.ty!);
  return '';
}
