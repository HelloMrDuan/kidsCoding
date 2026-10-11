// Run against an actual production server on :3100, once for the base commit
// and once for the candidate. Prototype files remain unmodified.
import { chromium } from '@playwright/test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
process.chdir(fileURLToPath(new URL('../../../', import.meta.url)));
const mode = process.argv[2] || 'before';
if (!['before', 'after'].includes(mode)) throw new Error('phase must be before or after');
mkdirSync('docs/roadmap/evidence/UX-001', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const measurements = [];
for (const [name, width, height] of [['desktop',1440,900],['tablet',768,1024],['mobile',375,812]]) {
  const context = await browser.newContext({ viewport:{width,height}, hasTouch:name==='mobile' });
  const page = await context.newPage();
  for (const [id,route] of [['home','/'],['map','/learn/map'],['lesson','/learn/lesson/lesson-12-graduation-show']]) {
    await page.goto('http://127.0.0.1:3100'+route);
    if(id==='lesson') await page.getByTestId('lesson-blockly-workspace').locator('.blocklySvg').waitFor();
    await page.screenshot({path:`docs/roadmap/evidence/UX-001/${id}-${name}-${mode}.png`,fullPage:true});
    measurements.push({id,name,mode,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,font:getComputedStyle(document.body).fontFamily,background:getComputedStyle(document.body).backgroundColor,panels:[...document.querySelectorAll('.kc-surface-3d,.kc-panel-3d')].map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {radius:s.borderRadius,background:s.backgroundColor,shadow:s.boxShadow,width:r.width,x:r.x};})}))});
  }
  if (mode==='before') for(const [id,prototypeId] of [['home','marketing'],['map','map'],['lesson','lesson']]) {
    await page.goto(pathToFileURL(resolve('docs/design/kidscoding-v2/prototype.html')).href);
    if(name==='mobile') await page.locator('#hamburger').click();
    await page.locator(`.nav-item[data-page="${prototypeId}"]`).click();
    await page.locator(`#page-${prototypeId}.active`).waitFor();
    await page.screenshot({path:`docs/roadmap/evidence/UX-001/${id}-${name}-reference.png`,fullPage:true});
  }
  await context.close();
}
await browser.close();
writeFileSync(`docs/roadmap/evidence/UX-001/${mode}-measurements.json`,JSON.stringify(measurements,null,2)+'\n');
