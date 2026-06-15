// @ts-check
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://ditherandetch.ca',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      filter: page =>
        !page.endsWith('/404/') &&
        !page.endsWith('/429/') &&
        !page.endsWith('/500/') &&
        !page.endsWith('/503/'),
    }),
    svelte(),
  ],
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
