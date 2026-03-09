import * as vscode from 'vscode';
import type { TabGroupInfo, TabInputType, Config } from './shared/types';
import { defaultConfig } from './shared/types';
import { makeSwitcher } from './switcher';

export function activate(context: vscode.ExtensionContext) {
    let currentPanel: vscode.WebviewPanel | undefined;
    let config: Config = defaultConfig;


    const showSwitcher = makeSwitcher(context, currentPanel, config);



    context.subscriptions.push(showSwitcher);
}




export function deactivate() { }
