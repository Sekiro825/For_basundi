import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const epubs = [
  'CatchingCaroline-obooko-rom0109.epub',
  'Maid-to-the-Mafia-obooko-rom0314.epub',
  'Pride and Prejudice.epub',
  'Whithering hieghts.epub',
];

for (const file of epubs) {
  const filePath = path.join(projectRoot, file);
  console.log(`\n================ ${file} ================`);
  if (!fs.existsSync(filePath)) continue;
  
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();
  
  const ncxEntry = entries.find((e) => e.entryName.endsWith('.ncx'));
  if (ncxEntry) {
    const xml = ncxEntry.getData().toString('utf8');
    const navPointRegex = /<navLabel>\s*<text>([\s\S]*?)<\/text>\s*<\/navLabel>\s*<content\s+src=["']([^"']+)["']/gi;
    let m;
    let count = 0;
    while ((m = navPointRegex.exec(xml)) !== null && count < 8) {
      console.log(`  TOC Item: "${m[1].trim()}" -> src: ${m[2]}`);
      count++;
    }
  } else {
    console.log('No .ncx found, checking nav.xhtml...');
  }
}
