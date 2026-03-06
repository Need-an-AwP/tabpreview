// vite.config.ts
import { viteSingleFile } from 'vite-plugin-singlefile';
import tailwindcss from '@tailwindcss/vite';


export default {
  plugins: [
    viteSingleFile(),
    tailwindcss()
  ],
  build: {
    assetsInlineLimit: 100_000_000, // 强制内联所有资源
    cssCodeSplit: false,
  }
};