// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://ditherandetch.ca',
  integrations: [sitemap(), svelte()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: [
        '@huggingface/transformers',
        'onnxruntime-web',
        'sharp',
        'upscaler',
        '@upscalerjs/esrgan-slim',
        '@tensorflow/tfjs',
      ],
    },
    ssr: {
      noExternal: ['upscaler', '@upscalerjs/esrgan-slim'],
    },
    build: {
      target: 'esnext',
    },
    esbuild: {
      supported: {
        'top-level-await': true,
      },
    },
  },
});
