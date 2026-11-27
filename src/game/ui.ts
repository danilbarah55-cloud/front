import {
  ACOST,
  ACH,
  AID,
  BT,
  DCOST,
  DIFF,
  DR,
  LEVELS,
  MCOST,
  PAL,
  SIZES,
  SKINS,
  TBRANCH,
  TECHS,
  TOOLS,
  TUTCFG,
  UN,
  UPG,
} from './constants.ts';
import {
  ACC,
  accAuto,
  accLogin,
  accLogout,
  accRegister,
  claimTask,
  fetchLeaderboard,
  PF,
  probeBackend,
  resetPF,
  savePF,
  setPfNotify,
  skinBuy,
  statGet,
  storageMode,
  supabaseEnabled,
  taskDone,
  techBuy,
  todayTasks,
  track,
  upBuy,
  upLv,
} from './profile.ts';
import {
  allocWorld,
  clampCam,
  drawToolIcon,
  fitTS,
  G,
  genTiles,
  isAlly,
  miniT,
  mr,
  nameOf,
  paintMini,
  paintTerrain,
  planeCost,
  renderWorld,
  resizeCanvas,
  rgbs,
  s2w,
  samR,
  skinRGB,
  snd,
  tk,
  ucost,
  zoomAt,
} from './world.ts';
import {
  aidCost,
  allyCount,
  allyErr,
  assaultInfo,
  breakAlliance,
  defenseAt,
  doAct,
  evTick,
  finishGame,
  maxAllies,
  mkField,
  nearestB,
  newGame,
  paintMe,
  pairKey,
  pct,
  proposeAlliance,
  recount,
  relGet,
  sendAid,
  setAlly,
  setSimHooks,
  updateWorld,
  type EndReward,
} from './simulation.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

let toastT: ReturnType<typeof setTimeout> | null = null;
export function toast(m: string): void {
  const e = $('toast');
  if (!e) return;
  e.textContent = m;
  e.classList.add('on');
  if (toastT) clearTimeout(toastT);
  toastT = setTimeout(() => e.classList.remove('on'), 2600);
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c),
  );
}

function loading(msg: string, fn: () => void): void {
  const l = $('load');
  if (!l) {
    fn();
    return;
  }
  l.textContent = msg || 'Генерируем карту…';
  l.hidden = false;
  setTimeout(() => {
    try {
      fn();
    } finally {
      l.hidden = true;
    }
  }, 40);
}

let curScr = '';
function card(title: string, html: string, b1: string, f1: () => void, b2?: string, f2?: () => void): void {
  const ovT = $('ovT');
  const ovP = $('ovP');
  const ovB = $('ovB');
  const ovB2 = $('ovB2');
  const ov = $('ov');
  if (!ovT || !ovP || !ovB || !ovB2 || !ov) return;
  ovT.textContent = title;
  ovP.innerHTML = html;
  ovB.textContent = b1;
  ovB.onclick = f1;
  if (b2 && f2) {
    ovB2.hidden = false;
    ovB2.textContent = b2;
    ovB2.onclick = f2;
  } else {
    ovB2.hidden = true;
  }
  ov.hidden = false;
}

function scr(title: string, body: string, back: (() => void) | null, name?: string): HTMLElement | null {
  const s = $('scr');
  if (!s) return null;
  s.hidden = false;
  curScr = name || '';
  const head =
    name === 'home' || name === 'auth'
      ? ''
      : `<div class="sh"><div class="shl">${
          back
            ? '<button class="bk" id="bk"><svg class="ic" viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>Назад</button>'
            : ''
        }</div><h2>${title}</h2><div class="coin"><b>${PF.coins}</b><i></i></div></div>`;
  s.innerHTML = `<div class="pg">${head}<div class="sb">${body}</div></div>`;
  if (back) {
    const bk = $('bk');
    if (bk) bk.onclick = back;
  }
  s.scrollTop = 0;
  return s;
}

function seg(opts: string[], cur: number, id: string, extraClass = ''): string {
  return `<div class="seg2${extraClass ? ' ' + extraClass : ''}" id="${id}">${opts
    .map((o, i) => `<button data-i="${i}" class="${i === cur ? 'on' : ''}">${o}</button>`)
    .join('')}</div>`;
}

function wireSeg(id: string, cb: (i: number) => void): void {
  const el = $(id);
  if (!el) return;
  Array.from(el.children).forEach((node) => {
    const b = node as HTMLElement;
    b.onclick = () => {
      Array.from(el.children).forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      cb(Number(b.dataset.i));
    };
  });
}

function homeBackdrop(): void {
  const ov = $('ov');
  const wrap = $('wrap');
  const cnt = $('count');
  const goal = $('goal');
  if (ov) ov.hidden = true;
  G.phase = 'intro';
  if (wrap) wrap.classList.add('cap');
  if (cnt) cnt.hidden = true;
  if (goal) goal.hidden = true;
  closeInfo();
  G.paused = false;
}

/* ---- Tutorial ---- */
let TUT = { i: 0, shown: -1 };
const TUTF = { a0: 0, tapped: false };

function nb(t: string): number {
  return G.B.filter((b) => b.o === G.ME && !b.dead && !b.cap && b.t === t).length;
}

const TUTSTEPS = [
  {
    t: 'Проведите пальцем вокруг столицы: земля захватывается там, где проходит палец, но не дальше 5 км от вашей территории. На это даётся 5 секунд.',
    tool: '',
    ok: () => G.phase !== 'cap' && G.phase !== 'intro',
  },
  {
    t: 'Постройте электростанцию. Нажмите «Электро» на панели внизу, затем тапните по своей земле. Энергия нужна зданиям.',
    tool: 'power',
    ok: () => nb('power') >= 1,
  },
  {
    t: 'Постройте город: он приносит деньги. Нажмите «Город» и тапните по своей земле.',
    tool: 'city',
    ok: () => nb('city') >= 1,
  },
  {
    t: 'Постройте казарму: она даёт солдат для штурма и обороны.',
    tool: 'barracks',
    ok: () => nb('barracks') >= 1,
  },
  {
    t: 'Тапните по своему зданию (инструмент «Рука»): откроется его состояние и ремонт.',
    tool: 'hand',
    ok: () => TUTF.tapped,
  },
  {
    t: 'Захватите землю: нажмите «Захват», тапните по свободной земле рядом с вашей территорией и нажмите «Захват» в окошке.',
    tool: 'assault',
    ok: () => statGet('assaults') > TUTF.a0,
  },
  {
    t: 'Постройте ПВО: оно сбивает ракеты, дроны и самолёты врага.',
    tool: 'sam',
    ok: () => nb('sam') >= 1,
  },
  {
    t: 'Дипломатия. Нажмите на кнопку с рукопожатием справа, выберите страну и предложите ей союз. Союзники не воюют с вами.',
    tool: '',
    ok: () => allyCount(G.ME) >= 1,
  },
];

function tutTick(): void {
  if (!G.MISSION || G.MISSION.type !== 'tut' || G.phase === 'end' || G.phase === 'intro') return;
  const g = $('goal');
  if (!g) return;
  if (TUT.i >= TUTSTEPS.length) {
    tutDone();
    return;
  }
  const s = TUTSTEPS[TUT.i];
  if (s.ok()) {
    TUT.i++;
    toast('Шаг выполнен');
    snd(660, 0.15, 'triangle', 0.05, 990);
    if (TUT.i >= TUTSTEPS.length) {
      tutDone();
      return;
    }
  }
  const c = TUTSTEPS[TUT.i];
  if (TUT.shown !== TUT.i) {
    TUT.shown = TUT.i;
    if (c.tool === 'assault' || TUT.i === 5) TUTF.a0 = statGet('assaults');
    g.hidden = false;
    g.className = 'tut';
    g.innerHTML = `<b>Обучение ${TUT.i + 1} из ${TUTSTEPS.length}</b><br>${c.t}<br><button id="tutSkip">Пропустить обучение</button>`;
    const sk = $('tutSkip');
    if (sk) sk.onclick = tutSkip;
    for (const k in btns) btns[k].classList.remove('hl');
    if (c.tool && btns[c.tool]) btns[c.tool].classList.add('hl');
  }
}

function tutSkip(): void {
  if (!PF.tutDone) PF.tutDone = 2;
  savePF();
  for (const k in btns) btns[k].classList.remove('hl');
  const g = $('goal');
  if (g) g.className = '';
  leaveToMenu();
  toast('Обучение пропущено. Его можно пройти из настроек');
}

function tutDone(): void {
  for (const k in btns) btns[k].classList.remove('hl');
  const g = $('goal');
  if (g) g.className = '';
  finishGame(true);
}

/* ---- Toolbar & Info ---- */
const btns: Record<string, HTMLButtonElement> = {};
let infMode = '';

function toolAllowed(id: string): boolean {
  return !G.MISSION || !G.MISSION.allow || G.MISSION.allow.includes(id);
}

function buildToolbar(): void {
  const bar = $('bar');
  if (!bar) return;
  bar.innerHTML = '';
  for (const k in btns) delete btns[k];
  for (const t of TOOLS) {
    if (t === 'sep') {
      const s = document.createElement('div');
      s.className = 'sep';
      bar.appendChild(s);
      continue;
    }
    const b = document.createElement('button');
    b.className = 'tb';
    const cv = document.createElement('canvas');
    cv.width = cv.height = 44;
    b.appendChild(cv);
    b.insertAdjacentHTML('beforeend', `<b>${t.n}</b><i>${t.c ? t.c : t.s}</i>`);
    b.onclick = () => setTool(G.tool === t.id ? 'hand' : t.id);
    bar.appendChild(b);
    btns[t.id] = b;
    drawToolIcon(t.id, cv);
  }
  refreshTools();
}

function refreshTools(): void {
  for (const t of TOOLS) {
    if (t === 'sep') continue;
    const ok = toolAllowed(t.id);
    if (btns[t.id]) btns[t.id].style.display = ok ? '' : 'none';
  }
  document.querySelectorAll<HTMLElement>('#bar .sep').forEach((s) => {
    s.style.display = G.MISSION && G.MISSION.allow ? 'none' : '';
  });
}

function closeInfo(): void {
  const info = $('info');
  if (info) info.hidden = true;
  G.selB = null;
  G.aim.on = false;
  infMode = '';
}

function showInfo(txt: string, btn: string, mode: string): void {
  const infT = $('infT');
  const infR = $('infR');
  const info = $('info');
  if (!infT || !infR || !info) return;
  infT.textContent = txt;
  infR.hidden = !btn;
  infR.textContent = btn || '';
  infMode = mode;
  info.hidden = false;
}

function setTool(id: string): void {
  G.tool = id;
  G.aim.on = false;
  G.hover = null;
  closeInfo();
  G.brush = BT[id] ? id : null;
  for (const k in btns) btns[k].classList.toggle('on', k === id);
  const t = TOOLS.find((x) => x !== 'sep' && x.id === id);
  const hint = $('hint');
  if (hint) {
    hint.textContent = G.phase === 'play' && t && t !== 'sep' && id !== 'hand' ? t.h : '';
  }
}

function aimCheck(): void {
  const { tx, ty } = G.aim;
  const x = Math.floor(tx);
  const y = Math.floor(ty);
  const p = G.P[G.ME];
  if (!p) return;
  let e = '';
  let s = null;
  let lbl = '';
  let btn = 'Огонь';

  if (G.tool === 'missile') {
    lbl = 'Ракета';
    if (!p.cnt.silo) e = 'Нужна ракетная шахта';
    else {
      s = nearestB(G.ME, 'silo', tx, ty, mr(G.ME));
      if (!s) {
        e = `Дальше ${mr(G.ME)} км от шахт`;
        s = nearestB(G.ME, 'silo', tx, ty);
      } else if (p.money < MCOST) {
        e = 'Не хватает денег';
      }
    }
  } else if (G.tool === 'drone') {
    lbl = 'Дроны';
    if (!p.cnt.dfac) e = 'Нужен завод дронов';
    else {
      s = nearestB(G.ME, 'dfac', tx, ty, DR);
      if (!s) {
        e = `Дальше ${DR} км от заводов`;
        s = nearestB(G.ME, 'dfac', tx, ty);
      } else if (p.money < DCOST) {
        e = 'Не хватает денег';
      }
    }
  } else if (G.tool === 'tank' || G.tool === 'rpg') {
    const st = G.tool === 'tank' ? 'factory' : 'barracks';
    lbl = UN[G.tool].n;
    btn = 'В бой';
    if (!p.cnt[st]) {
      e = G.tool === 'tank' ? 'Нужен завод техники' : 'Нужна казарма';
    } else {
      s = nearestB(G.ME, st, tx, ty);
      if (!s) {
        e = G.tool === 'tank' ? 'Нужен завод техники' : 'Нужна казарма';
      } else if (x < 0 || y < 0 || x >= G.W || y >= G.H || G.T[y * G.W + x] < 2) {
        e = 'Цель в воде';
      } else {
        const f = mkField(x, y, s.x, s.y);
        if (!f || f[s.y * G.W + s.x] < 0) e = 'Цель на другом острове';
        else if (p.money < ucost(G.ME, G.tool)) e = 'Не хватает денег';
        else if (G.tool === 'rpg' && p.sol < UN.rpg.sol) e = `Мало солдат: нужно ${UN.rpg.sol}`;
      }
    }
  } else if (G.tool === 'plane') {
    lbl = 'Самолёт';
    btn = 'Вылет';
    if (!p.cnt.airfield) e = 'Нужен аэродром';
    else {
      s = nearestB(G.ME, 'airfield', tx, ty, 70);
      if (!s) {
        e = 'Дальше 70 км от аэродромов';
        s = nearestB(G.ME, 'airfield', tx, ty);
      } else if (p.money < planeCost(G.ME)) {
        e = 'Не хватает денег';
      }
    }
  } else {
    const ai = assaultInfo(G.ME, x, y);
    lbl = ai.amph ? 'Десант' : 'Захват';
    e = ai.err;
    s = G.SC[G.ME] || null;
    G.aim.cost = ai.cost;
    btn = ai.amph ? `Десант ${ai.cost} сол.` : 'Захват';
    const f = x >= 0 && y >= 0 && x < G.W && y < G.H ? G.OWN[y * G.W + x] : 0;
    if (!e && f && f !== G.ME) {
      lbl += ` (оборона ${Math.round(defenseAt(f, x, y))}, ваша сила ${Math.round(ai.cost * (ai.amph ? 1 : 1.3))})`;
    }
  }
  if (!e && G.tool !== 'assault') e = allyErr(G.ME, tx, ty);
  const scMe = G.SC[G.ME] || { x: G.W / 2, y: G.H / 2 };
  G.aim.err = e;
  G.aim.fx = s ? s.x + 0.5 : scMe.x + 0.5;
  G.aim.fy = s ? s.y + 0.5 : scMe.y + 0.5;
  const d = Math.round(Math.hypot(tx - G.aim.fx, ty - G.aim.fy));
  showInfo(`${lbl}: ${e ? e : `${d} км до цели`}`, e ? '' : btn, 'aim');
}

function missionProg(): string {
  const m = G.MISSION;
  const p = G.P[G.ME];
  if (!m || !p || m.type === 'tut') return '';
  if (m.type === 'land') {
    const pc = Math.round((p.tiles / G.landTotal) * 100);
    return `${m.title}: ${pc}% из ${m.goal}%`;
  }
  if (m.type === 'survive') {
    const left = Math.max(0, Math.ceil(m.goal - G.gameT));
    return `${m.title}: ещё ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  }
  if (m.type === 'ally') return `${m.title}: ${Math.min(m.goal, allyCount(G.ME))} из ${m.goal}`;
  if (m.type === 'killTanks') return `${m.title}: ${G.RS.tankKills} из ${m.goal}`;
  const alive = G.P.filter((q, i) => q && i !== G.ME && q.alive).length;
  return `${m.title}: осталось стран ${alive}`;
}

function setV(el: HTMLElement | null, v: string): void {
  if (!el) return;
  if (el.textContent !== v) {
    el.textContent = v;
    el.classList.remove('tick');
    void el.offsetWidth;
    el.classList.add('tick');
  }
}

export function hud(): void {
  const p = G.P[G.ME];
  if (!p) return;
  setV($('sMoney'), String(Math.floor(p.money)));
  const sInc = $('sInc');
  if (sInc) sInc.textContent = G.phase === 'play' ? `+${p.inc.toFixed(1)}` : '';
  const sEn = $('sEn');
  setV(sEn, `${p.sup}/${p.dem}`);
  if (sEn) {
    sEn.style.color = p.sup >= p.dem ? '' : 'var(--bad)';
    sEn.closest('.hc')?.classList.toggle('low', p.sup < p.dem);
  }
  const enBar = $('enBar');
  if (enBar) enBar.style.width = `${Math.min(100, p.dem > 0 ? (p.sup / p.dem) * 100 : 100)}%`;
  setV($('sSol'), String(Math.floor(p.sol)));
  const lp = Math.round((p.tiles / G.landTotal) * 100);
  setV($('sLand'), `${pct(G.ME)}%`);
  const landBar = $('landBar');
  if (landBar) landBar.style.width = `${Math.min(100, lp)}%`;

  const bDip = $('bDip');
  if (bDip) bDip.hidden = false;
  tutTick();

  for (const t of TOOLS) {
    if (t === 'sep' || !t.c || !btns[t.id]) continue;
    const poor =
      t.id === 'assault'
        ? p.sol < ACOST
        : BT[t.id]
          ? p.money < BT[t.id].c
          : t.id === 'missile'
            ? p.money < MCOST
            : t.id === 'drone'
              ? p.money < DCOST
              : t.id === 'plane'
                ? p.money < planeCost(G.ME)
                : p.money < ucost(G.ME, t.id as 'tank' | 'rpg');
    btns[t.id].classList.toggle('poor', poor);
  }

  const al = $('alarm');
  if (al) {
    if (G.phase === 'play' && G.alarmT > 0) {
      al.hidden = false;
      al.textContent = G.alarmK === 'm' ? 'ТРЕВОГА: ракета летит на вашу землю' : 'ТРЕВОГА: дроны атакуют вашу землю';
    } else {
      al.hidden = true;
    }
  }
  const g = $('goal');
  if (g) {
    if (G.MISSION && G.MISSION.type === 'tut') {
      // managed by tutTick
    } else if (G.MISSION && (G.phase === 'play' || G.phase === 'cap')) {
      g.hidden = false;
      g.className = '';
      g.textContent = missionProg();
    } else {
      g.hidden = true;
    }
  }
  const rank = $('rank');
  if (rank && !rank.hidden) drawRank();
}

function drawRank(): void {
  const ids: number[] = [];
  for (let k = 1; k <= G.NN; k++) if (G.P[k] && G.P[k]!.active !== false) ids.push(k);
  ids.sort((a, b) => Number(G.P[b]!.alive) - Number(G.P[a]!.alive) || G.P[b]!.tiles - G.P[a]!.tiles);
  const show = ids.slice(0, 8);
  if (!show.includes(G.ME) && ids.includes(G.ME)) show.push(G.ME);
  const alive = ids.filter((k) => G.P[k]!.alive).length;
  const rank = $('rank');
  if (!rank) return;
  rank.innerHTML =
    `<div><span>Осталось стран</span><b>${alive} из ${ids.length}</b></div>` +
    show
      .map(
        (k) =>
          `<div data-k="${k}" class="${G.P[k]!.alive ? '' : 'dead'}"><i style="background:${G.CS[k]}"></i><span>${
            ids.indexOf(k) + 1
          }. ${esc(nameOf(k))}${isAlly(G.ME, k) ? ' ★' : ''}</span><b>${pct(
            k,
          )}%</b></div>`,
      )
      .join('');
}

function offerUI(): void {
  const el = $('offer');
  const offT = $('offT');
  if (!el || !offT) return;
  if (!G.OFFER) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  offT.textContent = `${nameOf(G.OFFER.from)} предлагает союз`;
}

function relWord(v: number): string {
  return v > 25 ? 'дружелюбная' : v < -25 ? 'враждебная' : 'нейтральная';
}

let dipAll = false;
function dipRefresh(): void {
  const el = $('dipBox');
  if (el && !el.hidden) drawDip();
}

function drawDip(): void {
  const el = $('dipBox');
  if (!el) return;
  const mx = maxAllies(G.ME);
  const ks: number[] = [];
  for (let k = 1; k <= G.NN; k++) if (k !== G.ME && G.P[k]?.alive) ks.push(k);
  const mc = G.SC[G.ME] || { x: G.W / 2, y: G.H / 2 };
  ks.sort(
    (a, b) =>
      Number(isAlly(G.ME, b)) - Number(isAlly(G.ME, a)) ||
      Math.hypot(G.SC[a]!.x - mc.x, G.SC[a]!.y - mc.y) - Math.hypot(G.SC[b]!.x - mc.x, G.SC[b]!.y - mc.y),
  );
  const hid = dipAll ? 0 : Math.max(0, ks.length - 12);
  if (hid) ks.length = 12;

  let h = `<div class="dh"><h3>Дипломатия</h3><span>Союзники: ${allyCount(G.ME)} из ${mx}</span></div><p class="sm">Союзники не воюют с вами и помогают против общих врагов. Союз можно расторгнуть, но страна запомнит предательство.</p>`;
  if (!ks.length) h += '<p class="sm">Других стран не осталось.</p>';
  for (const k of ks) {
    const al = isAlly(G.ME, k);
    const pc = pct(k);
    h += `<div class="dr${al ? ' al' : ''}"><div class="dl"><i style="background:${G.CS[k]}"></i><div><b>${esc(
      G.NAMES[k],
    )}</b><span>${pc}% суши · ${al ? 'союзник' : `отношение ${relWord(relGet(k, G.ME))}`}</span></div></div><div class="db">${
      al
        ? `<button data-a="aid" data-k="${k}">Помощь</button><button data-a="brk" data-k="${k}" class="warn">Разорвать</button>`
        : `<button data-a="pro" data-k="${k}" class="gold">Союз</button>`
    }</div>`;
    if (al && G.dipOpen === k) {
      h += `<div class="aid">${AID.map(
        (a) =>
          `<button data-a="give" data-k="${k}" data-id="${a.id}"><b>${a.n}</b><span>${
            a.id === 'sol' ? '20 солдат' : `${aidCost(G.ME, a.id)} мон.`
          }</span></button>`,
      ).join('')}</div>`;
    }
    h += '</div>';
  }
  if (hid) h += `<button class="sec" id="dipMore">Показать все страны (ещё ${hid})</button>`;
  else if (dipAll && ks.length > 12) h += '<button class="sec" id="dipMore">Только ближайшие</button>';
  h += '<button class="sec" id="dipX">Закрыть</button>';

  const st = el.scrollTop;
  el.innerHTML = h;
  el.scrollTop = st;
  const dipMore = $('dipMore');
  if (dipMore) {
    dipMore.onclick = () => {
      dipAll = !dipAll;
      drawDip();
    };
  }
  const dipX = $('dipX');
  if (dipX) {
    dipX.onclick = () => {
      el.hidden = true;
      $('bDip')?.classList.remove('on');
    };
  }
  el.querySelectorAll<HTMLButtonElement>('button[data-a]').forEach((b) => {
    b.onclick = () => {
      const k = Number(b.dataset.k);
      const a = b.dataset.a;
      let m = '';
      if (a === 'pro') {
        m = proposeAlliance(G.ME, k);
        if (!m) toast(`Союз с ${G.NAMES[k]} заключён`);
      } else if (a === 'aid') {
        G.dipOpen = G.dipOpen === k ? 0 : k;
      } else if (a === 'give') {
        const aidId = b.dataset.id || '';
        m = sendAid(G.ME, k, aidId);
        if (!m) toast(`Помощь отправлена: ${G.NAMES[k]}`);
      } else if (a === 'brk') {
        if (b.dataset.arm !== '1') {
          b.dataset.arm = '1';
          b.textContent = 'Точно?';
          setTimeout(() => {
            if (b.isConnected) {
              b.dataset.arm = '0';
              b.textContent = 'Разорвать';
            }
          }, 3000);
          return;
        }
        breakAlliance(G.ME, k);
        toast(`Союз с ${G.NAMES[k]} расторгнут`);
      }
      if (m) toast(m);
      hud();
      drawDip();
    };
  });
}

function sndIcon(): void {
  const b = $('bSnd');
  const w = $('sndW');
  if (b) b.style.opacity = G.sndOn ? '1' : '0.5';
  if (w) w.style.display = G.sndOn ? '' : 'none';
}

/* ---- Screens: Auth, Home, Setup, Campaign, Leaderboard, Shop, Tasks, Ach, Settings ---- */

const IC = {
  play: '<svg class="ic f" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>',
  camp: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 3v18M5 4h12l-2 4 2 4H5"/></svg>',
  net: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c4 4 4 14 0 18M12 3c-4 4-4 14 0 18"/></svg>',
  shop: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6zM9 8a3 3 0 0 1 6 0"/></svg>',
  task: '<svg class="ic" viewBox="0 0 24 24"><path d="m4 6 2 2 3-3M4 14l2 2 3-3M12 7h8M12 15h8"/></svg>',
  ach: '<svg class="ic" viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8"/></svg>',
  set: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4"/></svg>',
};

function claimable(): number {
  const ts = todayTasks();
  return ts.filter((t) => taskDone(t) && !PF.tasks.claimed[t.id]).length;
}

function applySettings(): void {
  G.sndOn = Boolean(PF.set.snd);
  G.TSp = [3, 5, 8][PF.set.q] ?? 5;
  fitTS();
  sndIcon();
}

function autoQ(): void {
  if (!ACC || !PF.set.auto) return;
  PF.set.auto = 0;
  try {
    const hc = navigator.hardwareConcurrency || 4;
    const dm = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
    if (hc <= 4 || dm <= 2) PF.set.q = 0;
    else if (hc >= 8 && dm >= 8) PF.set.q = 2;
  } catch {
    // ignore
  }
  savePF();
}

function afterLogin(): void {
  const q0 = G.TS;
  applySettings();
  if (G.TS !== q0 && G.tilesSeed >= 0) paintTerrain();
  showHome();
}

function offerTutorial(): void {
  card(
    'Добро пожаловать!',
    '<p>Хотите пройти короткое обучение? За пару минут вы научитесь захватывать землю, строить, штурмовать и заключать союзы. Его можно пропустить и пройти позже в настройках.</p>',
    'Пройти обучение',
    () => {
      const ov = $('ov');
      if (ov) ov.hidden = true;
      startTutorial();
    },
    'Пропустить',
    () => {
      if (!PF.tutDone) PF.tutDone = 2;
      savePF();
      const ov = $('ov');
      if (ov) ov.hidden = true;
    },
  );
}

function authDbStatusText(): string {
  if (supabaseEnabled) {
    return 'Облачное сохранение через Supabase подключено.';
  }
  if (storageMode === 'local') {
    return 'Локальное сохранение в браузере активно (автономный режим).';
  }
  return 'Сохранение прогресса на сервере активно (для облака Supabase нужны только SUPABASE_URL и SUPABASE_ANON_KEY).';
}

function showAuth(mode: 'in' | 'up' = 'up'): void {
  homeBackdrop();
  const up = mode === 'up';
  const dbLabel = authDbStatusText();

  scr(
    '',
    `<div class="auth"><div class="logo"><h1>ПИКСЕЛЬНЫЙ<br>ФРОНТ</h1><p>Войдите, чтобы сохранять прогресс и рейтинг</p></div>
    <div class="tabs"><button id="aIn" class="${up ? '' : 'on'}">Вход</button><button id="aUp" class="${up ? 'on' : ''}">Регистрация</button></div>
    <div class="blk"><label class="fld"><span>Имя игрока</span><input id="aName" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false"></label>
    <label class="fld"><span>Пароль</span><input id="aPass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}"></label>
    ${up ? '<label class="fld"><span>Повторите пароль</span><input id="aPass2" type="password" autocomplete="new-password"></label>' : ''}
    <label class="chk"><input type="checkbox" id="aRem" checked>Запомнить меня на этом устройстве</label>
    <div class="err" id="aErr"></div><button class="big" id="aGo">${up ? 'Создать аккаунт' : 'Войти'}</button></div>
    <p class="ft" id="aCl">${dbLabel}</p></div>`,
    null,
    'auth',
  );

  const aIn = $('aIn');
  const aUp = $('aUp');
  if (aIn) aIn.onclick = () => showAuth('in');
  if (aUp) aUp.onclick = () => showAuth('up');

  let busy = false;
  const go = async () => {
    if (busy) return;
    const nm = $<HTMLInputElement>('aName')?.value || '';
    const pw = $<HTMLInputElement>('aPass')?.value || '';
    const rem = Boolean($<HTMLInputElement>('aRem')?.checked);
    const er = $('aErr');
    if (er) er.textContent = '';
    if (up && pw !== ($<HTMLInputElement>('aPass2')?.value || '')) {
      if (er) er.textContent = 'Пароли не совпадают';
      return;
    }
    busy = true;
    const btn = $<HTMLButtonElement>('aGo');
    if (btn) btn.disabled = true;
    const m = up ? await accRegister(nm, pw, rem) : await accLogin(nm, pw, rem);
    busy = false;
    if (btn) btn.disabled = false;
    if (m) {
      if (er) er.textContent = m;
      return;
    }
    autoQ();
    afterLogin();
    if (up && !PF.tutDone) offerTutorial();
    else toast(`Добро пожаловать, ${ACC?.name || ''}`);
  };
  const aGo = $('aGo');
  if (aGo) aGo.onclick = go;
  document.querySelectorAll<HTMLInputElement>('.auth input').forEach((i) =>
    i.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void go();
      }
    }),
  );
}

function showHome(): void {
  if (!ACC) {
    showAuth('in');
    return;
  }
  homeBackdrop();
  const cl = claimable();
  const col = (PAL.find((p) => p.id === PF.color) || PAL[0]).h;
  const flags = PAL.slice(0, 7)
    .map((p) => `<i style="background:${p.h}"></i>`)
    .join('');

  scr(
    '',
    `<div class="home">
      <div class="me"><div class="av" style="background:${col}">${esc(ACC.name.charAt(0).toUpperCase())}</div><div class="nm"><b>${esc(ACC.name)}</b><span>Рейтинг ${PF.rating} · побед ${statGet('wins')}</span></div><div class="coin"><b>${PF.coins}</b><i></i></div></div>
      <div class="logo"><h1>ПИКСЕЛЬНЫЙ<br>ФРОНТ</h1><div class="flagbar">${flags}</div><p>Стратегия о войне, обороне и захвате</p></div>
      <button class="play" id="mPlay">${IC.play}<div><b>Играть</b><span>Королевская битва: до 64 стран</span></div></button>
      <div class="tiles">
        <button class="tile" id="mCamp">${IC.camp}<b>Кампания</b><span>14 уровней и звёзды</span></button>
        <button class="tile blue" id="mTop">${IC.net}<b>Лидерборд</b><span>Рейтинг лучших игроков</span></button>
        <button class="tile" id="mShop">${IC.shop}<b>Магазин</b><span>Улучшения, технологии, скины</span></button>
        <button class="tile" id="mTask">${IC.task}${cl ? `<u>${cl}</u>` : ''}<b>Задания</b><span>Три новых каждый день</span></button>
        <button class="tile" id="mAch">${IC.ach}<b>Достижения</b><span>${ACH.filter((a) => PF.ach[a.id]).length} из ${ACH.length}</span></button>
        <button class="tile" id="mSet">${IC.set}<b>Настройки</b><span>Графика и звук</span></button>
      </div>
      <div class="links"><button class="link" id="mTut">Обучение</button><button class="link" id="mOut">Сменить аккаунт</button></div>
    </div>`,
    null,
    'home',
  );

  $('mPlay')!.onclick = showSetup;
  $('mCamp')!.onclick = showCampaign;
  $('mTop')!.onclick = showLeaderboard;
  $('mShop')!.onclick = () => showShop('up');
  $('mTask')!.onclick = showTasks;
  $('mAch')!.onclick = showAch;
  $('mSet')!.onclick = () => showSettings(showHome);
  $('mOut')!.onclick = () => {
    void accLogout();
    showAuth('in');
  };
  $('mTut')!.onclick = startTutorial;
}

function startTutorial(): void {
  startBattle(JSON.parse(JSON.stringify(TUTCFG)));
}

const SU = { seed: 0, slot: 1, diff: 1, size: 0 };

function newPreview(cb?: () => void): void {
  SU.seed = (Math.random() * 1e9) | 0;
  loading('Генерируем карту…', () => {
    newGame({ seed: SU.seed, size: SU.size });
    SU.slot = 1 + ((Math.random() * G.NN) | 0);
    cb?.();
  });
}

function drawPreview(): void {
  const cv = $<HTMLCanvasElement>('pv');
  if (!cv) return;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(miniT, 0, 0, cv.width, cv.height);
  const sx = cv.width / G.W;
  const sy = cv.height / G.H;
  const big = G.NN > 8;
  const huge = G.NN >= 32;
  for (let k = 1; k <= G.NN; k++) {
    const sc = G.SC[k];
    if (!sc) continue;
    const x = (sc.x + 0.5) * sx;
    const y = (sc.y + 0.5) * sy;
    const sel = k === SU.slot;
    const rr = huge ? (sel ? 8 : 4.5) : big ? (sel ? 10 : 6) : sel ? 11 : 7;
    c.beginPath();
    c.arc(x, y, rr, 0, Math.PI * 2);
    c.fillStyle = sel ? (PAL.find((p) => p.id === PF.color) || PAL[0]).h : 'rgba(20,24,40,.85)';
    c.fill();
    c.lineWidth = sel ? 3 : 2;
    c.strokeStyle = sel ? '#fff' : '#9aa3c0';
    c.stroke();
    if (!huge || sel) {
      c.fillStyle = sel ? '#111' : '#fff';
      c.font = `700 ${huge ? 9 : big ? (sel ? 11 : 8) : sel ? 13 : 10}px Pixelify Sans,monospace`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(k), x, y + 1);
    }
  }
}

function skinSwatch(cv: HTMLCanvasElement, id: string, col: string): void {
  const c = cv.getContext('2d')!;
  const w = cv.width;
  const h = cv.height;
  const base = [1, 3, 5].map((i) => parseInt(col.substr(i, 2), 16));
  const cs = 4;
  for (let y = 0; y < Math.floor(h / cs); y++) {
    for (let x = 0; x < Math.floor(w / cs); x++) {
      c.fillStyle = rgbs(skinRGB(id, base, x, y));
      c.fillRect(x * cs, y * cs, cs, cs);
    }
  }
  c.strokeStyle = col;
  c.lineWidth = 3;
  c.strokeRect(1.5, 1.5, w - 3, h - 3);
}

function showSetup(): void {
  homeBackdrop();
  SU.diff = PF.set.diff;
  SU.size = PF.set.size || 0;
  const need = !SU.seed || G.tilesSeed !== SU.seed || G.curSize !== SU.size;
  const colors = PAL.map(
    (p) => `<button class="sw${p.id === PF.color ? ' on' : ''}" data-id="${p.id}" style="background:${p.h}" aria-label="${p.n}"></button>`,
  ).join('');
  const skins = SKINS.map(
    (s) =>
      `<button class="sk${PF.skin === s.id ? ' on' : ''}${PF.skins[s.id] ? '' : ' lock'}" data-id="${s.id}"><canvas width="64" height="36"></canvas><span>${s.n}${
        PF.skins[s.id] ? '' : ` · ${s.p}`
      }</span></button>`,
  ).join('');

  scr(
    'Королевская битва',
    `<div class="blk"><h3>Размер карты</h3>${seg(
      SIZES.map((z) => String(z.c)),
      SU.size,
      'ssz',
      'five',
    )}<p class="sm" id="szNote"></p></div>
    <div class="blk"><h3>Место старта</h3><p class="sm">Тапни по точке на карте, чтобы начать с неё. Остальные страны займёт ИИ.</p><canvas id="pv" width="480" height="312"></canvas><button class="sec" id="newMap">Новая карта</button></div>
    <div class="blk"><h3>Цвет страны</h3><div class="sws" id="sws">${colors}</div></div>
    <div class="blk"><h3>Скин территории</h3><div class="sks" id="sks">${skins}</div></div>
    <div class="blk"><h3>Сложность</h3>${seg(
      DIFF.map((d) => d.n),
      SU.diff,
      'sdf',
    )}</div>
    <button class="big" id="go">В бой</button>`,
    showHome,
    'setup',
  );

  const note = () => {
    const el = $('szNote');
    if (el) {
      el.textContent = [
        '8 стран, обычная карта. Быстрая партия.',
        '12 стран, большая карта. Награда ×1,5.',
        '16 стран, огромный континент. Награда ×2.',
        '32 страны, мега-карта. Награда ×3. Долгая партия.',
        '64 страны, гигантский мир. Награда ×4.',
      ][SU.size];
    }
  };
  note();
  if (need) newPreview(drawPreview);
  else drawPreview();

  const pv = $<HTMLCanvasElement>('pv');
  if (pv) {
    pv.onpointerdown = (e) => {
      const r = pv.getBoundingClientRect();
      const fx = ((e.clientX - r.left) / r.width) * G.W;
      const fy = ((e.clientY - r.top) / r.height) * G.H;
      let best = 0;
      let bd = 1e9;
      for (let k = 1; k <= G.NN; k++) {
        const sc = G.SC[k];
        if (!sc) continue;
        const d = Math.hypot(sc.x - fx, sc.y - fy);
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      if (bd < (14 * G.W) / 160 && best) {
        SU.slot = best;
        drawPreview();
        snd(500, 0.06, 'square', 0.03);
      }
    };
  }
  $('newMap')!.onclick = () => newPreview(drawPreview);
  wireSeg('ssz', (i) => {
    SU.size = i;
    PF.set.size = i;
    savePF();
    note();
    newPreview(drawPreview);
  });

  const drawSk = () => {
    const c = (PAL.find((p) => p.id === PF.color) || PAL[0]).h;
    Array.from($('sks')!.children).forEach((b) => {
      const el = b as HTMLElement;
      skinSwatch(el.querySelector('canvas')!, el.dataset.id!, c);
    });
  };
  drawSk();

  Array.from($('sws')!.children).forEach((node) => {
    const b = node as HTMLElement;
    b.onclick = () => {
      PF.color = b.dataset.id!;
      savePF();
      Array.from($('sws')!.children).forEach((x) => x.classList.toggle('on', x === b));
      drawPreview();
      drawSk();
    };
  });
  Array.from($('sks')!.children).forEach((node) => {
    const b = node as HTMLElement;
    b.onclick = () => {
      const id = b.dataset.id!;
      if (!PF.skins[id]) {
        toast(`Скин продаётся в магазине: ${SKINS.find((s) => s.id === id)?.p} монет`);
        return;
      }
      PF.skin = id;
      savePF();
      Array.from($('sks')!.children).forEach((x) => x.classList.toggle('on', x === b));
    };
  });
  wireSeg('sdf', (i) => {
    SU.diff = i;
    PF.set.diff = i;
    savePF();
  });
  $('go')!.onclick = () =>
    startBattle({ size: SU.size, seed: SU.seed, slot: SU.slot, diff: SU.diff, colorId: PF.color, skin: PF.skin });
}

function startBattle(cfg: any): void {
  G.GAMEMODE = cfg.mission ? 'camp' : 'battle';
  if (cfg.mission && cfg.mission.type === 'tut') {
    TUT = { i: 0, shown: -1 };
    TUTF.a0 = 0;
    TUTF.tapped = false;
  }
  loading('Генерируем карту…', () => {
    newGame(cfg);
    $('dipBox')!.hidden = true;
    $('bDip')!.classList.remove('on');
    $('goal')!.className = '';
    $('scr')!.hidden = true;
    $('ov')!.hidden = true;
    buildToolbar();
    startCapture();
  });
}

function levelUnlocked(i: number): boolean {
  return i === 0 || (PF.cstars[LEVELS[i - 1].id] || 0) > 0;
}

function levelCfg(i: number) {
  const L = LEVELS[i];
  return {
    size: L.size || 0,
    seed: L.seed,
    slot: L.slot,
    enemies: L.enemies,
    diff: L.diff,
    startMoney: L.startMoney,
    aiAggr: L.aggr,
    mission: {
      id: L.id,
      idx: i,
      type: L.type,
      goal: L.goal,
      title: L.goal_t,
      allow: L.allow,
      aiMode: L.aiMode,
      calm: L.calm,
      par: L.par,
    },
  };
}

function showCampaign(): void {
  homeBackdrop();
  const cards = LEVELS.map((L, i) => {
    const un = levelUnlocked(i);
    const st = PF.cstars[L.id] || 0;
    return `<button class="lv${un ? '' : ' lock'}" data-i="${i}"><em>${L.id}</em><b>${L.n}</b><span>${
      un ? L.goal_t : 'Пройдите предыдущий уровень'
    }</span><s>${[1, 2, 3].map((n) => `<i class="${n <= st ? 'on' : ''}"></i>`).join('')}</s></button>`;
  }).join('');
  scr(
    'Кампания',
    `<p class="sm">Каждый уровень на заранее заданной карте. До трёх звёзд за выполнение условий, монеты за первое прохождение.</p><div class="lvs">${cards}</div>`,
    showHome,
    'camp',
  );
  document.querySelectorAll<HTMLElement>('.lv').forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.i);
      if (!levelUnlocked(i)) {
        toast('Сначала пройдите предыдущий уровень');
        return;
      }
      showLevelIntro(i);
    };
  });
}

function showLevelIntro(i: number): void {
  const L = LEVELS[i];
  scr(
    `Уровень ${L.id}: ${L.n}`,
    `<div class="blk"><p class="story">${L.story}</p><h3>Цель</h3><p>${L.goal_t}</p><h3>Награда</h3><p>За первое прохождение от 100 до 180 монет, зависит от звёзд.</p></div><button class="big" id="go">Начать уровень</button>`,
    showCampaign,
    'level',
  );
  $('go')!.onclick = () => startBattle(levelCfg(i));
}

/* ---- Leaderboard ---- */

function showLeaderboard(): void {
  homeBackdrop();
  scr(
    'Лидерборд',
    `<div class="blk"><h3>Рейтинг игроков</h3><p class="sm" id="lbInfo">Загружаем таблицу лидеров…</p><div id="lbList"></div></div>`,
    showHome,
    'top',
  );
  void fetchLeaderboard().then(({ list, supabase }) => {
    if (curScr !== 'top') return;
    const info = $('lbInfo');
    const box = $('lbList');
    if (info) {
      info.textContent = supabase
        ? 'Данные из облачной базы Supabase.'
        : storageMode === 'local'
          ? 'Локальный рейтинг устройства (подключите Supabase для общего облака).'
          : 'Локальный серверный рейтинг (подключите Supabase для общего облака).';
    }
    if (box) {
      box.innerHTML = list.length
        ? list
            .map(
              (r, idx) =>
                `<div class="it"><div><b>#${idx + 1} · ${esc(r.name)}</b><span>Побед: ${r.wins}</span></div><em class="rw">${r.rating}</em></div>`,
            )
            .join('')
        : '<p class="sm">Пока нет записей в рейтинге. Сыграйте первый матч!</p>';
    }
  });
}

/* ---- Shop, Tasks, Achievements, Settings ---- */

function showShop(tab: 'up' | 'tc' | 'sk'): void {
  homeBackdrop();
  const tabs = `<div class="tabs"><button class="${tab === 'up' ? 'on' : ''}" id="tUp">Улучшения</button><button class="${
    tab === 'tc' ? 'on' : ''
  }" id="tTc">Технологии</button><button class="${tab === 'sk' ? 'on' : ''}" id="tSk">Скины</button></div>`;
  let body = '';
  if (tab === 'up') {
    body =
      '<p class="sm">Улучшения действуют во всех боях и в кампании.</p>' +
      UPG.map((u) => {
        const l = upLv(u.id);
        const mx = l >= u.max;
        return `<div class="it"><div><b>${u.n}</b><span>${u.d}</span><s>${Array.from(
          { length: u.max },
          (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`,
        ).join('')}</s></div><button class="buy" data-id="${u.id}" ${mx ? 'disabled' : ''}>${
          mx ? 'Максимум' : `${u.c[l]} монет`
        }</button></div>`;
      }).join('');
  } else if (tab === 'tc') {
    body =
      '<p class="sm">Технологии изучаются один раз и действуют во всех боях и в кампании.</p>';
    for (const br of TBRANCH) {
      body +=
        `<h3 class="br">${br}</h3>` +
        TECHS.filter((t) => t.br === br)
          .map((t) => {
            const dn = Boolean(PF.tech[t.id]);
            const lk = Boolean(t.req && !PF.tech[t.req]);
            return `<div class="it${dn ? ' ok' : ''}"><div><b>${t.n}</b><span>${t.e}</span></div><button class="buy" data-id="${
              t.id
            }" ${dn || lk ? 'disabled' : ''}>${dn ? 'Изучено' : lk ? 'Закрыто' : `${t.c} монет`}</button></div>`;
          })
          .join('');
    }
  } else {
    body =
      '<p class="sm">Скины меняют вид вашей территории. Цвет страны выбирается перед боем бесплатно.</p><div class="sks big2" id="sks">' +
      SKINS.map(
        (s) =>
          `<div class="sk${PF.skin === s.id ? ' on' : ''}" data-id="${s.id}"><canvas width="120" height="64"></canvas><span>${
            s.n
          }</span><button class="buy" data-id="${s.id}">${
            PF.skins[s.id] ? (PF.skin === s.id ? 'Выбран' : 'Выбрать') : `${s.p} монет`
          }</button></div>`,
      ).join('') +
      '</div>';
  }
  scr('Магазин', tabs + body, showHome, 'shop');
  $('tUp')!.onclick = () => showShop('up');
  $('tTc')!.onclick = () => showShop('tc');
  $('tSk')!.onclick = () => showShop('sk');
  if (tab === 'sk') {
    const c = (PAL.find((p) => p.id === PF.color) || PAL[0]).h;
    Array.from($('sks')!.children).forEach((b) => {
      const el = b as HTMLElement;
      skinSwatch(el.querySelector('canvas')!, el.dataset.id!, c);
    });
  }
  document.querySelectorAll<HTMLElement>('.buy').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.id!;
      let m = '';
      if (tab === 'up') {
        m = upBuy(id);
        if (!m) {
          toast('Куплено');
          snd(600, 0.15, 'triangle', 0.05, 900);
        }
      } else if (tab === 'tc') {
        m = techBuy(id);
        if (!m) {
          toast('Изучено');
          snd(600, 0.15, 'triangle', 0.05, 900);
        }
      } else {
        if (PF.skins[id]) {
          PF.skin = id;
          savePF();
        } else {
          m = skinBuy(id);
          if (!m) {
            toast('Скин куплен и выбран');
            snd(600, 0.15, 'triangle', 0.05, 900);
          }
        }
      }
      if (m) toast(m);
      const sy = $('scr')!.scrollTop;
      showShop(tab);
      $('scr')!.scrollTop = sy;
    };
  });
}

function showTasks(): void {
  homeBackdrop();
  const ts = todayTasks();
  const rows = ts
    .map((t) => {
      const pr = Math.min(t.goal, PF.tasks.prog[t.st] || 0);
      const done = pr >= t.goal;
      const cl = PF.tasks.claimed[t.id];
      return `<div class="it"><div><b>${t.t}</b><span>${pr} из ${t.goal}</span><div class="pb"><i style="width:${
        (pr / t.goal) * 100
      }%"></i></div></div><button class="buy" data-id="${t.id}" ${cl || !done ? 'disabled' : ''}>${
        cl ? 'Получено' : done ? `Забрать +${t.r}` : `+${t.r}`
      }</button></div>`;
    })
    .join('');
  const all = ts.every((t) => PF.tasks.claimed[t.id]);
  scr(
    'Задания дня',
    `<p class="sm">Три новых задания каждый день. Выполните все три и получите бонус 60 монет.</p>${rows}<p class="sm">${
      PF.tasks.bonus ? 'Бонус за все задания получен.' : all ? 'Бонус получен.' : 'Бонус за все три: +60 монет.'
    }</p>`,
    showHome,
    'tasks',
  );
  document.querySelectorAll<HTMLElement>('.buy').forEach((b) => {
    b.onclick = () => {
      const t = ts.find((x) => x.id === b.dataset.id);
      if (t && claimTask(t)) snd(600, 0.15, 'triangle', 0.05, 900);
      showTasks();
    };
  });
}

function showAch(): void {
  homeBackdrop();
  const done = ACH.filter((a) => PF.ach[a.id]).length;
  scr(
    'Достижения',
    `<p class="sm">Открыто ${done} из ${ACH.length}. За каждое награда в монетах.</p>` +
      ACH.map((a) => {
        const v = Math.min(a.goal, statGet(a.st));
        const ok = Boolean(PF.ach[a.id]);
        return `<div class="it${ok ? ' ok' : ''}"><div><b>${a.n}</b><span>${a.d}</span><div class="pb"><i style="width:${
          (v / a.goal) * 100
        }%"></i></div></div><em class="rw">${ok ? 'Готово' : `+${a.r}`}</em></div>`;
      }).join(''),
    showHome,
    'ach',
  );
}

function showSettings(back: () => void): void {
  homeBackdrop();
  const S = PF.set;
  const row = (l: string, id: string, opts: string[], cur: number) => `<div class="st"><span>${l}</span>${seg(opts, cur, id)}</div>`;
  scr(
    'Настройки',
    row('Качество графики', 'sq', ['Низкое', 'Среднее', 'Высокое'], S.q) +
      row('Частицы и дым', 'sp', ['Выкл', 'Мало', 'Много'], S.part) +
      row('Тени', 'ss', ['Выкл', 'Вкл'], S.shadow) +
      row('Анимация воды', 'sw', ['Выкл', 'Вкл'], S.water) +
      row('Тени облаков', 'sc', ['Выкл', 'Вкл'], S.clouds) +
      row('Смена дня и ночи', 'sn', ['Выкл', 'Вкл'], S.night) +
      row('Сетка клеток', 'sg', ['Выкл', 'Вкл'], S.grid) +
      row('Тряска экрана', 'sk', ['Выкл', 'Вкл'], S.shake) +
      row('Счётчик FPS', 'sf', ['Выкл', 'Вкл'], S.fps) +
      row('Звук', 'sd', ['Выкл', 'Вкл'], S.snd) +
      '<div class="st"><span>Обучение</span><button class="sec" id="tutB">Пройти обучение</button></div>' +
      `<div class="st"><span>Аккаунт: ${esc(ACC?.name || 'Игрок')}</span><button class="sec" id="lgo">Выйти из аккаунта</button></div>` +
      '<div class="st"><span>Прогресс</span><button class="sec" id="rst">Сбросить всё</button></div><p class="sm" id="rstT"></p>',
    back,
    'set',
  );
  $('lgo')!.onclick = () => {
    void accLogout();
    showAuth('in');
  };
  $('tutB')!.onclick = startTutorial;
  wireSeg('sq', (i) => {
    S.q = i;
    G.TSp = [3, 5, 8][i];
    fitTS();
    savePF();
    loading('Применяем графику…', () => {
      if (G.tilesSeed >= 0) paintTerrain();
    });
  });
  wireSeg('sp', (i) => {
    S.part = i;
    savePF();
  });
  wireSeg('ss', (i) => {
    S.shadow = i;
    savePF();
  });
  wireSeg('sw', (i) => {
    S.water = i;
    savePF();
  });
  wireSeg('sc', (i) => {
    S.clouds = i;
    savePF();
  });
  wireSeg('sn', (i) => {
    S.night = i;
    savePF();
  });
  wireSeg('sg', (i) => {
    S.grid = i;
    savePF();
  });
  wireSeg('sk', (i) => {
    S.shake = i;
    savePF();
  });
  wireSeg('sf', (i) => {
    S.fps = i;
    savePF();
  });
  wireSeg('sd', (i) => {
    S.snd = i;
    G.sndOn = Boolean(i);
    sndIcon();
    savePF();
  });
  let armed = false;
  $('rst')!.onclick = () => {
    if (!armed) {
      armed = true;
      $('rst')!.textContent = 'Нажмите ещё раз';
      $('rstT')!.textContent = 'Будут стёрты монеты, покупки, достижения и настройки.';
      return;
    }
    resetPF();
    applySettings();
    toast('Прогресс сброшен');
    showSettings(back);
  };
}

/* ---- Pause & End Game ---- */

function leaveToMenu(): void {
  G.ME = 1;
  G.WSEED = null;
  G.paused = false;
  G.phase = 'intro';
  G.MISSION = null;
  $('goal')!.hidden = true;
  $('count')!.hidden = true;
  newGame({ paint: false, seed: G.worldSeed, size: G.curSize });
  $('dipBox')!.hidden = true;
  $('goal')!.className = '';
  TUT = { i: 0, shown: -1 };
  refreshTools();
  showHome();
}

function pauseMenu(): void {
  if (G.phase !== 'play' && G.phase !== 'cap') return;
  G.paused = true;
  card(
    'Пауза',
    '<p>Игра на паузе.</p>',
    'Продолжить',
    () => {
      $('ov')!.hidden = true;
      G.paused = false;
    },
    'Выйти в меню',
    () => {
      card(
        'Выйти в меню?',
        '<p>Текущий бой будет потерян.</p>',
        'Выйти',
        () => {
          $('ov')!.hidden = true;
          leaveToMenu();
        },
        'Назад',
        pauseMenu,
      );
    },
  );
}

function showEnd(win: boolean, r: EndReward): void {
  setTimeout(() => {
    if (G.phase !== 'end') return;
    const stars = r.stars
      ? `<div class="stars">${[1, 2, 3].map((n) => `<i class="${n <= r.stars ? 'on' : ''}"></i>`).join('')}</div>`
      : '';
    const tutm = Boolean(G.MISSION && G.MISSION.type === 'tut');
    const camp = Boolean(G.MISSION && !tutm);
    const nextI = camp && G.MISSION ? G.MISSION.idx + 1 : -1;
    const html =
      `<p>${
        win
          ? camp
            ? 'Задача выполнена.'
            : 'Все вражеские столицы уничтожены или присоединены.'
          : 'Ваша столица уничтожена. Страна пала.'
      }</p>${stars}<p>Время боя: ${Math.floor(G.gameT / 60)} мин ${Math.floor(G.gameT % 60)} с.</p><div class="rew">${r.lines
        .map((l) => `<div>${esc(l)}</div>`)
        .join('')}<div class="tot">Монет получено: ${r.coins}</div></div>`;

    if (tutm) {
      card(
        'ОБУЧЕНИЕ ПРОЙДЕНО',
        `<p>Вы освоили основы: захват, постройки, штурм, ПВО и союзы. Дальше можно играть в королевскую битву или проходить кампанию.</p><div class="rew">${r.lines
          .map((l) => `<div>${esc(l)}</div>`)
          .join('')}<div class="tot">Монет получено: ${r.coins}</div></div>`,
        'В меню',
        () => {
          $('ov')!.hidden = true;
          leaveToMenu();
        },
      );
    } else if (camp && win && nextI < LEVELS.length) {
      card(
        'ПОБЕДА',
        html,
        'Следующий уровень',
        () => {
          $('ov')!.hidden = true;
          showLevelIntro(nextI);
        },
        'В меню',
        () => {
          $('ov')!.hidden = true;
          leaveToMenu();
        },
      );
    } else if (camp && !win && G.MISSION) {
      card(
        'ПОРАЖЕНИЕ',
        html,
        'Повторить',
        () => {
          $('ov')!.hidden = true;
          startBattle(levelCfg(G.MISSION!.idx));
        },
        'В меню',
        () => {
          $('ov')!.hidden = true;
          leaveToMenu();
        },
      );
    } else {
      card(win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ', html, 'В меню', () => {
        $('ov')!.hidden = true;
        leaveToMenu();
      });
    }
  }, 1300);
}

function startCapture(): void {
  $('ov')!.hidden = true;
  $('scr')!.hidden = true;
  G.phase = 'cap';
  G.capT = 5;
  $('count')!.hidden = false;
  $('wrap')!.classList.add('cap');
  const c = G.SC[G.ME] || { x: G.W / 2, y: G.H / 2 };
  G.cam.cx = c.x + 0.5;
  G.cam.cy = c.y + 0.5;
  G.cam.z = Math.max(G.fitZ, Math.min(G.cw, G.ch) / 24);
  G.camGoal = null;
  G.speed = 1;
  const bSpd = $('bSpd');
  if (bSpd) bSpd.textContent = '×1';
  setTool('hand');
  $('hint')!.textContent = '';
  snd(440, 0.15, 'square', 0.05, 880);
  track('games');
  refreshTools();
  G.paused = false;
}

function onEndCaptureUI(): void {
  $('count')!.hidden = true;
  $('wrap')!.classList.remove('cap');
  const c = G.SC[G.ME] || { x: G.W / 2, y: G.H / 2 };
  G.camGoal = { cx: c.x + 0.5, cy: c.y + 0.5, z: Math.max(G.fitZ, Math.min(G.cw, G.ch) / 32) };
  toast(`Захвачено ${Math.round((G.P[G.ME]!.tiles / G.landTotal) * 100)}% суши. Стройте экономику и ПВО!`);
  setTool('hand');
  hud();
  snd(660, 0.3, 'triangle', 0.06, 330);
}

/* ---- Boot & Input Wiring ---- */

let booted = false;

export function bootGame(): () => void {
  if (booted) return () => {};
  booted = true;

  setPfNotify(toast);
  setSimHooks({
    toast,
    hud,
    closeInfo,
    offerUI,
    dipRefresh,
    onEndCapture: onEndCaptureUI,
    onShowEnd: showEnd,
  });

  // Wire HUD buttons
  $('infX')!.onclick = closeInfo;
  $('infR')!.onclick = () => {
    let m = '';
    if (infMode === 'repair' && G.selB) {
      m = doAct('repair', { x: G.selB.x, y: G.selB.y, b: G.selB });
      if (!m) {
        toast('Починено');
        closeInfo();
      }
    } else if (infMode === 'aim' && G.aim.on) {
      const { tx, ty } = G.aim;
      const x = Math.floor(tx);
      const y = Math.floor(ty);
      if (G.tool === 'missile') m = doAct('missile', { tx, ty });
      else if (G.tool === 'drone') m = doAct('drone', { tx, ty });
      else if (G.tool === 'assault') m = doAct('assault', { x, y });
      else if (G.tool === 'tank') m = doAct('tank', { x, y });
      else if (G.tool === 'rpg') m = doAct('rpg', { x, y });
      else if (G.tool === 'plane') m = doAct('plane', { tx, ty });
      if (!m) closeInfo();
    }
    if (m) toast(m);
    hud();
  };

  $('rank')!.addEventListener('click', (e) => {
    const d = (e.target as HTMLElement).closest<HTMLElement>('[data-k]');
    if (!d) return;
    const k = Number(d.dataset.k);
    const c = G.SC[k];
    if (c && (G.P[k]?.alive || k === G.ME)) {
      G.camGoal = { cx: c.x + 0.5, cy: c.y + 0.5, z: Math.max(G.fitZ, Math.min(G.cw, G.ch) / 28) };
    }
  });
  $('bRank')!.onclick = () => {
    const r = $('rank')!;
    r.hidden = !r.hidden;
    if (!r.hidden) {
      $('dipBox')!.hidden = true;
      $('bDip')!.classList.remove('on');
    }
    $('bRank')!.classList.toggle('on', !r.hidden);
    if (!r.hidden) drawRank();
  };
  $('bDip')!.onclick = () => {
    const el = $('dipBox')!;
    el.hidden = !el.hidden;
    $('bDip')!.classList.toggle('on', !el.hidden);
    if (!el.hidden) {
      $('rank')!.hidden = true;
      $('bRank')!.classList.remove('on');
      drawDip();
    }
  };
  $('offY')!.onclick = () => {
    if (!G.OFFER) return;
    const f = G.OFFER.from;
    G.OFFER = null;
    offerUI();
    if (G.P[f]?.alive && allyCount(G.ME) < maxAllies(G.ME)) {
      setAlly(G.ME, f, 1);
      toast('Союз заключён');
    } else {
      toast('Лимит союзников');
    }
  };
  $('offN')!.onclick = () => {
    if (G.OFFER) {
      G.DCD[pairKey(G.OFFER.from, G.ME)] = G.gameT + 40;
      if (G.REL[G.OFFER.from]) G.REL[G.OFFER.from][G.ME] -= 5;
    }
    G.OFFER = null;
    offerUI();
  };
  $('bSpd')!.onclick = () => {
    G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : G.speed === 3 ? 5 : 1;
    $('bSpd')!.textContent = `×${G.speed}`;
  };
  $('bSnd')!.onclick = () => {
    PF.set.snd = PF.set.snd ? 0 : 1;
    G.sndOn = Boolean(PF.set.snd);
    sndIcon();
    savePF();
    snd(500, 0.1, 'square', 0.04);
  };
  $('bMenu')!.onclick = pauseMenu;
  $('bHome')!.onclick = () => {
    const c = G.SC[G.ME];
    if (!c) return;
    G.camGoal = { cx: c.x + 0.5, cy: c.y + 0.5, z: Math.max(G.fitZ, Math.min(G.cw, G.ch) / 28) };
    snd(520, 0.06, 'square', 0.03);
  };

  // Canvas & Minimap Pointer Events
  const cvs = $<HTMLCanvasElement>('cv')!;
  const mmc = $<HTMLCanvasElement>('mm')!;
  const pts = new Map<number, { x: number; y: number }>();
  let moved = 0;
  let lastPaint: { x: number; y: number } | null = null;
  let pinchD = 0;

  const lp = (e: PointerEvent | WheelEvent) => {
    const r = cvs.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * G.cw) / r.width, y: ((e.clientY - r.top) * G.ch) / r.height };
  };
  const tileAt = (p: { x: number; y: number }) => {
    const w = s2w(p.x, p.y);
    return { x: Math.floor(w.x), y: Math.floor(w.y), wx: w.x, wy: w.y };
  };
  const setHover = (p: { x: number; y: number }) => {
    if (G.phase !== 'play' || !G.brush) {
      G.hover = null;
      return;
    }
    const t = tileAt(p);
    if (t.x < 0 || t.y < 0 || t.x >= G.W || t.y >= G.H) {
      G.hover = null;
      return;
    }
    const i = t.y * G.W + t.x;
    const ok = G.OWN[i] === G.ME && G.T[i] >= 2 && G.T[i] <= 4 && G.BLD[i] < 0 && (G.P[G.ME]?.money || 0) >= BT[G.brush].c;
    G.hover = { x: t.x, y: t.y, ok };
  };
  const tap = (p: { x: number; y: number }) => {
    const t = tileAt(p);
    const { x, y } = t;
    if (x < 0 || y < 0 || x >= G.W || y >= G.H) return;
    if (G.tool === 'hand') {
      const bi = G.BLD[y * G.W + x];
      const b = bi >= 0 ? G.B[bi] : null;
      if (b && b.o === G.ME) {
        G.selB = b;
        TUTF.tapped = true;
        const nm = b.cap ? 'Столица' : BT[b.t].n;
        const need = Math.ceil((b.max - b.hp) * 0.5 * (1 - 0.3 * tk(G.ME, 'fort2')));
        showInfo(`${nm}: ${Math.ceil(b.hp)}/${b.max} HP`, need > 0 ? `Починить ${need}` : '', 'repair');
      } else if (b) {
        showInfo(`${b.cap ? 'Столица' : BT[b.t].n} · ${G.NAMES[b.o]}`, '', '');
        G.selB = b;
      } else {
        closeInfo();
      }
      return;
    }
    if (G.brush) {
      const m = doAct('place', { t: G.brush, x, y });
      if (m) toast(m);
      hud();
      return;
    }
    G.aim.on = true;
    G.aim.tx = t.wx;
    G.aim.ty = t.wy;
    if (G.tool === 'assault' || G.tool === 'tank' || G.tool === 'rpg') {
      G.aim.tx = x + 0.5;
      G.aim.ty = y + 0.5;
    }
    aimCheck();
  };

  cvs.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    cvs.setPointerCapture(e.pointerId);
    const p = lp(e);
    pts.set(e.pointerId, p);
    if (pts.size === 1) moved = 0;
    if (pts.size === 2) {
      const v = [...pts.values()];
      pinchD = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
      moved = 99;
    }
    if (G.phase === 'cap' && pts.size === 1) {
      lastPaint = s2w(p.x, p.y);
      paintMe(lastPaint.x, lastPaint.y, 1.6);
    } else if (pts.size === 1) {
      setHover(p);
    }
  });
  cvs.addEventListener('pointermove', (e) => {
    const p = lp(e);
    if (e.pointerType === 'mouse' && !pts.size) setHover(p);
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId)!;
    pts.set(e.pointerId, p);
    if (G.phase === 'cap') {
      const w = s2w(p.x, p.y);
      if (lastPaint) {
        const dx = w.x - lastPaint.x;
        const dy = w.y - lastPaint.y;
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.5));
        for (let i = 1; i <= n; i++) paintMe(lastPaint.x + (dx * i) / n, lastPaint.y + (dy * i) / n, 1.6);
      }
      lastPaint = w;
      return;
    }
    if (pts.size === 2) {
      const v = [...pts.values()];
      const d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
      if (pinchD > 0) zoomAt((v[0].x + v[1].x) / 2, (v[0].y + v[1].y) / 2, d / pinchD);
      pinchD = d;
      moved = 99;
    } else {
      moved += Math.hypot(p.x - prev.x, p.y - prev.y);
      if (moved > 10) {
        G.cam.cx -= (p.x - prev.x) / G.cam.z;
        G.cam.cy -= (p.y - prev.y) / G.cam.z;
        clampCam();
        G.camGoal = null;
        G.hover = null;
      } else {
        setHover(p);
      }
    }
  });
  const onUp = (e: PointerEvent, cancel: boolean) => {
    const had = pts.has(e.pointerId);
    const single = pts.size === 1;
    pts.delete(e.pointerId);
    pinchD = 0;
    if (G.phase === 'cap') {
      lastPaint = null;
      return;
    }
    if (!cancel && had && single && moved <= 10 && G.phase === 'play') tap(lp(e));
  };
  cvs.addEventListener('pointerup', (e) => onUp(e, false));
  cvs.addEventListener('pointercancel', (e) => onUp(e, true));
  cvs.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const p = lp(e);
      zoomAt(p.x, p.y, e.deltaY < 0 ? 1.18 : 0.85);
    },
    { passive: false },
  );
  cvs.addEventListener('contextmenu', (e) => e.preventDefault());
  $('zin')!.onclick = () => zoomAt(G.cw / 2, G.ch / 2, 1.35);
  $('zout')!.onclick = () => zoomAt(G.cw / 2, G.ch / 2, 0.74);

  let mmDown = false;
  const mmMove = (e: PointerEvent) => {
    const r = mmc.getBoundingClientRect();
    G.cam.cx = ((e.clientX - r.left) / r.width) * G.W;
    G.cam.cy = ((e.clientY - r.top) / r.height) * G.H;
    clampCam();
    G.camGoal = null;
  };
  mmc.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    mmc.setPointerCapture(e.pointerId);
    mmDown = true;
    mmMove(e);
  });
  mmc.addEventListener('pointermove', (e) => {
    if (mmDown) mmMove(e);
  });
  mmc.addEventListener('pointerup', () => {
    mmDown = false;
  });
  mmc.addEventListener('pointercancel', () => {
    mmDown = false;
  });

  const onVis = () => {
    if (document.hidden && G.phase === 'play' && !G.paused && $('ov')!.hidden) pauseMenu();
  };
  document.addEventListener('visibilitychange', onVis);

  const onResize = () => {
    resizeCanvas();
    clampCam();
  };
  window.addEventListener('resize', onResize);

  // Main Animation Loop
  let lastT = 0;
  let menuT = 0;
  let upMs = 1;
  let rafId = 0;

  const frame = (t: number) => {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    if (G.camGoal) {
      const k = Math.min(1, dt * 3);
      G.cam.cx += (G.camGoal.cx - G.cam.cx) * k;
      G.cam.cy += (G.camGoal.cy - G.cam.cy) * k;
      G.cam.z += (G.camGoal.z - G.cam.z) * k;
      clampCam();
      if (Math.abs(G.camGoal.z - G.cam.z) < 0.03 && Math.abs(G.camGoal.cx - G.cam.cx) < 0.1) G.camGoal = null;
    }
    if (G.phase === 'intro') {
      menuT += dt;
      G.cam.z = Math.max(G.cw / G.W, G.ch / G.H) * (1.08 + Math.sin(menuT * 0.25) * 0.05);
      G.cam.cx = G.W / 2 + Math.sin(menuT * 0.2) * 12;
      G.cam.cy = G.H / 2 + Math.cos(menuT * 0.17) * 6;
      clampCam();
    }
    if (!G.paused) {
      if (G.phase === 'play') evTick(dt * G.speed);
      let steps = G.phase === 'play' ? G.speed : 1;
      if (steps > 1) steps = Math.max(1, Math.min(steps, Math.floor(22 / Math.max(1, upMs))));
      const t0 = performance.now();
      for (let i = 0; i < steps; i++) updateWorld(dt);
      upMs = upMs * 0.9 + ((performance.now() - t0) / steps) * 0.1;
    }
    if (G.phase === 'cap') {
      recount();
      hud();
      const cT = $('cT');
      const cB = $('cB');
      if (cT) cT.textContent = Math.max(0, G.capT).toFixed(1);
      if (cB) cB.style.width = `${(Math.max(0, G.capT) / 5) * 100}%`;
    }
    renderWorld(t);
    rafId = requestAnimationFrame(frame);
  };

  // Boot world + auto auth
  allocWorld(0);
  G.worldReady = true;
  applySettings();
  resizeCanvas();
  buildToolbar();
  const sd = (Math.random() * 1e9) | 0;
  genTiles(sd);
  G.tilesSeed = sd;
  G.worldSeed = sd;
  paintMini();
  paintTerrain();
  newGame({ seed: sd, paint: false });
  showAuth('up');
  void probeBackend().then(() => {
    const cl = $('aCl');
    if (cl && curScr === 'auth') cl.textContent = authDbStatusText();
    void accAuto().then((auto) => {
      if (auto) {
        autoQ();
        afterLogin();
      }
    });
  });
  hud();
  const hudTimer = setInterval(hud, 250);
  rafId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(rafId);
    clearInterval(hudTimer);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
  };
}
