/**
 * Browser regression for the review build.
 * Run: NODE_PATH=/tmp/node_modules node tests/ui-regression.mjs
 * Requires Google Chrome and puppeteer-core. Firefox is not required to pass.
 */
const puppeteerMod = await import(process.env.PUPPETEER_CORE || 'puppeteer-core').catch(async () => {
  return import('/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js');
});
const puppeteer = puppeteerMod.default || puppeteerMod;
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'));
const chrome = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const fail = [];
const check = (name, ok, extra) => {
  if (!ok) fail.push(name + (extra ? ' ' + extra : ''));
  else process.stdout.write('ok  ' + name + '\n');
};

const server = createServer((req, res) => {
  const path = req.url.split('?')[0];
  if (path === '/' || path === '/index.html' || path === '/travel-medicine/' || path === '/travel-medicine/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  res.writeHead(404);
  res.end('no');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  protocolTimeout: 20000,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

async function open(url) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.datamaps-subunit', { timeout: 10000 });
  return { page, errors };
}

const widths = [360, 390, 768, 1280];
for (const w of widths) {
  const { page, errors } = await open(base + '/');
  await page.setViewport({ width: w, height: w < 500 ? 740 : 900 });
  await page.waitForSelector('#disclaimerHeading');
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  check('no horizontal overflow ' + w, overflow <= 2, String(overflow));
  check('no page error ' + w, errors.length === 0, errors.join(';'));
  await page.close();
}

{
  const { page, errors } = await open(base + '/index.html');
  const title = await page.title();
  check('index.html loads', title.includes('Travel Medicine'), title);
  check('index.html no error', errors.length === 0, errors.join(';'));
  await page.close();
}

{
  const { page, errors } = await open(base + '/?dest=sau&group=Pregnant&layer=MALARIA&lang=AR&foo=1&dest2=<script>');
  const state = await page.evaluate(() => ({
    h2: document.querySelector('#tab-country h2')?.textContent || '',
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    group: document.querySelector('.tf-btn.active')?.dataset.tf,
    layer: document.getElementById('layerSelect').value,
    discEn: document.querySelector('#safetyBanner p[lang="en"]').innerText.includes('educational reference'),
    discAr: document.querySelector('#safetyBanner p[lang="ar"]').innerText.includes('مرجع تعليمي')
  }));
  check('shared URL country', state.h2 === 'Saudi Arabia', state.h2);
  check('shared URL lang case', state.lang === 'ar' && state.dir === 'rtl', state.lang);
  check('shared URL group case', state.group === 'pregnant', state.group);
  check('shared URL layer case', state.layer === 'malaria', state.layer);
  check('disclaimer both languages', state.discEn && state.discAr);
  check('malformed extra params no error', errors.length === 0, errors.join(';'));
  const unknown = await page.evaluate(() => {
    history.pushState(null, '', '?dest=ZZZ&group=nope&layer=nope&lang=zz');
    const before = document.querySelector('#tab-country h2')?.textContent;
    readUrl();
    return { before, selected: selected && selected.iso, group: travelerType, layer: activeLayer, lang };
  });
  check('unknown dest ignored', unknown.selected === 'SAU', JSON.stringify(unknown));
  await page.evaluate(() => { lang = 'en'; travelerType = 'standard'; activeLayer = 'overall'; applyLang(); });
  await page.close();
}

{
  const { page, errors } = await open(base + '/');
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluate(() => selectCountry('NGA'));
  const nga = await page.$eval('#tab-country h2', el => el.textContent);
  check('map function selects Nigeria', nga === 'Nigeria');
  await page.focus('#searchInput');
  await page.type('#searchInput', 'COTE');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const cote = await page.$eval('#tab-country h2', el => el.textContent);
  check('accent search keyboard', cote === "Côte d'Ivoire", cote);
  await page.evaluate(() => { si.value = 'السعودية'; runSearch(); });
  const arSearch = await page.evaluate(() => document.getElementById('searchResults').innerText);
  check('arabic query does not throw', /No matching destination|لا توجد وجهة/.test(arSearch), arSearch.slice(0, 80));
  for (const layer of ['overall', 'malaria', 'yf', 'arbo', 'vaccine']) {
    await page.select('#layerSelect', layer);
    const legend = await page.$eval('#mapLegend', el => el.innerText.length);
    check('layer ' + layer + ' legend', legend > 10, String(legend));
  }
  for (const g of ['standard', 'pregnant', 'child', 'immuno']) {
    await page.click('[data-tf="' + g + '"]');
    const on = await page.$eval('.tf-btn.active', el => el.dataset.tf);
    check('filter ' + g, on === g);
  }
  await page.click('[data-tf="pregnant"]');
  const flags = await page.evaluate(() => document.querySelector('#tab-country').innerText);
  check('pregnancy precaution visible', /precaution/i.test(flags) && /not a routine pregnancy choice/i.test(flags));
  await page.click('#resetBtn');
  const cleared = await page.evaluate(() => ({ h2: document.querySelector('#tab-country h2'), group: document.querySelector('.tf-btn.active').dataset.tf, layer: document.getElementById('layerSelect').value }));
  check('reset clears destination and filters', !cleared.h2 && cleared.group === 'standard' && cleared.layer === 'overall', JSON.stringify(cleared));
  await page.evaluate(() => selectCountry('KEN'));
  await page.click('button[onclick="clearDestination()"]');
  const closed = await page.$('#tab-country h2');
  check('close clears destination', !closed);
  await page.evaluate(() => selectCountry('LKA'));
  await page.focus('#tabbtn-vaccines');
  await page.keyboard.press('ArrowRight');
  const tab = await page.evaluate(() => document.querySelector('.tab.active').dataset.tab);
  check('tab arrow key', tab === 'malaria' || tab === 'vaccines', tab);
  const links = await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')].filter(a => !/noopener/i.test(a.rel)).map(a => a.href));
  check('blank links have noopener', links.length === 0, links.join(','));
  const blocked = await page.evaluate(() => {
    const orig = window.open;
    window.open = () => null;
    const res = exportSummary();
    window.open = orig;
    return res;
  });
  check('popup blocked returns false', blocked === false);
  await page.evaluate(() => selectCountry('BLZ'));
  const popupPromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('no popup')), 6000);
    browser.on('targetcreated', async target => {
      if (target.type() !== 'page') return;
      clearTimeout(t);
      resolve(await target.page());
    });
  });
  await page.evaluate(() => exportSummary());
  const pop = await popupPromise;
  const sheet = await pop.evaluate(() => document.body.innerText);
  check('sheet keeps disclaimer', sheet.includes('educational reference') && sheet.includes('مرجع تعليمي'));
  check('sheet keeps unverified', /unreviewed/i.test(sheet));
  await pop.close();
  await page.evaluate(() => { lang = 'ar'; applyLang(); selectCountry('SAU', { refresh: true }); });
  const rtl = await page.evaluate(() => {
    const drug = document.querySelector('.drug-name');
    const cs = drug ? getComputedStyle(drug) : null;
    return { dir: document.documentElement.dir, drugDir: cs && cs.direction, h2: document.querySelector('#tab-country h2').textContent };
  });
  check('arabic rtl shell', rtl.dir === 'rtl' && rtl.h2 === 'Saudi Arabia', JSON.stringify(rtl));
  check('drug line stays ltr', rtl.drugDir === 'ltr', JSON.stringify(rtl));
  check('session errors empty', errors.length === 0, errors.join(';'));
  await page.evaluate(() => { const t=document.getElementById('toast'); if(t) t.remove(); });
  await page.screenshot({ path: '/opt/cursor/artifacts/polish_desktop_ar.png' });
  await page.evaluate(() => { lang = 'en'; applyLang(); const t=document.getElementById('toast'); if(t) t.remove(); });
  await page.screenshot({ path: '/opt/cursor/artifacts/polish_desktop_en.png' });
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => { const t=document.getElementById('toast'); if(t) t.remove(); });
  await page.screenshot({ path: '/opt/cursor/artifacts/polish_mobile_en.png', fullPage: false });
  await page.emulateMediaType('print');
  await page.screenshot({ path: '/opt/cursor/artifacts/polish_print_en.png', fullPage: false });
  await page.close();
}

await browser.close();
server.close();
if (fail.length) {
  console.error('FAILED\n' + fail.map(f => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('ui-regression passed');
