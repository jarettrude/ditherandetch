/**
 * Background Removal Module
 *
 * Uses Transformers.js with RMBG-1.4 for high-quality client-side background removal.
 * RMBG-1.4 is specifically designed for background removal and handles fine details
 * like fur, hair, and complex edges much better than general segmentation models.
 *
 * All processing happens in the browser using WASM/WebGPU.
 */

import {
  AutoModel,
  AutoProcessor,
  RawImage,
  env,
} from '@huggingface/transformers';

// Configure transformers.js for browser usage
env.allowLocalModels = false;

export interface BackgroundRemovalOptions {
  model?: 'rmbg' | 'isnet';
  onProgress?: (progress: number) => void;
}

let model: any = null;

let processor: any = null;

/**
 * Get or create the model and processor
 */
async function getModel(onProgress?: (progress: number) => void) {
  if (!model || !processor) {
    const progressCallback =
      onProgress ?
        (data: { progress?: number }) => {
          if (typeof data.progress === 'number') {
            onProgress(data.progress);
          }
        }
      : undefined;

    model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
      // @ts-expect-error - progress_callback exists but types are incomplete
      progress_callback: progressCallback,
    });

    processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
      progress_callback: progressCallback,
    });
  }
  return { model, processor };
}

/**
 * Remove background from an image using RMBG-1.4
 * Returns a blob with transparent background
 */
export async function removeImageBackground(
  imageSource: Blob | string,
  options: BackgroundRemovalOptions = {},
): Promise<Blob> {
  const { model: segModel, processor: segProcessor } = await getModel(
    options.onProgress,
  );

  // Convert blob to data URL if needed
  let imageUrl: string;
  if (imageSource instanceof Blob) {
    imageUrl = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(imageSource);
    });
  } else {
    imageUrl = imageSource;
  }

  // Load image using standard Image element to get proper RGBA data
  const htmlImage = new Image();
  htmlImage.src = imageUrl;
  await new Promise(resolve => {
    htmlImage.onload = resolve;
  });

  // Get original image data via canvas (guaranteed RGBA format)
  const origCanvas = document.createElement('canvas');
  origCanvas.width = htmlImage.width;
  origCanvas.height = htmlImage.height;
  const origCtx = origCanvas.getContext('2d')!;
  origCtx.drawImage(htmlImage, 0, 0);
  const originalImageData = origCtx.getImageData(
    0,
    0,
    htmlImage.width,
    htmlImage.height,
  );

  // Load image for model processing
  const image = await RawImage.fromURL(imageUrl);
  const { pixel_values } = await segProcessor(image);

  // Run model
  const { output } = await segModel({ input: pixel_values });

  // Post-process mask - resize to original image dimensions
  const maskRaw = await RawImage.fromTensor(
    output[0].mul(255).to('uint8'),
  ).resize(htmlImage.width, htmlImage.height);

  // Create output with transparency
  const canvas = document.createElement('canvas');
  canvas.width = htmlImage.width;
  canvas.height = htmlImage.height;
  const ctx = canvas.getContext('2d')!;

  // Apply mask to original image data
  const imgData = ctx.createImageData(htmlImage.width, htmlImage.height);
  const maskChannels = maskRaw.channels;

  for (let i = 0; i < htmlImage.width * htmlImage.height; i++) {
    const idx = i * 4;
    // Copy RGB from original image
    imgData.data[idx] = originalImageData.data[idx]!; // R
    imgData.data[idx + 1] = originalImageData.data[idx + 1]!; // G
    imgData.data[idx + 2] = originalImageData.data[idx + 2]!; // B
    // Get mask value - handle different channel counts
    const maskValue =
      maskChannels === 1 ? maskRaw.data[i]! : maskRaw.data[i * maskChannels]!;
    imgData.data[idx + 3] = maskValue; // A from mask
  }

  ctx.putImageData(imgData, 0, 0);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/png');
  });
}

/**
 * Get the mask from background removal
 * Returns a black/white mask blob
 */
export async function getBackgroundMask(
  imageSource: Blob | string,
  options: BackgroundRemovalOptions = {},
): Promise<Blob> {
  const { model: segModel, processor: segProcessor } = await getModel(
    options.onProgress,
  );

  let imageUrl: string;
  if (imageSource instanceof Blob) {
    imageUrl = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(imageSource);
    });
  } else {
    imageUrl = imageSource;
  }

  // Load image to get dimensions
  const htmlImage = new Image();
  htmlImage.src = imageUrl;
  await new Promise(resolve => {
    htmlImage.onload = resolve;
  });

  const image = await RawImage.fromURL(imageUrl);
  const { pixel_values } = await segProcessor(image);
  const { output } = await segModel({ input: pixel_values });

  const maskData = await RawImage.fromTensor(
    output[0].mul(255).to('uint8'),
  ).resize(htmlImage.width, htmlImage.height);

  const canvas = document.createElement('canvas');
  canvas.width = htmlImage.width;
  canvas.height = htmlImage.height;
  const ctx = canvas.getContext('2d')!;

  const maskChannels = maskData.channels;
  const imgData = ctx.createImageData(htmlImage.width, htmlImage.height);
  for (let i = 0; i < htmlImage.width * htmlImage.height; i++) {
    const idx = i * 4;
    // Get mask value - handle different channel counts
    const value =
      maskChannels === 1 ? maskData.data[i]! : maskData.data[i * maskChannels]!;
    imgData.data[idx] = value;
    imgData.data[idx + 1] = value;
    imgData.data[idx + 2] = value;
    imgData.data[idx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/png');
  });
}

/**
 * Apply a custom mask to an image
 * White areas in mask = keep, Black areas = remove
 */
export function applyMaskToImage(
  imageData: ImageData,
  maskData: ImageData,
  invert: boolean = false,
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  );

  for (let i = 0; i < imageData.data.length; i += 4) {
    // Get mask value (grayscale)
    const maskValue = maskData.data[i]!;

    // Apply mask to alpha channel
    const alpha = invert ? 255 - maskValue : maskValue;
    result.data[i + 3] = Math.min(result.data[i + 3]!, alpha);
  }

  return result;
}

/**
 * Refine mask with brush strokes
 * Used for manual mask editing
 */
export function refineMask(
  maskData: ImageData,
  x: number,
  y: number,
  radius: number,
  value: number, // 0 = remove, 255 = keep
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(maskData.data),
    maskData.width,
    maskData.height,
  );

  const radiusSq = radius * radius;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radiusSq) {
        const px = x + dx;
        const py = y + dy;

        if (px >= 0 && px < maskData.width && py >= 0 && py < maskData.height) {
          const idx = (py * maskData.width + px) * 4;

          // Soft brush falloff
          const distance = Math.sqrt(dx * dx + dy * dy);
          const falloff = 1 - distance / radius;
          const blendValue = Math.round(
            value * falloff + result.data[idx]! * (1 - falloff),
          );

          result.data[idx] = blendValue;
          result.data[idx + 1] = blendValue;
          result.data[idx + 2] = blendValue;
          result.data[idx + 3] = 255;
        }
      }
    }
  }

  return result;
}

/**
 * Feather/blur mask edges for smoother transitions
 */
export function featherMask(maskData: ImageData, radius: number): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(maskData.data),
    maskData.width,
    maskData.height,
  );

  const { width, height } = maskData;

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
      result.data[idx] = avg;
      result.data[idx + 1] = avg;
      result.data[idx + 2] = avg;
    }
  }

  return result;
}
