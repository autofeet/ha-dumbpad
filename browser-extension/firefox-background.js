(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  if (!api.sidebarAction) {
    // Compatible access when a Chromium derivative has no usable sidebar API.
    api.action.onClicked.addListener(() => api.tabs.create({ url: 'https://dumbpad.piggydamn.club:99/' }));
    return;
  }
  const revisions = new Map();
  function pageKey(tab) {
    try {
      const url = new URL(tab.url);
      if (!['http:', 'https:'].includes(url.protocol)) return `tab-${tab.id}`;
      url.username = ''; url.password = '';
      let hash = 14695981039346656037n;
      for (let i = 0; i < url.href.length; i++) hash = BigInt.asUintN(64, (hash ^ BigInt(url.href.charCodeAt(i))) * 1099511628211n);
      return `page-${hash.toString(16).padStart(16, '0')}`;
    } catch { return `tab-${tab.id}`; }
  }
  function panelPath(tab, key, open = true) { return `${open ? 'panel' : 'closed'}.html?context=${key}&ownerTab=${tab.id}`; }
  function remember(key, open) {
    if (!key.startsWith('page-')) return Promise.resolve();
    return api.storage.local.set({ [`state:${key}`]: { open, updatedAt: Date.now() } })
      .catch(() => console.warn('DumbPad could not remember this sidebar state.'));
  }
  api.action.onClicked.addListener(async tab => {
    if (!Number.isInteger(tab.id) || tab.id < 0) return;
    const key = pageKey(tab);
    const token = {}; revisions.set(tab.id, token);
    try {
      // Keep the open call in the original user gesture, just like Chromium.
      const configured = api.sidebarAction.setPanel({ tabId: tab.id, panel: panelPath(tab, key) });
      const opened = api.sidebarAction.open();
      await Promise.all([configured, opened]);
      if (revisions.get(tab.id) === token) await remember(key, true);
    } catch (error) { console.error('Unable to open DumbPad:', error); }
  });
  async function follow(tabId, url, suppliedTab) {
    const token = {}; revisions.set(tabId, token);
    try {
      const tab = suppliedTab || await api.tabs.get(tabId);
      const key = pageKey({ id: tabId, url: url || tab.url });
      const currentPanel = await api.sidebarAction.getPanel({ tabId });
      const saved = (await api.storage.local.get(`state:${key}`))[`state:${key}`];
      if (revisions.get(tabId) !== token) return;
      const desired = panelPath(tab, key, !!saved?.open);
      if (currentPanel && new URL(currentPanel, api.runtime.getURL('')).href === new URL(desired, api.runtime.getURL('')).href) return;
      // Both open() and close() need gestures in Firefox. Replace only the content
      // on navigation; unknown pages must not load the previous page's Pad.
      await api.sidebarAction.setPanel({ tabId, panel: desired });
    } catch { /* Tabs can disappear during a navigation. */ }
  }
  api.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (change.status === 'loading' || change.url) return follow(tabId, change.url || tab?.url, tab);
  });
  api.tabs.onActivated.addListener(({ tabId }) => follow(tabId));
  api.windows.onFocusChanged.addListener(async windowId => {
    if (windowId < 0) return;
    try { for (const tab of await api.tabs.query({ windowId, active: true })) await follow(tab.id, tab.url, tab); }
    catch { /* Closed window. */ }
  });
  api.runtime.onMessage.addListener(async (message, sender) => {
    if (sender.id !== api.runtime.id || message?.type !== 'dumbpad-panel-lifecycle') return;
    try {
      const senderURL = new URL(sender.url);
      const ownURL = new URL(api.runtime.getURL('panel.html'));
      if (senderURL.protocol !== ownURL.protocol || senderURL.host !== ownURL.host || senderURL.pathname !== ownURL.pathname) return;
      if (senderURL.searchParams.get('ownerTab') !== String(message.tabId) || senderURL.searchParams.get('context') !== message.context) return;
      const tab = await api.tabs.get(message.tabId);
      if (!tab.active || pageKey(tab) !== message.context) return;
      if (message.kind === 'opened') await remember(message.context, true);
      if (message.kind === 'closed') {
        // Content replacement and window teardown are not a manual close.
        await api.windows.get(tab.windowId);
        if (await api.sidebarAction.isOpen({ windowId: tab.windowId })) return;
        const current = await api.tabs.get(message.tabId);
        if (!current.active || pageKey(current) !== message.context) return;
        await remember(message.context, false);
      }
    } catch { /* Closing a whole tab keeps its prior page state. */ }
  });
  async function initialize() {
    try { for (const tab of await api.tabs.query({ active: true })) await follow(tab.id, tab.url, tab); }
    catch { /* Browser startup is still restoring its tabs. */ }
  }
  api.runtime.onInstalled.addListener(initialize);
  api.runtime.onStartup.addListener(initialize);
})();
