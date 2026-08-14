import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(root, 'index.html'), 'utf8');

assert.match(html, /Content-Security-Policy/);
assert.match(html, /connect-src 'none'/);
assert.match(html, /No network requests/);
assert.match(html, /Automatic best mask/);
assert.match(html, /Barcode128/);
assert.match(html, /Code 128/);
assert.match(html, /#d63384/i);
assert.match(html, /image\/png,image\/jpeg,image\/webp/);
assert.doesNotMatch(html, /<script[^>]+src=/i);
assert.doesNotMatch(html, /<link[^>]+stylesheet/i);
console.log('✓ Standalone build is pink-branded, includes Code 128, and has no external script or stylesheet dependencies');
