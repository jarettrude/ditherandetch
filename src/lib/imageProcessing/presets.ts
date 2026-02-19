/**
 * Dither & Etch — Image Preparation Presets
 *
 * Semantic presets for laser engraving preparation.
 * Each preset is optimized for specific materials and use cases.
 *
 * 100% client-side processing — your images never leave your browser.
 */

import * as adjustments from './adjustments';
import * as dithering from './dithering';
import type { ProcessingImageData } from './types';

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  tip: string;
  laserTypes: ('diode' | 'co2')[];
  materials: string[];
  adjustments: {
    brightness?: number;
    contrast?: number;
    gamma?: number;
    sharpenAmount?: number;
    sharpenRadius?: number;
    denoise?: number;
    autoAdjust?: boolean;
    colorCorrection?: boolean;
    shadowLift?: number;
    highlightCompress?: number;
    edgeEnhance?: number;
  };
  ditheringAlgorithm: dithering.DitheringAlgorithm;
}

export const presets: Record<string, PresetConfig> = {
  photoRealism: {
    id: 'photoRealism',
    name: 'Photo Realism',
    description:
      'Best for realistic photo engravings. Preserves tonal range and fine detail.',
    tip: 'Great for portraits, landscapes, and detailed imagery on wood or tile.',
    laserTypes: ['diode'],
    materials: ['wood', 'tile', 'anodized aluminum'],
    adjustments: {
      contrast: 15,
      gamma: 1.1,
      sharpenAmount: 80,
      sharpenRadius: 1,
      autoAdjust: true,
    },
    ditheringAlgorithm: 'jarvisJudiceNinke',
  },

  trueTone: {
    id: 'trueTone',
    name: 'True Tone',
    description:
      'Most accurate tonal reproduction. Minimal processing for natural results.',
    tip: 'Use when you want the image to look exactly as intended. Requires accurate DPI settings.',
    laserTypes: ['diode', 'co2'],
    materials: ['wood', 'leather', 'stone'],
    adjustments: {
      autoAdjust: true,
      sharpenAmount: 40,
      gamma: 1.0,
    },
    ditheringAlgorithm: 'jarvisJudiceNinke',
  },

  deepBurn: {
    id: 'deepBurn',
    name: 'Deep Burn',
    description:
      'Aggressive correction for maximum contrast. Ideal for CO2 lasers.',
    tip: 'Lifts shadows and compresses highlights so your laser can render the full range.',
    laserTypes: ['co2', 'diode'],
    materials: ['wood', 'acrylic', 'leather'],
    adjustments: {
      contrast: 25,
      colorCorrection: true,
      shadowLift: 30,
      highlightCompress: 15,
      sharpenAmount: 100,
    },
    ditheringAlgorithm: 'stucki',
  },

  softDetail: {
    id: 'softDetail',
    name: 'Soft Detail',
    description:
      'Natural look with subtle enhancement. Gentle sharpening preserves softness.',
    tip: 'Perfect for images where you want detail without harsh edges.',
    laserTypes: ['co2', 'diode'],
    materials: ['wood', 'leather', 'paper'],
    adjustments: {
      gamma: 1.05,
      sharpenAmount: 60,
      sharpenRadius: 1,
      edgeEnhance: 0.5,
    },
    ditheringAlgorithm: 'sierra',
  },

  stoneSlate: {
    id: 'stoneSlate',
    name: 'Stone & Slate',
    description:
      'Optimized for dark stone materials. Denoises and enhances edges.',
    tip: 'Black slate and granite need extra edge definition to show detail.',
    laserTypes: ['diode', 'co2'],
    materials: ['slate', 'stone', 'granite'],
    adjustments: {
      denoise: 25,
      edgeEnhance: 1.2,
      sharpenAmount: 70,
      contrast: 20,
    },
    ditheringAlgorithm: 'stucki',
  },

  glassAcrylic: {
    id: 'glassAcrylic',
    name: 'Glass & Acrylic',
    description:
      'Heavy correction for transparent materials. Maximizes visible detail.',
    tip: 'Transparent materials need extreme contrast to show the engraving clearly.',
    laserTypes: ['diode', 'co2'],
    materials: ['glass', 'acrylic', 'mirror'],
    adjustments: {
      colorCorrection: true,
      shadowLift: 40,
      highlightCompress: 20,
      contrast: 35,
      sharpenAmount: 120,
    },
    ditheringAlgorithm: 'stucki',
  },

  forgiving: {
    id: 'forgiving',
    name: 'Forgiving',
    description:
      'Beginner-friendly preset. Tolerant of DPI and power setting errors.',
    tip: "Start here if you're new to laser engraving or testing a new material.",
    laserTypes: ['diode', 'co2'],
    materials: ['wood', 'leather', 'mdf'],
    adjustments: {
      sharpenAmount: 50,
      gamma: 1.05,
      contrast: 10,
    },
    ditheringAlgorithm: 'sierra',
  },

  edgePop: {
    id: 'edgePop',
    name: 'Edge Pop',
    description:
      'Auto-sharpening with edge emphasis. Makes subjects stand out.',
    tip: 'Great for images with clear subjects that need to "pop" from the background.',
    laserTypes: ['diode', 'co2'],
    materials: ['wood', 'acrylic', 'leather'],
    adjustments: {
      colorCorrection: true,
      shadowLift: 15,
      edgeEnhance: 0.8,
      sharpenAmount: 90,
    },
    ditheringAlgorithm: 'burkes',
  },

  highContrast: {
    id: 'highContrast',
    name: 'High Contrast',
    description: 'Bold, graphic look. Strong contrast and sharpening.',
    tip: 'Works well for logos, text, and images with clear black/white areas.',
    laserTypes: ['diode', 'co2'],
    materials: ['wood', 'leather'],
    adjustments: {
      contrast: 40,
      brightness: 10,
      sharpenAmount: 150,
      sharpenRadius: 2,
    },
    ditheringAlgorithm: 'floydSteinberg',
  },

  pencilSketch: {
    id: 'pencilSketch',
    name: 'Pencil Sketch',
    description:
      'Artistic pencil drawing effect. Converts photos to sketch-style.',
    tip: 'Great for portraits, cars, buildings, and architectural subjects.',
    laserTypes: ['diode', 'co2'],
    materials: ['wood', 'paper', 'leather'],
    adjustments: {},
    ditheringAlgorithm: 'atkinson',
  },
};

/**
 * Apply a preset to an image
 */
export function applyPreset(
  imageData: ProcessingImageData,
  presetName: string,
): ProcessingImageData {
  const preset = presets[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  let result: ProcessingImageData = {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8ClampedArray(imageData.data),
  };
  const adj = preset.adjustments;

  result = adjustments.toGrayscale(result);

  if (presetName === 'pencilSketch') {
    result = adjustments.sketchEffect(result);
    return dithering.ditheringAlgorithms[preset.ditheringAlgorithm](result);
  }

  if (adj.autoAdjust) {
    result = adjustments.autoAdjust(result);
  }

  if (adj.colorCorrection) {
    result = adjustments.colorCorrection(
      result,
      adj.shadowLift ?? 20,
      adj.highlightCompress ?? 10,
    );
  }

  if (adj.denoise && adj.denoise > 0) {
    result = adjustments.denoise(result, adj.denoise);
  }

  if (adj.gamma && adj.gamma !== 1.0) {
    result = adjustments.adjustGamma(result, adj.gamma);
  }

  if (adj.brightness && adj.brightness !== 0) {
    result = adjustments.adjustBrightness(result, adj.brightness);
  }

  if (adj.contrast && adj.contrast !== 0) {
    result = adjustments.adjustContrast(result, adj.contrast);
  }

  if (adj.edgeEnhance && adj.edgeEnhance > 0) {
    result = adjustments.edgeEnhance(result, adj.edgeEnhance);
  }

  if (adj.sharpenAmount && adj.sharpenAmount > 0) {
    result = adjustments.unsharpMask(
      result,
      adj.sharpenRadius ?? 1,
      adj.sharpenAmount,
    );
  }

  result = dithering.ditheringAlgorithms[preset.ditheringAlgorithm](result);

  return result;
}

/**
 * Get preset recommendations based on material
 */
export function getPresetsForMaterial(material: string): PresetConfig[] {
  return Object.values(presets).filter(p =>
    p.materials.some(m => m.toLowerCase().includes(material.toLowerCase())),
  );
}

/**
 * Get preset recommendations based on laser type
 */
export function getPresetsForLaser(laserType: 'diode' | 'co2'): PresetConfig[] {
  return Object.values(presets).filter(p => p.laserTypes.includes(laserType));
}

export const materialOptions = [
  {
    value: 'wood',
    label: 'Wood',
    subTypes: ['Plywood', 'MDF', 'Hardwood', 'Bamboo'],
  },
  {
    value: 'leather',
    label: 'Leather',
    subTypes: ['Genuine', 'Faux', 'Suede'],
  },
  {
    value: 'acrylic',
    label: 'Acrylic',
    subTypes: ['Clear', 'Frosted', 'Colored'],
  },
  { value: 'glass', label: 'Glass', subTypes: ['Clear', 'Frosted', 'Mirror'] },
  {
    value: 'slate',
    label: 'Slate/Stone',
    subTypes: ['Black Slate', 'Granite', 'Marble'],
  },
  {
    value: 'tile',
    label: 'Ceramic Tile',
    subTypes: ['White Tile (Norton)', 'Colored'],
  },
  {
    value: 'metal',
    label: 'Metal',
    subTypes: ['Anodized Aluminum', 'Stainless Steel', 'Brass'],
  },
  {
    value: 'paper',
    label: 'Paper/Cardboard',
    subTypes: ['Cardstock', 'Kraft', 'Bristol'],
  },
];

export const dpiOptions = [
  { value: 100, label: '100 DPI', dotSize: '0.254mm' },
  { value: 150, label: '150 DPI', dotSize: '0.169mm' },
  { value: 200, label: '200 DPI', dotSize: '0.127mm' },
  { value: 254, label: '254 DPI', dotSize: '0.100mm' },
  { value: 300, label: '300 DPI', dotSize: '0.085mm' },
  { value: 318, label: '318 DPI', dotSize: '0.080mm' },
  { value: 400, label: '400 DPI', dotSize: '0.064mm' },
  { value: 500, label: '500 DPI', dotSize: '0.051mm' },
  { value: 600, label: '600 DPI', dotSize: '0.042mm' },
];
