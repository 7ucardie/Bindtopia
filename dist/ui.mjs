// Small DOM helpers shared by every part of the page.
import { currentLocale } from './i18n.mjs';
import { escape } from './card-detail.mjs';

export const $ = selector => document.querySelector(selector);
export const fmt = n => Number(n).toLocaleString(currentLocale());

let toastTimer;
export function toast(text) {
  $('#toast').textContent = text;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('#toast').hidden = true), 3500);
}

// Card images are TCGdex base URLs without size; the original image stays a separate, unmodified <img>.
function imageUrl(card, high) {
  return card.image ? card.image + '/' + (high ? 'high' : 'low') + '.webp' : '';
}

export function pic(card, high = false) {
  return card.image
    ? '<img ' + (!high ? 'loading="lazy" ' : '') + 'src="' + escape(imageUrl(card, high)) + '" alt="' + escape(card.name) + '">'
    : '<div class="placeholder">◈<br>Afbeelding nog niet beschikbaar</div>';
}

// A missing image shows a placeholder instead of a broken-image icon.
export function protectImage(root) {
  root.querySelectorAll('img').forEach(img =>
    img.addEventListener(
      'error',
      () => {
        const p = document.createElement('div');
        p.className = 'placeholder';
        p.textContent = 'Afbeelding niet beschikbaar';
        img.replaceWith(p);
      },
      { once: true },
    ),
  );
}
