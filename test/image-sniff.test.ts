import { describe, it, expect } from 'vitest';
import { sniffImage } from '../src/lib/image-sniff';

// Minimal buffers carrying each format's real magic bytes (padded to >= 12
// bytes so the length guard passes). We assert on the signature, not on a
// full valid image, because the sniff only ever reads the header.
const pad = (bytes: number[]): Uint8Array => {
  const out = new Uint8Array(16);
  out.set(bytes);
  return out;
};

const JPEG = pad([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// 'RIFF' <4-byte size> 'WEBP'
const WEBP = pad([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
// ISO-BMFF 'ftyp' box with a 'avif' / 'heic' brand at offset 8.
const AVIF = pad([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);
const HEIC = pad([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
const GIF = pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
const SVG = pad([0x3c, 0x3f, 0x78, 0x6d, 0x6c, 0x20]); // '<?xml '

describe('sniffImage', () => {
  it('accepts the three resizable raster formats', () => {
    expect(sniffImage(JPEG)).toBe('jpeg');
    expect(sniffImage(PNG)).toBe('png');
    expect(sniffImage(WEBP)).toBe('webp');
  });

  it('rejects AVIF, HEIC and HEIF (libheif decode path)', () => {
    expect(sniffImage(AVIF)).toBeNull();
    expect(sniffImage(HEIC)).toBeNull();
  });

  it('rejects other formats we do not process', () => {
    expect(sniffImage(GIF)).toBeNull();
    expect(sniffImage(SVG)).toBeNull();
  });

  it('rejects a spoofed container regardless of a declared MIME type', () => {
    // The route trusts this result, not file.type: an AVIF byte-stream stays
    // rejected even when the client labels it image/jpeg.
    expect(sniffImage(AVIF)).toBeNull();
  });

  it('rejects buffers too short to carry a signature', () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
    expect(sniffImage(new Uint8Array(0))).toBeNull();
  });

  it('does not treat a bare RIFF container (no WEBP tag) as an image', () => {
    const riffWav = pad([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
    expect(sniffImage(riffWav)).toBeNull();
  });
});
