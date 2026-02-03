/**
 * Image Masking Module
 *
 * Apply shape masks to images for creative laser engraving effects.
 * Supports predefined shapes and custom mask uploads.
 */

import { getGrayOnWhite } from './alpha';
import type { ProcessingImageData } from './types';

export interface MaskShape {
  id: string;
  name: string;
  path: string; // SVG path or predefined shape
}

export const predefinedMasks: MaskShape[] = [
  { id: 'circle', name: 'Circle', path: 'circle' },
  { id: 'heart', name: 'Heart', path: 'heart' },
  { id: 'star', name: 'Star', path: 'star' },
  { id: 'hexagon', name: 'Hexagon', path: 'hexagon' },
  { id: 'oval', name: 'Oval', path: 'oval' },
  { id: 'diamond', name: 'Diamond', path: 'diamond' },
  { id: 'rounded-rect', name: 'Rounded Rectangle', path: 'rounded-rect' },
  { id: 'triangle', name: 'Triangle', path: 'triangle' },
];

/**
 * Generate a shape mask as ImageData
 */
export function generateShapeMask(
  shapeId: string,
  width: number,
  height: number,
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Fill with black (transparent in mask)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Draw white shape (visible in mask)
  ctx.fillStyle = 'white';

  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width, height) * 0.45;

  switch (shapeId) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'heart':
      drawHeart(ctx, centerX, centerY, size);
      break;

    case 'star':
      drawStar(ctx, centerX, centerY, size, 5);
      break;

    case 'hexagon':
      drawPolygon(ctx, centerX, centerY, size, 6);
      break;

    case 'oval':
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, size, size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'diamond':
      drawDiamond(ctx, centerX, centerY, size);
      break;

    case 'rounded-rect': {
      const rectSize = size * 1.5;
      const radius = size * 0.2;
      roundedRect(
        ctx,
        centerX - rectSize / 2,
        centerY - rectSize / 2,
        rectSize,
        rectSize,
        radius,
      );
      ctx.fill();
      break;
    }

    case 'triangle':
      drawPolygon(ctx, centerX, centerY, size, 3, -Math.PI / 2);
      break;

    default:
      // Default to circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      ctx.fill();
  }

  return ctx.getImageData(0, 0, width, height);
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.beginPath();
  const topY = cy - size * 0.3;

  ctx.moveTo(cx, cy + size);

  // Left curve
  ctx.bezierCurveTo(
    cx - size * 1.5,
    cy,
    cx - size * 1.5,
    topY - size * 0.5,
    cx,
    topY,
  );

  // Right curve
  ctx.bezierCurveTo(
    cx + size * 1.5,
    topY - size * 0.5,
    cx + size * 1.5,
    cy,
    cx,
    cy + size,
  );

  ctx.fill();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  points: number,
) {
  ctx.beginPath();
  const innerRadius = size * 0.4;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? size : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fill();
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  sides: number,
  rotation: number = 0,
) {
  ctx.beginPath();

  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + rotation;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fill();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  // Diamond is taller than wide (classic playing card diamond shape)
  const halfWidth = size * 0.7;
  const halfHeight = size;

  ctx.beginPath();
  ctx.moveTo(cx, cy - halfHeight); // Top
  ctx.lineTo(cx + halfWidth, cy); // Right
  ctx.lineTo(cx, cy + halfHeight); // Bottom
  ctx.lineTo(cx - halfWidth, cy); // Left
  ctx.closePath();
  ctx.fill();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Apply mask to image
 * White in mask = visible, Black = transparent
 */
export function applyMask(
  imageData: ProcessingImageData,
  maskData: ImageData,
  maskPosition: { x: number; y: number; scale: number } = {
    x: 0,
    y: 0,
    scale: 1,
  },
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data.length);

  const scale = maskPosition.scale || 1;

  // Treat x/y as translation of the mask center (in image pixels)
  const centerX = width / 2 + maskPosition.x;
  const centerY = height / 2 + maskPosition.y;
  const maskCenterX = maskData.width / 2;
  const maskCenterY = maskData.height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Calculate mask coordinates
      const maskX = Math.round((x - centerX) / scale + maskCenterX);
      const maskY = Math.round((y - centerY) / scale + maskCenterY);

      let maskValue = 0;

      if (
        maskX >= 0
        && maskX < maskData.width
        && maskY >= 0
        && maskY < maskData.height
      ) {
        const maskIdx = (maskY * maskData.width + maskX) * 4;
        maskValue = maskData.data[maskIdx]!; // Use red channel as mask value
      }

      // Apply mask
      result[idx] = data[idx]!;
      result[idx + 1] = data[idx + 1]!;
      result[idx + 2] = data[idx + 2]!;
      result[idx + 3] = Math.round((data[idx + 3]! * maskValue) / 255);
    }
  }

  return { width, height, data: result };
}

/**
 * Create mask from uploaded image
 * Converts any image to a grayscale mask
 */
export async function createMaskFromImage(imageBlob: Blob): Promise<ImageData> {
  const img = await createImageBitmap(imageBlob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);

  // Convert to grayscale mask
  for (let i = 0; i < imageData.data.length; i += 4) {
    const gray = Math.round(getGrayOnWhite(imageData.data, i));
    imageData.data[i]! = gray;
    imageData.data[i + 1]! = gray;
    imageData.data[i + 2]! = gray;
    imageData.data[i + 3]! = 255;
  }

  return imageData;
}

/**
 * Invert mask colors
 */
export function invertMask(maskData: ImageData): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(maskData.data),
    maskData.width,
    maskData.height,
  );

  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i]! = 255 - result.data[i]!;
    result.data[i + 1]! = 255 - result.data[i + 1]!;
    result.data[i + 2]! = 255 - result.data[i + 2]!;
  }

  return result;
}

/**
 * Apply a predefined shape mask to an image
 */
export function applyShapeMask(
  imageData: ImageData,
  shapeId: string,
  options: { feather?: number; invert?: boolean } = {},
): ImageData {
  const { width, height } = imageData;
  const { feather = 0, invert = false } = options;

  // Generate the shape mask
  let maskData = generateShapeMask(shapeId, width, height);

  // Invert if requested
  if (invert) {
    maskData = invertMask(maskData);
  }

  // Apply feathering if requested
  if (feather > 0) {
    maskData = featherMaskEdges(maskData, feather);
  }

  // Apply mask to image
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    width,
    height,
  );

  for (let i = 0; i < imageData.data.length; i += 4) {
    const maskValue = maskData.data[i]!; // Use red channel
    result.data[i + 3] = Math.round((imageData.data[i + 3]! * maskValue) / 255);
  }

  return result;
}

/**
 * Feather mask edges with blur
 */
function featherMaskEdges(maskData: ImageData, radius: number): ImageData {
  const { width, height } = maskData;
  const result = new ImageData(
    new Uint8ClampedArray(maskData.data),
    width,
    height,
  );

  // Simple box blur for feathering
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = x + dx;
          const py = y + dy;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            sum += maskData.data[idx]!;
            count++;
          }
        }
      }

      const idx = (y * width + x) * 4;
      const avg = Math.round(sum / count);
      result.data[idx]! = avg;
      result.data[idx + 1]! = avg;
      result.data[idx + 2]! = avg;
    }
  }

  return result;
}
