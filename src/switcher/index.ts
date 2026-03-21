import * as vscode from 'vscode';
import * as fs from 'fs';
import type { TabGroupInfo, TabInputType, Config } from '../shared/types';
import type { Manifest } from '../manifest';
import { getIconUriForTab } from './utils';
import { assembleWebview, loadHtml } from './loadHtml';

export const makeSwitcher = (context: vscode.ExtensionContext, currentPanel: vscode.WebviewPanel | undefined, getConfig: () => Config) => {
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

        const config = getConfig(); // Get latest config when opening the switcher
        const tabsData = getTabGroupsData(manifest, currentPanel.webview, context.extensionUri, config);
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
                        closeTab(message.uri, message.groupIndex, config);
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

const getTabGroupsData = (manifest: Manifest, webview: vscode.Webview, extensionUri: vscode.Uri, config: Config): TabGroupInfo[] => {
    const tabGroupsData: TabGroupInfo[] = vscode.window.tabGroups.all
        .filter(group => group.isActive)
        .map(group => ({
            isActive: group.isActive,
            viewColumn: group.viewColumn,
            tabs: group.tabs.map(tab => {
                const { uri, inputType, content } = getTabInfo(tab, config);
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


const getTabInfo = (tab: vscode.Tab, config: Config) => {
    let uri: string | undefined;
    let inputType: TabInputType;
    let content: string | undefined;

    switch (true) {
        case tab.input instanceof vscode.TabInputText:
            uri = tab.input.uri.toString();
            inputType = 'text';
            content = getContentText(tab.input.uri, config);
            break;
        case tab.input instanceof vscode.TabInputTextDiff:
            uri = tab.input.modified.toString();
            inputType = 'textDiff';
            content = getContentText(tab.input.modified, config);
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

const findTextDocument = (uri: vscode.Uri): vscode.TextDocument | undefined =>
    vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());

const findVisibleEditor = (uri: vscode.Uri): vscode.TextEditor | undefined =>
    vscode.window.visibleTextEditors.find(editor => editor.document.uri.toString() === uri.toString());

// `visibleTextEditors.find` can only return editors that have been focused at least once, 
// so we need to cache the ranges to make it act like `textDocuments.find`
const visibleRangeCache = new Map<string, readonly vscode.Range[]>(); // key is uri string

// 按可见范围顺序直接拼接文本片段，不插入额外分隔符；拿不到当前 range 时回退缓存
const getVisibleRangeText = (uri: vscode.Uri, document: vscode.TextDocument, visibleRanges?: readonly vscode.Range[]): string | undefined => {
    const uriKey = uri.toString();

    if (visibleRanges && visibleRanges.length > 0) {
        visibleRangeCache.set(uriKey, [...visibleRanges]);
    }

    const ranges = (visibleRanges && visibleRanges.length > 0)
        ? visibleRanges
        : visibleRangeCache.get(uriKey);

    if (!ranges || ranges.length === 0) {
        return undefined;
    }

    return ranges.map(range => document.getText(range)).join('');
};

// 当目标 editor 从未被激活过时，可能拿不到 document 或 visibleRanges
const getContentText = (uri: vscode.Uri, config: Config): string | undefined => {
    const document = findTextDocument(uri);
    if (!document) {
        return undefined;
    }

    if (!config.thumbnail.onlyVisibleRange) {
        return document.getText();
    }

    const visibleRanges = findVisibleEditor(uri)?.visibleRanges;

    return getVisibleRangeText(uri, document, visibleRanges);
};

const closeTab = (closingUri: string, groupIndex: number, config: Config) => {
    vscode.window.tabGroups.all[groupIndex].tabs.forEach(tab => {
        const { uri: tabUri } = getTabInfo(tab, config);

        if (tabUri === closingUri) {
            vscode.window.tabGroups.close(tab);
            visibleRangeCache.delete(closingUri);
            return;
        }
    });
};