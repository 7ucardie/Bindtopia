// Static card and set pages (built by scripts/build-pages.mjs) are entry points from search engines. Their card
// links stay real links for crawlers, but a visitor who clicks one goes into the app, where a card opens as a popover
// over the catalog instead of a chain of separate pages.
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-card]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  location.href = '/?card=' + encodeURIComponent(a.dataset.card) + '&ui=en';
});
