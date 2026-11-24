import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // GitHub Pages hosts this repository at /architectualdesign/.
  // Local development remains at the site root.
  base: process.env.GITHUB_PAGES === 'true' ? '/architectualdesign/' : '/',
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        actualHouse: resolve(import.meta.dirname, 'actual-house.html'),
        furnitureReview: resolve(import.meta.dirname, 'phase14-review.html')
      }
    }
  }
});
