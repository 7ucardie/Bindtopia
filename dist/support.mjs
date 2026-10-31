// Costs and voluntary support on the rights pages, filled from dist/project.json (generated from project.config.json).
// The static list and Ko-fi link in the page are the fallback; a gift link is shown only while its username is configured.
const en = document.documentElement.lang === 'en';
const money = (amount, currency) =>
  new Intl.NumberFormat(en ? 'en' : 'nl', { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);

const perYear = en ? ' per year' : ' per jaar',
  perMonth = en ? ' per month' : ' per maand';
const yearly = c => (typeof c.perYear === 'number' ? c.perYear : typeof c.perMonth === 'number' ? c.perMonth * 12 : null);
const amountText = c =>
  typeof c.perMonth === 'number'
    ? money(c.perMonth, c.currency) + perMonth + ' (' + money(c.perMonth * 12, c.currency) + perYear + ')'
    : money(c.perYear, c.currency) + perYear;

fetch('project.json', { credentials: 'omit', referrerPolicy: 'no-referrer' })
  .then(r => r.json())
  .then(config => {
    const list = document.querySelector('#costs');
    if (list && Array.isArray(config.costs) && config.costs.length) {
      list.replaceChildren(
        ...config.costs.map(c => {
          const li = document.createElement('li');
          li.textContent = (en ? c.itemEn : c.item) + (yearly(c) === null ? '' : ': ' + amountText(c));
          return li;
        }),
      );
      // A yearly total, only when every cost is known and in one currency.
      const currencies = new Set(config.costs.map(c => c.currency));
      if (config.costs.every(c => yearly(c) !== null) && currencies.size === 1) {
        const total = document.createElement('li');
        total.className = 'cost-total';
        const sum = config.costs.reduce((s, c) => s + yearly(c), 0);
        total.textContent =
          (en ? 'Total: about ' : 'Totaal: ongeveer ') + money(sum, [...currencies][0]) + (en ? ' per year' : ' per jaar');
        list.append(total);
      }
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
