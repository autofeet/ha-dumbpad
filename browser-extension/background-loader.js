'use strict';
const browserAPI = globalThis.browser || globalThis.chrome;
importScripts(browserAPI.sidePanel ? 'background.js' : 'firefox-background.js');
