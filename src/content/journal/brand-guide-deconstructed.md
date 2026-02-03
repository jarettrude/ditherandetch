---
title: 'Deconstructing the Brand'
date: 2026-01-27
category: brand
excerpt:
  'A complete breakdown of the Dither & Etch visual identity — typography, color tokens, components,
  and usage guidelines.'
draft: false
---

The name says it all. **Dither** is the halftone magic that turns photos into thousands of tiny
dots. **Etch** is the crisp, unforgiving line. Together, they're the yin and yang of laser craft —
the organic and the exact, the textured and the clean.

This guide breaks down how that philosophy translates into visual identity.

---

## The Brand Lockup

The wordmark uses two typefaces in conversation: **Bebas Neue** for the words, **Literata** for the
ampersand. The rounded ampersand softens the industrial weight and adds a touch of craft.

### Standard (on dark)

<div class="not-prose my-8 flex items-center justify-center rounded-sm border border-border bg-surface p-8">
  <span class="brand-lockup text-5xl sm:text-6xl">
    <span>Dither</span>
    <span class="brand-lockup-ampersand">&</span>
    <span>Etch</span>
  </span>
</div>

### Monochrome variations

<div class="not-prose my-8 grid gap-4 sm:grid-cols-2">
  <div class="flex items-center justify-center rounded-sm border border-border bg-surface p-8">
    <span class="brand-lockup text-4xl text-ink">
      <span>Dither</span>
      <span class="brand-lockup-ampersand text-ink!">&</span>
      <span>Etch</span>
    </span>
  </div>
  <div class="flex items-center justify-center rounded-sm border border-border bg-surface p-8">
    <span class="brand-lockup text-4xl text-ink-muted">
      <span>Dither</span>
      <span class="brand-lockup-ampersand text-ink-muted!">&</span>
      <span>Etch</span>
    </span>
  </div>
</div>

### Accent variations

<div class="not-prose my-8 grid gap-4 sm:grid-cols-3">
  <div class="flex items-center justify-center rounded-sm border border-border bg-surface p-6">
    <span class="brand-lockup text-3xl text-accent">
      <span>Dither</span>
      <span class="brand-lockup-ampersand text-accent">&</span>
      <span>Etch</span>
    </span>
  </div>
  <div class="flex items-center justify-center rounded-sm border border-border bg-surface p-6">
    <span class="brand-lockup text-3xl">
      <span class="text-accent">Dither</span>
      <span class="brand-lockup-ampersand">&</span>
      <span class="text-ink">Etch</span>
    </span>
  </div>
  <div class="flex items-center justify-center rounded-sm border border-border bg-surface p-6">
    <span class="brand-lockup text-3xl">
      <span class="text-ink">Dither</span>
      <span class="brand-lockup-ampersand text-accent">&</span>
      <span class="text-ink">Etch</span>
    </span>
  </div>
</div>

### Hover state (interactive)

<div class="not-prose my-8 flex items-center justify-center rounded-sm border border-border bg-surface p-8">
  <a href="#" class="brand-lockup text-5xl transition-colors hover:text-accent">
    <span>Dither</span>
    <span class="brand-lockup-ampersand">&</span>
    <span>Etch</span>
  </a>
</div>

<p class="text-center text-sm text-ink-muted">Hover to see the interaction</p>

---

## Typography

The type system is a two-voice mix: **Bebas Neue** for display impact and **IBM Plex Sans** for
clean, readable body text. **Literata** appears only in the brandmark's ampersand to accentuate and
balance the boldness of the display type.

### Font Stack

| Role        | Font          | Weights | Usage                     |
| ----------- | ------------- | ------- | ------------------------- |
| **Display** | Bebas Neue    | 400     | Headlines, logotype, CTAs |
| **Body**    | IBM Plex Sans | 300–700 | Body copy, UI, navigation |
| **Accent**  | Literata      | 400     | Ampersand only            |

### Display Scale (Bebas Neue)

All display text uses Bebas Neue at weight 400 with tight tracking (`-0.025em`). The font naturally
renders in uppercase-style letterforms.

**About Bebas Neue**: Designed by Ryoichi Tsunekawa in 2010, Bebas Neue is a display sans-serif
inspired by 1920s geometric typefaces like Futura. Its clean, bold proportions and tightly spaced
uppercase letters deliver a powerful modern aesthetic perfect for headlines and brand messaging. The
font has become a staple in modern web design, particularly favored for tech startups, creative
agencies, and brands seeking strong, minimalist impact. Popular for hero sections, navigation
headers, and bold editorial layouts.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <div class="rounded-sm border border-border bg-surface-raised p-5 flex flex-col justify-between">
    <p class="font-display text-6xl tracking-tight text-ink">HEADER XL</p>
    <p class="mt-2 text-sm text-ink-muted">3.75rem (60px) · Hero headlines</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-5 flex flex-col justify-between">
    <p class="font-display text-5xl tracking-tight text-ink">HEADER Large</p>
    <p class="mt-2 text-sm text-ink-muted">3rem (48px) · Page titles</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-5 flex flex-col justify-between">
    <p class="font-display text-4xl tracking-tight text-ink">HEADER Medium</p>
    <p class="mt-2 text-sm text-ink-muted">2.25rem (36px) · Section headers</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-5 flex flex-col justify-between">
    <p class="font-display text-3xl tracking-tight text-ink">HEADER Small</p>
    <p class="mt-2 text-sm text-ink-muted">1.875rem (30px) · Card titles</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-5 flex flex-col justify-between">
    <p class="font-display text-2xl tracking-tight text-ink">HEADER Extra Small</p>
    <p class="mt-2 text-sm text-ink-muted">1.5rem (24px) · Buttons, labels</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-5 flex flex-col justify-between">
    <p class="font-display text-xl tracking-tight text-ink">HEADER 2XS</p>
    <p class="mt-2 text-sm text-ink-muted">1.25rem (20px) · Small buttons</p>
  </div>
</div>

---

### Body Scale (IBM Plex Sans)

Body text uses IBM Plex Sans with a comfortable line height of 1.6. The font supports weights from
300 (light) to 700 (bold).

**About IBM Plex Sans**: Designed by Mike Abbink & Bold Monday as IBM's corporate typeface, IBM Plex
Sans is a grotesque sans-serif inspired by Franklin Gothic. Released under the SIL Open Font License
in 2017, it was specifically designed to work well in user interface environments while maintaining
excellent readability. The font has become widely adopted in tech and corporate websites, valued for
its professional yet approachable character and extensive language support.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <div class="rounded-sm border border-border bg-surface-raised p-5">
    <p class="text-xl font-semibold text-ink">Large subheading text</p>
    <p class="mt-2 text-sm text-ink-muted">1.25rem (20px) · Semibold (600)</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-5">
    <p class="text-lg text-ink">Lead paragraph text for introductions</p>
    <p class="mt-2 text-sm text-ink-muted">1.125rem (18px) · Regular (400)</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-5">
    <p class="text-base text-ink">Standard body copy for comfortable reading across long passages of text.</p>
    <p class="mt-2 text-sm text-ink-muted">1rem (16px) · Regular (400)</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-5">
    <p class="text-sm text-ink-muted">Small text for captions, metadata, and secondary information.</p>
    <p class="mt-2 text-sm text-ink-muted">0.875rem (14px) · Regular (400)</p>
  </div>
</div>

---

**About Literata**: A serif typeface designed for Google as part of their Noto font collection,
Literata brings elegant, readable serif character to digital interfaces. While traditionally used in
book typography, Literata has gained popularity in web design for adding sophisticated serif accents
to predominantly sans-serif designs. It is commonly used for ampersands, pull quotes, and decorative
elements in modern minimalist websites.

---

### Text Colors

<div class="not-prose my-6 grid gap-4 sm:grid-cols-3">
  <div class="rounded-sm border border-border bg-surface-raised p-4">
    <p class="text-lg font-medium text-ink">Primary text</p>
    <p class="text-sm text-ink-muted">Main content</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-4">
    <p class="text-lg font-medium text-ink-muted">Muted text</p>
    <p class="text-sm text-ink-muted">Secondary</p>
  </div>
  <div class="rounded-sm border border-border bg-surface-raised p-4">
    <p class="text-lg font-medium text-ink-faint">Faint text</p>
    <p class="text-sm text-ink-muted">Tertiary</p>
  </div>
</div>

---

## Color Palette

The palette adapts between dark mode (default) and a warm parchment light mode. All colors are
defined as CSS custom properties for easy theming.

### Surfaces

<div class="not-prose grid gap-4 sm:grid-cols-3">
  <div class="overflow-hidden rounded-sm border border-border">
    <div class="h-20 bg-surface"></div>
    <div class="bg-surface-raised p-3">
      <p class="text-sm font-medium text-ink">Surface</p>
    </div>
  </div>
  <div class="overflow-hidden rounded-sm border border-border">
    <div class="h-20 bg-surface-raised"></div>
    <div class="bg-surface-raised p-3">
      <p class="text-sm font-medium text-ink">Surface Raised</p>
    </div>
  </div>
  <div class="overflow-hidden rounded-sm border border-border">
    <div class="h-20 bg-surface-overlay"></div>
    <div class="bg-surface-raised p-3">
      <p class="text-sm font-medium text-ink">Surface Overlay</p>
    </div>
  </div>
</div>

### Accents

<div class="not-prose mt-6 grid gap-4 sm:grid-cols-3">
  <div class="overflow-hidden rounded-sm border border-border">
    <div class="h-20 bg-accent"></div>
    <div class="bg-surface-raised p-3">
      <p class="text-sm font-medium text-ink">Accent</p>
      <p class="text-xs text-ink-muted">Primary actions</p>
    </div>
  </div>
  <div class="overflow-hidden rounded-sm border border-border">
    <div class="h-20 bg-accent-hover"></div>
    <div class="bg-surface-raised p-3">
      <p class="text-sm font-medium text-ink">Accent Hover</p>
      <p class="text-xs text-ink-muted">Hover states</p>
    </div>
  </div>
  <div class="overflow-hidden rounded-sm border border-border">
    <div class="h-20 bg-accent-alt"></div>
    <div class="bg-surface-raised p-3">
      <p class="text-sm font-medium text-ink">Accent Alt</p>
      <p class="text-xs text-ink-muted">Secondary accent</p>
    </div>
  </div>
</div>

### Borders

<div class="not-prose mt-6 grid gap-4 sm:grid-cols-2">
  <div class="overflow-hidden rounded-sm border-4 border-border bg-surface-raised p-4">
    <p class="text-sm font-medium text-ink">Border</p>
    <p class="text-xs text-ink-muted">Subtle dividers</p>
  </div>
  <div class="overflow-hidden rounded-sm border-4 border-border-strong bg-surface-raised p-4">
    <p class="text-sm font-medium text-ink">Border Strong</p>
    <p class="text-xs text-ink-muted">Emphasized edges</p>
  </div>
</div>

---

## Buttons

Buttons use the display font (Bebas Neue) for a bold, industrial feel. Three sizes are available.

### Primary Buttons

<div class="not-prose my-8 flex flex-wrap items-center justify-center gap-4 rounded-sm border border-border bg-surface p-8">
  <a href="#" class="btn btn-primary btn-sm">Small Button</a>
  <a href="#" class="btn btn-primary">Default Button</a>
  <a href="#" class="btn btn-primary btn-lg">Large Button</a>
</div>

### Secondary Buttons

<div class="not-prose my-8 flex flex-wrap items-center justify-center gap-4 rounded-sm border border-border bg-surface p-8">
  <a href="#" class="btn btn-secondary btn-sm">Small Button</a>
  <a href="#" class="btn btn-secondary">Default Button</a>
  <a href="#" class="btn btn-secondary btn-lg">Large Button</a>
</div>

### Button Pairing

<div class="not-prose my-8 flex flex-wrap items-center justify-center gap-4 rounded-sm border border-border bg-surface p-8">
  <a href="#" class="btn btn-primary btn-lg">Primary Action</a>
  <a href="#" class="btn btn-secondary btn-lg">Secondary Action</a>
</div>

### Usage Guidelines

- **Primary** — Main calls to action: "View the Work", "Get in Touch", email links
- **Secondary** — Alternative actions, less emphasis
