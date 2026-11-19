# orca-plugins

自分用の Orca のプラグイン。1 つのプラグインを 1 つのフォルダーに置く。

| フォルダー | 中身 |
|---|---|
| [today](today/) | フォルダーワークスペースのタブのうち、今日やるものに印を付けて右のサイドバーに一覧にする |

## 開発

プラグインのフォルダーで実行する。

```sh
orca plugin types .        # .orca/types に型定義を書き出す
orca plugin test .         # src/*.test.ts(x) を Node で流す
orca plugin check .        # パネルを src/panel.check.ts のシナリオで描画する
orca plugin dev load .     # Orca に開発用として読み込む（コードを動かすプラグインは承認が要る）
```

読み込んだ後は、ファイルを保存すると Orca が読み込み直す。権限（`capabilities`）を変えたときは承認し直す。

作り方の正本は Orca の [plugin-authoring.md](https://github.com/stablyai/orca/blob/main/docs/reference/plugin-authoring.md)。
