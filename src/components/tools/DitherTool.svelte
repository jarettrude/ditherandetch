<script lang="ts">
  import {
    presets,
    applyPreset,
    dpiOptions,
  } from '../../lib/imageProcessing/presets';
  import { normalizeImageFile, IMAGE_ACCEPT } from '../../lib/imageFiles';
  import { sanitizeRgbaForExport } from '../../lib/imageProcessing/alpha';

  type Step = 'upload' | 'resize' | 'preset' | 'download';

  let currentStep: Step = 'upload';
  let imageFile: File | null = null;
  let imageUrl: string | null = null;
  let processedUrl: string | null = null;
  let isProcessing = false;
  let imageSize = { width: 0, height: 0 };
  let targetSize = { width: 0, height: 0, dpi: 254 };
  let selectedPreset = 'photoRealism';
  let fileInput: HTMLInputElement;

  const presetList = Object.values(presets);

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

  function loadImageSize(url: string) {
    const img = new Image();
    img.onload = () => {
      imageSize = { width: img.width, height: img.height };
      targetSize = { width: img.width, height: img.height, dpi: 254 };
      currentStep = 'resize';
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

  function updateWidth(e: Event) {
    const w = parseInt((e.target as HTMLInputElement).value) || 0;
    if (imageSize.width === 0 || imageSize.height === 0) {
      targetSize.width = w;
      return;
    }
    const h = Math.round(w / (imageSize.width / imageSize.height));
    targetSize = { ...targetSize, width: w, height: h };
  }

  function updateHeight(e: Event) {
    const h = parseInt((e.target as HTMLInputElement).value) || 0;
    const w = Math.round(h * (imageSize.width / imageSize.height));
    targetSize = { ...targetSize, width: w, height: h };
  }

  async function processImage() {
    if (!imageFile || !imageUrl) return;
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

      const processingData = {
        width: imageData.width,
        height: imageData.height,
        data: imageData.data,
      };

      const result = applyPreset(processingData, selectedPreset);

      const resultImageData = new ImageData(
        sanitizeRgbaForExport(result.data),
        result.width,
        result.height,
      );
      ctx.putImageData(resultImageData, 0, 0);
      processedUrl = canvas.toDataURL('image/png');
      currentStep = 'download';
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      isProcessing = false;
    }
  }

  function downloadImage() {
    if (!processedUrl) return;
    const link = document.createElement('a');
    link.download = 'dither-and-etch-ready.png';
    link.href = processedUrl;
    link.click();
  }

  function reset() {
    processedUrl = null;
    isProcessing = false;
    targetSize = {
      width: imageSize.width,
      height: imageSize.height,
      dpi: 254,
    };
    currentStep = 'resize';
    selectedPreset = 'photoRealism';
  }

  function changeImage() {
    imageFile = null;
    imageUrl = null;
    processedUrl = null;
    isProcessing = false;
    imageSize = { width: 0, height: 0 };
    targetSize = { width: 0, height: 0, dpi: 254 };
    currentStep = 'upload';
    selectedPreset = 'photoRealism';
    requestAnimationFrame(() => fileInput?.click());
  }

  $: physicalWidth = ((targetSize.width / targetSize.dpi) * 25.4).toFixed(1);
  $: physicalHeight = ((targetSize.height / targetSize.dpi) * 25.4).toFixed(1);
  $: currentPreset = presets[selectedPreset];
</script>

<div class="mx-auto max-w-6xl">
  <input
    bind:this={fileInput}
    type="file"
    accept={IMAGE_ACCEPT}
    on:change={handleInputChange}
    class="hidden"
  />

  <!-- Step Indicator -->
  {#if imageUrl}
    <div class="mb-6 flex flex-wrap items-center gap-2 text-sm">
      {#each ['upload', 'resize', 'preset', 'download'] as step, i}
        <div class="flex items-center gap-2">
          <button
            on:click={() => (currentStep = step as Step)}
            class="rounded-full px-3 py-1 capitalize transition-colors {(
              currentStep === step
            ) ?
              'bg-accent text-surface'
            : 'bg-surface-raised text-ink-muted hover:text-ink'}"
          >
            {i + 1}. {step === 'preset' ? 'style' : step}
          </button>
          {#if i < 3}
            <svg
              class="h-4 w-4 text-ink-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
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
                  <p class="mb-2 text-xs text-ink-muted">Processed</p>
                  <div
                    class="relative aspect-4/3 overflow-hidden rounded-lg"
                    style="background-image: linear-gradient(45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(-45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-surface) 75%), linear-gradient(-45deg, transparent 75%, var(--color-surface) 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;"
                  >
                    <img
                      src={processedUrl}
                      alt="Processed"
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
      {#if imageUrl && currentStep === 'resize'}
        <!-- Size Controls -->
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Output Size
          </h2>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="width-input" class="text-xs text-ink-muted"
                  >Width (px)</label
                >
                <input
                  id="width-input"
                  type="number"
                  value={targetSize.width}
                  on:input={updateWidth}
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label for="height-input" class="text-xs text-ink-muted"
                  >Height (px)</label
                >
                <input
                  id="height-input"
                  type="number"
                  value={targetSize.height}
                  on:input={updateHeight}
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label for="dpi-select" class="text-xs text-ink-muted">DPI</label>
              <select
                id="dpi-select"
                bind:value={targetSize.dpi}
                class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {#each dpiOptions as opt}
                  <option value={opt.value}
                    >{opt.label} (dot: {opt.dotSize})</option
                  >
                {/each}
              </select>
            </div>
            <div class="rounded-lg bg-surface p-3 text-sm">
              <p class="text-ink-muted">Physical size:</p>
              <p class="font-mono">
                {physicalWidth}mm × {physicalHeight}mm
              </p>
            </div>
            <button
              on:click={() => (currentStep = 'preset')}
              class="w-full rounded-lg bg-accent py-2 font-medium text-surface transition-colors hover:bg-accent-hover"
            >
              Continue
            </button>
          </div>
        </div>
      {/if}

      {#if imageUrl && currentStep === 'preset'}
        <!-- Preset Selection -->
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
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            Style Preset
          </h2>
          <div class="max-h-[400px] space-y-2 overflow-y-auto">
            {#each presetList as preset}
              <button
                on:click={() => (selectedPreset = preset.id)}
                class="w-full rounded-lg p-3 text-left text-sm transition-colors {(
                  selectedPreset === preset.id
                ) ?
                  'bg-accent text-surface'
                : 'bg-surface text-ink hover:bg-surface-raised'}"
              >
                <div class="font-medium">{preset.name}</div>
                <div class="mt-0.5 text-xs opacity-80">
                  {preset.description}
                </div>
              </button>
            {/each}
          </div>
          {#if currentPreset}
            <div class="mt-4 rounded-lg bg-surface p-3 text-xs text-ink-muted">
              <strong class="text-ink">Tip:</strong>
              {currentPreset.tip}
            </div>
          {/if}
          <button
            on:click={processImage}
            disabled={isProcessing}
            class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {#if isProcessing}
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface"
              ></div>
              Processing...
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
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              Apply Style
            {/if}
          </button>
        </div>
      {/if}

      {#if processedUrl && currentStep === 'download'}
        <!-- Download -->
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </h2>
          <div class="space-y-3">
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
            <p class="text-center text-xs text-ink-muted">
              Ready for laser engraving!
            </p>
          </div>
        </div>
      {/if}

      <!-- Info Panel -->
      <div class="rounded-sm border border-border bg-surface-raised/50 p-4">
        <h2 class="mb-2 text-sm font-medium">About This Tool</h2>
        <p class="text-xs leading-relaxed text-ink-muted">
          Prepare photos for laser engraving with optimized dithering. Choose a
          preset based on your material, adjust the size, and download the
          result.
        </p>
        <p class="mt-2 text-xs text-ink-muted">
          <strong>100% private</strong> — processing happens in your browser.
        </p>
      </div>
    </div>
  </div>
</div>
