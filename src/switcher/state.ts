import type { Config, TabGroupInfo, TabInfo } from '../shared/types';

export interface AppState {
    tabGroups: TabGroupInfo[];
    config: Config;
    selectedTabIndex: number;
    currentGroupIndex: number;
    currentGroupTabs: TabInfo[];
}

export function initState({ tabGroups, config }: { tabGroups: TabGroupInfo[]; config: Config }): AppState {
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
    return {
        tabGroups,
        config,
        currentGroupIndex,
        currentGroupTabs,
        selectedTabIndex,
    };
}
