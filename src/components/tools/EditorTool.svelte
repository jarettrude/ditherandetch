<script lang="ts">
  import { normalizeImageFile, IMAGE_ACCEPT } from '../../lib/imageFiles';
  import * as adjustments from '../../lib/imageProcessing/adjustments';
  import { sanitizeRgbaForExport } from '../../lib/imageProcessing/alpha';
  import type { ProcessingImageData } from '../../lib/imageProcessing/types';

  let imageFile: File | null = null;
  let imageUrl: string | null = null;
  let processedUrl: string | null = null;
  let isProcessing = false;
  let imageSize = { width: 0, height: 0 };
  let fileInput: HTMLInputElement;
  let errorMessage = '';
  let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let cachedImageData: ImageData | null = null;

  let brightness = 0;
  let contrast = 0;
  let gamma = 1.0;
  let sharpen = 0;
  let invert = false;
  let mirror = false;

  function handleFile(file: File) {
    normalizeImageFile(file)
      .then(normalized => {
        imageFile = normalized;
        imageUrl = URL.createObjectURL(normalized);
        loadImageSize(imageUrl);
      })
      .catch(() => {
        imageFile = file;
        imageUrl = URL.createObjectURL(file);
        loadImageSize(imageUrl);
      });
  }

  async function loadImageSize(url: string) {
    const img = new Image();
    img.onload = async () => {
      imageSize = { width: img.width, height: img.height };
      processedUrl = null;

      // Cache the image data for live preview
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      cachedImageData = ctx.getImageData(0, 0, img.width, img.height);
    };
    img.src = url;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      handleFile(file);
      input.value = '';
    }
  }

  function updatePreview() {
    if (previewDebounceTimer) {
      clearTimeout(previewDebounceTimer);
    }
    previewDebounceTimer = setTimeout(() => {
      generatePreview();
    }, 50);
  }

  async function generatePreview() {
    if (!cachedImageData) return;

    try {
      let result: ProcessingImageData = {
        width: cachedImageData.width,
        height: cachedImageData.height,
        data: new Uint8ClampedArray(cachedImageData.data),
      };

      if (brightness !== 0) {
        result = adjustments.adjustBrightness(result, brightness);
      }
      if (contrast !== 0) {
        result = adjustments.adjustContrast(result, contrast);
      }
      if (gamma !== 1.0) {
        result = adjustments.adjustGamma(result, gamma);
      }
      // Skip sharpen for preview (expensive operation)
      if (invert) {
        result = adjustments.invert(result);
      }
      if (mirror) {
        result = adjustments.mirrorHorizontal(result);
      }

      const canvas = document.createElement('canvas');
      canvas.width = result.width;
      canvas.height = result.height;
      const ctx = canvas.getContext('2d')!;
      const resultImageData = new ImageData(
        sanitizeRgbaForExport(result.data),
        result.width,
        result.height,
      );
      ctx.putImageData(resultImageData, 0, 0);
      processedUrl = canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Preview error:', error);
    }
  }

  async function applyAdjustments() {
    if (!cachedImageData) return;
    isProcessing = true;
    errorMessage = '';

    try {
      let result: ProcessingImageData = {
        width: cachedImageData.width,
        height: cachedImageData.height,
        data: new Uint8ClampedArray(cachedImageData.data),
      };

      if (brightness !== 0) {
        result = adjustments.adjustBrightness(result, brightness);
      }
      if (contrast !== 0) {
        result = adjustments.adjustContrast(result, contrast);
      }
      if (gamma !== 1.0) {
        result = adjustments.adjustGamma(result, gamma);
      }
      if (sharpen > 0) {
        result = adjustments.unsharpMask(result, 1, sharpen);
      }
      if (invert) {
        result = adjustments.invert(result);
      }
      if (mirror) {
        result = adjustments.mirrorHorizontal(result);
      }

      const canvas = document.createElement('canvas');
      canvas.width = result.width;
      canvas.height = result.height;
      const ctx = canvas.getContext('2d')!;
      const resultImageData = new ImageData(
        sanitizeRgbaForExport(result.data),
        result.width,
        result.height,
      );
      ctx.putImageData(resultImageData, 0, 0);
      processedUrl = canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Processing error:', error);
      errorMessage =
        error instanceof Error ?
          error.message
        : 'Failed to apply adjustments. Please try again.';
    } finally {
      isProcessing = false;
    }
  }

  function downloadImage() {
    if (!processedUrl) return;
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = processedUrl;
    link.click();
  }

  function reset() {
    brightness = 0;
    contrast = 0;
    gamma = 1.0;
    sharpen = 0;
    invert = false;
    mirror = false;
    processedUrl = null;
  }

  function changeImage() {
    imageFile = null;
    imageUrl = null;
    processedUrl = null;
    cachedImageData = null;
    reset();
    requestAnimationFrame(() => fileInput?.click());
  }

  $: hasChanges =
    brightness !== 0
    || contrast !== 0
    || gamma !== 1.0
    || sharpen > 0
    || invert
    || mirror;

  // Reactive live preview when settings change
  $: if (
    cachedImageData
    && (brightness !== undefined
      || contrast !== undefined
      || gamma !== undefined
      || invert !== undefined
      || mirror !== undefined)
  ) {
    updatePreview();
  }
</script>

<div class="mx-auto max-w-6xl">
  <input
    bind:this={fileInput}
    type="file"
    accept={IMAGE_ACCEPT}
    on:change={handleInputChange}
    class="hidden"
  />

  <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <!-- Main Content Area -->
    <div class="space-y-6 lg:col-span-2">
      {#if !imageUrl}
        <!-- Upload Area -->
        <button
          type="button"
          on:click={() => fileInput?.click()}
          on:drop={handleDrop}
          on:dragover={e => e.preventDefault()}
          class="flex w-full flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-surface-raised p-12 transition-colors hover:border-accent/40"
        >
          <div
            class="mb-4 flex h-16 w-16 items-center justify-center rounded-sm bg-accent/10 text-accent"
          >
            <svg
              class="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <p class="text-lg font-medium">Drop an image here</p>
          <p class="mt-1 text-sm text-ink-muted">or click to browse</p>
          <p class="mt-4 text-xs text-ink-muted">
            Supports JPG, PNG, WebP, HEIC
          </p>
        </button>
      {:else}
        <!-- Image Preview -->
        <div
          class="overflow-hidden rounded-sm border border-border bg-surface-raised"
        >
          <div
            class="flex items-center justify-between border-b border-border p-4"
          >
            <div class="flex items-center gap-3">
              <button
                on:click={reset}
                disabled={!hasChanges}
                class="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-raised disabled:opacity-50"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset
              </button>
              <button
                on:click={changeImage}
                class="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-raised"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Change
              </button>
            </div>
            <div class="text-sm text-ink-muted">
              {imageSize.width} × {imageSize.height}px
            </div>
          </div>

          <div
            class="relative flex h-[400px] items-center justify-center overflow-hidden lg:h-[500px]"
            style="background-image: linear-gradient(45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(-45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-surface) 75%), linear-gradient(-45deg, transparent 75%, var(--color-surface) 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; background-color: var(--color-surface-raised);"
          >
            <img
              src={processedUrl || imageUrl}
              alt="Preview"
              class="max-h-full max-w-full object-contain"
            />
          </div>

          {#if processedUrl}
            <div class="border-t border-border p-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="mb-2 text-xs text-ink-muted">Original</p>
                  <div class="relative aspect-4/3 overflow-hidden rounded-lg">
                    <img
                      src={imageUrl}
                      alt="Original"
                      class="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <div>
                  <p class="mb-2 text-xs text-ink-muted">Edited</p>
                  <div class="relative aspect-4/3 overflow-hidden rounded-lg">
                    <img
                      src={processedUrl}
                      alt="Edited"
                      class="h-full w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Sidebar Controls -->
    <div class="space-y-4">
      {#if imageUrl}
        <!-- Error Message -->
        {#if errorMessage}
          <div
            class="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
          >
            <p class="font-medium">Error</p>
            <p class="mt-1 text-xs">{errorMessage}</p>
            <button
              on:click={() => (errorMessage = '')}
              class="mt-2 text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        {/if}

        <!-- Adjustment Controls -->
        <div class="rounded-sm border border-border bg-surface-raised p-4">
          <h2 class="mb-4 flex items-center gap-2 text-base font-medium">
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            Adjustments
          </h2>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between">
                <label for="brightness-slider" class="text-xs text-ink-muted"
                  >Brightness</label
                >
                <span class="text-xs font-mono text-ink-muted"
                  >{brightness}</span
                >
              </div>
              <input
                id="brightness-slider"
                type="range"
                min="-100"
                max="100"
                bind:value={brightness}
                class="mt-1 w-full accent-accent"
              />
            </div>
            <div>
              <div class="flex items-center justify-between">
                <label for="contrast-slider" class="text-xs text-ink-muted"
                  >Contrast</label
                >
                <span class="text-xs font-mono text-ink-muted">{contrast}</span>
              </div>
              <input
                id="contrast-slider"
                type="range"
                min="-100"
                max="100"
                bind:value={contrast}
                class="mt-1 w-full accent-accent"
              />
            </div>
            <div>
              <div class="flex items-center justify-between">
                <label for="gamma-slider" class="text-xs text-ink-muted"
                  >Gamma</label
                >
                <span class="text-xs font-mono text-ink-muted"
                  >{gamma.toFixed(2)}</span
                >
              </div>
              <input
                id="gamma-slider"
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                bind:value={gamma}
                class="mt-1 w-full accent-accent"
              />
            </div>
            <div>
              <div class="flex items-center justify-between">
                <label for="sharpen-slider" class="text-xs text-ink-muted"
                  >Sharpen</label
                >
                <span class="text-xs font-mono text-ink-muted">{sharpen}%</span>
              </div>
              <input
                id="sharpen-slider"
                type="range"
                min="0"
                max="200"
                bind:value={sharpen}
                class="mt-1 w-full accent-accent"
              />
            </div>
          </div>
        </div>

        <!-- Transform Controls -->
        <div class="rounded-sm border border-border bg-surface-raised p-4">
          <h2 class="mb-4 flex items-center gap-2 text-base font-medium">
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Transform
          </h2>
          <div class="flex gap-2">
            <button
              on:click={() => (invert = !invert)}
              class="flex-1 rounded-lg px-3 py-2 text-sm transition-colors {(
                invert
              ) ?
                'bg-accent text-surface'
              : 'bg-surface text-ink hover:bg-surface-raised'}"
            >
              Invert
            </button>
            <button
              on:click={() => (mirror = !mirror)}
              class="flex-1 rounded-lg px-3 py-2 text-sm transition-colors {(
                mirror
              ) ?
                'bg-accent text-surface'
              : 'bg-surface text-ink hover:bg-surface-raised'}"
            >
              Mirror
            </button>
          </div>
        </div>

        <!-- Apply Full Quality Button (only needed if sharpen is used) -->
        {#if sharpen > 0}
          <button
            on:click={applyAdjustments}
            disabled={isProcessing}
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {#if isProcessing}
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface"
              ></div>
              Applying sharpening...
            {:else}
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Apply with Sharpening
            {/if}
          </button>
          <p class="text-center text-xs text-ink-muted">
            Preview skips sharpening for speed
          </p>
        {/if}

        <!-- Download -->
        {#if processedUrl}
          <button
            on:click={downloadImage}
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download PNG
          </button>
        {/if}
      {/if}

      <!-- Info Panel -->
      <div class="rounded-sm border border-border bg-surface-raised/50 p-4">
        <h2 class="mb-2 text-sm font-medium">About This Tool</h2>
        <p class="text-xs leading-relaxed text-ink-muted">
          Basic image adjustments for laser engraving preparation. Adjust
          brightness, contrast, gamma, and sharpness before dithering.
        </p>
        <p class="mt-2 text-xs text-ink-muted">
          <strong>100% private</strong> — processing happens in your browser.
        </p>
      </div>
    </div>
  </div>
</div>
