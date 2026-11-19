// How `orca worktree ps --json` output becomes folder rows.
import { assert, test } from 'orca/testing'
import { parseFolders } from './folders'

test('keeps folder workspaces and their tabs in the order ps gives them', () => {
  const stdout = JSON.stringify({
    ok: true,
    result: {
      worktrees: [
        { worktreeId: 'folder:B', workspaceKind: 'folder-workspace', displayName: 'pinned', agents: [{ paneKey: 'p1', state: 'done', conversationName: 'design' }] },
        { worktreeId: 'repo::/wt', workspaceKind: 'git', displayName: 'feat/x', agents: [{ paneKey: 'p9', state: 'working', conversationName: 'worker' }] },
        {
          worktreeId: 'folder:A',
          workspaceKind: 'folder-workspace',
          displayName: 'one-off',
          agents: [
            { paneKey: 'p2', state: 'done', conversationName: null, displayName: null, prompt: 'first prompt' },
            { paneKey: 'p3', state: 'working', conversationName: 'tag plugin' },
            { state: 'done', conversationName: 'no pane key' }
          ]
        },
        { worktreeId: 'folder:C', workspaceKind: 'folder-workspace', displayName: 'empty', agents: [] }
      ]
    }
  })
  assert.deepEqual(parseFolders(stdout), [
    { id: 'folder:B', name: 'pinned', tabs: [{ id: 'p1', title: 'design', state: 'done' }] },
    {
      id: 'folder:A',
      name: 'one-off',
      tabs: [
        { id: 'p2', title: 'first prompt', state: 'done' },
        { id: 'p3', title: 'tag plugin', state: 'working' }
      ]
    },
    { id: 'folder:C', name: 'empty', tabs: [] }
  ])
})
