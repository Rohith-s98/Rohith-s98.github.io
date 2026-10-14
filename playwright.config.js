// @ts-check
import { defineConfig, devices } from '@playwright/test';

// Locally we use the installed Microsoft Edge (no browser download); CI uses Playwright's Chromium.
const desktop = process.env.CI ? devices['Desktop Chrome'] : { ...devices['Desktop Edge'], channel: 'msedge' };
const mobile = process.env.CI ? devices['Pixel 7'] : { ...devices['Pixel 7'], channel: 'msedge' };

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: desktop },
    { name: 'mobile', use: mobile },
  ],
  webServer: { command: 'node serve.mjs 4173', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
});
