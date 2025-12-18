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
      // 这里的顺序决定了默认主题，它会自动适配系统/类名切换
      themes: ['github-light', 'tokyo-night'],
      // 增强功能配置
      shikiConfig: {
        langs: ['typescript', 'javascript', 'rust', 'astro', 'shell', 'css'],
      },
      styleOverrides: {
        // 统一 UI 风格
        borderRadius: '0.75rem',
        codeFontSize: '0.875rem',
        codeLineHeight: '1.7',
        // 让 UI 边框在暗色模式下更克制
        uiBorderColor: 'var(--code-border-color, #24283b)',
      },
      // 允许在代码块上方显示文件名
      showClassName: true,
    }),
  ],
});