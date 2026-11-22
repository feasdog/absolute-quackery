import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` makes one self-contained dist/index.html you can open
// or share without a server.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
});
