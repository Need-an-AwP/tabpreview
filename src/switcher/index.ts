import * as vscode from 'vscode';
import * as fs from 'fs';
import { getConfig } from '../config';
import type { Config, TabGroupInfo } from '../shared/types';
import type { Manifest } from '../manifest';
import { assembleWebview } from './loadHtml';
import { getTabGroupsData, closeTab, setContextKey } from './utils';
import { initState, AppState } from './state';
import { onCtrlReleaseListener } from './windowsKeyListener';


export const makeSwitcher = (context: vscode.ExtensionContext) => {
    // load icons manifest
    const manifestUri = vscode.Uri.joinPath(context.extensionUri, 'asserts', 'material-icon', 'material-icons.json');
    const manifestContent = fs.readFileSync(manifestUri.fsPath, 'utf8');
    const manifest = JSON.parse(manifestContent) as Manifest;
    // html sources
    const htmlUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'index.html');
    const distHtmlContent = fs.readFileSync(htmlUri.fsPath, 'utf8');
    const baseUri = vscode.Uri.joinPath(context.extensionUri, 'media');

    let currentPanel: vscode.WebviewPanel | undefined = undefined;
    let keyPressedTime = 0;
    let stopCtrlReleaseListener: (() => void) | undefined;
    let state: AppState;
    let needSwitch = false;

    const updateSelectedTab = (delta = 1) => {
        if (delta !== 0 && state.currentGroupTabs.length > 1) {
            state.selectedTabIndex =
                (state.selectedTabIndex + delta + state.currentGroupTabs.length) % state.currentGroupTabs.length;
        }
    };
    const switchToSelectedTab = () => {
        const selectedTab = state.currentGroupTabs[state.selectedTabIndex];
        if (selectedTab.uri) {
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(selectedTab.uri));
        }
    };

    const showSwitcherCommand = vscode.commands.registerCommand('tabpreview.showSwitcher', () => {
        if (vscode.window.tabGroups.all[0].tabs.length === 0) {
            // no tabpreview webview display when zero editor is opened
            return;
        }

        keyPressedTime = Date.now();

        needSwitch = true;

        // set custom context key
        setContextKey(true);
        // get latest config
        const config = getConfig();

        if (currentPanel) {
            if (!currentPanel.visible) {
                currentPanel.reveal();

                // update data
                const tabsData = getTabGroupsData(manifest, currentPanel.webview, context.extensionUri, config);
                state = initState({ tabGroups: tabsData, config });
                currentPanel.webview.postMessage({
                    command: 'updateAll',
                    tabsData,
                    config
                });
            }
        } else {
            currentPanel = setupWebview(
                context,
                getConfig,
                () => keyPressedTime,
                () => { currentPanel = undefined; }
            );
            const tabsData = getTabGroupsData(manifest, currentPanel.webview, context.extensionUri, config);
            state = initState({ tabGroups: tabsData, config });
            loadWebview(distHtmlContent, baseUri, currentPanel, config, tabsData);
        }

        if (!stopCtrlReleaseListener) {
            stopCtrlReleaseListener = onCtrlReleaseListener(() => {
                // no matter the webview is displayed or not
                if (needSwitch) {
                    switchToSelectedTab();
                    needSwitch = false;
                }

                if (currentPanel && !getConfig().retainWebview) {
                    currentPanel.dispose();
                }
            });
        }
    });

    const selectNextCommand = vscode.commands.registerCommand('tabpreview.selectNext', () => {
        updateSelectedTab(1);
        currentPanel?.webview.postMessage({
            command: 'selectedTabIndex',
            selectedTabIndex: state.selectedTabIndex
        });
    });

    const selectPreviousCommand = vscode.commands.registerCommand('tabpreview.selectPrevious', () => {
        updateSelectedTab(-1);
        currentPanel?.webview.postMessage({
            command: 'selectedTabIndex',
            selectedTabIndex: state.selectedTabIndex
        });
    });

    const disposable = new vscode.Disposable(() => {
        stopCtrlReleaseListener?.();
    });

    return [
        showSwitcherCommand,
        selectNextCommand,
        selectPreviousCommand,
        disposable
    ];
};


const loadWebview = (
    distHtmlContent: string,
    baseUri: vscode.Uri,
    panel: vscode.WebviewPanel,
    config: Config,
    tabsData: TabGroupInfo[]
) => {
    const htmlBaseUri = panel.webview.asWebviewUri(baseUri).toString() + '/';

    // inject method, no need for the webview to request data after the first load
    panel.webview.html = assembleWebview({
        distHtmlContent,
        htmlBaseUri,
        data: {
            tabsData,
            config
        }
    });
};

const setupWebview = (
    context: vscode.ExtensionContext,
    getConfig: () => Config, // prevent closure trap
    getKeyPressedTime: () => number,
    onDispose: () => void
): vscode.WebviewPanel => {
    const panel = vscode.window.createWebviewPanel(
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
            ],
            retainContextWhenHidden: getConfig().retainWebview,
        }
    );

    // 监听 Webview 发来的消息
    panel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'closeTabPreviewWindow':
                    if (panel && !getConfig().retainWebview) {
                        panel.dispose();
                    }
                    return;
                case 'closeTab':
                    if (message.uri === undefined || message.groupIndex === undefined || typeof message.groupIndex !== 'number') {
                        return;
                    }
                    closeTab(message.uri, message.groupIndex);
                    return;
                case 'switchTab':
                    if (message.uri) {
                        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(message.uri));
                        // console.log(`Switching to tab with URI: ${message.uri}`);
                    }
                    return;
                case 'openDevTools': // for debugging
                    vscode.commands.executeCommand('workbench.action.webview.openDeveloperTools');
                    return;
                case 'loadComplete': // for debugging
                    console.log('complete', message.event, ':', Date.now() - getKeyPressedTime(), 'ms');
                    return;
                default:
                    console.warn('Unknown command from webview:', message.command);
                    return;
            }
        },
        undefined,
        context.subscriptions
    );

    panel.onDidDispose(
        () => {
            onDispose();
            setContextKey(false);
        },
        null,
        context.subscriptions
    );

    panel.onDidChangeViewState(
        (e) => {
            const isFocused = e.webviewPanel.active;
            const isVisible = e.webviewPanel.visible;

            if (isFocused) {
                setContextKey(true);
            } else {
                setContextKey(false);
            }
        },
        null,
        context.subscriptions
    );

    return panel;
};