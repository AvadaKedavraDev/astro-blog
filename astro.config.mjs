// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    expressiveCode({
      // 1. 仅保留最核心的主题定义
      // 插件会自动识别 github-light 为亮色，tokyo-night 为暗色
      themes: ['github-light', 'tokyo-night'],

      // 2. 这里的配置是 styleOverrides，它是受支持的已知属性
      styleOverrides: {
        borderRadius: '0.75rem',
        codeFontSize: '0.875rem',
        // 如果你一定要手动干预背景，请确保在这里写逻辑
        codeBackground: ({ theme }) =>
            theme.name.includes('light') ? '#f8fafc' : '#1a1b26',
      },
    }),
  ],
});