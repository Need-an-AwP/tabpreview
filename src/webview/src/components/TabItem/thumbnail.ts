import { html } from 'lit-html';
import { ref } from 'lit-html/directives/ref.js';
import type { TabInfo } from '@shared/types';
import { state } from '@/state';

// only import language contributions and editor from monaco, to reduce bundle size
// 仅从monaco editor中导入所有语言包及editor模块，减少打包体积
//@ts-ignore
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
const jsonModules = import.meta.glob(
    '/node_modules/monaco-editor/esm/vs/language/json/*.js',
    { eager: true }
);
console.log('json modules loaded:', Object.keys(jsonModules).length);
const basicLanguageModules = import.meta.glob(
    '/node_modules/monaco-editor/esm/vs/basic-languages/*/*.contribution.js',
    { eager: true }
);
console.log('basic language modules loaded:', Object.keys(basicLanguageModules).length);


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

        editor.setTheme(state.config.thumbnail.theme);
        editor
            .colorize(
                content,
                tab.language || 'plaintext',
                { tabSize: undefined } // tab width, default 4
            )
            .then((htmlString: string) => {
                container.innerHTML = htmlString;
                container.style.fontSize = `${thumbnailConfig.fontSize}px`;
                container.style.lineHeight = `${thumbnailConfig.lineHeight}px`;

                // 部分tokenizer会将缩进空格和文本内容合并在同一个span中，目前无法处理
                // 参考vscode的minimap渲染可能会有帮助
                // some tokenizers merge indentation spaces with text content in the same span, which cannot be handled at the moment
                // referencing vscode's minimap rendering might be helpful
                if (!thumbnailConfig.renderCharacters) {
                    // only select spans with class containing 'mtk' (monaco token class)
                    container.querySelectorAll<HTMLSpanElement>('span[class*="mtk"]').forEach((span) => {
                        // only set background color for non-empty spans
                        if (span.textContent && span.textContent.trim() !== '') {
                            span.style.backgroundColor = 'currentColor';
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
