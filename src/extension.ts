import * as vscode from 'vscode';
import * as fs from 'fs';
import type { TabGroupInfo, TabInputType } from './shared/types';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('tabpreview.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from TabPreview!');
        console.log('Hello World from TabPreview!');
    });

    // 在插件激活时预加载 HTML 内容到内存中
    const htmlUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'dist', 'index.html');
    const preloadedHtmlContent = fs.readFileSync(htmlUri.fsPath, 'utf8');

    let currentPanel: vscode.WebviewPanel | undefined;

    const showSwitcher = vscode.commands.registerCommand('tabpreview.showSwitcher', () => {
        if (currentPanel) {
            // prevent multiple panels
            return;
        }

        currentPanel = vscode.window.createWebviewPanel(
            'tabpreview.switcher',
            'Tab Switcher',
            {
                viewColumn: vscode.ViewColumn.Active,
                preserveFocus: false, // still need `window.focus()` to focus on dom 
            },
            {
                enableScripts: true,
                // retainContextWhenHidden: true, // no need to save the state of this extension
            }
        );

        // 序列化当前所有标签页数据，注入到 HTML 的 <head> 中
        const TAB_GROUPS_Script = `<script>window.__TAB_GROUPS__ = ${getTabGroupsData()};<\/script>`;
        currentPanel.webview.html = preloadedHtmlContent.replace('</head>', `${TAB_GROUPS_Script}</head>`);

        // 监听 Webview 发来的消息
        currentPanel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'close':
                        if (currentPanel) {
                            currentPanel.dispose();
                        }
                        return;
                    case 'openDevTools': // for debugging
                        // the devtools is based on the page, it must be called after the page is loaded, so we send the message from the webview to open it
                        vscode.commands.executeCommand('workbench.action.webview.openDeveloperTools');
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

        currentPanel.onDidDispose(
            () => {
                currentPanel = undefined;
            },
            null,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable, showSwitcher);
}



const getTabGroupsData = (): string => {
    const tabGroupsData: TabGroupInfo[] = vscode.window.tabGroups.all.map(group => ({
        isActive: group.isActive,
        viewColumn: group.viewColumn,
        tabs: group.tabs.map(tab => ({
            isActive: tab.isActive,
            label: tab.label,
            uri: tab.input instanceof vscode.TabInputText ? tab.input.uri.toString()
                : tab.input instanceof vscode.TabInputTextDiff ? tab.input.modified.toString()
                    : tab.input instanceof vscode.TabInputNotebook ? tab.input.uri.toString()
                        : tab.input instanceof vscode.TabInputNotebookDiff ? tab.input.modified.toString()
                            : tab.input instanceof vscode.TabInputCustom ? tab.input.uri.toString()
                                : undefined,
            inputType: ((): TabInputType => {
                if (tab.input instanceof vscode.TabInputText) { return 'text'; }
                if (tab.input instanceof vscode.TabInputTextDiff) { return 'textDiff'; }
                if (tab.input instanceof vscode.TabInputNotebook) { return 'notebook'; }
                if (tab.input instanceof vscode.TabInputNotebookDiff) { return 'notebookDiff'; }
                if (tab.input instanceof vscode.TabInputCustom) { return 'custom'; }
                if (tab.input instanceof vscode.TabInputWebview) { return 'webview'; }
                if (tab.input instanceof vscode.TabInputTerminal) { return 'terminal'; }
                return 'unknown';
            })(),
            isDirty: tab.isDirty,
            isPinned: tab.isPinned,
            isPreview: tab.isPreview,
        }))
    }));

    return JSON.stringify(tabGroupsData);
};


export function deactivate() { }
