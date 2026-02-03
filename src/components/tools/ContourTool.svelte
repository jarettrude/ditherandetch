<script lang="ts">
  import { normalizeImageFile, IMAGE_ACCEPT } from '../../lib/imageFiles';
  import {
    extractContours,
    cannyEdgeDetection,
  } from '../../lib/imageProcessing/contour';
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

  let threshold = 128;
  let lineThickness = 1;
  let invertOutput = false;
  let useCanny = false;
  let cannyLow = 50;
  let cannyHigh = 150;

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

      // Generate initial preview
      updatePreview();
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
    }, 100);
  }

  async function generatePreview() {
    if (!cachedImageData) return;

    try {
      const inputData: ProcessingImageData = {
        width: cachedImageData.width,
        height: cachedImageData.height,
        data: new Uint8ClampedArray(cachedImageData.data),
      };

      let result: ProcessingImageData;
      if (useCanny) {
        result = cannyEdgeDetection(inputData, cannyLow, cannyHigh);
      } else {
        result = extractContours(inputData, threshold);
      }

      // Invert if requested
      if (invertOutput) {
        for (let i = 0; i < result.data.length; i += 4) {
          result.data[i] = 255 - result.data[i];
          result.data[i + 1] = 255 - result.data[i + 1];
          result.data[i + 2] = 255 - result.data[i + 2];
        }
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

  async function extractEdges() {
    if (!cachedImageData) return;
    isProcessing = true;
    errorMessage = '';

    try {
      const inputData: ProcessingImageData = {
        width: cachedImageData.width,
        height: cachedImageData.height,
        data: new Uint8ClampedArray(cachedImageData.data),
      };

      let result: ProcessingImageData;
      if (useCanny) {
        result = cannyEdgeDetection(inputData, cannyLow, cannyHigh);
      } else {
        result = extractContours(inputData, threshold);
      }

      // Invert if requested
      if (invertOutput) {
        for (let i = 0; i < result.data.length; i += 4) {
          result.data[i] = 255 - result.data[i];
          result.data[i + 1] = 255 - result.data[i + 1];
          result.data[i + 2] = 255 - result.data[i + 2];
        }
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
      console.error('Contour error:', error);
      errorMessage =
        error instanceof Error ?
          error.message
        : 'Failed to extract contours. Please try again.';
    } finally {
      isProcessing = false;
    }
  }

  function downloadImage() {
    if (!processedUrl) return;
    const link = document.createElement('a');
    link.download = 'contour-image.png';
    link.href = processedUrl;
    link.click();
  }

  function changeImage() {
    imageFile = null;
    imageUrl = null;
    processedUrl = null;
    cachedImageData = null;
    requestAnimationFrame(() => fileInput?.click());
  }

  function reset() {
    threshold = 128;
    lineThickness = 1;
    invertOutput = false;
    useCanny = false;
    cannyLow = 50;
    cannyHigh = 150;
    processedUrl = null;
    if (cachedImageData) {
      updatePreview();
    }
  }

  // Reactive live preview when settings change
  $: if (
    cachedImageData
    && (threshold
      || useCanny !== undefined
      || cannyLow
      || cannyHigh
      || invertOutput !== undefined)
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
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
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
                  <p class="mb-2 text-xs text-ink-muted">Contours</p>
                  <div
                    class="relative aspect-4/3 overflow-hidden rounded-lg bg-white"
                  >
                    <img
                      src={processedUrl}
                      alt="Contours"
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

        <!-- Method Selection -->
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
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            Detection Method
          </h2>
          <div class="grid grid-cols-2 gap-2">
            <button
              on:click={() => (useCanny = false)}
              class="rounded-lg px-3 py-2 text-sm transition-colors {!useCanny ?
                'bg-accent text-surface'
              : 'bg-surface text-ink hover:bg-surface-raised'}"
            >
              Simple
            </button>
            <button
              on:click={() => (useCanny = true)}
              class="rounded-lg px-3 py-2 text-sm transition-colors {useCanny ?
                'bg-accent text-surface'
              : 'bg-surface text-ink hover:bg-surface-raised'}"
            >
              Canny
            </button>
          </div>
        </div>

        <!-- Settings -->
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
            Settings
          </h2>
          <div class="space-y-4">
            {#if useCanny}
              <div>
                <div class="flex items-center justify-between">
                  <label for="canny-low" class="text-xs text-ink-muted"
                    >Low Threshold</label
                  >
                  <span class="text-xs font-mono text-ink-muted"
                    >{cannyLow}</span
                  >
                </div>
                <input
                  id="canny-low"
                  type="range"
                  min="10"
                  max="100"
                  bind:value={cannyLow}
                  class="mt-1 w-full accent-accent"
                />
              </div>
              <div>
                <div class="flex items-center justify-between">
                  <label for="canny-high" class="text-xs text-ink-muted"
                    >High Threshold</label
                  >
                  <span class="text-xs font-mono text-ink-muted"
                    >{cannyHigh}</span
                  >
                </div>
                <input
                  id="canny-high"
                  type="range"
                  min="50"
                  max="255"
                  bind:value={cannyHigh}
                  class="mt-1 w-full accent-accent"
                />
              </div>
            {:else}
              <div>
                <div class="flex items-center justify-between">
                  <label for="threshold-slider" class="text-xs text-ink-muted"
                    >Threshold</label
                  >
                  <span class="text-xs font-mono text-ink-muted"
                    >{threshold}</span
                  >
                </div>
                <input
                  id="threshold-slider"
                  type="range"
                  min="1"
                  max="255"
                  bind:value={threshold}
                  class="mt-1 w-full accent-accent"
                />
              </div>
            {/if}
            <button
              on:click={() => (invertOutput = !invertOutput)}
              class="w-full rounded-lg px-3 py-2 text-sm transition-colors {(
                invertOutput
              ) ?
                'bg-accent text-surface'
              : 'bg-surface text-ink hover:bg-surface-raised'}"
            >
              Invert Output
            </button>
          </div>
        </div>

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
          Extract outlines and edges from images for laser cutting paths. Use
          Simple mode for basic edges or Canny for more precise detection.
        </p>
        <p class="mt-2 text-xs text-ink-muted">
          <strong>100% private</strong> — processing happens in your browser.
        </p>
      </div>
    </div>
  </div>
</div>
