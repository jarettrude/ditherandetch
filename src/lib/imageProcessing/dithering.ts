/**
 * Dithering Algorithms for Laser Engraving
 *
 * These algorithms convert grayscale images to 1-bit black/white
 * using various error diffusion and ordered dithering techniques.
 */

import type { ProcessingImageData } from './types';

function getGray(data: Uint8ClampedArray, idx: number): number {
  const a = data[idx + 3]!;
  if (a === 0) {
    return 255;
  }

  if (a < 255) {
    const alpha = a / 255;
    const r = data[idx]! * alpha + 255 * (1 - alpha);
    const g = data[idx + 1]! * alpha + 255 * (1 - alpha);
    const b = data[idx + 2]! * alpha + 255 * (1 - alpha);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return 0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!;
}

function setPixel(data: Uint8ClampedArray, idx: number, value: number): void {
  data[idx] = value;
  data[idx + 1] = value;
  data[idx + 2] = value;
}

/**
 * Floyd-Steinberg Dithering
 * Classic error diffusion algorithm with good balance of speed and quality
 *
 * Error distribution:
 *       * 7/16
 * 3/16 5/16 1/16
 */
export function floydSteinberg(
  imageData: ProcessingImageData,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);
  const errors = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    errors[i] = getGray(data, i * 4);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx]!;
      const newPixel = oldPixel < 128 ? 0 : 255;
      const quantError = oldPixel - newPixel;

      setPixel(result, idx * 4, newPixel);
      result[idx * 4 + 3] = data[idx * 4 + 3]!;

      if (x + 1 < width) {
        errors[idx + 1]! += (quantError * 7) / 16;
      }
      if (y + 1 < height) {
        if (x > 0) {
          errors[idx + width - 1]! += (quantError * 3) / 16;
        }
        errors[idx + width]! += (quantError * 5) / 16;
        if (x + 1 < width) {
          errors[idx + width + 1]! += (quantError * 1) / 16;
        }
      }
    }
  }

  return { width, height, data: result };
}

/**
 * Jarvis-Judice-Ninke Dithering
 * More sophisticated error diffusion with larger kernel for smoother results
 *
 * Error distribution:
 *           * 7/48 5/48
 * 3/48 5/48 7/48 5/48 3/48
 * 1/48 3/48 5/48 3/48 1/48
 */
export function jarvisJudiceNinke(
  imageData: ProcessingImageData,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);
  const errors = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    errors[i] = getGray(data, i * 4);
  }

  const kernel = [
    [0, 0, 0, 7, 5],
    [3, 5, 7, 5, 3],
    [1, 3, 5, 3, 1],
  ];
  const divisor = 48;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx]!;
      const newPixel = oldPixel < 128 ? 0 : 255;
      const quantError = oldPixel - newPixel;

      setPixel(result, idx * 4, newPixel);
      result[idx * 4 + 3] = data[idx * 4 + 3]!;

      // Distribute error using kernel
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 5; kx++) {
          const nx = x + kx - 2;
          const ny = y + ky;
          if (nx >= 0 && nx < width && ny < height && (ky > 0 || kx > 2)) {
            const kVal = kernel[ky]![kx]!;
            errors[ny * width + nx]! += (quantError * kVal) / divisor;
          }
        }
      }
    }
  }

  return { width, height, data: result };
}

/**
 * Stucki Dithering
 * Similar to Jarvis but with different weights for sharper results
 *
 * Error distribution:
 *           * 8/42 4/42
 * 2/42 4/42 8/42 4/42 2/42
 * 1/42 2/42 4/42 2/42 1/42
 */
export function stucki(imageData: ProcessingImageData): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);
  const errors = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    errors[i] = getGray(data, i * 4);
  }

  const kernel = [
    [0, 0, 0, 8, 4],
    [2, 4, 8, 4, 2],
    [1, 2, 4, 2, 1],
  ];
  const divisor = 42;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx]!;
      const newPixel = oldPixel < 128 ? 0 : 255;
      const quantError = oldPixel - newPixel;

      setPixel(result, idx * 4, newPixel);
      result[idx * 4 + 3] = data[idx * 4 + 3]!;

      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 5; kx++) {
          const nx = x + kx - 2;
          const ny = y + ky;
          if (nx >= 0 && nx < width && ny < height && (ky > 0 || kx > 2)) {
            const kVal = kernel[ky]![kx]!;
            errors[ny * width + nx]! += (quantError * kVal) / divisor;
          }
        }
      }
    }
  }

  return { width, height, data: result };
}

/**
 * Atkinson Dithering
 * Lighter dithering that only distributes 6/8 of the error
 * Creates a more "vintage" look, good for stylized engravings
 *
 * Error distribution (each is 1/8):
 *     * 1 1
 * 1 1 1
 *   1
 */
export function atkinson(imageData: ProcessingImageData): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);
  const errors = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    errors[i] = getGray(data, i * 4);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx]!;
      const newPixel = oldPixel < 128 ? 0 : 255;
      const quantError = oldPixel - newPixel;

      setPixel(result, idx * 4, newPixel);
      result[idx * 4 + 3] = data[idx * 4 + 3]!;

      if (x + 1 < width) errors[idx + 1]! += (quantError * 1) / 8;
      if (x + 2 < width) errors[idx + 2]! += (quantError * 1) / 8;
      if (y + 1 < height) {
        if (x > 0) errors[idx + width - 1]! += (quantError * 1) / 8;
        errors[idx + width]! += (quantError * 1) / 8;
        if (x + 1 < width) errors[idx + width + 1]! += (quantError * 1) / 8;
      }
      if (y + 2 < height) {
        errors[idx + width * 2]! += (quantError * 1) / 8;
      }
    }
  }

  return { width, height, data: result };
}

/**
 * Sierra Dithering (Sierra-3)
 * Good balance between Floyd-Steinberg and Jarvis
 *
 * Error distribution:
 *         * 5/32 3/32
 * 2/32 4/32 5/32 4/32 2/32
 *      2/32 3/32 2/32
 */
export function sierra(imageData: ProcessingImageData): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);
  const errors = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    errors[i] = getGray(data, i * 4);
  }

  const kernel = [
    [0, 0, 0, 5, 3],
    [2, 4, 5, 4, 2],
    [0, 2, 3, 2, 0],
  ];
  const divisor = 32;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx]!;
      const newPixel = oldPixel < 128 ? 0 : 255;
      const quantError = oldPixel - newPixel;

      setPixel(result, idx * 4, newPixel);
      result[idx * 4 + 3] = data[idx * 4 + 3]!;

      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 5; kx++) {
          const nx = x + kx - 2;
          const ny = y + ky;
          if (nx >= 0 && nx < width && ny < height && (ky > 0 || kx > 2)) {
            const kVal = kernel[ky]![kx]!;
            errors[ny * width + nx]! += (quantError * kVal) / divisor;
          }
        }
      }
    }
  }

  return { width, height, data: result };
}

/**
 * Sierra Two-Row (Sierra-2)
 * Faster variant of Sierra with only 2 rows
 */
export function sierraTwoRow(
  imageData: ProcessingImageData,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);
  const errors = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    errors[i] = getGray(data, i * 4);
  }

  const kernel = [
    [0, 0, 0, 4, 3],
    [1, 2, 3, 2, 1],
  ];
  const divisor = 16;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx]!;
      const newPixel = oldPixel < 128 ? 0 : 255;
      const quantError = oldPixel - newPixel;

      setPixel(result, idx * 4, newPixel);
      result[idx * 4 + 3] = data[idx * 4 + 3]!;

      for (let ky = 0; ky < 2; ky++) {
        for (let kx = 0; kx < 5; kx++) {
          const nx = x + kx - 2;
          const ny = y + ky;
          if (nx >= 0 && nx < width && ny < height && (ky > 0 || kx > 2)) {
            const kVal = kernel[ky]![kx]!;
            errors[ny * width + nx]! += (quantError * kVal) / divisor;
          }
        }
      }
    }
  }

  return { width, height, data: result };
}

/**
 * Burkes Dithering
 * Simplified Stucki, faster with similar results
 *
 * Error distribution:
 *       * 8/32 4/32
 * 2/32 4/32 8/32 4/32 2/32
 */
export function burkes(imageData: ProcessingImageData): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);
  const errors = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    errors[i] = getGray(data, i * 4);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx]!;
      const newPixel = oldPixel < 128 ? 0 : 255;
      const quantError = oldPixel - newPixel;

      setPixel(result, idx * 4, newPixel);
      result[idx * 4 + 3] = data[idx * 4 + 3]!;

      const distribute = (dx: number, dy: number, factor: number) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          errors[ny * width + nx]! += (quantError * factor) / 32;
        }
      };

      distribute(1, 0, 8);
      distribute(2, 0, 4);
      distribute(-2, 1, 2);
      distribute(-1, 1, 4);
      distribute(0, 1, 8);
      distribute(1, 1, 4);
      distribute(2, 1, 2);
    }
  }

  return { width, height, data: result };
}

/**
 * Bayer Ordered Dithering (8x8 matrix)
 * Uses a threshold matrix for fast, predictable patterns
 * Good for stylized/decorative engraving
 */
export function bayerOrdered(
  imageData: ProcessingImageData,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const bayerMatrix = [
    [0, 128, 32, 160, 8, 136, 40, 168],
    [192, 64, 224, 96, 200, 72, 232, 104],
    [48, 176, 16, 144, 56, 184, 24, 152],
    [240, 112, 208, 80, 248, 120, 216, 88],
    [12, 140, 44, 172, 4, 132, 36, 164],
    [204, 76, 236, 108, 196, 68, 228, 100],
    [60, 188, 28, 156, 52, 180, 20, 148],
    [252, 124, 220, 92, 244, 116, 212, 84],
  ];
  const size = 8;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gray = getGray(data, idx);
      const threshold = bayerMatrix[y % size]![x % size]!;
      const newPixel = gray > threshold ? 255 : 0;

      setPixel(result, idx, newPixel);
      result[idx + 3] = data[idx + 3]!;
    }
  }

  return { width, height, data: result };
}

/**
 * Bayer 4x4 Ordered Dithering
 * Smaller matrix for coarser pattern
 */
export function bayerOrdered4x4(
  imageData: ProcessingImageData,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const bayerMatrix = [
    [0, 136, 34, 170],
    [204, 68, 238, 102],
    [51, 187, 17, 153],
    [255, 119, 221, 85],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gray = getGray(data, idx);
      const threshold = bayerMatrix[y % 4]![x % 4]!;
      const newPixel = gray > threshold ? 255 : 0;

      setPixel(result, idx, newPixel);
      result[idx + 3] = data[idx + 3]!;
    }
  }

  return { width, height, data: result };
}

// Export all dithering algorithms
export const ditheringAlgorithms = {
  floydSteinberg,
  jarvisJudiceNinke,
  stucki,
  atkinson,
  sierra,
  sierraTwoRow,
  burkes,
  bayerOrdered,
  bayerOrdered4x4,
};

export type DitheringAlgorithm = keyof typeof ditheringAlgorithms;
