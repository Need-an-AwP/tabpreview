import * as vscode from 'vscode';
import { defaultConfig } from './shared/defaultConfig';
import type { Config } from './shared/types';

export function getConfig(): Config {
    const tabPreviewConfig = vscode.workspace.getConfiguration('tabPreview');

    const config: Config = {
        retainWebview: tabPreviewConfig.get('retainWebview', defaultConfig.retainWebview),
        size: tabPreviewConfig.get('size', defaultConfig.size),
        icon: {
            display: tabPreviewConfig.get('icon.display', defaultConfig.icon.display),
            grayscale: tabPreviewConfig.get('icon.grayscale', defaultConfig.icon.grayscale),
            opacity: tabPreviewConfig.get('icon.opacity', defaultConfig.icon.opacity),
            size: tabPreviewConfig.get('icon.size', defaultConfig.icon.size),
            position: tabPreviewConfig.get('icon.position', defaultConfig.icon.position),
        },
        showCloseButton: tabPreviewConfig.get('showCloseButton', defaultConfig.showCloseButton),
        text: tabPreviewConfig.get('text', defaultConfig.text),
        thumbnail: {
            display: tabPreviewConfig.get('thumbnail.display', defaultConfig.thumbnail.display),
            theme: tabPreviewConfig.get('thumbnail.theme', defaultConfig.thumbnail.theme),
            fontSize: tabPreviewConfig.get('thumbnail.fontSize', defaultConfig.thumbnail.fontSize),
            lineHeight: tabPreviewConfig.get('thumbnail.lineHeight', defaultConfig.thumbnail.lineHeight),
            renderCharacters: tabPreviewConfig.get('thumbnail.renderCharacters', defaultConfig.thumbnail.renderCharacters),
            opacity: tabPreviewConfig.get('thumbnail.opacity', defaultConfig.thumbnail.opacity),
            onlyVisibleRange: tabPreviewConfig.get('thumbnail.onlyVisibleRange', defaultConfig.thumbnail.onlyVisibleRange)
        }
    };
    // console.log('TabPreview config loaded:', JSON.stringify(config, null, 2));

    return config;
}