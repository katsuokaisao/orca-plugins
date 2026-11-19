// What the panel draws, in Orca's order: folders as Orca lists them, tabs as each folder lists
// them. Kept apart from panel.tsx so the rules can be tested without drawing anything.
import type { TodayFolder, TodaySnapshot } from 'orca'

/** Folders with a marked tab, holding only their marked tabs. */
export function todayGroups(snap: TodaySnapshot): TodayFolder[] {
  return snap.folders
    .map((f) => ({ ...f, tabs: f.tabs.filter((t) => t.marked) }))
    .filter((f) => f.tabs.length > 0)
}

const matches = (q: string, text: string) => q === '' || text.toLowerCase().includes(q)

/**
 * The checklist: folders with tabs. A folder whose name matches the query keeps all its tabs;
 * otherwise only the tabs whose title matches stay. Folders left with no tab are dropped.
 */
export function checklistGroups(snap: TodaySnapshot, query: string): TodayFolder[] {
  const q = query.trim().toLowerCase()
  return snap.folders
    .map((f) => ({ ...f, tabs: matches(q, f.name) ? f.tabs : f.tabs.filter((t) => matches(q, t.title)) }))
    .filter((f) => f.tabs.length > 0)
}
