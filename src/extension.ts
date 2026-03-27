import * as vscode from 'vscode';
import { makeSwitcher } from './switcher';

export function activate(context: vscode.ExtensionContext) {
    const uiSettingsCommand = registerSettingsCommand();

    const switcherCommands = makeSwitcher(context);

    context.subscriptions.push(
        uiSettingsCommand,
        ...switcherCommands
    );
}

function registerSettingsCommand() {
    return vscode.commands.registerCommand('tabpreview.settings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'tabPreview');
    });
}

export function deactivate() { }
