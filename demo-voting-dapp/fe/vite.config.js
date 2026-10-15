import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// ----------------------------------------------------------------------

// Where /api is proxied to; in k8s this is the backend service (BACKEND_URL=http://online-voting-be:8080).
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

export default defineConfig({
  plugins: [
    react()   
  ],
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: path.join(process.cwd(), 'node_modules/$1'),
      },
      {
        find: /^src(.+)/,
        replacement: path.join(process.cwd(), 'src/$1'),
      },
    ],
  },
  server: {
    port: 3030,
    proxy: {
      "/api": {
        target: backendUrl,
        secure: false,
      },
    },
  },
  preview: {
    port: 3030,
    // accessed through k8s service names / port-forwards, not just localhost
    allowedHosts: true,
    proxy: {
      "/api": {
        target: backendUrl,
        secure: false,
      },
    },
  },
});
