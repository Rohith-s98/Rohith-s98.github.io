// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SECTIONS = ['home', 'thinking', 'cases', 'lab', 'notebook', 'contact'];

// Like a real user: any mouse move wakes the dock, then hovering it keeps it open (it auto-hides after 3s idle).
async function hoverDock(page, nav) {
  await page.mouse.move(300, 300);
  const link = page.locator(nav === 'brand' ? '#brand' : `#dock a[data-nav="${nav}"]`);
  await expect(page.locator('#dock')).not.toHaveClass(/is-hidden/);
  const box = await link.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  return link;
}

test.describe('intro', () => {
  test('writes the mantra in script, then reveals the page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#introText')).toHaveText('Trust the process.');
    await expect(page.locator('#intro')).toHaveClass(/is-writing/, { timeout: 3000 });
    const font = await page.locator('#introText').evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font).toContain('Great Vibes');
    await expect(page.locator('#intro')).toBeHidden({ timeout: 6000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('is skipped on the second visit in the same session', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Escape'); // any key skips the intro
    await expect(page.locator('#intro')).toBeHidden({ timeout: 3000 });
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
    await (await hoverDock(page, 'lab')).click();
    await expect(page).toHaveURL(/#lab$/);
    await expect(page.locator('#lab h2')).toBeInViewport();
    await expect(page.locator('.dock a[data-nav="lab"]')).toHaveClass(/is-active/);
  });

  test('dock slides away after 3s idle and returns on mouse move', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Pointer behaviour; covered on desktop');
    const dock = page.locator('#dock');
    await page.mouse.move(300, 300);
    // No further input: it should slide away on its own (3s idle; generous timeout for slow CI).
    await expect(dock).toHaveClass(/is-hidden/, { timeout: 8000 });
    // One mouse move brings it back. Checked in-page right after the move, so a slow runner can't race the 3s idle timer.
    await page.mouse.move(320, 320);
    expect(await dock.evaluate((el) => el.classList.contains('is-hidden'))).toBe(false);
  });

  test('on touch screens the dock does not idle-hide', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch behaviour');
    await page.waitForTimeout(3600);
    await expect(page.locator('#dock')).not.toHaveClass(/is-hidden/);
  });

  test('dock stays while hovered', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Pointer behaviour; covered on desktop');
    await hoverDock(page, 'cases');
    await page.waitForTimeout(3600);
    await expect(page.locator('#dock')).not.toHaveClass(/is-hidden/);
  });

  test('contact offers LinkedIn and GitHub, no email or phone', async ({ page }) => {
    const contact = page.locator('#contact');
    await expect(contact.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', /linkedin\.com\/in\//);
    await expect(contact.getByRole('link', { name: /GitHub/ })).toBeVisible();
    const html = await page.content();
    expect(html).not.toMatch(/mailto:|@gmail\.com|\+91/);
  });

  test('test runner marks all five specs as passed', async ({ page }) => {
    await page.locator('#runBtn').click();
    await expect(page.locator('#runList li[data-state="pass"]')).toHaveCount(5, { timeout: 8000 });
    await expect(page.locator('#runSum')).toContainText('5 passed');
  });

  test('accent badge cycles the theme colour', async ({ page }) => {
    const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    const before = await accent();
    await (await hoverDock(page, 'brand')).click();
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

  test('every element fits the screen width', async ({ page }) => {
    const wide = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      return [...document.querySelectorAll('main *, .dock, .footer *')]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1); })
        .filter((el) => !el.closest('.runner__bar code')) // ellipsised on purpose
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60));
    });
    expect(wide).toEqual([]);
  });

  test('dock shows every link without clipping', async ({ page }) => {
    const dock = page.locator('#dock');
    const clipped = await dock.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(clipped).toBe(false);
    for (const a of await dock.locator('a:visible').all()) await expect(a).toBeInViewport();
  });

  test('text stays readable (no font under 12px)', async ({ page }) => {
    const tiny = await page.evaluate(() => [...document.querySelectorAll('main p, main li, main a, main h3, main span, .dock a')]
      .filter((el) => el.offsetParent && el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 11.5)
      .map((el) => el.textContent.trim().slice(0, 30)));
    expect(tiny).toEqual([]);
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
