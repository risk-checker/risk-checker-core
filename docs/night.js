import { STATE, Q6, SLEEP, MEDICATION_EVENTS } from "./night.data.js";

/* Remaining script moved from night.html: core logic and helpers */

const model = {
  state: STATE.START,
  answers: Object.fromEntries(Q6.map(q => [q.id, null])),   // null / true / false
  sleep: Object.fromEntries(SLEEP.map(q => [q.id, null])), // null / true / false
  medicationEvents: Object.fromEntries(MEDICATION_EVENTS.map(m => [m.id, false])),
  lastRunAt: null,   // 表示用（直近の6問実施時刻）
  firstRunAt: null,  // 初回6問を実施した時刻（30分/60分の基準）
  recheckRound: 0,   // 0=初回,1=30分後,2=60分後
  nextIfAllNo: STATE.OBSERVE_30, // 次に進む固定フロー（全てNoのとき）
  returnAfterSleep: STATE.Q6,    // 睡眠チェック後に戻す画面（導線固定）
  timeline: [],
  observationStartAt: null,
  familyCall: { status: "none", time: null },
  familyCallFormOpen: false,
  emsCall: { status: "none", time: null, reason: null },
  emsCallFormOpen: false,
};

const $view = () => document.getElementById("view");

// Ensure mount points exist (so UI doesn't disappear even if night.html is edited)
function ensureMount(id, afterId) {
  if (document.getElementById(id)) return;
  const after = document.getElementById(afterId);
  if (!after) return;
  const div = document.createElement("div");
  div.id = id;
  div.style.display = "inline-flex";
  div.style.gap = "6px";
  div.style.flexWrap = "wrap";
  div.style.alignItems = "center";
  div.style.marginLeft = "10px";
  after.insertAdjacentElement("afterend", div);
}
// -------------------------------------------------
// Font size toggle: normal / large (for 70s)
// -------------------------------------------------
const FONT_KEY = "night-font"; // normal | lg

function applyFont(mode){
  document.documentElement.dataset.font = mode; // "normal" or "lg"
  localStorage.setItem(FONT_KEY, mode);
}

function initFont(){
  const saved = localStorage.getItem(FONT_KEY) || "lg"; // ★デフォルトは大
  document.documentElement.dataset.font = saved;
}

function renderFontToggle(){
  const wrap = document.getElementById("font-toggle");
  if (!wrap) {
    // If night.html doesn't have #font-toggle, create it next to #theme-toggle
    ensureMount("font-toggle", "theme-toggle");
  }
  const mount = document.getElementById("font-toggle");
  if(!mount) return;

  mount.innerHTML = "";

  const label = document.createElement("span");
  label.textContent = "文字：";
  label.style.marginRight = "6px";
  mount.appendChild(label);

  const options = [
    { mode: "normal", text: "標準" },
    { mode: "lg",     text: "大" },
    { mode: "xl",     text: "特大" },
  ];

  const saved = localStorage.getItem(FONT_KEY) || "lg";

  options.forEach(({mode, text})=>{
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    if (mode === saved) b.classList.add("active");
    b.onclick = ()=>{
      applyFont(mode);
      renderFontToggle();
    };
    mount.appendChild(b);
  });
}
// -------------------------------------------------
// Theme toggle (PC only): auto / light / dark
// -------------------------------------------------
const THEME_KEY = "night-theme"; // auto | light | dark

function applyTheme(mode){
  document.documentElement.dataset.theme = mode;
  localStorage.setItem(THEME_KEY, mode);
}

function renderThemeToggle(){
  const wrap = document.getElementById("theme-toggle");
  if(!wrap) return;

  wrap.innerHTML = "";

  const label = document.createElement("span");
  label.textContent = "表示モード：";
  label.style.marginRight = "6px";
  wrap.appendChild(label);

  const options = [
    { mode: "auto",  text: "自動" },
    { mode: "light", text: "ライト" },
    { mode: "dark",  text: "ダーク" },
  ];

  const saved = localStorage.getItem(THEME_KEY) || "auto";

  options.forEach(({mode, text})=>{
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-label", `表示モード: ${text}`);
    if (mode === saved) b.classList.add("active");
    b.onclick = ()=>{
      applyTheme(mode);
      renderThemeToggle();
    };
    wrap.appendChild(b);
  });

}

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || "auto";
  document.documentElement.dataset.theme = saved;
}

// ================================
// Facility info (local only)
// ================================
const FACILITY_KEY = "night-facility";

const facility = {
  name: "",
  address: "",
  phone: "",
};

function loadFacility() {
  try {
    const raw = localStorage.getItem(FACILITY_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    facility.name = obj.name || "";
    facility.address = obj.address || "";
    facility.phone = obj.phone || "";
  } catch (e) {
    // ignore
  }
}

function saveFacility() {
  localStorage.setItem(FACILITY_KEY, JSON.stringify(facility));
}

function clearFacility() {
  localStorage.removeItem(FACILITY_KEY);
  facility.name = "";
  facility.address = "";
  facility.phone = "";
}

function facilityValue(v) {
  return v && v.trim() ? v : "＿＿＿＿";
}

function nowText() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function recordTimeline(label, time) {
  model.timeline.push({ label, time: time || nowText() });
}

function formatTimelineEntries() {
  if (!model.timeline.length) return null;
  return model.timeline.map(e => `・${e.label}: ${e.time}`).join("\n");
}

function resetAll() {
  for (const k of Object.keys(model.answers)) model.answers[k] = null;
  for (const k of Object.keys(model.sleep)) model.sleep[k] = null;
  for (const k of Object.keys(model.medicationEvents)) model.medicationEvents[k] = false;
  model.lastRunAt = null;
  model.firstRunAt = null;
  model.recheckRound = 0;
  model.nextIfAllNo = STATE.OBSERVE_30;
  model.returnAfterSleep = STATE.Q6;
  model.timeline = [];
  model.observationStartAt = null;
  model.familyCall = { status: "none", time: null };
  model.familyCallFormOpen = false;
  model.emsCall = { status: "none", time: null, reason: null };
  model.emsCallFormOpen = false;
  model.state = STATE.START;
  render();
}

function anyYes(obj) {
  return Object.values(obj).some(v => v === true);
}

function allYes(obj) {
  return Object.values(obj).every(v => v === true);
}

function selectedMedicationLabels() {
  return MEDICATION_EVENTS.filter(item => model.medicationEvents[item.id]).map(item => item.label);
}

function formatMedicationLogText() {
  const start = model.observationStartAt || "（未記録）";
  const lines = [
    `観察開始時刻：${start}`,
    "薬に関する出来事：",
  ];
  const labels = selectedMedicationLabels();
  if (labels.length) {
    labels.forEach(label => lines.push(`・${label}`));
  } else {
    lines.push("・（なし）");
  }
  return lines.join("\n");
}

function q6AnswerLines() {
  const lines = [];
  Q6.forEach((q, i) => {
    const v = model.answers[q.id];
    const mark = v === true ? "はい" : v === false ? "いいえ" : "未回答";
    lines.push(`Q${i + 1} ${mark}：${q.text.replace(/\n/g, " ")}`);
  });
  return lines.join("\n");
}

function sleepAnswerLines() {
  const lines = [];
  SLEEP.forEach((q, i) => {
    const v = model.sleep[q.id];
    const mark = v === true ? "はい" : v === false ? "いいえ" : "不明";
    lines.push(`S${i + 1} ${mark}：${q.text.replace(/\n/g, " ")}`);
  });
  return lines.join("\n");
}

function buildRecordText(extraTitle) {
  const t = [];
  t.push("【夜間対応 記録用テキスト（貼り付け用）】");
  if (extraTitle) t.push(extraTitle);
  t.push("");
  t.push(`施設名：${facilityValue(facility.name)}`);
  t.push(`住所：${facilityValue(facility.address)}`);
  t.push(`電話：${facilityValue(facility.phone)}`);
  t.push("");

  const tl = formatTimelineEntries();
  t.push("【時刻ログ】");
  t.push(tl ? tl : "（記録なし）");
  t.push("");

  if (model.state === STATE.RESULT_CALL && model.emsCall.status !== "none" && model.emsCall.time) {
    const reasonLabels = {
      already_called: "すでに119通報済み",
      no_connection: "つながらなかった",
      other_route: "別ルートで対応（救急相談/医師指示 等）",
    };
    t.push("【119通報（事実ログ）】");
    if (model.emsCall.status === "auto") {
      t.push(`・${model.emsCall.time} 119通報：実施（自動記録）`);
    } else if (model.emsCall.status === "exception") {
      const reason = reasonLabels[model.emsCall.reason] || "（理由未選択）";
      t.push(`・${model.emsCall.time} 119通報：未実施（例外）／理由：${reason}`);
    }
    t.push("");
  }

  if (model.familyCall.status !== "none" && model.familyCall.time) {
    const statusText = model.familyCall.status === "connected" ? "つながった" : "つながらなかった";
    t.push("【家族連絡（事実ログ）】");
    t.push(`・${model.familyCall.time} 家族へ架電：${statusText}`);
    t.push("");
  }

  const meds = Object.entries(model.medicationEvents)
    .filter(([, v]) => v)
    .map(([id]) => {
      const m = MEDICATION_EVENTS.find(x => x.id === id);
      return m ? m.label : id;
    });
  t.push("【薬の出来事（チェックがある場合）】");
  t.push(meds.length ? meds.map(x => `・${x}`).join("\n") : "（なし）");
  t.push("");

  t.push("【6問（最新）】");
  t.push(q6AnswerLines());
  t.push("");

  t.push("【現在の表示】");
  if (model.state === STATE.RESULT_CALL) {
    const s = yesQuestionSummary();
    t.push(`救急車（119）／Yesあり：${s.short}`);
    const emsFacts = externalFactStatements("externalForEMS", 3);
    if (emsFacts.length) {
      t.push("");
      t.push("【救急隊へ伝達（要点）】");
      emsFacts.forEach(line => t.push(`・${line}`));
    }
  } else if (model.state === STATE.OBSERVE_30) {
    t.push("様子を見る（30分後に再チェック）");
  } else if (model.state === STATE.OBSERVE_60) {
    t.push("様子を見る（60分後に再チェック）");
  } else if (model.state === STATE.HANDOFF) {
    t.push("引き継ぎ（日勤帯へ）");
  } else if (model.state === STATE.SLEEP_CHECK) {
    t.push("睡眠チェック（補助）");
  } else if (model.state === STATE.Q6) {
    t.push("6問入力中");
  } else {
    t.push("開始前");
  }

  t.push("");
  t.push("※本記録は診断・評価ではなく、夜間におけるYes/Noの事実確認ログです。");
  return t.join("\n");
}

function yesQuestionSummary() {
  const yesIdx = [];
  const yesLines = [];
  Q6.forEach((q, i) => {
    if (model.answers[q.id] === true) {
      const n = i + 1;
      yesIdx.push(`Q${n}`);
      const label = q.internalLabel || q.text;
      yesLines.push(`${label}`);
    }
  });
  return {
    short: yesIdx.length ? yesIdx.join(", ") : "（なし）",
    lines: yesLines.join("\n"),
  };
}

function externalFactStatements(field, limit) {
  const statements = [];
  Q6.forEach((q) => {
    if (model.answers[q.id] === true && q[field]) {
      statements.push(q[field]);
    }
  });
  return typeof limit === "number" ? statements.slice(0, limit) : statements;
}

function hasUnconfirmedItems() {
  return Object.values(model.answers).some(v => v === null);
}

function copyText(text){
  try {
    navigator.clipboard.writeText(text);
  } catch (e) {
    // Fallback: create a temporary textarea
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast hidden";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.add("hidden");
  }, 1500);
}

function setState(next) {
  model.state = next;
  render();
}

function startSixQuestion(nextState) {
  const now = nowText();
  model.lastRunAt = now;
  model.firstRunAt = now;
  model.observationStartAt = now;
  model.recheckRound = 0;
  model.nextIfAllNo = STATE.OBSERVE_30;
  recordTimeline("初回6問実施時刻", now);
  recordTimeline("観察開始時刻", now);
  setState(nextState);
}

function render() {
  const v = $view();
  v.innerHTML = "";
  const isEmergency = model.state === STATE.RESULT_CALL;
  document.body.classList.toggle("emergency", isEmergency);

  if (model.state === STATE.START) {
    v.appendChild(screenStart());
    return;
  }
  if (model.state === STATE.Q6_MED) {
    v.appendChild(screenQ6(true));
    return;
  }
  if (model.state === STATE.Q6) {
    v.appendChild(screenQ6(false));
    return;
  }
  if (model.state === STATE.RESULT_CALL) {
    v.appendChild(screenCall());
    return;
  }
  if (model.state === STATE.OBSERVE_30) {
    v.appendChild(screenObserve(30, STATE.OBSERVE_60));
    return;
  }

  if (model.state === STATE.OBSERVE_60) {
    v.appendChild(screenObserve(60, STATE.HANDOFF));
    return;
  }
  if (model.state === STATE.SLEEP_CHECK) {
    v.appendChild(screenSleep());
    return;
  }
  if (model.state === STATE.HANDOFF) {
    v.appendChild(screenHandoff());
    return;
  }
}

/**
 * Screens
 */

const START_HINTS = [
  "苦しい／痛い／変だと言う",
  "転倒／出血／ぶつけた",
  "薬：内容が不明／取り違え／量が多い",
  "説明できなくてもOK（安全のため）",
];

function screenStart() {
  const wrap = div("card");
  wrap.appendChild(h2("夜間リスク確認（6問）"));
  wrap.appendChild(div("muted", "今の状態を、そのまま答えてください"));

  const hint = document.createElement("div");
  hint.className = "startup-hints";
  const hintTitle = document.createElement("div");
  hintTitle.className = "startup-hints-title";
  hintTitle.textContent = "起動の目安（迷ったら押す）";
  hint.appendChild(hintTitle);
  const hintList = document.createElement("ul");
  START_HINTS.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    hintList.appendChild(li);
  });
  hint.appendChild(hintList);
  wrap.appendChild(hint);

  const detail = document.createElement("details");
  detail.className = "guide";
  const detailSummary = document.createElement("summary");
  detailSummary.textContent = "起動の目安（くわしく）";
  detail.appendChild(detailSummary);
  detail.appendChild(div(
    "note",
    "・呼吸・意識・体調の変化（苦しい・痛い・ふらつき）\n" +
    "・転倒・出血・ぶつけた/ぶつかったなど外傷\n" +
    "・薬の内容が不明、取り違え、量が多いなど疑い\n" +
    "・説明できなくても、安全を最優先にして押してください"
  ));
  wrap.appendChild(detail);

  const choiceCheck = div("choice");
  choiceCheck.appendChild(btn("体調の確認（6問へ）", () => {
    startSixQuestion(STATE.Q6);
  }, "primary big"));
  choiceCheck.appendChild(div("muted startup-button-note", "※迷ったら押す（体調の変化・ケガなど）"));
  wrap.appendChild(choiceCheck);

  const choiceMed = div("choice");
  choiceMed.appendChild(btn("薬の出来事（チェック）", () => {
    Object.keys(model.medicationEvents).forEach(k => model.medicationEvents[k] = false);
    startSixQuestion(STATE.Q6_MED);
  }, "big"));
  choiceMed.appendChild(div("muted startup-button-note", "※迷ったら押す（薬が不明/取り違え/量が多い）"));
  wrap.appendChild(choiceMed);

  const f = document.createElement("details");
  f.className = "guide";

  const fs = document.createElement("summary");
  fs.textContent = "施設情報（この端末に保存）";
  f.appendChild(fs);

  f.appendChild(div(
    "note",
    "※ この情報はGitHubには保存されません。\n※ この端末のブラウザだけが覚えます。"
  ));

  f.appendChild(inputText("施設名", facility.name, v => facility.name = v));
  f.appendChild(inputText("住所", facility.address, v => facility.address = v));
  f.appendChild(inputText("電話", facility.phone, v => facility.phone = v));

  const fr = div("row");
  fr.appendChild(btn("保存", () => { saveFacility(); render(); }, "primary"));
  fr.appendChild(btn("消去", () => { clearFacility(); render(); }, "danger"));
  f.appendChild(fr);

  wrap.appendChild(f);

  return wrap;
}

function screenQ6(showMedication = false) {
  const wrap = document.createElement("div");

  // safety: 初回の基準時刻が未設定なら、この時点を初回として固定する
  if (model.recheckRound === 0 && !model.firstRunAt) {
    model.firstRunAt = model.lastRunAt || nowText();
    if (!model.lastRunAt) model.lastRunAt = model.firstRunAt;
  }

  if (showMedication) {
    const medCard = div("card");
    medCard.appendChild(h2("薬の出来事（事実だけチェック）"));
    medCard.appendChild(div(
      "muted",
      "本人が飲んだ内容・量などを事実だけチェックして、6問に進んでください。"
    ));

    MEDICATION_EVENTS.forEach(m => {
      medCard.appendChild(
        checkboxRow(m.label, model.medicationEvents[m.id], (v) => {
          model.medicationEvents[m.id] = v;
        })
      );
    });

    const medRow = div("row");
    medRow.appendChild(btn("薬チェックをクリア", () => {
      Object.keys(model.medicationEvents).forEach(k => model.medicationEvents[k] = false);
      render();
    }));
    medRow.appendChild(btn("このまま6問へ（Q1へスクロール）", () => {
      const picked = Object.entries(model.medicationEvents)
        .filter(([, v]) => v)
        .map(([id]) => {
          const mm = MEDICATION_EVENTS.find(x => x.id === id);
          return mm ? mm.label : id;
        });
      model.timeline = model.timeline.filter(entry => entry.label !== "薬の出来事");
      recordTimeline("薬の出来事", picked.length ? picked.join(" / ") : "（なし）");
      document.getElementById("q1-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, "primary"));
    medRow.appendChild(btn("体調の確認だけに戻す", () => {
      Object.keys(model.medicationEvents).forEach(k => model.medicationEvents[k] = false);
      setState(STATE.Q6);
    }));
    medCard.appendChild(medRow);
    wrap.appendChild(medCard);
  }

  // Header (concise, action-oriented)
  const head = div("card");
  head.appendChild(h2("夜間リスク確認（6問）"));
  head.appendChild(div("muted", "今の状態を、そのまま答えてください"));

  const details = document.createElement("details");
  details.className = "guide";
  const summary = document.createElement("summary");
  summary.textContent = "ルール / 補足";
  details.appendChild(summary);
  details.appendChild(div(
    "note",
    "・6問は「今この瞬間の事実のみ」を答えてください。\n" +
    "・推測・原因・評価は行わないでください。\n" +
    "・分からなければ「はい」でOK（安全側の確認に進みます）。\n" +
    "・入力後は『確定する』を押してください。"
  ));
  head.appendChild(details);
  wrap.appendChild(head);

  // Recheck pre-check (30/60分後の再実施では、まず睡眠/起床状態を確認する導線を上に出す)
  if (model.recheckRound > 0) {
    const pre = div("card");
    pre.appendChild(h2("再確認の前に：起こして確認できる状態か？"));
    pre.appendChild(div(
      "note",
      "再確認（30/60分後）の前に：起こして6問できる状態か確認。\n" +
      "睡眠か不明なら先に睡眠チェック（救急車判定はしない）。"
    ));
    const rr = div("row");
    rr.appendChild(btn("睡眠か不明 → 睡眠チェックへ", () => {
      model.returnAfterSleep = STATE.Q6;
      setState(STATE.SLEEP_CHECK);
    }, "primary"));
    rr.appendChild(btn("起きている/確認できる → このまま6問を続ける", () => {
      // 何もしない（画面をそのまま）
    }));
    pre.appendChild(rr);
    wrap.appendChild(pre);
  }
  // Questions
  Q6.forEach((q, i) => {
    const card = div("card");
    if (i === 0) card.id = "q1-card";
    const title = document.createElement("div");
    title.className = "q-title";
    title.textContent = `Q${i+1}. ${q.text}`;
    card.appendChild(title);

    const r = div("row ans-row");

    const bYes = btn("はい", () => { model.answers[q.id] = true; render(); }, "danger ansbtn");
    const bNo  = btn("いいえ", () => { model.answers[q.id] = false; render(); }, "ansbtn");
    const bNil = btn("未回答", () => { model.answers[q.id] = null; render(); }, "ansbtn");

    // Visual feedback (selected state)
    if (model.answers[q.id] === true) bYes.classList.add("active");
    if (model.answers[q.id] === false) bNo.classList.add("active");
    if (model.answers[q.id] === null) bNil.classList.add("active");

    r.appendChild(bYes);
    r.appendChild(bNo);
    r.appendChild(bNil);

    card.appendChild(r);

    wrap.appendChild(card);
  });

  const actionBanner = div("result observe state-banner",
    "いまやること：6問に Yes/No を入れて『確定する』\n" +
    "推測・原因・評価はしません。分からなければ『はい』でOK（安全確認に進むだけです）。"
  );
  wrap.appendChild(actionBanner);

  // Actions
  const foot = div("card");
  foot.appendChild(h2("判定（自動）"));

  const undecided = Object.values(model.answers).some(v => v === null);
  const info = div("muted", undecided
    ? "※ 未回答があります。すべて回答してから確定してください。"
    : "※ すべて回答済みです。"
  );
  foot.appendChild(info);

  const r = div("row");

  const confirmBtn = btn("確定する", () => {
    // Guard: should be unreachable when disabled, but keep safe
    if (Object.values(model.answers).some(v => v === null)) return;
    const summary = yesQuestionSummary();
    const hasYes = anyYes(model.answers);
    if (hasYes) {
      recordTimeline(`結果：救急車（${summary.short}）`);
      if (model.emsCall.status === "none") {
        model.emsCall.status = "auto";
        model.emsCall.time = nowText();
        model.emsCall.reason = null;
        recordTimeline("119通報：実施（救急車表示に基づく）", model.emsCall.time);
      }
      setState(STATE.RESULT_CALL);
    } else {
      const nextLabel = model.nextIfAllNo === STATE.OBSERVE_30 ? "再確認30分"
        : model.nextIfAllNo === STATE.OBSERVE_60 ? "再確認60分"
        : "引き継ぎ";
      recordTimeline(`結果：全てNo（${nextLabel}）`);
      setState(model.nextIfAllNo);
    }
  }, "primary");

  // A) 未回答は許すが、確定（行動決定）は許さない
  if (undecided) {
    confirmBtn.disabled = true;
    confirmBtn.setAttribute("aria-disabled", "true");
  }

  r.appendChild(confirmBtn);

  r.appendChild(btn("最初からやり直す", () => resetAll()));
  foot.appendChild(r);

  wrap.appendChild(foot);
  return wrap;
}

function screenCall() {
  const wrap = document.createElement("div");

  // この画面は判断のためのものではなく、夜勤者が評価や責任を負わずに
  // 事実だけを伝えるための定型文を提供するUIです。
  // 最終判断・説明・評価はすべて医療機関へ戻します。

  const summary = yesQuestionSummary();
  const now = nowText();
  const hasYes = anyYes(model.answers);

  const summaryCard = div("card emergency-summary-card");
  summaryCard.appendChild(h2("状態サマリ"));
  summaryCard.appendChild(div("emergency-summary-text", [
    "────────────────────────────",
    "表示：救急車（119）",
    "行動：119（実行）",
    `条件一致：${hasYes ? "該当する事実あり" : "該当する事実なし"}`,
    `判定時刻：${now}`,
    "────────────────────────────",
  ].join("\n")));
  wrap.appendChild(summaryCard);

  const callFacts = externalFactStatements("externalForEMS");
  const callFactText = callFacts.length
    ? callFacts.map(f => `・${f}`).join("\n")
    : "・（確認できた事実はありません）";

  const callLines = [
    "【救急要請（119）】",
    `こちらは ${facilityValue(facility.name)} です。`,
    `住所は ${facilityValue(facility.address)} です。`,
    facilityValue(facility.phone) !== "＿＿＿＿" ? `折り返し電話は ${facilityValue(facility.phone)} です。` : "折り返し電話は（未入力）です。",
    "利用者：＿＿歳、＿＿性。",
    "確認できている事実です。",
    callFactText,
    `判定時刻：${now}`,
    "（内容を読み上げます）",
    "※原因の推測や評価は言いません。"
  ];
  const callText = callLines.join("\n");

  const callSection = document.createElement("section");
  callSection.className = "card emergency-call-card";
  callSection.appendChild(h2("救急隊へ伝える（読み上げ／コピペ用）"));
  callSection.appendChild(div("muted", "外部連絡ではQ1〜Q6やYes/Noを使わず、確認できている事実だけを読み上げます。評価や推測を控え、事実だけを伝えてください。"));
  callSection.appendChild(div("result call", callText));
  if (hasUnconfirmedItems()) {
    callSection.appendChild(div("muted", "一部の項目は現時点で確認できておらず、判断できていません。"));
  }
  const callRow = div("row");
  callRow.appendChild(btn("コピーする", () => { copyText(callText); toast("コピーしました"); }, "primary"));
  callSection.appendChild(callRow);
  callSection.appendChild(div("muted emergency-contact-note", "外部（訪問診療・訪問看護など）には状態通知のみ。判定の相談や上書きは避け、搬送先は救急隊です。"));
  wrap.appendChild(callSection);

  const actionRow = div("row");
  actionRow.appendChild(btn("6問へ戻る（状況変化）", () => setState(STATE.Q6)));
  actionRow.appendChild(btn("最初からやり直す", () => resetAll()));
  wrap.appendChild(actionRow);

  const emsCallCard = div("card emergency-call-log-card");
  emsCallCard.appendChild(h2("119通報（記録）"));
  emsCallCard.appendChild(div("muted", "救急車表示の場合、原則 119 通報は実施されます（自動記録）。"));

  const emsStatusText = div("small muted");
  const emsReasonLabels = {
    already_called: "すでに119通報済み",
    no_connection: "つながらなかった",
    other_route: "別ルートで対応（救急相談/医師指示 等）",
  };
  if (model.emsCall.status === "auto" && model.emsCall.time) {
    emsStatusText.textContent = `${model.emsCall.time} 119通報：実施（自動記録）`;
  } else if (model.emsCall.status === "exception" && model.emsCall.time) {
    const reasonLabel = emsReasonLabels[model.emsCall.reason] || "（理由未選択）";
    emsStatusText.textContent = `${model.emsCall.time} 119通報：未実施（例外記録）／理由：${reasonLabel}`;
  } else {
    emsStatusText.textContent = "未記録";
  }
  emsCallCard.appendChild(emsStatusText);

  const exceptionRow = div("row");
  exceptionRow.appendChild(btn("例外を記録する", () => {
    model.emsCallFormOpen = true;
    render();
  }));
  emsCallCard.appendChild(exceptionRow);

  if (model.emsCallFormOpen) {
    const options = [
      { id: "already_called", label: "すでに119通報済み（誰が通報したかは不問）" },
      { id: "no_connection", label: "つながらなかった" },
      { id: "other_route", label: "別ルートで対応（例：救急相談/医師指示 等）" },
    ];
    options.forEach(({ id, label }) => {
      const row = div("row");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "ems-exception";
      radio.value = id;
      radio.checked = model.emsCall.reason === id;
      radio.onchange = () => {
        model.emsCall.reason = id;
      };
      const text = document.createElement("div");
      text.textContent = label;
      row.appendChild(radio);
      row.appendChild(text);
      emsCallCard.appendChild(row);
    });

    const actionRow = div("row");
    const saveBtn = btn("例外として保存", () => {
      if (!model.emsCall.reason) return;
      model.emsCall.status = "exception";
      model.emsCall.time = nowText();
      const reasonLabel = emsReasonLabels[model.emsCall.reason];
      recordTimeline(`119通報：未実施（例外）／理由：${reasonLabel}`, model.emsCall.time);
      model.emsCallFormOpen = false;
      render();
    }, "primary big");
    saveBtn.disabled = !model.emsCall.reason;
    actionRow.appendChild(saveBtn);
    actionRow.appendChild(btn("閉じる", () => {
      model.emsCallFormOpen = false;
      render();
    }));
    emsCallCard.appendChild(actionRow);
  }

  wrap.appendChild(emsCallCard);

  const setFamilyCallStatus = (status) => {
    model.familyCall.status = status;
    model.familyCall.time = nowText();
    model.familyCallFormOpen = false;
    render();
  };

  const familyCallCard = div("card family-call-log-card");
  familyCallCard.appendChild(h2("家族へ架電（記録）"));
  familyCallCard.appendChild(div("muted", "連絡の事実とつながったか／つながらなかったかを記録します。評価や判断は含みません。"));
  const callStatusText = div("muted");
  if (model.familyCall.status === "none") {
    callStatusText.textContent = "まだ架電記録はありません。";
  } else {
    const statusText = model.familyCall.status === "connected" ? "つながった" : "つながらなかった";
    callStatusText.textContent = `${model.familyCall.time} 家族へ架電：${statusText}`;
  }
  const logRow = div("row");
  logRow.appendChild(btn("つながった", () => setFamilyCallStatus("connected"), "primary"));
  logRow.appendChild(btn("つながらなかった", () => setFamilyCallStatus("no_answer")));
  familyCallCard.appendChild(logRow);
  familyCallCard.appendChild(callStatusText);
  wrap.appendChild(familyCallCard);

  const familyFacts = externalFactStatements("externalForFamily", 2);
  while (familyFacts.length < 2) familyFacts.push("＿＿＿＿＿＿＿＿＿＿＿＿");

  // 読み上げる本文（※や内部注釈は入れない）
  const familyReadAloudText = [
    "【ご連絡（事実通知）】",
    `施設の ${facilityValue(facility.name)} です。`,
    "",
    "本日、夜間に利用者の体の状態を確認したところ、",
    "医療機関での確認が必要と判断され、救急搬送となりました。",
    "",
    "確認できている事実としては、次の点があります。",
    `・${familyFacts[0]}`,
    `・${familyFacts[1]}`,
    "",
    "現在は病院へ引き継がれており、今後の対応や説明については医療機関の判断により行われます。",
    "",
    "現時点で施設からお伝えできる内容は以上です。"
  ].join("\n");

  // コピペ用（任意）：読み上げ本文と同一（※は別表示にする）
  const familyCopyText = familyReadAloudText;

  const familySection = document.createElement("section");
  familySection.className = "card family-card";
  familySection.appendChild(h2("家族へ伝える（搬送先が確定した後／事実のみ）"));
  familySection.appendChild(div(
    "muted",
    "上から順に、そのまま読み上げてください。"
  ));

  // 読み上げ用：見える範囲に収めて、上から読むだけ
  familySection.appendChild(div("result", familyReadAloudText));

  // ※は読まない（夜勤の安全装置として表示のみ）
  const familyNote = div(
    "small muted",
    "読み上げ不要（画面用メモ）\n・これは診断や原因の判断ではなく、その時点で確認できていた体の状態（事実）です。\n・搬送後の対応や説明は医療機関の判断により行われます。"
  );
  familySection.appendChild(familyNote);

  // コピペは任意：緊急時にUIをガチャつかせない
  if (model.familyCall.status !== "none") {
    const familyCopyDetails = document.createElement("details");
    familyCopyDetails.className = "guide";
    const familyCopySummary = document.createElement("summary");
    familyCopySummary.textContent = "コピー（任意）";
    familyCopyDetails.appendChild(familyCopySummary);

    const familyCopy = document.createElement("pre");
    familyCopy.className = "copybox";
    familyCopy.textContent = familyCopyText;
    familyCopyDetails.appendChild(familyCopy);

    const familyBtnRow = div("row");
    familyBtnRow.appendChild(btn("コピーする", () => { copyText(familyCopyText); toast("コピーしました"); }, "primary"));
    familyCopyDetails.appendChild(familyBtnRow);

    familySection.appendChild(familyCopyDetails);
  } else {
    familySection.appendChild(div("small muted", "家族へ架電（記録）の入力後にコピーが表示されます。"));
  }
  wrap.appendChild(familySection);

  appendRecordLogCard(wrap, "（救急車表示）");

  const emergencyDisclaimer = div("note emergency-disclaimer",
    "この文面は行動要求や診断を伝えるものではありません。診断や評価は病院（医師）が行います。夜勤は事実確認と搬送状況だけを共有します。"
  );
  wrap.appendChild(emergencyDisclaimer);

  const emergencyWarn = document.createElement("div");
  emergencyWarn.className = "warn-box emergency-warn-box";
  const warnH = document.createElement("h3");
  warnH.textContent = "夜勤が伝えてはいけないこと";
  emergencyWarn.appendChild(warnH);
  const warnList = document.createElement("ul");
  const items = [
    "「たぶん大丈夫です」「軽いと思います」などの評価・予測",
    "「すぐ来てください」「今すぐ病院へ」などの行動要求（病院の指示がない限り）",
    "病名・原因・重症度の推測（例：脳梗塞かも、肺炎だと思う等）",
    "「○○が判断した」「私のミスで」などの責任・主語を人にする説明",
    "今後の方針の約束（例：入院するはず、必ず医師から連絡）",
    "謝罪や責任表明",
  ];
  items.forEach(t => { const li = document.createElement('li'); li.textContent = t; warnList.appendChild(li); });
  emergencyWarn.appendChild(warnList);
  const warnNote = document.createElement('div');
  warnNote.className = 'small muted';
  warnNote.textContent = "伝えるのは『事実（体の状態）』と『搬送先（確定後）』のみ。判断は病院です。";
  emergencyWarn.appendChild(warnNote);
  wrap.appendChild(emergencyWarn);

  return wrap;
}

function screenObserve(mins, nextState) {
  const wrap = document.createElement("div");
  const card = div("card");

  // 言葉の置き換え："経過観察" → "様子を見る（再チェック待ち）"
  const stateTitle = `状態：様子を見る（再チェック待ち ${mins}分）`;
  card.appendChild(h2(stateTitle));

  // まず「次に何をするか」を最大優先で表示
  const base = model.firstRunAt ?? "未記録";
  const banner = div(
    "result observe state-banner",
    `次にすること：${mins}分たったら『6問を再チェック』\n` +
      `（基準：初回6問 ${base} からの経過)`
  );
  card.appendChild(banner);

  // ボタンは迷いを増やさない：主ボタン + 補助ボタンの2つ
  const r = div("row");

  // 主：再チェック（6問へ）
  r.appendChild(
    btn(
      "6問を再チェックする",
      () => {
        const now = nowText();
        model.lastRunAt = now;
        for (const k of Object.keys(model.answers)) model.answers[k] = null;

        if (mins === 30) {
          model.recheckRound = 1;
          model.nextIfAllNo = STATE.OBSERVE_60;
        } else {
          model.recheckRound = 2;
          model.nextIfAllNo = STATE.HANDOFF;
        }

        recordTimeline(`${mins}分再実施時刻`, now);

        setState(STATE.Q6);
      },
      "primary big"
    )
  );

  // 補助：睡眠か不明
  r.appendChild(
    btn(
      "眠っているか不明 → 睡眠チェック",
      () => {
        model.returnAfterSleep = nextState || STATE.Q6;
        recordTimeline("睡眠チェック実施時刻");
        setState(STATE.SLEEP_CHECK);
      },
      "primary"
    )
  );

  card.appendChild(r);

  // 補足は折りたたみに退避（読みたくない人の邪魔をしない）
  const details = document.createElement("details");
  details.className = "guide";

  const summary = document.createElement("summary");
  summary.textContent = "補足（定義 / 連絡ルール）";
  details.appendChild(summary);

  details.appendChild(
    div(
      "note",
      "『様子を見る（再チェック待ち）』＝いまは原因探しをせず、時間をおいて同じ6問で事実だけをもう一度確認すること。\n" +
        `・${mins}分は『初回6問を実施した時刻』からの経過。\n` +
        "・タイマーは実装しない（現場の時計でOK）。\n\n" +
        "外部連絡：\n" +
        "・外部（訪問診療/訪問看護）へ連絡してよい（情報共有）。\n" +
        "・ただし、この画面の流れ（再チェック/119）は上書きしない。\n" +
        "・本人が『相談したい』と明確に希望した場合のみ、電話を渡す/事実を伝えるのは可。"
    )
  );

  // 例外操作は折りたたみの中へ
  const more = div("row");
  more.appendChild(
    btn(
      "いま悪化/新規事象（最初から6問）",
      () => {
        model.lastRunAt = nowText();
        for (const k of Object.keys(model.answers)) model.answers[k] = null;
        model.recheckRound = 0;
        model.firstRunAt = model.lastRunAt; // 新規事象なので基準を更新
        model.nextIfAllNo = STATE.OBSERVE_30;
        setState(STATE.Q6);
      },
      "danger"
    )
  );
  more.appendChild(btn("最初からやり直す", () => resetAll()));
  details.appendChild(more);

  card.appendChild(details);

  // ログは最小サイズで下に
  card.appendChild(
    div(
      "small",
      `初回：${model.firstRunAt ?? "未記録"} / 最終：${model.lastRunAt ?? "未実行"}`
    )
  );

  wrap.appendChild(card);
  appendRecordLogCard(wrap, `（様子を見る ${mins}分後）`);
  return wrap;
}

function screenSleep() {
  const wrap = document.createElement("div");
  const card = div("card");
  card.appendChild(h2("睡眠チェック（睡眠か不明のときの補助）"));
  card.appendChild(div("note",
    "ここで決めるのは『起こして6問』か『起こさず観察』のみ（救急車判定はしない）。\n" +
    "不明が残るなら『起こして6問』を優先する。"
  ));
  wrap.appendChild(card);

  SLEEP.forEach((q, i) => {
    const c = div("card");
    const title = document.createElement("div");
    title.className = "q-title";
    title.textContent = `S${i+1}. ${q.text}`;
    c.appendChild(title);

    const r = div("row ans-row");

    const bYes = btn("はい", () => { model.sleep[q.id] = true; render(); }, "primary ansbtn");
    const bNo  = btn("いいえ", () => { model.sleep[q.id] = false; render(); }, "danger ansbtn");
    const bUnk = btn("不明", () => { model.sleep[q.id] = null; render(); }, "ansbtn");

    // Visual feedback (selected state)
    if (model.sleep[q.id] === true) bYes.classList.add("active");
    if (model.sleep[q.id] === false) bNo.classList.add("active");
    if (model.sleep[q.id] === null) bUnk.classList.add("active");

    r.appendChild(bYes);
    r.appendChild(bNo);
    r.appendChild(bUnk);

    c.appendChild(r);

    if (i === 1) {
      c.appendChild(div(
        "small muted",
        "（布団の上から見える範囲で呼吸の動きを確認し、分からなければ『不明』を選んでください。判定は急がず、起こして6問へ進めます。）"
      ));
    }
    if (i === 2) {
      c.appendChild(div(
        "small muted",
        "（寝具が通常に掛かっているだけなら『いいえ』。顔や首の周りが塞がれているか判断できないときは『不明』で、起こして6問へ。）"
      ));
    }

    wrap.appendChild(c);
  });

  const decision = div("card");
  decision.appendChild(h2("結果（自動）"));

  const hasNull = Object.values(model.sleep).some(v => v === null);
  if (hasNull) {
    decision.appendChild(div("result sleep",
      "⚠ 未回答/不明があります。\n" +
      "不明が残る場合は『起こして6問へ戻す』を優先してください。"
    ));
  } else if (allYes(model.sleep)) {
    decision.appendChild(div("result sleep",
      "✅ すべて Yes。\n" +
      "行動：起こさない（睡眠継続）。\n" +
      "※ 状況変化があれば最初から6問へ。"
    ));
  } else {
    decision.appendChild(div("result sleep",
      "⚠ 1つ以上 No。\n" +
      "行動：起こして6問へ戻す（意識/呼吸等の事実確認へ）。"
    ));
  }

  const r = div("row");

  const hasNull2 = Object.values(model.sleep).some(v => v === null);
  const allYes2 = !hasNull2 && allYes(model.sleep);

  // ルール：表示（自動）とボタンが矛盾しないようにする
  // - 「すべてYes」＝起こさない（観察継続）を主ボタンにし、「起こして戻す」は出さない
  // - 不明/Noがある＝起こして6問へ戻すを主ボタンにする

  if (allYes2) {
    r.appendChild(btn("起こさない（観察を続ける）", () => {
      // 観察継続：次の段階へ（30→60→日勤）
      setState(model.returnAfterSleep);
    }, "primary"));

    r.appendChild(btn("状況変化があれば：最初から6問へ", () => {
      for (const k of Object.keys(model.answers)) model.answers[k] = null;
      model.lastRunAt = nowText();
      setState(STATE.Q6);
    }));

  } else {
    r.appendChild(btn("起こして6問へ戻す", () => {
      // 睡眠チェックは補助なので、6問側を再起動
      for (const k of Object.keys(model.answers)) model.answers[k] = null;
      model.lastRunAt = nowText();
      setState(STATE.Q6);
    }, "primary"));

    r.appendChild(btn("戻る（前の画面へ）", () => {
      setState(STATE.Q6);
    }));
  }

  r.appendChild(btn("最初からやり直す", () => resetAll()));

  decision.appendChild(r);
  wrap.appendChild(decision);

  return wrap;
}

function screenHandoff() {
  const card = div("card");
  card.appendChild(h2("引き継ぎ（夜間の判断をここで止める）"));
  card.appendChild(div("result observe",
    "ここから先（翌日通院、家族調整、服薬/生活対応の主体決定）は日勤帯。\n" +
    "夜勤は『事実』と『実施した対応』だけを残す。"
  ));
  card.appendChild(div("note",
    "残すもの（例）\n" +
    "・起動時刻 / きっかけ（訴え・転倒等）\n" +
    "・6問の回答（Yes/No）\n" +
    "・経過観察の実施（30分/60分）\n" +
    "・睡眠チェックの有無\n" +
    "※ 評価・推測・誰が悪いは禁止"
  ));

  const recordWrap = div("card");
  recordWrap.appendChild(h2("記録用（貼り付け）"));
  recordWrap.appendChild(div("muted", "施設の記録・申し送りにそのまま貼れます。"));
  const recordText = buildRecordText("（引き継ぎ表示）");
  recordWrap.appendChild(div("muted", "本文は表示しません（コピーして貼り付けてください）。"));
  const rr = div("row");
  rr.appendChild(btn("記録用テキストをコピー", () => { copyText(recordText); toast("コピーしました"); }, "primary"));
  recordWrap.appendChild(rr);
  card.appendChild(recordWrap);

  const r = div("row");
  r.appendChild(btn("6問へ戻る（状況変化）", () => {
    model.lastRunAt = nowText();
    for (const k of Object.keys(model.answers)) model.answers[k] = null;
    setState(STATE.Q6);
  }));
  r.appendChild(btn("最初からやり直す", () => resetAll()));
  card.appendChild(r);
  return card;
}

function appendRecordLogCard(container, extraTitle) {
  if (!model.observationStartAt) return;
  const logText = buildRecordText(extraTitle);
  const logCard = div("card");
  logCard.appendChild(h2("記録用テキスト"));
  logCard.appendChild(div("muted", "選択された薬イベントや時刻、問診内容をまとめてコピペできます（画面には表示しません）。"));
  const logRow = div("row");
  logRow.appendChild(btn("記録用テキストをコピー", () => { copyText(logText); toast("コピーしました"); }, "primary"));
  logCard.appendChild(logRow);
  container.appendChild(logCard);
}

/**
 * UI helpers
 */

function h2(text) {
  const el = document.createElement("div");
  el.className = "q-title";
  el.textContent = text;
  return el;
}

function p(text) {
  const el = document.createElement("div");
  el.style.whiteSpace = "pre-wrap";
  el.textContent = text;
  return el;
}

function div(className, text) {
  const el = document.createElement("div");
  if (className) el.className = className;
  if (text !== undefined) {
    el.style.whiteSpace = "pre-wrap";
    el.textContent = text;
  }
  return el;
}

function whenNote(label, text) {
  const note = document.createElement("div");
  note.className = "when";
  const heading = document.createElement("span");
  heading.className = "when-label";
  heading.textContent = label;
  const body = document.createElement("span");
  body.className = "when-text";
  body.style.whiteSpace = "pre-wrap";
  body.textContent = text;
  note.appendChild(heading);
  note.appendChild(body);
  return note;
}

function btn(label, onClick, extraClass) {
  const b = document.createElement("button");
  b.type = "button"; // prevent any accidental form-submit behavior
  if (extraClass) b.className = String(extraClass);
  b.textContent = label;
  b.onclick = onClick;
  return b;
}

function spanPill(value) {
  const s = document.createElement("span");
  s.className = "pill";
  if (value === true) s.textContent = "Yes";
  else if (value === false) s.textContent = "No";
  else s.textContent = "未回答";
  return s;
}

// Helper: labeled text input (row layout)
function inputText(label, value, onChange) {
  const row = div("row");

  const l = document.createElement("div");
  l.className = "muted";
  l.style.minWidth = "80px";
  l.textContent = label;

  const i = document.createElement("input");
  i.type = "text";
  i.value = value || "";
  i.style.flex = "1";
  i.style.padding = "12px";
  i.oninput = () => onChange(i.value);

  row.appendChild(l);
  row.appendChild(i);
  return row;
}

function checkboxRow(label, checked, onChange) {
  const row = div("row");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!checked;
  cb.style.width = "20px";
  cb.style.height = "20px";
  cb.onchange = () => onChange(cb.checked);
  const txt = document.createElement("div");
  txt.style.flex = "1";
  txt.style.fontWeight = "700";
  txt.textContent = label;
  row.appendChild(cb);
  row.appendChild(txt);
  return row;
}

// boot: initialize UI after DOM is ready in a predictable order
function bootNight() {
  try {
    initTheme();
    renderThemeToggle();
    initFont();
    renderFontToggle();
    loadFacility();
    render();
  } catch (e) {
    // swallow — in production we might log
    console.error('bootNight error', e);
    const view = document.getElementById("view");
    if (view) {
      view.innerHTML = "";
      const errorCard = div("card");
      errorCard.appendChild(h2("初期化エラー"));
      errorCard.appendChild(div("muted", "初期化に失敗しました。Consoleを確認してください。"));
      view.appendChild(errorCard);
    }
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootNight);
  } else {
    // already ready
    setTimeout(bootNight, 0);
  }
}

// Expose a small debug API so users can trigger re-renders from DevTools.
if (typeof window !== 'undefined') {
  window.__night = window.__night || {};
  Object.assign(window.__night, {
    render,
    renderThemeToggle,
    renderFontToggle,
    applyTheme,
    applyFont,
  });
}