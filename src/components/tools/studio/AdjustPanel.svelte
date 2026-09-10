<script lang="ts">
import * as adj from '../../../lib/imageProcessing/adjustments';
import { sanitizeRgbaForExport } from '../../../lib/imageProcessing/alpha';
import type { ProcessingImageData } from '../../../lib/imageProcessing/types';

export let cachedImageData: ImageData | null = null;
export let active = false;
export let processedUrl: string | null = null;

let brightness = 0;
let contrast = 0;
let gamma = 1.0;
let sharpen = 0;
let invert = false;
let mirror = false;
let isProcessing = false;
let isUpToDate = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

$: hasChanges =
  brightness !== 0 ||
  contrast !== 0 ||
  gamma !== 1.0 ||
  sharpen > 0 ||
  invert ||
  mirror;

function buildResult(): ProcessingImageData {
  let r: ProcessingImageData = {
    width: cachedImageData!.width,
    height: cachedImageData!.height,
    data: new Uint8ClampedArray(cachedImageData!.data),
  };
  if (brightness !== 0) r = adj.adjustBrightness(r, brightness);
  if (contrast !== 0) r = adj.adjustContrast(r, contrast);
  if (gamma !== 1.0) r = adj.adjustGamma(r, gamma);
  if (sharpen > 0) r = adj.unsharpMask(r, 1, sharpen);
  if (invert) r = adj.invert(r);
  if (mirror) r = adj.mirrorHorizontal(r);
  return r;
}

function toDataUrl(r: ProcessingImageData): string {
  const c = document.createElement('canvas');
  c.width = r.width;
  c.height = r.height;
  const ctx = c.getContext('2d')!;
  ctx.putImageData(
    new ImageData(sanitizeRgbaForExport(r.data), r.width, r.height),
    0,
    0,
  );
  return c.toDataURL('image/png');
}

function updatePreview() {
  if (debounceTimer) clearTimeout(debounceTimer);
  isProcessing = true;
  isUpToDate = false;

  debounceTimer = setTimeout(() => {
    if (!cachedImageData) {
      isProcessing = false;
      return;
    }
    try {
      if (!hasChanges) {
        processedUrl = null;
      } else {
        processedUrl = toDataUrl(buildResult());
      }
      isUpToDate = true;
    } catch (e) {
      console.error('Preview error:', e);
    } finally {
      isProcessing = false;
    }
  }, 100);
}

export function reset() {
  brightness = 0;
  contrast = 0;
  gamma = 1.0;
  sharpen = 0;
  invert = false;
  mirror = false;
  processedUrl = null;
  isProcessing = false;
  isUpToDate = false;
}

$: if (
  active &&
  cachedImageData &&
  (brightness !== undefined ||
    contrast !== undefined ||
    gamma !== undefined ||
    sharpen !== undefined ||
    invert !== undefined ||
    mirror !== undefined)
) {
  updatePreview();
}
</script>

<!-- Adjustments -->
<div class="rounded-sm border border-border bg-surface-raised p-4">
  <div class="mb-4 flex items-center justify-between">
    <h3 class="text-sm font-medium">Adjustments</h3>
    {#if isProcessing}
      <span class="flex items-center gap-1.5 text-xs text-accent">
        <div
          class="h-3 w-3 animate-spin rounded-full border border-accent/30 border-t-accent"
        ></div>
        Updating…
      </span>
    {:else if isUpToDate && hasChanges}
      <span class="flex items-center gap-1 text-xs text-green-500">
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Applied
      </span>
    {/if}
  </div>

  <div class="space-y-4">
    <div>
      <div class="flex items-center justify-between">
        <label for="s-brightness" class="text-xs text-ink-muted"
          >Brightness</label
        >
        <span class="font-mono text-xs text-ink-muted">{brightness}</span>
      </div>
      <input
        id="s-brightness"
        type="range"
        min="-100"
        max="100"
        bind:value={brightness}
        class="mt-1 w-full accent-accent"
      >
    </div>
    <div>
      <div class="flex items-center justify-between">
        <label for="s-contrast" class="text-xs text-ink-muted">Contrast</label>
        <span class="font-mono text-xs text-ink-muted">{contrast}</span>
      </div>
      <input
        id="s-contrast"
        type="range"
        min="-100"
        max="100"
        bind:value={contrast}
        class="mt-1 w-full accent-accent"
      >
    </div>
    <div>
      <div class="flex items-center justify-between">
        <label for="s-gamma" class="text-xs text-ink-muted">Gamma</label>
        <span class="font-mono text-xs text-ink-muted">{gamma.toFixed(2)}</span>
      </div>
      <input
        id="s-gamma"
        type="range"
        min="0.1"
        max="3"
        step="0.05"
        bind:value={gamma}
        class="mt-1 w-full accent-accent"
      >
    </div>
    <div>
      <div class="flex items-center justify-between">
        <label for="s-sharpen" class="text-xs text-ink-muted">Sharpen</label>
        <span class="font-mono text-xs text-ink-muted">{sharpen}%</span>
      </div>
      <input
        id="s-sharpen"
        type="range"
        min="0"
        max="200"
        bind:value={sharpen}
        class="mt-1 w-full accent-accent"
      >
    </div>
  </div>
</div>

<!-- Transform -->
<div class="rounded-sm border border-border bg-surface-raised p-4">
  <h3 class="mb-4 text-sm font-medium">Transform</h3>
  <div class="flex gap-2">
    <button
      on:click={() => (invert = !invert)}
      class="flex-1 rounded-lg px-3 py-2 text-sm transition-colors {invert ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
    >
      Invert
    </button>
    <button
      on:click={() => (mirror = !mirror)}
      class="flex-1 rounded-lg px-3 py-2 text-sm transition-colors {mirror ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
    >
      Mirror
    </button>
  </div>
</div>
