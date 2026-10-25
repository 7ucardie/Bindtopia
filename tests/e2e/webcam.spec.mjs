import {test, expect, openHome} from './fixtures.mjs';
test.use({locale: 'en-US'});

test('desktop: Take photo opens the browser webcam and uses the captured frame', async ({page, context}, info) => {
  test.skip(info.project.name !== 'desktop', 'phones use the camera app via the capture input');
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
  expect(await page.evaluate(() => document.querySelector('#webcamVideo').srcObject)).toBeNull();
});

test('desktop: cancelling turns the camera off', async ({page, context}, info) => {
  test.skip(info.project.name !== 'desktop');
  await context.grantPermissions(['camera']);
  await openHome(page);
  await page.click('#openScan');
  await page.click('#cameraButton');
  await expect(page.locator('#webcam')).toBeVisible();
  await page.click('#webcamCancel');
  await expect(page.locator('#webcam')).toBeHidden();
  expect(await page.evaluate(() => document.querySelector('#webcamVideo').srcObject)).toBeNull();
  await expect(page.locator('#scanPreview')).toBeHidden();
});

test('desktop: a denied camera falls back to a message', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
  await openHome(page);
  await page.click('#openScan');
  await page.click('#cameraButton');
  await expect(page.locator('#toast')).toContainText('camera is unavailable');
  await expect(page.locator('#webcam')).toBeHidden();
});

test('phone: Take photo opens the camera app via the file input', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile');
  await openHome(page);
  await page.click('#openScan');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#cameraButton')]);
  expect(await chooser.element().getAttribute('capture')).toBe('environment');
});
