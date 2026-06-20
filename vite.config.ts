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
      "/sc-proxy": {
        target: "http://localhost:2785",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sc-proxy/, "/api"),
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
    modulePreload: {
      resolveDependencies(_filename, deps) {
        // No precargar librerías pesadas de reportes en la primera pantalla.
        return deps.filter(
          (dep) =>
            !dep.includes('report-excel') &&
            !dep.includes('report-pdf') &&
            !dep.includes('spring-vendor')
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // No separar recharts: crear un chunk compartido provoca ciclo react-vendor ↔ chart-vendor
          // (Rollup reutiliza helpers en chart-vendor que react-vendor termina importando).

          if (id.includes('/exceljs/')) return 'report-excel';
          if (id.includes('/jspdf')) return 'report-pdf';
          if (id.includes('/@react-spring/')) return 'spring-vendor';
          if (id.includes('/gsap/') || id.includes('/@gsap/')) return 'gsap-vendor';

          if (
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/react-router/') ||
            /\/node_modules\/react\//.test(id)
          ) {
            return 'react-vendor';
          }

          if (id.includes('/@radix-ui/')) return 'ui-vendor';
          if (id.includes('/date-fns/') || id.includes('/zod/')) return 'utils-vendor';
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
