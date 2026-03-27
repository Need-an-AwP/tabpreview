import * as vscode from 'vscode';
import * as fs from 'fs';
import { getConfig } from '../config';
import type { Config, TabGroupInfo } from '../shared/types';
import type { Manifest } from '../manifest';
import { assembleWebview, loadHtml } from './loadHtml';
import { getTabGroupsData, closeTab } from './utils';
import { initState, AppState } from './state';

export const makeSwitcher = (context: vscode.ExtensionContext) => {
    // load icons manifest
    const manifestUri = vscode.Uri.joinPath(context.extensionUri, 'asserts', 'material-icon', 'material-icons.json');
    const manifestContent = fs.readFileSync(manifestUri.fsPath, 'utf8');
    const manifest = JSON.parse(manifestContent) as Manifest;

    let currentPanel: vscode.WebviewPanel | undefined = undefined;
    let keyPressedTime = 0;
    let state: AppState;

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
                config,
                () => keyPressedTime,
                switchToSelectedTab,
                () => { currentPanel = undefined; }
            );
            const tabsData = getTabGroupsData(manifest, currentPanel.webview, context.extensionUri, config);
            state = initState({ tabGroups: tabsData, config });
            loadWebview(context, currentPanel, config, tabsData);
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

    return [showSwitcherCommand, selectNextCommand, selectPreviousCommand];
};

const setContextKey = (i: boolean) => {
    vscode.commands.executeCommand('setContext', 'tabpreview.visible', i);
};


const loadWebview = (
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    config: Config,
    tabsData: TabGroupInfo[]
) => {
    // load HTML
    const { distHtmlContent, htmlBaseUri } = loadHtml(context, panel.webview);

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
    config: Config,
    getKeyPressedTime: () => number,
    switchTab: () => void,
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
            retainContextWhenHidden: config.retainWebview,
        }
    );

    // 监听 Webview 发来的消息
    panel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'closeTabPreviewWindow':
                    console.log('Received close command from webview. isSwitchingTab:', message.isSwitchingTab);
                    if (message.isSwitchingTab) {
                        switchTab();
                    }
                    if (panel && !config.retainWebview) {
                        panel.dispose();
                    }
                    return;
                case 'closeTab':
                    if (message.uri === undefined || message.groupIndex === undefined || typeof message.groupIndex !== 'number') {
                        return;
                    }
                    // use getConfig() to always have the latest config when closing tab
                    closeTab(message.uri, message.groupIndex);
                    console.log(`Closing tab with URI: ${message.uri}`);

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