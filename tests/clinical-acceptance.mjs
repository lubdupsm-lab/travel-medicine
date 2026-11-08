/**
 * Static checks against index.html. Run: node tests/clinical-acceptance.mjs
 * These assert checked corrections and the disclaimer. They do not certify all 182 destinations.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const start = html.indexOf('const COUNTRIES = ');
const end = html.indexOf(';\nconst I18N');
const data = JSON.parse(html.slice(start + 'const COUNTRIES = '.length, end));
const by = Object.fromEntries(data.map(c => [c.iso, c]));
const failures = [];
const check = (name, ok) => { if (!ok) failures.push(name); };

check('182 records', data.length === 182);
check('112 explicit unverified flags kept', data.filter(c => c.unverified).length === 112);
for (const iso of ['LKA', 'CHN', 'BLZ', 'PRY', 'TLS', 'SUR']) {
  check(iso + ' not endemic malaria', by[iso].malaria_level === 'none' && !(by[iso].risks || []).includes('malaria'));
  check(iso + ' no routine drug order', !/Atovaquone-Proguanil \(/.test(by[iso].malaria_drug || ''));
}
check('SAU not nationwide none', by.SAU.malaria_level !== 'none' && /Asir/.test(by.SAU.malaria_drug));
check('IRN not chloroquine for the border', !/^Chloroquine/.test(by.IRN.malaria_drug) && /chloroquine resistance/i.test(by.IRN.malaria_drug));
check('THA not AP only', !/ONLY/.test(by.THA.malaria_drug));
check('KHM not AP only', !/Atovaquone-Proguanil ONLY|Use Atovaquone-Proguanil exclusively/i.test(by.KHM.malaria_drug + ' ' + by.KHM.counseling.join(' ')));
check('NPL threshold', /2,000 m/.test(by.NPL.malaria_drug));
check('ZAF districts', /uMkhanyakude/.test(by.ZAF.malaria_drug) && !/game reserves only/i.test(by.ZAF.malaria_drug));
check('PER entry not required', /not required for entry/i.test(by.PER.health_visa));
check('NGA not all arrivals', !/all arrivals/i.test(by.NGA.health_visa));
check('TZA conditional vaccine', by.TZA.vaccines.find(v => v.name === 'Yellow Fever').type === 'conditional');
check('RWA conditional vaccine', by.RWA.vaccines.find(v => v.name === 'Yellow Fever').type === 'conditional');
check('BRA no active zika claim', !by.BRA.alerts.some(a => /Zika active —/i.test(a)));
check('IDN dated notice link', (by.IDN.notices || []).some(n => /zika-indonesia/.test(n.url) && /7 Aug 2026/.test(n.detail)));
check('disclaimer EN', html.includes('educational reference to support clinicians'));
check('disclaimer AR', html.includes('مرجع تعليمي لمساعدة الأطباء'));
check('no immunity claim', !/no liability|not liable|accept no responsibility/i.test(html));
check('no May 2026 current stamp', !html.includes('Information current as of May 2026') && !html.includes('Current: May 2026'));
check('rabies 0 and 7', html.includes('2 doses, days 0 and 7'));
check('no standby azithromycin kit', !html.includes('Standby Azithromycin'));
check('no DEET threshold kit', !html.includes('DEET≥30'));
check('diarrhea plan present', html.includes('diarrheaPlan') && html.includes('Oral rehydration comes first'));
check('checklist helpers', html.includes('function checklistHtml') && html.includes('function checklistPrint'));
check('unverified still on export path', html.includes('unverifiedExplicit'));
check('search keyboard', html.includes("e.key==='ArrowDown'"));
check('share url', html.includes("q.set('dest'"));
check('reset', html.includes('function resetConsult'));

if (failures.length) {
  console.error('FAILED\n' + failures.map(f => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('clinical-acceptance: ' + data.length + ' records, ' + failures.length + ' failures');
