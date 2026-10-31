// The card detail dialog: live card information from TCGdex, prices for the visitor's market, card text translation and sharing.
import { currentLocale } from './i18n.mjs';
import { escape, detailRow, cardTextHtml, priceBlock, priceDate } from './card-detail.mjs';
import { markets, marketLinks } from './markets.mjs';
import { state, getJSON, setMarket } from './state.mjs';
import { $, toast, pic, protectImage } from './ui.mjs';
import { openDialog, cardUrl } from './dialogs.mjs';
import { isSaved, toggleSaved } from './collection.mjs';
import { reportUrl } from './custom-cards.mjs';

// Only the newest opened card may fill the dialog; closing it also invalidates a pending request.
let detailTicket = 0;

const saveLabel = card => (isSaved(card) ? '♥ Verwijder uit bewaard' : '♡ Bewaar deze kaart');

function marketSelect() {
  return (
    '<label class="market-select">Markt <select id="marketSelect" data-no-translate>' +
    Object.entries(markets)
      .map(
        ([k, v]) =>
          '<option value="' +
          k +
          '"' +
          (k === state.market ? ' selected' : '') +
          '>' +
          escape(v.name) +
          (v.currency ? ' (' + v.currency + ')' : '') +
          '</option>',
      )
      .join('') +
    '</select></label>'
  );
}

function priceSection(d) {
  const m = markets[state.market],
    prices = priceBlock(d.pricing, currentLocale(), { currency: m.currency, rates: state.rates, prefer: m.prefer });
  if (!prices) return { prices, html: '' };
  const converts = !!(state.rates && m.currency && prices.includes('≈'));
  const date = priceDate(d.pricing);
  return {
    prices,
    html:
      '<h3>Indicatieve prijzen</h3>' +
      prices +
      (converts
        ? '<p class="notice">≈ = omgerekend met de wisselkoers van de Europese Centrale Bank; geen lokale marktprijs. (' +
          escape(state.rates.date || '') +
          ')</p>'
        : '') +
      (d.offline ? '<p class="notice offline-note">Offline: dit is de laatst bekende informatie die op dit toestel is bewaard.</p>' : '') +
      '<p class="notice price-date"><strong>Prijsdatum:</strong> ' +
      escape(date ? new Date(date).toLocaleDateString(currentLocale(), { timeZone: 'UTC' }) : '–') +
      '</p><p class="notice">Dit zijn indicaties via TCGdex (Cardmarket, TCGplayer): bekijk altijd de actuele prijs bij de aanbieder hieronder en controleer conditie en drukvariant.</p>',
  };
}

// Search links at the marketplaces of the visitor's market; a card without an image also gets an image search.
function marketplaceLinks(d, hasImage) {
  return (
    (hasImage
      ? ''
      : '<a href="https://www.google.com/search?tbm=isch&q=' +
        encodeURIComponent(d.name + ' ' + (d.set?.name || '') + ' pokemon card') +
        '" target="_blank" rel="noopener noreferrer">Afbeelding zoeken via Google ↗</a>') +
    marketLinks(state.market, d.name + ' ' + d.localId + ' ' + (d.set?.name || ''))
      .map(([n, u]) => '<a href="' + escape(u) + '" target="_blank" rel="noopener noreferrer">' + n + ' ↗</a>')
      .join('')
  );
}

// A card the visitor entered by hand: shown from the collection only, clearly marked, with a link to report it to TCGdex.
// It gets no shareable address, because nobody else has this card.
function showCustom(c) {
  ++detailTicket;
  openDialog($('#modal'));
  const price = c.price
    ? new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: c.price.currency }).format(c.price.amount)
    : '';
  $('#detail').innerHTML =
    '<div class="detail">' +
    pic(c, true) +
    '<div class="detail-content"><div class="eyebrow">' +
    escape(c.lang.toUpperCase()) +
    ' · Eigen invoer</div><h1 style="font-size:30px">' +
    escape(c.name) +
    '</h1><div class="detail-actions"><button id="detailSave" class="outline">' +
    saveLabel(c) +
    '</button></div><table>' +
    detailRow('Set', c.setName) +
    detailRow('Kaartnummer', c.localId) +
    detailRow('Eigen prijs', price) +
    detailRow('Notitie', c.note) +
    '</table><p class="notice">Deze kaart heb je zelf toegevoegd. De gegevens komen niet van TCGdex en zijn niet gecontroleerd.</p>' +
    '<h3>Bekijk prijzen bij de bron</h3><div class="links">' +
    marketplaceLinks({ name: c.name, localId: c.localId, set: { name: c.setName } }, false) +
    '</div><p class="notice">De links openen zoekresultaten bij de aanbieder. Controleer taal, conditie en drukvariant.</p>' +
    '<h3>Ontbreekt deze kaart in de catalogus?</h3><p class="notice">TCGdex is een open kaartendatabase. Meld de kaart daar, dan komt hij na opname vanzelf in Bindtopia. Alleen naam, set, nummer en taal worden ingevuld; je notitie en prijs niet.</p>' +
    '<div class="links"><a id="reportCard" href="' +
    escape(reportUrl(c)) +
    '" target="_blank" rel="noopener noreferrer">Meld deze kaart bij TCGdex ↗</a></div></div></div>';
  $('#detailSave').onclick = () => {
    toggleSaved(c);
    if (!isSaved(c)) $('#modal').close();
    else $('#detailSave').textContent = saveLabel(c);
  };
}

export async function show(c) {
  if (c.custom) return showCustom(c);
  const ticket = ++detailTicket;
  const lang = c.lang || state.language;
  $('#detail').innerHTML = '<div class="api-spinner">Kaartinformatie ophalen…</div>';
  openDialog($('#modal'), cardUrl(c.id));
  if (history.state?.dialog === 'modal') history.replaceState(history.state, '', cardUrl(c.id));
  try {
    const [d, released] = await Promise.all([
      getJSON('https://api.tcgdex.net/v2/' + lang + '/cards/' + encodeURIComponent(c.id)),
      state.sets[c.setId]?.releaseDate ||
        (c.setId
          ? getJSON('https://api.tcgdex.net/v2/' + lang + '/sets/' + encodeURIComponent(c.setId)).then(
              s => s.releaseDate,
              () => '',
            )
          : ''),
    ]);
    if (ticket !== detailTicket) return;
    const total = d.set?.cardCount?.official;
    const converted = { ...c, image: d.image || c.image, setId: d.set?.id || c.setId, setName: d.set?.name || c.setName, lang };
    const rows =
      detailRow('Set', d.set?.name) +
      detailRow('Jaar van uitgave', /^\d{4}/.test(released || '') ? released.slice(0, 4) : '') +
      detailRow('Kaartnummer', d.localId + (total ? '/' + total : '')) +
      detailRow('Categorie', d.category) +
      detailRow('HP', d.hp) +
      detailRow('Type', d.types?.join(', ')) +
      detailRow('Zeldzaamheid', d.rarity) +
      detailRow('Evolutiefase', d.stage) +
      detailRow('Evolueert van', d.evolveFrom) +
      detailRow('Illustrator', d.illustrator) +
      detailRow('Kaart-ID', d.id);
    const { prices, html: priceHtml } = priceSection(d);
    const canTranslate = currentLocale() !== lang && cardTextHtml(d) !== '';
    $('#detail').innerHTML =
      '<div class="detail">' +
      pic(converted, true) +
      '<div class="detail-content"><div class="eyebrow">' +
      escape(lang.toUpperCase()) +
      ' · ' +
      escape(d.set?.name) +
      '</div><h1 style="font-size:30px">' +
      escape(d.name) +
      '</h1><div class="detail-actions"><button id="detailSave" class="outline">' +
      saveLabel(converted) +
      '</button><button id="shareCard" class="outline">↗ Deel kaart</button></div><table>' +
      rows +
      '</table>' +
      (canTranslate ? '<button id="translateText" class="textbutton">Vertaal kaarttekst</button>' : '') +
      '<div id="cardText" lang="' +
      escape(lang) +
      '">' +
      cardTextHtml(d) +
      '</div>' +
      marketSelect() +
      priceHtml +
      '<h3>Bekijk prijzen bij de bron</h3><div class="links">' +
      marketplaceLinks(d, !!converted.image) +
      '</div>' +
      (prices
        ? '<p class="notice">De links openen zoekresultaten bij de aanbieder. Controleer taal, conditie en drukvariant.</p>'
        : '<p class="notice">De links openen zoekresultaten bij de aanbieder. Controleer taal, conditie en drukvariant. Er worden hier geen actuele prijzen weergegeven.</p>') +
      '<button class="textbutton" id="copySearch">Kopieer naam en kaartnummer</button><p class="notice">Kaartinformatie via TCGdex.</p></div></div>';
    protectImage($('#detail'));
    if (canTranslate) wireTranslate(c, d, lang, ticket);
    $('#marketSelect').onchange = e => {
      setMarket(e.target.value);
      show(c);
    };
    $('#detailSave').onclick = () => {
      toggleSaved(converted);
      $('#detailSave').textContent = saveLabel(converted);
    };
    $('#shareCard').onclick = () => shareCard(c.id, d.name);
    $('#copySearch').onclick = () => copy(d.name + ' ' + d.localId + (total ? '/' + total : ''), 'Naam en kaartnummer gekopieerd');
  } catch {
    if (ticket !== detailTicket) return;
    const title = document.createElement('h2');
    title.textContent = c.name;
    const p = document.createElement('p');
    p.textContent = 'Uitgebreide kaartinformatie is nu niet bereikbaar. Probeer het opnieuw.';
    const retry = document.createElement('button');
    retry.className = 'primary';
    retry.textContent = 'Opnieuw proberen';
    retry.onclick = () => show(c);
    $('#detail').replaceChildren(title, p, retry);
  }
}

// The official card text in the interface language (not machine translation), toggling back to the original.
function wireTranslate(c, d, lang, ticket) {
  let translation = null,
    translated = false;
  $('#translateText').onclick = async () => {
    const b = $('#translateText'),
      box = $('#cardText');
    if (translated) {
      box.lang = lang;
      box.innerHTML = cardTextHtml(d);
      translated = false;
      b.textContent = 'Vertaal kaarttekst';
      return;
    }
    b.disabled = true;
    try {
      translation ??= await getJSON('https://api.tcgdex.net/v2/' + currentLocale() + '/cards/' + encodeURIComponent(c.id));
      if (ticket !== detailTicket) return;
      if (!cardTextHtml(translation)) throw Error('leeg');
      box.lang = currentLocale();
      box.innerHTML = cardTextHtml(translation);
      translated = true;
      b.textContent = 'Toon origineel';
    } catch {
      if (ticket === detailTicket) toast('Geen officiële vertaling beschikbaar voor deze kaart.');
    } finally {
      b.disabled = false;
    }
  };
}

async function shareCard(id, name) {
  const url = cardUrl(id);
  if (navigator.share) {
    try {
      await navigator.share({ title: name + ' · Bindtopia', url });
    } catch {}
    return;
  }
  await copy(url, 'Link naar deze kaart gekopieerd');
}

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast('Kopiëren lukt niet in deze browser');
  }
}

function closeDetail() {
  $('#modal').close();
  detailTicket++;
}

export function wireDetail() {
  $('.close').onclick = closeDetail;
  $('#modal').onclick = e => {
    if (e.target === $('#modal')) closeDetail();
  };
  $('#modal').addEventListener('cancel', () => detailTicket++);
}
