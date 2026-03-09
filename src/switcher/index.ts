import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { TabGroupInfo, TabInputType, Config } from '../shared/types';
import type { Manifest } from '../manifest';


export const makeSwitcher = (context: vscode.ExtensionContext, currentPanel: vscode.WebviewPanel | undefined, config: Config) => {
    // load HTML
    const htmlUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'dist', 'index.html');
    const preloadedHtmlContent = fs.readFileSync(htmlUri.fsPath, 'utf8');
    // load icons manifest
    const manifestUri = vscode.Uri.joinPath(context.extensionUri, 'asserts', 'material-icon', 'material-icons.json');
    const manifestContent = fs.readFileSync(manifestUri.fsPath, 'utf8');
    const manifest = JSON.parse(manifestContent) as Manifest;

    return vscode.commands.registerCommand('tabpreview.showSwitcher', () => {
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

        const tabsData = getTabGroupsData(manifest, currentPanel.webview, context.extensionUri);
        // inject method, no need for the webview to request data after the first load
        currentPanel.webview.html = preloadedHtmlContent.replace(
            '</head>',
            `<script>
            window.__TAB_GROUPS__ = ${tabsData};
            window.__CONFIG__ = ${JSON.stringify(config)};
            <\/script></head>`
        );

        // 监听 Webview 发来的消息
        currentPanel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'requestTabsData':
                        currentPanel?.webview.postMessage({ command: 'tabsData', tabGroups: tabsData });
                        console.log('Sent tabs data to webview');
                        return;
                    case 'close':
                        if (currentPanel) {
                            currentPanel.dispose();
                        }
                        return;
                    case 'switchTab':
                        if (message.uri) {
                            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(message.uri));
                            console.log(`Switching to tab with URI: ${message.uri}`);
                        }
                        return;
                    case 'openDevTools': // for debugging
                        vscode.commands.executeCommand('workbench.action.webview.openDeveloperTools');
                        return;
                    default:
                        console.warn('Unknown command from webview:', message.command);
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
};

const getTabGroupsData = (manifest: Manifest, webview: vscode.Webview, extensionUri: vscode.Uri): string => {
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
            iconUri: getIconUriForTab(tab, manifest, webview, extensionUri),
        }))
    }));

    return JSON.stringify(tabGroupsData);
};


const getIconUriForTab = (tab: vscode.Tab, manifest: Manifest, webview: vscode.Webview, extensionUri: vscode.Uri): string | undefined => {
    let filePath: string | undefined;

    if (tab.input instanceof vscode.TabInputText || tab.input instanceof vscode.TabInputCustom || tab.input instanceof vscode.TabInputNotebook) {
        filePath = tab.input.uri.fsPath;
    } else if (tab.input instanceof vscode.TabInputTextDiff || tab.input instanceof vscode.TabInputNotebookDiff) {
        filePath = tab.input.modified.fsPath;
    }

    if (filePath) {
        const relativeIconPath = getIconPathByFileName(filePath, manifest);
        if (relativeIconPath) {
            const adjustedPath = relativeIconPath.replace(/\.\.\//g, '');
            const iconUri = vscode.Uri.joinPath(extensionUri, 'asserts', 'material-icon', adjustedPath);
            return webview.asWebviewUri(iconUri).toString();
        }
    }

    return undefined;
};


const getIconPathByFileName = (filePath: string, themeData: Manifest) => {
    // /project/src/app.test.ts -> app.test.ts
    const fileName = path.basename(filePath).toLowerCase();

    let iconId = themeData.file;

    // 1. 优先级 1：精确匹配文件名 (例如 settings.json, Dockerfile)
    if (themeData.fileNames && themeData.fileNames[fileName]) {
        iconId = themeData.fileNames[fileName];
    }
    // 2. 优先级 2：复合后缀与单后缀匹配
    else if (themeData.fileExtensions) {
        // 例: 'app.test.ts' -> ['app', 'test', 'ts']
        const parts = fileName.split('.');

        // 从包含最长后缀的组合开始查找，比如优先找 'test.ts'，没找到再找 'ts'
        // i 从 1 开始，因为第一个原素 'app' 是主文件名，不是扩展名部分
        for (let i = 1; i < parts.length; i++) {
            const extToTest = parts.slice(i).join('.'); // 'test.ts' 然后是 'ts'

            if (themeData.fileExtensions[extToTest]) {
                iconId = themeData.fileExtensions[extToTest];
                break;
            }
        }
    }

    // 3. 去 iconDefinitions 中查出最终的 iconPath
    if (iconId && themeData.iconDefinitions && themeData.iconDefinitions[iconId]) {
        return themeData.iconDefinitions[iconId].iconPath;
    }

    return undefined;
};
