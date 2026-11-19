import { assert, mockHost, mount, test } from 'orca/testing'
import * as panel from './panel'

test('lists marked tabs under their folder and toggles from the checklist', async () => {
  let marks: string[] = ['a']
  const tab = (id: string, title: string) => ({ id, title, state: 'working', marked: marks.includes(id) })
  const snapshot = () => ({
    date: '2026-11-19',
    folders: [{ id: 'F', name: 'one-off', tabs: [tab('a', 'alpha chat'), tab('b', 'beta chat')] }],
    marks: [...marks]
  })
  const opened: string[] = []
  const host = mockHost({
    requests: {
      'today.snapshot': () => snapshot(),
      'today.toggle': ({ id }: { id: string }) => {
        marks = marks.includes(id) ? marks.filter((x) => x !== id) : [...marks, id]
        return snapshot()
      },
      'today.open': ({ id }: { id: string }) => {
        opened.push(id)
        return { opened: true }
      }
    }
  })
  const view = await mount(panel, { host })
  assert.equal(view.find({ role: 'status' })?.text, '1')

  // Tabs sit under their folder in the tree; selecting a tab opens its folder.
  const tree = view.tree()
  assert.match(JSON.stringify(tree), /"key":"F".*"children":\[\{"key":"a"/)
  await view.selectItem({ type: 'Tree' }, 'a')
  assert.deepEqual(opened, ['F'])

  await view.toggle({ type: 'Collapsible' })
  await view.toggle({ type: 'Checkbox', label: 'beta chat' })
  assert.equal(view.find({ role: 'status' })?.text, '2')
  assert.deepEqual(view.errors, [])
  assert.deepEqual(view.refusals, [])
  await view.unmount()
})
