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

interface LocalStore {
  players: Record<string, PlayerRecord>;
}

const DATA_DIR =
  process.env.VERCEL === '1'
    ? path.resolve('/tmp', '.data')
    : path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'pixelfront-db.json');

let supabase: SupabaseClient | null = null;
let supabaseConfigured = false;
let supabaseTableMissing = false;
let supabaseRlsBlocked = false;
let schemaWarningLogged = false;

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

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const msg = String(error.message || '');
  return msg.includes('schema cache') || msg.includes('does not exist');
}

function isRlsOrPermissionError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42501') return true;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('row-level security') || msg.includes('permission denied');
}

function handleSupabaseError(op: string, error: { code?: string; message?: string } | null | undefined): void {
  if (!error) return;
  if (isMissingTableError(error)) {
    supabaseTableMissing = true;
    if (!schemaWarningLogged) {
      schemaWarningLogged = true;
      console.warn(
        '[DB] Table public.players not found in Supabase. Run supabase_schema.sql in Supabase SQL Editor. Falling back to local store.',
      );
    }
    return;
  }
  if (isRlsOrPermissionError(error)) {
    supabaseRlsBlocked = true;
    console.error(`[Supabase] ${op} RLS/permission error:`, error.message);
    return;
  }
  console.error(`[Supabase] ${op} error:`, error.message);
}

function initSupabase() {
  const url =
    normalizeSupabaseUrl(process.env.SUPABASE_URL) ||
    normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL);
  const key = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  )
    .trim()
    .replace(/^["']+|["']+$/g, '');

  if (url && key) {
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    supabaseConfigured = true;
    console.log('[DB] Supabase client initialized (ANON_KEY)');
  } else {
    console.log(
      '[DB] SUPABASE_URL / SUPABASE_ANON_KEY not set — using local persistent store (.data/pixelfront-db.json)',
    );
  }
}

initSupabase();

export async function verifySupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  missingTable: boolean;
}> {
  if (!supabaseConfigured || !supabase) {
    return { configured: false, connected: false, missingTable: false };
  }
  try {
    const { error } = await supabase.from('players').select('slug').limit(1);
    if (error) {
      handleSupabaseError('verifySupabaseConnection', error);
      return {
        configured: true,
        connected: false,
        missingTable: supabaseTableMissing,
      };
    }
    supabaseTableMissing = false;
    return { configured: true, connected: true, missingTable: false };
  } catch {
    return { configured: true, connected: false, missingTable: supabaseTableMissing };
  }
}

function readLocalStore(): LocalStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<LocalStore>;
      return {
        players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
      };
    }
  } catch (err) {
    console.error('[DB] Failed reading local store:', err);
  }
  return { players: {} };
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
  return supabaseConfigured && supabase !== null && !supabaseTableMissing;
}

export function isSupabaseMissingTable(): boolean {
  return supabaseConfigured && supabaseTableMissing;
}

export function isSupabaseRlsBlocked(): boolean {
  return supabaseRlsBlocked;
}

export async function getPlayerBySlug(slug: string): Promise<PlayerRecord | null> {
  const local = readLocalStore();
  if (supabase && !supabaseTableMissing) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('slug, name, salt, password_hash, coins, rating, wins, profile, updated_at')
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) {
        return data as PlayerRecord;
      }
      if (!error && !data && local.players[slug]) {
        const rec = local.players[slug];
        const { error: upErr } = await supabase.from('players').upsert(
          {
            slug: rec.slug,
            name: rec.name,
            salt: rec.salt,
            password_hash: rec.password_hash,
            coins: rec.coins,
            rating: rec.rating,
            wins: rec.wins,
            profile: rec.profile,
            updated_at: rec.updated_at || new Date().toISOString(),
          },
          { onConflict: 'slug' },
        );
        if (upErr) {
          handleSupabaseError('syncLocalPlayerToSupabase', upErr);
        }
        return rec;
      }
      if (error && error.code !== 'PGRST116') {
        handleSupabaseError('getPlayerBySlug', error);
      }
    } catch (err) {
      console.error('[Supabase] getPlayerBySlug exception:', err);
    }
  }

  return local.players[slug] || null;
}

export interface CreatePlayerResult {
  ok: boolean;
  supabaseSaved: boolean;
  rlsBlocked: boolean;
  error?: string;
}

export async function createPlayerRecord(rec: PlayerRecord): Promise<CreatePlayerResult> {
  if (supabase && !supabaseTableMissing) {
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
        handleSupabaseError('createPlayerRecord', error);
        if (error.code === '23505') {
          return {
            ok: false,
            supabaseSaved: false,
            rlsBlocked: false,
            error: 'Такое имя уже занято. Войдите в аккаунт.',
          };
        }
        if (isRlsOrPermissionError(error)) {
          return {
            ok: false,
            supabaseSaved: false,
            rlsBlocked: true,
            error:
              'В Supabase заблокирована запись (RLS). Выполните supabase_schema.sql в Supabase SQL Editor.',
          };
        }
        if (!isMissingTableError(error)) {
          return {
            ok: false,
            supabaseSaved: false,
            rlsBlocked: false,
            error: `Ошибка записи в Supabase: ${error.message}`,
          };
        }
      } else {
        supabaseRlsBlocked = false;
        const local = readLocalStore();
        local.players[rec.slug] = rec;
        writeLocalStore(local);
        return { ok: true, supabaseSaved: true, rlsBlocked: false };
      }
    } catch (err) {
      console.error('[Supabase] createPlayerRecord exception:', err);
      return {
        ok: false,
        supabaseSaved: false,
        rlsBlocked: false,
        error: 'Не удалось связаться с базой Supabase',
      };
    }
  }

  const local = readLocalStore();
  local.players[rec.slug] = rec;
  writeLocalStore(local);
  return { ok: true, supabaseSaved: false, rlsBlocked: false };
}

export async function updatePlayerPasswordHash(slug: string, passwordHash: string): Promise<void> {
  const local = readLocalStore();
  if (local.players[slug]) {
    local.players[slug].password_hash = passwordHash;
    writeLocalStore(local);
  }
  if (supabase && !supabaseTableMissing) {
    try {
      const { error } = await supabase
        .from('players')
        .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .eq('slug', slug);
      if (error) {
        handleSupabaseError('updatePlayerPasswordHash', error);
      }
    } catch (err) {
      console.error('[Supabase] updatePlayerPasswordHash exception:', err);
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

  if (supabase && !supabaseTableMissing) {
    try {
      const { data, error } = await supabase
        .from('players')
        .update({
          coins,
          rating,
          wins,
          profile,
          updated_at: updatedAt,
        })
        .eq('slug', slug)
        .select('slug');
      if (error) {
        handleSupabaseError('updatePlayerProfileRecord', error);
      } else if ((!data || data.length === 0) && local.players[slug]) {
        const rec = local.players[slug];
        const { error: upErr } = await supabase.from('players').upsert(
          {
            slug: rec.slug,
            name: rec.name,
            salt: rec.salt,
            password_hash: rec.password_hash,
            coins,
            rating,
            wins,
            profile,
            updated_at: updatedAt,
          },
          { onConflict: 'slug' },
        );
        if (upErr) handleSupabaseError('upsertMissingPlayerProfile', upErr);
      }
    } catch (err) {
      console.error('[Supabase] updatePlayerProfileRecord exception:', err);
    }
  }
}

export async function getLeaderboardRecords(
  limit = 15,
): Promise<Array<{ name: string; rating: number; wins: number }>> {
  if (supabase && !supabaseTableMissing) {
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
      if (error) {
        handleSupabaseError('getLeaderboardRecords', error);
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
