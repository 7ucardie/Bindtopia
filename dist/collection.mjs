// The visitor's saved cards: browser-local only (localStorage), with version-2 backup export/import and deletion.
import { localize } from './i18n.mjs';
import { state } from './state.mjs';
import { $, toast } from './ui.mjs';
import { render } from './catalog.mjs';
import { validBackupCard } from './custom-cards.mjs';

let saved = [];
export const savedCards = () => saved;

// A card is saved per card language: the same id in another language is a different card in the collection.
const key = card => (card.lang || state.language) + ':' + card.id;

export function isSaved(card) {
  return saved.some(x => key(x) === key(card));
}

export function toggleSaved(card) {
  // A card entered by hand exists only here, so removing it deletes it: ask first.
  if (
    isSaved(card) &&
    card.custom &&
    !confirm(localize('Deze zelf toegevoegde kaart verwijderen? Hij staat alleen in je eigen verzameling.'))
  )
    return;
  if (isSaved(card)) saved = saved.filter(x => key(x) !== key(card));
  else saved.push({ ...card, lang: card.lang || state.language, setName: card.setName || state.sets[card.setId]?.name });
  persist();
  render();
}

export function addCustom(card) {
  saved.push(card);
  persist();
  render();
}

function persist() {
  try {
    localStorage.setItem('kaartkompas-saved-v2', JSON.stringify(saved));
  } catch {
    toast('Bewaren op dit toestel lukt niet. Exporteer je kaarten als back-up.');
  }
  $('#savedCount').textContent = saved.length;
}

function exportSaved() {
  const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), cards: saved }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = 'bindtopia-verzameling.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// Only a complete, valid version-2 backup is merged; one bad entry rejects the whole file.
async function importSaved(e) {
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10e6) throw Error();
    const data = JSON.parse(await f.text());
    if (data.version !== 2 || !Array.isArray(data.cards)) throw Error();
    const valid = data.cards.filter(validBackupCard);
    if (valid.length !== data.cards.length) throw Error();
    const merged = new Map(saved.map(c => [key(c), c]));
    valid.forEach(c => merged.set(key(c), c));
    saved = [...merged.values()];
    persist();
    render();
    toast('Back-up geïmporteerd');
  } catch {
    toast('Dit bestand is geen geldige Bindtopia-back-up.');
  } finally {
    e.target.value = '';
  }
}

function clearSaved() {
  if (!confirm(localize('Alle bewaarde kaarten uit deze browser verwijderen? Exporteer eerst een back-up als je ze wilt behouden.')))
    return;
  try {
    localStorage.removeItem('kaartkompas-saved-v2');
    localStorage.removeItem('kaartkompas-saved');
  } catch {
    toast('Wissen is niet gelukt. Verwijder de sitegegevens via je browser.');
    return;
  }
  saved = [];
  $('#savedCount').textContent = '0';
  render();
  toast('Bewaarde kaarten uit deze browser verwijderd.');
}

export function wireCollection() {
  try {
    const stored = JSON.parse(localStorage.getItem('kaartkompas-saved-v2') || '[]');
    if (Array.isArray(stored)) saved = stored;
  } catch {}
  $('#savedCount').textContent = saved.length;
  $('#exportSaved').onclick = exportSaved;
  $('#importSaved').onclick = () => $('#importFile').click();
  $('#importFile').onchange = importSaved;
  $('#clearSaved').onclick = clearSaved;
}
