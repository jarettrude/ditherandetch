<script lang="ts">
  import { normalizeImageFile, IMAGE_ACCEPT } from '../../lib/imageFiles';
  import {
    predefinedMasks,
    applyShapeMask,
    generateShapeMask,
    invertMask as invertMaskFn,
  } from '../../lib/imageProcessing/masking';

  let imageFile: File | null = null;
  let imageUrl: string | null = null;
  let processedUrl: string | null = null;
  let maskPreviewUrl: string | null = null;
  let isProcessing = false;
  let imageSize = { width: 0, height: 0 };
  let fileInput: HTMLInputElement;
  let errorMessage = '';
  let selectedMask = 'circle';
  let featherAmount = 0;
  let invertMask = false;
  let showMaskPreview = false;
  let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let cachedImageData: ImageData | null = null;

  // Mask position and scale
  let maskX = 0.5; // 0-1, center of mask relative to image
  let maskY = 0.5;
  let maskScale = 1.0; // 1.0 = mask fits image, smaller = smaller mask
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartMaskX = 0;
  let dragStartMaskY = 0;
  let previewContainer: HTMLDivElement;

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
    }, 50);
  }

  async function generatePreview() {
    if (!cachedImageData || !imageUrl) return;

    try {
      const { width, height } = cachedImageData;

      // Generate mask at the specified position and scale
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d')!;

      // Fill with black (transparent in result)
      maskCtx.fillStyle = invertMask ? 'white' : 'black';
      maskCtx.fillRect(0, 0, width, height);

      // Calculate mask dimensions based on scale
      const maskSize = Math.min(width, height) * maskScale;
      const maskCenterX = width * maskX;
      const maskCenterY = height * maskY;

      // Generate the shape mask at full size then position it
      const shapeMaskSize = Math.round(maskSize);
      if (shapeMaskSize > 0) {
        let shapeMask = generateShapeMask(
          selectedMask,
          shapeMaskSize,
          shapeMaskSize,
        );
        if (invertMask) {
          shapeMask = invertMaskFn(shapeMask);
        }

        // Create temp canvas for the shape
        const shapeCanvas = document.createElement('canvas');
        shapeCanvas.width = shapeMaskSize;
        shapeCanvas.height = shapeMaskSize;
        const shapeCtx = shapeCanvas.getContext('2d')!;
        shapeCtx.putImageData(shapeMask, 0, 0);

        // Draw shape at position
        const drawX = maskCenterX - shapeMaskSize / 2;
        const drawY = maskCenterY - shapeMaskSize / 2;
        maskCtx.drawImage(shapeCanvas, drawX, drawY);
      }

      maskPreviewUrl = maskCanvas.toDataURL('image/png');

      // Apply mask to image
      const maskImageData = maskCtx.getImageData(0, 0, width, height);

      // Apply feathering to mask if needed
      let finalMask = maskImageData;
      if (featherAmount > 0) {
        // Simple box blur for feathering (limited for preview speed)
        const blurRadius = Math.min(featherAmount, 10);
        finalMask = featherMaskData(maskImageData, blurRadius);
      }

      // Create result with mask applied
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
        // Use red channel of mask as alpha
        resultData.data[idx + 3] = finalMask.data[idx];
      }

      resultCtx.putImageData(resultData, 0, 0);
      processedUrl = resultCanvas.toDataURL('image/png');
    } catch (error) {
      console.error('Preview error:', error);
    }
  }

  // Simple feathering function
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
              const idx = (py * width + px) * 4;
              sum += data[idx];
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

  async function applyMask() {
    if (!cachedImageData) return;
    isProcessing = true;
    errorMessage = '';

    try {
      // Generate full quality mask with current position/scale
      const { width, height } = cachedImageData;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d')!;

      maskCtx.fillStyle = invertMask ? 'white' : 'black';
      maskCtx.fillRect(0, 0, width, height);

      const maskSize = Math.min(width, height) * maskScale;
      const maskCenterX = width * maskX;
      const maskCenterY = height * maskY;

      const shapeMaskSize = Math.round(maskSize);
      if (shapeMaskSize > 0) {
        let shapeMask = generateShapeMask(
          selectedMask,
          shapeMaskSize,
          shapeMaskSize,
        );
        if (invertMask) {
          shapeMask = invertMaskFn(shapeMask);
        }

        const shapeCanvas = document.createElement('canvas');
        shapeCanvas.width = shapeMaskSize;
        shapeCanvas.height = shapeMaskSize;
        const shapeCtx = shapeCanvas.getContext('2d')!;
        shapeCtx.putImageData(shapeMask, 0, 0);

        const drawX = maskCenterX - shapeMaskSize / 2;
        const drawY = maskCenterY - shapeMaskSize / 2;
        maskCtx.drawImage(shapeCanvas, drawX, drawY);
      }

      let maskImageData = maskCtx.getImageData(0, 0, width, height);

      // Apply full feathering
      if (featherAmount > 0) {
        maskImageData = featherMaskData(maskImageData, featherAmount);
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
        resultData.data[idx + 3] = maskImageData.data[idx];
      }

      resultCtx.putImageData(resultData, 0, 0);
      processedUrl = resultCanvas.toDataURL('image/png');
    } catch (error) {
      console.error('Masking error:', error);
      errorMessage =
        error instanceof Error ?
          error.message
        : 'Failed to apply mask. Please try again.';
    } finally {
      isProcessing = false;
    }
  }

  function downloadImage() {
    if (!processedUrl) return;
    const link = document.createElement('a');
    link.download = 'masked-image.png';
    link.href = processedUrl;
    link.click();
  }

  function changeImage() {
    imageFile = null;
    imageUrl = null;
    processedUrl = null;
    maskPreviewUrl = null;
    cachedImageData = null;
    requestAnimationFrame(() => fileInput?.click());
  }

  function reset() {
    selectedMask = 'circle';
    featherAmount = 0;
    invertMask = false;
    maskX = 0.5;
    maskY = 0.5;
    maskScale = 1.0;
    processedUrl = null;
    maskPreviewUrl = null;
    if (cachedImageData) {
      updatePreview();
    }
  }

  // Drag handlers for mask positioning
  function handleMouseDown(e: MouseEvent) {
    if (!previewContainer) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartMaskX = maskX;
    dragStartMaskY = maskY;
    e.preventDefault();
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !previewContainer) return;

    const rect = previewContainer.getBoundingClientRect();
    const deltaX = (e.clientX - dragStartX) / rect.width;
    const deltaY = (e.clientY - dragStartY) / rect.height;

    maskX = Math.max(0, Math.min(1, dragStartMaskX + deltaX));
    maskY = Math.max(0, Math.min(1, dragStartMaskY + deltaY));
    updatePreview();
  }

  function handleMouseUp() {
    isDragging = false;
  }

  // Touch handlers for mobile
  function handleTouchStart(e: TouchEvent) {
    if (!previewContainer || e.touches.length !== 1) return;
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
    dragStartMaskX = maskX;
    dragStartMaskY = maskY;
    e.preventDefault();
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging || !previewContainer || e.touches.length !== 1) return;

    const rect = previewContainer.getBoundingClientRect();
    const deltaX = (e.touches[0].clientX - dragStartX) / rect.width;
    const deltaY = (e.touches[0].clientY - dragStartY) / rect.height;

    maskX = Math.max(0, Math.min(1, dragStartMaskX + deltaX));
    maskY = Math.max(0, Math.min(1, dragStartMaskY + deltaY));
    updatePreview();
  }

  function handleTouchEnd() {
    isDragging = false;
  }

  // Reactive updates when settings change
  let prevMask = selectedMask;
  let prevFeather = featherAmount;
  let prevInvert = invertMask;
  let prevScale = maskScale;

  $: if (
    cachedImageData
    && (selectedMask !== prevMask
      || featherAmount !== prevFeather
      || invertMask !== prevInvert
      || maskScale !== prevScale)
  ) {
    prevMask = selectedMask;
    prevFeather = featherAmount;
    prevInvert = invertMask;
    prevScale = maskScale;
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
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
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

          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            bind:this={previewContainer}
            class="relative flex h-[400px] items-center justify-center overflow-hidden lg:h-[500px] cursor-move select-none"
            style="background-image: linear-gradient(45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(-45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-surface) 75%), linear-gradient(-45deg, transparent 75%, var(--color-surface) 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; background-color: var(--color-surface-raised);"
            on:mousedown={handleMouseDown}
            on:mousemove={handleMouseMove}
            on:mouseup={handleMouseUp}
            on:mouseleave={handleMouseUp}
            on:touchstart={handleTouchStart}
            on:touchmove={handleTouchMove}
            on:touchend={handleTouchEnd}
          >
            <img
              src={processedUrl || imageUrl}
              alt="Preview"
              class="max-h-full max-w-full object-contain pointer-events-none"
              draggable="false"
            />
            <div
              class="absolute bottom-2 left-2 rounded bg-surface/80 px-2 py-1 text-xs text-ink-muted"
            >
              Drag to position mask
            </div>
          </div>

          {#if processedUrl || maskPreviewUrl}
            <div class="border-t border-border p-4">
              <div class="mb-3 flex items-center justify-center gap-2">
                <button
                  on:click={() => (showMaskPreview = false)}
                  class="rounded-lg px-4 py-2 text-sm transition-colors {(
                    !showMaskPreview
                  ) ?
                    'bg-accent text-surface'
                  : 'bg-surface text-ink hover:bg-surface-raised'}"
                >
                  Result
                </button>
                <button
                  on:click={() => (showMaskPreview = true)}
                  class="rounded-lg px-4 py-2 text-sm transition-colors {(
                    showMaskPreview
                  ) ?
                    'bg-accent text-surface'
                  : 'bg-surface text-ink hover:bg-surface-raised'}"
                >
                  Mask
                </button>
              </div>
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
                  <p class="mb-2 text-xs text-ink-muted">
                    {showMaskPreview ? 'Mask' : 'Preview'}
                  </p>
                  <div
                    class="relative aspect-4/3 overflow-hidden rounded-lg"
                    style="background-image: linear-gradient(45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(-45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-surface) 75%), linear-gradient(-45deg, transparent 75%, var(--color-surface) 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;"
                  >
                    <img
                      src={showMaskPreview ? maskPreviewUrl : processedUrl}
                      alt={showMaskPreview ? 'Mask' : 'Preview'}
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

        <!-- Shape Selection -->
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
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            Shape
          </h2>
          <div class="grid grid-cols-3 gap-2">
            {#each predefinedMasks as mask}
              <button
                on:click={() => (selectedMask = mask.id)}
                class="rounded-lg px-3 py-2 text-sm transition-colors {(
                  selectedMask === mask.id
                ) ?
                  'bg-accent text-surface'
                : 'bg-surface text-ink hover:bg-surface-raised'}"
              >
                {mask.name}
              </button>
            {/each}
          </div>
        </div>

        <!-- Options -->
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
            Options
          </h2>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between">
                <label for="scale-slider" class="text-xs text-ink-muted"
                  >Mask Size</label
                >
                <span class="text-xs font-mono text-ink-muted"
                  >{Math.round(maskScale * 100)}%</span
                >
              </div>
              <input
                id="scale-slider"
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                bind:value={maskScale}
                class="mt-1 w-full accent-accent"
              />
            </div>
            <div>
              <div class="flex items-center justify-between">
                <label for="feather-slider" class="text-xs text-ink-muted"
                  >Feather</label
                >
                <span class="text-xs font-mono text-ink-muted"
                  >{featherAmount}px</span
                >
              </div>
              <input
                id="feather-slider"
                type="range"
                min="0"
                max="50"
                bind:value={featherAmount}
                class="mt-1 w-full accent-accent"
              />
            </div>
            <button
              on:click={() => (invertMask = !invertMask)}
              class="w-full rounded-lg px-3 py-2 text-sm transition-colors {(
                invertMask
              ) ?
                'bg-accent text-surface'
              : 'bg-surface text-ink hover:bg-surface-raised'}"
            >
              Invert Mask
            </button>
          </div>
        </div>

        <!-- Apply Full Quality Button (only needed if feather > 10) -->
        {#if featherAmount > 10}
          <button
            on:click={applyMask}
            disabled={isProcessing}
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {#if isProcessing}
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface"
              ></div>
              Applying full quality...
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
              Apply Full Quality
            {/if}
          </button>
          <p class="text-center text-xs text-ink-muted">
            Preview uses reduced feathering for speed
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
          Apply shape masks to images for creative laser engraving effects.
          Choose from circles, hearts, stars, and more.
        </p>
        <p class="mt-2 text-xs text-ink-muted">
          <strong>100% private</strong> — processing happens in your browser.
        </p>
      </div>
    </div>
  </div>
</div>
