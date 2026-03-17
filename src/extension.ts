import * as vscode from 'vscode';
import { getConfig } from './config';
import { makeSwitcher } from './switcher';

export function activate(context: vscode.ExtensionContext) {
    let currentPanel: vscode.WebviewPanel | undefined;
    
    const config = getConfig();

    const uiSettingsCommand = registerSettingsCommand();

    const showSwitcher = makeSwitcher(context, currentPanel, config);



    context.subscriptions.push(showSwitcher, uiSettingsCommand);
}

function registerSettingsCommand() {
    return vscode.commands.registerCommand('tabpreview.settings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'tabPreview');
    });
}


export function deactivate() { }
