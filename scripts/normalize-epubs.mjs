import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'public', 'books');
const tempUnzipDir = path.join(projectRoot, 'temp_unzip');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const GRADIENTS = [
  'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
  'linear-gradient(135deg, #2b080e 0%, #680d1e 50%, #9e1b32 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
  'linear-gradient(135deg, #581c87 0%, #7e22ce 50%, #9333ea 100%)',
];

const EMOJIS = ['📖', '🖤🔥', '👑💎', '🥀✨', '💍🍷', '🌙🖤'];

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function cleanChapterHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(html);

  // Remove scripts, styles, forms, inputs, header images
  $('script, style, head, meta, link, form, iframe').remove();
  $('img').remove();

  // Clean Gutenberg or OBooko headers if present
  $('.pg-header, .pg-footer, #pg-header, #pg-footer').remove();

  // Return clean inner HTML
  let cleaned = $('body').length > 0 ? $('body').html() : $.html();

  // Remove residual Gutenberg disclaimer text block if matching
  cleaned = cleaned.replace(/The Project Gutenberg eBook of[\s\S]*?\*\*\* START OF THE PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/gi, '');
  cleaned = cleaned.replace(/\*\*\* END OF THE PROJECT GUTENBERG EBOOK[\s\S]*/gi, '');

  return cleaned.trim();
}

function extractWithTar(filePath, destDir) {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  const cmd = `tar -xf "${filePath}" -C "${destDir}"`;
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (e) {
    // Resilient extraction
  }
}

function readAllFilesRecursive(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(readAllFilesRecursive(fullPath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({
        relativePath,
        getData: () => fs.readFileSync(fullPath),
      });
    }
  });
  return results;
}

function parseEpub(filePath) {
  console.log(`\n📚 Processing EPUB: ${path.basename(filePath)}...`);
  try {
    let zipEntries = [];
    try {
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      zipEntries = entries.map((e) => ({
        relativePath: e.entryName,
        getData: () => e.getData(),
      }));
    } catch (admErr) {
      console.log(`ℹ️ AdmZip fallback with tar for ${path.basename(filePath)}...`);
      const targetTemp = path.join(tempUnzipDir, slugify(path.basename(filePath, '.epub')));
      extractWithTar(filePath, targetTemp);
      zipEntries = readAllFilesRecursive(targetTemp);
    }

    // 1. Locate container.xml & OPF
    const containerEntry = zipEntries.find((e) => e.relativePath.endsWith('container.xml'));
    if (!containerEntry) {
      console.warn(`⚠️ Skipped ${filePath}: missing container.xml`);
      return null;
    }

    const containerXml = containerEntry.getData().toString('utf8');
    const opfMatch = containerXml.match(/full-path=["']([^"']+)["']/i);
    if (!opfMatch) return null;

    const opfPath = opfMatch[1];
    const opfDir = path.dirname(opfPath);
    const opfEntry = zipEntries.find((e) => e.relativePath === opfPath || e.relativePath.endsWith(path.basename(opfPath)));
    if (!opfEntry) return null;

    const opfContent = opfEntry.getData().toString('utf8');

    // 2. Extract Metadata
    const titleMatch = opfContent.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    const authorMatch = opfContent.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
    const descMatch = opfContent.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i);

    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : path.basename(filePath, '.epub');
    const rawAuthor = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown Author';
    const rawDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 300) : 'A captivating novel.';

    const bookId = slugify(rawTitle) || slugify(path.basename(filePath, '.epub'));

    // 3. Find NCX file
    const ncxEntry = zipEntries.find((e) => e.relativePath.endsWith('.ncx'));
    const chapters = [];

    if (ncxEntry) {
      const ncxXml = ncxEntry.getData().toString('utf8');
      const navPointRegex = /<navPoint[^>]*>[\s\S]*?<navLabel>\s*<text>([\s\S]*?)<\/text>\s*<\/navLabel>\s*<content\s+src=["']([^"']+)["']/gi;

      const ncxItems = [];
      let m;
      while ((m = navPointRegex.exec(ncxXml)) !== null) {
        let label = m[1].replace(/<[^>]+>/g, '').trim();
        // Clean chapter titles
        label = label.replace(/\s+/g, ' ');
        ncxItems.push({ title: label, src: m[2] });
      }

      let chapIdx = 1;
      for (const item of ncxItems) {
        // Skip title page / copyright TOC items if redundant
        const lower = item.title.toLowerCase();
        if (lower.includes('cover') || lower.includes('title page') || lower.includes('obooko') || lower.includes('copyright')) {
          if (ncxItems.length > 5) continue;
        }

        const [srcFile, anchor] = item.src.split('#');
        const cleanSrcFile = path.basename(srcFile);

        const chapterEntry = zipEntries.find((e) => e.relativePath.endsWith(cleanSrcFile));
        if (!chapterEntry) continue;

        const rawHtml = chapterEntry.getData().toString('utf8');
        const cleanedContent = cleanChapterHtml(rawHtml);

        if (cleanedContent.length < 50 && ncxItems.length > 5) continue;

        chapters.push({
          id: `c${chapIdx}`,
          title: item.title || `Chapter ${chapIdx}`,
          content: cleanedContent,
        });

        chapIdx++;
      }
    }

    // Fallback if no NCX or NCX produced no chapters
    if (chapters.length === 0) {
      const manifestItems = {};
      const itemRegex = /<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi;
      let m;
      while ((m = itemRegex.exec(opfContent)) !== null) {
        manifestItems[m[1]] = m[2];
      }
      const itemrefRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*\/?>/gi;
      const spine = [];
      while ((m = itemrefRegex.exec(opfContent)) !== null) {
        spine.push(m[1]);
      }

      let chapCounter = 1;
      for (const idref of spine) {
        const href = manifestItems[idref];
        if (!href) continue;
        const cleanHref = path.basename(href.split('#')[0]);
        const entry = zipEntries.find((e) => e.relativePath.endsWith(cleanHref));
        if (!entry) continue;

        const rawHtml = entry.getData().toString('utf8');
        const cleanedContent = cleanChapterHtml(rawHtml);
        if (cleanedContent.length < 100) continue;

        chapters.push({
          id: `c${chapCounter}`,
          title: `Chapter ${chapCounter}`,
          content: cleanedContent,
        });
        chapCounter++;
      }
    }

    const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

    const bookMetadata = {
      id: bookId,
      title: rawTitle,
      author: rawAuthor,
      genre: 'Classic & Romance Novel',
      coverGradient: randomGradient,
      coverEmoji: randomEmoji,
      description: rawDesc,
      totalChapters: chapters.length,
    };

    const fullBookData = {
      ...bookMetadata,
      chapters,
    };

    const bookFilePath = path.join(outputDir, `${bookId}.json`);
    fs.writeFileSync(bookFilePath, JSON.stringify(fullBookData, null, 2), 'utf8');
    console.log(`✅ Saved normalized book: public/books/${bookId}.json (${chapters.length} chapters)`);

    return bookMetadata;
  } catch (err) {
    console.error(`❌ Error parsing ${filePath}:`, err.message);
    return null;
  }
}

function main() {
  console.log('🚀 Starting EPUB Normalizer Script...');
  const searchDirs = [projectRoot, path.join(projectRoot, 'epubs')];
  let epubFiles = [];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.epub')) {
          epubFiles.push(path.join(dir, file));
        }
      }
    }
  }

  epubFiles = Array.from(new Set(epubFiles));
  console.log(`Found ${epubFiles.length} EPUB file(s).`);

  const catalog = [];
  for (const epubPath of epubFiles) {
    const meta = parseEpub(epubPath);
    if (meta) catalog.push(meta);
  }

  if (fs.existsSync(tempUnzipDir)) {
    fs.rmSync(tempUnzipDir, { recursive: true, force: true });
  }

  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`\n🎉 Successfully normalized ${catalog.length} book(s)! Catalog created at public/books/index.json`);
}

main();
