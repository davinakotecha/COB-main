import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, isHex } from '../scripts/lib/contrast.mjs';

test('black on white is 21:1', () => assert.ok(Math.abs(contrastRatio('#000000', '#ffffff') - 21) < 0.01));
test('same colour is 1:1', () => assert.equal(contrastRatio('#0d9ad2', '#0d9ad2'), 1));
test('the stand-in accent passes 3:1 on white and on #161616', () => {
  assert.ok(contrastRatio('#0d9ad2', '#ffffff') >= 3);
  assert.ok(contrastRatio('#0d9ad2', '#161616') >= 3);
});
test('a pale yellow fails on white', () => assert.ok(contrastRatio('#f1c21b', '#ffffff') < 3));
test('hex validation', () => {
  assert.ok(isHex('#0d9ad2'));
  assert.ok(!isHex('0d9ad2'));
  assert.ok(!isHex('#0d9'));
  assert.ok(!isHex('blue'));
});
