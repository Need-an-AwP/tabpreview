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

// THIS SHOULD BE SET TO TRUE IN PRODUCTION
let AUTOCLOSE = true;
if (import.meta.env.MODE !== 'development') { // using mode str instead of env
    AUTOCLOSE = true;
}

// debug: open dev tools when autoclose is disabled
!AUTOCLOSE && vscodeActions.openDevTools();

console.log('CONFIG:', window.__CONFIG__, '\nTABGROUPS:', window.__TAB_GROUPS__);

initState({
    tabGroups: window.__TAB_GROUPS__ ?? [],
    config: window.__CONFIG__ ?? defaultConfig,
});

// first render
rerender();

function updateSelectedTab(delta = 1) {
    if (delta !== 0 && state.currentGroupTabs.length > 1) {
        state.selectedTabIndex =
            (state.selectedTabIndex + delta + state.currentGroupTabs.length) % state.currentGroupTabs.length;
        rerender();
    }
}

function closeTabPreviewWindow(isSwitchingTab: boolean) {
    // seperate switch signal and close signal
    if (isSwitchingTab) {
        const tab = state.currentGroupTabs[state.selectedTabIndex];
        vscodeActions.switchTab(tab);
    }
    if (AUTOCLOSE) {
        vscodeActions.closeTabPreview();
    }
}

window.focus(); // make sure the Webview has focus to capture key events immediately

window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        updateSelectedTab(e.shiftKey ? -1 : 1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        updateSelectedTab(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        updateSelectedTab(-1);
    }
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.key === 'Control') {
        // 向插件 postMessage 发送信号关闭 Webview
        closeTabPreviewWindow(true);
    }
});

// close Webview when it loses focus (e.g., user clicks away or switches windows)
window.addEventListener('blur', () => {
    closeTabPreviewWindow(false);
});

// listen to messages from the extension to update data without reloading
window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.command) {
        case 'updateAll':
            if (message.tabsData && message.config) {
                console.log('update data in webview', message.tabsData, message.config);
                initState({
                    tabGroups: message.tabsData,
                    config: message.config,
                });
                rerender();
            }
            break;
    }
});