import { html } from 'lit-html';
import { state } from '../state';
import { TabItem } from './TabItem';

// app is rendered in document.body
export function App() {
    const tabs = state.currentGroupTabs;
    return html`
        <div
            class="flex justify-center items-center w-full h-full
            overflow-x-hidden select-none"
        >
            <div
                class="flex flex-row flex-wrap justify-center items-center gap-4
                max-w-full max-h-full p-2 "
            >
                ${tabs.length > 0 ? tabs.map((tab, idx) => 
                    TabItem(tab, idx)
                ) : placeholder()}
            </div>
        </div>
    `;
}

function placeholder() {
    return html` <div class="text-gray-500 italic">No tabs open in the current group</div> `;
}
