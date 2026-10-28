// The photo scanner: a chosen photo or an in-site camera shot is read on the device and matched against the catalog.
import { matchCards } from './matcher.mjs';
import { escape } from './card-detail.mjs';
import { confident, decide } from './trade.mjs';
import { readableText, OCR_PASSES } from './ocr-prep.mjs';
import { state } from './state.mjs';
import { $, toast, pic, protectImage } from './ui.mjs';
import { openDialog } from './dialogs.mjs';
import { show } from './detail.mjs';
import {
  getWorker,
  resetWorker,
  setOcrProgress,
  readCanvas,
  ocrCanvas,
  pictureHits,
  distanceText,
  guideRect,
  fullRect,
  GUIDE_MARGIN,
} from './ocr.mjs';

let photo = null,
  photoUrl = null,
  photoFromGuide = false,
  webcamStream = null;

// Suggestions only: the visitor checks image, set and number; this is never proof of a card.
function doMatch() {
  if (!state.ready) {
    $('#matchStatus').textContent = 'Wacht tot de catalogus is geladen.';
    return;
  }
  const text = $('#scanText').value.trim();
  if (!text) {
    $('#matchStatus').textContent = 'Kies een foto of vul een naam / kaartnummer in.';
    return;
  }
  const hits = matchCards(text, state.cards, state.sets, { setId: $('#setFilter').value, limit: 16 });
  $('#matches').replaceChildren();
  $('#matchStatus').textContent = hits.length
    ? 'Mogelijke overeenkomsten — controleer zelf de afbeelding, set en het nummer. Dit is geen definitieve identificatie.'
    : 'Geen overtuigende overeenkomst. Verbeter de naam of het nummer hierboven, probeer een scherpere foto of kies de juiste kaarttaal.';
  hits.forEach(({ card: c, reasons }) => {
    const b = document.createElement('button');
    b.className = 'match';
    b.innerHTML =
      pic(c) +
      '<strong>' +
      escape(c.name) +
      '</strong><small>' +
      escape(state.sets[c.setId]?.name || c.setId) +
      ' · #' +
      escape(c.localId) +
      '</small><small>' +
      escape(reasons.join(' · ')) +
      '</small>';
    b.onclick = () => show(c);
    protectImage(b);
    $('#matches').append(b);
  });
}

function setScanning(on) {
  state.busy = on;
  $('#scanProgress').hidden = !on;
  for (const id of ['#recognizeAgain', '#cameraButton', '#uploadButton']) $(id).disabled = on;
}

// A photo from the in-site camera is exactly the card guide: try the picture first, it is fast and often decisive.
async function recognizeByPicture(bitmap) {
  const m = GUIDE_MARGIN / (1 + 2 * GUIDE_MARGIN),
    inner = { x: bitmap.width * m, y: bitmap.height * m, width: bitmap.width * (1 - 2 * m), height: bitmap.height * (1 - 2 * m) };
  const found = decide([], await pictureHits(bitmap, inner).catch(() => []));
  return found && state.cards.find(x => x.id === found.id);
}

async function recognize() {
  if (!photo || state.busy) return;
  setScanning(true);
  $('#scanProgress').value = 0;
  $('#scanStatus').textContent = 'Tekstherkenning laden. De eerste keer kan dit wat langer duren…';
  try {
    setOcrProgress(p => {
      $('#scanProgress').value = p;
      $('#scanStatus').textContent = 'Tekst herkennen… ' + Math.round(p * 100) + '%';
    });
    await getWorker();
    const bitmap = await createImageBitmap(photo);
    const byPicture = photoFromGuide && (await recognizeByPicture(bitmap));
    if (byPicture) {
      bitmap.close();
      const total = state.sets[byPicture.setId]?.cardCount?.official;
      $('#scanText').value = byPicture.name + ' ' + byPicture.localId + (total ? '/' + total : '');
      $('#scanProgress').value = 1;
      $('#scanStatus').textContent = 'Herkend aan de afbeelding. Controleer de naam en het kaartnummer hieronder.';
      doMatch();
      return;
    }
    let pass = 0,
      text = '',
      sure = false,
      first = null;
    const n = OCR_PASSES.length;
    setOcrProgress(p => {
      $('#scanProgress').value = (pass + p) / n;
      $('#scanStatus').textContent = 'Tekst herkennen… ' + Math.round(((pass + p) / n) * 100) + '%';
    });
    // Several readings at different sizes; their texts are combined, so one good reading of the number is enough.
    for (; pass < n && !sure; pass++) {
      const r = await readCanvas(ocrCanvas(bitmap, fullRect(bitmap), OCR_PASSES[pass]));
      first ??= r;
      text += '\n' + r.text;
      sure = !!confident(matchCards(text, state.cards, state.sets, { limit: 4 }));
    }
    bitmap.close();
    const hint = sure || first.hint === 'ok' ? '' : first.hint;
    $('#scanText').value = readableText(text) || text.trim();
    $('#scanProgress').value = 1;
    $('#scanStatus').textContent =
      'Tekst gelezen. Controleer de naam en het kaartnummer hieronder.' + (hint ? ' Tip: ' + distanceText[hint] : '');
    doMatch();
  } catch {
    $('#scanStatus').textContent =
      'Automatisch lezen is niet gelukt. Probeer een JPG/PNG-foto, een scherpere opname of voer de naam en het nummer handmatig in.';
    await resetWorker();
  } finally {
    setScanning(false);
  }
}

async function choosePhoto(file, fromGuide = false) {
  if (!file || state.busy) return;
  photoFromGuide = fromGuide;
  if (file.size > 30 * 1024 * 1024) {
    toast('Gebruik een foto kleiner dan 30 MB.');
    return;
  }
  photo = file;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file);
  $('#scanPreview').src = photoUrl;
  $('#scanPreview').hidden = false;
  $('#photoPlaceholder').hidden = true;
  $('#recognizeAgain').hidden = false;
  $('#matches').replaceChildren();
  $('#matchStatus').textContent = '';
  await recognize();
}

// Removes the photo and its text from page memory; the original on the device is untouched.
function clearScan() {
  if (state.busy) {
    toast('Wacht tot de tekstherkenning klaar is en wis dan de scan.');
    return false;
  }
  photo = null;
  if (photoUrl) {
    URL.revokeObjectURL(photoUrl);
    photoUrl = null;
  }
  $('#scanPreview').removeAttribute('src');
  $('#scanPreview').hidden = true;
  $('#photoPlaceholder').hidden = false;
  $('#scanText').value = '';
  $('#matches').replaceChildren();
  $('#matchStatus').textContent = '';
  $('#scanStatus').textContent = 'De scan is gewist. Kies een nieuwe foto om te beginnen.';
  $('#recognizeAgain').hidden = true;
  return true;
}

// The in-site camera shows the card guide and keeps only the area inside it as the photo.
async function openWebcam() {
  if (state.busy) return;
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch {
    toast('De camera is niet beschikbaar of er is geen toestemming gegeven. Kies een foto.');
    return;
  }
  $('#webcamVideo').srcObject = webcamStream;
  openDialog($('#webcam'));
}

function closeWebcam() {
  webcamStream?.getTracks().forEach(t => t.stop());
  webcamStream = null;
  $('#webcamVideo').srcObject = null;
  if ($('#webcam').open) $('#webcam').close();
}

function capture() {
  const v = $('#webcamVideo');
  if (!v.videoWidth) return;
  const r = guideRect(v),
    c = document.createElement('canvas');
  c.width = r.width;
  c.height = r.height;
  c.getContext('2d').drawImage(v, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
  c.toBlob(
    b => {
      closeWebcam();
      if (b) choosePhoto(new File([b], 'camera.jpg', { type: 'image/jpeg' }), true);
    },
    'image/jpeg',
    0.92,
  );
}

export function wireScanner() {
  $('#openScan').onclick = () => {
    $('#scanPanel').hidden = false;
    $('#scanPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('#closeScan').onclick = () => {
    if (clearScan()) $('#scanPanel').hidden = true;
  };
  $('#clearScan').onclick = clearScan;
  // Browsers without camera access in the page fall back to the camera app via the capture input.
  $('#cameraButton').onclick = () => (navigator.mediaDevices?.getUserMedia ? openWebcam() : $('#cameraInput').click());
  $('#uploadButton').onclick = () => $('#uploadInput').click();
  for (const id of ['#cameraInput', '#uploadInput'])
    $(id).onchange = e => {
      choosePhoto(e.target.files[0]);
      e.target.value = '';
    };
  $('#recognizeAgain').onclick = recognize;
  $('#matchButton').onclick = doMatch;
  $('#webcam').addEventListener('close', closeWebcam);
  $('#webcamCancel').onclick = closeWebcam;
  $('#webcamClose').onclick = closeWebcam;
  $('#webcamCapture').onclick = capture;
}
