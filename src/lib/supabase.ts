import type { SavedGame } from "./store";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qfnjmhdvfwwyexhnovts.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_H5fOeQJ7jVgE50ZQjg1MYg_pWzwOs7z";
const SESSION_KEY = "berserk.supabase.session";

export type AuthUser = { id: string; email?: string; user_metadata?: { display_name?: string } };
export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
};

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as AuthSession : null;
  } catch { return null; }
}

function writeSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("berserk-auth-change"));
}

function normalizeSession(data: any): AuthSession {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user,
  };
}

async function authRequest(path: string, body: unknown) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || "Authentication failed.");
  return data;
}

export async function signUp(email: string, password: string, displayName: string) {
  const data = await authRequest("signup", { email, password, data: { display_name: displayName } });
  if (data.access_token && data.refresh_token) writeSession(normalizeSession(data));
  return data;
}

export async function signIn(email: string, password: string) {
  const data = await authRequest("token?grant_type=password", { email, password });
  writeSession(normalizeSession(data));
  return data.user as AuthUser;
}

export async function signOut() {
  const session = await getValidSession();
  try {
    if (session) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
      });
    }
  } finally { writeSession(null); }
}

export async function getValidSession(): Promise<AuthSession | null> {
  let session = readSession();
  if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session;
  try {
    const data = await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
    session = normalizeSession(data);
    writeSession(session);
    return session;
  } catch {
    writeSession(null);
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (typeof window !== "undefined" && window.location.hash.includes("access_token=")) {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` } });
      if (response.ok) {
        const user = await response.json() as AuthUser;
        writeSession({ access_token: accessToken, refresh_token: refreshToken, expires_at: Number(params.get("expires_at") || Math.floor(Date.now() / 1000) + Number(params.get("expires_in") || 3600)), user });
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    }
  }
  const session = await getValidSession();
  if (!session) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) { writeSession(null); return null; }
  return await response.json() as AuthUser;
}

async function databaseRequest(path: string, init: RequestInit = {}) {
  const session = await getValidSession();
  if (!session) throw new Error("Sign in to sync your games.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.details || "Cloud sync failed.");
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

export async function saveCloudGame(game: SavedGame) {
  const session = await getValidSession();
  if (!session) return;
  await databaseRequest("games?on_conflict=user_id,source_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: session.user.id,
      source_id: game.id,
      pgn: game.pgn,
      result: game.result,
      human_side: game.humanSide,
      elo: game.elo,
      accuracy: game.accuracy,
      grades: game.grades || {},
      played_at: new Date(game.date).toISOString(),
    }),
  });
}

export async function syncCloudGames(localGames: SavedGame[]) {
  const session = await getValidSession();
  if (!session) return localGames;
  if (localGames.length) {
    await databaseRequest("games?on_conflict=user_id,source_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(localGames.map((game) => ({
        user_id: session.user.id, source_id: game.id, pgn: game.pgn, result: game.result,
        human_side: game.humanSide, elo: game.elo, accuracy: game.accuracy,
        grades: game.grades || {}, played_at: new Date(game.date).toISOString(),
      }))),
    });
  }
  const rows = await databaseRequest("games?select=source_id,pgn,result,human_side,elo,accuracy,grades,played_at&order=played_at.desc&limit=200") as any[];
  const remoteGames: SavedGame[] = (rows || []).map((row) => ({
    id: row.source_id,
    date: new Date(row.played_at).getTime(),
    pgn: row.pgn,
    result: row.result,
    humanSide: row.human_side,
    elo: row.elo,
    accuracy: row.accuracy === null ? null : Number(row.accuracy),
    grades: row.grades || {},
  }));
  const merged = new Map<string, SavedGame>();
  for (const game of [...remoteGames, ...localGames]) if (!merged.has(game.id)) merged.set(game.id, game);
  return [...merged.values()].sort((a, b) => b.date - a.date).slice(0, 200);
}

export async function deleteCloudGames() {
  const session = await getValidSession();
  if (!session) return;
  await databaseRequest(`games?user_id=eq.${encodeURIComponent(session.user.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

export async function saveProfile(user: AuthUser, displayName: string) {
  await databaseRequest("profiles?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: user.id, display_name: displayName || null }),
  });
}
