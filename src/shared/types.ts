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
}

export interface TabGroupInfo {
    isActive: boolean;
    viewColumn: number;
    tabs: TabInfo[];
}

export interface Config {
    icon: {
        enable: boolean;
        grayscale: boolean;
        opacity: number;
    },
    text: {
        fontSize?: number;
    }
}

export const defaultConfig: Config = {
    icon: {
        enable: true,
        grayscale: false,
        opacity: 0.5,
    },
    text: {}
};