<script lang="ts">
import { sanitizeRgbaForExport } from '../../../lib/imageProcessing/alpha';
import {
  applyPreset,
  dpiOptions,
  presets,
} from '../../../lib/imageProcessing/presets';

export let imageUrl: string | null = null;
export let imageSize = { width: 0, height: 0 };
export let processedUrl: string | null = null;

let targetSize = { width: 0, height: 0, dpi: 254 };
let selectedPreset = 'photoRealism';
let isProcessing = false;

const presetList = Object.values(presets);

function syncTargetSize(w: number, h: number) {
  targetSize = { ...targetSize, width: w, height: h };
}

function updateWidth(e: Event) {
  const w = parseInt((e.target as HTMLInputElement).value, 10) || 0;
  if (imageSize.width === 0 || imageSize.height === 0) {
    targetSize.width = w;
    return;
  }
  const h = Math.round(w / (imageSize.width / imageSize.height));
  targetSize = { ...targetSize, width: w, height: h };
}

function updateHeight(e: Event) {
  const h = parseInt((e.target as HTMLInputElement).value, 10) || 0;
  const w = Math.round(h * (imageSize.width / imageSize.height));
  targetSize = { ...targetSize, width: w, height: h };
}

async function processImage() {
  if (!imageUrl) return;
  isProcessing = true;

  try {
    const img = new Image();
    img.src = imageUrl;
    await new Promise(resolve => (img.onload = resolve));

    const canvas = document.createElement('canvas');
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, targetSize.width, targetSize.height);
    const imageData = ctx.getImageData(
      0,
      0,
      targetSize.width,
      targetSize.height,
    );

    const result = applyPreset(
      {
        width: imageData.width,
        height: imageData.height,
        data: imageData.data,
      },
      selectedPreset,
    );

    const resultImageData = new ImageData(
      sanitizeRgbaForExport(result.data),
      result.width,
      result.height,
    );
    ctx.putImageData(resultImageData, 0, 0);
    processedUrl = canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Processing error:', error);
  } finally {
    isProcessing = false;
  }
}

export function reset() {
  targetSize = { width: imageSize.width, height: imageSize.height, dpi: 254 };
  selectedPreset = 'photoRealism';
  processedUrl = null;
}

let lastSyncedWidth = 0;
let lastSyncedHeight = 0;

// Sync target size when image changes in pipeline
$: if (
  imageSize.width > 0 &&
  (imageSize.width !== lastSyncedWidth || imageSize.height !== lastSyncedHeight)
) {
  lastSyncedWidth = imageSize.width;
  lastSyncedHeight = imageSize.height;
  syncTargetSize(imageSize.width, imageSize.height);
}

$: physicalWidth = ((targetSize.width / targetSize.dpi) * 25.4).toFixed(1);
$: physicalHeight = ((targetSize.height / targetSize.dpi) * 25.4).toFixed(1);
$: currentPreset = presets[selectedPreset];
</script>

<!-- Output Size -->
<div class="rounded-sm border border-border bg-surface-raised p-4">
  <h3 class="mb-4 text-sm font-medium">Output Size</h3>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="s-dith-w" class="text-xs text-ink-muted">Width (px)</label>
        <input
          id="s-dith-w"
          type="number"
          value={targetSize.width}
          on:input={updateWidth}
          class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
      </div>
      <div>
        <label for="s-dith-h" class="text-xs text-ink-muted">Height (px)</label>
        <input
          id="s-dith-h"
          type="number"
          value={targetSize.height}
          on:input={updateHeight}
          class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
      </div>
    </div>
    <div>
      <label for="s-dpi" class="text-xs text-ink-muted">DPI</label>
      <select
        id="s-dpi"
        bind:value={targetSize.dpi}
        class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      >
        {#each dpiOptions as opt}
          <option value={opt.value}>{opt.label} (dot: {opt.dotSize})</option>
        {/each}
      </select>
    </div>
    <div class="rounded-lg bg-surface p-3 text-sm">
      <p class="text-ink-muted">Physical size:</p>
      <p class="font-mono">{physicalWidth}mm × {physicalHeight}mm</p>
    </div>
  </div>
</div>

<!-- Preset Selection -->
<div class="rounded-sm border border-border bg-surface-raised p-4">
  <h3 class="mb-4 text-sm font-medium">Style Preset</h3>
  <div class="max-h-[300px] space-y-2 overflow-y-auto">
    {#each presetList as preset}
      <button
        on:click={() => (selectedPreset = preset.id)}
        class="w-full rounded-lg p-3 text-left text-sm transition-colors {selectedPreset === preset.id ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
      >
        <div class="font-medium">{preset.name}</div>
        <div class="mt-0.5 text-xs opacity-80">{preset.description}</div>
      </button>
    {/each}
  </div>
  {#if currentPreset}
    <div class="mt-4 rounded-lg bg-surface p-3 text-xs text-ink-muted">
      <strong class="text-ink">Tip:</strong>
      {currentPreset.tip}
    </div>
  {/if}
</div>

<!-- Apply -->
<button
  on:click={processImage}
  disabled={isProcessing || targetSize.width === 0}
  class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
>
  {#if isProcessing}
    <div
      class="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface"
    ></div>
    Processing…
  {:else}
    Apply Dither
  {/if}
</button>
