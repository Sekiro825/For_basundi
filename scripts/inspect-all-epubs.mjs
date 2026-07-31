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
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File missing`);
    continue;
  }
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    console.log(`Zip contains ${entries.length} files.`);

    const containerEntry = entries.find((e) => e.entryName.endsWith('container.xml'));
    if (!containerEntry) {
      console.log('No container.xml');
      continue;
    }
    const containerXml = containerEntry.getData().toString('utf8');
    const opfPathMatch = containerXml.match(/full-path=["']([^"']+)["']/i);
    const opfPath = opfPathMatch ? opfPathMatch[1] : '';
    console.log(`OPF Path: ${opfPath}`);

    const opfEntry = entries.find((e) => e.entryName === opfPath || e.entryName.endsWith(path.basename(opfPath)));
    if (!opfEntry) {
      console.log('OPF file not found');
      continue;
    }

    const opfXml = opfEntry.getData().toString('utf8');
    
    // List itemrefs in spine
    const itemrefs = [];
    const refRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*\/?>/gi;
    let m;
    while ((m = refRegex.exec(opfXml)) !== null) {
      itemrefs.push(m[1]);
    }
    console.log(`Spine itemrefs count: ${itemrefs.length}`);

    // Manifest map
    const manifest = {};
    const itemRegex = /<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi;
    while ((m = itemRegex.exec(opfXml)) !== null) {
      manifest[m[1]] = m[2];
    }
    const itemRegex2 = /<item\s+[^>]*href=["']([^"']+)["'][^>]*id=["']([^"']+)["'][^>]*\/?>/gi;
    while ((m = itemRegex2.exec(opfXml)) !== null) {
      manifest[m[2]] = m[1];
    }

    console.log('First 5 spine files:');
    itemrefs.slice(0, 5).forEach((id) => {
      console.log(`  id: ${id} -> href: ${manifest[id]}`);
    });
  } catch (err) {
    console.log(`Err: ${err.message}`);
  }
}
