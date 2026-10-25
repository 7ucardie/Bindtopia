import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', {open: 'never'}]] : 'list',
  use: {baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure'},
  webServer: {command: 'node tests/serve.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, env: {PORT: '4173'}},
  projects: [
    {name: 'desktop', use: {...devices['Desktop Chrome']}},
    {name: 'mobile', use: {...devices['Pixel 7']}},
  ],
});
