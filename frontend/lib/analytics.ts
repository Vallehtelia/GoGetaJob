import { api } from "@/lib/api";

const SESSION_KEY = "ggj_activity_session_id";

export function getStoredActivitySessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setStoredActivitySessionId(sessionId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, sessionId);
}

export async function ensureActivitySession(): Promise<string | null> {
  try {
    const existing = getStoredActivitySessionId() || undefined;
    const res = await api.analyticsSessionStart(existing);
    if (res?.sessionId) setStoredActivitySessionId(res.sessionId);
    return res?.sessionId ?? null;
  } catch {
    return null;
  }
}

export async function sendActivityPageview(sessionId: string, path: string) {
  try {
    await api.analyticsPageview(sessionId, path);
  } catch {
    // never block UI
  }
}

export async function sendActivityHeartbeat(sessionId: string) {
  try {
    await api.analyticsSessionHeartbeat(sessionId);
  } catch {
    // never block UI
  }
}

export async function endActivitySession(sessionId: string) {
  try {
    await api.analyticsSessionEnd(sessionId);
  } catch {
    // never block UI
  }
}

