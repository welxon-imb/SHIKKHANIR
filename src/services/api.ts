let activeToken: string | null = null;

export function setAuthToken(token: string | null) {
  activeToken = token;
}

export function getAuthToken(): string | null {
  return activeToken;
}

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (activeToken) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errMsg = typeof data.error === 'string' ? data.error : `সার্ভার ত্রুটি (${res.status})`;
    throw new ApiError(errMsg, res.status, data);
  }
  return data as T;
}
