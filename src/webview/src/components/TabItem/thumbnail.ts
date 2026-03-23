import { html } from 'lit-html';
import { ref } from 'lit-html/directives/ref.js';
import type { TabInfo } from '@shared/types';
import { state } from '@/state';

// only import language contributions and editor from monaco, to reduce bundle size
// 仅从monaco editor中导入所有语言包及editor模块，减少打包体积
//@ts-ignore
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
// json language contribution is not included in basic-languages, treat it as plaintext
const basicLanguageModules = import.meta.glob(
    '/node_modules/monaco-editor/esm/vs/basic-languages/*/*.contribution.js'
);

export function thumbnail(tab: TabInfo) {
    const thumbnailConfig = state.config.thumbnail;
    const monacoMountHook = async (element?: Element) => {
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
        // console.log('text content of', tab.label, content);

        const lang = tab.language || 'plaintext';
        if (lang !== 'plaintext') {
            const basicKey = Object.keys(basicLanguageModules).find(k => k.includes(`/${lang}/${lang}.contribution.js`));
            if (basicKey && basicLanguageModules[basicKey]) {
                await basicLanguageModules[basicKey]();
            }
        }

        editor.setTheme(state.config.thumbnail.theme);
        editor
            .colorize(
                content,
                lang,
                { tabSize: undefined } // tab width, default 4
            )
            .then((htmlString: string) => {
                container.innerHTML = htmlString;
                container.style.fontSize = `${thumbnailConfig.fontSize}px`;
                container.style.lineHeight = `${thumbnailConfig.lineHeight}px`;

                // 显示色块
                if (!thumbnailConfig.renderCharacters) {
                    container.querySelectorAll<HTMLSpanElement>('span[class*="mtk"]').forEach((span) => {
                        const text = span.textContent;
                        // 手动处理空格字符的背景色，以确保在缩略图中空格不显示色块
                        if (text && text.trim() !== '') {
                            // Split text by standard spaces and non-breaking spaces
                            const parts = text.split(/([ \u00A0]+)/g);
                            if (parts.length > 1) {
                                const fragment = document.createDocumentFragment();
                                parts.forEach(part => {
                                    if (!part) {
                                        return;
                                    }
                                    const newSpan = document.createElement('span');
                                    newSpan.textContent = part;
                                    // Only preserve class and background color for non-space parts
                                    if (part.trim() !== '') {
                                        newSpan.className = span.className;
                                        newSpan.style.backgroundColor = 'currentColor';
                                    }
                                    fragment.appendChild(newSpan);
                                });
                                span.replaceWith(fragment);
                            } else {
                                span.style.backgroundColor = 'currentColor';
                            }
                        }
                    });
                }
            });
    };

    return html`
        <div
            class="z-0 pointer-events-none overflow-hidden"
            style="opacity: ${thumbnailConfig.opacity};"
            ${ref(monacoMountHook)}
        />
    `;
}
