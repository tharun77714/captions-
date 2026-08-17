import { test } from 'node:test';
import assert from 'node:assert';
import { getSafeBounds, getAnchorY, scaleCanvasUnit } from './metrics';

test('finite and bounded layout metrics', () => {
  const bounds = getSafeBounds(1080, 1920, '9:16');
  assert.ok(bounds.top > 0);
  assert.ok(bounds.bottom < 1920);
  assert.ok(bounds.left > 0);
  assert.ok(bounds.right < 1080);
  assert.ok(bounds.width > 0 && bounds.width < 1080);
  assert.ok(bounds.height > 0 && bounds.height < 1920);

  const upperY = getAnchorY('upper', bounds);
  const centreY = getAnchorY('centre', bounds);
  const lowerY = getAnchorY('lower', bounds);

  assert.ok(upperY > bounds.top && upperY < centreY);
  assert.ok(centreY > upperY && centreY < lowerY);
  assert.ok(lowerY > centreY && lowerY < bounds.bottom);
});

test('deterministic scaling', () => {
  const scaled = scaleCanvasUnit(100, 540); // half of 1080
  assert.strictEqual(scaled, 50);
});
