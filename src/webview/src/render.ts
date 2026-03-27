import { render } from 'lit-html';
import { createIcons, X } from 'lucide';
import { App } from './components/App';
import { vscodeActions } from './vscode';

// all timing should be only executed in dev mode
if (import.meta.env.MODE === 'development') {
    window.addEventListener('load', () => {
        vscodeActions.reportLoadComplete('load');
    });
    document.addEventListener('DOMContentLoaded', () => {
        vscodeActions.reportLoadComplete('DOMContentLoaded');
    });
}

let firstRender = false;

export function rerender() {
    let startTime: number | undefined;
    if (import.meta.env.MODE === 'development') {
        startTime = performance.now();
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

