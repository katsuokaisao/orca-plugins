// Runs the worker's activate(orca) over a mock host, with the folder list stubbed.
import { assert, mockHost, mountWorker, test } from 'orca/testing'
import { createWorker, deactivate } from './worker'

const folders = [
  { id: 'folder:B', name: 'pinned', tabs: [{ id: 'pane:b1', title: 'design', state: 'done' }] },
  {
    id: 'folder:A',
    name: 'one-off',
    tabs: [
      { id: 'pane:a1', title: 'first tab', state: 'done' },
      { id: 'pane:a2', title: 'second tab', state: 'working' }
    ]
  },
  { id: 'folder:C', name: 'empty', tabs: [] }
]
const read = async () => folders

// 2026-11-19 10:00 in Tokyo.
const morning = () => new Date('2026-11-19T01:00:00Z')

function host(storage: Record<string, unknown> = {}) {
  return mockHost({
    storage: storage as never,
    results: { 'workspace.open': { opened: true }, 'statusBar.update': {} }
  })
}

type Snap = {
  date: string
  folders: { id: string; tabs: { id: string; marked: boolean }[] }[]
  marks: string[]
}

async function mounted(h: ReturnType<typeof host>) {
  return mountWorker({ default: createWorker(morning, read), deactivate }, { host: h })
}

test('folders and tabs keep the order Orca lists them in', async () => {
  const worker = await mounted(host())
  const snap = (await worker.request('today.snapshot')) as Snap
  assert.equal(snap.date, '2026-11-19')
  assert.deepEqual(snap.folders.map((f) => f.id), ['folder:B', 'folder:A', 'folder:C'])
  assert.deepEqual(snap.folders[1].tabs.map((t) => t.id), ['pane:a1', 'pane:a2'])
  await worker.deactivate()
})

test('marking a tab stores it under today and updates the count', async () => {
  const h = host()
  const worker = await mounted(h)
  const snap = (await worker.request('today.toggle', { id: 'pane:a2' })) as Snap
  assert.deepEqual(snap.marks, ['pane:a2'])
  assert.equal(snap.folders[1].tabs[1].marked, true)
  assert.deepEqual(h.data().storage.marks, { date: '2026-11-19', ids: ['pane:a2'] })
  const updates = h.callsOf('statusBar.update') as { text: string }[]
  assert.equal(updates[updates.length - 1].text, '★ 今日 1')
  assert.equal(worker.posts.length, 1)

  const again = (await worker.request('today.toggle', { id: 'pane:a2' })) as Snap
  assert.deepEqual(again.marks, [])
  await worker.deactivate()
})

test('only an open tab can be marked, not a folder', async () => {
  const h = host()
  const worker = await mounted(h)
  let code: unknown
  try {
    await worker.request('today.toggle', { id: 'folder:A' })
  } catch (error) {
    code = (error as { code?: unknown }).code
  }
  assert.equal(code, 'invalid_params')
  assert.equal(h.data().storage.marks, undefined)
  await worker.deactivate()
})

test('marks of closed tabs and of earlier days are not counted', async () => {
  const h = host({ marks: { date: '2026-11-19', ids: ['pane:closed', 'pane:b1'] } })
  const worker = await mounted(h)
  const snap = (await worker.request('today.snapshot')) as Snap
  assert.deepEqual(snap.marks, ['pane:b1'])
  assert.deepEqual(h.refusals, [])
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()

  const old = await mounted(host({ marks: { date: '2026-11-18', ids: ['pane:b1'] } }))
  assert.deepEqual(((await old.request('today.snapshot')) as Snap).marks, [])
  await old.deactivate()
})

/** Polls `check` until it holds; the worker's timer runs on real time in these tests. */
async function until(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000
  while (!check()) {
    if (Date.now() > deadline) throw new Error('timed out waiting for the worker')
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

test('closing a marked tab lowers the count and tells open panels, without a request', async () => {
  let open = folders
  const h = host({ marks: { date: '2026-11-19', ids: ['pane:a2'] } })
  const worker = await mountWorker(
    { default: createWorker(morning, async () => open, 10), deactivate },
    { host: h }
  )
  const counts = () => (h.callsOf('statusBar.update') as { text: string }[]).map((u) => u.text)
  await until(() => counts().includes('★ 今日 1'))

  open = folders.map((f) => ({ ...f, tabs: f.tabs.filter((t) => t.id !== 'pane:a2') }))
  await until(() => worker.posts.length > 0)

  assert.equal(counts()[counts().length - 1], '★ 今日 0')
  assert.deepEqual((worker.posts[0].payload as Snap).marks, [])
  await worker.deactivate()
})

test('nothing is posted while the tabs stay the same', async () => {
  const worker = await mountWorker(
    { default: createWorker(morning, read, 10), deactivate },
    { host: host() }
  )
  await new Promise((resolve) => setTimeout(resolve, 60))
  assert.equal(worker.posts.length, 0)
  await worker.deactivate()
})

test('opening asks Orca to show the folder workspace', async () => {
  const h = host()
  const worker = await mounted(h)
  assert.deepEqual(await worker.request('today.open', { id: 'folder:A' }), { opened: true })
  assert.deepEqual(h.callsOf('workspace.open'), [{ workspaceId: 'folder:A' }])
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()
})
