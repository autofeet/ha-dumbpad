/* DumbPad HA compact toolbar. Existing controls keep their identity/listeners. */
(() => {
  'use strict';
  function mount() {
    const header = document.querySelector('.container > header');
    if (!header || header.dataset.dpCompact === 'true') return;
    const primary = ['notepad-selector', 'new-notepad', 'search-open', 'preview-markdown'];
    const actions = [
      ['copy-link', '复制链接'], ['rename-notepad', '重命名笔记'],
      ['download-notepad', '导出笔记'], ['print-notepad', '打印'],
      ['theme-toggle', '切换明暗主题'], ['settings-button', '设置'],
      ['delete-notepad', '删除笔记']
    ];
    // Fail closed if an upstream release changes its DOM contract.
    if (![...primary, ...actions.map(([id]) => id)].every(id => document.getElementById(id))) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'dp-compact-toolbar';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', '笔记工具栏');
    primary.forEach(id => toolbar.append(document.getElementById(id)));
    const more = document.createElement('button');
    more.type = 'button'; more.id = 'dp-more'; more.className = 'icon-button';
    more.setAttribute('aria-label', '更多操作');
    more.setAttribute('aria-haspopup', 'menu');
    more.setAttribute('aria-controls', 'dp-overflow');
    more.setAttribute('aria-expanded', 'false');
    more.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
    toolbar.append(more);
    const menu = document.createElement('div');
    menu.id = 'dp-overflow'; menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', '更多笔记操作'); menu.hidden = true;
    actions.forEach(([id, label]) => {
      const button = document.getElementById(id);
      button.setAttribute('role', 'menuitem');
      const text = document.createElement('span'); text.className = 'dp-action-label'; text.textContent = label;
      button.append(text); menu.append(button);
    });
    toolbar.append(menu); header.append(toolbar);
    header.dataset.dpCompact = 'true';
    header.parentElement.classList.add('dp-compact-layout');
    const items = () => [...menu.querySelectorAll('button:not(:disabled)')];
    function close(restoreFocus = false) {
      menu.hidden = true; more.setAttribute('aria-expanded', 'false');
      if (restoreFocus) more.focus();
    }
    function open(focusFirst = false) {
      menu.hidden = false; more.setAttribute('aria-expanded', 'true');
      if (focusFirst) items()[0]?.focus();
    }
    more.addEventListener('click', () => menu.hidden ? open() : close());
    more.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); open();
        (event.key === 'ArrowDown' ? items()[0] : items().at(-1))?.focus();
      }
    });
    menu.addEventListener('keydown', event => {
      const buttons = items(); const index = buttons.indexOf(document.activeElement);
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next !== undefined) { event.preventDefault(); buttons[next]?.focus(); }
      if (event.key === 'Tab') close();
    });
    // Do not restore focus here: upstream actions may just have opened a dialog.
    menu.addEventListener('click', event => { if (event.target.closest('button')) close(); });
    document.addEventListener('click', event => {
      if (!menu.hidden && !menu.contains(event.target) && !more.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) { event.preventDefault(); close(true); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
  else mount();
})();
