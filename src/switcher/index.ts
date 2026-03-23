import * as vscode from 'vscode';
import * as fs from 'fs';
import type { Config } from '../shared/types';
import type { Manifest } from '../manifest';
import { assembleWebview, loadHtml } from './loadHtml';
import { getTabGroupsData, closeTab } from './utils';

export const makeSwitcher = (context: vscode.ExtensionContext, getConfig: () => Config) => {
    // load icons manifest
    const manifestUri = vscode.Uri.joinPath(context.extensionUri, 'asserts', 'material-icon', 'material-icons.json');
    const manifestContent = fs.readFileSync(manifestUri.fsPath, 'utf8');
    const manifest = JSON.parse(manifestContent) as Manifest;

    let currentPanel: vscode.WebviewPanel | undefined = undefined;
    let keyPressedTime = 0;

    return vscode.commands.registerCommand('tabpreview.showSwitcher', () => {
        if (vscode.window.tabGroups.all[0].tabs.length === 0) {
            // no tabpreview webview display when zero editor is opened
            return;
        }

        keyPressedTime = Date.now();

        if (currentPanel) {
            if (!currentPanel.visible) {
                // update data
                const config = getConfig();
                const tabsData = getTabGroupsData(manifest, currentPanel.webview, context.extensionUri, config);
                currentPanel.webview.postMessage({
                    command: 'updateAll',
                    tabsData,
                    config
                });
                // loadWebview(context, currentPanel, manifest, getConfig);

                currentPanel.reveal();
            }
        } else {
            currentPanel = setupWebview(
                context,
                getConfig,
                () => keyPressedTime,
                () => { currentPanel = undefined; }
            );
            loadWebview(context, currentPanel, manifest, getConfig);
        }
    });
};

const loadWebview = (
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    manifest: Manifest,
    getConfig: () => Config
) => {
    // load HTML
    const { distHtmlContent, htmlBaseUri } = loadHtml(context, panel.webview);

    const config = getConfig(); // Get latest config when opening the switcher
    const tabsData = getTabGroupsData(manifest, panel.webview, context.extensionUri, config);

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
    getConfig: () => Config,
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
                case 'close':
                    if (panel && !getConfig().retainWebview) {
                        panel.dispose();
                    }
                    return;
                case 'closeTab':
                    if (message.uri === undefined || message.groupIndex === undefined || typeof message.groupIndex !== 'number') {
                        return;
                    }
                    // use getConfig() to always have the latest config when closing tab
                    closeTab(message.uri, message.groupIndex, getConfig());
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
        },
        null,
        context.subscriptions
    );

    return panel;
};