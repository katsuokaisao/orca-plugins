// Keeps which chat tabs of folder workspaces are marked for today. Orca has no API for drawing on
// the left sidebar's cards, so the marks live in this plugin's storage and show in its own panel
// and status bar item.
// The worker restarts on save and drops memory, so everything that must last is in storage.
import type { OrcaWorkerApi } from 'orca/worker'
import { readFolders, type FolderRow } from './folders'

const MARKS = 'marks'
const STATUS_ITEM = 'today-count'
// Orca sends no event when a chat tab closes (they are not terminals, and `workspace.changed`
// only covers the focused workspace), so the worker reads the tabs again on a timer. One read of
// `orca worktree ps` takes about 0.3 s.
const POLL_MS = 10_000

type Marks = { date: string; ids: string[] }

let pollTimer: ReturnType<typeof setInterval> | undefined

export function deactivate(): void {
  clearInterval(pollTimer)
}

/** The calendar day in Tokyo, so marks made late at night still belong to that day. */
export function dayOf(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
}

/** Marks from an earlier day count as none: that is what clears them each morning. */
async function readIds(orca: OrcaWorkerApi, date: string): Promise<string[]> {
  const value = await orca.storage.get(MARKS)
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return []
  const stored = value as { date?: unknown; ids?: unknown }
  if (stored.date !== date || !Array.isArray(stored.ids)) return []
  return stored.ids.filter((id): id is string => typeof id === 'string')
}

async function writeIds(orca: OrcaWorkerApi, marks: Marks): Promise<void> {
  await orca.storage.set(MARKS, marks)
}

/**
 * Parent sessions run as chat tabs of folder workspaces; worktrees hold the workers they start,
 * so only folder workspaces are listed, in Orca's order, each with its tabs in Orca's order.
 */
async function snapshot(orca: OrcaWorkerApi, now: () => Date, read: () => Promise<FolderRow[]>) {
  const date = dayOf(now())
  const ids = await readIds(orca, date)
  const folders = (await read()).map((f) => ({
    ...f,
    tabs: f.tabs.map((t) => ({ ...t, marked: ids.includes(t.id) }))
  }))
  // A mark whose tab was closed is left out, so the count matches what the panel shows.
  const open = new Set(folders.flatMap((f) => f.tabs.map((t) => t.id)))
  return { date, folders, marks: ids.filter((id) => open.has(id)) }
}

async function showCount(orca: OrcaWorkerApi, count: number): Promise<void> {
  // The status bar is only a hint; a refusal (no desktop app) must not break the panel.
  try {
    await orca.host.call('statusBar.update', {
      id: STATUS_ITEM,
      text: `★ 今日 ${count}`,
      tone: count > 0 ? 'accent' : 'neutral'
    })
  } catch (error) {
    orca.log(`status bar not updated: ${String(error)}`)
  }
}

export function createWorker(
  now: () => Date = () => new Date(),
  read: () => Promise<FolderRow[]> = readFolders,
  pollMs: number = POLL_MS
) {
  return function activate(orca: OrcaWorkerApi): void {
    /** The last snapshot open panels were given, so the timer posts only what changed. */
    let lastSent = ''

    const refresh = async () => {
      const snap = await snapshot(orca, now, read)
      await showCount(orca, snap.marks.length)
      lastSent = JSON.stringify(snap)
      return snap
    }

    orca.panels.handle('today.snapshot', () => refresh())

    orca.panels.handle('today.toggle', async ({ id }) => {
      const date = dayOf(now())
      const ids = await readIds(orca, date)
      if (!ids.includes(id)) {
        const current = await snapshot(orca, now, read)
        const isTab = current.folders.some((f) => f.tabs.some((t) => t.id === id))
        if (!isTab) {
          throw Object.assign(new Error(`not an open tab of a folder workspace: ${id}`), {
            code: 'invalid_params'
          })
        }
      }
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
      await writeIds(orca, { date, ids: next })
      const snap = await refresh()
      orca.panels.post('today.changed', snap)
      return snap
    })

    orca.panels.handle('today.open', async ({ id }) => {
      const result = await orca.host.call('workspace.open', { workspaceId: id })
      return { opened: result.opened }
    })

    // Picks up tabs closed, opened or renamed, their states, and the day turning over. A read
    // slower than the interval is not stacked on.
    let polling = false
    const poll = async () => {
      if (polling) return
      polling = true
      try {
        const before = lastSent
        const snap = await refresh()
        if (lastSent !== before) orca.panels.post('today.changed', snap)
      } catch (error) {
        orca.log(`refresh failed: ${String(error)}`)
      } finally {
        polling = false
      }
    }
    clearInterval(pollTimer)
    pollTimer = setInterval(() => void poll(), pollMs)

    void refresh().catch((error) => orca.log(`first refresh failed: ${String(error)}`))
  }
}

export default createWorker()
