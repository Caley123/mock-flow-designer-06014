import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { cspConnectSrcPlugin } from "./vite-plugin-csp-connect";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/openwa": {
        target: "http://localhost:2785",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openwa/, "/api"),
      },
    },
  },
  plugins: [react(), cspConnectSrcPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip'
          ],
          'chart-vendor': ['recharts'],
          'utils-vendor': ['date-fns', 'zod', 'jspdf', 'exceljs'],
          'spring-vendor': ['@react-spring/web'],
          'gsap-vendor': ['gsap', '@gsap/react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'gsap', '@gsap/react'],
  },
}));
