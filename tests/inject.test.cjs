const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
test('image version invalidates PWA cache while overlay URLs match the precache manifest', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-inject-'));
  try {
    fs.mkdirSync(path.join(dir, 'public'));
    const html = path.join(dir, 'public/index.html');
    fs.writeFileSync(html, '<head></head><select id="notepad-selector"></select>');
    fs.writeFileSync(path.join(dir, 'package.json'), '{"version":"1.0.5"}');
    fs.writeFileSync(path.join(dir, 'public/service-worker.js'), 'let APP_VERSION = "1.0.0";');
    execFileSync(process.execPath, [path.join(__dirname, '../dumbpad/inject.cjs'), html, '1.0.5-2']);
    assert.match(fs.readFileSync(html, 'utf8'), /href="Assets\/compact-toolbar.css"/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'))).version, '1.0.5-2');
    assert.match(fs.readFileSync(path.join(dir, 'public/service-worker.js'), 'utf8'), /1.0.5-2/);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});
