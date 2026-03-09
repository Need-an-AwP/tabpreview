import './style.css';
import type { TabGroupInfo, Config } from '../../shared/types';
import { defaultConfig } from '../../shared/types';
const vscode = acquireVsCodeApi();

declare global {
	interface Window {
		__TAB_GROUPS__: TabGroupInfo[];
		__CONFIG__: Config;
	}
}

// window.addEventListener('message', event => {
// 	const message = event.data;
// });



const AUTOCLOSE = true;
// debug: open dev tools when autoclose is disabled
// !AUTOCLOSE && vscode.postMessage({ command: 'openDevTools' });


console.log(window.__CONFIG__);
const tabGroups = window.__TAB_GROUPS__ ?? [];
const config = window.__CONFIG__ ?? defaultConfig;
// const allTabs = tabGroups.flatMap(g => g.tabs);
const currentGroupTabs = tabGroups.find(g => g.isActive)?.tabs ?? [];

const tabListHtml = currentGroupTabs.map(tab => /* html */`
	<div class="tab-item relative">
		<span class="tab-label z-10">${tab.isDirty ? '● ' : ''}${tab.label}</span>
		${tab.iconUri && config.icon.enable &&
			/* html */`<img src="${tab.iconUri}" class="z-0 ${config.icon.grayscale && 'grayscale'} absolute left-0 top-0 opacity-50 w-full h-full" />`
	}
	</div>
`).join('');

document.querySelector<HTMLDivElement>('#app')!.innerHTML = /* html */`
	<div class="justify-center items-center gap-4 flex h-full flex-col select-none">
		<div class="flex flex-col justify-center gap-2">
			${tabListHtml}
		</div>
	</div>
`;

let selectedTabIndex = Math.max(0, currentGroupTabs.findIndex(t => t.isActive));
const tabItems = document.querySelectorAll<HTMLDivElement>('.tab-item');

// start from 1, automatically change to the next tab
function updateActiveTab(delta = 1) {
	if (delta !== 0 && currentGroupTabs.length > 1) {
		selectedTabIndex = (selectedTabIndex + delta + currentGroupTabs.length) % currentGroupTabs.length;
	}
	tabItems.forEach((el, i) => el.classList.toggle('active', i === selectedTabIndex));
}
updateActiveTab();

function closeWindow(isSwitchingTab: boolean) {
	// seperate switch signal and close signal
	if (isSwitchingTab) {
		const tab = currentGroupTabs[selectedTabIndex];
		vscode.postMessage({ command: 'switchTab', uri: tab.uri, inputType: tab.inputType });
	}
	if (AUTOCLOSE) {
		vscode.postMessage({ command: 'close' });
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
		closeWindow(true);
	}
});

// close Webview when it loses focus (e.g., user clicks away or switches windows)
window.addEventListener('blur', () => {
	closeWindow(false);
});