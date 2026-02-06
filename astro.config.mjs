// @ts-check
import {defineConfig} from 'astro/config';
import expressiveCode from 'astro-expressive-code';
// Tailwind CSS Vite 插件 - 用于处理样式
import tailwindcss from '@tailwindcss/vite';
// Expressive Code 的折叠代码块插件（这是 Expressive Code 插件，不是 Vite 插件！）
import {pluginCollapsibleSections} from '@expressive-code/plugin-collapsible-sections'
import rehypeCodeGroup from 'rehype-code-group';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkCallouts from 'remark-callouts';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import swup, {Theme} from '@swup/astro';
import react from '@astrojs/react';
import icon from 'astro-icon';

// 导入原始主题（Shiki 格式）
import latte from 'shiki/themes/catppuccin-latte.mjs';

// 创建自定义主题（深拷贝并覆盖颜色）
const customLatte = {
  ...latte,
  name: 'catppuccin-latte-custom', // 改名避免与内置冲突（可选）
  colors: {
    ...latte.colors,
    // 核心背景色（代码块背景）
    'editor.background': '#f6f6fa',  
    // 各种边框色
    'panel.border': '#e1e1e8',           // 面板边框
    'editorGroup.border': '#e1e1e8',     // 编辑器组边框
    'sideBar.border': '#e1e1e8',         // 侧边栏边框（如果有）
    // 如果需要调整行号栏背景等
    'editorLineNumber.foreground': '#9ca0b0',
  }
};

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss(), pluginCollapsibleSections()],
    },

    markdown: {
        // 解决MD 换行被破坏、注释挤在一起的问题
        remarkPlugins: [remarkGfm, remarkBreaks, remarkCallouts, remarkMath],
        rehypePlugins: [rehypeKatex, rehypeCodeGroup],
    },

    integrations: [
        swup({
            theme: [Theme.fade, {
                duration: 100,
                delay: 0,
                easing: 'ease-in-out',
                factor: 1
            }],

            // @ts-ignore
            animateHistoryBrowsing: false,
            linkSelector: 'a[href]:not([data-no-swup]):not([href^="#"])',
            // 启用全局实例，以便配置 Scroll Plugin
            globalInstance: true,
        }),
        expressiveCode({
            themes: [customLatte, 'houston'], // 1. 关闭自动媒体查询，完全交给下面的手动选择器控制
            useDarkModeMediaQuery: false,

            // 2. 修正逻辑：暗色主题挂在 .dark 下，亮色主题挂在非 .dark 下
            themeCssSelector: (theme) => {
                // 直接返回类名字符串，不要带 &，让插件自动处理嵌套
                if (theme.type === 'dark') return '.dark';
                return ':root:not(.dark)';
            },

            // 实际上可以通过配置全局的默认 props
            defaultProps: {
                wrap: true, // 这里的 wrap 是有效的
            },

            styleOverrides: {
                borderRadius: '0.625rem',
                codePaddingInline: '1.25rem',
                codePaddingBlock: '1rem',
                codeFontSize: '0.8125rem',
                // 隐藏终端框架的标题栏
                frames: {
                    terminalTitleBarDotsForeground: 'transparent',
                    terminalTitleBarDotsOpacity: '0',
                    tooltipSuccessBackground: 'var(--foreground)',
                    tooltipSuccessForeground: 'var(--background)',
                },
            },
            defaultProps: {
                wrap: true,
                showLineNumbers: false,
            },
        

        }), react(), icon()],
});