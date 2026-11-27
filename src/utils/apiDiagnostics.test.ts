import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildApiUrl,
  classifyNonJsonApiResponse,
  getAuthEnvironmentMode,
  normalizeApiBase,
} from './apiDiagnostics';

test('normalizeApiBase and buildApiUrl handle trailing slashes and absolute paths', () => {
  assert.equal(normalizeApiBase(' https://api.shikkhanir.com/ '), 'https://api.shikkhanir.com');
  assert.equal(buildApiUrl('/api/auth/login', 'https://api.shikkhanir.com/'), 'https://api.shikkhanir.com/api/auth/login');
  assert.equal(buildApiUrl('api/auth/login', ''), '/api/auth/login');
  assert.equal(buildApiUrl('https://other.example/health', 'https://api.shikkhanir.com'), 'https://other.example/health');
});

test('classifyNonJsonApiResponse explains HTTP 405 on static Cloudflare deployment cleanly', () => {
  const static405 = classifyNonJsonApiResponse({ status: 405, apiBase: '', path: '/api/auth/login' });
  assert.match(static405, /405/);
  assert.match(static405, /VITE_API_BASE_URL/);

  const htmlFallback = classifyNonJsonApiResponse({ status: 200, apiBase: '', path: '/api/public/bootstrap' });
  assert.match(htmlFallback, /VITE_API_BASE_URL/);
});

test('getAuthEnvironmentMode distinguishes static deployment from connected backend', () => {
  assert.equal(
    getAuthEnvironmentMode({ supabaseConfigured: false, backendConnected: false, apiBase: '' }).mode,
    'STATIC_ONLY'
  );
  assert.equal(
    getAuthEnvironmentMode({ supabaseConfigured: false, backendConnected: true, apiBase: '' }).mode,
    'LOCAL_API'
  );
  assert.equal(
    getAuthEnvironmentMode({
      supabaseConfigured: false,
      backendConnected: true,
      apiBase: 'https://api.shikkhanir.com',
    }).mode,
    'EXTERNAL_API'
  );
  assert.equal(
    getAuthEnvironmentMode({ supabaseConfigured: true, backendConnected: true, apiBase: '' }).mode,
    'SUPABASE'
  );
});
