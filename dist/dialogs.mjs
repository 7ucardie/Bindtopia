// On phones the back button or swipe should close an open dialog, not leave the site: each dialog gets a history entry.
export function openDialog(dialog, url) {
  if (dialog.open) return;
  dialog.showModal();
  history.pushState({ dialog: dialog.id }, '', url);
}

// A card detail has its own address (?card=<id>, other parameters kept) so it can be shared; closing steps back to the previous address.
export function cardUrl(id) {
  const u = new URL(location.href);
  u.hash = '';
  if (id) u.searchParams.set('card', id);
  else u.searchParams.delete('card');
  return u.href;
}

// A shared card link is opened once the catalog is ready; the address is cleaned now so closing that card returns to the plain site.
let pendingCard = null;
export function takePendingCard() {
  const id = pendingCard;
  pendingCard = null;
  return id;
}

export function wireDialogs() {
  pendingCard = new URLSearchParams(location.search).get('card');
  if (pendingCard) history.replaceState(history.state, '', cardUrl(''));
  for (const d of document.querySelectorAll('dialog'))
    d.addEventListener('close', () => {
      if (history.state?.dialog === d.id) history.back();
    });
  window.addEventListener('popstate', () => {
    const d = [...document.querySelectorAll('dialog[open]')].pop();
    if (d) d.close();
  });
}
