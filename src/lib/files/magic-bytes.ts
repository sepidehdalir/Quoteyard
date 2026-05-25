import 'server-only';
import type { AllowedMimeType } from '@/lib/validations/quote';

/**
 * Verify that the first bytes of `file` match the declared MIME type.
 *
 * Browser-supplied `file.type` is just a hint. A malicious client can
 * upload `payload.exe` and claim it's `image/png`. This check reads
 * the actual file header and rejects mismatches.
 *
 * Returns `true` if the magic bytes match the expected MIME.
 */
export async function verifyMimeFromBytes(
  file: File,
  expectedMime: AllowedMimeType,
): Promise<boolean> {
  const headerSize = 16;
  const slice = file.slice(0, headerSize);
  const buf = new Uint8Array(await slice.arrayBuffer());

  // All allowed types have signatures within the first 12 bytes.
  if (buf.length < 12) return false;

  switch (expectedMime) {
    case 'image/jpeg':
      // JPEG: FF D8 FF
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

    case 'image/png':
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      return (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a
      );

    case 'image/webp':
      // WEBP: 'RIFF' at 0, 'WEBP' at 8
      return (
        buf[0] === 0x52 && // R
        buf[1] === 0x49 && // I
        buf[2] === 0x46 && // F
        buf[3] === 0x46 && // F
        buf[8] === 0x57 && // W
        buf[9] === 0x45 && // E
        buf[10] === 0x42 && // B
        buf[11] === 0x50 //   P
      );

    case 'image/heic':
      // HEIC/HEIF: 'ftyp' at offset 4 (we trust the major brand
      // marker). Stricter validators check the brand at 8-11
      // against an allow-list; for our purposes the ftyp marker
      // plus our outer MIME check is sufficient and rejects the
      // common attacks (renamed executables, polyglot files).
      return (
        buf[4] === 0x66 && // f
        buf[5] === 0x74 && // t
        buf[6] === 0x79 && // y
        buf[7] === 0x70 //   p
      );
  }
}
