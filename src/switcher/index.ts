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
            window.__TAB_GROUPS__ = ${JSON.stringify(tabsData)};
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
                    case 'closeTab':
                        if (!message.uri || !message.groupIndex) {
                            return;
                        }
                        closeTab(message.uri, message.groupIndex);
                        console.log(`Closing tab with URI: ${message.uri}`);

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

const getTabGroupsData = (manifest: Manifest, webview: vscode.Webview, extensionUri: vscode.Uri): TabGroupInfo[] => {
    const tabGroupsData: TabGroupInfo[] = vscode.window.tabGroups.all.map(group => ({
        isActive: group.isActive,
        viewColumn: group.viewColumn,
        tabs: group.tabs.map(tab => {

            const { uri, inputType } = getTabInfo(tab);

            return {
                isActive: tab.isActive,
                label: tab.label,
                uri,
                inputType,
                isDirty: tab.isDirty,
                isPinned: tab.isPinned,
                isPreview: tab.isPreview,
                iconUri: getIconUriForTab(tab, manifest, webview, extensionUri),
            };
        })
    }));

    return tabGroupsData;
};


const getTabInfo = (tab: vscode.Tab) => {
    let uri: string | undefined;
    let inputType: TabInputType;

    switch (true) {
        case tab.input instanceof vscode.TabInputText:
            uri = tab.input.uri.toString();
            inputType = 'text';
            break;
        case tab.input instanceof vscode.TabInputTextDiff:
            uri = tab.input.modified.toString();
            inputType = 'textDiff';
            break;
        case tab.input instanceof vscode.TabInputNotebook:
            uri = tab.input.uri.toString();
            inputType = 'notebook';
            break;
        case tab.input instanceof vscode.TabInputNotebookDiff:
            uri = tab.input.modified.toString();
            inputType = 'notebookDiff';
            break;
        case tab.input instanceof vscode.TabInputCustom:
            uri = tab.input.uri.toString();
            inputType = 'custom';
            break;
        case tab.input instanceof vscode.TabInputWebview:
            uri = tab.input.viewType; // webview tabs might not have a unique URI, using viewType as an identifier (may cause conflicts)
            inputType = 'webview';
            break;
        case tab.input instanceof vscode.TabInputTerminal:
            uri = tab.label; // terminal tabs might not have a URI, using label as an identifier (may cause conflicts)
            inputType = 'terminal';
            break;
        default:
            uri = undefined;
            inputType = 'unknown';
    }

    return { uri, inputType };
};

const getIconUriForTab = (tab: vscode.Tab, manifest: Manifest, webview: vscode.Webview, extensionUri: vscode.Uri): string | undefined => {
    let filePath: string | undefined;
    let languageId: string | undefined;

    if (tab.input instanceof vscode.TabInputText || tab.input instanceof vscode.TabInputCustom || tab.input instanceof vscode.TabInputNotebook) {
        filePath = tab.input.uri.fsPath;
        if (tab.input instanceof vscode.TabInputText) {
            const uriStr = tab.input.uri.toString();
            languageId = vscode.workspace.textDocuments.find(d => d.uri.toString() === uriStr)?.languageId;
        }
    } else if (tab.input instanceof vscode.TabInputTextDiff || tab.input instanceof vscode.TabInputNotebookDiff) {
        filePath = tab.input.modified.fsPath;
        if (tab.input instanceof vscode.TabInputTextDiff) {
            const uriStr = tab.input.modified.toString();
            languageId = vscode.workspace.textDocuments.find(d => d.uri.toString() === uriStr)?.languageId;
        }
    }

    if (filePath) {
        const relativeIconPath = getIconPathByFileName(filePath, manifest, languageId);
        if (relativeIconPath) {
            const adjustedPath = relativeIconPath.replace(/\.\.\//g, '');
            const iconUri = vscode.Uri.joinPath(extensionUri, 'asserts', 'material-icon', adjustedPath);
            // console.log(`Icon URI for ${filePath}: ${iconUri}, languageId: ${languageId}`);
            return webview.asWebviewUri(iconUri).toString();
        }
    }

    return undefined;
};


const getIconPathByFileName = (filePath: string, themeData: Manifest, languageId?: string) => {
    // /project/src/app.test.ts -> app.test.ts
    const fileName = path.basename(filePath).toLowerCase();

    let iconId = themeData.file;

    // 1. 优先级 1：精确匹配文件名 (例如 settings.json, Dockerfile)
    if (themeData.fileNames && themeData.fileNames[fileName]) {
        iconId = themeData.fileNames[fileName];
    } else {
        // 2. 优先级 2：复合后缀与单后缀匹配
        if (themeData.fileExtensions) {
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

        // 3. 优先级 3：通过 languageId 在 languageIds 中查找
        // 适用于 ts/js/html 等 fileExtensions 中没有直接条目的语言
        if (iconId === themeData.file && languageId && themeData.languageIds?.[languageId]) {
            iconId = themeData.languageIds[languageId];
        }
    }

    // 4. 去 iconDefinitions 中查出最终的 iconPath
    if (iconId && themeData.iconDefinitions && themeData.iconDefinitions[iconId]) {
        return themeData.iconDefinitions[iconId].iconPath;
    }

    return undefined;
};

const closeTab = (closingUri: string, groupIndex: number) => {
    vscode.window.tabGroups.all[groupIndex].tabs.forEach(tab => {
        const { uri: tabUri } = getTabInfo(tab);

        if (tabUri === closingUri) {
            vscode.window.tabGroups.close(tab);
            return;
        }
    });
};