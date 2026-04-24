import type { ConfigSnapshot, NamedConfig, ConfigHistory } from "./types";

const STORAGE_KEY = "xfeb-history";
const MAX_RECENT = 10;

const EMPTY: ConfigHistory = { recent: [], named: [] };

export function loadHistory(): ConfigHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const obj = parsed as Record<string, unknown>;
    return {
      recent: Array.isArray(obj["recent"]) ? (obj["recent"] as ConfigSnapshot[]) : [],
      named: Array.isArray(obj["named"]) ? (obj["named"] as NamedConfig[]) : [],
    };
  } catch {
    return EMPTY;
  }
}

function saveHistory(history: ConfigHistory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Silently ignore storage quota errors
  }
}

export function pushRecent(snapshot: ConfigSnapshot): void {
  const history = loadHistory();
  const recent = [snapshot, ...history.recent].slice(0, MAX_RECENT);
  saveHistory({ ...history, recent });
}

export function saveNamed(name: string, snapshot: ConfigSnapshot): void {
  const history = loadHistory();
  const entry: NamedConfig = { ...snapshot, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name };
  saveHistory({ ...history, named: [...history.named, entry] });
}

export function deleteNamed(id: string): void {
  const history = loadHistory();
  saveHistory({ ...history, named: history.named.filter((n) => n.id !== id) });
}
