import { defineConfig } from 'vite';

// Em prod (GitHub Pages) o jogo fica em https://terra-gentil.github.io/terra-gentil-game/
// Em dev usamos './' relativo pra abrir no celular sem dor.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/terra-gentil-game/' : './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
  },
}));
