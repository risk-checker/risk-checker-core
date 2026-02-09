# Night Checker フローチャート

以下は night checker の主要フローを示す Mermaid 図です。`docs/night.js` の状態遷移（state）と主要な副作用（timeline 記録、119/家族通話、記録生成）を含みます。

```mermaid
flowchart TD
  %% Nodes: high-level states and actions
  BOOT(["起動 (bootNight)"])
  START(["START / 施設情報入力"])
  Q6(["Q6: 夜間リスク確認（6問）\n(Q0は注記: 今は様子を見る)"])
  RESULT_CALL(["RESULT_CALL / 呼び出し画面\n(EMS / 家族)"])
  OBSERVE30(["OBSERVE 30分待機"])
  OBSERVE60(["OBSERVE 60分待機"])
  SLEEP(["SLEEP / 睡眠記録"])
  HANDOFF(["HANDOFF / 引継ぎ"])
  RECORD(["記録作成 (buildRecordText)\n- timeline を列挙\n- EMS / family facts を追加\n(事実のみ)"])
  RESET(["リセット (resetAll)"])
  ERROR(["エラー / キャッシュ等"])

  %% Actions / side-effects
  RECORD_TIMELINE(["recordTimeline(label, time)"])
  EMS_AUTO(["EMS 自動記録 (119)\n- 発生時に自動で記録\n- 例外は手動で記録（固定理由のみ）"])
  FAMILY_CALL(["家族通話\n1タップで記録: つながった/つながらない\n- つながった時は記録に固定伝達文を追加\n- コピー領域は通話記録後に有効"])
  SW_REGISTER(["ServiceWorker 登録\n(manifest + sw.js)"])

  %% Boot / registration
  BOOT -->|初期化: load model, render| START
  BOOT --> SW_REGISTER

  %% Main flow
  START --> Q6
  Q6 -->|危険あり| RESULT_CALL
  Q6 -->|異常なし| OBSERVE30
  RESULT_CALL -->|救急判定（緊急）| EMS_AUTO
  RESULT_CALL --> FAMILY_CALL

  %% OBSERVE flows
  OBSERVE30 -->|30分経過| OBSERVE60
  OBSERVE30 -->|本人拒否で6問不可ボタン| RECORD_TIMELINE & OBSERVE60
  OBSERVE60 -->|60分経過| SLEEP
  OBSERVE60 -->|本人拒否で6問不可ボタン| RECORD_TIMELINE & SLEEP

  %% timeline side-effects
  EMS_AUTO --> RECORD_TIMELINE
  FAMILY_CALL --> RECORD_TIMELINE

  %% record generation and handoff
  SLEEP --> HANDOFF
  HANDOFF --> RECORD
  RESULT_CALL --> RECORD

  %% Reset and errors
  RECORD --> RESET
  RESET --> START
  SW_REGISTER -->|登録失敗| ERROR
  ERROR --> BOOT

  %% explicit link labels for clarity
  click RECORD href "javascript:void(0)" "記録作成は UI 上の「記録用テキストをコピー」ボタンで実行"
```

## 説明（要点）
- 各画面は `model.state` に対応します。主要遷移は START → Q6 → RESULT_CALL/OBSERVE → SLEEP → HANDOFF → RECORD です。
- Q0 は Q6 の一部ではなく「注記（非対話）」として表示されます（ユーザ入力不要）。
- RESULT_CALL では EMS（119）の自動記録ルールと、家族通話の 1 タップ記録（接続/未接続）があり、家族の自由記述は記録されません。
- OBSERVE 画面の「本人拒否で6問不可（記録）」ボタンは timeline に記録して次に進めます。
- `buildRecordText()` は timeline と EMS / family facts を結合して「事実のみ」のテキストを出力します（自動送信は行わない設計）。

---

このファイルをそのままリポジトリに追加しました。図の細分化（例えば `RESULT_CALL` 内の UI フロー詳細、`buildRecordText()` の出力フォーマットなど）を希望すれば続けて作ります。
