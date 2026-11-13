// The card catalog: loading a card language, searching, filtering, sorting and the card grid.
import { currentLocale } from './i18n.mjs';
import { normalize, extractNumbers } from './matcher.mjs';
import { escape } from './card-detail.mjs';
import { state, getJSON, year } from './state.mjs';
import { $, fmt, pic, protectImage } from './ui.mjs';
import { takePendingCard } from './dialogs.mjs';
import { savedCards, isSaved, toggleSaved } from './collection.mjs';
import { show } from './detail.mjs';
import { openAddCard } from './add-card.mjs';

const PAGE = 24;
let view = 'all',
  limit = PAGE,
  catalogTicket = 0,
  debounce;

function cardElement(c) {
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML =
    '<button class="heart ' +
    (isSaved(c) ? 'saved' : '') +
    '" aria-label="' +
    (isSaved(c) ? 'Verwijder' : 'Bewaar') +
    ' ' +
    escape(c.name) +
    '">' +
    (isSaved(c) ? '♥' : '♡') +
    '</button><button class="art" aria-label="Bekijk ' +
    escape(c.name) +
    '">' +
    pic(c) +
    '</button><div class="info"><h3>' +
    escape(c.name) +
    '</h3><div class="meta"><span>' +
    escape(c.custom ? c.setName || 'Set onbekend' : c.setName || state.sets[c.setId]?.name || c.setId) +
    (year(c.setId) ? ' · ' + year(c.setId) : '') +
    '</span><span>#' +
    escape(c.localId) +
    '</span></div><span class="tag' +
    (c.custom ? ' custom' : '') +
    '">' +
    escape((c.lang || state.language).toUpperCase()) +
    ' · ' +
    (c.custom ? 'Eigen invoer' : escape(c.id)) +
    '</span></div>';
  el.querySelector('.heart').onclick = () => toggleSaved(c);
  el.querySelector('.art').onclick = () => show(c);
  protectImage(el);
  return el;
}

function nav() {
  document.querySelectorAll('button[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#collectionTools').hidden = view !== 'saved';
}

// Normalized card names and ids are remembered, so a search or filter change does not redo that work for every card
// in the catalog (keeps typing and tapping responsive on phones). Cleared when a card language loads.
const normalized = new Map();
function normalizedOnce(s) {
  let v = normalized.get(s);
  if (v === undefined) normalized.set(s, (v = normalize(s)));
  return v;
}
// Fills that memory in short steps while the browser is idle after a catalog loads, so the first search is fast too.
const whenIdle = step => (window.requestIdleCallback ? requestIdleCallback(step, { timeout: 2000 }) : setTimeout(step, 50));
function prepareSearch(ticket) {
  let i = 0;
  const step = () => {
    if (ticket !== catalogTicket) return;
    const cards = state.cards,
      end = Math.min(cards.length, i + 1500);
    for (; i < end; i++) {
      normalizedOnce(cards[i].name);
      normalizedOnce(cards[i].id);
    }
    if (i < cards.length) whenIdle(step);
  };
  whenIdle(step);
}

// A collector number such as 4/102 must match number and set total; a bare number matches the number; otherwise the name or id.
function filtered() {
  const q = $('#query').value.trim(),
    n = normalize(q),
    nums = extractNumbers(q),
    setId = $('#setFilter').value,
    imagesOnly = $('#imagesOnly').checked;
  const source = view === 'saved' ? savedCards() : state.cards;
  return source.filter(c => {
    if (setId && c.setId !== setId) return false;
    if (imagesOnly && !c.image) return false;
    if (!q) return true;
    if (nums.length) {
      const p = nums[0];
      return (
        c.localId.replace(/^0+/, '').toLowerCase() === p.localId.replace(/^0+/, '').toLowerCase() &&
        Number(state.sets[c.setId]?.cardCount?.official) === Number(p.total)
      );
    }
    if (/^\d+$/.test(q)) return Number(c.localId) === Number(q);
    return normalizedOnce(c.name).includes(n) || normalizedOnce(c.id) === n;
  });
}

export function render() {
  nav();
  $('#grid').replaceChildren();
  $('#shownCount').textContent = '';
  $('#more').hidden = true;
  if (view === 'sets') {
    renderSets();
    return;
  }
  $('#grid').className = 'grid';
  const result = filtered();
  const sort = $('#sort').value;
  if (sort === 'az' || sort === 'za') result.sort((a, b) => (sort === 'za' ? -1 : 1) * a.name.localeCompare(b.name));
  if (sort === 'num') result.sort((a, b) => a.localId.localeCompare(b.localId, undefined, { numeric: true }));
  $('#heading').textContent =
    view === 'saved'
      ? 'Mijn bewaarde kaarten'
      : $('#query').value
        ? 'Zoekresultaten'
        : $('#setFilter').value
          ? state.sets[$('#setFilter').value]?.name || 'Kaarten'
          : 'Ontdek kaarten';
  $('#status').textContent =
    fmt(result.length) + ' kaarten' + (view === 'saved' ? ' · op dit toestel' : ' · ' + $('#language').selectedOptions[0].textContent);
  if (!state.ready && view !== 'saved') {
    $('#grid').innerHTML = '<div class="empty">Catalogus laden…</div>';
    return;
  }
  if (!result.length) {
    $('#grid').innerHTML =
      '<div class="empty">' +
      (view === 'saved'
        ? 'Je hebt hier nog geen passende kaarten bewaard.<br>Gebruik het hartje bij een kaart.'
        : 'Geen kaarten gevonden. Probeer een andere naam of wis de filters.') +
      '</div>';
    // A card TCGdex does not have can still go into the visitor's own collection.
    if (view !== 'saved' && $('#query').value.trim()) {
      const add = document.createElement('button');
      add.className = 'outline';
      add.textContent = 'Staat je kaart er niet tussen? Voeg hem zelf toe';
      add.onclick = () => openAddCard({ name: $('#query').value.trim() });
      $('#grid .empty').append(document.createElement('br'), add);
    }
    return;
  }
  const frag = document.createDocumentFragment();
  result.slice(0, limit).forEach(c => frag.append(cardElement(c)));
  $('#grid').append(frag);
  $('#more').hidden = result.length <= limit;
  $('#shownCount').textContent = fmt(Math.min(limit, result.length)) + ' van ' + fmt(result.length);
}

function renderSets() {
  const q = normalize($('#query').value);
  const list = Object.values(state.sets).filter(s => !q || normalize(s.name + ' ' + s.id).includes(q));
  $('#grid').className = 'sets';
  $('#heading').textContent = 'Sets & series';
  $('#status').textContent = fmt(list.length) + ' sets · ' + $('#language').selectedOptions[0].textContent;
  list.slice(0, limit).forEach(s => {
    const b = document.createElement('button');
    b.className = 'set';
    b.innerHTML =
      (s.logo ? '<img loading="lazy" src="' + escape(s.logo) + '.webp" alt="">' : '') +
      '<strong>' +
      escape(s.name) +
      '</strong><span>' +
      (year(s.id) ? year(s.id) + ' · ' : '') +
      fmt(s.cardCount?.total || 0) +
      ' kaarten · ' +
      escape(s.id) +
      ' →</span>';
    b.onclick = () => {
      view = 'all';
      $('#query').value = '';
      $('#setFilter').value = s.id;
      limit = PAGE;
      render();
    };
    protectImage(b);
    $('#grid').append(b);
  });
  if (!list.length) $('#grid').innerHTML = '<div class="empty">Geen sets gevonden.</div>';
  $('#more').hidden = list.length <= limit;
  $('#shownCount').textContent = fmt(Math.min(limit, list.length)) + ' van ' + fmt(list.length);
}

// The English index files. app.mjs starts them before the interface language loads (prefetchCatalog), so the
// download runs alongside it; the first English load uses those requests, any later load or retry fetches again.
const englishIndex = () => [getJSON('./data/cards-en.json'), getJSON('./data/sets-en.json'), getJSON('./data/meta.json')];
let prefetched = null;
export function prefetchCatalog() {
  prefetched ??= englishIndex();
  prefetched.forEach(p => p.catch(() => {}));
}

// English comes from our own index; other card languages are loaded live from TCGdex. A newer request wins (catalogTicket).
export async function loadCatalog(lang) {
  const ticket = ++catalogTicket;
  state.ready = false;
  state.language = lang;
  state.cards = [];
  state.sets = {};
  normalized.clear();
  $('#catalogStatus').textContent = 'Kaartencatalogus laden…';
  render();
  const early = lang === 'en' ? prefetched : null;
  prefetched = null;
  try {
    const [cs, ss, meta] = await Promise.all(
      lang === 'en'
        ? early || englishIndex()
        : [getJSON('https://api.tcgdex.net/v2/' + lang + '/cards'), getJSON('https://api.tcgdex.net/v2/' + lang + '/sets')],
    );
    if (ticket !== catalogTicket) return;
    if (!Array.isArray(cs) || !Array.isArray(ss)) throw Error('Onverwachte brongegevens');
    state.sets = Object.fromEntries(ss.map(s => [s.id, s]));
    state.cards = cs.map(c => ({ ...c, setId: c.setId || c.id.slice(0, c.id.lastIndexOf('-')), lang }));
    $('#setFilter').replaceChildren(
      new Option('Alle sets', ''),
      ...ss
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(s => new Option(s.name, s.id)),
    );
    state.ready = true;
    // The index is checked against TCGdex daily; meta.checked is the last check, meta.updated the last change.
    const checked = lang === 'en' ? new Date(meta.checked || meta.updated).toLocaleDateString(currentLocale()) : '';
    if (lang === 'en') $('#indexDate').textContent = checked;
    const counts = fmt(state.cards.length) + ' kaartvermeldingen · ' + fmt(ss.length) + ' sets · ';
    if (lang === 'en') {
      // The TCGdex database release current at the last check (meta.tcgdex), kept out of translation.
      const version = document.createElement('span');
      version.dataset.noTranslate = '';
      version.textContent = /^\d+\.\d+\.\d+$/.test(meta.tcgdex || '') ? ' v' + meta.tcgdex : '';
      $('#catalogStatus').replaceChildren(
        counts + 'Eigen index van TCGdex',
        version,
        ', bijgewerkt ' + checked + ' · Beschikbaarheid verschilt per taal.',
      );
    } else $('#catalogStatus').textContent = counts + 'Live catalogus van TCGdex · Beschikbaarheid verschilt per taal.';
    limit = PAGE;
    render();
    prepareSearch(ticket);
    const pending = takePendingCard();
    if (pending) {
      const c = state.cards.find(x => x.id === pending);
      if (c) show(c);
    }
  } catch {
    if (ticket !== catalogTicket) return;
    $('#catalogStatus').replaceChildren(document.createTextNode('Catalogus laden lukt niet. Controleer je verbinding. '));
    const retry = document.createElement('button');
    retry.className = 'outline';
    retry.textContent = 'Opnieuw proberen';
    retry.onclick = () => loadCatalog(lang);
    $('#catalogStatus').append(retry);
    $('#grid').innerHTML = '<div class="empty">De catalogus is nu niet beschikbaar. Je bewaarde kaarten blijven bereikbaar.</div>';
  }
}

// Card languages are measured against TCGdex by the daily catalog job (dist/data/languages.json), each with its OCR model.
export function loadCardLanguages() {
  getJSON('./data/languages.json')
    .then(list => {
      const valid = Array.isArray(list)
        ? list.filter(l => /^[a-z]{2}(-[a-z]{2})?$/.test(l?.code) && typeof l.name === 'string' && /^[a-z_]+$/.test(l.ocr))
        : [];
      if (!valid.some(l => l.code === 'en')) return;
      state.cardLanguages = valid;
      const sel = $('#language'),
        cur = sel.value;
      sel.replaceChildren(
        ...valid.map(l => {
          const o = new Option(l.name, l.code);
          o.dataset.noTranslate = '';
          return o;
        }),
      );
      sel.value = valid.some(l => l.code === cur) ? cur : 'en';
    })
    .catch(() => {});
}

function showFirstPage() {
  limit = PAGE;
  render();
}

export function wireCatalog() {
  $('#language').onchange = () => {
    $('#matches').replaceChildren();
    $('#matchStatus').textContent = '';
    loadCatalog($('#language').value);
  };
  $('#setFilter').onchange = showFirstPage;
  $('#imagesOnly').onchange = render;
  $('#sort').onchange = render;
  $('#search').onsubmit = e => {
    e.preventDefault();
    clearTimeout(debounce);
    showFirstPage();
  };
  $('#query').oninput = () => {
    clearTimeout(debounce);
    debounce = setTimeout(showFirstPage, 180);
  };
  document.querySelectorAll('[data-q]').forEach(
    b =>
      (b.onclick = () => {
        $('#query').value = b.dataset.q;
        view = 'all';
        showFirstPage();
      }),
  );
  // The footer's "All sets" is a real link (/sets/, for search engines); in the app it opens the sets view in place.
  document.querySelectorAll('[data-view]').forEach(
    b =>
      (b.onclick = e => {
        if (b.tagName === 'A') {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          scrollTo({ top: 0 });
        }
        view = b.dataset.view;
        showFirstPage();
      }),
  );
  $('#reset').onclick = () => {
    $('#query').value = '';
    $('#setFilter').value = '';
    $('#imagesOnly').checked = false;
    showFirstPage();
  };
  $('#more').onclick = () => {
    limit += PAGE;
    render();
  };
}
