import type { TabInfo } from '@shared/types';
import {state} from './state';

const vscode = acquireVsCodeApi();

export const vscodeActions = {
    openDevTools: () => vscode.postMessage({ command: 'openDevTools' }),
    switchTab: (tab: TabInfo) => {
        vscode.postMessage({
            command: 'switchTab',
            uri: tab.uri,
            inputType: tab.inputType,
        });
    },
    closeTabPreview: () => vscode.postMessage({ command: 'close' }),
    closeTab: (uri: string) => {
        console.log('Closing tab with URI:', uri, 'group index:', state.currentGroupIndex);
        vscode.postMessage({
            command: 'closeTab',
            uri,
            groupIndex: state.currentGroupIndex,
        });
    },
    reportLoadComplete: (e: string) => vscode.postMessage({ command: 'loadComplete', event: e }),
};