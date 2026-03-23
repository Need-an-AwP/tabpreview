import type { Config, TabGroupInfo, TabInfo } from '@shared/types';

interface AppState {
    tabGroups: TabGroupInfo[];
    config: Config;
    selectedTabIndex: number;
    currentGroupIndex: number;
    currentGroupTabs: TabInfo[];
}

export let state: AppState;

export function initState({ tabGroups, config }: { tabGroups: TabGroupInfo[]; config: Config }) {
    const currentGroupIndex = tabGroups.findIndex((g) => g.isActive);
    const currentGroupTabs = tabGroups.find((g) => g.isActive)?.tabs ?? [];
    const currentActiveIndex = Math.max(
        0,
        currentGroupTabs.findIndex((t) => t.isActive),
    );
    // 初始化时直接选中 active 标签的下一个
    const selectedTabIndex = currentGroupTabs.length > 1
        ? (currentActiveIndex + 1) % currentGroupTabs.length
        : currentActiveIndex;
    state = {
        tabGroups,
        config,
        currentGroupIndex,
        currentGroupTabs,
        selectedTabIndex,
    };
}
