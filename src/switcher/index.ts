import * as vscode from 'vscode';
import * as fs from 'fs';
import type { TabGroupInfo, TabInputType, Config } from '../shared/types';
import type { Manifest } from '../manifest';
import { getIconUriForTab } from './utils';
import { assembleWebview, loadHtml } from './loadHtml';

export const makeSwitcher = (context: vscode.ExtensionContext, currentPanel: vscode.WebviewPanel | undefined, config: Config) => {
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
                localResourceRoots: [
                    context.extensionUri
                ]
                // retainContextWhenHidden: true, // no need to save the state of this extension
            }
        );

        // load HTML
        const { distHtmlContent, htmlBaseUri } = loadHtml(context, currentPanel.webview);

        const tabsData = getTabGroupsData(manifest, currentPanel.webview, context.extensionUri);
        // inject method, no need for the webview to request data after the first load
        currentPanel.webview.html = assembleWebview({
            distHtmlContent,
            htmlBaseUri,
            data: {
                tabsData,
                config
            }
        });

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
                        if (message.uri === undefined || message.groupIndex === undefined || typeof message.groupIndex !== 'number') {
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
    const tabGroupsData: TabGroupInfo[] = vscode.window.tabGroups.all
        .filter(group => group.isActive)
        .map(group => ({
            isActive: group.isActive,
            viewColumn: group.viewColumn,
            tabs: group.tabs.map(tab => {
                const { uri, inputType, content } = getTabInfo(tab);
                return {
                    isActive: tab.isActive,
                    label: tab.label,
                    uri,
                    inputType,
                    isDirty: tab.isDirty,
                    isPinned: tab.isPinned,
                    isPreview: tab.isPreview,
                    iconUri: getIconUriForTab(tab, manifest, webview, extensionUri),
                    textContent: content,
                    language: vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri)?.languageId
                };
            })
        }));

    return tabGroupsData;
};


const getTabInfo = (tab: vscode.Tab) => {
    let uri: string | undefined;
    let inputType: TabInputType;
    let content: string | undefined;

    switch (true) {
        case tab.input instanceof vscode.TabInputText:
            uri = tab.input.uri.toString();
            inputType = 'text';
            content = getContentText(tab.input.uri);
            break;
        case tab.input instanceof vscode.TabInputTextDiff:
            uri = tab.input.modified.toString();
            inputType = 'textDiff';
            content = getContentText(tab.input.modified);
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

    return { uri, inputType, content };
};

// 当目标editor从未被激活过时，会得到undefined结果
const getContentText = (uri: vscode.Uri): string | undefined => {
    const text = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString())?.getText();
    console.log(`Fetched content text for URI: ${uri}, length: ${text?.length}`);
    return text;
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