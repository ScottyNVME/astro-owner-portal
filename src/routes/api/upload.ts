import type { APIRoute } from 'astro';
import sharp from 'sharp';
import config from 'virtual:owner-portal/config';
import { readSession } from '../../lib/auth.js';
import { commitBinary } from '../../lib/github.js';
import { sniffImage } from '../../lib/image-sniff.js';

export const prerender = false;

const MAX_BYTES = 12 * 1024 * 1024;
const WEBP_QUALITY = 80;
// First, cheap gate on the declared type. The authoritative check is the
// magic-byte sniff of the buffer below, because `file.type` is client-supplied
// and not trusted. AVIF/HEIC/HEIF are intentionally excluded — they decode
// through libheif, the source of the CVEs this route must not expose.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UNSUPPORTED_IMAGE_MESSAGE =
  'That image format is not supported. Please upload a JPG, PNG, or WebP. (On iPhone, set Camera → Formats to "Most Compatible", or take a screenshot of the photo.)';

function safeFilename(originalName: string): string {
  const stem =
    (originalName.split('.').slice(0, -1).join('.') || 'photo')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'photo';
  const stamp = Date.now().toString(36);
  return `${stem}-${stamp}.webp`;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await readSession(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Expected multipart/form-data.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file in upload.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (file.size > MAX_BYTES) {
    return new Response(
      JSON.stringify({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB).` }),
      { status: 413, headers: { 'content-type': 'application/json' } },
    );
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return new Response(JSON.stringify({ error: UNSUPPORTED_IMAGE_MESSAGE }), {
      status: 415,
      headers: { 'content-type': 'application/json' },
    });
  }

  const uploadDir = config.imageUploadDir.replace(/\/$/, '');
  const publicPrefix = uploadDir.replace(/^public\//, '');

  try {
    const inputBuf = Buffer.from(await file.arrayBuffer());

    // Authoritative format check: verify the real bytes before handing the
    // buffer to sharp, so a spoofed MIME type (e.g. an AVIF labelled
    // image/jpeg) cannot reach the libheif decode path.
    if (!sniffImage(inputBuf)) {
      return new Response(JSON.stringify({ error: UNSUPPORTED_IMAGE_MESSAGE }), {
        status: 415,
        headers: { 'content-type': 'application/json' },
      });
    }

    const outputBuf = await sharp(inputBuf)
      .rotate()
      .resize({ width: config.imageMaxWidth, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 5 })
      .toBuffer();

    const filename = safeFilename(file.name || 'photo');
    const path = `${uploadDir}/${filename}`;
    const publicUrl = `/${publicPrefix}/${filename}`;

    await commitBinary({
      path,
      content: outputBuf,
      message: `Owner portal: upload ${filename}`,
    });

    return new Response(
      JSON.stringify({
        path,
        publicUrl,
        size: outputBuf.length,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    console.error('[owner-portal] upload error:', err);
    const reason = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: reason }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
