import * as vscode from 'vscode';
import * as fs from 'fs';
import type { TabGroupInfo, TabInputType, Config } from '../shared/types';


export function loadHtml(context: vscode.ExtensionContext, webview: vscode.Webview): { distHtmlContent: string, htmlBaseUri: string } {
    const htmlUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'index.html');
    const distHtmlContent = fs.readFileSync(htmlUri.fsPath, 'utf8');
    const baseUri = vscode.Uri.joinPath(context.extensionUri, 'media');
    const htmlBaseUri = webview.asWebviewUri(baseUri).toString() + '/';

    return {
        distHtmlContent,
        htmlBaseUri
    };
}

export function assembleWebview({
    distHtmlContent,
    htmlBaseUri,
    data
}: {
    distHtmlContent: string,
    htmlBaseUri: string
    data: {
        tabsData: TabGroupInfo[],
        config: Config
    }
}): string {
    const safeData = JSON.stringify({
        tabsData: data.tabsData,
        config: data.config
    }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e'); // 转译html标签字符串，以防止意外截断，同时允许json正常解析

    // focus window and create keyup listener asap
    const listenerScript = `
        window.focus();

        window.vscodeApi = acquireVsCodeApi();
        
        window.addEventListener('keyup', (e) => {
            if (e.key === 'Control') {
                window.vscodeApi.postMessage({ command: 'closeTabPreviewWindow', isSwitchingTab: true });
            }
        });
        window.addEventListener('focus', () => {
            window.vscodeApi.postMessage({ command: 'loadComplete', event: 'webview focused' });
        });
    `;

    // ATTENTION: replace `<head>` instead of `</head>` to ensure the script is executed before any other script in the HTML,
    // which is crucial for providing the base path 
    const finalHtml = distHtmlContent.replace(
        '<head>',
        `<head>
        <script>${listenerScript}</script>
        <base href="${htmlBaseUri}">
        <script type="application/json" id="initial-data">${safeData}</script>
        <script>
            window.__TAB_GROUPS__ = JSON.parse(document.getElementById('initial-data').textContent).tabsData;
            window.__CONFIG__ = JSON.parse(document.getElementById('initial-data').textContent).config;
        </script>`
    );

    return finalHtml;
}