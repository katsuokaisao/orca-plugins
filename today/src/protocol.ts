// The panel <-> worker contract: src/panel.tsx and src/worker.ts both read it.
export {}

declare module 'orca' {
  /** A chat tab of a folder workspace. `id` is Orca's pane key, stable while the tab is open. */
  export type TodayTab = {
    id: string
    title: string
    /** Orca's agent state: working, blocked, waiting or done. */
    state: string
    marked: boolean
  }
  /** A folder workspace, where parent sessions run. Worktrees are left out. */
  export type TodayFolder = {
    id: string
    name: string
    /** In the order Orca lists them. */
    tabs: TodayTab[]
  }
  export type TodaySnapshot = {
    /** The day the marks belong to, YYYY-MM-DD in Asia/Tokyo. */
    date: string
    /** In the order Orca lists them (pinned first). */
    folders: TodayFolder[]
    /** Today's marked tab ids that are still open. */
    marks: string[]
  }
  interface PluginRequests {
    'today.snapshot': { output: TodaySnapshot }
    /** `id` is a tab's pane key. */
    'today.toggle': { input: { id: string }; output: TodaySnapshot }
    /** Opens a folder workspace; a chat tab cannot be focused, since it is not a terminal. */
    'today.open': { input: { id: string }; output: { opened: boolean } }
  }
  interface PluginPanelEvents {
    /** Posted to every open panel after the marks change, or the day turns over. */
    'today.changed': TodaySnapshot
  }
}
