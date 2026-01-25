export const STATE = {
  START: "START",
  Q6: "Q6",
  Q6_MED: "Q6_MED",
  RESULT_CALL: "RESULT_CALL",
  OBSERVE_30: "OBSERVE_30",
  OBSERVE_60: "OBSERVE_60",
  HANDOFF: "HANDOFF",
  SLEEP_CHECK: "SLEEP_CHECK",
};

// 6問（仮文言。あとで確定）
export const Q6 = [
  { id: "q1", text: "反応がない／意識がおかしい（『普段』＝いつものその人の反応がない）" },
  { id: "q2", text: "呼吸について、いつものその人と比べて\n　はっきり『問題ない』と言えない\n（比べられない・分からない場合も『はい』）" },
  { id: "q3", text: "出血が止まっていない（清潔なガーゼ/ティッシュで押さえても、1分後にまだ出ている）" },
  { id: "q4", text: "本人が『耐えられない』と訴える強い痛みがある（普段より明らかに強い）" },
  { id: "q5", text: "普段（＝いつものその人は）歩けるのに、今は歩けない" },
  { id: "q6", text: "普段（＝いつものその人は）不要な介助なのに、持ち上げた／抱えた動作があった" },
];

// 睡眠チェック（起こす/起こさないだけ）
export const SLEEP = [
  { id: "s1", text: "呼吸の動きが確認できる（胸・腹部・布団の上下・鼻息など。触れずに確認）" },
  { id: "s2", text: "苦痛の発語（痛い・苦しい・助けて等）が30秒以上連続していない" },
  { id: "s3", text: "顔（鼻・口）が塞がっていない／胸や腹が何かに押しつぶされていない" },
];

export const MEDICATION_EVENTS = [
  { id: "med1", label: "飲んだ内容が確認できない" },
  { id: "med2", label: "本人の薬ではないものを飲んだ" },
  { id: "med3", label: "決められた量より多く飲んだことが確認されている" },
];
