import { heicTo, isHeic } from 'heic-to';

export const IMAGE_ACCEPT =
  'image/png,image/jpeg,image/jpg,image/bmp,image/webp,image/avif,image/heic,image/heif,image/heic-sequence,image/heif-sequence,.heic,.heif,.webp,.avif';

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx === -1) return '';
  return name.slice(idx + 1).toLowerCase();
}

function stripFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx === -1) return name;
  return name.slice(0, idx);
}

export function isLikelyHeicFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type.includes('heic') || type.includes('heif')) return true;
  const ext = getFileExtension(file.name || '');
  return ext === 'heic' || ext === 'heif';
}

export function isLikelyImageFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  return isLikelyHeicFile(file);
}

export async function normalizeImageFile(
  file: File,
  opts?: {
    heicOutputType?: 'image/jpeg' | 'image/png' | 'image/webp';
    quality?: number;
  },
): Promise<File> {
  if (!isLikelyHeicFile(file)) return file;

  let confirmedHeic = true;
  try {
    confirmedHeic = await isHeic(file);
  } catch {
    confirmedHeic = true;
  }

  if (!confirmedHeic) return file;

  const heicOutputType = opts?.heicOutputType ?? 'image/jpeg';
  const quality = opts?.quality ?? 0.92;

  const blob = await heicTo({
    blob: file,
    type: heicOutputType,
    quality,
  });

  const ext =
    heicOutputType === 'image/png' ? 'png'
    : heicOutputType === 'image/webp' ? 'webp'
    : 'jpg';

  const baseName = file.name ? stripFileExtension(file.name) : 'image';

  return new File([blob], `${baseName}.${ext}`, {
    type: blob.type || heicOutputType,
    lastModified: file.lastModified,
  });
}
