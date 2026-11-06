'use strict';

// The default panel must stay disabled: only an explicit click enables a tab.
async function initialize() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    await chrome.sidePanel.setOptions({ enabled: false });
  } catch (error) {
    console.error('Unable to initialize DumbPad:', error);
  }
}

// Stable, non-cryptographic page identifier. Raw webpage URLs are never stored.
function contextForPage(tab) {
  try {
    const url = new URL(tab.url);
    if (!['http:', 'https:'].includes(url.protocol)) return `tab-${tab.id}`;
    url.username = ''; url.password = '';
    let hash = 14695981039346656037n;
    for (let i = 0; i < url.href.length; i++) {
      hash = BigInt.asUintN(64, (hash ^ BigInt(url.href.charCodeAt(i))) * 1099511628211n);
    }
    return `page-${hash.toString(16).padStart(16, '0')}`;
  } catch { return `tab-${tab.id}`; }
}

const contexts = new Map();
const revisions = new Map();
function rememberOpen(key, open) {
  if (!key?.startsWith('page-')) return Promise.resolve();
  return chrome.storage.local.set({ [`state:${key}`]: { open, updatedAt: Date.now() } })
    .catch(() => console.warn('DumbPad could not remember the panel state.'));
}
function eventContext(info) {
  try { return new URL(info.path, 'chrome-extension://dumbpad/').searchParams.get('context'); }
  catch { return null; }
}
chrome.action.onClicked.addListener(async tab => {
  if (!Number.isInteger(tab.id) || tab.id < 0) return;
  const key = contextForPage(tab);
  const token = {};
  revisions.set(tab.id, token);
  contexts.set(tab.id, key);
  try {
    // Invoke both APIs before awaiting: awaiting setOptions can lose the gesture.
    const configured = chrome.sidePanel.setOptions({ tabId: tab.id, path: `panel.html?context=${key}`, enabled: true });
    const opened = chrome.sidePanel.open({ tabId: tab.id });
    await Promise.all([configured, opened]);
    if (revisions.get(tab.id) === token) await rememberOpen(key, true);
  } catch (error) { console.error('Unable to open DumbPad:', error); }
});

async function followPage(tabId, url) {
  const key = contextForPage({ id: tabId, url });
  if (contexts.get(tabId) === key && key.startsWith('page-')) return;
  const token = {};
  revisions.set(tabId, token);
  contexts.set(tabId, key);
  try {
    // Native options survive service-worker suspension; in-memory maps do not.
    const current = await chrome.sidePanel.getOptions({ tabId });
    if (revisions.get(tabId) !== token) return;
    if (key.startsWith('page-') && current.enabled && eventContext(current) === key) return;
    await chrome.sidePanel.setOptions({ tabId, enabled: false });
    if (!key.startsWith('page-')) return;
    const saved = (await chrome.storage.local.get(`state:${key}`))[`state:${key}`];
    if (saved?.open && revisions.get(tabId) === token) {
      // Chrome may restore its existing native panel. Never force open in background.
      await chrome.sidePanel.setOptions({ tabId, path: `panel.html?context=${key}`, enabled: true });
    }
  } catch { /* A closed or replaced tab no longer needs a panel. */ }
}
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading' && !changeInfo.url) return;
  return followPage(tabId, changeInfo.url || tab?.url);
});
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try { const tab = await chrome.tabs.get(tabId); await followPage(tabId, tab.url); }
  catch { /* The activated tab may already have closed. */ }
});
chrome.tabs.onRemoved.addListener(tabId => {
  contexts.delete(tabId); revisions.delete(tabId);
});
chrome.sidePanel.onOpened.addListener(async info => {
  const key = eventContext(info);
  if (info.tabId === undefined || !key) return;
  try {
    const tab = await chrome.tabs.get(info.tabId);
    if (contextForPage(tab) !== key) return;
    await rememberOpen(key, true);
  } catch { /* Closed tab. */ }
});
chrome.sidePanel.onClosed.addListener(async info => {
  const key = eventContext(info);
  if (info.tabId === undefined || !key) return;
  try {
    const tab = await chrome.tabs.get(info.tabId);
    // Tab switches and navigation are not an explicit choice to close this page's Pad.
    if (!tab.active || contextForPage(tab) !== key) return;
    await rememberOpen(key, false);
  } catch { /* Closing an entire tab keeps its saved page state. */ }
});

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);
initialize();
