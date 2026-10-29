const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const fixture = fs.readFileSync(process.env.DUMBPAD_HTML_FIXTURE || path.join(__dirname, 'fixtures/upstream.html'), 'utf8');
function setup() {
  const dom = new JSDOM(fixture, { runScripts: 'outside-only', url: 'http://localhost/' });
  return { dom, window: dom.window, document: dom.window.document };
}
function mount(window) {
  const filename = path.join(__dirname, '../dumbpad/compact-toolbar.js');
  assert.ok(fs.existsSync(filename), 'compact toolbar implementation is not present');
  window.eval(fs.readFileSync(filename, 'utf8'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
}
test('mount preserves original buttons and their handlers, in the approved order', () => {
  const { dom, window, document } = setup();
  const original = document.getElementById('download-notepad');
  let downloads = 0; original.addEventListener('click', () => downloads++);
  mount(window);
  const toolbar = document.querySelector('.dp-compact-toolbar');
  assert.ok(toolbar);
  assert.deepEqual([...toolbar.children].filter(el => el.matches('select,button')).map(el => el.id), ['notepad-selector','new-notepad','search-open','preview-markdown','dp-more']);
  assert.equal(document.getElementById('download-notepad'), original);
  document.getElementById('dp-more').click(); original.click();
  assert.equal(downloads, 1);
  assert.equal(document.getElementById('dp-more').getAttribute('aria-expanded'), 'false');
  assert.equal(document.querySelectorAll('#download-notepad').length, 1);
  dom.window.close();
});
test('Escape and outside click dismiss More without activating an action', () => {
  const { dom, window, document } = setup(); mount(window);
  const more = document.getElementById('dp-more');
  more.click(); assert.equal(more.getAttribute('aria-expanded'),'true');
  document.getElementById('rename-notepad').focus();
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
  assert.equal(more.getAttribute('aria-expanded'),'false'); assert.equal(document.activeElement,more);
  more.click(); document.querySelector('main').click();
  assert.equal(more.getAttribute('aria-expanded'),'false'); dom.window.close();
});
test('More supports ArrowDown and ArrowUp keyboard navigation', () => {
  const { dom, window, document } = setup(); mount(window);
  const more = document.getElementById('dp-more');
  more.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
  const menu = document.getElementById('dp-overflow');
  assert.equal(more.getAttribute('aria-expanded'),'true');
  const buttons = [...menu.querySelectorAll('button')]; assert.equal(document.activeElement,buttons[0]);
  buttons[0].dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
  assert.equal(document.activeElement,buttons.at(-1)); dom.window.close();
});
test('loading the overlay twice does not duplicate controls or listeners', () => {
  const { dom, window, document } = setup(); mount(window); mount(window);
  assert.equal(document.querySelectorAll('#dp-more').length,1);
  assert.equal(document.querySelectorAll('#dp-overflow').length,1);
  document.getElementById('dp-more').click();
  assert.equal(document.getElementById('dp-more').getAttribute('aria-expanded'),'true'); dom.window.close();
});
