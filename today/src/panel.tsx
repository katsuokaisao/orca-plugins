// No build step: Orca strips the types and compiles the JSX when the panel loads.
import {
  atom,
  Badge,
  Card,
  Checkbox,
  Collapsible,
  Heading,
  Input,
  plugin,
  read,
  Row,
  set,
  Stack,
  Text,
  Tree,
  type PanelContext,
  type TodaySnapshot,
  type TreeItem
} from 'orca'
import { checklistGroups, todayGroups } from './groups'

const snap = atom<TodaySnapshot | null>(null)
const query = atom('')

async function toggle(id: string): Promise<void> {
  set(snap, await plugin.request('today.toggle', { id }))
}

/** A chat tab cannot be focused (it is not a terminal), so its folder workspace is opened. */
async function open(folderId: string): Promise<void> {
  await plugin.request('today.open', { id: folderId })
}

export function setup(ctx: PanelContext): void {
  ctx.subscriptions.push(plugin.on('today.changed', (payload) => set(snap, payload)))
  void plugin.request('today.snapshot').then((answer) => set(snap, answer))
}

const STATE_LABEL: Record<string, string> = {
  working: '作業中',
  blocked: '確認待ち',
  waiting: '入力待ち'
}

export default function Panel() {
  const value = read(snap)
  if (value === null) return <Text muted>読み込み中</Text>

  const total = value.marks.length
  const today = todayGroups(value)
  const checklist = checklistGroups(value, read(query))

  // Folders are the tree's top level and tabs sit indented under them, so it is clear which
  // folder a tab belongs to. Selecting either opens the folder.
  const folderOf = new Map<string, string>()
  const items: TreeItem[] = today.map((f) => {
    folderOf.set(f.id, f.id)
    return {
      key: f.id,
      label: f.name,
      icon: 'folder',
      children: f.tabs.map((t) => {
        folderOf.set(t.id, f.id)
        return { key: t.id, label: t.title, description: STATE_LABEL[t.state], icon: 'agent' }
      })
    }
  })

  return (
    <Stack gap="md">
      <Row justify="between">
        <Heading>今日やる</Heading>
        <Badge tone={total > 0 ? 'accent' : 'neutral'}>{total}</Badge>
      </Row>
      {today.length === 0 ? (
        <Text muted size="xs">
          まだありません。下の一覧でタブに印を付けてください（{value.date}）
        </Text>
      ) : (
        <Tree
          label="今日やるタブ"
          items={items}
          expanded={today.map((f) => f.id)}
          onSelect={({ key }) => {
            const folderId = folderOf.get(key)
            if (folderId !== undefined) void open(folderId)
          }}
        />
      )}
      <Collapsible title="印を付ける・外す" defaultOpen={today.length === 0}>
        <Stack gap="md">
          <Input
            label="絞り込み"
            type="search"
            placeholder="フォルダー名・タブ名"
            onChange={(text) => set(query, text)}
          />
          {checklist.map((f) => (
            <Card title={f.name}>
              <Stack gap="xs">
                {f.tabs.map((t) => (
                  <Checkbox
                    label={t.title}
                    description={STATE_LABEL[t.state]}
                    checked={t.marked}
                    onChange={() => toggle(t.id)}
                  />
                ))}
              </Stack>
            </Card>
          ))}
        </Stack>
      </Collapsible>
    </Stack>
  )
}
