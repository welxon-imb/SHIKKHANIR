import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PUBLIC_BOOTSTRAP } from '../data/defaultPublicBootstrap';
import {
  OperationType,
  buildFirestoreErrorInfo,
  isBootstrappedAdminEmail,
  isValidFirestoreDocId,
  sanitizeBootstrapForFirestore,
} from './firebaseHelpers';

test('isBootstrappedAdminEmail strictly requires verified email', () => {
  assert.equal(isBootstrappedAdminEmail('welxon.imb@gmail.com', true), true);
  assert.equal(isBootstrappedAdminEmail('WELXON.IMB@GMAIL.COM', true), true);
  assert.equal(isBootstrappedAdminEmail('welxon.imb@gmail.com', false), false);
  assert.equal(isBootstrappedAdminEmail('other@gmail.com', true), false);
  assert.equal(isBootstrappedAdminEmail(null, true), false);
});

test('isValidFirestoreDocId rejects path traversal and oversize IDs', () => {
  assert.equal(isValidFirestoreDocId('bootstrap'), true);
  assert.equal(isValidFirestoreDocId('adm_2026-001'), true);
  assert.equal(isValidFirestoreDocId(''), false);
  assert.equal(isValidFirestoreDocId('bad/id'), false);
  assert.equal(isValidFirestoreDocId('a'.repeat(129)), false);
});

test('buildFirestoreErrorInfo formats structured FirestoreErrorInfo payload', () => {
  const info = buildFirestoreErrorInfo(
    new Error('Missing or insufficient permissions.'),
    OperationType.WRITE,
    'public_data/bootstrap',
    {
      uid: 'uid-123',
      email: 'user@example.com',
      emailVerified: true,
      isAnonymous: false,
      providerData: [{ providerId: 'google.com', email: 'user@example.com' }],
    }
  );

  assert.equal(info.error, 'Missing or insufficient permissions.');
  assert.equal(info.operationType, 'write');
  assert.equal(info.path, 'public_data/bootstrap');
  assert.equal(info.authInfo.userId, 'uid-123');
  assert.equal(info.authInfo.emailVerified, true);
  assert.equal(info.authInfo.providerInfo?.[0]?.providerId, 'google.com');
});

test('sanitizeBootstrapForFirestore strips teacher personal phone/email from public snapshot', () => {
  const sanitized = sanitizeBootstrapForFirestore(DEFAULT_PUBLIC_BOOTSTRAP);
  assert.ok(sanitized.teachers.length > 0);
  for (const t of sanitized.teachers) {
    assert.equal(t.phone, '');
    assert.equal(t.email, '');
  }
  assert.equal(sanitized.settings.instituteNameEn, 'SHIKKHANIR');
});
