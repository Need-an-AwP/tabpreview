import { render } from 'lit-html';
import { createIcons, X } from 'lucide';
import { App } from './components/App';
import { vscodeActions } from './vscode';

// report load complete for performance measurement
window.addEventListener('load', () => {
    vscodeActions.reportLoadComplete('load');
});
document.addEventListener('DOMContentLoaded', () => {
    vscodeActions.reportLoadComplete('DOMContentLoaded');
});

export function rerender() {
    render(App(), document.body);
    // create lucide icons after rendering
    createIcons({
        icons: {
            X,
        },
    });
}

