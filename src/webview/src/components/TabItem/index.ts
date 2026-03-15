import { html } from 'lit-html';
import type { TabInfo } from '@shared/types';
import { state } from '@/state';
import { closeTabAndRerender } from '@/actions';
import { thumbnail } from './thumbnail';

export function TabItem(tab: TabInfo) {
    const config = state.config;
    return html`
        <div
            id="tab-${tab.uri}"
            class="tab-item relative group"
            style="width: ${config.size}px; height: ${config.size}px;"
            data-uri="${tab.uri}"
            data-input-type="${tab.inputType}"
            @click=${(e: MouseEvent) => {
                e.preventDefault();
            }}
            @auxclick=${(e: PointerEvent) => {
                // close tab by clicking auxiliary mouse button
                if (e.button === 1) {
                    e.preventDefault();
                    if (tab.uri) {
                        closeTabAndRerender(tab.uri);
                    } else {
                        console.warn('Tab URI not found for closing');
                    }
                }
            }}
        >
            <!-- tab label -->
            <span class="z-20"> ${tab.isDirty ? '● ' : ''}${tab.label} </span>

            <!-- tab icon -->
            ${tab.iconUri &&
            config.icon.showIcon &&
            html`<img
                src="${tab.iconUri}"
                class="z-10 aspect-square
                ${config.icon.grayscale ? 'grayscale' : ''}
                absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style="opacity: ${config.icon.opacity}; 
                width: ${config.icon.size * 100}%; 
                height: ${config.icon.size * 100}%"
            />`}

            <!-- editor thumbnail -->
            ${config.showThumbnail ? thumbnail(tab) : ''}

            <!-- close icon -->
            ${config.showCloseButton ? closeButton(tab) : ''}
        </div>
    `;
}

function closeButton(tab: TabInfo) {
    return html`
        <div
            class="absolute right-0 top-0 p-0 z-20 rounded-md
                    opacity-0 group-hover:opacity-100 hover:bg-red-800"
            @click=${(e: MouseEvent) => {
                e.stopPropagation();
                if (tab.uri) {
                    closeTabAndRerender(tab.uri);
                } else {
                    console.warn('Tab URI not found for closing');
                }
            }}
        >
            <i data-lucide="X"></i>
        </div>
    `;
}
