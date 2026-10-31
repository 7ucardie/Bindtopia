// Costs and voluntary support on the rights pages, filled from dist/project.json (generated from project.config.json).
// The static list in the page is the fallback; a donation link stays hidden until its username is configured.
const en = document.documentElement.lang === 'en';
const money = (amount, currency) =>
  new Intl.NumberFormat(en ? 'en' : 'nl', { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);

fetch('project.json', { credentials: 'omit', referrerPolicy: 'no-referrer' })
  .then(r => r.json())
  .then(config => {
    const list = document.querySelector('#costs');
    if (list && Array.isArray(config.costs) && config.costs.length) {
      list.replaceChildren(
        ...config.costs.map(c => {
          const li = document.createElement('li');
          const amount = typeof c.perYear === 'number' ? money(c.perYear, c.currency) + (en ? ' per year' : ' per jaar') : '';
          li.textContent = (en ? c.itemEn : c.item) + (amount ? ': ' + amount : '');
          return li;
        }),
      );
    }
    if (/^[A-Za-z0-9_]{1,40}$/.test(config.kofiUsername || '')) {
      for (const link of document.querySelectorAll('.kofi-link')) {
        link.href = 'https://ko-fi.com/' + config.kofiUsername;
        link.hidden = false;
      }
    }
  })
  .catch(() => {});
