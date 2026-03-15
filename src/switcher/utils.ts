import * as vscode from 'vscode';
import * as path from 'path';
import type { Manifest } from '../manifest';


export const getIconUriForTab = (tab: vscode.Tab, manifest: Manifest, webview: vscode.Webview, extensionUri: vscode.Uri): string | undefined => {
    let filePath: string | undefined;
    let languageId: string | undefined;

    if (tab.input instanceof vscode.TabInputText || tab.input instanceof vscode.TabInputCustom || tab.input instanceof vscode.TabInputNotebook) {
        filePath = tab.input.uri.fsPath;
        if (tab.input instanceof vscode.TabInputText) {
            const uriStr = tab.input.uri.toString();
            languageId = vscode.workspace.textDocuments.find(d => d.uri.toString() === uriStr)?.languageId;
        }
    } else if (tab.input instanceof vscode.TabInputTextDiff || tab.input instanceof vscode.TabInputNotebookDiff) {
        filePath = tab.input.modified.fsPath;
        if (tab.input instanceof vscode.TabInputTextDiff) {
            const uriStr = tab.input.modified.toString();
            languageId = vscode.workspace.textDocuments.find(d => d.uri.toString() === uriStr)?.languageId;
        }
    }

    // 非激活标签（或者重启后未被点击加载过的标签）存在时，
    // vscode.workspace.textDocuments 中还没有生成与其对应的文本文档实例，
    // 此时语言服务未就绪 vscode.workspace.textDocuments.find(...)?.languageId = undefined
    // 而在 Material Icon Theme 的配置文件中，部分常见语言的图标是通过 languageId 来指定的（而不是文件扩展名），
    // 因此需要在语言服务未就绪时，先通过文件扩展名来猜测语言类型，以提高图标命中率
    if (filePath && !languageId) {
        const ext = path.extname(filePath).toLowerCase();
        const extMap: Record<string, string> = {
            '.ts': 'typescript', '.tsx': 'typescriptreact',
            '.js': 'javascript', '.jsx': 'javascriptreact',
            '.html': 'html', '.css': 'css', '.json': 'json',
            '.md': 'markdown', '.py': 'python', '.java': 'java',
            '.c': 'c', '.cpp': 'cpp', '.cs': 'csharp', '.go': 'go',
            '.rs': 'rust', '.php': 'php', '.rb': 'ruby', '.sh': 'shellscript'
        };
        languageId = extMap[ext];
    }

    if (filePath) {
        const relativeIconPath = getIconPathByFileName(filePath, manifest, languageId);
        if (relativeIconPath) {
            const adjustedPath = relativeIconPath.replace(/\.\.\//g, '');
            const iconUri = vscode.Uri.joinPath(extensionUri, 'asserts', 'material-icon', adjustedPath);
            // console.log(`Icon URI for ${filePath}: ${iconUri}, languageId: ${languageId}`);
            return webview.asWebviewUri(iconUri).toString();
        }
    }

    return undefined;
};


const getIconPathByFileName = (filePath: string, themeData: Manifest, languageId?: string) => {
    // /project/src/app.test.ts -> app.test.ts
    const fileName = path.basename(filePath).toLowerCase();

    let iconId = themeData.file;

    // 1. 优先级 1：精确匹配文件名 (例如 settings.json, Dockerfile)
    if (themeData.fileNames && themeData.fileNames[fileName]) {
        iconId = themeData.fileNames[fileName];
    } else {
        // 2. 优先级 2：复合后缀与单后缀匹配
        if (themeData.fileExtensions) {
            // 例: 'app.test.ts' -> ['app', 'test', 'ts']
            const parts = fileName.split('.');

            // 从包含最长后缀的组合开始查找，比如优先找 'test.ts'，没找到再找 'ts'
            // i 从 1 开始，因为第一个原素 'app' 是主文件名，不是扩展名部分
            for (let i = 1; i < parts.length; i++) {
                const extToTest = parts.slice(i).join('.'); // 'test.ts' 然后是 'ts'

                if (themeData.fileExtensions[extToTest]) {
                    iconId = themeData.fileExtensions[extToTest];
                    break;
                }
            }
        }

        // 3. 优先级 3：通过 languageId 在 languageIds 中查找
        // 适用于 ts/js/html 等 fileExtensions 中没有直接条目的语言
        if (iconId === themeData.file && languageId && themeData.languageIds?.[languageId]) {
            iconId = themeData.languageIds[languageId];
        }
    }

    // 4. 去 iconDefinitions 中查出最终的 iconPath
    if (iconId && themeData.iconDefinitions && themeData.iconDefinitions[iconId]) {
        return themeData.iconDefinitions[iconId].iconPath;
    }

    return undefined;
};

export const getContentText = (uri: vscode.Uri): string | undefined => {
    return vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString())?.getText();
};