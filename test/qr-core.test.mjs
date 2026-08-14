import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(join(root, 'src/qr-core.js'), 'utf8');
const context = vm.createContext({ TextEncoder });
vm.runInContext(`${source}\nthis.__qr = { QRCode, BitBuffer };`, context);
const { QRCode, BitBuffer } = context.__qr;

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('BitBuffer writes bits in QR bit order', () => {
  const buffer = new BitBuffer();
  buffer.append(0b101, 3);
  buffer.append(0b11, 2);
  assert.deepEqual(Array.from(buffer.toBytes()), [0b10111000]);
});

test('version 1 has a 21×21 matrix', () => {
  const qr = QRCode.encodeText('HELLO', 'M', 0);
  assert.equal(qr.version, 1);
  assert.equal(qr.size, 21);
  assert.equal(qr.modules.length, 21);
  assert.ok(qr.modules.every((row) => row.length === 21));
});

test('all fixed masks are accepted and recorded', () => {
  for (let mask = 0; mask < 8; mask++) {
    const qr = QRCode.encodeText('Mask test 1234567890', 'Q', mask);
    assert.equal(qr.mask, mask);
  }
});

test('automatic mask selection chooses the minimum penalty mask', () => {
  const text = 'Automatic mask selection — QR Code Studio';
  const auto = QRCode.encodeText(text, 'M', -1);
  const candidates = Array.from({ length: 8 }, (_, mask) => QRCode.encodeText(text, 'M', mask));
  const penalties = candidates.map((qr) => qr.getPenaltyScore());
  assert.equal(auto.getPenaltyScore(), Math.min(...penalties));
  assert.equal(auto.mask, penalties.indexOf(Math.min(...penalties)));
});


test('encoder chooses compact numeric/alphanumeric modes when possible', () => {
  assert.equal(QRCode.encodeText('12345678901234567890', 'M', 0).mode, 'numeric');
  assert.equal(QRCode.encodeText('HELLO WORLD', 'M', 0).mode, 'alphanumeric');
  assert.equal(QRCode.encodeText('hello world', 'M', 0).mode, 'byte');
});

test('known HELLO WORLD matrix vector remains stable', () => {
  const qr = QRCode.encodeText('HELLO WORLD', 'M', 0);
  const matrix = qr.modules.map((row) => row.map((cell) => cell ? '1' : '0').join('')).join('\n');
  const digest = crypto.createHash('sha256').update(matrix).digest('hex');
  assert.equal(digest, '83d76f36239756fc557dc381512baad05726203ad76d8f14820ec93a51bdd8ee');
});

test('UTF-8 content is encoded without throwing', () => {
  const qr = QRCode.encodeText('Grüße · مرحبا · こんにちは · 😀', 'Q');
  assert.ok(qr.version >= 1 && qr.version <= 40);
});

test('higher error correction can require a larger version', () => {
  const text = 'x'.repeat(80);
  const low = QRCode.encodeText(text, 'L');
  const high = QRCode.encodeText(text, 'H');
  assert.ok(high.version >= low.version);
});

test('oversized content is rejected clearly', () => {
  assert.throws(() => QRCode.encodeText('x'.repeat(5000), 'H'), /too large/i);
});

test('function module map matches matrix dimensions', () => {
  const qr = QRCode.encodeText('Function map', 'M');
  assert.equal(qr.isFunction.length, qr.size);
  assert.ok(qr.isFunction.every((row) => row.length === qr.size));
  assert.equal(qr.isFunction[0][0], true);
  assert.equal(qr.isFunction[6][6], true);
});
