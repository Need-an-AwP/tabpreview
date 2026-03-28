import { render } from 'lit-html';
import { createIcons, X } from 'lucide';
import { App } from './components/App';
import { vscodeActions } from './vscode';
import { loadMonacoLangPacks } from './components/TabItem/thumbnail';
import { state } from './state';

// all timing should be only executed in dev mode
if (import.meta.env.MODE === 'development') {
    window.addEventListener('load', () => {
        vscodeActions.reportLoadComplete('load');
    });
}

let firstRender = false;

export async function rerender() {
    let startTime: number | undefined;
    if (import.meta.env.MODE === 'development') {
        startTime = performance.now();
    }

    // pre-load monaco language packs before lit rendering to avoid page flickering
    const neededLanguages = new Set<string>();
    state.tabGroups.forEach(group => {
        group.tabs.forEach(tab => {
            if (tab.language && tab.language !== 'plaintext') {
                neededLanguages.add(tab.language);
            }
        });
    });
    try {
        await Promise.all(
            Array.from(neededLanguages).map(lang => loadMonacoLangPacks(lang))
        );
    } catch (e) {
        console.error('Failed to load some monaco language packs', e);
    }

    render(App(), document.body);
    
    // create lucide icons after rendering
    createIcons({
        icons: {
            X,
        },
    });

    if (!firstRender) {
        firstRender = true;
    } else {
        if (startTime !== undefined) {
            vscodeActions.reportLoadComplete(`rerender webview (${performance.now() - startTime} ms)`);
        }
    }
}

