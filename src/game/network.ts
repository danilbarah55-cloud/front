import { authToken, ACC } from './profile.ts';

export interface PartyMember {
  peer: string;
  slug: string;
  name: string;
  slot: number;
  color: string;
  skin: string;
  ready: boolean;
  isHost: boolean;
}

export interface PartyChatEntry {
  name: string;
  text: string;
  ts: number;
}

export interface PartyState {
  code: string;
  isParty: boolean;
  hostPeer: string;
  mode: 'coop' | 'ffa';
  size: number;
  diff: number;
  started: boolean;
  maxPlayers: number;
  members: PartyMember[];
  chat: PartyChatEntry[];
}

export interface GameStartPayload {
  code: string;
  hostPeer: string;
  mode: 'coop' | 'ffa';
  size: number;
  diff: number;
  seed: number;
  slots: Record<string, number>;
  cols: Record<number, string>;
  skins: Record<number, string>;
  names: Record<number, string>;
  partyAllies: number[];
}

export const MP = {
  on: false,
  host: false,
  code: '',
  mode: 'ffa' as 'coop' | 'ffa',
  myPeer: '',
  slots: {} as Record<string, number>,
  started: false,
  paintBuf: [] as Array<[number, number]>,
  paintT: 0,
  snapT: 0,
  band: 0,
  blT: 0,
  blV: 0,
  lastSnap: 0,
  blBuf: null as { v: number; n: number; got: Record<number, any[]> } | null,
  lostShown: false,
  inPartyLobby: false,
};

let ws: WebSocket | null = null;
let connectPromise: Promise<void> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export let partyState: PartyState | null = null;
export let queueActive = false;
export let queueCount = 0;

interface NetworkHooks {
  onPartyState?: (st: PartyState | null) => void;
  onPartyChat?: (entry: PartyChatEntry) => void;
  onPartyError?: (msg: string) => void;
  onPartyKicked?: (reason: string) => void;
  onQueueState?: (count: number) => void;
  onQueueMatched?: (code: string, isHost: boolean) => void;
  onAutoStartRequest?: (code: string) => void;
  onGameStart?: (data: GameStartPayload) => void;
  onGameMsg?: (topic: string, from: string, data: any) => void;
  onPeerLeft?: (peer: string, slot: number, name: string) => void;
  onStatusChange?: () => void;
}

const hooks: NetworkHooks = {};

export function setNetworkHooks(next: NetworkHooks): void {
  Object.assign(hooks, next);
}

export function isWsOpen(): boolean {
  return Boolean(ws && ws.readyState === WebSocket.OPEN);
}

export function getWsStatusText(): string {
  if (!ws) return 'подключение…';
  if (ws.readyState === WebSocket.OPEN) return 'онлайн (сервер активен)';
  if (ws.readyState === WebSocket.CONNECTING) return 'подключаемся к серверу…';
  return 'переподключение…';
}

export function sendWs(payload: unknown): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function syncWsAuth(): void {
  if (!isWsOpen()) return;
  sendWs({
    type: 'auth_update',
    token: authToken,
    name: ACC?.name || 'Игрок',
  });
}

export function connectWs(): Promise<void> {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }
  if (connectPromise) return connectPromise;

  connectPromise = new Promise<void>((resolve) => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const qs = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    const socket = new WebSocket(`${proto}//${location.host}/ws${qs}`);
    ws = socket;
    let settled = false;

    const finish = () => {
      if (!settled) {
        settled = true;
        connectPromise = null;
        resolve();
      }
    };

    const timeout = setTimeout(finish, 4000);

    socket.addEventListener('open', () => {
      clearTimeout(timeout);
      syncWsAuth();
      hooks.onStatusChange?.();
      finish();
    });

    socket.addEventListener('message', (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const t = msg.type;
      if (t === 'welcome') {
        MP.myPeer = String(msg.peer || '');
        hooks.onStatusChange?.();
      } else if (t === 'queue_state') {
        queueCount = Number(msg.count) || 0;
        hooks.onQueueState?.(queueCount);
      } else if (t === 'queue_matched') {
        queueActive = false;
        MP.code = String(msg.code || '');
        MP.host = Boolean(msg.isHost);
        hooks.onQueueMatched?.(MP.code, MP.host);
      } else if (t === 'auto_start_request') {
        if (partyState && partyState.code === msg.code && partyState.hostPeer === MP.myPeer) {
          hooks.onAutoStartRequest?.(String(msg.code));
        }
      } else if (t === 'party_state') {
        partyState = msg as PartyState;
        MP.code = partyState.code;
        MP.host = partyState.hostPeer === MP.myPeer;
        MP.mode = partyState.mode;
        hooks.onPartyState?.(partyState);
      } else if (t === 'party_chat') {
        const entry = msg.entry as PartyChatEntry;
        if (partyState && entry) {
          partyState.chat = [...partyState.chat, entry].slice(-30);
        }
        if (entry) hooks.onPartyChat?.(entry);
      } else if (t === 'party_error') {
        hooks.onPartyError?.(String(msg.error || 'Ошибка пати'));
      } else if (t === 'party_kicked') {
        partyState = null;
        MP.code = '';
        MP.host = false;
        MP.inPartyLobby = false;
        hooks.onPartyKicked?.(String(msg.reason || 'Вы были исключены из пати'));
      } else if (t === 'game_start') {
        hooks.onGameStart?.(msg as GameStartPayload);
      } else if (t === 'peer_left') {
        hooks.onPeerLeft?.(String(msg.peer || ''), Number(msg.slot) || 0, String(msg.name || ''));
      } else if (t === 'game_msg') {
        hooks.onGameMsg?.(String(msg.topic || ''), String(msg.from || ''), msg.data);
      }
    });

    socket.addEventListener('close', () => {
      clearTimeout(timeout);
      if (ws === socket) ws = null;
      connectPromise = null;
      hooks.onStatusChange?.();
      finish();
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          void connectWs();
        }, 2000);
      }
    });

    socket.addEventListener('error', () => {
      clearTimeout(timeout);
      hooks.onStatusChange?.();
      finish();
    });
  });

  return connectPromise;
}

export async function ensureWs(): Promise<boolean> {
  await connectWs();
  if (isWsOpen()) return true;
  await new Promise((r) => setTimeout(r, 300));
  return isWsOpen();
}

export function emitGame(topic: string, data: unknown): void {
  sendWs({ type: 'game_msg', topic, data });
}

export async function joinQuickQueue(color: string, skin: string): Promise<boolean> {
  if (!(await ensureWs())) return false;
  queueActive = true;
  return sendWs({ type: 'queue_join', color, skin });
}

export function leaveQuickQueue(): void {
  queueActive = false;
  queueCount = 0;
  sendWs({ type: 'queue_leave' });
}

export async function createParty(opts: {
  code?: string;
  name: string;
  color: string;
  skin: string;
  mode: 'coop' | 'ffa';
  size: number;
  diff: number;
}): Promise<boolean> {
  if (!(await ensureWs())) return false;
  return sendWs({
    type: 'party_create',
    isParty: true,
    ...opts,
  });
}

export async function joinParty(opts: {
  code: string;
  name: string;
  color: string;
  skin: string;
}): Promise<boolean> {
  if (!(await ensureWs())) return false;
  return sendWs({
    type: 'party_join',
    ...opts,
  });
}

export function leaveParty(): void {
  partyState = null;
  MP.code = '';
  MP.host = false;
  MP.inPartyLobby = false;
  sendWs({ type: 'party_leave' });
}

export function updateParty(patch: {
  color?: string;
  skin?: string;
  ready?: boolean;
  mode?: 'coop' | 'ffa';
  size?: number;
  diff?: number;
}): void {
  sendWs({ type: 'party_update', ...patch });
}

export function kickPartyMember(peer: string): void {
  sendWs({ type: 'party_kick', peer });
}

export function sendPartyChat(text: string): void {
  sendWs({ type: 'party_chat', text });
}

export function startPartyMatch(): void {
  sendWs({ type: 'party_start' });
}

export function returnPartyToLobby(): void {
  sendWs({ type: 'party_return' });
}

export function reportGameEnd(winners: number[], winnerNames: string[]): void {
  sendWs({ type: 'game_end', winners, winnerNames });
}

export function resetPartyStateOnly(): void {
  partyState = null;
}
