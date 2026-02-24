// docs/night.data.js
// Data-only module. Do NOT put DOM logic here.

export const STATE = {
  START: "START",
  Q6: "Q6",
  Q6_MED: "Q6_MED",
  MED_EVENT: "MED_EVENT",
  MED_MINI: "MED_MINI",
  RESULT_CALL: "RESULT_CALL",
  OBSERVE_30: "OBSERVE_30",
  OBSERVE_60: "OBSERVE_60",
  SLEEP_CHECK: "SLEEP_CHECK",
  HANDOFF: "HANDOFF",
};

// 6問（夜間リスク確認・固定）
export const Q6 = [
  {
    id: "q1",
    text: "声かけや軽い刺激（名前を呼ぶ・肩に触れる）に対し、普段と比べて明らかに反応が弱い／おかしいですか？",
    internalLabel: "普段と比べて反応が弱い／おかしい",
    externalForEMS: "普段と比べて反応が弱く、意識状態がいつもと異なります",
    externalForFamily: "夜間確認時、普段と比べて反応が弱い状態でした",
  },
  {
    id: "q2",
    text: "呼吸が普段と明らかに違う、または確認できませんか？（苦しそう・止まりそう・極端に荒い／浅い）",
    internalLabel: "呼吸が普段と明らかに違う／確認できない",
    externalForEMS: "呼吸が普段と明らかに異なる、または確認できませんでした",
    externalForFamily: "夜間確認時、呼吸が普段と異なる様子でした",
  },
  {
    id: "q3",
    text: "突然の強い胸の痛み、突然の激しい頭の痛み、または強い息苦しさがありますか？",
    internalLabel: "突然の強い症状（胸痛／頭痛／強い息苦しさ）",
    externalForEMS: "突然の強い症状（胸の痛み・激しい頭痛・強い息苦しさ）がありました",
    externalForFamily: "夜間確認時、突然の強い症状を訴えていました",
  },
  {
    id: "q4",
    text: "昨日までと比べて、急に話せなくなった／片側の手足が動きにくくなったなどの急な変化がありますか？",
    internalLabel: "急な神経症状の変化",
    externalForEMS: "昨日までと比べて急な変化（話せない・片側の手足が動きにくい）がありました",
    externalForFamily: "夜間確認時、昨日までと比べて急な変化がありました",
  },
  {
    id: "q5",
    text: "清潔なガーゼやタオルで5分間連続で圧迫しても出血が止まりませんか？",
    internalLabel: "5分圧迫しても出血が止まらない",
    externalForEMS: "5分間圧迫しても出血が止まりませんでした",
    externalForFamily: "夜間確認時、出血が止まらない状態でした",
  },
  {
    id: "q6",
    text: "体が大きくガクガク動き、呼びかけても止まらない状態がありますか？または、普段と明らかに違う強い意識の混乱がありますか？",
    internalLabel: "けいれん様の動き／強い意識混乱",
    externalForEMS: "呼びかけても止まらない異常な動き、または強い意識混乱がありました",
    externalForFamily: "夜間確認時、強い混乱が見られました",
  },
];

// 睡眠チェック（補助）
export const SLEEP = [
  { id: "s1", text: "声かけや軽い刺激（名前を呼ぶ・肩に触れる）に反応がありますか？" },
  { id: "s2", text: "胸やお腹が、呼吸に合わせて一定のリズムで動いていますか？（布団の上から見える範囲でOK／分からなければ『不明』）" },
  { id: "s3", text: "顔や首の周りが、物や体で強く塞がれていませんか？" },
];

// 薬の出来事（事実のみ）
export const MEDICATION_EVENTS = [
  { id: "m1", label: "飲んだ内容が確認できない" },
  { id: "m2", label: "本人の薬ではないものを飲んだ（誤薬）" },
  { id: "m3", label: "決められた量より多く飲んだ（過量）" },
  { id: "m_refusal", label: "拒薬があった（飲めない／飲まない）" },
];
