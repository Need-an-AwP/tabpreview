import * as vscode from 'vscode';
import { defaultConfig } from '../shared/defaultConfig';

export const settings = vscode.commands.registerCommand('tabpreview.settings', async () => {
    const config = vscode.workspace.getConfiguration('tabpreview');

    const items: vscode.QuickPickItem[] = [
        { label: 'Size', description: 'Size in px', detail: 'size' },
        { label: 'Show Close Button', description: 'Show close button', detail: 'showCloseButton' },
        { label: 'Icon: Display', description: 'Display icon', detail: 'icon.display' },
        { label: 'Icon: Grayscale', description: 'Grayscale icon', detail: 'icon.grayscale' },
        { label: 'Icon: Opacity', description: 'Opacity, range: 0 to 1', detail: 'icon.opacity' },
        { label: 'Icon: Size', description: 'Size in px', detail: 'icon.size' },
        { label: 'Icon: Position', description: 'Icon position', detail: 'icon.position' },
        { label: 'Thumbnail: Display', description: 'Display thumbnail', detail: 'thumbnail.display' },
        { label: 'Thumbnail: Font Size', description: 'Font size in px', detail: 'thumbnail.fontSize' },
        { label: 'Thumbnail: Line Height', description: 'Line height in px', detail: 'thumbnail.lineHeight' },
        { label: 'Thumbnail: Render Characters', description: 'Render characters', detail: 'thumbnail.renderCharacters' },
        { label: 'Thumbnail: Opacity', description: 'Opacity, range: 0 to 1', detail: 'thumbnail.opacity' }
    ];

    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a setting to modify (or press Esc to cancel)'
    });

    if (!selection || !selection.detail) {
        return;
    }

    const key = selection.detail;
    // 获取当前配置或默认配置
    const currentValue = config.get(key) ?? key.split('.').reduce((o, i) => o[i], defaultConfig as any);
    let newValue: any;

    const booleanKeys = ['showCloseButton', 'icon.display', 'icon.grayscale', 'thumbnail.display', 'thumbnail.renderCharacters'];

    if (booleanKeys.includes(key)) {
        const boolSelection = await vscode.window.showQuickPick(["true", "false"], {
            placeHolder: `Change ${selection.label} (Current: ${currentValue})`
        });
        if (boolSelection) {
            newValue = boolSelection === "true";
        }
    } else if (key === 'icon.position') {
        const positions = ['top', 'center', 'bottom', 'top-left', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-right'];
        newValue = await vscode.window.showQuickPick(positions, {
            placeHolder: `Change ${selection.label} (Current: ${currentValue})`
        });
    } else {
        const input = await vscode.window.showInputBox({
            prompt: `Enter new value for ${selection.label}`,
            value: String(currentValue),
            validateInput: (val) => {
                const num = Number(val);
                if (isNaN(num)) { return 'Value must be a number'; }
                if ((key === 'icon.opacity' || key === 'thumbnail.opacity') && (num < 0 || num > 1)) {
                    return 'Opacity must be between 0 and 1';
                }
                return null;
            }
        });
        if (input !== undefined) {
            newValue = Number(input);
        }
    }

    if (newValue !== undefined && newValue !== currentValue) {
        await config.update(key, newValue, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`tabpreview: ${selection.label} updated to ${newValue}`);
    }
});

export function getUserConfig() {
    const config = vscode.workspace.getConfiguration('tabpreview');
    return {
        size: config.get<number>('size') ?? defaultConfig.size,
        icon: {
            display: config.get<boolean>('icon.display') ?? defaultConfig.icon.display,
            grayscale: config.get<boolean>('icon.grayscale') ?? defaultConfig.icon.grayscale,
            opacity: config.get<number>('icon.opacity') ?? defaultConfig.icon.opacity,
            size: config.get<number>('icon.size') ?? defaultConfig.icon.size,
            position: config.get<any>('icon.position') ?? defaultConfig.icon.position,
        },
        text: {},
        showCloseButton: config.get<boolean>('showCloseButton') ?? defaultConfig.showCloseButton,
        thumbnail: {
            display: config.get<boolean>('thumbnail.display') ?? defaultConfig.thumbnail.display,
            fontSize: config.get<number>('thumbnail.fontSize') ?? defaultConfig.thumbnail.fontSize,
            lineHeight: config.get<number>('thumbnail.lineHeight') ?? defaultConfig.thumbnail.lineHeight,
            renderCharacters: config.get<boolean>('thumbnail.renderCharacters') ?? defaultConfig.thumbnail.renderCharacters,
            opacity: config.get<number>('thumbnail.opacity') ?? defaultConfig.thumbnail.opacity,
        }
    };
}