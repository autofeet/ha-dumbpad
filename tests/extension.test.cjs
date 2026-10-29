const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '../browser-extension');
function manifest() { return JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')); }

test('extension requests only sidePanel and the DumbPad host, with local entry points', () => {
  const m = manifest();
  assert.equal(m.manifest_version, 3);
  assert.deepEqual(m.permissions, ['sidePanel']);
  assert.deepEqual(m.host_permissions, ['https://dumbpad.piggydamn.club/*']);
  assert.equal(m.action.default_popup, undefined);
  assert.equal(m.content_scripts, undefined);
  assert.ok(m.content_security_policy.extension_pages.includes('frame-src https://dumbpad.piggydamn.club:99;'));
  for (const file of [m.background.service_worker, m.side_panel.default_path, ...Object.values(m.icons)]) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
});

test('service worker enables action-click side panels on initialization and browser lifecycle events', async () => {
  const handlers = {}; const calls = [];
  const chrome = { sidePanel: {setPanelBehavior: async options => calls.push(options)}, runtime: {
    onInstalled: {addListener: fn => handlers.installed = fn},
    onStartup: {addListener: fn => handlers.startup = fn}
  }};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), {chrome, console});
  await handlers.installed(); await handlers.startup();
  assert.equal(calls.length, 3);
  assert.ok(calls.every(x => x.openPanelOnActionClick === true));
});

test('side panel embeds the real HTTPS app without PIN injection or remote extension scripts', () => {
  const m = manifest();
  const dom = new JSDOM(fs.readFileSync(path.join(root, m.side_panel.default_path), 'utf8'));
  const { document } = dom.window;
  assert.equal(document.querySelectorAll('iframe').length, 1);
  const frame = document.querySelector('iframe');
  assert.equal(frame.src, 'https://dumbpad.piggydamn.club:99/');
  assert.equal(frame.title, 'DumbPad 笔记');
  assert.equal(frame.getAttribute('allow'), 'clipboard-write');
  assert.equal(document.querySelectorAll('script').length, 0);
  assert.equal(document.querySelectorAll('input').length, 0);
  dom.window.close();
});
