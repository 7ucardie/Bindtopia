// Trade mode: live camera scanning with an instant price and a running give/get total.
// The pure rules (when a match is sure, which price leads, totals) live in trade.mjs.
import { currentLocale } from './i18n.mjs';
import { matchCards } from './matcher.mjs';
import { escape, fileId } from './card-detail.mjs';
import { markets, convert } from './markets.mjs';
import { confident, headlinePrice, tradeTotals, decide } from './trade.mjs';
import { OCR_PASSES } from './ocr-prep.mjs';
import { state, getJSON, year } from './state.mjs';
import { $, toast, pic, protectImage } from './ui.mjs';
import { openDialog } from './dialogs.mjs';
import { customCard } from './custom-cards.mjs';
import { getWorker, setOcrProgress, readCanvas, ocrCanvas, pictureHits, distanceText, guideRect } from './ocr.mjs';

const trade = {
  items: [],
  active: false,
  paused: false,
  stream: null,
  attempt: 0,
  misses: 0,
  current: null,
  lastId: '',
  lastAt: 0,
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tradeCurrency = () => markets[state.market].currency || 'EUR';
const money = (n, currency) => new Intl.NumberFormat(currentLocale(), { style: 'currency', currency }).format(n);

function priceText(p) {
  if (!p) return 'Geen prijs bekend';
  const cur = tradeCurrency(),
    local = p.currency === cur ? null : convert(p.amount, p.currency, cur, state.rates);
  return money(p.amount, p.currency) + (local ? ' (≈ ' + money(local, cur) + ')' : '');
}

function tradeState(text, { busy = false, found = false } = {}) {
  $('#tradeStatus').textContent = text;
  $('#tradeDot').className = 'trade-dot' + (busy ? ' busy' : '') + (found ? ' found' : '');
}

function stopTradeCamera() {
  trade.stream?.getTracks().forEach(t => t.stop());
  trade.stream = null;
  $('#tradeVideo').srcObject = null;
}

function closeTrade() {
  trade.active = false;
  stopTradeCamera();
  if ($('#trade').open) $('#trade').close();
}

async function openTrade() {
  if (!state.ready) {
    toast('Wacht tot de catalogus is geladen.');
    return;
  }
  openDialog($('#trade'));
  trade.active = true;
  trade.paused = false;
  trade.attempt = trade.misses = 0;
  $('#tradeAttempt').textContent = '';
  $('#tradeHint').hidden = true;
  $('#tradeResult').hidden = true;
  $('#tradeProgress').value = 0;
  renderTrade();
  tradeState('Camera starten…', { busy: true });
  try {
    trade.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch {
    $('#tradeCamera').hidden = true;
    tradeState('De camera is niet beschikbaar of er is geen toestemming gegeven. Typ hieronder de naam en het nummer.');
    return;
  }
  if (!trade.active) {
    stopTradeCamera();
    return;
  }
  $('#tradeCamera').hidden = false;
  $('#tradeVideo').srcObject = trade.stream;
  tradeState('Tekstherkenning laden. De eerste keer kan dit wat langer duren…', { busy: true });
  try {
    await getWorker();
  } catch {
    tradeState('Tekstherkenning kon niet worden geladen. Typ hieronder de naam en het nummer.');
    return;
  }
  tradeLoop();
}

// A picture match may be an English card that the current catalog (e.g. Chinese) lacks; then it comes from the public API.
async function cardById(id) {
  const c = state.cards.find(x => x.id === id);
  if (c) return { card: c, english: false };
  const d = await getJSON('./api/v1/cards/' + fileId(id) + '.json');
  return {
    card: {
      id: d.id,
      name: d.name,
      localId: d.localId,
      setId: d.setId,
      setName: d.set?.name,
      image: d.images?.small?.replace(/\/low\.webp$/, ''),
      lang: 'en',
    },
    english: state.language !== 'en',
  };
}

// One attempt: the picture inside the guide first, then one text reading (alternating OCR passes); decide() combines both.
async function attempt(video) {
  let imageHits = [];
  try {
    imageHits = await pictureHits(video, guideRect(video, 0));
  } catch {}
  let found = decide([], imageHits),
    hits = [];
  if (!found) {
    state.busy = true;
    setOcrProgress(p => {
      $('#tradeProgress').value = p;
    });
    let text = '',
      hint = 'none';
    try {
      ({ text, hint } = await readCanvas(ocrCanvas(video, guideRect(video), OCR_PASSES[(trade.attempt - 1) % OCR_PASSES.length])));
    } catch {
    } finally {
      state.busy = false;
    }
    $('#tradeGuide').textContent = distanceText[hint];
    hits = matchCards(text, state.cards, state.sets, { limit: 8 });
    found = decide(hits, imageHits);
  }
  return { found, hits };
}

async function tradeLoop() {
  while (trade.active) {
    const v = $('#tradeVideo');
    if (trade.paused || state.busy || !v.videoWidth) {
      await sleep(300);
      continue;
    }
    trade.attempt++;
    $('#tradeAttempt').textContent = 'Poging ' + trade.attempt;
    $('#tradeProgress').value = 0;
    if (trade.misses < 3) tradeState('Kaart zoeken… houd de kaart stil in het kader.', { busy: true });
    const { found, hits } = await attempt(v);
    if (!trade.active || trade.paused) continue;
    // The card just added is usually still in view; ignore it briefly so it isn't offered again.
    if (found && found.id === trade.lastId && Date.now() - trade.lastAt < 5000) {
      await sleep(250);
      continue;
    }
    if (found) {
      trade.misses = 0;
      $('#tradeHint').hidden = true;
      let r = null;
      try {
        r = found.card ? { card: found.card, english: false } : await cardById(found.id);
      } catch {}
      if (r) {
        await showTradeResult(
          r.card,
          hits.filter(h => h.card.id !== r.card.id),
          { by: found.by, english: r.english },
        );
        await sleep(250);
        continue;
      }
    }
    trade.misses++;
    if (trade.misses >= 3) {
      $('#tradeHint').hidden = false;
      tradeState('Nog niet gevonden, ik blijf zoeken…', { busy: true });
    }
    if (hits.length) showCandidates(hits);
    await sleep(250);
  }
}

function candidateButton(h) {
  const b = document.createElement('button');
  b.className = 'outline';
  b.dataset.noTranslate = '';
  b.textContent =
    h.card.name +
    ' #' +
    h.card.localId +
    ' · ' +
    (state.sets[h.card.setId]?.name || h.card.setId) +
    (year(h.card.setId) ? ' · ' + year(h.card.setId) : '');
  b.onclick = () => showTradeResult(h.card, []);
  return b;
}

function showCandidates(hits) {
  if (trade.current) return;
  const box = $('#tradeResult');
  box.hidden = false;
  box.innerHTML = '<div class="trade-alts"><span>Bedoel je:</span></div>';
  const more = document.createElement('button');
  more.className = 'textbutton';
  more.textContent = 'Scan verder';
  more.onclick = resumeTrade;
  hits.slice(0, 8).forEach(h => box.firstChild.append(candidateButton(h)));
  box.firstChild.append(more);
}

// The live-price link opens the marketplace the headline price came from, in the market's language for Cardmarket.
function livePriceUrl(card, set, price) {
  const q = card.name + ' ' + card.localId + ' ' + (set?.name || card.setName || '');
  return price?.source === 'TCGplayer'
    ? 'https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=' + encodeURIComponent(q) + '&view=grid'
    : 'https://www.cardmarket.com/' +
        (markets[state.market].cardmarket || 'en') +
        '/Pokemon/Products/Search?searchString=' +
        encodeURIComponent(q);
}

async function showTradeResult(card, alts, { by = 'text', english = false } = {}) {
  trade.paused = true;
  $('#tradeGuide').textContent = '';
  trade.current = { card, price: null };
  const s = state.sets[card.setId];
  tradeState('Gevonden! Prijs ophalen…', { busy: true, found: true });
  $('#tradeProgress').value = 1;
  const box = $('#tradeResult');
  box.hidden = false;
  box.innerHTML =
    pic({ ...card, lang: state.language }) +
    '<div class="trade-meta"><strong data-no-translate>' +
    escape(card.name) +
    '</strong><span data-no-translate>' +
    escape(s?.name || card.setName || card.setId) +
    (year(card.setId) ? ' · ' + year(card.setId) : '') +
    ' · #' +
    escape(card.localId) +
    '</span><span class="trade-price" id="tradePrice">…</span><small id="tradeSource"></small><a id="tradeLive" class="trade-live" target="_blank" rel="noopener noreferrer" hidden></a>' +
    (by !== 'text' || english
      ? '<small class="trade-how">' +
        (by !== 'text' ? 'Herkend aan de afbeelding' : '') +
        (by !== 'text' && english ? ' · ' : '') +
        (english ? 'Engelse uitgave met dezelfde illustratie' : '') +
        '</small>'
      : '') +
    '</div><div class="scan-tools"><button class="primary" data-side="get">+ Ik krijg</button><button class="outline" data-side="give">+ Ik geef</button><button class="textbutton" id="tradeNext">Scan volgende</button></div>' +
    (alts.length ? '<div class="trade-alts"><span>Niet deze?</span></div>' : '');
  protectImage(box);
  alts.slice(0, 3).forEach(h => box.querySelector('.trade-alts').append(candidateButton(h)));
  box.querySelectorAll('[data-side]').forEach(b => (b.onclick = () => addTrade(b.dataset.side)));
  $('#tradeNext').onclick = resumeTrade;
  const ticket = card.id;
  let price = null,
    offline = false;
  try {
    const d = await getJSON('https://api.tcgdex.net/v2/' + (card.lang || state.language) + '/cards/' + encodeURIComponent(card.id));
    offline = !!d.offline;
    price = headlinePrice(d.pricing, markets[state.market].prefer);
  } catch {}
  if (trade.current?.card.id !== ticket) return;
  trade.current.price = price;
  $('#tradePrice').textContent = priceText(price);
  $('#tradeSource').textContent = price
    ? price.source +
      (price.variant ? ' · ' + price.variant : '') +
      (price.updated && !isNaN(new Date(price.updated))
        ? ' · ' + new Date(price.updated).toLocaleDateString(currentLocale(), { timeZone: 'UTC' })
        : '') +
      (offline ? ' · offline, laatst bekende prijs' : '')
    : '';
  const live = $('#tradeLive');
  live.href = livePriceUrl(card, s, price);
  live.textContent = 'Actuele prijs bij ' + (price?.source || 'Cardmarket') + ' ↗';
  live.hidden = false;
  tradeState('Gevonden: ' + card.name + '. Voeg toe of scan de volgende kaart.', { found: true });
}

// A card the catalog lacks, entered by name with an optional price agreed at the table; it counts in the totals.
function showManual() {
  trade.paused = true;
  trade.current = null;
  $('#tradeGuide').textContent = '';
  const box = $('#tradeResult');
  box.hidden = false;
  box.innerHTML =
    '<form class="add-form trade-manual" id="tradeManualForm"><label class="field">Naam <input name="name" required maxlength="80" autocomplete="off"></label>' +
    '<label class="field"><span>Eigen prijs (<span data-no-translate>' +
    tradeCurrency() +
    '</span>)</span><input name="amount" inputmode="decimal" autocomplete="off" placeholder="Optioneel"></label>' +
    '<div class="scan-tools"><button class="primary" data-side="get">+ Ik krijg</button><button class="outline" data-side="give">+ Ik geef</button>' +
    '<button class="textbutton" type="button" id="tradeManualCancel">Annuleren</button></div></form>';
  const form = $('#tradeManualForm');
  form.elements.name.value = $('#tradeQuery').value.trim();
  form.elements.name.focus();
  $('#tradeManualCancel').onclick = resumeTrade;
  // The clicked button decides the side (a click runs before the form submits; Enter adds to "I get").
  let side = 'get';
  form.querySelectorAll('[data-side]').forEach(b => (b.onclick = () => (side = b.dataset.side)));
  form.onsubmit = e => {
    e.preventDefault();
    const amount = form.elements.amount.value.trim();
    let card;
    try {
      card = customCard({ name: form.elements.name.value, lang: state.language, amount, currency: tradeCurrency() });
    } catch {
      form.elements.name.focus();
      return;
    }
    if (amount && !card.price) {
      toast('Vul een geldige prijs in, bijvoorbeeld 12,50, of laat het veld leeg.');
      form.elements.amount.focus();
      return;
    }
    trade.items.push({ card, price: card.price || null, side });
    renderTrade();
    resumeTrade();
  };
}

function resumeTrade() {
  trade.current = null;
  trade.paused = false;
  trade.misses = 0;
  $('#tradeResult').hidden = true;
  $('#tradeHint').hidden = true;
  if (!trade.stream) tradeState('Typ hieronder de naam en het nummer.');
}

function addTrade(side) {
  if (!trade.current) return;
  trade.items.push({ ...trade.current, side });
  trade.lastId = trade.current.card.id;
  trade.lastAt = Date.now();
  renderTrade();
  resumeTrade();
}

// The give/get list survives a reload on this device only; "Wis ruil" removes it.
function loadTrade() {
  try {
    const items = JSON.parse(localStorage.getItem('bindtopia-trade') || '[]');
    return Array.isArray(items)
      ? items
          .filter(i => i && (i.side === 'give' || i.side === 'get') && typeof i.card?.id === 'string' && typeof i.card?.name === 'string')
          .map(({ card, price, side }) => ({ card, price: price && typeof price === 'object' ? price : null, side }))
      : [];
  } catch {
    return [];
  }
}

function saveTrade() {
  try {
    if (trade.items.length)
      localStorage.setItem('bindtopia-trade', JSON.stringify(trade.items.map(({ card, price, side }) => ({ card, price, side }))));
    else localStorage.removeItem('bindtopia-trade');
  } catch {}
}

function renderTrade() {
  saveTrade();
  const cur = tradeCurrency(),
    t = tradeTotals(trade.items, cur, state.rates);
  for (const side of ['give', 'get']) {
    const ul = $(side === 'give' ? '#tradeGive' : '#tradeGet');
    ul.replaceChildren();
    trade.items.forEach((item, i) => {
      if (item.side !== side) return;
      const li = document.createElement('li');
      li.innerHTML =
        '<span><span data-no-translate>' +
        escape(item.card.name) +
        (item.card.localId ? ' #' + escape(item.card.localId) : '') +
        '</span>' +
        (item.card.custom ? ' <small>· eigen invoer</small>' : '') +
        '</span><span>' +
        escape(priceText(item.price)) +
        '</span>';
      const x = document.createElement('button');
      x.textContent = '✕';
      x.setAttribute('aria-label', 'Verwijder ' + item.card.name);
      x.onclick = () => {
        trade.items.splice(i, 1);
        renderTrade();
      };
      li.append(x);
      ul.append(li);
    });
  }
  $('#tradeGiveTotal').textContent = money(t.give, cur);
  $('#tradeGetTotal').textContent = money(t.get, cur);
  $('#tradeBalance').textContent = !trade.items.length
    ? ''
    : (t.diff > 0
        ? 'Je krijgt meer waarde: ' + money(t.diff, cur)
        : t.diff < 0
          ? 'Je geeft meer waarde: ' + money(-t.diff, cur)
          : 'Gelijke ruil') + (t.skipped ? ' · ' + t.skipped + ' niet meegeteld (geen prijs of koers)' : '');
}

// Typed name and number: a sure match or a single hit is shown at once, otherwise the candidates.
function searchTrade(e) {
  e.preventDefault();
  const q = $('#tradeQuery').value.trim();
  if (!q || !state.ready) return;
  const hits = matchCards(q, state.cards, state.sets, { limit: 8 }),
    hit = confident(hits, { typed: true }) || (hits.length === 1 ? hits[0] : null);
  trade.current = null;
  if (hit)
    showTradeResult(
      hit.card,
      hits.filter(h => h !== hit),
    );
  else if (hits.length) {
    trade.paused = true;
    showCandidates(hits);
  } else tradeState('Geen kaart gevonden voor deze tekst.');
}

export function wireTrade() {
  trade.items = loadTrade();
  $('#openTrade').onclick = openTrade;
  $('#tradeClose').onclick = closeTrade;
  $('#trade').addEventListener('close', closeTrade);
  $('#tradeClear').onclick = () => {
    trade.items = [];
    renderTrade();
  };
  $('#tradeSearch').onsubmit = searchTrade;
  $('#tradeManual').onclick = showManual;
}
