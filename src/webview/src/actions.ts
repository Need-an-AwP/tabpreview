import { state } from './state';
import { vscodeActions } from './vscode';
import { rerender } from './render';

export function closeTabAndRerender(uri: string) {
    vscodeActions.closeTab(uri);
    // rerender the tab list after closing a tab
    state.currentGroupTabs = state.currentGroupTabs.filter((t) => t.uri !== uri);
    rerender();
}
