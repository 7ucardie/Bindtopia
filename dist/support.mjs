// Costs and voluntary support on the rights pages, filled from dist/project.json (generated from project.config.json).
// The static list and Ko-fi link in the page are the fallback; a gift link is shown only while its username is configured.
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
    const kofi = /^[A-Za-z0-9_]{1,40}$/.test(config.kofiUsername || '') ? config.kofiUsername : '';
    for (const link of document.querySelectorAll('.kofi-link')) {
      if (kofi) link.href = 'https://ko-fi.com/' + kofi;
      link.hidden = !kofi;
    }
    // GitHub Sponsors appears only once its username is configured (the account must be active first).
    const sponsors = /^[a-z0-9-]{1,39}$/i.test(config.sponsorsUsername || '') ? config.sponsorsUsername : '';
    for (const link of document.querySelectorAll('.sponsors-link')) {
      if (sponsors) link.href = 'https://github.com/sponsors/' + sponsors;
      link.hidden = !sponsors;
    }
  })
  .catch(() => {});
