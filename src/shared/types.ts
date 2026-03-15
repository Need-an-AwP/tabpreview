export type TabInputType =
    | 'text'
    | 'textDiff'
    | 'notebook'
    | 'notebookDiff'
    | 'custom'
    | 'webview'
    | 'terminal'
    | 'unknown';

export interface TabInfo {
    isActive: boolean;
    label: string;
    uri?: string;
    inputType?: TabInputType;
    isDirty: boolean;
    isPinned: boolean;
    isPreview: boolean;
    iconUri: string | undefined;
    textContent?:string;
    language?: string;
}

export interface TabGroupInfo {
    isActive: boolean;
    viewColumn: number;
    tabs: TabInfo[];
}

export interface Config {
    size: number; // size of the tab preview in pixels
    icon: {
        showIcon: boolean;
        grayscale: boolean;
        opacity: number; // Range: 0 to 1
        size: number; // percentage of the tab item size, e.g., 0.5 means 50% of the tab item size
    },
    text: {
        fontSize?: number;
        fontColor?: string;
    },
    showCloseButton: boolean;
    showThumbnail: boolean;
}

export const defaultConfig: Config = {
    size: 90,
    icon: {
        showIcon: true,
        grayscale: false,
        opacity: 0.5,
        size: 0.5,
    },
    text: {},
    showCloseButton: true,
    showThumbnail: false,
};