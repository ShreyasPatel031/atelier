import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const path = fileURLToPath(import.meta.url);

export default {
  root: join(dirname(path), "client"),
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    hmr: {
      // Use a dedicated port for HMR WebSocket to avoid conflicts
      port: 24678,
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  plugins: [react()],
  // Explicitly define environment variables for client-side access
  define: {
    // This will be replaced at build time
    'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY),
    __APP_ENV__: JSON.stringify(process.env.VITE_VERCEL_ENV),
  }
}; 