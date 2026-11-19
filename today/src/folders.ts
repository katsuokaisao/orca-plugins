// Reads folder workspaces and their chat tabs from `orca worktree ps --json`.
//
// Why the CLI and not the plugin API: Agent Session History (`agent.listSessions`) ties a session
// to a workspace by its directory, and every folder workspace here points at the same directory,
// so it put every tab in the first folder. It also left out idle tabs. `agents.list` only covers
// the focused workspace. `worktree ps` gives each workspace's tabs as the sidebar shows them.
import { execFile } from 'node:child_process'

export type FolderRow = { id: string; name: string; tabs: { id: string; title: string; state: string }[] }

/** Tried in order: the CLI Orca exports to its own sessions, the one on PATH, the app's copy. */
const CANDIDATES = [
  process.env.ORCA_CLI_COMMAND,
  'orca',
  '/Applications/Orca.app/Contents/Resources/bin/orca'
].filter((c): c is string => typeof c === 'string' && c !== '')

function run(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, ['worktree', 'ps', '--json'], { timeout: 15_000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) =>
      error ? reject(error) : resolve(stdout)
    )
  })
}

type PsAgent = { paneKey?: unknown; state?: unknown; conversationName?: unknown; displayName?: unknown; taskTitle?: unknown; prompt?: unknown }
type PsRow = { worktreeId?: unknown; workspaceKind?: unknown; displayName?: unknown; agents?: unknown }

const text = (...values: unknown[]) => values.find((v): v is string => typeof v === 'string' && v !== '') ?? ''

/** Turns `worktree ps --json` output into folder rows, keeping Orca's order. */
export function parseFolders(stdout: string): FolderRow[] {
  const parsed = JSON.parse(stdout) as { result?: { worktrees?: PsRow[] } }
  const rows = parsed.result?.worktrees ?? []
  return rows
    .filter((w) => w.workspaceKind === 'folder-workspace' && typeof w.worktreeId === 'string')
    .map((w) => ({
      id: w.worktreeId as string,
      name: text(w.displayName),
      tabs: (Array.isArray(w.agents) ? (w.agents as PsAgent[]) : [])
        .filter((a) => typeof a.paneKey === 'string')
        .map((a) => ({
          id: a.paneKey as string,
          title: text(a.conversationName, a.displayName, a.taskTitle, a.prompt) || '名前の無いタブ',
          state: text(a.state)
        }))
    }))
}

export async function readFolders(): Promise<FolderRow[]> {
  let last: unknown
  for (const command of CANDIDATES) {
    try {
      return parseFolders(await run(command))
    } catch (error) {
      last = error
    }
  }
  throw last
}
