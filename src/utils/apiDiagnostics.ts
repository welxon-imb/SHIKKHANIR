export type AuthEnvironmentMode = 'SUPABASE' | 'EXTERNAL_API' | 'LOCAL_API' | 'STATIC_ONLY';

export function normalizeApiBase(rawBase?: string): string {
  return (rawBase ?? '').trim().replace(/\/+$/, '');
}

export function buildApiUrl(path: string, apiBase?: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedBase = normalizeApiBase(apiBase);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}

export function classifyNonJsonApiResponse(params: {
  status: number;
  apiBase?: string;
  path?: string;
}): string {
  const normalizedBase = normalizeApiBase(params.apiBase);

  if (params.status === 405 && !normalizedBase) {
    return 'ব্যাকএন্ড API সার্ভার এই স্ট্যাটিক হোস্টিংয়ে সংযুক্ত নয় (HTTP 405)। লগইন ও পাসওয়ার্ড রিসেট চালু করতে Node সার্ভার (server.ts) ডিপ্লয় করে VITE_API_BASE_URL সেট করুন।';
  }

  if (params.status === 405) {
    return 'সার্ভার এই HTTP মেথড অনুমোদন করেনি (405)। অনুগ্রহ করে VITE_API_BASE_URL সঠিক ব্যাকএন্ড URL-এ পয়েন্ট করা আছে কি না যাচাই করুন।';
  }

  if (params.status >= 200 && params.status < 300) {
    return normalizedBase
      ? 'ব্যাকএন্ড সার্ভার থেকে JSON পাওয়া যায়নি। VITE_API_BASE_URL সঠিক কি না যাচাই করুন।'
      : 'ব্যাকএন্ড API সার্ভার সংযুক্ত নয়। অনুগ্রহ করে VITE_API_BASE_URL সেট করুন।';
  }

  return `সার্ভার সংযোগ পাওয়া যায়নি (${params.status})`;
}

export function getAuthEnvironmentMode(params: {
  supabaseConfigured: boolean;
  backendConnected: boolean;
  apiBase?: string;
}): {
  mode: AuthEnvironmentMode;
  badgeLabel: string;
} {
  if (params.supabaseConfigured) {
    return { mode: 'SUPABASE', badgeLabel: 'Supabase Auth সক্রিয়' };
  }
  if (params.backendConnected) {
    const hasExternal = normalizeApiBase(params.apiBase).length > 0;
    return hasExternal
      ? { mode: 'EXTERNAL_API', badgeLabel: 'API সার্ভার সংযুক্ত' }
      : { mode: 'LOCAL_API', badgeLabel: 'লোকাল সার্ভার সেশন (Demo Seed)' };
  }
  return { mode: 'STATIC_ONLY', badgeLabel: 'ব্যাকএন্ড সংযুক্ত নয় (স্ট্যাটিক)' };
}
