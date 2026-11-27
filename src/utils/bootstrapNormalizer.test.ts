import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PUBLIC_BOOTSTRAP } from '../data/defaultPublicBootstrap';
import { isValidBootstrapPayload, normalizePublicBootstrapData } from './bootstrapNormalizer';

test('normalizePublicBootstrapData returns full default data for null/undefined/invalid cache', () => {
  for (const invalid of [null, undefined, '', 42, [], { foo: 'bar' }]) {
    const normalized = normalizePublicBootstrapData(invalid);
    assert.equal(normalized.settings.instituteNameBn, DEFAULT_PUBLIC_BOOTSTRAP.settings.instituteNameBn);
    assert.ok(normalized.settings.achievementStats.totalStudents.length > 0);
    assert.equal(normalized.classes.length, DEFAULT_PUBLIC_BOOTSTRAP.classes.length);
    assert.equal(normalized.teachers.length, DEFAULT_PUBLIC_BOOTSTRAP.teachers.length);
    assert.equal(normalized.exams.length, DEFAULT_PUBLIC_BOOTSTRAP.exams.length);
    assert.equal(normalized.results.length, DEFAULT_PUBLIC_BOOTSTRAP.results.length);
  }
});

test('normalizePublicBootstrapData repairs legacy partial cache missing achievementStats, exams, and teachers', () => {
  const legacyPartial = {
    settings: {
      instituteNameBn: 'শিক্ষানীর',
    },
    classes: [],
    notices: [],
  };

  assert.equal(isValidBootstrapPayload(legacyPartial), true);
  const normalized = normalizePublicBootstrapData(legacyPartial);

  assert.equal(
    normalized.settings.achievementStats.totalStudents,
    DEFAULT_PUBLIC_BOOTSTRAP.settings.achievementStats.totalStudents
  );
  assert.equal(normalized.classes.length, DEFAULT_PUBLIC_BOOTSTRAP.classes.length);
  assert.equal(normalized.teachers.length, DEFAULT_PUBLIC_BOOTSTRAP.teachers.length);
  assert.equal(normalized.exams.length, DEFAULT_PUBLIC_BOOTSTRAP.exams.length);
  assert.equal(normalized.results.length, DEFAULT_PUBLIC_BOOTSTRAP.results.length);
});

test('normalizePublicBootstrapData sanitizes malformed teacher subjects and non-numeric result gpa', () => {
  const malformed = {
    settings: DEFAULT_PUBLIC_BOOTSTRAP.settings,
    teachers: [
      {
        id: 'tch-bad',
        name: 'টেস্ট শিক্ষক',
        subjects: null,
        assignedClassIds: null,
      },
    ],
    results: [
      {
        id: 'res-bad',
        examId: 'ex-10-nov',
        studentName: 'টেস্ট শিক্ষার্থী',
        gpa: 'NaN',
        subjectMarks: null,
      },
    ],
    exams: DEFAULT_PUBLIC_BOOTSTRAP.exams,
  };

  const normalized = normalizePublicBootstrapData(malformed);
  assert.deepEqual(normalized.teachers[0].subjects, []);
  assert.deepEqual(normalized.teachers[0].assignedClassIds, []);
  assert.equal(normalized.results[0].gpa, 0);
  assert.equal(normalized.results[0].gpa.toFixed(2), '0.00');
  assert.deepEqual(normalized.results[0].subjectMarks, []);
});
