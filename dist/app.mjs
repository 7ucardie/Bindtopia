// Bindtopia start page: loads the interface language, then wires each part of the page.
//   catalog.mjs     search, filters and the card grid      detail.mjs      card detail dialog, prices, sharing
//   collection.mjs  saved cards, backup import/export      scanner.mjs     photo and camera scanning
//   trade-mode.mjs  live camera trade mode                  ocr.mjs         text and picture recognition (shared)
//   state.mjs       shared state and data requests         ui.mjs, dialogs.mjs  DOM helpers and dialog history
import { startI18n } from './i18n.mjs';
import { getJSON, loadRates } from './state.mjs';
import { $ } from './ui.mjs';
import { wireDialogs } from './dialogs.mjs';
import { wireCollection } from './collection.mjs';
import { render, loadCatalog, loadCardLanguages, wireCatalog } from './catalog.mjs';
import { wireDetail } from './detail.mjs';
import { wireScanner } from './scanner.mjs';
import { wireTrade } from './trade-mode.mjs';

await startI18n();
wireDialogs();
wireCollection();
wireCatalog();
wireDetail();
wireScanner();
wireTrade();
loadRates();
loadCatalog('en');
loadCardLanguages();
document.addEventListener('interface-language-change', render);

// Offline copy of the site, catalogue, OCR files and recently viewed cards (dist/sw.js); stays on this device.
if ('serviceWorker' in navigator)
  navigator.serviceWorker
    .register('sw.js')
    .then(() => {
      if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) navigator.storage?.persist?.();
    })
    .catch(() => {});

getJSON('./project.json')
  .then(config => {
    if (/^[a-z0-9-]+$/i.test(config.sponsorsUsername)) {
      const link = $('#sponsorLink');
      link.href = 'https://github.com/sponsors/' + config.sponsorsUsername;
      link.hidden = false;
    }
    loadAnalytics(config.cloudflareAnalyticsToken);
  })
  .catch(() => {});

// Cookieless Cloudflare Web Analytics; skipped when the visitor signals Do Not Track or Global Privacy Control.
function loadAnalytics(token) {
  if (!/^[a-f0-9]{32}$/.test(token || '') || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.dataset.cfBeacon = JSON.stringify({ token, spa: false });
  document.head.append(s);
}
