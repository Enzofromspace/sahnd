import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works under any path, including
  // https://<user>.github.io/sahnd/ on GitHub Pages.
  base: './',
});
