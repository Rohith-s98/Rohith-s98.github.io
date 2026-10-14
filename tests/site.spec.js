// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SECTIONS = ['home', 'thinking', 'cases', 'lab', 'notebook', 'contact'];

test.describe('intro', () => {
  test('types the mantra, then reveals the page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#introText')).toHaveText('trust the process.', { timeout: 5000 });
    await expect(page.locator('#intro')).toBeHidden({ timeout: 5000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('is skipped on the second visit in the same session', async ({ page }) => {
    await page.goto('/');
    await page.locator('#intro').click();
    await page.reload();
    await expect(page.locator('#intro')).toBeHidden();
  });
});

test.describe('page (intro skipped)', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/?nointro'); });

  test('has every section the dock links to', async ({ page }) => {
    for (const id of SECTIONS) {
      await expect(page.locator(`section#${id}`)).toHaveCount(1);
      await expect(page.locator(`.dock a[href="#${id}"]`)).toHaveCount(1);
    }
  });

  test('dock navigates and highlights the active section', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Home link is hidden on small screens; covered on desktop');
    await page.locator('.dock a[href="#lab"]').click();
    await expect(page).toHaveURL(/#lab$/);
    await expect(page.locator('#lab h2')).toBeInViewport();
    await expect(page.locator('.dock a[data-nav="lab"]')).toHaveClass(/is-active/);
  });

  test('test runner marks all five specs as passed', async ({ page }) => {
    await page.locator('#runBtn').click();
    await expect(page.locator('#runList li[data-state="pass"]')).toHaveCount(5, { timeout: 8000 });
    await expect(page.locator('#runSum')).toContainText('5 passed');
  });

  test('accent badge cycles the theme colour', async ({ page }) => {
    const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    const before = await accent();
    await page.locator('#brand').click();
    expect(await accent()).not.toBe(before);
  });

  test('projects load from data and filter', async ({ page }) => {
    const cards = page.locator('#projects .project');
    await expect(cards.first()).toBeVisible();
    const total = await cards.count();
    await page.locator('[data-filter="archive"]').click();
    const archived = await page.locator('#projects .project:not([hidden])').count();
    expect(archived).toBeGreaterThan(0);
    expect(archived).toBeLessThan(total);
  });

  test('notebook loads and filters', async ({ page }) => {
    await expect(page.locator('#notes .note').first()).toBeVisible();
    await page.locator('[data-note="note"]').click();
    await expect(page.locator('#notes')).toContainText(/note|Nothing/i);
  });

  test('case files open and close', async ({ page }) => {
    const second = page.locator('.case').nth(1);
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
  });

  test('no horizontal scrolling', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('external links open safely in a new tab', async ({ page }) => {
    const unsafe = await page.locator('a[target="_blank"]:not([rel*="noopener"])').count();
    expect(unsafe).toBe(0);
  });

  test('no serious accessibility violations', async ({ page }) => {
    // Reduced motion: scroll-reveal content is fully visible, so contrast is measured on the final state.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.locator('#projects .project').first().waitFor();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.reload();
    await page.locator('#projects .project').first().waitFor();
    expect(errors).toEqual([]);
  });
});
