import * as vscode from 'vscode';
import { makeSwitcher } from './switcher';

function registerSettingsCommand() {
    return vscode.commands.registerCommand('tabpreview.settings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'tabPreview');
    });
}

export function activate(context: vscode.ExtensionContext) {
    const uiSettingsCommand = registerSettingsCommand();

    const switcherCommands = makeSwitcher(context);

    context.subscriptions.push(
        uiSettingsCommand,
        ...switcherCommands
    );
}

export function deactivate() { }
