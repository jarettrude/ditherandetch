/**
 * Background Removal Module
 *
 * Uses Transformers.js with BiRefNet_lite (MIT license) for client-side background removal.
 * BiRefNet uses bilateral reference for high-resolution dichotomous image segmentation,
 * providing clean subject/background separation suitable for laser engraving prep.
 *
 * All processing happens in the browser using WASM/WebGPU.
 */

export interface BackgroundRemovalOptions {
  onProgress?: (progress: number) => void;
}

let transformersModule: typeof import('@huggingface/transformers') | null =
  null;
let model: any = null;
let processor: any = null;

async function getTransformers() {
  if (!transformersModule) {
    transformersModule = await import('@huggingface/transformers');
    transformersModule.env.allowLocalModels = false;
  }
  return transformersModule;
}

/**
 * Get or create the model, processor, and RawImage utility
 */
async function getModel(onProgress?: (progress: number) => void) {
  const { AutoModel, AutoProcessor, RawImage } = await getTransformers();

  if (!model || !processor) {
    const modelId = 'studioludens/birefnet-lite-512';

    const progressCallback = onProgress
      ? (data: { progress?: number }) => {
          if (typeof data.progress === 'number') {
            onProgress(data.progress);
          }
        }
      : undefined;

    // Use WASM backend directly for robust compatibility across Safari, Chrome, and Firefox
    model = await AutoModel.from_pretrained(modelId, {
      device: 'wasm',
      // @ts-expect-error - progress_callback exists but types are incomplete
      progress_callback: progressCallback,
    });

    processor = await AutoProcessor.from_pretrained(modelId, {
      progress_callback: progressCallback,
    });
  }
  return { model, processor, RawImage };
}

/**
 * Remove background from an image using BiRefNet_lite
 * Returns a blob with transparent background
 */
export async function removeImageBackground(
  imageSource: Blob | string,
  options: BackgroundRemovalOptions = {},
): Promise<Blob> {
  const {
    model: segModel,
    processor: segProcessor,
    RawImage,
  } = await getModel(options.onProgress);

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

  const htmlImage = new Image();
  htmlImage.src = imageUrl;
  await new Promise(resolve => {
    htmlImage.onload = resolve;
  });

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

  const image = await RawImage.fromURL(imageUrl);
  const { pixel_values } = await segProcessor(image);

  const { output_image } = await segModel({ input_image: pixel_values });

  const maskRaw = await RawImage.fromTensor(
    output_image[0].sigmoid().mul(255).to('uint8'),
  ).resize(htmlImage.width, htmlImage.height);

  const canvas = document.createElement('canvas');
  canvas.width = htmlImage.width;
  canvas.height = htmlImage.height;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(htmlImage.width, htmlImage.height);
  const maskChannels = maskRaw.channels;

  for (let i = 0; i < htmlImage.width * htmlImage.height; i++) {
    const idx = i * 4;
    imgData.data[idx] = originalImageData.data[idx]!;
    imgData.data[idx + 1] = originalImageData.data[idx + 1]!;
    imgData.data[idx + 2] = originalImageData.data[idx + 2]!;
    const maskValue =
      maskChannels === 1 ? maskRaw.data[i]! : maskRaw.data[i * maskChannels]!;
    imgData.data[idx + 3] = maskValue;
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
  const {
    model: segModel,
    processor: segProcessor,
    RawImage,
  } = await getModel(options.onProgress);

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

  const htmlImage = new Image();
  htmlImage.src = imageUrl;
  await new Promise(resolve => {
    htmlImage.onload = resolve;
  });

  const image = await RawImage.fromURL(imageUrl);
  const { pixel_values } = await segProcessor(image);
  const { output_image } = await segModel({ input_image: pixel_values });

  const maskData = await RawImage.fromTensor(
    output_image[0].sigmoid().mul(255).to('uint8'),
  ).resize(htmlImage.width, htmlImage.height);

  const canvas = document.createElement('canvas');
  canvas.width = htmlImage.width;
  canvas.height = htmlImage.height;
  const ctx = canvas.getContext('2d')!;

  const maskChannels = maskData.channels;
  const imgData = ctx.createImageData(htmlImage.width, htmlImage.height);
  for (let i = 0; i < htmlImage.width * htmlImage.height; i++) {
    const idx = i * 4;
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
    const maskValue = maskData.data[i]!;

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
  value: number,
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
