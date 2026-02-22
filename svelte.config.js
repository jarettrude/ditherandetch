import { vitePreprocess } from '@astrojs/svelte';

export default {
  // Consult https://svelte.dev/docs/introduction-to-svelte#preprocessors
  // for more information about preprocessors.
  preprocess: vitePreprocess(),
  compilerOptions: {
    dev: process.env.NODE_ENV !== 'production'
  }
};
