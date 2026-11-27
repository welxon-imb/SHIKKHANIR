import {
  buildApiUrl,
  classifyNonJsonApiResponse,
  normalizeApiBase,
} from '../utils/apiDiagnostics';

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

export const API_BASE_URL = normalizeApiBase(import.meta.env.VITE_API_BASE_URL as string | undefined);

export function hasExternalApiBase(): boolean {
  return API_BASE_URL.length > 0;
}

export function resolveApiUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (activeToken) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }

  let res: Response;
  try {
    res = await fetch(resolveApiUrl(path), {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'ব্যাকএন্ড সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। সার্ভার চালু আছে কি না এবং CORS/API URL সঠিক কি না যাচাই করুন।',
      0
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const diagnostic = classifyNonJsonApiResponse({
      status: res.status,
      apiBase: API_BASE_URL,
      path,
    });
    throw new ApiError(diagnostic, !res.ok ? res.status : 503);
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errMsg = typeof data.error === 'string' ? data.error : `সার্ভার ত্রুটি (${res.status})`;
    throw new ApiError(errMsg, res.status, data);
  }
  return data as T;
}
