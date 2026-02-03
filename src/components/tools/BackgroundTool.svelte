<script lang="ts">
  import { normalizeImageFile, IMAGE_ACCEPT } from '../../lib/imageFiles';

  let imageFile: File | null = null;
  let imageUrl: string | null = null;
  let processedUrl: string | null = null;
  let maskUrl: string | null = null;
  let isProcessing = false;
  let loadingProgress = 0;
  let imageSize = { width: 0, height: 0 };
  let fileInput: HTMLInputElement;
  let showMask = false;
  let errorMessage = '';

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
      processedUrl = null;
      maskUrl = null;
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

  async function removeBackground() {
    if (!imageFile) return;
    isProcessing = true;
    loadingProgress = 0;
    errorMessage = '';

    try {
      const { removeImageBackground, getBackgroundMask } =
        await import('../../lib/imageProcessing/backgroundRemoval');

      // Process sequentially to avoid memory issues
      const resultBlob = await removeImageBackground(imageFile, {
        onProgress: (p: number) => {
          loadingProgress = p * 50;
        },
      });

      const maskBlob = await getBackgroundMask(imageFile);

      processedUrl = URL.createObjectURL(resultBlob);
      maskUrl = URL.createObjectURL(maskBlob);
    } catch (error) {
      console.error('Background removal error:', error);
      errorMessage =
        error instanceof Error ?
          error.message
        : 'Failed to remove background. Please try again.';
    } finally {
      isProcessing = false;
      loadingProgress = 100;
    }
  }

  function downloadImage() {
    if (!processedUrl) return;
    const link = document.createElement('a');
    link.download = 'background-removed.png';
    link.href = processedUrl;
    link.click();
  }

  function changeImage() {
    imageFile = null;
    imageUrl = null;
    processedUrl = null;
    maskUrl = null;
    showMask = false;
    requestAnimationFrame(() => fileInput?.click());
  }

  function reset() {
    processedUrl = null;
    maskUrl = null;
    showMask = false;
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
                d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
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
                disabled={!processedUrl}
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
            {#if showMask && maskUrl}
              <img
                src={maskUrl}
                alt="Mask"
                class="max-h-full max-w-full object-contain"
              />
            {:else}
              <img
                src={processedUrl || imageUrl}
                alt="Preview"
                class="max-h-full max-w-full object-contain"
              />
            {/if}
          </div>

          {#if processedUrl}
            <div class="border-t border-border p-4">
              <div class="flex items-center justify-center gap-2">
                <button
                  on:click={() => (showMask = false)}
                  class="rounded-lg px-4 py-2 text-sm transition-colors {(
                    !showMask
                  ) ?
                    'bg-accent text-surface'
                  : 'bg-surface text-ink hover:bg-surface-raised'}"
                >
                  Result
                </button>
                <button
                  on:click={() => (showMask = true)}
                  class="rounded-lg px-4 py-2 text-sm transition-colors {(
                    showMask
                  ) ?
                    'bg-accent text-surface'
                  : 'bg-surface text-ink hover:bg-surface-raised'}"
                >
                  Mask
                </button>
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

        <!-- Remove Background Button -->
        {#if !processedUrl}
          <button
            on:click={removeBackground}
            disabled={isProcessing}
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {#if isProcessing}
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface"
              ></div>
              {#if loadingProgress < 50}
                Loading model... {(loadingProgress * 2).toFixed(0)}%
              {:else}
                Processing...
              {/if}
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
                  d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
                />
              </svg>
              Remove Background
            {/if}
          </button>
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
          AI-powered background removal using RMBG-1.4. Handles fine details
          like hair and fur with high accuracy.
        </p>
        <p class="mt-2 text-xs text-ink-muted">
          <strong>First use:</strong> The AI model (~180MB) downloads once and runs
          locally.
        </p>
        <p class="mt-2 text-xs text-ink-muted">
          <strong>100% private</strong> — processing happens in your browser.
        </p>
      </div>
    </div>
  </div>
</div>
