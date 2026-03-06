import './style.css';
import type { TabGroupInfo } from '../../shared/types';

declare global {
	interface Window {
		__TAB_GROUPS__: TabGroupInfo[];
	}
}

const vscode = acquireVsCodeApi();
const AUTOCLOSE = true;
// debug: open dev tools when autoclose is disabled
!AUTOCLOSE && vscode.postMessage({ command: 'openDevTools' });

console.log(window.__TAB_GROUPS__);
const tabGroups = window.__TAB_GROUPS__ ?? [];
// const allTabs = tabGroups.flatMap(g => g.tabs);
const currentGroupTabs = tabGroups.find(g => g.isActive)?.tabs ?? [];

const tabListHtml = currentGroupTabs.map(tab => /* html */`
	<div class="tab-item">
		<span class="tab-label">${tab.isDirty ? '● ' : ''}${tab.label}</span>
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

function closeWindow() {
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
		closeWindow();
	}
});

// close Webview when it loses focus (e.g., user clicks away or switches windows)
window.addEventListener('blur', () => {
	closeWindow();
});