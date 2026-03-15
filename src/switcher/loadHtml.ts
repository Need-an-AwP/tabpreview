import * as vscode from 'vscode';
import * as fs from 'fs';
import type { TabGroupInfo, TabInputType, Config } from '../shared/types';


export function loadHtml(context: vscode.ExtensionContext, webview: vscode.Webview): { distHtmlContent: string, htmlBaseUri: string } {
    const htmlUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'dist', 'index.html');
    const distHtmlContent = fs.readFileSync(htmlUri.fsPath, 'utf8');
    const baseUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'dist');
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
    });

    // ATTENTION: replace `<head>` instead of `</head>` to ensure the script is executed before any other script in the HTML,
    // which is crucial for providing the base path 
    const finalHtml = distHtmlContent.replace(
        '<head>',
        `<head>
        <base href="${htmlBaseUri}">
        <script type="application/json" id="initial-data">${safeData}</script>
        <script>
            window.__TAB_GROUPS__ = JSON.parse(document.getElementById('initial-data').textContent).tabsData;
            window.__CONFIG__ = JSON.parse(document.getElementById('initial-data').textContent).config;
        </script>`
    );

    return finalHtml;
}