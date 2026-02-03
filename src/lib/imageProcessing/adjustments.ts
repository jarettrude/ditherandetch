/**
 * Image Adjustment Algorithms for Laser Engraving
 *
 * These algorithms prepare images before dithering by adjusting
 * brightness, contrast, gamma, sharpening, and other parameters.
 */

import { getGrayOnWhite } from './alpha';
import type { ProcessingImageData } from './types';

// Helper to clamp values
function clamp(value: number, min: number = 0, max: number = 255): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert image to grayscale using luminosity method
 */
export function toGrayscale(
  imageData: ProcessingImageData,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    const gray = getGrayOnWhite(data, i);
    result[i] = gray;
    result[i + 1] = gray;
    result[i + 2] = gray;
    result[i + 3] = data[i + 3]!; // Preserve alpha
  }

  return { width, height, data: result };
}

/**
 * Adjust brightness
 * @param amount -255 to 255
 */
export function adjustBrightness(
  imageData: ProcessingImageData,
  amount: number,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    result[i] = clamp(data[i]! + amount);
    result[i + 1] = clamp(data[i + 1]! + amount);
    result[i + 2] = clamp(data[i + 2]! + amount);
    result[i + 3] = data[i + 3]!;
  }

  return { width, height, data: result };
}

/**
 * Adjust contrast
 * @param amount -100 to 100
 */
export function adjustContrast(
  imageData: ProcessingImageData,
  amount: number,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const factor = (259 * (amount + 255)) / (255 * (259 - amount));

  for (let i = 0; i < data.length; i += 4) {
    result[i] = clamp(((data[i]! / 255 - 0.5) * factor + 0.5) * 255);
    result[i + 1] = clamp(((data[i + 1]! / 255 - 0.5) * factor + 0.5) * 255);
    result[i + 2] = clamp(((data[i + 2]! / 255 - 0.5) * factor + 0.5) * 255);
    result[i + 3] = data[i + 3]!;
  }

  return { width, height, data: result };
}

/**
 * Adjust gamma
 * @param gamma 0.1 to 10 (1.0 = no change)
 */
export function adjustGamma(
  imageData: ProcessingImageData,
  gamma: number,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const gammaCorrection = 1 / gamma;
  const lookupTable = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    lookupTable[i] = clamp(Math.pow(i / 255, gammaCorrection) * 255);
  }

  for (let i = 0; i < data.length; i += 4) {
    result[i] = lookupTable[data[i]!]!;
    result[i + 1] = lookupTable[data[i + 1]!]!;
    result[i + 2] = lookupTable[data[i + 2]!]!;
    result[i + 3] = data[i + 3]!;
  }

  return { width, height, data: result };
}

/**
 * Invert colors
 */
export function invert(imageData: ProcessingImageData): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    result[i] = 255 - data[i]!;
    result[i + 1] = 255 - data[i + 1]!;
    result[i + 2] = 255 - data[i + 2]!;
    result[i + 3] = data[i + 3]!;
  }

  return { width, height, data: result };
}

/**
 * Mirror image horizontally
 */
export function mirrorHorizontal(
  imageData: ProcessingImageData,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = (y * width + (width - 1 - x)) * 4;

      result[dstIdx] = data[srcIdx]!;
      result[dstIdx + 1] = data[srcIdx + 1]!;
      result[dstIdx + 2] = data[srcIdx + 2]!;
      result[dstIdx + 3] = data[srcIdx + 3]!;
    }
  }

  return { width, height, data: result };
}

/**
 * Unsharp Mask Sharpening
 * @param radius Blur radius for mask creation
 * @param amount Strength of sharpening (0-500%)
 * @param threshold Minimum brightness change to sharpen
 */
export function unsharpMask(
  imageData: ProcessingImageData,
  radius: number = 1,
  amount: number = 100,
  threshold: number = 0,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  // Create blurred version using box blur
  const blurred = boxBlur(imageData, radius);

  const amountFactor = amount / 100;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const original = data[i + c]!;
      const blur = blurred.data[i + c]!;
      const diff = original - blur;

      if (Math.abs(diff) >= threshold) {
        result[i + c] = clamp(original + diff * amountFactor);
      } else {
        result[i + c] = original;
      }
    }
    result[i + 3] = data[i + 3]!;
  }

  return { width, height, data: result };
}

/**
 * Box blur helper for unsharp mask
 */
function boxBlur(
  imageData: ProcessingImageData,
  radius: number,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);
  const temp = new Uint8ClampedArray(data);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        count = 0;

      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < width) {
          const idx = (y * width + nx) * 4;
          r += data[idx]!;
          g += data[idx + 1]!;
          b += data[idx + 2]!;
          count++;
        }
      }

      const idx = (y * width + x) * 4;
      temp[idx] = r / count;
      temp[idx + 1] = g / count;
      temp[idx + 2] = b / count;
      temp[idx + 3] = data[idx + 3]!;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < height) {
          const idx = (ny * width + x) * 4;
          r += temp[idx]!;
          g += temp[idx + 1]!;
          b += temp[idx + 2]!;
          count++;
        }
      }

      const idx = (y * width + x) * 4;
      result[idx] = r / count;
      result[idx + 1] = g / count;
      result[idx + 2] = b / count;
      result[idx + 3] = temp[idx + 3]!;
    }
  }

  return { width, height, data: result };
}

/**
 * Edge Enhancement Sharpening
 * Automatically detects and enhances edges
 */
export function edgeEnhance(
  imageData: ProcessingImageData,
  strength: number = 1,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  // Laplacian kernel for edge detection
  const kernel = [
    [0, -1, 0],
    [-1, 4, -1],
    [0, -1, 0],
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            sum += data[idx + c]! * kernel[ky + 1]![kx + 1]!;
          }
        }

        const idx = (y * width + x) * 4;
        result[idx + c] = clamp(data[idx + c]! + sum * strength * 0.5);
      }

      const idx = (y * width + x) * 4;
      result[idx + 3] = data[idx + 3]!;
    }
  }

  return { width, height, data: result };
}

/**
 * Denoise using simple averaging
 * @param strength 0-100
 */
export function denoise(
  imageData: ProcessingImageData,
  strength: number = 30,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const radius = Math.max(1, Math.floor(strength / 20));
  const thresholdVal = strength * 2;

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const centerIdx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const centerValue = data[centerIdx + c]!;
        let sum = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const value = data[idx + c]!;

            if (Math.abs(value - centerValue) < thresholdVal) {
              sum += value;
              count++;
            }
          }
        }

        result[centerIdx + c] = count > 0 ? sum / count : centerValue;
      }

      result[centerIdx + 3] = data[centerIdx + 3]!;
    }
  }

  return { width, height, data: result };
}

/**
 * Auto Adjustment - Automatically adjusts levels based on histogram
 * Detects over/under exposed areas and corrects them
 */
export function autoAdjust(
  imageData: ProcessingImageData,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  // Build histogram
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(getGrayOnWhite(data, i));
    histogram[gray]++;
  }

  // Find min and max with 0.5% clipping
  const totalPixels = width * height;
  const clipAmount = Math.floor(totalPixels * 0.005);

  let minLevel = 0;
  let maxLevel = 255;
  let count = 0;

  for (let i = 0; i < 256; i++) {
    count += histogram[i] as number;
    if (count > clipAmount) {
      minLevel = i;
      break;
    }
  }

  count = 0;
  for (let i = 255; i >= 0; i--) {
    count += histogram[i] as number;
    if (count > clipAmount) {
      maxLevel = i;
      break;
    }
  }

  // Apply levels adjustment
  const range = maxLevel - minLevel;
  if (range > 0) {
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        result[i + c] = clamp(((data[i + c]! - minLevel) / range) * 255);
      }
      result[i + 3] = data[i + 3]!;
    }
  }

  return { width, height, data: result };
}

export function adjustLevels(
  imageData: ProcessingImageData,
  blackPoint: number,
  whitePoint: number,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const bp = clamp(Math.round(blackPoint), 0, 255);
  const wp = clamp(Math.round(whitePoint), 0, 255);
  const minLevel = Math.min(bp, wp);
  const maxLevel = Math.max(bp, wp);
  const range = Math.max(1, maxLevel - minLevel);

  if (minLevel === 0 && maxLevel === 255) {
    return { width, height, data: result };
  }

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      result[i + c] = clamp(((data[i + c]! - minLevel) / range) * 255);
    }
    result[i + 3] = data[i + 3]!;
  }

  return { width, height, data: result };
}

export function threshold(
  imageData: ProcessingImageData,
  thresholdValue: number = 128,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const t = clamp(Math.round(thresholdValue), 0, 255);

  for (let i = 0; i < data.length; i += 4) {
    const v = data[i]! < t ? 0 : 255;
    result[i] = v;
    result[i + 1] = v;
    result[i + 2] = v;
    result[i + 3] = data[i + 3]!;
  }

  return { width, height, data: result };
}

/**
 * Color Correction for Laser Engraving
 * Reduces very dark areas that lasers struggle with
 */
export function colorCorrection(
  imageData: ProcessingImageData,
  shadowLift: number = 20,
  highlightCompress: number = 10,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let value = data[i + c]!;

      // Lift shadows (values below 50)
      if (value < 50) {
        value = value + (50 - value) * (shadowLift / 100);
      }

      // Compress highlights (values above 230)
      if (value > 230) {
        value = 230 + (value - 230) * (1 - highlightCompress / 100);
      }

      result[i + c] = clamp(value);
    }
    result[i + 3] = data[i + 3]!;
  }

  return { width, height, data: result };
}

/**
 * Sketch effect - converts image to pencil sketch style
 */
export function sketchEffect(
  imageData: ProcessingImageData,
): ProcessingImageData {
  const { width, height, data } = imageData;

  // First convert to grayscale
  const gray = toGrayscale({ width, height, data });

  // Invert
  const inverted = invert(gray);

  // Blur the inverted image
  const blurred = boxBlur(inverted, 5);

  // Color dodge blend
  const result = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    const base = gray.data[i]!;
    const blend = blurred.data[i]!;

    // Color dodge: result = base / (255 - blend)
    let value: number;
    if (blend === 255) {
      value = 255;
    } else {
      value = clamp((base * 255) / (255 - blend));
    }

    result[i] = value;
    result[i + 1] = value;
    result[i + 2] = value;
    result[i + 3] = data[i + 3]!;
  }

  return { width, height, data: result };
}

export const adjustmentFunctions = {
  toGrayscale,
  adjustBrightness,
  adjustContrast,
  adjustGamma,
  invert,
  mirrorHorizontal,
  unsharpMask,
  edgeEnhance,
  denoise,
  autoAdjust,
  adjustLevels,
  threshold,
  colorCorrection,
  sketchEffect,
};
