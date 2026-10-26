import {test, expect, openHome} from './fixtures.mjs';
test.use({locale: 'en-US'});

test('Take photo opens the in-site camera and uses the captured frame', async ({page, context}) => {
  await context.grantPermissions(['camera']);
  await openHome(page);
  await page.click('#openScan');
  await page.click('#cameraButton');
  const dialog = page.locator('#webcam');
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.locator('#webcamVideo').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
  await page.click('#webcamCapture');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#scanPreview')).toBeVisible();
  await expect(page.locator('#scanPreview')).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => page.evaluate(() => document.querySelector('#webcamVideo').srcObject)).toBeNull();
});

test('cancelling turns the camera off', async ({page, context}) => {
  await context.grantPermissions(['camera']);
  await openHome(page);
  await page.click('#openScan');
  await page.click('#cameraButton');
  await expect(page.locator('#webcam')).toBeVisible();
  await page.click('#webcamCancel');
  await expect(page.locator('#webcam')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.querySelector('#webcamVideo').srcObject)).toBeNull();
  await expect(page.locator('#scanPreview')).toBeHidden();
});

test('the camera view has a close button in its header', async ({page, context}) => {
  await context.grantPermissions(['camera']);
  await openHome(page);
  await page.click('#openScan');
  await page.click('#cameraButton');
  await expect(page.locator('#webcamClose')).toBeVisible();
  await page.click('#webcamClose');
  await expect(page.locator('#webcam')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.querySelector('#webcamVideo').srcObject)).toBeNull();
});

test('a denied camera falls back to a message', async ({page}) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
  await openHome(page);
  await page.click('#openScan');
  await page.click('#cameraButton');
  await expect(page.locator('#toast')).toContainText('camera is unavailable');
  await expect(page.locator('#webcam')).toBeHidden();
});

test('Take photo shows the card guide with the name and number zones', async ({page, context}) => {
  await context.grantPermissions(['camera']);
  await openHome(page);
  await page.click('#openScan');
  await page.click('#cameraButton');
  const guide = page.locator('#webcam .card-guide');
  await expect(guide).toBeVisible();
  await expect(guide.locator('.zone-name')).toHaveAttribute('data-label', 'Name');
  await expect(guide.locator('.zone-number').first()).toHaveAttribute('data-label', 'Number');
  const box = await guide.boundingBox();
  expect(Math.abs(box.width / box.height - 63 / 88)).toBeLessThan(0.02);
  await expect.poll(() => page.locator('#webcamVideo').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
  await page.click('#webcamCapture');
  // Only the guide area is kept as the photo: card-shaped, portrait.
  const ratio = await page.locator('#scanPreview').evaluate(img => new Promise(r => img.complete && img.naturalWidth ? r(img.naturalWidth / img.naturalHeight) : img.onload = () => r(img.naturalWidth / img.naturalHeight)));
  expect(ratio).toBeLessThan(1);
});

test('without camera access in the browser, Take photo falls back to the camera app', async ({page}) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', {value: undefined}); });
  await openHome(page);
  await page.click('#openScan');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#cameraButton')]);
  expect(await chooser.element().getAttribute('capture')).toBe('environment');
});
