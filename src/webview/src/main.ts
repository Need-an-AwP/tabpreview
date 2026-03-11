import './style.css';
import { html, render } from 'lit-html';
import { createIcons, X } from 'lucide';
import type { TabGroupInfo, Config, TabInfo } from '../../shared/types';
import { defaultConfig } from '../../shared/types';
const vscode = acquireVsCodeApi();

declare global {
    interface Window {
        __TAB_GROUPS__: TabGroupInfo[];
        __CONFIG__: Config;
    }
}

const AUTOCLOSE = true;
// debug: open dev tools when autoclose is disabled
!AUTOCLOSE && vscode.postMessage({ command: 'openDevTools' });

console.log(window.__CONFIG__);
const tabGroups = window.__TAB_GROUPS__ ?? [];
const config = window.__CONFIG__ ?? defaultConfig;
const currentGroupIndex = tabGroups.findIndex((g) => g.isActive);
let currentGroupTabs = tabGroups.find((g) => g.isActive)?.tabs ?? [];

const app = document.querySelector<HTMLDivElement>('#app')!;
const bodyTemplate = (tabs: TabInfo[]) => html`
    <div class="justify-center items-center gap-4 flex h-full flex-col select-none">
        <div class="flex flex-col justify-center gap-4">
            ${tabs.length > 0
                ? tabs.map(
                      (tab) => html`
                          <div
                              class="tab-item relative group"
                              data-uri="${tab.uri}"
                              data-input-type="${tab.inputType}"
                              @auxclick=${(e: PointerEvent) => {
                                  // close tab by clicking auxiliary mouse button
                                  if (e.button === 1) {
                                      e.preventDefault();
                                      const tabUri = tab.uri;
                                      tabUri
                                          ? closeTab(tabUri)
                                          : console.warn('Tab URI not found for closing');
                                  }
                              }}
                          >
                              <!-- tab label -->
                              <span class="tab-label z-10">
                                  ${tab.isDirty ? '● ' : ''}${tab.label}
                              </span>

                              <!-- tab icon -->
                              ${tab.iconUri &&
                              config.icon.enable &&
                              html`<img
                                  src="${tab.iconUri}"
                                  class="z-0 ${config.icon.grayscale && 'grayscale'} 
				  absolute left-0 top-0 opacity-50 w-full h-full"
                              />`}

                              <!-- close icon -->
                              <div
                                  class="absolute right-0 top-0 p-0 z-20 rounded-md
                            opacity-0 group-hover:opacity-100 hover:bg-red-500"
                                  @click=${(e: MouseEvent) => {
                                      e.stopPropagation();
                                      const tabUri = tab.uri;
                                      tabUri
                                          ? closeTab(tabUri)
                                          : console.warn('Tab URI not found for closing');
                                  }}
                              >
                                  <i data-lucide="X"></i>
                              </div>
                          </div>
                      `,
                  )
                : html`<div class="text-gray-500 italic">No tabs open in the current group</div>`}
        </div>
    </div>
`;
render(bodyTemplate(currentGroupTabs), app);

// create lucide icons after rendering
createIcons({
    icons: {
        X,
    },
});

let selectedTabIndex = Math.max(
    0,
    currentGroupTabs.findIndex((t) => t.isActive),
);

// start from 1, automatically change to the next tab
function updateActiveTab(delta = 1) {
    const tabItems = document.querySelectorAll<HTMLDivElement>('.tab-item');
    if (delta !== 0 && currentGroupTabs.length > 1) {
        selectedTabIndex =
            (selectedTabIndex + delta + currentGroupTabs.length) % currentGroupTabs.length;
    }
    tabItems.forEach((el, i) => el.classList.toggle('active', i === selectedTabIndex));
}
updateActiveTab();

function closeTabPreviewWindow(isSwitchingTab: boolean) {
    // seperate switch signal and close signal
    if (isSwitchingTab) {
        const tab = currentGroupTabs[selectedTabIndex];
        vscode.postMessage({
            command: 'switchTab',
            uri: tab.uri,
            inputType: tab.inputType,
        });
    }
    if (AUTOCLOSE) {
        vscode.postMessage({ command: 'close' });
    }
}

function closeTab(uri: string) {
    vscode.postMessage({
        command: 'closeTab',
        uri,
        groupIndex: currentGroupIndex,
    });
    // rerender the tab list after closing a tab
    currentGroupTabs = currentGroupTabs.filter((t) => t.uri !== uri);
    render(bodyTemplate(currentGroupTabs), app);
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
