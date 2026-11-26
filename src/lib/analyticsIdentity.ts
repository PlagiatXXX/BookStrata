const ANON_ID_KEY = "bookstrata_anon_id";
const SESSION_KEY = "bookstrata_analytics_session";
const SESSION_IDLE_MS = 30 * 60 * 1000;

let fallbackAnonId: string | null = null;
let fallbackSession: StoredSession | null = null;

interface StoredSession {
  sessionId: string;
  lastSeenAt: number;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

export interface SessionContext {
  anonymousId: string;
  sessionId: string;
  isNewSession: boolean;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getAnonymousId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const created = generateId();
    localStorage.setItem(ANON_ID_KEY, created);
    return created;
  } catch {
    if (!fallbackAnonId) fallbackAnonId = generateId();
    return fallbackAnonId;
  }
}

function readExternalReferrer(): string | null {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    const refUrl = new URL(document.referrer);
    const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
    if (currentHost && refUrl.hostname === currentHost) {
      return null;
    }
    return document.referrer.slice(0, 512);
  } catch {
    return null;
  }
}

function readUtmParams(): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
} {
  if (typeof window === "undefined" || !window.location?.search) {
    return { utmSource: null, utmMedium: null, utmCampaign: null };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get("utm_source")?.slice(0, 128) || null,
      utmMedium: params.get("utm_medium")?.slice(0, 128) || null,
      utmCampaign: params.get("utm_campaign")?.slice(0, 128) || null,
    };
  } catch {
    return { utmSource: null, utmMedium: null, utmCampaign: null };
  }
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      fallbackSession = null;
      return null;
    }
    return JSON.parse(raw) as StoredSession;
  } catch {
    return fallbackSession;
  }
}

function writeStoredSession(session: StoredSession): void {
  fallbackSession = session;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // приватный режим
  }
}

export function getSessionContext(): SessionContext {
  const anonymousId = getAnonymousId();
  const now = Date.now();
  const existing = readStoredSession();

  if (existing && now - existing.lastSeenAt < SESSION_IDLE_MS) {
    const updated: StoredSession = { ...existing, lastSeenAt: now };
    writeStoredSession(updated);
    return {
      anonymousId,
      sessionId: updated.sessionId,
      isNewSession: false,
      referrer: updated.referrer,
      utmSource: updated.utmSource,
      utmMedium: updated.utmMedium,
      utmCampaign: updated.utmCampaign,
    };
  }

  const utm = readUtmParams();
  const created: StoredSession = {
    sessionId: generateId(),
    lastSeenAt: now,
    referrer: readExternalReferrer(),
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
  };
  writeStoredSession(created);

  return {
    anonymousId,
    sessionId: created.sessionId,
    isNewSession: true,
    referrer: created.referrer,
    utmSource: created.utmSource,
    utmMedium: created.utmMedium,
    utmCampaign: created.utmCampaign,
  };
}
