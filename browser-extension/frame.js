(() => {
  'use strict';
  if (window.parent === window || !new URL(location.href).searchParams.has('dumbpad_embed')) return;
  document.documentElement.dataset.dumbpadEmbed = 'true';
  const requested = new URL(location.href).searchParams.get('id');
  let previous = '', userChanged = false;
  function report() {
    const selector = document.getElementById('notepad-selector');
    const value = selector?.value;
    if (!value || value === previous) return;
    // Don't replace a saved selection with the dropdown's temporary first option.
    if (requested && !previous && !userChanged && value !== requested &&
        [...selector.options].some(option => option.value === requested)) return;
    previous = value;
    window.parent.postMessage({ type: 'dumbpad-note-selected', noteId: value }, chrome.runtime.getURL(''));
  }
  document.addEventListener('change', event => {
    if (event.target.id === 'notepad-selector') { userChanged = true; report(); }
  });
  document.addEventListener('click', event => {
    if (event.target.closest?.('#new-notepad, #delete-notepad')) userChanged = true;
  });
  const timer = setInterval(report, 500);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
})();
