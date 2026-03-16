import { html } from 'lit-html';
import type { TabInfo } from '@shared/types';
import { state } from '@/state';
import { closeTabAndRerender } from '@/actions';
import { vscodeActions } from '@/vscode';
import { thumbnail } from './thumbnail';
import { tabIcon } from './icon';

// z-20 close button & text & tab label
// z-10 icon
// z-0 thumbnail

const hasThumbnail = (tab: TabInfo): boolean => {
    const config = state.config;
    return tab.textContent !== undefined && tab.textContent.length > 0 && config.thumbnail.display;
};


export function TabItem(tab: TabInfo) {
    const config = state.config;
    const hasThumbnailFlag = hasThumbnail(tab);

    return html`
        <div
            id="tab-${tab.uri}"
            class="tab-item relative group ${hasThumbnailFlag ? 'has-thumbnail' : ''}"
            style="${hasThumbnailFlag
                ? `min-width: ${config.size}px; min-height: ${config.size}px;`
                : `width: ${config.size}px; height: ${config.size}px;`}"
            @click=${(e: MouseEvent) => {
                e.preventDefault();
                vscodeActions.switchTab(tab);
                vscodeActions.closeTabPreview();
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
            ${tabLabel(tab)}

            <!-- tab icon -->
            ${tab.iconUri && config.icon.display ? tabIcon(tab) : ''}

            <!-- editor thumbnail -->
            ${hasThumbnailFlag ? thumbnail(tab) : ''}

            <!-- close icon -->
            ${config.showCloseButton ? closeButton(tab) : ''}
        </div>
    `;
}

function tabLabel(tab: TabInfo) {
    return html`
        <span
            class="z-20
        absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
            ${tab.isDirty ? '● ' : ''}${tab.label}
        </span>
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
