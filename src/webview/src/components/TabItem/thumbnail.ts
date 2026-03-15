import { html } from 'lit-html';
import { ref } from 'lit-html/directives/ref.js';
import { editor } from 'monaco-editor';
import type { TabInfo } from '@shared/types';

export function thumbnail(tab: TabInfo) {
    const monacoMountHook = (element?: Element) => {
        if (!element) {
            return;
        }
        const container = element as HTMLDivElement;

        // 1. 防抖检查：避免 Lit 的更新机制导致重复着色
        if (container.hasAttribute('data-monaco-injected')) {
            return;
        }
        container.setAttribute('data-monaco-injected', 'true');

        // 2. 拿到具体的内容并推断语言
        const content = tab.textContent || '';

        // 3. 将内容提前塞入容器
        container.textContent = content;

        // 4. 原地进行极轻量级的静态高亮渲染，无需查找，无需重新渲染 App
        editor
            .colorizeElement(container, {
                theme: 'vs-dark',
                mimeType: tab.language,
            })
            .then(() => {
                // 着色后应用“缩略图”视觉样式
                container.style.fontSize = '4px';
                container.style.lineHeight = '6px';
                container.style.overflow = 'hidden';
                container.style.pointerEvents = 'none';
            });
    };

    return html` <div class="thumbnail" ${ref(monacoMountHook)}></div> `;
}
