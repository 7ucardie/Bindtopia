// "Add a card yourself": a short form for cards that TCGdex does not have; the card goes into the visitor's own collection.
import { markets } from './markets.mjs';
import { customCard } from './custom-cards.mjs';
import { state } from './state.mjs';
import { $, toast } from './ui.mjs';
import { openDialog } from './dialogs.mjs';
import { addCustom } from './collection.mjs';

// The price is entered in the currency of the visitor's market.
const currency = () => markets[state.market].currency || 'EUR';

export function openAddCard({ name = '' } = {}) {
  const form = $('#addCardForm');
  form.reset();
  form.elements.name.value = name;
  form.elements.lang.replaceChildren(...state.cardLanguages.map(l => new Option(l.name, l.code)));
  form.elements.lang.value = state.language;
  $('#addCardCurrency').textContent = currency();
  openDialog($('#addCard'));
  form.elements.name.focus();
}

function save(e) {
  e.preventDefault();
  const f = e.target.elements;
  const amount = f.amount.value.trim();
  let card;
  try {
    card = customCard({
      name: f.name.value,
      setName: f.setName.value,
      localId: f.localId.value,
      lang: f.lang.value,
      note: f.note.value,
      amount,
      currency: currency(),
    });
  } catch {
    f.name.focus();
    return;
  }
  if (amount && !card.price) {
    toast('Vul een geldige prijs in, bijvoorbeeld 12,50, of laat het veld leeg.');
    f.amount.focus();
    return;
  }
  addCustom(card);
  $('#addCard').close();
  toast('Kaart toegevoegd aan je verzameling');
}

export function wireAddCard() {
  $('#addCardForm').onsubmit = save;
  $('#addCardClose').onclick = () => $('#addCard').close();
  $('#addCardCancel').onclick = () => $('#addCard').close();
  $('#addCardOpen').onclick = () => openAddCard();
}
