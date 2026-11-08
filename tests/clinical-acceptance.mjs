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
check('arabic names for every record', data.every(c => c.name_ar && c.name_ar.length > 1));
check('no false all-clear sentence', !html.includes('No significant travel-related infectious disease risk'));
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
check('disclaimer short EN', html.includes('Educational reference—not a prescription. Verify the traveler’s needs and current entry rules.'));
check('disclaimer short AR', html.includes('مرجع تعليمي، لا يُعد وصفة طبية. تحقّق من احتياجات المسافر واشتراطات الدخول السارية.'));
check('disclaimer expanded EN', html.includes('This map supports, but does not replace, an individualized pre-travel consultation.'));
check('disclaimer expanded AR', html.includes('تساعد هذه الخريطة في المشورة قبل السفر ولا تستبدل التقييم الفردي.'));
check('no immunity claim', !/no liability|not liable|accept no responsibility/i.test(html));
check('no May 2026 current stamp', !html.includes('Information current as of May 2026') && !html.includes('Current: May 2026'));
check('rabies 0 and 7', html.includes('doses on days 0 and 7'));
check('no standby azithromycin kit', !html.includes('Standby Azithromycin'));
check('no DEET threshold kit', !html.includes('DEET≥30'));
check('diarrhea plan present', html.includes('diarrheaPlan') && html.includes('Oral rehydration is the priority'));
check('checklist helpers', html.includes('function checklistHtml') && html.includes('function checklistPrint'));
check('unverified still on export path', html.includes('unverifiedExplicit'));
check('search keyboard', html.includes("e.key==='ArrowDown'"));
check('share url', html.includes("q.set('dest'"));
check('reset', html.includes('function resetConsult'));
check('ETH Addis in prophylaxis', /including Addis Ababa/.test(by.ETH.counseling.join(' ')) && /2,500/.test(by.ETH.malaria_drug));
check('ETH Arabic Addis', /أديس أبابا/.test(by.ETH.counseling_ar.join(' ')) && /2,500/.test(by.ETH.counseling_ar.join(' ')));
check('ETH no old Addis exemption', !/Addis Ababa \(2400|Addis.*low risk|below 2000m/i.test(JSON.stringify(by.ETH)));
check('ETH YF not a required badge', by.ETH.vaccines.find(v => v.name === 'Yellow Fever').type !== 'required');
check('KEN YF not a required badge', by.KEN.vaccines.find(v => v.name === 'Yellow Fever').type !== 'required');
check('KEN does not copy Ethiopia transit', !/12 hour/i.test(by.KEN.health_visa) && !/12 ساعة/.test(by.KEN.health_visa_ar));
check('KEN Arabic Nairobi exception', /نيروبي/.test(by.KEN.counseling_ar.join(' ')) && /تايتا/.test(by.KEN.counseling_ar.join(' ')));
check('BOL source conflict', /These sources differ/.test(by.BOL.health_visa) && /تختلف هذه المصادر/.test(by.BOL.health_visa_ar));
check('BOL not a required badge', by.BOL.vaccines.find(v => v.name === 'Yellow Fever').type !== 'required');
check('BOL chloroquine resistance', by.BOL.malaria_resistant === true && /chloroquine resistance/i.test(by.BOL.malaria_drug));
check('PAK all cities', /including all cities/.test(by.PAK.counseling.join(' ')) && /جميع المدن/.test(by.PAK.counseling_ar.join(' ')));
check('AUS localized JE', by.AUS.risks.includes('japanese_encephalitis') && /Outer Torres Strait/.test(by.AUS.counseling.join(' ')) && /مضيق توريس/.test(by.AUS.counseling_ar.join(' ')));
check('AUS JE not unconditional', by.AUS.vaccines.find(v => v.name === 'Japanese Encephalitis').type === 'conditional');
check('SAU edition label', /1447H \(2026\)/.test(by.SAU.health_visa) && /1448H\/2027/.test(by.SAU.health_visa) && /1447هـ/.test(by.SAU.health_visa_ar));
check('SAU tables collapsed helper', html.includes('function saudiTablesHtml') && html.includes('Historical lists for the 1447H/2026 edition only'));
check('varicella Varivax', html.includes('Varivax is licensed from age 12 months') && html.includes('يُرخص Varivax من عمر 12 شهرًا'));
check('Ty21a conservative gap', html.includes('more than 72 hours') && html.includes('at least 24 hours before doxycycline') && html.includes('أكثر من 72 ساعة'));
check('food water replacement', html.includes('factory-sealed bottle') && html.includes('عبوة أصلية محكمة لم تُفتح'));
check('no bottled-only rule', !/Bottled water only/i.test(html) && !/Bottled water exclusively/i.test(html) && !html.includes('مياه معبأة فقط'));
check('no Addis low-risk phrase', !/Addis.{0,30}low risk/i.test(html));
check('no AP only order', ![...html.matchAll(/atovaquone-proguanil only/gi)].some(m => {
  const lead = html.slice(Math.max(0, m.index - 24), m.index).toLowerCase();
  return !/not\s+$/.test(lead) && !/do not read that as\s+$/.test(lead);
}) && !/Use Atovaquone-Proguanil exclusively/i.test(html));
check('no live-vaccine YF ban phrase', !html.includes('Live vaccines contraindicated: Yellow Fever'));
check('no COVID by origin shortcut', !html.includes('COVID-19 by country of origin'));
check('no May 2026 current-as-of stamp', !/current as of May 2026/i.test(html));
check('rabies start is 2 doses', /doses on days 0 and 7/.test(html) && !/pre-exposure[^.]{0,80}3 doses, days 0, 7, 21/i.test(html));
check('no categorical YF required badges', data.every(c => !(c.vaccines || []).some(v => v.name === 'Yellow Fever' && v.type === 'required')));
check('clearance sentence replaced', !data.some(c => (c.counseling || []).some(s => /^No significant risk\b/i.test(s) || /No significant infectious disease risk/i.test(s) || /No significant travel infectious/i.test(s))));
check('schistosomiasis lines kept', /Schistosomiasis/.test(by.KEN.counseling.join(' ')) && /Schistosomiasis/.test(by.EGY.counseling.join(' ')));
check('print keeps full disclaimer', html.includes('#discDetails,#discDetails[hidden]{display:block!important}') && html.includes('id="discFull"'));

if (failures.length) {
  console.error('FAILED\n' + failures.map(f => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('clinical-acceptance: ' + data.length + ' records, ' + failures.length + ' failures');
