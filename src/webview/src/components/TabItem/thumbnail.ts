import { html } from 'lit-html';
import { ref } from 'lit-html/directives/ref.js';
import type { TabInfo } from '@shared/types';
import { state } from '@/state';

// only import language contributions and editor from monaco, to reduce bundle size
// 仅从monaco editor中导入所有语言包及editor模块，减少打包体积
//@ts-ignore
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
const languageModules = import.meta.glob(
    '/node_modules/monaco-editor/esm/vs/basic-languages/*/*.contribution.js',
    { eager: true }
);
console.log('Number of language modules loaded:', Object.keys(languageModules).length);


export function thumbnail(tab: TabInfo) {
    const thumbnailConfig = state.config.thumbnail;
    const monacoMountHook = (element?: Element) => {
        if (!element || !tab.textContent || tab.textContent.length === 0) {
            return;
        }
        const container = element as HTMLDivElement;

        // debouncing: 避免重复注入 Monaco 编辑器实例
        if (container.hasAttribute('data-monaco-injected')) {
            return;
        }
        container.setAttribute('data-monaco-injected', 'true');

        // load text content
        const content = tab.textContent;
        container.textContent = content;

        // 4. 原地进行极轻量级的静态高亮渲染，无需查找，无需重新渲染 App
        editor
            .colorizeElement(container, {
                theme: thumbnailConfig.theme,
                mimeType: tab.language,
            })
            .then(() => {
                // 着色后应用“缩略图”视觉样式
                container.style.fontSize = `${thumbnailConfig.fontSize}px`;
                container.style.lineHeight = `${thumbnailConfig.lineHeight}px`;

                if (!thumbnailConfig.renderCharacters) {
                    container.querySelectorAll('span').forEach((span) => {
                        span.style.backgroundColor = 'currentColor';
                    });
                }
            });
    };

    return html`
        <div
            class="thumbnail z-0 pointer-events-none overflow-hidden"
            style="opacity: ${thumbnailConfig.opacity};"
            ${ref(monacoMountHook)}
        />
    `;
}
