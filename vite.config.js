const { defineConfig } = require('vite');
const path = require('path');

module.exports = defineConfig({
  root: path.resolve(__dirname, 'web'),
  base: './',
  server: {
    port: 5173,
    strictPort: true
  }
});
