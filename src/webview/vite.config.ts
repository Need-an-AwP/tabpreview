// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
import path, { resolve } from 'path';

export default {
  base: './', // 生成的文件相对于当前 HTML 文件的位置
  build: {
    outDir: '../../media',
    emptyOutDir: true
  },
  plugins: [
    // viteSingleFile(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  }
};