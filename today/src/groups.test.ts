// The rules the panel draws with.
import { assert, test } from 'orca/testing'
import { checklistGroups, todayGroups } from './groups'

const tab = (id: string, title: string, marked = false) => ({ id, title, state: 'done', marked })
const snap = {
  date: '2026-11-19',
  folders: [
    { id: 'B', name: 'beta', tabs: [tab('b1', 'design chat', true)] },
    { id: 'A', name: 'alpha', tabs: [tab('a1', 'review chat'), tab('a2', 'other', true), tab('a3', 'more review', true)] },
    { id: 'C', name: 'gamma', tabs: [] }
  ],
  marks: ['a3', 'b1', 'a2']
}

test('today keeps Orca order and only marked tabs, whatever order they were marked in', () => {
  const groups = todayGroups(snap)
  assert.deepEqual(groups.map((g) => [g.id, g.tabs.map((t) => t.id)]), [['B', ['b1']], ['A', ['a2', 'a3']]])
})

test('the checklist keeps Orca order and drops folders without tabs', () => {
  assert.deepEqual(checklistGroups(snap, '').map((g) => g.id), ['B', 'A'])
})

test('a query keeps a folder when its name or one of its tabs matches', () => {
  assert.deepEqual(
    checklistGroups(snap, 'REVIEW').map((g) => [g.id, g.tabs.map((t) => t.id)]),
    [['A', ['a1', 'a3']]]
  )
  assert.deepEqual(checklistGroups(snap, 'alpha').map((g) => [g.id, g.tabs.length]), [['A', 3]])
})
