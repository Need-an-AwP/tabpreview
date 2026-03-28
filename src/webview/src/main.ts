import './style.css';
import type { TabGroupInfo, Config } from '@shared/types';
import { defaultConfig } from '@shared/defaultConfig';
import { initState, state } from './state';
import { vscodeActions } from './vscode';
import { rerender } from './render';

declare global {
    interface Window {
        __TAB_GROUPS__: TabGroupInfo[];
        __CONFIG__: Config;
    }
}

if (import.meta.env.MODE === 'development') { // using mode str instead of env
    vscodeActions.openDevTools();
    console.log('CONFIG:', window.__CONFIG__, '\nTABGROUPS:', window.__TAB_GROUPS__);
}


initState({
    tabGroups: window.__TAB_GROUPS__ ?? [],
    config: window.__CONFIG__ ?? defaultConfig,
});

// first render
rerender();

if (!state.config.retainWebview) {
    window.addEventListener('blur', () => {
        (window as any).vscodeApi.postMessage({ command: 'closeTabPreviewWindow', isSwitchingTab: false });
    });
}

// listen to messages from the extension to update data without reloading
window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.command) {
        case 'selectedTabIndex':
            if (message.selectedTabIndex !== undefined) {
                // console.log('Selected tab index:', message.selectedTabIndex);
                state.selectedTabIndex = message.selectedTabIndex;
                rerender();
            }
            break;
        case 'updateAll':
            if (message.tabsData && message.config) {
                // console.log('update data in webview', message.tabsData, message.config);
                initState({
                    tabGroups: message.tabsData,
                    config: message.config,
                });
                rerender();
            }
            break;
    }
});