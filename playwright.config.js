// @ts-check
import { defineConfig, devices } from '@playwright/test';

// Locally: everything runs in the installed Microsoft Edge (Chromium), with phone/tablet sizes emulated.
// In CI: iPhone and iPad projects run in real WebKit (Safari's engine), so iOS rendering is actually tested.
const CI = !!process.env.CI;
const edge = (d) => ({ ...d, browserName: 'chromium', channel: 'msedge', defaultBrowserType: undefined });
const ios = (name) => (CI ? devices[name] : edge(devices[name]));

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: CI ? devices['Desktop Chrome'] : { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'android', use: CI ? devices['Pixel 7'] : edge(devices['Pixel 7']) },
    { name: 'iphone-se', use: ios('iPhone SE') },               // 320px wide: the smallest common phone
    { name: 'iphone', use: ios('iPhone 13') },
    { name: 'ipad', use: ios('iPad (gen 7)') },                 // portrait
    { name: 'ipad-landscape', use: ios('iPad Pro 11 landscape') },
  ],
  webServer: { command: 'node serve.mjs 4173', url: 'http://localhost:4173', reuseExistingServer: !CI },
});
