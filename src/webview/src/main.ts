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
let AUTOCLOSE = false;
if (import.meta.env.MODE !== 'development') { // using mode str instead of env
    AUTOCLOSE = true;
}

// debug: open dev tools when autoclose is disabled
!AUTOCLOSE && vscodeActions.openDevTools();

!AUTOCLOSE && console.log('CONFIG:', window.__CONFIG__, '\nTABGROUPS:', window.__TAB_GROUPS__);

initState({
    tabGroups: window.__TAB_GROUPS__ ?? [],
    config: window.__CONFIG__ ?? defaultConfig,
});

// first render
rerender();

// start from 1, automatically change to the next tab
function updateActiveTab(delta = 1) {
    const tabItems = document.querySelectorAll<HTMLDivElement>('.tab-item');
    if (delta !== 0 && state.currentGroupTabs.length > 1) {
        state.selectedTabIndex =
            (state.selectedTabIndex + delta + state.currentGroupTabs.length) % state.currentGroupTabs.length;
    }
    tabItems.forEach((el, i) => el.classList.toggle('active', i === state.selectedTabIndex));
}
updateActiveTab();

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
        updateActiveTab(e.shiftKey ? -1 : 1);
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
