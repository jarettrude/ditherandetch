<script lang="ts">
import { sanitizeRgbaForExport } from '../../../lib/imageProcessing/alpha';
import {
  cannyEdgeDetection,
  extractContours,
} from '../../../lib/imageProcessing/contour';
import type { ProcessingImageData } from '../../../lib/imageProcessing/types';

export let cachedImageData: ImageData | null = null;
export let active = false;
export let processedUrl: string | null = null;

type ContourMode = 'none' | 'simple' | 'canny';

let mode: ContourMode = 'none';
let threshold = 128;
let invertOutput = false;
let cannyLow = 50;
let cannyHigh = 150;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function updatePreview() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generatePreview, 100);
}

function generatePreview() {
  if (!cachedImageData) return;

  if (mode === 'none') {
    processedUrl = null;
    return;
  }

  try {
    const input: ProcessingImageData = {
      width: cachedImageData.width,
      height: cachedImageData.height,
      data: new Uint8ClampedArray(cachedImageData.data),
    };

    let result: ProcessingImageData;
    if (mode === 'canny') {
      result = cannyEdgeDetection(input, cannyLow, cannyHigh);
    } else {
      result = extractContours(input, threshold);
    }

    if (invertOutput) {
      for (let i = 0; i < result.data.length; i += 4) {
        result.data[i] = 255 - result.data[i];
        result.data[i + 1] = 255 - result.data[i + 1];
        result.data[i + 2] = 255 - result.data[i + 2];
      }
    }

    const c = document.createElement('canvas');
    c.width = result.width;
    c.height = result.height;
    const ctx = c.getContext('2d')!;
    ctx.putImageData(
      new ImageData(
        sanitizeRgbaForExport(result.data),
        result.width,
        result.height,
      ),
      0,
      0,
    );
    processedUrl = c.toDataURL('image/png');
  } catch (e) {
    console.error('Preview error:', e);
  }
}

export function reset() {
  mode = 'none';
  threshold = 128;
  invertOutput = false;
  cannyLow = 50;
  cannyHigh = 150;
  processedUrl = null;
}

$: if (
  active &&
  cachedImageData &&
  (mode !== undefined ||
    threshold !== undefined ||
    cannyLow !== undefined ||
    cannyHigh !== undefined ||
    invertOutput !== undefined)
) {
  updatePreview();
}
</script>

<!-- Detection Method -->
<div class="rounded-sm border border-border bg-surface-raised p-4">
  <h3 class="mb-4 text-sm font-medium">Detection Method</h3>
  <div class="grid grid-cols-3 gap-2">
    <button
      on:click={() => (mode = 'none')}
      class="rounded-lg px-3 py-2 text-sm transition-colors {mode === 'none' ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
    >
      None
    </button>
    <button
      on:click={() => (mode = 'simple')}
      class="rounded-lg px-3 py-2 text-sm transition-colors {mode === 'simple' ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
    >
      Simple
    </button>
    <button
      on:click={() => (mode = 'canny')}
      class="rounded-lg px-3 py-2 text-sm transition-colors {mode === 'canny' ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
    >
      Canny
    </button>
  </div>
</div>

{#if mode !== 'none'}
  <!-- Settings -->
  <div class="rounded-sm border border-border bg-surface-raised p-4">
    <h3 class="mb-4 text-sm font-medium">Settings</h3>
    <div class="space-y-4">
      {#if mode === 'canny'}
        <div>
          <div class="flex items-center justify-between">
            <label for="s-canny-low" class="text-xs text-ink-muted"
              >Low Threshold</label
            >
            <span class="font-mono text-xs text-ink-muted">{cannyLow}</span>
          </div>
          <input
            id="s-canny-low"
            type="range"
            min="10"
            max="100"
            bind:value={cannyLow}
            class="mt-1 w-full accent-accent"
          >
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label for="s-canny-high" class="text-xs text-ink-muted"
              >High Threshold</label
            >
            <span class="font-mono text-xs text-ink-muted">{cannyHigh}</span>
          </div>
          <input
            id="s-canny-high"
            type="range"
            min="50"
            max="255"
            bind:value={cannyHigh}
            class="mt-1 w-full accent-accent"
          >
        </div>
      {:else}
        <div>
          <div class="flex items-center justify-between">
            <label for="s-threshold" class="text-xs text-ink-muted"
              >Threshold</label
            >
            <span class="font-mono text-xs text-ink-muted">{threshold}</span>
          </div>
          <input
            id="s-threshold"
            type="range"
            min="1"
            max="255"
            bind:value={threshold}
            class="mt-1 w-full accent-accent"
          >
        </div>
      {/if}
      <button
        on:click={() => (invertOutput = !invertOutput)}
        class="w-full rounded-lg px-3 py-2 text-sm transition-colors {invertOutput ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
      >
        Invert Output
      </button>
    </div>
  </div>
{/if}
