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

// A missing image shows a placeholder instead of a broken-image icon. TCGdex sometimes publishes a new card
// only as PNG at first, so a card image that fails as WebP is tried once as PNG before giving up.
export function protectImage(root) {
  root.querySelectorAll('img').forEach(img => {
    const fail = () => {
      const src = img.getAttribute('src') || '';
      if (/^https:\/\/assets\.tcgdex\.net\/.+\/(low|high)\.webp$/.test(src)) {
        img.src = src.replace(/\.webp$/, '.png');
        return;
      }
      img.removeEventListener('error', fail);
      const p = document.createElement('div');
      p.className = 'placeholder';
      p.textContent = 'Afbeelding niet beschikbaar';
      img.replaceWith(p);
    };
    img.addEventListener('error', fail);
  });
}
