// Recognition on the device, shared by the photo scanner and trade mode: Tesseract text reading and picture fingerprints.
import { cardFingerprint, decode as decodePrints, nearest } from './fingerprint.mjs';
import { binarize, ocrSizes, guideToSource, distanceHint, wordsOf } from './ocr-prep.mjs';
import { state, getJSON } from './state.mjs';

// Subresource integrity for the pinned CDN copy; tests/integration/cdn.test.mjs checks it in CI.
const TESSERACT_SRI = 'sha384-r1ru3tcf6FhnCFR4B7pIFG+BhFF9LlFtz/P1y4pblWn3AGs9y3lBx5SKLNf4+rED';
const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';

let scriptPromise = null,
  worker = null,
  workerLanguage = '',
  ocrProgress = () => {};

// Progress of the current reading goes to whichever screen is reading (scanner or trade mode).
export function setOcrProgress(fn) {
  ocrProgress = fn;
}

async function loadOCR() {
  if (window.Tesseract) return;
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TESSERACT_URL;
    s.integrity = TESSERACT_SRI;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => reject(Error('Tekstherkenning kon niet worden geladen'));
    document.head.append(s);
  });
  try {
    await scriptPromise;
  } catch (e) {
    scriptPromise = null;
    throw e;
  }
}

// One shared worker; it is restarted when the card language needs another OCR model.
export async function getWorker() {
  await loadOCR();
  const ocrLanguage = state.cardLanguages.find(l => l.code === state.language)?.ocr || 'eng';
  if (worker && workerLanguage !== ocrLanguage) {
    await worker.terminate();
    worker = null;
  }
  if (!worker) {
    workerLanguage = ocrLanguage;
    worker = await Tesseract.createWorker(ocrLanguage, 1, {
      cacheMethod: 'none',
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: m => {
        if (m.status === 'recognizing text') ocrProgress(m.progress);
      },
    });
    await worker.setParameters({ tessedit_pageseg_mode: '11' });
  }
  return worker;
}

// After a failed reading the worker is discarded, so the next attempt starts clean.
export async function resetWorker() {
  if (!worker) return;
  try {
    await worker.terminate();
  } catch {}
  worker = null;
}

export async function readCanvas(canvas) {
  const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
  return { text: data.text || '', hint: distanceHint(wordsOf(data), canvas.height) };
}

export const distanceText = {
  closer: 'Kom wat dichterbij: laat de kaart het kader vullen.',
  further: 'Iets verder weg: de hele kaart moet in het kader passen.',
  none: 'Ik zie nog geen tekst: houd de kaart stil in het kader, met genoeg licht en zonder glans.',
  ok: 'Afstand is goed.',
};

// Text recognition and the saved photo keep a margin around the guide; the picture comparison uses the guide itself.
export const GUIDE_MARGIN = 0.06;
export const guideRect = (video, margin = GUIDE_MARGIN) =>
  guideToSource(video, video.getBoundingClientRect(), video.parentElement.querySelector('.card-guide').getBoundingClientRect(), margin);
export const fullRect = img => ({ x: 0, y: 0, width: img.width, height: img.height });

// 'bw': adaptive black-and-white, enlarged, finds small print such as the collector number; 'gray': plain greyscale as a second opinion.
export function ocrCanvas(src, r, [mode, target]) {
  const {
    work: [w, h],
    output: [ow, oh],
  } = ocrSizes(r.width, r.height, target);
  const a = document.createElement('canvas');
  a.width = w;
  a.height = h;
  const ctx = a.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, r.x, r.y, r.width, r.height, 0, 0, w, h);
  if (mode === 'bw') {
    const b = binarize(ctx.getImageData(0, 0, w, h));
    ctx.putImageData(new ImageData(b.data, w, h), 0, 0);
  }
  const c = document.createElement('canvas');
  [c.width, c.height] = [ow, oh];
  const cx = c.getContext('2d');
  cx.imageSmoothingQuality = 'high';
  if (mode !== 'bw') cx.filter = 'grayscale(1) contrast(1.3)';
  cx.drawImage(a, 0, 0, c.width, c.height);
  return c;
}

// Image fingerprints of the English catalog, loaded on first camera use; matching takes a few milliseconds.
let printsPromise = null;
const loadPrints = () =>
  (printsPromise ??= getJSON('./data/fingerprints-en.json')
    .then(f =>
      f?.version === 1 && Array.isArray(f.ids)
        ? { ids: f.ids, table: decodePrints(Uint8Array.from(atob(f.data), c => c.charCodeAt(0))) }
        : null,
    )
    .catch(() => null));

function printOf(src, r) {
  const h = 342,
    w = Math.max(1, Math.round((r.width * h) / r.height)),
    c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, r.x, r.y, r.width, r.height, 0, 0, w, h);
  return cardFingerprint(x.getImageData(0, 0, w, h));
}

export async function pictureHits(src, r) {
  const p = await loadPrints();
  return p ? nearest(printOf(src, r), p.table, p.ids, 20) : [];
}
