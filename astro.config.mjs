import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server', // ← ADD THIS LINE
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [react()],
  adapter: netlify()
});
