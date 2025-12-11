import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '')
          }
        }
      },
      // This is the important part for `vite preview`
      preview: {
        port: 4173, // default preview port, change if you use --port
        host: '0.0.0.0', // expose to network
        allowedHosts: [
          'localhost',
          '127.0.0.1',
          'emobon-kb.web.vliz.be',     // your custom domain
          // add more subdomains/hosts if needed, e.g.:
          // '.vliz.be',              // allows all subdomains (Vite 5.4+)
        ],
        // Or simply allow everything (quick & dirty for testing):
        // allowedHosts: 'all',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
