import { render } from 'lit-html';
import { createIcons, X } from 'lucide';
import { App } from './components/App';

export function rerender() {
    render(App(), document.body);
    // create lucide icons after rendering
    createIcons({
        icons: {
            X,
        },
    });
}

