import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

export interface PlayerRecord {
  slug: string;
  name: string;
  salt: string;
  password_hash: string;
  coins: number;
  rating: number;
  wins: number;
  profile: Record<string, unknown>;
  updated_at: string;
}

export interface PartyMemberRecord {
  peer: string;
  slug: string;
  name: string;
  slot: number;
  color: string;
  skin: string;
  ready: boolean;
  isHost: boolean;
}

export interface PartyRecord {
  code: string;
  host_slug: string;
  mode: 'coop' | 'ffa';
  map_size: number;
  diff: number;
  status: 'lobby' | 'playing' | 'ended';
  members: PartyMemberRecord[];
  updated_at: string;
}

export interface MatchRecord {
  party_code: string | null;
  mode: string;
  winner_names: string;
  duration_sec: number;
  player_count: number;
}

interface LocalStore {
  players: Record<string, PlayerRecord>;
  parties: Record<string, PartyRecord>;
  matches: MatchRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'pixelfront-db.json');

let supabase: SupabaseClient | null = null;
let supabaseReady = false;

function initSupabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();

  if (url && key && url.startsWith('http')) {
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    supabaseReady = true;
    console.log('[DB] Supabase client initialized');
  } else {
    console.log(
      '[DB] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using local persistent store (.data/pixelfront-db.json)',
    );
  }
}

initSupabase();

function readLocalStore(): LocalStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<LocalStore>;
      return {
        players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
        parties: parsed.parties && typeof parsed.parties === 'object' ? parsed.parties : {},
        matches: Array.isArray(parsed.matches) ? parsed.matches : [],
      };
    }
  } catch (err) {
    console.error('[DB] Failed reading local store:', err);
  }
  return { players: {}, parties: {}, matches: [] };
}

function writeLocalStore(store: LocalStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed writing local store:', err);
  }
}

export function isSupabaseConnected(): boolean {
  return supabaseReady && supabase !== null;
}

export async function getPlayerBySlug(slug: string): Promise<PlayerRecord | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('slug, name, salt, password_hash, coins, rating, wins, profile, updated_at')
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) {
        return data as PlayerRecord;
      }
      if (error && error.code !== 'PGRST116') {
        console.error('[Supabase] getPlayerBySlug error:', error.message);
      }
    } catch (err) {
      console.error('[Supabase] getPlayerBySlug exception:', err);
    }
  }

  const local = readLocalStore();
  return local.players[slug] || null;
}

export async function createPlayerRecord(rec: PlayerRecord): Promise<void> {
  const local = readLocalStore();
  local.players[rec.slug] = rec;
  writeLocalStore(local);

  if (supabase) {
    try {
      const { error } = await supabase.from('players').insert({
        slug: rec.slug,
        name: rec.name,
        salt: rec.salt,
        password_hash: rec.password_hash,
        coins: rec.coins,
        rating: rec.rating,
        wins: rec.wins,
        profile: rec.profile,
        updated_at: rec.updated_at,
      });
      if (error) {
        console.error('[Supabase] createPlayerRecord error:', error.message);
      }
    } catch (err) {
      console.error('[Supabase] createPlayerRecord exception:', err);
    }
  }
}

export async function updatePlayerProfileRecord(
  slug: string,
  profile: Record<string, unknown>,
): Promise<void> {
  const coins = typeof profile.coins === 'number' ? Math.max(0, Math.floor(profile.coins)) : 0;
  const rating = typeof profile.rating === 'number' ? Math.max(0, Math.floor(profile.rating)) : 0;
  const stats =
    profile.stats && typeof profile.stats === 'object'
      ? (profile.stats as Record<string, unknown>)
      : {};
  const wins = typeof stats.wins === 'number' ? Math.max(0, Math.floor(stats.wins)) : 0;
  const updatedAt = new Date().toISOString();

  const local = readLocalStore();
  if (local.players[slug]) {
    local.players[slug].profile = profile;
    local.players[slug].coins = coins;
    local.players[slug].rating = rating;
    local.players[slug].wins = wins;
    local.players[slug].updated_at = updatedAt;
    writeLocalStore(local);
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from('players')
        .update({
          coins,
          rating,
          wins,
          profile,
          updated_at: updatedAt,
        })
        .eq('slug', slug);
      if (error) {
        console.error('[Supabase] updatePlayerProfileRecord error:', error.message);
      }
    } catch (err) {
      console.error('[Supabase] updatePlayerProfileRecord exception:', err);
    }
  }
}

export async function getLeaderboardRecords(
  limit = 15,
): Promise<Array<{ name: string; rating: number; wins: number }>> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('name, rating, wins')
        .order('rating', { ascending: false })
        .limit(limit);
      if (!error && Array.isArray(data)) {
        return data.map((r) => ({
          name: String(r.name),
          rating: Number(r.rating) || 0,
          wins: Number(r.wins) || 0,
        }));
      }
    } catch (err) {
      console.error('[Supabase] getLeaderboardRecords exception:', err);
    }
  }

  const local = readLocalStore();
  return Object.values(local.players)
    .sort((a, b) => b.rating - a.rating || b.wins - a.wins)
    .slice(0, limit)
    .map((p) => ({ name: p.name, rating: p.rating, wins: p.wins }));
}

export async function upsertPartyRecord(party: PartyRecord): Promise<void> {
  const local = readLocalStore();
  local.parties[party.code] = party;
  writeLocalStore(local);

  if (supabase) {
    try {
      const { error } = await supabase.from('parties').upsert(
        {
          code: party.code,
          host_slug: party.host_slug,
          mode: party.mode,
          map_size: party.map_size,
          diff: party.diff,
          status: party.status,
          members: party.members,
          updated_at: party.updated_at,
        },
        { onConflict: 'code' },
      );
      if (error) {
        console.error('[Supabase] upsertPartyRecord error:', error.message);
      }
    } catch (err) {
      console.error('[Supabase] upsertPartyRecord exception:', err);
    }
  }
}

export async function deletePartyRecord(code: string): Promise<void> {
  const local = readLocalStore();
  delete local.parties[code];
  writeLocalStore(local);

  if (supabase) {
    try {
      const { error } = await supabase.from('parties').delete().eq('code', code);
      if (error) {
        console.error('[Supabase] deletePartyRecord error:', error.message);
      }
    } catch (err) {
      console.error('[Supabase] deletePartyRecord exception:', err);
    }
  }
}

export async function recordMatchResult(match: MatchRecord): Promise<void> {
  const local = readLocalStore();
  local.matches.push(match);
  if (local.matches.length > 200) {
    local.matches = local.matches.slice(-200);
  }
  writeLocalStore(local);

  if (supabase) {
    try {
      const { error } = await supabase.from('matches').insert(match);
      if (error) {
        console.error('[Supabase] recordMatchResult error:', error.message);
      }
    } catch (err) {
      console.error('[Supabase] recordMatchResult exception:', err);
    }
  }
}
