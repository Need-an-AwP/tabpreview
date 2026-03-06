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
}

export interface TabGroupInfo {
    isActive: boolean;
    viewColumn: number;
    tabs: TabInfo[];
}
