<script lang="ts">
import {
  generateShapeMask,
  invertMask as invertMaskFn,
  predefinedMasks,
} from '../../../lib/imageProcessing/masking';

export let cachedImageData: ImageData | null = null;
export let active = false;
export let processedUrl: string | null = null;
export let maskX = 0.5;
export let maskY = 0.5;

let selectedMask = 'none';
let maskScale = 1.0;
let featherAmount = 0;
let invertMask = false;
let isProcessing = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function updatePreview() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generatePreview, 50);
}

function generatePreview() {
  if (!cachedImageData) return;

  if (selectedMask === 'none') {
    processedUrl = null;
    return;
  }

  try {
    const { width, height } = cachedImageData;

    // Build mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d')!;

    maskCtx.fillStyle = invertMask ? 'white' : 'black';
    maskCtx.fillRect(0, 0, width, height);

    const maskSize = Math.min(width, height) * maskScale;
    const shapeMaskSize = Math.round(maskSize);

    if (shapeMaskSize > 0) {
      let shapeMask = generateShapeMask(
        selectedMask,
        shapeMaskSize,
        shapeMaskSize,
      );
      if (invertMask) shapeMask = invertMaskFn(shapeMask);

      const shapeCanvas = document.createElement('canvas');
      shapeCanvas.width = shapeMaskSize;
      shapeCanvas.height = shapeMaskSize;
      shapeCanvas.getContext('2d')!.putImageData(shapeMask, 0, 0);

      const drawX = width * maskX - shapeMaskSize / 2;
      const drawY = height * maskY - shapeMaskSize / 2;
      maskCtx.drawImage(shapeCanvas, drawX, drawY);
    }

    let maskData = maskCtx.getImageData(0, 0, width, height);
    if (featherAmount > 0) {
      maskData = featherMaskData(maskData, Math.min(featherAmount, 10));
    }

    // Apply mask to image
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resultCtx = resultCanvas.getContext('2d')!;
    const resultData = resultCtx.createImageData(width, height);

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      resultData.data[idx] = cachedImageData.data[idx];
      resultData.data[idx + 1] = cachedImageData.data[idx + 1];
      resultData.data[idx + 2] = cachedImageData.data[idx + 2];
      resultData.data[idx + 3] = maskData.data[idx]; // red channel as alpha
    }

    resultCtx.putImageData(resultData, 0, 0);
    processedUrl = resultCanvas.toDataURL('image/png');
  } catch (e) {
    console.error('Preview error:', e);
  }
}

/** Simple box-blur feathering — fast enough for preview sizes */
function featherMaskData(maskData: ImageData, radius: number): ImageData {
  const { width, height, data } = maskData;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            sum += data[(py * width + px) * 4];
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

async function applyFullQuality() {
  if (!cachedImageData) return;
  isProcessing = true;
  try {
    const { width, height } = cachedImageData;
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d')!;

    maskCtx.fillStyle = invertMask ? 'white' : 'black';
    maskCtx.fillRect(0, 0, width, height);

    const maskSize = Math.min(width, height) * maskScale;
    const shapeMaskSize = Math.round(maskSize);
    if (shapeMaskSize > 0) {
      let shapeMask = generateShapeMask(
        selectedMask,
        shapeMaskSize,
        shapeMaskSize,
      );
      if (invertMask) shapeMask = invertMaskFn(shapeMask);
      const shapeCanvas = document.createElement('canvas');
      shapeCanvas.width = shapeMaskSize;
      shapeCanvas.height = shapeMaskSize;
      shapeCanvas.getContext('2d')!.putImageData(shapeMask, 0, 0);
      maskCtx.drawImage(
        shapeCanvas,
        width * maskX - shapeMaskSize / 2,
        height * maskY - shapeMaskSize / 2,
      );
    }

    let maskData = maskCtx.getImageData(0, 0, width, height);
    if (featherAmount > 0) maskData = featherMaskData(maskData, featherAmount);

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resultCtx = resultCanvas.getContext('2d')!;
    const resultData = resultCtx.createImageData(width, height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      resultData.data[idx] = cachedImageData.data[idx];
      resultData.data[idx + 1] = cachedImageData.data[idx + 1];
      resultData.data[idx + 2] = cachedImageData.data[idx + 2];
      resultData.data[idx + 3] = maskData.data[idx];
    }
    resultCtx.putImageData(resultData, 0, 0);
    processedUrl = resultCanvas.toDataURL('image/png');
  } catch (e) {
    console.error('Masking error:', e);
  } finally {
    isProcessing = false;
  }
}

export function reset() {
  selectedMask = 'none';
  maskScale = 1.0;
  featherAmount = 0;
  invertMask = false;
  maskX = 0.5;
  maskY = 0.5;
  processedUrl = null;
}

$: if (
  active &&
  cachedImageData &&
  (selectedMask !== undefined ||
    maskScale !== undefined ||
    featherAmount !== undefined ||
    invertMask !== undefined ||
    maskX !== undefined ||
    maskY !== undefined)
) {
  updatePreview();
}
</script>

<!-- Shape Selection -->
<div class="rounded-sm border border-border bg-surface-raised p-4">
  <h3 class="mb-4 text-sm font-medium">Shape</h3>
  <div class="grid grid-cols-3 gap-2">
    <button
      on:click={() => (selectedMask = 'none')}
      class="rounded-lg px-3 py-2 text-sm transition-colors {selectedMask === 'none' ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
    >
      None
    </button>
    {#each predefinedMasks as mask}
      <button
        on:click={() => (selectedMask = mask.id)}
        class="rounded-lg px-3 py-2 text-sm transition-colors {selectedMask === mask.id ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
      >
        {mask.name}
      </button>
    {/each}
  </div>
</div>

{#if selectedMask !== 'none'}
  <!-- Options -->
  <div class="rounded-sm border border-border bg-surface-raised p-4">
    <h3 class="mb-4 text-sm font-medium">Options</h3>
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between">
          <label for="s-mask-scale" class="text-xs text-ink-muted"
            >Mask Size</label
          >
          <span class="font-mono text-xs text-ink-muted"
            >{Math.round(maskScale * 100)}%</span
          >
        </div>
        <input
          id="s-mask-scale"
          type="range"
          min="0.1"
          max="1.5"
          step="0.05"
          bind:value={maskScale}
          class="mt-1 w-full accent-accent"
        >
      </div>
      <div>
        <div class="flex items-center justify-between">
          <label for="s-feather" class="text-xs text-ink-muted">Feather</label>
          <span class="font-mono text-xs text-ink-muted"
            >{featherAmount}px</span
          >
        </div>
        <input
          id="s-feather"
          type="range"
          min="0"
          max="50"
          bind:value={featherAmount}
          class="mt-1 w-full accent-accent"
        >
      </div>
      <button
        on:click={() => (invertMask = !invertMask)}
        class="w-full rounded-lg px-3 py-2 text-sm transition-colors {invertMask ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
      >
        Invert Mask
      </button>
    </div>
  </div>

  <p class="text-center text-xs text-ink-muted">
    Drag on the preview to position the mask
  </p>

  {#if featherAmount > 10}
    <button
      on:click={applyFullQuality}
      disabled={isProcessing}
      class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
    >
      {#if isProcessing}
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface"
        ></div>
        Applying full quality…
      {:else}
        Apply Full Quality
      {/if}
    </button>
    <p class="text-center text-xs text-ink-muted">
      Preview uses reduced feathering for speed
    </p>
  {/if}
{/if}
