import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', {open: 'never'}]] : 'list',
  // The offline service worker is blocked by default so page.route() keeps seeing every request; offline.spec.mjs enables it.
  use: {baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', serviceWorkers: 'block'},
  webServer: {command: 'node tests/serve.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, env: {PORT: '4173'}},
  projects: [
    // Chromium's fake camera lets the webcam flow run headless.
    {name: 'desktop', use: {...devices['Desktop Chrome'], launchOptions: {args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']}}},
    {name: 'mobile', use: {...devices['Pixel 7'], launchOptions: {args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']}}},
  ],
});
