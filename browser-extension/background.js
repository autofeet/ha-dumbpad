'use strict';

// A global panel stays available as the user switches between browser tabs.
async function enableActionPanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error('Unable to enable the DumbPad side panel:', error);
  }
}

chrome.runtime.onInstalled.addListener(enableActionPanel);
chrome.runtime.onStartup.addListener(enableActionPanel);
enableActionPanel();
