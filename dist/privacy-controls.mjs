document.querySelector('#eraseData')?.addEventListener('click', () => {
  const en = document.documentElement.lang === 'en';
  if (
    !confirm(
      en
        ? 'Clear your saved cards from this browser? Export a backup first if you want to keep them.'
        : 'Je bewaarde kaarten uit deze browser wissen? Exporteer eerst een back-up als je die wilt behouden.',
    )
  )
    return;
  const status = document.querySelector('#eraseStatus');
  try {
    localStorage.removeItem('kaartkompas-saved-v2');
    localStorage.removeItem('kaartkompas-saved');
    status.textContent = en
      ? 'Your local card collection has been cleared. Close other open Bindtopia tabs so an older tab does not save it again. Separate backups and photos are not affected.'
      : 'De lokale kaartverzameling is gewist. Sluit andere open Bindtopia-tabbladen om te voorkomen dat een oudere tab de verzameling opnieuw opslaat. Losse back-ups en foto’s blijven bestaan.';
  } catch {
    status.textContent = en
      ? 'Clearing failed. Remove the site data in your browser settings.'
      : 'Wissen lukte niet. Verwijder de sitegegevens via de instellingen van je browser.';
  }
});
document.querySelector('#eraseOffline')?.addEventListener('click', async () => {
  const en = document.documentElement.lang === 'en',
    status = document.querySelector('#eraseStatus');
  try {
    localStorage.removeItem('bindtopia-trade');
    if ('caches' in window) for (const key of await caches.keys()) if (key.startsWith('bindtopia-')) await caches.delete(key);
    for (const registration of (await navigator.serviceWorker?.getRegistrations?.()) || []) await registration.unregister();
    status.textContent = en
      ? 'The offline copy and your trade list have been cleared from this device. Your saved cards are not affected. A new offline copy is made on your next visit.'
      : 'De offline kopie en je ruillijst zijn van dit toestel gewist. Je bewaarde kaarten blijven staan. Bij je volgende bezoek wordt een nieuwe offline kopie gemaakt.';
  } catch {
    status.textContent = en
      ? 'Clearing failed. Remove the site data in your browser settings.'
      : 'Wissen lukte niet. Verwijder de sitegegevens via de instellingen van je browser.';
  }
});
