import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { cookies } from 'next/headers';
import { BIRTHDAY_COOKIE, verifyBirthdayToken } from '../../../lib/birthdayAuth';

// Parshvi's birthday photos and clips are private. They live in /private
// (gitignored, so they never reach the public GitHub repo) and are only
// streamed to visitors holding the signed login token (see app/lib/birthdayAuth.js).
const ROOT = path.join(process.cwd(), 'private', 'birthday');
const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
};

export const dynamic = 'force-dynamic';

const notFound = () => new Response('Not found', { status: 404 });

export async function GET(request, { params }) {
  const role = await verifyBirthdayToken((await cookies()).get(BIRTHDAY_COOKIE)?.value);
  if (!role) return notFound();

  const { file } = await params;
  const abs = path.join(ROOT, ...file);
  if (!abs.startsWith(ROOT + path.sep)) return notFound();

  const type = TYPES[path.extname(abs).toLowerCase()];
  if (!type) return notFound();

  let info;
  try {
    info = await stat(abs);
  } catch {
    return notFound();
  }
  if (!info.isFile()) return notFound();

  const size = info.size;
  const headers = {
    'Content-Type': type,
    'Cache-Control': 'private, max-age=86400',
    'Accept-Ranges': 'bytes',
    'X-Robots-Tag': 'noindex, nofollow',
  };

  // Safari only plays <video> when the server honours byte ranges.
  const range = request.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    let start = -1;
    let end = size - 1;
    if (match && match[1] !== '') {
      start = Number(match[1]);
      if (match[2] !== '') end = Math.min(Number(match[2]), size - 1);
    } else if (match && match[2] !== '') {
      start = Math.max(0, size - Number(match[2]));
    }
    if (start < 0 || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    return new Response(Readable.toWeb(createReadStream(abs, { start, end })), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  return new Response(Readable.toWeb(createReadStream(abs)), {
    headers: { ...headers, 'Content-Length': String(size) },
  });
}
