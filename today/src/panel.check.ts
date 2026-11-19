// `orca plugin check` renders the panel once per scenario. The worker reads folders from the
// local `orca worktree ps`, so these scenarios show this machine's real folders and tabs.
import { defineCheck } from 'orca/testing'

const results = { 'workspace.open': { opened: true }, 'statusBar.update': {} }

export default defineCheck({
  live: { results }
})
