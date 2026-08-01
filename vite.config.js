import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // The GLB loader stack (GLTFLoader + meshopt wasm decoder +
          // SkeletonUtils) is only reached through the dynamic import in
          // src/combat/MeshyCast.js, which happens during the combat fade.
          // Without this it gets swept into vendor-three and lands in the boot
          // payload for a player who may never enter a fight.
          if (id.includes('loaders/GLTFLoader')
            || id.includes('meshopt_decoder')
            || id.includes('utils/SkeletonUtils')
            || id.includes('utils/BufferGeometryUtils')) return 'meshy-loader';
          if (id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('/src/data/dialogs/')) return 'game-dialogs';
          if (id.includes('/src/data/')) return 'game-data';
        }
      }
    }
  }
});
