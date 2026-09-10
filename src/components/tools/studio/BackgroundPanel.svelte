<script lang="ts">
export let imageFile: File | null = null;
export let imageUrl: string | null = null;
export let processedUrl: string | null = null;

let isProcessing = false;
let loadingProgress = 0;
let errorMessage = '';
let resultUrl: string | null = null;
let maskUrl: string | null = null;
let showMask = false;

async function removeBackground() {
  const source = imageUrl || imageFile;
  if (!source) return;
  isProcessing = true;
  loadingProgress = 0;
  errorMessage = '';

  try {
    const { removeImageBackground, getBackgroundMask } = await import(
      '../../../lib/imageProcessing/backgroundRemoval'
    );

    const resultBlob = await removeImageBackground(source, {
      onProgress: (p: number) => {
        loadingProgress = p * 50;
      },
    });

    const maskBlob = await getBackgroundMask(source);

    resultUrl = URL.createObjectURL(resultBlob);
    maskUrl = URL.createObjectURL(maskBlob);
    processedUrl = resultUrl;
  } catch (error) {
    console.error('Background removal error:', error);
    errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to remove background. Please try again.';
  } finally {
    isProcessing = false;
    loadingProgress = 100;
  }
}

export function reset() {
  processedUrl = null;
  resultUrl = null;
  maskUrl = null;
  showMask = false;
  errorMessage = '';
}

$: if (resultUrl) {
  processedUrl = showMask && maskUrl ? maskUrl : resultUrl;
}
</script>

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

<div class="rounded-sm border border-border bg-surface-raised p-4">
  <h3 class="mb-4 text-sm font-medium">Background Removal</h3>

  {#if !processedUrl && !isProcessing}
    <p class="mb-3 text-xs text-ink-muted">
      AI-powered removal using BiRefNet_lite (MIT license, commercial friendly).
      The model downloads once and runs locally in your browser.
    </p>
  {/if}

  {#if !processedUrl}
    <button
      on:click={removeBackground}
      disabled={isProcessing || (!imageFile && !imageUrl)}
      class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
    >
      {#if isProcessing}
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface"
        ></div>
        {#if loadingProgress < 50}
          Loading model… {(loadingProgress * 2).toFixed(0)}%
        {:else}
          Processing…
        {/if}
      {:else}
        Remove Background
      {/if}
    </button>
  {:else}
    <!-- Result / Mask toggle -->
    <div class="flex gap-2">
      <button
        on:click={() => (showMask = false)}
        class="flex-1 rounded-lg px-3 py-2 text-sm transition-colors {!showMask ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
      >
        Result
      </button>
      <button
        on:click={() => (showMask = true)}
        class="flex-1 rounded-lg px-3 py-2 text-sm transition-colors {showMask ? 'bg-accent text-surface' : 'bg-surface text-ink hover:bg-surface-raised'}"
      >
        Mask
      </button>
    </div>
  {/if}
</div>
