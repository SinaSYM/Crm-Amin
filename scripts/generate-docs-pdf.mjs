import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, 'project-docs.html');
const pdfPath = resolve(__dirname, '..', 'AminCRM-Documentation.pdf');

console.log('Launching browser...');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log('Loading HTML...');
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle', timeout: 60000 });

// Wait for fonts
await page.waitForTimeout(3000);

console.log('Generating PDF...');
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
  displayHeaderFooter: false,
  preferCSSPageSize: true,
});

await browser.close();
console.log('✅ PDF generated at:', pdfPath);
