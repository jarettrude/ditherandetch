export function getGrayOnWhite(data: Uint8ClampedArray, idx: number): number {
  const a = data[idx + 3]!;
  if (a === 0) return 255;

  if (a < 255) {
    const alpha = a / 255;
    const r = data[idx]! * alpha + 255 * (1 - alpha);
    const g = data[idx + 1]! * alpha + 255 * (1 - alpha);
    const b = data[idx + 2]! * alpha + 255 * (1 - alpha);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return 0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!;
}

export function sanitizeRgbaForExport(
  data: Uint8ClampedArray,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(data.length));
  out.set(data);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3]!;
    if (a < 255) {
      const alpha = a / 255;
      out[i] = Math.round(out[i]! * alpha + 255 * (1 - alpha));
      out[i + 1] = Math.round(out[i + 1]! * alpha + 255 * (1 - alpha));
      out[i + 2] = Math.round(out[i + 2]! * alpha + 255 * (1 - alpha));
    }
  }
  return out;
}
