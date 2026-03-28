import type { Config } from './types';

export const defaultConfig: Config = {
    retainWebview: true,
    size: 90,
    icon: {
        display: true,
        grayscale: false,
        opacity: 0.6,
        size: 45,
        position: 'center'
    },
    text: {},
    showCloseButton: true,
    thumbnail: {
        display: true,
        theme: 'vs-dark',
        fontSize: 4,
        lineHeight: 8,
        renderCharacters: false,
        opacity: 0.4,
        onlyVisibleRange: true
    }
};