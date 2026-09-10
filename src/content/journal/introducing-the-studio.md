---
title: 'Meet The Studio: All-in-One Image Prep for Laser Engraving'
date: 2026-03-09
tags:
  - tools
  - studio
  - laser engraving
  - software
excerpt: 'A free, private, client-side editing suite built specifically for laser engravers. Adjust tones, strip backgrounds, detect contours, mask shapes, and dither—all in one fluid pipeline.'
draft: false
---

When I first started laser engraving photos there were very few tools and resources that helped me dial in
what I needed to know to get great looking photos. I could not afford to pay for high-end professional software
so I started experimenting with different free and open source options.

In the end, I was annoyed with having to use a full photo editing suite just to prep images so I built the
**Studio** that now does 99% of all my image preparation.

---

## What is The Studio?

The Studio lives directly in your browser at [`/studio/`](/studio/). It combines my five most commonly used image
preparation tools into one unified, non-destructive workspace:

- **100% Free & No Accounts:** No credits, no watermarks, no "pay to unlock HD exports."
- **100% Private (Client-Side):** Everything runs inside your browser using WebAssembly and a live canvas.
  Your client photos, family portraits, and custom commission artwork never touch a cloud server.

---

## The 5 Tools in One Fluid Pipeline

### 1. Adjust (Tone & Dynamic Range)

Laser diodes and CO2 tubes burn darks and can blow out subtle light tones. The **Adjust** tab lets you dial
in brightness, contrast, and non-linear gamma curves to lift shadow detail and keep faces recognizable.
It also features **live-preview unsharp masking** to punch up edge definition so details don't get lost in
woodgrain.

### 2. Background Removal (Commercial-Friendly AI)

Cutting out people, pets, or products should be fast and easy. Studio uses **BiRefNet**, an open-source AI
segmentation model (MIT License—fully approved for commercial work). It downloads once to your browser cache,
runs locally, downscales for fast inference, and maps the mask back onto your original high-resolution pixels
with zero uploading to the cloud.

### 3. Shape Masking

Want to isolate a subject inside a circle coaster, an oval portrait plaque, or a geometric badge? Pick a
shape, scale it, adjust edge feathering, and drag to position it directly on your preview canvas.

### 4. Contour & Outline Detection

Sometimes you don't want a shaded photo; you want crisp, vector-like engraving outlines or borders. The
**Contour** tab provides instant **Simple Threshold** and **Canny Edge Detection** so you can pull clean
linework from photos for fast vector-style burns.

### 5. Material-Tuned Dithering

Convert continuous tone artwork into pure binary dot patterns calibrated for laser dot pitch (DPI) and
physical materials:

- **Floyd-Steinberg & Atkinson:** Perfect for portraits on maple, basswood, and birch.
- **Bayer Ordered Matrix:** Ideal for high-contrast slate coasters and anodized aluminum.
- **Halftone Dots:** Great for vintage newspaper aesthetics and acrylic edge-lit displays.

---

## Test It on Your Next Burn

The Studio is live right now at [ditherandetch.ca/studio](/studio/).

We hope this saves you time, saves you scrap wood, and makes your laser output look sharper than ever.

Drop in a photo, test out a preset, and let us know what you etch!
