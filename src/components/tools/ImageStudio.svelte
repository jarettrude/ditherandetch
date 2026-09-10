<script lang="ts">
import { IMAGE_ACCEPT, normalizeImageFile } from '../../lib/imageFiles';

import AdjustPanel from './studio/AdjustPanel.svelte';
import BackgroundPanel from './studio/BackgroundPanel.svelte';
import ContourPanel from './studio/ContourPanel.svelte';
import DitherPanel from './studio/DitherPanel.svelte';
import MaskPanel from './studio/MaskPanel.svelte';

// ── Tab definitions ──────────────────────────────────────────────
type TabId = 'adjust' | 'background' | 'mask' | 'contour' | 'dither';

const tabs: { id: TabId; label: string; desc: string }[] = [
  {
    id: 'adjust',
    label: 'Adjust',
    desc: 'Brightness, contrast, gamma & sharpen',
  },
  {
    id: 'background',
    label: 'Background',
    desc: 'AI-powered background removal',
  },
  { id: 'mask', label: 'Mask', desc: 'Shape masking for creative effects' },
  { id: 'contour', label: 'Contour', desc: 'Extract outlines and edges' },
  {
    id: 'dither',
    label: 'Dither',
    desc: 'Convert to laser-ready dithered image',
  },
];

// ── Shared image & pipeline state ────────────────────────────────
let imageFile: File | null = null;
let originalUrl: string | null = null;
let originalImageData: ImageData | null = null;
let workingUrl: string | null = null;
let workingImageData: ImageData | null = null;
let imageSize = { width: 0, height: 0 };
let fileInput: HTMLInputElement;
let activeTab: TabId = 'adjust';

interface HistoryEntry {
  url: string;
  imageData: ImageData;
  step: string;
  width: number;
  height: number;
}

let history: HistoryEntry[] = [];

// Panel references
let adjustRef: any = null;
let bgRef: any = null;
let maskRef: any = null;
let contourRef: any = null;
let ditherRef: any = null;

// ── Per-tool output URLs (live preview / pending changes) ────────
let adjustOutput: string | null = null;
let backgroundOutput: string | null = null;
let maskOutput: string | null = null;
let contourOutput: string | null = null;
let ditherOutput: string | null = null;

// ── Mask drag state ──────────────────────────────────────────────
let maskX = 0.5;
let maskY = 0.5;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartMaskX = 0;
let dragStartMaskY = 0;
let previewContainer: HTMLDivElement;

// ── Computed ─────────────────────────────────────────────────────
$: currentOutput =
  activeTab === 'adjust'
    ? adjustOutput
    : activeTab === 'background'
      ? backgroundOutput
      : activeTab === 'mask'
        ? maskOutput
        : activeTab === 'contour'
          ? contourOutput
          : activeTab === 'dither'
            ? ditherOutput
            : null;

$: hasPendingChanges = currentOutput !== null && currentOutput !== workingUrl;
$: displayUrl = currentOutput || workingUrl || '';

// ── File handling ────────────────────────────────────────────────
function handleFile(file: File) {
  normalizeImageFile(file)
    .then(normalized => {
      loadImage(normalized);
    })
    .catch(() => {
      loadImage(file);
    });
}

function loadImage(file: File) {
  imageFile = file;
  const url = URL.createObjectURL(file);
  originalUrl = url;
  workingUrl = url;
  history = [];

  const img = new Image();
  img.onload = () => {
    imageSize = { width: img.width, height: img.height };

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    originalImageData = data;
    workingImageData = data;
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

function changeImage() {
  resetAll();
  requestAnimationFrame(() => fileInput?.click());
}

function resetActivePanel() {
  if (activeTab === 'adjust') adjustRef?.reset?.();
  else if (activeTab === 'background') bgRef?.reset?.();
  else if (activeTab === 'mask') maskRef?.reset?.();
  else if (activeTab === 'contour') contourRef?.reset?.();
  else if (activeTab === 'dither') ditherRef?.reset?.();
}

function resetAll() {
  imageFile = null;
  originalUrl = null;
  originalImageData = null;
  workingUrl = null;
  workingImageData = null;
  history = [];
  imageSize = { width: 0, height: 0 };
  adjustOutput = null;
  backgroundOutput = null;
  maskOutput = null;
  contourOutput = null;
  ditherOutput = null;
  maskX = 0.5;
  maskY = 0.5;
  resetActivePanel();
}

// ── Pipeline Actions: Apply, Undo, Revert ─────────────────────────
function applyStep(stepLabel?: string) {
  if (!currentOutput || !workingImageData || !workingUrl) return;
  const label =
    stepLabel || tabs.find(t => t.id === activeTab)?.label || 'Step';

  // Save current working state to history
  history = [
    ...history,
    {
      url: workingUrl,
      imageData: workingImageData,
      step: label,
      width: imageSize.width,
      height: imageSize.height,
    },
  ];

  // Advance workingUrl
  workingUrl = currentOutput;

  // Clear pending tool outputs
  adjustOutput = null;
  backgroundOutput = null;
  maskOutput = null;
  contourOutput = null;
  ditherOutput = null;

  // Re-extract workingImageData from new workingUrl
  const img = new Image();
  img.onload = () => {
    imageSize = { width: img.width, height: img.height };
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    workingImageData = ctx.getImageData(0, 0, img.width, img.height);
  };
  img.src = workingUrl;

  resetActivePanel();
}

function undo() {
  if (history.length === 0) return;
  const previous = history[history.length - 1]!;
  history = history.slice(0, -1);

  workingUrl = previous.url;
  workingImageData = previous.imageData;
  imageSize = { width: previous.width, height: previous.height };

  adjustOutput = null;
  backgroundOutput = null;
  maskOutput = null;
  contourOutput = null;
  ditherOutput = null;

  resetActivePanel();
}

function revertToOriginal() {
  if (!originalUrl || !originalImageData) return;
  history = [];
  workingUrl = originalUrl;
  workingImageData = originalImageData;
  imageSize = {
    width: originalImageData.width,
    height: originalImageData.height,
  };

  adjustOutput = null;
  backgroundOutput = null;
  maskOutput = null;
  contourOutput = null;
  ditherOutput = null;

  resetActivePanel();
}

function switchTab(newTab: TabId) {
  if (newTab === activeTab) return;
  // If user has uncommitted preview changes on the active tab, auto-apply them into the pipeline
  if (hasPendingChanges) {
    applyStep();
  }
  activeTab = newTab;
}

// ── Download ─────────────────────────────────────────────────────
function downloadImage() {
  if (hasPendingChanges) {
    applyStep();
  }
  const targetUrl = workingUrl;
  if (!targetUrl) return;
  const link = document.createElement('a');
  link.download = `dither-etch-${activeTab}.png`;
  link.href = targetUrl;
  link.click();
}

// ── Mask drag handlers ───────────────────────────────────────────
function handleMouseDown(e: MouseEvent) {
  if (activeTab !== 'mask' || !previewContainer) return;
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
  maskX = Math.max(
    0,
    Math.min(1, dragStartMaskX + (e.clientX - dragStartX) / rect.width),
  );
  maskY = Math.max(
    0,
    Math.min(1, dragStartMaskY + (e.clientY - dragStartY) / rect.height),
  );
}

function handleMouseUp() {
  isDragging = false;
}

function handleTouchStart(e: TouchEvent) {
  if (activeTab !== 'mask' || !previewContainer || e.touches.length !== 1)
    return;
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
  maskX = Math.max(
    0,
    Math.min(
      1,
      dragStartMaskX + (e.touches[0].clientX - dragStartX) / rect.width,
    ),
  );
  maskY = Math.max(
    0,
    Math.min(
      1,
      dragStartMaskY + (e.touches[0].clientY - dragStartY) / rect.height,
    ),
  );
}
</script>

<div class="mx-auto max-w-6xl">
  <input
    bind:this={fileInput}
    type="file"
    accept={IMAGE_ACCEPT}
    on:change={handleInputChange}
    class="hidden"
  >

  {#if !workingUrl}
    <!-- ─── Upload Area ─────────────────────────────────────────── -->
    <button
      type="button"
      on:click={() => fileInput?.click()}
      on:drop={handleDrop}
      on:dragover={e => e.preventDefault()}
      class="flex w-full flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-surface-raised p-16 transition-colors hover:border-accent/40"
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
      <p class="mt-4 text-xs text-ink-muted">Supports JPG, PNG, WebP, HEIC</p>
    </button>

    <!-- Tool descriptions -->
    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each tabs as tab}
        <div class="rounded-sm border border-border bg-surface-raised/50 p-4">
          <h3 class="text-sm font-medium">{tab.label}</h3>
          <p class="mt-1 text-xs text-ink-muted">{tab.desc}</p>
        </div>
      {/each}
    </div>

    <div class="mt-6 text-center text-xs text-ink-muted">
      <strong>100% private</strong>
      — all processing happens in your browser.
    </div>
  {:else}
    <!-- ─── Studio Workspace ────────────────────────────────────── -->

    <!-- Tab Bar -->
    <div
      class="mb-4 flex flex-wrap items-center gap-1 rounded-sm border border-border bg-surface-raised p-1"
    >
      {#each tabs as tab}
        <button
          on:click={() => switchTab(tab.id)}
          class="flex-1 rounded-xs px-3 py-2 text-sm font-medium transition-colors {activeTab === tab.id ? 'bg-accent text-surface' : 'text-ink-muted hover:text-ink'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- ─── Preview Area ────────────────────────────────────── -->
      <div class="space-y-4 lg:col-span-2">
        <div
          class="overflow-hidden rounded-sm border border-border bg-surface-raised"
        >
          <!-- Toolbar -->
          <div
            class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"
          >
            <div class="flex items-center gap-2">
              <button
                on:click={changeImage}
                class="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs transition-colors hover:bg-surface-raised"
                title="Upload a new image"
              >
                <svg
                  class="h-3.5 w-3.5"
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

              {#if history.length > 0}
                <button
                  on:click={undo}
                  class="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs text-ink transition-colors hover:bg-surface-raised"
                  title="Undo last applied step"
                >
                  <svg
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4"
                    />
                  </svg>
                  Undo ({history.length})
                </button>

                <button
                  on:click={revertToOriginal}
                  class="rounded-lg bg-surface px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
                  title="Revert back to raw uploaded image"
                >
                  Revert
                </button>
              {/if}

              <span class="font-mono text-xs text-ink-muted">
                {imageSize.width}
                × {imageSize.height}px
              </span>
            </div>

            <div class="flex items-center gap-2">
              {#if displayUrl}
                <button
                  on:click={downloadImage}
                  class="flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
                >
                  <svg
                    class="h-3.5 w-3.5"
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
                </button>
              {/if}
            </div>
          </div>

          <!-- Pipeline Trail -->
          {#if history.length > 0}
            <div
              class="flex items-center gap-1.5 overflow-x-auto border-b border-border/50 bg-surface/50 px-4 py-1.5 text-xs text-ink-muted"
            >
              <span class="font-medium text-ink">Trail:</span>
              <span>Original</span>
              {#each history as item}
                <span>→</span>
                <span
                  class="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-ink"
                >
                  {item.step}
                </span>
              {/each}
              {#if hasPendingChanges}
                <span>→</span>
                <span
                  class="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent"
                >
                  {tabs.find(t => t.id === activeTab)?.label}
                  (preview)
                </span>
              {/if}
            </div>
          {/if}

          <!-- Canvas -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            bind:this={previewContainer}
            class="relative flex h-[400px] items-center justify-center overflow-hidden lg:h-[500px] {activeTab === 'mask' && currentOutput ? 'cursor-move select-none' : ''}"
            style="background-image: linear-gradient(45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(-45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-surface) 75%), linear-gradient(-45deg, transparent 75%, var(--color-surface) 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; background-color: var(--color-surface-raised);"
            on:mousedown={handleMouseDown}
            on:mousemove={handleMouseMove}
            on:mouseup={handleMouseUp}
            on:mouseleave={handleMouseUp}
            on:touchstart={handleTouchStart}
            on:touchmove={handleTouchMove}
            on:touchend={handleMouseUp}
          >
            {#if displayUrl}
              <img
                src={displayUrl}
                alt="Preview"
                class="max-h-full max-w-full object-contain {activeTab === 'mask' && currentOutput ? 'pointer-events-none' : ''}"
                draggable="false"
              >
            {/if}
            {#if activeTab === 'mask' && currentOutput}
              <div
                class="absolute bottom-2 left-2 rounded bg-surface/80 px-2 py-1 text-xs text-ink-muted"
              >
                Drag to position mask
              </div>
            {/if}
          </div>

          <!-- Comparison: Base Image vs Current Preview -->
          {#if hasPendingChanges && workingUrl}
            <div class="border-t border-border p-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="mb-2 text-xs text-ink-muted">
                    {history.length === 0 ? 'Original' : 'Before Step'}
                  </p>
                  <div
                    class="relative aspect-4/3 overflow-hidden rounded-lg"
                    style="background-image: linear-gradient(45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(-45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-surface) 75%), linear-gradient(-45deg, transparent 75%, var(--color-surface) 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;"
                  >
                    <img
                      src={workingUrl}
                      alt="Before"
                      class="h-full w-full object-contain"
                    >
                  </div>
                </div>
                <div>
                  <p class="mb-2 text-xs text-ink-muted">
                    {tabs.find(t => t.id === activeTab)?.label}
                    Preview
                  </p>
                  <div
                    class="relative aspect-4/3 overflow-hidden rounded-lg"
                    style="background-image: linear-gradient(45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(-45deg, var(--color-surface) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-surface) 75%), linear-gradient(-45deg, transparent 75%, var(--color-surface) 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;"
                  >
                    <img
                      src={currentOutput}
                      alt="Result Preview"
                      class="h-full w-full object-contain"
                    >
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- ─── Tool Controls Sidebar ───────────────────────────── -->
      <div class="space-y-4">
        {#if activeTab === 'adjust'}
          <AdjustPanel
            bind:this={adjustRef}
            cachedImageData={workingImageData}
            active={activeTab === 'adjust'}
            bind:processedUrl={adjustOutput}
          />
        {:else if activeTab === 'background'}
          <BackgroundPanel
            bind:this={bgRef}
            imageUrl={workingUrl}
            {imageFile}
            bind:processedUrl={backgroundOutput}
          />
        {:else if activeTab === 'mask'}
          <MaskPanel
            bind:this={maskRef}
            cachedImageData={workingImageData}
            active={activeTab === 'mask'}
            bind:processedUrl={maskOutput}
            bind:maskX
            bind:maskY
          />
        {:else if activeTab === 'contour'}
          <ContourPanel
            bind:this={contourRef}
            cachedImageData={workingImageData}
            active={activeTab === 'contour'}
            bind:processedUrl={contourOutput}
          />
        {:else if activeTab === 'dither'}
          <DitherPanel
            bind:this={ditherRef}
            imageUrl={workingUrl}
            {imageSize}
            bind:processedUrl={ditherOutput}
          />
        {/if}

        <!-- Info -->
        <div class="rounded-sm border border-border bg-surface-raised/50 p-4">
          <p class="text-xs text-ink-muted">
            <strong>100% private</strong>
            — all processing happens in your browser. Your images are never
            uploaded to any server.
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>
