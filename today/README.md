# 今日やる（local.today）

フォルダーワークスペースのタブ（親セッション）のうち、今日やるものに印を付け、右のサイドバーのパネルに一覧にする。ステータスバーに「★ 今日 n」を出す。

## 振る舞い

- 出すのはフォルダーワークスペースとそのタブだけ。worktree は worker の作業場所なので出さない
- 印はタブにだけ付ける。フォルダー自体には付けない
- フォルダーとタブは `orca worktree ps` が返す順に並べる
- 今日やるの一覧はツリーで、フォルダーの下に印を付けたタブを字下げして並べる。選ぶとそのフォルダーを開く
- 印は東京の日付ごとに保存し、日付が変わると無かったことになる

## 決めごとと理由

| 決めごと | 理由 |
|---|---|
| タブの一覧を `orca worktree ps --json` から読む（`src/folders.ts`） | プラグインの API の Agent Session History（`agent.listSessions`）は、セッションを起動したディレクトリでワークスペースに結び付ける。同じディレクトリを指すフォルダーワークスペースが複数あると、全部のタブが最初のフォルダーに寄る。待機中のタブも出ない。`agents.list` は今開いているワークスペースしか見られない |
| タブの開閉・名前・状態は 10 秒ごとに `orca worktree ps` を読み直して拾い、変わったときだけパネルと件数を更新する | チャットのタブを閉じても届くイベントが無い。`agent.status.changed` は端末のペイン向けで、`workspace.changed` はフォーカス中のワークスペースの端末しか知らせない。1 回の読み直しは 0.3 秒ほど |
| タブを選んでもフォルダーまでしか開かない | チャットのタブは端末ではないので `terminal.focus` も `orca terminal switch` も使えない。本家の [#39847](https://github.com/stablyai/orca/issues/39847)（プラグインと CLI からチャットのタブに切り替える）か [#43874](https://github.com/stablyai/orca/issues/43874)（チャットのタブへの `orca://` リンク）が入ったら直す |
| サイドバーのカードやタブに印を出さない | プラグインの API に、サイドバーに描く手段が無い |

## 権限

- `storage:own`: 印の保存
- `workspace:write`: フォルダーワークスペースを開く（`workspace.open`）

裏の処理は Node.js で動き、`orca worktree ps --json` を実行する。CLI は `ORCA_CLI_COMMAND`、PATH の `orca`、`/Applications/Orca.app/Contents/Resources/bin/orca` の順に探す。
