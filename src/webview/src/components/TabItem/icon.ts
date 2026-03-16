import { html } from 'lit-html';
import type { TabInfo } from '@shared/types';
import { state } from '@/state';

export function tabIcon(tab: TabInfo) {
    const config = state.config;
    return html`<img
        src="${tab.iconUri}"
        class="z-10 aspect-square
                ${config.icon.grayscale ? 'grayscale' : ''}
                ${getIconPositionClasses(config.icon.position)}"
        style="opacity: ${config.icon.opacity}; 
                width: ${config.icon.size}px; 
                height: ${config.icon.size}px;"
    />`;
}

function getIconPositionClasses(position?: string) {
    switch (position) {
        case 'top':
            return 'absolute top-0 left-1/2 transform -translate-x-1/2';
        case 'bottom':
            return 'absolute bottom-0 left-1/2 transform -translate-x-1/2';
        case 'top-left':
            return 'absolute top-0 left-0';
        case 'top-right':
            return 'absolute top-0 right-0';
        case 'center-left':
            return 'absolute left-0 top-1/2 transform -translate-y-1/2';
        case 'center-right':
            return 'absolute right-0 top-1/2 transform -translate-y-1/2';
        case 'bottom-left':
            return 'absolute bottom-0 left-0';
        case 'bottom-right':
            return 'absolute bottom-0 right-0';
        case 'center':
        default:
            return 'absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }
}
