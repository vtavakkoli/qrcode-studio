import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/barcode-core.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(`${source}\nthis.__barcode = Barcode128;`, context);
const Barcode128 = context.__barcode;

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('Code 128-B encodes printable ASCII', () => {
  const result = Barcode128.encode('ABC');
  assert.deepEqual(Array.from(result.codes), [104, 33, 34, 35, 1, 106]);
  assert.equal(result.checksum, 1);
  assert.equal(result.modules, 68);
});

test('Code 128 checksum is stable for numeric-looking data', () => {
  assert.equal(Barcode128.encode('1234').checksum, 88);
});

test('Code 128 rejects unsupported Unicode instead of silently corrupting data', () => {
  assert.throws(() => Barcode128.encode('Grüße'), /printable ASCII/i);
});

test('SVG output contains bars, human-readable content, and no external resource', () => {
  const svg = Barcode128.toSvg('SKU-2026-001', { foreground: '#17233f', background: '#ffffff', frame: 'label', frameText: 'SCAN ITEM' });
  assert.match(svg, /^<svg/);
  assert.match(svg, /Code 128 barcode/);
  assert.match(svg, /SKU-2026-001/);
  assert.match(svg, /SCAN ITEM/);
  assert.doesNotMatch(svg, /<(?:image|script)|href=/i);
});

test('length guard prevents impractically wide barcodes', () => {
  assert.throws(() => Barcode128.encode('A'.repeat(121)), /limited to 120/i);
});
