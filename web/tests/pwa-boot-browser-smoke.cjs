// Isolated local QA only; never uses a real account or production origin.
const { chromium } = require(process.env.PWA_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = process.env.PWA_QA_URL || 'http://127.0.0.1:4182';
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Boot QA must stay on loopback');
const capture = (page, name) => process.env.PWA_QA_SCREENSHOTS_DIR ? page.screenshot({ path: path.join(process.env.PWA_QA_SCREENSHOTS_DIR, name) }) : Promise.resolve();
(async () => {
  const browser = await chromium.launch({ channel: process.env.PWA_QA_BROWSER || 'chrome', headless: true });
  const errors = [];
  async function context(width = 375, colorScheme = 'light') {
    const ctx = await browser.newContext({ viewport: { width, height: 812 }, colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const page = await ctx.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    return { ctx, page };
  }
  try {
    for (const color of ['light', 'dark']) {
      const { ctx, page } = await context(375, color);
      let unblock; const pending = new Promise(resolve => { unblock = resolve; });
      await page.route('**/_expo/static/js/web/**', async route => { await pending; await route.continue().catch(() => {}); });
      await page.goto(base + '/auth?source=boot-qa#example', { waitUntil: 'commit' });
      await page.locator('#tl-boot').waitFor({ state: 'visible' });
      await page.waitForFunction(() => { const i = document.querySelector('#tl-boot img'); return i.complete && i.naturalWidth > 0; });
      assert.equal(await page.locator('#tl-boot').evaluate(el => getComputedStyle(el).backgroundColor), color === 'dark' ? 'rgb(24, 19, 24)' : 'rgb(255, 248, 247)');
      await capture(page, `boot-${color}.png`);
      if (color === 'light') {
        const reload = page.getByRole('button', { name: 'Recarregar aplicativo' });
        await reload.waitFor({ timeout: 17000 });
        await capture(page, 'boot-bundle-timeout.png');
        // A real click must reload the same deep link, not clear session/storage or go home.
        await Promise.all([page.waitForNavigation({ waitUntil: 'commit' }), reload.click()]);
        assert.ok(page.url().endsWith('/auth?source=boot-qa#example'));
      }
      unblock();
      await page.getByRole('button', { name: 'Criar minha conta', exact: true }).waitFor();
      await page.locator('#tl-boot').waitFor({ state: 'detached' });
      assert.equal(await page.locator('#root').getAttribute('inert'), null);
      assert.equal(await page.getByRole('status').count(), 0);
      await ctx.close();
    }
    const { ctx, page } = await context(1440); let privateRequests = 0;
    page.on('request', req => { if (new URL(req.url()).pathname.startsWith('/api/')) privateRequests++; });
    await page.goto(base + '/auth');
    await page.getByRole('heading', { name: 'Continue no celular ou tablet' }).waitFor();
    await page.locator('#tl-boot').waitFor({ state: 'detached' });
    assert.equal(privateRequests, 0, 'wide initial boot must not mount the private runtime');
    for (const width of [320, 375, 414, 768, 1024, 1025, 1440]) {
      await page.setViewportSize({ width, height: 812 });
      await (width <= 1024 ? page.getByRole('button', { name: 'Criar minha conta', exact: true }) : page.getByRole('heading', { name: 'Continue no celular ou tablet' })).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${width}`);
      assert.equal(await page.locator('#tl-boot').count(), 0);
    }
    await page.setViewportSize({ width: 812, height: 375 });
    await page.getByRole('button', { name: 'Criar minha conta', exact: true }).waitFor();
    await ctx.close();

    const failed = await context();
    await failed.page.route('**/*.ttf', route => route.abort());
    await failed.page.route('**/brand/*.svg', route => route.abort());
    await failed.page.goto(base + '/auth');
    await failed.page.getByRole('heading', { name: /Não foi possível carregar|demorou para iniciar/ }).waitFor({ timeout: 12000 });
    await failed.page.locator('#tl-boot').waitFor({ state: 'detached' });
    await failed.page.getByRole('button', { name: 'Recarregar aplicativo' }).waitFor();
    await failed.page.evaluate(() => { document.querySelectorAll('[role="heading"],[role="status"]').forEach(el => { el.style.fontSize = '32px'; el.style.lineHeight = '1.5'; }); });
    assert.equal(await failed.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await capture(failed.page, 'boot-resource-error.png'); await failed.ctx.close();

    const slow = await context(); let finishFont; const pendingFont = new Promise(resolve => { finishFont = resolve; });
    await slow.page.route('**/*.ttf', async route => { await pendingFont; await route.continue().catch(() => {}); });
    await slow.page.goto(base + '/auth', { waitUntil: 'domcontentloaded' });
    await slow.page.getByRole('heading', { name: 'O aplicativo demorou para iniciar.' }).waitFor({ timeout: 10000 });
    const recovery = slow.page.getByRole('button', { name: 'Recarregar aplicativo' }); await recovery.focus();
    assert.notEqual(await recovery.evaluate(el => getComputedStyle(el).borderTopColor), 'rgba(0, 0, 0, 0)');
    finishFont(); await slow.page.getByRole('button', { name: 'Criar minha conta', exact: true }).waitFor();
    assert.equal(await slow.page.getByRole('heading', { name: 'O aplicativo demorou para iniciar.' }).count(), 0);
    await slow.ctx.close();

    const stored = await context(375, 'dark');
    await stored.page.addInitScript(() => localStorage.setItem('trocalivros.appearance.v1', JSON.stringify({ version: 1, theme: 'light' })));
    await stored.page.goto(base + '/auth'); await stored.page.getByRole('button', { name: 'Criar minha conta', exact: true }).waitFor();
    assert.equal(await stored.page.evaluate(() => document.documentElement.style.colorScheme), 'light');
    await stored.ctx.close();
    const measure = await context();
    const started = Date.now(); await measure.page.goto(base + '/auth'); await measure.page.getByRole('button', { name: 'Criar minha conta', exact: true }).waitFor();
    const cold = Date.now() - started, again = Date.now(); await measure.page.reload(); await measure.page.getByRole('button', { name: 'Criar minha conta', exact: true }).waitFor();
    console.log(JSON.stringify({ localColdMs: cold, localReloadMs: Date.now() - again, note: 'Single local samples; not production percentiles or a pre-feature comparison.' }));
    await measure.ctx.close();
    const masks = await context(768);
    await masks.page.goto(base + '/auth');
    await masks.page.setContent('<main style="display:flex;gap:24px;padding:24px;background:#fff8f7"><img style="border-radius:50%" width="144" height="144" src="' + base + '/icons/icon-maskable-512.png"><img style="border-radius:24px" width="144" height="144" src="' + base + '/icons/icon-maskable-512.png"><img style="border-radius:50% 50% 50% 0" width="144" height="144" src="' + base + '/icons/icon-maskable-512.png"><img width="144" height="144" src="' + base + '/icons/icon-maskable-512.png"></main>');
    await masks.page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
    await capture(masks.page, 'icon-masks.png'); await masks.ctx.close();
    assert.deepEqual(errors, []);
    console.log('Boot browser QA passed: delayed bundle/reload, dark/light, failed fonts/logo, widths, landscape, stored theme and warm reload.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
