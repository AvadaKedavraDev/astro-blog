// @ts-check
import {defineConfig} from 'astro/config';
import expressiveCode from 'astro-expressive-code';
// Tailwind CSS Vite 插件 - 用于处理样式
import tailwindcss from '@tailwindcss/vite';
// Expressive Code 的折叠代码块插件（这是 Expressive Code 插件，不是 Vite 插件！）
import {pluginCollapsibleSections} from '@expressive-code/plugin-collapsible-sections'
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkCallouts from 'remark-callouts';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import swup, {Theme} from '@swup/astro';
import react from '@astrojs/react';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss(), pluginCollapsibleSections()],
    },

    markdown: {
        // 解决MD 换行被破坏、注释挤在一起的问题
        remarkPlugins: [remarkGfm, remarkBreaks, remarkCallouts, remarkMath],
        rehypePlugins: [rehypeKatex],
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
            themes: ['catppuccin-latte', 'dracula'], // 1. 关闭自动媒体查询，完全交给下面的手动选择器控制
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
                borderRadius: '0.5rem', // 调小框架上方的内边距
                frames: {
                    editorActiveTabIndicatorHeight: '2px', // 标签下方横线高度
                    editorTabBarBackground: 'transparent', // 标签栏透明
                },
                uiPaddingBlock: '0.2rem',// 增加底部内边距，确保滚动条不遮挡代码
                codeFontSize: '0.85rem',// 稍微调小字号
            },

        }), react(), icon()],
});