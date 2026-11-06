'use strict';
const extensionAPI = globalThis.browser || globalThis.chrome;
const frame = document.querySelector('iframe');
const origin = 'https://dumbpad.piggydamn.club:99';
const candidate = new URL(location.href).searchParams.get('context') || '';
const context = /^page-[a-z0-9-]{1,64}$/.test(candidate) ? candidate : '';

window.addEventListener('message', event => {
  if (!context || event.origin !== origin || event.source !== frame.contentWindow) return;
  if (event.data?.type !== 'dumbpad-note-selected') return;
  const noteId = event.data.noteId;
  if (typeof noteId !== 'string' || !noteId || noteId.length > 1024) return;
  extensionAPI.storage.local.set({ [context]: { noteId, updatedAt: Date.now() } })
    .catch(() => console.warn('DumbPad could not remember this page selection.'));
});

(async () => {
  const url = new URL(origin);
  url.searchParams.set('dumbpad_embed', '1');
  try {
    if (context) {
      const saved = (await extensionAPI.storage.local.get(context))[context];
      if (typeof saved?.noteId === 'string' && saved.noteId.length <= 1024) url.searchParams.set('id', saved.noteId);
    }
  } catch { console.warn('DumbPad page memory is unavailable.'); }
  frame.src = url.href;
  const owner = new URL(location.href).searchParams.get('ownerTab');
  if (owner && context) {
    const report = kind => extensionAPI.runtime.sendMessage({ type: 'dumbpad-panel-lifecycle', kind, tabId: Number(owner), context }).catch(() => {});
    report('opened');
    let sent = false;
    const closed = () => { if (!sent) { sent = true; report('closed'); } };
    window.addEventListener('pagehide', closed);
    window.addEventListener('unload', closed);
  }
})();
