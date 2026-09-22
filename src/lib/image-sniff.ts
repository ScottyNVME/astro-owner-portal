/**
 * Verify an uploaded image's real format from its magic bytes, independent of
 * the client-declared MIME type. The upload route hands the raw buffer to
 * `sharp()`, so trusting `file.type` would let a caller smuggle a different
 * container past the MIME allowlist.
 *
 * Only the raster formats we resize are accepted (JPEG, PNG, WebP). AVIF, HEIC
 * and HEIF — ISO base-media (`ftyp`) containers — are deliberately NOT accepted:
 * they decode through libheif, the source of the CVEs (GHSA-rgj7-g3m4-5g8c and
 * the Astro RCE advisory GHSA-26w7-cxv4-gfx2) that this route must not expose.
 * A `null` return means "reject", including for such containers.
 */
export type SniffedFormat = 'jpeg' | 'png' | 'webp';

export function sniffImage(buf: Uint8Array): SniffedFormat | null {
  // Shortest signature we probe (WebP) needs the first 12 bytes.
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: 'RIFF' (0-3), 4-byte length (4-7), 'WEBP' (8-11)
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}
