// Client-side "instax print" baker.
// Turns any uploaded photo into a square-cropped, warm-filtered instant-film
// print with a white frame, a handwritten caption, and a retro date stamp —
// mirroring the look of the offline Python generator, but in the browser so
// uploads are converted automatically.

const CARD_W = 800;
const CARD_H = 980;
const PHOTO = 700;
const MARGIN = 50; // left/right/top white border

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Center-square crop, biased slightly toward the top for portrait shots
// (keeps faces in frame), matching the Python crop_center_square logic.
function drawSquareCropped(ctx, img) {
  const { width: w, height: h } = img;
  let sx, sy, size;
  if (h > w) {
    size = w;
    sx = 0;
    sy = Math.floor((h - w) * 0.15);
  } else {
    size = h;
    sx = Math.floor((w - h) / 2);
    sy = 0;
  }
  ctx.drawImage(img, sx, sy, size, size, MARGIN, MARGIN, PHOTO, PHOTO);
}

function getHumanDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const y = parseInt(parts[0], 10);
  const m = months[parseInt(parts[1], 10) - 1] || '';
  const d = parseInt(parts[2], 10);
  return `${m} ${d}, ${y}`;
}

async function ensureFont() {
  // The caption font (Caveat) is loaded via the page's CSS; make sure it's
  // ready before we paint to canvas, otherwise text falls back to a serif.
  if (document.fonts && document.fonts.load) {
    try {
      await document.fonts.load("700 40px 'Caveat'");
      await document.fonts.ready;
    } catch {
      /* fall back to cursive */
    }
  }
}

/**
 * @param {File} file        original photo
 * @param {string} caption   handwritten caption (optional)
 * @param {string} photoDate yyyy-mm-dd (optional)
 * @returns {Promise<{ blob: Blob, previewUrl: string }>}
 */
export async function makeInstax(file, caption = '', photoDate = '') {
  await ensureFont();
  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  // 1. White instant-film card
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 2. Photo, square-cropped with a warm CCD-style filter
  ctx.save();
  ctx.beginPath();
  ctx.rect(MARGIN, MARGIN, PHOTO, PHOTO);
  ctx.clip();
  ctx.filter = 'contrast(1.08) saturate(1.12) brightness(1.03)';
  drawSquareCropped(ctx, img);
  ctx.filter = 'none';

  // warm overlay for that nostalgic film tint
  ctx.globalCompositeOperation = 'soft-light';
  const warm = ctx.createLinearGradient(MARGIN, MARGIN, MARGIN, MARGIN + PHOTO);
  warm.addColorStop(0, 'rgba(255, 214, 170, 0.28)');
  warm.addColorStop(1, 'rgba(255, 150, 120, 0.20)');
  ctx.fillStyle = warm;
  ctx.fillRect(MARGIN, MARGIN, PHOTO, PHOTO);

  // gentle vignette
  ctx.globalCompositeOperation = 'multiply';
  const vig = ctx.createRadialGradient(
    MARGIN + PHOTO / 2, MARGIN + PHOTO / 2, PHOTO * 0.3,
    MARGIN + PHOTO / 2, MARGIN + PHOTO / 2, PHOTO * 0.72
  );
  vig.addColorStop(0, 'rgba(255,255,255,1)');
  vig.addColorStop(1, 'rgba(190,170,160,1)');
  ctx.fillStyle = vig;
  ctx.fillRect(MARGIN, MARGIN, PHOTO, PHOTO);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // subtle inner edge on the photo
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(MARGIN + 0.5, MARGIN + 0.5, PHOTO - 1, PHOTO - 1);

  // 3. Retro orange date stamp (bottom-right of the photo)
  const human = getHumanDate(photoDate);
  if (photoDate) {
    const parts = photoDate.split('-');
    const stamp = parts.length === 3
      ? `${parts[1]}.${parts[2]}.${parts[0].slice(2)}`
      : '';
    if (stamp) {
      ctx.font = "600 30px 'Courier New', monospace";
      ctx.textAlign = 'right';
      ctx.shadowColor = 'rgba(255, 120, 0, 0.7)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ff7300';
      ctx.fillText(stamp, MARGIN + PHOTO - 22, MARGIN + PHOTO - 26);
      ctx.shadowBlur = 0;
    }
  }

  // 4. Handwritten caption on the wide bottom border
  const cap = (caption || '').trim();
  if (cap) {
    ctx.font = "700 44px 'Caveat', 'Segoe Print', cursive";
    ctx.fillStyle = '#4a2630';
    ctx.textAlign = 'center';
    const maxW = CARD_W - 120;
    let line = cap;
    while (ctx.measureText(line).width > maxW && line.length > 4) {
      line = line.slice(0, -2);
    }
    if (line !== cap) line = line.trimEnd() + '…';
    ctx.fillText(line, CARD_W / 2, MARGIN + PHOTO + 95);
  }

  // tiny date in the corner of the border too, if present
  if (human) {
    ctx.font = "400 20px 'Caveat', cursive";
    ctx.fillStyle = 'rgba(120, 90, 95, 0.8)';
    ctx.textAlign = 'right';
    ctx.fillText(human, CARD_W - 40, CARD_H - 30);
  }

  const blob = await new Promise((res) =>
    canvas.toBlob(res, 'image/jpeg', 0.9)
  );
  URL.revokeObjectURL(img.src);

  return { blob, previewUrl: canvas.toDataURL('image/jpeg', 0.85) };
}
