export interface PendingSyncItem {
  id: string;
  endpoint: string;
  method: 'POST';
  payload: Record<string, unknown>;
  label: string;
  createdAt: string;
}

const QUEUE_KEY = 'shikkhanir_offline_pending_queue_v1';
const CACHE_KEY = 'shikkhanir_offline_public_cache_v1';

export function getPendingQueue(): PendingSyncItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingSyncItem[]) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingItem(item: Omit<PendingSyncItem, 'id' | 'createdAt'>): PendingSyncItem {
  const queue = getPendingQueue();
  const next: PendingSyncItem = {
    ...item,
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  queue.push(next);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage quota
  }
  return next;
}

export function removePendingItem(id: string): void {
  const queue = getPendingQueue().filter((x) => x.id !== id);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function saveOfflinePublicCache(data: unknown): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch {
    // ignore
  }
}

export function loadOfflinePublicCache<T>(): { savedAt: string; data: T } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as { savedAt: string; data: T }) : null;
  } catch {
    return null;
  }
}
