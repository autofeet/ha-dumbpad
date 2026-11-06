'use strict';
const frame = document.querySelector('iframe');
const origin = 'https://dumbpad.piggydamn.club:99';
const candidate = new URL(location.href).searchParams.get('context') || '';
const context = /^page-[a-z0-9-]{1,64}$/.test(candidate) ? candidate : '';

window.addEventListener('message', event => {
  if (!context || event.origin !== origin || event.source !== frame.contentWindow) return;
  if (event.data?.type !== 'dumbpad-note-selected') return;
  const noteId = event.data.noteId;
  if (typeof noteId !== 'string' || !noteId || noteId.length > 1024) return;
  chrome.storage.local.set({ [context]: { noteId, updatedAt: Date.now() } })
    .catch(() => console.warn('DumbPad could not remember this page selection.'));
});

(async () => {
  const url = new URL(origin);
  url.searchParams.set('dumbpad_embed', '1');
  try {
    if (context) {
      const saved = (await chrome.storage.local.get(context))[context];
      if (typeof saved?.noteId === 'string' && saved.noteId.length <= 1024) url.searchParams.set('id', saved.noteId);
    }
  } catch { console.warn('DumbPad page memory is unavailable.'); }
  frame.src = url.href;
})();
