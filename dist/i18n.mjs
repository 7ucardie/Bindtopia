export const locales = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  pl: 'Polski',
};
export function chooseLocale(preferences) {
  for (const preference of preferences) {
    const code = String(preference || '')
      .toLowerCase()
      .split('-')[0];
    if (code in locales) return code;
  }
  return 'en';
}
export function createTranslator(dictionary) {
  const keys = Object.keys(dictionary)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('(?<![\\p{L}\\p{N}])(?:' + keys.map(escape).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
  return source => String(source).replace(pattern, key => dictionary[key] ?? key);
}
let locale = 'en',
  translate = s => s,
  sequence = 0,
  observer;
const records = new WeakMap(),
  attributeRecords = new WeakMap();
export const currentLocale = () => locale;
function originalText(node) {
  const previous = records.get(node);
  return previous && node.data === previous.last ? previous.source : node.data;
}
function apply() {
  const root = document.body;
  if (!root) return;
  observer?.disconnect();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (
      node.parentElement?.closest(
        'script,style,[data-no-translate],.info h3,.match strong,.set strong,td,.attack,.detail-content>p:not(.notice),.detail-content h1',
      )
    )
      continue;
    const source = originalText(node),
      last = translate(source);
    records.set(node, { source, last });
    if (node.data !== last) node.data = last;
  }
  for (const el of root.querySelectorAll('[placeholder],[aria-label],[data-label]')) {
    let record = attributeRecords.get(el) || {};
    for (const attr of ['placeholder', 'aria-label', 'data-label']) {
      if (!el.hasAttribute(attr)) continue;
      const value = el.getAttribute(attr),
        previous = record[attr];
      const source = previous && previous.last === value ? previous.source : value;
      const last = translate(source);
      record[attr] = { source, last };
      if (value !== last) el.setAttribute(attr, last);
    }
    attributeRecords.set(el, record);
  }
  document.documentElement.lang = locale;
  document.title = translate('Bindtopia — zoek, scan en verzamel');
  const selector = document.querySelector('#interfaceLanguage');
  if (selector) selector.value = locale;
  for (const link of root.querySelectorAll('a[href]')) {
    const original = link.dataset.legalTarget;
    if (original) {
      const anchor = { 'privacy.html': 'privacy', 'cookies.html': 'cookies', 'voorwaarden.html': 'terms', 'rechten.html': 'rights' }[
        original
      ];
      link.href = locale === 'nl' ? original : 'legal-en.html#' + anchor;
    }
  }
  observer?.observe(root, { childList: true, subtree: true, characterData: true });
}
export async function setLocale(code, { updateURL = true } = {}) {
  const ticket = ++sequence;
  const selected = code in locales ? code : 'en';
  try {
    const response = await fetch('./locales/' + selected + '.json', { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw Error();
    const dictionary = await response.json();
    if (ticket !== sequence) return;
    locale = selected;
    translate = createTranslator(dictionary);
    apply();
    if (updateURL) {
      const url = new URL(location.href);
      url.searchParams.set('ui', selected);
      history.replaceState({}, '', url);
    }
    document.dispatchEvent(new CustomEvent('interface-language-change', { detail: { locale } }));
  } catch {
    if (selected !== 'en') return setLocale('en', { updateURL });
    document.querySelector('#interfaceLanguage').value = 'en';
  }
}
export async function startI18n() {
  const selector = document.querySelector('#interfaceLanguage');
  for (const [code, name] of Object.entries(locales)) selector.add(new Option(name, code));
  for (const link of document.querySelectorAll('.legal-nav a')) {
    const href = link.getAttribute('href');
    if (['privacy.html', 'cookies.html', 'voorwaarden.html', 'rechten.html'].includes(href)) link.dataset.legalTarget = href;
  }
  let pending = false;
  observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      apply();
    });
  });
  selector.onchange = () => {
    try {
      localStorage.setItem('bindtopia-interface-language', selector.value);
    } catch {}
    setLocale(selector.value);
  };
  let saved = null;
  try {
    saved = localStorage.getItem('bindtopia-interface-language');
  } catch {}
  // English is the default; only an explicit ?ui= link or the visitor's own earlier choice changes it.
  await setLocale(chooseLocale([new URLSearchParams(location.search).get('ui'), saved]), { updateURL: false });
}
export const localize = source => translate(source);
