import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        includeAssets: ['snake-logo-final.png', 'favicon.ico', 'masked-icon.svg'],
        manifestFilename: 'manifest.json',
        manifest: {
          name: 'Snake MK Edition',
          short_name: 'Snake MK',
          description: 'A classic snake game with global leaderboards',
          theme_color: '#06b6d4',
          background_color: '#000000',
          display: 'fullscreen',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: '/snake-logo-final.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/snake-logo-final.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/snake-logo-final.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/snake-logo-final.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('firebase/auth')) return 'vendor-fb-auth';
              if (id.includes('firebase/firestore')) return 'vendor-fb-db';
              if (id.includes('firebase/app')) return 'vendor-fb-app';
              if (id.includes('react')) return 'vendor-react';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('lucide')) return 'vendor-ui';
              return 'vendor-utils';
            }
          },
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      chunkSizeWarningLimit: 600,
      reportCompressedSize: false
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
