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
    textContent?: string;
    language?: string;
}

export interface TabGroupInfo {
    isActive: boolean;
    viewColumn: number;
    tabs: TabInfo[];
}

type IconPosition =
    | 'top'
    | 'center'
    | 'bottom'
    | 'top-left'
    | 'top-right'
    | 'center-left'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-right';

/** Complete config */
export interface Config {
    /** Size in px */
    size: number;
    icon: {
        /** Display icon */
        display: boolean;
        /** Grayscale icon */
        grayscale: boolean;
        /** Opacity, range: 0 to 1 */
        opacity: number;
        /** Size in px */
        size: number;
        /** Icon position */
        position: IconPosition;
    },
    text: {},
    /** Show close button */
    showCloseButton: boolean;
    thumbnail: {
        /** Display thumbnail */
        display: boolean;
        /** Monaco Editor theme for thumbnail */
        theme: string;
        /** Font size in px */
        fontSize: number;
        /** Line height in px */
        lineHeight: number;
        /** Render characters */
        renderCharacters: boolean;
        /** Opacity, range: 0 to 1 */
        opacity: number;
    }
}
