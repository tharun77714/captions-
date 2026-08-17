import { test } from 'node:test';
import assert from 'node:assert';
import { TEMPLATE_REGISTRY, REJECTED_EXPERIMENTS } from './registry';

test('exactly 3 approved registry entries', () => {
  assert.strictEqual(TEMPLATE_REGISTRY.length, 3, 'There must be exactly 3 approved templates');
  const ids = TEMPLATE_REGISTRY.map(t => t.meta.id);
  assert.ok(ids.includes('viral-punch-pro'));
  assert.ok(ids.includes('podcast-pro'));
  assert.ok(ids.includes('bilingual-india-pro'));
});

test('no rejected prototype source files included in the registry', () => {
  for (const t of TEMPLATE_REGISTRY) {
    for (const rej of REJECTED_EXPERIMENTS) {
      assert.notStrictEqual(t.meta.id, rej, 'Rejected prototypes must not be in the registry');
    }
  }
});
