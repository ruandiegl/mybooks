// Optional browser QA: uses an already available Playwright, never downloads it.
// Serve app/dist locally with unauthenticated /api responses; see web/README.md.
const { chromium } = require(process.env.PWA_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = process.env.PWA_QA_URL || 'http://127.0.0.1:4182';
const rootUrl = new URL('/', base).href;
(async () => {
  const browser = await chromium.launch({ channel: process.env.PWA_QA_BROWSER || 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [], requests = [];
    const capture = name => process.env.PWA_QA_SCREENSHOTS_DIR ? page.screenshot({ path: path.join(process.env.PWA_QA_SCREENSHOTS_DIR, name) }) : Promise.resolve();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
    await page.goto(new URL('/auth', base).href);
    await page.getByRole('heading', { name: 'Continue no celular ou tablet' }).waitFor();
    assert.equal(requests.length, 0, 'initial wide viewport must not start session API');
    assert.equal(await page.getByRole('link').getAttribute('href'), rootUrl);
    await capture('desktop-light.png');
    await page.getByRole('button', { name: 'Como instalar no celular' }).click();
    await page.getByRole('button', { name: 'iPhone/iPad', exact: true }).click();
    assert.ok(await page.getByText(/Adicionar à Tela de Início/).isVisible());
    await page.getByRole('button', { name: 'Voltar ao acesso no celular' }).click();
    for (const width of [320, 375, 414, 768, 1024, 1025, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      if (width <= 1024) await page.getByRole('button', { name: 'Criar minha conta' }).waitFor();
      else await page.getByRole('heading', { name: 'Continue no celular ou tablet' }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `horizontal overflow at ${width}px`);
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole('button', { name: 'Como instalar', exact: true }).click();
    await page.getByRole('dialog', { name: 'Instalar TrocaLivros' }).waitFor();
    assert.equal(await page.locator('.tl-install-sheet').evaluate(element => element.matches(':modal')), true);
    await page.getByRole('button', { name: 'iPhone/iPad', exact: true }).click();
    const closeBox = await page.getByRole('button', { name: 'Fechar guia de instalação' }).boundingBox();
    assert.ok(closeBox && closeBox.y >= 24, 'the close control must stay visible after changing guide content');
    await capture('mobile-install-light.png');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog', { name: 'Instalar TrocaLivros' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Como instalar', exact: true }).evaluate(element => element === document.activeElement), true);
    await page.getByRole('button', { name: 'Já tenho uma conta' }).click();
    const field = page.getByLabel('E-mail', { exact: true }); await field.fill('qa@example.test');
    const requestsBeforeResize = requests.length;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('heading', { name: 'Continue no celular ou tablet' }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.tl-viewport-gate').evaluate(element => element.matches(':modal')), true);
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await field.inputValue(), 'qa@example.test');
    assert.equal(await field.evaluate(element => element === document.activeElement), true, 'resize must restore focus to the previous form control');
    assert.equal(requests.length, requestsBeforeResize, 'resize must not reboot session');
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await capture('desktop-dark.png');
    if (process.env.PWA_QA_PORTAL_URL) {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(process.env.PWA_QA_PORTAL_URL);
      await page.getByRole('button', { name: 'Abrir configurações' }).click();
      const draft = page.getByLabel('Rascunho do perfil'); await draft.fill('Leituras em circulação');
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.getByRole('heading', { name: 'Continue no celular ou tablet' }).waitFor();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('.tl-viewport-gate')), true, 'RN focus trap must not escape the top-layer gate');
      assert.equal(await draft.evaluate(element => { element.focus(); return element === document.activeElement; }), false, 'background portal must be inert');
      await page.setViewportSize({ width: 375, height: 812 });
      assert.equal(await draft.inputValue(), 'Leituras em circulação');
      await page.getByRole('button', { name: 'Fechar configurações' }).click();
      await page.getByRole('button', { name: 'Abrir match' }).click();
      await page.getByRole('dialog', { name: 'Deu match!' }).waitFor();
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.getByRole('heading', { name: 'Continue no celular ou tablet' }).waitFor();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('.tl-viewport-gate')), true);
      await page.setViewportSize({ width: 375, height: 812 });
      assert.ok(await page.getByRole('dialog', { name: 'Deu match!' }).isVisible());
    }
    assert.deepEqual(errors, [], 'browser runtime errors');
    console.log('PWA browser smoke passed: 8 viewports, private boot boundary, guide/close visibility, focus, preserved draft, light/dark and reduced motion.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
